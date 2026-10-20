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
        if (Schema::hasColumn('users', 'is_head_technician')) {
            // First migrate any user flagged as is_head_technician = true with role_id = 5 to role_id = 7
            DB::table('users')
                ->where('role_id', 5)
                ->where('is_head_technician', true)
                ->update(['role_id' => 7]);

            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_head_technician');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('users', 'is_head_technician')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_head_technician')->default(false)->after('role_id');
            });

            DB::table('users')
                ->where('role_id', 7)
                ->update(['is_head_technician' => true]);
        }
    }
};
