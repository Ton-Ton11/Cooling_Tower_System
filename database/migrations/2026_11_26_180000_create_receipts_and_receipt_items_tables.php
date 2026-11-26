<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        if (! Schema::hasTable('receipts')) {
            Schema::create('receipts', function (Blueprint $table) {
                $table->id('receipt_id');
                $table->string('receipt_number', 40)->unique();
                $table->string('document_kind', 40)->index(); // acknowledgement_receipt, sales_invoice, service_invoice
                $table->string('transaction_category', 40)->index(); // installation, repair, cleaning, item_order, ac_unit_order
                $table->string('source_type', 40); // booking, item_order, ac_unit_order
                $table->unsignedBigInteger('source_id')->index();
                $table->unsignedBigInteger('parent_receipt_id')->nullable()->index();

                // Customer reference & frozen customer snapshot
                $table->integer('client_id')->nullable()->index();
                $table->string('customer_name', 191);
                $table->string('company_name', 255)->nullable();
                $table->string('tin', 60)->nullable();
                $table->text('customer_address')->nullable();
                $table->string('contact_number', 60)->nullable();

                // Frozen financial snapshot (12% VAT-inclusive backend calculation)
                $table->decimal('subtotal', 12, 2)->default(0.00);
                $table->decimal('discount_total', 12, 2)->default(0.00);
                $table->decimal('vatable_sales', 12, 2)->default(0.00);
                $table->decimal('vat_amount', 12, 2)->default(0.00);
                $table->decimal('grand_total', 12, 2)->default(0.00);
                $table->decimal('prior_payments_credited', 12, 2)->default(0.00);
                $table->decimal('amount_paid_now', 12, 2)->default(0.00);
                $table->decimal('balance_after', 12, 2)->default(0.00);

                // Payment details & DB-level non-voided GCash reference uniqueness
                $table->string('payment_method', 30); // GCash, Cash
                $table->string('external_reference_number', 100)->nullable()->index();
                $table->string('active_gcash_reference', 100)->nullable()->unique();
                $table->string('payment_receipt_path', 500)->nullable();

                // Issuance & cryptographic audit fields
                $table->integer('issued_by_user_id')->index();
                $table->string('issued_by_name', 150);
                $table->string('issued_by_role', 80);
                $table->timestamp('issued_at')->index();
                $table->string('verification_hash', 64);

                // Void workflow fields
                $table->string('status', 30)->default('Issued')->index(); // Issued, Void Requested, Voided
                $table->integer('void_requested_by')->nullable();
                $table->text('void_reason')->nullable();
                $table->integer('void_approved_by')->nullable();
                $table->timestamp('voided_at')->nullable();

                $table->timestamps();

                $table->index(['source_type', 'source_id']);
                $table->foreign('parent_receipt_id')->references('receipt_id')->on('receipts')->nullOnDelete();
                $table->foreign('client_id')->references('user_id')->on('users')->nullOnDelete();
                $table->foreign('issued_by_user_id')->references('user_id')->on('users');
                $table->foreign('void_requested_by')->references('user_id')->on('users')->nullOnDelete();
                $table->foreign('void_approved_by')->references('user_id')->on('users')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('receipt_items')) {
            Schema::create('receipt_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('receipt_id')->index();
                $table->string('description', 500);
                $table->string('item_meta', 500)->nullable();
                $table->decimal('quantity', 10, 2)->default(1.00);
                $table->string('unit', 40)->default('pc');
                $table->decimal('unit_price', 12, 2)->default(0.00);
                $table->decimal('line_total', 12, 2)->default(0.00);
                $table->timestamps();

                $table->foreign('receipt_id')->references('receipt_id')->on('receipts');
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('receipt_items');
        Schema::dropIfExists('receipts');
        Schema::enableForeignKeyConstraints();
    }
};
