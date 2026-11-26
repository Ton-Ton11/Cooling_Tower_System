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
                'reorder_level',
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
            $reorder = (int) ($item->reorder_level ?? 0);

            $isLost = $statusLower === 'lost';
            $isDamaged = in_array($statusLower, ['damaged', 'broken'], true);
            $isLostDamaged = $statusLower === 'lost/damaged';
            $isBorrowed = $statusLower === 'borrowed';
            $isOutOfStock = $onHand <= 0;

            $isAvailable = ! $isLost && ! $isDamaged && ! $isLostDamaged && ! $isBorrowed && ! $isOutOfStock;
            $unavailableReason = null;

            if ($isLost) {
                $unavailableReason = 'Lost';
            } elseif ($isDamaged) {
                $unavailableReason = 'Damaged';
            } elseif ($isLostDamaged) {
                $unavailableReason = 'Lost / Damaged';
            } elseif ($isBorrowed) {
                $unavailableReason = 'Currently In Use';
            } elseif ($isOutOfStock) {
                $unavailableReason = ($isTool && str_contains(strtolower((string) ($item->tool_subtype ?? '')), 'power'))
                    ? 'Currently In Use'
                    : 'Out of Stock';
            }

            $subtypeRaw = strtolower((string) ($item->tool_subtype ?? ''));
            $normalizedSubtype = $isTool ? (str_contains($subtypeRaw, 'power') ? 'power' : 'hand') : null;
            $categoryGroup = ! $isTool ? 'material' : ($normalizedSubtype === 'power' ? 'power_tool' : 'hand_tool');
            $isLowStock = ($normalizedSubtype === 'power') ? false : ($onHand <= $reorder);

            return [
                'item_id' => (int) $item->item_id,
                'item_name' => $item->item_name,
                'item_type' => $item->item_type,
                'inventory_mode' => $item->inventory_mode ?? 'worker',
                'tool_subtype' => $normalizedSubtype,
                'category_group' => $categoryGroup,
                'serial_number' => $item->serial_number,
                'quantity_on_hand' => $onHand,
                'initial_stock' => $initial,
                'reorder_level' => $reorder,
                'low_stock' => $isLowStock,
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

    protected function isOcularBooking(?Booking $booking): bool
    {
        if (! $booking) {
            return false;
        }
        if ((int) $booking->service_id === 4) {
            return true;
        }
        $svcName = $booking->service?->service_name ?? '';
        if ($svcName && stripos((string) $svcName, 'ocular') !== false) {
            return true;
        }
        $details = is_array($booking->service_details) ? $booking->service_details : [];

        return ! empty($details['is_ocular_inspection']);
    }

    protected function isUserAssignedToOcular(?Booking $booking, int $userId): bool
    {
        if (! $booking) {
            return false;
        }
        $details = is_array($booking->service_details) ? $booking->service_details : [];
        $personnel = is_array($details['ocular_personnel'] ?? null) ? $details['ocular_personnel'] : [];
        foreach ($personnel as $p) {
            if ((int) ($p['user_id'] ?? 0) === $userId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Technician / Admin Assistant checklists index (checklists for bookings assigned to technician, team, or ocular personnel).
     */
    public function technicianIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $userId = (int) $user->user_id;
        $isAdminAssistant = (int) $user->role_id === 3;

        // Get all team IDs the technician belongs to
        $myTeamIds = DB::table('technician_team_members')
            ->where('technician_id', $userId)
            ->pluck('team_id')
            ->all();

        $query = ToolChecklist::with([
            'booking:booking_id,client_id,service_id,booking_status,scheduled_date,lead_technician_id,assistant_technician_id,assigned_tech_id,assigned_team_id,service_details',
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
            ->where(function ($q) use ($userId, $myTeamIds, $isAdminAssistant) {
                $q->where('technician_id', $userId)
                    ->orWhereHas('booking', function ($bq) use ($userId, $myTeamIds, $isAdminAssistant) {
                        $bq->where('assigned_tech_id', $userId)
                            ->orWhere('lead_technician_id', $userId)
                            ->orWhere('assistant_technician_id', $userId)
                            ->orWhere('service_id', 4);
                        if ($isAdminAssistant) {
                            $bq->orWhereNotNull('service_details');
                        }
                        if (! empty($myTeamIds)) {
                            $bq->orWhere(function ($teamQuery) use ($myTeamIds) {
                                $teamQuery->whereNull('lead_technician_id')
                                    ->whereNull('assistant_technician_id')
                                    ->whereNull('assigned_tech_id')
                                    ->whereIn('assigned_team_id', $myTeamIds);
                            });
                        }
                    });
            })
            ->orderByDesc('created_at');

        $rows = $query->get()->filter(function ($c) use ($userId, $myTeamIds, $isAdminAssistant) {
            if ((int) $c->technician_id === $userId) {
                return true;
            }
            $b = $c->booking;
            if (! $b) {
                return false;
            }
            if ((int) $b->assigned_tech_id === $userId
                || (int) $b->lead_technician_id === $userId
                || (int) $b->assistant_technician_id === $userId
                || ($b->assigned_team_id && in_array((int) $b->assigned_team_id, $myTeamIds, true))
            ) {
                return true;
            }
            if ($this->isUserAssignedToOcular($b, $userId)) {
                return true;
            }
            if ($isAdminAssistant && $this->isOcularBooking($b)) {
                return true;
            }

            return false;
        });

        $checklists = $rows->values()->map(fn ($c) => $this->formatChecklist($c));

        return response()->json([
            'data' => $checklists,
        ]);
    }

    /**
     * Technician or Admin Assistant (for Ocular Inspection) creates a new checklist for an assigned task.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 3, 5, 7], true)) {
            abort(403, 'Only technicians, head technicians, and admin assistants (for ocular inspections) can create checklists.');
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
        $booking = Booking::with('service')->findOrFail($validated['booking_id']);
        $isOcular = $this->isOcularBooking($booking);

        if ((int) $user->role_id === 3 && ! $isOcular) {
            throw ValidationException::withMessages([
                'booking_id' => ['Admin Assistants can only create checklists for Ocular Inspection tasks.'],
            ]);
        }

        $details = is_array($booking->service_details) ? $booking->service_details : [];
        $hasOcularPersonnel = ! empty($details['ocular_personnel']) && is_array($details['ocular_personnel']);

        $isAssignedBooking = ! empty($booking->lead_technician_id)
            || ! empty($booking->assistant_technician_id)
            || ! empty($booking->assigned_tech_id)
            || ! empty($booking->assigned_team_id)
            || $hasOcularPersonnel;

        if (! $isAssignedBooking) {
            throw ValidationException::withMessages([
                'booking_id' => ['A checklist can only be created when personnel have been assigned by the manager.'],
            ]);
        }

        if (! in_array($booking->booking_status, ['Approved', 'Dispatched', 'In-Progress'], true)) {
            throw ValidationException::withMessages([
                'booking_id' => ['A checklist can only be created after the booking has been approved and assigned.'],
            ]);
        }

        $existingChecklist = ToolChecklist::where('booking_id', $booking->booking_id)
            ->orderByDesc('checklist_id')
            ->first();

        if ($existingChecklist) {
            throw ValidationException::withMessages([
                'booking_id' => ["Only one checklist can be created for a booking. Checklist #{$existingChecklist->checklist_id} ({$existingChecklist->status}) already exists for Booking #{$booking->booking_id}."],
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

        $isAssignedStaff = (int) $booking->lead_technician_id === $userId
            || (int) $booking->assistant_technician_id === $userId
            || (int) $booking->assigned_tech_id === $userId
            || in_array((int) $booking->assigned_team_id, $myTeamIds, true)
            || $isLeader
            || $this->isUserAssignedToOcular($booking, $userId)
            || (int) $user->role_id === 1;

        if (! $isAssignedStaff) {
            throw ValidationException::withMessages([
                'booking_id' => ['This task is not assigned to you.'],
            ]);
        }

        $normalizedItems = $this->normalizeSubmittedItems($validated['items']);

        // Strict validation: tools must not be damaged/lost/in-use, materials excluded for Ocular Inspection
        foreach ($normalizedItems as $itemData) {
            $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();
            if (! $invItem) {
                throw ValidationException::withMessages([
                    'items' => ["Item #{$itemData['item_id']} was not found in inventory."],
                ]);
            }

            $isTool = strtolower($invItem->item_type) === 'tool';
            if ($isOcular && ! $isTool) {
                throw ValidationException::withMessages([
                    'items' => ["Materials are excluded from checklists for Ocular Inspection tasks ('{$invItem->item_name}' is not a tool). Please select tools only."],
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
            if ($this->isPowerToolItem($invItem) && $requestedQty > 1) {
                throw ValidationException::withMessages([
                    'items' => ["Power tool '{$invItem->item_name}' is tracked individually by serial number and cannot exceed quantity 1."],
                ]);
            }
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

        $checklist = DB::transaction(function () use ($validated, $normalizedItems, $userId, $booking) {
            $alreadyExists = ToolChecklist::where('booking_id', $booking->booking_id)
                ->lockForUpdate()
                ->first();

            if ($alreadyExists) {
                throw ValidationException::withMessages([
                    'booking_id' => ["Only one checklist can be created per team/pair for a booking. Checklist #{$alreadyExists->checklist_id} already exists for Booking #{$booking->booking_id}."],
                ]);
            }

            $checklist = ToolChecklist::create([
                'booking_id' => $booking->booking_id,
                'technician_id' => $userId,
                'team_id' => $booking->assigned_team_id,
                'status' => 'Pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($normalizedItems as $itemData) {
                $qty = (int) $itemData['quantity'];
                $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->lockForUpdate()->first();
                $isTool = strtolower((string) ($invItem ? $invItem->item_type : 'Tool')) === 'tool';

                if ($invItem && (int) $invItem->quantity_on_hand < $qty) {
                    throw ValidationException::withMessages([
                        'items' => ["Requested quantity for '{$invItem->item_name}' ({$qty}) exceeds available stock ({$invItem->quantity_on_hand} {$invItem->unit})."],
                    ]);
                }

                ToolChecklistItem::create([
                    'checklist_id' => $checklist->checklist_id,
                    'item_id' => $itemData['item_id'],
                    'item_type' => $invItem ? $invItem->item_type : 'Tool',
                    'quantity_requested' => $qty,
                    'quantity_approved' => $qty,
                    'status' => $isTool ? 'assigned' : 'consumed',
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
            'message' => 'Checklist submitted to Tools Man for approval.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'booking.leadTechnician', 'booking.assistantTechnician', 'team', 'technician', 'items.inventoryItem'])),
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

        $checklist = ToolChecklist::with('booking.service')->findOrFail($checklistId);
        $isOcular = $this->isOcularBooking($checklist->booking);

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

        $normalizedItems = $this->normalizeSubmittedItems($validated['items']);

        $legacyPendingCheckouts = $checklist->booking_id
            ? DB::table('tool_checkouts')
                ->where('booking_id', $checklist->booking_id)
                ->where('notes', 'like', '%(Pending)%')
                ->get()
                ->keyBy('item_id')
            : collect();

        // Strict validation: tools must not be damaged/lost/in-use, and materials must not be out-of-stock
        foreach ($normalizedItems as $itemData) {
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
            if ($isOcular && ! $isTool) {
                throw ValidationException::withMessages([
                    'items' => ["Materials are excluded from checklists for Ocular Inspection tasks ('{$invItem->item_name}' is not a tool). Please select tools only."],
                ]);
            }
            $statusLower = strtolower($invItem->status ?? 'available');

            if ($isTool && in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true)) {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is damaged/lost/broken and cannot be used or added to the checklist."],
                ]);
            }

            $legacyRow = $legacyPendingCheckouts->get($itemData['item_id']);
            $legacyDeductedQty = $legacyRow ? (int) $legacyRow->quantity : 0;

            if ($isTool && $statusLower === 'borrowed' && $legacyDeductedQty <= 0) {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is currently in use / borrowed and cannot be added to the checklist."],
                ]);
            }

            $requestedQty = (int) $itemData['quantity'];
            if ($this->isPowerToolItem($invItem) && $requestedQty > 1) {
                throw ValidationException::withMessages([
                    'items' => ["Power tool '{$invItem->item_name}' is tracked individually by serial number and cannot exceed quantity 1."],
                ]);
            }
            $availableQty = (int) $invItem->quantity_on_hand + $legacyDeductedQty;

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

        DB::transaction(function () use ($checklist, $validated, $normalizedItems) {
            $checklist->update([
                'notes' => $validated['notes'] ?? $checklist->notes,
            ]);

            // Restore any legacy pre-fix Pending deduction so pending checklists never hold inventory prematurely
            if ($checklist->booking_id) {
                $legacyRows = DB::table('tool_checkouts')
                    ->where('booking_id', $checklist->booking_id)
                    ->where('notes', 'like', '%(Pending)%')
                    ->get();

                foreach ($legacyRows as $legacyRow) {
                    $inv = DB::table('inventory_items')->where('item_id', $legacyRow->item_id)->lockForUpdate()->first();
                    if ($inv) {
                        $this->restoreStockForItem($inv, (int) ($legacyRow->quantity ?: 1));
                    }
                    DB::table('tool_checkouts')->where('checkout_id', $legacyRow->checkout_id)->delete();
                    DB::table('booking_materials')
                        ->where('booking_id', $checklist->booking_id)
                        ->where('item_id', $legacyRow->item_id)
                        ->delete();
                }
            }

            ToolChecklistItem::where('checklist_id', $checklist->checklist_id)->delete();

            foreach ($normalizedItems as $itemData) {
                $qty = (int) $itemData['quantity'];
                $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->lockForUpdate()->first();
                $isTool = strtolower((string) ($invItem ? $invItem->item_type : 'Tool')) === 'tool';

                ToolChecklistItem::create([
                    'checklist_id' => $checklist->checklist_id,
                    'item_id' => $itemData['item_id'],
                    'item_type' => $invItem ? $invItem->item_type : 'Tool',
                    'quantity_requested' => $qty,
                    'quantity_approved' => $qty,
                    'status' => $isTool ? 'assigned' : 'consumed',
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
            'booking:booking_id,client_id,service_id,booking_status,scheduled_date,lead_technician_id,assistant_technician_id,assigned_tech_id,assigned_team_id,service_details,notes',
            'booking.client:user_id,given_name,middle_name,last_name,contact_number,email,address',
            'booking.service:service_id,service_name,base_price',
            'booking.leadTechnician:user_id,given_name,middle_name,last_name',
            'booking.assistantTechnician:user_id,given_name,middle_name,last_name',
            'technician:user_id,given_name,middle_name,last_name,contact_number',
            'team:team_id,team_name,leader_id',
            'team.leader:user_id,given_name,last_name',
            'approvedBy:user_id,given_name,last_name',
            'completedBy:user_id,given_name,last_name',
            'items',
            'items.inventoryItem:item_id,item_name,item_type,tool_subtype,sub_category,serial_number,unit,quantity_on_hand,status',
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

        $userId = (int) $user->user_id;

        $checklist = DB::transaction(function () use ($checklistId, $userId) {
            $checklist = ToolChecklist::with(['booking.client', 'booking.service', 'booking.leadTechnician', 'booking.assistantTechnician', 'team', 'technician', 'items.inventoryItem'])
                ->lockForUpdate()
                ->findOrFail($checklistId);

            if ($checklist->status !== 'Pending') {
                throw ValidationException::withMessages([
                    'checklist' => ["Checklist #{$checklist->checklist_id} has already been {$checklist->status}."],
                ]);
            }

            $legacyPendingCheckouts = $checklist->booking_id
                ? DB::table('tool_checkouts')
                    ->where('booking_id', $checklist->booking_id)
                    ->where('notes', 'like', '%(Pending)%')
                    ->get()
                    ->keyBy('item_id')
                : collect();

            // Pre-validate inventory availability inside transaction using row locks
            foreach ($checklist->items as $item) {
                $qty = (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1);
                $inv = DB::table('inventory_items')->where('item_id', $item->item_id)->lockForUpdate()->first();
                if (! $inv) {
                    throw ValidationException::withMessages([
                        'checklist' => ["Item '{$item->inventoryItem?->item_name}' was not found in worker inventory."],
                    ]);
                }

                $isTool = strtolower((string) ($inv->item_type ?? $item->item_type ?? '')) === 'tool';
                $statusLower = strtolower($inv->status ?? 'available');
                $isPowerTool = $this->isPowerToolItem($inv);
                $legacyRow = $legacyPendingCheckouts->get($item->item_id);
                $alreadyDeducted = $legacyRow ? (int) $legacyRow->quantity : 0;
                $neededFromStock = $qty - $alreadyDeducted;

                if ($isTool && in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true)) {
                    throw ValidationException::withMessages([
                        'checklist' => ["Tool '{$inv->item_name}' is marked as damaged/lost and cannot be issued."],
                    ]);
                }

                if ($isPowerTool && $statusLower === 'borrowed' && $alreadyDeducted <= 0) {
                    throw ValidationException::withMessages([
                        'checklist' => ["Power tool '{$inv->item_name}' is already borrowed / in use."],
                    ]);
                }

                if ($neededFromStock > 0 && (int) $inv->quantity_on_hand < $neededFromStock) {
                    throw ValidationException::withMessages([
                        'checklist' => [
                            $isTool
                                ? "Insufficient stock for tool '{$inv->item_name}' (Requested: {$qty}, Available: {$inv->quantity_on_hand} {$inv->unit})."
                                : "Insufficient stock for material '{$inv->item_name}' (Requested: {$qty}, Available: {$inv->quantity_on_hand} {$inv->unit})."
                        ],
                    ]);
                }
            }

            $checklist->update([
                'status' => 'Approved',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            // Ensure quantity_approved is populated for all items
            foreach ($checklist->items as $it) {
                if (empty($it->quantity_approved) || (int) $it->quantity_approved <= 0) {
                    $it->update([
                        'quantity_approved' => (int) ($it->quantity_requested ?: 1),
                    ]);
                }
            }

            // Ensure tool items are marked assigned, materials are marked consumed
            ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                ->where(function ($q) {
                    $q->whereRaw('LOWER(item_type) = ?', ['tool'])
                      ->orWhereNull('item_type');
                })
                ->update([
                    'status' => 'assigned',
                ]);

            ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                ->whereRaw('LOWER(item_type) != ?', ['tool'])
                ->update([
                    'status' => 'consumed',
                ]);

            // Automatically transition customer's booking status from Approved to In-Progress after Tools Man approves checklist!
            if ($checklist->booking_id) {
                $bookingRow = DB::table('bookings')->where('booking_id', $checklist->booking_id)->lockForUpdate()->first();
                if ($bookingRow) {
                    $serviceDetails = ! empty($bookingRow->service_details)
                        ? (is_string($bookingRow->service_details) ? (json_decode($bookingRow->service_details, true) ?: []) : (array) $bookingRow->service_details)
                        : [];
                    $serviceDetails['job_started_by_tech'] = true;
                    $serviceDetails['job_started_at'] = $serviceDetails['job_started_at'] ?? now()->toISOString();

                    $serviceRow = DB::table('services')->where('service_id', $bookingRow->service_id)->first(['service_name']);
                    $isOcularBooking = ((int) $bookingRow->service_id === 4)
                        || ($serviceRow && stripos((string) $serviceRow->service_name, 'ocular') !== false)
                        || ! empty($serviceDetails['is_ocular_inspection']);

                    $bookingUpdate = [
                        'booking_status' => 'In-Progress',
                        'service_details' => json_encode($serviceDetails),
                        'updated_at' => now(),
                    ];
                    if (! $isOcularBooking) {
                        $bookingUpdate['quotation_status'] = 'waiting for customer to sign';
                    }

                    DB::table('bookings')
                        ->where('booking_id', $checklist->booking_id)
                        ->whereIn('booking_status', ['Approved', 'Dispatched', 'Pending', 'In-Progress'])
                        ->update($bookingUpdate);

                    $existingReport = DB::table('service_reports')->where('booking_id', $checklist->booking_id)->first();
                    if (! $existingReport) {
                        $leadTechId = (int) ($bookingRow->lead_technician_id ?: ($bookingRow->assigned_tech_id ?: $checklist->technician_id));
                        DB::table('service_reports')->insert([
                            'booking_id' => $checklist->booking_id,
                            'technician_id' => $leadTechId,
                            'job_started_at' => now(),
                            'status' => 'In-Progress',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            $freshChecklist = $checklist->fresh(['booking.client', 'booking.service', 'booking.leadTechnician', 'booking.assistantTechnician', 'team', 'technician', 'items.inventoryItem']);

            // Deduct approved materials, hand tools, and power tools from worker inventory and record custody/usage logs
            foreach ($freshChecklist->items as $item) {
                $qty = (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1);
                $inv = DB::table('inventory_items')->where('item_id', $item->item_id)->lockForUpdate()->first();
                if (! $inv) {
                    continue;
                }

                $isTool = strtolower((string) ($inv->item_type ?? $item->item_type ?? '')) === 'tool';
                $legacyRow = $legacyPendingCheckouts->get($item->item_id);
                $alreadyDeducted = $legacyRow ? (int) $legacyRow->quantity : 0;
                $deltaToDeduct = $qty - $alreadyDeducted;

                if ($deltaToDeduct > 0) {
                    if ((int) $inv->quantity_on_hand < $deltaToDeduct) {
                        throw ValidationException::withMessages([
                            'checklist' => [
                                sprintf("Insufficient stock for '%s' (Needed: %d, Available: %d %s).", $inv->item_name, $deltaToDeduct, $inv->quantity_on_hand, $inv->unit),
                            ],
                        ]);
                    }
                    $this->deductStockForApprovedItem($inv, $deltaToDeduct);
                } elseif ($deltaToDeduct < 0) {
                    $this->restoreStockForItem($inv, abs($deltaToDeduct), $item->id);
                }

                if (! $isTool && $freshChecklist->booking_id) {
                    $existingMat = DB::table('booking_materials')
                        ->where('booking_id', $freshChecklist->booking_id)
                        ->where('item_id', $item->item_id)
                        ->first();
                    if ($existingMat) {
                        DB::table('booking_materials')
                            ->where('usage_id', $existingMat->usage_id)
                            ->update([
                                'quantity_used' => $qty,
                                'logged_at' => now(),
                            ]);
                    } else {
                        DB::table('booking_materials')->insert([
                            'booking_id' => $freshChecklist->booking_id,
                            'item_id' => $item->item_id,
                            'quantity_used' => $qty,
                            'logged_at' => now(),
                        ]);
                    }
                }

                if ($legacyRow) {
                    DB::table('tool_checkouts')
                        ->where('checkout_id', $legacyRow->checkout_id)
                        ->update([
                            'quantity' => $qty,
                            'checkout_date' => now(),
                            'status' => $isTool ? 'Checked Out' : 'Used / Consumed',
                            'notes' => $this->buildChecklistLogDescription($freshChecklist, $item),
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('tool_checkouts')->insert([
                        'item_id' => $item->item_id,
                        'technician_id' => $freshChecklist->technician_id,
                        'technician_name' => $freshChecklist->technician ? $freshChecklist->technician->name : 'Assigned Technician',
                        'service_name' => $freshChecklist->booking?->service?->service_name ?? 'Aircon Service',
                        'booking_id' => $freshChecklist->booking_id,
                        'item_name' => $item->inventoryItem?->item_name ?? $inv->item_name ?? 'Tool',
                        'item_type' => $inv->item_type ?? $item->item_type ?? ($isTool ? 'Tool' : 'Material'),
                        'log_type' => $isTool ? 'borrow' : 'material_usage',
                        'quantity' => $qty,
                        'checkout_date' => now(),
                        'status' => $isTool ? 'Checked Out' : 'Used / Consumed',
                        'notes' => $this->buildChecklistLogDescription($freshChecklist, $item),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            return $checklist;
        });

        // Activity log
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => 'APPROVE_CHECKLIST',
            'description' => sprintf('Approved Checklist #%d for Booking #%d and updated customer booking status from Approved to In-Progress.', $checklist->checklist_id, $checklist->booking_id),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Checklist approved! Booking status updated to In-Progress and Worker Inventory updated.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'booking.leadTechnician', 'booking.assistantTechnician', 'team', 'technician', 'items.inventoryItem', 'approvedBy'])),
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

        $checklist = ToolChecklist::with('booking.service')->findOrFail($checklistId);
        if ($checklist->status === 'Completed') {
            throw ValidationException::withMessages([
                'checklist' => ['Completed checklists cannot be modified.'],
            ]);
        }

        $isOcular = $this->isOcularBooking($checklist->booking);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer', 'exists:inventory_items,item_id'],
            'items.*.quantity_approved' => ['required', 'integer', 'min:1'],
            'items.*.status' => ['nullable', 'string', Rule::in(['assigned', 'returned', 'damaged', 'lost', 'consumed'])],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $normalizedItems = $this->normalizeSubmittedItems($validated['items'], 'quantity_approved');

        $legacyPendingCheckouts = ($checklist->status === 'Pending' && $checklist->booking_id)
            ? DB::table('tool_checkouts')
                ->where('booking_id', $checklist->booking_id)
                ->where('notes', 'like', '%(Pending)%')
                ->get()
                ->keyBy('item_id')
            : collect();

        // Pre-validate inventory availability & mode
        foreach ($normalizedItems as $itemData) {
            $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->first();
            if (! $invItem) {
                throw ValidationException::withMessages([
                    'items' => ["Inventory item #{$itemData['item_id']} was not found."],
                ]);
            }

            if ($invItem->inventory_mode === 'sale') {
                throw ValidationException::withMessages([
                    'items' => ["Item '{$invItem->item_name}' is for customer sale and cannot be added to a worker checklist."],
                ]);
            }

            $isTool = strtolower($invItem->item_type) === 'tool';
            if ($isOcular && ! $isTool) {
                throw ValidationException::withMessages([
                    'items' => ["Materials are excluded from checklists for Ocular Inspection tasks ('{$invItem->item_name}' is not a tool)."],
                ]);
            }
            $statusLower = strtolower($invItem->status ?? 'available');

            if ($isTool && in_array($statusLower, ['lost/damaged', 'damaged', 'lost', 'broken'], true)) {
                throw ValidationException::withMessages([
                    'items' => ["Tool '{$invItem->item_name}' is damaged/lost/broken and cannot be added to the checklist."],
                ]);
            }

            $requestedQty = (int) $itemData['quantity_approved'];
            if ($this->isPowerToolItem($invItem) && $requestedQty > 1) {
                throw ValidationException::withMessages([
                    'items' => ["Power tool '{$invItem->item_name}' is tracked individually by serial number and cannot exceed quantity 1."],
                ]);
            }
            $existingItem = ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                ->where('item_id', $itemData['item_id'])
                ->first();
            $existingQty = $existingItem ? (int) ($existingItem->quantity_approved ?: $existingItem->quantity_requested) : 0;
            $onHand = (int) $invItem->quantity_on_hand;

            if ($checklist->status === 'Pending') {
                // Pending checklists have not deducted worker inventory yet (unless legacy pre-fix Pending checkout exists)
                $legacyRow = $legacyPendingCheckouts->get($itemData['item_id']);
                $legacyDeducted = $legacyRow ? (int) $legacyRow->quantity : 0;
                $availableQty = $onHand + $legacyDeducted;

                if ($isTool && $statusLower === 'borrowed' && $legacyDeducted <= 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Tool '{$invItem->item_name}' is currently in use / borrowed and cannot be added to the checklist."],
                    ]);
                }

                if ($requestedQty > $availableQty) {
                    throw ValidationException::withMessages([
                        'items' => [
                            sprintf(
                                "Cannot set %d %s of '%s'. Only %d available in inventory.",
                                $requestedQty,
                                $invItem->unit ?: 'pcs',
                                $invItem->item_name,
                                $availableQty
                            ),
                        ],
                    ]);
                }
            } else {
                // Approved checklists have already deducted existingQty
                $deltaQty = $requestedQty - $existingQty;
                if (! $existingItem && $isTool && $statusLower === 'borrowed') {
                    throw ValidationException::withMessages([
                        'items' => ["Tool '{$invItem->item_name}' is currently in use / borrowed and cannot be added to the checklist."],
                    ]);
                }

                if ($deltaQty > 0) {
                    if ($onHand <= 0 || $deltaQty > $onHand) {
                        throw ValidationException::withMessages([
                            'items' => [
                                sprintf(
                                    "Cannot add %d more %s of '%s'. Only %d available in inventory.",
                                    $deltaQty,
                                    $invItem->unit ?: 'pcs',
                                    $invItem->item_name,
                                    $onHand
                                ),
                            ],
                        ]);
                    }
                }
            }
        }

        DB::transaction(function () use ($checklist, $normalizedItems) {
            foreach ($normalizedItems as $itemData) {
                $invItem = DB::table('inventory_items')->where('item_id', $itemData['item_id'])->lockForUpdate()->first();
                $isTool = strtolower($invItem ? $invItem->item_type : '') === 'tool';

                $existing = ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                    ->where('item_id', $itemData['item_id'])
                    ->first();

                if ($existing) {
                    $prevApproved = (int) ($existing->quantity_approved ?: $existing->quantity_requested ?: 1);
                    $newApproved = (int) $itemData['quantity_approved'];
                    $prevReturned = $isTool ? 0 : min($prevApproved, max(0, (int) ($existing->quantity_returned ?? 0)));
                    $newReturned = $isTool ? 0 : min($newApproved, $prevReturned);
                    $deltaUsed = ($newApproved - $newReturned) - ($prevApproved - $prevReturned);
                    $matStatus = $newReturned <= 0 ? 'consumed' : ($newReturned < $newApproved ? 'partially_returned' : 'returned');

                    $existing->update([
                        'quantity_approved' => $newApproved,
                        'quantity_returned' => $newReturned,
                        'status' => $isTool ? ($itemData['status'] ?? $existing->status) : $matStatus,
                        'notes' => $itemData['notes'] ?? $existing->notes,
                    ]);

                    if ($checklist->status === 'Approved' && $invItem && $deltaUsed !== 0) {
                        // Only adjust active inventory for materials or still-assigned tools
                        if (! $isTool || $existing->status === 'assigned') {
                            if ($deltaUsed > 0) {
                                if ((int) $invItem->quantity_on_hand < $deltaUsed) {
                                    throw ValidationException::withMessages([
                                        'items' => [
                                            sprintf("Insufficient stock for '%s' (Only %d %s remaining).", $invItem->item_name, $invItem->quantity_on_hand, $invItem->unit ?: 'pcs'),
                                        ],
                                    ]);
                                }
                                $this->deductStockForApprovedItem($invItem, $deltaUsed);
                            } else {
                                $this->restoreStockForItem($invItem, abs($deltaUsed), $existing->id);
                            }
                        }

                        if (! $isTool && $checklist->booking_id) {
                            $this->syncBookingMaterialUsage((int) $checklist->booking_id, (int) $invItem->item_id);
                        }
                    }
                } else {
                    $qty = (int) $itemData['quantity_approved'];
                    $created = ToolChecklistItem::create([
                        'checklist_id' => $checklist->checklist_id,
                        'item_id' => $itemData['item_id'],
                        'item_type' => $invItem ? $invItem->item_type : 'Tool',
                        'quantity_requested' => $qty,
                        'quantity_approved' => $qty,
                        'status' => $isTool ? ($itemData['status'] ?? 'assigned') : 'consumed',
                        'notes' => $itemData['notes'] ?? null,
                    ]);

                    // If checklist is already approved, deduct stock immediately for materials, hand tools, or power tools
                    if ($checklist->status === 'Approved' && $invItem) {
                        if ((int) $invItem->quantity_on_hand < $qty) {
                            throw ValidationException::withMessages([
                                'items' => [
                                    sprintf("Insufficient stock for '%s' (Only %d %s remaining).", $invItem->item_name, $invItem->quantity_on_hand, $invItem->unit ?: 'pcs'),
                                ],
                            ]);
                        }
                        $this->deductStockForApprovedItem($invItem, $qty);

                        if (! $isTool && $checklist->booking_id) {
                            DB::table('booking_materials')->updateOrInsert(
                                ['booking_id' => $checklist->booking_id, 'item_id' => $invItem->item_id],
                                ['quantity_used' => $qty, 'logged_at' => now()]
                            );
                        }
                    }
                }
            }

            // If checklist is already approved, ensure newly added or updated items are synced with tool_checkouts
            if ($checklist->status === 'Approved') {
                $freshChecklist = $checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem']);
                foreach ($freshChecklist->items as $item) {
                    $isTool = strtolower($item->item_type ?? '') === 'tool';
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
                            'log_type' => $isTool ? 'borrow' : 'material_usage',
                            'quantity' => $item->quantity_approved ?: $item->quantity_requested,
                            'checkout_date' => now(),
                            'status' => $isTool ? 'Checked Out' : 'Used / Consumed',
                            'notes' => $this->buildChecklistLogDescription($freshChecklist, $item),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        DB::table('tool_checkouts')
                            ->where('checkout_id', $existingCheckout->checkout_id)
                            ->update([
                                'quantity' => $item->quantity_approved ?: $item->quantity_requested,
                                'notes' => $this->buildChecklistLogDescription($freshChecklist, $item),
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
    public function updateToolStatus(Request $request, $checklistId, $itemId): JsonResponse
    {
        $checklistId = (int) $checklistId;
        $itemId = (int) $itemId;

        if ($checklistId <= 0 || $itemId <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid checklist or item ID.',
            ], 422);
        }

        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 3, 4, 5, 7], true)) {
            abort(403, 'Unauthorized.');
        }

        if ($request->has('tool_status') && ! $request->has('status')) {
            $request->merge(['status' => $request->input('tool_status')]);
        }
        if (strtolower((string) $request->input('status', '')) === 'borrowed') {
            $request->merge(['status' => 'assigned']);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['assigned', 'returned', 'damaged', 'lost', 'borrowed'])],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $item = ToolChecklistItem::with(['checklist.booking.client', 'checklist.booking.service', 'checklist.team', 'checklist.technician', 'inventoryItem'])
            ->where('checklist_id', $checklistId)
            ->where('id', $itemId)
            ->firstOrFail();

        if ($item->checklist && $item->checklist->status === 'Pending') {
            throw ValidationException::withMessages([
                'status' => ['Tool custody status can only be updated after the checklist is approved.'],
            ]);
        }

        // Materials do not have custody or return status tracking
        if (strtolower($item->item_type ?? '') !== 'tool') {
            throw ValidationException::withMessages([
                'status' => ['Consumable materials do not require return status tracking.'],
            ]);
        }

        $previousStatus = $item->status;
        $newStatus = $validated['status'];

        DB::transaction(function () use ($item, $newStatus, $validated) {
            $this->applyToolStatusChange($item, $newStatus, array_key_exists('notes', $validated) && $validated['notes'] !== null ? $validated['notes'] : $item->notes);
        });

        return response()->json([
            'message' => sprintf('Tool status updated to "%s".', $newStatus),
            'data' => $item->fresh(['inventoryItem']),
        ]);
    }

    /**
     * Batch update tool statuses (and optional consumable material return quantities) for a checklist.
     */
    public function batchUpdateToolStatus(Request $request, $checklistId): JsonResponse
    {
        $checklistId = (int) $checklistId;
        if ($checklistId <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid checklist ID.',
            ], 422);
        }

        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 3, 4, 5, 7], true)) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.status' => ['nullable', 'string', Rule::in(['assigned', 'returned', 'damaged', 'lost', 'borrowed', 'consumed', 'partially_returned'])],
            'items.*.quantity_returned' => ['nullable', 'integer', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $checklist = ToolChecklist::with(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem'])
            ->findOrFail($checklistId);

        if ($checklist->status === 'Pending') {
            throw ValidationException::withMessages([
                'status' => ['Tool custody status can only be updated after the checklist is approved.'],
            ]);
        }

        DB::transaction(function () use ($checklist, $validated, $user) {
            foreach ($validated['items'] as $itData) {
                $itemId = (int) $itData['item_id'];
                $notes = $itData['notes'] ?? null;

                $item = ToolChecklistItem::with(['checklist.booking.client', 'checklist.booking.service', 'checklist.team', 'checklist.technician', 'inventoryItem'])
                    ->where('checklist_id', $checklist->checklist_id)
                    ->where('id', $itemId)
                    ->first();

                if (! $item) {
                    continue;
                }

                if (strtolower($item->item_type ?? '') === 'tool') {
                    if (empty($itData['status'])) {
                        continue;
                    }
                    $rawStatus = strtolower($itData['status']);
                    $newStatus = $rawStatus === 'borrowed' ? 'assigned' : $rawStatus;
                    if (! in_array($newStatus, ['assigned', 'returned', 'damaged', 'lost'], true)) {
                        continue;
                    }
                    $this->applyToolStatusChange($item, $newStatus, $notes);
                } elseif (array_key_exists('quantity_returned', $itData) && $itData['quantity_returned'] !== null) {
                    $this->applyMaterialReturnQuantity($item, (int) $itData['quantity_returned'], $notes, (int) $user->user_id);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Checklist items updated successfully.',
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy', 'completedBy'])),
        ]);
    }

    /**
     * Return unused consumable materials from an Approved checklist back to inventory by selected quantity.
     * Usable by both Technician / Head Technician and Tools Man / Super Admin / Manager.
     */
    public function returnMaterial(Request $request, int $checklistId, int $itemId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 3, 4, 5, 7], true)) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'quantity_returned' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $item = ToolChecklistItem::with(['checklist.booking.client', 'checklist.booking.service', 'checklist.team', 'checklist.technician', 'inventoryItem'])
            ->where('checklist_id', $checklistId)
            ->where('id', $itemId)
            ->firstOrFail();

        if (strtolower($item->item_type ?? '') === 'tool') {
            throw ValidationException::withMessages([
                'quantity_returned' => ['Only consumable materials support quantity returns on this endpoint.'],
            ]);
        }

        if (! $item->checklist || $item->checklist->status !== 'Approved') {
            throw ValidationException::withMessages([
                'checklist' => ['Consumable materials can only be returned while the checklist is in Approved status.'],
            ]);
        }

        if ($item->checklist->booking && in_array($item->checklist->booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking' => ['Materials cannot be returned after the booking has been Completed or Cancelled.'],
            ]);
        }

        $updatedItem = DB::transaction(function () use ($item, $validated, $user) {
            return $this->applyMaterialReturnQuantity(
                $item,
                (int) $validated['quantity_returned'],
                array_key_exists('notes', $validated) && $validated['notes'] !== null ? $validated['notes'] : $item->notes,
                (int) $user->user_id
            );
        });

        $freshChecklist = $item->checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy', 'completedBy']);

        return response()->json([
            'success' => true,
            'message' => sprintf(
                'Recorded %d returned (%d consumed) for %s.',
                (int) $updatedItem->quantity_returned,
                max(0, (int) ($updatedItem->quantity_approved ?: $updatedItem->quantity_requested ?: 1) - (int) $updatedItem->quantity_returned),
                $item->inventoryItem?->item_name ?? 'Material'
            ),
            'data' => $this->formatChecklist($freshChecklist),
        ]);
    }

    /**
     * Apply material return quantity change atomically against inventory, booking_materials, and tool_checkouts.
     */
    protected function applyMaterialReturnQuantity(ToolChecklistItem $item, int $newReturnedQty, ?string $notes = null, ?int $actorUserId = null): ToolChecklistItem
    {
        if (strtolower($item->item_type ?? '') === 'tool') {
            return $item;
        }

        $approvedQty = max(1, (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1));
        if ($newReturnedQty < 0 || $newReturnedQty > $approvedQty) {
            throw ValidationException::withMessages([
                'quantity_returned' => [sprintf('Returned quantity must be between 0 and %d.', $approvedQty)],
            ]);
        }

        $prevReturned = min($approvedQty, max(0, (int) ($item->quantity_returned ?? 0)));
        $deltaReturned = $newReturnedQty - $prevReturned;

        $newStatus = $newReturnedQty <= 0
            ? 'consumed'
            : ($newReturnedQty < $approvedQty ? 'partially_returned' : 'returned');

        $invItem = DB::table('inventory_items')->where('item_id', $item->item_id)->lockForUpdate()->first();
        if ($invItem && $deltaReturned !== 0) {
            if ($deltaReturned > 0) {
                $this->restoreStockForItem($invItem, $deltaReturned, $item->id);
            } else {
                $needed = abs($deltaReturned);
                if ((int) $invItem->quantity_on_hand < $needed) {
                    throw ValidationException::withMessages([
                        'quantity_returned' => [
                            sprintf("Insufficient stock in inventory to reduce returned quantity for '%s' (Needed: %d, Available: %d %s).", $invItem->item_name, $needed, $invItem->quantity_on_hand, $invItem->unit ?: 'pcs'),
                        ],
                    ]);
                }
                $this->deductStockForApprovedItem($invItem, $needed);
            }
        }

        $item->update([
            'quantity_returned' => $newReturnedQty,
            'status' => $newStatus,
            'notes' => $notes !== null ? $notes : $item->notes,
        ]);

        $remainingUsed = max(0, $approvedQty - $newReturnedQty);

        if ($item->checklist?->booking_id) {
            $this->syncBookingMaterialUsage((int) $item->checklist->booking_id, (int) $item->item_id);

            $checkoutStatus = $newReturnedQty >= $approvedQty
                ? 'Returned'
                : ($newReturnedQty > 0 ? 'Partially Returned' : 'Used / Consumed');

            DB::table('tool_checkouts')
                ->where('booking_id', $item->checklist->booking_id)
                ->where('item_id', $item->item_id)
                ->update([
                    'quantity' => $remainingUsed,
                    'status' => $checkoutStatus,
                    'return_date' => $newReturnedQty > 0 ? now() : null,
                    'notes' => $this->buildChecklistLogDescription($item->checklist, $item->fresh()),
                    'updated_at' => now(),
                ]);
        }

        if ($actorUserId && $deltaReturned !== 0) {
            DB::table('activity_logs')->insert([
                'user_id' => $actorUserId,
                'action_type' => 'RETURN_CHECKLIST_MATERIAL',
                'description' => sprintf(
                    'Updated returned material "%s" on Checklist #%d (Booking #%d): returned %d of %d (%d used).',
                    $item->inventoryItem?->item_name ?? 'Material',
                    $item->checklist_id,
                    (int) ($item->checklist?->booking_id ?? 0),
                    $newReturnedQty,
                    $approvedQty,
                    $remainingUsed
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $item->fresh(['inventoryItem']);
    }

    /**
     * Recompute and sync booking_materials quantity_used across Approved/Completed checklists.
     */
    protected function syncBookingMaterialUsage(int $bookingId, int $itemId): void
    {
        $items = DB::table('tool_checklist_items as tci')
            ->join('tool_checklists as tc', 'tc.checklist_id', '=', 'tci.checklist_id')
            ->where('tc.booking_id', $bookingId)
            ->where('tci.item_id', $itemId)
            ->whereIn('tc.status', ['Approved', 'Completed'])
            ->whereRaw('LOWER(tci.item_type) != ?', ['tool'])
            ->get(['tci.quantity_approved', 'tci.quantity_requested', 'tci.quantity_returned']);

        $totalUsed = 0;
        foreach ($items as $row) {
            $approved = max(1, (int) ($row->quantity_approved ?: $row->quantity_requested ?: 1));
            $returned = min($approved, max(0, (int) ($row->quantity_returned ?? 0)));
            $totalUsed += max(0, $approved - $returned);
        }

        if ($totalUsed <= 0) {
            DB::table('booking_materials')
                ->where('booking_id', $bookingId)
                ->where('item_id', $itemId)
                ->delete();
        } else {
            DB::table('booking_materials')->updateOrInsert(
                ['booking_id' => $bookingId, 'item_id' => $itemId],
                ['quantity_used' => $totalUsed, 'logged_at' => now()]
            );
        }
    }

    /**
     * Apply individual tool status change and sync inventory & tool checkouts.
     */
    protected function applyToolStatusChange(ToolChecklistItem $item, string $newStatus, ?string $notes = null): ToolChecklistItem
    {
        $previousStatus = $item->status;
        if ($previousStatus === $newStatus && ($notes === null || $notes === $item->notes)) {
            return $item;
        }

        $item->update([
            'status' => $newStatus,
            'notes' => $notes !== null ? $notes : $item->notes,
        ]);

        // Synchronize tool_checkouts and inventory status
        if ($item->checklist && $item->checklist->booking_id) {
            $invItem = DB::table('inventory_items')->where('item_id', $item->item_id)->lockForUpdate()->first();
            $itemQty = (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1);
            $description = $this->buildChecklistLogDescription($item->checklist, $item);

            // If transitioning away from 'returned' on any tool (hand or power), re-deduct the previously returned stock
            if ($previousStatus === 'returned' && $newStatus !== 'returned' && $invItem && strtolower((string) ($invItem->item_type ?? '')) === 'tool') {
                $this->deductStockForApprovedItem($invItem, $itemQty);
                $invItem = DB::table('inventory_items')->where('item_id', $item->item_id)->lockForUpdate()->first();
            }

            if ($newStatus === 'returned' && $previousStatus !== 'returned') {
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->update([
                        'status' => 'Returned',
                        'return_date' => now(),
                        'notes' => $description,
                        'updated_at' => now(),
                    ]);

                // Restore both hand tool and power tool stock & Available status in inventory
                if ($invItem && strtolower((string) ($invItem->item_type ?? '')) === 'tool') {
                    $this->restoreStockForItem($invItem, $itemQty, $item->id);
                }
            } elseif ($newStatus === 'damaged' && $previousStatus !== 'damaged') {
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->update([
                        'status' => 'Damaged',
                        'return_date' => now(),
                        'notes' => $description,
                        'updated_at' => now(),
                    ]);

                // Record damaged tool in inventory and place in Damaged / Lost category
                if ($invItem && strtolower((string) ($invItem->item_type ?? '')) === 'tool') {
                    if ($this->isPowerToolItem($invItem) || (int) $invItem->quantity_on_hand <= 0) {
                        DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                            'status' => 'Damaged',
                            'sub_category' => 'Damaged / Lost',
                            'last_updated' => now(),
                        ]);
                    } else {
                        DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                            'initial_stock' => max((int) $invItem->quantity_on_hand, (int) $invItem->initial_stock - $itemQty),
                            'last_updated' => now(),
                        ]);
                        DB::table('inventory_items')->insert([
                            'item_name' => $invItem->item_name . ' (Damaged)',
                            'item_type' => 'Tool',
                            'tool_subtype' => $invItem->tool_subtype ?? 'hand',
                            'inventory_mode' => 'worker',
                            'sub_category' => 'Damaged / Lost',
                            'unit' => $invItem->unit ?? 'pc',
                            'initial_stock' => $itemQty,
                            'quantity_on_hand' => $itemQty,
                            'reorder_level' => 0,
                            'status' => 'Damaged',
                            'managed_by' => $invItem->managed_by ?? 'Tools Man',
                            'last_updated' => now(),
                        ]);
                    }
                }
            } elseif ($newStatus === 'lost' && $previousStatus !== 'lost') {
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->update([
                        'status' => 'Lost',
                        'return_date' => now(),
                        'notes' => $description,
                        'updated_at' => now(),
                    ]);

                // Record lost tool in inventory and place in Damaged / Lost category
                if ($invItem && strtolower((string) ($invItem->item_type ?? '')) === 'tool') {
                    if ($this->isPowerToolItem($invItem) || (int) $invItem->quantity_on_hand <= 0) {
                        DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                            'status' => 'Lost',
                            'sub_category' => 'Damaged / Lost',
                            'last_updated' => now(),
                        ]);
                    } else {
                        DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                            'initial_stock' => max((int) $invItem->quantity_on_hand, (int) $invItem->initial_stock - $itemQty),
                            'last_updated' => now(),
                        ]);
                        DB::table('inventory_items')->insert([
                            'item_name' => $invItem->item_name . ' (Lost)',
                            'item_type' => 'Tool',
                            'tool_subtype' => $invItem->tool_subtype ?? 'hand',
                            'inventory_mode' => 'worker',
                            'sub_category' => 'Damaged / Lost',
                            'unit' => $invItem->unit ?? 'pc',
                            'initial_stock' => $itemQty,
                            'quantity_on_hand' => $itemQty,
                            'reorder_level' => 0,
                            'status' => 'Lost',
                            'managed_by' => $invItem->managed_by ?? 'Tools Man',
                            'last_updated' => now(),
                        ]);
                    }
                }
            } elseif ($newStatus === 'assigned' && $previousStatus !== 'assigned') {
                // Reversible: If reverted back to assigned
                DB::table('tool_checkouts')
                    ->where('booking_id', $item->checklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->update([
                        'status' => 'Checked Out',
                        'return_date' => null,
                        'notes' => $description,
                        'updated_at' => now(),
                    ]);

                if ($invItem && strtolower((string) ($invItem->item_type ?? '')) === 'tool') {
                    DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                        'status' => ($this->isPowerToolItem($invItem) || (int) $invItem->quantity_on_hand <= 0) ? 'Borrowed' : 'Available',
                        'last_updated' => now(),
                    ]);
                }
            }
        }

        return $item;
    }

    /**
     * Remove one or multiple items from a checklist (Allowed when Pending, or by Tools Man/Admin).
     */
    public function removeItems(Request $request, int $checklistId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 3, 4, 5, 7], true)) {
            abort(403, 'Unauthorized.');
        }

        $checklist = ToolChecklist::findOrFail($checklistId);

        if ($checklist->status === 'Completed') {
            throw ValidationException::withMessages([
                'checklist' => ['Completed checklists cannot be modified.'],
            ]);
        }

        $validated = $request->validate([
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['required', 'integer'],
        ]);

        $itemIds = array_map('intval', $validated['item_ids']);

        DB::transaction(function () use ($checklist, $itemIds) {
            $itemsToRemove = ToolChecklistItem::where('checklist_id', $checklist->checklist_id)
                ->whereIn('id', $itemIds)
                ->get();

            foreach ($itemsToRemove as $it) {
                $qty = (int) ($it->quantity_approved ?: $it->quantity_requested ?: 1);

                if ($checklist->status === 'Approved') {
                    $inv = DB::table('inventory_items')->where('item_id', $it->item_id)->lockForUpdate()->first();
                    if ($inv) {
                        $isTool = strtolower((string) ($inv->item_type ?? $it->item_type ?? '')) === 'tool';
                        // Restore stock for unreturned materials or still-assigned tools (avoid double-restoring returned items)
                        $qtyToRestore = $isTool ? $qty : max(0, $qty - (int) ($it->quantity_returned ?? 0));
                        if (($isTool && $it->status === 'assigned') || (! $isTool && $qtyToRestore > 0)) {
                            $this->restoreStockForItem($inv, $qtyToRestore, $it->id);
                        }

                        if (! $isTool && $checklist->booking_id) {
                            DB::table('booking_materials')
                                ->where('booking_id', $checklist->booking_id)
                                ->where('item_id', $it->item_id)
                                ->delete();
                        }
                    }

                    if ($checklist->booking_id) {
                        DB::table('tool_checkouts')
                            ->where('booking_id', $checklist->booking_id)
                            ->where('item_id', $it->item_id)
                            ->delete();
                    }
                } elseif ($checklist->status === 'Pending' && $checklist->booking_id) {
                    // Clean up only if this Pending checklist had a legacy pre-fix Pending deduction
                    $legacyCheckout = DB::table('tool_checkouts')
                        ->where('booking_id', $checklist->booking_id)
                        ->where('item_id', $it->item_id)
                        ->where('notes', 'like', '%(Pending)%')
                        ->first();
                    if ($legacyCheckout) {
                        $inv = DB::table('inventory_items')->where('item_id', $it->item_id)->lockForUpdate()->first();
                        if ($inv) {
                            $this->restoreStockForItem($inv, (int) ($legacyCheckout->quantity ?: $qty), $it->id);
                        }
                        DB::table('booking_materials')
                            ->where('booking_id', $checklist->booking_id)
                            ->where('item_id', $it->item_id)
                            ->delete();
                        DB::table('tool_checkouts')
                            ->where('checkout_id', $legacyCheckout->checkout_id)
                            ->delete();
                    }
                }

                $it->delete();
            }
        });

        $count = count($itemIds);

        return response()->json([
            'message' => "{$count} item(s) successfully removed from the checklist.",
            'data' => $this->formatChecklist($checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy', 'completedBy'])),
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

        $freshChecklist = $checklist->fresh(['booking.client', 'booking.service', 'team', 'technician', 'items.inventoryItem', 'approvedBy', 'completedBy']);

        if ($freshChecklist && $freshChecklist->booking_id) {
            foreach ($freshChecklist->items as $item) {
                DB::table('tool_checkouts')
                    ->where('booking_id', $freshChecklist->booking_id)
                    ->where('item_id', $item->item_id)
                    ->update([
                        'notes' => $this->buildChecklistLogDescription($freshChecklist, $item),
                        'updated_at' => now(),
                    ]);
            }

            $bookingRow = DB::table('bookings')->where('booking_id', $freshChecklist->booking_id)->first();
            if ($bookingRow) {
                $bDetails = ! empty($bookingRow->service_details)
                    ? (is_string($bookingRow->service_details) ? (json_decode($bookingRow->service_details, true) ?: []) : (array) $bookingRow->service_details)
                    : [];
                $isOcularBooking = ((int) $bookingRow->service_id === 4) || ! empty($bDetails['is_ocular_inspection']);
                if ($isOcularBooking && ($bDetails['inspection_status'] ?? '') === 'Submitted') {
                    DB::table('bookings')
                        ->where('booking_id', $bookingRow->booking_id)
                        ->whereNotIn('booking_status', ['Cancelled', 'Completed'])
                        ->update([
                            'booking_status' => 'Completed',
                            'service_order_status' => 'Completed',
                            'updated_at' => now(),
                        ]);
                }

                \App\Http\Controllers\SuperAdmin\SuperAdminBaseController::syncAutoStartForTechnicians(
                    \App\Http\Controllers\SuperAdmin\SuperAdminBaseController::getAssignedTechnicianIdsForBooking($bookingRow)
                );
            }
        }

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
            'data' => $this->formatChecklist($freshChecklist),
        ]);
    }

    /**
     * Build a detailed log description from the checklist and checklist item details.
     */
    protected function buildChecklistLogDescription(ToolChecklist $checklist, ToolChecklistItem $item): string
    {
        $isTool = strtolower($item->item_type ?? '') === 'tool';
        $itemStatus = strtolower($item->status ?? ($isTool ? 'assigned' : 'consumed'));

        $disposition = match (true) {
            ! $isTool && $itemStatus === 'returned' => sprintf('Material fully returned to inventory (%d/%d returned)', (int) ($item->quantity_returned ?? 0), (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1)),
            ! $isTool && $itemStatus === 'partially_returned' => sprintf('Material partially returned (%d returned, %d consumed)', (int) ($item->quantity_returned ?? 0), max(0, (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1) - (int) ($item->quantity_returned ?? 0))),
            ! $isTool || $itemStatus === 'consumed' => 'Material consumed during service work',
            $itemStatus === 'returned' => 'Tool returned & verified in good condition',
            $itemStatus === 'damaged' => 'Tool reported damaged during return inspection',
            $itemStatus === 'lost' => 'Tool unreturned / reported lost after service',
            default => 'Tool issued to field crew (awaiting return)',
        };

        $parts = [
            sprintf('Checklist #%d (%s)', $checklist->checklist_id, $checklist->status ?: 'Approved'),
        ];

        if ($checklist->booking_id) {
            $clientName = $checklist->booking?->client ? $checklist->booking->client->name : null;
            $parts[] = $clientName
                ? sprintf('Booking #%d (%s)', $checklist->booking_id, $clientName)
                : sprintf('Booking #%d', $checklist->booking_id);
        }

        if ($checklist->team?->team_name) {
            $parts[] = 'Squad: ' . $checklist->team->team_name;
        }

        $parts[] = $disposition;

        if (! empty($item->notes)) {
            $parts[] = 'Item Note: ' . trim($item->notes);
        } elseif (! empty($checklist->notes)) {
            $parts[] = 'Checklist Note: ' . trim($checklist->notes);
        }

        return implode(' • ', $parts);
    }

    /**
     * Formats checklist model into JSON friendly response.
     */
    protected function formatChecklist(ToolChecklist $c): array
    {
        $hasUnresolved = $c->items->contains(fn ($i) => strtolower($i->item_type ?? '') === 'tool' && $i->status === 'assigned');
        $isOcular = $this->isOcularBooking($c->booking);
        $bDetails = is_array($c->booking?->service_details ?? null) ? $c->booking->service_details : [];
        $ocularPersonnel = is_array($bDetails['ocular_personnel'] ?? null) ? $bDetails['ocular_personnel'] : [];

        $leadName = $c->booking?->leadTechnician ? $c->booking->leadTechnician->name : null;
        $assistantName = $c->booking?->assistantTechnician ? $c->booking->assistantTechnician->name : null;
        $dynamicTeam = ! empty($ocularPersonnel)
            ? collect($ocularPersonnel)->map(fn ($p) => ($p['full_name'] ?? 'Staff') . (! empty($p['role_name']) ? " ({$p['role_name']})" : ''))->implode(', ')
            : (($leadName && $assistantName) ? "{$leadName} & {$assistantName}" : ($leadName ?: ($assistantName ?: null)));
        $teamName = $c->team ? $c->team->team_name : $dynamicTeam;

        return [
            'checklist_id' => (int) $c->checklist_id,
            'booking_id' => (int) $c->booking_id,
            'is_ocular_inspection' => $isOcular,
            'client_name' => $c->booking?->client ? $c->booking->client->name : ($c->booking ? 'Customer' : '—'),
            'service_name' => $c->booking?->service?->service_name ?? ($c->booking ? 'Aircon Service' : '—'),
            'status' => $c->status,
            'notes' => $c->notes,
            'technician_id' => (int) $c->technician_id,
            'technician_name' => $c->technician ? $c->technician->name : null,
            'lead_technician_name' => $leadName,
            'assistant_technician_name' => $assistantName,
            'team_id' => $c->team_id ? (int) $c->team_id : null,
            'team_name' => $teamName,
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
                'team_name' => $teamName,
                'lead_technician_name' => $leadName,
                'assistant_technician_name' => $assistantName,
            ] : null,
            'items_count' => $c->items->count(),
            'total_items_count' => $c->items->count(),
            'items' => $c->items->map(function ($item) {
                $isTool = strtolower($item->item_type ?? $item->inventoryItem?->item_type ?? '') === 'tool';
                $rawSubtype = strtolower((string) ($item->inventoryItem?->tool_subtype ?? ''));
                $normalizedSubtype = $isTool ? (str_contains($rawSubtype, 'power') ? 'power' : 'hand') : null;
                $categoryGroup = ! $isTool ? 'material' : ($normalizedSubtype === 'power' ? 'power_tool' : 'hand_tool');

                $invStatus = strtolower((string) ($item->inventoryItem?->status ?? ''));
                $itemStatus = $item->status;
                if ($isTool && in_array($invStatus, ['damaged', 'lost', 'lost/damaged'], true) && strtolower((string) $itemStatus) !== 'returned') {
                    $itemStatus = $invStatus === 'lost/damaged' ? 'damaged' : $invStatus;
                }

                $approvedQty = (int) ($item->quantity_approved ?: $item->quantity_requested ?: 1);
                $returnedQty = $isTool ? 0 : min($approvedQty, max(0, (int) ($item->quantity_returned ?? 0)));

                return [
                    'id' => (int) $item->id,
                    'item_id' => (int) $item->item_id,
                    'item_name' => $item->inventoryItem?->item_name ?? 'Item',
                    'item_type' => $item->item_type,
                    'tool_subtype' => $normalizedSubtype,
                    'sub_category' => $item->inventoryItem?->sub_category,
                    'category_group' => $categoryGroup,
                    'serial_number' => $item->inventoryItem?->serial_number,
                    'unit' => $item->inventoryItem?->unit ?? 'pc',
                    'quantity_requested' => (int) $item->quantity_requested,
                    'quantity_approved' => (int) $item->quantity_approved,
                    'quantity_returned' => $returnedQty,
                    'quantity_used' => $isTool ? $approvedQty : max(0, $approvedQty - $returnedQty),
                    'status' => $itemStatus,
                    'inventory_status' => $item->inventoryItem?->status,
                    'notes' => $item->notes,
                ];
            })->values(),
        ];
    }

    /**
     * Merge duplicate item_ids in a submitted checklist payload cleanly.
     */
    protected function normalizeSubmittedItems(array $items, string $qtyKey = 'quantity'): array
    {
        $merged = [];
        foreach ($items as $row) {
            $id = (int) $row['item_id'];
            $qty = max(1, (int) ($row[$qtyKey] ?? 1));
            if (isset($merged[$id])) {
                $merged[$id][$qtyKey] += $qty;
                if (empty($merged[$id]['notes']) && ! empty($row['notes'])) {
                    $merged[$id]['notes'] = $row['notes'];
                }
                if (isset($row['status'])) {
                    $merged[$id]['status'] = $row['status'];
                }
            } else {
                $merged[$id] = array_merge($row, [
                    'item_id' => $id,
                    $qtyKey => $qty,
                ]);
            }
        }

        return array_values($merged);
    }

    protected function isPowerToolItem(?object $invItem): bool
    {
        return $invItem
            && strtolower((string) ($invItem->item_type ?? '')) === 'tool'
            && str_contains(strtolower((string) ($invItem->tool_subtype ?? '')), 'power');
    }

    protected function deductStockForApprovedItem(object $invItem, int $qty): void
    {
        $isTool = strtolower((string) ($invItem->item_type ?? '')) === 'tool';
        $newQty = max(0, (int) $invItem->quantity_on_hand - $qty);
        $isPower = $this->isPowerToolItem($invItem);

        if ($isTool) {
            $newStatus = ($isPower || $newQty <= 0) ? 'Borrowed' : 'Available';
        } else {
            $newStatus = $newQty <= 0
                ? 'Out of Stock'
                : ($newQty <= (int) ($invItem->reorder_level ?? 0) ? 'Low Stock' : 'Available');
        }

        DB::table('inventory_items')->where('item_id', $invItem->item_id)->update([
            'quantity_on_hand' => $newQty,
            'status' => $newStatus,
            'last_updated' => now(),
        ]);
    }

    protected function restoreStockForItem(object $invItem, int $qty, ?int $excludeChecklistItemId = null): void
    {
        $isTool = strtolower((string) ($invItem->item_type ?? '')) === 'tool';
        $isPower = $this->isPowerToolItem($invItem);
        $newQty = (int) $invItem->quantity_on_hand + $qty;

        if ($isTool) {
            if (! empty($invItem->initial_stock) && (int) $invItem->initial_stock > 0) {
                $newQty = min((int) $invItem->initial_stock, $newQty);
            } elseif ($isPower) {
                $newQty = max(1, $newQty);
            }

            $hasOtherBorrowed = DB::table('tool_checklists')
                ->join('tool_checklist_items', 'tool_checklists.checklist_id', '=', 'tool_checklist_items.checklist_id')
                ->where('tool_checklists.status', 'Approved')
                ->where('tool_checklist_items.item_id', $invItem->item_id)
                ->when($excludeChecklistItemId !== null, fn ($q) => $q->where('tool_checklist_items.id', '!=', $excludeChecklistItemId))
                ->where('tool_checklist_items.status', 'assigned')
                ->exists();

            $newStatus = ($newQty <= 0 || ($isPower && $hasOtherBorrowed)) ? 'Borrowed' : 'Available';
        } else {
            $newStatus = $newQty <= 0
                ? 'Out of Stock'
                : ($newQty <= (int) ($invItem->reorder_level ?? 0) ? 'Low Stock' : 'Available');
        }

        DB::table('inventory_items')->where('item_id', $invItem->item_id)->update([
            'quantity_on_hand' => $newQty,
            'status' => $newStatus,
            'last_updated' => now(),
        ]);
    }
}
