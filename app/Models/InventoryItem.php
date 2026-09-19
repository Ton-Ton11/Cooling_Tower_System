<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $table = 'inventory_items';
    protected $primaryKey = 'item_id';
    public $incrementing = true;
    protected $keyType = 'int';

    const UPDATED_AT = 'last_updated';

    protected $fillable = [
        'item_name',
        'item_type',
        'inventory_mode',
        'tool_subtype',
        'folder_id',
        'sub_category',
        'compatible_brands',
        'serial_number',
        'quantity_on_hand',
        'initial_stock',
        'reorder_level',
        'unit',
        'capital',
        'profit',
        'selling_price',
        'supplier_name',
        'status',
    ];

    protected $casts = [
        'item_id' => 'integer',
        'folder_id' => 'integer',
        'quantity_on_hand' => 'integer',
        'initial_stock' => 'integer',
        'reorder_level' => 'integer',
        'capital' => 'decimal:2',
        'profit' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'compatible_brands' => 'array',
        'last_updated' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function folder()
    {
        return $this->belongsTo(InventoryFolder::class, 'folder_id', 'folder_id');
    }
}
