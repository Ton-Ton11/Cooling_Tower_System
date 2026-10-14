<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UnitType extends Model
{
    use HasFactory;

    protected $table = 'unit_types';

    protected $fillable = [
        'name',
        'code',
        'icon',
        'description',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'id' => 'integer',
        'display_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Scope a query to only include active unit types.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
