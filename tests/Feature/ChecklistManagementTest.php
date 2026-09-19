<?php

namespace Tests\Feature;

use App\Models\ToolChecklist;
use App\Models\ToolChecklistItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ChecklistManagementTest extends TestCase
{
    protected function getToolsMan(): User
    {
        $user = User::where('role_id', 4)->first();
        if (! $user) {
            $user = User::create([
                'given_name' => 'Tools',
                'last_name' => 'Manager',
                'email' => 'toolsman.test@coolingtower.com',
                'password' => 'password',
                'role_id' => 4,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1990-01-01',
                'sex' => 'Male',
                'contact_number' => '09170000004',
                'address' => 'HQ Warehouse',
            ]);
        }
        $user->email_verified_at = now();
        $user->is_active = true;
        $user->save();

        return $user;
    }

    protected function createTestChecklist(): ToolChecklist
    {
        // Get or create booking
        $bookingId = DB::table('bookings')->value('booking_id');
        if (! $bookingId) {
            $clientId = DB::table('users')->where('role_id', 6)->value('user_id') ?: 1;
            $serviceId = DB::table('services')->value('service_id') ?: 1;
            $bookingId = DB::table('bookings')->insertGetId([
                'client_id' => $clientId,
                'service_id' => $serviceId,
                'scheduled_date' => now()->addDays(2),
                'booking_status' => 'Pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $techId = DB::table('users')->where('role_id', 5)->value('user_id') ?: 1;

        return ToolChecklist::create([
            'booking_id' => $bookingId,
            'technician_id' => $techId,
            'status' => 'Pending',
            'notes' => 'Test checklist for management validation',
        ]);
    }

    public function test_tools_man_cannot_add_quantity_exceeding_inventory_stock(): void
    {
        $toolsMan = $this->getToolsMan();
        $checklist = $this->createTestChecklist();

        // Create an inventory item with 5 units on hand
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Limited Stock Drill Bit',
            'item_type' => 'Tool',
            'inventory_mode' => 'worker',
            'tool_subtype' => 'hand',
            'quantity_on_hand' => 5,
            'initial_stock' => 5,
            'reorder_level' => 2,
            'unit' => 'pcs',
            'status' => 'Available',
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        // Attempt to add 10 units (exceeds 5)
        $response = $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklist->checklist_id}/items", [
                'items' => [
                    [
                        'item_id' => $itemId,
                        'quantity_approved' => 10,
                    ],
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);
        $this->assertStringContainsString('Only 5 available in inventory', $response->json('errors.items.0'));

        // Clean up
        DB::table('inventory_items')->where('item_id', $itemId)->delete();
        $checklist->delete();
    }

    public function test_tools_man_cannot_add_sale_inventory_items_to_checklist(): void
    {
        $toolsMan = $this->getToolsMan();
        $checklist = $this->createTestChecklist();

        // Create a sale inventory item
        $itemId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Commercial Aircon Filter For Sale',
            'item_type' => 'Material',
            'inventory_mode' => 'sale',
            'quantity_on_hand' => 20,
            'initial_stock' => 20,
            'reorder_level' => 5,
            'unit' => 'pcs',
            'status' => 'Available',
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        $response = $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklist->checklist_id}/items", [
                'items' => [
                    [
                        'item_id' => $itemId,
                        'quantity_approved' => 2,
                    ],
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);
        $this->assertStringContainsString('for customer sale and cannot be added', $response->json('errors.items.0'));

        // Clean up
        DB::table('inventory_items')->where('item_id', $itemId)->delete();
        $checklist->delete();
    }

    public function test_tools_man_can_add_item_within_available_stock_and_materials_get_consumed_status(): void
    {
        $toolsMan = $this->getToolsMan();
        $checklist = $this->createTestChecklist();

        // Create a worker material with 15 units
        $materialId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Insulation Foam Tape',
            'item_type' => 'Material',
            'inventory_mode' => 'worker',
            'quantity_on_hand' => 15,
            'initial_stock' => 15,
            'reorder_level' => 3,
            'unit' => 'rolls',
            'status' => 'Available',
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        // Create a worker tool with 3 units
        $toolId = DB::table('inventory_items')->insertGetId([
            'item_name' => 'Digital Manifold Gauge',
            'item_type' => 'Tool',
            'inventory_mode' => 'worker',
            'tool_subtype' => 'hand',
            'quantity_on_hand' => 3,
            'initial_stock' => 3,
            'reorder_level' => 1,
            'unit' => 'set',
            'status' => 'Available',
            'created_at' => now(),
            'last_updated' => now(),
        ]);

        $response = $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklist->checklist_id}/items", [
                'items' => [
                    [
                        'item_id' => $materialId,
                        'quantity_approved' => 4,
                    ],
                    [
                        'item_id' => $toolId,
                        'quantity_approved' => 2,
                    ],
                ],
            ]);

        $response->assertStatus(200);

        // Verify material has 'consumed' status (no return needed)
        $materialChecklistItem = ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
            ->where('item_id', $materialId)
            ->first();
        $this->assertNotNull($materialChecklistItem);
        $this->assertEquals(4, $materialChecklistItem->quantity_approved);
        $this->assertEquals('consumed', $materialChecklistItem->status);

        // Verify tool has 'assigned' status
        $toolChecklistItem = ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
            ->where('item_id', $toolId)
            ->first();
        $this->assertNotNull($toolChecklistItem);
        $this->assertEquals(2, $toolChecklistItem->quantity_approved);
        $this->assertEquals('assigned', $toolChecklistItem->status);

        // Verify Tools Man CANNOT update status on material (rejected)
        $materialStatusResponse = $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklist->checklist_id}/items/{$materialChecklistItem->id}/status", [
                'status' => 'returned',
            ]);
        $materialStatusResponse->assertStatus(422);
        $materialStatusResponse->assertJsonValidationErrors(['status']);

        // Verify Tools Man CAN update status on tool
        $toolStatusResponse = $this->actingAs($toolsMan)
            ->patchJson("/tools-man/checklists/{$checklist->checklist_id}/items/{$toolChecklistItem->id}/status", [
                'status' => 'returned',
            ]);
        $toolStatusResponse->assertStatus(200);
        $this->assertEquals('returned', $toolChecklistItem->fresh()->status);

        // Clean up
        DB::table('tool_checklist_items')->where('checklist_id', $checklist->checklist_id)->delete();
        DB::table('inventory_items')->whereIn('item_id', [$materialId, $toolId])->delete();
        $checklist->delete();
    }
}
