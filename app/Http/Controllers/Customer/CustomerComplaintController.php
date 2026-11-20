<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Complaint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerComplaintController extends Controller
{
    /**
     * List all complaints submitted by the customer.
     */
    public function complaintsIndex(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $complaints = Complaint::with(['booking.service'])
            ->where('customer_id', $userId)
            ->orderByDesc('complaint_date')
            ->get()
            ->map(function ($c) {
                return [
                    'complaint_id' => $c->complaint_id,
                    'booking_id' => $c->booking_id,
                    'service_name' => $c->booking?->service?->service_name,
                    'booking_scheduled_date' => $c->booking?->scheduled_date?->toISOString(),
                    'complaint_details' => $c->complaint_details,
                    'complaint_date' => $c->complaint_date?->toISOString(),
                    'complaint_date_formatted' => $c->complaint_date ? $c->complaint_date->format('M d, Y h:i A') : '',
                    'status' => $c->status,
                ];
            });

        // Also fetch customer bookings so they can select a booking to report if applicable
        $customerBookings = Booking::with('service')
            ->where('client_id', $userId)
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($b) {
                return [
                    'booking_id' => $b->booking_id,
                    'service_name' => $b->service?->service_name ?? 'Aircon Service',
                    'scheduled_date' => $b->scheduled_date ? $b->scheduled_date->format('M d, Y') : '',
                    'booking_status' => $b->booking_status,
                ];
            });

        return response()->json([
            'data' => $complaints,
            'bookings' => $customerBookings,
        ]);
    }

    /**
     * File a new complaint or report an issue directly to management.
     */
    public function storeComplaint(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $validated = $request->validate([
            'booking_id' => ['nullable', 'integer', 'exists:bookings,booking_id'],
            'complaint_details' => ['required', 'string', 'min:10', 'max:3000'],
        ]);

        if (! empty($validated['booking_id'])) {
            Booking::where('booking_id', $validated['booking_id'])
                ->where('client_id', $userId)
                ->firstOrFail();
        }

        $complaint = Complaint::create([
            'customer_id' => $userId,
            'booking_id' => $validated['booking_id'] ?? null,
            'complaint_details' => $validated['complaint_details'],
            'complaint_date' => now(),
            'status' => 'Pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'COMPLAINT_FILED',
            'description' => sprintf(
                'Customer submitted a complaint (#%d)%s.',
                $complaint->complaint_id,
                $complaint->booking_id ? " regarding booking #{$complaint->booking_id}" : ''
            ),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Your complaint has been submitted to management. Our team will review and resolve it promptly.',
            'data' => $complaint,
        ], 201);
    }
}
