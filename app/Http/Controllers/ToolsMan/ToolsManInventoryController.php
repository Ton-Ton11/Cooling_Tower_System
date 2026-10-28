<?php

namespace App\Http\Controllers\ToolsMan;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ToolsManInventoryController extends ToolsManBaseController
{
    public function inventoryIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $query = DB::table('inventory_items')
            ->where(function ($q) {
                $q->where('inventory_mode', 'worker')
                    ->orWhereNull('inventory_mode');
            });

        if (! $request->boolean('include_archived', false)) {
            $query->where('is_archived', false);
        }

        $items = $query
            ->orderBy('item_type')
            ->orderBy('item_name')
            ->get();

        $soldItems = [];

        return response()->json([
            'data' => $items->map(fn ($item) => $this->formatInventoryItem($item))->values(),
            'sold_items' => $soldItems,
        ]);
    }

    public function storeInventoryItem(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:100'],
            'item_type' => ['required', Rule::in(self::INVENTORY_ITEM_TYPES)],
            'inventory_mode' => ['sometimes', Rule::in(self::INVENTORY_MODES)],
            'tool_subtype' => ['sometimes', 'nullable', Rule::in(self::TOOL_SUBTYPES)],
            'folder_id' => ['sometimes', 'nullable', 'integer'],
            'sub_category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'compatible_brands' => ['sometimes', 'nullable'],
            'serial_number' => ['nullable', 'string', 'max:100', 'unique:inventory_items,serial_number'],
            'quantity_on_hand' => ['required', 'integer', 'min:0'],
            'initial_stock' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'unit' => ['required', 'string', 'max:20'],
            'capital' => ['sometimes', 'numeric', 'min:0'],
            'profit' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'managed_by' => ['nullable', 'string', 'max:150'],
            'status' => ['sometimes', Rule::in(['Available', 'Borrowed', 'Lost/Damaged', 'Order Base', 'Defect', 'Warranty Reserved', 'Sold', 'Out of Stock', 'Low Stock'])],
        ]);

        $validated['inventory_mode'] = 'worker';
        if (! in_array($validated['item_type'], ['Tool', 'Material'], true)) {
            $validated['item_type'] = 'Material';
        }
        $validated['initial_stock'] = $validated['initial_stock'] ?? $validated['quantity_on_hand'];
        $validated['capital'] = $validated['capital'] ?? 0;
        $validated['profit'] = $validated['profit'] ?? 0;
        $validated['status'] = $validated['status'] ?? 'Available';
        $validated['managed_by'] = $validated['managed_by'] ?? ($request->user() ? ($request->user()->name ?? 'Tools Man') : null);

        // Auto-resolve folder_id or sub_category
        if (empty($validated['folder_id']) && ! empty($validated['sub_category'])) {
            $fieldType = 'materials';
            if ($validated['inventory_mode'] === 'sale') {
                $fieldType = 'sale_items';
            } elseif ($validated['item_type'] === 'Tool') {
                $fieldType = ($validated['tool_subtype'] ?? 'hand') === 'power' ? 'power_tools' : 'hand_tools';
            } elseif ($validated['item_type'] === 'Spare Part') {
                $fieldType = 'spare_parts';
            }

            $matched = DB::table('inventory_folders')->where('field_type', $fieldType)->where('name', $validated['sub_category'])->first();
            if ($matched) {
                $validated['folder_id'] = $matched->id;
            }
        } elseif (! empty($validated['folder_id']) && empty($validated['sub_category'])) {
            $matched = DB::table('inventory_folders')->where('id', $validated['folder_id'])->first();
            if ($matched) {
                $validated['sub_category'] = $matched->name;
            }
        }

        if (array_key_exists('compatible_brands', $validated) && is_array($validated['compatible_brands'])) {
            $validated['compatible_brands'] = implode(', ', array_filter(array_map('trim', $validated['compatible_brands'])));
        }

        if (($validated['tool_subtype'] ?? null) === 'power' && empty($validated['serial_number'])) {
            throw ValidationException::withMessages(['serial_number' => ['Serial number is required for power tools.']]);
        }

        $itemId = DB::table('inventory_items')->insertGetId(array_merge($validated, [
            'created_at' => now(),
            'last_updated' => now(),
        ]), 'item_id');

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Created inventory item %s (%s).', $validated['item_name'], $validated['inventory_mode']));

        return response()->json([
            'message' => 'Inventory item created successfully.',
            'data' => $this->getInventoryItemById($itemId),
        ], 201);
    }

    public function updateInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();
        if (! $item) {
            abort(404);
        }
        if ($item->inventory_mode === 'sale') {
            abort(403, 'Tools Man can only manage worker inventory.');
        }

        $validated = $request->validate([
            'item_name' => ['sometimes', 'string', 'max:100'],
            'item_type' => ['sometimes', Rule::in(self::INVENTORY_ITEM_TYPES)],
            'inventory_mode' => ['sometimes', Rule::in(self::INVENTORY_MODES)],
            'tool_subtype' => ['sometimes', 'nullable', Rule::in(self::TOOL_SUBTYPES)],
            'folder_id' => ['sometimes', 'nullable', 'integer'],
            'sub_category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'compatible_brands' => ['sometimes', 'nullable'],
            'serial_number' => ['nullable', 'string', 'max:100', Rule::unique('inventory_items', 'serial_number')->ignore($itemId, 'item_id')],
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'added_stock' => ['sometimes', 'integer'],
            'initial_stock' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:20'],
            'capital' => ['sometimes', 'numeric', 'min:0'],
            'profit' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'managed_by' => ['sometimes', 'nullable', 'string', 'max:150'],
            'status' => ['sometimes', Rule::in(['Available', 'Borrowed', 'Lost/Damaged', 'Order Base', 'Defect', 'Warranty Reserved', 'Sold', 'Out of Stock', 'Low Stock'])],
        ]);

        // When stock is added via added_stock, automatically increment both quantity_on_hand and initial_stock
        if ($request->has('added_stock')) {
            $added = (int) $request->input('added_stock');
            if ($added > 0) {
                $currentOnHand = (int) $item->quantity_on_hand;
                $currentInitial = (int) ($item->initial_stock !== null ? $item->initial_stock : $currentOnHand);
                $validated['quantity_on_hand'] = $currentOnHand + $added;
                $validated['initial_stock'] = $currentInitial + $added;
            }
            unset($validated['added_stock']);
        }

        if (array_key_exists('compatible_brands', $validated) && is_array($validated['compatible_brands'])) {
            $validated['compatible_brands'] = implode(', ', array_filter(array_map('trim', $validated['compatible_brands'])));
        }

        // Auto-resolve folder_id or sub_category
        if (empty($validated['folder_id']) && ! empty($validated['sub_category'])) {
            $currentMode = $validated['inventory_mode'] ?? $item->inventory_mode ?? 'worker';
            $currentType = $validated['item_type'] ?? $item->item_type ?? 'Material';
            $currentSubtype = $validated['tool_subtype'] ?? $item->tool_subtype ?? 'hand';

            $fieldType = 'materials';
            if ($currentMode === 'sale') {
                $fieldType = 'sale_items';
            } elseif ($currentType === 'Tool') {
                $fieldType = $currentSubtype === 'power' ? 'power_tools' : 'hand_tools';
            } elseif ($currentType === 'Spare Part') {
                $fieldType = 'spare_parts';
            }

            $matched = DB::table('inventory_folders')->where('field_type', $fieldType)->where('name', $validated['sub_category'])->first();
            if ($matched) {
                $validated['folder_id'] = $matched->id;
            }
        } elseif (! empty($validated['folder_id']) && empty($validated['sub_category'])) {
            $matched = DB::table('inventory_folders')->where('id', $validated['folder_id'])->first();
            if ($matched) {
                $validated['sub_category'] = $matched->name;
            }
        }

        if (! empty($validated)) {
            DB::table('inventory_items')->where('item_id', $itemId)->update(array_merge($validated, ['last_updated' => now()]));
        }

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Updated inventory item %s.', $item->item_name));

        return response()->json([
            'message' => 'Inventory item updated successfully.',
            'data' => $this->getInventoryItemById($itemId),
        ]);
    }

    public function archiveInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();
        if (! $item) {
            abort(404);
        }
        if ($item->inventory_mode === 'sale') {
            abort(403, 'Tools Man can only manage worker inventory.');
        }

        DB::table('inventory_items')->where('item_id', $itemId)->update([
            'is_archived' => true,
            'archived_at' => now(),
            'last_updated' => now(),
        ]);

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Archived inventory item %s.', $item->item_name));

        return response()->json([
            'message' => sprintf('Inventory item "%s" has been archived.', $item->item_name),
            'data' => $this->getInventoryItemById($itemId),
        ]);
    }

    public function restoreInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();
        if (! $item) {
            abort(404);
        }
        if ($item->inventory_mode === 'sale') {
            abort(403, 'Tools Man can only manage worker inventory.');
        }

        DB::table('inventory_items')->where('item_id', $itemId)->update([
            'is_archived' => false,
            'archived_at' => null,
            'last_updated' => now(),
        ]);

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Restored inventory item %s.', $item->item_name));

        return response()->json([
            'message' => sprintf('Inventory item "%s" has been restored.', $item->item_name),
            'data' => $this->getInventoryItemById($itemId),
        ]);
    }

    public function destroyInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();
        if (! $item) {
            abort(404);
        }
        if ($item->inventory_mode === 'sale') {
            abort(403, 'Tools Man can only manage worker inventory.');
        }

        DB::table('inventory_items')->where('item_id', $itemId)->update([
            'is_archived' => true,
            'archived_at' => now(),
            'last_updated' => now(),
        ]);
        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Archived inventory item %s.', $item->item_name));

        return response()->json(['message' => sprintf('Inventory item "%s" archived successfully.', $item->item_name)]);
    }

    public function checkoutItem(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $validated = $request->validate([
            'item_id' => ['required', 'integer'],
            'technician_id' => ['nullable', 'integer'],
            'technician_name' => ['required', 'string', 'max:150'],
            'service_name' => ['required', 'string', 'max:150'],
            'checkout_date' => ['nullable'],
            'quantity' => ['required', 'integer', 'min:1'],
            'log_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $item = DB::table('inventory_items')->where('item_id', $validated['item_id'])->first();
        if (! $item) {
            abort(404, 'Inventory item not found.');
        }

        $qty = (int) $validated['quantity'];
        $checkoutDate = ! empty($validated['checkout_date']) ? Carbon::parse($validated['checkout_date']) : now();
        $logType = $validated['log_type'] ?? ($item->item_type === 'Material' ? 'material_usage' : 'borrow');

        if ($item->item_type === 'Tool' && $item->tool_subtype === 'power') {
            if ($item->status === 'Borrowed') {
                return response()->json(['message' => 'This power tool is currently checked out.'], 422);
            }
            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                'status' => 'Borrowed',
                'last_updated' => now(),
            ]);
            $status = 'Checked Out';
        } else {
            if ((int) $item->quantity_on_hand < $qty) {
                return response()->json([
                    'message' => "Insufficient stock. Only {$item->quantity_on_hand} {$item->unit} available.",
                ], 422);
            }
            $newQty = max(0, (int) $item->quantity_on_hand - $qty);
            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                'quantity_on_hand' => $newQty,
                'last_updated' => now(),
            ]);
            $status = $logType === 'material_usage' ? 'Used / Consumed' : 'Checked Out';
        }

        $checkoutId = DB::table('tool_checkouts')->insertGetId([
            'item_id' => $item->item_id,
            'item_name' => $item->item_name,
            'item_type' => $item->item_type,
            'log_type' => $logType,
            'technician_id' => $validated['technician_id'] ?? null,
            'technician_name' => $validated['technician_name'],
            'service_name' => $validated['service_name'],
            'quantity' => $qty,
            'checkout_date' => $checkoutDate,
            'status' => $status,
            'notes' => $validated['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'checkout_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf(
                '%s %s of "%s" to %s for service "%s".',
                $logType === 'material_usage' ? 'Logged usage of' : 'Checked out',
                "{$qty} {$item->unit}",
                $item->item_name,
                $validated['technician_name'],
                $validated['service_name']
            )
        );

        $checkout = DB::table('tool_checkouts')->where('checkout_id', $checkoutId)->first();
        $updatedItem = $this->getInventoryItemById($item->item_id);

        return response()->json([
            'message' => sprintf(
                '%s recorded successfully for %s.',
                $logType === 'material_usage' ? 'Material usage' : 'Tool checkout',
                $validated['technician_name']
            ),
            'item' => $updatedItem,
            'checkout' => $checkout,
        ]);
    }

    public function returnItem(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $validated = $request->validate([
            'item_id' => ['required', 'integer'],
            'checkout_id' => ['nullable', 'integer'],
            'return_date' => ['nullable'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $item = DB::table('inventory_items')->where('item_id', $validated['item_id'])->first();
        if (! $item) {
            abort(404, 'Inventory item not found.');
        }

        $qty = (int) ($validated['quantity'] ?? 1);
        $returnDate = ! empty($validated['return_date']) ? Carbon::parse($validated['return_date']) : now();

        if ($item->item_type === 'Tool' && $item->tool_subtype === 'power') {
            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                'status' => 'Available',
                'last_updated' => now(),
            ]);
        } else {
            $maxStock = (int) ($item->initial_stock ?? ($item->quantity_on_hand + $qty));
            $newQty = min($maxStock, (int) $item->quantity_on_hand + $qty);
            DB::table('inventory_items')->where('item_id', $item->item_id)->update([
                'quantity_on_hand' => $newQty,
                'last_updated' => now(),
            ]);
        }

        $checkoutQuery = DB::table('tool_checkouts')->where('item_id', $item->item_id)->where('status', 'Checked Out');
        if (! empty($validated['checkout_id'])) {
            $checkoutQuery->where('checkout_id', $validated['checkout_id']);
        }

        $activeCheckout = $checkoutQuery->latest('checkout_date')->first();
        if ($activeCheckout) {
            DB::table('tool_checkouts')->where('checkout_id', $activeCheckout->checkout_id)->update([
                'return_date' => $returnDate,
                'status' => 'Returned',
                'notes' => $validated['notes'] ?? $activeCheckout->notes,
                'updated_at' => now(),
            ]);
        }

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Returned %s of "%s".', "{$qty} {$item->unit}", $item->item_name)
        );

        return response()->json([
            'message' => sprintf('Item "%s" returned and marked available.', $item->item_name),
            'item' => $this->getInventoryItemById($item->item_id),
        ]);
    }

    public function checkoutsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $logs = DB::table('tool_checkouts')
            ->leftJoin('inventory_items', 'inventory_items.item_id', '=', 'tool_checkouts.item_id')
            ->leftJoin('users', 'users.user_id', '=', 'tool_checkouts.technician_id')
            ->leftJoin('bookings', 'bookings.booking_id', '=', 'tool_checkouts.booking_id')
            ->leftJoin('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->leftJoin('tool_checklists', 'tool_checklists.booking_id', '=', 'tool_checkouts.booking_id')
            ->leftJoin('technician_teams', 'technician_teams.team_id', '=', 'tool_checklists.team_id')
            ->leftJoin('tool_checklist_items', function ($join) {
                $join->on('tool_checklist_items.checklist_id', '=', 'tool_checklists.checklist_id')
                    ->on('tool_checklist_items.item_id', '=', 'tool_checkouts.item_id');
            })
            ->select([
                'tool_checkouts.*',
                'inventory_items.item_name as inventory_item_name',
                'inventory_items.item_type as inventory_item_type',
                'inventory_items.tool_subtype',
                'inventory_items.serial_number',
                'inventory_items.unit',
                'users.given_name as tech_given_name',
                'users.last_name as tech_last_name',
                'users.email as tech_email',
                'clients.given_name as client_given_name',
                'clients.last_name as client_last_name',
                'tool_checklists.checklist_id as linked_checklist_id',
                'tool_checklists.status as checklist_status',
                'tool_checklists.notes as checklist_notes',
                'technician_teams.team_name as checklist_team_name',
                'tool_checklist_items.status as checklist_item_status',
                'tool_checklist_items.notes as checklist_item_notes',
            ])
            ->orderByDesc('tool_checkouts.checkout_date')
            ->orderByDesc('tool_checkouts.checkout_id')
            ->get()
            ->map(function ($row) {
                $techName = $row->technician_name;
                if (empty($techName) && (! empty($row->tech_given_name) || ! empty($row->tech_last_name))) {
                    $techName = trim("{$row->tech_given_name} {$row->tech_last_name}");
                }

                $itemType = $row->item_type ?: ($row->inventory_item_type ?: 'Tool');
                $isMaterial = strtolower($itemType) === 'material' || ($row->log_type ?? '') === 'material_usage';
                $itemClStatus = strtolower($row->checklist_item_status ?? '');

                $status = $row->status ?: 'Checked Out';
                if ($isMaterial) {
                    $status = 'Used / Consumed';
                } elseif ($itemClStatus === 'returned') {
                    $status = 'Returned';
                } elseif ($itemClStatus === 'damaged') {
                    $status = 'Damaged';
                } elseif ($itemClStatus === 'lost') {
                    $status = 'Lost';
                }

                $clientName = trim(($row->client_given_name ?? '').' '.($row->client_last_name ?? ''));
                $description = $row->notes;

                if (! empty($row->linked_checklist_id)) {
                    $disposition = match (true) {
                        $isMaterial || $itemClStatus === 'consumed' => 'Material consumed during service work',
                        $itemClStatus === 'returned' || $status === 'Returned' => 'Tool returned & verified in good condition',
                        $itemClStatus === 'damaged' || $status === 'Damaged' => 'Tool reported damaged during return inspection',
                        $itemClStatus === 'lost' || $status === 'Lost' || $status === 'Lost/Damaged' => 'Tool unreturned / reported lost after service',
                        default => 'Tool issued to field crew (awaiting return)',
                    };

                    $parts = [
                        sprintf('Checklist #%d (%s)', (int) $row->linked_checklist_id, $row->checklist_status ?: 'Approved'),
                    ];

                    if (! empty($row->booking_id)) {
                        $parts[] = $clientName !== ''
                            ? sprintf('Booking #%d (%s)', (int) $row->booking_id, $clientName)
                            : sprintf('Booking #%d', (int) $row->booking_id);
                    }

                    if (! empty($row->checklist_team_name)) {
                        $parts[] = 'Squad: '.$row->checklist_team_name;
                    }

                    $parts[] = $disposition;

                    if (! empty($row->checklist_item_notes)) {
                        $parts[] = 'Item Note: '.trim($row->checklist_item_notes);
                    } elseif (! empty($row->checklist_notes)) {
                        $parts[] = 'Checklist Note: '.trim($row->checklist_notes);
                    }

                    $description = implode(' • ', $parts);
                }

                return [
                    'checkout_id' => (int) $row->checkout_id,
                    'booking_id' => $row->booking_id ? (int) $row->booking_id : null,
                    'checklist_id' => $row->linked_checklist_id ? (int) $row->linked_checklist_id : null,
                    'checklist_status' => $row->checklist_status ?? null,
                    'checklist_item_status' => $row->checklist_item_status ?? null,
                    'team_name' => $row->checklist_team_name ?? null,
                    'client_name' => $clientName ?: null,
                    'checklist_notes' => $row->checklist_notes ?? null,
                    'checklist_item_notes' => $row->checklist_item_notes ?? null,
                    'item_id' => (int) $row->item_id,
                    'item_name' => $row->item_name ?: $row->inventory_item_name,
                    'item_type' => $itemType,
                    'tool_subtype' => $row->tool_subtype ?? null,
                    'serial_number' => $row->serial_number ?? null,
                    'unit' => $row->unit ?? 'pcs',
                    'log_type' => $isMaterial ? 'material_usage' : ($row->log_type ?? 'borrow'),
                    'technician_id' => $row->technician_id ? (int) $row->technician_id : null,
                    'technician_name' => $techName ?: 'Unassigned Worker',
                    'service_name' => $row->service_name ?: 'General Service Job',
                    'quantity' => (int) ($row->quantity ?: 1),
                    'checkout_date' => $row->checkout_date,
                    'return_date' => $row->return_date,
                    'status' => $status,
                    'notes' => $description,
                    'description' => $description,
                    'created_at' => $row->created_at,
                ];
            });

        return response()->json([
            'data' => $logs->values(),
        ]);
    }

    public function checkoutOptions(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $technicians = DB::table('users')
            ->whereIn('role_id', [5, 7])
            ->where('is_active', true)
            ->orderBy('given_name')
            ->get(['user_id', 'given_name', 'last_name', 'email'])
            ->map(fn ($u) => [
                'user_id' => $u->user_id,
                'name' => trim("{$u->given_name} {$u->last_name}"),
                'email' => $u->email,
            ]);

        $services = DB::table('services')
            ->orderBy('service_name')
            ->get(['service_id', 'service_name', 'base_price'])
            ->map(fn ($s) => [
                'service_id' => $s->service_id,
                'service_name' => $s->service_name,
                'price' => (float) ($s->base_price ?? 0),
            ]);

        $customers = DB::table('users')
            ->where('role_id', 6)
            ->where('is_active', true)
            ->orderBy('given_name')
            ->get(['user_id', 'given_name', 'middle_name', 'last_name', 'email', 'contact_number'])
            ->map(fn ($u) => [
                'user_id' => $u->user_id,
                'name' => trim("{$u->given_name} ".($u->middle_name ? "{$u->middle_name} " : '')."{$u->last_name}"),
                'email' => $u->email,
                'contact_number' => $u->contact_number,
            ]);

        return response()->json([
            'technicians' => $technicians,
            'services' => $services,
            'customers' => $customers,
        ]);
    }

    public function searchCustomers(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $q = trim((string) $request->query('q', ''));
        $query = DB::table('users')
            ->where('role_id', 6)
            ->where('is_active', true);

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('given_name', 'like', "%{$q}%")
                    ->orWhere('middle_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('contact_number', 'like', "%{$q}%");
            });
        }

        $customers = $query->orderBy('given_name')
            ->limit(30)
            ->get(['user_id', 'given_name', 'middle_name', 'last_name', 'email', 'contact_number'])
            ->map(fn ($u) => [
                'user_id' => $u->user_id,
                'name' => trim("{$u->given_name} ".($u->middle_name ? "{$u->middle_name} " : '')."{$u->last_name}"),
                'email' => $u->email,
                'contact_number' => $u->contact_number,
            ]);

        return response()->json([
            'data' => $customers,
        ]);
    }

    public function sellItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        return response()->json([
            'message' => 'Tools Man cannot sell inventory items. For-sale items are managed exclusively by Admin Assistant and Super Admin.',
        ], 403);
    }
}
