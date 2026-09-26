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

        $announcements = DB::table('announcements')
            ->join('users as creators', 'creators.user_id', '=', 'announcements.created_by')
            ->select([
                'announcements.id',
                'announcements.title',
                'announcements.message',
                'announcements.created_at',
                DB::raw("TRIM(CONCAT_WS(' ', creators.given_name, creators.middle_name, creators.last_name)) as author_name"),
            ])
            ->orderByDesc('announcements.created_at')
            ->limit(4)
            ->get();

        $recentSales = DB::table('payment')
            ->join('bookings', 'bookings.booking_id', '=', 'payment.booking_id')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->where('payment.payment_status', 'Paid')
            ->orderByDesc('payment.payment_date')
            ->limit(5)
            ->select([
                'payment.payment_id',
                'payment.amount_paid',
                'payment.payment_date',
                'payment.payment_method',
                'bookings.booking_id',
                'bookings.service_type',
                DB::raw("TRIM(CONCAT_WS(' ', clients.given_name, clients.middle_name, clients.last_name)) as client_name"),
            ])
            ->get();

        return response()->json([
            'stats'          => $stats,
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidPayments),
            'announcements'  => $announcements,
            'recent_sales'   => $recentSales,
        ]);
    }
}
