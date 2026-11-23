<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Shared\CustomerSupportController;
use App\Models\Booking;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CustomerComplaintController extends Controller
{
    /**
     * List all problem reports submitted by the customer.
     */
    public function complaintsIndex(Request $request): JsonResponse
    {
        CustomerSupportController::ensureSupportTablesExist();

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
                    'management_response' => $c->management_response ?? null,
                    'complaint_date' => $c->complaint_date?->toISOString(),
                    'complaint_date_formatted' => $c->complaint_date ? $c->complaint_date->format('M d, Y h:i A') : '',
                    'resolved_at_formatted' => $c->resolved_at ? $c->resolved_at->format('M d, Y h:i A') : null,
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
     * File a new problem report directly to Manager & Super Admin.
     */
    public function storeComplaint(Request $request): JsonResponse
    {
        CustomerSupportController::ensureSupportTablesExist();

        $user = $request->user();
        $userId = (int) $user->user_id;

        $validated = $request->validate([
            'booking_id' => ['nullable', 'integer', 'exists:bookings,booking_id'],
            'complaint_details' => ['required', 'string', 'min:10', 'max:3000'],
        ]);

        $booking = null;
        if (! empty($validated['booking_id'])) {
            $booking = Booking::with('service')
                ->where('booking_id', $validated['booking_id'])
                ->where('client_id', $userId)
                ->firstOrFail();
        }

        $complaint = Complaint::create([
            'customer_id' => $userId,
            'booking_id' => $validated['booking_id'] ?? null,
            'complaint_details' => trim($validated['complaint_details']),
            'complaint_date' => now(),
            'status' => 'Pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Notify all active Managers (role_id = 2) and Super Admins (role_id = 1) in staff_messages inbox
        if (Schema::hasTable('staff_messages')) {
            $customerName = trim("{$user->given_name} {$user->last_name}") ?: ($user->name ?? "Customer #{$userId}");
            $bookingContext = $booking
                ? " regarding Booking #{$booking->booking_id} (" . ($booking->service?->service_name ?? 'Service') . ')'
                : '';

            $recipients = User::whereIn('role_id', [1, 2])
                ->where(function ($q) {
                    $q->whereNull('is_active')->orWhere('is_active', 1);
                })
                ->pluck('user_id');

            foreach ($recipients as $recipientId) {
                DB::table('staff_messages')->insert([
                    'sender_id'    => $userId,
                    'recipient_id' => (int) $recipientId,
                    'subject'      => "Customer Problem Report #{$complaint->complaint_id}" . ($booking ? " (Booking #{$booking->booking_id})" : ''),
                    'body'         => "From {$customerName}{$bookingContext}: {$complaint->complaint_details}",
                    'is_read'      => false,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }
        }

        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'COMPLAINT_FILED',
            'description' => sprintf(
                'Customer submitted a problem report (#%d)%s.',
                $complaint->complaint_id,
                $complaint->booking_id ? " regarding booking #{$complaint->booking_id}" : ''
            ),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Your problem report has been delivered to the Manager and Super Admin.',
            'data' => $complaint,
        ], 201);
    }
}
