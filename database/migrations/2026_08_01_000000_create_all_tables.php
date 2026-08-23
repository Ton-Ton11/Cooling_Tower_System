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
        Schema::disableForeignKeyConstraints();

        // 1. Cache
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->bigInteger('expiration')->index();
        });

        // 2. Cache Locks
        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->bigInteger('expiration')->index();
        });

        // 3. Sessions
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // 4. Password Reset Tokens
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // 5. Roles
        Schema::create('roles', function (Blueprint $table) {
            $table->integer('role_id')->autoIncrement();
            $table->string('role_name', 50);
        });

        // 6. Services
        Schema::create('services', function (Blueprint $table) {
            $table->integer('service_id')->autoIncrement();
            $table->string('service_name', 100);
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2)->nullable();
        });

        // 7. Specialties
        Schema::create('specialties', function (Blueprint $table) {
            $table->integer('specialty_id')->autoIncrement();
            $table->string('specialty_name', 50);
        });

        // 8. Inventory Items
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->integer('item_id')->autoIncrement();
            $table->string('item_name', 100);
            $table->enum('item_type', ['Tool', 'Material', 'Spare Part']);
            $table->string('inventory_mode')->default('worker')->comment('worker or sale');
            $table->string('tool_subtype')->nullable()->comment('power or hand (only for tools)');
            $table->text('compatible_brands')->nullable()->comment('Compatible AC brands for spare parts');
            $table->string('serial_number')->nullable()->unique()->comment('Serial number for power tools');
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('initial_stock')->nullable()->comment('Total stock count for reference');
            $table->integer('reorder_level')->default(5);
            $table->string('unit', 20);
            $table->decimal('capital', 12, 2)->default(0)->comment('Cost price for sale items');
            $table->decimal('profit', 12, 2)->default(0)->comment('Profit margin for sale items');
            $table->decimal('selling_price', 12, 2)->nullable()->comment('Selling price for spare parts and items for sale');
            $table->string('supplier_name')->nullable()->comment('Supplier for sale items');
            $table->string('status')->default('Available')->comment('Available, Borrowed, Lost/Damaged');
            $table->timestamp('last_updated')->useCurrent()->useCurrentOnUpdate();
            $table->timestamp('created_at')->nullable()->comment('When the item was created');
        });

        // 9. AC Units Inventory
        Schema::create('ac_units_inventory', function (Blueprint $table) {
            $table->integer('ac_unit_id')->autoIncrement();
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
            $table->enum('status', ['Available', 'Reserved', 'Installed', 'Order Base', 'Defect', 'Sold'])->default('Available');
            $table->date('expected_arrival')->nullable();
            $table->timestamps();
        });

        // 10. Users
        Schema::create('users', function (Blueprint $table) {
            $table->integer('user_id')->autoIncrement();
            $table->integer('role_id');
            $table->string('given_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->date('birthdate');
            $table->enum('sex', ['Male', 'Female']);
            $table->text('address');
            $table->string('contact_number', 15);
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->timestamp('email_verified_at')->nullable();
            $table->string('remember_token', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->boolean('is_active')->default(1)->nullable();

            $table->foreign('role_id')->references('role_id')->on('roles');
        });

        // 11. Activity Logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->string('action_type', 255);
            $table->text('description');
            $table->timestamps();

            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // 12. Announcements
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->integer('created_by');
            $table->string('title', 255);
            $table->text('message');
            $table->integer('target_role_id')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('target_role_id')->references('role_id')->on('roles')->onDelete('set null');
        });

        // 13. Bookings
        Schema::create('bookings', function (Blueprint $table) {
            $table->integer('booking_id')->autoIncrement();
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

        // 14. Booking Materials
        Schema::create('booking_materials', function (Blueprint $table) {
            $table->integer('usage_id')->autoIncrement();
            $table->integer('booking_id');
            $table->integer('item_id');
            $table->integer('quantity_used');
            $table->timestamp('logged_at')->useCurrent();

            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
            $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
        });

        // 15. Customer Complaints
        Schema::create('customer_complaints', function (Blueprint $table) {
            $table->integer('complaint_id')->autoIncrement();
            $table->integer('customer_id');
            $table->integer('booking_id')->nullable();
            $table->text('complaint_details');
            $table->timestamp('complaint_date')->useCurrent();
            $table->enum('status', ['Pending', 'Resolved', 'Dismissed'])->default('Pending');

            $table->foreign('customer_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
        });

        // 16. Customer Feedback & Ratings
        Schema::create('customer_feedback_and_ratings', function (Blueprint $table) {
            $table->integer('feedback_id')->autoIncrement();
            $table->integer('booking_id');
            $table->tinyInteger('rating');
            $table->text('feedback')->nullable();
            $table->timestamp('submitted_at')->useCurrent();

            $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
        });

        // 17. Customer Unit Details
        Schema::create('customer_unit_details', function (Blueprint $table) {
            $table->integer('user_id')->primary();
            $table->string('aircon_brand', 30);
            $table->string('aircon_type', 30);
            $table->integer('unit_quantity');

            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // 18. Documents
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

        // 19. Payment
        Schema::create('payment', function (Blueprint $table) {
            $table->integer('payment_id')->autoIncrement();
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

        // 20. Schedule
        Schema::create('schedule', function (Blueprint $table) {
            $table->integer('schedule_id')->autoIncrement();
            $table->integer('technician_id');
            $table->integer('scheduled_booking_id');
            $table->dateTime('start_time');
            $table->dateTime('end_time');

            $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('scheduled_booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
        });

        // 21. Technician Details
        Schema::create('technician_details', function (Blueprint $table) {
            $table->integer('user_id')->primary();
            $table->date('certificate_expiry');

            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // 22. Technician Specialty
        Schema::create('technician_specialty', function (Blueprint $table) {
            $table->integer('user_id');
            $table->integer('specialty_id');
            $table->primary(['user_id', 'specialty_id']);

            $table->foreign('user_id')->references('user_id')->on('technician_details')->onDelete('cascade');
            $table->foreign('specialty_id')->references('specialty_id')->on('specialties')->onDelete('cascade');
        });

        // 23. Tool Checkouts
        Schema::create('tool_checkouts', function (Blueprint $table) {
            $table->integer('checkout_id')->autoIncrement();
            $table->integer('item_id');
            $table->integer('technician_id');
            $table->dateTime('checkout_date')->useCurrent();
            $table->dateTime('return_date')->nullable();
            $table->enum('status', ['Checked Out', 'Returned', 'Lost/Damaged'])->default('Checked Out');

            $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
            $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
        });

        // 24. Service Reports
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

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        $tables = [
            'service_reports', 'tool_checkouts', 'technician_specialty', 'technician_details', 'schedule',
            'payment', 'documents', 'customer_unit_details', 'customer_feedback_and_ratings',
            'customer_complaints', 'booking_materials', 'bookings', 'announcements',
            'activity_logs', 'users', 'ac_units_inventory', 'inventory_items',
            'specialties', 'services', 'roles', 'password_reset_tokens', 'sessions',
            'cache_locks', 'cache'
        ];

        foreach ($tables as $table) {
            Schema::dropIfExists($table);
        }

        Schema::enableForeignKeyConstraints();
    }
};
