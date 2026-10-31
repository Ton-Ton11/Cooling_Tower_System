<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\TechnicianTeam;
use App\Models\TechnicianTeamMember;
use App\Models\ToolChecklist;
use App\Models\ToolChecklistItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ExampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds with realistic, production-grade example data.
     * Consolidated from ExampleDataSeeder and TechnicianTeamsAndChecklistsSeeder.
     */
    public function run(): void
    {
        // -------------------------------------------------------------
        // 1. 1 Demo Customer Account
        // -------------------------------------------------------------
        // Roles: 1=Super Admin, 2=Manager, 3=Admin Assistant, 4=Tools Man, 5=Technician, 6=Customer, 7=Head Technician
        $usersToSeed = [
            // 1 Demo Customer Account (Role 6) for presentation bookings & test login
            [
                'role_id' => 6,
                'given_name' => 'Eduardo',
                'middle_name' => 'Cruz',
                'last_name' => 'Mendoza',
                'birthdate' => '1985-02-14',
                'sex' => 'Male',
                'address' => 'Unit 14B High Street South Tower, Bonifacio Global City, Taguig',
                'contact_number' => '09175554321',
                'email' => 'customer@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => Carbon::now()->subMonths(4),
                'updated_at' => Carbon::now()->subMonths(4),
            ],
        ];

        foreach ($usersToSeed as $usr) {
            DB::table('users')->updateOrInsert(
                ['email' => $usr['email']],
                $usr
            );
        }

        // Retrieve reference User objects
        $superAdmin = User::where('email', 'super.admin@coolingtower.com')->first();
        $manager    = User::where('email', 'manager.maria@coolingtower.com')->first();
        $adminAsst  = User::where('email', 'admin.juan@coolingtower.com')->first();
        $toolsMan   = User::where('email', 'toolsman.pedro@coolingtower.com')->first();
        $headTech   = User::where('email', 'technician.head@coolingtower.com')->first();
        $techDanilo = User::where('email', 'technician.first@coolingtower.com')->first();
        $techArnel  = User::where('email', 'technician.second@coolingtower.com')->first();
        $customer   = User::where('email', 'customer@coolingtower.com')->first();

        $adminId    = $superAdmin?->user_id ?? 1;
        $managerId  = $manager?->user_id ?? 2;
        $toolsManId = $toolsMan?->user_id ?? 4;
        $headTechId = $headTech?->user_id ?? 5;
        $daniloId   = $techDanilo?->user_id ?? 6;
        $arnelId    = $techArnel?->user_id ?? 7;
        $clientId   = $customer?->user_id ?? 8;

        // Clean up obsolete customer/technician/employee accounts from prior seeds safely
        Schema::disableForeignKeyConstraints();
        $obsoleteUserIds = DB::table('users')
            ->whereIn('email', [
                'maria.garcia@coolingtower.com',
                'juan.mercado@coolingtower.com',
                'pedro.reyes@coolingtower.com',
                'rafael.torres@coolingtower.com',
                'danilo.ramos@coolingtower.com',
                'arnel.castro@coolingtower.com',
                'miguel.santos@coolingtower.com',
                'customer.test@coolingtower.com',
                'eduardo.mendoza@gmail.com',
                'cj.reyes@gmail.com',
                'benjamin.sy@nexustech.ph',
                'dr.patricia.lim@gmail.com',
                'antonio.dejesus@outlook.com',
                'grace.villanueva@yahoo.com',
            ])
            ->pluck('user_id')
            ->all();

        if (! empty($obsoleteUserIds)) {
            DB::table('bookings')->whereIn('client_id', $obsoleteUserIds)->update(['client_id' => $clientId]);
            DB::table('bookings')->whereIn('assigned_tech_id', $obsoleteUserIds)->update(['assigned_tech_id' => $daniloId]);
            DB::table('bookings')->whereIn('lead_technician_id', $obsoleteUserIds)->update(['lead_technician_id' => $headTechId]);
            DB::table('bookings')->whereIn('assistant_technician_id', $obsoleteUserIds)->update(['assistant_technician_id' => $daniloId]);
            DB::table('customer_unit_details')->whereIn('user_id', $obsoleteUserIds)->delete();
            DB::table('customer_complaints')->whereIn('customer_id', $obsoleteUserIds)->delete();
            DB::table('technician_details')->whereIn('user_id', $obsoleteUserIds)->delete();
            DB::table('technician_team_members')->whereIn('technician_id', $obsoleteUserIds)->delete();
            DB::table('technician_teams')->whereIn('leader_id', $obsoleteUserIds)->update(['leader_id' => $headTechId, 'created_by' => $headTechId]);
            DB::table('users')->whereIn('user_id', $obsoleteUserIds)->delete();
        }
        Schema::enableForeignKeyConstraints();

        // -------------------------------------------------------------
        // 2. Customer Unit Details
        // -------------------------------------------------------------
        if ($customer) {
            DB::table('customer_unit_details')->updateOrInsert(
                ['user_id' => $customer->user_id],
                [
                    'aircon_brand' => 'Daikin Inverter',
                    'aircon_type' => 'Split Type',
                    'unit_quantity' => 2,
                ]
            );
        }

        // -------------------------------------------------------------
        // 3. Specialties & Technician Details
        // -------------------------------------------------------------
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

        $technicians = [
            [
                'user_id' => $headTechId,
                'certificate_expiry' => '2028-12-31',
                'specialties' => [1, 2, 3, 5],
                'cert_name' => 'TESDA National Certificate III - RAC Servicing (Commercial)',
                'cert_no' => 'TESDA-RAC3-2024-0091',
            ],
            [
                'user_id' => $daniloId,
                'certificate_expiry' => '2028-06-30',
                'specialties' => [1, 3, 4, 6],
                'cert_name' => 'TESDA National Certificate II - RAC Servicing (Domestic)',
                'cert_no' => 'TESDA-RAC2-2023-4412',
            ],
            [
                'user_id' => $arnelId,
                'certificate_expiry' => '2027-08-15',
                'specialties' => [2, 3, 4, 5],
                'cert_name' => 'TESDA National Certificate II - Inverter Troubleshooting & PCB',
                'cert_no' => 'TESDA-INV2-2024-8831',
            ],
        ];

        foreach ($technicians as $t) {
            DB::table('technician_details')->updateOrInsert(
                ['user_id' => $t['user_id']],
                ['certificate_expiry' => $t['certificate_expiry']]
            );

            foreach ($t['specialties'] as $specId) {
                DB::table('technician_specialty')->updateOrInsert(
                    ['user_id' => $t['user_id'], 'specialty_id' => $specId]
                );
            }

            if (Schema::hasTable('technician_certifications')) {
                DB::table('technician_certifications')->updateOrInsert(
                    ['certificate_number' => $t['cert_no']],
                    [
                        'user_id' => $t['user_id'],
                        'certification_name' => $t['cert_name'],
                        'issuing_body' => 'TESDA',
                        'certificate_number' => $t['cert_no'],
                        'issued_date' => Carbon::parse($t['certificate_expiry'])->subYears(3)->format('Y-m-d'),
                        'expiry_date' => $t['certificate_expiry'],
                        'renewal_lead_days' => 45,
                        'status' => 'Active',
                        'notes' => 'Verified by Operations Manager.',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // -------------------------------------------------------------
        // 4. Technician Teams & Squad Members
        // -------------------------------------------------------------
        // Each technician belongs to only one squad at a time.
        // Team Alpha: Rafael Torres (Lead) + Danilo Ramos (Member)
        $teamAlpha = TechnicianTeam::updateOrCreate(
            ['team_name' => 'Alpha Cooling Squad'],
            [
                'leader_id' => $headTechId,
                'created_by' => $headTechId,
                'status' => 'Active',
                'description' => 'Specializes in cooling tower motor overhauls, chemical flush, and high-rise commercial HVAC systems.',
            ]
        );

        TechnicianTeamMember::where('team_id', $teamAlpha->team_id)->delete();
        TechnicianTeamMember::create([
            'team_id' => $teamAlpha->team_id,
            'technician_id' => $headTechId,
            'role_in_team' => 'Lead',
        ]);
        TechnicianTeamMember::create([
            'team_id' => $teamAlpha->team_id,
            'technician_id' => $daniloId,
            'role_in_team' => 'Member',
        ]);

        // Team Delta: Arnel Castro (Lead)
        $teamDelta = TechnicianTeam::updateOrCreate(
            ['team_name' => 'Delta AC Specialists'],
            [
                'leader_id' => $arnelId,
                'created_by' => $headTechId,
                'status' => 'Active',
                'description' => 'VRF multi-split diagnostics, precision refrigerant leak repair, and inverter motherboard testing.',
            ]
        );

        TechnicianTeamMember::where('team_id', $teamDelta->team_id)->delete();
        TechnicianTeamMember::create([
            'team_id' => $teamDelta->team_id,
            'technician_id' => $arnelId,
            'role_in_team' => 'Lead',
        ]);

        // -------------------------------------------------------------
        // 5. Services (Only 3 Primary Booking Services: IDs 1, 2, and 3)
        // -------------------------------------------------------------
        $services = [
            [
                'service_id' => 1,
                'service_name' => 'Installation',
                'description' => 'For new air-conditioning unit installation, replacement, or relocation.',
                'base_price' => 0.00,
                'category' => 'Installation',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'service_id' => 2,
                'service_name' => 'Repair / Check-up',
                'description' => 'For air-conditioning problems, troubleshooting, inspection, diagnosis, and repair requests.',
                'base_price' => 0.00,
                'category' => 'Repair',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'service_id' => 3,
                'service_name' => 'Cleaning / Preventive Maintenance',
                'description' => 'For regular cleaning, deep cleaning, and preventive maintenance of your air-conditioning unit.',
                'base_price' => 0.00,
                'category' => 'Maintenance',
                'display_order' => 3,
                'is_active' => true,
            ],
        ];

        foreach ($services as $srv) {
            DB::table('services')->updateOrInsert(
                ['service_id' => $srv['service_id']],
                array_merge($srv, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        DB::table('bookings')->whereNotIn('service_id', [1, 2, 3])->update(['service_id' => 3]);
        DB::table('services')->whereNotIn('service_id', [1, 2, 3])->delete();

        // -------------------------------------------------------------
        // 6. Inventory Items (Tools, Materials, Spare Parts)
        // -------------------------------------------------------------
        $inventoryItems = [
            // Tools (Power & Hand Tools)
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
            ],
            [
                'item_name' => 'Industrial High-Pressure Washer 180 Bar',
                'item_type' => 'Tool',
                'inventory_mode' => 'worker',
                'tool_subtype' => 'power',
                'compatible_brands' => 'Industrial & Commercial HVAC Towers',
                'serial_number' => 'PW-180B-012',
                'quantity_on_hand' => 6,
                'initial_stock' => 6,
                'reorder_level' => 1,
                'unit' => 'unit',
                'capital' => 18500.00,
                'profit' => 0.00,
                'selling_price' => null,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'status' => 'Available',
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
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
                'created_at' => now(),
                'last_updated' => now(),
            ],
        ];

        foreach ($inventoryItems as $item) {
            DB::table('inventory_items')->updateOrInsert(
                ['item_name' => $item['item_name']],
                $item
            );
        }

        // Fetch tool & material helper IDs
        $itemVacPump    = DB::table('inventory_items')->where('item_name', 'like', '%Vacuum Pump%')->value('item_id');
        $itemWasher     = DB::table('inventory_items')->where('item_name', 'like', '%Pressure Washer 18V%')->value('item_id');
        $itemIndWasher  = DB::table('inventory_items')->where('item_name', 'like', '%Washer 180 Bar%')->value('item_id') ?? $itemWasher;
        $itemClampMeter = DB::table('inventory_items')->where('item_name', 'like', '%Clamp Meter%')->value('item_id');
        $itemGauge      = DB::table('inventory_items')->where('item_name', 'like', '%Manifold Gauge%')->value('item_id');
        $itemFlaring    = DB::table('inventory_items')->where('item_name', 'like', '%Flaring%')->value('item_id');
        $itemR32        = DB::table('inventory_items')->where('item_name', 'like', '%R32%')->value('item_id');
        $itemR410A      = DB::table('inventory_items')->where('item_name', 'like', '%R410A%')->value('item_id');
        $itemChemical   = DB::table('inventory_items')->where('item_name', 'like', '%SuperKleen%')->value('item_id');
        $itemCopper14   = DB::table('inventory_items')->where('item_name', 'like', '%1/4"%')->value('item_id');
        $itemCapacitor  = DB::table('inventory_items')->where('item_name', 'like', '%Capacitor%')->value('item_id');
        $itemRemote     = DB::table('inventory_items')->where('item_name', 'like', '%Remote Control%')->value('item_id');

        // -------------------------------------------------------------
        // 7. AC Units Inventory
        // -------------------------------------------------------------
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
                'warranty_period' => 5,
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
                'expected_arrival' => '2026-11-15',
                'created_at' => Carbon::now()->subDays(10),
                'updated_at' => Carbon::now()->subDays(10),
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

        // -------------------------------------------------------------
        // 8. Presentation Bookings (Covering Every Step of the Workflow)
        // -------------------------------------------------------------
        // Clean up any extraneous bookings > 5 from prior runs if present
        $extraBookingIds = DB::table('bookings')->where('booking_id', '>', 5)->pluck('booking_id')->all();
        if (! empty($extraBookingIds)) {
            DB::table('tool_checklists')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('payment')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('service_reports')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('customer_feedback_and_ratings')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('customer_complaints')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('documents')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('booking_materials')->whereIn('booking_id', $extraBookingIds)->delete();
            DB::table('schedule')->whereIn('scheduled_booking_id', $extraBookingIds)->delete();
            DB::table('bookings')->whereIn('booking_id', $extraBookingIds)->delete();
        }

        // Booking 1: PENDING (ready for Manager to review and assign squad)
        $booking1 = Booking::updateOrCreate(
            ['booking_id' => 1],
            [
                'client_id' => $clientId,
                'service_id' => 3, // Cleaning / Preventive Maintenance
                'assigned_team_id' => null,
                'assigned_tech_id' => null,
                'lead_technician_id' => null,
                'assistant_technician_id' => null,
                'assigned_by' => null,
                'scheduled_date' => Carbon::now()->addDays(3)->setTime(9, 0),
                'booking_status' => 'Pending',
                'service_payment_method' => 'GCash',
                'notes' => 'Commercial cooling tower overhaul inspection and chemical cleaning requested.',
                'created_at' => Carbon::now()->subDays(1),
                'updated_at' => Carbon::now()->subDays(1),
            ]
        );

        DB::table('payment')->updateOrInsert(
            ['booking_id' => $booking1->booking_id],
            [
                'booking_price' => 1500.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => 1500.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'reference_number' => 'GCASH-REF-891023',
                'payment_type' => 'Booking Fee',
                'payment_date' => Carbon::now()->subDays(1)->setTime(14, 20),
                'created_at' => Carbon::now()->subDays(1),
                'updated_at' => Carbon::now()->subDays(1),
            ]
        );

        // Booking 2: APPROVED with PENDING Checklist (Assigned to Alpha Cooling Squad)
        $booking2 = Booking::updateOrCreate(
            ['booking_id' => 2],
            [
                'client_id' => $clientId,
                'service_id' => 1, // Installation
                'assigned_team_id' => $teamAlpha->team_id,
                'assigned_tech_id' => $headTechId,
                'lead_technician_id' => $headTechId,
                'assistant_technician_id' => $daniloId,
                'assigned_by' => $managerId,
                'assigned_at' => Carbon::now()->subHours(6),
                'scheduled_date' => Carbon::now()->addDays(1)->setTime(10, 30),
                'booking_status' => 'Approved',
                'service_payment_method' => 'GCash',
                'notes' => 'Assigned to Alpha Cooling Squad by Manager Maria Garcia. Tool checklist pending submission.',
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subHours(6),
            ]
        );

        DB::table('payment')->updateOrInsert(
            ['booking_id' => $booking2->booking_id],
            [
                'booking_price' => 3500.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => 3500.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'reference_number' => 'GCASH-REF-449102',
                'payment_type' => 'Full',
                'payment_date' => Carbon::now()->subDays(2)->setTime(11, 0),
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ]
        );

        // Pending Checklist for Booking 2
        $checklistPending = ToolChecklist::updateOrCreate(
            ['booking_id' => $booking2->booking_id],
            [
                'technician_id' => $headTechId,
                'team_id' => $teamAlpha->team_id,
                'status' => 'Pending',
                'notes' => 'Requires high-pressure washer and copper flaring kit for split AC installation.',
                'created_at' => Carbon::now()->subHours(5),
                'updated_at' => Carbon::now()->subHours(5),
            ]
        );

        ToolChecklistItem::updateOrCreate(
            ['checklist_id' => $checklistPending->checklist_id, 'item_id' => $itemIndWasher],
            [
                'item_type' => 'Tool',
                'quantity_requested' => 1,
                'quantity_approved' => 1,
                'status' => 'assigned',
                'notes' => 'High pressure hydro washer',
            ]
        );
        ToolChecklistItem::updateOrCreate(
            ['checklist_id' => $checklistPending->checklist_id, 'item_id' => $itemFlaring],
            [
                'item_type' => 'Tool',
                'quantity_requested' => 1,
                'quantity_approved' => 1,
                'status' => 'assigned',
                'notes' => 'Imperial 45-deg flaring kit',
            ]
        );

        // Booking 3: IN-PROGRESS with APPROVED Checklist (Tools in technician custody)
        $booking3 = Booking::updateOrCreate(
            ['booking_id' => 3],
            [
                'client_id' => $clientId,
                'service_id' => 2, // Repair / Check-up
                'assigned_team_id' => $teamAlpha->team_id,
                'assigned_tech_id' => $daniloId,
                'lead_technician_id' => $headTechId,
                'assistant_technician_id' => $daniloId,
                'assigned_by' => $managerId,
                'assigned_at' => Carbon::now()->subDays(1),
                'scheduled_date' => Carbon::now()->setTime(9, 0),
                'booking_status' => 'In-Progress',
                'service_payment_method' => 'Cash',
                'notes' => 'Alpha Cooling Squad active on-site at BGC Tower. Tools dispatched and in custody.',
                'created_at' => Carbon::now()->subDays(3),
                'updated_at' => Carbon::now()->subHours(2),
            ]
        );

        DB::table('payment')->updateOrInsert(
            ['booking_id' => $booking3->booking_id],
            [
                'booking_price' => 2200.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => 2200.00,
                'payment_status' => 'Paid',
                'payment_method' => 'Cash',
                'reference_number' => 'CASH-REC-110293',
                'payment_type' => 'Full',
                'payment_date' => Carbon::now()->subDays(1)->setTime(16, 0),
                'created_at' => Carbon::now()->subDays(3),
                'updated_at' => Carbon::now()->subDays(1),
            ]
        );

        // Approved Checklist for Booking 3 (Tools Man Pedro Reyes approved tools in custody)
        $checklistApproved = ToolChecklist::updateOrCreate(
            ['booking_id' => $booking3->booking_id],
            [
                'technician_id' => $daniloId,
                'team_id' => $teamAlpha->team_id,
                'status' => 'Approved',
                'notes' => 'Vacuum pump and digital manifold gauge issued for deep evacuation and pressure testing.',
                'approved_by' => $toolsManId,
                'approved_at' => Carbon::now()->subHours(2),
                'created_at' => Carbon::now()->subHours(3),
                'updated_at' => Carbon::now()->subHours(2),
            ]
        );

        ToolChecklistItem::updateOrCreate(
            ['checklist_id' => $checklistApproved->checklist_id, 'item_id' => $itemVacPump],
            [
                'item_type' => 'Tool',
                'quantity_requested' => 1,
                'quantity_approved' => 1,
                'status' => 'assigned',
                'notes' => 'Robinair 5 CFM Vacuum Pump (SN: ROB-VP5-8812)',
            ]
        );
        ToolChecklistItem::updateOrCreate(
            ['checklist_id' => $checklistApproved->checklist_id, 'item_id' => $itemGauge],
            [
                'item_type' => 'Tool',
                'quantity_requested' => 1,
                'quantity_approved' => 1,
                'status' => 'assigned',
                'notes' => 'Mastercool Digital 4-Way Manifold Gauge (SN: MC-DMG-3104)',
            ]
        );
        ToolChecklistItem::updateOrCreate(
            ['checklist_id' => $checklistApproved->checklist_id, 'item_id' => $itemR410A],
            [
                'item_type' => 'Material',
                'quantity_requested' => 1,
                'quantity_approved' => 1,
                'status' => 'assigned',
                'notes' => 'R410A Cylinder for topping up',
            ]
        );

        // Booking 4: COMPLETED (Repair with Consumed Spare Parts & Turnover Declared by Manager)
        $booking4 = Booking::updateOrCreate(
            ['booking_id' => 4],
            [
                'client_id' => $clientId,
                'service_id' => 2, // Repair / Check-up
                'assigned_team_id' => $teamDelta->team_id,
                'assigned_tech_id' => $arnelId,
                'lead_technician_id' => $arnelId,
                'assistant_technician_id' => null,
                'assigned_by' => $managerId,
                'assigned_at' => Carbon::now()->subDays(3),
                'scheduled_date' => Carbon::now()->subDays(2)->setTime(14, 0),
                'booking_status' => 'Completed',
                'service_payment_method' => 'GCash',
                'notes' => 'Outdoor condenser fan hums but compressor failed to start. Replaced blown starting capacitor. Turnover verified and declared complete.',
                'created_at' => Carbon::now()->subDays(4),
                'updated_at' => Carbon::now()->subDays(2),
            ]
        );

        DB::table('payment')->updateOrInsert(
            ['booking_id' => $booking4->booking_id],
            [
                'booking_price' => 1600.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 650.00,
                'amount_paid' => 2250.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'reference_number' => 'GCASH-REF-771239',
                'payment_type' => 'Full',
                'payment_date' => Carbon::now()->subDays(2)->setTime(16, 25),
                'created_at' => Carbon::now()->subDays(4),
                'updated_at' => Carbon::now()->subDays(2),
            ]
        );

        // Completed Checklist for Booking 4 (Tools returned & verified)
        $checklistCompleted = ToolChecklist::updateOrCreate(
            ['booking_id' => $booking4->booking_id],
            [
                'technician_id' => $arnelId,
                'team_id' => $teamDelta->team_id,
                'status' => 'Completed',
                'notes' => 'Service complete. Multimeter and clamp meter returned in good working condition.',
                'approved_by' => $toolsManId,
                'approved_at' => Carbon::now()->subDays(2)->subHours(4),
                'completed_by' => $toolsManId,
                'completed_at' => Carbon::now()->subDays(2)->subHours(1),
                'created_at' => Carbon::now()->subDays(2)->subHours(5),
                'updated_at' => Carbon::now()->subDays(2)->subHours(1),
            ]
        );

        ToolChecklistItem::updateOrCreate(
            ['checklist_id' => $checklistCompleted->checklist_id, 'item_id' => $itemClampMeter],
            [
                'item_type' => 'Tool',
                'quantity_requested' => 1,
                'quantity_approved' => 1,
                'status' => 'returned',
                'notes' => 'Fluke 323 True-RMS Clamp Meter inspected upon return',
            ]
        );

        // Booking 4 Consumed Spare Part (Dual Run Capacitor 35+5 uF)
        if ($itemCapacitor) {
            DB::table('booking_materials')->updateOrInsert(
                ['booking_id' => $booking4->booking_id, 'item_id' => $itemCapacitor],
                [
                    'quantity_used' => 1,
                    'logged_at' => Carbon::now()->subDays(2)->setTime(15, 30),
                ]
            );
        }

        // Service Report for Booking 4
        DB::table('service_reports')->updateOrInsert(
            ['booking_id' => $booking4->booking_id],
            [
                'technician_id' => $arnelId,
                'service_name' => 'Capacitor & PCB Board Replacement Repair',
                'diagnosis' => 'Outdoor condenser fan hums but compressor fails to start. Multimeter reading showed open circuit on starting capacitor.',
                'work_done' => 'Replaced blown 35+5 uF capacitor with genuine heavy-duty 450VAC run capacitor. Verified operating amperage at 4.2A nominal.',
                'parts_replaced' => 'Dual Run Capacitor 35+5 uF 450VAC Round (₱650.00)',
                'recommendations' => 'Ensure outdoor circuit breaker is protected against electrical power surges during thunderstorms.',
                'ac_brand' => 'Daikin Inverter',
                'ac_type' => 'Split Type 1.5HP',
                'unit_serial_number' => 'DK-INV-2026-99201',
                'job_started_at' => Carbon::now()->subDays(2)->setTime(14, 10),
                'job_completed_at' => Carbon::now()->subDays(2)->setTime(16, 15),
                'status' => 'Completed',
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ]
        );

        // Feedback & Rating for Booking 4
        DB::table('customer_feedback_and_ratings')->updateOrInsert(
            ['booking_id' => $booking4->booking_id],
            [
                'rating' => 5,
                'feedback' => 'Arnel detected the faulty capacitor immediately and replaced it on the spot! Our AC is blowing ice-cold air again with zero noise. Excellent service!',
                'submitted_at' => Carbon::now()->subDays(2)->setTime(18, 0),
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ]
        );

        // Booking 5: COMPLETED (Deep Cleaning / Preventive Maintenance Job)
        $booking5 = Booking::updateOrCreate(
            ['booking_id' => 5],
            [
                'client_id' => $clientId,
                'service_id' => 3, // Cleaning / Preventive Maintenance
                'assigned_team_id' => $teamAlpha->team_id,
                'assigned_tech_id' => $headTechId,
                'lead_technician_id' => $headTechId,
                'assistant_technician_id' => $daniloId,
                'assigned_by' => $managerId,
                'assigned_at' => Carbon::now()->subDays(7),
                'scheduled_date' => Carbon::now()->subDays(5)->setTime(10, 0),
                'booking_status' => 'Completed',
                'service_payment_method' => 'Cash',
                'notes' => 'Routine chemical deep cleaning and filter decontamination.',
                'created_at' => Carbon::now()->subDays(8),
                'updated_at' => Carbon::now()->subDays(5),
            ]
        );

        DB::table('payment')->updateOrInsert(
            ['booking_id' => $booking5->booking_id],
            [
                'booking_price' => 1800.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => 1800.00,
                'payment_status' => 'Paid',
                'payment_method' => 'Cash',
                'reference_number' => 'CASH-REC-558291',
                'payment_type' => 'Full',
                'payment_date' => Carbon::now()->subDays(5)->setTime(12, 10),
                'created_at' => Carbon::now()->subDays(8),
                'updated_at' => Carbon::now()->subDays(5),
            ]
        );

        // Service Report for Booking 5
        DB::table('service_reports')->updateOrInsert(
            ['booking_id' => $booking5->booking_id],
            [
                'technician_id' => $headTechId,
                'service_name' => 'Chemical Deep Cleaning & Hydro Wash',
                'diagnosis' => 'Heavy dust buildup on indoor blower wheel causing restricted airflow and higher power draw.',
                'work_done' => 'Applied coil chemical cleaner, hydro-washed evaporator fins and outdoor unit, treated condensate tray.',
                'parts_replaced' => 'None (General Preventive Maintenance)',
                'recommendations' => 'Wash removable mesh filters every 30 days to maintain optimal cooling efficiency.',
                'ac_brand' => 'Daikin Inverter',
                'ac_type' => 'Split Type 1.5HP',
                'unit_serial_number' => 'DK-INV-2026-99201',
                'job_started_at' => Carbon::now()->subDays(5)->setTime(10, 15),
                'job_completed_at' => Carbon::now()->subDays(5)->setTime(12, 0),
                'status' => 'Completed',
                'created_at' => Carbon::now()->subDays(5),
                'updated_at' => Carbon::now()->subDays(5),
            ]
        );

        // Feedback & Rating for Booking 5
        DB::table('customer_feedback_and_ratings')->updateOrInsert(
            ['booking_id' => $booking5->booking_id],
            [
                'rating' => 5,
                'feedback' => 'Rafael Torres was very thorough and polite. Left the room completely spotless and clean. Highly recommended squad!',
                'submitted_at' => Carbon::now()->subDays(5)->setTime(13, 30),
                'created_at' => Carbon::now()->subDays(5),
                'updated_at' => Carbon::now()->subDays(5),
            ]
        );

        // -------------------------------------------------------------
        // 9. Schedules
        // -------------------------------------------------------------
        $schedules = [
            [
                'schedule_id' => 1,
                'technician_id' => $headTechId,
                'scheduled_booking_id' => $booking5->booking_id,
                'start_time' => Carbon::now()->subDays(5)->setTime(10, 0),
                'end_time' => Carbon::now()->subDays(5)->setTime(12, 30),
            ],
            [
                'schedule_id' => 2,
                'technician_id' => $arnelId,
                'scheduled_booking_id' => $booking4->booking_id,
                'start_time' => Carbon::now()->subDays(2)->setTime(14, 0),
                'end_time' => Carbon::now()->subDays(2)->setTime(16, 30),
            ],
            [
                'schedule_id' => 3,
                'technician_id' => $daniloId,
                'scheduled_booking_id' => $booking3->booking_id,
                'start_time' => Carbon::now()->setTime(9, 0),
                'end_time' => Carbon::now()->setTime(12, 0),
            ],
            [
                'schedule_id' => 4,
                'technician_id' => $headTechId,
                'scheduled_booking_id' => $booking2->booking_id,
                'start_time' => Carbon::now()->addDays(1)->setTime(10, 30),
                'end_time' => Carbon::now()->addDays(1)->setTime(14, 30),
            ],
        ];

        foreach ($schedules as $sch) {
            DB::table('schedule')->updateOrInsert(
                ['schedule_id' => $sch['schedule_id']],
                $sch
            );
        }

        // -------------------------------------------------------------
        // 10. Sales and Records (inventory_sales)
        // -------------------------------------------------------------
        // Service Turnovers & Sales for Manager / Super Admin Sales & Records
        if (Schema::hasTable('inventory_sales')) {
            $inventorySales = [
                // Service Record 1: Booking 4 (Repair with spare parts turnover verified by Maria Garcia)
                [
                    'sale_id' => 1,
                    'booking_id' => $booking4->booking_id,
                    'payment_id' => 4,
                    'sale_type' => 'service',
                    'item_id' => null,
                    'ac_unit_id' => null,
                    'item_name' => 'Repair / Check-up',
                    'brand' => 'Daikin Inverter',
                    'model' => 'Split Type 1.5HP',
                    'serial_number' => 'DK-INV-2026-99201',
                    'sub_category' => 'Repair',
                    'item_type' => 'Service',
                    'horsepower' => '1.5 HP',
                    'quantity' => 1,
                    'unit' => 'job',
                    'cost_price' => 350.00, // Capacitor capital cost
                    'unit_price' => 2250.00, // Booking price 1,600 + Spare part 650
                    'total_amount' => 2250.00,
                    'profit' => 1250.00,
                    'payment_method' => 'GCash',
                    'payment_status' => 'Paid',
                    'client_id' => $clientId,
                    'customer_name' => 'Eduardo Mendoza',
                    'customer_contact' => '09175554321',
                    'customer_address' => 'Unit 14B High Street South Tower, Bonifacio Global City, Taguig',
                    'warranty_period' => 3,
                    'warranty_start_date' => Carbon::now()->subDays(2)->toDateString(),
                    'warranty_expiry_date' => Carbon::now()->addMonths(3)->toDateString(),
                    'warranty_status' => 'Active',
                    'sold_by' => $managerId,
                    'sold_by_name' => 'Maria Garcia',
                    'notes' => 'Service turnover verified and finalized by Manager Maria Garcia. Replaced starting capacitor.',
                    'sold_at' => Carbon::now()->subDays(2)->setTime(16, 30),
                    'created_at' => Carbon::now()->subDays(2),
                    'updated_at' => Carbon::now()->subDays(2),
                ],
                // Service Record 2: Booking 5 (Cleaning / Preventive Maintenance turnover)
                [
                    'sale_id' => 2,
                    'booking_id' => $booking5->booking_id,
                    'payment_id' => 5,
                    'sale_type' => 'service',
                    'item_id' => null,
                    'ac_unit_id' => null,
                    'item_name' => 'Cleaning / Preventive Maintenance',
                    'brand' => 'Daikin Inverter',
                    'model' => 'Split Type 1.5HP',
                    'serial_number' => 'DK-INV-2026-99201',
                    'sub_category' => 'Maintenance',
                    'item_type' => 'Service',
                    'horsepower' => '1.5 HP',
                    'quantity' => 1,
                    'unit' => 'job',
                    'cost_price' => 250.00,
                    'unit_price' => 1800.00,
                    'total_amount' => 1800.00,
                    'profit' => 1550.00,
                    'payment_method' => 'Cash',
                    'payment_status' => 'Paid',
                    'client_id' => $clientId,
                    'customer_name' => 'Eduardo Mendoza',
                    'customer_contact' => '09175554321',
                    'customer_address' => 'Unit 14B High Street South Tower, Bonifacio Global City, Taguig',
                    'warranty_period' => 1,
                    'warranty_start_date' => Carbon::now()->subDays(5)->toDateString(),
                    'warranty_expiry_date' => Carbon::now()->addMonth()->toDateString(),
                    'warranty_status' => 'Active',
                    'sold_by' => $managerId,
                    'sold_by_name' => 'Maria Garcia',
                    'notes' => 'Service turnover declared and verified by Manager Maria Garcia.',
                    'sold_at' => Carbon::now()->subDays(5)->setTime(12, 15),
                    'created_at' => Carbon::now()->subDays(5),
                    'updated_at' => Carbon::now()->subDays(5),
                ],
                // Spare Part Sale Record
                [
                    'sale_id' => 3,
                    'booking_id' => null,
                    'payment_id' => null,
                    'sale_type' => 'spare_part',
                    'item_id' => $itemRemote,
                    'ac_unit_id' => null,
                    'item_name' => 'Universal Intelligent LCD AC Remote Control',
                    'brand' => 'Universal (1000-in-1)',
                    'model' => 'K-1028E',
                    'serial_number' => null,
                    'sub_category' => 'Remote',
                    'item_type' => 'Spare Part',
                    'horsepower' => null,
                    'quantity' => 2,
                    'unit' => 'pcs',
                    'cost_price' => 220.00,
                    'unit_price' => 450.00,
                    'total_amount' => 900.00,
                    'profit' => 460.00,
                    'payment_method' => 'Cash',
                    'payment_status' => 'Paid',
                    'client_id' => null,
                    'customer_name' => 'Walk-in Client',
                    'customer_contact' => '09181112233',
                    'customer_address' => 'Makati City',
                    'warranty_period' => 6,
                    'warranty_start_date' => Carbon::now()->subDays(3)->toDateString(),
                    'warranty_expiry_date' => Carbon::now()->addMonths(6)->toDateString(),
                    'warranty_status' => 'Active',
                    'sold_by' => $managerId,
                    'sold_by_name' => 'Maria Garcia',
                    'notes' => 'Over-the-counter sale for 2 universal remotes.',
                    'sold_at' => Carbon::now()->subDays(3)->setTime(15, 30),
                    'created_at' => Carbon::now()->subDays(3),
                    'updated_at' => Carbon::now()->subDays(3),
                ],
                // AC Unit Sale Record
                [
                    'sale_id' => 4,
                    'booking_id' => null,
                    'payment_id' => null,
                    'sale_type' => 'ac_unit',
                    'item_id' => null,
                    'ac_unit_id' => 6,
                    'item_name' => 'Samsung AR24TYEAAWKN WindFree Premium Inverter',
                    'brand' => 'Samsung',
                    'model' => 'AR24TYEAAWKN',
                    'serial_number' => 'SM-WNF-2026-88219',
                    'sub_category' => 'Inverter Split',
                    'item_type' => 'AC Unit',
                    'horsepower' => '2.5 HP',
                    'quantity' => 1,
                    'unit' => 'set',
                    'cost_price' => 44000.00,
                    'unit_price' => 52900.00,
                    'total_amount' => 52900.00,
                    'profit' => 8900.00,
                    'payment_method' => 'GCash',
                    'payment_status' => 'Paid',
                    'client_id' => $clientId,
                    'customer_name' => 'Eduardo Mendoza',
                    'customer_contact' => '09175554321',
                    'customer_address' => 'Bonifacio Global City, Taguig',
                    'warranty_period' => 10,
                    'warranty_start_date' => Carbon::now()->subMonths(1)->toDateString(),
                    'warranty_expiry_date' => Carbon::now()->addYears(10)->toDateString(),
                    'warranty_status' => 'Active',
                    'sold_by' => $managerId,
                    'sold_by_name' => 'Maria Garcia',
                    'notes' => 'Direct unit purchase with 10-year manufacturer compressor warranty.',
                    'sold_at' => Carbon::now()->subMonths(1),
                    'created_at' => Carbon::now()->subMonths(1),
                    'updated_at' => Carbon::now()->subMonths(1),
                ],
            ];

            foreach ($inventorySales as $is) {
                DB::table('inventory_sales')->updateOrInsert(
                    ['sale_id' => $is['sale_id']],
                    $is
                );
            }
        }

        // -------------------------------------------------------------
        // 11. Tool Checkouts
        // -------------------------------------------------------------
        $toolCheckouts = [
            [
                'checkout_id' => 1,
                'item_id' => $itemWasher,
                'technician_id' => $headTechId,
                'checkout_date' => Carbon::now()->subDays(5)->setTime(9, 30),
                'return_date' => Carbon::now()->subDays(5)->setTime(13, 0),
                'status' => 'Returned',
            ],
            [
                'checkout_id' => 2,
                'item_id' => $itemClampMeter,
                'technician_id' => $arnelId,
                'checkout_date' => Carbon::now()->subDays(2)->setTime(13, 30),
                'return_date' => Carbon::now()->subDays(2)->setTime(17, 0),
                'status' => 'Returned',
            ],
            [
                'checkout_id' => 3,
                'item_id' => $itemVacPump,
                'technician_id' => $daniloId,
                'checkout_date' => Carbon::now()->setTime(8, 30),
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

        // -------------------------------------------------------------
        // 12. Customer Complaints (1 Resolved)
        // -------------------------------------------------------------
        DB::table('customer_complaints')->updateOrInsert(
            ['complaint_id' => 1],
            [
                'customer_id' => $clientId,
                'booking_id' => $booking4->booking_id,
                'complaint_details' => 'Technician arrived 15 minutes after the scheduled slot due to severe heavy traffic along EDSA.',
                'complaint_date' => Carbon::now()->subDays(2)->setTime(17, 0),
                'status' => 'Resolved',
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(1),
            ]
        );

        // -------------------------------------------------------------
        // 13. Documents
        // -------------------------------------------------------------
        $documents = [
            [
                'doc_id' => 1,
                'booking_id' => $booking4->booking_id,
                'created_by' => $managerId,
                'form_name' => 'Service Work Order & Repair Warranty #WO-2026-0094',
                'client_name' => 'Eduardo Mendoza',
                'service_name' => 'Capacitor & PCB Board Replacement Repair',
                'status' => 'Finalized',
                'file_path' => 'documents/work_orders/WO-2026-0094.pdf',
                'notes' => 'Signed by customer. Includes 3-month workmanship warranty on capacitor replacement.',
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ],
            [
                'doc_id' => 2,
                'booking_id' => $booking2->booking_id,
                'created_by' => $adminId,
                'form_name' => 'Installation Deed & System Quotation #INS-2026-0142',
                'client_name' => 'Eduardo Mendoza',
                'service_name' => 'Split-Type AC Full Installation',
                'status' => 'Finalized',
                'file_path' => 'documents/invoices/INS-2026-0142.pdf',
                'notes' => 'Commercial site preparation checklist verified.',
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ],
        ];

        foreach ($documents as $doc) {
            DB::table('documents')->updateOrInsert(
                ['doc_id' => $doc['doc_id']],
                $doc
            );
        }

        // -------------------------------------------------------------
        // 14. Announcements
        // -------------------------------------------------------------
        $announcements = [
            [
                'id' => 1,
                'created_by' => $adminId,
                'title' => 'Summer Peak Season Readiness & Safety Protocols',
                'message' => 'All technicians are reminded to inspect vacuum pumps, manifold gauges, and insulated safety gloves before dispatch. Stay hydrated during rooftop cooling tower and condenser inspections.',
                'target_role_id' => 5, // Technicians
                'created_at' => Carbon::now()->subDays(14),
                'updated_at' => Carbon::now()->subDays(14),
            ],
            [
                'id' => 2,
                'created_by' => $managerId,
                'title' => 'Annual Preventive Maintenance Promo for Commercial Clients',
                'message' => 'Enjoy a 15% discount on 1-year quarterly maintenance service packages booked through our customer portal throughout this quarter.',
                'target_role_id' => null, // All users
                'created_at' => Carbon::now()->subDays(7),
                'updated_at' => Carbon::now()->subDays(7),
            ],
            [
                'id' => 3,
                'created_by' => $adminId,
                'title' => 'New Inverter Diagnostic Toolkits Assigned to Tool Warehouse',
                'message' => 'New Fluke RMS clamp meters and digital manifold gauge sets have been added to the inventory. Please coordinate tool checkouts with Pedro Reyes.',
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

        // -------------------------------------------------------------
        // 15. Activity Logs (Audit Trail)
        // -------------------------------------------------------------
        $activityLogs = [
            [
                'id' => 1,
                'user_id' => $adminId,
                'action_type' => 'SYSTEM_AUTH',
                'description' => 'Super Administrator logged into the system portal from Makati Operations Head Office.',
                'created_at' => Carbon::now()->subDays(7),
                'updated_at' => Carbon::now()->subDays(7),
            ],
            [
                'id' => 2,
                'user_id' => $headTechId,
                'action_type' => 'CREATE_TEAM',
                'description' => 'Created technician squads "Alpha Cooling Squad" and "Delta AC Specialists".',
                'created_at' => Carbon::now()->subDays(6),
                'updated_at' => Carbon::now()->subDays(6),
            ],
            [
                'id' => 3,
                'user_id' => $managerId,
                'action_type' => 'ASSIGN_TEAM',
                'description' => sprintf('Manager Maria Garcia assigned Alpha Cooling Squad to Booking #%d.', $booking2->booking_id),
                'created_at' => Carbon::now()->subHours(6),
                'updated_at' => Carbon::now()->subHours(6),
            ],
            [
                'id' => 4,
                'user_id' => $toolsManId,
                'action_type' => 'APPROVE_CHECKLIST',
                'description' => sprintf('Tools Man Pedro Reyes approved Checklist #%d for Booking #%d and issued vacuum pump and gauges.', $checklistApproved->checklist_id, $booking3->booking_id),
                'created_at' => Carbon::now()->subHours(2),
                'updated_at' => Carbon::now()->subHours(2),
            ],
            [
                'id' => 5,
                'user_id' => $arnelId,
                'action_type' => 'SERVICE_REPORT_SUBMITTED',
                'description' => sprintf('Technician Arnel Castro completed repair job and submitted Service Report for Booking #%d.', $booking4->booking_id),
                'created_at' => Carbon::now()->subDays(2)->setTime(16, 20),
                'updated_at' => Carbon::now()->subDays(2)->setTime(16, 20),
            ],
            [
                'id' => 6,
                'user_id' => $managerId,
                'action_type' => 'TURNOVER_VERIFIED',
                'description' => sprintf('Manager Maria Garcia verified payment turnover of PHP 2,250.00 and declared Booking #%d completed.', $booking4->booking_id),
                'created_at' => Carbon::now()->subDays(2)->setTime(16, 30),
                'updated_at' => Carbon::now()->subDays(2)->setTime(16, 30),
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
