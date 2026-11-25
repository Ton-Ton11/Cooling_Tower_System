<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

        $servicePaid = $paidRecords->filter(fn (array $r) => ($r['sale_type'] ?? 'service') === 'service');
        $toolsPaid = $paidRecords->filter(fn (array $r) => ($r['sale_type'] ?? '') === 'tools_materials');
        $acPaid = $paidRecords->filter(fn (array $r) => in_array($r['sale_type'] ?? '', ['ac_unit', 'spare_part'], true));

        $inventorySales = [];
        if (Schema::hasTable('inventory_sales')) {
            $inventorySales = DB::table('inventory_sales')
                ->orderByDesc('sold_at')
                ->orderByDesc('sale_id')
                ->get()
                ->values();
        }

        return response()->json([
            'summary' => [
                'total_revenue' => (float) $paidRecords->sum('amount_paid'),
                'total_profit' => (float) $paidRecords->sum('profit'),
                'paid_bookings' => $paidRecords->count(),
                'service_revenue' => (float) $servicePaid->sum('amount_paid'),
                'service_count' => $servicePaid->count(),
                'tools_materials_revenue' => (float) $toolsPaid->sum('amount_paid'),
                'tools_materials_profit' => (float) $toolsPaid->sum('profit'),
                'tools_materials_count' => $toolsPaid->count(),
                'ac_units_revenue' => (float) $acPaid->sum('amount_paid'),
                'ac_units_profit' => (float) $acPaid->sum('profit'),
                'ac_units_count' => $acPaid->count(),
                'gcash_revenue' => (float) $paidRecords->where('payment_method', 'GCash')->sum('amount_paid'),
                'cash_revenue' => (float) $paidRecords->where('payment_method', 'Cash')->sum('amount_paid'),
                'bank_revenue' => (float) $paidRecords->whereIn('payment_method', ['Bank Transfer', 'Credit Card'])->sum('amount_paid'),
            ],
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidRecords),
            'monthly_revenue' => $this->buildMonthlyRevenueSeries($paidRecords),
            'inventory_sales' => $inventorySales,
            'data' => $mappedRecords->values(),
        ]);
    }
}
