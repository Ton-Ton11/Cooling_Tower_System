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
        // 1. Update any existing 'Installed' status to 'Sold'
        DB::table('ac_units_inventory')
            ->where('status', 'Installed')
            ->update(['status' => 'Sold']);

        // 2. Modify `ac_type` and `status` in ac_units_inventory to varchar for full dynamic support
        Schema::table('ac_units_inventory', function (Blueprint $table) {
            $table->string('ac_type', 100)->change();
            $table->string('status', 50)->default('Available')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert columns if needed
        Schema::table('ac_units_inventory', function (Blueprint $table) {
            $table->string('ac_type', 100)->change();
            $table->string('status', 50)->default('Available')->change();
        });
    }
};
