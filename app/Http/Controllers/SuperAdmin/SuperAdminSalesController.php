<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminSalesController extends SuperAdminBaseController
{
    public function salesRecordsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $records = $this->salesRecordsBaseQuery()
            ->orderByDesc('payment.payment_date')
            ->orderByDesc('bookings.created_at')
            ->get();

        $mappedRecords = $this->mapSalesRecords($records);
        $paidRecords = $mappedRecords->filter(fn (array $record) => $record['payment_status'] === 'Paid');

        return response()->json([
            'summary' => [
                'total_revenue' => $paidRecords->sum('amount_paid'),
                'paid_bookings' => $paidRecords->count(),
                'gcash_revenue' => $paidRecords->where('payment_method', 'GCash')->sum('amount_paid'),
                'cash_revenue' => $paidRecords->where('payment_method', 'Cash')->sum('amount_paid'),
            ],
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidRecords),
            'monthly_revenue' => $this->buildMonthlyRevenueSeries($paidRecords),
            'data' => $mappedRecords->values(),
        ]);
    }
}
