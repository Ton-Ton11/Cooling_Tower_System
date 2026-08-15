<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CoolingTowerSeeder extends Seeder
{
    public function run(): void
    {
        // Roles
        DB::table('roles')->insert([
            ['role_name' => 'Super Admin'],
            ['role_name' => 'Manager'],
            ['role_name' => 'Admin Assistant'],
            ['role_name' => 'Tools Man'],
            ['role_name' => 'Technician / Head Technician'],
            ['role_name' => 'Customer'],
        ]);

        // Services
        DB::table('services')->insert([
            ['service_name' => 'Cleaning', 'description' => 'Deep cleaning of indoor and outdoor units including filters, coils, and drainage systems.', 'base_price' => 1500.00],
            ['service_name' => 'Installation', 'description' => 'Professional installation of new AC units with complete mounting and testing.', 'base_price' => 5000.00],
            ['service_name' => 'Maintenance', 'description' => 'Preventive maintenance including refrigerant check, electrical inspection, and performance tuning.', 'base_price' => 2500.00],
            ['service_name' => 'Repair', 'description' => 'Diagnostic troubleshooting and repair of defective units. Parts not included.', 'base_price' => 1200.00],
            ['service_name' => 'Check up', 'description' => 'General system inspection and performance assessment with detailed report.', 'base_price' => 800.00],
        ]);

        // Specialties
        DB::table('specialties')->insert([
            ['specialty_name' => 'Installation'],
            ['specialty_name' => 'Repair'],
            ['specialty_name' => 'Maintenance'],
            ['specialty_name' => 'Check up'],
            ['specialty_name' => 'Cleaning'],
        ]);

        // Users - Staff
        DB::table('users')->insert([
            [
                'role_id' => 1, // Super Admin
                'given_name' => 'Roberto',
                'middle_name' => 'Cruz',
                'last_name' => 'Santos',
                'birthdate' => '1985-03-15',
                'sex' => 'Male',
                'address' => '123 Rizal Avenue, Barangay San Nicolas, Makati City',
                'contact_number' => '09171234567',
                'email' => 'roberto.santos@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 2, // Manager
                'given_name' => 'Maria',
                'middle_name' => 'Lopez',
                'last_name' => 'Garcia',
                'birthdate' => '1990-07-22',
                'sex' => 'Female',
                'address' => '456 EDSA, Barangay Poblacion, Mandaluyong City',
                'contact_number' => '09182345678',
                'email' => 'maria.garcia@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 3, // Admin Assistant
                'given_name' => 'Juan',
                'middle_name' => 'Dela Cruz',
                'last_name' => 'Mercado',
                'birthdate' => '1993-11-08',
                'sex' => 'Male',
                'address' => '789 Taft Avenue, Barangay 669, Manila',
                'contact_number' => '09193456789',
                'email' => 'juan.mercado@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 4, // Tools Man
                'given_name' => 'Pedro',
                'middle_name' => 'Santos',
                'last_name' => 'Reyes',
                'birthdate' => '1988-05-30',
                'sex' => 'Male',
                'address' => '321 Quezon Boulevard, Barangay Central, Quezon City',
                'contact_number' => '09204567890',
                'email' => 'pedro.reyes@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 5, // Head Technician
                'given_name' => 'Antonio',
                'middle_name' => 'Villanueva',
                'last_name' => 'Aquino',
                'birthdate' => '1987-02-14',
                'sex' => 'Male',
                'address' => '567 Aurora Boulevard, Barangay Marilag, Quezon City',
                'contact_number' => '09215678901',
                'email' => 'antonio.aquino@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 5, // Technician
                'given_name' => 'Rafael',
                'middle_name' => 'Gonzales',
                'last_name' => 'Torres',
                'birthdate' => '1992-09-18',
                'sex' => 'Male',
                'address' => '890 España Street, Barangay 429, Manila',
                'contact_number' => '09226789012',
                'email' => 'rafael.torres@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 5, // Technician
                'given_name' => 'Miguel',
                'middle_name' => 'Rivera',
                'last_name' => 'Fernandez',
                'birthdate' => '1995-01-25',
                'sex' => 'Male',
                'address' => '432 Sucat Road, Barangay San Antonio, Parañaque City',
                'contact_number' => '09237890123',
                'email' => 'miguel.fernandez@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
        ]);

        // Users - Customers
        $customers = [
            [
                'role_id' => 6,
                'given_name' => 'Sofia',
                'middle_name' => 'Martinez',
                'last_name' => 'Velasco',
                'birthdate' => '1983-06-10',
                'sex' => 'Female',
                'address' => 'Unit 12A, One Rockwell, Rockwell Drive, Makati City',
                'contact_number' => '09175678901',
                'email' => 'sofia.velasco@gmail.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Carlos',
                'middle_name' => 'Ramos',
                'last_name' => 'Lim',
                'birthdate' => '1978-12-03',
                'sex' => 'Male',
                'address' => '45 Scout Lozano Street, Barangay Laging Handa, Quezon City',
                'contact_number' => '09186789012',
                'email' => 'carlos.lim@yahoo.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Angela',
                'middle_name' => null,
                'last_name' => 'Castro',
                'birthdate' => '1991-08-22',
                'sex' => 'Female',
                'address' => '789 Banawe Street, Barangay Manresa, Quezon City',
                'contact_number' => '09197890123',
                'email' => 'angela.castro@gmail.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Francisco',
                'middle_name' => 'Dizon',
                'last_name' => 'Pascual',
                'birthdate' => '1975-04-18',
                'sex' => 'Male',
                'address' => 'Block 5 Lot 12, BF Homes, Parañaque City',
                'contact_number' => '09208901234',
                'email' => 'francisco.pascual@outlook.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Elena',
                'middle_name' => 'Bernardo',
                'last_name' => 'Tolentino',
                'birthdate' => '1989-10-05',
                'sex' => 'Female',
                'address' => '234 Ortigas Avenue, Greenhills, San Juan City',
                'contact_number' => '09219012345',
                'email' => 'elena.tolentino@gmail.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Gabriel',
                'middle_name' => 'Enriquez',
                'last_name' => 'Sy',
                'birthdate' => '1982-01-30',
                'sex' => 'Male',
                'address' => '678 Shaw Boulevard, Barangay Kapitolyo, Pasig City',
                'contact_number' => '09220123456',
                'email' => 'gabriel.sy@corporateservices.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Patricia',
                'middle_name' => 'Ocampo',
                'last_name' => 'Go',
                'birthdate' => '1994-07-14',
                'sex' => 'Female',
                'address' => '15 Jupiter Street, Bel-Air, Makati City',
                'contact_number' => '09231234567',
                'email' => 'patricia.go@gmail.com',
            ],
            [
                'role_id' => 6,
                'given_name' => 'Ramon',
                'middle_name' => null,
                'last_name' => 'Yap',
                'birthdate' => '1970-09-20',
                'sex' => 'Male',
                'address' => '890 Acacia Avenue, Ayala Alabang, Muntinlupa City',
                'contact_number' => '09242345678',
                'email' => 'ramon.yap@industrialcorp.ph',
            ],
        ];

        foreach ($customers as $customer) {
            $customer['password'] = Hash::make('password');
            $customer['email_verified_at'] = now();
            $customer['created_at'] = now();
            DB::table('users')->insert($customer);
        }

        // Technician Details
        DB::table('technician_details')->insert([
            [
                'user_id' => 5, // Antonio - Head Tech
                'specialty_id' => 2, // Repair
                'certificate_expiry' => '2027-06-15',
            ],
            [
                'user_id' => 5,
                'specialty_id' => 1, // Also Installation
                'certificate_expiry' => '2027-06-15',
            ],
            [
                'user_id' => 6, // Rafael
                'specialty_id' => 3, // Maintenance
                'certificate_expiry' => '2026-12-01',
            ],
            [
                'user_id' => 7, // Miguel
                'specialty_id' => 5, // Cleaning
                'certificate_expiry' => '2026-08-20',
            ],
        ]);

        // Customer Unit Details
        DB::table('customer_unit_details')->insert([
            [
                'user_id' => 8, // Sofia Velasco
                'aircon_brand' => 'Daikin',
                'aircon_type' => 'Split',
                'unit_quantity' => 3,
            ],
            [
                'user_id' => 9, // Carlos Lim
                'aircon_brand' => 'Carrier',
                'aircon_type' => 'Window',
                'unit_quantity' => 5,
            ],
            [
                'user_id' => 10, // Angela Castro
                'aircon_brand' => 'Samsung',
                'aircon_type' => 'Split',
                'unit_quantity' => 2,
            ],
            [
                'user_id' => 11, // Francisco Pascual
                'aircon_brand' => 'Panasonic',
                'aircon_type' => 'Cassette',
                'unit_quantity' => 6,
            ],
            [
                'user_id' => 12, // Elena Tolentino
                'aircon_brand' => 'LG',
                'aircon_type' => 'Floor Mounted',
                'unit_quantity' => 2,
            ],
            [
                'user_id' => 13, // Gabriel Sy
                'aircon_brand' => 'Mitsubishi',
                'aircon_type' => 'Ceiling Suspended',
                'unit_quantity' => 10,
            ],
            [
                'user_id' => 14, // Patricia Go
                'aircon_brand' => 'Daikin',
                'aircon_type' => 'Split',
                'unit_quantity' => 4,
            ],
            [
                'user_id' => 15, // Ramon Yap
                'aircon_brand' => 'Trane',
                'aircon_type' => 'Cassette',
                'unit_quantity' => 15,
            ],
        ]);

        // AC Units Inventory
        DB::table('ac_units_inventory')->insert([
            [
                'brand' => 'Daikin',
                'model' => 'FTKM25SVM',
                'serial_number' => 'DAK-2026-0001',
                'horsepower' => 1.0,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R32',
                'supplier' => 'Daikin Philippines Inc.',
                'purchase_price' => 25000.00,
                'selling_price' => 35000.00,
                'purchase_date' => '2026-01-15',
                'warranty_period' => 36,
                'status' => 'Available',
            ],
            [
                'brand' => 'Carrier',
                'model' => '53QPV18-708S',
                'window' => 1.5,
                'ac_type' => 'Window',
                'refrigerant_type' => 'R410A',
                'supplier' => 'Carrier Airconditioning Phils.',
                'purchase_price' => 18000.00,
                'selling_price' => 25000.00,
                'purchase_date' => '2026-02-20',
                'warranty_period' => 24,
                'status' => 'Available',
            ],
            [
                'brand' => 'Samsung',
                'model' => 'AR12TSHZAWK',
                'horsepower' => 1.5,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R32',
                'supplier' => 'Samsung Electronics Phils.',
                'purchase_price' => 22000.00,
                'selling_price' => 30000.00,
                'purchase_date' => '2026-03-10',
                'warranty_period' => 36,
                'status' => 'Reserved',
            ],
            [
                'brand' => 'LG',
                'model' => 'LSN120HSV5',
                'horsepower' => 1.5,
                'ac_type' => 'Floor Mounted',
                'refrigerant_type' => 'R410A',
                'supplier' => 'LG Electronics Philippines',
                'purchase_price' => 35000.00,
                'selling_price' => 48000.00,
                'purchase_date' => '2026-04-05',
                'warranty_period' => 24,
                'status' => 'Available',
            ],
            [
                'brand' => 'Mitsubishi',
                'model' => 'PCA-M60KA',
                'horsepower' => 5.0,
                'ac_type' => 'Ceiling Suspended',
                'refrigerant_type' => 'R410A',
                'supplier' => 'Mitsubishi Electric Phils.',
                'purchase_price' => 65000.00,
                'selling_price' => 85000.00,
                'purchase_date' => '2026-05-20',
                'warranty_period' => 36,
                'status' => 'Available',
            ],
            [
                'brand' => 'Panasonic',
                'model' => 'CS-S30TKF',
                'horsepower' => 3.0,
                'ac_type' => 'Cassette',
                'refrigerant_type' => 'R32',
                'supplier' => 'Panasonic Philippines',
                'purchase_price' => 45000.00,
                'selling_price' => 60000.00,
                'purchase_date' => '2026-06-01',
                'warranty_period' => 36,
                'status' => 'Installed',
            ],
        ]);

        // Inventory Items
        DB::table('inventory_items')->insert([
            [
                'item_name' => 'R410A Refrigerant Tank (11.3 kg)',
                'item_type' => 'Material',
                'quantity_on_hand' => 8,
                'reorder_level' => 5,
                'unit' => 'tank',
            ],
            [
                'item_name' => 'R32 Refrigerant Tank (10 kg)',
                'item_type' => 'Material',
                'quantity_on_hand' => 6,
                'reorder_level' => 5,
                'unit' => 'tank',
            ],
            [
                'item_name' => 'Air Filter (Universal 12x12)',
                'item_type' => 'Spare Part',
                'quantity_on_hand' => 50,
                'reorder_level' => 20,
                'unit' => 'piece',
            ],
            [
                'item_name' => 'Capacitor 30μF',
                'item_type' => 'Spare Part',
                'quantity_on_hand' => 25,
                'reorder_level' => 10,
                'unit' => 'piece',
            ],
            [
                'item_name' => 'Manifold Gauge Set',
                'item_type' => 'Tool',
                'quantity_on_hand' => 4,
                'reorder_level' => 3,
                'unit' => 'set',
            ],
            [
                'item_name' => 'Vacuum Pump 4 CFM',
                'item_type' => 'Tool',
                'quantity_on_hand' => 3,
                'reorder_level' => 2,
                'unit' => 'unit',
            ],
            [
                'item_name' => 'Copper Tube 1/4 inch (per meter)',
                'item_type' => 'Material',
                'quantity_on_hand' => 30,
                'reorder_level' => 15,
                'unit' => 'meter',
            ],
            [
                'item_name' => 'Copper Tube 3/8 inch (per meter)',
                'item_type' => 'Material',
                'quantity_on_hand' => 25,
                'reorder_level' => 15,
                'unit' => 'meter',
            ],
            [
                'item_name' => 'Drain Pan Tablet',
                'item_type' => 'Material',
                'quantity_on_hand' => 100,
                'reorder_level' => 50,
                'unit' => 'piece',
            ],
            [
                'item_name' => 'Fin Comb Set',
                'item_type' => 'Tool',
                'quantity_on_hand' => 6,
                'reorder_level' => 4,
                'unit' => 'set',
            ],
        ]);

        // Bookings
        DB::table('bookings')->insert([
            [
                'client_id' => 8, // Sofia Velasco
                'service_id' => 1, // Cleaning
                'assigned_tech_id' => 7, // Miguel
                'scheduled_date' => '2026-08-05 09:00:00',
                'booking_status' => 'Approved',
                'created_at' => '2026-07-28 10:30:00',
            ],
            [
                'client_id' => 9, // Carlos Lim
                'service_id' => 4, // Repair
                'assigned_tech_id' => 5, // Antonio
                'scheduled_date' => '2026-08-05 14:00:00',
                'booking_status' => 'Approved',
                'created_at' => '2026-07-29 11:00:00',
            ],
            [
                'client_id' => 10, // Angela Castro
                'service_id' => 3, // Maintenance
                'assigned_tech_id' => 6, // Rafael
                'scheduled_date' => '2026-08-06 10:00:00',
                'booking_status' => 'Dispatched',
                'created_at' => '2026-07-30 08:15:00',
            ],
            [
                'client_id' => 11, // Francisco Pascual
                'service_id' => 1, // Cleaning
                'assigned_tech_id' => 7, // Miguel
                'scheduled_date' => '2026-08-07 08:00:00',
                'booking_status' => 'Pending',
                'created_at' => '2026-07-30 14:20:00',
            ],
            [
                'client_id' => 12, // Elena Tolentino
                'service_id' => 2, // Installation
                'assigned_tech_id' => 5, // Antonio
                'scheduled_date' => '2026-08-08 09:00:00',
                'booking_status' => 'Pending',
                'created_at' => '2026-07-31 09:00:00',
            ],
            [
                'client_id' => 13, // Gabriel Sy
                'service_id' => 3, // Maintenance
                'assigned_tech_id' => 6, // Rafael
                'scheduled_date' => '2026-07-28 13:00:00',
                'booking_status' => 'Completed',
                'created_at' => '2026-07-20 16:00:00',
            ],
            [
                'client_id' => 14, // Patricia Go
                'service_id' => 5, // Check up
                'assigned_tech_id' => null,
                'scheduled_date' => '2026-08-10 11:00:00',
                'booking_status' => 'Pending',
                'created_at' => '2026-08-01 10:45:00',
            ],
            [
                'client_id' => 15, // Ramon Yap
                'service_id' => 4, // Repair
                'assigned_tech_id' => 5, // Antonio
                'scheduled_date' => '2026-07-25 10:00:00',
                'booking_status' => 'Completed',
                'created_at' => '2026-07-18 09:30:00',
            ],
        ]);

        // Tool Checkouts
        DB::table('tool_checkouts')->insert([
            [
                'item_id' => 5, // Manifold Gauge Set
                'technician_id' => 5, // Antonio
                'checkout_date' => '2026-08-01 08:00:00',
                'return_date' => null,
                'status' => 'Checked Out',
            ],
            [
                'item_id' => 6, // Vacuum Pump
                'technician_id' => 6, // Rafael
                'checkout_date' => '2026-08-02 09:00:00',
                'return_date' => '2026-08-02 17:00:00',
                'status' => 'Returned',
            ],
            [
                'item_id' => 10, // Fin Comb Set
                'technician_id' => 7, // Miguel
                'checkout_date' => '2026-08-03 07:30:00',
                'return_date' => null,
                'status' => 'Checked Out',
            ],
        ]);

        // Booking Materials
        DB::table('booking_materials')->insert([
            [
                'booking_id' => 6, // Gabriel's completed maintenance
                'item_id' => 3, // Air Filter
                'quantity_used' => 2,
                'logged_at' => '2026-07-28 15:00:00',
            ],
            [
                'booking_id' => 6, // Gabriel's completed maintenance
                'item_id' => 9, // Drain Pan Tablet
                'quantity_used' => 3,
                'logged_at' => '2026-07-28 15:00:00',
            ],
            [
                'booking_id' => 8, // Ramon's completed repair
                'item_id' => 4, // Capacitor
                'quantity_used' => 1,
                'logged_at' => '2026-07-25 12:30:00',
            ],
            [
                'booking_id' => 8, // Ramon's completed repair
                'item_id' => 2, // R32 Refrigerant
                'quantity_used' => 1,
                'logged_at' => '2026-07-25 12:30:00',
            ],
        ]);

        // Payment
        DB::table('payment')->insert([
            [
                'booking_id' => 6, // Gabriel's completed maintenance
                'booking_price' => 2500.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 500.00,
                'amount_paid' => 3000.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_date' => '2026-07-28 15:30:00',
            ],
            [
                'booking_id' => 8, // Ramon's completed repair
                'booking_price' => 1200.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 2800.00,
                'amount_paid' => 4000.00,
                'payment_status' => 'Paid',
                'payment_method' => 'Cash',
                'payment_date' => '2026-07-25 13:00:00',
            ],
        ]);

        // Schedule
        DB::table('schedule')->insert([
            [
                'technician_id' => 7, // Miguel
                'scheduled_booking_id' => 1, // Sofia cleaning
                'start_time' => '2026-08-05 09:00:00',
                'end_time' => '2026-08-05 12:00:00',
            ],
            [
                'technician_id' => 5, // Antonio
                'scheduled_booking_id' => 2, // Carlos repair
                'start_time' => '2026-08-05 14:00:00',
                'end_time' => '2026-08-05 17:00:00',
            ],
            [
                'technician_id' => 6, // Rafael
                'scheduled_booking_id' => 3, // Angela maintenance
                'start_time' => '2026-08-06 10:00:00',
                'end_time' => '2026-08-06 13:00:00',
            ],
            [
                'technician_id' => 7, // Miguel
                'scheduled_booking_id' => 4, // Francisco cleaning
                'start_time' => '2026-08-07 08:00:00',
                'end_time' => '2026-08-07 12:00:00',
            ],
        ]);

        // Customer Feedback
        DB::table('customer_feedback_and_ratings')->insert([
            [
                'booking_id' => 6, // Gabriel's maintenance
                'rating' => 5,
                'feedback' => 'Excellent service! Rafael was very professional and thorough with the maintenance. Our AC units are running perfectly now.',
                'submitted_at' => '2026-07-29 09:00:00',
            ],
            [
                'booking_id' => 8, // Ramon's repair
                'rating' => 4,
                'feedback' => 'Antonio diagnosed the problem quickly and had the unit repaired within hours. Would appreciate a more detailed explanation of the issue though.',
                'submitted_at' => '2026-07-26 10:00:00',
            ],
        ]);

        // Customer Complaints
        DB::table('customer_complaints')->insert([
            [
                'customer_id' => 11, // Francisco Pascual
                'booking_id' => 4,
                'complaint_details' => 'Requested morning schedule but booking confirmation shows afternoon. Please confirm actual time.',
                'complaint_date' => '2026-07-31 08:00:00',
                'status' => 'Pending',
            ],
        ]);

        // Announcements
        DB::table('announcements')->insert([
            [
                'created_by' => 2, // Maria Garcia (Manager)
                'title' => 'Team Meeting on August 5',
                'message' => 'Monthly team meeting on August 5 at 4:00 PM. All technicians please prepare your work reports for July.',
                'target_role_id' => 5, // Technicians only
                'created_at' => '2026-07-30 10:00:00',
            ],
            [
                'created_by' => 1, // Roberto Santos (Super Admin)
                'title' => 'New Service Packages Available',
                'message' => 'We are now offering annual maintenance packages at discounted rates. Please inform customers during your visits.',
                'target_role_id' => null, // Everyone
                'created_at' => '2026-07-28 14:00:00',
            ],
        ]);

        // Activity Logs
        DB::table('activity_logs')->insert([
            [
                'user_id' => 1, // Roberto
                'action_type' => 'Login',
                'description' => 'Super Admin logged into the system',
                'created_at' => '2026-08-03 08:00:00',
            ],
            [
                'user_id' => 2, // Maria
                'action_type' => 'Create Announcement',
                'description' => 'Created announcement: Team Meeting on August 5',
                'created_at' => '2026-07-30 10:00:00',
            ],
            [
                'user_id' => 3, // Juan
                'action_type' => 'Update Booking',
                'description' => 'Assigned technician Miguel Fernandez to booking #1',
                'created_at' => '2026-07-29 11:00:00',
            ],
            [
                'user_id' => 4, // Pedro
                'action_type' => 'Checkout Tool',
                'description' => 'Checked out Vacuum Pump 4 CFM to Rafael Torres',
                'created_at' => '2026-08-02 09:00:00',
            ],
        ]);
    }
}