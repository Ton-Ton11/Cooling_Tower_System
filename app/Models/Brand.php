<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    use HasFactory;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'country_of_origin',
        'description',
        'logo_url',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'id' => 'integer',
        'display_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Scope a query to only include active brands.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
