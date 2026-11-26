<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inventory_items') || Schema::hasColumn('inventory_items', 'expected_arrival')) {
            return;
        }

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->date('expected_arrival')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('inventory_items') && Schema::hasColumn('inventory_items', 'expected_arrival')) {
            Schema::table('inventory_items', function (Blueprint $table) {
                $table->dropColumn('expected_arrival');
            });
        }
    }
};
