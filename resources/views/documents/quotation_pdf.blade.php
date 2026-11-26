<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quotation - {{ $document['document_number'] ?? 'QU-01' }}</title>
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
            font-size: 21px;
            font-weight: bold;
            letter-spacing: 0.4px;
            margin: 0;
            text-transform: uppercase;
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
            margin: 0;
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
        .subject-heading {
            font-size: 11.5px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 12px 0 12px 0;
        }
        .meta-table {
            width: 65%;
            margin-bottom: 14px;
        }
        .meta-table th {
            text-align: left;
            font-size: 10.5px;
            font-weight: bold;
            padding: 2px 12px 4px 0;
        }
        .meta-table td {
            text-align: left;
            font-size: 10.5px;
            padding: 2px 12px 2px 0;
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
            padding: 9px 6px;
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
            margin-bottom: 18px;
        }
        .summary-table td {
            font-size: 10.5px;
            padding: 5px 6px;
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
            padding-top: 7px;
        }
        .terms-section {
            margin-top: 12px;
            font-size: 10.5px;
        }
        .term-block {
            margin-bottom: 10px;
            page-break-inside: avoid;
        }
        .term-title {
            font-weight: bold;
            text-decoration: underline;
            text-transform: uppercase;
            margin: 0 0 2px 0;
            font-size: 10.5px;
        }
        .term-line {
            margin: 0 0 1px 62px;
            font-size: 10.5px;
        }
        .thank-you {
            margin: 18px 0 26px 38px;
            font-size: 10.5px;
        }
        .signatures-table {
            width: 100%;
            margin-top: 26px;
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
                <strong>QUOTATION FORM</strong> &mdash; {{ $document['document_number'] }} ({{ $document['client_name'] }})
            </div>
            <div>
                <button class="btn" onclick="window.print()">Print Document</button>
                <a class="btn btn-secondary" href="{{ $pdfDownloadUrl ?? route('super-admin.documents.pdf', ['docId' => $document['doc_id']]) }}">Download PDF</a>
                <button class="btn btn-secondary" onclick="window.close()">Close</button>
            </div>
        </div>
    @endif

    @php
        $company = $document['additional_details']['company'] ?? [];
        $companyName = $company['name'] ?? 'Cooling Tower Airconditioning Services';
        $companyAddress1 = $company['address_line1'] ?? 'Door #5, Aposol Building, Mayor Jaldon St., Canelar, Zamboanga City';
        $companyAddress2 = $company['address_line2'] ?? 'Zamboanga Del Sur, 7000, Philippines';
        $companyEmailPhone = $company['email_phone'] ?? 'ctair.zamboanga@yahoo.com/ +63 9178777670';
        $companyTin = $company['tin'] ?? '444-000-762-000';
        $companyBpi = $company['bpi_account'] ?? 'Cooling Tower Airconditioning Services 9330-0112-78';
        $companyGcash = $company['gcash'] ?? '0917-877-7670';

        $formatDocDate = function ($dateVal) {
            if (empty($dateVal)) return '—';
            try {
                return \Illuminate\Support\Carbon::parse($dateVal)->format('d-M-y');
            } catch (\Throwable $e) {
                return $dateVal;
            }
        };

        $splitLines = function ($text) {
            if (empty($text)) return [];
            $lines = preg_split('/\r\n|\r|\n/', trim((string) $text));
            return array_values(array_filter(array_map(function ($line) {
                return ltrim(trim($line), ': ');
            }, $lines), fn($l) => $l !== ''));
        };

        $inclusionLines = $splitLines($document['inclusions'] ?? '');
        $exclusionLines = $splitLines($document['exclusions'] ?? '');
        $workmanshipLines = $splitLines($document['workmanship'] ?? '');
        $paymentTermsLines = $splitLines($document['payment_terms'] ?? '');

        $items = $document['items'] ?? [];
        $subtotal = (float) ($document['subtotal'] ?? 0);
        $discountTotal = (float) ($document['discount_total'] ?? 0);
        $vatableAmount = (float) ($document['vatable_amount'] ?? 0);
        $taxRate = (float) ($document['tax_rate'] ?? 12);
        $taxTotal = (float) ($document['tax_total'] ?? 0);
        $grandTotal = (float) ($document['grand_total'] ?? 0);
    @endphp

    <div class="page-wrapper" style="{{ !empty($isPrintMode) ? 'padding: 10px 24px 40px;' : '' }}">
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="width: 70%;">
                    <h1 class="doc-title">QUOTATION</h1>
                </td>
                <td style="width: 30%; text-align: right; padding-right: 25px;">
                    @if(!empty($logoBase64))
                        <img src="{{ $logoBase64 }}" alt="Company Logo" class="logo-img">
                    @endif
                </td>
            </tr>
        </table>

        <!-- To / From Block -->
        <table class="address-table">
            <tr>
                <td style="width: 52%; padding-right: 16px;">
                    <div class="field-label-sm">To:</div>
                    <p class="client-name">{{ $document['client_name'] }}</p>
                    @if(!empty($document['attention_to']))
                        <p class="client-address" style="font-weight: bold;">{{ $document['attention_to'] }}</p>
                    @endif
                    @if(!empty($document['client_address']))
                        <p class="client-address">{{ $document['client_address'] }}</p>
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
                    <p class="company-detail"><strong>Gcash</strong> - {{ $companyGcash }}</p>
                </td>
            </tr>
        </table>

        <!-- Quotation Subject Heading (optional or customizable) -->
        @if(!empty($document['subject']))
            <div class="subject-heading">{{ $document['subject'] }}</div>
        @endif

        <!-- Quote Number, Date, Expiry -->
        <table class="meta-table">
            <thead>
                <tr>
                    <th style="width: 40%;">Quote number</th>
                    <th style="width: 30%;">Date</th>
                    <th style="width: 30%;">Expiry</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $document['document_number'] }}</td>
                    <td>{{ $formatDocDate($document['issue_date'] ?? null) }}</td>
                    <td>{{ $formatDocDate($document['expiry_date'] ?? null) }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Itemized Services Table -->
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
                <td style="width: 52%;"></td>
                <td class="summary-line text-center" style="width: 12%;">{{ $discountTotal > 0 ? number_format($discountTotal, 2) : '-' }}</td>
                <td class="summary-line text-right" style="width: 20%;">Sub-total</td>
                <td class="summary-line text-right" style="width: 16%;">{{ number_format($subtotal, 2) }}</td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td class="text-right">Vatable</td>
                <td class="text-right">{{ number_format($vatableAmount, 2) }}</td>
            </tr>
            <tr>
                <td></td>
                <td class="summary-line"></td>
                <td class="summary-line text-right">{{ rtrim(rtrim(number_format($taxRate, 2), '0'), '.') }}% Vat</td>
                <td class="summary-line text-right">{{ number_format($taxTotal, 2) }}</td>
            </tr>
            <tr class="grand-total-row">
                <td></td>
                <td class="summary-double-line"></td>
                <td class="summary-double-line text-right">Grand Total</td>
                <td class="summary-double-line text-right">{{ number_format($grandTotal, 2) }}</td>
            </tr>
        </table>

        <!-- Additional Sections: Inclusions, Exclusions, Workmanship, Payment Terms -->
        <div class="terms-section">
            @if(count($inclusionLines) > 0)
                <div class="term-block">
                    <p class="term-title">INCLUSIONS</p>
                    @foreach($inclusionLines as $line)
                        <p class="term-line">: {{ $line }}</p>
                    @endforeach
                </div>
            @endif

            @if(count($exclusionLines) > 0)
                <div class="term-block">
                    <p class="term-title">EXCLUSIONS</p>
                    @foreach($exclusionLines as $line)
                        <p class="term-line">: {{ $line }}</p>
                    @endforeach
                </div>
            @endif

            @if(count($workmanshipLines) > 0)
                <div class="term-block">
                    <p class="term-title">WORKSMANSHIP</p>
                    @foreach($workmanshipLines as $line)
                        <p class="term-line">: {{ $line }}</p>
                    @endforeach
                </div>
            @endif

            @if(count($paymentTermsLines) > 0)
                <div class="term-block">
                    <p class="term-title">PAYMENT TERMS</p>
                    @foreach($paymentTermsLines as $line)
                        <p class="term-line">: {{ $line }}</p>
                    @endforeach
                </div>
            @endif
        </div>

        <p class="thank-you">
            Thank you for giving us the opportunity to quote. If you find this acceptable please sign the space provided below.
        </p>

        <!-- Signature Section -->
        <table class="signatures-table">
            <tr>
                <td style="width: 34%;">
                    <div>Prepare by: <span class="sig-name">{{ $document['prepared_by_name'] ?: 'Admin Assistant' }}</span></div>
                    <div class="sig-sub" style="padding-left: 48px;">{{ $document['prepared_by_title'] ?: 'Admin Assistant' }}</div>
                    <div class="sig-sub">{{ $companyName }}</div>
                </td>
                <td style="width: 34%;">
                    <div>Approved by: <span class="sig-name">{{ $document['approved_by_name'] ?: 'Georgita K. Apostol' }}</span></div>
                    <div class="sig-sub" style="padding-left: 52px;">{{ $document['approved_by_title'] ?: 'Store Manager/Owner' }}</div>
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

