<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        try {
            DB::statement("ALTER TABLE tool_checkouts MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Checked Out'");
        } catch (\Throwable $e) {
            // Ignore if already VARCHAR
        }
    }

    public function down(): void
    {
        try {
            DB::statement("ALTER TABLE tool_checkouts MODIFY COLUMN status ENUM('Checked Out', 'Returned', 'Lost/Damaged') NOT NULL DEFAULT 'Checked Out'");
        } catch (\Throwable $e) {
            //
        }
    }
};
