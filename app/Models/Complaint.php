<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    use HasFactory;

    protected $table = 'customer_complaints';
    protected $primaryKey = 'complaint_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'customer_id',
        'booking_id',
        'complaint_details',
        'complaint_date',
        'status',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'complaint_id' => 'integer',
        'customer_id' => 'integer',
        'booking_id' => 'integer',
        'complaint_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id', 'user_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'booking_id');
    }
}
