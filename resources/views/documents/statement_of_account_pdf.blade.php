<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Statement of Account - {{ $document['document_number'] ?? 'SOA-01' }}</title>
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
            line-height: 1.4;
            color: #000000;
            margin: 0;
            padding: 0;
            background: #ffffff;
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
        .logo-img {
            width: 68px;
            height: 68px;
            object-fit: contain;
        }
        .address-table {
            margin-top: 16px;
            margin-bottom: 26px;
        }
        .address-table td {
            vertical-align: top;
        }
        .bill-to-label {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .client-name {
            font-size: 12px;
            font-weight: bold;
            margin: 0 0 2px 0;
            text-transform: uppercase;
        }
        .attention-to {
            font-size: 10.5px;
            margin: 0 0 2px 0;
            text-transform: uppercase;
        }
        .client-address {
            font-size: 10.5px;
            margin: 0;
            white-space: pre-line;
            text-transform: uppercase;
        }
        .company-name {
            font-size: 12.5px;
            font-weight: bold;
            margin: 14px 0 2px 0;
        }
        .company-detail {
            font-size: 10px;
            line-height: 1.45;
            margin: 0;
        }
        .company-email {
            text-decoration: underline;
        }
        .meta-table {
            width: 62%;
            margin-bottom: 18px;
        }
        .meta-table th {
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 12px 6px 0;
        }
        .meta-table td {
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 12px 2px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
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
            border-bottom: 1.2px solid #000000;
        }
        .items-table td {
            font-size: 10.5px;
            padding: 11px 6px;
            vertical-align: middle;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .text-left {
            text-align: left;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 36px;
        }
        .summary-table td {
            font-size: 11px;
            padding: 6px 6px;
        }
        .summary-line {
            border-bottom: 1.8px solid #000000;
        }
        .amount-due-row td {
            font-size: 11.5px;
            font-weight: bold;
            padding-top: 7px;
        }
        .signatures-table {
            width: 100%;
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signatures-table td {
            vertical-align: top;
            font-size: 11px;
        }
        .sig-name {
            font-weight: bold;
            text-decoration: underline;
        }
        .sig-sub {
            font-size: 9.5px;
            margin-top: 2px;
        }
        .received-line {
            display: inline-block;
            border-bottom: 1px solid #000000;
            min-width: 155px;
            height: 14px;
            vertical-align: bottom;
        }
    </style>
</head>
<body>
    @if(!empty($isPrintMode))
        <div class="print-toolbar">
            <div>
                <strong>STATEMENT OF ACCOUNT</strong> &mdash; {{ $document['document_number'] }} ({{ $document['client_name'] }})
            </div>
            <div>
                <button class="btn" onclick="window.print()">Print Document</button>
                <a class="btn btn-secondary" href="{{ route('super-admin.documents.pdf', ['docId' => $document['doc_id']]) }}">Download PDF</a>
                <button class="btn btn-secondary" onclick="window.close()">Close</button>
            </div>
        </div>
    @endif

    @php
        $company = $document['additional_details']['company'] ?? [];
        $companyName = $company['name'] ?? 'Cooling Tower Airconditioning Services';
        $companyAddress1 = $company['address_line1'] ?? 'Door no. 5 Apostol Building, Mayor Jaldon St., Canelar, Zamboanga City,';
        $companyAddress2 = $company['address_line2'] ?? 'Zamboanga Del Sur 7000';
        $companyEmail = $company['email'] ?? 'ctair.zamboanga@yahoo.com';
        $companyPhone = $company['phone'] ?? '+63 9178777670';
        $companyBpiName = $company['bpi_account_name'] ?? 'Cooling Tower Airconditioning Services';
        $companyBpiNo = $company['bpi_account_number'] ?? '9330011278';
        $companyGcash = $company['gcash'] ?? '09178777670';

        $formatDocDate = function ($dateVal) {
            if (empty($dateVal)) return '—';
            try {
                return \Illuminate\Support\Carbon::parse($dateVal)->format('d-M-y');
            } catch (\Throwable $e) {
                return $dateVal;
            }
        };

        $items = $document['items'] ?? [];
        $subtotal = (float) ($document['subtotal'] ?? 0);
        $taxTotal = (float) ($document['tax_total'] ?? 0);
        $taxRate = (float) ($document['tax_rate'] ?? 0);
        $grandTotal = (float) ($document['grand_total'] ?? 0);
        $taxMode = $document['additional_details']['tax_mode'] ?? 'inclusive';
    @endphp

    <div class="page-wrapper" style="{{ !empty($isPrintMode) ? 'padding: 10px 24px 40px;' : '' }}">
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="width: 70%;">
                    <h1 class="doc-title">STATEMENT OF ACCOUNT</h1>
                </td>
                <td style="width: 30%; text-align: right; padding-right: 25px;">
                    @if(!empty($logoBase64))
                        <img src="{{ $logoBase64 }}" alt="Company Logo" class="logo-img">
                    @endif
                </td>
            </tr>
        </table>

        <!-- Bill To / Company Information -->
        <table class="address-table">
            <tr>
                <td style="width: 52%; padding-right: 16px;">
                    <div class="bill-to-label">Bill to:</div>
                    <p class="client-name">{{ $document['client_name'] }}</p>
                    @if(!empty($document['attention_to']))
                        <p class="attention-to">{{ $document['attention_to'] }}</p>
                    @endif
                    @if(!empty($document['client_address']))
                        <p class="client-address">{{ $document['client_address'] }}</p>
                    @endif
                </td>
                <td style="width: 48%;">
                    <p class="company-name">{{ $companyName }}</p>
                    <p class="company-detail">{{ $companyAddress1 }}</p>
                    <p class="company-detail">{{ $companyAddress2 }}</p>
                    <p class="company-detail"><span class="company-email">{{ $companyEmail }}</span></p>
                    <p class="company-detail">{{ $companyPhone }}</p>
                    <p class="company-detail">BPI account name: {{ $companyBpiName }}</p>
                    <p class="company-detail">BPI account no.: {{ $companyBpiNo }}</p>
                    <p class="company-detail">Gcash: {{ $companyGcash }}</p>
                </td>
            </tr>
        </table>

        <!-- Statement Information: Amount Due, Due Date, Issue Date -->
        <table class="meta-table">
            <thead>
                <tr>
                    <th style="width: 55%;">Amount due</th>
                    <th style="width: 23%;">Due date</th>
                    <th style="width: 22%;">Issue date</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>&#8369;{{ number_format($grandTotal, 2) }}</td>
                    <td>{{ $formatDocDate($document['due_date'] ?? null) }}</td>
                    <td>{{ $formatDocDate($document['issue_date'] ?? null) }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Itemized Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="text-center" style="width: 8%;">Item no.</th>
                    <th class="text-center" style="width: 44%;">Item/Work Description</th>
                    <th class="text-right" style="width: 10%;">Quantity</th>
                    <th class="text-right" style="width: 12%;">Unit Price</th>
                    <th class="text-right" style="width: 10%;">Discount</th>
                    <th class="text-center" style="width: 7%;">Tax</th>
                    <th class="text-right" style="width: 9%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse($items as $idx => $item)
                    @php
                        $isLast = $idx === count($items) - 1;
                        $itemDiscount = (float) ($item['discount'] ?? 0);
                        $itemTax = (float) ($item['tax_rate'] ?? 0);
                    @endphp
                    <tr class="{{ $isLast ? 'last-item-row' : '' }}">
                        <td class="text-center">{{ $item['item_number'] ?? ($idx + 1) }}</td>
                        <td class="text-center" style="white-space: pre-line;">{{ $item['description'] }}</td>
                        <td class="text-right">{{ number_format((float) $item['quantity'], 2) }}</td>
                        <td class="text-right">{{ number_format((float) $item['unit_price'], 2) }}</td>
                        <td class="text-right">{{ $itemDiscount > 0 ? number_format($itemDiscount, 2) : '' }}</td>
                        <td class="text-center">{{ $itemTax > 0 ? (rtrim(rtrim(number_format($itemTax, 2), '0'), '.') . '%') : '' }}</td>
                        <td class="text-right">{{ number_format((float) $item['amount'], 2) }}</td>
                    </tr>
                @empty
                    <tr class="last-item-row">
                        <td colspan="7" class="text-center">No items specified.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Financial Summary -->
        <table class="summary-table">
            <tr>
                <td style="width: 64%;"></td>
                <td class="{{ ($taxTotal > 0 && $taxMode === 'exclusive') ? '' : 'summary-line' }} text-left" style="width: 18%;">Sub-total</td>
                <td class="{{ ($taxTotal > 0 && $taxMode === 'exclusive') ? '' : 'summary-line' }} text-right" style="width: 18%;">{{ number_format($subtotal, 2) }}</td>
            </tr>
            @if($taxTotal > 0 && $taxMode === 'exclusive')
                <tr>
                    <td></td>
                    <td class="summary-line text-left">Tax ({{ rtrim(rtrim(number_format($taxRate, 2), '0'), '.') }}%)</td>
                    <td class="summary-line text-right">{{ number_format($taxTotal, 2) }}</td>
                </tr>
            @endif
            <tr class="amount-due-row">
                <td></td>
                <td class="text-left">Amount Due</td>
                <td class="text-right">{{ number_format($grandTotal, 2) }}</td>
            </tr>
        </table>

        @if(!empty($document['notes']))
            <div style="margin-bottom: 24px; font-size: 10.5px;">
                <strong>Notes:</strong>
                <div style="white-space: pre-line; margin-top: 2px;">{{ $document['notes'] }}</div>
            </div>
        @endif

        <!-- Signature Section -->
        <table class="signatures-table">
            <tr>
                <td style="width: 34%;">
                    <div>Prepare by: <span class="sig-name">{{ $document['prepared_by_name'] ?: 'Jeffrey D. Julian' }}</span></div>
                    <div class="sig-sub" style="padding-left: 52px;">{{ $document['prepared_by_title'] ?: 'Admin Assistant' }}</div>
                    <div class="sig-sub">{{ $companyName }}</div>
                </td>
                <td style="width: 34%;">
                    <div>Approved by: <span class="sig-name">{{ $document['approved_by_name'] ?: 'Georgita K. apostol' }}</span></div>
                    <div class="sig-sub" style="padding-left: 56px;">{{ $document['approved_by_title'] ?: 'Store Manager/Owner' }}</div>
                    <div class="sig-sub" style="padding-left: 14px;">{{ $companyName }}</div>
                </td>
                <td style="width: 32%; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 72px; vertical-align: bottom; white-space: nowrap; padding: 0 4px 1px 0; font-size: 11px;">
                                Received by:
                            </td>
                            <td style="vertical-align: bottom; text-align: center; padding: 0;">
                                <div style="border-bottom: 1px solid #000000; text-align: center; min-width: 145px; padding-bottom: 1px; font-size: 11px;">
                                    @if(!empty($document['received_by_name']))
                                        <strong>{{ $document['received_by_name'] }}</strong>
                                        @if(!empty($document['received_date']))
                                            / {{ $formatDocDate($document['received_date']) }}
                                        @endif
                                    @else
                                        &nbsp;
                                    @endif
                                </div>
                                <div class="sig-sub" style="text-align: center; margin-top: 3px; font-size: 9px;">
                                    Signature over Printed Name/Date
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
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

