<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentItem extends Model
{
    use HasFactory;

    protected $table = 'document_items';

    protected $fillable = [
        'document_id',
        'item_number',
        'description',
        'quantity',
        'unit_price',
        'discount',
        'tax_rate',
        'amount',
    ];

    protected $casts = [
        'id' => 'integer',
        'document_id' => 'integer',
        'item_number' => 'integer',
        'quantity' => 'float',
        'unit_price' => 'float',
        'discount' => 'float',
        'tax_rate' => 'float',
        'amount' => 'float',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'document_id', 'doc_id');
    }
}

