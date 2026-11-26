<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Receipt - {{ $receiptNumber }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
        }
        .card {
            max-width: 520px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 18px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 20px;
        }
        .brand img {
            width: 44px;
            height: 44px;
            object-fit: contain;
            border-radius: 8px;
        }
        .brand-name {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
        }
        .brand-sub {
            font-size: 12px;
            color: #64748b;
            margin: 2px 0 0 0;
        }
        .status-banner {
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 20px;
        }
        .status-valid {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
        }
        .status-voided {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }
        .status-pending-void {
            background: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
        }
        .status-invalid {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }
        .status-title {
            font-size: 15px;
            font-weight: 700;
            margin: 0 0 4px 0;
        }
        .status-desc {
            font-size: 12.5px;
            margin: 0;
        }
        .row {
            display: flex;
            justify-content: space-between;
            padding: 9px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
            gap: 12px;
        }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .value { font-weight: 600; text-align: right; color: #0f172a; }
        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 11.5px;
            font-weight: 700;
        }
        .badge-issued { background: #d1fae5; color: #065f46; }
        .badge-void-req { background: #fef3c7; color: #92400e; }
        .badge-voided { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <main class="card">
        <div class="brand">
            @if(!empty($logoBase64))
                <img src="{{ $logoBase64 }}" alt="Cooling Tower Logo">
            @endif
            <div>
                <p class="brand-name">Cooling Tower Airconditioning Services</p>
                <p class="brand-sub">Official Receipt &amp; Invoice Verification</p>
            </div>
        </div>

        @if($isAuthentic && $receipt)
            @php
                $docStatus = $receipt['status'] ?? 'Issued';
                $bannerClass = $docStatus === 'Voided'
                    ? 'status-voided'
                    : ($docStatus === 'Void Requested' ? 'status-pending-void' : 'status-valid');
                $badgeClass = $docStatus === 'Voided'
                    ? 'badge-voided'
                    : ($docStatus === 'Void Requested' ? 'badge-void-req' : 'badge-issued');
            @endphp

            <div class="status-banner {{ $bannerClass }}">
                <p class="status-title">
                    @if($docStatus === 'Voided')
                        Authentic Document &mdash; VOIDED
                    @else
                        Verified Authentic Document
                    @endif
                </p>
                <p class="status-desc">
                    Cryptographic signature verified for {{ $receipt['receipt_number'] }}.
                    @if($docStatus === 'Voided' && !empty($receipt['void_reason']))
                        Void reason: {{ $receipt['void_reason'] }}
                    @endif
                </p>
            </div>

            <div>
                <div class="row">
                    <span class="label">Document Number</span>
                    <span class="value">{{ $receipt['receipt_number'] }}</span>
                </div>
                <div class="row">
                    <span class="label">Document Type</span>
                    <span class="value">{{ $receipt['document_title'] }}</span>
                </div>
                <div class="row">
                    <span class="label">Status</span>
                    <span class="value">
                        <span class="badge {{ $badgeClass }}">{{ $docStatus }}</span>
                    </span>
                </div>
                <div class="row">
                    <span class="label">Issued To</span>
                    <span class="value">{{ $receipt['company_name'] ?: $receipt['customer_name'] }}</span>
                </div>
                <div class="row">
                    <span class="label">Reference</span>
                    <span class="value">{{ $receipt['linked_reference'] }}</span>
                </div>
                <div class="row">
                    <span class="label">Issued Date</span>
                    <span class="value">{{ $receipt['issued_at_formatted'] }}</span>
                </div>
                <div class="row">
                    <span class="label">Grand Total</span>
                    <span class="value">&#8369;{{ number_format((float) $receipt['grand_total'], 2) }}</span>
                </div>
                <div class="row">
                    <span class="label">Amount Paid</span>
                    <span class="value">&#8369;{{ number_format((float) $receipt['amount_paid_now'], 2) }} ({{ $receipt['payment_method'] }})</span>
                </div>
                <div class="row">
                    <span class="label">Confirmed By</span>
                    <span class="value">{{ $receipt['issued_by_name'] }} ({{ $receipt['issued_by_role'] }})</span>
                </div>
            </div>
        @else
            <div class="status-banner status-invalid">
                <p class="status-title">Verification Failed</p>
                <p class="status-desc">
                    Document <strong>{{ $receiptNumber }}</strong> with verification code <strong>{{ $providedCode }}</strong> could not be verified. Please check the receipt number and code.
                </p>
            </div>
        @endif
    </main>
</body>
</html>
