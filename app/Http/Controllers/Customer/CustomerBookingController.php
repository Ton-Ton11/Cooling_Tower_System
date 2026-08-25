<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\CustomerUnitDetail;
use App\Models\Payment;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerBookingController extends Controller
{
    /**
     * Get available services.
     */
    public function services(): JsonResponse
    {
        $services = Service::active()
            ->orderBy('display_order')
            ->orderBy('service_id')
            ->get();

        return response()->json([
            'data' => $services,
        ]);
    }

    /**
     * Get dynamic customer catalog (active services, unit types, and brands).
     */
    public function catalog(): JsonResponse
    {
        $services = Service::active()
            ->orderBy('display_order')
            ->orderBy('service_id')
            ->get();

        $unitTypes = \App\Models\UnitType::active()
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $brands = \App\Models\Brand::active()
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'services' => $services,
            'unit_types' => $unitTypes,
            'brands' => $brands,
        ]);
    }

    /**
     * List bookings belonging to the authenticated customer.
     */
    public function bookingsIndex(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $query = Booking::with(['service', 'technician', 'payments', 'feedback'])
            ->where('client_id', $userId)
            ->orderByDesc('created_at');

        if ($status = $request->string('status')->trim()->value()) {
            if ($status === 'Active') {
                $query->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress']);
            } elseif ($status !== 'All') {
                $query->where('booking_status', $status);
            }
        }

        $bookings = $query->get()->map(function ($b) {
            $latestPay = $b->payments->sortByDesc('payment_id')->first();

            return [
                'booking_id' => $b->booking_id,
                'client_id' => $b->client_id,
                'service_id' => $b->service_id,
                'service_name' => $b->service?->service_name ?? 'Aircon Service',
                'service_description' => $b->service?->description,
                'service_base_price' => (float) ($b->service?->base_price ?? 0),
                'assigned_tech_id' => $b->assigned_tech_id,
                'assigned_tech_name' => $b->technician ? trim("{$b->technician->given_name} {$b->technician->middle_name} {$b->technician->last_name}") : null,
                'assigned_tech_contact' => $b->technician?->contact_number,
                'scheduled_date' => $b->scheduled_date?->toISOString(),
                'scheduled_date_formatted' => $b->scheduled_date ? $b->scheduled_date->format('M d, Y h:i A') : 'TBD',
                'booking_status' => $b->booking_status,
                'service_payment_method' => $b->service_payment_method ?? 'Cash',
                'cancellation_reason' => $b->cancellation_reason,
                'notes' => $b->notes,
                'created_at' => $b->created_at?->toISOString(),
                'created_at_formatted' => $b->created_at ? $b->created_at->format('M d, Y h:i A') : '',
                'payment_status' => $latestPay?->payment_status ?? 'Pending',
                'payment_method' => $latestPay?->payment_method ?? 'GCash',
                'booking_fee_paid' => (float) ($latestPay?->amount_paid ?? 0),
                'reference_number' => $latestPay?->reference_number,
                'payments' => $b->payments->map(function ($p) {
                    return [
                        'payment_id' => $p->payment_id,
                        'payment_type' => $p->payment_type ?? 'Booking Fee',
                        'amount_paid' => (float) $p->amount_paid,
                        'payment_method' => $p->payment_method,
                        'payment_status' => $p->payment_status,
                        'reference_number' => $p->reference_number,
                        'sender_name' => $p->sender_name,
                        'sender_number' => $p->sender_number,
                        'receipt_image' => $p->receipt_image ? asset('storage/' . $p->receipt_image) : null,
                        'payment_date' => $p->payment_date?->toISOString(),
                    ];
                }),
                'feedback' => $b->feedback ? [
                    'feedback_id' => $b->feedback->feedback_id,
                    'rating' => $b->feedback->rating,
                    'feedback' => $b->feedback->feedback,
                    'submitted_at' => $b->feedback->submitted_at?->toISOString(),
                ] : null,
            ];
        });

        return response()->json([
            'data' => $bookings,
        ]);
    }

    /**
     * Store a newly created booking with GCash fee payment.
     */
    public function storeBooking(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->user_id;

        $validated = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,service_id'],
            'aircon_brand' => ['required', 'string', 'max:100'],
            'aircon_type' => ['required', 'string', 'max:100'],
            'unit_quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'scheduled_date' => ['required', 'date', 'after:now'],
            'service_payment_method' => ['required', 'string', Rule::in(['Cash', 'GCash'])],
            'booking_fee' => ['nullable', 'numeric', 'min:0'],
            'reference_number' => ['required', 'string', 'min:5', 'max:100'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'service_address' => ['nullable', 'string', 'max:1000'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts', 'public');
        }

        $service = Service::findOrFail($validated['service_id']);
        $bookingFee = isset($validated['booking_fee']) && (float) $validated['booking_fee'] > 0
            ? (float) $validated['booking_fee']
            : 300.00;

        DB::beginTransaction();
        try {
            // 1. Update customer unit details & address
            CustomerUnitDetail::updateOrCreate(
                ['user_id' => $userId],
                [
                    'aircon_brand' => $validated['aircon_brand'],
                    'aircon_type' => $validated['aircon_type'],
                    'unit_quantity' => $validated['unit_quantity'],
                ]
            );

            if (! empty($validated['service_address']) && $validated['service_address'] !== $user->address) {
                DB::table('users')->where('user_id', $userId)->update([
                    'address' => $validated['service_address'],
                    'updated_at' => now(),
                ]);
            }

            // 2. Create Booking
            $scheduledDateTime = Carbon::parse($validated['scheduled_date']);

            $booking = Booking::create([
                'client_id' => $userId,
                'service_id' => $service->service_id,
                'assigned_tech_id' => null,
                'scheduled_date' => $scheduledDateTime,
                'booking_status' => 'Pending',
                'service_payment_method' => $validated['service_payment_method'],
                'notes' => $validated['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 3. Create Payment record for Booking Fee
            Payment::create([
                'booking_id' => $booking->booking_id,
                'booking_price' => $service->base_price,
                'unit_price' => $service->base_price,
                'spare_parts_price' => 0.00,
                'amount_paid' => $bookingFee,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_type' => 'Booking Fee',
                'reference_number' => $validated['reference_number'],
                'sender_name' => $validated['sender_name'] ?? $user->name,
                'sender_number' => $validated['sender_number'] ?? $user->contact_number,
                'receipt_image' => $receiptPath,
                'notes' => 'Initial GCash Booking Confirmation Fee',
                'payment_date' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 4. Activity Log
            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_CREATE',
                'description' => sprintf(
                    'Customer submitted booking #%d for %s scheduled on %s. GCash Ref: %s.',
                    $booking->booking_id,
                    $service->service_name,
                    $scheduledDateTime->format('M d, Y h:i A'),
                    $validated['reference_number']
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Your service booking request has been submitted successfully! Please wait for admin approval and technician assignment.',
                'booking_id' => $booking->booking_id,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Reschedule a booking (requires GCash rescheduling fee).
     */
    public function reschedule(Request $request, int $bookingId): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking' => ['Completed or Cancelled bookings cannot be rescheduled.'],
            ]);
        }

        $validated = $request->validate([
            'new_scheduled_date' => ['required', 'date', 'after:now'],
            'reschedule_fee' => ['nullable', 'numeric', 'min:0'],
            'reference_number' => ['required', 'string', 'min:5', 'max:100'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:50'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'reschedule_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts', 'public');
        }

        $rescheduleFee = isset($validated['reschedule_fee']) && (float) $validated['reschedule_fee'] > 0
            ? (float) $validated['reschedule_fee']
            : 150.00;

        $newDate = Carbon::parse($validated['new_scheduled_date']);

        DB::beginTransaction();
        try {
            $oldDateStr = $booking->scheduled_date ? $booking->scheduled_date->format('M d, Y h:i A') : 'N/A';

            $booking->update([
                'scheduled_date' => $newDate,
                'booking_status' => 'Pending', // Resets to Pending so Admin/Manager can re-dispatch
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . "Rescheduled from {$oldDateStr}. Reason: " . ($validated['reschedule_reason'] ?? 'Customer request')),
                'updated_at' => now(),
            ]);

            Payment::create([
                'booking_id' => $booking->booking_id,
                'booking_price' => 0.00,
                'amount_paid' => $rescheduleFee,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_type' => 'Reschedule Fee',
                'reference_number' => $validated['reference_number'],
                'sender_name' => $validated['sender_name'] ?? $request->user()->name,
                'sender_number' => $validated['sender_number'] ?? $request->user()->contact_number,
                'receipt_image' => $receiptPath,
                'notes' => 'Rescheduling Fee payment',
                'payment_date' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_RESCHEDULE',
                'description' => sprintf(
                    'Customer rescheduled booking #%d to %s. GCash Ref: %s.',
                    $booking->booking_id,
                    $newDate->format('M d, Y h:i A'),
                    $validated['reference_number']
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Booking rescheduled successfully! Status is set to Pending for manager confirmation.',
                'booking' => $booking->fresh(['service', 'technician', 'payments']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Cancel a pending or active booking.
     */
    public function cancel(Request $request, int $bookingId): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking' => ['This booking is already completed or cancelled.'],
            ]);
        }

        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $booking->update([
            'booking_status' => 'Cancelled',
            'cancellation_reason' => $validated['cancellation_reason'],
            'updated_at' => now(),
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'BOOKING_CANCEL',
            'description' => sprintf(
                'Customer cancelled booking #%d. Reason: %s',
                $booking->booking_id,
                $validated['cancellation_reason']
            ),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Booking has been cancelled.',
            'booking' => $booking->fresh(['service', 'technician']),
        ]);
    }
}
