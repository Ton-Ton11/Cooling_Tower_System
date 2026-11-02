<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerUnitDetail extends Model
{
    use HasFactory;

    protected $table = 'customer_unit_details';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'int';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'aircon_brand',
        'aircon_type',
        'unit_quantity',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'unit_quantity' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
