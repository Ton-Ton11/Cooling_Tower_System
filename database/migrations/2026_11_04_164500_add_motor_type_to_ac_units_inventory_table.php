<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ac_units_inventory') && ! Schema::hasColumn('ac_units_inventory', 'motor_type')) {
            Schema::table('ac_units_inventory', function (Blueprint $table) {
                $table->string('motor_type', 30)->default('Inverter')->after('ac_type');
            });
        }

        if (Schema::hasTable('inventory_sales') && ! Schema::hasColumn('inventory_sales', 'motor_type')) {
            Schema::table('inventory_sales', function (Blueprint $table) {
                $table->string('motor_type', 30)->nullable()->after('sub_category');
            });
        }

        if (Schema::hasTable('ac_units_inventory') && Schema::hasColumn('ac_units_inventory', 'motor_type')) {
            $units = DB::table('ac_units_inventory')->get();
            foreach ($units as $unit) {
                $modelLower = strtolower((string) ($unit->model ?? ''));
                $refrigUpper = strtoupper((string) ($unit->refrigerant_type ?? ''));
                $current = trim((string) ($unit->motor_type ?? ''));

                if (in_array($current, ['Inverter', 'Non-Inverter'], true)) {
                    $resolved = $current;
                } elseif (
                    str_contains($modelLower, 'non-inverter') ||
                    str_contains($modelLower, 'non inverter') ||
                    str_contains($modelLower, 'standard') ||
                    $refrigUpper === 'R22'
                ) {
                    $resolved = 'Non-Inverter';
                } else {
                    $resolved = 'Inverter';
                }

                DB::table('ac_units_inventory')
                    ->where('ac_unit_id', $unit->ac_unit_id)
                    ->update(['motor_type' => $resolved]);

                if (Schema::hasTable('inventory_sales') && Schema::hasColumn('inventory_sales', 'motor_type')) {
                    DB::table('inventory_sales')
                        ->where('sale_type', 'ac_unit')
                        ->where('ac_unit_id', $unit->ac_unit_id)
                        ->whereNull('motor_type')
                        ->update(['motor_type' => $resolved]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('inventory_sales') && Schema::hasColumn('inventory_sales', 'motor_type')) {
            Schema::table('inventory_sales', function (Blueprint $table) {
                $table->dropColumn('motor_type');
            });
        }

        if (Schema::hasTable('ac_units_inventory') && Schema::hasColumn('ac_units_inventory', 'motor_type')) {
            Schema::table('ac_units_inventory', function (Blueprint $table) {
                $table->dropColumn('motor_type');
            });
        }
    }
};

