<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Normalize all worker Power Tools as individual serialized items (quantity 1 when Available, 0 otherwise)
     * without stock-stacking or low-stock reorder thresholds.
     */
    public function up(): void
    {
        if (! Schema::hasTable('inventory_items')) {
            return;
        }

        $activeChecklistPowerIds = Schema::hasTable('tool_checklists') && Schema::hasTable('tool_checklist_items')
            ? DB::table('tool_checklist_items')
                ->join('tool_checklists', 'tool_checklists.checklist_id', '=', 'tool_checklist_items.checklist_id')
                ->where('tool_checklists.status', 'Approved')
                ->where('tool_checklist_items.status', 'assigned')
                ->pluck('tool_checklist_items.item_id')
                ->map(fn ($id) => (int) $id)
                ->all()
            : [];

        $powerTools = DB::table('inventory_items')
            ->whereRaw("LOWER(COALESCE(item_type, '')) = 'tool'")
            ->whereRaw("LOWER(COALESCE(tool_subtype, '')) LIKE '%power%'")
            ->get(['item_id', 'status']);

        foreach ($powerTools as $tool) {
            $statusLower = strtolower((string) ($tool->status ?? 'available'));
            $isDamagedOrLost = in_array($statusLower, ['damaged', 'lost', 'lost/damaged', 'broken'], true);
            $isAssigned = in_array((int) $tool->item_id, $activeChecklistPowerIds, true);
            $isBorrowed = $isAssigned || $statusLower === 'borrowed';

            $nextStatus = $isDamagedOrLost
                ? $tool->status
                : ($isBorrowed ? 'Borrowed' : 'Available');

            DB::table('inventory_items')
                ->where('item_id', $tool->item_id)
                ->update([
                    'quantity_on_hand' => $nextStatus === 'Available' ? 1 : 0,
                    'initial_stock' => 1,
                    'reorder_level' => 0,
                    'status' => $nextStatus,
                    'last_updated' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Data normalization is non-destructive and irreversible without original stacked counts.
    }
};
