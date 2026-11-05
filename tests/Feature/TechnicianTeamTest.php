<?php

namespace Tests\Feature;

use App\Models\TechnicianTeam;
use App\Models\TechnicianTeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TechnicianTeamTest extends TestCase
{
    protected function getHeadTechnician(): User
    {
        $user = User::where('role_id', 7)->first() 
            ?? User::where('is_head_technician', true)->first();
        if (!$user) {
            $user = User::create([
                'given_name' => 'Rafael',
                'last_name' => 'Torres',
                'email' => 'rafael.torres.test@coolingtower.com',
                'password' => 'password',
                'role_id' => 7,
                'is_head_technician' => true,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1990-01-01',
                'sex' => 'Male',
                'contact_number' => '09123456789',
                'address' => 'Manila',
            ]);
        }
        $user->email_verified_at = now();
        $user->is_active = true;
        $user->save();

        return $user;
    }

    protected function getTechnician(): User
    {
        $user = User::where('role_id', 5)->where('is_head_technician', false)->first();
        if (!$user) {
            $user = User::create([
                'given_name' => 'Danilo',
                'last_name' => 'Ramos',
                'email' => 'danilo.ramos.test@coolingtower.com',
                'password' => 'password',
                'role_id' => 5,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1992-02-02',
                'sex' => 'Male',
                'contact_number' => '09123456780',
                'address' => 'Quezon City',
            ]);
        }
        $user->email_verified_at = now();
        $user->is_active = true;
        $user->save();

        return $user;
    }

    public function test_head_technician_can_list_teams_and_available_technicians(): void
    {
        $headTech = $this->getHeadTechnician();

        $response = $this->actingAs($headTech)
            ->getJson('/head-technician/teams');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'technicians' => [
                    '*' => ['user_id', 'technician_id', 'name', 'full_name', 'email', 'role_id', 'is_head_technician', 'teams']
                ]
            ]);

        $this->assertNotEmpty($response->json('technicians'));
    }

    public function test_head_technician_can_add_member_directly_to_team(): void
    {
        $headTech = $this->getHeadTechnician();

        // Create or fetch unassigned technician
        $tech = User::firstOrCreate(
            ['email' => 'unassigned.tech.test@coolingtower.com'],
            [
                'given_name' => 'Unassigned',
                'last_name' => 'Tech',
                'password' => 'password',
                'role_id' => 5,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1995-05-05',
                'sex' => 'Male',
                'contact_number' => '09991234567',
                'address' => 'Pasig City',
            ]
        );
        TechnicianTeamMember::where('technician_id', $tech->user_id)->delete();

        $team = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Test Squad Unit'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        $response = $this->actingAs($headTech)
            ->postJson("/head-technician/teams/{$team->team_id}/members", [
                'technician_id' => $tech->user_id,
                'role_in_team' => 'Member',
            ]);

        $response->assertOk()
            ->assertJsonPath('message', sprintf('Technician "%s" added to team successfully.', $tech->name));

        $this->assertDatabaseHas('technician_team_members', [
            'team_id' => $team->team_id,
            'technician_id' => $tech->user_id,
        ]);
    }

    public function test_head_technician_can_remove_member_from_team(): void
    {
        $headTech = $this->getHeadTechnician();
        $tech = $this->getTechnician();

        $team = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Test Squad Unit'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        TechnicianTeamMember::firstOrCreate([
            'team_id' => $team->team_id,
            'technician_id' => $tech->user_id,
        ], [
            'role_in_team' => 'Member',
        ]);

        $response = $this->actingAs($headTech)
            ->deleteJson("/head-technician/teams/{$team->team_id}/members/{$tech->user_id}");

        $response->assertOk();

        $this->assertDatabaseMissing('technician_team_members', [
            'team_id' => $team->team_id,
            'technician_id' => $tech->user_id,
        ]);
    }

    public function test_head_technician_can_fetch_available_technicians_endpoint(): void
    {
        $headTech = $this->getHeadTechnician();

        $response = $this->actingAs($headTech)
            ->getJson('/head-technician/teams/available-technicians');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['user_id', 'technician_id', 'name', 'full_name', 'email']
                ]
            ]);
    }

    public function test_technician_cannot_be_added_to_another_team_via_add_member(): void
    {
        $headTech = $this->getHeadTechnician();

        $tech = User::firstOrCreate(
            ['email' => 'singleteam.tech.test@coolingtower.com'],
            [
                'given_name' => 'SingleTeam',
                'last_name' => 'Tech',
                'password' => 'password',
                'role_id' => 5,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1996-06-06',
                'sex' => 'Male',
                'contact_number' => '09997654321',
                'address' => 'Makati City',
            ]
        );
        TechnicianTeamMember::where('technician_id', $tech->user_id)->delete();

        // Team 1
        $team1 = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Team Alpha First'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        // Assign tech to Team 1
        TechnicianTeamMember::firstOrCreate([
            'team_id' => $team1->team_id,
            'technician_id' => $tech->user_id,
        ], ['role_in_team' => 'Member']);

        // Team 2
        $team2 = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Team Beta Second'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        // Attempt to add tech to Team 2
        $response = $this->actingAs($headTech)
            ->postJson("/head-technician/teams/{$team2->team_id}/members", [
                'technician_id' => $tech->user_id,
                'role_in_team' => 'Member',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', sprintf(
                'Technician "%s" is already assigned to team "%s". Technicians can only be assigned to one squad at a time.',
                $tech->name,
                $team1->team_name
            ));
    }

    public function test_technician_cannot_be_assigned_to_another_team_via_update(): void
    {
        $headTech = $this->getHeadTechnician();
        $tech = $this->getTechnician();

        $team1 = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Team Alpha First'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        TechnicianTeamMember::firstOrCreate([
            'team_id' => $team1->team_id,
            'technician_id' => $tech->user_id,
        ], ['role_in_team' => 'Member']);

        $team2 = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Team Beta Second'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        $response = $this->actingAs($headTech)
            ->patchJson("/head-technician/teams/{$team2->team_id}", [
                'team_name' => 'Team Beta Second Updated',
                'member_ids' => [$tech->user_id],
            ]);

        $response->assertStatus(422);
    }

    public function test_technician_cannot_be_assigned_to_another_team_via_store(): void
    {
        $headTech = $this->getHeadTechnician();
        $tech = $this->getTechnician();

        $team1 = TechnicianTeam::firstOrCreate(
            ['team_name' => 'Team Alpha First'],
            ['created_by' => $headTech->user_id, 'status' => 'Active']
        );

        TechnicianTeamMember::firstOrCreate([
            'team_id' => $team1->team_id,
            'technician_id' => $tech->user_id,
        ], ['role_in_team' => 'Member']);

        $response = $this->actingAs($headTech)
            ->postJson("/head-technician/teams", [
                'team_name' => 'Brand New Third Team',
                'member_ids' => [$tech->user_id],
            ]);

        $response->assertStatus(422);
    }

    public function test_head_technician_can_archive_team_and_release_technicians(): void
    {
        $headTech = $this->getHeadTechnician();
        $tech = User::firstOrCreate(
            ['email' => 'archive.release.test@coolingtower.com'],
            [
                'given_name' => 'ArchiveRelease',
                'last_name' => 'Tech',
                'password' => 'password',
                'role_id' => 5,
                'is_head_technician' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1994-04-04',
                'sex' => 'Male',
                'contact_number' => '09171112233',
                'address' => 'Mandaluyong',
            ]
        );
        TechnicianTeamMember::where('technician_id', $tech->user_id)->delete();

        $team = TechnicianTeam::create([
            'team_name' => 'Squad To Archive',
            'created_by' => $headTech->user_id,
            'status' => 'Active',
            'leader_id' => $tech->user_id,
        ]);

        TechnicianTeamMember::create([
            'team_id' => $team->team_id,
            'technician_id' => $tech->user_id,
            'role_in_team' => 'Lead',
        ]);

        // Archive team via DELETE (or PATCH archive)
        $response = $this->actingAs($headTech)
            ->deleteJson("/head-technician/teams/{$team->team_id}");

        $response->assertOk()
            ->assertJsonPath('message', sprintf('Technician team "%s" archived successfully.', $team->team_name));

        // Team record is NOT deleted, status is Archived
        $this->assertDatabaseHas('technician_teams', [
            'team_id' => $team->team_id,
            'status' => 'Archived',
        ]);

        // Technician members are unassigned
        $this->assertDatabaseMissing('technician_team_members', [
            'team_id' => $team->team_id,
            'technician_id' => $tech->user_id,
        ]);

        // Released technician can now be assigned to a new squad without conflict
        $newTeam = TechnicianTeam::create([
            'team_name' => 'New Active Squad After Archive',
            'created_by' => $headTech->user_id,
            'status' => 'Active',
        ]);

        $assignResponse = $this->actingAs($headTech)
            ->postJson("/head-technician/teams/{$newTeam->team_id}/members", [
                'technician_id' => $tech->user_id,
                'role_in_team' => 'Member',
            ]);

        $assignResponse->assertOk();
    }

    public function test_head_technician_can_restore_archived_team(): void
    {
        $headTech = $this->getHeadTechnician();

        $team = TechnicianTeam::create([
            'team_name' => 'Archived Squad To Restore',
            'created_by' => $headTech->user_id,
            'status' => 'Archived',
        ]);

        $response = $this->actingAs($headTech)
            ->patchJson("/head-technician/teams/{$team->team_id}/restore");

        $response->assertOk()
            ->assertJsonPath('message', sprintf('Technician team "%s" restored successfully.', $team->team_name));

        $this->assertDatabaseHas('technician_teams', [
            'team_id' => $team->team_id,
            'status' => 'Active',
        ]);
    }

    protected function getSuperAdmin(): User
    {
        $user = User::where('role_id', 1)->first();
        if (!$user) {
            $user = User::create([
                'given_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'super.admin.teamtest@coolingtower.com',
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

    public function test_super_admin_can_force_delete_team(): void
    {
        $admin = $this->getSuperAdmin();

        $team = TechnicianTeam::create([
            'team_name' => 'Squad For Force Deletion',
            'created_by' => $admin->user_id,
            'status' => 'Archived',
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/teams/{$team->team_id}/force-delete");

        $response->assertOk()
            ->assertJsonPath('deleted', true)
            ->assertJsonPath('message', sprintf('Technician squad "%s" permanently deleted.', $team->team_name));

        $this->assertDatabaseMissing('technician_teams', [
            'team_id' => $team->team_id,
        ]);
    }

    public function test_head_technician_cannot_force_delete_team(): void
    {
        $headTech = $this->getHeadTechnician();

        $team = TechnicianTeam::create([
            'team_name' => 'Protected Squad From Non Admin',
            'created_by' => $headTech->user_id,
            'status' => 'Archived',
        ]);

        $response = $this->actingAs($headTech)
            ->deleteJson("/super-admin/teams/{$team->team_id}/force-delete");

        $response->assertForbidden();

        $this->assertDatabaseHas('technician_teams', [
            'team_id' => $team->team_id,
        ]);
    }

    public function test_super_admin_cannot_force_delete_team_with_active_bookings(): void
    {
        $admin = $this->getSuperAdmin();

        $team = TechnicianTeam::create([
            'team_name' => 'In Flight Booked Squad',
            'created_by' => $admin->user_id,
            'status' => 'Archived',
        ]);

        $customer = User::where('role_id', 6)->first();
        if (!$customer) {
            $customer = User::create([
                'given_name' => 'Cust',
                'last_name' => 'Test',
                'email' => 'cust.teamtest@coolingtower.com',
                'password' => 'password',
                'role_id' => 6,
                'email_verified_at' => now(),
                'birthdate' => '1995-05-05',
                'sex' => 'Male',
                'contact_number' => '09190000003',
                'address' => 'Customer Address',
            ]);
        }

        $service = \App\Models\Service::first() ?? \App\Models\Service::create([
            'service_name' => 'Service For Team Test',
            'base_price' => 1000,
        ]);

        \Illuminate\Support\Facades\DB::table('bookings')->insert([
            'client_id' => $customer->user_id,
            'service_id' => $service->service_id,
            'assigned_team_id' => $team->team_id,
            'scheduled_date' => now()->addDay(),
            'booking_status' => 'In-Progress',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/super-admin/teams/{$team->team_id}/force-delete");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot permanently delete a squad with active in-flight bookings. Reassign or complete bookings first.');

        $this->assertDatabaseHas('technician_teams', [
            'team_id' => $team->team_id,
        ]);
    }
}
