<?php

namespace App\Http\Controllers\AdminAssistant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAssistantSalesController extends AdminAssistantBaseController
{
    public function salesRecordsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $query = $this->salesRecordsBaseQuery()
            ->where('payment.payment_status', 'Paid')
            ->orderByDesc('payment.payment_date');

        $records = $this->mapSalesRecords($query->get());

        $paidRecords = $records->where('payment_status', 'Paid');
        $summary = [
            'total_revenue'  => (float) $paidRecords->sum('amount_paid'),
            'paid_bookings'  => $paidRecords->count(),
            'gcash_revenue'  => (float) $paidRecords->where('payment_method', 'GCash')->sum('amount_paid'),
            'cash_revenue'   => (float) $paidRecords->where('payment_method', 'Cash')->sum('amount_paid'),
        ];

        $allPayments = collect(
            \Illuminate\Support\Facades\DB::table('payment')
                ->where('payment_status', 'Paid')
                ->whereNotNull('payment_date')
                ->get(['amount_paid', 'payment_date'])
        );

        return response()->json([
            'data'            => $records,
            'summary'         => $summary,
            'weekly_revenue'  => $this->buildWeeklyRevenueSeries($allPayments),
            'monthly_revenue' => $this->buildMonthlyRevenueSeries($allPayments),
        ]);
    }
}
