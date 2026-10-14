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
            ->limit(6)
            ->get();

        $announcements = DB::table('announcements')
            ->join('users as creators', 'creators.user_id', '=', 'announcements.created_by')
            ->select([
                'announcements.id',
                'announcements.title',
                'announcements.message',
                'announcements.created_at',
                DB::raw("TRIM(CONCAT_WS(' ', creators.given_name, creators.middle_name, creators.last_name)) as author_name"),
            ])
            ->orderByDesc('announcements.created_at')
            ->limit(4)
            ->get();

        $lowStockItems = DB::table('inventory_items')
            ->whereColumn('quantity_on_hand', '<=', 'reorder_level')
            ->orderBy('quantity_on_hand')
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
            'low_stock_items' => $lowStockItems->map(fn ($item) => [
                'item_id'          => (int) $item->item_id,
                'item_name'        => $item->item_name,
                'item_type'        => $item->item_type,
                'quantity_on_hand' => (int) $item->quantity_on_hand,
                'reorder_level'    => (int) $item->reorder_level,
                'unit'             => $item->unit,
            ])->values(),
            'announcements' => $announcements,
        ]);
    }
}
