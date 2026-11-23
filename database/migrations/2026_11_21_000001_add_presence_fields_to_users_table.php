<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_online')) {
                $table->boolean('is_online')->default(false)->after('is_active');
            }
            if (! Schema::hasColumn('users', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('is_online');
            }
            if (! Schema::hasColumn('users', 'hide_active_status')) {
                $table->boolean('hide_active_status')->default(false)->after('last_seen_at');
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
            if (Schema::hasColumn('users', 'is_online')) {
                $columnsToDrop[] = 'is_online';
            }
            if (Schema::hasColumn('users', 'last_seen_at')) {
                $columnsToDrop[] = 'last_seen_at';
            }
            if (Schema::hasColumn('users', 'hide_active_status')) {
                $columnsToDrop[] = 'hide_active_status';
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
