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
        // 1. Alter default column value for booking_fee to 50.00
        Schema::table('services', function (Blueprint $table) {
            $table->decimal('booking_fee', 10, 2)->default(50.00)->change();
        });

        // 2. Update existing services where booking_fee was 300.00 to 50.00
        DB::table('services')
            ->where('service_name', 'not like', '%Ocular%')
            ->where(function ($query) {
                $query->where('booking_fee', 300.00)
                    ->orWhereNull('booking_fee');
            })
            ->update([
                'booking_fee' => 50.00,
                'updated_at' => now(),
            ]);

        // Ensure Ocular Inspection remains free (0.00)
        DB::table('services')
            ->where('service_name', 'like', '%Ocular%')
            ->update([
                'booking_fee' => 0.00,
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->decimal('booking_fee', 10, 2)->default(300.00)->change();
        });

        DB::table('services')
            ->where('service_name', 'not like', '%Ocular%')
            ->where('booking_fee', 50.00)
            ->update([
                'booking_fee' => 300.00,
                'updated_at' => now(),
            ]);
    }
};
