<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\ItemOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerItemOrderController extends Controller
{
    /**
     * Automatically cancel item orders in 'Payment Incomplete' status whose 10-minute window has expired.
     */
    public static function autoExpireIncompleteItemOrders(): void
    {
        if (! Schema::hasTable('item_orders')) {
            return;
        }

        $expiredOrders = ItemOrder::where('order_status', 'Payment Incomplete')->get();

        foreach ($expiredOrders as $order) {
            $deadline = $order->payment_deadline_at
                ? Carbon::parse($order->payment_deadline_at)
                : ($order->updated_at ? $order->updated_at->copy()->addMinutes(10) : now()->subMinute());

            if (now()->greaterThanOrEqualTo($deadline)) {
                DB::transaction(function () use ($order) {
                    $order->update([
                        'order_status' => 'Cancelled',
                        'cancellation_reason' => 'Automatically cancelled: Incomplete GCash payment was not settled within the 10-minute window.',
                        'updated_at' => now(),
                    ]);

                    DB::table('activity_logs')->insert([
                        'user_id' => $order->client_id,
                        'action_type' => 'ITEM_ORDER_AUTO_CANCEL_PAYMENT_TIMEOUT',
                        'description' => "Item Order #{$order->order_id} was automatically cancelled after the 10-minute payment settlement timer expired.",
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
            }
        }
    }

    /**
     * Format a single item order row with joined item and booking metadata.
     */
    public static function formatOrderRow(object $row): array
    {
        $receiptUrl = ! empty($row->payment_receipt_path)
            ? \App\Http\Controllers\SuperAdmin\SuperAdminBaseController::formatStorageUrl($row->payment_receipt_path)
            : null;

        $compatibleBrands = [];
        if (! empty($row->compatible_brands)) {
            $compatibleBrands = array_values(array_filter(array_map('trim', explode(',', (string) $row->compatible_brands))));
        }

        $deadlineIso = null;
        if (! empty($row->payment_deadline_at)) {
            $deadlineIso = Carbon::parse($row->payment_deadline_at)->toISOString();
        } elseif (($row->order_status ?? '') === 'Payment Incomplete' && ! empty($row->updated_at)) {
            $deadlineIso = Carbon::parse($row->updated_at)->addMinutes(10)->toISOString();
        }

        $txDateIso = ! empty($row->transaction_date) ? Carbon::parse($row->transaction_date)->toISOString() : null;
        $txDateFormatted = ! empty($row->transaction_date) ? Carbon::parse($row->transaction_date)->format('M d, Y h:i A') : null;

        return [
            'order_id' => (int) $row->order_id,
            'client_id' => (int) $row->client_id,
            'client_name' => $row->client_name ?? null,
            'client_contact' => $row->client_contact ?? null,
            'client_address' => $row->client_address ?? null,
            'item_id' => (int) $row->item_id,
            'item_name' => $row->item_name ?? 'Item',
            'item_type' => $row->item_type ?? null,
            'tool_subtype' => $row->tool_subtype ?? null,
            'sub_category' => $row->sub_category ?? null,
            'compatible_brands' => $compatibleBrands,
            'unit' => $row->unit ?? 'pc',
            'quantity_on_hand' => isset($row->quantity_on_hand) ? (int) $row->quantity_on_hand : 0,
            'item_category' => $row->item_category,
            'quantity' => (int) $row->quantity,
            'is_order_base' => (bool) ($row->is_order_base ?? false),
            'stock_deducted' => (bool) ($row->stock_deducted ?? false),
            'unit_price' => (float) ($row->unit_price ?? 0),
            'total_amount' => (float) ($row->total_amount ?? 0),
            'down_payment_amount' => (float) ($row->down_payment_amount ?? 0),
            'amount_paid' => (float) ($row->amount_paid ?? 0),
            'remaining_balance' => (float) ($row->remaining_balance ?? 0),
            'payment_method' => $row->payment_method ?? 'GCash',
            'reference_number' => $row->reference_number ?? null,
            'sender_name' => $row->sender_name ?? null,
            'sender_number' => $row->sender_number ?? null,
            'payment_receipt_url' => $receiptUrl,
            'payment_review_status' => $row->payment_review_status ?? 'Pending Review',
            'payment_incomplete_reason' => $row->payment_incomplete_reason ?? null,
            'payment_incomplete_at' => ! empty($row->payment_incomplete_at) ? Carbon::parse($row->payment_incomplete_at)->toISOString() : null,
            'payment_deadline_at' => $deadlineIso,
            'fulfillment_type' => $row->fulfillment_type ?? null,
            'linked_booking_id' => $row->linked_booking_id ? (int) $row->linked_booking_id : null,
            'linked_booking_status' => $row->linked_booking_status ?? null,
            'linked_scheduled_date' => ! empty($row->linked_scheduled_date) ? Carbon::parse($row->linked_scheduled_date)->format('M d, Y h:i A') : null,
            'order_status' => $row->order_status,
            'cancellation_reason' => $row->cancellation_reason ?? null,
            'confirmed_by' => $row->confirmed_by ? (int) $row->confirmed_by : null,
            'confirmed_by_name' => $row->confirmed_by_name ?? null,
            'transaction_date' => $txDateIso,
            'transaction_date_formatted' => $txDateFormatted,
            'receipt_reference_number' => $row->receipt_reference_number ?? null,
            'notes' => $row->notes ?? null,
            'created_at' => ! empty($row->created_at) ? Carbon::parse($row->created_at)->toISOString() : null,
            'created_at_formatted' => ! empty($row->created_at) ? Carbon::parse($row->created_at)->format('M d, Y h:i A') : '',
        ];
    }

    /**
     * List purchasable catalog items (Spare Parts, For-Sale Materials, For-Sale Tools) and the customer's item orders.
     */
    public function index(Request $request): JsonResponse
    {
        static::autoExpireIncompleteItemOrders();
        CustomerBookingController::autoExpireIncompletePayments();

        $user = $request->user();
        $userId = (int) $user->user_id;

        $excludedStatuses = ['Defect', 'Damaged', 'Lost', 'Lost/Damaged', 'Sold', 'Borrowed', 'Warranty Reserved'];

        $rawItems = DB::table('inventory_items')
            ->where('is_archived', false)
            ->orderBy('item_name')
            ->get();

        $catalogItems = [];
        foreach ($rawItems as $item) {
            $status = trim((string) ($item->status ?? 'Available'));
            $isWarrantyReserved = (bool) ($item->is_warranty_reserved ?? false) || $status === 'Warranty Reserved';
            if ($isWarrantyReserved || in_array($status, $excludedStatuses, true)) {
                continue;
            }

            $qtyOnHand = (int) ($item->quantity_on_hand ?? 0);
            $unitPrice = $item->selling_price !== null
                ? (float) $item->selling_price
                : ((float) ($item->capital ?? 0) + (float) ($item->profit ?? 0));

            if ($item->item_type === 'Spare Part') {
                $isOrderBase = ($item->reservation_source === 'order_base') || ($status === 'Order Base');
                $isOnHand = ! $isOrderBase && $qtyOnHand > 0 && $status !== 'Out of Stock';

                if (! $isOrderBase && ! $isOnHand) {
                    continue;
                }

                $brands = ! empty($item->compatible_brands)
                    ? array_values(array_filter(array_map('trim', explode(',', (string) $item->compatible_brands))))
                    : [];

                $catalogItems[] = [
                    'item_id' => (int) $item->item_id,
                    'item_name' => $item->item_name,
                    'item_category' => 'spare_part',
                    'item_type' => 'Spare Part',
                    'tool_subtype' => null,
                    'sub_category' => $item->sub_category ?: 'Spare Parts',
                    'compatible_brands' => $brands,
                    'quantity_on_hand' => $qtyOnHand,
                    'unit' => $item->unit ?: 'pc',
                    'unit_price' => round($unitPrice, 2),
                    'is_order_base' => $isOrderBase,
                    'availability_badge' => $isOrderBase ? 'Order Base' : 'Available',
                ];
            } elseif (($item->inventory_mode ?? 'worker') === 'sale' && in_array($item->item_type, ['Material', 'Tool'], true)) {
                $isOrderBase = ($item->reservation_source === 'order_base') || ($status === 'Order Base');
                // Strictly on-hand only for Materials & Tools (no order-base)
                if ($isOrderBase || $qtyOnHand <= 0 || $status === 'Out of Stock') {
                    continue;
                }

                $isTool = $item->item_type === 'Tool';
                $rawSubtype = strtolower((string) ($item->tool_subtype ?? ''));
                $toolSubtype = $isTool ? (str_contains($rawSubtype, 'power') ? 'power' : 'hand') : null;

                $catalogItems[] = [
                    'item_id' => (int) $item->item_id,
                    'item_name' => $item->item_name,
                    'item_category' => $isTool ? 'tool' : 'material',
                    'item_type' => $item->item_type,
                    'tool_subtype' => $toolSubtype,
                    'sub_category' => $item->sub_category ?: ($isTool ? ($toolSubtype === 'power' ? 'Power Tools' : 'Hand Tools') : 'Materials'),
                    'compatible_brands' => [],
                    'quantity_on_hand' => $qtyOnHand,
                    'unit' => $item->unit ?: 'pc',
                    'unit_price' => round($unitPrice, 2),
                    'is_order_base' => false,
                    'availability_badge' => 'Available',
                ];
            }
        }

        $orders = [];
        if (Schema::hasTable('item_orders')) {
            $rawOrders = DB::table('item_orders as o')
                ->leftJoin('inventory_items as i', 'i.item_id', '=', 'o.item_id')
                ->leftJoin('bookings as b', 'b.booking_id', '=', 'o.linked_booking_id')
                ->where('o.client_id', $userId)
                ->select([
                    'o.*',
                    'i.item_name',
                    'i.item_type',
                    'i.tool_subtype',
                    'i.sub_category',
                    'i.compatible_brands',
                    'i.unit',
                    'i.quantity_on_hand',
                    'b.booking_status as linked_booking_status',
                    'b.scheduled_date as linked_scheduled_date',
                ])
                ->orderByDesc('o.order_id')
                ->get();

            $receiptsByOrder = app(\App\Services\ReceiptService::class)->getFormattedReceiptsBySource(
                \App\Models\Receipt::SOURCE_ITEM_ORDER,
                $rawOrders->pluck('order_id')->map(fn ($id) => (int) $id)->all(),
                'customer'
            );

            $linkedBookingIds = $rawOrders->pluck('linked_booking_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all();
            $receiptsByBooking = ! empty($linkedBookingIds)
                ? app(\App\Services\ReceiptService::class)->getFormattedReceiptsBySource(
                    \App\Models\Receipt::SOURCE_BOOKING,
                    $linkedBookingIds,
                    'customer'
                )
                : [];

            $orders = $rawOrders
                ->map(function ($r) use ($receiptsByOrder, $receiptsByBooking) {
                    $formatted = static::formatOrderRow($r);
                    $merged = collect($receiptsByOrder[(int) $r->order_id] ?? [])
                        ->concat(! empty($r->linked_booking_id) ? ($receiptsByBooking[(int) $r->linked_booking_id] ?? []) : [])
                        ->unique('receipt_id')
                        ->sortBy('receipt_id')
                        ->values()
                        ->all();
                    $formatted['receipts'] = $merged;
                    $primary = collect($merged)
                        ->sortByDesc(fn ($rcp) => ($rcp['document_kind'] !== 'acknowledgement_receipt' ? 1000000 : 0) + (int) $rcp['receipt_id'])
                        ->first();
                    $formatted['receipt'] = $primary;
                    if ($primary && ! empty($primary['receipt_number'])) {
                        $formatted['receipt_reference_number'] = $primary['receipt_number'];
                    }

                    return $formatted;
                })
                ->values()
                ->all();
        }

        return response()->json([
            'items' => $catalogItems,
            'orders' => $orders,
            'gcash' => [
                'account_number' => '0917-123-4567',
                'account_name' => 'Cooling Tower Airconditioning Services',
            ],
        ]);
    }

    /**
     * Submit a new customer item order / reservation.
     */
    public function store(Request $request): JsonResponse
    {
        static::autoExpireIncompleteItemOrders();

        $user = $request->user();
        $userId = (int) $user->user_id;

        if (($user->account_type ?? 'individual') === 'business' && ($user->verification_status ?? 'pending') !== 'approved') {
            return response()->json([
                'message' => 'Your Business / Corporate account is currently under verification review. Item ordering will unlock once verified.',
            ], 403);
        }

        $baseValidated = $request->validate([
            'item_id' => ['required', 'integer', 'exists:inventory_items,item_id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:500'],
            'technician_consulted_acknowledged' => ['nullable'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $qty = (int) $baseValidated['quantity'];

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $request->validate([
                'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            ]);
            $receiptPath = $request->file('receipt_image')->store('receipts/item_orders', 'public');
        }

        DB::beginTransaction();
        try {
            $item = DB::table('inventory_items')
                ->where('item_id', (int) $baseValidated['item_id'])
                ->where('is_archived', false)
                ->lockForUpdate()
                ->first();

            if (! $item) {
                throw ValidationException::withMessages([
                    'item_id' => ['Selected item is no longer available.'],
                ]);
            }

            $status = trim((string) ($item->status ?? 'Available'));
            $isWarrantyReserved = (bool) ($item->is_warranty_reserved ?? false) || $status === 'Warranty Reserved';
            if ($isWarrantyReserved || in_array($status, ['Defect', 'Damaged', 'Lost', 'Lost/Damaged', 'Sold', 'Borrowed'], true)) {
                throw ValidationException::withMessages([
                    'item_id' => ['This item is not available for purchase.'],
                ]);
            }

            $category = null;
            $isOrderBase = false;

            if ($item->item_type === 'Spare Part') {
                $category = 'spare_part';
                if (! $request->boolean('technician_consulted_acknowledged')) {
                    throw ValidationException::withMessages([
                        'technician_consulted_acknowledged' => ['Please confirm that your AC unit has already been checked up or consulted by a technician.'],
                    ]);
                }

                $isOrderBase = ($item->reservation_source === 'order_base') || ($status === 'Order Base');
                if (! $isOrderBase && (int) $item->quantity_on_hand < $qty) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Only {$item->quantity_on_hand} {$item->unit} available on hand."],
                    ]);
                }
            } elseif (($item->inventory_mode ?? 'worker') === 'sale' && in_array($item->item_type, ['Material', 'Tool'], true)) {
                $category = $item->item_type === 'Tool' ? 'tool' : 'material';
                $isOrderBaseItem = ($item->reservation_source === 'order_base') || ($status === 'Order Base');
                if ($isOrderBaseItem || $status === 'Out of Stock') {
                    throw ValidationException::withMessages([
                        'item_id' => ['Order-base items are not available for Materials or Tools.'],
                    ]);
                }
                if ((int) $item->quantity_on_hand < $qty) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Only {$item->quantity_on_hand} {$item->unit} available in stock."],
                    ]);
                }
            } else {
                throw ValidationException::withMessages([
                    'item_id' => ['This item is not listed for customer purchase.'],
                ]);
            }

            $unitPrice = $item->selling_price !== null
                ? (float) $item->selling_price
                : ((float) ($item->capital ?? 0) + (float) ($item->profit ?? 0));
            $unitPrice = round($unitPrice, 2);
            $totalAmount = round($unitPrice * $qty, 2);

            $requiresGcash = ($category === 'spare_part') || ($qty >= 6);

            if ($requiresGcash) {
                $minDownPayment = round($totalAmount * 0.50, 2);
                $gcashValidated = $request->validate([
                    'amount_paid' => ['required', 'numeric', "min:{$minDownPayment}", "max:{$totalAmount}"],
                    'reference_number' => ['required', 'string', 'min:5', 'max:13'],
                    'sender_name' => ['nullable', 'string', 'max:150'],
                    'sender_number' => ['nullable', 'string', 'max:15'],
                ], [
                    'amount_paid.min' => 'Down payment must be at least 50% (₱' . number_format($minDownPayment, 2) . ').',
                    'amount_paid.max' => 'Amount paid cannot exceed total amount (₱' . number_format($totalAmount, 2) . ').',
                ]);

                $amountPaid = round((float) $gcashValidated['amount_paid'], 2);
                $remainingBalance = max(0.0, round($totalAmount - $amountPaid, 2));
                $paymentMethod = 'GCash';
                $paymentReviewStatus = 'Pending Review';
                $fulfillmentType = $category === 'spare_part' ? null : 'pickup';
                $orderStatus = 'Pending Payment Review';
                $refNumber = trim($gcashValidated['reference_number']);
                app(\App\Services\ReceiptService::class)->assertGcashReferenceAvailable($refNumber, 'GCash');
                $senderName = trim((string) ($gcashValidated['sender_name'] ?? $user->name));
                $senderNumber = trim((string) ($gcashValidated['sender_number'] ?? $user->contact_number));
            } else {
                $minDownPayment = 0.00;
                $amountPaid = 0.00;
                $remainingBalance = $totalAmount;
                $paymentMethod = 'Cash';
                $paymentReviewStatus = 'Not Required';
                $fulfillmentType = 'pickup';
                $orderStatus = 'Ready for Pickup';
                $refNumber = null;
                $senderName = null;
                $senderNumber = null;
            }

            $order = ItemOrder::create([
                'client_id' => $userId,
                'item_id' => (int) $item->item_id,
                'item_category' => $category,
                'quantity' => $qty,
                'is_order_base' => $isOrderBase,
                'stock_deducted' => false,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'down_payment_amount' => $minDownPayment,
                'amount_paid' => $amountPaid,
                'remaining_balance' => $remainingBalance,
                'payment_method' => $paymentMethod,
                'reference_number' => $refNumber,
                'sender_name' => $senderName,
                'sender_number' => $senderNumber,
                'payment_receipt_path' => $receiptPath,
                'payment_review_status' => $paymentReviewStatus,
                'fulfillment_type' => $fulfillmentType,
                'order_status' => $orderStatus,
                'notes' => $baseValidated['notes'] ?? null,
            ]);

            if (Schema::hasTable('staff_messages')) {
                $adminAssistants = DB::table('users')
                    ->where('role_id', 3)
                    ->where('is_active', true)
                    ->pluck('user_id');

                $customerName = trim("{$user->given_name} {$user->last_name}") ?: 'Customer';
                $msgSubject = $requiresGcash
                    ? "[Item Order #{$order->order_id}] GCash Payment Review — {$item->item_name}"
                    : "[Item Order #{$order->order_id}] Ready for Pickup — {$item->item_name}";
                $msgBody = $requiresGcash
                    ? "{$customerName} placed an order for {$qty}x {$item->item_name} (Total: ₱" . number_format($totalAmount, 2) . ", Paid via GCash: ₱" . number_format($amountPaid, 2) . ", Ref: {$refNumber}). Please review the down payment."
                    : "{$customerName} reserved {$qty}x {$item->item_name} for Store Pickup (Total due on pickup: ₱" . number_format($totalAmount, 2) . ").";

                foreach ($adminAssistants as $aaId) {
                    DB::table('staff_messages')->insert([
                        'sender_id' => $userId,
                        'recipient_id' => (int) $aaId,
                        'subject' => mb_substr($msgSubject, 0, 160),
                        'body' => $msgBody,
                        'is_read' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'ITEM_ORDER_CREATE',
                'description' => sprintf(
                    'Customer placed Item Order #%d: %dx %s (₱%s, %s, Status: %s).',
                    $order->order_id,
                    $qty,
                    $item->item_name,
                    number_format($totalAmount, 2),
                    $paymentMethod,
                    $orderStatus
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            $joined = DB::table('item_orders as o')
                ->leftJoin('inventory_items as i', 'i.item_id', '=', 'o.item_id')
                ->where('o.order_id', $order->order_id)
                ->select(['o.*', 'i.item_name', 'i.item_type', 'i.tool_subtype', 'i.sub_category', 'i.compatible_brands', 'i.unit', 'i.quantity_on_hand'])
                ->first();

            return response()->json([
                'message' => $requiresGcash
                    ? 'Order submitted! Please wait for the Admin Assistant to confirm your GCash payment.'
                    : 'Reservation placed! Your order is Ready for Pickup at our store.',
                'data' => static::formatOrderRow($joined),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Settle an incomplete GCash down payment within the 10-minute deadline.
     */
    public function completePayment(Request $request, int $orderId): JsonResponse
    {
        static::autoExpireIncompleteItemOrders();
        $user = $request->user();
        $userId = (int) $user->user_id;

        $order = ItemOrder::where('order_id', $orderId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if ($order->order_status !== 'Payment Incomplete') {
            throw ValidationException::withMessages([
                'order' => ['This order is no longer awaiting payment completion (it may have expired or already been updated).'],
            ]);
        }

        if ($order->payment_deadline_at && now()->greaterThanOrEqualTo(Carbon::parse($order->payment_deadline_at))) {
            static::autoExpireIncompleteItemOrders();
            throw ValidationException::withMessages([
                'order' => ['The 10-minute settlement window has expired and this order was automatically cancelled.'],
            ]);
        }

        $minDown = max(1.0, (float) $order->down_payment_amount);
        $totalAmount = (float) $order->total_amount;

        $validated = $request->validate([
            'amount_paid' => ['required', 'numeric', "min:{$minDown}", "max:{$totalAmount}"],
            'reference_number' => ['required', 'string', 'min:5', 'max:13'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:15'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ], [
            'amount_paid.min' => 'Total GCash down payment must be at least ₱' . number_format($minDown, 2) . ' (50%).',
        ]);

        app(\App\Services\ReceiptService::class)->assertGcashReferenceAvailable($validated['reference_number'], 'GCash');

        $receiptPath = $order->payment_receipt_path;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts/item_orders', 'public');
        }

        $amountPaid = round((float) $validated['amount_paid'], 2);
        $remainingBalance = max(0.0, round($totalAmount - $amountPaid, 2));

        DB::transaction(function () use ($order, $userId, $user, $validated, $amountPaid, $remainingBalance, $receiptPath) {
            $order->update([
                'amount_paid' => $amountPaid,
                'remaining_balance' => $remainingBalance,
                'reference_number' => trim($validated['reference_number']),
                'sender_name' => ! empty($validated['sender_name']) ? trim($validated['sender_name']) : ($order->sender_name ?: $user->name),
                'sender_number' => ! empty($validated['sender_number']) ? trim($validated['sender_number']) : ($order->sender_number ?: $user->contact_number),
                'payment_receipt_path' => $receiptPath,
                'payment_review_status' => 'Pending Review',
                'payment_incomplete_reason' => null,
                'payment_incomplete_at' => null,
                'payment_deadline_at' => null,
                'order_status' => 'Pending Payment Review',
            ]);

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'ITEM_ORDER_PAYMENT_SETTLED',
                'description' => "Customer settled GCash payment for Item Order #{$order->order_id} within the 10-minute deadline (Ref: {$validated['reference_number']}).",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $joined = DB::table('item_orders as o')
            ->leftJoin('inventory_items as i', 'i.item_id', '=', 'o.item_id')
            ->where('o.order_id', $order->order_id)
            ->select(['o.*', 'i.item_name', 'i.item_type', 'i.tool_subtype', 'i.sub_category', 'i.compatible_brands', 'i.unit', 'i.quantity_on_hand'])
            ->first();

        return response()->json([
            'message' => 'Updated GCash payment submitted! Please wait for Admin Assistant confirmation.',
            'data' => static::formatOrderRow($joined),
        ]);
    }

    /**
     * Customer selects post-confirmation fulfillment option for an AC Spare Part order:
     * - 'pickup' -> Ready for Pickup
     * - 'delivery_replace' -> Unlocks free Repair / Check-up booking wizard redirect
     */
    public function selectFulfillment(Request $request, int $orderId): JsonResponse
    {
        static::autoExpireIncompleteItemOrders();
        $userId = (int) $request->user()->user_id;

        $order = ItemOrder::where('order_id', $orderId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if ($order->item_category !== 'spare_part') {
            throw ValidationException::withMessages([
                'fulfillment_type' => ['Materials and Tools are strictly Store Pickup only.'],
            ]);
        }

        if ($order->payment_review_status !== 'Sufficient') {
            throw ValidationException::withMessages([
                'fulfillment_type' => ['Fulfillment choice is locked until the Admin Assistant confirms your GCash payment.'],
            ]);
        }

        if (in_array($order->order_status, ['Completed', 'Cancelled', 'Scheduled for Replacement'], true)) {
            throw ValidationException::withMessages([
                'fulfillment_type' => ['This order can no longer change fulfillment.'],
            ]);
        }

        $validated = $request->validate([
            'fulfillment_type' => ['required', 'string', Rule::in(['pickup', 'delivery_replace'])],
        ]);

        $choice = $validated['fulfillment_type'];
        $nextStatus = $choice === 'pickup' ? 'Ready for Pickup' : 'Awaiting Fulfillment Choice';

        $order->update([
            'fulfillment_type' => $choice,
            'order_status' => $nextStatus,
            'updated_at' => now(),
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'ITEM_ORDER_FULFILLMENT_SELECTED',
            'description' => sprintf(
                'Customer selected %s fulfillment for Spare Part Order #%d.',
                $choice === 'pickup' ? 'Store Pickup' : 'Deliver & Replace by Technician',
                $order->order_id
            ),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $joined = DB::table('item_orders as o')
            ->leftJoin('inventory_items as i', 'i.item_id', '=', 'o.item_id')
            ->where('o.order_id', $order->order_id)
            ->select(['o.*', 'i.item_name', 'i.item_type', 'i.tool_subtype', 'i.sub_category', 'i.compatible_brands', 'i.unit', 'i.quantity_on_hand'])
            ->first();

        return response()->json([
            'message' => $choice === 'pickup'
                ? 'Store Pickup selected! Your spare part order is now Ready for Pickup.'
                : 'Proceeding to schedule Technician Replacement (Booking Fee Waived — ₱0.00).',
            'data' => static::formatOrderRow($joined),
        ]);
    }
}
