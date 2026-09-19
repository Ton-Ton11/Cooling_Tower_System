<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_items', 'managed_by')) {
                $table->string('managed_by', 150)->nullable()->after('supplier_name');
            }
            if (! Schema::hasColumn('inventory_items', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('managed_by');
            }
            if (! Schema::hasColumn('inventory_items', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('is_archived');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_items', 'archived_at')) {
                $table->dropColumn('archived_at');
            }
            if (Schema::hasColumn('inventory_items', 'is_archived')) {
                $table->dropColumn('is_archived');
            }
            if (Schema::hasColumn('inventory_items', 'managed_by')) {
                $table->dropColumn('managed_by');
            }
        });
    }
};
