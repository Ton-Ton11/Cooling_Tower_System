<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $table = 'schedule';
    protected $primaryKey = 'schedule_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = false;

    protected $fillable = [
        'technician_id',
        'scheduled_booking_id',
        'start_time',
        'end_time',
    ];

    protected $casts = [
        'schedule_id' => 'integer',
        'technician_id' => 'integer',
        'scheduled_booking_id' => 'integer',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id', 'user_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'scheduled_booking_id', 'booking_id');
    }

    public function rescheduleBookings()
    {
        return $this->hasMany(RescheduleBooking::class, 'schedule_id', 'schedule_id');
    }

    public function bookings()
    {
        return $this->belongsToMany(Booking::class, 'reschedule_bookings', 'schedule_id', 'booking_id');
    }
}
