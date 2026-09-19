<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\InventoryFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InventoryFolderController extends Controller
{
    /**
     * List all inventory sub-folders with item counts.
     */
    public function index(Request $request): JsonResponse
    {
        $fieldType = $request->query('field_type');

        $query = InventoryFolder::query()->orderBy('display_order')->orderBy('name');

        if ($fieldType) {
            $query->where('field_type', $fieldType);
        }

        $folders = $query->get()->map(function ($folder) {
            // Count items belonging to this folder
            $itemsCount = DB::table('inventory_items')
                ->where(function ($q) use ($folder) {
                    $q->where('folder_id', $folder->id)
                      ->orWhere('sub_category', $folder->name);
                })
                ->count();

            $totalQuantity = DB::table('inventory_items')
                ->where(function ($q) use ($folder) {
                    $q->where('folder_id', $folder->id)
                      ->orWhere('sub_category', $folder->name);
                })
                ->sum('quantity_on_hand');

            return [
                'id' => (int) $folder->id,
                'field_type' => $folder->field_type,
                'name' => $folder->name,
                'description' => $folder->description,
                'icon' => $folder->icon,
                'display_order' => (int) $folder->display_order,
                'items_count' => (int) $itemsCount,
                'total_quantity' => (int) $totalQuantity,
                'created_at' => $folder->created_at,
            ];
        });

        // Group by field_type for convenient client consumption
        $grouped = $folders->groupBy('field_type');

        return response()->json([
            'data' => $folders,
            'grouped' => [
                'materials' => $grouped->get('materials', collect())->values(),
                'power_tools' => $grouped->get('power_tools', collect())->values(),
                'hand_tools' => $grouped->get('hand_tools', collect())->values(),
                'spare_parts' => $grouped->get('spare_parts', collect())->values(),
                'sale_items' => $grouped->get('sale_items', collect())->values(),
            ],
        ]);
    }

    /**
     * Store a newly created sub-folder.
     */
    public function store(Request $request): JsonResponse
    {
        $currentUser = $request->user();

        $validated = $request->validate([
            'field_type' => ['required', Rule::in(['materials', 'power_tools', 'hand_tools', 'spare_parts', 'sale_items'])],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $maxOrder = InventoryFolder::where('field_type', $validated['field_type'])->max('display_order') ?? 0;

        $folder = InventoryFolder::create([
            'field_type' => $validated['field_type'],
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'display_order' => $maxOrder + 1,
            'created_by' => $currentUser ? $currentUser->user_id : null,
        ]);

        $this->logActivity(
            $currentUser ? (int) $currentUser->user_id : 1,
            'CREATE',
            sprintf('Created inventory sub-category "%s" in %s.', $folder->name, ucwords(str_replace('_', ' ', $folder->field_type)))
        );

        return response()->json([
            'message' => sprintf('Sub-category "%s" created successfully!', $folder->name),
            'data' => [
                'id' => (int) $folder->id,
                'field_type' => $folder->field_type,
                'name' => $folder->name,
                'description' => $folder->description,
                'icon' => $folder->icon,
                'display_order' => (int) $folder->display_order,
                'items_count' => 0,
                'total_quantity' => 0,
                'created_at' => $folder->created_at,
            ],
        ], 201);
    }

    /**
     * Update an existing sub-category.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        $folder = InventoryFolder::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $oldName = $folder->name;
        $newName = trim($validated['name']);

        $folder->update([
            'name' => $newName,
            'description' => $validated['description'] ?? null,
        ]);

        // Sync item sub_category name if changed
        if ($oldName !== $newName) {
            DB::table('inventory_items')
                ->where('folder_id', $id)
                ->update(['sub_category' => $newName]);
        }

        $this->logActivity(
            $currentUser ? (int) $currentUser->user_id : 1,
            'UPDATE',
            sprintf('Updated inventory sub-category "%s".', $newName)
        );

        return response()->json([
            'message' => sprintf('Sub-category "%s" updated successfully.', $newName),
            'data' => $folder->fresh(),
        ]);
    }

    /**
     * Delete a sub-category safely.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        $folder = InventoryFolder::findOrFail($id);

        $name = $folder->name;
        $fieldType = $folder->field_type;

        // Reassign any items in this category to general uncategorized
        $defaultFolderName = 'General ' . ucwords(str_replace('_', ' ', $fieldType));
        $defaultFolder = InventoryFolder::where('field_type', $fieldType)
            ->where('id', '!=', $id)
            ->first();

        DB::table('inventory_items')
            ->where('folder_id', $id)
            ->update([
                'folder_id' => $defaultFolder ? $defaultFolder->id : null,
                'sub_category' => $defaultFolder ? $defaultFolder->name : $defaultFolderName,
            ]);

        $folder->delete();

        $this->logActivity(
            $currentUser ? (int) $currentUser->user_id : 1,
            'DELETE',
            sprintf('Deleted inventory sub-category "%s".', $name)
        );

        return response()->json([
            'message' => sprintf('Sub-category "%s" deleted successfully. Items were moved to default category.', $name),
        ]);
    }

    protected function logActivity(int $userId, string $actionType, string $description): void
    {
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
