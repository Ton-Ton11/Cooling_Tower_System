<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Add image_path to ac_units_inventory so Admin Assistant can manage unit pictures
        if (Schema::hasTable('ac_units_inventory') && ! Schema::hasColumn('ac_units_inventory', 'image_path')) {
            Schema::table('ac_units_inventory', function (Blueprint $table) {
                $table->string('image_path', 255)->nullable()->after('model');
            });
        }

        // 2. Seed / ensure Ocular Inspection service exists (service_id = 4 if available, free booking fee)
        if (Schema::hasTable('services')) {
            $existingByName = DB::table('services')
                ->where('service_name', 'Ocular Inspection')
                ->first();

            if ($existingByName) {
                DB::table('services')
                    ->where('service_id', $existingByName->service_id)
                    ->update([
                        'description' => 'Free site and room thermal load inspection with AC unit recommendations for customers planning to buy and install AC units.',
                        'base_price' => 0.00,
                        'category' => 'Ocular Inspection',
                        'display_order' => 4,
                        'is_active' => true,
                        'updated_at' => now(),
                    ]);
            } else {
                $idFourExists = DB::table('services')->where('service_id', 4)->exists();
                $payload = [
                    'service_name' => 'Ocular Inspection',
                    'description' => 'Free site and room thermal load inspection with AC unit recommendations for customers planning to buy and install AC units.',
                    'base_price' => 0.00,
                    'category' => 'Ocular Inspection',
                    'display_order' => 4,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (! $idFourExists) {
                    $payload['service_id'] = 4;
                }
                DB::table('services')->insert($payload);
            }
        }

        // 3. Room Dimensions & Thermal Load (The Capacity Data) per inspected room
        if (! Schema::hasTable('ocular_inspection_rooms')) {
            Schema::create('ocular_inspection_rooms', function (Blueprint $table) {
                $table->id('room_id');
                $table->integer('booking_id')->index();
                $table->string('room_name', 120)->nullable();
                $table->enum('unit_of_measurement', ['Meters', 'Feet'])->default('Meters');
                $table->decimal('room_length', 10, 2);
                $table->decimal('room_width', 10, 2);
                $table->decimal('ceiling_height', 10, 2);
                $table->string('room_category', 120);
                $table->enum('sun_exposure_level', ['Heavy/West', 'Moderate', 'Shaded'])->default('Moderate');
                $table->integer('maximum_occupancy')->default(1);
                $table->enum('window_size_glazing', ['Small', 'Medium', 'Large Glass Facade'])->default('Medium');
                $table->integer('heat_generating_equipment')->default(0);
                $table->decimal('estimated_btu', 12, 2)->nullable();
                $table->decimal('estimated_hp', 6, 2)->nullable();
                $table->integer('created_by')->nullable();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
            });
        }

        // 4. Specification Recommendations managed by Admin Assistant
        if (! Schema::hasTable('ocular_inspection_recommendations')) {
            Schema::create('ocular_inspection_recommendations', function (Blueprint $table) {
                $table->id('recommendation_id');
                $table->integer('booking_id')->index();
                $table->unsignedBigInteger('room_id')->nullable()->index();
                $table->integer('ac_unit_id')->nullable()->index();
                $table->decimal('recommended_capacity', 6, 2);
                $table->string('recommended_ac_type', 80);
                $table->string('motor_type_recommendation', 40)->default('Inverter');
                $table->string('brand_recommendation', 120);
                $table->string('price_range_label', 160)->nullable();
                $table->string('model', 150)->nullable();
                $table->string('inventory_status', 40)->nullable();
                $table->decimal('unit_price', 12, 2)->nullable();
                $table->string('unit_image_path', 255)->nullable();
                $table->text('notes')->nullable();
                $table->string('status', 30)->default('Draft');
                $table->integer('created_by')->nullable();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
                $table->foreign('room_id')->references('room_id')->on('ocular_inspection_rooms')->onDelete('set null');
                $table->foreign('ac_unit_id')->references('ac_unit_id')->on('ac_units_inventory')->onDelete('set null');
            });
        }

        // 5. Customer AC Unit Orders (₱7,000 down payment, Pick Up / Delivery / Delivery & Installation)
        if (! Schema::hasTable('ac_unit_orders')) {
            Schema::create('ac_unit_orders', function (Blueprint $table) {
                $table->id('order_id');
                $table->integer('ocular_booking_id')->nullable()->index();
                $table->integer('installation_booking_id')->nullable()->index();
                $table->integer('client_id')->index();
                $table->unsignedBigInteger('recommendation_id')->nullable()->index();
                $table->integer('ac_unit_id')->index();
                $table->integer('quantity')->default(1);
                $table->decimal('unit_price', 12, 2)->default(0.00);
                $table->decimal('total_unit_price', 12, 2)->default(0.00);
                $table->decimal('down_payment_amount', 12, 2)->default(7000.00);
                $table->decimal('remaining_unit_balance', 12, 2)->default(0.00);
                $table->decimal('delivery_fee', 12, 2)->default(0.00);
                $table->decimal('installation_fee', 12, 2)->default(0.00);
                $table->string('payment_method', 40)->default('Cash');
                $table->string('fulfillment_type', 40)->default('delivery_installation');
                $table->string('reference_number', 100)->nullable();
                $table->string('sender_name', 150)->nullable();
                $table->string('sender_number', 50)->nullable();
                $table->string('down_payment_receipt_path', 255)->nullable();
                $table->string('manager_receipt_path', 255)->nullable();
                $table->text('delivery_address')->nullable();
                $table->string('contact_number', 50)->nullable();
                $table->boolean('installation_fee_forfeited')->default(false);
                $table->string('order_status', 50)->default('Pending Fulfillment');
                $table->integer('confirmed_by')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('ocular_booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
                $table->foreign('installation_booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
                $table->foreign('client_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('recommendation_id')->references('recommendation_id')->on('ocular_inspection_recommendations')->onDelete('set null');
                $table->foreign('ac_unit_id')->references('ac_unit_id')->on('ac_units_inventory')->onDelete('cascade');
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('ac_unit_orders');
        Schema::dropIfExists('ocular_inspection_recommendations');
        Schema::dropIfExists('ocular_inspection_rooms');

        if (Schema::hasTable('ac_units_inventory') && Schema::hasColumn('ac_units_inventory', 'image_path')) {
            Schema::table('ac_units_inventory', function (Blueprint $table) {
                $table->dropColumn('image_path');
            });
        }

        Schema::enableForeignKeyConstraints();
    }
};

