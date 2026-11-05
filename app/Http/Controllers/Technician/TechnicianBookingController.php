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

        // Synchronize auto-started state in chronological order before loading jobs
        self::syncAutoStartForTechnicians([$userId]);

        // Get teams this technician belongs to
        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        // Query bookings assigned to this technician or their teams (service_reports and feedback are already left-joined in bookingsBaseQuery)
        $query = $this->bookingsBaseQuery()
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
                'feedback.feedback as feedback_notes',
            ])
            ->orderByDesc('bookings.scheduled_date');

        if (in_array((int) $request->user()->role_id, [5, 7], true)) {
            $query->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('bookings.lead_technician_id', $userId)
                    ->orWhere('bookings.assistant_technician_id', $userId)
                    ->orWhere('bookings.assigned_tech_id', $userId)
                    ->orWhere('bookings.service_details', 'like', '%"user_id":' . $userId . '%');
                if (! empty($myTeamIds)) {
                    $q->orWhere(function ($teamQuery) use ($myTeamIds) {
                        $teamQuery->whereNull('bookings.lead_technician_id')
                            ->whereNull('bookings.assistant_technician_id')
                            ->whereNull('bookings.assigned_tech_id')
                            ->whereIn('bookings.assigned_team_id', $myTeamIds);
                    });
                }
            });
        }

        if ($status = $request->string('status')->trim()->value()) {
            if ($status === 'Active') {
                $query->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress']);
            } elseif ($status === 'Completed') {
                $query->whereIn('bookings.booking_status', ['Partially Completed', 'Completed']);
            } elseif ($status !== 'All') {
                $query->where('bookings.booking_status', $status);
            } else {
                $query->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Partially Completed', 'Completed']);
            }
        } else {
            $query->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Partially Completed', 'Completed']);
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

        // Attach checklists (newest first) with creator name and categorized items
        $checklistRows = DB::table('tool_checklists')
            ->leftJoin('users as creator', 'creator.user_id', '=', 'tool_checklists.technician_id')
            ->leftJoin('users as approver', 'approver.user_id', '=', 'tool_checklists.approved_by')
            ->whereIn('tool_checklists.booking_id', $bookingIds)
            ->orderByDesc('tool_checklists.checklist_id')
            ->get([
                'tool_checklists.checklist_id',
                'tool_checklists.booking_id',
                'tool_checklists.technician_id',
                'tool_checklists.status',
                'tool_checklists.notes',
                'tool_checklists.created_at',
                'tool_checklists.approved_at',
                'tool_checklists.completed_at',
                'creator.given_name as creator_given_name',
                'creator.last_name as creator_last_name',
                'approver.given_name as approver_given_name',
                'approver.last_name as approver_last_name',
            ]);

        $checklistIds = $checklistRows->pluck('checklist_id')->all();
        $itemsByChecklist = collect();
        if (! empty($checklistIds)) {
            $itemsByChecklist = DB::table('tool_checklist_items')
                ->leftJoin('inventory_items', 'inventory_items.item_id', '=', 'tool_checklist_items.item_id')
                ->whereIn('tool_checklist_items.checklist_id', $checklistIds)
                ->select([
                    'tool_checklist_items.id',
                    'tool_checklist_items.checklist_id',
                    'tool_checklist_items.item_id',
                    'tool_checklist_items.item_type',
                    'tool_checklist_items.quantity_requested',
                    'tool_checklist_items.quantity_approved',
                    'tool_checklist_items.status',
                    'tool_checklist_items.notes',
                    'inventory_items.item_name',
                    'inventory_items.tool_subtype',
                    'inventory_items.sub_category',
                    'inventory_items.serial_number',
                    'inventory_items.unit',
                ])
                ->get()
                ->map(function ($it) {
                    $isTool = strtolower($it->item_type ?? '') === 'tool';
                    $rawSubtype = strtolower((string) ($it->tool_subtype ?? ''));
                    $normalizedSubtype = $isTool ? (str_contains($rawSubtype, 'power') ? 'power' : 'hand') : null;
                    $categoryGroup = ! $isTool ? 'material' : ($normalizedSubtype === 'power' ? 'power_tool' : 'hand_tool');

                    return [
                        'id' => (int) $it->id,
                        'checklist_id' => (int) $it->checklist_id,
                        'item_id' => (int) $it->item_id,
                        'item_name' => $it->item_name ?? 'Item',
                        'item_type' => $it->item_type,
                        'tool_subtype' => $normalizedSubtype,
                        'sub_category' => $it->sub_category,
                        'category_group' => $categoryGroup,
                        'serial_number' => $it->serial_number,
                        'unit' => $it->unit ?? 'pc',
                        'quantity_requested' => (int) $it->quantity_requested,
                        'quantity_approved' => (int) $it->quantity_approved,
                        'status' => $it->status,
                        'notes' => $it->notes,
                    ];
                })
                ->groupBy('checklist_id');
        }

        $checklistsByBooking = $checklistRows->map(function ($cl) use ($itemsByChecklist) {
            $items = collect($itemsByChecklist->get($cl->checklist_id, []))->values();
            $creatorName = trim(($cl->creator_given_name ?? '') . ' ' . ($cl->creator_last_name ?? ''));
            $approverName = trim(($cl->approver_given_name ?? '') . ' ' . ($cl->approver_last_name ?? ''));

            return [
                'checklist_id' => (int) $cl->checklist_id,
                'booking_id' => (int) $cl->booking_id,
                'technician_id' => $cl->technician_id ? (int) $cl->technician_id : null,
                'technician_name' => $creatorName ?: null,
                'approved_by_name' => $approverName ?: null,
                'status' => $cl->status,
                'notes' => $cl->notes,
                'created_at' => $cl->created_at,
                'approved_at' => $cl->approved_at,
                'completed_at' => $cl->completed_at,
                'items_count' => $items->count(),
                'items' => $items,
            ];
        })->groupBy('booking_id');

        $linkedOrdersByBooking = collect();
        if (! empty($bookingIds) && \Illuminate\Support\Facades\Schema::hasTable('ac_unit_orders')) {
            $linkedOrdersByBooking = DB::table('ac_unit_orders')
                ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ac_unit_orders.ac_unit_id')
                ->whereIn('ac_unit_orders.installation_booking_id', $bookingIds)
                ->select([
                    'ac_unit_orders.*',
                    'ac_units_inventory.brand',
                    'ac_units_inventory.model',
                    'ac_units_inventory.serial_number',
                    'ac_units_inventory.horsepower',
                    'ac_units_inventory.ac_type',
                    'ac_units_inventory.motor_type',
                ])
                ->get()
                ->map(fn ($o) => [
                    'order_id'                => (int) $o->order_id,
                    'ocular_booking_id'       => $o->ocular_booking_id ? (int) $o->ocular_booking_id : null,
                    'installation_booking_id' => $o->installation_booking_id ? (int) $o->installation_booking_id : null,
                    'ac_unit_id'              => (int) $o->ac_unit_id,
                    'brand'                   => $o->brand,
                    'model'                   => $o->model,
                    'serial_number'           => $o->serial_number,
                    'horsepower'              => $o->horsepower !== null ? (float) $o->horsepower : null,
                    'ac_type'                 => $o->ac_type,
                    'motor_type'              => $o->motor_type,
                    'quantity'                => (int) $o->quantity,
                    'unit_price'              => (float) $o->unit_price,
                    'total_unit_price'        => (float) $o->total_unit_price,
                    'down_payment_amount'     => (float) $o->down_payment_amount,
                    'remaining_unit_balance'  => (float) $o->remaining_unit_balance,
                    'delivery_fee'            => (float) $o->delivery_fee,
                    'installation_fee'        => (float) $o->installation_fee,
                    'payment_method'          => $o->payment_method,
                    'fulfillment_type'        => $o->fulfillment_type,
                    'order_status'            => $o->order_status,
                ])
                ->keyBy('installation_booking_id');
        }

        $mapped = $rows->map(function ($row) use ($materialsByBooking, $checklistsByBooking, $linkedOrdersByBooking) {
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

            // A present scheduled booking automatically starts only when its scheduled date has arrived
            // AND any recent booking has its checklist completed, payment turned over to manager, and booking completed.
            $autoStartEval = self::evaluateBookingAutoStart($row);
            $isScheduledDatePresent = $autoStartEval['is_scheduled_date_present'];
            $blockingBookingId = $autoStartEval['blocking_booking_id'];

            $isJobStarted = ($row->booking_status === 'In-Progress')
                || (in_array($row->booking_status, ['Approved', 'Dispatched'], true) && $autoStartEval['can_auto_start']);

            $bookingChecklists = collect($checklistsByBooking->get($row->booking_id, []))->values();
            $isOcularInspection = ((int) $row->service_id === 4)
                || str_contains(strtolower((string) ($row->service_name ?? '')), 'ocular')
                || ! empty($serviceDetails['is_ocular_inspection']);

            return [
                'booking_id' => (int) $row->booking_id,
                'is_ocular_inspection' => $isOcularInspection,
                'ocular_personnel' => $serviceDetails['ocular_personnel'] ?? [],
                'inspection_status' => $serviceDetails['inspection_status'] ?? null,
                'ac_unit_order' => $linkedOrdersByBooking->get((int) $row->booking_id) ?? null,
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
                'is_scheduled_date_present' => $isScheduledDatePresent,
                'blocking_booking_id' => $blockingBookingId,
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
                'checklist' => $bookingChecklists->first(),
                'checklists' => $bookingChecklists,
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

        $serviceDetailsForAuth = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : [])
            : [];
        $inOcularPersonnel = collect($serviceDetailsForAuth['ocular_personnel'] ?? [])
            ->contains(fn ($p) => (int) ($p['user_id'] ?? 0) === $userId);

        $isAssigned = ((int) $booking->assigned_tech_id === $userId)
            || ((int) $booking->lead_technician_id === $userId)
            || ((int) $booking->assistant_technician_id === $userId)
            || $inOcularPersonnel
            || ($booking->assigned_team_id && in_array((int) $booking->assigned_team_id, $myTeamIds, true));

        if (in_array((int) $request->user()->role_id, [5, 7], true) && ! $isAssigned && ! $request->user()->isHeadTechnician()) {
            abort(403, 'You are not assigned to this booking or team.');
        }

        if (! in_array($booking->booking_status, ['Approved', 'Dispatched', 'In-Progress'], true)) {
            throw ValidationException::withMessages([
                'booking_status' => ['Only approved bookings can be started.'],
            ]);
        }

        if ($booking->booking_status !== 'In-Progress') {
            $eval = self::evaluateBookingAutoStart($booking);
            if (! $eval['is_scheduled_date_present']) {
                $schedCarbon = $booking->scheduled_date ? \Carbon\Carbon::parse($booking->scheduled_date) : null;
                $formatted = $schedCarbon ? $schedCarbon->format('M d, Y') : 'its scheduled date';
                throw ValidationException::withMessages([
                    'scheduled_date' => ["This job is scheduled for {$formatted} and will start automatically on that date."],
                ]);
            }
            if (! empty($eval['blocking_booking_id'])) {
                throw ValidationException::withMessages([
                    'booking_status' => ["This job will start automatically once Booking #{$eval['blocking_booking_id']} is completed."],
                ]);
            }
        }

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : [])
            : [];

        $serviceDetails['job_started_by_tech'] = true;
        $serviceDetails['job_started_at'] = $serviceDetails['job_started_at'] ?? now()->toISOString();

        // Keep booking_status as 'Approved' until the Tools Man approves the checklist (which transitions it to 'In-Progress')
        DB::table('bookings')->where('booking_id', $bookingId)->update([
            'service_details' => json_encode($serviceDetails),
            'updated_at' => now(),
        ]);

        $existingReport = DB::table('service_reports')->where('booking_id', $bookingId)->first();
        if ($existingReport) {
            DB::table('service_reports')->where('booking_id', $bookingId)->update([
                'technician_id' => $userId,
                'job_started_at' => $existingReport->job_started_at ?? now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('service_reports')->insert([
                'booking_id' => $bookingId,
                'technician_id' => $userId,
                'job_started_at' => now(),
                'status' => 'In-Progress',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->logActivity(
            $userId,
            'JOB_START',
            sprintf('Job started for Booking #%d. Ready for Tools & Materials Checklist creation.', $bookingId)
        );

        return response()->json([
            'message' => 'Job started! Create your Tools & Materials Checklist for Booking #' . $bookingId . '. Once the Tools Man approves your checklist, the booking status will automatically update from Approved to In-Progress.',
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
            || (empty($booking->lead_technician_id) && empty($booking->assistant_technician_id) && empty($booking->assigned_tech_id) && $booking->assigned_team_id && in_array((int) $booking->assigned_team_id, $myTeamIds, true));

        if (in_array((int) $request->user()->role_id, [5, 7], true) && ! $isAssigned && ! $request->user()->isHeadTechnician()) {
            abort(403, 'You are not assigned to this booking or team.');
        }

        if ($booking->booking_status !== 'In-Progress') {
            throw ValidationException::withMessages([
                'booking_status' => ['This job cannot be completed yet. Please submit your Tools & Materials Checklist and wait for the Tools Man to approve it so the booking status becomes In-Progress.'],
            ]);
        }

        $latestChecklist = DB::table('tool_checklists')
            ->where('booking_id', $bookingId)
            ->orderByDesc('checklist_id')
            ->first();

        if (! $latestChecklist || $latestChecklist->status !== 'Completed') {
            throw ValidationException::withMessages([
                'checklist' => ['Payment turnover can only be submitted once the Tools Man has declared the checklist Completed.'],
            ]);
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
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'in:Cash,GCash,Bank Transfer'],
            'reference_number' => ['nullable', 'string', 'max:40'],
            'proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if (in_array($validated['payment_method'], ['GCash', 'Bank Transfer'], true) && empty(trim((string) ($validated['reference_number'] ?? '')))) {
            throw ValidationException::withMessages([
                'reference_number' => ['Please enter the customer\'s payment reference number.'],
            ]);
        }

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : [])
            : [];

        $existingTurnover = $serviceDetails['payment_turnover'] ?? [];
        $proofImagePath = $existingTurnover['proof_image_path'] ?? null;
        $proofImageUrl = $existingTurnover['proof_image_url'] ?? null;

        if ($request->hasFile('proof_image')) {
            $file = $request->file('proof_image');
            $uploadDir = public_path('uploads/turnover-proofs');
            if (! \Illuminate\Support\Facades\File::exists($uploadDir)) {
                \Illuminate\Support\Facades\File::makeDirectory($uploadDir, 0755, true);
            }
            $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $filename = 'turnover_booking_' . $bookingId . '_' . time() . '.' . $ext;
            $file->move($uploadDir, $filename);
            $proofImagePath = 'uploads/turnover-proofs/' . $filename;
            $proofImageUrl = '/' . $proofImagePath;
        }

        if (empty($proofImageUrl)) {
            throw ValidationException::withMessages([
                'proof_image' => ['Please upload a picture for proof of service and payment.'],
            ]);
        }

        $linkedUnitOrder = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('ac_unit_orders')) {
            $linkedUnitOrder = DB::table('ac_unit_orders')
                ->where('installation_booking_id', $bookingId)
                ->first();
            if (! $linkedUnitOrder && ! empty($serviceDetails['ac_unit_order_id'])) {
                $linkedUnitOrder = DB::table('ac_unit_orders')
                    ->where('order_id', (int) $serviceDetails['ac_unit_order_id'])
                    ->first();
            }
        }

        $installationFee = (float) $validated['total_service_price'];
        $downPayment = 300.00;
        $remainingInstallationFee = max(0.0, $installationFee - $downPayment);
        $unitRemainingBalance = $linkedUnitOrder ? (float) $linkedUnitOrder->remaining_unit_balance : 0.0;
        $deliveryFee = $linkedUnitOrder
            ? (isset($validated['delivery_fee']) && $validated['delivery_fee'] !== null && $validated['delivery_fee'] !== ''
                ? (float) $validated['delivery_fee']
                : (float) $linkedUnitOrder->delivery_fee)
            : 0.0;

        $totalServicePrice = round($installationFee + $deliveryFee + $unitRemainingBalance, 2);
        $netCollected = round($remainingInstallationFee + $deliveryFee + $unitRemainingBalance, 2);

        $serviceDetails['payment_turnover'] = [
            'total_service_price' => $totalServicePrice,
            'installation_fee' => $installationFee,
            'remaining_installation_fee' => $remainingInstallationFee,
            'unit_remaining_balance' => $unitRemainingBalance,
            'delivery_fee' => $deliveryFee,
            'ac_unit_order_id' => $linkedUnitOrder ? (int) $linkedUnitOrder->order_id : null,
            'reservation_down_payment' => $downPayment,
            'net_collected' => $netCollected,
            'payment_method' => $validated['payment_method'],
            'reference_number' => in_array($validated['payment_method'], ['GCash', 'Bank Transfer'], true) ? ($validated['reference_number'] ?? null) : null,
            'diagnosis' => $validated['diagnosis'],
            'work_done' => $validated['work_done'],
            'ac_brand' => $validated['ac_brand'] ?? null,
            'ac_type' => $validated['ac_type'] ?? null,
            'parts_replaced' => $validated['parts_replaced'] ?? null,
            'proof_image_path' => $proofImagePath,
            'proof_image_url' => $proofImageUrl,
            'collected_by_tech_id' => $userId,
            'turned_over_at' => now()->toISOString(),
            'status' => 'Turned Over to Manager — Awaiting Verification',
            'is_invalid' => false,
            'invalid_reason' => null,
        ];

        DB::transaction(function () use ($bookingId, $booking, $userId, $validated, $serviceDetails, $totalServicePrice, $netCollected, $linkedUnitOrder, $installationFee, $deliveryFee) {
            if ($linkedUnitOrder) {
                DB::table('ac_unit_orders')
                    ->where('order_id', (int) $linkedUnitOrder->order_id)
                    ->update([
                        'installation_fee' => $installationFee,
                        'delivery_fee'     => $deliveryFee,
                        'order_status'     => 'Awaiting Manager Confirmation',
                        'updated_at'       => now(),
                    ]);
            }
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

            $existingBalancePay = DB::table('payment')
                ->where('booking_id', $bookingId)
                ->whereIn('payment_type', ['Service Balance Payment', 'Service Balance Turnover Payment'])
                ->orderByDesc('payment_id')
                ->first();

            if ($existingBalancePay) {
                DB::table('payment')
                    ->where('payment_id', $existingBalancePay->payment_id)
                    ->update([
                        'booking_price' => $totalServicePrice,
                        'amount_paid' => $netCollected,
                        'payment_status' => 'Pending',
                        'payment_method' => $validated['payment_method'],
                        'reference_number' => $validated['payment_method'] === 'GCash' ? ($validated['reference_number'] ?? null) : null,
                        'notes' => 'Updated by technician after service and turned over to Manager.',
                        'payment_date' => now(),
                        'updated_at' => now(),
                    ]);
            } elseif ($netCollected > 0) {
                DB::table('payment')->insert([
                    'booking_id' => $bookingId,
                    'booking_price' => $totalServicePrice,
                    'unit_price' => 0.00,
                    'spare_parts_price' => 0.00,
                    'amount_paid' => $netCollected,
                    'payment_status' => 'Pending',
                    'payment_method' => $validated['payment_method'],
                    'payment_type' => 'Service Balance Payment',
                    'reference_number' => $validated['payment_method'] === 'GCash' ? ($validated['reference_number'] ?? null) : null,
                    'notes' => 'Collected by technician after service (₱300 reservation deducted) and turned over to Manager.',
                    'payment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $existingReport = DB::table('service_reports')->where('booking_id', $bookingId)->first();
            $reportPayload = [
                'technician_id' => $userId,
                'service_name' => $booking->service_name,
                'diagnosis' => $validated['diagnosis'],
                'work_done' => $validated['work_done'],
                'parts_replaced' => $validated['parts_replaced'] ?? null,
                'recommendations' => null,
                'ac_brand' => $validated['ac_brand'] ?? null,
                'ac_type' => $validated['ac_type'] ?? null,
                'unit_serial_number' => $validated['unit_serial_number'] ?? null,
                'job_completed_at' => now(),
                'status' => 'In-Progress',
                'updated_at' => now(),
            ];

            if ($existingReport) {
                DB::table('service_reports')->where('booking_id', $bookingId)->update($reportPayload);
            } else {
                $reportPayload['booking_id'] = $bookingId;
                $reportPayload['job_started_at'] = now();
                $reportPayload['created_at'] = now();
                DB::table('service_reports')->insert($reportPayload);
            }

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
