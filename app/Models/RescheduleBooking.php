<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RescheduleBooking extends Model
{
    use HasFactory;

    protected $table = 'reschedule_bookings';
    protected $primaryKey = 'reschedule_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'booking_id',
        'client_id',
        'schedule_id',
        'previous_scheduled_date',
        'new_scheduled_date',
        'reschedule_reason',
        'reschedule_fee',
        'payment_id',
        'status',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'reschedule_id' => 'integer',
        'booking_id' => 'integer',
        'client_id' => 'integer',
        'schedule_id' => 'integer',
        'previous_scheduled_date' => 'datetime',
        'new_scheduled_date' => 'datetime',
        'reschedule_fee' => 'float',
        'payment_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'booking_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id', 'user_id');
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class, 'schedule_id', 'schedule_id');
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id', 'payment_id');
    }
}
