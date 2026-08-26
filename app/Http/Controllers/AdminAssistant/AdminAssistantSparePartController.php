<?php

namespace App\Http\Controllers\AdminAssistant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAssistantSparePartController extends AdminAssistantBaseController
{
    public function sparePartsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $items = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->orderBy('item_name')
            ->get();

        return response()->json([
            'data' => $items->map(fn ($item) => $this->formatSparePart($item))->values(),
        ]);
    }

    public function storeSparePart(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $payload = $this->normalizeSparePartPayload($request);

        $validated = validator($payload, [
            'item_name' => ['required', 'string', 'max:100'],
            'compatible_brands' => ['nullable'],
            'folder_id' => ['nullable', 'integer'],
            'sub_category' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'quantity_on_hand' => ['required', 'integer', 'min:0'],
            'initial_stock' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'unit' => ['required', 'string', 'max:20'],
            'capital' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'numeric', 'min:0'],
            'profit' => ['sometimes', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'status' => ['sometimes', 'string', 'max:50'],
        ])->validate();

        $brands = $validated['compatible_brands'] ?? null;
        if (is_array($brands)) {
            $brands = implode(', ', array_filter(array_map('trim', $brands)));
        }

        $capital = (float) ($validated['capital'] ?? 0);
        $sellingPrice = isset($validated['selling_price']) ? (float) $validated['selling_price'] : null;
        $profit = isset($validated['profit'])
            ? (float) $validated['profit']
            : ($sellingPrice !== null ? max(0, $sellingPrice - $capital) : 0);

        if ($sellingPrice === null && $profit > 0) {
            $sellingPrice = $capital + $profit;
        }

        $qty = (int) $validated['quantity_on_hand'];
        $reorder = (int) $validated['reorder_level'];
        $subCat = $validated['sub_category'] ?? ($validated['category'] ?? null);
        $folderId = $validated['folder_id'] ?? null;

        if (empty($folderId) && !empty($subCat)) {
            $matched = DB::table('inventory_folders')->where('field_type', 'spare_parts')->where('name', $subCat)->first();
            if ($matched) {
                $folderId = $matched->id;
            }
        } elseif (!empty($folderId) && empty($subCat)) {
            $matched = DB::table('inventory_folders')->where('id', $folderId)->first();
            if ($matched) {
                $subCat = $matched->name;
            }
        }

        $status = $validated['status'] ?? ($qty === 0 ? 'Out of Stock' : ($qty <= $reorder ? 'Low Stock' : 'Available / On Hand'));

        $insertData = [
            'item_name' => $validated['item_name'],
            'item_type' => 'Spare Part',
            'inventory_mode' => 'spare_part',
            'compatible_brands' => $brands,
            'folder_id' => $folderId,
            'sub_category' => $subCat,
            'quantity_on_hand' => $qty,
            'initial_stock' => $validated['initial_stock'] ?? $qty,
            'reorder_level' => $reorder,
            'unit' => $validated['unit'],
            'capital' => $capital,
            'selling_price' => $sellingPrice,
            'profit' => $profit,
            'supplier_name' => $validated['supplier_name'] ?? null,
            'status' => $status,
            'created_at' => now(),
            'last_updated' => now(),
        ];

        $itemId = DB::table('inventory_items')->insertGetId($insertData, 'item_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Added spare part "%s".', $validated['item_name'])
        );

        $created = DB::table('inventory_items')->where('item_id', $itemId)->first();

        return response()->json([
            'message' => 'Spare part added to inventory successfully.',
            'data' => $this->formatSparePart($created),
        ], 201);
    }

    public function updateSparePart(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->where('item_type', 'Spare Part')->first();

        if (! $item) {
            abort(404);
        }

        $payload = $this->normalizeSparePartPayload($request);

        $validated = validator($payload, [
            'item_name' => ['sometimes', 'string', 'max:100'],
            'compatible_brands' => ['nullable'],
            'folder_id' => ['nullable', 'integer'],
            'sub_category' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'initial_stock' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:20'],
            'capital' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'profit' => ['sometimes', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'status' => ['sometimes', 'string', 'max:50'],
        ])->validate();

        $updateData = [];

        if (array_key_exists('item_name', $validated)) {
            $updateData['item_name'] = $validated['item_name'];
        }

        if (array_key_exists('compatible_brands', $validated)) {
            $brands = $validated['compatible_brands'];
            if (is_array($brands)) {
                $brands = implode(', ', array_filter(array_map('trim', $brands)));
            }
            $updateData['compatible_brands'] = $brands;
        }

        $subCat = $validated['sub_category'] ?? ($validated['category'] ?? null);
        $folderId = $validated['folder_id'] ?? null;

        if (array_key_exists('sub_category', $validated) || array_key_exists('category', $validated)) {
            $updateData['sub_category'] = $subCat;
            if (empty($folderId) && !empty($subCat)) {
                $matched = DB::table('inventory_folders')->where('field_type', 'spare_parts')->where('name', $subCat)->first();
                if ($matched) {
                    $updateData['folder_id'] = $matched->id;
                }
            }
        }

        if (array_key_exists('folder_id', $validated)) {
            $updateData['folder_id'] = $folderId;
            if (!empty($folderId) && empty($subCat)) {
                $matched = DB::table('inventory_folders')->where('id', $folderId)->first();
                if ($matched) {
                    $updateData['sub_category'] = $matched->name;
                }
            }
        }

        if (array_key_exists('quantity_on_hand', $validated)) {
            $updateData['quantity_on_hand'] = (int) $validated['quantity_on_hand'];
        }

        if (array_key_exists('initial_stock', $validated)) {
            $updateData['initial_stock'] = (int) $validated['initial_stock'];
        }

        if (array_key_exists('reorder_level', $validated)) {
            $updateData['reorder_level'] = (int) $validated['reorder_level'];
        }

        if (array_key_exists('unit', $validated)) {
            $updateData['unit'] = $validated['unit'];
        }

        if (array_key_exists('capital', $validated)) {
            $updateData['capital'] = (float) $validated['capital'];
        }

        if (array_key_exists('selling_price', $validated)) {
            $updateData['selling_price'] = $validated['selling_price'] !== null ? (float) $validated['selling_price'] : null;
        }

        if (array_key_exists('profit', $validated)) {
            $updateData['profit'] = (float) $validated['profit'];
        }

        if (array_key_exists('supplier_name', $validated)) {
            $updateData['supplier_name'] = $validated['supplier_name'];
        }

        if (array_key_exists('status', $validated)) {
            $updateData['status'] = $validated['status'];
        } elseif (array_key_exists('quantity_on_hand', $validated) || array_key_exists('reorder_level', $validated)) {
            $qty = (int) ($validated['quantity_on_hand'] ?? $item->quantity_on_hand);
            $reorder = (int) ($validated['reorder_level'] ?? $item->reorder_level);
            $updateData['status'] = $qty === 0 ? 'Out of Stock' : ($qty <= $reorder ? 'Low Stock' : ($item->status ?? 'Available / On Hand'));
        }

        $updateData['last_updated'] = now();

        DB::table('inventory_items')->where('item_id', $itemId)->update($updateData);

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Updated spare part "%s".', $validated['item_name'] ?? $item->item_name)
        );

        $updated = DB::table('inventory_items')->where('item_id', $itemId)->first();

        return response()->json([
            'message' => 'Spare part updated successfully.',
            'data' => $this->formatSparePart($updated),
        ]);
    }

    public function destroySparePart(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->where('item_type', 'Spare Part')->first();

        if (! $item) {
            abort(404);
        }

        DB::table('inventory_items')->where('item_id', $itemId)->delete();

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Deleted spare part "%s".', $item->item_name)
        );

        return response()->json(['message' => 'Spare part deleted successfully.']);
    }
}
