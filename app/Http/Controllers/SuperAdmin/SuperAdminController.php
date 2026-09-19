<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminController extends SuperAdminBaseController
{
    public function dashboard(): Response
    {
        return Inertia::render('SuperAdmin/Dashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $stats = [
            'active_staff' => $this->staffBaseQuery()->whereIn('users.role_id', self::STAFF_ROLE_IDS)->where(function ($query) {
                $query->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })->count(),
            'pending_bookings' => DB::table('bookings')->where('booking_status', 'Pending')->count(),
            'low_stock_items' => DB::table('inventory_items')->whereColumn('quantity_on_hand', '<=', 'reorder_level')->count(),
            'available_ac_units' => DB::table('ac_units_inventory')->where('status', 'Available')->count(),
            'announcements' => DB::table('announcements')->count(),
            'paid_revenue_this_month' => (float) DB::table('payment')
                ->where('payment_status', 'Paid')
                ->whereBetween('payment_date', [$monthStart, $monthEnd])
                ->sum('amount_paid'),
        ];

        $pendingBookings = $this->bookingsBaseQuery()
            ->where('bookings.booking_status', 'Pending')
            ->orderByDesc('bookings.created_at')
            ->limit(5)
            ->get();

        $recentActivity = $this->activityLogsBaseQuery()
            ->orderByDesc('activity_logs.created_at')
            ->limit(10)
            ->get();

        $paidPayments = DB::table('payment')
            ->where('payment_status', 'Paid')
            ->whereNotNull('payment_date')
            ->get(['amount_paid', 'payment_date']);

        return response()->json([
            'stats' => $stats,
            'pending_bookings' => $this->mapBookings($pendingBookings),
            'recent_activity' => $this->mapActivityLogs($recentActivity),
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidPayments),
        ]);
    }
}
