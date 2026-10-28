<?php

namespace App\Http\Controllers\Technician;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TechnicianBookingController extends TechnicianBaseController
{
    public function bookingsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        // Get teams this technician belongs to
        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        // Query bookings assigned to this technician or their teams (service_reports is already left-joined in bookingsBaseQuery)
        $query = $this->bookingsBaseQuery()
            ->leftJoin('customer_feedback_and_ratings as feedback', 'feedback.booking_id', '=', 'bookings.booking_id')
            ->addSelect([
                'service_reports.report_id',
                'service_reports.diagnosis',
                'service_reports.work_done',
                'service_reports.parts_replaced',
                'service_reports.recommendations',
                'service_reports.ac_brand',
                'service_reports.ac_type as report_ac_type',
                'service_reports.unit_serial_number',
                'service_reports.job_started_at',
                'service_reports.job_completed_at',
                'service_reports.status as report_status',
                'feedback.rating',
                'feedback.feedback as feedback_notes',
            ])
            ->orderByDesc('bookings.scheduled_date');

        if (in_array((int) $request->user()->role_id, [5, 7], true)) {
            $query->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('bookings.lead_technician_id', $userId)
                    ->orWhere('bookings.assistant_technician_id', $userId)
                    ->orWhere('bookings.assigned_tech_id', $userId);
                if (! empty($myTeamIds)) {
                    $q->orWhereIn('bookings.assigned_team_id', $myTeamIds);
                }
            });
        }

        if ($status = $request->string('status')->trim()->value()) {
            if ($status === 'Active') {
                $query->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress']);
            } elseif ($status !== 'All') {
                $query->where('bookings.booking_status', $status);
            }
        }

        $rows = $query->get();

        // Attach materials used to each booking
        $bookingIds = $rows->pluck('booking_id')->all();
        $materialsByBooking = DB::table('booking_materials')
            ->join('inventory_items', 'inventory_items.item_id', '=', 'booking_materials.item_id')
            ->whereIn('booking_materials.booking_id', $bookingIds)
            ->select([
                'booking_materials.usage_id',
                'booking_materials.booking_id',
                'booking_materials.item_id',
                'booking_materials.quantity_used',
                'booking_materials.logged_at',
                'inventory_items.item_name',
                'inventory_items.unit',
                'inventory_items.item_type',
            ])
            ->get()
            ->groupBy('booking_id');

        // Attach checklists
        $checklistsByBooking = DB::table('tool_checklists')
            ->whereIn('booking_id', $bookingIds)
            ->get(['checklist_id', 'booking_id', 'status', 'notes', 'created_at', 'approved_at', 'completed_at'])
            ->groupBy('booking_id');

        $mapped = $rows->map(function ($row) use ($materialsByBooking, $checklistsByBooking) {
            $leadId = $row->lead_technician_id ?? $row->assigned_tech_id;
            $leadName = ! empty($row->lead_tech_user_id)
                ? $this->formatName($row->lead_tech_given_name, $row->lead_tech_middle_name, $row->lead_tech_last_name)
                : (! empty($row->tech_user_id) ? $this->formatName($row->tech_given_name, $row->tech_middle_name, $row->tech_last_name) : null);

            $assistantId = $row->assistant_technician_id ?? null;
            $assistantName = ! empty($row->assistant_tech_user_id)
                ? $this->formatName($row->assistant_tech_given_name, $row->assistant_tech_middle_name, $row->assistant_tech_last_name)
                : null;

            $teamName = ($leadName && $assistantName)
                ? "{$leadName} & {$assistantName}"
                : ($row->assigned_team_name ?? ($leadName ? "{$leadName} (Lead)" : null));

            $serviceDetails = [];
            if (! empty($row->service_details)) {
                $serviceDetails = is_string($row->service_details)
                    ? (json_decode($row->service_details, true) ?: [])
                    : (is_array($row->service_details) ? $row->service_details : []);
            }

            $unitsData = [];
            if (! empty($row->units_data)) {
                $unitsData = is_string($row->units_data)
                    ? (json_decode($row->units_data, true) ?: [])
                    : (is_array($row->units_data) ? $row->units_data : []);
            }

            $quotationData = null;
            if (! empty($row->quotation_data)) {
                $quotationData = is_string($row->quotation_data)
                    ? json_decode($row->quotation_data, true)
                    : $row->quotation_data;
            }

            $isJobStarted = ! empty($row->job_started_at)
                || ! empty($serviceDetails['job_started_by_tech'])
                || in_array($row->booking_status, ['Dispatched', 'In-Progress'], true);

            return [
                'booking_id' => (int) $row->booking_id,
                'client_id' => (int) $row->client_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'client_address' => $row->client_address,
                'client_contact_number' => $row->client_contact_number,
                'client_email' => $row->client_email,
                'service_id' => (int) $row->service_id,
                'service' => $row->service_name,
                'service_name' => $row->service_name,
                'service_base_price' => (float) $row->base_price,
                'lead_technician_id' => $leadId ? (int) $leadId : null,
                'lead_technician_name' => $leadName,
                'assistant_technician_id' => $assistantId ? (int) $assistantId : null,
                'assistant_technician_name' => $assistantName,
                'assigned_tech_id' => $leadId ? (int) $leadId : null,
                'assigned_tech_name' => $leadName,
                'assigned_team_id' => $row->assigned_team_id ? (int) $row->assigned_team_id : null,
                'assigned_team_name' => $teamName,
                'assigned_by' => $row->assigned_by ? (int) $row->assigned_by : null,
                'assigned_by_name' => isset($row->assigner_given_name) ? $this->formatName($row->assigner_given_name, $row->assigner_middle_name, $row->assigner_last_name) : null,
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'service_payment_method' => $row->service_payment_method ?? 'Cash',
                'service_details' => $serviceDetails,
                'units_data' => $unitsData,
                'quotation_data' => $quotationData,
                'payment_turnover' => $serviceDetails['payment_turnover'] ?? null,
                'job_started_by_tech' => $isJobStarted,
                'created_at' => $row->created_at,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_method' => $row->payment_method,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : null,
                'payment_date' => $row->payment_date,
                'rating' => $row->rating ? (int) $row->rating : null,
                'feedback' => $row->feedback_notes,
                'checklist' => $checklistsByBooking->get($row->booking_id)?->first(),
                'service_report' => $row->report_id ? [
                    'report_id' => (int) $row->report_id,
                    'diagnosis' => $row->diagnosis,
                    'work_done' => $row->work_done,
                    'parts_replaced' => $row->parts_replaced,
                    'recommendations' => $row->recommendations,
                    'ac_brand' => $row->ac_brand,
                    'ac_type' => $row->report_ac_type,
                    'unit_serial_number' => $row->unit_serial_number,
                    'job_started_at' => $row->job_started_at,
                    'job_completed_at' => $row->job_completed_at,
                    'status' => $row->report_status,
                ] : null,
                'materials_used' => collect($materialsByBooking->get($row->booking_id, []))->map(fn ($m) => [
                    'usage_id' => (int) $m->usage_id,
                    'item_id' => (int) $m->item_id,
                    'item_name' => $m->item_name,
                    'unit' => $m->unit,
                    'quantity_used' => (int) $m->quantity_used,
                    'item_type' => $m->item_type,
                    'logged_at' => $m->logged_at,
                ])->values(),
            ];
        });

        // Identify closest upcoming schedule among active jobs and whether any job is currently started
        $nowTs = now()->timestamp;
        $activeUncompleted = $mapped->filter(fn ($b) => in_array($b['booking_status'], ['Approved', 'Dispatched', 'In-Progress'], true));
        $currentlyStartedBooking = $activeUncompleted->first(fn ($b) => ! empty($b['job_started_by_tech']));

        $closestBookingId = null;
        if ($activeUncompleted->isNotEmpty()) {
            $closest = $activeUncompleted->sortBy(function ($b) use ($nowTs) {
                $ts = $b['scheduled_date'] ? strtotime((string) $b['scheduled_date']) : $nowTs;
                return abs($ts - $nowTs);
            })->first();
            $closestBookingId = $closest['booking_id'] ?? null;
        }

        $finalMapped = $mapped->map(function ($b) use ($closestBookingId, $currentlyStartedBooking) {
            $b['is_recommended_closest'] = ($closestBookingId !== null && $b['booking_id'] === $closestBookingId);
            $b['active_started_booking_id'] = $currentlyStartedBooking['booking_id'] ?? null;
            return $b;
        })->sortBy(function ($b) use ($nowTs) {
            // Put active jobs sorted by closest schedule first, then completed/cancelled
            $isActive = in_array($b['booking_status'], ['Approved', 'Dispatched', 'In-Progress'], true);
            $ts = $b['scheduled_date'] ? strtotime((string) $b['scheduled_date']) : $nowTs;
            return $isActive ? (0 + abs($ts - $nowTs)) : (1000000000 + $ts);
        })->values();

        return response()->json([
            'data' => $finalMapped,
            'active_started_booking_id' => $currentlyStartedBooking['booking_id'] ?? null,
            'recommended_booking_id' => $closestBookingId,
        ]);
    }

    public function startJob(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404, 'Booking not found.');
        }

        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $isAssigned = ((int) $booking->assigned_tech_id === $userId)
            || ((int) $booking->lead_technician_id === $userId)
            || ((int) $booking->assistant_technician_id === $userId)
            || ($booking->assigned_team_id && in_array((int) $booking->assigned_team_id, $myTeamIds, true));

        if (in_array((int) $request->user()->role_id, [5, 7], true) && ! $isAssigned && ! $request->user()->isHeadTechnician()) {
            abort(403, 'You are not assigned to this booking or team.');
        }

        if (! in_array($booking->booking_status, ['Approved', 'Dispatched', 'In-Progress'], true)) {
            throw ValidationException::withMessages([
                'booking_status' => ['Only approved bookings can be started.'],
            ]);
        }

        // Enforce single active started job lock: technician can only start job once, and can only start again if the last booking was Completed
        $otherActiveBookings = DB::table('bookings')
            ->leftJoin('service_reports', 'service_reports.booking_id', '=', 'bookings.booking_id')
            ->where('bookings.booking_id', '!=', $bookingId)
            ->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('bookings.lead_technician_id', $userId)
                    ->orWhere('bookings.assistant_technician_id', $userId)
                    ->orWhere('bookings.assigned_tech_id', $userId);
                if (! empty($myTeamIds)) {
                    $q->orWhereIn('bookings.assigned_team_id', $myTeamIds);
                }
            })
            ->get(['bookings.booking_id', 'bookings.booking_status', 'bookings.service_details', 'service_reports.job_started_at']);

        foreach ($otherActiveBookings as $other) {
            $otherDetails = ! empty($other->service_details)
                ? (is_string($other->service_details) ? (json_decode($other->service_details, true) ?: []) : [])
                : [];
            $otherStarted = ! empty($other->job_started_at)
                || ! empty($otherDetails['job_started_by_tech'])
                || in_array($other->booking_status, ['Dispatched', 'In-Progress'], true);

            if ($otherStarted) {
                throw ValidationException::withMessages([
                    'booking_id' => ["You already have an active started job (Booking #{$other->booking_id}). You can only start another job once the current booking is declared Completed by the Manager."],
                ]);
            }
        }

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : [])
            : [];

        if (! empty($serviceDetails['job_started_by_tech'])) {
            throw ValidationException::withMessages([
                'booking_id' => ['This job has already been started. Proceed to the My Tools & Materials Checklist tab to submit your checklist.'],
            ]);
        }

        $serviceDetails['job_started_by_tech'] = true;
        $serviceDetails['job_started_at'] = now()->toISOString();

        // Keep booking_status as 'Approved' until the Tools Man approves the checklist (which transitions it to 'In-Progress')
        DB::table('bookings')->where('booking_id', $bookingId)->update([
            'service_details' => json_encode($serviceDetails),
            'updated_at' => now(),
        ]);

        DB::table('service_reports')->updateOrInsert(
            ['booking_id' => $bookingId],
            [
                'technician_id' => $userId,
                'job_started_at' => now(),
                'status' => 'Started — Awaiting Checklist',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $this->logActivity(
            $userId,
            'JOB_START',
            sprintf('Technician started job for Booking #%d. Booking added to My Tools & Materials Checklist tab.', $bookingId)
        );

        return response()->json([
            'message' => 'Job started! Booking #' . $bookingId . ' is now available in your My Tools & Materials Checklist tab. Once the Tools Man approves your checklist, the customer booking status will automatically update to In-Progress.',
            'booking_status' => $booking->booking_status,
            'job_started_by_tech' => true,
        ]);
    }

    public function completeJob(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        $booking = DB::table('bookings')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->where('bookings.booking_id', $bookingId)
            ->first();

        if (! $booking) {
            abort(404, 'Booking not found.');
        }

        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $isAssigned = ((int) $booking->assigned_tech_id === $userId)
            || ((int) $booking->lead_technician_id === $userId)
            || ((int) $booking->assistant_technician_id === $userId)
            || ($booking->assigned_team_id && in_array((int) $booking->assigned_team_id, $myTeamIds, true));

        if (in_array((int) $request->user()->role_id, [5, 7], true) && ! $isAssigned && ! $request->user()->isHeadTechnician()) {
            abort(403, 'You are not assigned to this booking or team.');
        }

        $validated = $request->validate([
            'diagnosis' => ['required', 'string', 'max:1000'],
            'work_done' => ['required', 'string', 'max:1000'],
            'parts_replaced' => ['nullable', 'string', 'max:500'],
            'recommendations' => ['nullable', 'string', 'max:1000'],
            'ac_brand' => ['nullable', 'string', 'max:100'],
            'ac_type' => ['nullable', 'string', 'max:100'],
            'unit_serial_number' => ['nullable', 'string', 'max:100'],
            'total_service_price' => ['required', 'numeric', 'min:300'],
            'payment_method' => ['required', 'string', 'in:Cash,GCash'],
            'reference_number' => ['nullable', 'string', 'max:13'],
        ]);

        if ($validated['payment_method'] === 'GCash' && empty(trim((string) ($validated['reference_number'] ?? '')))) {
            throw ValidationException::withMessages([
                'reference_number' => ['Please enter the customer\'s GCash reference number (maximum 13 digits).'],
            ]);
        }

        $totalServicePrice = (float) $validated['total_service_price'];
        $downPayment = 300.00;
        $netCollected = max(0.0, $totalServicePrice - $downPayment);

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : [])
            : [];

        $serviceDetails['payment_turnover'] = [
            'total_service_price' => $totalServicePrice,
            'reservation_down_payment' => $downPayment,
            'net_collected' => $netCollected,
            'payment_method' => $validated['payment_method'],
            'reference_number' => $validated['reference_number'] ?? null,
            'collected_by_tech_id' => $userId,
            'turned_over_at' => now()->toISOString(),
            'status' => 'Turned Over to Manager — Awaiting Verification',
        ];

        DB::transaction(function () use ($bookingId, $booking, $userId, $validated, $serviceDetails, $totalServicePrice, $netCollected) {
            // Keep booking in In-Progress until Manager verifies payment turnover and declares Complete
            DB::table('bookings')->where('booking_id', $bookingId)->update([
                'service_payment_method' => $validated['payment_method'],
                'service_details' => json_encode($serviceDetails),
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . sprintf(
                    '[Technician Payment Turnover]: Total Service ₱%.2f less ₱300.00 down payment = ₱%.2f collected via %s%s. Handed over to Manager for completion.',
                    $totalServicePrice,
                    $netCollected,
                    $validated['payment_method'],
                    ! empty($validated['reference_number']) ? " (Ref: {$validated['reference_number']})" : ''
                )),
                'updated_at' => now(),
            ]);

            if ($netCollected > 0) {
                DB::table('payment')->insert([
                    'booking_id' => $bookingId,
                    'booking_price' => $totalServicePrice,
                    'unit_price' => 0.00,
                    'spare_parts_price' => 0.00,
                    'amount_paid' => $netCollected,
                    'payment_status' => 'Paid',
                    'payment_method' => $validated['payment_method'],
                    'payment_type' => 'Service Balance Payment (₱300 Reservation Deducted)',
                    'reference_number' => $validated['reference_number'] ?? null,
                    'notes' => 'Collected by technician after service and turned over to Manager.',
                    'payment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('service_reports')->updateOrInsert(
                ['booking_id' => $bookingId],
                [
                    'technician_id' => $userId,
                    'service_name' => $booking->service_name,
                    'diagnosis' => $validated['diagnosis'],
                    'work_done' => $validated['work_done'],
                    'parts_replaced' => $validated['parts_replaced'] ?? null,
                    'recommendations' => $validated['recommendations'] ?? null,
                    'ac_brand' => $validated['ac_brand'] ?? null,
                    'ac_type' => $validated['ac_type'] ?? null,
                    'unit_serial_number' => $validated['unit_serial_number'] ?? null,
                    'job_completed_at' => now(),
                    'status' => 'Payment Turned Over — Awaiting Manager Completion',
                    'updated_at' => now(),
                ]
            );

            $this->logActivity(
                $userId,
                'JOB_REPORT_AND_PAYMENT_TURNOVER',
                sprintf(
                    'Technician submitted service report and turned over ₱%.2f (%s, after ₱300 down payment deduction) to Manager for Booking #%d.',
                    $netCollected,
                    $validated['payment_method'],
                    $bookingId
                )
            );
        });

        return response()->json([
            'message' => 'Service report submitted and customer payment turned over to Manager! Once the Manager verifies the payment turnover, the booking will be declared Completed.',
            'booking_status' => $booking->booking_status,
            'payment_turnover' => $serviceDetails['payment_turnover'],
        ]);
    }

    public function logMaterial(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404, 'Booking not found.');
        }

        $validated = $request->validate([
            'item_id' => ['required', 'integer', 'exists:inventory_items,item_id'],
            'quantity_used' => ['required', 'integer', 'min:1'],
        ]);

        $item = DB::table('inventory_items')->where('item_id', $validated['item_id'])->first();

        if (! $item) {
            abort(404, 'Inventory item not found.');
        }

        // Deduct inventory
        $newQty = max(0, (int) $item->quantity_on_hand - (int) $validated['quantity_used']);
        DB::table('inventory_items')->where('item_id', $validated['item_id'])->update([
            'quantity_on_hand' => $newQty,
            'last_updated' => now(),
        ]);

        $usageId = DB::table('booking_materials')->insertGetId([
            'booking_id' => $bookingId,
            'item_id' => $validated['item_id'],
            'quantity_used' => $validated['quantity_used'],
            'logged_at' => now(),
        ], 'usage_id');

        $this->logActivity(
            $userId,
            'MATERIAL_LOG',
            sprintf('Logged %d %s of %s for Booking #%d.', $validated['quantity_used'], $item->unit, $item->item_name, $bookingId)
        );

        return response()->json([
            'message' => 'Material logged successfully.',
            'data' => [
                'usage_id' => $usageId,
                'item_id' => $validated['item_id'],
                'item_name' => $item->item_name,
                'quantity_used' => $validated['quantity_used'],
                'unit' => $item->unit,
            ],
        ], 201);
    }

    public function materialsList(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $items = DB::table('inventory_items')
            ->whereIn('item_type', ['Material', 'Spare Part'])
            ->where('quantity_on_hand', '>', 0)
            ->orderBy('item_name')
            ->get(['item_id', 'item_name', 'item_type', 'unit', 'quantity_on_hand']);

        return response()->json([
            'data' => $items,
        ]);
    }

    public function myTools(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        $tools = DB::table('tool_checkouts')
            ->join('inventory_items', 'inventory_items.item_id', '=', 'tool_checkouts.item_id')
            ->where('tool_checkouts.technician_id', $userId)
            ->select([
                'tool_checkouts.checkout_id',
                'tool_checkouts.item_id',
                'tool_checkouts.checkout_date',
                'tool_checkouts.return_date',
                'tool_checkouts.status',
                'inventory_items.item_name',
                'inventory_items.serial_number',
                'inventory_items.tool_subtype',
                'inventory_items.unit',
            ])
            ->orderByDesc('tool_checkouts.checkout_date')
            ->get();

        return response()->json([
            'data' => $tools,
        ]);
    }
}
