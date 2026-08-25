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

        // Query bookings assigned to this technician (or all if super-admin/manager)
        $query = $this->bookingsBaseQuery()
            ->leftJoin('service_reports', 'service_reports.booking_id', '=', 'bookings.booking_id')
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

        if ((int) $request->user()->role_id === 5) {
            $query->where('bookings.assigned_tech_id', $userId);
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

        $mapped = $rows->map(function ($row) use ($materialsByBooking) {
            $booking = [
                'booking_id' => (int) $row->booking_id,
                'client_id' => (int) $row->client_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'client_address' => $row->client_address,
                'client_contact_number' => $row->client_contact_number,
                'client_email' => $row->client_email,
                'service_id' => (int) $row->service_id,
                'service' => $row->service_name,
                'service_base_price' => (float) $row->base_price,
                'assigned_tech_id' => $row->assigned_tech_id ? (int) $row->assigned_tech_id : null,
                'assigned_tech_name' => $row->tech_user_id ? $this->formatName($row->tech_given_name, $row->tech_middle_name, $row->tech_last_name) : null,
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'created_at' => $row->created_at,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_method' => $row->payment_method,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : null,
                'payment_date' => $row->payment_date,
                'rating' => $row->rating ? (int) $row->rating : null,
                'feedback' => $row->feedback_notes,
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

            return $booking;
        });

        return response()->json([
            'data' => $mapped->values(),
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

        if ((int) $request->user()->role_id === 5 && (int) $booking->assigned_tech_id !== $userId) {
            abort(403, 'You are not assigned to this booking.');
        }

        if (! in_array($booking->booking_status, ['Approved', 'Dispatched', 'In-Progress'], true)) {
            throw ValidationException::withMessages([
                'booking_status' => ['Only approved or dispatched bookings can be started.'],
            ]);
        }

        DB::table('bookings')->where('booking_id', $bookingId)->update([
            'booking_status' => 'In-Progress',
        ]);

        DB::table('service_reports')->updateOrInsert(
            ['booking_id' => $bookingId],
            [
                'technician_id' => $userId,
                'job_started_at' => now(),
                'status' => 'In-Progress',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $this->logActivity(
            $userId,
            'JOB_START',
            sprintf('Technician started job for Booking #%d.', $bookingId)
        );

        return response()->json([
            'message' => 'Job marked as In-Progress.',
            'booking_status' => 'In-Progress',
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

        if ((int) $request->user()->role_id === 5 && (int) $booking->assigned_tech_id !== $userId) {
            abort(403, 'You are not assigned to this booking.');
        }

        $validated = $request->validate([
            'diagnosis' => ['required', 'string', 'max:1000'],
            'work_done' => ['required', 'string', 'max:1000'],
            'parts_replaced' => ['nullable', 'string', 'max:500'],
            'recommendations' => ['nullable', 'string', 'max:1000'],
            'ac_brand' => ['nullable', 'string', 'max:100'],
            'ac_type' => ['nullable', 'string', 'max:100'],
            'unit_serial_number' => ['nullable', 'string', 'max:100'],
        ]);

        DB::table('bookings')->where('booking_id', $bookingId)->update([
            'booking_status' => 'Completed',
        ]);

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
                'status' => 'Completed',
                'updated_at' => now(),
            ]
        );

        $this->logActivity(
            $userId,
            'JOB_COMPLETE',
            sprintf('Technician completed service report for Booking #%d.', $bookingId)
        );

        return response()->json([
            'message' => 'Job marked as Completed and service report submitted.',
            'booking_status' => 'Completed',
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
