<?php

namespace App\Http\Controllers\Technician;

use App\Services\OcularInspectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
                    ->orWhere('bookings.service_details', 'like', '%"user_id":' . $userId . '%')
                    ->orWhere('bookings.service_details', 'like', '%"user_id": ' . $userId . '%');
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
            } elseif ($status === 'Cancelled' || $status === 'Failed') {
                $query->where('bookings.booking_status', 'Cancelled');
            } elseif ($status !== 'All') {
                $query->where('bookings.booking_status', $status);
            } else {
                $query->where(function ($q) {
                    $q->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Partially Completed', 'Completed'])
                        ->orWhere(function ($sub) {
                            $sub->where('bookings.booking_status', 'Cancelled')
                                ->where('bookings.service_details', 'like', '%failed_booking%');
                        });
                });
            }
        } else {
            $query->where(function ($q) {
                $q->whereIn('bookings.booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Partially Completed', 'Completed'])
                    ->orWhere(function ($sub) {
                        $sub->where('bookings.booking_status', 'Cancelled')
                            ->where('bookings.service_details', 'like', '%failed_booking%');
                    });
            });
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
                    'tool_checklist_items.quantity_returned',
                    'tool_checklist_items.status',
                    'tool_checklist_items.notes',
                    'inventory_items.item_name',
                    'inventory_items.tool_subtype',
                    'inventory_items.sub_category',
                    'inventory_items.serial_number',
                    'inventory_items.unit',
                    'inventory_items.status as inventory_status',
                ])
                ->get()
                ->map(function ($it) {
                    $isTool = strtolower($it->item_type ?? '') === 'tool';
                    $rawSubtype = strtolower((string) ($it->tool_subtype ?? ''));
                    $normalizedSubtype = $isTool ? (str_contains($rawSubtype, 'power') ? 'power' : 'hand') : null;
                    $categoryGroup = ! $isTool ? 'material' : ($normalizedSubtype === 'power' ? 'power_tool' : 'hand_tool');

                    $invStatus = strtolower((string) ($it->inventory_status ?? ''));
                    $itemStatus = $it->status;
                    if ($isTool && in_array($invStatus, ['damaged', 'lost', 'lost/damaged'], true) && strtolower((string) $itemStatus) !== 'returned') {
                        $itemStatus = $invStatus === 'lost/damaged' ? 'damaged' : $invStatus;
                    }

                    $approvedQty = (int) ($it->quantity_approved ?: $it->quantity_requested ?: 1);
                    $returnedQty = $isTool ? 0 : min($approvedQty, max(0, (int) ($it->quantity_returned ?? 0)));

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
                        'quantity_returned' => $returnedQty,
                        'quantity_used' => $isTool ? $approvedQty : max(0, $approvedQty - $returnedQty),
                        'status' => $itemStatus,
                        'inventory_status' => $it->inventory_status,
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

        $linkedItemOrdersByBooking = collect();
        $linkedItemOrdersById = collect();
        if (! empty($bookingIds) && \Illuminate\Support\Facades\Schema::hasTable('item_orders')) {
            $allItemOrders = DB::table('item_orders')
                ->leftJoin('inventory_items', 'inventory_items.item_id', '=', 'item_orders.item_id')
                ->whereNotIn('item_orders.order_status', ['Cancelled'])
                ->select([
                    'item_orders.*',
                    'inventory_items.item_name',
                    'inventory_items.serial_number',
                    'inventory_items.unit',
                    'inventory_items.sub_category',
                ])
                ->get()
                ->map(fn ($o) => [
                    'order_id' => (int) $o->order_id,
                    'linked_booking_id' => $o->linked_booking_id ? (int) $o->linked_booking_id : null,
                    'item_id' => (int) $o->item_id,
                    'item_name' => $o->item_name ?? 'Spare Part',
                    'serial_number' => $o->serial_number,
                    'unit' => $o->unit ?? 'pc',
                    'sub_category' => $o->sub_category,
                    'quantity' => (int) $o->quantity,
                    'unit_price' => (float) $o->unit_price,
                    'total_amount' => (float) $o->total_amount,
                    'down_payment_amount' => (float) $o->down_payment_amount,
                    'amount_paid' => (float) $o->amount_paid,
                    'remaining_balance' => (float) $o->remaining_balance,
                    'payment_method' => $o->payment_method,
                    'fulfillment_type' => $o->fulfillment_type,
                    'order_status' => $o->order_status,
                    'receipt_reference_number' => $o->receipt_reference_number,
                ]);
            $linkedItemOrdersByBooking = $allItemOrders->whereNotNull('linked_booking_id')->keyBy('linked_booking_id');
            $linkedItemOrdersById = $allItemOrders->keyBy('order_id');
        }

        $ocularRoomsByBooking = collect();
        if (! empty($bookingIds) && Schema::hasTable('ocular_inspection_rooms')) {
            $ocularRoomsByBooking = DB::table('ocular_inspection_rooms')
                ->whereIn('booking_id', $bookingIds)
                ->orderBy('room_id')
                ->get()
                ->map(fn ($r) => OcularInspectionService::formatRoom($r))
                ->groupBy('booking_id');
        }

        $ocularRecsByBooking = collect();
        if (! empty($bookingIds) && Schema::hasTable('ocular_inspection_recommendations')) {
            $ocularRecsByBooking = DB::table('ocular_inspection_recommendations')
                ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ocular_inspection_recommendations.ac_unit_id')
                ->whereIn('ocular_inspection_recommendations.booking_id', $bookingIds)
                ->orderBy('ocular_inspection_recommendations.recommendation_id')
                ->select([
                    'ocular_inspection_recommendations.*',
                    'ac_units_inventory.serial_number as inv_serial_number',
                    'ac_units_inventory.image_path as inv_image_path',
                    'ac_units_inventory.status as inv_current_status',
                ])
                ->get()
                ->map(fn ($rec) => OcularInspectionService::formatRecommendation($rec))
                ->groupBy('booking_id');
        }

        $mapped = $rows->map(function ($row) use ($materialsByBooking, $checklistsByBooking, $linkedOrdersByBooking, $linkedItemOrdersByBooking, $linkedItemOrdersById, $ocularRoomsByBooking, $ocularRecsByBooking) {
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

            $linkedItemOrderData = $linkedItemOrdersByBooking->get((int) $row->booking_id)
                ?? (! empty($serviceDetails['item_order_id']) ? $linkedItemOrdersById->get((int) $serviceDetails['item_order_id']) : null);
            $inspectionStatus = $serviceDetails['inspection_status'] ?? ($isOcularInspection ? 'Pending Inspection' : null);
            $hasApprovedChecklist = $bookingChecklists->contains(
                fn ($c) => in_array((string) ($c['status'] ?? ''), ['Approved', 'Completed'], true)
            );

            return [
                'booking_id' => (int) $row->booking_id,
                'is_ocular_inspection' => $isOcularInspection,
                'ocular_personnel' => \App\Http\Controllers\SuperAdmin\SuperAdminBaseController::normalizeOcularPersonnel($serviceDetails['ocular_personnel'] ?? []),
                'inspection_status' => $inspectionStatus,
                'ocular_rooms' => collect($ocularRoomsByBooking->get((int) $row->booking_id, []))->values()->all(),
                'ocular_recommendations' => collect($ocularRecsByBooking->get((int) $row->booking_id, []))->values()->all(),
                'technician_ocular_result' => OcularInspectionService::formatTechnicianOcularResult($serviceDetails['technician_ocular_result'] ?? null),
                'can_submit_ocular_result' => $isOcularInspection
                    && ! in_array($row->booking_status, ['Pending', 'Cancelled'], true)
                    && $inspectionStatus !== 'Submitted'
                    && $hasApprovedChecklist,
                'ac_unit_order' => $linkedOrdersByBooking->get((int) $row->booking_id) ?? null,
                'item_order' => $linkedItemOrderData,
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
                'quotation_status' => $row->quotation_status ?? ($isOcularInspection ? 'Not Applicable' : 'Pending Assessment'),
                'cancellation_reason' => $row->cancellation_reason ?? null,
                'failed_booking' => $serviceDetails['failed_booking'] ?? null,
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
            'total_service_price' => ['required', 'numeric', 'min:0'],
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

        $linkedItemOrder = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('item_orders')) {
            $linkedItemOrder = DB::table('item_orders')
                ->leftJoin('inventory_items', 'inventory_items.item_id', '=', 'item_orders.item_id')
                ->where('item_orders.linked_booking_id', $bookingId)
                ->whereNotIn('item_orders.order_status', ['Cancelled'])
                ->select(['item_orders.*', 'inventory_items.item_name', 'inventory_items.unit'])
                ->first();
            if (! $linkedItemOrder && ! empty($serviceDetails['item_order_id'])) {
                $linkedItemOrder = DB::table('item_orders')
                    ->leftJoin('inventory_items', 'inventory_items.item_id', '=', 'item_orders.item_id')
                    ->where('item_orders.order_id', (int) $serviceDetails['item_order_id'])
                    ->whereNotIn('item_orders.order_status', ['Cancelled'])
                    ->select(['item_orders.*', 'inventory_items.item_name', 'inventory_items.unit'])
                    ->first();
            }
        }

        $isBookingFeeWaived = ! empty($serviceDetails['booking_fee_waived']) || ($linkedItemOrder !== null);
        $installationFee = (float) $validated['total_service_price'];
        $downPayment = $isBookingFeeWaived ? 0.00 : (float) ($booking->booking_fee ?? 50.00);

        if (! $isBookingFeeWaived && $installationFee < $downPayment) {
            throw ValidationException::withMessages([
                'total_service_price' => [sprintf('Total service fee must be at least ₱%.2f.', $downPayment)],
            ]);
        }

        $remainingInstallationFee = max(0.0, $installationFee - $downPayment);
        $unitRemainingBalance = $linkedUnitOrder ? (float) $linkedUnitOrder->remaining_unit_balance : 0.0;
        $sparePartRemainingBalance = $linkedItemOrder ? max(0.0, (float) $linkedItemOrder->remaining_balance) : 0.0;
        $deliveryFee = $linkedUnitOrder
            ? (isset($validated['delivery_fee']) && $validated['delivery_fee'] !== null && $validated['delivery_fee'] !== ''
                ? (float) $validated['delivery_fee']
                : (float) $linkedUnitOrder->delivery_fee)
            : 0.0;

        $totalServicePrice = round($installationFee + $deliveryFee + $unitRemainingBalance + $sparePartRemainingBalance, 2);
        $netCollected = round($remainingInstallationFee + $deliveryFee + $unitRemainingBalance + $sparePartRemainingBalance, 2);

        $partsReplacedValue = $validated['parts_replaced'] ?? null;
        if (empty(trim((string) $partsReplacedValue)) && $linkedItemOrder) {
            $partsReplacedValue = sprintf('%dx %s', (int) $linkedItemOrder->quantity, $linkedItemOrder->item_name ?? 'Spare Part');
        }

        $serviceDetails['payment_turnover'] = [
            'total_service_price' => $totalServicePrice,
            'installation_fee' => $installationFee,
            'remaining_installation_fee' => $remainingInstallationFee,
            'unit_remaining_balance' => $unitRemainingBalance,
            'delivery_fee' => $deliveryFee,
            'ac_unit_order_id' => $linkedUnitOrder ? (int) $linkedUnitOrder->order_id : null,
            'item_order_id' => $linkedItemOrder ? (int) $linkedItemOrder->order_id : null,
            'spare_part_name' => $linkedItemOrder ? ($linkedItemOrder->item_name ?? ($serviceDetails['spare_part_name'] ?? 'Spare Part')) : null,
            'spare_part_quantity' => $linkedItemOrder ? (int) $linkedItemOrder->quantity : null,
            'spare_part_unit' => $linkedItemOrder ? ($linkedItemOrder->unit ?? 'pc') : null,
            'spare_part_total_amount' => $linkedItemOrder ? (float) $linkedItemOrder->total_amount : 0.0,
            'spare_part_paid_amount' => $linkedItemOrder ? (float) $linkedItemOrder->amount_paid : 0.0,
            'spare_part_remaining_balance' => $sparePartRemainingBalance,
            'reservation_down_payment' => $downPayment,
            'net_collected' => $netCollected,
            'payment_method' => $validated['payment_method'],
            'reference_number' => in_array($validated['payment_method'], ['GCash', 'Bank Transfer'], true) ? ($validated['reference_number'] ?? null) : null,
            'diagnosis' => $validated['diagnosis'],
            'work_done' => $validated['work_done'],
            'ac_brand' => $validated['ac_brand'] ?? null,
            'ac_type' => $validated['ac_type'] ?? null,
            'parts_replaced' => $partsReplacedValue,
            'proof_image_path' => $proofImagePath,
            'proof_image_url' => $proofImageUrl,
            'collected_by_tech_id' => $userId,
            'turned_over_at' => now()->toISOString(),
            'status' => 'Turned Over to Manager — Awaiting Verification',
            'is_invalid' => false,
            'invalid_reason' => null,
        ];

        $isOcularBooking = ((int) $booking->service_id === 4)
            || str_contains(strtolower((string) ($booking->service_name ?? '')), 'ocular')
            || ! empty($serviceDetails['is_ocular_inspection']);

        $clientUser = DB::table('users')
            ->where('user_id', $booking->client_id)
            ->first(['given_name', 'middle_name', 'last_name']);
        $clientFullName = $clientUser
            ? $this->formatName($clientUser->given_name, $clientUser->middle_name, $clientUser->last_name)
            : 'Customer';
        $signedQuotationStatus = ! $isOcularBooking ? 'Signed by ' . $clientFullName : null;

        if (! empty($serviceDetails['failed_booking']) && ($serviceDetails['failed_booking']['status'] ?? '') !== 'Valid') {
            $serviceDetails['failed_booking']['resolved_by_turnover'] = true;
        }

        DB::transaction(function () use ($bookingId, $booking, $userId, $validated, $serviceDetails, $totalServicePrice, $netCollected, $linkedUnitOrder, $linkedItemOrder, $sparePartRemainingBalance, $installationFee, $deliveryFee, $downPayment, $partsReplacedValue, $signedQuotationStatus) {
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
            $bookingUpdate = [
                'service_payment_method' => $validated['payment_method'],
                'service_details' => json_encode($serviceDetails),
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . sprintf(
                    '[Technician Payment Turnover]: Total Service ₱%.2f less ₱%.2f down payment%s = ₱%.2f collected via %s%s. Handed over to Manager for completion.',
                    $totalServicePrice,
                    $downPayment,
                    $sparePartRemainingBalance > 0 ? sprintf(' (incl. Spare Part Remaining Balance ₱%.2f)', $sparePartRemainingBalance) : '',
                    $netCollected,
                    $validated['payment_method'],
                    ! empty($validated['reference_number']) ? " (Ref: {$validated['reference_number']})" : ''
                )),
                'updated_at' => now(),
            ];
            if ($signedQuotationStatus !== null) {
                $bookingUpdate['quotation_status'] = $signedQuotationStatus;
            }
            DB::table('bookings')->where('booking_id', $bookingId)->update($bookingUpdate);

            $existingBalancePay = DB::table('payment')
                ->where('booking_id', $bookingId)
                ->whereIn('payment_type', ['Service Balance Payment', 'Service Balance Turnover Payment'])
                ->orderByDesc('payment_id')
                ->first();

            $bookingPriceForPayment = $linkedItemOrder ? round($installationFee + $deliveryFee, 2) : $totalServicePrice;

            if ($existingBalancePay) {
                DB::table('payment')
                    ->where('payment_id', $existingBalancePay->payment_id)
                    ->update([
                        'booking_price' => $bookingPriceForPayment,
                        'spare_parts_price' => $sparePartRemainingBalance,
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
                    'booking_price' => $bookingPriceForPayment,
                    'unit_price' => 0.00,
                    'spare_parts_price' => $sparePartRemainingBalance,
                    'amount_paid' => $netCollected,
                    'payment_status' => 'Pending',
                    'payment_method' => $validated['payment_method'],
                    'payment_type' => 'Service Balance Payment',
                    'reference_number' => $validated['payment_method'] === 'GCash' ? ($validated['reference_number'] ?? null) : null,
                    'notes' => sprintf('Collected by technician after service (₱%.2f reservation deducted) and turned over to Manager.', $downPayment),
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
                'parts_replaced' => $partsReplacedValue,
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
                    'Technician submitted service report and turned over ₱%.2f (%s, after ₱%.2f down payment deduction) to Manager for Booking #%d.',
                    $netCollected,
                    $validated['payment_method'],
                    $downPayment,
                    $bookingId
                )
            );
        });

        return response()->json([
            'message' => 'Service report submitted and customer payment turned over to Manager! Once the Manager verifies the payment turnover, the booking will be declared Completed.',
            'booking_status' => $booking->booking_status,
            'quotation_status' => $signedQuotationStatus ?? ($booking->quotation_status ?? null),
            'payment_turnover' => $serviceDetails['payment_turnover'],
        ]);
    }

    /**
     * Technician reports a Failed Booking when the customer refuses/fails to sign the quotation in person.
     * Requires tools & materials to be returned and the checklist to be marked Completed first.
     */
    public function reportFailedBooking(Request $request, int $bookingId): JsonResponse
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

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : [])
            : [];

        $isAssigned = ((int) $booking->assigned_tech_id === $userId)
            || ((int) $booking->lead_technician_id === $userId)
            || ((int) $booking->assistant_technician_id === $userId)
            || (empty($booking->lead_technician_id) && empty($booking->assistant_technician_id) && empty($booking->assigned_tech_id) && $booking->assigned_team_id && in_array((int) $booking->assigned_team_id, $myTeamIds, true));

        if (in_array((int) $request->user()->role_id, [5, 7], true) && ! $isAssigned && ! $request->user()->isHeadTechnician()) {
            abort(403, 'You are not assigned to this booking or team.');
        }

        $isOcularBooking = ((int) $booking->service_id === 4)
            || str_contains(strtolower((string) ($booking->service_name ?? '')), 'ocular')
            || ! empty($serviceDetails['is_ocular_inspection']);

        if ($isOcularBooking) {
            throw ValidationException::withMessages([
                'booking' => ['Failed booking quotation reports apply only to Installation, Repair, and Cleaning bookings.'],
            ]);
        }

        if ($booking->booking_status !== 'In-Progress') {
            throw ValidationException::withMessages([
                'booking_status' => ['Failed booking can only be reported while the booking is In-Progress.'],
            ]);
        }

        $latestChecklist = DB::table('tool_checklists')
            ->where('booking_id', $bookingId)
            ->orderByDesc('checklist_id')
            ->first();

        if (! $latestChecklist || $latestChecklist->status !== 'Completed') {
            throw ValidationException::withMessages([
                'checklist' => ['Please return all tools and unused materials and have the Tools Man complete the checklist before reporting a failed booking.'],
            ]);
        }

        if (! empty($serviceDetails['payment_turnover']) && empty($serviceDetails['payment_turnover']['is_invalid'])) {
            throw ValidationException::withMessages([
                'payment_turnover' => ['Payment turnover has already been submitted for this booking.'],
            ]);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ], [
            'reason.required' => 'Please enter the reason for the failed booking.',
            'reason.min' => 'Please provide a more detailed reason (at least 5 characters).',
        ]);

        $reason = trim($validated['reason']);
        $techName = $request->user()->name ?: $this->formatName(
            $request->user()->given_name,
            $request->user()->middle_name ?? null,
            $request->user()->last_name
        );

        $serviceDetails['failed_booking'] = [
            'status' => 'Pending Manager Review',
            'reason' => $reason,
            'submitted_by_user_id' => $userId,
            'submitted_by_name' => $techName,
            'submitted_at' => now()->toISOString(),
            'decision' => null,
            'reviewed_by_user_id' => null,
            'reviewed_by_name' => null,
            'reviewed_at' => null,
            'review_notes' => null,
            'invalid_reason' => null,
        ];

        DB::transaction(function () use ($bookingId, $booking, $userId, $techName, $reason, $serviceDetails) {
            DB::table('bookings')->where('booking_id', $bookingId)->update([
                'service_details' => json_encode($serviceDetails),
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . sprintf(
                    '[Technician Failed Booking Report by %s]: %s',
                    $techName,
                    $reason
                )),
                'updated_at' => now(),
            ]);

            $this->logActivity(
                $userId,
                'FAILED_BOOKING_REPORTED',
                sprintf('Reported Failed Booking #%d (%s) for Manager review. Reason: %s', $bookingId, $booking->service_name ?? 'Service', $reason)
            );
        });

        return response()->json([
            'message' => 'Failed booking report submitted to Manager for review.',
            'booking_status' => $booking->booking_status,
            'failed_booking' => $serviceDetails['failed_booking'],
        ]);
    }

    /**
     * Technician submits or updates an Ocular Inspection Result (before or after the inspection task)
     * so Admin Assistant receives the room capacity measurements cleanly and can select matching AC units.
     */
    public function submitOcularResult(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);

        $userId = (int) $request->user()->user_id;

        $booking = DB::table('bookings')
            ->leftJoin('services', 'services.service_id', '=', 'bookings.service_id')
            ->where('bookings.booking_id', $bookingId)
            ->select(['bookings.*', 'services.service_name'])
            ->first();

        if (! $booking) {
            abort(404, 'Booking not found.');
        }

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : (array) $booking->service_details)
            : [];

        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $inOcularPersonnel = collect($serviceDetails['ocular_personnel'] ?? [])
            ->contains(fn ($p) => (int) ($p['user_id'] ?? 0) === $userId);

        $isAssigned = ((int) $booking->assigned_tech_id === $userId)
            || ((int) $booking->lead_technician_id === $userId)
            || ((int) $booking->assistant_technician_id === $userId)
            || $inOcularPersonnel
            || (empty($booking->lead_technician_id) && empty($booking->assistant_technician_id) && empty($booking->assigned_tech_id) && $booking->assigned_team_id && in_array((int) $booking->assigned_team_id, $myTeamIds, true));

        if (in_array((int) $request->user()->role_id, [5, 7], true) && ! $isAssigned && ! $request->user()->isHeadTechnician()) {
            abort(403, 'You are not assigned to this booking.');
        }

        $isOcularBooking = ((int) $booking->service_id === 4)
            || str_contains(strtolower((string) ($booking->service_name ?? '')), 'ocular')
            || ! empty($serviceDetails['is_ocular_inspection']);

        if (! $isOcularBooking) {
            throw ValidationException::withMessages([
                'booking' => ['Ocular inspection results can only be submitted for Ocular Inspection bookings.'],
            ]);
        }

        if (strtolower((string) ($booking->booking_status ?? '')) === 'pending') {
            throw ValidationException::withMessages([
                'booking_status' => ['Ocular inspection results cannot be submitted while booking is pending approval.'],
            ]);
        }

        if ($booking->booking_status === 'Cancelled') {
            throw ValidationException::withMessages([
                'booking_status' => ['Cannot submit results for a cancelled booking.'],
            ]);
        }

        if (($serviceDetails['inspection_status'] ?? '') === 'Submitted') {
            throw ValidationException::withMessages([
                'inspection_status' => ['This ocular inspection has already been submitted to the customer by the Admin Assistant.'],
            ]);
        }

        $hasApprovedChecklist = DB::table('tool_checklists')
            ->where('booking_id', $bookingId)
            ->whereIn('status', ['Approved', 'Completed'])
            ->exists();

        if (! $hasApprovedChecklist) {
            throw ValidationException::withMessages([
                'checklist' => ['Your tools and materials checklist must be approved before submitting the ocular inspection result.'],
            ]);
        }

        $rawRooms = $request->input('rooms');
        if (is_string($rawRooms)) {
            $decodedRooms = json_decode($rawRooms, true);
            if (is_array($decodedRooms)) {
                $request->merge(['rooms' => $decodedRooms]);
            }
        }

        $roomRules = OcularInspectionService::roomValidationRules('rooms.*.');
        $validated = $request->validate(array_merge([
            'submission_stage' => ['nullable', 'string', 'in:before,after'],
            'rooms'            => ['required', 'array', 'min:1', 'max:20'],
            'rooms.*.room_id'  => ['nullable', 'integer'],
            'technician_notes' => ['nullable', 'string', 'max:1500'],
            'before_notes'     => ['nullable', 'string', 'max:1000'],
            'after_notes'      => ['nullable', 'string', 'max:1000'],
            'before_photo'     => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,pdf,doc,docx', 'max:10240'],
            'after_photo'      => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,pdf,doc,docx', 'max:10240'],
        ], $roomRules), [
            'rooms.required' => 'Please add at least one inspected room with dimensions.',
            'rooms.min'      => 'Please add at least one inspected room with dimensions.',
        ]);

        $latestChecklist = Schema::hasTable('tool_checklists')
            ? DB::table('tool_checklists')
                ->where('booking_id', $bookingId)
                ->orderByDesc('checklist_id')
                ->first()
            : null;

        $stage = $validated['submission_stage']
            ?? (($booking->booking_status === 'In-Progress' || ($latestChecklist && $latestChecklist->status === 'Completed')) ? 'after' : 'before');

        $existingResult = is_array($serviceDetails['technician_ocular_result'] ?? null)
            ? $serviceDetails['technician_ocular_result']
            : [];

        $beforePhotoPath = $existingResult['before_photo_path'] ?? null;
        if ($request->hasFile('before_photo')) {
            $beforePhotoPath = $request->file('before_photo')->store('ocular-inspections', 'public');
        }

        $afterPhotoPath = $existingResult['after_photo_path'] ?? null;
        if ($request->hasFile('after_photo')) {
            $afterPhotoPath = $request->file('after_photo')->store('ocular-inspections', 'public');
        }

        $techName = $request->user()->name ?: $this->formatName(
            $request->user()->given_name ?? '',
            $request->user()->middle_name ?? null,
            $request->user()->last_name ?? ''
        );

        $stagesSubmitted = array_values(array_unique(array_merge(
            is_array($existingResult['stages_submitted'] ?? null) ? $existingResult['stages_submitted'] : [],
            [$stage]
        )));

        $totalRecommendedHp = 0.0;

        DB::transaction(function () use (
            $bookingId,
            $userId,
            $techName,
            $stage,
            $stagesSubmitted,
            $validated,
            $existingResult,
            $beforePhotoPath,
            $afterPhotoPath,
            &$serviceDetails,
            &$totalRecommendedHp
        ) {
            $existingRoomIds = DB::table('ocular_inspection_rooms')
                ->where('booking_id', $bookingId)
                ->pluck('room_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $retainedRoomIds = [];
            foreach ($validated['rooms'] as $idx => $roomInput) {
                $capacity = OcularInspectionService::calculateCoolingCapacity($roomInput);
                $totalRecommendedHp += (float) $capacity['estimated_hp'];
                $roomName = trim((string) ($roomInput['room_name'] ?? '')) ?: ('Room ' . ($idx + 1));

                $payload = [
                    'room_name'                 => $roomName,
                    'unit_of_measurement'       => $roomInput['unit_of_measurement'],
                    'room_length'               => $roomInput['room_length'],
                    'room_width'                => $roomInput['room_width'],
                    'ceiling_height'            => $roomInput['ceiling_height'],
                    'room_category'             => $roomInput['room_category'],
                    'sun_exposure_level'        => $roomInput['sun_exposure_level'],
                    'maximum_occupancy'         => (int) $roomInput['maximum_occupancy'],
                    'window_size_glazing'       => $roomInput['window_size_glazing'],
                    'heat_generating_equipment' => (int) $roomInput['heat_generating_equipment'],
                    'estimated_btu'             => $capacity['estimated_btu'],
                    'estimated_hp'              => $capacity['estimated_hp'],
                    'updated_at'                => now(),
                ];

                $incomingRoomId = ! empty($roomInput['room_id']) ? (int) $roomInput['room_id'] : 0;
                if ($incomingRoomId > 0 && in_array($incomingRoomId, $existingRoomIds, true)) {
                    DB::table('ocular_inspection_rooms')
                        ->where('room_id', $incomingRoomId)
                        ->update($payload);
                    $retainedRoomIds[] = $incomingRoomId;
                } else {
                    $newId = DB::table('ocular_inspection_rooms')->insertGetId(array_merge($payload, [
                        'booking_id' => $bookingId,
                        'created_by' => $userId,
                        'created_at' => now(),
                    ]), 'room_id');
                    $retainedRoomIds[] = (int) $newId;
                }
            }

            $toDeleteIds = array_diff($existingRoomIds, $retainedRoomIds);
            if (! empty($toDeleteIds)) {
                DB::table('ocular_inspection_rooms')
                    ->where('booking_id', $bookingId)
                    ->whereIn('room_id', $toDeleteIds)
                    ->delete();
            }

            $nowIso = now()->toISOString();
            $serviceDetails['is_ocular_inspection'] = true;
            $serviceDetails['inspection_status'] = 'Technician Submitted';
            $serviceDetails['technician_ocular_result'] = [
                'submitted_by_user_id' => $userId,
                'submitted_by_name'    => $techName ?: 'Technician',
                'last_submitted_stage' => $stage,
                'stages_submitted'     => $stagesSubmitted,
                'technician_notes'     => trim((string) ($validated['technician_notes'] ?? ($existingResult['technician_notes'] ?? ''))) ?: null,
                'before_notes'         => array_key_exists('before_notes', $validated)
                    ? (trim((string) $validated['before_notes']) ?: null)
                    : ($existingResult['before_notes'] ?? null),
                'after_notes'          => array_key_exists('after_notes', $validated)
                    ? (trim((string) $validated['after_notes']) ?: null)
                    : ($existingResult['after_notes'] ?? null),
                'before_photo_path'    => $beforePhotoPath,
                'after_photo_path'     => $afterPhotoPath,
                'before_submitted_at'  => $stage === 'before' ? $nowIso : ($existingResult['before_submitted_at'] ?? null),
                'after_submitted_at'   => $stage === 'after' ? $nowIso : ($existingResult['after_submitted_at'] ?? null),
                'submitted_at'         => $existingResult['submitted_at'] ?? $nowIso,
                'updated_at'           => $nowIso,
                'rooms_count'          => count($validated['rooms']),
                'recommended_total_hp' => round($totalRecommendedHp, 2),
            ];

            DB::table('bookings')->where('booking_id', $bookingId)->update([
                'service_details' => json_encode($serviceDetails),
                'updated_at'      => now(),
            ]);

            $this->logActivity(
                $userId,
                'OCULAR_TECH_RESULT_SUBMITTED',
                sprintf(
                    'Submitted Ocular Inspection result (%s task, %d room(s)) to Admin Assistant for Booking #%d.',
                    $stage === 'before' ? 'Before' : 'After',
                    count($validated['rooms']),
                    $bookingId
                )
            );
        });

        $freshRooms = DB::table('ocular_inspection_rooms')
            ->where('booking_id', $bookingId)
            ->orderBy('room_id')
            ->get()
            ->map(fn ($r) => OcularInspectionService::formatRoom($r))
            ->values()
            ->all();

        $formattedResult = OcularInspectionService::formatTechnicianOcularResult($serviceDetails['technician_ocular_result']);

        return response()->json([
            'message'                  => 'Ocular inspection result submitted to Admin Assistant.',
            'inspection_status'        => 'Technician Submitted',
            'ocular_rooms'             => $freshRooms,
            'technician_ocular_result' => $formattedResult,
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
