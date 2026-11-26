<?php

namespace Tests\Feature;

use App\Models\AcUnitOrder;
use App\Models\Booking;
use App\Models\ItemOrder;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\User;
use App\Services\ReceiptService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use LogicException;
use Tests\TestCase;

class ReceiptSystemTest extends TestCase
{
    use DatabaseTransactions;

    protected ReceiptService $receiptService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->receiptService = app(ReceiptService::class);

        DB::table('roles')->insertOrIgnore([
            ['role_id' => 1, 'role_name' => 'Super Admin', 'is_system' => true],
            ['role_id' => 2, 'role_name' => 'Manager', 'is_system' => true],
            ['role_id' => 3, 'role_name' => 'Admin Assistant', 'is_system' => true],
            ['role_id' => 4, 'role_name' => 'Tools Man', 'is_system' => true],
            ['role_id' => 5, 'role_name' => 'Technician', 'is_system' => true],
            ['role_id' => 6, 'role_name' => 'Customer', 'is_system' => true],
            ['role_id' => 7, 'role_name' => 'Head Technician', 'is_system' => true],
        ]);

        DB::table('services')->insertOrIgnore([
            ['service_id' => 1, 'service_name' => 'Installation', 'category' => 'Installation', 'description' => 'AC Installation', 'base_price' => 2500.00, 'booking_fee' => 50.00, 'is_active' => 1],
            ['service_id' => 2, 'service_name' => 'Repair / Check-up', 'category' => 'Repair', 'description' => 'AC Repair', 'base_price' => 1200.00, 'booking_fee' => 50.00, 'is_active' => 1],
            ['service_id' => 3, 'service_name' => 'Cleaning / Preventive Maintenance', 'category' => 'Cleaning', 'description' => 'AC Cleaning', 'base_price' => 800.00, 'booking_fee' => 50.00, 'is_active' => 1],
            ['service_id' => 4, 'service_name' => 'Ocular Inspection', 'category' => 'Ocular Inspection', 'description' => 'Free Ocular Inspection', 'base_price' => 0.00, 'booking_fee' => 0.00, 'is_active' => 1],
        ]);
    }

    private function makeUser(int $roleId, array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role_id' => $roleId,
            'given_name' => 'Test',
            'last_name' => 'Role' . $roleId,
            'address' => 'Canelar, Zamboanga City',
            'contact_number' => '09171234567',
            'is_active' => true,
            'email_verified_at' => now(),
        ], $overrides));
    }

    public function test_anti_fraud_immutability_and_gcash_reference_uniqueness(): void
    {
        $manager = $this->makeUser(2, ['given_name' => 'Marco', 'last_name' => 'Manager']);
        $customer = $this->makeUser(6, [
            'given_name' => 'Elena',
            'last_name' => 'Santos',
            'account_type' => 'business',
            'company_name' => 'Santos Cold Storage Inc.',
            'tin' => '123-456-789-000',
        ]);

        $booking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'Approved',
            'service_payment_method' => 'GCash',
            'units_data' => [['brand' => 'Daikin', 'unit_type' => 'Split Type', 'capacity' => '2.0 HP', 'motor_type' => 'Inverter', 'quantity' => 1]],
        ]);

        $uniqueGcashRef = 'GC' . random_int(1000000000, 9999999999);

        $payment = Payment::create([
            'booking_id' => $booking->booking_id,
            'amount_paid' => 50.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Appointment Reservation Fee',
            'reference_number' => $uniqueGcashRef,
            'payment_date' => now(),
        ]);

        $receipt = $this->receiptService->issueForBookingPayment($booking, $payment, $manager);

        $this->assertNotNull($receipt);
        $this->assertMatchesRegularExpression('/^AR-\d{4}-\d{5}$/', $receipt->receipt_number);
        $this->assertSame(Receipt::KIND_ACKNOWLEDGEMENT, $receipt->document_kind);
        $this->assertSame('Santos Cold Storage Inc.', $receipt->company_name);
        $this->assertSame('123-456-789-000', $receipt->tin);
        $this->assertEquals(50.00, $receipt->grand_total);
        $this->assertEquals(round(50.00 / 1.12, 2), $receipt->vatable_sales);
        $this->assertEquals(round(50.00 - round(50.00 / 1.12, 2), 2), $receipt->vat_amount);

        // 1. Block UPDATE on financial/snapshot fields
        $threwReceiptUpdate = false;
        try {
            $receipt->update(['grand_total' => 5000.00]);
        } catch (LogicException $e) {
            $threwReceiptUpdate = true;
        }
        $this->assertTrue($threwReceiptUpdate, 'Updating financial columns on Receipt must throw LogicException.');

        // 2. Block DELETE on Receipt
        $threwReceiptDelete = false;
        try {
            $receipt->delete();
        } catch (LogicException $e) {
            $threwReceiptDelete = true;
        }
        $this->assertTrue($threwReceiptDelete, 'Deleting Receipt must throw LogicException.');

        // 3. Block UPDATE & DELETE on ReceiptItem
        $firstItem = $receipt->items->first();
        $this->assertNotNull($firstItem);

        $threwItemUpdate = false;
        try {
            $firstItem->update(['unit_price' => 1.00]);
        } catch (LogicException $e) {
            $threwItemUpdate = true;
        }
        $this->assertTrue($threwItemUpdate, 'Updating ReceiptItem must throw LogicException.');

        $threwItemDelete = false;
        try {
            $firstItem->delete();
        } catch (LogicException $e) {
            $threwItemDelete = true;
        }
        $this->assertTrue($threwItemDelete, 'Deleting ReceiptItem must throw LogicException.');

        // 4. Block duplicate external_reference_number across non-voided GCash receipts
        $secondBooking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 3,
            'scheduled_date' => now()->addDays(2),
            'booking_status' => 'Approved',
            'service_payment_method' => 'GCash',
        ]);
        $duplicatePay = Payment::create([
            'booking_id' => $secondBooking->booking_id,
            'amount_paid' => 50.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Appointment Reservation Fee',
            'reference_number' => $uniqueGcashRef,
            'payment_date' => now(),
        ]);

        $this->expectException(ValidationException::class);
        $this->receiptService->issueForBookingPayment($secondBooking, $duplicatePay, $manager);
    }

    public function test_installation_repair_and_cleaning_flows_credit_prior_ar_and_skip_waived_fees(): void
    {
        $manager = $this->makeUser(2, ['given_name' => 'Ramon', 'last_name' => 'Reyes']);
        $customer = $this->makeUser(6, ['given_name' => 'Carlo', 'last_name' => 'Diaz']);

        // A. Waived fee repair booking -> skips AR
        $waivedBooking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 2,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'Approved',
            'service_details' => ['booking_fee_waived' => true],
        ]);
        $zeroPay = Payment::create([
            'booking_id' => $waivedBooking->booking_id,
            'amount_paid' => 0.00,
            'payment_status' => 'Paid',
            'payment_method' => 'Cash',
            'payment_type' => 'Appointment Reservation Fee',
            'payment_date' => now(),
        ]);
        $this->assertNull($this->receiptService->issueForBookingPayment($waivedBooking, $zeroPay, $manager));

        // B. Repair booking with reservation fee + consumed spare part + final turnover
        $repairBooking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 2,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'Approved',
            'service_details' => [
                'payment_turnover' => [
                    'reservation_down_payment' => 50.00,
                    'payment_method' => 'Cash',
                ],
            ],
        ]);
        $resPay = Payment::create([
            'booking_id' => $repairBooking->booking_id,
            'amount_paid' => 50.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Appointment Reservation Fee',
            'reference_number' => 'GC' . random_int(1000000000, 9999999999),
            'payment_date' => now(),
        ]);
        $ar = $this->receiptService->issueForBookingPayment($repairBooking, $resPay, $manager);
        $this->assertNotNull($ar);
        $this->assertSame(Receipt::CATEGORY_REPAIR, $ar->transaction_category);

        // Log a billable spare part on repairBooking
        $partId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Capacitor 45 MFD',
            'item_type' => 'Spare Part',
            'inventory_mode' => 'spare_part',
            'sub_category' => 'Capacitors',
            'quantity_on_hand' => 10,
            'reorder_level' => 2,
            'unit' => 'pc',
            'capital' => 300.00,
            'profit' => 200.00,
            'selling_price' => 500.00,
            'status' => 'Available / On Hand',
            'created_at' => now(),
        ], 'item_id');

        DB::table('booking_materials')->insert([
            'booking_id' => $repairBooking->booking_id,
            'item_id' => $partId,
            'quantity_used' => 1,
            'logged_at' => now(),
        ]);

        $repairBooking->update(['booking_status' => 'Completed']);
        $turnoverPay = Payment::create([
            'booking_id' => $repairBooking->booking_id,
            'booking_price' => 1200.00,
            'spare_parts_price' => 500.00,
            'amount_paid' => 1650.00, // 1200 labor + 500 part - 50 reservation AR
            'payment_status' => 'Paid',
            'payment_method' => 'Cash',
            'payment_type' => 'Service Balance Turnover Payment',
            'payment_date' => now(),
        ]);

        $inv = $this->receiptService->issueForBookingPayment($repairBooking->fresh(), $turnoverPay, $manager);
        $this->assertNotNull($inv);
        $this->assertMatchesRegularExpression('/^INV-\d{4}-\d{5}$/', $inv->receipt_number);
        $this->assertSame(Receipt::KIND_SERVICE_INVOICE, $inv->document_kind);
        $this->assertSame($ar->receipt_id, $inv->parent_receipt_id);
        $this->assertEquals(1700.00, $inv->grand_total);
        $this->assertEquals(50.00, $inv->prior_payments_credited);
        $this->assertEquals(1650.00, $inv->amount_paid_now);
        $this->assertEquals(0.00, $inv->balance_after);
        $this->assertCount(2, $inv->items);

        // C. Cleaning flow
        $cleanBooking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 3,
            'scheduled_date' => now(),
            'booking_status' => 'Completed',
        ]);
        $cleanPay = Payment::create([
            'booking_id' => $cleanBooking->booking_id,
            'booking_price' => 800.00,
            'amount_paid' => 800.00,
            'payment_status' => 'Paid',
            'payment_method' => 'Cash',
            'payment_type' => 'Service Balance Turnover Payment',
            'payment_date' => now(),
        ]);
        $cleanInv = $this->receiptService->issueForBookingPayment($cleanBooking, $cleanPay, $manager);
        $this->assertNotNull($cleanInv);
        $this->assertSame(Receipt::CATEGORY_CLEANING, $cleanInv->transaction_category);
        $this->assertEquals(800.00, $cleanInv->grand_total);
    }

    public function test_item_order_http_flow_issues_ar_on_review_and_sales_invoice_on_pickup(): void
    {
        $assistant = $this->makeUser(3, ['given_name' => 'Ana', 'last_name' => 'Assistant']);
        $customer = $this->makeUser(6, ['given_name' => 'Liza', 'last_name' => 'Buyer']);

        $itemId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'AC Coil Cleaner Spray',
            'item_type' => 'Material',
            'inventory_mode' => 'sale',
            'sub_category' => 'Refrigerants & Chemicals',
            'quantity_on_hand' => 20,
            'reorder_level' => 5,
            'unit' => 'can',
            'capital' => 200.00,
            'profit' => 100.00,
            'selling_price' => 300.00,
            'status' => 'Available',
            'created_at' => now(),
        ], 'item_id');

        $gcashRef = 'IO' . random_int(1000000000, 9999999999);
        $order = ItemOrder::create([
            'client_id' => $customer->user_id,
            'item_id' => $itemId,
            'item_category' => 'material',
            'quantity' => 6,
            'unit_price' => 300.00,
            'total_amount' => 1800.00,
            'down_payment_amount' => 900.00,
            'amount_paid' => 900.00,
            'remaining_balance' => 900.00,
            'payment_method' => 'GCash',
            'reference_number' => $gcashRef,
            'payment_review_status' => 'Pending Review',
            'fulfillment_type' => 'pickup',
            'order_status' => 'Pending Payment Review',
        ]);

        // 1. Admin Assistant marks GCash payment Sufficient -> issues AR
        $reviewResp = $this->actingAs($assistant)
            ->postJson("/admin-assistant/item-orders/{$order->order_id}/review-payment", [
                'decision' => 'sufficient',
            ]);
        $reviewResp->assertOk();

        $arReceipt = Receipt::where('source_type', Receipt::SOURCE_ITEM_ORDER)
            ->where('source_id', $order->order_id)
            ->where('document_kind', Receipt::KIND_ACKNOWLEDGEMENT)
            ->first();

        $this->assertNotNull($arReceipt);
        $this->assertEquals(1800.00, $arReceipt->grand_total);
        $this->assertEquals(900.00, $arReceipt->amount_paid_now);
        $this->assertEquals(900.00, $arReceipt->balance_after);
        $this->assertSame($gcashRef, $arReceipt->external_reference_number);

        // 2. Admin Assistant confirms walk-in Cash pickup -> issues final INV crediting prior AR
        $pickupResp = $this->actingAs($assistant)
            ->postJson("/admin-assistant/item-orders/{$order->order_id}/confirm-pickup", [
                'payment_method' => 'Cash',
            ]);
        $pickupResp->assertOk();

        $invReceipt = Receipt::where('source_type', Receipt::SOURCE_ITEM_ORDER)
            ->where('source_id', $order->order_id)
            ->where('document_kind', Receipt::KIND_SALES_INVOICE)
            ->first();

        $this->assertNotNull($invReceipt);
        $this->assertSame($arReceipt->receipt_id, $invReceipt->parent_receipt_id);
        $this->assertEquals(1800.00, $invReceipt->grand_total);
        $this->assertEquals(900.00, $invReceipt->prior_payments_credited);
        $this->assertEquals(900.00, $invReceipt->amount_paid_now);
        $this->assertEquals(0.00, $invReceipt->balance_after);
        $this->assertSame('Cash', $invReceipt->payment_method);
        $this->assertSame($invReceipt->receipt_number, $order->fresh()->receipt_reference_number);
    }

    public function test_ac_unit_order_from_ocular_inspection_issues_dp_ar_and_final_sales_invoice(): void
    {
        $assistant = $this->makeUser(3, ['given_name' => 'Noel', 'last_name' => 'Staff']);
        $manager = $this->makeUser(2, ['given_name' => 'Grace', 'last_name' => 'Manager']);
        $customer = $this->makeUser(6, ['given_name' => 'Paolo', 'last_name' => 'Ramos']);

        $ocularBooking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 4,
            'scheduled_date' => now(),
            'booking_status' => 'Approved',
            'service_details' => ['is_ocular_inspection' => true, 'inspection_status' => 'Submitted'],
        ]);

        $acUnitId = DB::table('ac_units_inventory')->insertGetId([
            'brand' => 'Carrier',
            'model' => 'Aura Inverter XPower',
            'serial_number' => 'SN-AC-' . random_int(100000, 999999),
            'horsepower' => 1.5,
            'ac_type' => 'Wall-Mounted Split Type',
            'motor_type' => 'Inverter',
            'purchase_price' => 24000.00,
            'selling_price' => 32000.00,
            'purchase_date' => now()->toDateString(),
            'warranty_period' => 12,
            'status' => 'Reserved',
            'created_at' => now(),
            'updated_at' => now(),
        ], 'ac_unit_id');

        $recId = DB::table('ocular_inspection_recommendations')->insertGetId([
            'booking_id' => $ocularBooking->booking_id,
            'ac_unit_id' => $acUnitId,
            'recommended_capacity' => 1.5,
            'recommended_ac_type' => 'Wall-Mounted Split Type',
            'motor_type_recommendation' => 'Inverter',
            'brand_recommendation' => 'Carrier',
            'model' => 'Aura Inverter XPower',
            'unit_price' => 32000.00,
            'status' => 'Selected',
            'created_at' => now(),
            'updated_at' => now(),
        ], 'recommendation_id');

        $order = AcUnitOrder::create([
            'ocular_booking_id' => $ocularBooking->booking_id,
            'client_id' => $customer->user_id,
            'recommendation_id' => $recId,
            'ac_unit_id' => $acUnitId,
            'quantity' => 1,
            'unit_price' => 32000.00,
            'total_unit_price' => 32000.00,
            'down_payment_amount' => 16000.00,
            'remaining_unit_balance' => 16000.00,
            'delivery_fee' => 500.00,
            'installation_fee' => 0.00,
            'payment_method' => 'GCash',
            'fulfillment_type' => 'delivery',
            'reference_number' => 'AC' . random_int(1000000000, 9999999999),
            'delivery_address' => 'Tetuan, Zamboanga City',
            'contact_number' => '09178889999',
            'order_status' => 'Awaiting Delivery',
        ]);

        $ar = $this->receiptService->issueForAcUnitOrder($order, 'down_payment', $assistant);
        $this->assertNotNull($ar);
        $this->assertSame(Receipt::KIND_ACKNOWLEDGEMENT, $ar->document_kind);
        $this->assertSame(Receipt::CATEGORY_AC_UNIT_ORDER, $ar->transaction_category);
        $this->assertEquals(16000.00, $ar->amount_paid_now);
        $this->assertEquals(16000.00, $ar->balance_after);

        $order->update(['order_status' => 'Completed', 'remaining_unit_balance' => 0.00]);
        $inv = $this->receiptService->issueForAcUnitOrder($order->fresh(), 'final_settlement', $manager);

        $this->assertNotNull($inv);
        $this->assertSame(Receipt::KIND_SALES_INVOICE, $inv->document_kind);
        $this->assertSame($ar->receipt_id, $inv->parent_receipt_id);
        $this->assertEquals(32500.00, $inv->grand_total); // 32,000 unit + 500 delivery
        $this->assertEquals(16000.00, $inv->prior_payments_credited);
        $this->assertEquals(16500.00, $inv->amount_paid_now);
        $this->assertEquals(0.00, $inv->balance_after);
        $this->assertStringContainsString("Ocular #{$ocularBooking->booking_id}", (string) $inv->items->first()->item_meta);
        $this->assertStringContainsString("Recommendation #{$recId}", (string) $inv->items->first()->item_meta);
    }

    public function test_void_workflow_enforces_roles_blocks_self_approval_and_verifies_routes_and_pdf(): void
    {
        $superAdmin = $this->makeUser(1, ['given_name' => 'Georgita', 'last_name' => 'Apostol']);
        $managerIssuer = $this->makeUser(2, ['given_name' => 'Issuer', 'last_name' => 'Manager']);
        $assistant = $this->makeUser(3, ['given_name' => 'Desk', 'last_name' => 'Staff']);
        $customerA = $this->makeUser(6, ['given_name' => 'Owner', 'last_name' => 'Customer']);
        $customerB = $this->makeUser(6, ['given_name' => 'Other', 'last_name' => 'Customer']);

        $booking = Booking::create([
            'client_id' => $customerA->user_id,
            'service_id' => 1,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'Approved',
        ]);
        $gcashRef = 'VD' . random_int(1000000000, 9999999999);
        $payment = Payment::create([
            'booking_id' => $booking->booking_id,
            'amount_paid' => 50.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Appointment Reservation Fee',
            'reference_number' => $gcashRef,
            'payment_date' => now(),
        ]);

        // Issued by $managerIssuer
        $receipt = $this->receiptService->issueForBookingPayment($booking, $payment, $managerIssuer);
        $this->assertNotNull($receipt);

        // 1. Customer scoping: Customer A can view print & PDF; Customer B gets 403
        $this->actingAs($customerA)
            ->get("/customer/receipts/{$receipt->receipt_id}/print")
            ->assertOk()
            ->assertSee($receipt->receipt_number);

        $pdfResponse = $this->actingAs($customerA)
            ->get("/customer/receipts/{$receipt->receipt_id}/pdf");
        $pdfResponse->assertOk();
        $this->assertStringContainsString('pdf', strtolower((string) $pdfResponse->headers->get('Content-Type')));

        $this->actingAs($customerB)
            ->get("/customer/receipts/{$receipt->receipt_id}/print")
            ->assertForbidden();

        $this->actingAs($customerB)
            ->get("/customer/receipts/{$receipt->receipt_id}/pdf")
            ->assertForbidden();

        // 2. Public verification route works with valid HMAC prefix and rejects tampered code
        $validCode = $receipt->verificationCodePrefix();
        $this->get("/verify-receipt/{$receipt->receipt_number}/{$validCode}")
            ->assertOk()
            ->assertSee('Verified Authentic Document')
            ->assertSee($receipt->receipt_number);

        $this->get("/verify-receipt/{$receipt->receipt_number}/0000deadbeef")
            ->assertNotFound()
            ->assertSee('Verification Failed');

        // 3. Daily Closeout includes active receipt
        $today = now()->toDateString();
        $closeoutResp = $this->actingAs($superAdmin)
            ->getJson("/super-admin/receipts?date={$today}");
        $closeoutResp->assertOk()
            ->assertJsonStructure([
                'daily_closeout' => ['date', 'cash_collected', 'gcash_confirmed', 'total_receipts', 'voided_count'],
            ]);

        // 4. Admin Assistant requests void
        $this->actingAs($assistant)
            ->postJson("/admin-assistant/receipts/{$receipt->receipt_id}/request-void", [
                'reason' => 'Duplicate encoding mistake',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Receipt::STATUS_VOID_REQUESTED);

        // 5. Self-approval blocked: $managerIssuer cannot approve void of their own issued receipt
        $this->actingAs($managerIssuer)
            ->postJson("/manager/receipts/{$receipt->receipt_id}/approve-void")
            ->assertForbidden();

        // 6. Different approver ($superAdmin) approves void -> status becomes Voided
        $this->actingAs($superAdmin)
            ->postJson("/super-admin/receipts/{$receipt->receipt_id}/approve-void")
            ->assertOk()
            ->assertJsonPath('data.status', Receipt::STATUS_VOIDED);

        // 7. Verification route now reflects VOIDED status
        $this->get("/verify-receipt/{$receipt->receipt_number}/{$validCode}")
            ->assertOk()
            ->assertSee('VOIDED');

        // 8. Activity log recorded void approval
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $superAdmin->user_id,
            'action_type' => 'RECEIPT_VOID_APPROVED',
        ]);
    }

    public function test_sales_records_returns_all_transaction_receipts_for_receipt_invoice_dropdown(): void
    {
        $superAdmin = $this->makeUser(1, ['given_name' => 'Georgita', 'last_name' => 'Apostol']);
        $assistant = $this->makeUser(3, ['given_name' => 'Desk', 'last_name' => 'Staff']);
        $customer = $this->makeUser(6, ['given_name' => 'Carlo', 'last_name' => 'Reyes']);

        $booking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => now()->subDay(),
            'booking_status' => 'Completed',
            'total_amount' => 1500.00,
        ]);

        $dpPayment = Payment::create([
            'booking_id' => $booking->booking_id,
            'amount_paid' => 50.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Appointment Reservation Fee',
            'reference_number' => 'SRDP' . random_int(100000, 999999),
            'payment_date' => now()->subDay(),
        ]);
        $ar = $this->receiptService->issueForBookingPayment($booking, $dpPayment, $assistant);
        $this->assertNotNull($ar);

        $finalPayment = Payment::create([
            'booking_id' => $booking->booking_id,
            'amount_paid' => 1500.00,
            'booking_price' => 1500.00,
            'payment_status' => 'Paid',
            'payment_method' => 'Cash',
            'payment_type' => 'Full Service Balance',
            'payment_date' => now(),
        ]);
        $inv = $this->receiptService->issueForBookingPayment($booking, $finalPayment, $superAdmin);
        $this->assertNotNull($inv);

        $saResp = $this->actingAs($superAdmin)->getJson('/super-admin/sales-records');
        $saResp->assertOk();
        $row = collect($saResp->json('data'))->firstWhere('booking_id', $booking->booking_id);
        $this->assertNotNull($row);

        $receiptNumbers = collect($row['receipts'] ?? [])->pluck('receipt_number')->all();
        $this->assertContains($ar->receipt_number, $receiptNumbers);
        $this->assertContains($inv->receipt_number, $receiptNumbers);

        $aaResp = $this->actingAs($assistant)->getJson('/admin-assistant/sales-records');
        $aaResp->assertOk();
        $aaRow = collect($aaResp->json('data'))->firstWhere('booking_id', $booking->booking_id);
        $this->assertNotNull($aaRow);
        $aaReceiptNumbers = collect($aaRow['receipts'] ?? [])->pluck('receipt_number')->all();
        $this->assertSame($receiptNumbers, $aaReceiptNumbers);
    }
}
