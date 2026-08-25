<?php

namespace App\Http\Controllers\Technician;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TechnicianDashboardController extends TechnicianBaseController
{
    public function dashboard(): Response
    {
        return Inertia::render('Technician/Dashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        $avgRatingRow = DB::table('customer_feedback_and_ratings')
            ->join('bookings', 'bookings.booking_id', '=', 'customer_feedback_and_ratings.booking_id')
            ->where('bookings.assigned_tech_id', $userId)
            ->avg('rating');

        $stats = [
            'assigned_bookings'    => DB::table('bookings')
                ->where('assigned_tech_id', $userId)
                ->whereIn('booking_status', ['Approved', 'Dispatched'])
                ->count(),
            'in_progress_bookings' => DB::table('bookings')
                ->where('assigned_tech_id', $userId)
                ->where('booking_status', 'In-Progress')
                ->count(),
            'completed_bookings'   => DB::table('bookings')
                ->where('assigned_tech_id', $userId)
                ->where('booking_status', 'Completed')
                ->count(),
            'avg_rating'           => $avgRatingRow ? round((float) $avgRatingRow, 1) : 5.0,
            'checked_out_tools'    => DB::table('tool_checkouts')
                ->where('technician_id', $userId)
                ->where('status', 'Checked Out')
                ->count(),
            'announcements'        => DB::table('announcements')->count(),
        ];

        $activeJobs = $this->bookingsBaseQuery()
            ->where('bookings.assigned_tech_id', $userId)
            ->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->orderBy('bookings.scheduled_date')
            ->limit(5)
            ->get();

        $recentCompleted = $this->bookingsBaseQuery()
            ->where('bookings.assigned_tech_id', $userId)
            ->where('bookings.booking_status', 'Completed')
            ->orderByDesc('bookings.scheduled_date')
            ->limit(5)
            ->get();

        return response()->json([
            'stats'            => $stats,
            'assigned_bookings' => $this->mapBookings($activeJobs),
            'recent_completed'  => $this->mapBookings($recentCompleted),
        ]);
    }
}
