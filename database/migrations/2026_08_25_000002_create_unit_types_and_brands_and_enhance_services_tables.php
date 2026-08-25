<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Enhance Services table
        Schema::table('services', function (Blueprint $table) {
            if (! Schema::hasColumn('services', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('base_price');
            }
            if (! Schema::hasColumn('services', 'category')) {
                $table->string('category', 50)->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('services', 'display_order')) {
                $table->integer('display_order')->default(0)->after('category');
            }
            if (! Schema::hasColumn('services', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('display_order');
            }
            if (! Schema::hasColumn('services', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        // 2. Create Unit Types table
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

            // Seed initial unit types
            $defaultUnitTypes = [
                [
                    'name' => 'Split-Type (Wall Mounted)',
                    'code' => 'Split',
                    'icon' => 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
                    'description' => 'Standard wall-mounted split-system indoor and outdoor units for homes and offices.',
                    'display_order' => 1,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Window-Type',
                    'code' => 'Window',
                    'icon' => 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
                    'description' => 'Single packaged unit fitted in standard window openings or wall sleeves.',
                    'display_order' => 2,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Ceiling Cassette',
                    'code' => 'Cassette',
                    'icon' => 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
                    'description' => 'Flush ceiling-mounted commercial units providing 360-degree or 4-way airflow.',
                    'display_order' => 3,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Floor Mounted Tower',
                    'code' => 'Floor Mounted',
                    'icon' => 'M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
                    'description' => 'Standing column units designed for high-capacity cooling in spacious venues.',
                    'display_order' => 4,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Ceiling Suspended',
                    'code' => 'Ceiling Suspended',
                    'icon' => 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8',
                    'description' => 'Under-ceiling hanging units suitable for buildings without false ceiling space.',
                    'display_order' => 5,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('unit_types')->insert($defaultUnitTypes);
        }

        // 3. Create Brands table
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

            // Seed initial brands
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
                DB::table('brands')->insert(array_merge($brand, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brands');
        Schema::dropIfExists('unit_types');

        Schema::table('services', function (Blueprint $table) {
            $cols = ['is_active', 'category', 'display_order', 'created_at', 'updated_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('services', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
