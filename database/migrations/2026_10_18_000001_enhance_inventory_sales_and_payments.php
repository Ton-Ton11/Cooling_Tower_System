<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Widen payment columns to support AC units (₱40k+) and all payment methods
        if (Schema::hasTable('payment')) {
            DB::statement("ALTER TABLE `payment` MODIFY COLUMN `booking_price` DECIMAL(12,2) NULL DEFAULT 0.00");
            DB::statement("ALTER TABLE `payment` MODIFY COLUMN `unit_price` DECIMAL(12,2) NULL DEFAULT 0.00");
            DB::statement("ALTER TABLE `payment` MODIFY COLUMN `spare_parts_price` DECIMAL(12,2) NULL DEFAULT 0.00");
            DB::statement("ALTER TABLE `payment` MODIFY COLUMN `amount_paid` DECIMAL(12,2) NULL DEFAULT 0.00");
            DB::statement("ALTER TABLE `payment` MODIFY COLUMN `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Cash'");
            DB::statement("ALTER TABLE `payment` MODIFY COLUMN `payment_status` VARCHAR(30) NOT NULL DEFAULT 'Paid'");
        }

        // 2. Create inventory_sales table for organized Sold Tools & Materials, Sold AC Units, and Sold Spare Parts records
        if (!Schema::hasTable('inventory_sales')) {
            Schema::create('inventory_sales', function (Blueprint $table) {
                $table->id('sale_id');
                $table->unsignedBigInteger('booking_id')->nullable()->index();
                $table->unsignedBigInteger('payment_id')->nullable()->index();
                $table->string('sale_type', 40)->default('tools_materials')->index(); // 'tools_materials', 'ac_unit', 'spare_part'
                $table->unsignedBigInteger('item_id')->nullable()->index();
                $table->unsignedBigInteger('ac_unit_id')->nullable()->index();
                $table->string('item_name', 191);
                $table->string('brand', 100)->nullable();
                $table->string('model', 120)->nullable();
                $table->string('serial_number', 120)->nullable();
                $table->string('sub_category', 120)->nullable();
                $table->string('item_type', 100)->nullable();
                $table->string('horsepower', 50)->nullable();
                $table->integer('quantity')->default(1);
                $table->string('unit', 40)->default('unit');
                $table->decimal('cost_price', 12, 2)->default(0.00);
                $table->decimal('unit_price', 12, 2)->default(0.00);
                $table->decimal('total_amount', 12, 2)->default(0.00);
                $table->decimal('profit', 12, 2)->default(0.00);
                $table->string('payment_method', 50)->default('Cash');
                $table->string('payment_status', 30)->default('Paid');
                $table->unsignedBigInteger('client_id')->nullable()->index();
                $table->string('customer_name', 150)->nullable();
                $table->string('customer_contact', 80)->nullable();
                $table->string('customer_address', 255)->nullable();
                $table->integer('warranty_period')->nullable()->default(12);
                $table->unsignedBigInteger('sold_by')->nullable();
                $table->string('sold_by_name', 150)->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('sold_at')->nullable();
                $table->timestamps();
            });
        }

        // 3. Backfill existing Retail Sale bookings into inventory_sales if any
        if (Schema::hasTable('bookings') && Schema::hasTable('inventory_sales')) {
            $retailBookings = DB::table('bookings as b')
                ->join('services as s', 's.service_id', '=', 'b.service_id')
                ->leftJoin('payment as p', 'p.booking_id', '=', 'b.booking_id')
                ->leftJoin('users as u', 'u.user_id', '=', 'b.client_id')
                ->where('s.service_name', 'like', 'Retail Sale:%')
                ->select(
                    'b.booking_id',
                    'b.client_id',
                    'b.notes as booking_notes',
                    'b.created_at as booking_created_at',
                    's.service_name',
                    's.base_price',
                    'p.payment_id',
                    'p.payment_method',
                    'p.payment_status',
                    'p.unit_price',
                    'p.spare_parts_price',
                    'p.amount_paid',
                    'p.payment_date',
                    'u.given_name',
                    'u.last_name',
                    'u.contact_number',
                    'u.address'
                )
                ->get();

            foreach ($retailBookings as $rb) {
                $exists = DB::table('inventory_sales')->where('booking_id', $rb->booking_id)->exists();
                if ($exists) {
                    continue;
                }

                $bm = DB::table('booking_materials as bm')
                    ->leftJoin('inventory_items as ii', 'ii.item_id', '=', 'bm.item_id')
                    ->where('bm.booking_id', $rb->booking_id)
                    ->select('bm.*', 'ii.name as inv_name', 'ii.sub_category', 'ii.type as item_type', 'ii.unit', 'ii.cost_price', 'ii.price')
                    ->first();

                $itemName = $bm?->inv_name ?? trim(str_replace('Retail Sale:', '', $rb->service_name));
                $qty = (int) ($bm?->quantity_used ?? 1);
                $totalAmount = (float) (($rb->unit_price ?? 0) + ($rb->spare_parts_price ?? 0));
                if ($totalAmount <= 0) {
                    $totalAmount = (float) ($rb->amount_paid ?? $rb->base_price ?? 0);
                }
                $unitPrice = $qty > 0 ? round($totalAmount / $qty, 2) : $totalAmount;
                $costPrice = (float) ($bm?->cost_price ?? round($unitPrice * 0.65, 2));
                $profit = round($totalAmount - ($costPrice * $qty), 2);
                $customerName = trim(($rb->given_name ?? '') . ' ' . ($rb->last_name ?? '')) ?: 'Walk-in Customer';

                DB::table('inventory_sales')->insert([
                    'booking_id'       => $rb->booking_id,
                    'payment_id'       => $rb->payment_id,
                    'sale_type'        => 'tools_materials',
                    'item_id'          => $bm?->item_id,
                    'item_name'        => $itemName,
                    'sub_category'     => $bm?->sub_category ?: 'General',
                    'item_type'        => $bm?->item_type ?: 'Material',
                    'quantity'         => $qty,
                    'unit'             => $bm?->unit ?: 'pcs',
                    'cost_price'       => $costPrice,
                    'unit_price'       => $unitPrice,
                    'total_amount'     => $totalAmount,
                    'profit'           => $profit,
                    'payment_method'   => $rb->payment_method ?: 'Cash',
                    'payment_status'   => $rb->payment_status ?: 'Paid',
                    'client_id'        => $rb->client_id,
                    'customer_name'    => $customerName,
                    'customer_contact' => $rb->contact_number,
                    'customer_address' => $rb->address,
                    'sold_by_name'     => 'System Admin',
                    'notes'            => $rb->booking_notes ?: "Retail Sale of {$qty} × {$itemName}",
                    'sold_at'          => $rb->payment_date ?: $rb->booking_created_at ?: now(),
                    'created_at'       => $rb->booking_created_at ?: now(),
                    'updated_at'       => now(),
                ]);
            }
        }

        // 4. Backfill existing Sold AC units in ac_units_inventory into bookings + payment + inventory_sales
        if (Schema::hasTable('ac_units_inventory') && Schema::hasTable('inventory_sales')) {
            $soldAcUnits = DB::table('ac_units_inventory')->where('status', 'Sold')->get();
            foreach ($soldAcUnits as $unit) {
                $exists = DB::table('inventory_sales')
                    ->where('sale_type', 'ac_unit')
                    ->where('ac_unit_id', $unit->ac_unit_id)
                    ->exists();
                if ($exists) {
                    continue;
                }

                $firstCustomer = DB::table('users')
                    ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
                    ->where('roles.role_name', 'customer')
                    ->orderBy('users.user_id')
                    ->select('users.*')
                    ->first();
                if (!$firstCustomer) {
                    $firstCustomer = DB::table('users')->orderBy('user_id')->first();
                }
                $clientId = $firstCustomer?->user_id;

                $customer = $clientId ? DB::table('users')->where('user_id', $clientId)->first() : null;
                $customerName = $customer
                    ? trim(($customer->given_name ?? '') . ' ' . ($customer->last_name ?? ''))
                    : 'Walk-in Customer';

                $sellingPrice = (float) ($unit->selling_price ?? 0);
                $purchasePrice = (float) ($unit->purchase_price ?? 0);
                $profit = round($sellingPrice - $purchasePrice, 2);
                $soldAt = $unit->updated_at ?: $unit->created_at ?: now();
                $serviceName = 'AC Unit Sale: ' . trim(($unit->brand ?? '') . ' ' . ($unit->model ?? ''));

                $service = DB::table('services')->where('service_name', $serviceName)->first();
                if (!$service) {
                    $serviceId = DB::table('services')->insertGetId([
                        'service_name'  => $serviceName,
                        'description'   => "Direct AC Unit Sale ({$unit->ac_type} - {$unit->horsepower} HP, SN: {$unit->serial_number})",
                        'base_price'    => $sellingPrice,
                        'is_active'     => 1,
                        'category'      => 'AC Unit Sale',
                        'display_order' => 99,
                        'created_at'    => $soldAt,
                        'updated_at'    => $soldAt,
                    ]);
                } else {
                    $serviceId = $service->service_id;
                }

                $bookingId = null;
                $paymentId = null;

                if ($clientId) {
                    $bookingId = DB::table('bookings')->insertGetId([
                        'client_id'      => $clientId,
                        'service_id'     => $serviceId,
                        'scheduled_date' => $soldAt,
                        'booking_status' => 'Completed',
                        'notes'          => "Sold AC Unit: {$unit->brand} {$unit->model} (SN: {$unit->serial_number})",
                        'created_at'     => $soldAt,
                        'updated_at'     => $soldAt,
                    ]);

                    $paymentId = DB::table('payment')->insertGetId([
                        'booking_id'        => $bookingId,
                        'booking_price'     => $sellingPrice,
                        'unit_price'        => $sellingPrice,
                        'spare_parts_price' => 0,
                        'amount_paid'       => $sellingPrice,
                        'payment_method'    => 'Bank Transfer',
                        'payment_status'    => 'Paid',
                        'payment_type'      => 'Full Payment',
                        'payment_date'      => $soldAt,
                        'created_at'        => $soldAt,
                        'updated_at'        => $soldAt,
                    ]);
                }

                DB::table('inventory_sales')->insert([
                    'booking_id'       => $bookingId,
                    'payment_id'       => $paymentId,
                    'sale_type'        => 'ac_unit',
                    'ac_unit_id'       => $unit->ac_unit_id,
                    'item_name'        => trim(($unit->brand ?? '') . ' ' . ($unit->model ?? '')),
                    'brand'            => $unit->brand,
                    'model'            => $unit->model,
                    'serial_number'    => $unit->serial_number,
                    'sub_category'     => $unit->ac_type ?: 'Split',
                    'item_type'        => 'AC Unit',
                    'horsepower'       => (string) ($unit->horsepower ?? '1.0'),
                    'quantity'         => 1,
                    'unit'             => 'unit',
                    'cost_price'       => $purchasePrice,
                    'unit_price'       => $sellingPrice,
                    'total_amount'     => $sellingPrice,
                    'profit'           => $profit,
                    'payment_method'   => 'Bank Transfer',
                    'payment_status'   => 'Paid',
                    'client_id'        => $clientId,
                    'customer_name'    => $customerName,
                    'customer_contact' => $customer?->contact_number ?: '0917-555-0192',
                    'customer_address' => $customer?->address ?: 'Davao City',
                    'warranty_period'  => (int) ($unit->warranty_period ?? 12),
                    'sold_by_name'     => 'System Admin',
                    'notes'            => "Sold AC Unit: {$unit->brand} {$unit->model} (SN: {$unit->serial_number})",
                    'sold_at'          => $soldAt,
                    'created_at'       => $soldAt,
                    'updated_at'       => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_sales');
    }
};
