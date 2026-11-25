<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DisabledBookingDate extends Model
{
    protected $table = 'disabled_booking_dates';
    protected $primaryKey = 'disabled_date_id';

    protected $fillable = [
        'disabled_date',
        'reason',
        'disabled_by_user_id',
    ];

    protected $casts = [
        'disabled_date' => 'date:Y-m-d',
    ];

    public function disabledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disabled_by_user_id', 'user_id');
    }
}

