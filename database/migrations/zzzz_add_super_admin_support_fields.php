<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_active')->nullable()->default(true);
            });
        }

        if (! Schema::hasTable('documents')) {
            Schema::create('documents', function (Blueprint $table) {
                $table->integer('doc_id')->autoIncrement();
                $table->integer('booking_id')->nullable();
                $table->integer('created_by');
                $table->string('form_name', 150);
                $table->string('client_name', 150);
                $table->string('service_name', 150)->nullable();
                $table->enum('status', ['Draft', 'Exported', 'Finalized'])->default('Draft');
                $table->string('file_path')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('set null');
                $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('documents')) {
            Schema::dropIfExists('documents');
        }

        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
    }
};
