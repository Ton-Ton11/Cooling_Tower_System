<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tool_checkouts', function (Blueprint $table) {
            if (!Schema::hasColumn('tool_checkouts', 'technician_name')) {
                $table->string('technician_name', 150)->nullable()->after('technician_id');
            }
            if (!Schema::hasColumn('tool_checkouts', 'service_name')) {
                $table->string('service_name', 150)->nullable()->after('technician_name');
            }
            if (!Schema::hasColumn('tool_checkouts', 'item_name')) {
                $table->string('item_name', 150)->nullable()->after('item_id');
            }
            if (!Schema::hasColumn('tool_checkouts', 'item_type')) {
                $table->string('item_type', 50)->nullable()->default('Tool')->after('item_name');
            }
            if (!Schema::hasColumn('tool_checkouts', 'log_type')) {
                $table->string('log_type', 50)->default('borrow')->after('item_type'); // 'borrow', 'material_usage', 'return', 'damage'
            }
            if (!Schema::hasColumn('tool_checkouts', 'quantity')) {
                $table->integer('quantity')->default(1)->after('service_name');
            }
            if (!Schema::hasColumn('tool_checkouts', 'booking_id')) {
                $table->integer('booking_id')->nullable()->after('service_name');
            }
            if (!Schema::hasColumn('tool_checkouts', 'notes')) {
                $table->text('notes')->nullable()->after('status');
            }
            if (!Schema::hasColumn('tool_checkouts', 'created_at')) {
                $table->timestamps();
            }
        });

        // Allow technician_id to be nullable
        try {
            DB::statement('ALTER TABLE tool_checkouts MODIFY technician_id INT NULL');
        } catch (\Throwable $e) {
            // Ignore if already nullable or SQLite
        }
    }

    public function down(): void
    {
        Schema::table('tool_checkouts', function (Blueprint $table) {
            $table->dropColumn([
                'technician_name',
                'service_name',
                'item_name',
                'item_type',
                'log_type',
                'quantity',
                'booking_id',
                'notes',
                'created_at',
                'updated_at',
            ]);
        });
    }
};
