<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SuperAdminBookingController extends SuperAdminBaseController
{
    public function bookingsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $query = $this->bookingsBaseQuery()->orderByDesc('bookings.created_at');

        if ($status = $request->string('status')->trim()->value()) {
            $query->where('bookings.booking_status', $status);
        }

        return response()->json([
            'data' => $this->mapBookings($query->get()),
            'technicians' => $this->techniciansCollection(),
            'teams' => $this->teamsCollection(),
        ]);
    }

    public function approveBooking(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking_id' => ['Only pending or active bookings can be approved or reassigned.'],
            ]);
        }

        $payload = $this->normalizeBookingAssignmentPayload($request);

        $techRule = function () {
            return Rule::exists('users', 'user_id')->where(function ($query) {
                $query->whereIn('role_id', [5, 7])
                    ->where(function ($inner) {
                        $inner->whereNull('is_active')->orWhere('is_active', 1);
                    });
            });
        };

        $validated = validator($payload, [
            'lead_technician_id' => ['nullable', 'integer', $techRule()],
            'assistant_technician_id' => ['nullable', 'integer', 'different:lead_technician_id', $techRule()],
            'assigned_tech_id' => ['nullable', 'integer', $techRule()],
            'assigned_team_id' => [
                'nullable',
                'integer',
                Rule::exists('technician_teams', 'team_id')->where('status', 'Active'),
            ],
            'booking_status' => ['nullable', Rule::in(self::BOOKING_ASSIGNABLE_STATUSES)],
        ])->validate();

        $leadTechId = $validated['lead_technician_id'] ?? $validated['assigned_tech_id'] ?? null;
        $assistantTechId = $validated['assistant_technician_id'] ?? null;
        $teamId = $validated['assigned_team_id'] ?? null;

        // Verify that two distinct technicians are assigned
        if (empty($leadTechId) || empty($assistantTechId)) {
            if ($teamId) {
                $teamMembers = DB::table('technician_team_members')
                    ->where('team_id', $teamId)
                    ->orderBy('role_in_team', 'desc')
                    ->pluck('technician_id')
                    ->all();
                $team = DB::table('technician_teams')->where('team_id', $teamId)->first();
                $leadTechId = $team->leader_id ?? ($teamMembers[0] ?? null);
                $assistantTechId = collect($teamMembers)->first(fn ($id) => (int) $id !== (int) $leadTechId);
            }
        }

        if (empty($leadTechId) || empty($assistantTechId)) {
            throw ValidationException::withMessages([
                'lead_technician_id' => ['Please assign both a Lead Technician and an Assistant Technician.'],
            ]);
        }

        if ((int) $leadTechId === (int) $assistantTechId) {
            throw ValidationException::withMessages([
                'assistant_technician_id' => ['The Lead and Assistant must be two different technicians.'],
            ]);
        }

        $currentUserId = (int) $request->user()->user_id;

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'lead_technician_id'      => $leadTechId,
                'assistant_technician_id' => $assistantTechId,
                'assigned_tech_id'        => $leadTechId,
                'assigned_team_id'        => $teamId,
                'assigned_by'             => $currentUserId,
                'assigned_at'             => now(),
                'booking_status'          => $validated['booking_status'] ?? 'Approved',
            ]);

        $leadUser = DB::table('users')->where('user_id', $leadTechId)->first(['given_name', 'middle_name', 'last_name']);
        $assistantUser = DB::table('users')->where('user_id', $assistantTechId)->first(['given_name', 'middle_name', 'last_name']);

        $leadName = $leadUser ? $this->formatName($leadUser->given_name, $leadUser->middle_name, $leadUser->last_name) : 'Lead';
        $assistantName = $assistantUser ? $this->formatName($assistantUser->given_name, $assistantUser->middle_name, $assistantUser->last_name) : 'Assistant';

        $desc = sprintf(
            'Approved booking #%d and assigned team: %s (Lead) & %s (Assistant).',
            $bookingId,
            $leadName,
            $assistantName
        );

        $this->logActivity($currentUserId, 'APPROVE', $desc);

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return response()->json([
            'message' => 'Technicians assigned successfully.',
            'data'    => $this->mapBookings(collect([$updated]))->first(),
        ]);
    }

    public function completeBooking(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'booking_status' => 'Completed',
            ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'COMPLETE_BOOKING',
            sprintf('Super Admin declared Booking #%d as Completed.', $bookingId)
        );

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return response()->json([
            'message' => 'Booking marked as Completed.',
            'data' => $this->mapBookings(collect([$updated]))->first(),
        ]);
    }
}
