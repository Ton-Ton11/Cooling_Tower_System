<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ToolChecklistItem extends Model
{
    use HasFactory;

    protected $table = 'tool_checklist_items';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'checklist_id',
        'item_id',
        'item_type',
        'quantity_requested',
        'quantity_approved',
        'status',
        'notes',
    ];

    protected $casts = [
        'id' => 'integer',
        'checklist_id' => 'integer',
        'item_id' => 'integer',
        'quantity_requested' => 'integer',
        'quantity_approved' => 'integer',
    ];

    public function checklist()
    {
        return $this->belongsTo(ToolChecklist::class, 'checklist_id', 'checklist_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'item_id', 'item_id');
    }
}
