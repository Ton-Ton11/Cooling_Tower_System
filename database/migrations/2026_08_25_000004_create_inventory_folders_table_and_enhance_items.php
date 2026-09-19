<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create inventory_folders table
        if (! Schema::hasTable('inventory_folders')) {
            Schema::create('inventory_folders', function (Blueprint $table) {
                $table->increments('id');
                $table->string('field_type', 50)->comment('materials, power_tools, hand_tools, spare_parts, sale_items');
                $table->string('name', 100);
                $table->text('description')->nullable();
                $table->integer('display_order')->default(0);
                $table->unsignedInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        // 2. Add folder_id and sub_category to inventory_items
        Schema::table('inventory_items', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_items', 'folder_id')) {
                $table->unsignedInteger('folder_id')->nullable()->after('tool_subtype');
            }
            if (! Schema::hasColumn('inventory_items', 'sub_category')) {
                $table->string('sub_category', 100)->nullable()->after('folder_id');
            }
        });

        // 3. Seed default sub-folders for Materials
        $materialFolders = [
            ['name' => 'Pipes & Copper Tubing', 'description' => 'Copper tubes, suction lines, capillary pipes, and fittings'],
            ['name' => 'Refrigerants & Chemicals', 'description' => 'Freon gases, flushing agents, coil cleaners, and lubricants'],
            ['name' => 'Insulation & Tapes', 'description' => 'Aeroflex insulation tubes, duct tapes, and vinyl wrap'],
            ['name' => 'Electrical & Wiring', 'description' => 'Royal cords, THHN wires, terminals, and breakers'],
            ['name' => 'Drainage & Fasteners', 'description' => 'PVC drain pipes, brackets, anchors, and screws'],
            ['name' => 'General Materials', 'description' => 'General consumables and miscellaneous AC materials'],
        ];

        foreach ($materialFolders as $order => $f) {
            DB::table('inventory_folders')->insert([
                'field_type' => 'materials',
                'name' => $f['name'],
                'description' => $f['description'],
                'display_order' => $order + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 4. Seed default sub-folders for Power Tools
        $powerFolders = [
            ['name' => 'Vacuum Pumps & Recovery', 'description' => 'HVAC vacuum pumps and refrigerant recovery machines'],
            ['name' => 'Pressure Washers & Cleaning', 'description' => 'High-pressure washers and chemical spray pumps'],
            ['name' => 'Drills & Cordless Power Tools', 'description' => 'Hammer drills, impact drivers, and angle grinders'],
            ['name' => 'Electronic Testing Equipment', 'description' => 'Digital clamp meters, manifold gauges, and leak detectors'],
            ['name' => 'General Power Tools', 'description' => 'Miscellaneous powered equipment and heavy tools'],
        ];

        foreach ($powerFolders as $order => $f) {
            DB::table('inventory_folders')->insert([
                'field_type' => 'power_tools',
                'name' => $f['name'],
                'description' => $f['description'],
                'display_order' => $order + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 5. Seed default sub-folders for Hand Tools
        $handFolders = [
            ['name' => 'Flaring & Swaging Tools', 'description' => 'Eccentric flaring sets, expanders, and swaging punches'],
            ['name' => 'Wrenches & Pliers', 'description' => 'Adjustable wrenches, torque wrenches, and locking pliers'],
            ['name' => 'Cutters & Benders', 'description' => 'Tube cutters, deburrers, and spring pipe benders'],
            ['name' => 'Screwdrivers & Hex Keys', 'description' => 'Precision screwdrivers, magnetic drivers, and allen keys'],
            ['name' => 'General Hand Tools', 'description' => 'Measuring tapes, utility knives, and toolboxes'],
        ];

        foreach ($handFolders as $order => $f) {
            DB::table('inventory_folders')->insert([
                'field_type' => 'hand_tools',
                'name' => $f['name'],
                'description' => $f['description'],
                'display_order' => $order + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 6. Link existing items to default sub-folders
        $items = DB::table('inventory_items')->get();
        foreach ($items as $item) {
            $folderName = 'General Materials';
            $fieldType = 'materials';

            if ($item->item_type === 'Tool') {
                if ($item->tool_subtype === 'power') {
                    $fieldType = 'power_tools';
                    if (stripos($item->item_name, 'vacuum') !== false || stripos($item->item_name, 'recovery') !== false) {
                        $folderName = 'Vacuum Pumps & Recovery';
                    } elseif (stripos($item->item_name, 'washer') !== false || stripos($item->item_name, 'pressure') !== false) {
                        $folderName = 'Pressure Washers & Cleaning';
                    } elseif (stripos($item->item_name, 'drill') !== false) {
                        $folderName = 'Drills & Cordless Power Tools';
                    } elseif (stripos($item->item_name, 'meter') !== false || stripos($item->item_name, 'gauge') !== false) {
                        $folderName = 'Electronic Testing Equipment';
                    } else {
                        $folderName = 'General Power Tools';
                    }
                } else {
                    $fieldType = 'hand_tools';
                    if (stripos($item->item_name, 'flar') !== false || stripos($item->item_name, 'swag') !== false) {
                        $folderName = 'Flaring & Swaging Tools';
                    } elseif (stripos($item->item_name, 'wrench') !== false || stripos($item->item_name, 'plier') !== false) {
                        $folderName = 'Wrenches & Pliers';
                    } elseif (stripos($item->item_name, 'cutter') !== false || stripos($item->item_name, 'bend') !== false) {
                        $folderName = 'Cutters & Benders';
                    } elseif (stripos($item->item_name, 'driver') !== false || stripos($item->item_name, 'hex') !== false) {
                        $folderName = 'Screwdrivers & Hex Keys';
                    } else {
                        $folderName = 'General Hand Tools';
                    }
                }
            } else {
                // Material
                if (stripos($item->item_name, 'copper') !== false || stripos($item->item_name, 'pipe') !== false) {
                    $folderName = 'Pipes & Copper Tubing';
                } elseif (stripos($item->item_name, 'refrigerant') !== false || stripos($item->item_name, 'r32') !== false || stripos($item->item_name, 'r410') !== false || stripos($item->item_name, 'cleaner') !== false) {
                    $folderName = 'Refrigerants & Chemicals';
                } elseif (stripos($item->item_name, 'tape') !== false || stripos($item->item_name, 'insulation') !== false) {
                    $folderName = 'Insulation & Tapes';
                } elseif (stripos($item->item_name, 'cable') !== false || stripos($item->item_name, 'wire') !== false) {
                    $folderName = 'Electrical & Wiring';
                } elseif (stripos($item->item_name, 'drain') !== false || stripos($item->item_name, 'hose') !== false) {
                    $folderName = 'Drainage & Fasteners';
                } else {
                    $folderName = 'General Materials';
                }
            }

            $folder = DB::table('inventory_folders')
                ->where('field_type', $fieldType)
                ->where('name', $folderName)
                ->first();

            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                'folder_id' => $folder ? $folder->id : null,
                'sub_category' => $folderName,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_items', 'folder_id')) {
                $table->dropColumn('folder_id');
            }
            if (Schema::hasColumn('inventory_items', 'sub_category')) {
                $table->dropColumn('sub_category');
            }
        });

        Schema::dropIfExists('inventory_folders');
    }
};
