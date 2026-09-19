<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TechnicianTeam extends Model
{
    use HasFactory;

    protected $table = 'technician_teams';
    protected $primaryKey = 'team_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'team_name',
        'leader_id',
        'created_by',
        'status',
        'description',
    ];

    protected $casts = [
        'team_id' => 'integer',
        'leader_id' => 'integer',
        'created_by' => 'integer',
    ];

    public function leader()
    {
        return $this->belongsTo(User::class, 'leader_id', 'user_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function members()
    {
        return $this->hasMany(TechnicianTeamMember::class, 'team_id', 'team_id');
    }

    public function technicians()
    {
        return $this->belongsToMany(User::class, 'technician_team_members', 'team_id', 'technician_id', 'team_id', 'user_id')
            ->withPivot('role_in_team')
            ->withTimestamps();
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'assigned_team_id', 'team_id');
    }

    public function checklists()
    {
        return $this->hasMany(ToolChecklist::class, 'team_id', 'team_id');
    }
}
