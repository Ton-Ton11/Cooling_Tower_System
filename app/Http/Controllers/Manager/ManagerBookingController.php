<?php

namespace App\Http\Controllers\Manager;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ManagerBookingController extends ManagerBaseController
{
    public function bookingsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $query = $this->bookingsBaseQuery()->orderByDesc('bookings.created_at');

        if ($status = $request->string('status')->trim()->value()) {
            $query->where('bookings.booking_status', $status);
        }

        return response()->json([
            'data'        => $this->mapBookings($query->get()),
            'technicians' => $this->techniciansCollection(),
        ]);
    }

    public function approveBooking(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        if (in_array($booking->booking_status, ['Completed', 'Cancelled', 'Incomplete'], true)) {
            throw ValidationException::withMessages([
                'booking_id' => ['Only pending or active bookings can be approved or reassigned.'],
            ]);
        }

        $payload = $this->normalizeBookingAssignmentPayload($request);

        $validated = validator($payload, [
            'assigned_tech_id' => [
                'required',
                'integer',
                Rule::exists('users', 'user_id')->where(function ($query) {
                    $query->where('role_id', 5)
                        ->where(function ($inner) {
                            $inner->whereNull('is_active')->orWhere('is_active', 1);
                        });
                }),
            ],
            'booking_status' => ['nullable', Rule::in(self::BOOKING_ASSIGNABLE_STATUSES)],
        ])->validate();

        $assignedTech = DB::table('users')
            ->where('user_id', $validated['assigned_tech_id'])
            ->first(['user_id', 'given_name', 'middle_name', 'last_name']);

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'assigned_tech_id' => $validated['assigned_tech_id'],
                'booking_status'   => $validated['booking_status'] ?? 'Approved',
            ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'APPROVE',
            sprintf(
                'Approved booking #%d and assigned %s.',
                $bookingId,
                $this->formatName($assignedTech->given_name, $assignedTech->middle_name, $assignedTech->last_name)
            )
        );

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return response()->json([
            'message' => 'Booking updated successfully.',
            'data'    => $this->mapBookings(collect([$updated]))->first(),
        ]);
    }
}
