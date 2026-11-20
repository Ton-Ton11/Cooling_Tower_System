<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustomerFeedbackController extends Controller
{
    /**
     * Submit feedback and rating for a completed booking.
     */
    public function storeFeedback(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $validated = $request->validate([
            'booking_id' => ['required', 'integer', 'exists:bookings,booking_id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        $booking = Booking::where('booking_id', $validated['booking_id'])
            ->where('client_id', $userId)
            ->firstOrFail();

        if (! in_array($booking->booking_status, ['Partially Completed', 'Completed'], true)) {
            throw ValidationException::withMessages([
                'booking_id' => ['Feedback can only be submitted for partially completed or completed services.'],
            ]);
        }

        $wasPartiallyCompleted = $booking->booking_status === 'Partially Completed';
        if ($wasPartiallyCompleted) {
            $details = is_array($booking->service_details) ? $booking->service_details : [];
            $details['customer_completed_at'] = now()->toISOString();
            $booking->update([
                'booking_status' => 'Completed',
                'service_order_status' => 'Completed',
                'service_details' => $details,
                'updated_at' => now(),
            ]);
        }

        // Check if feedback already exists
        $existing = Feedback::where('booking_id', $booking->booking_id)->first();
        if ($existing) {
            $existing->update([
                'rating' => $validated['rating'],
                'feedback' => $validated['feedback'] ?? null,
                'submitted_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'message' => 'Your feedback has been updated! Thank you for rating our service.',
                'data' => $existing,
            ]);
        }

        $feedback = Feedback::create([
            'booking_id' => $booking->booking_id,
            'rating' => $validated['rating'],
            'feedback' => $validated['feedback'] ?? null,
            'submitted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'FEEDBACK_SUBMIT',
            'description' => sprintf(
                'Customer submitted a %d-star rating for completed booking #%d.',
                $validated['rating'],
                $booking->booking_id
            ),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Thank you for your valuable feedback! We appreciate your business.',
            'data' => $feedback,
        ], 201);
    }
}
