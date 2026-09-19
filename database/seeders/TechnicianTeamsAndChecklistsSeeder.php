<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\TechnicianTeam;
use App\Models\TechnicianTeamMember;
use App\Models\ToolChecklist;
use App\Models\ToolChecklistItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TechnicianTeamsAndChecklistsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Head Technician exists & is flagged
        $headTech = User::updateOrCreate(
            ['email' => 'rafael.torres@coolingtower.com'],
            [
                'role_id' => 7,
                'is_head_technician' => true,
                'given_name' => 'Rafael',
                'middle_name' => 'Gonzales',
                'last_name' => 'Torres',
                'birthdate' => '1992-09-18',
                'sex' => 'Male',
                'address' => '890 España Street, Barangay 429, Manila',
                'contact_number' => '09226789012',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Create Regular Technicians
        $regularTech1 = User::updateOrCreate(
            ['email' => 'danilo.ramos@coolingtower.com'],
            [
                'role_id' => 5,
                'is_head_technician' => false,
                'given_name' => 'Danilo',
                'middle_name' => 'Cruz',
                'last_name' => 'Ramos',
                'birthdate' => '1994-04-12',
                'sex' => 'Male',
                'address' => '42 Aurora Blvd, Quezon City',
                'contact_number' => '09221112233',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $regularTech2 = User::updateOrCreate(
            ['email' => 'arnel.castro@coolingtower.com'],
            [
                'role_id' => 5,
                'is_head_technician' => false,
                'given_name' => 'Arnel',
                'middle_name' => 'Bautista',
                'last_name' => 'Castro',
                'birthdate' => '1995-08-20',
                'sex' => 'Male',
                'address' => '15 Shaw Blvd, Pasig City',
                'contact_number' => '09224445566',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $regularTech3 = User::updateOrCreate(
            ['email' => 'miguel.santos@coolingtower.com'],
            [
                'role_id' => 5,
                'is_head_technician' => false,
                'given_name' => 'Miguel',
                'middle_name' => 'Villanueva',
                'last_name' => 'Santos',
                'birthdate' => '1993-01-15',
                'sex' => 'Male',
                'address' => '77 Buendia Ave, Makati City',
                'contact_number' => '09227778899',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Manager user
        $manager = User::where('role_id', 2)->first() ?? User::updateOrCreate(
            ['email' => 'maria.garcia@coolingtower.com'],
            [
                'role_id' => 2,
                'given_name' => 'Maria',
                'middle_name' => 'Lopez',
                'last_name' => 'Garcia',
                'birthdate' => '1990-07-22',
                'sex' => 'Female',
                'address' => '456 EDSA, Mandaluyong City',
                'contact_number' => '09182345678',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Tools Man user
        $toolsMan = User::where('role_id', 4)->first() ?? User::updateOrCreate(
            ['email' => 'pedro.reyes@coolingtower.com'],
            [
                'role_id' => 4,
                'given_name' => 'Pedro',
                'middle_name' => 'Santos',
                'last_name' => 'Reyes',
                'birthdate' => '1988-05-30',
                'sex' => 'Male',
                'address' => '321 Quezon Boulevard, Quezon City',
                'contact_number' => '09204567890',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Customer user
        $customer = User::where('role_id', 6)->first() ?? User::updateOrCreate(
            ['email' => 'customer.test@coolingtower.com'],
            [
                'role_id' => 6,
                'given_name' => 'Elena',
                'middle_name' => 'Roque',
                'last_name' => 'Tan',
                'birthdate' => '1991-03-10',
                'sex' => 'Female',
                'address' => '88 Ayala Ave, San Lorenzo, Makati City',
                'contact_number' => '09178889999',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 3. Create Technician Teams
        $teamAlpha = TechnicianTeam::updateOrCreate(
            ['team_name' => 'Alpha Cooling Squad'],
            [
                'leader_id' => $headTech->user_id,
                'created_by' => $headTech->user_id,
                'status' => 'Active',
                'description' => 'Specializes in cooling tower motor overhauls, chemical flush, and high-rise HVAC systems.',
            ]
        );

        // Sync members for Alpha Cooling Squad
        TechnicianTeamMember::updateOrCreate(
            ['team_id' => $teamAlpha->team_id, 'technician_id' => $headTech->user_id],
            ['role_in_team' => 'Leader']
        );
        TechnicianTeamMember::updateOrCreate(
            ['team_id' => $teamAlpha->team_id, 'technician_id' => $regularTech1->user_id],
            ['role_in_team' => 'Member']
        );
        TechnicianTeamMember::updateOrCreate(
            ['team_id' => $teamAlpha->team_id, 'technician_id' => $regularTech2->user_id],
            ['role_in_team' => 'Member']
        );

        $teamDelta = TechnicianTeam::updateOrCreate(
            ['team_name' => 'Delta AC Specialists'],
            [
                'leader_id' => $regularTech3->user_id,
                'created_by' => $headTech->user_id,
                'status' => 'Active',
                'description' => 'VRF multi-split diagnostics, precision refrigerant leak repair, and smart thermostat calibration.',
            ]
        );

        // Sync members for Delta AC Specialists
        TechnicianTeamMember::updateOrCreate(
            ['team_id' => $teamDelta->team_id, 'technician_id' => $regularTech3->user_id],
            ['role_in_team' => 'Leader']
        );
        // Delta AC Specialists has regularTech3 as leader. Technicians can only be assigned to one squad at a time.
        // regularTech1 and regularTech2 belong to Alpha Cooling Squad.

        // 4. Ensure Inventory Items (Tools & Materials) exist (using created_at and last_updated)
        DB::table('inventory_items')->updateOrInsert(
            ['item_name' => 'Digital Manifold Gauge Set (Wireless)'],
            [
                'item_type' => 'Tool',
                'inventory_mode' => 'tools_equipment',
                'tool_subtype' => 'Measurement Tool',
                'serial_number' => 'DMG-2026-001',
                'quantity_on_hand' => 5,
                'unit' => 'set',
                'status' => 'Available',
                'created_at' => now(),
                'last_updated' => now(),
            ]
        );
        $toolItem1 = DB::table('inventory_items')->where('item_name', 'Digital Manifold Gauge Set (Wireless)')->first();

        DB::table('inventory_items')->updateOrInsert(
            ['item_name' => 'Dual-Stage Deep Vacuum Pump 8CFM'],
            [
                'item_type' => 'Tool',
                'inventory_mode' => 'tools_equipment',
                'tool_subtype' => 'Power Equipment',
                'serial_number' => 'VP-8CFM-044',
                'quantity_on_hand' => 4,
                'unit' => 'unit',
                'status' => 'Available',
                'created_at' => now(),
                'last_updated' => now(),
            ]
        );
        $toolItem2 = DB::table('inventory_items')->where('item_name', 'Dual-Stage Deep Vacuum Pump 8CFM')->first();

        DB::table('inventory_items')->updateOrInsert(
            ['item_name' => 'Industrial High-Pressure Washer 180 Bar'],
            [
                'item_type' => 'Tool',
                'inventory_mode' => 'tools_equipment',
                'tool_subtype' => 'Cleaning Equipment',
                'serial_number' => 'PW-180B-012',
                'quantity_on_hand' => 6,
                'unit' => 'unit',
                'status' => 'Available',
                'created_at' => now(),
                'last_updated' => now(),
            ]
        );
        $toolItem3 = DB::table('inventory_items')->where('item_name', 'Industrial High-Pressure Washer 180 Bar')->first();

        DB::table('inventory_items')->updateOrInsert(
            ['item_name' => 'R-410A Eco Refrigerant Canister (11.3kg)'],
            [
                'item_type' => 'Material',
                'inventory_mode' => 'spare_parts',
                'tool_subtype' => 'Refrigerant',
                'serial_number' => 'R410A-CAN-88',
                'quantity_on_hand' => 20,
                'unit' => 'tank',
                'status' => 'Available',
                'created_at' => now(),
                'last_updated' => now(),
            ]
        );
        $matItem1 = DB::table('inventory_items')->where('item_name', 'R-410A Eco Refrigerant Canister (11.3kg)')->first();

        DB::table('inventory_items')->updateOrInsert(
            ['item_name' => 'Heavy-Duty Coil Cleaning Chemical (Gallon)'],
            [
                'item_type' => 'Material',
                'inventory_mode' => 'spare_parts',
                'tool_subtype' => 'Chemical Cleaner',
                'serial_number' => 'COIL-CHEM-GL',
                'quantity_on_hand' => 35,
                'unit' => 'gallon',
                'status' => 'Available',
                'created_at' => now(),
                'last_updated' => now(),
            ]
        );
        $matItem2 = DB::table('inventory_items')->where('item_name', 'Heavy-Duty Coil Cleaning Chemical (Gallon)')->first();

        // 5. Ensure Service exists
        $service1 = DB::table('services')->first();
        $serviceId = $service1 ? $service1->service_id : 1;

        // 6. Create Seed Bookings demonstrating every step of the workflow

        // Booking A: PENDING (ready for Manager to assign team)
        $bookingPending = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => $serviceId,
            'assigned_team_id' => null,
            'assigned_tech_id' => null,
            'assigned_by' => null,
            'scheduled_date' => now()->addDays(2)->setHour(9)->setMinute(0),
            'booking_status' => 'Pending',
            'service_payment_method' => 'GCash',
            'notes' => 'Commercial cooling tower overhaul inspection requested.',
        ]);

        DB::table('payment')->insert([
            'booking_id' => $bookingPending->booking_id,
            'amount_paid' => 4500.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Full',
            'reference_number' => 'GCASH-REF-' . rand(100000, 999999),
            'payment_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Booking B: APPROVED with PENDING Checklist (Technician can edit checklist)
        $bookingApproved = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => $serviceId,
            'assigned_team_id' => $teamAlpha->team_id,
            'assigned_tech_id' => $headTech->user_id,
            'assigned_by' => $manager->user_id,
            'scheduled_date' => now()->addDays(1)->setHour(10)->setMinute(30),
            'booking_status' => 'Approved',
            'service_payment_method' => 'GCash',
            'notes' => 'Assigned to Alpha Cooling Squad by Manager Maria Garcia.',
        ]);

        DB::table('payment')->insert([
            'booking_id' => $bookingApproved->booking_id,
            'amount_paid' => 3800.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Full',
            'reference_number' => 'GCASH-REF-' . rand(100000, 999999),
            'payment_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $checklistPending = ToolChecklist::create([
            'booking_id' => $bookingApproved->booking_id,
            'technician_id' => $headTech->user_id,
            'team_id' => $teamAlpha->team_id,
            'status' => 'Pending',
            'notes' => 'Requires high-pressure washer and coil cleaning chemicals for commercial tower.',
        ]);

        ToolChecklistItem::create([
            'checklist_id' => $checklistPending->checklist_id,
            'item_id' => $toolItem3->item_id,
            'item_type' => 'Tool',
            'quantity_requested' => 1,
            'quantity_approved' => 1,
            'status' => 'assigned',
            'notes' => 'For tower coil washing',
        ]);
        ToolChecklistItem::create([
            'checklist_id' => $checklistPending->checklist_id,
            'item_id' => $matItem2->item_id,
            'item_type' => 'Material',
            'quantity_requested' => 2,
            'quantity_approved' => 2,
            'status' => 'assigned',
            'notes' => 'Industrial strength',
        ]);

        // Booking C: DISPATCHED with APPROVED Checklist (Tools in custody, Tools Man manages return)
        $bookingDispatched = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => $serviceId,
            'assigned_team_id' => $teamAlpha->team_id,
            'assigned_tech_id' => $regularTech1->user_id,
            'assigned_by' => $manager->user_id,
            'scheduled_date' => now()->setHour(13)->setMinute(0),
            'booking_status' => 'Dispatched',
            'service_payment_method' => 'GCash',
            'notes' => 'Alpha Cooling Squad dispatched to customer facility.',
        ]);

        DB::table('payment')->insert([
            'booking_id' => $bookingDispatched->booking_id,
            'amount_paid' => 5200.00,
            'payment_status' => 'Paid',
            'payment_method' => 'GCash',
            'payment_type' => 'Full',
            'reference_number' => 'GCASH-REF-' . rand(100000, 999999),
            'payment_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $checklistApproved = ToolChecklist::create([
            'booking_id' => $bookingDispatched->booking_id,
            'technician_id' => $regularTech1->user_id,
            'team_id' => $teamAlpha->team_id,
            'status' => 'Approved',
            'notes' => 'Vacuum pump and digital manifold gauge issued for deep evacuation and recharging.',
            'approved_by' => $toolsMan->user_id,
            'approved_at' => now()->subHours(2),
        ]);

        ToolChecklistItem::create([
            'checklist_id' => $checklistApproved->checklist_id,
            'item_id' => $toolItem1->item_id,
            'item_type' => 'Tool',
            'quantity_requested' => 1,
            'quantity_approved' => 1,
            'status' => 'assigned', // In custody!
            'notes' => 'Digital gauge S/N DMG-2026-001',
        ]);
        ToolChecklistItem::create([
            'checklist_id' => $checklistApproved->checklist_id,
            'item_id' => $toolItem2->item_id,
            'item_type' => 'Tool',
            'quantity_requested' => 1,
            'quantity_approved' => 1,
            'status' => 'assigned', // In custody!
            'notes' => 'Pump VP-8CFM-044',
        ]);
        ToolChecklistItem::create([
            'checklist_id' => $checklistApproved->checklist_id,
            'item_id' => $matItem1->item_id,
            'item_type' => 'Material',
            'quantity_requested' => 1,
            'quantity_approved' => 1,
            'status' => 'assigned',
            'notes' => 'R-410A charge',
        ]);

        // Booking D: COMPLETED with COMPLETED Checklist & Booking
        $bookingCompleted = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => $serviceId,
            'assigned_team_id' => $teamDelta->team_id,
            'assigned_tech_id' => $regularTech3->user_id,
            'assigned_by' => $manager->user_id,
            'scheduled_date' => now()->subDays(3),
            'booking_status' => 'Completed',
            'service_payment_method' => 'Cash',
            'notes' => 'Completed diagnostic and servicing. All tools returned in good condition.',
        ]);

        DB::table('payment')->insert([
            'booking_id' => $bookingCompleted->booking_id,
            'amount_paid' => 3200.00,
            'payment_status' => 'Paid',
            'payment_method' => 'Cash',
            'payment_type' => 'Full',
            'reference_number' => 'CASH-REC-' . rand(100000, 999999),
            'payment_date' => now()->subDays(3),
            'created_at' => now()->subDays(3),
            'updated_at' => now()->subDays(3),
        ]);

        $checklistCompleted = ToolChecklist::create([
            'booking_id' => $bookingCompleted->booking_id,
            'technician_id' => $regularTech3->user_id,
            'team_id' => $teamDelta->team_id,
            'status' => 'Completed',
            'notes' => 'Service complete, tools returned to tool room warehouse.',
            'approved_by' => $toolsMan->user_id,
            'approved_at' => now()->subDays(3)->addHours(1),
            'completed_by' => $toolsMan->user_id,
            'completed_at' => now()->subDays(3)->addHours(5),
        ]);

        ToolChecklistItem::create([
            'checklist_id' => $checklistCompleted->checklist_id,
            'item_id' => $toolItem1->item_id,
            'item_type' => 'Tool',
            'quantity_requested' => 1,
            'quantity_approved' => 1,
            'status' => 'returned',
            'notes' => 'Inspected and verified good condition upon return.',
        ]);

        // 7. Insert Activity Logs
        DB::table('activity_logs')->insert([
            [
                'user_id' => $manager->user_id,
                'action_type' => 'ASSIGN_TEAM',
                'description' => sprintf('Manager assigned Alpha Cooling Squad to Booking #%d.', $bookingApproved->booking_id),
                'created_at' => now()->subHours(5),
                'updated_at' => now()->subHours(5),
            ],
            [
                'user_id' => $toolsMan->user_id,
                'action_type' => 'APPROVE_CHECKLIST',
                'description' => sprintf('Tools Man approved Checklist #%d for Booking #%d and dispatched team.', $checklistApproved->checklist_id, $bookingDispatched->booking_id),
                'created_at' => now()->subHours(2),
                'updated_at' => now()->subHours(2),
            ],
        ]);
    }
}
