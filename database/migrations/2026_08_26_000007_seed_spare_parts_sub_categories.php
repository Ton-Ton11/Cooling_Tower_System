<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaultCategories = [
            ['name' => 'Capacitors', 'description' => 'Running and starting capacitors for AC compressors and fans', 'display_order' => 1],
            ['name' => 'Contactors & Relays', 'description' => 'Magnetic contactors, solid-state relays, and switch gear', 'display_order' => 2],
            ['name' => 'Fan Motors', 'description' => 'Indoor blower motors, outdoor condenser fan motors, and fan blades', 'display_order' => 3],
            ['name' => 'PCBs & Controls', 'description' => 'Main control boards, display panels, and inverter driver boards', 'display_order' => 4],
            ['name' => 'Valves & Coils', 'description' => 'Expansion valves, solenoid valves, service valves, and reversing coils', 'display_order' => 5],
            ['name' => 'Sensors & Thermistors', 'description' => 'Room temperature sensors, pipe thermistors, and pressure sensors', 'display_order' => 6],
            ['name' => 'Filters & Driers', 'description' => 'Filter driers, air filters, strainers, and moisture indicators', 'display_order' => 7],
            ['name' => 'Hardware & Accessories', 'description' => 'Drain pumps, vibration isolators, copper fittings, and bracket hardware', 'display_order' => 8],
        ];

        foreach ($defaultCategories as $cat) {
            $exists = DB::table('inventory_folders')
                ->where('field_type', 'spare_parts')
                ->where('name', $cat['name'])
                ->exists();

            if (! $exists) {
                DB::table('inventory_folders')->insert([
                    'field_type' => 'spare_parts',
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'display_order' => $cat['display_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Link existing spare parts to matched categories if sub_category is null
        $capCat = DB::table('inventory_folders')->where('field_type', 'spare_parts')->where('name', 'Capacitors')->first();
        if ($capCat) {
            DB::table('inventory_items')
                ->where('item_type', 'Spare Part')
                ->whereNull('sub_category')
                ->where('item_name', 'like', '%Capacitor%')
                ->update(['folder_id' => $capCat->id, 'sub_category' => 'Capacitors']);
        }
    }

    public function down(): void
    {
        DB::table('inventory_folders')->where('field_type', 'spare_parts')->delete();
    }
};
