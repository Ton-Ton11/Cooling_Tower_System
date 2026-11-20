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
        'account_type',
        'company_name',
        'representative_role',
        'tin',
        'business_permit_path',
        'verification_status',
        'verification_rejection_reason',
        'resubmission_attempts',
        'last_resubmitted_at',
        'verified_at',
        'verified_by',
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
        'is_online',
        'last_seen_at',
        'hide_active_status',
        'email_verified_at',
        'geospatial_alert_acknowledged_at',
    ];

    protected $appends = [
        'name',
        'profile_photo_url',
        'business_permit_url',
        'is_business_account',
        'is_business_verified',
        'remaining_daily_attempts',
        'can_resubmit_today',
        'geospatial_alert_acknowledged',
        'is_currently_online',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'birthdate' => 'date:Y-m-d',
        'role_id' => 'integer',
        'is_active' => 'boolean',
        'is_online' => 'boolean',
        'last_seen_at' => 'datetime',
        'hide_active_status' => 'boolean',
        'geospatial_alert_acknowledged_at' => 'datetime',
        'resubmission_attempts' => 'integer',
        'last_resubmitted_at' => 'datetime',
        'verified_at' => 'datetime',
        'verified_by' => 'integer',
    ];

    public function verifiedBy()
    {
        return $this->belongsTo(self::class, 'verified_by', 'user_id');
    }

    public function isBusinessCustomer(): bool
    {
        return ($this->account_type ?? 'individual') === 'business';
    }

    public function isBusinessVerified(): bool
    {
        if (! $this->isBusinessCustomer()) {
            return true;
        }

        return ($this->verification_status ?? 'pending') === 'approved';
    }

    public function getIsBusinessAccountAttribute(): bool
    {
        return $this->isBusinessCustomer();
    }

    public function getIsBusinessVerifiedAttribute(): bool
    {
        return $this->isBusinessVerified();
    }

    public function getDailyResubmissionAttemptsRemaining(): int
    {
        if (! $this->isBusinessCustomer()) {
            return 0;
        }

        $maxDailyAttempts = 3;

        if (is_null($this->last_resubmitted_at)) {
            return $maxDailyAttempts;
        }

        $tz = config('app.timezone', 'Asia/Manila');
        $isToday = $this->last_resubmitted_at->timezone($tz)->isToday();

        if (! $isToday) {
            return $maxDailyAttempts;
        }

        return max(0, $maxDailyAttempts - (int) ($this->resubmission_attempts ?? 0));
    }

    public function getRemainingDailyAttemptsAttribute(): int
    {
        return $this->getDailyResubmissionAttemptsRemaining();
    }

    public function getCanResubmitTodayAttribute(): bool
    {
        return $this->getDailyResubmissionAttemptsRemaining() > 0;
    }

    public function getBusinessPermitUrlAttribute(): ?string
    {
        if (empty($this->business_permit_path)) {
            return null;
        }

        if (str_starts_with($this->business_permit_path, 'http://') || str_starts_with($this->business_permit_path, 'https://')) {
            return $this->business_permit_path;
        }

        $relativePath = ltrim(preg_replace('#^/?storage/#i', '', $this->business_permit_path), '/');

        if (\Illuminate\Support\Facades\File::exists(public_path($relativePath))) {
            return '/' . $relativePath;
        }

        return '/storage/' . $relativePath;
    }

    public function getIsCurrentlyOnlineAttribute(): bool
    {
        return (bool) $this->is_online &&
            ! is_null($this->last_seen_at) &&
            $this->last_seen_at->greaterThanOrEqualTo(now()->subMinutes(2));
    }

    public function isCurrentlyOnline(): bool
    {
        return $this->getIsCurrentlyOnlineAttribute();
    }

    public function getGeospatialAlertAcknowledgedAttribute(): bool
    {
        return ! is_null($this->geospatial_alert_acknowledged_at);
    }

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
        return (int) $this->role_id === 7;
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