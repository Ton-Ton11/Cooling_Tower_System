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
     * Get available customer service categories.
     */
    public function services(): JsonResponse
    {
        $services = Service::whereIn('service_name', [
            'Installation',
            'Repair / Check-up',
            'Cleaning / Preventive Maintenance'
        ])
        ->orderBy('display_order')
        ->get();

        return response()->json([
            'data' => $services,
        ]);
    }

    /**
     * Get dynamic customer catalog (3 customer services, 9 visual unit types, brands, capacities, and policy).
     */
    public function catalog(): JsonResponse
    {
        $services = Service::whereIn('service_name', [
            'Installation',
            'Repair / Check-up',
            'Cleaning / Preventive Maintenance'
        ])
        ->orderBy('display_order')
        ->get();

        $unitTypes = [
            [
                'id' => 1,
                'name' => 'Wall-Mounted Split Type',
                'code' => 'Wall-Mounted Split Type',
                'description' => 'Common residential and small commercial split-type unit.',
                'icon' => 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
            ],
            [
                'id' => 2,
                'name' => 'Window Type',
                'code' => 'Window Type',
                'description' => 'Self-contained air-conditioning unit installed in a window or wall opening.',
                'icon' => 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
            ],
            [
                'id' => 3,
                'name' => 'Floor-Mounted',
                'code' => 'Floor-Mounted',
                'description' => 'Floor-standing air-conditioning unit.',
                'icon' => 'M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
            ],
            [
                'id' => 4,
                'name' => 'Ceiling Cassette',
                'code' => 'Ceiling Cassette',
                'description' => 'Ceiling-mounted cassette type air-conditioning unit.',
                'icon' => 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
            ],
            [
                'id' => 5,
                'name' => 'Ceiling Suspended',
                'code' => 'Ceiling Suspended',
                'description' => 'Ceiling-suspended air-conditioning unit.',
                'icon' => 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8',
            ],
            [
                'id' => 6,
                'name' => 'Ducted / Concealed',
                'code' => 'Ducted / Concealed',
                'description' => 'Air-conditioning system with concealed indoor unit and ductwork.',
                'icon' => 'M3 7h18M3 12h18M3 17h18',
            ],
            [
                'id' => 7,
                'name' => 'Central / Package Unit',
                'code' => 'Central / Package Unit',
                'description' => 'Larger centralized or packaged air-conditioning system.',
                'icon' => 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
            ],
            [
                'id' => 8,
                'name' => 'VRF / VRV System',
                'code' => 'VRF / VRV System',
                'description' => 'Multi-unit air-conditioning system commonly used in commercial buildings.',
                'icon' => 'M4 4h7v7H4V4zm9 0h7v7h-7V4zm0 9h7v7h-7v-7zm-9 0h7v7H4v-7z',
            ],
            [
                'id' => 9,
                'name' => 'Other / Not Sure',
                'code' => 'Other / Not Sure',
                'description' => "I’m not sure what type of unit I have.",
                'icon' => 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            ],
        ];

        $brands = [
            'Samsung',
            'LG',
            'Panasonic',
            'Carrier',
            'Daikin',
            'Mitsubishi',
            'Condura',
            'Kolin',
            'Fujitsu',
            'Other',
        ];

        $capacities = [
            'hp' => ['0.5 HP', '0.75 HP', '1.0 HP', '1.5 HP', '2.0 HP', '2.5 HP', '3.0 HP', '4.0 HP', '5.0 HP', 'Not Sure'],
            'commercial' => ['1.0 TR', '1.5 TR', '2.0 TR', '2.5 TR', '3.0 TR', '4.0 TR', '5.0 TR', '10.0+ TR', 'BTU Capacity', 'Not Sure'],
        ];

        $policy = [
            'fee_name' => 'Appointment Reservation Fee',
            'amount' => 300.00,
            'reschedule_fee' => 150.00,
            'allowed_cancellation_hours' => 24,
            'gcash_account' => '0917-123-4567',
            'gcash_name' => 'Cooling Tower Airconditioning Services',
            'notice' => 'An appointment reservation fee is required to secure your requested service schedule. Your reservation fee is separate from the final service quotation.',
            'terms' => [
                'Service Request Only: This booking is an initial service request and schedule reservation. Final service charges will be determined by assessment and an official quotation.',
                'Reservation Fee Separation: The ₱300.00 reservation fee is strictly for reserving your schedule and is not the full service price.',
                'Fee Crediting: If your service proceeds, the reservation fee may be credited toward your final service bill based on company policy.',
                'Cancellation Policy: Cancellations made at least 24 hours prior to the appointment are eligible for rescheduling or refund.',
                'Rescheduling Policy: Rescheduling requested within the allowed window transfers the reservation fee to your new schedule.',
                'Late Cancellation / No-Show: Late cancellations (under 24 hours) or customer no-shows may forfeit the reservation fee to cover administrative costs.',
                'Company Cancellation: If the service appointment is rescheduled or cancelled by the company due to emergencies or weather, your booking and fee are fully protected.',
            ],
        ];

        return response()->json([
            'services' => $services,
            'unit_types' => $unitTypes,
            'brands' => $brands,
            'capacities' => $capacities,
            'policy' => $policy,
        ]);
    }

    /**
     * List bookings belonging to the authenticated customer.
     */
    public function bookingsIndex(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $query = Booking::with(['service', 'technician', 'team', 'payments', 'feedback'])
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
            $unitsList = is_array($b->units_data) ? $b->units_data : [];
            $totalUnitsCount = 0;
            if (! empty($unitsList)) {
                foreach ($unitsList as $u) {
                    $totalUnitsCount += max(1, (int) ($u['quantity'] ?? 1));
                }
            } else {
                $totalUnitsCount = 1;
            }

            $leadUser = $b->leadTechnician ?: $b->technician;
            $leadName = $leadUser ? trim("{$leadUser->given_name} {$leadUser->middle_name} {$leadUser->last_name}") : null;
            $assistantUser = $b->assistantTechnician;
            $assistantName = $assistantUser ? trim("{$assistantUser->given_name} {$assistantUser->middle_name} {$assistantUser->last_name}") : null;

            $assignedTeamName = null;
            if ($leadName && $assistantName) {
                $assignedTeamName = "{$leadName} & {$assistantName}";
            } elseif ($leadName) {
                $assignedTeamName = "{$leadName} (Lead)";
            } elseif ($b->team?->team_name) {
                $assignedTeamName = $b->team->team_name;
            }

            return [
                'booking_id' => $b->booking_id,
                'client_id' => $b->client_id,
                'service_id' => $b->service_id,
                'service_name' => $b->service?->service_name ?? 'Aircon Service',
                'service_description' => $b->service?->description,
                'assigned_tech_id' => $b->lead_technician_id ?? $b->assigned_tech_id,
                'assigned_tech_name' => $leadName,
                'lead_technician_id' => $b->lead_technician_id ?? $b->assigned_tech_id,
                'lead_technician_name' => $leadName,
                'assistant_technician_id' => $b->assistant_technician_id,
                'assistant_technician_name' => $assistantName,
                'assigned_team' => [
                    'lead' => $leadUser ? [
                        'user_id' => (int) $leadUser->user_id,
                        'name' => $leadName,
                        'role' => 'Lead Technician',
                    ] : null,
                    'assistant' => $assistantUser ? [
                        'user_id' => (int) $assistantUser->user_id,
                        'name' => $assistantName,
                        'role' => 'Assistant Technician',
                    ] : null,
                ],
                'assigned_tech_contact' => $leadUser?->contact_number,
                'assigned_team_id' => $b->assigned_team_id,
                'assigned_team_name' => $assignedTeamName,
                'scheduled_date' => $b->scheduled_date?->toISOString(),
                'scheduled_date_formatted' => $b->scheduled_date ? $b->scheduled_date->format('M d, Y h:i A') : 'TBD',
                'alternative_schedule' => $b->alternative_schedule,
                'booking_status' => $b->booking_status,
                'quotation_status' => $b->quotation_status ?? 'Pending Assessment',
                'quotation_data' => $b->quotation_data,
                'service_order_status' => $b->service_order_status ?? 'Pending Quotation',
                'soa_data' => $b->soa_data,
                'policy_acknowledged' => (bool) $b->policy_acknowledged,
                'total_units_count' => $totalUnitsCount,
                'units_data' => $unitsList,
                'service_details' => $b->service_details ?? [],
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
                        'payment_type' => $p->payment_type ?? 'Appointment Reservation Fee',
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
     * Store a newly created service booking request with GCash reservation fee.
     */
    public function storeBooking(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->user_id;

        $validated = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,service_id'],
            'units' => ['nullable'],
            'service_details' => ['nullable'],
            'aircon_brand' => ['nullable', 'string', 'max:100'],
            'aircon_type' => ['nullable', 'string', 'max:100'],
            'unit_quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'scheduled_date' => ['required', 'date', 'after:now'],
            'alternative_schedule' => ['nullable', 'string', 'max:150'],
            'service_payment_method' => ['required', 'string', Rule::in(['Cash', 'GCash'])],
            'booking_fee' => ['nullable', 'numeric', 'min:0'],
            'reference_number' => ['required', 'string', 'min:5', 'max:100'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1500'],
            'service_address' => ['nullable', 'string', 'max:1000'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'policy_acknowledged' => ['nullable'],
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts', 'public');
        }

        $service = Service::findOrFail($validated['service_id']);
        $bookingFee = isset($validated['booking_fee']) && (float) $validated['booking_fee'] > 0
            ? (float) $validated['booking_fee']
            : 300.00;

        // Parse units data
        $units = $request->input('units');
        if (is_string($units)) {
            $units = json_decode($units, true) ?: [];
        }
        if (! is_array($units)) {
            $units = [];
        }

        // Parse service specific details
        $serviceDetails = $request->input('service_details');
        if (is_string($serviceDetails)) {
            $serviceDetails = json_decode($serviceDetails, true) ?: [];
        }
        if (! is_array($serviceDetails)) {
            $serviceDetails = [];
        }

        $firstUnit = $units[0] ?? null;
        $primaryBrand = $firstUnit['brand'] ?? $validated['aircon_brand'] ?? 'Carrier';
        if ($primaryBrand === 'Other' && ! empty($firstUnit['other_brand'])) {
            $primaryBrand = $firstUnit['other_brand'];
        }
        $primaryType = $firstUnit['unit_type'] ?? $validated['aircon_type'] ?? 'Wall-Mounted Split Type';
        $totalQuantity = 0;
        if (! empty($units)) {
            foreach ($units as $u) {
                $totalQuantity += max(1, (int) ($u['quantity'] ?? 1));
            }
        } else {
            $totalQuantity = max(1, (int) ($validated['unit_quantity'] ?? 1));
        }

        DB::beginTransaction();
        try {
            // 1. Update customer unit details & address
            CustomerUnitDetail::updateOrCreate(
                ['user_id' => $userId],
                [
                    'aircon_brand' => $primaryBrand,
                    'aircon_type' => $primaryType,
                    'unit_quantity' => $totalQuantity,
                ]
            );

            $updateData = [];
            if (! empty($validated['service_address']) && $validated['service_address'] !== $user->address) {
                $updateData['address'] = $validated['service_address'];
            }
            if (! empty($validated['contact_number']) && $validated['contact_number'] !== $user->contact_number) {
                $updateData['contact_number'] = $validated['contact_number'];
            }
            if (! empty($updateData)) {
                $updateData['updated_at'] = now();
                DB::table('users')->where('user_id', $userId)->update($updateData);
            }

            // 2. Create Booking
            $scheduledDateTime = Carbon::parse($validated['scheduled_date']);

            $booking = Booking::create([
                'client_id' => $userId,
                'service_id' => $service->service_id,
                'assigned_tech_id' => null,
                'scheduled_date' => $scheduledDateTime,
                'alternative_schedule' => $validated['alternative_schedule'] ?? null,
                'booking_status' => 'Pending',
                'quotation_status' => 'Pending Assessment',
                'service_order_status' => 'Pending Quotation',
                'service_payment_method' => $validated['service_payment_method'],
                'notes' => $validated['notes'] ?? null,
                'units_data' => $units,
                'service_details' => $serviceDetails,
                'policy_acknowledged' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 3. Create Payment record for Appointment Reservation Fee
            Payment::create([
                'booking_id' => $booking->booking_id,
                'booking_price' => 0.00,
                'unit_price' => 0.00,
                'spare_parts_price' => 0.00,
                'amount_paid' => $bookingFee,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_type' => 'Appointment Reservation Fee',
                'reference_number' => $validated['reference_number'],
                'sender_name' => $validated['sender_name'] ?? $user->name,
                'sender_number' => $validated['sender_number'] ?? $user->contact_number,
                'receipt_image' => $receiptPath,
                'notes' => 'Appointment Reservation Fee (Schedule Security)',
                'payment_date' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 4. Activity Log
            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_CREATE',
                'description' => sprintf(
                    'Customer submitted service request #%d for %s with %d unit(s) scheduled on %s. GCash Ref: %s.',
                    $booking->booking_id,
                    $service->service_name,
                    $totalQuantity,
                    $scheduledDateTime->format('M d, Y h:i A'),
                    $validated['reference_number']
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Your service request and appointment reservation have been received! Our staff will review your request and prepare an official quotation.',
                'booking_id' => $booking->booking_id,
                'booking' => $booking->fresh(['service']),
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
     * Respond to an official quotation (Accept, Decline, or Request Clarification).
     */
    public function respondQuotation(Request $request, int $bookingId): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['accept', 'decline', 'clarify'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $action = $validated['action'];
        $notes = $validated['notes'] ?? null;

        DB::beginTransaction();
        try {
            if ($action === 'accept') {
                $booking->update([
                    'quotation_status' => 'Accepted',
                    'service_order_status' => 'Service Order Generated',
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Customer]: Accepted quotation on ' . now()->format('M d, Y h:i A') . ($notes ? ". Customer Notes: {$notes}" : '')),
                    'updated_at' => now(),
                ]);
                $msg = 'You have accepted the official quotation! A Service Order has been generated for technician dispatch.';
            } elseif ($action === 'decline') {
                $booking->update([
                    'quotation_status' => 'Declined',
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Customer]: Declined quotation on ' . now()->format('M d, Y h:i A') . ($notes ? ". Reason: {$notes}" : '')),
                    'updated_at' => now(),
                ]);
                $msg = 'You have declined the quotation. Our customer representative will get in touch with you.';
            } else {
                $booking->update([
                    'quotation_status' => 'Clarification Requested',
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Customer Clarification]: ' . ($notes ?: 'Customer requested clarification regarding quotation.')),
                    'updated_at' => now(),
                ]);
                $msg = 'Your quotation clarification request has been submitted to our team.';
            }

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'QUOTATION_' . strtoupper($action),
                'description' => "Customer {$action}ed quotation for Booking #{$booking->booking_id}.",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => $msg,
                'booking' => $booking->fresh(['service', 'technician', 'team', 'payments']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
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
