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
        'is_head_technician',
        'given_name',
        'middle_name',
        'last_name',
        'birthdate',
        'sex',
        'address',
        'contact_number',
        'email',
        'profile_photo_path',
        'password',
        'is_active',
    ];

    protected $appends = [
        'name',
        'profile_photo_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'birthdate' => 'date:Y-m-d',
        'role_id' => 'integer',
        'is_head_technician' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function customerBookings()
    {
        return $this->hasMany(Booking::class, 'client_id', 'user_id');
    }

    public function technicianBookings()
    {
        return $this->hasMany(Booking::class, 'assigned_tech_id', 'user_id');
    }

    public function technicianTeams()
    {
        return $this->belongsToMany(TechnicianTeam::class, 'technician_team_members', 'technician_id', 'team_id', 'user_id', 'team_id')
            ->withPivot('role_in_team')
            ->withTimestamps();
    }

    public function ledTeams()
    {
        return $this->hasMany(TechnicianTeam::class, 'leader_id', 'user_id');
    }

    public function customerComplaints()
    {
        return $this->hasMany(Complaint::class, 'customer_id', 'user_id');
    }

    public function unitDetails()
    {
        return $this->hasOne(CustomerUnitDetail::class, 'user_id', 'user_id');
    }

    public function serviceForecasts()
    {
        return $this->hasMany(ServiceForecast::class, 'user_id', 'user_id');
    }

    public function certifications()
    {
        return $this->hasMany(TechnicianCertification::class, 'user_id', 'user_id');
    }

    public function rescheduleBookings()
    {
        return $this->hasMany(RescheduleBooking::class, 'client_id', 'user_id');
    }

    public function rescheduledBookings()
    {
        return $this->belongsToMany(Booking::class, 'reschedule_bookings', 'client_id', 'booking_id')
            ->withPivot(['previous_scheduled_date', 'new_scheduled_date', 'reschedule_reason', 'reschedule_fee', 'status'])
            ->withTimestamps();
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

    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (empty($this->profile_photo_path)) {
            return null;
        }

        if (str_starts_with($this->profile_photo_path, 'http://') || str_starts_with($this->profile_photo_path, 'https://')) {
            return $this->profile_photo_path;
        }

        $relativePath = ltrim($this->profile_photo_path, '/');
        if (! \Illuminate\Support\Facades\File::exists(public_path($relativePath))) {
            return null;
        }

        return '/profile/avatar/' . basename($relativePath);
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
        return (int) $this->role_id === 5;
    }

    public function isHeadTechnician(): bool
    {
        return (int) $this->role_id === 7 || ((int) $this->role_id === 5 && (bool) $this->is_head_technician);
    }

    public function isCustomer(): bool
    {
        return (int) $this->role_id === 6;
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