<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Updates the Super Admin account name to Georgita K. Apostol.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            DB::table('users')
                ->where('role_id', 1)
                ->update([
                    'given_name' => 'Georgita',
                    'middle_name' => 'K.',
                    'last_name' => 'Apostol',
                    'updated_at' => now(),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users')) {
            DB::table('users')
                ->where('role_id', 1)
                ->where('email', 'super.admin@coolingtower.com')
                ->update([
                    'given_name' => 'Super',
                    'middle_name' => 'Admin',
                    'last_name' => 'User',
                    'updated_at' => now(),
                ]);
        }
    }
};
