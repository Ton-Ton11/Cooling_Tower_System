<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $table = 'services';
    protected $primaryKey = 'service_id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = true;

    protected $fillable = [
        'service_name',
        'description',
        'base_price',
        'booking_fee',
        'is_active',
        'category',
        'display_order',
    ];

    protected $casts = [
        'service_id' => 'integer',
        'base_price' => 'float',
        'booking_fee' => 'float',
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    /**
     * Scope a query to only include active services.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'service_id', 'service_id');
    }
}
