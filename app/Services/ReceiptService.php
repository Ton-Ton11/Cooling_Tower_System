<?php

namespace App\Services;

use App\Http\Controllers\SuperAdmin\SuperAdminBaseController;
use App\Models\AcUnitOrder;
use App\Models\Booking;
use App\Models\ItemOrder;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\ReceiptItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ReceiptService
{
    private const ROLE_LABELS = [
        1 => 'Super Admin',
        2 => 'Manager',
        3 => 'Admin Assistant',
        4 => 'Tools Man',
        5 => 'Technician',
        6 => 'Customer',
        7 => 'Head Technician',
    ];

    /**
     * Validate that a GCash reference number is not already used on any non-voided GCash receipt.
     */
    public function assertGcashReferenceAvailable(?string $referenceNumber, ?string $paymentMethod = 'GCash'): void
    {
        if (! Schema::hasTable('receipts')) {
            return;
        }

        if (strcasecmp(trim((string) $paymentMethod), 'GCash') !== 0) {
            return;
        }

        $trimmed = trim((string) $referenceNumber);
        if ($trimmed === '') {
            return;
        }

        $exists = Receipt::query()
            ->where('payment_method', 'GCash')
            ->where('status', '!=', Receipt::STATUS_VOIDED)
            ->where('external_reference_number', $trimmed)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'reference_number' => [
                    "GCash reference number ({$trimmed}) has already been used on an official receipt.",
                ],
            ]);
        }
    }

    /**
     * Issue an Acknowledgement Receipt (AR) for a confirmed booking fee, or a final Service/Sales Invoice (INV)
     * when the booking is completed and final payment is confirmed.
     */
    public function issueForBookingPayment(Booking $booking, Payment $payment, User $actor): ?Receipt
    {
        if (! Schema::hasTable('receipts') || ! Schema::hasTable('receipt_items')) {
            return null;
        }

        return DB::transaction(function () use ($booking, $payment, $actor) {
            $booking->loadMissing(['service', 'client']);
            $serviceName = (string) ($booking->service?->service_name ?? 'Aircon Service');
            $serviceDetails = is_array($booking->service_details)
                ? $booking->service_details
                : (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : []);

            $isOcular = ((int) $booking->service_id === 4)
                || stripos($serviceName, 'ocular') !== false
                || ! empty($serviceDetails['is_ocular_inspection']);

            $payTypeLower = strtolower((string) ($payment->payment_type ?? ''));

            // Ocular inspections are free; AC unit DP/balance payments on ocular bookings are handled by issueForAcUnitOrder
            if ($isOcular) {
                return null;
            }

            $isDirectRetailSale = str_starts_with($serviceName, 'Retail Sale:') || str_starts_with($serviceName, 'Spare Part Sale:');
            $isDirectAcSale = str_starts_with($serviceName, 'AC Unit Sale:');

            $isReservationOrFeeStage = ! $isDirectRetailSale
                && ! $isDirectAcSale
                && (
                    str_contains($payTypeLower, 'reservation')
                    || str_contains($payTypeLower, 'appointment')
                    || str_contains($payTypeLower, 'reschedule')
                )
                && ($booking->booking_status !== 'Completed');

            $category = $this->resolveBookingTransactionCategory($booking, $serviceName);

            if ($isReservationOrFeeStage) {
                $isFeeWaived = ! empty($serviceDetails['booking_fee_waived']) || ! empty($serviceDetails['item_order_id']);
                $feePaid = round((float) ($payment->amount_paid ?? 0), 2);

                if ($isFeeWaived || $feePaid <= 0) {
                    return null;
                }

                $existingArQuery = Receipt::with('items')
                    ->where('source_type', Receipt::SOURCE_BOOKING)
                    ->where('source_id', (int) $booking->booking_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED);

                if (! empty($payment->reference_number)) {
                    $sameRef = (clone $existingArQuery)
                        ->where('external_reference_number', trim((string) $payment->reference_number))
                        ->first();
                    if ($sameRef) {
                        return $sameRef;
                    }
                }

                if (! str_contains($payTypeLower, 'reschedule')) {
                    $existingBookingAr = $existingArQuery->first();
                    if ($existingBookingAr) {
                        return $existingBookingAr;
                    }
                }

                $unitSummary = $this->summarizeBookingUnits($booking);
                $feeLabel = str_contains($payTypeLower, 'reschedule')
                    ? "Reschedule Fee — {$serviceName}"
                    : "Appointment Reservation Fee — {$serviceName}";

                $items = [[
                    'description' => $feeLabel,
                    'item_meta' => trim("Booking #{$booking->booking_id}" . ($unitSummary !== '' ? " • {$unitSummary}" : '')),
                    'quantity' => 1,
                    'unit' => 'booking',
                    'unit_price' => $feePaid,
                    'line_total' => $feePaid,
                ]];

                $paymentMethod = $this->normalizePaymentMethod($payment->payment_method ?? 'GCash');
                $extRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($payment->reference_number) : null;

                return $this->persistReceipt(
                    documentKind: Receipt::KIND_ACKNOWLEDGEMENT,
                    transactionCategory: $category,
                    sourceType: Receipt::SOURCE_BOOKING,
                    sourceId: (int) $booking->booking_id,
                    parentReceiptId: null,
                    clientId: $booking->client_id ? (int) $booking->client_id : null,
                    customerOverrides: [],
                    items: $items,
                    discountTotal: 0.00,
                    priorPaymentsCredited: 0.00,
                    explicitAmountPaidNow: $feePaid,
                    paymentMethod: $paymentMethod,
                    externalReferenceNumber: $extRef,
                    paymentReceiptPath: $payment->receipt_image ?: null,
                    actor: $actor
                );
            }

            // Final Invoice stage (Completed Service Booking or Direct Walk-in Sale)
            $invoiceKind = ($isDirectRetailSale || $isDirectAcSale)
                ? Receipt::KIND_SALES_INVOICE
                : Receipt::KIND_SERVICE_INVOICE;

            $existingInv = Receipt::with(['items', 'parentReceipt'])
                ->where('source_type', Receipt::SOURCE_BOOKING)
                ->where('source_id', (int) $booking->booking_id)
                ->whereIn('document_kind', [Receipt::KIND_SERVICE_INVOICE, Receipt::KIND_SALES_INVOICE])
                ->where('status', '!=', Receipt::STATUS_VOIDED)
                ->first();

            if ($existingInv) {
                return $existingInv;
            }

            // Check if this booking was created by AdminAssistantItemOrderController::confirmPickup for an ItemOrder
            if ($isDirectRetailSale && Schema::hasTable('inventory_sales') && Schema::hasColumn('inventory_sales', 'item_order_id')) {
                $linkedSaleRow = DB::table('inventory_sales')
                    ->where('booking_id', (int) $booking->booking_id)
                    ->whereNotNull('item_order_id')
                    ->first();
                if ($linkedSaleRow && $linkedSaleRow->item_order_id) {
                    $itemOrderModel = ItemOrder::find((int) $linkedSaleRow->item_order_id);
                    if ($itemOrderModel) {
                        return $this->issueForItemOrder($itemOrderModel, 'final_pickup', $actor);
                    }
                }
            }

            return $this->buildAndPersistFinalBookingInvoice(
                $booking,
                $payment,
                $actor,
                $invoiceKind,
                $category,
                $serviceName,
                $serviceDetails,
                $isDirectRetailSale,
                $isDirectAcSale
            );
        });
    }

    /**
     * Issue an AR (stage = 'down_payment') or final Sales Invoice (stage = 'final_pickup') for an ItemOrder.
     */
    public function issueForItemOrder(ItemOrder $order, string $stage, User $actor): ?Receipt
    {
        if (! Schema::hasTable('receipts') || ! Schema::hasTable('receipt_items')) {
            return null;
        }

        return DB::transaction(function () use ($order, $stage, $actor) {
            $item = DB::table('inventory_items')->where('item_id', $order->item_id)->first();
            $itemName = $item->item_name ?? 'Inventory Item';
            $unitLabel = $item->unit ?? 'pc';
            $categoryLabel = match ($order->item_category) {
                'spare_part' => 'AC Spare Part',
                'tool' => 'For-Sale Tool',
                default => 'For-Sale Material',
            };
            $subCategory = $item->sub_category ?? null;
            $metaParts = array_filter([
                $categoryLabel,
                $subCategory,
                ! empty($item?->serial_number) ? "SN: {$item->serial_number}" : null,
                "Item Order #{$order->order_id}",
            ]);

            $qty = max(1, (int) $order->quantity);
            $unitPrice = round((float) $order->unit_price, 2);
            $lineTotal = round((float) ($order->total_amount ?: ($qty * $unitPrice)), 2);

            $items = [[
                'description' => $itemName,
                'item_meta' => implode(' • ', $metaParts),
                'quantity' => $qty,
                'unit' => $unitLabel,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ]];

            if ($stage === 'down_payment') {
                $paidNow = round((float) $order->amount_paid, 2);
                if ($paidNow <= 0) {
                    return null;
                }

                $existingAr = Receipt::with('items')
                    ->where('source_type', Receipt::SOURCE_ITEM_ORDER)
                    ->where('source_id', (int) $order->order_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->first();

                if ($existingAr) {
                    return $existingAr;
                }

                $paymentMethod = $this->normalizePaymentMethod($order->payment_method ?? 'GCash');
                $extRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($order->reference_number) : null;

                return $this->persistReceipt(
                    documentKind: Receipt::KIND_ACKNOWLEDGEMENT,
                    transactionCategory: Receipt::CATEGORY_ITEM_ORDER,
                    sourceType: Receipt::SOURCE_ITEM_ORDER,
                    sourceId: (int) $order->order_id,
                    parentReceiptId: null,
                    clientId: (int) $order->client_id,
                    customerOverrides: [],
                    items: $items,
                    discountTotal: 0.00,
                    priorPaymentsCredited: 0.00,
                    explicitAmountPaidNow: $paidNow,
                    paymentMethod: $paymentMethod,
                    externalReferenceNumber: $extRef,
                    paymentReceiptPath: $order->payment_receipt_path ?: null,
                    actor: $actor
                );
            }

            if ($stage === 'final_pickup') {
                $existingInv = Receipt::with(['items', 'parentReceipt'])
                    ->where('source_type', Receipt::SOURCE_ITEM_ORDER)
                    ->where('source_id', (int) $order->order_id)
                    ->where('document_kind', Receipt::KIND_SALES_INVOICE)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->first();

                if ($existingInv) {
                    return $existingInv;
                }

                $parentAr = Receipt::query()
                    ->where('source_type', Receipt::SOURCE_ITEM_ORDER)
                    ->where('source_id', (int) $order->order_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->orderByDesc('receipt_id')
                    ->first();

                $priorCredited = $parentAr ? round((float) $parentAr->amount_paid_now, 2) : 0.00;
                $paidNow = round(max(0.0, $lineTotal - $priorCredited), 2);

                if ($paidNow <= 0 && $parentAr) {
                    $paymentMethod = $this->normalizePaymentMethod($parentAr->payment_method);
                    $extRef = null; // GCash reference already recorded on parent AR
                } else {
                    // Walk-in balance paid at pickup (defaults to Cash unless explicitly paid via a new GCash ref)
                    $rawMethod = $order->payment_method ?? 'Cash';
                    if ($parentAr && strcasecmp((string) $rawMethod, 'GCash') === 0) {
                        // Prior DP was GCash; walk-in balance without a new ref is Cash unless specified
                        $candidateRef = $this->sanitizeExternalRef($order->reference_number);
                        if ($candidateRef === null || $candidateRef === $parentAr->external_reference_number) {
                            $paymentMethod = 'Cash';
                            $extRef = null;
                        } else {
                            $paymentMethod = 'GCash';
                            $extRef = $candidateRef;
                        }
                    } else {
                        $paymentMethod = $this->normalizePaymentMethod($rawMethod);
                        $extRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($order->reference_number) : null;
                    }
                }

                return $this->persistReceipt(
                    documentKind: Receipt::KIND_SALES_INVOICE,
                    transactionCategory: Receipt::CATEGORY_ITEM_ORDER,
                    sourceType: Receipt::SOURCE_ITEM_ORDER,
                    sourceId: (int) $order->order_id,
                    parentReceiptId: $parentAr?->receipt_id,
                    clientId: (int) $order->client_id,
                    customerOverrides: [],
                    items: $items,
                    discountTotal: 0.00,
                    priorPaymentsCredited: $priorCredited,
                    explicitAmountPaidNow: $paidNow,
                    paymentMethod: $paymentMethod,
                    externalReferenceNumber: $extRef,
                    paymentReceiptPath: $order->payment_receipt_path ?: null,
                    actor: $actor
                );
            }

            throw new \InvalidArgumentException("Unsupported ItemOrder receipt stage [{$stage}].");
        });
    }

    /**
     * Issue an AR (stage = 'down_payment') or final Sales Invoice (stage = 'final_settlement') for an AcUnitOrder.
     */
    public function issueForAcUnitOrder(AcUnitOrder $order, string $stage, User $actor): ?Receipt
    {
        if (! Schema::hasTable('receipts') || ! Schema::hasTable('receipt_items')) {
            return null;
        }

        return DB::transaction(function () use ($order, $stage, $actor) {
            $acUnit = DB::table('ac_units_inventory')->where('ac_unit_id', $order->ac_unit_id)->first();
            $brand = $acUnit->brand ?? 'AC Unit';
            $model = $acUnit->model ?? '';
            $hp = $acUnit->horsepower ?? '';
            $acType = $acUnit->ac_type ?? 'Split Type';
            $motorType = $acUnit->motor_type ?? 'Inverter';
            $serial = $acUnit->serial_number ?? null;

            $metaParts = array_filter([
                trim("{$hp} HP {$acType} ({$motorType})"),
                $serial ? "SN: {$serial}" : null,
                $order->ocular_booking_id ? "Ocular #{$order->ocular_booking_id}" : null,
                $order->recommendation_id ? "Recommendation #{$order->recommendation_id}" : null,
            ]);

            $qty = max(1, (int) ($order->quantity ?: 1));
            $unitPrice = round((float) $order->unit_price, 2);
            $unitLineTotal = round((float) ($order->total_unit_price ?: ($qty * $unitPrice)), 2);

            $customerOverrides = array_filter([
                'address' => $order->delivery_address ?: null,
                'contact_number' => $order->contact_number ?: null,
            ]);

            if ($stage === 'down_payment') {
                $downPayment = round((float) $order->down_payment_amount, 2);
                if ($downPayment <= 0) {
                    return null;
                }

                $existingAr = Receipt::with('items')
                    ->where('source_type', Receipt::SOURCE_AC_UNIT_ORDER)
                    ->where('source_id', (int) $order->order_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->first();

                if ($existingAr) {
                    return $existingAr;
                }

                $items = [[
                    'description' => trim("{$brand} {$model}") . ' (AC Unit Order)',
                    'item_meta' => implode(' • ', $metaParts),
                    'quantity' => $qty,
                    'unit' => 'unit',
                    'unit_price' => $unitPrice,
                    'line_total' => $unitLineTotal,
                ]];

                $paymentMethod = $this->normalizePaymentMethod($order->payment_method ?? 'Cash');
                $extRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($order->reference_number) : null;

                return $this->persistReceipt(
                    documentKind: Receipt::KIND_ACKNOWLEDGEMENT,
                    transactionCategory: Receipt::CATEGORY_AC_UNIT_ORDER,
                    sourceType: Receipt::SOURCE_AC_UNIT_ORDER,
                    sourceId: (int) $order->order_id,
                    parentReceiptId: null,
                    clientId: (int) $order->client_id,
                    customerOverrides: $customerOverrides,
                    items: $items,
                    discountTotal: 0.00,
                    priorPaymentsCredited: 0.00,
                    explicitAmountPaidNow: $downPayment,
                    paymentMethod: $paymentMethod,
                    externalReferenceNumber: $extRef,
                    paymentReceiptPath: $order->down_payment_receipt_path ?: null,
                    actor: $actor
                );
            }

            if ($stage === 'final_settlement') {
                $existingInv = Receipt::with(['items', 'parentReceipt'])
                    ->where('source_type', Receipt::SOURCE_AC_UNIT_ORDER)
                    ->where('source_id', (int) $order->order_id)
                    ->where('document_kind', Receipt::KIND_SALES_INVOICE)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->first();

                if ($existingInv) {
                    return $existingInv;
                }

                $items = [[
                    'description' => trim("{$brand} {$model}"),
                    'item_meta' => implode(' • ', $metaParts),
                    'quantity' => $qty,
                    'unit' => 'unit',
                    'unit_price' => $unitPrice,
                    'line_total' => $unitLineTotal,
                ]];

                $deliveryFee = round((float) ($order->delivery_fee ?? 0), 2);
                if ($deliveryFee > 0) {
                    $items[] = [
                        'description' => 'AC Unit Delivery Fee',
                        'item_meta' => "Order #{$order->order_id}" . ($order->ocular_booking_id ? " • Ocular #{$order->ocular_booking_id}" : ''),
                        'quantity' => 1,
                        'unit' => 'trip',
                        'unit_price' => $deliveryFee,
                        'line_total' => $deliveryFee,
                    ];
                }

                $installationFee = round((float) ($order->installation_fee ?? 0), 2);
                if ($installationFee > 0 && empty($order->installation_booking_id)) {
                    $items[] = [
                        'description' => 'AC Unit Installation Service',
                        'item_meta' => "Order #{$order->order_id}",
                        'quantity' => 1,
                        'unit' => 'job',
                        'unit_price' => $installationFee,
                        'line_total' => $installationFee,
                    ];
                }

                $parentAr = Receipt::query()
                    ->where('source_type', Receipt::SOURCE_AC_UNIT_ORDER)
                    ->where('source_id', (int) $order->order_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->orderByDesc('receipt_id')
                    ->first();

                $grandTotal = round(collect($items)->sum('line_total'), 2);
                $priorCredited = $parentAr
                    ? round((float) $parentAr->amount_paid_now, 2)
                    : round(min($grandTotal, (float) ($order->down_payment_amount ?? 0)), 2);
                $paidNow = round(max(0.0, $grandTotal - $priorCredited), 2);

                $rawMethod = $order->payment_method ?? 'Cash';
                if ($parentAr && strcasecmp((string) $rawMethod, 'GCash') === 0) {
                    $candidateRef = $this->sanitizeExternalRef($order->reference_number);
                    if ($paidNow <= 0) {
                        $paymentMethod = 'GCash';
                        $extRef = null;
                    } elseif ($candidateRef === null || $candidateRef === $parentAr->external_reference_number) {
                        $paymentMethod = 'Cash';
                        $extRef = null;
                    } else {
                        $paymentMethod = 'GCash';
                        $extRef = $candidateRef;
                    }
                } else {
                    $paymentMethod = $this->normalizePaymentMethod($rawMethod);
                    $extRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($order->reference_number) : null;
                }

                return $this->persistReceipt(
                    documentKind: Receipt::KIND_SALES_INVOICE,
                    transactionCategory: Receipt::CATEGORY_AC_UNIT_ORDER,
                    sourceType: Receipt::SOURCE_AC_UNIT_ORDER,
                    sourceId: (int) $order->order_id,
                    parentReceiptId: $parentAr?->receipt_id,
                    clientId: (int) $order->client_id,
                    customerOverrides: $customerOverrides,
                    items: $items,
                    discountTotal: 0.00,
                    priorPaymentsCredited: $priorCredited,
                    explicitAmountPaidNow: $paidNow,
                    paymentMethod: $paymentMethod,
                    externalReferenceNumber: $extRef,
                    paymentReceiptPath: $order->manager_receipt_path ?: ($order->down_payment_receipt_path ?: null),
                    actor: $actor
                );
            }

            throw new \InvalidArgumentException("Unsupported AcUnitOrder receipt stage [{$stage}].");
        });
    }

    /**
     * Request a void on an Issued receipt (Admin Assistant, Manager, or Super Admin).
     */
    public function requestVoid(Receipt $receipt, User $actor, string $reason): Receipt
    {
        $roleId = (int) $actor->role_id;
        if (! in_array($roleId, [1, 2, 3], true)) {
            throw new AuthorizationException('Only authorized staff can request a receipt void.');
        }

        $trimmedReason = trim($reason);
        if ($trimmedReason === '') {
            throw ValidationException::withMessages([
                'reason' => ['Please provide a reason for voiding this receipt.'],
            ]);
        }

        if ($receipt->status !== Receipt::STATUS_ISSUED) {
            throw ValidationException::withMessages([
                'status' => ["Only receipts in 'Issued' status can request a void (current: {$receipt->status})."],
            ]);
        }

        return DB::transaction(function () use ($receipt, $actor, $trimmedReason) {
            $locked = Receipt::where('receipt_id', $receipt->receipt_id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Receipt::STATUS_ISSUED) {
                throw ValidationException::withMessages([
                    'status' => ["Receipt {$locked->receipt_number} is already {$locked->status}."],
                ]);
            }

            $locked->applyVoidRequest((int) $actor->user_id, $trimmedReason);

            $actorMeta = $this->resolveActorMeta($actor);
            $this->logActivity(
                (int) $actor->user_id,
                'RECEIPT_VOID_REQUESTED',
                sprintf(
                    '%s (%s) requested void for %s. Reason: %s',
                    $actorMeta['name'],
                    $actorMeta['role'],
                    $locked->receipt_number,
                    $trimmedReason
                )
            );

            if (Schema::hasTable('staff_messages')) {
                $approvers = DB::table('users')
                    ->whereIn('role_id', [1, 2])
                    ->where('user_id', '!=', (int) $locked->issued_by_user_id)
                    ->where(function ($q) {
                        $q->whereNull('is_active')->orWhere('is_active', 1);
                    })
                    ->pluck('user_id');

                foreach ($approvers as $approverId) {
                    DB::table('staff_messages')->insert([
                        'sender_id' => (int) $actor->user_id,
                        'recipient_id' => (int) $approverId,
                        'subject' => "[Void Approval Needed] {$locked->receipt_number}",
                        'body' => sprintf(
                            '%s (%s) requested to void %s (₱%s — %s). Reason: %s',
                            $actorMeta['name'],
                            $actorMeta['role'],
                            $locked->receipt_number,
                            number_format((float) $locked->amount_paid_now, 2),
                            $locked->customer_name,
                            $trimmedReason
                        ),
                        'is_read' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            return $locked->fresh(['items', 'parentReceipt']);
        });
    }

    /**
     * Approve a pending void request (strictly Manager or Super Admin, and never the same user who issued it).
     */
    public function approveVoid(Receipt $receipt, User $approver): Receipt
    {
        $roleId = (int) $approver->role_id;
        if (! in_array($roleId, [1, 2], true)) {
            throw new AuthorizationException('Only a Manager or Super Admin can approve a receipt void.');
        }

        if ((int) $approver->user_id === (int) $receipt->issued_by_user_id) {
            throw new AuthorizationException('Self-approval is prohibited: you cannot approve a void for a receipt that you issued.');
        }

        if ($receipt->status !== Receipt::STATUS_VOID_REQUESTED) {
            throw ValidationException::withMessages([
                'status' => ["Only receipts in 'Void Requested' status can be approved for voiding (current: {$receipt->status})."],
            ]);
        }

        return DB::transaction(function () use ($receipt, $approver) {
            $locked = Receipt::where('receipt_id', $receipt->receipt_id)->lockForUpdate()->firstOrFail();

            if ((int) $approver->user_id === (int) $locked->issued_by_user_id) {
                throw new AuthorizationException('Self-approval is prohibited: you cannot approve a void for a receipt that you issued.');
            }

            if ($locked->status !== Receipt::STATUS_VOID_REQUESTED) {
                throw ValidationException::withMessages([
                    'status' => ["Receipt {$locked->receipt_number} is currently {$locked->status} and cannot be voided."],
                ]);
            }

            $locked->applyVoidApproval((int) $approver->user_id);

            $approverMeta = $this->resolveActorMeta($approver);
            $this->logActivity(
                (int) $approver->user_id,
                'RECEIPT_VOID_APPROVED',
                sprintf(
                    '%s (%s) approved void for %s (Customer: %s, Reason: %s).',
                    $approverMeta['name'],
                    $approverMeta['role'],
                    $locked->receipt_number,
                    $locked->customer_name,
                    $locked->void_reason ?? 'N/A'
                )
            );

            $this->notifyCustomerOfReceiptEvent($locked, 'voided');

            return $locked->fresh(['items', 'parentReceipt']);
        });
    }

    /**
     * Build the 4-metric Daily Closeout summary for a given YYYY-MM-DD date.
     */
    public function getDailyCloseoutSummary(?string $dateYmd = null): array
    {
        $targetDate = $dateYmd && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateYmd)
            ? Carbon::parse($dateYmd)->toDateString()
            : now()->toDateString();

        if (! Schema::hasTable('receipts')) {
            return [
                'date' => $targetDate,
                'cash_collected' => 0.00,
                'gcash_confirmed' => 0.00,
                'total_receipts' => 0,
                'voided_count' => 0,
                'voided_amount' => 0.00,
            ];
        }

        $dayReceipts = Receipt::query()
            ->whereDate('issued_at', $targetDate)
            ->get([
                'receipt_id',
                'payment_method',
                'amount_paid_now',
                'status',
            ]);

        $activeReceipts = $dayReceipts->where('status', '!=', Receipt::STATUS_VOIDED);
        $voidedReceipts = $dayReceipts->where('status', Receipt::STATUS_VOIDED);

        // Also count receipts voided on targetDate even if originally issued on an earlier date
        $voidedTodayExtra = Receipt::query()
            ->where('status', Receipt::STATUS_VOIDED)
            ->whereDate('voided_at', $targetDate)
            ->whereDate('issued_at', '!=', $targetDate)
            ->get(['receipt_id', 'amount_paid_now']);

        $allVoidedForDay = $voidedReceipts->concat($voidedTodayExtra)->unique('receipt_id');

        $cashCollected = round((float) $activeReceipts
            ->filter(fn ($r) => strcasecmp((string) $r->payment_method, 'Cash') === 0)
            ->sum('amount_paid_now'), 2);

        $gcashConfirmed = round((float) $activeReceipts
            ->filter(fn ($r) => strcasecmp((string) $r->payment_method, 'GCash') === 0)
            ->sum('amount_paid_now'), 2);

        return [
            'date' => $targetDate,
            'cash_collected' => $cashCollected,
            'gcash_confirmed' => $gcashConfirmed,
            'total_receipts' => $activeReceipts->count(),
            'voided_count' => $allVoidedForDay->count(),
            'voided_amount' => round((float) $allVoidedForDay->sum('amount_paid_now'), 2),
        ];
    }

    /**
     * Format a Receipt model for JSON / UI consumption.
     */
    public function formatReceipt(Receipt $receipt, ?string $routePrefix = null): array
    {
        $receipt->loadMissing(['items', 'parentReceipt']);
        $codePrefix = $receipt->verificationCodePrefix();
        $verifyUrl = url("/verify-receipt/{$receipt->receipt_number}/{$codePrefix}");

        $printUrl = null;
        $pdfUrl = null;
        if ($routePrefix) {
            $printUrl = url("/{$routePrefix}/receipts/{$receipt->receipt_id}/print");
            $pdfUrl = url("/{$routePrefix}/receipts/{$receipt->receipt_id}/pdf");
        }

        $docTitle = match ($receipt->document_kind) {
            Receipt::KIND_ACKNOWLEDGEMENT => 'Acknowledgement Receipt',
            Receipt::KIND_SALES_INVOICE => 'Official Sales Invoice',
            Receipt::KIND_SERVICE_INVOICE => 'Official Service Invoice',
            default => 'Official Receipt',
        };

        $shortLabel = $receipt->document_kind === Receipt::KIND_ACKNOWLEDGEMENT
            ? 'Down Payment (AR)'
            : 'Invoice (INV)';

        return [
            'receipt_id' => (int) $receipt->receipt_id,
            'receipt_number' => $receipt->receipt_number,
            'document_kind' => $receipt->document_kind,
            'document_title' => $docTitle,
            'short_label' => $shortLabel,
            'transaction_category' => $receipt->transaction_category,
            'source_type' => $receipt->source_type,
            'source_id' => (int) $receipt->source_id,
            'linked_reference' => $this->buildLinkedReferenceLabel($receipt),
            'parent_receipt_id' => $receipt->parent_receipt_id ? (int) $receipt->parent_receipt_id : null,
            'parent_receipt_number' => $receipt->parentReceipt?->receipt_number,
            'client_id' => $receipt->client_id ? (int) $receipt->client_id : null,
            'customer_name' => $receipt->customer_name,
            'company_name' => $receipt->company_name,
            'tin' => $receipt->tin,
            'customer_address' => $receipt->customer_address,
            'contact_number' => $receipt->contact_number,
            'subtotal' => round((float) $receipt->subtotal, 2),
            'discount_total' => round((float) $receipt->discount_total, 2),
            'vatable_sales' => round((float) $receipt->vatable_sales, 2),
            'vat_amount' => round((float) $receipt->vat_amount, 2),
            'grand_total' => round((float) $receipt->grand_total, 2),
            'prior_payments_credited' => round((float) $receipt->prior_payments_credited, 2),
            'amount_paid_now' => round((float) $receipt->amount_paid_now, 2),
            'balance_after' => round((float) $receipt->balance_after, 2),
            'payment_method' => $receipt->payment_method,
            'external_reference_number' => $receipt->external_reference_number,
            'effective_reference_number' => $receipt->external_reference_number ?: $receipt->parentReceipt?->external_reference_number,
            'payment_receipt_url' => $receipt->payment_receipt_path
                ? SuperAdminBaseController::formatStorageUrl($receipt->payment_receipt_path)
                : null,
            'issued_by_user_id' => (int) $receipt->issued_by_user_id,
            'issued_by_name' => $receipt->issued_by_name,
            'issued_by_role' => $receipt->issued_by_role,
            'issued_at' => $receipt->issued_at?->toISOString(),
            'issued_at_formatted' => $receipt->issued_at ? $receipt->issued_at->format('M d, Y h:i A') : null,
            'verification_code' => $codePrefix,
            'verification_url' => $verifyUrl,
            'status' => $receipt->status,
            'void_requested_by' => $receipt->void_requested_by ? (int) $receipt->void_requested_by : null,
            'void_reason' => $receipt->void_reason,
            'void_approved_by' => $receipt->void_approved_by ? (int) $receipt->void_approved_by : null,
            'voided_at' => $receipt->voided_at?->toISOString(),
            'voided_at_formatted' => $receipt->voided_at ? $receipt->voided_at->format('M d, Y h:i A') : null,
            'print_url' => $printUrl,
            'pdf_url' => $pdfUrl,
            'items' => $receipt->items->map(fn (ReceiptItem $item) => [
                'id' => (int) $item->id,
                'description' => $item->description,
                'item_meta' => $item->item_meta,
                'quantity' => (float) $item->quantity,
                'unit' => $item->unit,
                'unit_price' => round((float) $item->unit_price, 2),
                'line_total' => round((float) $item->line_total, 2),
            ])->values()->all(),
        ];
    }

    /**
     * Batch-fetch formatted receipts keyed by source_id for a given source_type.
     *
     * @return array<int, array<int, array<string, mixed>>>
     */
    public function getFormattedReceiptsBySource(string $sourceType, array $sourceIds, ?string $routePrefix = null): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $sourceIds))));
        if (empty($ids) || ! Schema::hasTable('receipts')) {
            return [];
        }

        $rows = Receipt::with(['items', 'parentReceipt'])
            ->where('source_type', $sourceType)
            ->whereIn('source_id', $ids)
            ->orderBy('receipt_id')
            ->get();

        $grouped = [];
        foreach ($rows as $rcp) {
            $grouped[(int) $rcp->source_id][] = $this->formatReceipt($rcp, $routePrefix);
        }

        return $grouped;
    }

    /**
     * Resolve an appropriate office staff issuer for automated customer-initiated flows (e.g., AC Unit Order DP).
     */
    public function resolveDefaultStaffIssuer(?int $ocularBookingId = null): User
    {
        if ($ocularBookingId) {
            $booking = DB::table('bookings')->where('booking_id', $ocularBookingId)->first();
            if ($booking && ! empty($booking->service_details)) {
                $details = is_string($booking->service_details)
                    ? (json_decode($booking->service_details, true) ?: [])
                    : (array) $booking->service_details;
                foreach (($details['ocular_personnel'] ?? []) as $person) {
                    if (! empty($person['user_id']) && (int) ($person['role_id'] ?? 0) === 3) {
                        $found = User::find((int) $person['user_id']);
                        if ($found) {
                            return $found;
                        }
                    }
                }
            }
            if ($booking && ! empty($booking->assigned_by)) {
                $assigner = User::find((int) $booking->assigned_by);
                if ($assigner && in_array((int) $assigner->role_id, [1, 2, 3], true)) {
                    return $assigner;
                }
            }
        }

        return User::where('role_id', 3)->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', 1))->orderBy('user_id')->first()
            ?? User::where('role_id', 2)->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', 1))->orderBy('user_id')->first()
            ?? User::where('role_id', 1)->orderBy('user_id')->firstOrFail();
    }

    public function buildLinkedReferenceLabel(Receipt $receipt): string
    {
        if ($receipt->source_type === Receipt::SOURCE_ITEM_ORDER) {
            return "Item Order #{$receipt->source_id}";
        }

        if ($receipt->source_type === Receipt::SOURCE_AC_UNIT_ORDER) {
            $order = Schema::hasTable('ac_unit_orders')
                ? DB::table('ac_unit_orders')->where('order_id', $receipt->source_id)->first(['ocular_booking_id', 'installation_booking_id'])
                : null;
            $parts = ["AC Unit Order #{$receipt->source_id}"];
            if ($order?->ocular_booking_id) {
                $parts[] = "Ocular Inspection #{$order->ocular_booking_id}";
            }
            if ($order?->installation_booking_id) {
                $parts[] = "Booking #{$order->installation_booking_id}";
            }

            return implode(' • ', $parts);
        }

        return "Booking #{$receipt->source_id}";
    }

    // ─── Internal Helpers ───

    protected function buildAndPersistFinalBookingInvoice(
        Booking $booking,
        Payment $payment,
        User $actor,
        string $invoiceKind,
        string $category,
        string $serviceName,
        array $serviceDetails,
        bool $isDirectRetailSale,
        bool $isDirectAcSale
    ): Receipt {
        $bookingId = (int) $booking->booking_id;
        $turnover = is_array($serviceDetails['payment_turnover'] ?? null) ? $serviceDetails['payment_turnover'] : [];
        $unitSummary = $this->summarizeBookingUnits($booking);

        $linkedAcOrder = null;
        if (Schema::hasTable('ac_unit_orders')) {
            $linkedAcOrder = DB::table('ac_unit_orders')
                ->where('installation_booking_id', $bookingId)
                ->orWhere(function ($q) use ($serviceDetails) {
                    if (! empty($serviceDetails['ac_unit_order_id'])) {
                        $q->where('order_id', (int) $serviceDetails['ac_unit_order_id']);
                    }
                })
                ->first();
        }

        $linkedItemOrder = null;
        if (Schema::hasTable('item_orders')) {
            $linkedItemOrder = DB::table('item_orders')
                ->where('linked_booking_id', $bookingId)
                ->whereNotIn('order_status', ['Cancelled'])
                ->first();
            if (! $linkedItemOrder && ! empty($serviceDetails['item_order_id'])) {
                $linkedItemOrder = DB::table('item_orders')
                    ->where('order_id', (int) $serviceDetails['item_order_id'])
                    ->whereNotIn('order_status', ['Cancelled'])
                    ->first();
            }
        }

        $items = [];
        $customerOverrides = [];

        // 1. Direct Walk-in AC Unit Sale (created by updateAcUnit)
        if ($isDirectAcSale && Schema::hasTable('inventory_sales')) {
            $acSale = DB::table('inventory_sales')
                ->where('booking_id', $bookingId)
                ->where('sale_type', 'ac_unit')
                ->first();
            if ($acSale) {
                $customerOverrides = array_filter([
                    'customer_name' => $acSale->customer_name ?: null,
                    'address' => $acSale->customer_address ?: null,
                    'contact_number' => $acSale->customer_contact ?: null,
                ]);
                $meta = implode(' • ', array_filter([
                    $acSale->horsepower ? "{$acSale->horsepower} HP {$acSale->sub_category}" : $acSale->sub_category,
                    ! empty($acSale->motor_type) ? $acSale->motor_type : null,
                    ! empty($acSale->serial_number) ? "SN: {$acSale->serial_number}" : null,
                ]));
                $salePrice = round((float) ($acSale->total_amount ?: $payment->amount_paid), 2);
                $items[] = [
                    'description' => $acSale->item_name ?: trim(str_replace('AC Unit Sale:', '', $serviceName)),
                    'item_meta' => $meta ?: 'Direct AC Unit Purchase',
                    'quantity' => max(1, (int) ($acSale->quantity ?: 1)),
                    'unit' => 'unit',
                    'unit_price' => round((float) ($acSale->unit_price ?: $salePrice), 2),
                    'line_total' => $salePrice,
                ];
            }
        }

        // 2. Direct Walk-in Retail / Spare Part Sale (created by sellItem)
        if ($isDirectRetailSale && empty($items)) {
            $retailSale = Schema::hasTable('inventory_sales')
                ? DB::table('inventory_sales')->where('booking_id', $bookingId)->first()
                : null;
            if ($retailSale) {
                $customerOverrides = array_filter([
                    'customer_name' => $retailSale->customer_name ?: null,
                    'address' => $retailSale->customer_address ?: null,
                    'contact_number' => $retailSale->customer_contact ?: null,
                ]);
                $qty = max(1, (int) ($retailSale->quantity ?: 1));
                $uPrice = round((float) $retailSale->unit_price, 2);
                $lTotal = round((float) ($retailSale->total_amount ?: ($qty * $uPrice)), 2);
                $items[] = [
                    'description' => $retailSale->item_name,
                    'item_meta' => implode(' • ', array_filter([
                        $retailSale->item_type,
                        $retailSale->sub_category,
                        ! empty($retailSale->serial_number) ? "SN: {$retailSale->serial_number}" : null,
                    ])),
                    'quantity' => $qty,
                    'unit' => $retailSale->unit ?: 'pc',
                    'unit_price' => $uPrice,
                    'line_total' => $lTotal,
                ];
            }
        }

        // 3. Standard Service Flows (Installation, Repair / Check-up, Cleaning)
        if (! $isDirectAcSale && ! $isDirectRetailSale) {
            if ($linkedAcOrder) {
                $acUnit = DB::table('ac_units_inventory')->where('ac_unit_id', $linkedAcOrder->ac_unit_id)->first();
                $acMeta = implode(' • ', array_filter([
                    $acUnit ? "{$acUnit->horsepower} HP {$acUnit->ac_type} (" . ($acUnit->motor_type ?? 'Inverter') . ')' : null,
                    ! empty($acUnit?->serial_number) ? "SN: {$acUnit->serial_number}" : null,
                    $linkedAcOrder->ocular_booking_id ? "Ocular #{$linkedAcOrder->ocular_booking_id}" : null,
                    $linkedAcOrder->recommendation_id ? "Rec #{$linkedAcOrder->recommendation_id}" : null,
                    "AC Order #{$linkedAcOrder->order_id}",
                ]));
                $acQty = max(1, (int) ($linkedAcOrder->quantity ?: 1));
                $acUnitPrice = round((float) $linkedAcOrder->unit_price, 2);
                $acTotal = round((float) ($linkedAcOrder->total_unit_price ?: ($acQty * $acUnitPrice)), 2);

                $items[] = [
                    'description' => $acUnit ? trim("{$acUnit->brand} {$acUnit->model}") : 'Company-Supplied AC Unit',
                    'item_meta' => $acMeta,
                    'quantity' => $acQty,
                    'unit' => 'unit',
                    'unit_price' => $acUnitPrice,
                    'line_total' => $acTotal,
                ];

                $deliveryFee = round((float) ($turnover['delivery_fee'] ?? $linkedAcOrder->delivery_fee ?? 0), 2);
                if ($deliveryFee > 0) {
                    $items[] = [
                        'description' => 'AC Unit Delivery Fee',
                        'item_meta' => "AC Order #{$linkedAcOrder->order_id}",
                        'quantity' => 1,
                        'unit' => 'trip',
                        'unit_price' => $deliveryFee,
                        'line_total' => $deliveryFee,
                    ];
                }
            }

            if ($linkedItemOrder) {
                $spItem = DB::table('inventory_items')->where('item_id', $linkedItemOrder->item_id)->first();
                $spQty = max(1, (int) $linkedItemOrder->quantity);
                $spPrice = round((float) $linkedItemOrder->unit_price, 2);
                $spTotal = round((float) ($linkedItemOrder->total_amount ?: ($spQty * $spPrice)), 2);
                $items[] = [
                    'description' => 'Spare Part: ' . ($spItem->item_name ?? 'Replacement Part'),
                    'item_meta' => "Item Order #{$linkedItemOrder->order_id} • Deliver & Replace",
                    'quantity' => $spQty,
                    'unit' => $spItem->unit ?? 'pc',
                    'unit_price' => $spPrice,
                    'line_total' => $spTotal,
                ];
            }

            // Consumed billable spare parts / materials from booking_materials
            $consumedMaterialsTotal = 0.0;
            if (Schema::hasTable('booking_materials')) {
                $matRows = DB::table('booking_materials as bm')
                    ->join('inventory_items as ii', 'ii.item_id', '=', 'bm.item_id')
                    ->where('bm.booking_id', $bookingId)
                    ->get([
                        'bm.item_id',
                        'bm.quantity_used',
                        'ii.item_name',
                        'ii.item_type',
                        'ii.sub_category',
                        'ii.unit',
                        'ii.selling_price',
                    ]);

                foreach ($matRows as $mRow) {
                    if ($linkedItemOrder && (int) $mRow->item_id === (int) $linkedItemOrder->item_id) {
                        continue;
                    }
                    $sellPrice = round((float) ($mRow->selling_price ?? 0), 2);
                    if ($mRow->item_type !== 'Spare Part' && $sellPrice <= 0) {
                        continue;
                    }
                    if ($sellPrice <= 0) {
                        continue;
                    }
                    $mQty = max(1, (int) $mRow->quantity_used);
                    $mLineTotal = round($mQty * $sellPrice, 2);
                    $consumedMaterialsTotal = round($consumedMaterialsTotal + $mLineTotal, 2);

                    $items[] = [
                        'description' => $mRow->item_name,
                        'item_meta' => implode(' • ', array_filter([$mRow->item_type, $mRow->sub_category])),
                        'quantity' => $mQty,
                        'unit' => $mRow->unit ?: 'pc',
                        'unit_price' => $sellPrice,
                        'line_total' => $mLineTotal,
                    ];
                }
            }

            // Compute prior AR credits across this booking + any linked AC Unit Order / Item Order
            $bookingArs = Receipt::query()
                ->where('source_type', Receipt::SOURCE_BOOKING)
                ->where('source_id', $bookingId)
                ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                ->where('status', '!=', Receipt::STATUS_VOIDED)
                ->orderBy('receipt_id')
                ->get();

            $acOrderAr = $linkedAcOrder
                ? Receipt::query()
                    ->where('source_type', Receipt::SOURCE_AC_UNIT_ORDER)
                    ->where('source_id', (int) $linkedAcOrder->order_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->orderByDesc('receipt_id')
                    ->first()
                : null;

            $itemOrderAr = $linkedItemOrder
                ? Receipt::query()
                    ->where('source_type', Receipt::SOURCE_ITEM_ORDER)
                    ->where('source_id', (int) $linkedItemOrder->order_id)
                    ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->orderByDesc('receipt_id')
                    ->first()
                : null;

            $bookingPriorCredit = $bookingArs->isNotEmpty()
                ? round((float) $bookingArs->sum('amount_paid_now'), 2)
                : round((float) ($turnover['reservation_down_payment'] ?? 0), 2);

            $acOrderPriorCredit = $linkedAcOrder
                ? ($acOrderAr ? round((float) $acOrderAr->amount_paid_now, 2) : round((float) ($linkedAcOrder->down_payment_amount ?? 0), 2))
                : 0.00;

            $itemOrderPriorCredit = $linkedItemOrder
                ? ($itemOrderAr ? round((float) $itemOrderAr->amount_paid_now, 2) : round((float) ($serviceDetails['spare_part_paid_amount'] ?? $linkedItemOrder->down_payment_amount ?? 0), 2))
                : 0.00;

            $priorCredited = round($bookingPriorCredit + $acOrderPriorCredit + $itemOrderPriorCredit, 2);
            $paidNow = round(max(0.0, (float) ($payment->amount_paid ?? 0)), 2);

            $nonLaborTotal = round(collect($items)->sum('line_total'), 2);
            $targetContractTotal = round($priorCredited + $paidNow, 2);
            $explicitBookingPrice = round((float) ($payment->booking_price ?? 0), 2);

            if ($targetContractTotal > $nonLaborTotal) {
                $laborPrice = round($targetContractTotal - $nonLaborTotal, 2);
            } elseif ($explicitBookingPrice > 0) {
                $laborPrice = max(0.0, round($explicitBookingPrice - $consumedMaterialsTotal, 2));
            } else {
                $laborPrice = round((float) ($booking->service?->base_price ?? 0), 2);
            }

            if ($laborPrice > 0 || empty($items)) {
                array_unshift($items, [
                    'description' => $serviceName,
                    'item_meta' => implode(' • ', array_filter([
                        $unitSummary ?: null,
                        ! empty($serviceDetails['rate_type']) ? $serviceDetails['rate_type'] : null,
                    ])) ?: "Booking #{$bookingId}",
                    'quantity' => 1,
                    'unit' => 'job',
                    'unit_price' => $laborPrice,
                    'line_total' => $laborPrice,
                ]);
            }

            $parentReceiptId = $acOrderAr?->receipt_id
                ?? $itemOrderAr?->receipt_id
                ?? $bookingArs->last()?->receipt_id;

            $paymentMethod = $this->normalizePaymentMethod($payment->payment_method ?? ($turnover['payment_method'] ?? $booking->service_payment_method ?? 'Cash'));
            $candidateRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($payment->reference_number ?? ($turnover['reference_number'] ?? null)) : null;

            // Avoid colliding if turnover copied an existing parent AR's GCash reference
            if ($candidateRef !== null) {
                $usedOnPrior = Receipt::query()
                    ->where('payment_method', 'GCash')
                    ->where('status', '!=', Receipt::STATUS_VOIDED)
                    ->where('external_reference_number', $candidateRef)
                    ->exists();
                if ($usedOnPrior && $paidNow <= 0) {
                    $candidateRef = null;
                }
            }

            return $this->persistReceipt(
                documentKind: $invoiceKind,
                transactionCategory: $category,
                sourceType: Receipt::SOURCE_BOOKING,
                sourceId: $bookingId,
                parentReceiptId: $parentReceiptId,
                clientId: $booking->client_id ? (int) $booking->client_id : null,
                customerOverrides: $customerOverrides,
                items: $items,
                discountTotal: 0.00,
                priorPaymentsCredited: $priorCredited,
                explicitAmountPaidNow: $paidNow,
                paymentMethod: $paymentMethod,
                externalReferenceNumber: $candidateRef,
                paymentReceiptPath: $payment->receipt_image ?: ($serviceDetails['unit_purchase_receipt_path'] ?? null),
                actor: $actor
            );
        }

        // Direct sale fallback persistence
        if (empty($items)) {
            $amt = round((float) ($payment->amount_paid ?? 0), 2);
            $items[] = [
                'description' => $serviceName,
                'item_meta' => "Booking #{$bookingId}",
                'quantity' => 1,
                'unit' => 'pc',
                'unit_price' => $amt,
                'line_total' => $amt,
            ];
        }

        $paidNow = round(max(0.0, (float) ($payment->amount_paid ?? collect($items)->sum('line_total'))), 2);
        $paymentMethod = $this->normalizePaymentMethod($payment->payment_method ?? 'Cash');
        $extRef = $paymentMethod === 'GCash' ? $this->sanitizeExternalRef($payment->reference_number) : null;

        return $this->persistReceipt(
            documentKind: $invoiceKind,
            transactionCategory: $category,
            sourceType: Receipt::SOURCE_BOOKING,
            sourceId: $bookingId,
            parentReceiptId: null,
            clientId: $booking->client_id ? (int) $booking->client_id : null,
            customerOverrides: $customerOverrides,
            items: $items,
            discountTotal: 0.00,
            priorPaymentsCredited: 0.00,
            explicitAmountPaidNow: $paidNow,
            paymentMethod: $paymentMethod,
            externalReferenceNumber: $extRef,
            paymentReceiptPath: $payment->receipt_image ?: null,
            actor: $actor
        );
    }

    protected function persistReceipt(
        string $documentKind,
        string $transactionCategory,
        string $sourceType,
        int $sourceId,
        ?int $parentReceiptId,
        ?int $clientId,
        array $customerOverrides,
        array $items,
        float $discountTotal,
        float $priorPaymentsCredited,
        ?float $explicitAmountPaidNow,
        string $paymentMethod,
        ?string $externalReferenceNumber,
        ?string $paymentReceiptPath,
        User $actor
    ): Receipt {
        $receiptNumber = $this->generateNextReceiptNumber($documentKind);
        $customer = $this->resolveCustomerSnapshot($clientId, $customerOverrides);
        $financials = $this->computeVatInclusiveFinancials(
            $items,
            $discountTotal,
            $priorPaymentsCredited,
            $explicitAmountPaidNow
        );
        $actorMeta = $this->resolveActorMeta($actor);
        $issuedAt = now();

        $verificationHash = Receipt::generateVerificationHash([
            'receipt_number' => $receiptNumber,
            'document_kind' => $documentKind,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'client_id' => $clientId,
            'grand_total' => $financials['grand_total'],
            'amount_paid_now' => $financials['amount_paid_now'],
            'issued_at' => $issuedAt,
        ]);

        $receipt = Receipt::create([
            'receipt_number' => $receiptNumber,
            'document_kind' => $documentKind,
            'transaction_category' => $transactionCategory,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'parent_receipt_id' => $parentReceiptId,
            'client_id' => $clientId,
            'customer_name' => $customer['customer_name'],
            'company_name' => $customer['company_name'],
            'tin' => $customer['tin'],
            'customer_address' => $customer['customer_address'],
            'contact_number' => $customer['contact_number'],
            'subtotal' => $financials['subtotal'],
            'discount_total' => $financials['discount_total'],
            'vatable_sales' => $financials['vatable_sales'],
            'vat_amount' => $financials['vat_amount'],
            'grand_total' => $financials['grand_total'],
            'prior_payments_credited' => $financials['prior_payments_credited'],
            'amount_paid_now' => $financials['amount_paid_now'],
            'balance_after' => $financials['balance_after'],
            'payment_method' => $paymentMethod,
            'external_reference_number' => $externalReferenceNumber,
            'payment_receipt_path' => $paymentReceiptPath,
            'issued_by_user_id' => $actorMeta['user_id'],
            'issued_by_name' => $actorMeta['name'],
            'issued_by_role' => $actorMeta['role'],
            'issued_at' => $issuedAt,
            'verification_hash' => $verificationHash,
            'status' => Receipt::STATUS_ISSUED,
        ]);

        foreach ($financials['items'] as $line) {
            ReceiptItem::create([
                'receipt_id' => $receipt->receipt_id,
                'description' => $line['description'],
                'item_meta' => $line['item_meta'],
                'quantity' => $line['quantity'],
                'unit' => $line['unit'],
                'unit_price' => $line['unit_price'],
                'line_total' => $line['line_total'],
            ]);
        }

        $this->logActivity(
            $actorMeta['user_id'],
            'RECEIPT_ISSUED',
            sprintf(
                'Issued %s (%s) for %s — Paid: ₱%s (%s).',
                $receipt->receipt_number,
                str_replace('_', ' ', ucfirst($documentKind)),
                $customer['customer_name'],
                number_format($financials['amount_paid_now'], 2),
                $paymentMethod
            )
        );

        $this->notifyCustomerOfReceiptEvent($receipt, 'issued');

        return $receipt->load(['items', 'parentReceipt']);
    }

    /**
     * Generate sequential AR-YYYY-00001 or INV-YYYY-00001 using lockForUpdate() inside the active transaction.
     */
    protected function generateNextReceiptNumber(string $documentKind): string
    {
        $prefix = $documentKind === Receipt::KIND_ACKNOWLEDGEMENT ? 'AR' : 'INV';
        $year = now()->format('Y');
        $likePrefix = "{$prefix}-{$year}-%";

        $existingNumbers = DB::table('receipts')
            ->where('receipt_number', 'like', $likePrefix)
            ->lockForUpdate()
            ->pluck('receipt_number');

        $maxSeq = 0;
        foreach ($existingNumbers as $num) {
            if (preg_match('/-(\d+)$/', (string) $num, $matches)) {
                $seq = (int) $matches[1];
                if ($seq > $maxSeq) {
                    $maxSeq = $seq;
                }
            }
        }

        return sprintf('%s-%s-%05d', $prefix, $year, $maxSeq + 1);
    }

    /**
     * Compute 12% Philippine VAT-inclusive totals matching SuperAdminDocumentController::calculateDocumentTotals.
     */
    public function computeVatInclusiveFinancials(
        array $rawItems,
        float $discountTotal = 0.0,
        float $priorPaymentsCredited = 0.0,
        ?float $explicitAmountPaidNow = null
    ): array {
        $normalizedItems = [];
        $subtotal = 0.0;

        foreach ($rawItems as $item) {
            $qty = round(max(0.01, (float) ($item['quantity'] ?? 1)), 2);
            $unitPrice = round(max(0.0, (float) ($item['unit_price'] ?? 0)), 2);
            $lineTotal = isset($item['line_total'])
                ? round(max(0.0, (float) $item['line_total']), 2)
                : round($qty * $unitPrice, 2);

            $subtotal = round($subtotal + $lineTotal, 2);

            $normalizedItems[] = [
                'description' => mb_substr(trim((string) ($item['description'] ?? 'Item')), 0, 500),
                'item_meta' => ! empty($item['item_meta']) ? mb_substr(trim((string) $item['item_meta']), 0, 500) : null,
                'quantity' => $qty,
                'unit' => mb_substr(trim((string) ($item['unit'] ?? 'pc')) ?: 'pc', 0, 40),
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ];
        }

        $discount = round(min(max(0.0, $discountTotal), $subtotal), 2);
        $grandTotal = round(max(0.0, $subtotal - $discount), 2);

        // 12% VAT-inclusive calculation matching SuperAdminDocumentController
        $vatableSales = round($grandTotal / 1.12, 2);
        $vatAmount = round($grandTotal - $vatableSales, 2);

        $priorCredited = round(min(max(0.0, $priorPaymentsCredited), $grandTotal), 2);
        $netPayable = round(max(0.0, $grandTotal - $priorCredited), 2);

        $amountPaidNow = $explicitAmountPaidNow !== null
            ? round(min(max(0.0, $explicitAmountPaidNow), $netPayable), 2)
            : $netPayable;

        $balanceAfter = round(max(0.0, $netPayable - $amountPaidNow), 2);

        return [
            'items' => $normalizedItems,
            'subtotal' => $subtotal,
            'discount_total' => $discount,
            'vatable_sales' => $vatableSales,
            'vat_amount' => $vatAmount,
            'grand_total' => $grandTotal,
            'prior_payments_credited' => $priorCredited,
            'amount_paid_now' => $amountPaidNow,
            'balance_after' => $balanceAfter,
        ];
    }

    protected function resolveCustomerSnapshot(?int $clientId, array $overrides = []): array
    {
        $user = $clientId ? User::find($clientId) : null;

        $fullName = trim((string) ($overrides['customer_name'] ?? ''));
        if ($fullName === '' && $user) {
            $fullName = $user->name ?: trim(($user->given_name ?? '') . ' ' . ($user->last_name ?? ''));
        }
        if ($fullName === '') {
            $fullName = 'Walk-in Customer';
        }

        $companyName = $overrides['company_name'] ?? null;
        $tin = $overrides['tin'] ?? null;

        if ($user) {
            if ($companyName === null && ! empty($user->company_name)) {
                $companyName = trim((string) $user->company_name);
            }
            if ($tin === null && ! empty($user->tin)) {
                $tin = trim((string) $user->tin);
            }
        }

        $address = trim((string) ($overrides['address'] ?? ($user->address ?? '')));
        $contact = trim((string) ($overrides['contact_number'] ?? ($user->contact_number ?? '')));

        return [
            'customer_name' => mb_substr($fullName, 0, 191),
            'company_name' => $companyName ? mb_substr((string) $companyName, 0, 255) : null,
            'tin' => $tin ? mb_substr((string) $tin, 0, 60) : null,
            'customer_address' => $address !== '' ? $address : null,
            'contact_number' => $contact !== '' ? mb_substr($contact, 0, 60) : null,
        ];
    }

    protected function resolveActorMeta(User $actor): array
    {
        $roleId = (int) $actor->role_id;
        if ($roleId === 6) {
            $staffFallback = $this->resolveDefaultStaffIssuer();
            return $this->resolveActorMeta($staffFallback);
        }

        $name = $actor->name ?: trim(($actor->given_name ?? '') . ' ' . ($actor->last_name ?? ''));
        if ($name === '' || ($roleId === 1 && strcasecmp($name, 'Super Admin User') === 0)) {
            $name = $roleId === 1 ? 'Georgita K. Apostol' : (self::ROLE_LABELS[$roleId] ?? 'Staff');
        }

        return [
            'user_id' => (int) $actor->user_id,
            'name' => mb_substr($name, 0, 150),
            'role' => self::ROLE_LABELS[$roleId] ?? 'Staff',
        ];
    }

    protected function resolveBookingTransactionCategory(Booking $booking, string $serviceName): string
    {
        if (str_starts_with($serviceName, 'AC Unit Sale:')) {
            return Receipt::CATEGORY_AC_UNIT_ORDER;
        }

        if (str_starts_with($serviceName, 'Retail Sale:') || str_starts_with($serviceName, 'Spare Part Sale:')) {
            return Receipt::CATEGORY_ITEM_ORDER;
        }

        $lower = strtolower($serviceName . ' ' . ($booking->service?->category ?? ''));
        $serviceId = (int) $booking->service_id;

        if ($serviceId === 1 || str_contains($lower, 'install')) {
            return Receipt::CATEGORY_INSTALLATION;
        }

        if ($serviceId === 2 || str_contains($lower, 'repair') || str_contains($lower, 'check')) {
            return Receipt::CATEGORY_REPAIR;
        }

        return Receipt::CATEGORY_CLEANING;
    }

    protected function summarizeBookingUnits(Booking $booking): string
    {
        $units = is_array($booking->units_data) ? $booking->units_data : [];
        if (empty($units)) {
            return '';
        }

        $parts = [];
        foreach (array_slice($units, 0, 3) as $u) {
            if (! is_array($u)) {
                continue;
            }
            $qty = max(1, (int) ($u['quantity'] ?? 1));
            $brand = trim((string) ($u['brand'] ?? ''));
            $type = trim((string) ($u['unit_type'] ?? $u['ac_type'] ?? ''));
            $cap = trim((string) ($u['capacity'] ?? $u['horsepower'] ?? ''));
            $motor = trim((string) ($u['motor_type'] ?? ''));
            $desc = trim(implode(' ', array_filter([
                "{$qty}x",
                $brand !== '' ? $brand : null,
                $type !== '' ? $type : null,
                $cap !== '' && strtolower($cap) !== 'not sure' ? "({$cap})" : null,
                $motor !== '' && strtolower($motor) !== 'not sure' ? $motor : null,
            ])));
            if ($desc !== '') {
                $parts[] = $desc;
            }
        }

        return implode(', ', $parts);
    }

    protected function normalizePaymentMethod(?string $method): string
    {
        return strcasecmp(trim((string) $method), 'GCash') === 0 ? 'GCash' : 'Cash';
    }

    protected function sanitizeExternalRef(?string $ref): ?string
    {
        $trimmed = trim((string) $ref);
        if ($trimmed === '' || str_starts_with($trimmed, 'CASH-') || str_starts_with($trimmed, 'CT-RCP-')) {
            return null;
        }

        return mb_substr($trimmed, 0, 100);
    }

    protected function logActivity(int $userId, string $actionType, string $description): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function notifyCustomerOfReceiptEvent(Receipt $receipt, string $event): void
    {
        if (! $receipt->client_id) {
            return;
        }

        // Touch user_notification_reads awareness via receipt timestamps (rendered live in TopbarWidgetController)
        // Also insert into Laravel notifications table if present
        if (Schema::hasTable('notifications')) {
            try {
                DB::table('notifications')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'type' => 'App\\Notifications\\OfficialReceiptNotification',
                    'notifiable_type' => User::class,
                    'notifiable_id' => (int) $receipt->client_id,
                    'data' => json_encode([
                        'event' => $event,
                        'receipt_id' => (int) $receipt->receipt_id,
                        'receipt_number' => $receipt->receipt_number,
                        'document_kind' => $receipt->document_kind,
                        'amount_paid_now' => (float) $receipt->amount_paid_now,
                        'status' => $receipt->status,
                        'void_reason' => $receipt->void_reason,
                    ]),
                    'read_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable $e) {
                // Ignore if optional notifications table schema differs
            }
        }
    }
}
