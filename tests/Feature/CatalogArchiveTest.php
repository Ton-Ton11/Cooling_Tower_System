<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Service;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogArchiveTest extends TestCase
{
    protected function getSuperAdmin(): User
    {
        $user = User::where('role_id', 1)->first();
        if (!$user) {
            $user = User::create([
                'given_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin.test@coolingtower.com',
                'password' => 'password',
                'role_id' => 1,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1985-01-01',
                'sex' => 'Male',
                'contact_number' => '09180000000',
                'address' => 'HQ',
            ]);
        }
        $user->email_verified_at = now();
        $user->is_active = true;
        $user->save();

        return $user;
    }

    public function test_service_is_archived_instead_of_deleted(): void
    {
        $admin = $this->getSuperAdmin();

        Service::where('service_name', 'Full Chemical Bath Flush')->delete();

        $service = Service::create([
            'service_name' => 'Full Chemical Bath Flush',
            'description' => 'Test deep flush description',
            'base_price' => 2500.00,
            'category' => 'Cleaning',
            'display_order' => 1,
            'is_active' => true,
        ]);

        // Archive service via DELETE
        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/services/{$service->service_id}");

        $response->assertOk()
            ->assertJsonPath('message', sprintf('Service "%s" archived successfully.', $service->service_name))
            ->assertJsonPath('archived', true);

        // Verify row still exists in DB but is_active is false
        $this->assertDatabaseHas('services', [
            'service_id' => $service->service_id,
            'service_name' => 'Full Chemical Bath Flush',
            'is_active' => 0,
        ]);

        // Restore service
        $restoreResponse = $this->actingAs($admin)
            ->patchJson("/super-admin/catalog/services/{$service->service_id}/restore");

        $restoreResponse->assertOk()
            ->assertJsonPath('message', sprintf('Service "%s" restored successfully.', $service->service_name))
            ->assertJsonPath('restored', true);

        $this->assertDatabaseHas('services', [
            'service_id' => $service->service_id,
            'is_active' => 1,
        ]);
    }

    public function test_unit_type_is_archived_instead_of_deleted(): void
    {
        $admin = $this->getSuperAdmin();

        UnitType::where('code', 'PORTABLE_TEST')->delete();

        $unitType = UnitType::create([
            'name' => 'Portable Air Conditioner',
            'code' => 'PORTABLE_TEST',
            'icon' => 'M12 4v16',
            'description' => 'Mobile cooling unit',
            'display_order' => 5,
            'is_active' => true,
        ]);

        // Archive unit type
        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/unit-types/{$unitType->id}");

        $response->assertOk()
            ->assertJsonPath('message', sprintf('AC Unit Type "%s" archived successfully.', $unitType->name))
            ->assertJsonPath('archived', true);

        $this->assertDatabaseHas('unit_types', [
            'id' => $unitType->id,
            'code' => 'PORTABLE_TEST',
            'is_active' => 0,
        ]);

        // Restore unit type
        $restoreResponse = $this->actingAs($admin)
            ->patchJson("/super-admin/catalog/unit-types/{$unitType->id}/restore");

        $restoreResponse->assertOk()
            ->assertJsonPath('message', sprintf('AC Unit Type "%s" restored successfully.', $unitType->name))
            ->assertJsonPath('restored', true);

        $this->assertDatabaseHas('unit_types', [
            'id' => $unitType->id,
            'is_active' => 1,
        ]);
    }

    public function test_brand_is_archived_instead_of_deleted(): void
    {
        $admin = $this->getSuperAdmin();

        Brand::where('name', 'AeroKool Brand Test')->delete();

        $brand = Brand::create([
            'name' => 'AeroKool Brand Test',
            'country_of_origin' => 'Germany',
            'description' => 'High efficiency brand',
            'display_order' => 10,
            'is_active' => true,
        ]);

        // Archive brand
        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/brands/{$brand->id}");

        $response->assertOk()
            ->assertJsonPath('message', sprintf('AC Brand "%s" archived successfully.', $brand->name))
            ->assertJsonPath('archived', true);

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'name' => 'AeroKool Brand Test',
            'is_active' => 0,
        ]);

        // Restore brand
        $restoreResponse = $this->actingAs($admin)
            ->patchJson("/super-admin/catalog/brands/{$brand->id}/restore");

        $restoreResponse->assertOk()
            ->assertJsonPath('message', sprintf('AC Brand "%s" restored successfully.', $brand->name))
            ->assertJsonPath('restored', true);

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'is_active' => 1,
        ]);
    }

    public function test_manager_can_archive_service_via_patch_and_delete_methods(): void
    {
        $manager = User::where('role_id', 2)->first();
        if (!$manager) {
            $manager = User::create([
                'given_name' => 'Manager',
                'last_name' => 'Test',
                'email' => 'manager.test@coolingtower.com',
                'password' => 'password',
                'role_id' => 2,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1990-01-01',
                'sex' => 'Female',
                'contact_number' => '09180000001',
                'address' => 'HQ',
            ]);
        }
        $manager->email_verified_at = now();
        $manager->is_active = true;
        $manager->save();

        Service::where('service_name', 'Manager Archive Test Service')->delete();

        $service = Service::create([
            'service_name' => 'Manager Archive Test Service',
            'description' => 'Test manager service archive',
            'base_price' => 1500.00,
            'category' => 'Repair',
            'display_order' => 2,
            'is_active' => true,
        ]);

        // Test DELETE on /archive route (which caused the user's issue)
        $delResponse = $this->actingAs($manager)
            ->deleteJson("/manager/catalog/services/{$service->service_id}/archive");

        $delResponse->assertOk()
            ->assertJsonPath('archived', true);

        $this->assertDatabaseHas('services', [
            'service_id' => $service->service_id,
            'is_active' => 0,
        ]);

        // Restore it
        $this->actingAs($manager)
            ->patchJson("/manager/catalog/services/{$service->service_id}/restore")
            ->assertOk();

        // Test PATCH on /archive route
        $patchResponse = $this->actingAs($manager)
            ->patchJson("/manager/catalog/services/{$service->service_id}/archive");

        $patchResponse->assertOk()
            ->assertJsonPath('archived', true);

        $this->assertDatabaseHas('services', [
            'service_id' => $service->service_id,
            'is_active' => 0,
        ]);
    }

    public function test_super_admin_can_force_delete_service_with_no_bookings(): void
    {
        $admin = $this->getSuperAdmin();

        $service = Service::create([
            'service_name' => 'Ephemeral Test Service',
            'description' => 'Will be permanently deleted',
            'base_price' => 999.00,
            'category' => 'Inspection',
            'display_order' => 99,
            'is_active' => false,
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/services/{$service->service_id}/force-delete");

        $response->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('services', [
            'service_id' => $service->service_id,
        ]);
    }

    public function test_super_admin_cannot_force_delete_service_with_existing_bookings(): void
    {
        $admin = $this->getSuperAdmin();

        $service = Service::create([
            'service_name' => 'Protected Booked Service',
            'description' => 'Cannot be deleted due to bookings',
            'base_price' => 1200.00,
            'category' => 'Repair',
            'display_order' => 98,
            'is_active' => false,
        ]);

        // Insert a dummy booking
        $customer = User::where('role_id', 6)->first();
        if (!$customer) {
            $customer = User::create([
                'given_name' => 'Customer',
                'last_name' => 'Test',
                'email' => 'customer.test@coolingtower.com',
                'password' => 'password',
                'role_id' => 6,
                'email_verified_at' => now(),
                'birthdate' => '1995-05-05',
                'sex' => 'Male',
                'contact_number' => '09190000002',
                'address' => 'Customer Address',
            ]);
        }

        \Illuminate\Support\Facades\DB::table('bookings')->insert([
            'client_id' => $customer->user_id,
            'service_id' => $service->service_id,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'Completed',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/services/{$service->service_id}/force-delete");

        $response->assertStatus(422)
            ->assertJsonPath('message', sprintf('Cannot permanently delete "%s" because it has existing customer bookings. Keep it archived instead to preserve historical records.', $service->service_name));

        $this->assertDatabaseHas('services', [
            'service_id' => $service->service_id,
        ]);
    }

    public function test_non_super_admin_cannot_force_delete_catalog_items(): void
    {
        $manager = User::where('role_id', 2)->first();

        $service = Service::create([
            'service_name' => 'Manager Denied Service',
            'description' => 'Non admin cannot delete',
            'base_price' => 500.00,
            'category' => 'Cleaning',
            'is_active' => false,
        ]);

        $response = $this->actingAs($manager)
            ->deleteJson("/super-admin/catalog/services/{$service->service_id}/force-delete");

        $response->assertForbidden();

        $this->assertDatabaseHas('services', [
            'service_id' => $service->service_id,
        ]);
    }

    public function test_super_admin_can_force_delete_unit_type_and_brand(): void
    {
        $admin = $this->getSuperAdmin();

        $unitType = UnitType::create([
            'name' => 'Temporary Unit Type',
            'code' => 'TEMP_UT',
            'icon' => 'M12 4v16',
            'is_active' => false,
        ]);

        $brand = Brand::create([
            'name' => 'Temporary Brand',
            'country_of_origin' => 'Japan',
            'is_active' => false,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/unit-types/{$unitType->id}/force-delete")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('unit_types', ['id' => $unitType->id]);

        $this->actingAs($admin)
            ->deleteJson("/super-admin/catalog/brands/{$brand->id}/force-delete")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
    }
}
