<?php

namespace App\Http\Controllers\AdminAssistant;

use App\Http\Controllers\Customer\CustomerItemOrderController;
use App\Models\ItemOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminAssistantItemOrderController extends AdminAssistantBaseController
{
    /**
     * List all customer item orders for Admin Assistant review & pickup release.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        CustomerItemOrderController::autoExpireIncompleteItemOrders();

        if (! Schema::hasTable('item_orders')) {
            return response()->json([
                'data' => [],
                'counts' => [
                    'all' => 0,
                    'pending_review' => 0,
                    'payment_incomplete' => 0,
                    'ready_for_pickup' => 0,
                    'awaiting_fulfillment' => 0,
                    'scheduled_replacement' => 0,
                    'completed' => 0,
                    'cancelled' => 0,
                ],
            ]);
        }

        $rows = DB::table('item_orders as o')
            ->join('users as c', 'c.user_id', '=', 'o.client_id')
            ->leftJoin('inventory_items as i', 'i.item_id', '=', 'o.item_id')
            ->leftJoin('bookings as b', 'b.booking_id', '=', 'o.linked_booking_id')
            ->select([
                'o.*',
                DB::raw("TRIM(CONCAT_WS(' ', c.given_name, c.middle_name, c.last_name)) as client_name"),
                'c.contact_number as client_contact',
                'c.address as client_address',
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
            ->get()
            ->map(fn ($r) => CustomerItemOrderController::formatOrderRow($r))
            ->values();

        $counts = [
            'all' => $rows->count(),
            'pending_review' => $rows->where('order_status', 'Pending Payment Review')->count(),
            'payment_incomplete' => $rows->where('order_status', 'Payment Incomplete')->count(),
            'awaiting_fulfillment' => $rows->where('order_status', 'Awaiting Fulfillment Choice')->count(),
            'ready_for_pickup' => $rows->where('order_status', 'Ready for Pickup')->count(),
            'scheduled_replacement' => $rows->where('order_status', 'Scheduled for Replacement')->count(),
            'completed' => $rows->where('order_status', 'Completed')->count(),
            'cancelled' => $rows->where('order_status', 'Cancelled')->count(),
        ];

        return response()->json([
            'data' => $rows,
            'counts' => $counts,
        ]);
    }

    /**
     * Review a customer's GCash down payment: mark Sufficient or Payment Incomplete (starts 10-min timer).
     */
    public function reviewPayment(Request $request, int $orderId): JsonResponse
    {
        $this->authorizeRole($request);
        CustomerItemOrderController::autoExpireIncompleteItemOrders();

        $order = ItemOrder::where('order_id', $orderId)->firstOrFail();

        if (in_array($order->order_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'order' => ['Completed or cancelled orders cannot be reviewed.'],
            ]);
        }

        $validated = $request->validate([
            'decision' => ['required', 'string', Rule::in(['sufficient', 'incomplete'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $staff = $request->user();
        $staffId = (int) $staff->user_id;
        $staffName = $this->formatName($staff->given_name ?? '', $staff->middle_name ?? null, $staff->last_name ?? '') ?: 'Admin Assistant';

        DB::transaction(function () use ($order, $validated, $staffId, $staffName) {
            if ($validated['decision'] === 'sufficient') {
                $isSparePart = $order->item_category === 'spare_part';
                $nextOrderStatus = $isSparePart ? 'Awaiting Fulfillment Choice' : 'Ready for Pickup';
                $fulfillment = $isSparePart ? $order->fulfillment_type : 'pickup';

                $order->update([
                    'payment_review_status' => 'Sufficient',
                    'payment_incomplete_reason' => null,
                    'payment_incomplete_at' => null,
                    'payment_deadline_at' => null,
                    'fulfillment_type' => $fulfillment,
                    'order_status' => $nextOrderStatus,
                    'notes' => ! empty($validated['notes'])
                        ? trim(($order->notes ? $order->notes . "\n" : '') . "[Payment Confirmed by {$staffName}]: {$validated['notes']}")
                        : $order->notes,
                ]);

                $this->logActivity(
                    $staffId,
                    'ITEM_ORDER_PAYMENT_SUFFICIENT',
                    sprintf('Confirmed GCash payment for Item Order #%d (%s). Status set to %s.', $order->order_id, $staffName, $nextOrderStatus)
                );
            } else {
                $now = now();
                $deadline = $now->copy()->addMinutes(10);
                $reason = ! empty($validated['notes'])
                    ? trim($validated['notes'])
                    : 'GCash down payment is insufficient or reference could not be verified.';

                $order->update([
                    'payment_review_status' => 'Payment Incomplete',
                    'payment_incomplete_reason' => $reason,
                    'payment_incomplete_at' => $now,
                    'payment_deadline_at' => $deadline,
                    'order_status' => 'Payment Incomplete',
                ]);

                $this->logActivity(
                    $staffId,
                    'ITEM_ORDER_PAYMENT_INCOMPLETE',
                    sprintf('Marked Item Order #%d as Payment Incomplete (10-minute settlement timer started). Reason: %s', $order->order_id, $reason)
                );
            }
        });

        return response()->json([
            'message' => $validated['decision'] === 'sufficient'
                ? ($order->item_category === 'spare_part'
                    ? 'Payment confirmed! Fulfillment choice is now unlocked for the customer.'
                    : 'Payment confirmed! Order is now Ready for Pickup.')
                : 'Marked as Payment Incomplete. A 10-minute timer has started for the customer to settle.',
            'data' => $this->fetchSingleFormattedOrder($orderId),
        ]);
    }

    /**
     * Confirm walk-in remaining balance (or full cash payment for <6 items), deduct stock, mark Completed,
     * and generate a receipt recorded in Sales & Records.
     */
    public function confirmPickup(Request $request, int $orderId): JsonResponse
    {
        $this->authorizeRole($request);
        CustomerItemOrderController::autoExpireIncompleteItemOrders();

        $validated = $request->validate([
            'payment_method' => ['nullable', 'string', Rule::in(['Cash', 'GCash'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $staff = $request->user();
        $staffId = (int) $staff->user_id;
        $staffName = $this->formatName($staff->given_name ?? '', $staff->middle_name ?? null, $staff->last_name ?? '') ?: 'Admin Assistant';

        DB::transaction(function () use ($orderId, $validated, $staffId, $staffName) {
            $order = ItemOrder::where('order_id', $orderId)->lockForUpdate()->firstOrFail();

            if ($order->order_status !== 'Ready for Pickup') {
                throw ValidationException::withMessages([
                    'order' => ["Only orders in 'Ready for Pickup' status can be released (current: {$order->order_status})."],
                ]);
            }

            $item = DB::table('inventory_items')
                ->where('item_id', $order->item_id)
                ->lockForUpdate()
                ->first();

            if (! $item) {
                throw ValidationException::withMessages([
                    'item_id' => ['Linked inventory item could not be found.'],
                ]);
            }

            $qty = (int) $order->quantity;

            // Deduct stock if not yet deducted (skip stock check only if order-base spare part with 0 on-hand)
            if (! $order->stock_deducted) {
                if (! $order->is_order_base && (int) $item->quantity_on_hand < $qty) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Insufficient on-hand stock ({$item->quantity_on_hand} available, {$qty} required)."],
                    ]);
                }

                if (! $order->is_order_base || (int) $item->quantity_on_hand > 0) {
                    $newQty = max(0, (int) $item->quantity_on_hand - $qty);
                    $reorder = (int) ($item->reorder_level ?? 5);
                    $nextItemStatus = $item->status;
                    if (! in_array($item->status, ['Order Base', 'Warranty Reserved'], true)) {
                        if ($item->item_type === 'Spare Part') {
                            $nextItemStatus = $newQty === 0 ? 'Out of Stock' : ($newQty <= $reorder ? 'Low Stock' : 'Available / On Hand');
                        } else {
                            $nextItemStatus = $newQty === 0 ? 'Out of Stock' : ($newQty <= $reorder ? 'Low Stock' : 'Available');
                        }
                    }

                    DB::table('inventory_items')
                        ->where('item_id', $item->item_id)
                        ->update([
                            'quantity_on_hand' => $newQty,
                            'status' => $nextItemStatus,
                            'last_updated' => now(),
                        ]);
                }
            }

            $txDate = now();
            $receiptRef = $this->generateUniqueReceiptRef();
            $walkInMethod = $validated['payment_method'] ?? 'Cash';

            $prevPaid = (float) $order->amount_paid;
            $remCollected = (float) $order->remaining_balance;
            $totalAmount = (float) $order->total_amount;
            $unitPrice = (float) $order->unit_price;
            $costPrice = (float) ($item->capital ?? 0);
            $totalProfit = round(($unitPrice - $costPrice) * $qty, 2);

            // Consolidated payment method for Sales & Records
            if ($remCollected <= 0 && $order->payment_method === 'GCash') {
                $finalMethod = 'GCash';
            } elseif ($prevPaid <= 0) {
                $finalMethod = $walkInMethod;
            } else {
                $finalMethod = $order->payment_method === 'GCash' && $walkInMethod === 'GCash'
                    ? 'GCash'
                    : $walkInMethod;
            }

            $customer = DB::table('users')->where('user_id', $order->client_id)->first();
            $customerName = $customer
                ? $this->formatName($customer->given_name ?? '', $customer->middle_name ?? null, $customer->last_name ?? '')
                : 'Customer';

            $order->update([
                'amount_paid' => $totalAmount,
                'remaining_balance' => 0.00,
                'stock_deducted' => true,
                'order_status' => 'Completed',
                'confirmed_by' => $staffId,
                'confirmed_by_name' => $staffName,
                'transaction_date' => $txDate,
                'receipt_reference_number' => $receiptRef,
                'notes' => ! empty($validated['notes'])
                    ? trim(($order->notes ? $order->notes . "\n" : '') . "[Pickup Released]: {$validated['notes']}")
                    : $order->notes,
                'updated_at' => $txDate,
            ]);

            // Record completed sale & receipt into Sales & Records
            $isSparePart = $order->item_category === 'spare_part';
            $saleType = $isSparePart ? 'spare_part' : 'tools_materials';
            $servicePrefix = $isSparePart ? 'Spare Part Sale: ' : 'Retail Sale: ';
            $serviceName = $servicePrefix . mb_substr($item->item_name, 0, 75);

            $service = DB::table('services')->where('service_name', $serviceName)->first();
            if (! $service) {
                $serviceId = DB::table('services')->insertGetId([
                    'service_name' => $serviceName,
                    'description' => 'Item order pickup sale: ' . $item->item_name,
                    'base_price' => $unitPrice,
                    'booking_fee' => 0.00,
                    'is_active' => 0,
                    'category' => $isSparePart ? 'Spare Part Sale' : 'Tools & Materials',
                    'display_order' => 99,
                    'created_at' => $txDate,
                    'updated_at' => $txDate,
                ], 'service_id');
            } else {
                $serviceId = $service->service_id;
            }

            $receiptSummaryNote = sprintf(
                'Receipt #%s | Item Order #%d | %dx %s | Confirmed by %s on %s',
                $receiptRef,
                $order->order_id,
                $qty,
                $item->item_name,
                $staffName,
                $txDate->format('M d, Y h:i A')
            );

            $saleBookingId = DB::table('bookings')->insertGetId([
                'client_id' => $order->client_id,
                'service_id' => $serviceId,
                'assigned_by' => $staffId,
                'scheduled_date' => $txDate,
                'booking_status' => 'Completed',
                'quotation_status' => 'Not Applicable',
                'service_order_status' => 'Completed',
                'service_payment_method' => $finalMethod,
                'notes' => $receiptSummaryNote,
                'created_at' => $txDate,
                'updated_at' => $txDate,
            ], 'booking_id');

            $paymentNotes = $prevPaid > 0 && $remCollected > 0
                ? sprintf('Down Payment: ₱%s (GCash%s) + Pickup Balance: ₱%s (%s) | Receipt Ref: %s', number_format($prevPaid, 2), $order->reference_number ? " Ref {$order->reference_number}" : '', number_format($remCollected, 2), $walkInMethod, $receiptRef)
                : sprintf('Receipt Ref: %s | Confirmed by %s', $receiptRef, $staffName);

            $paymentId = DB::table('payment')->insertGetId([
                'booking_id' => $saleBookingId,
                'booking_price' => $totalAmount,
                'unit_price' => $unitPrice,
                'spare_parts_price' => $isSparePart ? $totalAmount : 0.00,
                'amount_paid' => $totalAmount,
                'payment_status' => 'Paid',
                'payment_method' => $finalMethod,
                'payment_type' => $isSparePart ? 'Spare Part Order Pickup' : 'Item Order Pickup',
                'reference_number' => $receiptRef,
                'receipt_image' => $order->payment_receipt_path,
                'notes' => $paymentNotes,
                'payment_date' => $txDate,
                'created_at' => $txDate,
                'updated_at' => $txDate,
            ], 'payment_id');

            DB::table('booking_materials')->insert([
                'booking_id' => $saleBookingId,
                'item_id' => $item->item_id,
                'quantity_used' => $qty,
                'logged_at' => $txDate,
            ]);

            if (Schema::hasTable('inventory_sales')) {
                $saleInsert = [
                    'booking_id' => $saleBookingId,
                    'payment_id' => $paymentId,
                    'sale_type' => $saleType,
                    'item_id' => $item->item_id,
                    'item_name' => $item->item_name,
                    'serial_number' => $item->serial_number ?? null,
                    'sub_category' => $item->sub_category ?: ($isSparePart ? 'Spare Parts' : 'General'),
                    'item_type' => $item->item_type ?: 'Material',
                    'quantity' => $qty,
                    'unit' => $item->unit ?: 'pcs',
                    'cost_price' => $costPrice,
                    'unit_price' => $unitPrice,
                    'total_amount' => $totalAmount,
                    'profit' => $totalProfit,
                    'payment_method' => $finalMethod,
                    'payment_status' => 'Paid',
                    'client_id' => $order->client_id,
                    'customer_name' => $customerName,
                    'customer_contact' => $customer->contact_number ?? null,
                    'customer_address' => $customer->address ?? null,
                    'sold_by' => $staffId,
                    'sold_by_name' => $staffName,
                    'notes' => $receiptSummaryNote,
                    'sold_at' => $txDate,
                    'created_at' => $txDate,
                    'updated_at' => $txDate,
                ];

                if (Schema::hasColumn('inventory_sales', 'item_order_id')) {
                    $saleInsert['item_order_id'] = $order->order_id;
                }
                if (Schema::hasColumn('inventory_sales', 'receipt_reference_number')) {
                    $saleInsert['receipt_reference_number'] = $receiptRef;
                }

                DB::table('inventory_sales')->insert($saleInsert);
            }

            $this->logActivity(
                $staffId,
                'ITEM_ORDER_PICKUP_COMPLETED',
                sprintf(
                    'Confirmed pickup & balance for Item Order #%d (%dx %s, Total: ₱%s). Generated Receipt %s.',
                    $order->order_id,
                    $qty,
                    $item->item_name,
                    number_format($totalAmount, 2),
                    $receiptRef
                )
            );
        });

        return response()->json([
            'message' => 'Pickup confirmed! Stock deducted, order marked Completed, and official receipt recorded in Sales & Records.',
            'data' => $this->fetchSingleFormattedOrder($orderId),
        ]);
    }

    protected function generateUniqueReceiptRef(): string
    {
        do {
            $candidate = 'CT-RCP-' . now()->format('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
            $exists = DB::table('item_orders')->where('receipt_reference_number', $candidate)->exists();
        } while ($exists);

        return $candidate;
    }

    protected function fetchSingleFormattedOrder(int $orderId): ?array
    {
        $row = DB::table('item_orders as o')
            ->join('users as c', 'c.user_id', '=', 'o.client_id')
            ->leftJoin('inventory_items as i', 'i.item_id', '=', 'o.item_id')
            ->leftJoin('bookings as b', 'b.booking_id', '=', 'o.linked_booking_id')
            ->where('o.order_id', $orderId)
            ->select([
                'o.*',
                DB::raw("TRIM(CONCAT_WS(' ', c.given_name, c.middle_name, c.last_name)) as client_name"),
                'c.contact_number as client_contact',
                'c.address as client_address',
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
            ->first();

        return $row ? CustomerItemOrderController::formatOrderRow($row) : null;
    }
}
