<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class QuotationFailedBookingAndMaterialReturnTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('roles')->insertOrIgnore([
            ['role_id' => 1, 'role_name' => 'Super Admin'],
            ['role_id' => 2, 'role_name' => 'Manager'],
            ['role_id' => 3, 'role_name' => 'Admin Assistant'],
            ['role_id' => 4, 'role_name' => 'Tools Man'],
            ['role_id' => 5, 'role_name' => 'Technician'],
            ['role_id' => 6, 'role_name' => 'Customer'],
            ['role_id' => 7, 'role_name' => 'Head Technician'],
        ]);

        DB::table('services')->insertOrIgnore([
            ['service_id' => 1, 'service_name' => 'Installation', 'category' => 'Installation', 'description' => 'AC Installation', 'base_price' => 1500.00, 'booking_fee' => 50.00],
            ['service_id' => 2, 'service_name' => 'Repair / Check-up', 'category' => 'Repair', 'description' => 'AC Repair', 'base_price' => 1000.00, 'booking_fee' => 50.00],
            ['service_id' => 3, 'service_name' => 'Cleaning / Preventive Maintenance', 'category' => 'Cleaning', 'description' => 'AC Cleaning', 'base_price' => 750.00, 'booking_fee' => 50.00],
            ['service_id' => 4, 'service_name' => 'Ocular Inspection', 'category' => 'Inspection', 'description' => 'Free site inspection', 'base_price' => 0.00, 'booking_fee' => 0.00],
        ]);
    }

    private function createUser(int $roleId, string $given = 'Test', string $last = 'User'): User
    {
        return User::factory()->create([
            'role_id' => $roleId,
            'given_name' => $given,
            'last_name' => $last,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function createApprovedBookingWithInventory(int $serviceId, User $customer, User $leadTech, User $asstTech): array
    {
        $bookingId = DB::table('bookings')->insertGetId([
            'client_id' => $customer->user_id,
            'service_id' => $serviceId,
            'lead_technician_id' => $leadTech->user_id,
            'assistant_technician_id' => $asstTech->user_id,
            'assigned_tech_id' => $leadTech->user_id,
            'scheduled_date' => now()->format('Y-m-d H:i:s'),
            'booking_status' => 'Approved',
            'quotation_status' => 'Quotation Issued',
            'service_details' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('payment')->insert([
            'booking_id' => $bookingId,
            'booking_price' => 0.00,
            'unit_price' => 0.00,
            'spare_parts_price' => 0.00,
            'amount_paid' => 50.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'reference_number' => '1234567890123',
            'payment_type' => 'Appointment Reservation Fee',
            'payment_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $toolId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Torque Wrench',
            'item_type' => 'Tool',
            'tool_subtype' => 'hand',
            'inventory_mode' => 'worker',
            'sub_category' => 'Hand Tools',
            'unit' => 'pc',
            'initial_stock' => 3,
            'quantity_on_hand' => 3,
            'reorder_level' => 1,
            'status' => 'Available',
            'managed_by' => 'Tools Man',
            'last_updated' => now(),
        ]);

        $materialId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Copper Tubing 1/4',
            'item_type' => 'Material',
            'inventory_mode' => 'worker',
            'sub_category' => 'Consumables',
            'unit' => 'ft',
            'initial_stock' => 10,
            'quantity_on_hand' => 10,
            'reorder_level' => 2,
            'status' => 'Available',
            'managed_by' => 'Tools Man',
            'last_updated' => now(),
        ]);

        return [$bookingId, $toolId, $materialId];
    }

    public function test_non_ocular_booking_quotation_transitions_to_waiting_and_signed_on_payment_turnover(): void
    {
        $manager = $this->createUser(2, 'Manny', 'Manager');
        $toolsMan = $this->createUser(4, 'Tony', 'Toolsman');
        $leadTech = $this->createUser(5, 'Leo', 'Tech');
        $asstTech = $this->createUser(5, 'Alex', 'Helper');
        $customer = $this->createUser(6, 'Maria', 'Santos');

        [$bookingId, $toolId, $materialId] = $this->createApprovedBookingWithInventory(1, $customer, $leadTech, $asstTech);

        // 1. Technician submits checklist -> Tools Man approves -> Booking In-Progress & Quotation waiting to sign
        $storeRes = $this->actingAs($leadTech)->postJson('/technician/checklists', [
            'booking_id' => $bookingId,
            'items' => [
                ['item_id' => $toolId, 'quantity' => 1],
                ['item_id' => $materialId, 'quantity' => 4],
            ],
        ]);
        $storeRes->assertStatus(201);
        $checklistId = (int) $storeRes->json('data.checklist_id');
        $toolChecklistItemId = collect($storeRes->json('data.items'))->firstWhere('item_id', $toolId)['id'];
        $matChecklistItemId = collect($storeRes->json('data.items'))->firstWhere('item_id', $materialId)['id'];

        $approveRes = $this->actingAs($toolsMan)->patchJson("/tools-man/checklists/{$checklistId}/approve");
        $approveRes->assertStatus(200);

        $bookingAfterApprove = DB::table('bookings')->where('booking_id', $bookingId)->first();
        $this->assertSame('In-Progress', $bookingAfterApprove->booking_status);
        $this->assertSame('waiting for customer to sign', $bookingAfterApprove->quotation_status);

        // 2. Technician returns tools and 2 unused materials, Tools Man completes checklist
        $this->actingAs($leadTech)
            ->postJson("/technician/checklists/{$checklistId}/items/{$matChecklistItemId}/return-material", [
                'quantity_returned' => 2,
            ])
            ->assertStatus(200);

        $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklistId}/items/{$toolChecklistItemId}/status", [
                'status' => 'returned',
            ])
            ->assertStatus(200);

        $this->actingAs($toolsMan)
            ->postJson("/tools-man/checklists/{$checklistId}/complete")
            ->assertStatus(200);

        // 3. Technician turns over payment with proof -> Quotation becomes "Signed by Maria Santos"
        $turnoverRes = $this->actingAs($leadTech)->post('/technician/bookings/' . $bookingId . '/complete', [
            'diagnosis' => 'Unit installed properly',
            'work_done' => 'Installation',
            'total_service_price' => 1500,
            'payment_method' => 'Cash',
            'proof_image' => UploadedFile::fake()->image('signed_proof.jpg'),
        ]);
        $turnoverRes->assertStatus(200);

        $bookingAfterTurnover = DB::table('bookings')->where('booking_id', $bookingId)->first();
        $this->assertSame('Signed by Maria Santos', $bookingAfterTurnover->quotation_status);

        // 4. Manager completes booking -> quotation stays "Signed by Maria Santos"
        $mgrCompleteRes = $this->actingAs($manager)->postJson("/manager/bookings/{$bookingId}/complete", [
            'payment_verified' => true,
            'amount_turned_over' => 1450,
            'requested_by_name' => 'Maria Santos',
        ]);
        $mgrCompleteRes->assertStatus(200);

        $bookingCompleted = DB::table('bookings')->where('booking_id', $bookingId)->first();
        $this->assertSame('Completed', $bookingCompleted->booking_status);
        $this->assertSame('Signed by Maria Santos', $bookingCompleted->quotation_status);
    }

    public function test_technician_and_tools_man_can_return_consumable_materials_by_selected_quantity(): void
    {
        $toolsMan = $this->createUser(4, 'Tony', 'Toolsman');
        $leadTech = $this->createUser(5, 'Leo', 'Tech');
        $asstTech = $this->createUser(5, 'Alex', 'Helper');
        $customer = $this->createUser(6, 'Juan', 'Cruz');

        [$bookingId, $toolId, $materialId] = $this->createApprovedBookingWithInventory(3, $customer, $leadTech, $asstTech);

        $storeRes = $this->actingAs($leadTech)->postJson('/technician/checklists', [
            'booking_id' => $bookingId,
            'items' => [
                ['item_id' => $toolId, 'quantity' => 1],
                ['item_id' => $materialId, 'quantity' => 5],
            ],
        ])->assertStatus(201);

        $checklistId = (int) $storeRes->json('data.checklist_id');
        $matItemId = collect($storeRes->json('data.items'))->firstWhere('item_id', $materialId)['id'];

        $this->actingAs($toolsMan)->patchJson("/tools-man/checklists/{$checklistId}/approve")->assertStatus(200);

        // Stock deducted from 10 -> 5
        $this->assertSame(5, (int) DB::table('inventory_items')->where('item_id', $materialId)->value('quantity_on_hand'));

        // Technician returns 3 unused consumables
        $techReturnRes = $this->actingAs($leadTech)->postJson(
            "/technician/checklists/{$checklistId}/items/{$matItemId}/return-material",
            ['quantity_returned' => 3]
        );
        $techReturnRes->assertStatus(200);
        $this->assertSame(8, (int) DB::table('inventory_items')->where('item_id', $materialId)->value('quantity_on_hand'));
        $this->assertSame(2, (int) DB::table('booking_materials')->where('booking_id', $bookingId)->where('item_id', $materialId)->value('quantity_used'));
        $this->assertSame('partially_returned', DB::table('tool_checklist_items')->where('id', $matItemId)->value('status'));

        // Tools Man adjusts return quantity to full 5 -> stock returns to 10 & booking_materials removed
        $tmReturnRes = $this->actingAs($toolsMan)->postJson(
            "/tools-man/checklists/{$checklistId}/items/{$matItemId}/return-material",
            ['quantity_returned' => 5]
        );
        $tmReturnRes->assertStatus(200);
        $this->assertSame(10, (int) DB::table('inventory_items')->where('item_id', $materialId)->value('quantity_on_hand'));
        $this->assertNull(DB::table('booking_materials')->where('booking_id', $bookingId)->where('item_id', $materialId)->first());
        $this->assertSame('returned', DB::table('tool_checklist_items')->where('id', $matItemId)->value('status'));
    }

    public function test_failed_booking_requires_completed_checklist_and_valid_cancels_booking_and_records_fee_in_sales(): void
    {
        $manager = $this->createUser(2, 'Manny', 'Manager');
        $toolsMan = $this->createUser(4, 'Tony', 'Toolsman');
        $leadTech = $this->createUser(5, 'Leo', 'Tech');
        $asstTech = $this->createUser(5, 'Alex', 'Helper');
        $customer = $this->createUser(6, 'Elena', 'Reyes');

        [$bookingId, $toolId, $materialId] = $this->createApprovedBookingWithInventory(2, $customer, $leadTech, $asstTech);

        $storeRes = $this->actingAs($leadTech)->postJson('/technician/checklists', [
            'booking_id' => $bookingId,
            'items' => [
                ['item_id' => $toolId, 'quantity' => 1],
                ['item_id' => $materialId, 'quantity' => 4],
            ],
        ])->assertStatus(201);

        $checklistId = (int) $storeRes->json('data.checklist_id');
        $toolItemId = collect($storeRes->json('data.items'))->firstWhere('item_id', $toolId)['id'];
        $matItemId = collect($storeRes->json('data.items'))->firstWhere('item_id', $materialId)['id'];

        $this->actingAs($toolsMan)->patchJson("/tools-man/checklists/{$checklistId}/approve")->assertStatus(200);

        // Cannot submit failed booking before checklist is Completed
        $this->actingAs($leadTech)
            ->postJson("/technician/bookings/{$bookingId}/failed-booking", [
                'reason' => 'Customer refused quotation on site.',
            ])
            ->assertStatus(422);

        // Return tool & all 4 consumable materials, then complete checklist
        $this->actingAs($leadTech)
            ->postJson("/technician/checklists/{$checklistId}/items/{$matItemId}/return-material", ['quantity_returned' => 4])
            ->assertStatus(200);
        $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklistId}/items/batch-status", [
                'items' => [
                    ['item_id' => $toolItemId, 'status' => 'returned'],
                ],
            ])
            ->assertStatus(200);
        $this->actingAs($toolsMan)->postJson("/tools-man/checklists/{$checklistId}/complete")->assertStatus(200);

        // Submit Failed Booking report
        $failedRes = $this->actingAs($leadTech)->postJson("/technician/bookings/{$bookingId}/failed-booking", [
            'reason' => 'Customer did not sign the quotation in person due to price concerns.',
        ]);
        $failedRes->assertStatus(200);

        // Manager receives review notification and confirms Valid
        $notifRes = $this->actingAs($manager)->getJson('/topbar/widgets')->assertStatus(200);
        $this->assertTrue(
            collect($notifRes->json('notifications'))->contains(fn ($n) => ($n['type'] ?? '') === 'failed_booking_review')
        );

        $reviewRes = $this->actingAs($manager)->postJson("/manager/bookings/{$bookingId}/failed-booking/review", [
            'decision' => 'valid',
        ]);
        $reviewRes->assertStatus(200);

        $cancelledBooking = DB::table('bookings')->where('booking_id', $bookingId)->first();
        $this->assertSame('Cancelled', $cancelledBooking->booking_status);
        $this->assertSame('Customer Refused to Sign', $cancelledBooking->quotation_status);

        // Booking fee (50.00) must be recorded in Sales & Records with base_price = 0
        $salesRes = $this->actingAs($manager)->getJson('/manager/sales-records')->assertStatus(200);
        $record = collect($salesRes->json('data'))->firstWhere('booking_id', $bookingId);
        $this->assertNotNull($record);
        $this->assertSame('Cancelled', $record['booking_status']);
        $this->assertTrue($record['is_forfeited_booking_fee']);
        $this->assertEquals(50.0, $record['booking_fee']);
        $this->assertEquals(0.0, $record['base_price']);
        $this->assertEquals(50.0, $record['amount_paid']);
        $this->assertEquals(50.0, $salesRes->json('summary.total_revenue'));
        $this->assertEquals(50.0, $salesRes->json('summary.service_revenue'));
    }

    public function test_invalid_failed_booking_notifies_technician_and_keeps_booking_in_progress(): void
    {
        $manager = $this->createUser(2, 'Manny', 'Manager');
        $toolsMan = $this->createUser(4, 'Tony', 'Toolsman');
        $leadTech = $this->createUser(5, 'Leo', 'Tech');
        $asstTech = $this->createUser(5, 'Alex', 'Helper');
        $customer = $this->createUser(6, 'Pedro', 'Cruz');

        [$bookingId, $toolId] = $this->createApprovedBookingWithInventory(1, $customer, $leadTech, $asstTech);

        $storeRes = $this->actingAs($leadTech)->postJson('/technician/checklists', [
            'booking_id' => $bookingId,
            'items' => [
                ['item_id' => $toolId, 'quantity' => 1],
            ],
        ])->assertStatus(201);

        $checklistId = (int) $storeRes->json('data.checklist_id');
        $toolItemId = collect($storeRes->json('data.items'))->firstWhere('item_id', $toolId)['id'];

        $this->actingAs($toolsMan)->patchJson("/tools-man/checklists/{$checklistId}/approve")->assertStatus(200);
        $this->actingAs($toolsMan)->patchJson("/tools-man/checklists/{$checklistId}/items/{$toolItemId}/status", ['status' => 'returned'])->assertStatus(200);
        $this->actingAs($toolsMan)->postJson("/tools-man/checklists/{$checklistId}/complete")->assertStatus(200);

        $this->actingAs($leadTech)->postJson("/technician/bookings/{$bookingId}/failed-booking", [
            'reason' => 'Customer was not home when we arrived.',
        ])->assertStatus(200);

        // Manager marks Invalid with reason -> Tech receives notice and booking stays In-Progress
        $reviewRes = $this->actingAs($manager)->postJson("/manager/bookings/{$bookingId}/failed-booking/review", [
            'decision' => 'invalid',
            'invalid_reason' => 'Customer confirmed they are available; please call before leaving.',
        ]);
        $reviewRes->assertStatus(200);

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();
        $this->assertSame('In-Progress', $booking->booking_status);

        $techJobs = $this->actingAs($leadTech)->getJson('/technician/bookings')->assertStatus(200);
        $jobRow = collect($techJobs->json('data'))->firstWhere('booking_id', $bookingId);
        $this->assertSame('Invalid', $jobRow['failed_booking']['status']);
        $this->assertStringContainsString('please call before leaving', $jobRow['failed_booking']['invalid_reason']);

        $techNotifRes = $this->actingAs($leadTech)->getJson('/topbar/widgets')->assertStatus(200);
        $this->assertTrue(
            collect($techNotifRes->json('notifications'))->contains(fn ($n) => ($n['type'] ?? '') === 'failed_booking_invalid')
        );
    }
}
