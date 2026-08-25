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
        Schema::table('roles', function (Blueprint $table) {
            if (! Schema::hasColumn('roles', 'description')) {
                $table->text('description')->nullable()->after('role_name');
            }
            if (! Schema::hasColumn('roles', 'is_system')) {
                $table->boolean('is_system')->default(false)->after('description');
            }
            if (! Schema::hasColumn('roles', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('is_system');
            }
            if (! Schema::hasColumn('roles', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        // Set core system roles
        DB::table('roles')->where('role_id', 1)->update([
            'description' => 'Full administrative access and security control over the entire system.',
            'is_system' => true,
            'updated_at' => now(),
        ]);

        DB::table('roles')->where('role_id', 2)->update([
            'description' => 'Booking approvals, job dispatching, technician scheduling, and operational management.',
            'is_system' => false,
            'updated_at' => now(),
        ]);

        DB::table('roles')->where('role_id', 3)->update([
            'description' => 'Staff record management, inventory coordination, and administrative assistance.',
            'is_system' => false,
            'updated_at' => now(),
        ]);

        DB::table('roles')->where('role_id', 4)->update([
            'description' => 'Warehouse tools management, inventory checkouts, and material replenishment.',
            'is_system' => false,
            'updated_at' => now(),
        ]);

        DB::table('roles')->where('role_id', 5)->update([
            'description' => 'Field airconditioning service, chemical cleaning, maintenance, diagnostics, and job completion.',
            'is_system' => false,
            'updated_at' => now(),
        ]);

        DB::table('roles')->where('role_id', 6)->update([
            'description' => 'Customer self-service portal, booking requests, payments, feedback, and complaints.',
            'is_system' => true,
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $cols = ['description', 'is_system', 'created_at', 'updated_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('roles', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
