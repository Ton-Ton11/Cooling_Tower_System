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

        \App\Http\Controllers\Shared\CustomerSupportController::ensureSupportTablesExist();

        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $pendingReportsCount = \Illuminate\Support\Facades\Schema::hasTable('customer_complaints')
            ? DB::table('customer_complaints')->where('status', 'Pending')->count()
            : 0;

        $unreadCustomerChatsCount = \Illuminate\Support\Facades\Schema::hasTable('customer_support_messages')
            ? DB::table('customer_support_messages')->where('sender_role', 'customer')->where('is_read_by_manager', false)->count()
            : 0;

        $stats = [
            'active_staff' => $this->staffBaseQuery()->whereIn('users.role_id', self::STAFF_ROLE_IDS)->where(function ($query) {
                $query->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })->count(),
            'pending_bookings' => DB::table('bookings')->where('booking_status', 'Pending')->count(),
            'pending_checklists' => DB::table('tool_checklists')->where('status', 'Pending')->count(),
            'low_stock_items' => DB::table('inventory_items')->whereColumn('quantity_on_hand', '<=', 'reorder_level')->count(),
            'available_ac_units' => DB::table('ac_units_inventory')->where('status', 'Available')->count(),
            'announcements' => DB::table('announcements')->count(),
            'pending_reports' => $pendingReportsCount,
            'unread_customer_chat' => $unreadCustomerChatsCount,
            'pending_business_verifications' => \Illuminate\Support\Facades\Schema::hasColumn('users', 'account_type')
                ? DB::table('users')->where('role_id', 6)->where('account_type', 'business')->where('verification_status', 'pending')->count()
                : 0,
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

        $activeStaffUsers = \App\Http\Controllers\UserPresenceController::getStaffPresenceList($request->user());
        $stats['active_staff'] = $activeStaffUsers->where('is_online', true)->count();
        $stats['total_staff'] = $activeStaffUsers->count();

        return response()->json([
            'stats' => $stats,
            'pending_bookings' => $this->mapBookings($pendingBookings),
            'recent_activity' => $this->mapActivityLogs($recentActivity),
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidPayments),
            'active_staff_users' => $activeStaffUsers->values(),
        ]);
    }
}
