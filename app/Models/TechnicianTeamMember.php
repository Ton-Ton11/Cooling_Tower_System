<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TechnicianTeamMember extends Model
{
    use HasFactory;

    protected $table = 'technician_team_members';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'team_id',
        'technician_id',
        'role_in_team',
    ];

    protected $casts = [
        'id' => 'integer',
        'team_id' => 'integer',
        'technician_id' => 'integer',
    ];

    public function team()
    {
        return $this->belongsTo(TechnicianTeam::class, 'team_id', 'team_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id', 'user_id');
    }
}
