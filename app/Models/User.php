<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory;
    use Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'role_id',
        'given_name',
        'middle_name',
        'last_name',
        'birthdate',
        'sex',
        'address',
        'contact_number',
        'email',
        'password',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'birthdate' => 'date',
        'role_id' => 'integer',
        'is_active' => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function getNameAttribute(): string
    {
        return trim(implode(' ', array_filter([
            $this->given_name,
            $this->middle_name,
            $this->last_name,
        ])));
    }

    public function getFullNameAttribute(): string
    {
        return $this->name;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role_id === 1;
    }

    public function isManager(): bool
    {
        return $this->role_id === 2;
    }

    public function isAdminAssistant(): bool
    {
        return $this->role_id === 3;
    }

    public function isToolsMan(): bool
    {
        return $this->role_id === 4;
    }

    public function isTechnician(): bool
    {
        return $this->role_id === 5;
    }

    public function isCustomer(): bool
    {
        return $this->role_id === 6;
    }

    public function setPasswordAttribute($value)
    {
        if ($value && \Illuminate\Support\Facades\Hash::needsRehash($value)) {
            $this->attributes['password'] = \Illuminate\Support\Facades\Hash::make($value);
        } else {
            $this->attributes['password'] = $value;
        }
    }
}