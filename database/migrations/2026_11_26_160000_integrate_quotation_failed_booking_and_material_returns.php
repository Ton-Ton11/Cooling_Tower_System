<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'quotation_status')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->string('quotation_status', 191)->default('Pending Assessment')->change();
            });
        }

        if (Schema::hasTable('tool_checklist_items') && ! Schema::hasColumn('tool_checklist_items', 'quantity_returned')) {
            Schema::table('tool_checklist_items', function (Blueprint $table) {
                $table->integer('quantity_returned')->default(0)->after('quantity_approved');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tool_checklist_items') && Schema::hasColumn('tool_checklist_items', 'quantity_returned')) {
            Schema::table('tool_checklist_items', function (Blueprint $table) {
                $table->dropColumn('quantity_returned');
            });
        }

        if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'quotation_status')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->string('quotation_status', 50)->default('Pending Assessment')->change();
            });
        }
    }
};
