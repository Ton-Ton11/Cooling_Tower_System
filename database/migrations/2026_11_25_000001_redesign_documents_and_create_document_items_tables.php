<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enhances the documents table to support dynamic Quotation Form and Statement of Account
     * documents with line items, financial totals, and customizable terms/signatories.
     */
    public function up(): void
    {
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                if (! Schema::hasColumn('documents', 'document_number')) {
                    $table->string('document_number', 100)->nullable()->unique()->after('doc_id');
                }
                if (! Schema::hasColumn('documents', 'document_type')) {
                    $table->string('document_type', 50)->nullable()->index()->after('document_number');
                }
                if (! Schema::hasColumn('documents', 'client_address')) {
                    $table->text('client_address')->nullable()->after('client_name');
                }
                if (! Schema::hasColumn('documents', 'attention_to')) {
                    $table->string('attention_to', 150)->nullable()->after('client_address');
                }
                if (! Schema::hasColumn('documents', 'subject')) {
                    $table->string('subject', 255)->nullable()->after('attention_to');
                }
                if (! Schema::hasColumn('documents', 'issue_date')) {
                    $table->date('issue_date')->nullable()->after('subject');
                }
                if (! Schema::hasColumn('documents', 'due_date')) {
                    $table->date('due_date')->nullable()->after('issue_date');
                }
                if (! Schema::hasColumn('documents', 'expiry_date')) {
                    $table->date('expiry_date')->nullable()->after('due_date');
                }
                if (! Schema::hasColumn('documents', 'subtotal')) {
                    $table->decimal('subtotal', 15, 2)->default(0.00)->after('expiry_date');
                }
                if (! Schema::hasColumn('documents', 'discount_total')) {
                    $table->decimal('discount_total', 15, 2)->default(0.00)->after('subtotal');
                }
                if (! Schema::hasColumn('documents', 'vatable_amount')) {
                    $table->decimal('vatable_amount', 15, 2)->default(0.00)->after('discount_total');
                }
                if (! Schema::hasColumn('documents', 'tax_rate')) {
                    $table->decimal('tax_rate', 5, 2)->default(12.00)->after('vatable_amount');
                }
                if (! Schema::hasColumn('documents', 'tax_total')) {
                    $table->decimal('tax_total', 15, 2)->default(0.00)->after('tax_rate');
                }
                if (! Schema::hasColumn('documents', 'grand_total')) {
                    $table->decimal('grand_total', 15, 2)->default(0.00)->after('tax_total');
                }
                if (! Schema::hasColumn('documents', 'inclusions')) {
                    $table->text('inclusions')->nullable()->after('grand_total');
                }
                if (! Schema::hasColumn('documents', 'exclusions')) {
                    $table->text('exclusions')->nullable()->after('inclusions');
                }
                if (! Schema::hasColumn('documents', 'workmanship')) {
                    $table->text('workmanship')->nullable()->after('exclusions');
                }
                if (! Schema::hasColumn('documents', 'payment_terms')) {
                    $table->text('payment_terms')->nullable()->after('workmanship');
                }
                if (! Schema::hasColumn('documents', 'additional_details')) {
                    $table->json('additional_details')->nullable()->after('payment_terms');
                }
                if (! Schema::hasColumn('documents', 'prepared_by_name')) {
                    $table->string('prepared_by_name', 150)->nullable()->after('additional_details');
                }
                if (! Schema::hasColumn('documents', 'prepared_by_title')) {
                    $table->string('prepared_by_title', 150)->nullable()->after('prepared_by_name');
                }
                if (! Schema::hasColumn('documents', 'approved_by_name')) {
                    $table->string('approved_by_name', 150)->nullable()->after('prepared_by_title');
                }
                if (! Schema::hasColumn('documents', 'approved_by_title')) {
                    $table->string('approved_by_title', 150)->nullable()->after('approved_by_name');
                }
                if (! Schema::hasColumn('documents', 'received_by_name')) {
                    $table->string('received_by_name', 150)->nullable()->after('approved_by_title');
                }
                if (! Schema::hasColumn('documents', 'received_date')) {
                    $table->date('received_date')->nullable()->after('received_by_name');
                }
            });

            // Remove old placeholder sample rows that have no document_type or items
            DB::table('documents')->whereNull('document_type')->delete();
        }

        if (! Schema::hasTable('document_items')) {
            Schema::create('document_items', function (Blueprint $table) {
                $table->id();
                $table->integer('document_id');
                $table->integer('item_number')->default(1);
                $table->text('description');
                $table->decimal('quantity', 12, 2)->default(1.00);
                $table->decimal('unit_price', 15, 2)->default(0.00);
                $table->decimal('discount', 15, 2)->default(0.00);
                $table->decimal('tax_rate', 5, 2)->default(0.00);
                $table->decimal('amount', 15, 2)->default(0.00);
                $table->timestamps();

                $table->foreign('document_id')
                    ->references('doc_id')
                    ->on('documents')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_items');

        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                $columns = [
                    'document_number',
                    'document_type',
                    'client_address',
                    'attention_to',
                    'subject',
                    'issue_date',
                    'due_date',
                    'expiry_date',
                    'subtotal',
                    'discount_total',
                    'vatable_amount',
                    'tax_rate',
                    'tax_total',
                    'grand_total',
                    'inclusions',
                    'exclusions',
                    'workmanship',
                    'payment_terms',
                    'additional_details',
                    'prepared_by_name',
                    'prepared_by_title',
                    'approved_by_name',
                    'approved_by_title',
                    'received_by_name',
                    'received_date',
                ];

                foreach ($columns as $col) {
                    if (Schema::hasColumn('documents', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};

