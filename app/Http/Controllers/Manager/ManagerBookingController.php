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

        \App\Http\Controllers\Customer\CustomerBookingController::autoExpireIncompletePayments();

        $query = $this->bookingsBaseQuery()->orderByDesc('bookings.created_at');

        if ($status = $request->string('status')->trim()->value()) {
            $query->where('bookings.booking_status', $status);
        }

        return response()->json([
            'data'        => $this->mapBookings($query->get()),
            'technicians' => $this->techniciansCollection(),
            'teams'       => $this->teamsCollection(),
        ]);
    }

    public function approveBooking(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        return response()->json($this->handleManageBookingAction($request, $bookingId));
    }

    public function completeBooking(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        return response()->json($this->handleCompleteBookingAction($request, $bookingId));
    }
}
