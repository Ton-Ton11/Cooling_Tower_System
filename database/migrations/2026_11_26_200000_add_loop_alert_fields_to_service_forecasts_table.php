<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('service_forecasts')) {
            return;
        }

        Schema::table('service_forecasts', function (Blueprint $table) {
            if (! Schema::hasColumn('service_forecasts', 'cycle_count')) {
                $table->unsignedInteger('cycle_count')->default(0)->after('urgency_level');
            }
            if (! Schema::hasColumn('service_forecasts', 'last_reminded_due_date')) {
                $table->date('last_reminded_due_date')->nullable()->after('cycle_count');
            }
            if (! Schema::hasColumn('service_forecasts', 'alert_acknowledged_at')) {
                $table->timestamp('alert_acknowledged_at')->nullable()->after('reminder_sent_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('service_forecasts')) {
            return;
        }

        Schema::table('service_forecasts', function (Blueprint $table) {
            $dropCols = [];
            foreach (['cycle_count', 'last_reminded_due_date', 'alert_acknowledged_at'] as $col) {
                if (Schema::hasColumn('service_forecasts', $col)) {
                    $dropCols[] = $col;
                }
            }
            if (! empty($dropCols)) {
                $table->dropColumn($dropCols);
            }
        });
    }
};
