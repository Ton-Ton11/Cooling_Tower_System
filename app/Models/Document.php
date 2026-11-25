<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasFactory;

    protected $table = 'documents';
    protected $primaryKey = 'doc_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const TYPE_QUOTATION = 'quotation';
    public const TYPE_STATEMENT = 'statement_of_account';

    protected $fillable = [
        'document_number',
        'document_type',
        'booking_id',
        'created_by',
        'form_name',
        'client_name',
        'client_address',
        'attention_to',
        'subject',
        'service_name',
        'issue_date',
        'due_date',
        'expiry_date',
        'subtotal',
        'discount_total',
        'vatable_amount',
        'tax_rate',
        'tax_total',
        'grand_total',
        'inclusions',
        'exclusions',
        'workmanship',
        'payment_terms',
        'additional_details',
        'prepared_by_name',
        'prepared_by_title',
        'approved_by_name',
        'approved_by_title',
        'received_by_name',
        'received_date',
        'status',
        'file_path',
        'notes',
    ];

    protected $casts = [
        'doc_id' => 'integer',
        'booking_id' => 'integer',
        'created_by' => 'integer',
        'issue_date' => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',
        'expiry_date' => 'date:Y-m-d',
        'received_date' => 'date:Y-m-d',
        'subtotal' => 'float',
        'discount_total' => 'float',
        'vatable_amount' => 'float',
        'tax_rate' => 'float',
        'tax_total' => 'float',
        'grand_total' => 'float',
        'additional_details' => 'array',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(DocumentItem::class, 'document_id', 'doc_id')
            ->orderBy('item_number')
            ->orderBy('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'booking_id');
    }
}

