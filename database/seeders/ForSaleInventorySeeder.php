<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ForSaleInventorySeeder extends Seeder
{
    /**
     * Seed For-Sale Inventory:
     * - Materials (stacked)
     * - Hand Tools & Hardware (stacked)
     * - Power Tools (on-hand only, individual serial-numbered units)
     * - Spare Parts (on-hand individual serial-numbered units + Order Base spare parts)
     */
    public function run(): void
    {
        $now = now();

        // Remove any legacy unserialized stacked For-Sale Power Tools before seeding individual serial units
        DB::table('inventory_items')
            ->where('inventory_mode', 'sale')
            ->where('item_type', 'Tool')
            ->where('tool_subtype', 'power')
            ->whereNull('serial_number')
            ->delete();

        // 1. FOR-SALE MATERIALS (item_type: Material, inventory_mode: sale)
        $materials = [
            [
                'item_name' => 'Copper Pipe Coil 1/4" x 0.028" (15m) — Retail',
                'sub_category' => 'Pipes & Copper Tubing',
                'quantity_on_hand' => 24,
                'initial_stock' => 30,
                'reorder_level' => 6,
                'unit' => 'roll',
                'capital' => 1450.00,
                'selling_price' => 1900.00,
                'supplier_name' => 'PhilMetals Supply',
            ],
            [
                'item_name' => 'Copper Pipe Coil 3/8" x 0.028" (15m) — Retail',
                'sub_category' => 'Pipes & Copper Tubing',
                'quantity_on_hand' => 18,
                'initial_stock' => 25,
                'reorder_level' => 5,
                'unit' => 'roll',
                'capital' => 2100.00,
                'selling_price' => 2750.00,
                'supplier_name' => 'PhilMetals Supply',
            ],
            [
                'item_name' => 'Armaflex Foam Insulation Tube 1/2" (2m)',
                'sub_category' => 'Insulation & Tapes',
                'quantity_on_hand' => 45,
                'initial_stock' => 60,
                'reorder_level' => 10,
                'unit' => 'pc',
                'capital' => 75.00,
                'selling_price' => 130.00,
                'supplier_name' => 'CoolWrap Insulation Co.',
            ],
            [
                'item_name' => 'Polyethylene Non-Adhesive AC Wrapping Tape (White)',
                'sub_category' => 'Insulation & Tapes',
                'quantity_on_hand' => 60,
                'initial_stock' => 80,
                'reorder_level' => 15,
                'unit' => 'roll',
                'capital' => 45.00,
                'selling_price' => 85.00,
                'supplier_name' => 'CoolWrap Insulation Co.',
            ],
            [
                'item_name' => 'AC Evaporator & Condenser Coil Cleaner (1 Gallon)',
                'sub_category' => 'Refrigerants & Chemicals',
                'quantity_on_hand' => 15,
                'initial_stock' => 20,
                'reorder_level' => 4,
                'unit' => 'gal',
                'capital' => 380.00,
                'selling_price' => 580.00,
                'supplier_name' => 'ChemCool Philippines',
            ],
            [
                'item_name' => 'Condensate Drain Pan Anti-Algae Tablets (20s)',
                'sub_category' => 'Refrigerants & Chemicals',
                'quantity_on_hand' => 28,
                'initial_stock' => 35,
                'reorder_level' => 8,
                'unit' => 'pack',
                'capital' => 190.00,
                'selling_price' => 320.00,
                'supplier_name' => 'ChemCool Philippines',
            ],
            [
                'item_name' => 'PVC Flexible Drain Hose 5/8" (20m Roll)',
                'sub_category' => 'Drainage & Fasteners',
                'quantity_on_hand' => 14,
                'initial_stock' => 20,
                'reorder_level' => 4,
                'unit' => 'roll',
                'capital' => 420.00,
                'selling_price' => 650.00,
                'supplier_name' => 'Metro Plumbing & HVAC',
            ],
            [
                'item_name' => 'Silver Brazing Alloy Rods 15% (5 Sticks Pack)',
                'sub_category' => 'Pipes & Copper Tubing',
                'quantity_on_hand' => 20,
                'initial_stock' => 25,
                'reorder_level' => 5,
                'unit' => 'pack',
                'capital' => 620.00,
                'selling_price' => 890.00,
                'supplier_name' => 'PhilMetals Supply',
            ],
        ];

        // 2. FOR-SALE HAND TOOLS & HARDWARE (item_type: Tool, tool_subtype: hand, inventory_mode: sale)
        $handTools = [
            [
                'item_name' => 'Eccentric Cone Flaring Tool Kit (1/4" - 3/4")',
                'sub_category' => 'Flaring & Swaging Tools',
                'quantity_on_hand' => 9,
                'initial_stock' => 12,
                'reorder_level' => 3,
                'unit' => 'set',
                'capital' => 1350.00,
                'selling_price' => 1890.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
            ],
            [
                'item_name' => 'Heavy-Duty Copper Tube Cutter (1/8" to 1-1/8")',
                'sub_category' => 'Cutters & Benders',
                'quantity_on_hand' => 15,
                'initial_stock' => 20,
                'reorder_level' => 4,
                'unit' => 'pc',
                'capital' => 340.00,
                'selling_price' => 520.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
            ],
            [
                'item_name' => '3-in-1 Manual Copper Tube Bender (1/4", 5/16", 3/8")',
                'sub_category' => 'Cutters & Benders',
                'quantity_on_hand' => 10,
                'initial_stock' => 12,
                'reorder_level' => 3,
                'unit' => 'pc',
                'capital' => 580.00,
                'selling_price' => 850.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
            ],
            [
                'item_name' => 'HVAC Split-Type Torque Wrench Spanner Set',
                'sub_category' => 'Wrenches & Pliers',
                'quantity_on_hand' => 6,
                'initial_stock' => 8,
                'reorder_level' => 2,
                'unit' => 'set',
                'capital' => 1950.00,
                'selling_price' => 2750.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
            ],
            [
                'item_name' => 'Heavy-Duty Powder-Coated AC Condenser Wall Bracket Pair',
                'sub_category' => 'Mounting & Hardware',
                'quantity_on_hand' => 22,
                'initial_stock' => 30,
                'reorder_level' => 6,
                'unit' => 'set',
                'capital' => 480.00,
                'selling_price' => 750.00,
                'supplier_name' => 'Metro Plumbing & HVAC',
            ],
            [
                'item_name' => 'Anti-Vibration Rubber Mounting Pads (Set of 4)',
                'sub_category' => 'Mounting & Hardware',
                'quantity_on_hand' => 30,
                'initial_stock' => 40,
                'reorder_level' => 8,
                'unit' => 'set',
                'capital' => 140.00,
                'selling_price' => 250.00,
                'supplier_name' => 'Metro Plumbing & HVAC',
            ],
        ];

        // 3. FOR-SALE POWER TOOLS (On-hand ONLY, 1 record per unique registered serial_number)
        $powerToolModels = [
            [
                'item_name' => 'Portable AC High-Pressure Cleaning Washer 1400W',
                'sub_category' => 'Pressure Washers & Cleaning',
                'unit' => 'unit',
                'capital' => 3200.00,
                'selling_price' => 4490.00,
                'supplier_name' => 'Bosch Power Tools PH',
                'serials' => ['FS-PW-1400-01', 'FS-PW-1400-02', 'FS-PW-1400-03'],
            ],
            [
                'item_name' => 'Digital Refrigerant Manifold Gauge Set (R32/R410A/R22)',
                'sub_category' => 'Electronic Testing Equipment',
                'unit' => 'set',
                'capital' => 4600.00,
                'selling_price' => 6200.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'serials' => ['FS-DMG-3201', 'FS-DMG-3202'],
            ],
            [
                'item_name' => 'Digital Clamp-On Multimeter True RMS 600A',
                'sub_category' => 'Electronic Testing Equipment',
                'unit' => 'unit',
                'capital' => 1450.00,
                'selling_price' => 2150.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'serials' => ['FS-CLM-601', 'FS-CLM-602', 'FS-CLM-603'],
            ],
            [
                'item_name' => 'Cordless 18V Brushless Hammer Drill Kit',
                'sub_category' => 'Drills & Cordless Power Tools',
                'unit' => 'set',
                'capital' => 3900.00,
                'selling_price' => 5350.00,
                'supplier_name' => 'Bosch Power Tools PH',
                'serials' => ['FS-DRL-18V-01', 'FS-DRL-18V-02'],
            ],
            [
                'item_name' => 'Single-Stage Vacuum Pump 4 CFM 1/3 HP',
                'sub_category' => 'Vacuum Pumps & Recovery',
                'unit' => 'unit',
                'capital' => 4800.00,
                'selling_price' => 6500.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'serials' => ['FS-VCP-401', 'FS-VCP-402'],
            ],
            [
                'item_name' => 'Handheld Halogen Refrigerant Leak Detector',
                'sub_category' => 'Electronic Testing Equipment',
                'unit' => 'unit',
                'capital' => 1750.00,
                'selling_price' => 2490.00,
                'supplier_name' => 'HVAC Pro Tools Philippines',
                'serials' => ['FS-LKD-901', 'FS-LKD-902'],
            ],
        ];

        // 4. FOR-SALE SPARE PARTS (On-hand serial-tracked + Order Base)
        $onHandSparePartModels = [
            [
                'item_name' => 'Carrier Inverter Compressor Capacitor 45 uF 450V',
                'sub_category' => 'Capacitors',
                'compatible_brands' => 'Carrier, Condura',
                'unit' => 'pc',
                'capital' => 420.00,
                'selling_price' => 750.00,
                'supplier_name' => 'Carrier Parts PH',
                'serials' => ['SP-CAR-CAP-001', 'SP-CAR-CAP-002', 'SP-CAR-CAP-003'],
            ],
            [
                'item_name' => 'Dual Run Capacitor 35+5 uF 450VAC Round',
                'sub_category' => 'Capacitors',
                'compatible_brands' => 'Carrier, Daikin, Panasonic, York, Gree',
                'unit' => 'pc',
                'capital' => 350.00,
                'selling_price' => 650.00,
                'supplier_name' => 'Prime Electrics Supply',
                'serials' => ['CAP-355-001', 'CAP-355-002'],
            ],
            [
                'item_name' => 'Heavy Duty 2-Pole Magnetic Contactor 25A 220V',
                'sub_category' => 'Contactors & Relays',
                'compatible_brands' => 'Carrier, York, Trane, Mitsubishi',
                'unit' => 'pc',
                'capital' => 480.00,
                'selling_price' => 850.00,
                'supplier_name' => 'Prime Electrics Supply',
                'serials' => ['CON-25A-001', 'CON-25A-002'],
            ],
            [
                'item_name' => 'Daikin Outdoor Condenser Fan Motor 30W Inverter',
                'sub_category' => 'Fan Motors',
                'compatible_brands' => 'Daikin',
                'unit' => 'unit',
                'capital' => 2600.00,
                'selling_price' => 3850.00,
                'supplier_name' => 'Daikin Genuine Parts',
                'serials' => ['SP-DK-FM-001', 'SP-DK-FM-002'],
            ],
            [
                'item_name' => 'Panasonic Split Indoor Swing Louver Stepper Motor',
                'sub_category' => 'Fan Motors',
                'compatible_brands' => 'Panasonic',
                'unit' => 'pc',
                'capital' => 520.00,
                'selling_price' => 890.00,
                'supplier_name' => 'Panasonic Service Center',
                'serials' => ['SP-PAN-SM-001', 'SP-PAN-SM-002'],
            ],
            [
                'item_name' => 'Universal Inverter Indoor & Outdoor Control PCB Kit',
                'sub_category' => 'PCBs & Controls',
                'compatible_brands' => 'Carrier, Aux, Gree, Midea, TCL, Kolin',
                'unit' => 'set',
                'capital' => 2800.00,
                'selling_price' => 4200.00,
                'supplier_name' => 'Apex HVAC Parts Trading',
                'serials' => ['PCB-UNV-7718'],
            ],
            [
                'item_name' => 'Universal Intelligent LCD AC Remote Control',
                'sub_category' => 'PCBs & Controls',
                'compatible_brands' => 'All Brands (1000 in 1 Code Base)',
                'unit' => 'pc',
                'capital' => 220.00,
                'selling_price' => 450.00,
                'supplier_name' => 'Prime Electrics Supply',
                'serials' => ['REM-LCD-001'],
            ],
            [
                'item_name' => 'Electronic Expansion Valve (EEV) 2.5HP Module',
                'sub_category' => 'Valves & Coils',
                'compatible_brands' => 'Daikin, Mitsubishi, Panasonic',
                'unit' => 'pc',
                'capital' => 1650.00,
                'selling_price' => 2500.00,
                'supplier_name' => 'Apex HVAC Parts Trading',
                'serials' => ['EEV-25-3391'],
            ],
            [
                'item_name' => 'Midea / Gree Dual Pipe Temperature Thermistor Sensor Kit',
                'sub_category' => 'Sensors & Thermistors',
                'compatible_brands' => 'Midea, Gree, Universal',
                'unit' => 'set',
                'capital' => 260.00,
                'selling_price' => 480.00,
                'supplier_name' => 'CoolParts Supply Corp',
                'serials' => ['SP-MD-SNS-001', 'SP-MD-SNS-002'],
            ],
            [
                'item_name' => '3/8" Brass Flare Filter Drier Cartridge (Hermetic)',
                'sub_category' => 'Filters & Driers',
                'compatible_brands' => 'Universal',
                'unit' => 'pc',
                'capital' => 340.00,
                'selling_price' => 590.00,
                'supplier_name' => 'CoolParts Supply Corp',
                'serials' => ['SP-FLT-001', 'SP-FLT-002'],
            ],
        ];

        $orderBaseSpareParts = [
            [
                'item_name' => 'Daikin VRV/Split Inverter Main Outdoor PCB Board 2.5HP',
                'sub_category' => 'PCBs & Controls',
                'compatible_brands' => 'Daikin',
                'serial_number' => 'OB-SP-DK-PCB-01',
                'expected_arrival' => now()->addDays(7)->toDateString(),
                'unit' => 'unit',
                'capital' => 6800.00,
                'selling_price' => 9200.00,
                'supplier_name' => 'Daikin Genuine Parts',
            ],
            [
                'item_name' => 'Carrier XPower Gold Inverter Outdoor IPM Control Board',
                'sub_category' => 'PCBs & Controls',
                'compatible_brands' => 'Carrier',
                'serial_number' => 'OB-SP-CAR-PCB-01',
                'expected_arrival' => now()->addDays(10)->toDateString(),
                'unit' => 'unit',
                'capital' => 6400.00,
                'selling_price' => 8750.00,
                'supplier_name' => 'Carrier Parts PH',
            ],
            [
                'item_name' => 'Panasonic Aero Inverter Condenser Fan Motor Assembly',
                'sub_category' => 'Fan Motors',
                'compatible_brands' => 'Panasonic',
                'serial_number' => 'OB-SP-PAN-FM-01',
                'expected_arrival' => now()->addDays(6)->toDateString(),
                'unit' => 'unit',
                'capital' => 2950.00,
                'selling_price' => 4200.00,
                'supplier_name' => 'Panasonic Service Center',
            ],
            [
                'item_name' => 'Condura 2.0HP Electronic Expansion Valve (EEV) Coil Kit',
                'sub_category' => 'Valves & Coils',
                'compatible_brands' => 'Condura, Carrier',
                'serial_number' => 'OB-SP-CON-EEV-01',
                'expected_arrival' => now()->addDays(8)->toDateString(),
                'unit' => 'set',
                'capital' => 2100.00,
                'selling_price' => 3150.00,
                'supplier_name' => 'Carrier Parts PH',
            ],
        ];

        // Upsert stacked Materials and Hand Tools
        foreach (array_merge(
            array_map(fn ($it) => array_merge($it, ['item_type' => 'Material', 'tool_subtype' => null]), $materials),
            array_map(fn ($it) => array_merge($it, ['item_type' => 'Tool', 'tool_subtype' => 'hand']), $handTools),
        ) as $item) {
            $profit = max(0, (float) $item['selling_price'] - (float) $item['capital']);
            DB::table('inventory_items')->updateOrInsert(
                ['item_name' => $item['item_name'], 'inventory_mode' => 'sale'],
                array_merge($item, [
                    'inventory_mode' => 'sale',
                    'profit' => round($profit, 2),
                    'status' => 'Available',
                    'managed_by' => 'Admin Assistant',
                    'is_archived' => false,
                    'created_at' => $now,
                    'last_updated' => $now,
                ])
            );
        }

        // Upsert individual serialized Power Tools (on-hand only)
        foreach ($powerToolModels as $model) {
            $profit = round(max(0, (float) $model['selling_price'] - (float) $model['capital']), 2);
            foreach ($model['serials'] as $serial) {
                DB::table('inventory_items')->updateOrInsert(
                    ['serial_number' => $serial],
                    [
                        'item_name' => $model['item_name'],
                        'item_type' => 'Tool',
                        'tool_subtype' => 'power',
                        'inventory_mode' => 'sale',
                        'sub_category' => $model['sub_category'],
                        'serial_number' => $serial,
                        'quantity_on_hand' => 1,
                        'initial_stock' => 1,
                        'reorder_level' => 0,
                        'unit' => $model['unit'],
                        'capital' => $model['capital'],
                        'profit' => $profit,
                        'selling_price' => $model['selling_price'],
                        'supplier_name' => $model['supplier_name'],
                        'status' => 'Available',
                        'managed_by' => 'Admin Assistant',
                        'is_archived' => false,
                        'created_at' => $now,
                        'last_updated' => $now,
                    ]
                );
            }
        }

        // Trim excess unreferenced legacy split Available Spare Parts so on-hand inventory stays clean (18 serials)
        $targetSpareSerials = collect($onHandSparePartModels)
            ->flatMap(fn ($m) => $m['serials'])
            ->values()
            ->all();

        $referencedSpareIds = collect()
            ->merge(DB::table('booking_materials')->whereNotNull('item_id')->pluck('item_id'))
            ->merge(DB::table('item_orders')->whereNotNull('item_id')->pluck('item_id'))
            ->merge(DB::table('inventory_sales')->whereNotNull('item_id')->pluck('item_id'))
            ->unique()
            ->values()
            ->all();

        // Keep any referenced row cleanly mapped to its primary target serial instead of creating duplicates
        foreach ($referencedSpareIds as $refId) {
            $refRow = DB::table('inventory_items')
                ->where('item_id', $refId)
                ->where('item_type', 'Spare Part')
                ->where('status', 'Available')
                ->first();
            if ($refRow && $refRow->item_name === 'Universal Intelligent LCD AC Remote Control') {
                DB::table('inventory_items')->where('item_id', $refId)->update([
                    'serial_number' => 'REM-LCD-001',
                    'sub_category' => 'PCBs & Controls',
                    'quantity_on_hand' => 1,
                    'initial_stock' => 1,
                    'reorder_level' => 0,
                ]);
            }
        }

        DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('status', 'Available')
            ->where('is_archived', false)
            ->where(function ($q) use ($targetSpareSerials) {
                $q->whereNull('serial_number')
                    ->orWhereNotIn('serial_number', $targetSpareSerials);
            })
            ->when(! empty($referencedSpareIds), fn ($q) => $q->whereNotIn('item_id', $referencedSpareIds))
            ->delete();

        // Upsert individual serialized On-Hand Spare Parts
        foreach ($onHandSparePartModels as $model) {
            $profit = round(max(0, (float) $model['selling_price'] - (float) $model['capital']), 2);
            foreach ($model['serials'] as $serial) {
                DB::table('inventory_items')->updateOrInsert(
                    ['serial_number' => $serial],
                    [
                        'item_name' => $model['item_name'],
                        'item_type' => 'Spare Part',
                        'tool_subtype' => null,
                        'inventory_mode' => 'sale',
                        'sub_category' => $model['sub_category'],
                        'compatible_brands' => $model['compatible_brands'],
                        'serial_number' => $serial,
                        'quantity_on_hand' => 1,
                        'initial_stock' => 1,
                        'reorder_level' => 0,
                        'unit' => $model['unit'],
                        'capital' => $model['capital'],
                        'profit' => $profit,
                        'selling_price' => $model['selling_price'],
                        'supplier_name' => $model['supplier_name'],
                        'status' => 'Available',
                        'reservation_source' => null,
                        'managed_by' => 'Admin Assistant',
                        'is_archived' => false,
                        'created_at' => $now,
                        'last_updated' => $now,
                    ]
                );
            }
        }

        // Upsert Order Base Spare Parts
        foreach ($orderBaseSpareParts as $ob) {
            $profit = round(max(0, (float) $ob['selling_price'] - (float) $ob['capital']), 2);
            DB::table('inventory_items')->updateOrInsert(
                ['serial_number' => $ob['serial_number']],
                [
                    'item_name' => $ob['item_name'],
                    'item_type' => 'Spare Part',
                    'tool_subtype' => null,
                    'inventory_mode' => 'sale',
                    'sub_category' => $ob['sub_category'],
                    'compatible_brands' => $ob['compatible_brands'],
                    'serial_number' => $ob['serial_number'],
                    'quantity_on_hand' => 0,
                    'initial_stock' => 1,
                    'reorder_level' => 0,
                    'unit' => $ob['unit'],
                    'capital' => $ob['capital'],
                    'profit' => $profit,
                    'selling_price' => $ob['selling_price'],
                    'supplier_name' => $ob['supplier_name'],
                    'expected_arrival' => $ob['expected_arrival'],
                    'status' => 'Order Base',
                    'reservation_source' => 'order_base',
                    'managed_by' => 'Admin Assistant',
                    'is_archived' => false,
                    'created_at' => $now,
                    'last_updated' => $now,
                ]
            );
        }
    }
}
