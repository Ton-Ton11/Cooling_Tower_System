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
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'lead_technician_id')) {
                $table->integer('lead_technician_id')->nullable()->after('assigned_tech_id');
                $table->foreign('lead_technician_id')->references('user_id')->on('users')->onDelete('set null');
            }

            if (! Schema::hasColumn('bookings', 'assistant_technician_id')) {
                $table->integer('assistant_technician_id')->nullable()->after('lead_technician_id');
                $table->foreign('assistant_technician_id')->references('user_id')->on('users')->onDelete('set null');
            }

            if (! Schema::hasColumn('bookings', 'assigned_at')) {
                $table->timestamp('assigned_at')->nullable()->after('assistant_technician_id');
            }
        });

        // Backfill existing assigned bookings where lead_technician_id is null
        DB::table('bookings')
            ->whereNotNull('assigned_tech_id')
            ->whereNull('lead_technician_id')
            ->update([
                'lead_technician_id' => DB::raw('assigned_tech_id'),
                'assigned_at' => DB::raw('created_at'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'assistant_technician_id')) {
                $table->dropForeign(['assistant_technician_id']);
                $table->dropColumn('assistant_technician_id');
            }

            if (Schema::hasColumn('bookings', 'lead_technician_id')) {
                $table->dropForeign(['lead_technician_id']);
                $table->dropColumn('lead_technician_id');
            }

            if (Schema::hasColumn('bookings', 'assigned_at')) {
                $table->dropColumn('assigned_at');
            }
        });
    }
};
