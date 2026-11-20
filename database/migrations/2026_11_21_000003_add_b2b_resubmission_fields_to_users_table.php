<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds resubmission attempt tracking for Business Customer (B2B) verification.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'resubmission_attempts')) {
                $table->unsignedInteger('resubmission_attempts')->default(0)->after('verification_rejection_reason');
            }
            if (! Schema::hasColumn('users', 'last_resubmitted_at')) {
                $table->timestamp('last_resubmitted_at')->nullable()->after('resubmission_attempts');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('users', 'resubmission_attempts')) {
                $columnsToDrop[] = 'resubmission_attempts';
            }
            if (Schema::hasColumn('users', 'last_resubmitted_at')) {
                $columnsToDrop[] = 'last_resubmitted_at';
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
