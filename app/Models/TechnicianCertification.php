<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TechnicianCertification extends Model
{
    use HasFactory;

    protected $table = 'technician_certifications';
    protected $primaryKey = 'certification_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'user_id',
        'certification_name',
        'issuing_body',
        'certificate_number',
        'issued_date',
        'expiry_date',
        'renewal_lead_days',
        'status',
        'last_reminded_at',
        'notes',
    ];

    protected $casts = [
        'certification_id' => 'integer',
        'user_id' => 'integer',
        'issued_date' => 'date',
        'expiry_date' => 'date',
        'renewal_lead_days' => 'integer',
        'last_reminded_at' => 'datetime',
    ];

    public function technician()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
