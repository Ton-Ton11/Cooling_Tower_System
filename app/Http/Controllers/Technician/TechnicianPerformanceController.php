<?php

namespace App\Http\Controllers\Technician;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TechnicianPerformanceController extends TechnicianBaseController
{
    public function performanceIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $currentUserId = (int) $request->user()->user_id;
        $roleId        = (int) $request->user()->role_id;

        // Technicians see their own performance; Super Admin + Manager see all
        $techFilter = ($roleId === 5) ? $currentUserId : null;

        // ── Technician leaderboard ──────────────────────────────────────────
        $techQuery = DB::table('bookings')
            ->join('users as technicians', 'technicians.user_id', '=', 'bookings.assigned_tech_id')
            ->where('bookings.booking_status', 'Completed')
            ->select([
                'technicians.user_id',
                'technicians.given_name',
                'technicians.middle_name',
                'technicians.last_name',
                DB::raw('COUNT(bookings.booking_id) as total_completed'),
                DB::raw('SUM(COALESCE(
                    (SELECT amount_paid FROM payment WHERE payment.booking_id = bookings.booking_id AND payment_status = "Paid" LIMIT 1), 0
                )) as total_revenue'),
            ])
            ->groupBy('technicians.user_id', 'technicians.given_name', 'technicians.middle_name', 'technicians.last_name')
            ->orderByDesc('total_completed');

        if ($techFilter) {
            $techQuery->where('bookings.assigned_tech_id', $techFilter);
        }

        $technicians = $techQuery->get()->map(function ($row) {
            return [
                'user_id'         => (int) $row->user_id,
                'full_name'       => $this->formatName($row->given_name, $row->middle_name, $row->last_name),
                'total_completed' => (int) $row->total_completed,
                'total_revenue'   => (float) $row->total_revenue,
            ];
        })->values();

        // ── Weekly (last 7 days) ────────────────────────────────────────────
        $weeklyQuery = DB::table('bookings')
            ->where('booking_status', 'Completed')
            ->whereBetween('created_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()]);

        if ($techFilter) {
            $weeklyQuery->where('assigned_tech_id', $techFilter);
        }

        $weeklyRaw = $weeklyQuery->get(['booking_id', 'assigned_tech_id', 'created_at']);

        $weekly = collect(range(6, 0))->map(function (int $daysAgo) use ($weeklyRaw) {
            $date    = now()->startOfDay()->subDays($daysAgo);
            $matches = $weeklyRaw->filter(fn ($b) => Carbon::parse($b->created_at)->isSameDay($date));

            return [
                'day'       => $date->format('D'),
                'date'      => $date->toDateString(),
                'completed' => $matches->count(),
            ];
        })->values();

        // ── Monthly (last 12 months) ───────────────────────────────────────
        $monthlyQuery = DB::table('bookings')
            ->where('booking_status', 'Completed')
            ->whereBetween('created_at', [now()->subMonths(11)->startOfMonth(), now()->endOfMonth()]);

        if ($techFilter) {
            $monthlyQuery->where('assigned_tech_id', $techFilter);
        }

        $monthlyRaw = $monthlyQuery->get(['booking_id', 'assigned_tech_id', 'created_at']);

        $monthly = collect(range(11, 0))->map(function (int $monthsAgo) use ($monthlyRaw) {
            $month   = now()->startOfMonth()->subMonths($monthsAgo);
            $matches = $monthlyRaw->filter(fn ($b) => Carbon::parse($b->created_at)->format('Y-m') === $month->format('Y-m'));

            return [
                'month'      => $month->format('M'),
                'year_month' => $month->format('Y-m'),
                'completed'  => $matches->count(),
            ];
        })->values();

        // ── Yearly (last 5 years) ───────────────────────────────────────────
        $yearlyQuery = DB::table('bookings')
            ->where('booking_status', 'Completed')
            ->whereBetween('created_at', [now()->subYears(4)->startOfYear(), now()->endOfYear()]);

        if ($techFilter) {
            $yearlyQuery->where('assigned_tech_id', $techFilter);
        }

        $yearlyRaw = $yearlyQuery->get(['booking_id', 'assigned_tech_id', 'created_at']);

        $yearly = collect(range(4, 0))->map(function (int $yearsAgo) use ($yearlyRaw) {
            $year    = now()->startOfYear()->subYears($yearsAgo);
            $matches = $yearlyRaw->filter(fn ($b) => Carbon::parse($b->created_at)->year === $year->year);

            return [
                'year'      => $year->year,
                'completed' => $matches->count(),
            ];
        })->values();

        // ── Customer Reviews & Ratings ─────────────────────────────────────
        $reviewQuery = DB::table('customer_feedback_and_ratings as feedback')
            ->join('bookings', 'bookings.booking_id', '=', 'feedback.booking_id')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->select([
                'feedback.feedback_id',
                'feedback.booking_id',
                'feedback.rating',
                'feedback.feedback',
                'feedback.submitted_at',
                'services.service_name',
                'clients.given_name as client_given_name',
                'clients.middle_name as client_middle_name',
                'clients.last_name as client_last_name',
            ])
            ->orderByDesc('feedback.submitted_at');

        if ($techFilter) {
            $reviewQuery->where('bookings.assigned_tech_id', $techFilter);
        }

        $reviews = $reviewQuery->limit(20)->get()->map(function ($r) {
            return [
                'feedback_id'  => (int) $r->feedback_id,
                'booking_id'   => (int) $r->booking_id,
                'client_name'  => $this->formatName($r->client_given_name, $r->client_middle_name, $r->client_last_name),
                'service'      => $r->service_name,
                'rating'       => (int) $r->rating,
                'feedback'     => $r->feedback,
                'submitted_at' => $r->submitted_at,
            ];
        })->values();

        $avgRating = $reviews->isNotEmpty() ? round($reviews->avg('rating'), 1) : 5.0;

        return response()->json([
            'technicians' => $technicians,
            'weekly'      => $weekly,
            'monthly'     => $monthly,
            'yearly'      => $yearly,
            'reviews'     => $reviews,
            'avg_rating'  => $avgRating,
        ]);
    }
}
