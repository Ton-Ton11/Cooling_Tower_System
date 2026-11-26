<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use LogicException;

class ReceiptItem extends Model
{
    use HasFactory;

    protected $table = 'receipt_items';

    protected $fillable = [
        'receipt_id',
        'description',
        'item_meta',
        'quantity',
        'unit',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'id' => 'integer',
        'receipt_id' => 'integer',
        'quantity' => 'float',
        'unit_price' => 'float',
        'line_total' => 'float',
    ];

    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new LogicException('Official receipt items are immutable and cannot be modified.');
        });

        static::deleting(function (): void {
            throw new LogicException('Official receipt items are immutable and cannot be deleted.');
        });
    }

    public function receipt()
    {
        return $this->belongsTo(Receipt::class, 'receipt_id', 'receipt_id');
    }
}
