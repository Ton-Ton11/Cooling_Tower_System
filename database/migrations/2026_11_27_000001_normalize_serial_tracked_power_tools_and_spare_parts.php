<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Normalize all For-Sale Power Tools and Spare Parts as individual serial-numbered records
     * (never stacked by quantity, counted by registered serial numbers).
     */
    public function up(): void
    {
        if (! Schema::hasTable('inventory_items')) {
            return;
        }

        $now = now();

        // 1. Normalize Spare Parts (assign inferred type sub_category if empty, and split stacked quantities into individual serial rows)
        $spareParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->orderBy('item_id')
            ->get();

        foreach ($spareParts as $sp) {
            $statusLower = strtolower(trim((string) ($sp->status ?? 'Available')));
            $isOrderBase = ($sp->reservation_source === 'order_base') || $statusLower === 'order base';
            $isWarranty = (bool) ($sp->is_warranty_reserved ?? false) || $statusLower === 'warranty reserved';

            $inferredSubCat = $sp->sub_category;
            if (empty($inferredSubCat)) {
                $nameLower = strtolower((string) $sp->item_name);
                if (str_contains($nameLower, 'capacitor')) {
                    $inferredSubCat = 'Capacitors';
                } elseif (str_contains($nameLower, 'pcb') || str_contains($nameLower, 'remote') || str_contains($nameLower, 'control')) {
                    $inferredSubCat = 'PCBs & Controls';
                } elseif (str_contains($nameLower, 'contactor') || str_contains($nameLower, 'relay')) {
                    $inferredSubCat = 'Contactors & Relays';
                } elseif (str_contains($nameLower, 'valve') || str_contains($nameLower, 'eev') || str_contains($nameLower, 'coil')) {
                    $inferredSubCat = 'Valves & Coils';
                } elseif (str_contains($nameLower, 'fan') || str_contains($nameLower, 'motor')) {
                    $inferredSubCat = 'Fan Motors';
                } elseif (str_contains($nameLower, 'sensor') || str_contains($nameLower, 'thermistor')) {
                    $inferredSubCat = 'Sensors & Thermistors';
                } elseif (str_contains($nameLower, 'filter') || str_contains($nameLower, 'drier')) {
                    $inferredSubCat = 'Filters & Driers';
                } else {
                    $inferredSubCat = 'Hardware & Accessories';
                }
            }

            if ($isOrderBase || $isWarranty) {
                DB::table('inventory_items')
                    ->where('item_id', $sp->item_id)
                    ->update([
                        'sub_category' => $inferredSubCat,
                        'initial_stock' => 1,
                        'reorder_level' => 0,
                        'quantity_on_hand' => $isWarranty ? 1 : 0,
                        'last_updated' => $now,
                    ]);
                continue;
            }

            $qty = max(1, (int) ($sp->quantity_on_hand ?? 1));
            $baseSerial = ! empty($sp->serial_number)
                ? trim((string) $sp->serial_number)
                : 'SP-' . str_pad((string) $sp->item_id, 3, '0', STR_PAD_LEFT);

            $firstSerial = $qty === 1 && ! empty($sp->serial_number)
                ? $baseSerial
                : ($baseSerial . '-001');

            $isAvail = in_array($statusLower, ['available', 'available / on hand', 'low stock'], true);

            DB::table('inventory_items')
                ->where('item_id', $sp->item_id)
                ->update([
                    'inventory_mode' => 'sale',
                    'sub_category' => $inferredSubCat,
                    'serial_number' => $firstSerial,
                    'quantity_on_hand' => $isAvail ? 1 : 0,
                    'initial_stock' => 1,
                    'reorder_level' => 0,
                    'status' => $isAvail ? 'Available' : $sp->status,
                    'last_updated' => $now,
                ]);

            if ($isAvail && $qty > 1) {
                for ($i = 2; $i <= $qty; $i++) {
                    $nextSerial = $baseSerial . '-' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
                    if (DB::table('inventory_items')->where('serial_number', $nextSerial)->exists()) {
                        continue;
                    }
                    DB::table('inventory_items')->insert([
                        'item_name' => $sp->item_name,
                        'item_type' => 'Spare Part',
                        'inventory_mode' => 'sale',
                        'tool_subtype' => null,
                        'folder_id' => $sp->folder_id,
                        'sub_category' => $inferredSubCat,
                        'compatible_brands' => $sp->compatible_brands,
                        'serial_number' => $nextSerial,
                        'quantity_on_hand' => 1,
                        'initial_stock' => 1,
                        'reorder_level' => 0,
                        'unit' => $sp->unit ?: 'pc',
                        'capital' => $sp->capital ?? 0,
                        'profit' => $sp->profit ?? 0,
                        'selling_price' => $sp->selling_price,
                        'supplier_name' => $sp->supplier_name,
                        'managed_by' => $sp->managed_by ?? 'Admin Assistant',
                        'is_archived' => (bool) ($sp->is_archived ?? false),
                        'status' => 'Available',
                        'created_at' => $now,
                        'last_updated' => $now,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Normalization into individual serial records cannot be losslessly undone.
    }
};
