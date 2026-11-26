<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $receipt['document_title'] ?? 'Official Receipt' }} - {{ $receipt['receipt_number'] ?? '' }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 18mm 18mm 18mm 18mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: "Times New Roman", Times, Georgia, serif;
            font-size: 11px;
            line-height: 1.38;
            color: #000000;
            margin: 0;
            padding: 0;
            background: #ffffff;
            position: relative;
        }
        .print-toolbar {
            background: #0E1A33;
            color: #ffffff;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: Arial, Helvetica, sans-serif;
            margin-bottom: 20px;
        }
        .print-toolbar .btn {
            background: #3F7DFF;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-left: 8px;
        }
        .print-toolbar .btn-secondary {
            background: rgba(255, 255, 255, 0.16);
        }
        .page-wrapper {
            width: 100%;
            max-width: 780px;
            margin: 0 auto;
            position: relative;
        }
        @media print {
            .print-toolbar {
                display: none !important;
            }
            .page-wrapper {
                max-width: 100%;
                padding: 0;
            }
        }
        .void-watermark {
            position: fixed;
            top: 38%;
            left: 10%;
            width: 80%;
            text-align: center;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 86px;
            font-weight: 900;
            letter-spacing: 14px;
            color: rgba(220, 38, 38, 0.14);
            border: 6px solid rgba(220, 38, 38, 0.18);
            padding: 14px 0;
            transform: rotate(-28deg);
            z-index: 0;
            pointer-events: none;
        }
        .void-banner {
            border: 1.5px solid #b91c1c;
            background: #fef2f2;
            color: #991b1b;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: middle;
        }
        .doc-title {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 0.4px;
            margin: 0;
            text-transform: uppercase;
        }
        .doc-subtitle {
            font-size: 10.5px;
            margin: 3px 0 0 0;
            color: #333333;
        }
        .logo-img {
            width: 66px;
            height: 66px;
            object-fit: contain;
        }
        .address-table {
            margin-top: 14px;
            margin-bottom: 14px;
        }
        .address-table td {
            vertical-align: top;
        }
        .field-label-sm {
            font-size: 10px;
            margin-bottom: 3px;
        }
        .client-name {
            font-size: 12px;
            font-weight: bold;
            margin: 0 0 2px 0;
            text-transform: uppercase;
        }
        .client-address {
            font-size: 10.5px;
            margin: 0 0 2px 0;
            white-space: pre-line;
        }
        .company-name {
            font-size: 12.5px;
            font-weight: bold;
            margin: 0 0 2px 0;
        }
        .company-detail {
            font-size: 10px;
            line-height: 1.42;
            margin: 0;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 14px;
            border-top: 1px solid #cccccc;
            border-bottom: 1px solid #cccccc;
        }
        .meta-table th {
            text-align: left;
            font-size: 10px;
            font-weight: bold;
            padding: 5px 10px 2px 0;
            text-transform: uppercase;
            color: #333333;
        }
        .meta-table td {
            text-align: left;
            font-size: 10.5px;
            padding: 1px 10px 6px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .items-table thead tr {
            border-top: 2.2px solid #000000;
            border-bottom: 1px solid #000000;
        }
        .items-table th {
            font-size: 10.5px;
            font-weight: bold;
            padding: 6px 6px;
        }
        .items-table tbody tr {
            border-bottom: 0.8px solid #333333;
        }
        .items-table tbody tr.last-item-row {
            border-bottom: 2.2px solid #000000;
        }
        .items-table td {
            font-size: 10.5px;
            padding: 8px 6px;
            vertical-align: top;
        }
        .item-meta {
            font-size: 9.5px;
            color: #444444;
            margin-top: 2px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        .summary-table td {
            font-size: 10.5px;
            padding: 4px 6px;
        }
        .summary-line {
            border-bottom: 0.8px solid #000000;
        }
        .summary-double-line {
            border-top: 1.8px solid #000000;
        }
        .grand-total-row td {
            font-size: 11.5px;
            font-weight: bold;
            padding-top: 6px;
        }
        .paid-highlight-row td {
            font-size: 11.5px;
            font-weight: bold;
            background: #f8fafc;
            border-top: 1px solid #000000;
            border-bottom: 1.5px solid #000000;
            padding-top: 6px;
            padding-bottom: 6px;
        }
        .signatures-table {
            width: 100%;
            margin-top: 22px;
            page-break-inside: avoid;
        }
        .signatures-table td {
            vertical-align: top;
            font-size: 10.5px;
        }
        .sig-name {
            font-weight: bold;
            text-decoration: underline;
        }
        .sig-sub {
            font-size: 9.5px;
            margin-top: 2px;
        }
        .verification-box {
            margin-top: 22px;
            border: 1px solid #cbd5e1;
            padding: 9px 12px;
            background: #f8fafc;
            page-break-inside: avoid;
        }
        .verification-title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 3px 0;
        }
        .verification-url {
            font-family: "Courier New", Courier, monospace;
            font-size: 9.5px;
            word-break: break-all;
            margin: 0;
        }
    </style>
</head>
<body>
    @php
        $companyName = 'Cooling Tower Airconditioning Services';
        $companyAddress1 = 'Door #5, Aposol Building, Mayor Jaldon St., Canelar, Zamboanga City';
        $companyAddress2 = 'Zamboanga Del Sur, 7000, Philippines';
        $companyEmailPhone = 'ctair.zamboanga@yahoo.com/ +63 9178777670';
        $companyTin = '444-000-762-000';
        $companyBpi = 'Cooling Tower Airconditioning Services 9330-0112-78';
        $companyGcash = '0917-877-7670';

        $docKind = $receipt['document_kind'] ?? 'acknowledgement_receipt';
        $headerTitle = match ($docKind) {
            'sales_invoice' => 'OFFICIAL SALES INVOICE',
            'service_invoice' => 'OFFICIAL SERVICE INVOICE',
            default => 'ACKNOWLEDGEMENT RECEIPT',
        };

        $isVoided = ($receipt['status'] ?? 'Issued') === 'Voided';
        $isVoidRequested = ($receipt['status'] ?? 'Issued') === 'Void Requested';
        $items = $receipt['items'] ?? [];
        $subtotal = (float) ($receipt['subtotal'] ?? 0);
        $discountTotal = (float) ($receipt['discount_total'] ?? 0);
        $vatableSales = (float) ($receipt['vatable_sales'] ?? 0);
        $vatAmount = (float) ($receipt['vat_amount'] ?? 0);
        $grandTotal = (float) ($receipt['grand_total'] ?? 0);
        $priorCredited = (float) ($receipt['prior_payments_credited'] ?? 0);
        $amountPaidNow = (float) ($receipt['amount_paid_now'] ?? 0);
        $balanceAfter = (float) ($receipt['balance_after'] ?? 0);
        $effectiveRef = $receipt['effective_reference_number'] ?? $receipt['external_reference_number'] ?? null;

        $issuedFormatted = !empty($receipt['issued_at'])
            ? \Illuminate\Support\Carbon::parse($receipt['issued_at'])->format('d-M-Y h:i A')
            : now()->format('d-M-Y h:i A');
    @endphp

    @if(!empty($isPrintMode))
        <div class="print-toolbar">
            <div>
                <strong>{{ $headerTitle }}</strong> &mdash; {{ $receipt['receipt_number'] }} ({{ $receipt['customer_name'] }})
            </div>
            <div>
                <button type="button" class="btn" onclick="window.print()">Print</button>
                @if(!empty($pdfDownloadUrl))
                    <a class="btn btn-secondary" href="{{ $pdfDownloadUrl }}?download=1">Download PDF</a>
                @endif
                <button type="button" class="btn btn-secondary" onclick="window.close()">Close</button>
            </div>
        </div>
    @endif

    @if($isVoided)
        <div class="void-watermark">VOIDED</div>
    @endif

    <div class="page-wrapper" style="{{ !empty($isPrintMode) ? 'padding: 10px 24px 40px;' : '' }}">
        @if($isVoided)
            <div class="void-banner">
                <strong>VOIDED DOCUMENT:</strong> This {{ strtolower($headerTitle) }} was officially voided
                @if(!empty($receipt['voided_at_formatted'])) on {{ $receipt['voided_at_formatted'] }} @endif
                @if(!empty($receipt['void_reason'])) &mdash; Reason: {{ $receipt['void_reason'] }} @endif
            </div>
        @elseif($isVoidRequested)
            <div class="void-banner" style="border-color: #d97706; background: #fffbeb; color: #92400e;">
                <strong>VOID REQUESTED:</strong> Pending Manager / Super Admin review.
            </div>
        @endif

        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="width: 72%;">
                    <h1 class="doc-title">{{ $headerTitle }}</h1>
                    <p class="doc-subtitle">Document No. <strong>{{ $receipt['receipt_number'] }}</strong></p>
                </td>
                <td style="width: 28%; text-align: right; padding-right: 12px;">
                    @if(!empty($logoBase64))
                        <img src="{{ $logoBase64 }}" alt="Company Logo" class="logo-img">
                    @endif
                </td>
            </tr>
        </table>

        <!-- Customer / Company Block -->
        <table class="address-table">
            <tr>
                <td style="width: 52%; padding-right: 16px;">
                    <div class="field-label-sm">Billed / Issued To:</div>
                    @if(!empty($receipt['company_name']))
                        <p class="client-name">{{ $receipt['company_name'] }}</p>
                        <p class="client-address"><strong>Attn:</strong> {{ $receipt['customer_name'] }}</p>
                    @else
                        <p class="client-name">{{ $receipt['customer_name'] }}</p>
                    @endif
                    @if(!empty($receipt['tin']))
                        <p class="client-address"><strong>TIN:</strong> {{ $receipt['tin'] }}</p>
                    @endif
                    @if(!empty($receipt['contact_number']))
                        <p class="client-address"><strong>Contact:</strong> {{ $receipt['contact_number'] }}</p>
                    @endif
                    @if(!empty($receipt['customer_address']))
                        <p class="client-address">{{ $receipt['customer_address'] }}</p>
                    @endif
                </td>
                <td style="width: 48%;">
                    <div class="field-label-sm">From:</div>
                    <p class="company-name">{{ $companyName }}</p>
                    <p class="company-detail">{{ $companyAddress1 }}</p>
                    <p class="company-detail">{{ $companyAddress2 }}</p>
                    <p class="company-detail">{{ $companyEmailPhone }}</p>
                    <p class="company-detail"><strong>TIN:</strong> {{ $companyTin }}</p>
                    <p class="company-detail"><strong>BPI ACCOUNT</strong> - {{ $companyBpi }}</p>
                    <p class="company-detail"><strong>GCash</strong> - {{ $companyGcash }}</p>
                </td>
            </tr>
        </table>

        <!-- Transaction Metadata -->
        <table class="meta-table">
            <thead>
                <tr>
                    <th style="width: 26%;">Receipt / Invoice #</th>
                    <th style="width: 26%;">Issued Date &amp; Time</th>
                    <th style="width: 28%;">Linked Reference</th>
                    <th style="width: 20%;">Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>{{ $receipt['receipt_number'] }}</strong></td>
                    <td>{{ $issuedFormatted }}</td>
                    <td>{{ $receipt['linked_reference'] ?? '—' }}</td>
                    <td><strong>{{ strtoupper($receipt['status'] ?? 'ISSUED') }}</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- Itemized Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="text-left" style="width: 54%;">Item / Description</th>
                    <th class="text-center" style="width: 14%;">Qty</th>
                    <th class="text-right" style="width: 16%;">Unit Price</th>
                    <th class="text-right" style="width: 16%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse($items as $idx => $item)
                    @php
                        $isLast = $idx === count($items) - 1;
                        $qtyVal = (float) ($item['quantity'] ?? 1);
                        $qtyDisplay = floor($qtyVal) == $qtyVal ? number_format($qtyVal, 0) : number_format($qtyVal, 2);
                    @endphp
                    <tr class="{{ $isLast ? 'last-item-row' : '' }}">
                        <td class="text-left">
                            <div><strong>{{ $item['description'] }}</strong></div>
                            @if(!empty($item['item_meta']))
                                <div class="item-meta">{{ $item['item_meta'] }}</div>
                            @endif
                        </td>
                        <td class="text-center">{{ $qtyDisplay }} {{ $item['unit'] ?? '' }}</td>
                        <td class="text-right">&#8369;{{ number_format((float) ($item['unit_price'] ?? 0), 2) }}</td>
                        <td class="text-right">&#8369;{{ number_format((float) ($item['line_total'] ?? 0), 2) }}</td>
                    </tr>
                @empty
                    <tr class="last-item-row">
                        <td colspan="4" class="text-center">No line items recorded.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <!-- VAT & Payment Breakdown -->
        <table class="summary-table">
            <tr>
                <td style="width: 54%;"></td>
                <td class="summary-line text-right" style="width: 28%;">Sub-total</td>
                <td class="summary-line text-right" style="width: 18%;">&#8369;{{ number_format($subtotal, 2) }}</td>
            </tr>
            @if($discountTotal > 0)
                <tr>
                    <td></td>
                    <td class="text-right">Less: Discount</td>
                    <td class="text-right">-&#8369;{{ number_format($discountTotal, 2) }}</td>
                </tr>
            @endif
            <tr>
                <td></td>
                <td class="text-right">Vatable Sales</td>
                <td class="text-right">&#8369;{{ number_format($vatableSales, 2) }}</td>
            </tr>
            <tr>
                <td></td>
                <td class="summary-line text-right">12% VAT (Inclusive)</td>
                <td class="summary-line text-right">&#8369;{{ number_format($vatAmount, 2) }}</td>
            </tr>
            <tr class="grand-total-row">
                <td></td>
                <td class="summary-double-line text-right">Grand Total</td>
                <td class="summary-double-line text-right">&#8369;{{ number_format($grandTotal, 2) }}</td>
            </tr>
            @if($priorCredited > 0)
                <tr>
                    <td></td>
                    <td class="text-right">
                        Less: Prior Payment Credited
                        @if(!empty($receipt['parent_receipt_number']))
                            ({{ $receipt['parent_receipt_number'] }})
                        @endif
                    </td>
                    <td class="text-right">-&#8369;{{ number_format($priorCredited, 2) }}</td>
                </tr>
            @endif
            <tr class="paid-highlight-row">
                <td></td>
                <td class="text-right">Amount Paid</td>
                <td class="text-right">&#8369;{{ number_format($amountPaidNow, 2) }}</td>
            </tr>
            <tr>
                <td></td>
                <td class="summary-line text-right"><strong>Remaining Balance</strong></td>
                <td class="summary-line text-right"><strong>&#8369;{{ number_format($balanceAfter, 2) }}</strong></td>
            </tr>
        </table>

        <!-- Signatory & Payment Details Footer -->
        <table class="signatures-table">
            <tr>
                <td style="width: 36%; padding-right: 12px;">
                    <div>Confirmed By: <span class="sig-name">{{ $receipt['issued_by_name'] ?? 'Authorized Staff' }}</span></div>
                    <div class="sig-sub" style="padding-left: 68px;">{{ $receipt['issued_by_role'] ?? 'Staff' }}</div>
                    <div class="sig-sub">{{ $companyName }}</div>
                </td>
                <td style="width: 34%; padding-right: 12px;">
                    <div><strong>Payment Method:</strong> {{ $receipt['payment_method'] ?? 'Cash' }}</div>
                    @if(!empty($effectiveRef))
                        <div class="sig-sub"><strong>GCash Ref #:</strong> {{ $effectiveRef }}</div>
                    @endif
                    <div class="sig-sub"><strong>Transaction Date:</strong> {{ $issuedFormatted }}</div>
                </td>
                <td style="width: 30%; vertical-align: top;">
                    <div style="border-bottom: 1px solid #000000; text-align: center; min-height: 18px; padding-bottom: 1px; font-size: 10.5px;">
                        {{ $receipt['customer_name'] ?? '' }}
                    </div>
                    <div class="sig-sub" style="text-align: center; margin-top: 3px;">
                        Customer Signature over Printed Name
                    </div>
                </td>
            </tr>
        </table>

        <!-- Cryptographic Verification Footer -->
        <div class="verification-box">
            <p class="verification-title">
                Authenticity Verification &bull; Code: {{ strtoupper($receipt['verification_code'] ?? '') }}
            </p>
            <p class="verification-url">
                Verify online: {{ $receipt['verification_url'] ?? '' }}
            </p>
        </div>
    </div>

    @if(!empty($isPrintMode))
        <script>
            window.addEventListener('load', function () {
                setTimeout(function () {
                    window.print();
                }, 250);
            });
        </script>
    @endif
</body>
</html>
