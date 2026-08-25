<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Seed default sub-categories for sale_items
        $saleCategories = [
            ['name' => 'Refrigerants & Gases', 'description' => 'Freon cylinders (R32, R410A, R134a, R22) for sale'],
            ['name' => 'Pipes & Copper Tubing', 'description' => 'Copper coils, insulated line sets, and hard copper tubes'],
            ['name' => 'Spare Parts & Electrical', 'description' => 'Capacitors, contactors, PC boards, and remote controls'],
            ['name' => 'Chemicals & Cleaning', 'description' => 'Alkaline coil cleaners, flushing agents, and sprays'],
            ['name' => 'Tools & Hardware for Sale', 'description' => 'Flaring kits, gauges, vacuum pumps, and handheld tools for retail'],
            ['name' => 'General For-Sale Items', 'description' => 'Miscellaneous HVAC accessories and consumables for clients'],
        ];

        foreach ($saleCategories as $order => $cat) {
            $existing = DB::table('inventory_folders')
                ->where('field_type', 'sale_items')
                ->where('name', $cat['name'])
                ->first();

            if (! $existing) {
                DB::table('inventory_folders')->insert([
                    'field_type' => 'sale_items',
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'display_order' => $order + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 2. Link existing sale items to their appropriate sale_items sub-category
        $saleItems = DB::table('inventory_items')->where('inventory_mode', 'sale')->get();
        foreach ($saleItems as $item) {
            $catName = 'General For-Sale Items';

            if (stripos($item->item_name, 'refrigerant') !== false || stripos($item->item_name, 'r32') !== false || stripos($item->item_name, 'r410') !== false) {
                $catName = 'Refrigerants & Gases';
            } elseif (stripos($item->item_name, 'copper') !== false || stripos($item->item_name, 'pipe') !== false) {
                $catName = 'Pipes & Copper Tubing';
            } elseif (stripos($item->item_name, 'cleaner') !== false || stripos($item->item_name, 'chemical') !== false) {
                $catName = 'Chemicals & Cleaning';
            } elseif ($item->item_type === 'Spare Part' || stripos($item->item_name, 'capacitor') !== false || stripos($item->item_name, 'pcb') !== false || stripos($item->item_name, 'remote') !== false || stripos($item->item_name, 'contactor') !== false || stripos($item->item_name, 'valve') !== false) {
                $catName = 'Spare Parts & Electrical';
            } elseif ($item->item_type === 'Tool' || stripos($item->item_name, 'tool') !== false || stripos($item->item_name, 'pump') !== false || stripos($item->item_name, 'gauge') !== false) {
                $catName = 'Tools & Hardware for Sale';
            }

            $folder = DB::table('inventory_folders')
                ->where('field_type', 'sale_items')
                ->where('name', $catName)
                ->first();

            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                'folder_id' => $folder ? $folder->id : null,
                'sub_category' => $catName,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('inventory_folders')->where('field_type', 'sale_items')->delete();
    }
};
