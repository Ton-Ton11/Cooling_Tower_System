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
        // 1. Add fields to bookings table
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'units_data')) {
                $table->json('units_data')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('bookings', 'service_details')) {
                $table->json('service_details')->nullable()->after('units_data');
            }
            if (! Schema::hasColumn('bookings', 'alternative_schedule')) {
                $table->string('alternative_schedule', 100)->nullable()->after('service_details');
            }
            if (! Schema::hasColumn('bookings', 'quotation_status')) {
                $table->string('quotation_status', 50)->default('Pending Assessment')->after('alternative_schedule');
            }
            if (! Schema::hasColumn('bookings', 'quotation_data')) {
                $table->json('quotation_data')->nullable()->after('quotation_status');
            }
            if (! Schema::hasColumn('bookings', 'service_order_status')) {
                $table->string('service_order_status', 50)->default('Pending Quotation')->after('quotation_data');
            }
            if (! Schema::hasColumn('bookings', 'soa_data')) {
                $table->json('soa_data')->nullable()->after('service_order_status');
            }
            if (! Schema::hasColumn('bookings', 'policy_acknowledged')) {
                $table->boolean('policy_acknowledged')->default(true)->after('soa_data');
            }
        });

        // 2. Ensure the 3 primary customer service categories exist in services table
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
            $existing = DB::table('services')
                ->where('service_name', $ps['service_name'])
                ->first();

            if (! $existing) {
                DB::table('services')->insert(array_merge($ps, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            } else {
                DB::table('services')
                    ->where('service_id', $existing->service_id)
                    ->update([
                        'description' => $ps['description'],
                        'category' => $ps['category'],
                        'display_order' => $ps['display_order'],
                        'is_active' => true,
                        'updated_at' => now(),
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $cols = [
                'units_data',
                'service_details',
                'alternative_schedule',
                'quotation_status',
                'quotation_data',
                'service_order_status',
                'soa_data',
                'policy_acknowledged',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('bookings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
