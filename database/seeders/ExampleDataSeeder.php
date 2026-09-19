<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ExampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds with realistic real-life example data.
     */
    public function run(): void
    {
        // 1. Additional Technicians & Customer Users
        $additionalUsers = [
            // Additional Technicians (Role 5)
            [
                'role_id' => 5,
                'given_name' => 'Danilo',
                'middle_name' => 'Bautista',
                'last_name' => 'Ramos',
                'birthdate' => '1987-04-12',
                'sex' => 'Male',
                'address' => '514 Shaw Boulevard, Barangay Addition Hills, Mandaluyong City',
                'contact_number' => '09285551234',
                'email' => 'danilo.ramos@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(8),
                'updated_at' => Carbon::now()->subMonths(8),
            ],
            [
                'role_id' => 5,
                'given_name' => 'Arnel',
                'middle_name' => 'Villanueva',
                'last_name' => 'Castro',
                'birthdate' => '1995-10-25',
                'sex' => 'Male',
                'address' => '230 Aurora Boulevard, Barangay Kaunlaran, Quezon City',
                'contact_number' => '09178889900',
                'email' => 'arnel.castro@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(6),
                'updated_at' => Carbon::now()->subMonths(6),
            ],
            // Customer Accounts (Role 6)
            [
                'role_id' => 6,
                'given_name' => 'Eduardo',
                'middle_name' => 'Cruz',
                'last_name' => 'Mendoza',
                'birthdate' => '1980-02-14',
                'sex' => 'Male',
                'address' => 'Unit 14B High Street South Tower, Bonifacio Global City, Taguig',
                'contact_number' => '09175554321',
                'email' => 'eduardo.mendoza@gmail.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(5),
                'updated_at' => Carbon::now()->subMonths(5),
            ],
            [
                'role_id' => 6,
                'given_name' => 'Christine Joy',
                'middle_name' => 'Santos',
                'last_name' => 'Reyes',
                'birthdate' => '1991-08-30',
                'sex' => 'Female',
                'address' => 'Lot 8 Block 12, Acacia Avenue, Ayala Alabang Village, Muntinlupa City',
                'contact_number' => '09187776543',
                'email' => 'cj.reyes@gmail.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(4),
                'updated_at' => Carbon::now()->subMonths(4),
            ],
            [
                'role_id' => 6,
                'given_name' => 'Benjamin',
                'middle_name' => 'Tan',
                'last_name' => 'Sy',
                'birthdate' => '1976-11-19',
                'sex' => 'Male',
                'address' => '18th Floor Cyberpark Tower 1, General Aguinaldo Ave, Cubao, Quezon City',
                'contact_number' => '09224443322',
                'email' => 'benjamin.sy@nexustech.ph',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(4),
                'updated_at' => Carbon::now()->subMonths(4),
            ],
            [
                'role_id' => 6,
                'given_name' => 'Patricia',
                'middle_name' => 'Lim',
                'last_name' => 'Alcantara',
                'birthdate' => '1984-06-05',
                'sex' => 'Female',
                'address' => 'Suite 302 Medical Plaza Ortigas, San Miguel Ave, Pasig City',
                'contact_number' => '09192223344',
                'email' => 'dr.patricia.lim@gmail.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(3),
                'updated_at' => Carbon::now()->subMonths(3),
            ],
            [
                'role_id' => 6,
                'given_name' => 'Antonio',
                'middle_name' => 'Gomez',
                'last_name' => 'De Jesus',
                'birthdate' => '1972-09-10',
                'sex' => 'Male',
                'address' => '45 Jupiter Street, Bel-Air Village, Makati City',
                'contact_number' => '09173338877',
                'email' => 'antonio.dejesus@outlook.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(2),
                'updated_at' => Carbon::now()->subMonths(2),
            ],
            [
                'role_id' => 6,
                'given_name' => 'Grace',
                'middle_name' => 'Perez',
                'last_name' => 'Villanueva',
                'birthdate' => '1996-12-03',
                'sex' => 'Female',
                'address' => 'Unit 2205 Green Residences, Taft Avenue, Malate, Manila',
                'contact_number' => '09208881122',
                'email' => 'grace.villanueva@yahoo.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(1),
                'updated_at' => Carbon::now()->subMonths(1),
            ],
        ];

        foreach ($additionalUsers as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                $user
            );
        }

        // Fetch helper user IDs
        $techRafael = DB::table('users')->where('email', 'rafael.torres@coolingtower.com')->value('user_id');
        $techDanilo = DB::table('users')->where('email', 'danilo.ramos@coolingtower.com')->value('user_id');
        $techArnel = DB::table('users')->where('email', 'arnel.castro@coolingtower.com')->value('user_id');
        $adminUser = DB::table('users')->where('email', 'super.admin@coolingtower.com')->value('user_id');
        $managerUser = DB::table('users')->where('email', 'maria.garcia@coolingtower.com')->value('user_id');

        $clientEduardo = DB::table('users')->where('email', 'eduardo.mendoza@gmail.com')->value('user_id');
        $clientChristine = DB::table('users')->where('email', 'cj.reyes@gmail.com')->value('user_id');
        $clientBenjamin = DB::table('users')->where('email', 'benjamin.sy@nexustech.ph')->value('user_id');
        $clientPatricia = DB::table('users')->where('email', 'dr.patricia.lim@gmail.com')->value('user_id');
        $clientAntonio = DB::table('users')->where('email', 'antonio.dejesus@outlook.com')->value('user_id');
        $clientGrace = DB::table('users')->where('email', 'grace.villanueva@yahoo.com')->value('user_id');

        // 2. Customer Unit Details
        $customerUnits = [
            [
                'user_id' => $clientEduardo,
                'aircon_brand' => 'Daikin Inverter',
                'aircon_type' => 'Split Type',
                'unit_quantity' => 3,
            ],
            [
                'user_id' => $clientChristine,
                'aircon_brand' => 'Panasonic Aero Series',
                'aircon_type' => 'Split Type',
                'unit_quantity' => 4,
            ],
            [
                'user_id' => $clientBenjamin,
                'aircon_brand' => 'Carrier Commercial',
                'aircon_type' => 'Cassette Type',
                'unit_quantity' => 8,
            ],
            [
                'user_id' => $clientPatricia,
                'aircon_brand' => 'Mitsubishi Heavy Ind.',
                'aircon_type' => 'Floor Mounted',
                'unit_quantity' => 2,
            ],
            [
                'user_id' => $clientAntonio,
                'aircon_brand' => 'York Inverter',
                'aircon_type' => 'Ceiling Suspended',
                'unit_quantity' => 5,
            ],
            [
                'user_id' => $clientGrace,
                'aircon_brand' => 'Carrier Optima',
                'aircon_type' => 'Window Type',
                'unit_quantity' => 1,
            ],
        ];

        foreach ($customerUnits as $cu) {
            if ($cu['user_id']) {
                DB::table('customer_unit_details')->updateOrInsert(
                    ['user_id' => $cu['user_id']],
                    $cu
                );
            }
        }

        // 3. Specialties
        $specialties = [
            ['specialty_id' => 1, 'specialty_name' => 'Installation & Commissioning'],
            ['specialty_id' => 2, 'specialty_name' => 'Troubleshooting & PCB Repair'],
            ['specialty_id' => 3, 'specialty_name' => 'Preventive Maintenance'],
            ['specialty_id' => 4, 'specialty_name' => 'Chemical Deep Cleaning'],
            ['specialty_id' => 5, 'specialty_name' => 'Refrigerant System Leak Test & Recharging'],
            ['specialty_id' => 6, 'specialty_name' => 'Ducting & Cooling Tower Airflow'],
        ];

        foreach ($specialties as $sp) {
            DB::table('specialties')->updateOrInsert(
                ['specialty_id' => $sp['specialty_id']],
                $sp
            );
        }

        // 4. Technician Details & Specialties
        $techs = [
            ['user_id' => $techRafael, 'certificate_expiry' => '2027-12-31', 'specialties' => [1, 2, 3, 5]],
            ['user_id' => $techDanilo, 'certificate_expiry' => '2028-06-30', 'specialties' => [1, 3, 4, 6]],
            ['user_id' => $techArnel, 'certificate_expiry' => '2027-08-15', 'specialties' => [2, 3, 4, 5]],
        ];

        foreach ($techs as $t) {
            if ($t['user_id']) {
                DB::table('technician_details')->updateOrInsert(
                    ['user_id' => $t['user_id']],
                    ['certificate_expiry' => $t['certificate_expiry']]
                );

                foreach ($t['specialties'] as $specId) {
                    DB::table('technician_specialty')->updateOrInsert(
                        ['user_id' => $t['user_id'], 'specialty_id' => $specId]
                    );
                }
            }
        }

        // 5. Services
        $services = [
            [
                'service_id' => 1,
                'service_name' => 'Basic Cleaning & Filter Wash',
                'description' => 'Comprehensive inspection, front cover wash, air filter sanitation, and drainage pipe flushing.',
                'base_price' => 750.00,
            ],
            [
                'service_id' => 2,
                'service_name' => 'Chemical Deep Cleaning & Hydro Wash',
                'description' => 'Dismantling of indoor blower, chemical coil foaming, high-pressure water wash, and condenser fin restoration.',
                'base_price' => 1800.00,
            ],
            [
                'service_id' => 3,
                'service_name' => 'Comprehensive Preventive Maintenance',
                'description' => 'Electrical voltage & current check, operating pressure check, bearing lubrication, and full system tuning.',
                'base_price' => 2500.00,
            ],
            [
                'service_id' => 4,
                'service_name' => 'Diagnostic Inspection & Troubleshooting',
                'description' => 'System error code scanning, PCB relay testing, thermistor check, and comprehensive fault report.',
                'base_price' => 950.00,
            ],
            [
                'service_id' => 5,
                'service_name' => 'Freon Recharging & Nitrogen Leak Test',
                'description' => 'Nitrogen pressure testing, vacuuming to 500 microns, and complete refrigerant top-up (R32 / R410A / R22).',
                'base_price' => 2200.00,
            ],
            [
                'service_id' => 6,
                'service_name' => 'Split-Type AC Full Installation',
                'description' => 'Up to 10ft copper piping, electrical wiring, bracket mounting, vacuuming, and complete performance testing.',
                'base_price' => 4500.00,
            ],
            [
                'service_id' => 7,
                'service_name' => 'Commercial Cassette / Ceiling Unit Installation',
                'description' => 'Suspension rod mounting, ducting connection, condensate pump setup, and 3-phase electrical integration.',
                'base_price' => 7500.00,
            ],
            [
                'service_id' => 8,
                'service_name' => 'Capacitor & PCB Board Replacement Repair',
                'description' => 'Replacement of burnt starting capacitors, inverter control boards, and circuit wiring reconnection.',
                'base_price' => 1600.00,
            ],
        ];

        foreach ($services as $srv) {
            DB::table('services')->updateOrInsert(
                ['service_id' => $srv['service_id']],
                $srv
            );
        }

        // 6. Inventory Items (Tools, Materials, Spare Parts)
        $inventoryItems = [
            // Tools (Power & Hand)
            [
                'item_name' => 'Robinair 2-Stage Vacuum Pump 5 CFM',
                'item_type' => 'Tool',
                'inventory_mode' => 'worker',
                'tool_subtype' => 'power',
                'compatible_brands' => 'All HVAC Systems',
                'serial_number' => 'ROB-VP5-8812',
                'quantity_on_hand' => 4,
                'initial_stock' => 5,
                'reorder_level' => 2,
                'unit' => 'unit',
                'capital' => 14500.00,
                'profit' => 0.00,
                'selling_price' => null,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Makita Cordless Pressure Washer 18V',
                'item_type' => 'Tool',
                'inventory_mode' => 'worker',
                'tool_subtype' => 'power',
                'compatible_brands' => 'All AC Units',
                'serial_number' => 'MKT-PW18-4419',
                'quantity_on_hand' => 3,
                'initial_stock' => 4,
                'reorder_level' => 1,
                'unit' => 'unit',
                'capital' => 11200.00,
                'profit' => 0.00,
                'selling_price' => null,
                'supplier_name' => 'Makita Industrial Makati',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Fluke 323 True-RMS AC Clamp Meter',
                'item_type' => 'Tool',
                'inventory_mode' => 'worker',
                'tool_subtype' => 'power',
                'compatible_brands' => 'Electrical / Inverter Systems',
                'serial_number' => 'FLK-CLM-9021',
                'quantity_on_hand' => 5,
                'initial_stock' => 5,
                'reorder_level' => 2,
                'unit' => 'unit',
                'capital' => 8500.00,
                'profit' => 0.00,
                'selling_price' => null,
                'supplier_name' => 'Fluke Instruments PH',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Mastercool Digital 4-Way Manifold Gauge Set',
                'item_type' => 'Tool',
                'inventory_mode' => 'worker',
                'tool_subtype' => 'hand',
                'compatible_brands' => 'R32, R410A, R22, R134a',
                'serial_number' => 'MC-DMG-3104',
                'quantity_on_hand' => 4,
                'initial_stock' => 4,
                'reorder_level' => 2,
                'unit' => 'set',
                'capital' => 6800.00,
                'profit' => 0.00,
                'selling_price' => null,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Imperial 45-Degree Flaring and Swaging Kit',
                'item_type' => 'Tool',
                'inventory_mode' => 'worker',
                'tool_subtype' => 'hand',
                'compatible_brands' => 'Copper Tubing 1/4" to 3/4"',
                'serial_number' => 'IMP-FSK-1122',
                'quantity_on_hand' => 6,
                'initial_stock' => 6,
                'reorder_level' => 2,
                'unit' => 'kit',
                'capital' => 3200.00,
                'profit' => 0.00,
                'selling_price' => null,
                'supplier_name' => 'PhilMetals Supply',
                'status' => 'Available',
            ],
            // Materials (Consumables for Sale or Service)
            [
                'item_name' => 'Refrigerant R32 Cylinder (9.5 kg)',
                'item_type' => 'Material',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Daikin, Panasonic, Gree, Carrier, Samsung',
                'serial_number' => null,
                'quantity_on_hand' => 16,
                'initial_stock' => 25,
                'reorder_level' => 5,
                'unit' => 'cylinder',
                'capital' => 4200.00,
                'profit' => 1300.00,
                'selling_price' => 5500.00,
                'supplier_name' => 'Total Cool Gas Corp',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Refrigerant R410A Cylinder (11.3 kg)',
                'item_type' => 'Material',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Carrier, York, Mitsubishi, LG, Aux',
                'serial_number' => null,
                'quantity_on_hand' => 12,
                'initial_stock' => 20,
                'reorder_level' => 4,
                'unit' => 'cylinder',
                'capital' => 3800.00,
                'profit' => 1200.00,
                'selling_price' => 5000.00,
                'supplier_name' => 'Total Cool Gas Corp',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Copper Pipe Coil 1/4" x 0.028" (15 Meters)',
                'item_type' => 'Material',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Universal Split Type',
                'serial_number' => null,
                'quantity_on_hand' => 24,
                'initial_stock' => 30,
                'reorder_level' => 6,
                'unit' => 'roll',
                'capital' => 1450.00,
                'profit' => 450.00,
                'selling_price' => 1900.00,
                'supplier_name' => 'PhilMetals Supply',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Copper Pipe Coil 3/8" x 0.028" (15 Meters)',
                'item_type' => 'Material',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Universal Split Type',
                'serial_number' => null,
                'quantity_on_hand' => 18,
                'initial_stock' => 25,
                'reorder_level' => 5,
                'unit' => 'roll',
                'capital' => 2100.00,
                'profit' => 600.00,
                'selling_price' => 2700.00,
                'supplier_name' => 'PhilMetals Supply',
                'status' => 'Available',
            ],
            [
                'item_name' => 'SuperKleen Alkaline AC Coil Chemical Cleaner (1 Gallon)',
                'item_type' => 'Material',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Aluminum Evaporator & Condenser Coils',
                'serial_number' => null,
                'quantity_on_hand' => 35,
                'initial_stock' => 50,
                'reorder_level' => 10,
                'unit' => 'gallon',
                'capital' => 650.00,
                'profit' => 250.00,
                'selling_price' => 900.00,
                'supplier_name' => 'ChemKleen Industrial',
                'status' => 'Available',
            ],
            // Spare Parts
            [
                'item_name' => 'Dual Run Capacitor 35+5 uF 450VAC Round',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Carrier, Daikin, Panasonic, York, Gree',
                'serial_number' => null,
                'quantity_on_hand' => 28,
                'initial_stock' => 40,
                'reorder_level' => 8,
                'unit' => 'pcs',
                'capital' => 350.00,
                'profit' => 300.00,
                'selling_price' => 650.00,
                'supplier_name' => 'Prime Electrics Supply',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Universal Inverter Indoor & Outdoor Control PCB Kit',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Carrier, Aux, Gree, Midea, TCL, Kolin',
                'serial_number' => 'PCB-UNV-7718',
                'quantity_on_hand' => 9,
                'initial_stock' => 15,
                'reorder_level' => 3,
                'unit' => 'set',
                'capital' => 2800.00,
                'profit' => 1400.00,
                'selling_price' => 4200.00,
                'supplier_name' => 'Apex HVAC Parts Trading',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Universal Intelligent LCD AC Remote Control',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'All Brands (1000 in 1 Code Base)',
                'serial_number' => null,
                'quantity_on_hand' => 45,
                'initial_stock' => 60,
                'reorder_level' => 10,
                'unit' => 'pcs',
                'capital' => 220.00,
                'profit' => 230.00,
                'selling_price' => 450.00,
                'supplier_name' => 'Prime Electrics Supply',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Electronic Expansion Valve (EEV) 2.5HP Module',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Daikin, Mitsubishi, Panasonic',
                'serial_number' => 'EEV-25-3391',
                'quantity_on_hand' => 7,
                'initial_stock' => 10,
                'reorder_level' => 2,
                'unit' => 'pcs',
                'capital' => 1650.00,
                'profit' => 850.00,
                'selling_price' => 2500.00,
                'supplier_name' => 'Apex HVAC Parts Trading',
                'status' => 'Available',
            ],
            [
                'item_name' => 'Heavy Duty 2-Pole Magnetic Contactor 25A 220V',
                'item_type' => 'Spare Part',
                'inventory_mode' => 'sale',
                'tool_subtype' => null,
                'compatible_brands' => 'Carrier, York, Trane, Mitsubishi',
                'serial_number' => null,
                'quantity_on_hand' => 20,
                'initial_stock' => 25,
                'reorder_level' => 5,
                'unit' => 'pcs',
                'capital' => 480.00,
                'profit' => 370.00,
                'selling_price' => 850.00,
                'supplier_name' => 'Prime Electrics Supply',
                'status' => 'Available',
            ],
        ];

        foreach ($inventoryItems as $item) {
            DB::table('inventory_items')->updateOrInsert(
                ['item_name' => $item['item_name']],
                $item
            );
        }

        // 7. AC Units Inventory
        $acUnits = [
            [
                'brand' => 'Daikin',
                'model' => 'FTKQ35TVM D-Smart Queen Inverter',
                'serial_number' => 'DK-INV-2026-99201',
                'horsepower' => 1.5,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R32',
                'supplier' => 'Daikin Philippines Logistics Inc.',
                'purchase_price' => 28500.00,
                'selling_price' => 34999.00,
                'purchase_date' => '2026-06-15',
                'warranty_period' => 5, // 5 years compressor
                'status' => 'Available',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subMonths(2),
                'updated_at' => Carbon::now()->subMonths(2),
            ],
            [
                'brand' => 'Carrier',
                'model' => 'FP-53CSN018 Aura Inverter High Wall',
                'serial_number' => 'CR-AUR-2026-77312',
                'horsepower' => 2.0,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R410A',
                'supplier' => 'Concepcion-Carrier Air Conditioning Co.',
                'purchase_price' => 36000.00,
                'selling_price' => 43500.00,
                'purchase_date' => '2026-07-01',
                'warranty_period' => 5,
                'status' => 'Available',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subMonth(),
                'updated_at' => Carbon::now()->subMonth(),
            ],
            [
                'brand' => 'Panasonic',
                'model' => 'CS-PU9WKQ Aero Series Premium Inverter',
                'serial_number' => 'PN-AER-2026-11029',
                'horsepower' => 1.0,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R32',
                'supplier' => 'Panasonic Manufacturing PH',
                'purchase_price' => 22000.00,
                'selling_price' => 27500.00,
                'purchase_date' => '2026-07-10',
                'warranty_period' => 5,
                'status' => 'Reserved',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subWeeks(3),
                'updated_at' => Carbon::now()->subWeeks(3),
            ],
            [
                'brand' => 'Mitsubishi Heavy Ind.',
                'model' => 'FDF71ZVD Inverter Floor Standing Package Unit',
                'serial_number' => 'MH-FLR-2026-66412',
                'horsepower' => 3.0,
                'ac_type' => 'Floor Mounted',
                'refrigerant_type' => 'R410A',
                'supplier' => 'Mitsubishi Heavy Industries PH',
                'purchase_price' => 62000.00,
                'selling_price' => 74900.00,
                'purchase_date' => '2026-05-20',
                'warranty_period' => 3,
                'status' => 'Installed',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subMonths(3),
                'updated_at' => Carbon::now()->subMonths(3),
            ],
            [
                'brand' => 'Daikin',
                'model' => 'FCFC100D SkyAir Non-Inverter Round Flow Cassette',
                'serial_number' => 'DK-CAS-2026-55019',
                'horsepower' => 4.0,
                'ac_type' => 'Cassette',
                'refrigerant_type' => 'R32',
                'supplier' => 'Daikin Philippines Logistics Inc.',
                'purchase_price' => 84000.00,
                'selling_price' => 99500.00,
                'purchase_date' => '2026-06-25',
                'warranty_period' => 3,
                'status' => 'Available',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subMonths(2),
                'updated_at' => Carbon::now()->subMonths(2),
            ],
            [
                'brand' => 'York',
                'model' => 'YC-50CS Commercial Heavy Duty Inverter Suspended',
                'serial_number' => 'YK-CS-2026-33821',
                'horsepower' => 5.0,
                'ac_type' => 'Ceiling Suspended',
                'refrigerant_type' => 'R410A',
                'supplier' => 'Johnson Controls PH',
                'purchase_price' => 91000.00,
                'selling_price' => 108000.00,
                'purchase_date' => '2026-08-01',
                'warranty_period' => 2,
                'status' => 'Order Base',
                'expected_arrival' => '2026-09-15',
                'created_at' => Carbon::now()->subDays(10),
                'updated_at' => Carbon::now()->subDays(10),
            ],
            [
                'brand' => 'Gree',
                'model' => 'GJC12AE Lomo Prime Inverter Window Unit',
                'serial_number' => 'GR-WIN-2026-44012',
                'horsepower' => 1.5,
                'ac_type' => 'Window',
                'refrigerant_type' => 'R32',
                'supplier' => 'Gree Air Conditioning PH',
                'purchase_price' => 19500.00,
                'selling_price' => 24200.00,
                'purchase_date' => '2026-07-28',
                'warranty_period' => 5,
                'status' => 'Available',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subDays(15),
                'updated_at' => Carbon::now()->subDays(15),
            ],
            [
                'brand' => 'Samsung',
                'model' => 'AR24TYEAAWKN WindFree Premium Inverter',
                'serial_number' => 'SM-WNF-2026-88219',
                'horsepower' => 2.5,
                'ac_type' => 'Split',
                'refrigerant_type' => 'R32',
                'supplier' => 'Samsung Electronics Philippines',
                'purchase_price' => 44000.00,
                'selling_price' => 52900.00,
                'purchase_date' => '2026-05-10',
                'warranty_period' => 10,
                'status' => 'Sold',
                'expected_arrival' => null,
                'created_at' => Carbon::now()->subMonths(3),
                'updated_at' => Carbon::now()->subMonths(1),
            ],
        ];

        foreach ($acUnits as $ac) {
            DB::table('ac_units_inventory')->updateOrInsert(
                ['serial_number' => $ac['serial_number']],
                $ac
            );
        }

        // 8. Bookings
        $bookings = [
            [
                'booking_id' => 1,
                'client_id' => $clientEduardo,
                'service_id' => 2, // Chemical Deep Cleaning
                'assigned_tech_id' => $techRafael,
                'scheduled_date' => Carbon::now()->subDays(12)->setTime(9, 30),
                'booking_status' => 'Completed',
                'created_at' => Carbon::now()->subDays(15),
            ],
            [
                'booking_id' => 2,
                'client_id' => $clientChristine,
                'service_id' => 6, // Split-Type AC Full Installation
                'assigned_tech_id' => $techDanilo,
                'scheduled_date' => Carbon::now()->subDays(8)->setTime(13, 0),
                'booking_status' => 'Completed',
                'created_at' => Carbon::now()->subDays(10),
            ],
            [
                'booking_id' => 3,
                'client_id' => $clientBenjamin,
                'service_id' => 3, // Comprehensive Preventive Maintenance
                'assigned_tech_id' => $techArnel,
                'scheduled_date' => Carbon::now()->subDays(4)->setTime(10, 0),
                'booking_status' => 'Completed',
                'created_at' => Carbon::now()->subDays(7),
            ],
            [
                'booking_id' => 4,
                'client_id' => $clientPatricia,
                'service_id' => 8, // Capacitor & PCB Board Replacement Repair
                'assigned_tech_id' => $techRafael,
                'scheduled_date' => Carbon::now()->subDays(1)->setTime(14, 0),
                'booking_status' => 'Completed',
                'created_at' => Carbon::now()->subDays(3),
            ],
            [
                'booking_id' => 5,
                'client_id' => $clientAntonio,
                'service_id' => 5, // Freon Recharging & Leak Test
                'assigned_tech_id' => $techDanilo,
                'scheduled_date' => Carbon::now()->addDays(1)->setTime(9, 0),
                'booking_status' => 'In-Progress',
                'created_at' => Carbon::now()->subDays(2),
            ],
            [
                'booking_id' => 6,
                'client_id' => $clientGrace,
                'service_id' => 1, // Basic Cleaning & Filter Wash
                'assigned_tech_id' => $techArnel,
                'scheduled_date' => Carbon::now()->addDays(2)->setTime(11, 0),
                'booking_status' => 'Approved',
                'created_at' => Carbon::now()->subDay(),
            ],
            [
                'booking_id' => 7,
                'client_id' => $clientEduardo,
                'service_id' => 3, // Preventive Maintenance
                'assigned_tech_id' => null,
                'scheduled_date' => Carbon::now()->addDays(4)->setTime(15, 0),
                'booking_status' => 'Pending',
                'created_at' => Carbon::now(),
            ],
        ];

        foreach ($bookings as $bk) {
            if ($bk['client_id']) {
                DB::table('bookings')->updateOrInsert(
                    ['booking_id' => $bk['booking_id']],
                    $bk
                );
            }
        }

        // Helper item IDs
        $itemR32 = DB::table('inventory_items')->where('item_name', 'like', '%R32%')->value('item_id');
        $itemR410A = DB::table('inventory_items')->where('item_name', 'like', '%R410A%')->value('item_id');
        $itemChemical = DB::table('inventory_items')->where('item_name', 'like', '%SuperKleen%')->value('item_id');
        $itemCopper14 = DB::table('inventory_items')->where('item_name', 'like', '%1/4"%')->value('item_id');
        $itemCapacitor = DB::table('inventory_items')->where('item_name', 'like', '%Capacitor%')->value('item_id');

        // 9. Booking Materials (Materials used per job)
        $bookingMaterials = [
            // Booking 1 materials
            ['usage_id' => 1, 'booking_id' => 1, 'item_id' => $itemChemical, 'quantity_used' => 1, 'logged_at' => Carbon::now()->subDays(12)],
            // Booking 2 materials
            ['usage_id' => 2, 'booking_id' => 2, 'item_id' => $itemCopper14, 'quantity_used' => 1, 'logged_at' => Carbon::now()->subDays(8)],
            ['usage_id' => 3, 'booking_id' => 2, 'item_id' => $itemR32, 'quantity_used' => 1, 'logged_at' => Carbon::now()->subDays(8)],
            // Booking 4 materials
            ['usage_id' => 4, 'booking_id' => 4, 'item_id' => $itemCapacitor, 'quantity_used' => 1, 'logged_at' => Carbon::now()->subDays(1)],
            // Booking 5 materials
            ['usage_id' => 5, 'booking_id' => 5, 'item_id' => $itemR410A, 'quantity_used' => 1, 'logged_at' => Carbon::now()],
        ];

        foreach ($bookingMaterials as $bm) {
            if ($bm['item_id']) {
                DB::table('booking_materials')->updateOrInsert(
                    ['usage_id' => $bm['usage_id']],
                    $bm
                );
            }
        }

        // 10. Schedules
        $schedules = [
            [
                'schedule_id' => 1,
                'technician_id' => $techRafael,
                'scheduled_booking_id' => 1,
                'start_time' => Carbon::now()->subDays(12)->setTime(9, 30),
                'end_time' => Carbon::now()->subDays(12)->setTime(12, 00),
            ],
            [
                'schedule_id' => 2,
                'technician_id' => $techDanilo,
                'scheduled_booking_id' => 2,
                'start_time' => Carbon::now()->subDays(8)->setTime(13, 00),
                'end_time' => Carbon::now()->subDays(8)->setTime(17, 30),
            ],
            [
                'schedule_id' => 3,
                'technician_id' => $techArnel,
                'scheduled_booking_id' => 3,
                'start_time' => Carbon::now()->subDays(4)->setTime(10, 00),
                'end_time' => Carbon::now()->subDays(4)->setTime(15, 00),
            ],
            [
                'schedule_id' => 4,
                'technician_id' => $techRafael,
                'scheduled_booking_id' => 4,
                'start_time' => Carbon::now()->subDays(1)->setTime(14, 00),
                'end_time' => Carbon::now()->subDays(1)->setTime(16, 30),
            ],
            [
                'schedule_id' => 5,
                'technician_id' => $techDanilo,
                'scheduled_booking_id' => 5,
                'start_time' => Carbon::now()->addDays(1)->setTime(9, 00),
                'end_time' => Carbon::now()->addDays(1)->setTime(12, 30),
            ],
            [
                'schedule_id' => 6,
                'technician_id' => $techArnel,
                'scheduled_booking_id' => 6,
                'start_time' => Carbon::now()->addDays(2)->setTime(11, 00),
                'end_time' => Carbon::now()->addDays(2)->setTime(13, 00),
            ],
        ];

        foreach ($schedules as $sch) {
            if ($sch['technician_id']) {
                DB::table('schedule')->updateOrInsert(
                    ['schedule_id' => $sch['schedule_id']],
                    $sch
                );
            }
        }

        // 11. Service Reports
        $serviceReports = [
            [
                'report_id' => 1,
                'booking_id' => 1,
                'technician_id' => $techRafael,
                'service_name' => 'Chemical Deep Cleaning & Hydro Wash',
                'diagnosis' => 'Heavy dust buildup on indoor cross-flow fan and secondary evaporator coil causing weak airflow and musty smell.',
                'work_done' => 'Applied non-acidic coil chemical cleaner, hydro-washed both evaporator and condenser units, disinfected drain trough.',
                'parts_replaced' => 'None (General Servicing)',
                'recommendations' => 'Schedule regular filter washing every 30 days to maintain peak energy efficiency.',
                'ac_brand' => 'Daikin Inverter',
                'ac_type' => 'Split Type 1.5HP',
                'unit_serial_number' => 'DK-INV-2026-99201',
                'job_started_at' => Carbon::now()->subDays(12)->setTime(9, 45),
                'job_completed_at' => Carbon::now()->subDays(12)->setTime(11, 50),
                'status' => 'Completed',
                'created_at' => Carbon::now()->subDays(12),
                'updated_at' => Carbon::now()->subDays(12),
            ],
            [
                'report_id' => 2,
                'booking_id' => 2,
                'technician_id' => $techDanilo,
                'service_name' => 'Split-Type AC Full Installation',
                'diagnosis' => 'Brand new unit installation on master bedroom wall with 12-foot copper line run to outdoor ledge.',
                'work_done' => 'Mounted indoor bracket, drilled wall core, flared 1/4" and 3/8" copper tubes, deep vacuumed to 450 microns, commissioned system.',
                'parts_replaced' => '12ft Copper Tubing, Aerofoam Insulation, Outdoor L-Bracket Set',
                'recommendations' => 'Customer briefed on remote control timer and eco-inverter modes. First free checkup in 6 months.',
                'ac_brand' => 'Panasonic Aero Series',
                'ac_type' => 'Split Type 1.0HP',
                'unit_serial_number' => 'PN-AER-2026-11029',
                'job_started_at' => Carbon::now()->subDays(8)->setTime(13, 15),
                'job_completed_at' => Carbon::now()->subDays(8)->setTime(17, 10),
                'status' => 'Completed',
                'created_at' => Carbon::now()->subDays(8),
                'updated_at' => Carbon::now()->subDays(8),
            ],
            [
                'report_id' => 3,
                'booking_id' => 4,
                'technician_id' => $techRafael,
                'service_name' => 'Capacitor & PCB Board Replacement Repair',
                'diagnosis' => 'Outdoor condenser fan hums but compressor fails to start. Multimeter reading showed open circuit on starting capacitor.',
                'work_done' => 'Replaced blown 35+5 uF capacitor with genuine heavy-duty 450VAC run capacitor. Verified operating amperage at 4.2A nominal.',
                'parts_replaced' => 'Dual Run Capacitor 35+5 uF 450VAC Round',
                'recommendations' => 'Ensure outdoor circuit breaker is protected against power surges during thunderstorms.',
                'ac_brand' => 'Mitsubishi Heavy Ind.',
                'ac_type' => 'Floor Mounted 3.0HP',
                'unit_serial_number' => 'MH-FLR-2026-66412',
                'job_started_at' => Carbon::now()->subDays(1)->setTime(14, 10),
                'job_completed_at' => Carbon::now()->subDays(1)->setTime(16, 15),
                'status' => 'Completed',
                'created_at' => Carbon::now()->subDays(1),
                'updated_at' => Carbon::now()->subDays(1),
            ],
        ];

        foreach ($serviceReports as $sr) {
            if ($sr['technician_id']) {
                DB::table('service_reports')->updateOrInsert(
                    ['report_id' => $sr['report_id']],
                    $sr
                );
            }
        }

        // 12. Payments
        $payments = [
            [
                'payment_id' => 1,
                'booking_id' => 1,
                'booking_price' => 1800.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => 1800.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_date' => Carbon::now()->subDays(12)->setTime(12, 05),
            ],
            [
                'payment_id' => 2,
                'booking_id' => 2,
                'booking_price' => 4500.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 750.00,
                'amount_paid' => 5250.00,
                'payment_status' => 'Paid',
                'payment_method' => 'Cash',
                'payment_date' => Carbon::now()->subDays(8)->setTime(17, 20),
            ],
            [
                'payment_id' => 3,
                'booking_id' => 3,
                'booking_price' => 2500.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => 2500.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_date' => Carbon::now()->subDays(4)->setTime(15, 10),
            ],
            [
                'payment_id' => 4,
                'booking_id' => 4,
                'booking_price' => 1600.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 650.00,
                'amount_paid' => 2250.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_date' => Carbon::now()->subDays(1)->setTime(16, 25),
            ],
            [
                'payment_id' => 5,
                'booking_id' => 5,
                'booking_price' => 2200.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 500.00,
                'amount_paid' => 0.00,
                'payment_status' => 'Pending',
                'payment_method' => 'GCash',
                'payment_date' => Carbon::now()->addDays(1),
            ],
        ];

        foreach ($payments as $pay) {
            DB::table('payment')->updateOrInsert(
                ['payment_id' => $pay['payment_id']],
                $pay
            );
        }

        // 13. Tool Checkouts
        $itemVacPump = DB::table('inventory_items')->where('item_name', 'like', '%Vacuum Pump%')->value('item_id');
        $itemPressureWasher = DB::table('inventory_items')->where('item_name', 'like', '%Pressure Washer%')->value('item_id');
        $itemClampMeter = DB::table('inventory_items')->where('item_name', 'like', '%Clamp Meter%')->value('item_id');

        $toolCheckouts = [
            [
                'checkout_id' => 1,
                'item_id' => $itemPressureWasher,
                'technician_id' => $techRafael,
                'checkout_date' => Carbon::now()->subDays(12)->setTime(8, 30),
                'return_date' => Carbon::now()->subDays(12)->setTime(17, 00),
                'status' => 'Returned',
            ],
            [
                'checkout_id' => 2,
                'item_id' => $itemVacPump,
                'technician_id' => $techDanilo,
                'checkout_date' => Carbon::now()->subDays(8)->setTime(8, 00),
                'return_date' => Carbon::now()->subDays(8)->setTime(18, 00),
                'status' => 'Returned',
            ],
            [
                'checkout_id' => 3,
                'item_id' => $itemClampMeter,
                'technician_id' => $techRafael,
                'checkout_date' => Carbon::now()->subDays(1)->setTime(13, 00),
                'return_date' => Carbon::now()->subDays(1)->setTime(17, 30),
                'status' => 'Returned',
            ],
            [
                'checkout_id' => 4,
                'item_id' => $itemVacPump,
                'technician_id' => $techDanilo,
                'checkout_date' => Carbon::now()->setTime(8, 00),
                'return_date' => null,
                'status' => 'Checked Out',
            ],
        ];

        foreach ($toolCheckouts as $tc) {
            if ($tc['item_id'] && $tc['technician_id']) {
                DB::table('tool_checkouts')->updateOrInsert(
                    ['checkout_id' => $tc['checkout_id']],
                    $tc
                );
            }
        }

        // 14. Customer Complaints
        $complaints = [
            [
                'complaint_id' => 1,
                'customer_id' => $clientEduardo,
                'booking_id' => 1,
                'complaint_details' => 'Slight water dripping from bottom corner of indoor unit after heavy rain.',
                'complaint_date' => Carbon::now()->subDays(10),
                'status' => 'Resolved',
            ],
            [
                'complaint_id' => 2,
                'customer_id' => $clientPatricia,
                'booking_id' => 4,
                'complaint_details' => 'Technician arrived 15 minutes after the scheduled slot due to heavy traffic on EDSA.',
                'complaint_date' => Carbon::now()->subDays(1),
                'status' => 'Resolved',
            ],
        ];

        foreach ($complaints as $cmp) {
            if ($cmp['customer_id']) {
                DB::table('customer_complaints')->updateOrInsert(
                    ['complaint_id' => $cmp['complaint_id']],
                    $cmp
                );
            }
        }

        // 15. Customer Feedback & Ratings
        $feedbacks = [
            [
                'feedback_id' => 1,
                'booking_id' => 1,
                'rating' => 5,
                'feedback' => 'Rafael was very meticulous and professional! Our AC blows ice-cold air again with zero noise. Highly recommended!',
                'submitted_at' => Carbon::now()->subDays(11),
            ],
            [
                'feedback_id' => 2,
                'booking_id' => 2,
                'rating' => 5,
                'feedback' => 'Super neat installation work. Danilo cleaned up all debris and drywall dust before leaving. Very impressed!',
                'submitted_at' => Carbon::now()->subDays(7),
            ],
            [
                'feedback_id' => 3,
                'booking_id' => 3,
                'rating' => 4,
                'feedback' => 'Good preventive maintenance work for our office units. Thorough reporting on power consumption.',
                'submitted_at' => Carbon::now()->subDays(3),
            ],
            [
                'feedback_id' => 4,
                'booking_id' => 4,
                'rating' => 5,
                'feedback' => 'Fast troubleshooting! Rafael detected the faulty capacitor immediately and saved us from buying a new unit.',
                'submitted_at' => Carbon::now()->subHours(18),
            ],
        ];

        foreach ($feedbacks as $fb) {
            DB::table('customer_feedback_and_ratings')->updateOrInsert(
                ['feedback_id' => $fb['feedback_id']],
                $fb
            );
        }

        // 16. Documents
        $documents = [
            [
                'doc_id' => 1,
                'booking_id' => 1,
                'created_by' => $adminUser ?? 1,
                'form_name' => 'Service Work Order & Checklist #WO-2026-0089',
                'client_name' => 'Eduardo Mendoza',
                'service_name' => 'Chemical Deep Cleaning & Hydro Wash',
                'status' => 'Finalized',
                'file_path' => 'documents/work_orders/WO-2026-0089.pdf',
                'notes' => 'Signed by customer upon job completion.',
                'created_at' => Carbon::now()->subDays(12),
                'updated_at' => Carbon::now()->subDays(12),
            ],
            [
                'doc_id' => 2,
                'booking_id' => 2,
                'created_by' => $managerUser ?? 2,
                'form_name' => 'Installation Certificate & Warranty Deed #INS-2026-0142',
                'client_name' => 'Christine Joy Reyes',
                'service_name' => 'Split-Type AC Full Installation',
                'status' => 'Finalized',
                'file_path' => 'documents/invoices/INS-2026-0142.pdf',
                'notes' => 'Includes 1-year workmanship warranty and 5-year compressor manufacturer warranty.',
                'created_at' => Carbon::now()->subDays(8),
                'updated_at' => Carbon::now()->subDays(8),
            ],
            [
                'doc_id' => 3,
                'booking_id' => 3,
                'created_by' => $managerUser ?? 2,
                'form_name' => 'Quarterly Corporate HVAC Maintenance Report #QMR-2026-0031',
                'client_name' => 'Benjamin Tan (Nexus Technologies)',
                'service_name' => 'Comprehensive Preventive Maintenance',
                'status' => 'Exported',
                'file_path' => 'documents/reports/QMR-2026-0031.pdf',
                'notes' => 'Transmitted to Building Facility Management Office.',
                'created_at' => Carbon::now()->subDays(4),
                'updated_at' => Carbon::now()->subDays(4),
            ],
        ];

        foreach ($documents as $doc) {
            DB::table('documents')->updateOrInsert(
                ['doc_id' => $doc['doc_id']],
                $doc
            );
        }

        // 17. Announcements
        $announcements = [
            [
                'id' => 1,
                'created_by' => $adminUser ?? 1,
                'title' => 'Summer Peak Season Readiness & Safety Protocols',
                'message' => 'All technicians are reminded to inspect vacuum pumps, manifold gauges, and insulated safety gloves before dispatch. Stay hydrated during rooftop condenser inspections.',
                'target_role_id' => 5, // Technicians
                'created_at' => Carbon::now()->subDays(14),
                'updated_at' => Carbon::now()->subDays(14),
            ],
            [
                'id' => 2,
                'created_by' => $managerUser ?? 2,
                'title' => 'Annual Preventive Maintenance Promo for Corporate Clients',
                'message' => 'Enjoy 15% discount on 1-year quarterly maintenance service packages booked through our online customer portal throughout this quarter.',
                'target_role_id' => null, // All users
                'created_at' => Carbon::now()->subDays(7),
                'updated_at' => Carbon::now()->subDays(7),
            ],
            [
                'id' => 3,
                'created_by' => $adminUser ?? 1,
                'title' => 'New Inverter Diagnostic Toolkits Added to Inventory',
                'message' => 'New Fluke RMS clamp meters and digital manifold gauge sets have been assigned to the Tools section. Please coordinate tool checkouts with Pedro Reyes.',
                'target_role_id' => 5,
                'created_at' => Carbon::now()->subDays(3),
                'updated_at' => Carbon::now()->subDays(3),
            ],
        ];

        foreach ($announcements as $anc) {
            DB::table('announcements')->updateOrInsert(
                ['id' => $anc['id']],
                $anc
            );
        }

        // 18. Activity Logs
        $activityLogs = [
            [
                'id' => 1,
                'user_id' => $adminUser ?? 1,
                'action_type' => 'System Authentication',
                'description' => 'Super Administrator logged into the system portal from Makati Operations Head Office.',
                'created_at' => Carbon::now()->subDays(15),
                'updated_at' => Carbon::now()->subDays(15),
            ],
            [
                'id' => 2,
                'user_id' => $clientEduardo ?? 1,
                'action_type' => 'Booking Created',
                'description' => 'Customer Eduardo Mendoza booked Chemical Deep Cleaning service for Daikin Inverter unit.',
                'created_at' => Carbon::now()->subDays(15),
                'updated_at' => Carbon::now()->subDays(15),
            ],
            [
                'id' => 3,
                'user_id' => $managerUser ?? 2,
                'action_type' => 'Technician Assigned',
                'description' => 'Lead Technician Rafael Torres assigned to Booking #1 for Eduardo Mendoza.',
                'created_at' => Carbon::now()->subDays(14),
                'updated_at' => Carbon::now()->subDays(14),
            ],
            [
                'id' => 4,
                'user_id' => $techRafael ?? 5,
                'action_type' => 'Service Report Completed',
                'description' => 'Technician Rafael Torres submitted Service Report #1 and marked Booking #1 as Completed.',
                'created_at' => Carbon::now()->subDays(12),
                'updated_at' => Carbon::now()->subDays(12),
            ],
            [
                'id' => 5,
                'user_id' => $clientEduardo ?? 1,
                'action_type' => 'Payment Processed',
                'description' => 'Received payment of PHP 1,800.00 via GCash for Booking #1.',
                'created_at' => Carbon::now()->subDays(12),
                'updated_at' => Carbon::now()->subDays(12),
            ],
            [
                'id' => 6,
                'user_id' => $techDanilo ?? 5,
                'action_type' => 'Tool Checkout',
                'description' => 'Danilo Ramos checked out Robinair 2-Stage Vacuum Pump (SN: ROB-VP5-8812).',
                'created_at' => Carbon::now()->subDays(8),
                'updated_at' => Carbon::now()->subDays(8),
            ],
        ];

        foreach ($activityLogs as $act) {
            DB::table('activity_logs')->updateOrInsert(
                ['id' => $act['id']],
                $act
            );
        }
    }
}
