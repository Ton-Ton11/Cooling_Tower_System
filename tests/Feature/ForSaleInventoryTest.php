<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ForSaleInventorySeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ForSaleInventoryTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('roles')->insertOrIgnore([
            ['role_id' => 1, 'role_name' => 'Super Admin', 'is_system' => true],
            ['role_id' => 3, 'role_name' => 'Admin Assistant', 'is_system' => true],
            ['role_id' => 6, 'role_name' => 'Customer', 'is_system' => true],
        ]);
    }

    private function makeUser(int $roleId, string $givenName, string $lastName): User
    {
        return User::factory()->create([
            'role_id' => $roleId,
            'given_name' => $givenName,
            'last_name' => $lastName,
            'address' => 'Canelar, Zamboanga City',
            'contact_number' => '09171234567',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    public function test_for_sale_seeder_and_damaged_lost_hidden_from_customer_buy_item(): void
    {
        $this->seed(ForSaleInventorySeeder::class);

        $this->assertGreaterThanOrEqual(8, DB::table('inventory_items')->where('inventory_mode', 'sale')->where('item_type', 'Material')->count());
        $this->assertGreaterThanOrEqual(6, DB::table('inventory_items')->where('inventory_mode', 'sale')->where('item_type', 'Tool')->where('tool_subtype', 'power')->count());
        $this->assertGreaterThanOrEqual(6, DB::table('inventory_items')->where('inventory_mode', 'sale')->where('item_type', 'Tool')->where('tool_subtype', 'hand')->count());
        $this->assertGreaterThanOrEqual(18, DB::table('inventory_items')->where('item_type', 'Spare Part')->where('status', 'Available')->where('is_archived', false)->count());
        $this->assertGreaterThanOrEqual(3, DB::table('inventory_items')->where('inventory_mode', 'sale')->where('item_type', 'Spare Part')->where('status', 'Order Base')->count());

        $damagedSaleId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Damaged Manifold Gauge (For Sale Test)',
            'item_type' => 'Tool',
            'tool_subtype' => 'power',
            'inventory_mode' => 'sale',
            'sub_category' => 'Electronic Testing Equipment',
            'serial_number' => 'SN-DMG-TEST-001',
            'quantity_on_hand' => 1,
            'initial_stock' => 1,
            'reorder_level' => 0,
            'unit' => 'set',
            'capital' => 2000.00,
            'profit' => 500.00,
            'selling_price' => 2500.00,
            'status' => 'Damaged',
            'is_archived' => false,
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        $lostSubcatSaleId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Lost Flaring Kit (For Sale Test)',
            'item_type' => 'Tool',
            'tool_subtype' => 'hand',
            'inventory_mode' => 'sale',
            'sub_category' => 'Damaged / Lost',
            'quantity_on_hand' => 2,
            'initial_stock' => 2,
            'reorder_level' => 1,
            'unit' => 'set',
            'capital' => 900.00,
            'profit' => 300.00,
            'selling_price' => 1200.00,
            'status' => 'Available',
            'is_archived' => false,
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        $customer = $this->makeUser(6, 'Buy', 'Customer');

        $res = $this->actingAs($customer)->getJson('/customer/item-orders');
        $res->assertOk();

        $returnedIds = collect($res->json('items'))->pluck('item_id')->all();
        $this->assertNotContains($damagedSaleId, $returnedIds);
        $this->assertNotContains($lostSubcatSaleId, $returnedIds);

        // Seeded active for-sale material, power tool, and spare part should be present
        $returnedNames = collect($res->json('items'))->pluck('item_name')->all();
        $this->assertContains('AC Evaporator & Condenser Coil Cleaner (1 Gallon)', $returnedNames);
        $this->assertContains('Portable AC High-Pressure Cleaning Washer 1400W', $returnedNames);
        $this->assertContains('Carrier Inverter Compressor Capacitor 45 uF 450V', $returnedNames);

        // Attempting to order a Damaged / Lost for-sale item must fail validation
        $this->actingAs($customer)
            ->postJson('/customer/item-orders', [
                'item_id' => $damagedSaleId,
                'quantity' => 1,
                'amount_paid' => 2500,
                'reference_number' => 'GCASH99887766',
            ])
            ->assertStatus(422);
    }

    public function test_power_tools_and_spare_parts_enforce_individual_serial_tracking_and_order_base_rules(): void
    {
        $this->seed(ForSaleInventorySeeder::class);

        $seededPowerTools = DB::table('inventory_items')
            ->where('inventory_mode', 'sale')
            ->where('item_type', 'Tool')
            ->where('tool_subtype', 'power')
            ->where('is_archived', false)
            ->get();

        $this->assertNotEmpty($seededPowerTools);
        foreach ($seededPowerTools as $pt) {
            $this->assertSame(1, (int) $pt->quantity_on_hand);
            $this->assertSame(1, (int) $pt->initial_stock);
            $this->assertSame(0, (int) $pt->reorder_level);
            $this->assertNotEmpty($pt->serial_number);
            $this->assertNotSame('Order Base', $pt->status);
            $this->assertNotEmpty($pt->sub_category);
        }

        $onHandSpareParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('is_archived', false)
            ->where('status', 'Available')
            ->get();

        $this->assertNotEmpty($onHandSpareParts);
        foreach ($onHandSpareParts as $sp) {
            $this->assertSame(1, (int) $sp->quantity_on_hand);
            $this->assertSame(1, (int) $sp->initial_stock);
            $this->assertSame(0, (int) $sp->reorder_level);
            $this->assertNotEmpty($sp->serial_number);
            $this->assertNotEmpty($sp->sub_category);
        }

        $orderBaseSpareParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('is_archived', false)
            ->where('status', 'Order Base')
            ->get();

        $this->assertNotEmpty($orderBaseSpareParts);
        foreach ($orderBaseSpareParts as $obSp) {
            $this->assertSame('order_base', $obSp->reservation_source);
            $this->assertNotNull($obSp->expected_arrival);
            $this->assertNotEmpty($obSp->compatible_brands);
        }

        $assistant = $this->makeUser(3, 'Maria', 'Assistant');

        // Reject quantity stacking (> 1) on For-Sale Power Tool
        $this->actingAs($assistant)
            ->postJson('/admin-assistant/inventory', [
                'item_name' => 'Digital Vacuum Micron Gauge',
                'item_type' => 'Tool',
                'tool_subtype' => 'power',
                'inventory_mode' => 'sale',
                'sub_category' => 'Electronic Testing Equipment',
                'serial_number' => 'PT-TST-0001',
                'quantity_on_hand' => 2,
                'reorder_level' => 0,
                'unit' => 'unit',
                'capital' => 3000,
                'profit' => 900,
                'selling_price' => 3900,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity_on_hand']);

        // Reject missing serial_number on On-Hand Power Tool
        $this->actingAs($assistant)
            ->postJson('/admin-assistant/inventory', [
                'item_name' => 'Digital Vacuum Micron Gauge',
                'item_type' => 'Tool',
                'tool_subtype' => 'power',
                'inventory_mode' => 'sale',
                'sub_category' => 'Electronic Testing Equipment',
                'quantity_on_hand' => 1,
                'reorder_level' => 0,
                'unit' => 'unit',
                'capital' => 3000,
                'profit' => 900,
                'selling_price' => 3900,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['serial_number']);

        // Reject Order Base status for Power Tools (on-hand only)
        $this->actingAs($assistant)
            ->postJson('/admin-assistant/inventory', [
                'item_name' => 'Digital Vacuum Micron Gauge',
                'item_type' => 'Tool',
                'tool_subtype' => 'power',
                'inventory_mode' => 'sale',
                'sub_category' => 'Electronic Testing Equipment',
                'serial_number' => 'PT-TST-0002',
                'quantity_on_hand' => 1,
                'reorder_level' => 0,
                'unit' => 'unit',
                'status' => 'Order Base',
                'capital' => 3000,
                'profit' => 900,
                'selling_price' => 3900,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Reject missing serial_number on On-Hand Spare Part
        $this->actingAs($assistant)
            ->postJson('/admin-assistant/inventory', [
                'item_name' => 'Universal Relay Board',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'sub_category' => 'PCBs & Controls',
                'quantity_on_hand' => 1,
                'reorder_level' => 0,
                'unit' => 'pc',
                'status' => 'Available',
                'capital' => 1000,
                'profit' => 400,
                'selling_price' => 1400,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['serial_number']);

        // Allow Order Base Spare Part with expected_arrival and compatible_brands
        $createObRes = $this->actingAs($assistant)
            ->postJson('/admin-assistant/inventory', [
                'item_name' => 'Daikin Inverter PCB Main Board',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'sub_category' => 'PCBs & Controls',
                'compatible_brands' => 'Daikin',
                'quantity_on_hand' => 1,
                'reorder_level' => 0,
                'unit' => 'pc',
                'status' => 'Order Base',
                'expected_arrival' => '2026-12-15',
                'capital' => 4500,
                'profit' => 1300,
                'selling_price' => 5800,
            ]);

        $createObRes->assertStatus(201);
        $createdObId = (int) $createObRes->json('data.item_id');
        $this->assertSame('Order Base', $createObRes->json('data.status'));
        $this->assertSame('order_base', $createObRes->json('data.reservation_source'));
        $this->assertSame('2026-12-15', $createObRes->json('data.expected_arrival'));

        // Allow updating expected_arrival on Order Base Spare Part (Arrival Tracker)
        $this->actingAs($assistant)
            ->patchJson("/admin-assistant/inventory/{$createdObId}", [
                'expected_arrival' => '2026-12-22',
            ])
            ->assertOk()
            ->assertJsonPath('data.expected_arrival', '2026-12-22');

        // Reject +Stock (added_stock) on both Power Tools and Spare Parts
        $firstPowerTool = $seededPowerTools->first();
        $firstSparePart = $onHandSpareParts->first();

        $this->actingAs($assistant)
            ->patchJson("/admin-assistant/inventory/{$firstPowerTool->item_id}", [
                'added_stock' => 2,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['added_stock']);

        $this->actingAs($assistant)
            ->patchJson("/admin-assistant/inventory/{$firstSparePart->item_id}", [
                'added_stock' => 2,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['added_stock']);
    }

    public function test_customer_buy_item_counts_registered_on_hand_serials_and_pickup_deducts_individual_serials(): void
    {
        $this->seed(ForSaleInventorySeeder::class);

        // Even if a stray Order Base power tool existed in DB, Customer Buy Item must exclude it
        $blockedOrderBasePowerToolId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Stray Order Base Power Tool',
            'item_type' => 'Tool',
            'tool_subtype' => 'power',
            'inventory_mode' => 'sale',
            'sub_category' => 'Power Tools',
            'serial_number' => 'PT-OB-BLOCKED-01',
            'quantity_on_hand' => 1,
            'initial_stock' => 1,
            'reorder_level' => 0,
            'unit' => 'unit',
            'capital' => 2000,
            'profit' => 500,
            'selling_price' => 2500,
            'status' => 'Order Base',
            'reservation_source' => 'order_base',
            'is_archived' => false,
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        $washerCountInDb = DB::table('inventory_items')
            ->where('inventory_mode', 'sale')
            ->where('item_type', 'Tool')
            ->where('tool_subtype', 'power')
            ->where('item_name', 'Portable AC High-Pressure Cleaning Washer 1400W')
            ->where('status', 'Available')
            ->where('is_archived', false)
            ->count();

        $capacitorCountInDb = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('item_name', 'Carrier Inverter Compressor Capacitor 45 uF 450V')
            ->where('status', 'Available')
            ->where('is_archived', false)
            ->count();

        $this->assertGreaterThanOrEqual(3, $washerCountInDb);
        $this->assertGreaterThanOrEqual(3, $capacitorCountInDb);

        $customer = $this->makeUser(6, 'Juan', 'Buyer');
        $assistant = $this->makeUser(3, 'Rosa', 'Assistant');

        $catalogRes = $this->actingAs($customer)->getJson('/customer/item-orders');
        $catalogRes->assertOk();

        $items = collect($catalogRes->json('items'));
        $this->assertNull($items->firstWhere('item_id', $blockedOrderBasePowerToolId));

        $washerCatalog = $items->firstWhere('item_name', 'Portable AC High-Pressure Cleaning Washer 1400W');
        $this->assertNotNull($washerCatalog);
        $this->assertSame($washerCountInDb, (int) $washerCatalog['quantity_on_hand']);

        $capCatalog = $items->firstWhere('item_name', 'Carrier Inverter Compressor Capacitor 45 uF 450V');
        $this->assertNotNull($capCatalog);
        $this->assertSame($capacitorCountInDb, (int) $capCatalog['quantity_on_hand']);

        // Order qty = 2 of serial-tracked Spare Part (multi-unit across individual registered serials)
        $unitPrice = (float) $capCatalog['unit_price'];
        $minDown = round(($unitPrice * 2) * 0.50, 2);

        $orderRes = $this->actingAs($customer)->postJson('/customer/item-orders', [
            'item_id' => $capCatalog['item_id'],
            'quantity' => 2,
            'technician_consulted_acknowledged' => true,
            'amount_paid' => $minDown,
            'reference_number' => 'GCASH77665544',
        ]);
        $orderRes->assertStatus(201);
        $orderId = (int) $orderRes->json('data.order_id');

        // Confirm GCash payment -> choose Store Pickup -> confirm pickup
        $this->actingAs($assistant)
            ->postJson("/admin-assistant/item-orders/{$orderId}/review-payment", [
                'decision' => 'sufficient',
            ])
            ->assertOk();

        $this->actingAs($customer)
            ->postJson("/customer/item-orders/{$orderId}/fulfillment", [
                'fulfillment_type' => 'pickup',
            ])
            ->assertOk();

        $this->actingAs($assistant)
            ->postJson("/admin-assistant/item-orders/{$orderId}/confirm-pickup", [
                'payment_method' => 'Cash',
            ])
            ->assertOk();

        $remainingInDb = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('item_name', 'Carrier Inverter Compressor Capacitor 45 uF 450V')
            ->where('status', 'Available')
            ->where('is_archived', false)
            ->sum('quantity_on_hand');

        $soldRowsInDb = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('item_name', 'Carrier Inverter Compressor Capacitor 45 uF 450V')
            ->where('status', 'Sold')
            ->where('quantity_on_hand', 0)
            ->count();

        $this->assertSame($capacitorCountInDb - 2, (int) $remainingInDb);
        $this->assertGreaterThanOrEqual(2, $soldRowsInDb);

        // Customer Buy Item catalog must immediately reflect reduced registered serial count
        $afterRes = $this->actingAs($customer)->getJson('/customer/item-orders');
        $afterRes->assertOk();
        $afterCap = collect($afterRes->json('items'))->firstWhere('item_name', 'Carrier Inverter Compressor Capacitor 45 uF 450V');
        $this->assertNotNull($afterCap);
        $this->assertSame($capacitorCountInDb - 2, (int) $afterCap['quantity_on_hand']);
    }

    public function test_admin_assistant_can_manage_and_add_sub_categories_for_sale_and_spare_parts(): void
    {
        $assistant = $this->makeUser(3, 'Liza', 'Assistant');

        $this->actingAs($assistant)
            ->getJson('/admin-assistant/inventory/folders')
            ->assertOk()
            ->assertJsonStructure(['data', 'grouped' => ['materials', 'power_tools', 'hand_tools', 'spare_parts', 'sale_items']]);

        $createdIds = [];
        foreach (['sale_items', 'power_tools', 'hand_tools', 'spare_parts'] as $fieldType) {
            $createRes = $this->actingAs($assistant)
                ->postJson('/admin-assistant/inventory/folders', [
                    'field_type' => $fieldType,
                    'name' => "Custom {$fieldType} Category",
                    'description' => "Managed by Admin Assistant ({$fieldType})",
                ]);

            $createRes->assertStatus(201);
            $folderId = (int) $createRes->json('data.id');
            $createdIds[] = $folderId;

            $this->actingAs($assistant)
                ->patchJson("/admin-assistant/inventory/folders/{$folderId}", [
                    'name' => "Updated {$fieldType} Category",
                    'description' => 'Updated description',
                ])
                ->assertOk()
                ->assertJsonPath('data.name', "Updated {$fieldType} Category");

            $this->actingAs($assistant)
                ->deleteJson("/admin-assistant/inventory/folders/{$folderId}")
                ->assertOk();
        }

        $this->assertCount(4, $createdIds);
    }
}
