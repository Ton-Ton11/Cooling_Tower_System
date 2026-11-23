<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryFolder extends Model
{
    use HasFactory;

    protected $table = 'inventory_folders';
    protected $primaryKey = 'id';
    public $incrementing = true;
    public $timestamps = true;

    protected $fillable = [
        'field_type',
        'name',
        'description',
        'icon',
        'display_order',
        'created_by',
    ];

    protected $casts = [
        'id' => 'integer',
        'display_order' => 'integer',
        'created_by' => 'integer',
    ];

    public function scopeForField($query, string $fieldType)
    {
        return $query->where('field_type', $fieldType)->orderBy('display_order')->orderBy('name');
    }
}
