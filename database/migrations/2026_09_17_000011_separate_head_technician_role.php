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
        // 1. Rename role 5 to 'Technician'
        DB::table('roles')->where('role_id', 5)->update([
            'role_name' => 'Technician',
            'is_system' => true,
        ]);

        // 2. Insert or update role 7 as 'Head Technician'
        DB::table('roles')->updateOrInsert(
            ['role_id' => 7],
            [
                'role_name' => 'Head Technician',
                'description' => 'Leads technician teams, organizes squads, and oversees field operations.',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 3. Update existing head technicians to role 7
        DB::table('users')
            ->where('is_head_technician', true)
            ->orWhere('email', 'rafael.torres@coolingtower.com')
            ->update([
                'role_id' => 7,
                'is_head_technician' => true,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert role 7 users back to role 5
        DB::table('users')->where('role_id', 7)->update([
            'role_id' => 5,
        ]);

        DB::table('roles')->where('role_id', 7)->delete();

        DB::table('roles')->where('role_id', 5)->update([
            'role_name' => 'Technician / Head Technician',
        ]);
    }
};
