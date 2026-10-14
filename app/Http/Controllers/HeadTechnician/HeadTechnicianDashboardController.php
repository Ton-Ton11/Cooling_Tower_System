<?php

namespace App\Http\Controllers\HeadTechnician;

use App\Http\Controllers\Technician\TechnicianBaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class HeadTechnicianDashboardController extends TechnicianBaseController
{
    protected function authorizeHeadTechnician(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $isAuthorized = (int) $user->role_id === 1
            || (int) $user->role_id === 7
            || ((int) $user->role_id === 5 && (bool) $user->is_head_technician);
        abort_unless($isAuthorized, 403, 'Head Technician access required.');
    }

    public function dashboard(Request $request): Response
    {
        $this->authorizeHeadTechnician($request);

        return Inertia::render('HeadTechnician/Dashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeHeadTechnician($request);

        $userId = (int) $request->user()->user_id;

        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $avgRatingRow = DB::table('customer_feedback_and_ratings')
            ->join('bookings', 'bookings.booking_id', '=', 'customer_feedback_and_ratings.booking_id')
            ->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('bookings.assigned_tech_id', $userId)
                    ->orWhere('bookings.lead_technician_id', $userId)
                    ->orWhere('bookings.assistant_technician_id', $userId);
                if (! empty($myTeamIds)) {
                    $q->orWhereIn('bookings.assigned_team_id', $myTeamIds);
                }
            })
            ->avg('rating');

        $techCond = function ($q) use ($userId, $myTeamIds) {
            $q->where('assigned_tech_id', $userId)
                ->orWhere('lead_technician_id', $userId)
                ->orWhere('assistant_technician_id', $userId);
            if (! empty($myTeamIds)) {
                $q->orWhereIn('assigned_team_id', $myTeamIds);
            }
        };

        $stats = [
            'total_teams'          => DB::table('technician_teams')->count(),
            'total_technicians'    => DB::table('users')->whereIn('role_id', [5, 7])->count(),
            'assigned_bookings'    => DB::table('bookings')
                ->where($techCond)
                ->whereIn('booking_status', ['Approved', 'Dispatched'])
                ->count(),
            'in_progress_bookings' => DB::table('bookings')
                ->where($techCond)
                ->where('booking_status', 'In-Progress')
                ->count(),
            'completed_bookings'   => DB::table('bookings')
                ->where($techCond)
                ->where('booking_status', 'Completed')
                ->count(),
            'avg_rating'           => $avgRatingRow ? round((float) $avgRatingRow, 1) : 5.0,
            'pending_checklists'   => DB::table('tool_checklists')->where('status', 'Pending')->count(),
            'announcements'        => DB::table('announcements')->count(),
        ];

        $activeJobs = $this->bookingsBaseQuery()
            ->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('bookings.assigned_tech_id', $userId)
                    ->orWhere('bookings.lead_technician_id', $userId)
                    ->orWhere('bookings.assistant_technician_id', $userId);
                if (! empty($myTeamIds)) {
                    $q->orWhereIn('bookings.assigned_team_id', $myTeamIds);
                }
            })
            ->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->orderBy('bookings.scheduled_date')
            ->limit(5)
            ->get();

        $recentCompleted = $this->bookingsBaseQuery()
            ->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('bookings.assigned_tech_id', $userId)
                    ->orWhere('bookings.lead_technician_id', $userId)
                    ->orWhere('bookings.assistant_technician_id', $userId);
                if (! empty($myTeamIds)) {
                    $q->orWhereIn('bookings.assigned_team_id', $myTeamIds);
                }
            })
            ->where('bookings.booking_status', 'Completed')
            ->orderByDesc('bookings.scheduled_date')
            ->limit(5)
            ->get();

        return response()->json([
            'stats'             => $stats,
            'assigned_bookings' => $this->mapBookings($activeJobs),
            'recent_completed'  => $this->mapBookings($recentCompleted),
        ]);
    }
}
