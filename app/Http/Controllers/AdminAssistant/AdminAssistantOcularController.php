<?php

namespace App\Http\Controllers\AdminAssistant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminAssistantOcularController extends AdminAssistantBaseController
{
    protected const UNITS_OF_MEASUREMENT = ['Meters', 'Feet'];

    protected const SUN_EXPOSURE_LEVELS = ['Heavy/West', 'Moderate', 'Shaded'];

    protected const WINDOW_GLAZING_SIZES = ['Small', 'Medium', 'Large Glass Facade'];

    protected const RECOMMENDED_AC_TYPES = [
        'Wall-Mounted Split',
        'Window',
        'Floor Standing',
        'Cassette',
    ];

    protected const RECOMMENDED_MOTOR_TYPES = [
        'Inverter',
        'Non-Inverter',
        'Both',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $currentUserId = (int) $request->user()->user_id;

        $rows = $this->bookingsBaseQuery()
            ->where(function ($q) {
                $q->where('bookings.service_id', 4)
                    ->orWhere('services.service_name', 'like', '%Ocular%');
            })
            ->orderByDesc('bookings.booking_id')
            ->get();

        $bookingIds = $rows->pluck('booking_id')->map(fn ($id) => (int) $id)->all();

        $roomsByBooking = collect();
        if (! empty($bookingIds) && Schema::hasTable('ocular_inspection_rooms')) {
            $roomsByBooking = DB::table('ocular_inspection_rooms')
                ->whereIn('booking_id', $bookingIds)
                ->orderBy('room_id')
                ->get()
                ->map(fn ($r) => $this->formatRoom($r))
                ->groupBy('booking_id');
        }

        $recsByBooking = collect();
        if (! empty($bookingIds) && Schema::hasTable('ocular_inspection_recommendations')) {
            $recsByBooking = DB::table('ocular_inspection_recommendations')
                ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ocular_inspection_recommendations.ac_unit_id')
                ->whereIn('ocular_inspection_recommendations.booking_id', $bookingIds)
                ->orderBy('ocular_inspection_recommendations.recommendation_id')
                ->select([
                    'ocular_inspection_recommendations.*',
                    'ac_units_inventory.serial_number as inv_serial_number',
                    'ac_units_inventory.image_path as inv_image_path',
                    'ac_units_inventory.status as inv_current_status',
                    'ac_units_inventory.horsepower as inv_horsepower',
                    'ac_units_inventory.ac_type as inv_ac_type',
                    'ac_units_inventory.motor_type as inv_motor_type',
                ])
                ->get()
                ->map(fn ($rec) => $this->formatRecommendation($rec))
                ->groupBy('booking_id');
        }

        $ordersByOcular = collect();
        if (! empty($bookingIds) && Schema::hasTable('ac_unit_orders')) {
            $ordersByOcular = DB::table('ac_unit_orders')
                ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ac_unit_orders.ac_unit_id')
                ->whereIn('ac_unit_orders.ocular_booking_id', $bookingIds)
                ->orderByDesc('ac_unit_orders.order_id')
                ->select([
                    'ac_unit_orders.*',
                    'ac_units_inventory.brand',
                    'ac_units_inventory.model',
                    'ac_units_inventory.serial_number',
                    'ac_units_inventory.horsepower',
                    'ac_units_inventory.ac_type',
                    'ac_units_inventory.motor_type',
                    'ac_units_inventory.status as unit_inventory_status',
                    'ac_units_inventory.image_path as unit_image_path',
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
                    'unit_inventory_status'   => $o->unit_inventory_status,
                    'unit_image_url'          => ! empty($o->unit_image_path) ? asset('storage/' . ltrim((string) $o->unit_image_path, '/')) : null,
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
                    'manager_receipt_url'     => ! empty($o->manager_receipt_path) ? asset('storage/' . ltrim((string) $o->manager_receipt_path, '/')) : null,
                    'confirmed_at'            => $o->confirmed_at,
                    'created_at'              => $o->created_at,
                ])
                ->groupBy('ocular_booking_id');
        }

        // Latest Tool Checklists for these Ocular Inspection bookings
        $checklistsByBooking = collect();
        if (! empty($bookingIds) && Schema::hasTable('tool_checklists')) {
            $checklistRows = DB::table('tool_checklists')
                ->leftJoin('users as creator', 'creator.user_id', '=', 'tool_checklists.technician_id')
                ->whereIn('tool_checklists.booking_id', $bookingIds)
                ->orderByDesc('tool_checklists.checklist_id')
                ->get([
                    'tool_checklists.*',
                    'creator.given_name as creator_given_name',
                    'creator.last_name as creator_last_name',
                ]);

            $clIds = $checklistRows->pluck('checklist_id')->all();
            $itemsByChecklist = collect();
            if (! empty($clIds)) {
                $itemsByChecklist = DB::table('tool_checklist_items')
                    ->leftJoin('inventory_items', 'inventory_items.item_id', '=', 'tool_checklist_items.item_id')
                    ->whereIn('tool_checklist_items.checklist_id', $clIds)
                    ->select([
                        'tool_checklist_items.*',
                        'inventory_items.item_name',
                        'inventory_items.tool_subtype',
                        'inventory_items.serial_number',
                        'inventory_items.unit',
                    ])
                    ->get()
                    ->map(fn ($it) => [
                        'id'                 => (int) $it->id,
                        'checklist_id'       => (int) $it->checklist_id,
                        'item_id'            => (int) $it->item_id,
                        'item_name'          => $it->item_name ?? 'Tool',
                        'item_type'          => $it->item_type,
                        'tool_subtype'       => $it->tool_subtype,
                        'serial_number'      => $it->serial_number,
                        'unit'               => $it->unit ?? 'pc',
                        'quantity_requested' => (int) $it->quantity_requested,
                        'quantity_approved'  => (int) $it->quantity_approved,
                        'status'             => $it->status,
                        'notes'              => $it->notes,
                    ])
                    ->groupBy('checklist_id');
            }

            $checklistsByBooking = $checklistRows->map(fn ($cl) => [
                'checklist_id'    => (int) $cl->checklist_id,
                'booking_id'      => (int) $cl->booking_id,
                'technician_id'   => $cl->technician_id ? (int) $cl->technician_id : null,
                'technician_name' => trim(($cl->creator_given_name ?? '') . ' ' . ($cl->creator_last_name ?? '')) ?: null,
                'status'          => $cl->status,
                'notes'           => $cl->notes,
                'created_at'      => $cl->created_at,
                'approved_at'     => $cl->approved_at,
                'completed_at'    => $cl->completed_at,
                'items'           => collect($itemsByChecklist->get($cl->checklist_id, []))->values()->all(),
            ])->groupBy('booking_id');
        }

        $mappedBookings = $this->mapBookings($rows)->map(function (array $b) use ($currentUserId, $roomsByBooking, $recsByBooking, $ordersByOcular, $checklistsByBooking) {
            $personnel = collect($b['ocular_personnel'] ?? []);
            $isAssignedToMe = $personnel->contains(fn ($p) => (int) ($p['user_id'] ?? 0) === $currentUserId);
            $checklists = collect($checklistsByBooking->get($b['booking_id'], []))->values();

            $b['is_assigned_to_me'] = $isAssignedToMe;
            $b['checklist'] = $checklists->first();
            $b['checklists'] = $checklists->all();
            $b['rooms'] = collect($roomsByBooking->get($b['booking_id'], []))->values()->all();
            $b['recommendations'] = collect($recsByBooking->get($b['booking_id'], []))->values()->all();
            $b['orders'] = collect($ordersByOcular->get($b['booking_id'], []))->values()->all();

            return $b;
        })->values();

        // On-hand (Available) & Order-Base AC units in inventory for recommendation selection
        $inventoryUnits = DB::table('ac_units_inventory')
            ->whereIn('status', ['Available', 'Order Base', 'Reserved'])
            ->orderBy('brand')
            ->orderBy('horsepower')
            ->orderBy('model')
            ->get()
            ->map(function ($u) {
                $price = $u->selling_price !== null && (float) $u->selling_price > 0
                    ? (float) $u->selling_price
                    : (float) $u->purchase_price;

                return [
                    'ac_unit_id'       => (int) $u->ac_unit_id,
                    'brand'            => $u->brand,
                    'model'            => $u->model,
                    'serial_number'    => $u->serial_number,
                    'horsepower'       => (float) $u->horsepower,
                    'ac_type'          => $this->normalizeRecommendedAcType((string) $u->ac_type),
                    'raw_ac_type'      => $u->ac_type,
                    'motor_type'       => $u->motor_type ?: 'Inverter',
                    'status'           => $u->status,
                    'inventory_badge'  => $u->status === 'Order Base' ? 'Order-Base' : 'On-Hand',
                    'selling_price'    => $price,
                    'warranty_period'  => (int) ($u->warranty_period ?? 12),
                    'expected_arrival' => $u->expected_arrival ?? null,
                    'image_path'       => $u->image_path ?? null,
                    'image_url'        => ! empty($u->image_path) ? asset('storage/' . ltrim((string) $u->image_path, '/')) : null,
                ];
            })
            ->values();

        $brandPriceRanges = $inventoryUnits
            ->groupBy('brand')
            ->map(function ($group, $brand) {
                $minPrice = (float) $group->min('selling_price');
                $maxPrice = (float) $group->max('selling_price');
                $rangeText = abs($maxPrice - $minPrice) < 0.01
                    ? '₱' . number_format($minPrice, 0)
                    : '₱' . number_format($minPrice, 0) . ' – ₱' . number_format($maxPrice, 0);

                return [
                    'brand'       => $brand,
                    'min_price'   => $minPrice,
                    'max_price'   => $maxPrice,
                    'price_range' => $rangeText,
                    'label'       => "{$brand} ({$rangeText})",
                    'units_count' => $group->count(),
                ];
            })
            ->values();

        return response()->json([
            'data'               => $mappedBookings,
            'inventory_units'    => $inventoryUnits,
            'brand_price_ranges' => $brandPriceRanges,
        ]);
    }

    public function storeRoom(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);
        $this->ensureOcularBookingExists($bookingId);

        $validated = $this->validateRoomPayload($request);
        $capacity = $this->calculateCoolingCapacity($validated);

        $roomId = DB::table('ocular_inspection_rooms')->insertGetId([
            'booking_id'                => $bookingId,
            'room_name'                 => $validated['room_name'] ?? null,
            'unit_of_measurement'       => $validated['unit_of_measurement'],
            'room_length'               => $validated['room_length'],
            'room_width'                => $validated['room_width'],
            'ceiling_height'            => $validated['ceiling_height'],
            'room_category'             => $validated['room_category'],
            'sun_exposure_level'        => $validated['sun_exposure_level'],
            'maximum_occupancy'         => (int) $validated['maximum_occupancy'],
            'window_size_glazing'       => $validated['window_size_glazing'],
            'heat_generating_equipment' => (int) $validated['heat_generating_equipment'],
            'estimated_btu'             => $capacity['estimated_btu'],
            'estimated_hp'              => $capacity['estimated_hp'],
            'created_by'                => (int) $request->user()->user_id,
            'created_at'                => now(),
            'updated_at'                => now(),
        ], 'room_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'OCULAR_INSPECTION',
            sprintf('Added inspected room (%s) to Ocular Inspection Booking #%d.', $validated['room_category'], $bookingId)
        );

        $room = DB::table('ocular_inspection_rooms')->where('room_id', $roomId)->first();

        return response()->json([
            'message' => 'Room capacity data saved.',
            'data'    => $this->formatRoom($room),
        ], 201);
    }

    public function updateRoom(Request $request, int $bookingId, int $roomId): JsonResponse
    {
        $this->authorizeRole($request);
        $this->ensureOcularBookingExists($bookingId);

        $existing = DB::table('ocular_inspection_rooms')
            ->where('room_id', $roomId)
            ->where('booking_id', $bookingId)
            ->first();

        if (! $existing) {
            abort(404, 'Room inspection record not found.');
        }

        $validated = $this->validateRoomPayload($request);
        $capacity = $this->calculateCoolingCapacity($validated);

        DB::table('ocular_inspection_rooms')
            ->where('room_id', $roomId)
            ->update([
                'room_name'                 => $validated['room_name'] ?? null,
                'unit_of_measurement'       => $validated['unit_of_measurement'],
                'room_length'               => $validated['room_length'],
                'room_width'                => $validated['room_width'],
                'ceiling_height'            => $validated['ceiling_height'],
                'room_category'             => $validated['room_category'],
                'sun_exposure_level'        => $validated['sun_exposure_level'],
                'maximum_occupancy'         => (int) $validated['maximum_occupancy'],
                'window_size_glazing'       => $validated['window_size_glazing'],
                'heat_generating_equipment' => (int) $validated['heat_generating_equipment'],
                'estimated_btu'             => $capacity['estimated_btu'],
                'estimated_hp'              => $capacity['estimated_hp'],
                'updated_at'                => now(),
            ]);

        $room = DB::table('ocular_inspection_rooms')->where('room_id', $roomId)->first();

        return response()->json([
            'message' => 'Room capacity data updated.',
            'data'    => $this->formatRoom($room),
        ]);
    }

    public function destroyRoom(Request $request, int $bookingId, int $roomId): JsonResponse
    {
        $this->authorizeRole($request);

        $deleted = DB::table('ocular_inspection_rooms')
            ->where('room_id', $roomId)
            ->where('booking_id', $bookingId)
            ->delete();

        if (! $deleted) {
            abort(404, 'Room inspection record not found.');
        }

        return response()->json([
            'message' => 'Room inspection record removed.',
        ]);
    }

    public function storeRecommendation(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);
        $this->ensureOcularBookingExists($bookingId);

        $validated = $this->validateRecommendationPayload($request);
        $payload = $this->buildRecommendationPersistencePayload($request, $validated, null);

        $recId = DB::table('ocular_inspection_recommendations')->insertGetId(array_merge($payload, [
            'booking_id' => $bookingId,
            'status'     => 'Draft',
            'created_by' => (int) $request->user()->user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]), 'recommendation_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'OCULAR_RECOMMENDATION',
            sprintf('Added AC recommendation (%s %.1f HP) for Booking #%d.', $payload['brand_recommendation'], (float) $payload['recommended_capacity'], $bookingId)
        );

        $rec = DB::table('ocular_inspection_recommendations')
            ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ocular_inspection_recommendations.ac_unit_id')
            ->where('ocular_inspection_recommendations.recommendation_id', $recId)
            ->select([
                'ocular_inspection_recommendations.*',
                'ac_units_inventory.serial_number as inv_serial_number',
                'ac_units_inventory.image_path as inv_image_path',
                'ac_units_inventory.status as inv_current_status',
            ])
            ->first();

        return response()->json([
            'message' => 'AC specification recommendation added.',
            'data'    => $this->formatRecommendation($rec),
        ], 201);
    }

    public function updateRecommendation(Request $request, int $bookingId, int $recommendationId): JsonResponse
    {
        $this->authorizeRole($request);
        $this->ensureOcularBookingExists($bookingId);

        $existing = DB::table('ocular_inspection_recommendations')
            ->where('recommendation_id', $recommendationId)
            ->where('booking_id', $bookingId)
            ->first();

        if (! $existing) {
            abort(404, 'Recommendation not found.');
        }

        $validated = $this->validateRecommendationPayload($request);
        $payload = $this->buildRecommendationPersistencePayload($request, $validated, $existing);

        DB::table('ocular_inspection_recommendations')
            ->where('recommendation_id', $recommendationId)
            ->update(array_merge($payload, [
                'updated_at' => now(),
            ]));

        $rec = DB::table('ocular_inspection_recommendations')
            ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ocular_inspection_recommendations.ac_unit_id')
            ->where('ocular_inspection_recommendations.recommendation_id', $recommendationId)
            ->select([
                'ocular_inspection_recommendations.*',
                'ac_units_inventory.serial_number as inv_serial_number',
                'ac_units_inventory.image_path as inv_image_path',
                'ac_units_inventory.status as inv_current_status',
            ])
            ->first();

        return response()->json([
            'message' => 'AC specification recommendation updated.',
            'data'    => $this->formatRecommendation($rec),
        ]);
    }

    public function destroyRecommendation(Request $request, int $bookingId, int $recommendationId): JsonResponse
    {
        $this->authorizeRole($request);

        $deleted = DB::table('ocular_inspection_recommendations')
            ->where('recommendation_id', $recommendationId)
            ->where('booking_id', $bookingId)
            ->delete();

        if (! $deleted) {
            abort(404, 'Recommendation not found.');
        }

        return response()->json([
            'message' => 'Recommendation removed.',
        ]);
    }

    public function submitToCustomer(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeRole($request);
        $booking = $this->ensureOcularBookingExists($bookingId);

        $roomsCount = DB::table('ocular_inspection_rooms')
            ->where('booking_id', $bookingId)
            ->count();

        if ($roomsCount < 1) {
            throw ValidationException::withMessages([
                'rooms' => ['Please input at least one room\'s dimensions & thermal load before submitting to the customer.'],
            ]);
        }

        $recsCount = DB::table('ocular_inspection_recommendations')
            ->where('booking_id', $bookingId)
            ->count();

        if ($recsCount < 1) {
            throw ValidationException::withMessages([
                'recommendations' => ['Please add at least one AC unit specification recommendation before submitting to the customer.'],
            ]);
        }

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : (array) $booking->service_details)
            : [];

        $serviceDetails['is_ocular_inspection'] = true;
        $serviceDetails['inspection_status'] = 'Submitted';
        $serviceDetails['inspection_submitted_at'] = now()->toISOString();
        $serviceDetails['inspection_submitted_by'] = (int) $request->user()->user_id;

        $latestChecklist = Schema::hasTable('tool_checklists')
            ? DB::table('tool_checklists')
                ->where('booking_id', $bookingId)
                ->orderByDesc('checklist_id')
                ->first()
            : null;

        $canCompleteBooking = ! $latestChecklist || $latestChecklist->status === 'Completed';

        DB::transaction(function () use ($bookingId, $booking, $serviceDetails, $canCompleteBooking, $request) {
            DB::table('ocular_inspection_recommendations')
                ->where('booking_id', $bookingId)
                ->update([
                    'status'     => 'Submitted',
                    'updated_at' => now(),
                ]);

            $bookingUpdate = [
                'service_details' => json_encode($serviceDetails),
                'updated_at'      => now(),
            ];

            if ($canCompleteBooking && in_array($booking->booking_status, ['Approved', 'In-Progress'], true)) {
                $bookingUpdate['booking_status'] = 'Completed';
                $bookingUpdate['service_order_status'] = 'Completed';
            }

            DB::table('bookings')->where('booking_id', $bookingId)->update($bookingUpdate);

            $this->logActivity(
                (int) $request->user()->user_id,
                'OCULAR_SUBMITTED',
                sprintf('Submitted Ocular Inspection results and AC recommendations to customer for Booking #%d.', $bookingId)
            );
        });

        return response()->json([
            'message'           => 'Inspection results and AC unit recommendations submitted to the customer.',
            'inspection_status' => 'Submitted',
        ]);
    }

    protected function ensureOcularBookingExists(int $bookingId): object
    {
        $booking = DB::table('bookings')
            ->leftJoin('services', 'services.service_id', '=', 'bookings.service_id')
            ->where('bookings.booking_id', $bookingId)
            ->select(['bookings.*', 'services.service_name'])
            ->first();

        if (! $booking) {
            abort(404, 'Booking not found.');
        }

        return $booking;
    }

    protected function validateRoomPayload(Request $request): array
    {
        return $request->validate([
            'room_name'                 => ['nullable', 'string', 'max:120'],
            'unit_of_measurement'       => ['required', 'string', Rule::in(self::UNITS_OF_MEASUREMENT)],
            'room_length'               => ['required', 'numeric', 'min:0.5', 'max:5000'],
            'room_width'                => ['required', 'numeric', 'min:0.5', 'max:5000'],
            'ceiling_height'            => ['required', 'numeric', 'min:1', 'max:500'],
            'room_category'             => ['required', 'string', 'max:120'],
            'sun_exposure_level'        => ['required', 'string', Rule::in(self::SUN_EXPOSURE_LEVELS)],
            'maximum_occupancy'         => ['required', 'integer', 'min:1', 'max:1000'],
            'window_size_glazing'       => ['required', 'string', Rule::in(self::WINDOW_GLAZING_SIZES)],
            'heat_generating_equipment' => ['required', 'integer', 'min:0', 'max:500000'],
        ]);
    }

    protected function validateRecommendationPayload(Request $request): array
    {
        return $request->validate([
            'room_id'                   => ['nullable', 'integer'],
            'ac_unit_id'                => ['nullable', 'integer'],
            'recommended_capacity'      => ['required', 'numeric', 'min:0.5', 'max:20'],
            'recommended_ac_type'       => ['required', 'string', Rule::in(self::RECOMMENDED_AC_TYPES)],
            'motor_type_recommendation' => ['required', 'string', Rule::in(self::RECOMMENDED_MOTOR_TYPES)],
            'brand_recommendation'      => ['required', 'string', 'max:120'],
            'price_range_label'         => ['nullable', 'string', 'max:160'],
            'model'                     => ['nullable', 'string', 'max:150'],
            'unit_price'                => ['nullable', 'numeric', 'min:0'],
            'notes'                     => ['nullable', 'string', 'max:1000'],
            'unit_image'                => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);
    }

    protected function buildRecommendationPersistencePayload(Request $request, array $validated, ?object $existing): array
    {
        $acUnit = null;
        if (! empty($validated['ac_unit_id'])) {
            $acUnit = DB::table('ac_units_inventory')
                ->where('ac_unit_id', (int) $validated['ac_unit_id'])
                ->first();
        }

        $unitImagePath = $existing?->unit_image_path ?? ($acUnit?->image_path ?? null);
        if ($request->hasFile('unit_image')) {
            $unitImagePath = $request->file('unit_image')->store('ac_units', 'public');
            if ($acUnit) {
                DB::table('ac_units_inventory')
                    ->where('ac_unit_id', (int) $acUnit->ac_unit_id)
                    ->update([
                        'image_path' => $unitImagePath,
                        'updated_at' => now(),
                    ]);
            }
        }

        $unitPrice = isset($validated['unit_price']) && $validated['unit_price'] !== null && $validated['unit_price'] !== ''
            ? (float) $validated['unit_price']
            : ($acUnit ? (float) ($acUnit->selling_price ?? $acUnit->purchase_price ?? 0) : null);

        $inventoryStatus = $acUnit
            ? ($acUnit->status === 'Order Base' ? 'Order-Base' : 'On-Hand')
            : ($existing?->inventory_status ?? 'On-Hand');

        return [
            'room_id'                   => ! empty($validated['room_id']) ? (int) $validated['room_id'] : null,
            'ac_unit_id'                => $acUnit ? (int) $acUnit->ac_unit_id : null,
            'recommended_capacity'      => (float) $validated['recommended_capacity'],
            'recommended_ac_type'       => $validated['recommended_ac_type'],
            'motor_type_recommendation' => $validated['motor_type_recommendation'],
            'brand_recommendation'      => $validated['brand_recommendation'],
            'price_range_label'         => $validated['price_range_label'] ?? null,
            'model'                     => $validated['model'] ?? ($acUnit?->model ?? null),
            'inventory_status'          => $inventoryStatus,
            'unit_price'                => $unitPrice,
            'unit_image_path'           => $unitImagePath,
            'notes'                     => $validated['notes'] ?? null,
        ];
    }

    protected function calculateCoolingCapacity(array $room): array
    {
        $isFeet = ($room['unit_of_measurement'] ?? 'Meters') === 'Feet';
        $lengthM = $isFeet ? ((float) $room['room_length'] * 0.3048) : (float) $room['room_length'];
        $widthM = $isFeet ? ((float) $room['room_width'] * 0.3048) : (float) $room['room_width'];
        $heightM = $isFeet ? ((float) $room['ceiling_height'] * 0.3048) : (float) $room['ceiling_height'];

        $areaSqm = max(1.0, $lengthM * $widthM);
        $heightFactor = max(1.0, $heightM / 2.7);

        // Base tropical cooling load ~600 BTU/h per sqm
        $btu = $areaSqm * 600.0 * $heightFactor;

        $category = strtolower((string) ($room['room_category'] ?? ''));
        if (str_contains($category, 'server')) {
            $btu *= 1.35;
        } elseif (str_contains($category, 'kitchen')) {
            $btu += 4000.0;
        } elseif (str_contains($category, 'office') || str_contains($category, 'commercial')) {
            $btu *= 1.12;
        }

        $sun = $room['sun_exposure_level'] ?? 'Moderate';
        if ($sun === 'Heavy/West') {
            $btu *= 1.12;
        } elseif ($sun === 'Shaded') {
            $btu *= 0.92;
        }

        $window = $room['window_size_glazing'] ?? 'Medium';
        if ($window === 'Large Glass Facade') {
            $btu *= 1.15;
        } elseif ($window === 'Small') {
            $btu *= 0.96;
        }

        $occupancy = max(1, (int) ($room['maximum_occupancy'] ?? 1));
        if ($occupancy > 2) {
            $btu += ($occupancy - 2) * 600.0;
        }

        $equipment = max(0, (int) ($room['heat_generating_equipment'] ?? 0));
        if ($equipment > 0) {
            // Treat values <= 30 as appliance count (~350 BTU each), larger values as wattage (* 3.412 BTU/W)
            $btu += $equipment <= 30 ? ($equipment * 350.0) : ($equipment * 3.412);
        }

        $rawHp = max(0.5, $btu / 9000.0);
        $standardHps = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
        $recommendedHp = round($rawHp * 2) / 2;
        foreach ($standardHps as $hp) {
            if ($rawHp <= $hp + 0.05) {
                $recommendedHp = $hp;
                break;
            }
        }

        return [
            'estimated_btu' => round($btu, 2),
            'estimated_hp'  => $recommendedHp,
        ];
    }

    protected function normalizeRecommendedAcType(string $rawType): string
    {
        $lower = strtolower(trim($rawType));
        if (str_contains($lower, 'window')) {
            return 'Window';
        }
        if (str_contains($lower, 'floor')) {
            return 'Floor Standing';
        }
        if (str_contains($lower, 'cassette')) {
            return 'Cassette';
        }

        return 'Wall-Mounted Split';
    }

    protected function formatRoom(object $r): array
    {
        return [
            'room_id'                   => (int) $r->room_id,
            'booking_id'                => (int) $r->booking_id,
            'room_name'                 => $r->room_name,
            'unit_of_measurement'       => $r->unit_of_measurement,
            'room_length'               => (float) $r->room_length,
            'room_width'                => (float) $r->room_width,
            'ceiling_height'            => (float) $r->ceiling_height,
            'room_category'             => $r->room_category,
            'sun_exposure_level'        => $r->sun_exposure_level,
            'maximum_occupancy'         => (int) $r->maximum_occupancy,
            'window_size_glazing'       => $r->window_size_glazing,
            'heat_generating_equipment' => (int) $r->heat_generating_equipment,
            'estimated_btu'             => $r->estimated_btu !== null ? (float) $r->estimated_btu : null,
            'estimated_hp'              => $r->estimated_hp !== null ? (float) $r->estimated_hp : null,
            'created_at'                => $r->created_at,
        ];
    }

    protected function formatRecommendation(object $rec): array
    {
        $imgPath = $rec->unit_image_path ?: ($rec->inv_image_path ?? null);

        return [
            'recommendation_id'         => (int) $rec->recommendation_id,
            'booking_id'                => (int) $rec->booking_id,
            'room_id'                   => $rec->room_id ? (int) $rec->room_id : null,
            'ac_unit_id'                => $rec->ac_unit_id ? (int) $rec->ac_unit_id : null,
            'recommended_capacity'      => (float) $rec->recommended_capacity,
            'recommended_ac_type'       => $rec->recommended_ac_type,
            'motor_type_recommendation' => $rec->motor_type_recommendation,
            'brand_recommendation'      => $rec->brand_recommendation,
            'price_range_label'         => $rec->price_range_label,
            'model'                     => $rec->model,
            'serial_number'             => $rec->inv_serial_number ?? null,
            'inventory_status'          => $rec->inventory_status ?: (($rec->inv_current_status ?? '') === 'Order Base' ? 'Order-Base' : 'On-Hand'),
            'unit_current_status'       => $rec->inv_current_status ?? null,
            'unit_price'                => $rec->unit_price !== null ? (float) $rec->unit_price : null,
            'unit_image_path'           => $imgPath,
            'unit_image_url'            => ! empty($imgPath) ? asset('storage/' . ltrim((string) $imgPath, '/')) : null,
            'notes'                     => $rec->notes,
            'status'                    => $rec->status,
            'created_at'                => $rec->created_at,
        ];
    }
}

