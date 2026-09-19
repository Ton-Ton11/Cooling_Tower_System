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

        $validated = validator($payload, [
            'assigned_team_id' => [
                'nullable',
                'integer',
                Rule::exists('technician_teams', 'team_id')->where('status', 'Active'),
            ],
            'assigned_tech_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'user_id')->where(function ($query) {
                    $query->whereIn('role_id', [5, 7])
                        ->where(function ($inner) {
                            $inner->whereNull('is_active')->orWhere('is_active', 1);
                        });
                }),
            ],
            'booking_status' => ['nullable', Rule::in(self::BOOKING_ASSIGNABLE_STATUSES)],
        ])->validate();

        if (empty($validated['assigned_team_id']) && empty($validated['assigned_tech_id'])) {
            throw ValidationException::withMessages([
                'assigned_team_id' => ['Please select a technician team or technician for assignment.'],
            ]);
        }

        $teamId = $validated['assigned_team_id'] ?? null;
        $techId = $validated['assigned_tech_id'] ?? null;

        if ($teamId && empty($techId)) {
            $team = DB::table('technician_teams')->where('team_id', $teamId)->first();
            $techId = $team->leader_id;
            if (! $techId) {
                $techId = DB::table('technician_team_members')
                    ->where('team_id', $teamId)
                    ->value('technician_id');
            }
        }

        $currentUserId = (int) $request->user()->user_id;

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'assigned_team_id' => $teamId,
                'assigned_tech_id' => $techId,
                'assigned_by' => $currentUserId,
                'booking_status' => $validated['booking_status'] ?? 'Approved',
            ]);

        $teamName = $teamId ? DB::table('technician_teams')->where('team_id', $teamId)->value('team_name') : null;
        $assignedTech = $techId ? DB::table('users')->where('user_id', $techId)->first(['given_name', 'middle_name', 'last_name']) : null;

        $desc = $teamName
            ? sprintf('Approved booking #%d and assigned team "%s".', $bookingId, $teamName)
            : sprintf('Approved booking #%d and assigned %s.', $bookingId, $assignedTech ? $this->formatName($assignedTech->given_name, $assignedTech->middle_name, $assignedTech->last_name) : 'Technician');

        $this->logActivity($currentUserId, 'APPROVE', $desc);

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return response()->json([
            'message' => 'Booking assigned and updated successfully.',
            'data' => $this->mapBookings(collect([$updated]))->first(),
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
