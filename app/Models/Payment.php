<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $table = 'payment';
    protected $primaryKey = 'payment_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'booking_id',
        'booking_price',
        'unit_price',
        'spare_parts_price',
        'amount_paid',
        'payment_status',
        'payment_method',
        'reference_number',
        'payment_type',
        'sender_name',
        'sender_number',
        'receipt_image',
        'notes',
        'payment_date',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'payment_id' => 'integer',
        'booking_id' => 'integer',
        'booking_price' => 'float',
        'unit_price' => 'float',
        'spare_parts_price' => 'float',
        'amount_paid' => 'float',
        'payment_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'booking_id');
    }
}
