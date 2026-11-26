<?php

namespace App\Http\Controllers\Manager;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ManagerDashboardController extends ManagerBaseController
{
    public function dashboard(): Response
    {
        return Inertia::render('Manager/Dashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        \App\Http\Controllers\Shared\CustomerSupportController::ensureSupportTablesExist();

        $pendingReportsCount = \Illuminate\Support\Facades\Schema::hasTable('customer_complaints')
            ? DB::table('customer_complaints')->where('status', 'Pending')->count()
            : 0;

        $unreadCustomerChatsCount = \Illuminate\Support\Facades\Schema::hasTable('customer_support_messages')
            ? DB::table('customer_support_messages')->where('sender_role', 'customer')->where('is_read_by_manager', false)->count()
            : 0;

        $stats = [
            'pending_bookings'     => DB::table('bookings')->where('booking_status', 'Pending')->count(),
            'active_bookings'      => DB::table('bookings')->whereIn('booking_status', ['Approved', 'In-Progress'])->count(),
            'completed_bookings'   => DB::table('bookings')->where('booking_status', 'Completed')->count(),
            'announcements'        => DB::table('announcements')->count(),
            'pending_reports'      => $pendingReportsCount,
            'unread_customer_chat' => $unreadCustomerChatsCount,
        ];

        $pendingBookings = $this->bookingsBaseQuery()
            ->where('bookings.booking_status', 'Pending')
            ->orderByDesc('bookings.created_at')
            ->limit(5)
            ->get();

        $paidPayments = DB::table('payment')
            ->where('payment_status', 'Paid')
            ->whereNotNull('payment_date')
            ->get(['amount_paid', 'payment_date']);

        $activeDispatches = $this->bookingsBaseQuery()
            ->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->orderBy('bookings.scheduled_date')
            ->limit(5)
            ->get();

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

        $forecastAnalytics = app(\App\Services\ForecastingService::class)->getManagerForecastAnalytics();

        $activeStaffUsers = \App\Http\Controllers\UserPresenceController::getStaffPresenceList($request->user());
        $stats['active_staff'] = $activeStaffUsers->where('is_online', true)->count();
        $stats['total_staff'] = $activeStaffUsers->count();

        return response()->json([
            'stats'              => $stats,
            'pending_bookings'   => $this->mapBookings($pendingBookings),
            'active_bookings'    => $this->mapBookings($activeDispatches),
            'announcements'      => $announcements,
            'weekly_revenue'     => $this->buildWeeklyRevenueSeries($paidPayments),
            'forecast_analytics' => $forecastAnalytics,
            'on_duty_staff'      => $activeStaffUsers->values(),
            'active_staff_users' => $activeStaffUsers->values(),
        ]);
    }
}
