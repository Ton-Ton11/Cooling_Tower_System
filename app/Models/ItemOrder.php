<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemOrder extends Model
{
    use HasFactory;

    protected $table = 'item_orders';
    protected $primaryKey = 'order_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'client_id',
        'item_id',
        'item_category',
        'quantity',
        'is_order_base',
        'stock_deducted',
        'unit_price',
        'total_amount',
        'down_payment_amount',
        'amount_paid',
        'remaining_balance',
        'payment_method',
        'reference_number',
        'sender_name',
        'sender_number',
        'payment_receipt_path',
        'payment_review_status',
        'payment_incomplete_reason',
        'payment_incomplete_at',
        'payment_deadline_at',
        'fulfillment_type',
        'linked_booking_id',
        'order_status',
        'cancellation_reason',
        'confirmed_by',
        'confirmed_by_name',
        'transaction_date',
        'receipt_reference_number',
        'notes',
    ];

    protected $casts = [
        'order_id' => 'integer',
        'client_id' => 'integer',
        'item_id' => 'integer',
        'quantity' => 'integer',
        'is_order_base' => 'boolean',
        'stock_deducted' => 'boolean',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'down_payment_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'linked_booking_id' => 'integer',
        'confirmed_by' => 'integer',
        'payment_incomplete_at' => 'datetime',
        'payment_deadline_at' => 'datetime',
        'transaction_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id', 'user_id');
    }

    public function item()
    {
        return $this->belongsTo(InventoryItem::class, 'item_id', 'item_id');
    }

    public function linkedBooking()
    {
        return $this->belongsTo(Booking::class, 'linked_booking_id', 'booking_id');
    }

    public function confirmedByUser()
    {
        return $this->belongsTo(User::class, 'confirmed_by', 'user_id');
    }
}
