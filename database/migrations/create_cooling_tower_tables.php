<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Roles table first (users depends on it)
        Schema::create('roles', function (Blueprint $table) {
            $table->integer('role_id')->autoIncrement()->primary();
            $table->string('role_name', 50);
        });

        // Modified users table
        Schema::create('users', function (Blueprint $table) {
            $table->integer('user_id')->autoIncrement()->primary();
            $table->integer('role_id');
            $table->string('given_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->date('birthdate');
            $table->enum('sex', ['Male', 'Female']);
            $table->text('address');
            $table->string('contact_number', 15);
            $table->string('email', 150)->unique();
            $table->string('password');
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
            
            $table->foreign('role_id')->references('role_id')->on('roles');
        });

        // Password reset tokens
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Sessions table
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // Specialties table
        Schema::create('specialties', function (Blueprint $table) {
            $table->integer('specialty_id')->autoIncrement()->primary();
            $table->string('specialty_name', 50);
        });

        // Services table
        Schema::create('services', function (Blueprint $table) {
            $table->integer('service_id')->autoIncrement()->primary();
            $table->string('service_name', 100);
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2)->nullable();
        });

        // AC Units Inventory
        Schema::create('ac_units_inventory', function (Blueprint $table) {
            $table->integer('ac_unit_id')->autoIncrement()->primary();
            $table->string('brand', 100);
            $table->string('model', 100);
            $table->string('serial_number', 100)->unique();
            $table->decimal('horsepower', 3, 1);
            $table->enum('ac_type', ['Window', 'Split', 'Cassette', 'Floor Mounted', 'Ceiling Suspended']);
            $table->string('refrigerant_type', 20)->nullable();
            $table->string('supplier', 150)->nullable();
            $table->decimal('purchase_price', 10, 2);
            $table->decimal('selling_price', 10, 2)->nullable();
            $table->date('purchase_date');
            $table->integer('warranty_period');
            $table->enum('status', ['Available', 'Reserved', 'Installed', 'Order Base', 'Defect'])->default('Available');
            $table->timestamps();
        });

        // Inventory Items
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->integer('item_id')->autoIncrement()->primary();
            $table->string('item_name', 100);
            $table->enum('item_type', ['Tool', 'Material', 'Spare Part']);
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('reorder_level')->default(5);
            $table->string('unit', 20);
            $table->timestamp('last_updated')->useCurrent()->useCurrentOnUpdate();
        });

        // Technician Details (NO specialty_id - using pivot table instead)
        Schema::create('technician_details', function (Blueprint $table) {
            $table->integer('user_id')->primary();
            $table->date('certificate_expiry');
            
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // Technician Specialties Pivot Table (Many-to-Many)
        Schema::create('technician_specialty', function (Blueprint $table) {
            $table->integer('user_id');
            $table->integer('specialty_id');
            
            $table->primary(['user_id', 'specialty_id']);
            
            $table->foreign('user_id')
                  ->references('user_id')
                  ->on('technician_details')
                  ->onDelete('cascade');
                  
            $table->foreign('specialty_id')
                  ->references('specialty_id')
                  ->on('specialties')
                  ->onDelete('cascade');
        });

        // Customer Unit Details
        Schema::create('customer_unit_details', function (Blueprint $table) {
            $table->integer('user_id')->primary();
            $table->string('aircon_brand', 30);
            $table->string('aircon_type', 30);
            $table->integer('unit_quantity');
            
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // Bookings
        Schema::create('bookings', function (Blueprint $table) {
            $table->integer('booking_id')->autoIncrement()->primary();
            $table->integer('client_id');
            $table->integer('service_id');
            $table->integer('assigned_tech_id')->nullable();
            $table->dateTime('scheduled_date');
            $table->enum('booking_status', ['Pending', 'Approved', 'Dispatched', 'In-Progress', 'Completed', 'Incomplete', 'Cancelled', 'Rescheduled'])->default('Pending');
            $table->timestamp('created_at')->useCurrent();
            
            $table->foreign('client_id')->references('user_id')->on('users');
            $table->foreign('service_id')->references('service_id')->on('services');
            $table->foreign('assigned_tech_id')->references('user_id')->on('users');
        });

        // Customer Complaints
        Schema::create('customer_complaints', function (Blueprint $table) {
            $table->integer('complaint_id')->autoIncrement()->primary();
            $table->integer('customer_id');
            $table->integer('booking_id')->nullable();
            $table->text('complaint_details');
            $table->timestamp('complaint_date')->useCurrent();
            $table->enum('status', ['Pending', 'Resolved', 'Dismissed'])->default('Pending');
            
            $table->foreign('customer_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
        });

        // Customer Feedback and Ratings
        Schema::create('customer_feedback_and_ratings', function (Blueprint $table) {
            $table->integer('feedback_id')->autoIncrement()->primary();
            $table->integer('booking_id');
            $table->tinyInteger('rating');
            $table->text('feedback')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            
            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
        });

        // Payment
        Schema::create('payment', function (Blueprint $table) {
            $table->integer('payment_id')->autoIncrement()->primary();
            $table->integer('booking_id');
            $table->decimal('booking_price', 10, 2)->nullable();
            $table->decimal('unit_price', 6, 2)->nullable();
            $table->decimal('spare_parts_price', 6, 2)->nullable();
            $table->decimal('amount_paid', 10, 2);
            $table->enum('payment_status', ['Pending', 'Paid'])->default('Pending');
            $table->enum('payment_method', ['GCash', 'Cash']);
            $table->timestamp('payment_date')->useCurrent();
            
            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
        });

        // Booking Materials
        Schema::create('booking_materials', function (Blueprint $table) {
            $table->integer('usage_id')->autoIncrement()->primary();
            $table->integer('booking_id');
            $table->integer('item_id');
            $table->integer('quantity_used');
            $table->timestamp('logged_at')->useCurrent();
            
            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
            $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
        });

        // Schedule
        Schema::create('schedule', function (Blueprint $table) {
            $table->integer('schedule_id')->autoIncrement()->primary();
            $table->integer('technician_id');
            $table->integer('scheduled_booking_id');
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            
            $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('scheduled_booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
        });

        // Tool Checkouts
        Schema::create('tool_checkouts', function (Blueprint $table) {
            $table->integer('checkout_id')->autoIncrement()->primary();
            $table->integer('item_id');
            $table->integer('technician_id');
            $table->dateTime('checkout_date')->useCurrent();
            $table->dateTime('return_date')->nullable();
            $table->enum('status', ['Checked Out', 'Returned', 'Lost/Damaged'])->default('Checked Out');
            
            $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
            $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // Announcements
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->integer('created_by');
            $table->string('title');
            $table->text('message');
            $table->integer('target_role_id')->nullable();
            $table->timestamps();
            
            $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('target_role_id')->references('role_id')->on('roles')->onDelete('set null');
        });

        // Activity Logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->string('action_type');
            $table->text('description');
            $table->timestamps();
            
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('tool_checkouts');
        Schema::dropIfExists('schedule');
        Schema::dropIfExists('booking_materials');
        Schema::dropIfExists('payment');
        Schema::dropIfExists('customer_feedback_and_ratings');
        Schema::dropIfExists('customer_complaints');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('customer_unit_details');
        Schema::dropIfExists('technician_specialty');  // Drop pivot first
        Schema::dropIfExists('technician_details');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('ac_units_inventory');
        Schema::dropIfExists('services');
        Schema::dropIfExists('specialties');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};