<?php

namespace App\Http\Controllers\ToolsMan;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ToolsManDashboardController extends ToolsManBaseController
{
    public function dashboard(): Response
    {
        return Inertia::render('ToolsMan/Dashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $stats = [
            'total_items'    => DB::table('inventory_items')->count(),
            'low_stock_items' => DB::table('inventory_items')->whereColumn('quantity_on_hand', '<=', 'reorder_level')->count(),
            'total_tools'    => DB::table('inventory_items')->where('item_type', 'Tool')->count(),
            'total_materials' => DB::table('inventory_items')->where('item_type', 'Material')->count(),
            'announcements'  => DB::table('announcements')->count(),
        ];

        $recentItems = DB::table('inventory_items')
            ->orderByDesc('last_updated')
            ->limit(5)
            ->get();

        return response()->json([
            'stats'        => $stats,
            'recent_items' => $recentItems->map(fn ($item) => [
                'item_id'          => (int) $item->item_id,
                'item_name'        => $item->item_name,
                'item_type'        => $item->item_type,
                'quantity_on_hand' => (int) $item->quantity_on_hand,
                'reorder_level'    => (int) $item->reorder_level,
                'low_stock'        => (int) $item->quantity_on_hand <= (int) $item->reorder_level,
                'unit'             => $item->unit,
                'last_updated'     => $item->last_updated,
            ])->values(),
        ]);
    }
}
