<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $table = 'bookings';
    protected $primaryKey = 'booking_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'client_id',
        'service_id',
        'assigned_tech_id',
        'scheduled_date',
        'booking_status',
        'cancellation_reason',
        'service_payment_method',
        'notes',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'booking_id' => 'integer',
        'client_id' => 'integer',
        'service_id' => 'integer',
        'assigned_tech_id' => 'integer',
        'scheduled_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id', 'user_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'assigned_tech_id', 'user_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id', 'service_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'booking_id', 'booking_id');
    }

    public function latestPayment()
    {
        return $this->hasOne(Payment::class, 'booking_id', 'booking_id')->latestOfMany('payment_id');
    }

    public function feedback()
    {
        return $this->hasOne(Feedback::class, 'booking_id', 'booking_id');
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'booking_id', 'booking_id');
    }
}
