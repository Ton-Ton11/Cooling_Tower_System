<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds Business Customer (B2B) registration and anti-impersonation verification fields to users.
     */
    public function up(): void
    {
        // Allow birthdate and sex to be nullable for frictionless B2B representative registration
        try {
            DB::statement("ALTER TABLE users MODIFY birthdate DATE NULL, MODIFY sex ENUM('Male', 'Female') NULL");
        } catch (\Throwable $e) {
            // Ignore if DB driver does not support MODIFY ENUM syntax
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'account_type')) {
                $table->string('account_type', 30)->default('individual')->after('role_id')->index();
            }
            if (! Schema::hasColumn('users', 'company_name')) {
                $table->string('company_name', 255)->nullable()->after('account_type');
            }
            if (! Schema::hasColumn('users', 'representative_role')) {
                $table->string('representative_role', 150)->nullable()->after('company_name');
            }
            if (! Schema::hasColumn('users', 'tin')) {
                $table->string('tin', 50)->nullable()->unique()->after('representative_role');
            }
            if (! Schema::hasColumn('users', 'business_permit_path')) {
                $table->string('business_permit_path', 500)->nullable()->after('tin');
            }
            if (! Schema::hasColumn('users', 'verification_status')) {
                $table->string('verification_status', 30)->default('approved')->after('business_permit_path')->index();
            }
            if (! Schema::hasColumn('users', 'verification_rejection_reason')) {
                $table->text('verification_rejection_reason')->nullable()->after('verification_status');
            }
            if (! Schema::hasColumn('users', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('verification_rejection_reason');
            }
            if (! Schema::hasColumn('users', 'verified_by')) {
                $table->integer('verified_by')->nullable()->after('verified_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'tin')) {
                try {
                    $table->dropUnique(['tin']);
                } catch (\Throwable $e) {
                    // Index may already be dropped
                }
            }

            $columnsToDrop = [];
            foreach ([
                'account_type',
                'company_name',
                'representative_role',
                'tin',
                'business_permit_path',
                'verification_status',
                'verification_rejection_reason',
                'verified_at',
                'verified_by',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
