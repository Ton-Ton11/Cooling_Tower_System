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
        // 0. Enhance Users table contact_number length
        Schema::table('users', function (Blueprint $table) {
            $table->string('contact_number', 50)->change();
        });

        // 1. Enhance Bookings table
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('booking_status');
            }
            if (! Schema::hasColumn('bookings', 'service_payment_method')) {
                $table->string('service_payment_method', 50)->nullable()->default('Cash')->after('cancellation_reason');
            }
            if (! Schema::hasColumn('bookings', 'notes')) {
                $table->text('notes')->nullable()->after('service_payment_method');
            }
            if (! Schema::hasColumn('bookings', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        // 2. Enhance Payment table
        Schema::table('payment', function (Blueprint $table) {
            if (! Schema::hasColumn('payment', 'reference_number')) {
                $table->string('reference_number', 100)->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('payment', 'payment_type')) {
                $table->string('payment_type', 50)->default('Booking Fee')->after('reference_number');
            }
            if (! Schema::hasColumn('payment', 'sender_name')) {
                $table->string('sender_name', 150)->nullable()->after('payment_type');
            }
            if (! Schema::hasColumn('payment', 'sender_number')) {
                $table->string('sender_number', 50)->nullable()->after('sender_name');
            }
            if (! Schema::hasColumn('payment', 'receipt_image')) {
                $table->string('receipt_image', 255)->nullable()->after('sender_number');
            }
            if (! Schema::hasColumn('payment', 'notes')) {
                $table->text('notes')->nullable()->after('receipt_image');
            }
            if (! Schema::hasColumn('payment', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('payment_date');
            }
            if (! Schema::hasColumn('payment', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        // 3. Enhance Feedback table
        Schema::table('customer_feedback_and_ratings', function (Blueprint $table) {
            if (! Schema::hasColumn('customer_feedback_and_ratings', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('submitted_at');
            }
            if (! Schema::hasColumn('customer_feedback_and_ratings', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        // 4. Enhance Complaints table
        Schema::table('customer_complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('customer_complaints', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('customer_complaints', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $cols = ['cancellation_reason', 'service_payment_method', 'notes', 'updated_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('bookings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('payment', function (Blueprint $table) {
            $cols = ['reference_number', 'payment_type', 'sender_name', 'sender_number', 'receipt_image', 'notes', 'created_at', 'updated_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('payment', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('customer_feedback_and_ratings', function (Blueprint $table) {
            $cols = ['created_at', 'updated_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('customer_feedback_and_ratings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('customer_complaints', function (Blueprint $table) {
            $cols = ['created_at', 'updated_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('customer_complaints', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
