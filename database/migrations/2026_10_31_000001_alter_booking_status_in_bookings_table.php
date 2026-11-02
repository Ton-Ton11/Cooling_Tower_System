<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE bookings MODIFY booking_status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE bookings MODIFY booking_status ENUM('Pending','Approved','Dispatched','In-Progress','Completed','Incomplete','Cancelled','Rescheduled') NOT NULL DEFAULT 'Pending'");
    }
};

