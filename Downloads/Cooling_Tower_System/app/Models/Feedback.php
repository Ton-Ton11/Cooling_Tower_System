<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    use HasFactory;

    protected $table = 'customer_feedback_and_ratings';
    protected $primaryKey = 'feedback_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'booking_id',
        'rating',
        'feedback',
        'submitted_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'feedback_id' => 'integer',
        'booking_id' => 'integer',
        'rating' => 'integer',
        'submitted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'booking_id');
    }
}
