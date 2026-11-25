<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $table = 'roles';
    protected $primaryKey = 'role_id';
    public $incrementing = true;
    public $timestamps = true;

    protected $fillable = [
        'role_name',
        'description',
        'is_system',
    ];

    protected $casts = [
        'role_id' => 'integer',
        'is_system' => 'boolean',
    ];

    /**
     * Scope to exclude Customer role (6) for staff management.
     */
    public function scopeStaffRoles($query, bool $includeSuperAdmin = true)
    {
        $query->where('role_id', '!=', 6);
        if (! $includeSuperAdmin) {
            $query->where('role_id', '!=', 1);
        }
        return $query;
    }

    public function users()
    {
        return $this->hasMany(User::class, 'role_id', 'role_id');
    }
}