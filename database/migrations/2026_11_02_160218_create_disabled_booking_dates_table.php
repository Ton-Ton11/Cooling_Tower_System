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
        Schema::create('disabled_booking_dates', function (Blueprint $table) {
            $table->increments('disabled_date_id');
            $table->date('disabled_date')->unique();
            $table->string('reason', 255)->nullable();
            $table->integer('disabled_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('disabled_by_user_id')
                ->references('user_id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disabled_booking_dates');
    }
};
