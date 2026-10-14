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

        // Backfill existing reschedule payment records if any
        $reschedulePayments = DB::table('payment')
            ->where('payment_type', 'Reschedule Fee')
            ->get();

        foreach ($reschedulePayments as $rp) {
            $booking = DB::table('bookings')->where('booking_id', $rp->booking_id)->first();
            if ($booking) {
                $alreadyExists = DB::table('reschedule_bookings')
                    ->where('payment_id', $rp->payment_id)
                    ->exists();

                if (! $alreadyExists) {
                    DB::table('reschedule_bookings')->insert([
                        'booking_id' => $booking->booking_id,
                        'client_id' => $booking->client_id,
                        'previous_scheduled_date' => $booking->scheduled_date,
                        'new_scheduled_date' => $booking->scheduled_date,
                        'reschedule_reason' => 'Customer requested schedule adjustment',
                        'reschedule_fee' => $rp->amount_paid ?: 150.00,
                        'payment_id' => $rp->payment_id,
                        'status' => 'Pending',
                        'created_at' => $rp->created_at ?: now(),
                        'updated_at' => $rp->updated_at ?: now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reschedule_bookings');
    }
};
