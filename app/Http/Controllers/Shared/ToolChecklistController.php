<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\InventoryItem;
use App\Models\TechnicianTeam;
use App\Models\ToolChecklist;
use App\Models\ToolChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ToolChecklistController extends Controller
{
    /**
     * List available tools & materials for technician checklist creation (view-only catalog).
     */
    public function availableCatalog(Request $request): JsonResponse
    {
        $items = DB::table('inventory_items')
            ->where(function ($query) {
                $query->whereNull('inventory_mode')
                    ->orWhere('inventory_mode', 'worker');
            })
            ->whereIn('item_type', ['Tool', 'Material'])
            ->where('is_archived', false)
            ->orderBy('item_type')
            ->orderBy('item_name')
            ->get([
                'item_id',
                'item_name',
                'item_type',
                'inventory_mode',
                'tool_subtype',
                'serial_number',
                'quantity_on_hand',
                'initial_stock',
                'unit',
                'status',
                'managed_by',
                'sub_category',
            ]);

        $formatted = $items->map(function ($item) {
            $isTool = strtolower($item->item_type) === 'tool';
            $statusLower = strtolower($item->status ?? 'available');
            $onHand = (int) $item->quantity_on_hand;
            $initial = (int) ($item->initial_stock !== null ? $item->initial_stock : $onHand);

            $isDamaged = in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true);
            $isBorrowed = $statusLower === 'borrowed';
            $isOutOfStock = $onHand <= 0;

            $isAvailable = ! $isDamaged && ! $isBorrowed && ! $isOutOfStock;
            $unavailableReason = null;

            if ($isDamaged) {
                $unavailableReason = 'Damaged / Broken';
            } elseif ($isBorrowed) {
                $unavailableReason = 'Currently In Use';
            } elseif ($isOutOfStock) {
                $unavailableReason = 'Out of Stock';
            }

            return [
                'item_id' => (int) $item->item_id,
                'item_name' => $item->item_name,
                'item_type' => $item->item_type,
                'inventory_mode' => $item->inventory_mode ?? 'worker',
                'tool_subtype' => $item->tool_subtype,
                'serial_number' => $item->serial_number,
                'quantity_on_hand' => $onHand,
                'initial_stock' => $initial,
                'unit' => $item->unit ?: 'pcs',
                'status' => $item->status ?: 'Available',
                'managed_by' => $item->managed_by,
                'sub_category' => $item->sub_category,
                'is_available' => $isAvailable,
                'unavailable_reason' => $unavailableReason,
            ];
        });

        return response()->json([
            'data' => $formatted,
        ]);
    }

    /**
     * Technician checklists index (checklists for bookings assigned to technician or their team).
     */
    public function technicianIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $userId = (int) $user->user_id;

        // Get all team IDs the technician belongs to
        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $query = ToolChecklist::with([
            'booking:booking_id,client_id,service_id,booking_status,scheduled_date,lead_technician_id,assistant_technician_id,assigned_tech_id,assigned_team_id',
            'booking.client:user_id,given_name,middle_name,last_name,contact_number,address',
            'booking.service:service_id,service_name',
            'booking.leadTechnician:user_id,given_name,middle_name,last_name',
            'booking.assistantTechnician:user_id,given_name,middle_name,last_name',
            'technician:user_id,given_name,last_name',
            'team:team_id,team_name',
            'approvedBy:user_id,given_name,last_name',
            'items',
            'items.inventoryItem:item_id,item_name,item_type,tool_subtype,serial_number,unit',
        ])
            ->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('technician_id', $userId)
                    ->orWhereIn('team_id', $myTeamIds)
                    ->orWhereHas('booking', function ($bq) use ($userId, $myTeamIds) {
                        $bq->where('assigned_tech_id', $userId)
                            ->orWhere('lead_technician_id', $userId)
                            ->orWhere('assistant_technician_id', $userId);
                        if (! empty($myTeamIds)) {
                            $bq->orWhereIn('assigned_team_id', $myTeamIds);
                        }
                    });
            })
            ->orderByDesc('created_at');

        $checklists = $query->get()->map(fn ($c) => $this->formatChecklist($c));

        return response()->json([
            'data' => $checklists,
        ]);
    }

    /**
     * Technician creates a new checklist for an assigned task.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [5, 7], true)) {
            abort(403, 'Only technicians and head technicians can create checklists.');
        }

        $userId = (int) $user->user_id;

        $validated = $request->validate([
            'booking_id' => ['required', 'integer', 'exists:bookings,booking_id'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer', 'exists:inventory_items,item_id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        // Verify booking assignment
        $booking = Booking::findOrFail($validated['booking_id']);

        $isAssignedBooking = ! empty($booking->lead_technician_id)
            || ! empty($booking->assistant_technician_id)
            || ! empty($booking->assigned_tech_id)
            || ! empty($booking->assigned_team_id);

        if (! $isAssignedBooking) {
            throw ValidationException::withMessages([
                'booking_id' => ['A checklist can only be created when there is a task assigned by the manager to your technician team.'],
            ]);
        }

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking_id' => ['Cannot create a tool checklist for a completed or cancelled booking task.'],
            ]);
        }

        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $isLeader = $booking->assigned_team_id ? DB::table('technician_teams')
            ->where('team_id', $booking->assigned_team_id)
            ->where('leader_id', $userId)
            ->exists() : false;

        $isAssignedTechnician = (int) $booking->lead_technician_id === $userId
            || (int) $booking->assistant_technician_id === $userId
            || (int) $booking->assigned_tech_id === $userId
            || in_array((int) $booking->assigned_team_id, $myTeamIds, true)
            || $isLeader
            || (int) $user->role_id === 1;

        if (! $isAssignedTechnician) {
            throw ValidationException::withMessages([
                'booking_id' => ['This task is not assigned to you or your technician team.'],
            ]);
        }

        // Strict validation: tools must not be damaged/lost/in-use, and materials must not be out-of-stock
        foreach ($validated['items'] as $itemData) {
            $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();
            if (! $invItem) {
                throw ValidationException::withMessages([
                    'items' => ["Item #{$itemData['item_id']} was not found in inventory."],
                ]);
            }

            if ((bool) ($invItem->is_archived ?? false)) {
                throw ValidationException::withMessages([
                    'items' => ["Item '{$invItem->item_name}' is archived and cannot be added to a checklist."],
                ]);
            }

            if ($invItem->inventory_mode === 'sale') {
                throw ValidationException::withMessages([
                    'items' => ["Item '{$invItem->item_name}' is for customer sale and cannot be added to a worker checklist."],
                ]);
            }

            $isTool = strtolower($invItem->item_type) === 'tool';
            $statusLower = strtolower($invItem->status ?? 'available');

            if ($isTool && in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true)) {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is damaged/lost/broken and cannot be used or added to the checklist."],
                ]);
            }

            if ($isTool && $statusLower === 'borrowed') {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is currently in use / borrowed and cannot be added to the checklist."],
                ]);
            }

            $requestedQty = (int) $itemData['quantity'];
            $availableQty = (int) $invItem->quantity_on_hand;

            if ($availableQty <= 0) {
                throw ValidationException::withMessages([
                    'items' => [
                        $isTool
                            ? "Tool '{$invItem->item_name}' is currently unavailable (0 in stock)."
                            : "Material '{$invItem->item_name}' is out of stock and cannot be added to the checklist."
                    ],
                ]);
            }

            if ($requestedQty > $availableQty) {
                throw ValidationException::withMessages([
                    'items' => ["Requested quantity for '{$invItem->item_name}' ({$requestedQty}) exceeds available stock ({$availableQty} {$invItem->unit})."],
                ]);
            }
        }

        $checklist = DB::transaction(function () use ($validated, $userId, $booking) {
            $checklist = ToolChecklist::create([
                'booking_id' => $booking->booking_id,
                'technician_id' => $userId,
                'team_id' => $booking->assigned_team_id,
                'status' => 'Pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $itemData) {
                $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();

                ToolChecklistItem::create([
                    'checklist_id' => $checklist->checklist_id,
                    'item_id' => $itemData['item_id'],
                    'item_type' => $invItem ? $invItem->item_type : 'Tool',
                    'quantity_requested' => (int) $itemData['quantity'],
                    'quantity_approved' => (int) $itemData['quantity'],
                    'status' => 'assigned',
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            return $checklist;
        });

        // Activity log
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'CREATE_CHECKLIST',
            'description' => sprintf('Technician submitted tool checklist #%d for Booking #%d.', $checklist->checklist_id, $booking->booking_id),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Checklist created and sent to Tools Man for review.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem'])),
        ], 201);
    }

    /**
     * Technician updates checklist (Allowed ONLY when checklist is Pending).
     */
    public function update(Request $request, int $checklistId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $checklist = ToolChecklist::findOrFail($checklistId);

        // Strict business rule: if approved, only Tools Man can update
        if ($checklist->status !== 'Pending') {
            throw ValidationException::withMessages([
                'checklist' => ['This checklist is already approved and locked. Only Tools Man can modify an approved checklist.'],
            ]);
        }

        $userId = (int) $user->user_id;

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer', 'exists:inventory_items,item_id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        // Strict validation: tools must not be damaged/lost/in-use, and materials must not be out-of-stock
        foreach ($validated['items'] as $itemData) {
            $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();
            if (! $invItem) {
                throw ValidationException::withMessages([
                    'items' => ["Item #{$itemData['item_id']} was not found in inventory."],
                ]);
            }

            if ((bool) ($invItem->is_archived ?? false)) {
                throw ValidationException::withMessages([
                    'items' => ["Item '{$invItem->item_name}' is archived and cannot be added to a checklist."],
                ]);
            }

            if ($invItem->inventory_mode === 'sale') {
                throw ValidationException::withMessages([
                    'items' => ["Item '{$invItem->item_name}' is for customer sale and cannot be added to a worker checklist."],
                ]);
            }

            $isTool = strtolower($invItem->item_type) === 'tool';
            $statusLower = strtolower($invItem->status ?? 'available');

            if ($isTool && in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true)) {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is damaged/lost/broken and cannot be used or added to the checklist."],
                ]);
            }

            if ($isTool && $statusLower === 'borrowed') {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is currently in use / borrowed and cannot be added to the checklist."],
                ]);
            }

            $requestedQty = (int) $itemData['quantity'];
            $availableQty = (int) $invItem->quantity_on_hand;

            if ($availableQty <= 0) {
                throw ValidationException::withMessages([
                    'items' => [
                        $isTool
                            ? "Tool '{$invItem->item_name}' is currently unavailable (0 in stock)."
                            : "Material '{$invItem->item_name}' is out of stock and cannot be added to the checklist."
                    ],
                ]);
            }

            if ($requestedQty > $availableQty) {
                throw ValidationException::withMessages([
                    'items' => ["Requested quantity for '{$invItem->item_name}' ({$requestedQty}) exceeds available stock ({$availableQty} {$invItem->unit})."],
                ]);
            }
        }

        DB::transaction(function () use ($checklist, $validated) {
            $checklist->update([
                'notes' => $validated['notes'] ?? $checklist->notes,
            ]);

            ToolChecklistItem::where('checklist_id', $checklist->checklist_id)->delete();

            foreach ($validated['items'] as $itemData) {
                $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();

                ToolChecklistItem::create([
                    'checklist_id' => $checklist->checklist_id,
                    'item_id' => $itemData['item_id'],
                    'item_type' => $invItem ? $invItem->item_type : 'Tool',
                    'quantity_requested' => (int) $itemData['quantity'],
                    'quantity_approved' => (int) $itemData['quantity'],
                    'status' => 'assigned',
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }
        });

        return response()->json([
            'message' => 'Checklist updated successfully.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem'])),
        ]);
    }

    /**
     * Tools Man lists all checklists.
     */
    public function toolsManIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 4], true)) {
            abort(403, 'Unauthorized access to checklist management.');
        }

        $query = ToolChecklist::with([
            'booking:booking_id,client_id,service_id,booking_status,scheduled_date',
            'booking.client:user_id,given_name,middle_name,last_name,contact_number,email,address',
            'booking.service:service_id,service_name,base_price',
            'technician:user_id,given_name,middle_name,last_name,contact_number',
            'team:team_id,team_name,leader_id',
            'team.leader:user_id,given_name,last_name',
            'approvedBy:user_id,given_name,last_name',
            'completedBy:user_id,given_name,last_name',
            'items',
            'items.inventoryItem:item_id,item_name,item_type,tool_subtype,serial_number,unit,quantity_on_hand',
        ])->orderByDesc('created_at');

        if ($status = $request->string('status')->trim()->value()) {
            if ($status !== 'All') {
                $query->where('status', $status);
            }
        }

        $checklists = $query->get()->map(fn ($c) => $this->formatChecklist($c));

        return response()->json([
            'data' => $checklists,
        ]);
    }

    /**
     * Tools Man approves checklist and marks tools as assigned, which dispatches the booking.
     */
    public function approve(Request $request, int $checklistId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 4], true)) {
            abort(403, 'Only Tools Man or Admin can approve checklists.');
        }

        $checklist = ToolChecklist::with(['booking', 'items.inventoryItem'])->findOrFail($checklistId);

        $userId = (int) $user->user_id;

        DB::transaction(function () use ($checklist, $userId) {
            $checklist->update([
                'status' => 'Approved',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            // Ensure tool items are marked assigned, materials are marked consumed
            ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                ->where('item_type', 'Tool')
                ->update([
                    'status' => 'assigned',
                ]);

            ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                ->where('item_type', '!=', 'Tool')
                ->update([
                    'status' => 'consumed',
                ]);

            // Automatically dispatch the booking!
            if ($checklist->booking && in_array($checklist->booking->booking_status, ['Approved', 'Pending'], true)) {
                $checklist->booking->update([
                    'booking_status' => 'Dispatched',
                ]);
            }

            // Create tool checkouts record for custody tracking and deduct stock / update status in inventory
            foreach ($checklist->items as $item) {
                $qty = $item->quantity_approved ?: $item->quantity_requested;
                $inv = DB::table('inventory_items')->where('item_id', $item->item_id)->first();

                if ($inv) {
                    if (strtolower($item->item_type ?? '') === 'tool') {
                        if (($inv->tool_subtype ?? '') === 'power') {
                            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                                'status' => 'Borrowed',
                                'last_updated' => now(),
                            ]);
                        } else {
                            // Hand tool: decrement available stock
                            $newQty = max(0, (int) $inv->quantity_on_hand - $qty);
                            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                                'quantity_on_hand' => $newQty,
                                'last_updated' => now(),
                            ]);
                        }
                    } else {
                        // Consumable material: deduct stock
                        $newQty = max(0, (int) $inv->quantity_on_hand - $qty);
                        DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                            'quantity_on_hand' => $newQty,
                            'last_updated' => now(),
                        ]);
                    }
                }

                DB::table('tool_checkouts')->insert([
                    'item_id' => $item->item_id,
                    'technician_id' => $checklist->technician_id,
                    'technician_name' => $checklist->technician ? $checklist->technician->name : 'Assigned Technician',
                    'service_name' => $checklist->booking?->service?->service_name ?? 'Aircon Service',
                    'booking_id' => $checklist->booking_id,
                    'item_name' => $item->inventoryItem?->item_name ?? 'Tool',
                    'item_type' => $item->item_type,
                    'log_type' => $item->item_type === 'Tool' ? 'borrow' : 'material_usage',
                    'quantity' => $qty,
                    'checkout_date' => now(),
                    'status' => 'Checked Out',
                    'notes' => sprintf('Issued via Checklist #%d', $checklist->checklist_id),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        // Activity log
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'APPROVE_CHECKLIST',
            'description' => sprintf('Approved Checklist #%d for Booking #%d and dispatched technician team.', $checklist->checklist_id, $checklist->booking_id),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Checklist approved! Tools marked as assigned and booking dispatched.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy'])),
        ]);
    }

    /**
     * Tools Man adds or modifies items on a checklist (even after approval).
     */
    public function toolsManUpdateItems(Request $request, int $checklistId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 4], true)) {
            abort(403, 'Unauthorized.');
        }

        $checklist = ToolChecklist::findOrFail($checklistId);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer', 'exists:inventory_items,item_id'],
            'items.*.quantity_approved' => ['required', 'integer', 'min:1'],
            'items.*.status' => ['nullable', 'string', Rule::in(['assigned', 'returned', 'damaged', 'lost', 'consumed'])],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        // Pre-validate inventory availability & mode
        foreach ($validated['items'] as $itemData) {
            $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();
            if (! $invItem) {
                throw ValidationException::withMessages([
                    'items' => ["Inventory item #{$itemData['item_id']} was not found."],
                ]);
            }

            // Must be worker inventory
            if ($invItem->inventory_mode === 'sale') {
                throw ValidationException::withMessages([
                    'items' => ["Item '{$invItem->item_name}' is for customer sale and cannot be added to a worker checklist."],
                ]);
            }

            $isTool = strtolower($invItem->item_type) === 'tool';
            $statusLower = strtolower($invItem->status ?? 'available');

            if ($isTool && in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true)) {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is damaged/lost/broken and cannot be added to the checklist."],
                ]);
            }

            $requestedQty = (int) $itemData['quantity_approved'];
            $onHand = (int) $invItem->quantity_on_hand;
            if ($onHand <= 0) {
                throw ValidationException::withMessages([
                    'items' => [
                        $isTool
                            ? "Tool '{$invItem->item_name}' is currently unavailable (0 in stock)."
                            : "Material '{$invItem->item_name}' is out of stock and cannot be added to the checklist."
                    ],
                ]);
            }

            if ($requestedQty > $onHand) {
                throw ValidationException::withMessages([
                    'items' => [
                        sprintf(
                            "Cannot add %d %s of '%s'. Only %d available in inventory.",
                            $requestedQty,
                            $invItem->unit ?: 'pcs',
                            $invItem->item_name,
                            $onHand
                        ),
                    ],
                ]);
            }
        }

        DB::transaction(function () use ($checklist, $validated) {
            foreach ($validated['items'] as $itemData) {
                $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();
                $isTool = strtolower($invItem ? $invItem->item_type : '') === 'tool';

                $existing = ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                    ->where('item_id', $itemData['item_id'])
                    ->first();

                if ($existing) {
                    $existing->update([
                        'quantity_approved' => (int) $itemData['quantity_approved'],
                        'status' => $isTool ? ($itemData['status'] ?? $existing->status) : 'consumed',
                        'notes' => $itemData['notes'] ?? $existing->notes,
                    ]);
                } else {
                    ToolChecklistItem::create([
                        'checklist_id' => $checklist->checklist_id,
                        'item_id' => $itemData['item_id'],
                        'item_type' => $invItem ? $invItem->item_type : 'Tool',
                        'quantity_requested' => (int) $itemData['quantity_approved'],
                        'quantity_approved' => (int) $itemData['quantity_approved'],
                        'status' => $isTool ? ($itemData['status'] ?? 'assigned') : 'consumed',
                        'notes' => $itemData['notes'] ?? null,
                    ]);
                }
            }

            // If checklist is already approved, ensure newly added or updated items are synced with tool_checkouts
            if ($checklist->status === 'Approved') {
                $freshChecklist = $checklist->fresh(['booking.service', 'technician', 'items.inventoryItem']);
                foreach ($freshChecklist->items as $item) {
                    $existingCheckout = DB::table('tool_checkouts')
                        ->where('booking_id', $freshChecklist->booking_id)
                        ->where('item_id', $item->item_id)
                        ->first();

                    if (! $existingCheckout) {
                        DB::table('tool_checkouts')->insert([
                            'item_id' => $item->item_id,
                            'technician_id' => $freshChecklist->technician_id,
                            'technician_name' => $freshChecklist->technician ? $freshChecklist->technician->name : 'Assigned Technician',
                            'service_name' => $freshChecklist->booking?->service?->service_name ?? 'Aircon Service',
                            'booking_id' => $freshChecklist->booking_id,
                            'item_name' => $item->inventoryItem?->item_name ?? 'Tool',
                            'item_type' => $item->item_type,
                            'log_type' => strtolower($item->item_type ?? '') === 'tool' ? 'borrow' : 'material_usage',
                            'quantity' => $item->quantity_approved ?: $item->quantity_requested,
                            'checkout_date' => now(),
                            'status' => 'Checked Out',
                            'notes' => sprintf('Issued via Checklist #%d', $freshChecklist->checklist_id),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        DB::table('tool_checkouts')
                            ->where('checkout_id', $existingCheckout->checkout_id)
                            ->update([
                                'quantity' => $item->quantity_approved ?: $item->quantity_requested,
                                'updated_at' => now(),
                            ]);
                    }
                }
            }
        });

        return response()->json([
            'message' => 'Checklist items updated by Tools Man.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy', 'completedBy'])),
        ]);
    }

    /**
     * Tools Man sets individual tool status (assigned, returned, damaged, lost).
     */
    public function updateToolStatus(Request $request, int $checklistId, int $itemId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 4], true)) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['assigned', 'returned', 'damaged', 'lost'])],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $item = ToolChecklistItem::where('checklist_id', $checklistId)
            ->where('id', $itemId)
            ->firstOrFail();

        // Materials do not have custody or return status tracking
        if (strtolower($item->item_type ?? '') !== 'tool') {
            throw ValidationException::withMessages([
                'status' => ['Consumable materials do not require return status tracking.'],
            ]);
        }

        $previousStatus = $item->status;
        $newStatus = $validated['status'];

        $item->update([
            'status' => $newStatus,
            'notes' => $validated['notes'] ?? $item->notes,
        ]);

        // Synchronize tool_checkouts and inventory status
        if ($item->checklist && $item->checklist->booking_id) {
            $invItem = DB::table('inventory_items')->where('item_id', $item->item_id)->first();
            $itemQty = (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1);

            if ($newStatus === 'returned' && $previousStatus !== 'returned') {
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->where('status', 'Checked Out')
                    ->update([
                        'status' => 'Returned',
                        'return_date' => now(),
                        'updated_at' => now(),
                    ]);

                // Restore power tool / available status in inventory
                if ($invItem && $invItem->item_type === 'Tool') {
                    if (($invItem->tool_subtype ?? '') === 'power') {
                        DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                            'status' => 'Available',
                            'last_updated' => now(),
                        ]);
                    } else {
                        // Hand tool: increment available stock
                        DB::table('inventory_items')->where('item_id', $item->item_id)->increment('quantity_on_hand', $itemQty, [
                            'last_updated' => now(),
                        ]);
                    }
                }
            } elseif ($newStatus === 'damaged' && $previousStatus !== 'damaged') {
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->where('status', 'Checked Out')
                    ->update([
                        'status' => 'Lost/Damaged',
                        'return_date' => now(),
                        'notes' => 'Marked damaged on return',
                        'updated_at' => now(),
                    ]);

                // Mark power tool as Lost/Damaged in inventory so it cannot be used again
                if ($invItem && $invItem->item_type === 'Tool' && ($invItem->tool_subtype ?? '') === 'power') {
                    DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                        'status' => 'Lost/Damaged',
                        'last_updated' => now(),
                    ]);
                }
            } elseif ($newStatus === 'lost' && $previousStatus !== 'lost') {
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->where('status', 'Checked Out')
                    ->update([
                        'status' => 'Lost/Damaged',
                        'return_date' => now(),
                        'notes' => 'Marked lost (task completed without tool return)',
                        'updated_at' => now(),
                    ]);

                // Mark power tool as Lost/Damaged in inventory
                if ($invItem && $invItem->item_type === 'Tool' && ($invItem->tool_subtype ?? '') === 'power') {
                    DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                        'status' => 'Lost/Damaged',
                        'last_updated' => now(),
                    ]);
                }
            } elseif ($newStatus === 'assigned' && $previousStatus !== 'assigned') {
                // Reversible: If reverted back to assigned
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->update([
                        'status' => 'Checked Out',
                        'return_date' => null,
                        'updated_at' => now(),
                    ]);

                if ($invItem && $invItem->item_type === 'Tool' && ($invItem->tool_subtype ?? '') === 'power') {
                    DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                        'status' => 'Borrowed',
                        'last_updated' => now(),
                    ]);
                }
            }
        }

        return response()->json([
            'message' => sprintf('Tool status updated to "%s".', $newStatus),
            'data' => $item->fresh(['inventoryItem']),
        ]);
    }

    /**
     * Tools Man declares the checklist COMPLETE.
     * STRICT VALIDATION: Cannot be completed if any tool is still in 'assigned' status!
     */
    public function complete(Request $request, int $checklistId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 4], true)) {
            abort(403, 'Unauthorized.');
        }

        $checklist = ToolChecklist::with(['items'])->findOrFail($checklistId);

        // Check if any tool items are still 'assigned' (case-insensitive check)
        $unresolvedTools = $checklist->items->filter(function ($item) {
            return strtolower($item->item_type ?? '') === 'tool' && $item->status === 'assigned';
        });

        if ($unresolvedTools->count() > 0) {
            throw ValidationException::withMessages([
                'status' => [
                    sprintf(
                        'Checklist cannot be declared complete! There are %d tool(s) still in "assigned" status. All tools must be marked as returned, damaged, or lost before completing.',
                        $unresolvedTools->count()
                    ),
                ],
            ]);
        }

        $userId = (int) $user->user_id;

        $checklist->update([
            'status' => 'Completed',
            'completed_by' => $userId,
            'completed_at' => now(),
        ]);

        // Activity log
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'COMPLETE_CHECKLIST',
            'description' => sprintf('%s completed tool checklist #%d for Booking #%d.', $user->name, $checklist->checklist_id, $checklist->booking_id),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Checklist successfully declared complete and recorded!',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy', 'completedBy'])),
        ]);
    }

    /**
     * Formats checklist model into JSON friendly response.
     */
    protected function formatChecklist(ToolChecklist $c): array
    {
        $hasUnresolved = $c->items->contains(fn ($i) => strtolower($i->item_type ?? '') === 'tool' && $i->status === 'assigned');

        $leadName = $c->booking?->leadTechnician ? $c->booking->leadTechnician->name : null;
        $assistantName = $c->booking?->assistantTechnician ? $c->booking->assistantTechnician->name : null;
        $dynamicTeam = ($leadName && $assistantName) ? "{$leadName} & {$assistantName}" : ($leadName ?: ($assistantName ?: null));

        return [
            'checklist_id' => (int) $c->checklist_id,
            'booking_id' => (int) $c->booking_id,
            'client_name' => $c->booking?->client ? $c->booking->client->name : ($c->booking ? 'Customer' : '—'),
            'service_name' => $c->booking?->service?->service_name ?? ($c->booking ? 'Aircon Service' : '—'),
            'status' => $c->status,
            'notes' => $c->notes,
            'technician_id' => (int) $c->technician_id,
            'technician_name' => $c->technician ? $c->technician->name : null,
            'team_id' => $c->team_id ? (int) $c->team_id : null,
            'team_name' => $c->team ? $c->team->team_name : $dynamicTeam,
            'approved_by_name' => $c->approvedBy ? $c->approvedBy->name : null,
            'approved_at' => $c->approved_at?->toISOString(),
            'completed_by_name' => $c->completedBy ? $c->completedBy->name : null,
            'completed_at' => $c->completed_at?->toISOString(),
            'created_at' => $c->created_at?->toISOString(),
            'has_unresolved_tools' => $hasUnresolved,
            'booking' => $c->booking ? [
                'booking_id' => (int) $c->booking->booking_id,
                'booking_status' => $c->booking->booking_status,
                'scheduled_date' => $c->booking->scheduled_date?->toISOString(),
                'service_name' => $c->booking->service?->service_name ?? 'Aircon Service',
                'client_name' => $c->booking->client ? $c->booking->client->name : 'Customer',
                'client_contact' => $c->booking->client?->contact_number,
                'client_address' => $c->booking->client?->address,
            ] : null,
            'items_count' => $c->items->count(),
            'items' => $c->items->map(function ($item) {
                return [
                    'id' => (int) $item->id,
                    'item_id' => (int) $item->item_id,
                    'item_name' => $item->inventoryItem?->item_name ?? 'Item',
                    'item_type' => $item->item_type,
                    'tool_subtype' => $item->inventoryItem?->tool_subtype,
                    'serial_number' => $item->inventoryItem?->serial_number,
                    'unit' => $item->inventoryItem?->unit ?? 'pc',
                    'quantity_requested' => (int) $item->quantity_requested,
                    'quantity_approved' => (int) $item->quantity_approved,
                    'status' => $item->status,
                    'notes' => $item->notes,
                ];
            })->values(),
        ];
    }
}
