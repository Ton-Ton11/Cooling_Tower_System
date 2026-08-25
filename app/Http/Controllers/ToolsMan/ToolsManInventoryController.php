<?php

namespace App\Http\Controllers\ToolsMan;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ToolsManInventoryController extends ToolsManBaseController
{
    public function inventoryIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $items = DB::table('inventory_items')
            ->orderBy('inventory_mode')
            ->orderBy('item_type')
            ->orderBy('item_name')
            ->get();

        return response()->json([
            'data' => $items->map(function ($item) {
                $brands = ! empty($item->compatible_brands)
                    ? array_values(array_filter(array_map('trim', explode(',', $item->compatible_brands))))
                    : [];
                $capital      = $item->capital !== null ? (float) $item->capital : 0.0;
                $profit       = $item->profit !== null ? (float) $item->profit : 0.0;
                $sellingPrice = $item->selling_price !== null ? (float) $item->selling_price : ($capital + $profit);

                return [
                    'item_id'          => (int) $item->item_id,
                    'item_name'        => $item->item_name,
                    'item_type'        => $item->item_type,
                    'inventory_mode'   => $item->inventory_mode ?? 'worker',
                    'tool_subtype'     => $item->tool_subtype ?? null,
                    'compatible_brands' => $brands,
                    'serial_number'    => $item->serial_number ?? null,
                    'quantity_on_hand' => (int) $item->quantity_on_hand,
                    'initial_stock'    => $item->initial_stock !== null ? (int) $item->initial_stock : (int) $item->quantity_on_hand,
                    'reorder_level'    => (int) $item->reorder_level,
                    'unit'             => $item->unit,
                    'capital'          => $capital,
                    'profit'           => $profit,
                    'selling_price'    => $sellingPrice,
                    'supplier_name'    => $item->supplier_name ?? null,
                    'status'           => $item->status ?? 'Available',
                    'added_at'         => $item->created_at ?? $item->last_updated,
                    'last_updated'     => $item->last_updated,
                    'low_stock'        => (int) $item->quantity_on_hand <= (int) $item->reorder_level,
                ];
            })->values(),
        ]);
    }

    public function storeInventoryItem(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $validated = $request->validate([
            'item_name'        => ['required', 'string', 'max:100'],
            'item_type'        => ['required', Rule::in(self::INVENTORY_ITEM_TYPES)],
            'inventory_mode'   => ['sometimes', Rule::in(self::INVENTORY_MODES)],
            'tool_subtype'     => ['sometimes', 'nullable', Rule::in(self::TOOL_SUBTYPES)],
            'folder_id'        => ['sometimes', 'nullable', 'integer'],
            'sub_category'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'compatible_brands' => ['sometimes', 'nullable'],
            'serial_number'    => ['nullable', 'string', 'max:100', 'unique:inventory_items,serial_number'],
            'quantity_on_hand' => ['required', 'integer', 'min:0'],
            'initial_stock'    => ['sometimes', 'integer', 'min:0'],
            'reorder_level'    => ['required', 'integer', 'min:0'],
            'unit'             => ['required', 'string', 'max:20'],
            'capital'          => ['sometimes', 'numeric', 'min:0'],
            'profit'           => ['sometimes', 'numeric', 'min:0'],
            'selling_price'    => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'supplier_name'    => ['nullable', 'string', 'max:150'],
            'status'           => ['sometimes', Rule::in(['Available', 'Borrowed', 'Lost/Damaged'])],
        ]);

        $validated['inventory_mode'] = $validated['inventory_mode'] ?? 'worker';
        $validated['initial_stock']  = $validated['initial_stock'] ?? $validated['quantity_on_hand'];
        $validated['capital']        = $validated['capital'] ?? 0;
        $validated['profit']         = $validated['profit'] ?? 0;
        $validated['status']         = $validated['status'] ?? 'Available';

        if (array_key_exists('compatible_brands', $validated) && is_array($validated['compatible_brands'])) {
            $validated['compatible_brands'] = implode(', ', array_filter(array_map('trim', $validated['compatible_brands'])));
        }

        if (($validated['tool_subtype'] ?? null) === 'power' && empty($validated['serial_number'])) {
            throw ValidationException::withMessages(['serial_number' => ['Serial number is required for power tools.']]);
        }

        $itemId = DB::table('inventory_items')->insertGetId(array_merge($validated, [
            'created_at'   => now(),
            'last_updated' => now(),
        ]), 'item_id');

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Created inventory item %s (%s).', $validated['item_name'], $validated['inventory_mode']));

        return response()->json([
            'message' => 'Inventory item created successfully.',
            'data'    => $this->getInventoryItemById($itemId),
        ], 201);
    }

    public function updateInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();
        if (! $item) { abort(404); }

        $validated = $request->validate([
            'item_name'        => ['sometimes', 'string', 'max:100'],
            'item_type'        => ['sometimes', Rule::in(self::INVENTORY_ITEM_TYPES)],
            'inventory_mode'   => ['sometimes', Rule::in(self::INVENTORY_MODES)],
            'tool_subtype'     => ['sometimes', 'nullable', Rule::in(self::TOOL_SUBTYPES)],
            'folder_id'        => ['sometimes', 'nullable', 'integer'],
            'sub_category'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'compatible_brands' => ['sometimes', 'nullable'],
            'serial_number'    => ['nullable', 'string', 'max:100', Rule::unique('inventory_items', 'serial_number')->ignore($itemId, 'item_id')],
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'initial_stock'    => ['sometimes', 'integer', 'min:0'],
            'reorder_level'    => ['sometimes', 'integer', 'min:0'],
            'unit'             => ['sometimes', 'string', 'max:20'],
            'capital'          => ['sometimes', 'numeric', 'min:0'],
            'profit'           => ['sometimes', 'numeric', 'min:0'],
            'selling_price'    => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'supplier_name'    => ['nullable', 'string', 'max:150'],
            'status'           => ['sometimes', Rule::in(['Available', 'Borrowed', 'Lost/Damaged'])],
        ]);

        if (array_key_exists('compatible_brands', $validated) && is_array($validated['compatible_brands'])) {
            $validated['compatible_brands'] = implode(', ', array_filter(array_map('trim', $validated['compatible_brands'])));
        }

        if (! empty($validated)) {
            DB::table('inventory_items')->where('item_id', $itemId)->update(array_merge($validated, ['last_updated' => now()]));
        }

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Updated inventory item %s.', $item->item_name));

        return response()->json([
            'message' => 'Inventory item updated successfully.',
            'data'    => $this->getInventoryItemById($itemId),
        ]);
    }

    public function destroyInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();
        if (! $item) { abort(404); }

        DB::table('inventory_items')->where('item_id', $itemId)->delete();
        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Deleted inventory item %s.', $item->item_name));

        return response()->json(['message' => 'Inventory item deleted successfully.']);
    }
}
