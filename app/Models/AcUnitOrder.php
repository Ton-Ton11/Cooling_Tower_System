<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcUnitOrder extends Model
{
    use HasFactory;

    protected $table = 'ac_unit_orders';
    protected $primaryKey = 'order_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ocular_booking_id',
        'installation_booking_id',
        'client_id',
        'recommendation_id',
        'ac_unit_id',
        'quantity',
        'unit_price',
        'total_unit_price',
        'down_payment_amount',
        'remaining_unit_balance',
        'delivery_fee',
        'installation_fee',
        'payment_method',
        'fulfillment_type',
        'reference_number',
        'sender_name',
        'sender_number',
        'down_payment_receipt_path',
        'manager_receipt_path',
        'delivery_address',
        'contact_number',
        'installation_fee_forfeited',
        'order_status',
        'confirmed_by',
        'confirmed_at',
        'notes',
    ];

    protected $casts = [
        'order_id' => 'integer',
        'ocular_booking_id' => 'integer',
        'installation_booking_id' => 'integer',
        'client_id' => 'integer',
        'recommendation_id' => 'integer',
        'ac_unit_id' => 'integer',
        'quantity' => 'integer',
        'unit_price' => 'float',
        'total_unit_price' => 'float',
        'down_payment_amount' => 'float',
        'remaining_unit_balance' => 'float',
        'delivery_fee' => 'float',
        'installation_fee' => 'float',
        'installation_fee_forfeited' => 'boolean',
        'confirmed_by' => 'integer',
        'confirmed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id', 'user_id');
    }

    public function ocularBooking()
    {
        return $this->belongsTo(Booking::class, 'ocular_booking_id', 'booking_id');
    }

    public function installationBooking()
    {
        return $this->belongsTo(Booking::class, 'installation_booking_id', 'booking_id');
    }

    public function confirmedByUser()
    {
        return $this->belongsTo(User::class, 'confirmed_by', 'user_id');
    }
}
