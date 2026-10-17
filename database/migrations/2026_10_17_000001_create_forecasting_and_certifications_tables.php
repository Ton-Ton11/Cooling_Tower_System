<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('service_forecasts')) {
            Schema::create('service_forecasts', function (Blueprint $table) {
                $table->id('forecast_id');
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('source_booking_id')->nullable()->index();
                $table->string('source_service_name', 150);
                $table->unsignedBigInteger('recommended_service_id')->nullable();
                $table->string('recommended_service_name', 150);
                $table->string('unit_summary', 255)->nullable();
                $table->date('last_service_date');
                $table->date('predicted_due_date')->index();
                $table->integer('base_interval_days')->default(120);
                $table->integer('adjusted_interval_days')->default(120);
                $table->decimal('wear_factor', 4, 2)->default(1.00);
                $table->string('urgency_level', 40)->default('Upcoming'); // Upcoming, Due Soon, Overdue, Scheduled, Dismissed
                $table->text('recommendation_reason')->nullable();
                $table->timestamp('reminder_sent_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('technician_certifications')) {
            Schema::create('technician_certifications', function (Blueprint $table) {
                $table->id('certification_id');
                $table->unsignedBigInteger('user_id')->index();
                $table->string('certification_name', 180);
                $table->string('issuing_body', 120)->default('TESDA');
                $table->string('certificate_number', 100)->nullable();
                $table->date('issued_date');
                $table->date('expiry_date')->index();
                $table->integer('renewal_lead_days')->default(45);
                $table->string('status', 40)->default('Active'); // Active, Expiring Soon, Critical, Expired, Renewal Submitted
                $table->timestamp('last_reminded_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('technician_certifications');
        Schema::dropIfExists('service_forecasts');
    }
};
