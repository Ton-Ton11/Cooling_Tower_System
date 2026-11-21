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
        // 1. Update the default value in booking_settings table
        if (Schema::hasTable('booking_settings')) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => 'reschedule_fee'],
                ['value' => '50.00', 'updated_at' => now()]
            );
        }

        // 2. Update default column value for reschedule_bookings table
        if (Schema::hasTable('reschedule_bookings') && Schema::hasColumn('reschedule_bookings', 'reschedule_fee')) {
            Schema::table('reschedule_bookings', function (Blueprint $table) {
                $table->decimal('reschedule_fee', 10, 2)->default(50.00)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('booking_settings')) {
            DB::table('booking_settings')->where('key', 'reschedule_fee')->update([
                'value' => '150.00',
                'updated_at' => now(),
            ]);
        }

        if (Schema::hasTable('reschedule_bookings') && Schema::hasColumn('reschedule_bookings', 'reschedule_fee')) {
            Schema::table('reschedule_bookings', function (Blueprint $table) {
                $table->decimal('reschedule_fee', 10, 2)->default(150.00)->change();
            });
        }
    }
};
