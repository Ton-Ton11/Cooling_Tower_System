<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ToolChecklist extends Model
{
    use HasFactory;

    protected $table = 'tool_checklists';
    protected $primaryKey = 'checklist_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'booking_id',
        'technician_id',
        'team_id',
        'status',
        'notes',
        'approved_by',
        'approved_at',
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'checklist_id' => 'integer',
        'booking_id' => 'integer',
        'technician_id' => 'integer',
        'team_id' => 'integer',
        'approved_by' => 'integer',
        'completed_by' => 'integer',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'booking_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id', 'user_id');
    }

    public function team()
    {
        return $this->belongsTo(TechnicianTeam::class, 'team_id', 'team_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by', 'user_id');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by', 'user_id');
    }

    public function items()
    {
        return $this->hasMany(ToolChecklistItem::class, 'checklist_id', 'checklist_id');
    }
}
