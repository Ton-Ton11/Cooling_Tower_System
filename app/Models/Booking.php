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
        'lead_technician_id',
        'assistant_technician_id',
        'assigned_team_id',
        'assigned_by',
        'assigned_at',
        'scheduled_date',
        'booking_status',
        'cancellation_reason',
        'service_payment_method',
        'notes',
        'units_data',
        'service_details',
        'alternative_schedule',
        'quotation_status',
        'quotation_data',
        'service_order_status',
        'soa_data',
        'policy_acknowledged',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'booking_id' => 'integer',
        'client_id' => 'integer',
        'service_id' => 'integer',
        'assigned_tech_id' => 'integer',
        'lead_technician_id' => 'integer',
        'assistant_technician_id' => 'integer',
        'assigned_team_id' => 'integer',
        'assigned_by' => 'integer',
        'assigned_at' => 'datetime',
        'scheduled_date' => 'datetime',
        'units_data' => 'array',
        'service_details' => 'array',
        'quotation_data' => 'array',
        'soa_data' => 'array',
        'policy_acknowledged' => 'boolean',
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

    public function leadTechnician()
    {
        return $this->belongsTo(User::class, 'lead_technician_id', 'user_id');
    }

    public function assistantTechnician()
    {
        return $this->belongsTo(User::class, 'assistant_technician_id', 'user_id');
    }

    public function team()
    {
        return $this->belongsTo(TechnicianTeam::class, 'assigned_team_id', 'team_id');
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by', 'user_id');
    }

    public function checklists()
    {
        return $this->hasMany(ToolChecklist::class, 'booking_id', 'booking_id');
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
