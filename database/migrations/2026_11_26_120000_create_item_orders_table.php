<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        if (! Schema::hasTable('item_orders')) {
            Schema::create('item_orders', function (Blueprint $table) {
                $table->id('order_id');
                $table->integer('client_id')->index();
                $table->integer('item_id')->index();
                $table->string('item_category', 30)->index()->comment('spare_part, material, tool');
                $table->integer('quantity')->default(1);
                $table->boolean('is_order_base')->default(false);
                $table->boolean('stock_deducted')->default(false);

                $table->decimal('unit_price', 12, 2)->default(0.00);
                $table->decimal('total_amount', 12, 2)->default(0.00);
                $table->decimal('down_payment_amount', 12, 2)->default(0.00);
                $table->decimal('amount_paid', 12, 2)->default(0.00);
                $table->decimal('remaining_balance', 12, 2)->default(0.00);

                $table->string('payment_method', 30)->default('GCash');
                $table->string('reference_number', 100)->nullable();
                $table->string('sender_name', 150)->nullable();
                $table->string('sender_number', 50)->nullable();
                $table->string('payment_receipt_path', 255)->nullable();

                $table->string('payment_review_status', 40)->default('Pending Review');
                $table->text('payment_incomplete_reason')->nullable();
                $table->timestamp('payment_incomplete_at')->nullable();
                $table->timestamp('payment_deadline_at')->nullable();

                $table->string('fulfillment_type', 40)->nullable()->comment('pickup, delivery_replace');
                $table->integer('linked_booking_id')->nullable()->index();

                $table->string('order_status', 50)->default('Pending Payment Review')->index();
                $table->text('cancellation_reason')->nullable();

                $table->integer('confirmed_by')->nullable();
                $table->string('confirmed_by_name', 150)->nullable();
                $table->timestamp('transaction_date')->nullable();
                $table->string('receipt_reference_number', 80)->nullable()->unique();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('client_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
                $table->foreign('linked_booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
                $table->foreign('confirmed_by')->references('user_id')->on('users')->onDelete('set null');
            });
        }

        if (Schema::hasTable('inventory_sales')) {
            Schema::table('inventory_sales', function (Blueprint $table) {
                if (! Schema::hasColumn('inventory_sales', 'item_order_id')) {
                    $table->unsignedBigInteger('item_order_id')->nullable()->after('payment_id')->index();
                }
                if (! Schema::hasColumn('inventory_sales', 'receipt_reference_number')) {
                    $table->string('receipt_reference_number', 80)->nullable()->after('sold_by_name')->index();
                }
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        if (Schema::hasTable('inventory_sales')) {
            Schema::table('inventory_sales', function (Blueprint $table) {
                if (Schema::hasColumn('inventory_sales', 'receipt_reference_number')) {
                    $table->dropColumn('receipt_reference_number');
                }
                if (Schema::hasColumn('inventory_sales', 'item_order_id')) {
                    $table->dropColumn('item_order_id');
                }
            });
        }

        Schema::dropIfExists('item_orders');

        Schema::enableForeignKeyConstraints();
    }
};
