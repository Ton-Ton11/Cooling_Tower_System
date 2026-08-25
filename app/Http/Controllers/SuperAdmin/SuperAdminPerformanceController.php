<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SuperAdminPerformanceController extends SuperAdminBaseController
{
    public function performanceIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        // ── Technician leaderboard ──────────────────────────────────────────
        $technicians = DB::table('bookings')
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
            ->orderByDesc('total_completed')
            ->get()
            ->map(function ($row) {
                return [
                    'user_id'         => (int) $row->user_id,
                    'full_name'       => $this->formatName($row->given_name, $row->middle_name, $row->last_name),
                    'total_completed' => (int) $row->total_completed,
                    'total_revenue'   => (float) $row->total_revenue,
                ];
            })->values();

        // ── Weekly (last 7 days) ────────────────────────────────────────────
        $weeklyRaw = DB::table('bookings')
            ->where('booking_status', 'Completed')
            ->whereBetween('updated_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()])
            ->get(['booking_id', 'assigned_tech_id', 'updated_at']);

        $weekly = collect(range(6, 0))->map(function (int $daysAgo) use ($weeklyRaw) {
            $date    = now()->startOfDay()->subDays($daysAgo);
            $matches = $weeklyRaw->filter(fn ($b) => Carbon::parse($b->updated_at)->isSameDay($date));

            return ['day' => $date->format('D'), 'date' => $date->toDateString(), 'completed' => $matches->count()];
        })->values();

        // ── Monthly (last 12 months) ───────────────────────────────────────
        $monthlyRaw = DB::table('bookings')
            ->where('booking_status', 'Completed')
            ->whereBetween('updated_at', [now()->subMonths(11)->startOfMonth(), now()->endOfMonth()])
            ->get(['booking_id', 'assigned_tech_id', 'updated_at']);

        $monthly = collect(range(11, 0))->map(function (int $monthsAgo) use ($monthlyRaw) {
            $month   = now()->startOfMonth()->subMonths($monthsAgo);
            $matches = $monthlyRaw->filter(fn ($b) => Carbon::parse($b->updated_at)->format('Y-m') === $month->format('Y-m'));

            return ['month' => $month->format('M'), 'year_month' => $month->format('Y-m'), 'completed' => $matches->count()];
        })->values();

        // ── Yearly (last 5 years) ───────────────────────────────────────────
        $yearlyRaw = DB::table('bookings')
            ->where('booking_status', 'Completed')
            ->whereBetween('updated_at', [now()->subYears(4)->startOfYear(), now()->endOfYear()])
            ->get(['booking_id', 'assigned_tech_id', 'updated_at']);

        $yearly = collect(range(4, 0))->map(function (int $yearsAgo) use ($yearlyRaw) {
            $year    = now()->startOfYear()->subYears($yearsAgo);
            $matches = $yearlyRaw->filter(fn ($b) => Carbon::parse($b->updated_at)->year === $year->year);

            return ['year' => $year->year, 'completed' => $matches->count()];
        })->values();

        return response()->json([
            'technicians' => $technicians,
            'weekly'      => $weekly,
            'monthly'     => $monthly,
            'yearly'      => $yearly,
        ]);
    }
}
