<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use LogicException;

class Receipt extends Model
{
    use HasFactory;

    public const KIND_ACKNOWLEDGEMENT = 'acknowledgement_receipt';
    public const KIND_SALES_INVOICE = 'sales_invoice';
    public const KIND_SERVICE_INVOICE = 'service_invoice';

    public const CATEGORY_INSTALLATION = 'installation';
    public const CATEGORY_REPAIR = 'repair';
    public const CATEGORY_CLEANING = 'cleaning';
    public const CATEGORY_ITEM_ORDER = 'item_order';
    public const CATEGORY_AC_UNIT_ORDER = 'ac_unit_order';

    public const SOURCE_BOOKING = 'booking';
    public const SOURCE_ITEM_ORDER = 'item_order';
    public const SOURCE_AC_UNIT_ORDER = 'ac_unit_order';

    public const STATUS_ISSUED = 'Issued';
    public const STATUS_VOID_REQUESTED = 'Void Requested';
    public const STATUS_VOIDED = 'Voided';

    private const ALLOWED_VOID_MUTATION_FIELDS = [
        'status',
        'void_requested_by',
        'void_reason',
        'void_approved_by',
        'voided_at',
        'active_gcash_reference',
        'updated_at',
    ];

    protected $table = 'receipts';
    protected $primaryKey = 'receipt_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected bool $voidTransitionAuthorized = false;

    protected $fillable = [
        'receipt_number',
        'document_kind',
        'transaction_category',
        'source_type',
        'source_id',
        'parent_receipt_id',
        'client_id',
        'customer_name',
        'company_name',
        'tin',
        'customer_address',
        'contact_number',
        'subtotal',
        'discount_total',
        'vatable_sales',
        'vat_amount',
        'grand_total',
        'prior_payments_credited',
        'amount_paid_now',
        'balance_after',
        'payment_method',
        'external_reference_number',
        'active_gcash_reference',
        'payment_receipt_path',
        'issued_by_user_id',
        'issued_by_name',
        'issued_by_role',
        'issued_at',
        'verification_hash',
        'status',
        'void_requested_by',
        'void_reason',
        'void_approved_by',
        'voided_at',
    ];

    protected $casts = [
        'receipt_id' => 'integer',
        'source_id' => 'integer',
        'parent_receipt_id' => 'integer',
        'client_id' => 'integer',
        'subtotal' => 'float',
        'discount_total' => 'float',
        'vatable_sales' => 'float',
        'vat_amount' => 'float',
        'grand_total' => 'float',
        'prior_payments_credited' => 'float',
        'amount_paid_now' => 'float',
        'balance_after' => 'float',
        'issued_by_user_id' => 'integer',
        'issued_at' => 'datetime',
        'void_requested_by' => 'integer',
        'void_approved_by' => 'integer',
        'voided_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $receipt): void {
            $extRef = $receipt->external_reference_number !== null
                ? trim((string) $receipt->external_reference_number)
                : '';
            $receipt->external_reference_number = $extRef !== '' ? $extRef : null;
            $receipt->status = $receipt->status ?: self::STATUS_ISSUED;

            if (
                strcasecmp((string) $receipt->payment_method, 'GCash') === 0
                && $receipt->external_reference_number !== null
                && $receipt->status !== self::STATUS_VOIDED
            ) {
                $duplicateExists = self::query()
                    ->where('payment_method', 'GCash')
                    ->where('status', '!=', self::STATUS_VOIDED)
                    ->where('external_reference_number', $receipt->external_reference_number)
                    ->exists();

                if ($duplicateExists) {
                    throw ValidationException::withMessages([
                        'reference_number' => [
                            "GCash reference number ({$receipt->external_reference_number}) has already been used on an active receipt.",
                        ],
                    ]);
                }

                $receipt->active_gcash_reference = $receipt->external_reference_number;
            } else {
                $receipt->active_gcash_reference = null;
            }
        });

        static::updating(function (self $receipt): void {
            if (! $receipt->voidTransitionAuthorized) {
                throw new LogicException('Official receipts are immutable and cannot be updated directly.');
            }

            $dirtyKeys = array_keys($receipt->getDirty());
            foreach ($dirtyKeys as $dirtyKey) {
                if (! in_array($dirtyKey, self::ALLOWED_VOID_MUTATION_FIELDS, true)) {
                    throw new LogicException("Official receipt field [{$dirtyKey}] is immutable and cannot be modified.");
                }
            }

            $originalStatus = (string) $receipt->getOriginal('status');
            $nextStatus = (string) $receipt->status;

            $validTransition =
                ($originalStatus === self::STATUS_ISSUED && $nextStatus === self::STATUS_VOID_REQUESTED)
                || ($originalStatus === self::STATUS_VOID_REQUESTED && $nextStatus === self::STATUS_VOIDED);

            if (! $validTransition) {
                throw new LogicException("Invalid receipt status transition from [{$originalStatus}] to [{$nextStatus}].");
            }
        });

        static::updated(function (self $receipt): void {
            $receipt->voidTransitionAuthorized = false;
        });

        static::deleting(function (): void {
            throw new LogicException('Official receipts are immutable and cannot be deleted.');
        });
    }

    /**
     * Transition an Issued receipt to Void Requested (invoked strictly by ReceiptService::requestVoid).
     */
    public function applyVoidRequest(int $requestedByUserId, string $reason): void
    {
        $this->voidTransitionAuthorized = true;
        $this->status = self::STATUS_VOID_REQUESTED;
        $this->void_requested_by = $requestedByUserId;
        $this->void_reason = trim($reason);
        $this->save();
    }

    /**
     * Transition a Void Requested receipt to Voided (invoked strictly by ReceiptService::approveVoid).
     */
    public function applyVoidApproval(int $approvedByUserId): void
    {
        $this->voidTransitionAuthorized = true;
        $this->status = self::STATUS_VOIDED;
        $this->void_approved_by = $approvedByUserId;
        $this->voided_at = now();
        $this->active_gcash_reference = null;
        $this->save();
    }

    public static function generateVerificationHash(array $payload): string
    {
        $issuedAtIso = $payload['issued_at'] instanceof \DateTimeInterface
            ? $payload['issued_at']->format('Y-m-d H:i:s')
            : (string) ($payload['issued_at'] ?? '');

        $canonical = implode('|', [
            (string) ($payload['receipt_number'] ?? ''),
            (string) ($payload['document_kind'] ?? ''),
            (string) ($payload['source_type'] ?? ''),
            (string) ($payload['source_id'] ?? ''),
            (string) ($payload['client_id'] ?? ''),
            number_format((float) ($payload['grand_total'] ?? 0), 2, '.', ''),
            number_format((float) ($payload['amount_paid_now'] ?? 0), 2, '.', ''),
            $issuedAtIso,
        ]);

        return hash_hmac('sha256', $canonical, (string) config('app.key', 'cooling-tower-receipt-key'));
    }

    public function verificationCodePrefix(): string
    {
        return substr((string) $this->verification_hash, 0, 12);
    }

    public function matchesVerificationCode(string $code): bool
    {
        $normalized = strtolower(trim($code));
        if ($normalized === '' || strlen($normalized) < 8) {
            return false;
        }

        $expectedPrefix = strtolower($this->verificationCodePrefix());
        $expectedFull = strtolower((string) $this->verification_hash);

        return hash_equals($expectedPrefix, $normalized) || hash_equals($expectedFull, $normalized);
    }

    public function items()
    {
        return $this->hasMany(ReceiptItem::class, 'receipt_id', 'receipt_id')->orderBy('id');
    }

    public function parentReceipt()
    {
        return $this->belongsTo(self::class, 'parent_receipt_id', 'receipt_id');
    }

    public function childReceipts()
    {
        return $this->hasMany(self::class, 'parent_receipt_id', 'receipt_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id', 'user_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(User::class, 'issued_by_user_id', 'user_id');
    }

    public function voidRequestedByUser()
    {
        return $this->belongsTo(User::class, 'void_requested_by', 'user_id');
    }

    public function voidApprovedByUser()
    {
        return $this->belongsTo(User::class, 'void_approved_by', 'user_id');
    }
}
