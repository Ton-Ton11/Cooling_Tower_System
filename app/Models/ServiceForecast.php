<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceForecast extends Model
{
    use HasFactory;

    protected $table = 'service_forecasts';
    protected $primaryKey = 'forecast_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'user_id',
        'source_booking_id',
        'source_service_name',
        'recommended_service_id',
        'recommended_service_name',
        'unit_summary',
        'last_service_date',
        'predicted_due_date',
        'base_interval_days',
        'adjusted_interval_days',
        'wear_factor',
        'urgency_level',
        'recommendation_reason',
        'reminder_sent_at',
    ];

    protected $casts = [
        'forecast_id' => 'integer',
        'user_id' => 'integer',
        'source_booking_id' => 'integer',
        'recommended_service_id' => 'integer',
        'last_service_date' => 'date',
        'predicted_due_date' => 'date',
        'base_interval_days' => 'integer',
        'adjusted_interval_days' => 'integer',
        'wear_factor' => 'float',
        'reminder_sent_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function sourceBooking()
    {
        return $this->belongsTo(Booking::class, 'source_booking_id', 'booking_id');
    }

    public function recommendedService()
    {
        return $this->belongsTo(Service::class, 'recommended_service_id', 'service_id');
    }
}
