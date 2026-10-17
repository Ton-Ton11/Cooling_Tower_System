<?php

namespace App\Http\Controllers\HeadTechnician;

use App\Http\Controllers\Technician\TechnicianBaseController;
use App\Models\TechnicianCertification;
use App\Models\User;
use App\Services\ForecastingService;
use Carbon\Carbon;
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
        $forecastingService = app(ForecastingService::class);

        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $avgRatingRow = DB::table('customer_feedback_and_ratings')
            ->join('bookings', 'bookings.booking_id', '=', 'customer_feedback_and_ratings.booking_id')
            ->avg('rating');

        // As Head of Technicians, oversee all active field dispatches across all technician teams + personal assignments
        $stats = [
            'total_teams'          => DB::table('technician_teams')->count(),
            'total_technicians'    => DB::table('users')->whereIn('role_id', [5, 7])->count(),
            'assigned_bookings'    => DB::table('bookings')
                ->whereIn('booking_status', ['Approved', 'Dispatched'])
                ->count(),
            'in_progress_bookings' => DB::table('bookings')
                ->where('booking_status', 'In-Progress')
                ->count(),
            'completed_bookings'   => DB::table('bookings')
                ->where('booking_status', 'Completed')
                ->count(),
            'avg_rating'           => $avgRatingRow ? round((float) $avgRatingRow, 1) : 5.0,
            'pending_checklists'   => DB::table('tool_checklists')->where('status', 'Pending')->count(),
            'announcements'        => DB::table('announcements')->count(),
        ];

        $activeJobs = $this->bookingsBaseQuery()
            ->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->orderBy('bookings.scheduled_date')
            ->limit(8)
            ->get();

        $recentCompleted = $this->bookingsBaseQuery()
            ->where('bookings.booking_status', 'Completed')
            ->orderByDesc('bookings.scheduled_date')
            ->limit(6)
            ->get();

        // Ensure all technicians (including Head Technician) have their certifications initialized
        $allTechUsers = User::whereIn('role_id', [5, 7])
            ->orWhere('is_head_technician', true)
            ->orderBy('role_id', 'desc')
            ->orderBy('given_name')
            ->get();

        foreach ($allTechUsers as $tech) {
            $forecastingService->getTechnicianCertifications((int) $tech->user_id);
        }

        // Personal certifications for Head Technician
        $certifications = $forecastingService->getTechnicianCertifications($userId);

        // Crew-wide certifications across all technicians led by Head Technician
        $teamCertifications = TechnicianCertification::with('technician')
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function (TechnicianCertification $cert) use ($forecastingService, $userId) {
                $expiry = Carbon::parse($cert->expiry_date)->startOfDay();
                $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);

                if ($cert->status === 'Renewal Submitted') {
                    $computedStatus = 'Renewal Submitted';
                } elseif ($daysLeft < 0) {
                    $computedStatus = 'Expired';
                } elseif ($daysLeft <= 14) {
                    $computedStatus = 'Critical';
                } elseif ($daysLeft <= $cert->renewal_lead_days) {
                    $computedStatus = 'Expiring Soon';
                } else {
                    $computedStatus = 'Active';
                }

                $tech = $cert->technician;
                $techRole = ($tech && ((int) $tech->role_id === 7 || (bool) $tech->is_head_technician))
                    ? 'Head Technician'
                    : 'Technician';

                return [
                    'certification_id'   => $cert->certification_id,
                    'user_id'            => $cert->user_id,
                    'is_self'            => (int) $cert->user_id === $userId,
                    'technician_name'    => $tech?->name ?? ('Technician #' . $cert->user_id),
                    'technician_role'    => $techRole,
                    'certification_name' => $cert->certification_name,
                    'issuing_body'       => $cert->issuing_body,
                    'certificate_number' => $cert->certificate_number,
                    'issued_date'        => Carbon::parse($cert->issued_date)->format('M d, Y'),
                    'expiry_date'        => $expiry->format('M d, Y'),
                    'days_until_expiry'  => $daysLeft,
                    'renewal_lead_days'  => $cert->renewal_lead_days,
                    'status'             => $computedStatus,
                    'action_notice'      => $daysLeft <= $cert->renewal_lead_days
                        ? "Expires in {$daysLeft} days ({$expiry->format('M d, Y')}). Remind {$tech?->name} to file renewal with {$cert->issuing_body}."
                        : "Compliant & valid for {$daysLeft} more days.",
                ];
            })
            ->sortBy('days_until_expiry')
            ->values()
            ->all();

        $technicianList = $allTechUsers->map(fn (User $u) => [
            'user_id' => (int) $u->user_id,
            'name'    => $u->name,
            'role'    => ((int) $u->role_id === 7 || (bool) $u->is_head_technician) ? 'Head Technician' : 'Technician',
        ])->values()->all();

        $announcements = $this->mapAnnouncements(
            $this->announcementsBaseQuery()
                ->orderByDesc('announcements.created_at')
                ->limit(5)
                ->get()
        );

        return response()->json([
            'is_head_technician'  => true,
            'stats'               => $stats,
            'assigned_bookings'   => $this->mapBookings($activeJobs),
            'recent_completed'    => $this->mapBookings($recentCompleted),
            'certifications'      => $certifications,
            'team_certifications' => $teamCertifications,
            'technician_list'     => $technicianList,
            'announcements'       => $announcements,
        ]);
    }
}
