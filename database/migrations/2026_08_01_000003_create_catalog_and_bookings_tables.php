<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates catalog tables (unit_types, brands, services) and booking/payment/scheduling tables
     * (customer_unit_details, bookings, schedule, payment, reschedule_bookings).
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Unit Types
        if (! Schema::hasTable('unit_types')) {
            Schema::create('unit_types', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->string('code', 50)->unique();
                $table->text('icon')->nullable();
                $table->text('description')->nullable();
                $table->integer('display_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        $defaultUnitTypes = [
            [
                'name' => 'Split-Type (Wall Mounted)',
                'code' => 'Split',
                'icon' => 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
                'description' => 'Standard wall-mounted split-system indoor and outdoor units for homes and offices.',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Window-Type',
                'code' => 'Window',
                'icon' => 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
                'description' => 'Single packaged unit fitted in standard window openings or wall sleeves.',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Ceiling Cassette',
                'code' => 'Cassette',
                'icon' => 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
                'description' => 'Flush ceiling-mounted commercial units providing 360-degree or 4-way airflow.',
                'display_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Floor Mounted Tower',
                'code' => 'Floor Mounted',
                'icon' => 'M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
                'description' => 'Standing column units designed for high-capacity cooling in spacious venues.',
                'display_order' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Ceiling Suspended',
                'code' => 'Ceiling Suspended',
                'icon' => 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8',
                'description' => 'Under-ceiling hanging units suitable for buildings without false ceiling space.',
                'display_order' => 5,
                'is_active' => true,
            ],
        ];

        foreach ($defaultUnitTypes as $ut) {
            DB::table('unit_types')->updateOrInsert(
                ['code' => $ut['code']],
                array_merge($ut, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 2. Brands
        if (! Schema::hasTable('brands')) {
            Schema::create('brands', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100)->unique();
                $table->string('country_of_origin', 100)->nullable();
                $table->text('description')->nullable();
                $table->string('logo_url', 255)->nullable();
                $table->integer('display_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        $defaultBrands = [
            ['name' => 'Carrier', 'country_of_origin' => 'USA', 'description' => 'Global leader in heating and AC solutions.', 'display_order' => 1, 'is_active' => true],
            ['name' => 'Daikin', 'country_of_origin' => 'Japan', 'description' => 'Premium Japanese inverter airconditioning technology.', 'display_order' => 2, 'is_active' => true],
            ['name' => 'Panasonic', 'country_of_origin' => 'Japan', 'description' => 'Nanoe-X air purification and energy-saving inverter ACs.', 'display_order' => 3, 'is_active' => true],
            ['name' => 'LG', 'country_of_origin' => 'South Korea', 'description' => 'Dual Inverter smart cooling with ThinQ tech.', 'display_order' => 4, 'is_active' => true],
            ['name' => 'Mitsubishi', 'country_of_origin' => 'Japan', 'description' => 'Heavy-duty and quiet cooling solutions.', 'display_order' => 5, 'is_active' => true],
            ['name' => 'Samsung', 'country_of_origin' => 'South Korea', 'description' => 'WindFree cooling and digital inverter systems.', 'display_order' => 6, 'is_active' => true],
            ['name' => 'Midea', 'country_of_origin' => 'China', 'description' => 'Affordable and reliable cooling appliances.', 'display_order' => 7, 'is_active' => true],
            ['name' => 'Kolin', 'country_of_origin' => 'Philippines', 'description' => 'Trusted cooling manufactured for Philippine climate.', 'display_order' => 8, 'is_active' => true],
            ['name' => 'York', 'country_of_origin' => 'USA', 'description' => 'Commercial and residential HVAC systems.', 'display_order' => 9, 'is_active' => true],
            ['name' => 'Haier', 'country_of_origin' => 'China', 'description' => 'Self-cleaning inverter and window units.', 'display_order' => 10, 'is_active' => true],
            ['name' => 'AUX', 'country_of_origin' => 'China', 'description' => 'Modern eco-friendly split and window units.', 'display_order' => 11, 'is_active' => true],
            ['name' => 'Everest', 'country_of_origin' => 'Philippines', 'description' => 'Durable and cost-effective cooling.', 'display_order' => 12, 'is_active' => true],
            ['name' => 'Other Brand', 'country_of_origin' => null, 'description' => 'Any other airconditioner manufacturer.', 'display_order' => 99, 'is_active' => true],
        ];

        foreach ($defaultBrands as $brand) {
            DB::table('brands')->updateOrInsert(
                ['name' => $brand['name']],
                array_merge($brand, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 3. Services
        if (! Schema::hasTable('services')) {
            Schema::create('services', function (Blueprint $table) {
                $table->integer('service_id')->autoIncrement();
                $table->string('service_name', 100);
                $table->text('description')->nullable();
                $table->decimal('base_price', 10, 2)->nullable();
                $table->boolean('is_active')->default(true);
                $table->string('category', 50)->nullable();
                $table->integer('display_order')->default(0);
                $table->timestamps();
            });
        }

        $primaryServices = [
            [
                'service_name' => 'Installation',
                'description' => 'For new air-conditioning unit installation, replacement, or relocation.',
                'base_price' => 0.00,
                'category' => 'Installation',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'service_name' => 'Repair / Check-up',
                'description' => 'For air-conditioning problems, troubleshooting, inspection, diagnosis, and repair requests.',
                'base_price' => 0.00,
                'category' => 'Repair',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'service_name' => 'Cleaning / Preventive Maintenance',
                'description' => 'For regular cleaning, deep cleaning, and preventive maintenance of your air-conditioning unit.',
                'base_price' => 0.00,
                'category' => 'Maintenance',
                'display_order' => 3,
                'is_active' => true,
            ],
        ];

        foreach ($primaryServices as $ps) {
            DB::table('services')->updateOrInsert(
                ['service_name' => $ps['service_name']],
                array_merge($ps, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 4. Customer Unit Details
        if (! Schema::hasTable('customer_unit_details')) {
            Schema::create('customer_unit_details', function (Blueprint $table) {
                $table->integer('user_id')->primary();
                $table->string('aircon_brand', 30);
                $table->string('aircon_type', 30);
                $table->integer('unit_quantity');

                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            });
        }

        // 5. Bookings
        if (! Schema::hasTable('bookings')) {
            Schema::create('bookings', function (Blueprint $table) {
                $table->integer('booking_id')->autoIncrement();
                $table->integer('client_id');
                $table->integer('service_id');
                $table->integer('assigned_tech_id')->nullable();
                $table->integer('lead_technician_id')->nullable();
                $table->integer('assistant_technician_id')->nullable();
                $table->timestamp('assigned_at')->nullable();
                $table->integer('assigned_team_id')->nullable();
                $table->integer('assigned_by')->nullable();
                $table->dateTime('scheduled_date');
                $table->enum('booking_status', [
                    'Pending',
                    'Approved',
                    'Dispatched',
                    'In-Progress',
                    'Completed',
                    'Incomplete',
                    'Cancelled',
                    'Rescheduled',
                ])->default('Pending');
                $table->text('cancellation_reason')->nullable();
                $table->string('service_payment_method', 50)->nullable()->default('Cash');
                $table->text('notes')->nullable();
                $table->json('units_data')->nullable();
                $table->json('service_details')->nullable();
                $table->string('alternative_schedule', 100)->nullable();
                $table->string('quotation_status', 50)->default('Pending Assessment');
                $table->json('quotation_data')->nullable();
                $table->string('service_order_status', 50)->default('Pending Quotation');
                $table->json('soa_data')->nullable();
                $table->boolean('policy_acknowledged')->default(true);
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->nullable();

                $table->foreign('client_id')->references('user_id')->on('users');
                $table->foreign('service_id')->references('service_id')->on('services');
                $table->foreign('assigned_tech_id')->references('user_id')->on('users');
                $table->foreign('lead_technician_id')->references('user_id')->on('users')->onDelete('set null');
                $table->foreign('assistant_technician_id')->references('user_id')->on('users')->onDelete('set null');
                $table->foreign('assigned_team_id')->references('team_id')->on('technician_teams')->onDelete('set null');
                $table->foreign('assigned_by')->references('user_id')->on('users')->onDelete('set null');
            });
        }

        // 6. Schedule
        if (! Schema::hasTable('schedule')) {
            Schema::create('schedule', function (Blueprint $table) {
                $table->integer('schedule_id')->autoIncrement();
                $table->integer('technician_id');
                $table->integer('scheduled_booking_id');
                $table->dateTime('start_time');
                $table->dateTime('end_time');

                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('scheduled_booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
            });
        }

        // 7. Payment
        if (! Schema::hasTable('payment')) {
            Schema::create('payment', function (Blueprint $table) {
                $table->integer('payment_id')->autoIncrement();
                $table->integer('booking_id');
                $table->decimal('booking_price', 12, 2)->nullable()->default(0.00);
                $table->decimal('unit_price', 12, 2)->nullable()->default(0.00);
                $table->decimal('spare_parts_price', 12, 2)->nullable()->default(0.00);
                $table->decimal('amount_paid', 12, 2)->nullable()->default(0.00);
                $table->string('payment_status', 30)->default('Paid');
                $table->string('payment_method', 50)->default('Cash');
                $table->string('reference_number', 100)->nullable();
                $table->string('payment_type', 50)->default('Booking Fee');
                $table->string('sender_name', 150)->nullable();
                $table->string('sender_number', 50)->nullable();
                $table->string('receipt_image', 255)->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('payment_date')->useCurrent();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
            });
        }

        // 8. Reschedule Bookings
        if (! Schema::hasTable('reschedule_bookings')) {
            Schema::create('reschedule_bookings', function (Blueprint $table) {
                $table->integer('reschedule_id')->autoIncrement();
                $table->integer('booking_id');
                $table->integer('client_id');
                $table->integer('schedule_id')->nullable();
                $table->dateTime('previous_scheduled_date');
                $table->dateTime('new_scheduled_date');
                $table->text('reschedule_reason')->nullable();
                $table->decimal('reschedule_fee', 10, 2)->default(150.00);
                $table->integer('payment_id')->nullable();
                $table->enum('status', ['Pending', 'Approved', 'Rejected', 'Cancelled'])->default('Pending');
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
                $table->foreign('client_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('schedule_id')->references('schedule_id')->on('schedule')->onDelete('set null');
                $table->foreign('payment_id')->references('payment_id')->on('payment')->onDelete('set null');
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

        Schema::dropIfExists('reschedule_bookings');
        Schema::dropIfExists('payment');
        Schema::dropIfExists('schedule');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('customer_unit_details');
        Schema::dropIfExists('services');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('unit_types');

        Schema::enableForeignKeyConstraints();
    }
};
