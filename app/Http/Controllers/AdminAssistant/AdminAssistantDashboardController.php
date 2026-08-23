<?php

namespace App\Http\Controllers\AdminAssistant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminAssistantDashboardController extends AdminAssistantBaseController
{
    public function dashboard(): Response
    {
        return Inertia::render('AdminAssistant/Dashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $monthStart = now()->startOfMonth();
        $monthEnd   = now()->endOfMonth();

        $stats = [
            'active_staff'      => $this->staffBaseQuery()
                ->whereIn('users.role_id', self::STAFF_ROLE_IDS)
                ->where(function ($q) { $q->whereNull('users.is_active')->orWhere('users.is_active', 1); })
                ->count(),
            'available_ac_units' => DB::table('ac_units_inventory')->where('status', 'Available')->count(),
            'total_ac_units'    => DB::table('ac_units_inventory')->count(),
            'announcements'     => DB::table('announcements')->count(),
            'paid_revenue_this_month' => (float) DB::table('payment')
                ->where('payment_status', 'Paid')
                ->whereBetween('payment_date', [$monthStart, $monthEnd])
                ->sum('amount_paid'),
        ];

        $paidPayments = DB::table('payment')
            ->where('payment_status', 'Paid')
            ->whereNotNull('payment_date')
            ->get(['amount_paid', 'payment_date']);

        return response()->json([
            'stats'          => $stats,
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidPayments),
        ]);
    }
}
