<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SuperAdminControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::insert([
            ['role_id' => 1, 'role_name' => 'Super Admin'],
            ['role_id' => 2, 'role_name' => 'Manager'],
            ['role_id' => 3, 'role_name' => 'Admin Assistant'],
            ['role_id' => 4, 'role_name' => 'Tools Man'],
            ['role_id' => 5, 'role_name' => 'Technician'],
            ['role_id' => 6, 'role_name' => 'Customer'],
        ]);

        DB::table('specialties')->insert([
            ['specialty_id' => 1, 'specialty_name' => 'Installation'],
            ['specialty_id' => 2, 'specialty_name' => 'Maintenance'],
        ]);

        DB::table('services')->insert([
            ['service_id' => 1, 'service_name' => 'Cleaning', 'description' => 'Cleaning service', 'base_price' => 1500],
            ['service_id' => 2, 'service_name' => 'Repair', 'description' => 'Repair service', 'base_price' => 2200],
        ]);
    }

    public function test_non_super_admin_cannot_access_super_admin_endpoints(): void
    {
        $manager = $this->makeUser(2);

        $this->actingAs($manager)
            ->getJson('/super-admin/dashboard/data')
            ->assertForbidden();
    }

    public function test_super_admin_read_endpoints_return_live_data(): void
    {
        $superAdmin = $this->makeUser(1);
        $customer = $this->makeUser(6);
        $technician = $this->makeUser(5, ['email' => 'tech@example.com']);

        DB::table('technician_details')->insert([
            'user_id' => $technician->user_id,
            'certificate_expiry' => now()->addYear()->toDateString(),
        ]);

        DB::table('inventory_items')->insert([
            'item_name' => 'Refrigerant R32',
            'item_type' => 'Material',
            'quantity_on_hand' => 2,
            'reorder_level' => 5,
            'unit' => 'can',
        ]);

        DB::table('ac_units_inventory')->insert([
            'brand' => 'Daikin',
            'model' => 'FTKC25UVM',
            'serial_number' => 'SN-100',
            'horsepower' => 1.0,
            'ac_type' => 'Split',
            'refrigerant_type' => 'R32',
            'supplier' => 'Daikin PH',
            'purchase_price' => 28000,
            'selling_price' => 34000,
            'purchase_date' => now()->toDateString(),
            'warranty_period' => 12,
            'status' => 'Available',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pendingBookingId = DB::table('bookings')->insertGetId([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'Pending',
            'created_at' => now(),
        ], 'booking_id');

        $paidBookingId = DB::table('bookings')->insertGetId([
            'client_id' => $customer->user_id,
            'service_id' => 2,
            'assigned_tech_id' => $technician->user_id,
            'scheduled_date' => now()->subDay(),
            'booking_status' => 'Completed',
            'created_at' => now()->subDay(),
        ], 'booking_id');

        DB::table('payment')->insert([
            'booking_id' => $paidBookingId,
            'booking_price' => 2200,
            'amount_paid' => 2500,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_date' => now(),
        ]);

        DB::table('documents')->insert([
            'booking_id' => $pendingBookingId,
            'created_by' => $superAdmin->user_id,
            'form_name' => 'Service Agreement',
            'client_name' => $customer->name,
            'service_name' => 'Cleaning',
            'status' => 'Draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('announcements')->insert([
            'created_by' => $superAdmin->user_id,
            'title' => 'Safety Reminder',
            'message' => 'Wear PPE before dispatch.',
            'target_role_id' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $superAdmin->user_id,
            'action_type' => 'CREATE',
            'description' => 'Created a sample record.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/dashboard/data')
            ->assertOk()
            ->assertJsonPath('stats.pending_bookings', 1)
            ->assertJsonPath('stats.low_stock_items', 1)
            ->assertJsonPath('stats.available_ac_units', 1);

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/bookings')
            ->assertOk()
            ->assertJsonPath('data.0.booking_id', $pendingBookingId)
            ->assertJsonPath('technicians.0.user_id', $technician->user_id);

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/sales-records')
            ->assertOk()
            ->assertJsonPath('summary.paid_bookings', 1)
            ->assertJsonPath('summary.total_revenue', 2500);

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/documents')
            ->assertOk()
            ->assertJsonPath('data.0.form_name', 'Service Agreement');

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/announcements')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Safety Reminder');

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/activity-logs')
            ->assertOk()
            ->assertJsonPath('data.0.action_type', 'CREATE');
    }

    public function test_super_admin_can_approve_bookings(): void
    {
        $superAdmin = $this->makeUser(1);
        $customer = $this->makeUser(6);
        $technician = $this->makeUser(5, ['email' => 'assigned-tech@example.com']);

        DB::table('technician_details')->insert([
            'user_id' => $technician->user_id,
            'certificate_expiry' => now()->addYear()->toDateString(),
        ]);

        $bookingId = DB::table('bookings')->insertGetId([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => now()->addDays(2),
            'booking_status' => 'Pending',
            'created_at' => now(),
        ], 'booking_id');

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/bookings/{$bookingId}/approve", [
                'assigned_tech_id' => $technician->user_id,
            ])
            ->assertOk()
            ->assertJsonPath('data.booking_status', 'Approved')
            ->assertJsonPath('data.assigned_tech_id', $technician->user_id);

        $this->assertDatabaseHas('bookings', [
            'booking_id' => $bookingId,
            'assigned_tech_id' => $technician->user_id,
            'booking_status' => 'Approved',
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $superAdmin->user_id,
            'action_type' => 'APPROVE',
        ]);
    }

    public function test_super_admin_can_create_update_archive_and_restore_staff_accounts(): void
    {
        $superAdmin = $this->makeUser(1);

        $createResponse = $this->actingAs($superAdmin)
            ->postJson('/super-admin/staff', [
                'role_id' => 5,
                'given_name' => 'Jamie',
                'middle_name' => 'Anne',
                'last_name' => 'Rivera',
                'birthdate' => '1994-06-12',
                'sex' => 'Female',
                'address' => '123 Main Street',
                'contact_number' => '09171234567',
                'email' => 'jamie.rivera@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'certificate_expiry' => now()->addYear()->toDateString(),
                'specialty_ids' => [1],
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'Technician');

        $staffId = $createResponse->json('data.user_id');

        $this->assertDatabaseHas('technician_details', [
            'user_id' => $staffId,
        ]);

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/staff/{$staffId}", [
                'role_id' => 2,
                'given_name' => 'Jamie Updated',
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'Manager')
            ->assertJsonPath('data.given_name', 'Jamie Updated');

        $this->assertDatabaseMissing('technician_details', [
            'user_id' => $staffId,
        ]);

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/staff/{$staffId}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'Archived');

        $this->assertDatabaseHas('users', [
            'user_id' => $staffId,
            'is_active' => 0,
        ]);

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/staff/{$staffId}/restore")
            ->assertOk()
            ->assertJsonPath('data.status', 'Active');

        $this->assertDatabaseHas('users', [
            'user_id' => $staffId,
            'is_active' => 1,
        ]);
    }

    public function test_super_admin_can_manage_inventory_ac_units_documents_and_announcements(): void
    {
        $superAdmin = $this->makeUser(1);
        $customer = $this->makeUser(6);

        $bookingId = DB::table('bookings')->insertGetId([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => now()->addDays(3),
            'booking_status' => 'Pending',
            'created_at' => now(),
        ], 'booking_id');

        $inventoryId = $this->actingAs($superAdmin)
            ->postJson('/super-admin/inventory-items', [
                'item_name' => 'Copper Pipe',
                'item_type' => 'Material',
                'quantity_on_hand' => 10,
                'reorder_level' => 3,
                'unit' => 'm',
            ])
            ->assertCreated()
            ->json('data.item_id');

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/inventory-items/{$inventoryId}", [
                'quantity_on_hand' => 15,
            ])
            ->assertOk();

        $this->actingAs($superAdmin)
            ->deleteJson("/super-admin/inventory-items/{$inventoryId}")
            ->assertOk();

        $acUnitId = $this->actingAs($superAdmin)
            ->postJson('/super-admin/ac-units', [
                'brand' => 'Carrier',
                'model' => 'X100',
                'serial_number' => 'CARR-100',
                'horsepower' => 1.5,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R410A',
                'supplier' => 'Carrier PH',
                'purchase_price' => 30000,
                'selling_price' => 36000,
                'purchase_date' => now()->toDateString(),
                'warranty_period' => 12,
                'status' => 'Available',
            ])
            ->assertCreated()
            ->json('data.ac_unit_id');

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/ac-units/{$acUnitId}", [
                'status' => 'Reserved',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Reserved');

        $this->actingAs($superAdmin)
            ->deleteJson("/super-admin/ac-units/{$acUnitId}")
            ->assertOk();

        $documentId = $this->actingAs($superAdmin)
            ->postJson('/super-admin/documents', [
                'booking_id' => $bookingId,
                'form_name' => 'Job Order',
                'client_name' => $customer->name,
                'service' => 'Cleaning',
            ])
            ->assertCreated()
            ->json('data.doc_id');

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/documents/{$documentId}", [
                'status' => 'Exported',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Exported');

        $this->actingAs($superAdmin)
            ->deleteJson("/super-admin/documents/{$documentId}")
            ->assertOk();

        $announcementId = $this->actingAs($superAdmin)
            ->postJson('/super-admin/announcements', [
                'title' => 'Dispatch Notice',
                'message' => 'Check the updated dispatch board.',
                'target_role' => 'Technician',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/announcements/{$announcementId}", [
                'title' => 'Updated Dispatch Notice',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated Dispatch Notice');

        $this->actingAs($superAdmin)
            ->deleteJson("/super-admin/announcements/{$announcementId}")
            ->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $superAdmin->user_id,
            'action_type' => 'ANNOUNCE',
        ]);
    }

    public function test_super_admin_can_manage_spare_parts(): void
    {
        $superAdmin = $this->makeUser(1);

        // 1. Create Spare Part
        $response = $this->actingAs($superAdmin)
            ->postJson('/super-admin/spare-parts', [
                'part_name' => 'Capacitor 35+5 MFD',
                'compatible_brands' => ['Daikin', 'Carrier'],
                'qty' => 15,
                'reorder_level' => 3,
                'unit' => 'pc',
                'capital' => 350.00,
                'selling_price' => 550.00,
                'supplier' => 'Cooling Supplies Inc',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.part_name', 'Capacitor 35+5 MFD')
            ->assertJsonPath('data.item_type', 'Spare Part')
            ->assertJsonPath('data.quantity_on_hand', 15)
            ->assertJsonPath('data.capital', 350)
            ->assertJsonPath('data.selling_price', 550)
            ->assertJsonPath('data.profit', 200)
            ->assertJsonPath('data.compatible_brands', ['Daikin', 'Carrier']);

        $itemId = $response->json('data.item_id');

        // Verify in database
        $this->assertDatabaseHas('inventory_items', [
            'item_id' => $itemId,
            'item_name' => 'Capacitor 35+5 MFD',
            'item_type' => 'Spare Part',
            'inventory_mode' => 'spare_part',
            'quantity_on_hand' => 15,
            'reorder_level' => 3,
            'unit' => 'pc',
            'capital' => 350.00,
            'selling_price' => 550.00,
            'profit' => 200.00,
        ]);

        // 2. Fetch Spare Parts
        $this->actingAs($superAdmin)
            ->getJson('/super-admin/spare-parts')
            ->assertOk()
            ->assertJsonPath('data.0.part_name', 'Capacitor 35+5 MFD');

        // 3. Update Spare Part
        $this->actingAs($superAdmin)
            ->patchJson("/super-admin/spare-parts/{$itemId}", [
                'quantity_on_hand' => 12,
                'selling_price' => 600.00,
            ])
            ->assertOk()
            ->assertJsonPath('data.quantity_on_hand', 12)
            ->assertJsonPath('data.selling_price', 600);

        $this->assertDatabaseHas('inventory_items', [
            'item_id' => $itemId,
            'quantity_on_hand' => 12,
            'selling_price' => 600.00,
        ]);

        // 4. Delete Spare Part
        $this->actingAs($superAdmin)
            ->deleteJson("/super-admin/spare-parts/{$itemId}")
            ->assertOk();

        $this->assertDatabaseMissing('inventory_items', [
            'item_id' => $itemId,
        ]);
    }

    protected function makeUser(int $roleId, array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role_id' => $roleId,
            'is_active' => true,
        ], $overrides));
    }
}
