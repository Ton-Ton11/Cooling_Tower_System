<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UserPresenceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
    }

    protected function makeUser(int $roleId, array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role_id' => $roleId,
            'is_active' => true,
        ], $overrides));
    }

    public function test_user_heartbeat_updates_presence_and_timestamp(): void
    {
        $manager = $this->makeUser(2, [
            'is_online' => false,
            'last_seen_at' => null,
        ]);

        $response = $this->actingAs($manager)
            ->postJson('/user/heartbeat');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('is_online', true);

        $manager->refresh();
        $this->assertTrue($manager->is_online);
        $this->assertNotNull($manager->last_seen_at);
        $this->assertTrue($manager->isCurrentlyOnline());
    }

    public function test_staff_presence_returns_online_and_offline_labels(): void
    {
        $manager = $this->makeUser(2, [
            'given_name' => 'Maria',
            'last_name' => 'Manager',
            'is_online' => true,
            'last_seen_at' => now(),
        ]);

        $adminAssistant = $this->makeUser(3, [
            'given_name' => 'Juan',
            'last_name' => 'Assistant',
            'is_online' => false,
            'last_seen_at' => now()->subHours(2),
        ]);

        $response = $this->actingAs($manager)
            ->getJson('/user/presence/staff');

        $response->assertOk();

        $staff = collect($response->json('staff'));
        $managerRow = $staff->firstWhere('id', $manager->user_id);
        $assistantRow = $staff->firstWhere('id', $adminAssistant->user_id);

        $this->assertNotNull($managerRow);
        $this->assertEquals('Online', $managerRow['status']);
        $this->assertTrue($managerRow['is_online']);

        $this->assertNotNull($assistantRow);
        $this->assertEquals('Offline', $assistantRow['status']);
        $this->assertFalse($assistantRow['is_online']);
    }

    public function test_employee_cannot_see_super_admin_when_hidden(): void
    {
        $superAdmin = $this->makeUser(1, [
            'given_name' => 'Toni',
            'last_name' => 'SuperAdmin',
            'is_online' => true,
            'last_seen_at' => now(),
            'hide_active_status' => true,
        ]);

        $manager = $this->makeUser(2, [
            'given_name' => 'Maria',
            'last_name' => 'Manager',
        ]);

        $response = $this->actingAs($manager)
            ->getJson('/user/presence/staff');

        $response->assertOk();
        $staff = collect($response->json('staff'));

        $this->assertNull($staff->firstWhere('id', $superAdmin->user_id));
        $this->assertNotNull($staff->firstWhere('id', $manager->user_id));
    }

    public function test_employee_can_see_super_admin_when_unhidden(): void
    {
        $superAdmin = $this->makeUser(1, [
            'given_name' => 'Toni',
            'last_name' => 'SuperAdmin',
            'is_online' => true,
            'last_seen_at' => now(),
            'hide_active_status' => false,
        ]);

        $manager = $this->makeUser(2, [
            'given_name' => 'Maria',
            'last_name' => 'Manager',
        ]);

        $response = $this->actingAs($manager)
            ->getJson('/user/presence/staff');

        $response->assertOk();
        $staff = collect($response->json('staff'));

        $this->assertNotNull($staff->firstWhere('id', $superAdmin->user_id));
    }

    public function test_super_admin_can_always_see_themselves_even_when_hidden(): void
    {
        $superAdmin = $this->makeUser(1, [
            'given_name' => 'Toni',
            'last_name' => 'SuperAdmin',
            'is_online' => true,
            'last_seen_at' => now(),
            'hide_active_status' => true,
        ]);

        $manager = $this->makeUser(2, [
            'given_name' => 'Maria',
            'last_name' => 'Manager',
        ]);

        $response = $this->actingAs($superAdmin)
            ->getJson('/user/presence/staff');

        $response->assertOk();
        $staff = collect($response->json('staff'));

        $this->assertNotNull($staff->firstWhere('id', $superAdmin->user_id));
        $this->assertNotNull($staff->firstWhere('id', $manager->user_id));
    }

    public function test_only_super_admin_can_toggle_presence_visibility(): void
    {
        $manager = $this->makeUser(2);
        $superAdmin = $this->makeUser(1, ['hide_active_status' => false]);

        // Manager cannot toggle
        $this->actingAs($manager)
            ->postJson('/user/presence/toggle-visibility', ['hide' => true])
            ->assertForbidden();

        // Super Admin can toggle
        $res = $this->actingAs($superAdmin)
            ->postJson('/user/presence/toggle-visibility', ['hide' => true]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('hide_active_status', true);

        $superAdmin->refresh();
        $this->assertTrue($superAdmin->hide_active_status);

        // Toggle back
        $res2 = $this->actingAs($superAdmin)
            ->postJson('/user/presence/toggle-visibility');

        $res2->assertOk()
            ->assertJsonPath('hide_active_status', false);

        $superAdmin->refresh();
        $this->assertFalse($superAdmin->hide_active_status);
    }

    public function test_user_login_and_logout_updates_online_status(): void
    {
        $manager = $this->makeUser(2, [
            'password' => bcrypt('password123'),
            'is_online' => false,
            'last_seen_at' => null,
        ]);

        // 1. Log in
        $response = $this->post('/login', [
            'email' => $manager->email,
            'password' => 'password123',
        ]);

        $response->assertRedirect('/manager/dashboard');
        $manager->refresh();
        $this->assertTrue($manager->is_online);
        $this->assertNotNull($manager->last_seen_at);

        // 2. Log out
        $logoutResponse = $this->actingAs($manager)->post('/logout');
        $logoutResponse->assertRedirect('/');

        $manager->refresh();
        $this->assertFalse($manager->is_online);
    }
}
