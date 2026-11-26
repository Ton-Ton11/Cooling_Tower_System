<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates service execution, predictive maintenance forecasting, document generation,
     * customer complaints, and feedback/ratings tables.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Service Reports
        if (! Schema::hasTable('service_reports')) {
            Schema::create('service_reports', function (Blueprint $table) {
                $table->id('report_id');
                $table->integer('booking_id');
                $table->integer('technician_id');
                $table->string('service_name', 150)->nullable();
                $table->text('diagnosis')->nullable();
                $table->text('work_done')->nullable();
                $table->text('parts_replaced')->nullable();
                $table->text('recommendations')->nullable();
                $table->string('ac_brand', 100)->nullable();
                $table->string('ac_type', 100)->nullable();
                $table->string('unit_serial_number', 100)->nullable();
                $table->dateTime('job_started_at')->nullable();
                $table->dateTime('job_completed_at')->nullable();
                $table->enum('status', ['In-Progress', 'Completed', 'Incomplete'])->default('Completed');
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
            });
        }

        // 2. Service Forecasts
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
                $table->string('urgency_level', 40)->default('Upcoming');
                $table->text('recommendation_reason')->nullable();
                $table->timestamp('reminder_sent_at')->nullable();
                $table->timestamps();
            });
        }

        // 3. Documents
        if (! Schema::hasTable('documents')) {
            Schema::create('documents', function (Blueprint $table) {
                $table->integer('doc_id')->autoIncrement();
                $table->integer('booking_id')->nullable();
                $table->integer('created_by');
                $table->string('form_name', 150);
                $table->string('client_name', 150);
                $table->string('service_name', 150)->nullable();
                $table->enum('status', ['Draft', 'Exported', 'Finalized'])->default('Draft');
                $table->string('file_path', 255)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
                $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
            });
        }

        // 4. Customer Complaints
        if (! Schema::hasTable('customer_complaints')) {
            Schema::create('customer_complaints', function (Blueprint $table) {
                $table->integer('complaint_id')->autoIncrement();
                $table->integer('customer_id');
                $table->integer('booking_id')->nullable();
                $table->text('complaint_details');
                $table->timestamp('complaint_date')->useCurrent();
                $table->enum('status', ['Pending', 'Resolved', 'Dismissed'])->default('Pending');
                $table->timestamps();

                $table->foreign('customer_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
            });
        }

        // 5. Customer Feedback & Ratings
        if (! Schema::hasTable('customer_feedback_and_ratings')) {
            Schema::create('customer_feedback_and_ratings', function (Blueprint $table) {
                $table->integer('feedback_id')->autoIncrement();
                $table->integer('booking_id');
                $table->tinyInteger('rating');
                $table->text('feedback')->nullable();
                $table->timestamp('submitted_at')->useCurrent();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('customer_feedback_and_ratings');
        Schema::dropIfExists('customer_complaints');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('service_forecasts');
        Schema::dropIfExists('service_reports');

        Schema::enableForeignKeyConstraints();
    }
};
