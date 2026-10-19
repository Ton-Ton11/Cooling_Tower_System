<?php

namespace App\Http\Controllers\ToolsMan;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ToolsManSparePartController extends ToolsManBaseController
{
    public function sparePartsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        app(\App\Services\ForecastingService::class)->syncExpiredAcWarrantiesAndReleaseParts();

        $items = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->orderBy('item_name')
            ->get();

        $soldRecords = [];
        if (Schema::hasTable('inventory_sales')) {
            $soldRecords = DB::table('inventory_sales')
                ->where('sale_type', 'spare_part')
                ->orderByDesc('sold_at')
                ->orderByDesc('sale_id')
                ->get()
                ->values();
        }

        return response()->json([
            'data' => $items->map(fn ($item) => $this->formatSparePart($item))->values(),
            'sold_records' => $soldRecords,
        ]);
    }

    public function storeSparePart(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $payload   = $this->normalizeSparePartPayload($request);
        $validated = validator($payload, [
            'item_name'        => ['required', 'string', 'max:100'],
            'compatible_brands' => ['nullable'],
            'folder_id'        => ['nullable', 'integer'],
            'sub_category'     => ['nullable', 'string', 'max:100'],
            'category'         => ['nullable', 'string', 'max:100'],
            'quantity_on_hand' => ['required', 'integer', 'min:0'],
            'initial_stock'    => ['sometimes', 'integer', 'min:0'],
            'reorder_level'    => ['required', 'integer', 'min:0'],
            'unit'             => ['required', 'string', 'max:20'],
            'capital'          => ['sometimes', 'numeric', 'min:0'],
            'selling_price'    => ['sometimes', 'numeric', 'min:0'],
            'profit'           => ['sometimes', 'numeric', 'min:0'],
            'supplier_name'    => ['nullable', 'string', 'max:150'],
            'status'           => ['sometimes', 'string', 'max:50'],
        ])->validate();

        $brands = $validated['compatible_brands'] ?? null;
        if (is_array($brands)) {
            $brands = implode(', ', array_filter(array_map('trim', $brands)));
        }

        $capital      = (float) ($validated['capital'] ?? 0);
        $sellingPrice = isset($validated['selling_price']) ? (float) $validated['selling_price'] : null;
        $profit       = isset($validated['profit']) ? (float) $validated['profit'] : ($sellingPrice !== null ? max(0, $sellingPrice - $capital) : 0);

        if ($sellingPrice === null && $profit > 0) {
            $sellingPrice = $capital + $profit;
        }

        $qty     = (int) $validated['quantity_on_hand'];
        $reorder = (int) $validated['reorder_level'];
        $subCat  = $validated['sub_category'] ?? ($validated['category'] ?? null);
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

        $status  = $validated['status'] ?? ($qty === 0 ? 'Out of Stock' : ($qty <= $reorder ? 'Low Stock' : 'Available / On Hand'));

        $itemId = DB::table('inventory_items')->insertGetId([
            'item_name'        => $validated['item_name'],
            'item_type'        => 'Spare Part',
            'inventory_mode'   => 'spare_part',
            'compatible_brands' => $brands,
            'folder_id'        => $folderId,
            'sub_category'     => $subCat,
            'quantity_on_hand' => $qty,
            'initial_stock'    => $validated['initial_stock'] ?? $qty,
            'reorder_level'    => $reorder,
            'unit'             => $validated['unit'],
            'capital'          => $capital,
            'selling_price'    => $sellingPrice,
            'profit'           => $profit,
            'supplier_name'    => $validated['supplier_name'] ?? null,
            'status'           => $status,
            'created_at'       => now(),
            'last_updated'     => now(),
        ], 'item_id');

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Created spare part %s.', $validated['item_name']));

        $created = DB::table('inventory_items')->where('item_id', $itemId)->first();

        return response()->json([
            'message' => 'Spare part created successfully.',
            'data'    => $this->formatSparePart($created),
        ], 201);
    }

    public function updateSparePart(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->where('item_type', 'Spare Part')->first();
        if (! $item) { abort(404); }

        $payload   = $this->normalizeSparePartPayload($request);
        $validated = validator($payload, [
            'item_name'        => ['sometimes', 'string', 'max:100'],
            'compatible_brands' => ['nullable'],
            'folder_id'        => ['nullable', 'integer'],
            'sub_category'     => ['nullable', 'string', 'max:100'],
            'category'         => ['nullable', 'string', 'max:100'],
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'initial_stock'    => ['sometimes', 'integer', 'min:0'],
            'reorder_level'    => ['sometimes', 'integer', 'min:0'],
            'unit'             => ['sometimes', 'string', 'max:20'],
            'capital'          => ['sometimes', 'numeric', 'min:0'],
            'selling_price'    => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'profit'           => ['sometimes', 'numeric', 'min:0'],
            'supplier_name'    => ['nullable', 'string', 'max:150'],
            'status'           => ['sometimes', 'string', 'max:50'],
        ])->validate();

        if (array_key_exists('compatible_brands', $validated) && is_array($validated['compatible_brands'])) {
            $validated['compatible_brands'] = implode(', ', array_filter(array_map('trim', $validated['compatible_brands'])));
        }

        $subCat = $validated['sub_category'] ?? ($validated['category'] ?? null);
        $folderId = $validated['folder_id'] ?? null;

        if (array_key_exists('sub_category', $validated) || array_key_exists('category', $validated)) {
            $validated['sub_category'] = $subCat;
            unset($validated['category']);
            if (empty($folderId) && !empty($subCat)) {
                $matched = DB::table('inventory_folders')->where('field_type', 'spare_parts')->where('name', $subCat)->first();
                if ($matched) {
                    $validated['folder_id'] = $matched->id;
                }
            }
        }

        if (array_key_exists('folder_id', $validated)) {
            $validated['folder_id'] = $folderId;
            if (!empty($folderId) && empty($subCat)) {
                $matched = DB::table('inventory_folders')->where('id', $folderId)->first();
                if ($matched) {
                    $validated['sub_category'] = $matched->name;
                }
            }
        }

        $isSale = $request->boolean('is_sale', false)
            || $request->filled('quantity_to_sell')
            || (($validated['status'] ?? null) === 'Sold' && $item->status !== 'Sold');

        $soldRecord = null;
        $bookingId = null;

        DB::transaction(function () use ($itemId, $item, $validated, $isSale, $request, &$soldRecord, &$bookingId) {
            if (! empty($validated)) {
                DB::table('inventory_items')->where('item_id', $itemId)->update(array_merge($validated, ['last_updated' => now()]));
            }

            if ($isSale) {
                $qtySold = max(1, (int) ($request->input('quantity_to_sell') ?: ((int) $item->quantity_on_hand - (int) ($validated['quantity_on_hand'] ?? 0)) ?: 1));
                $unitPrice = $request->filled('selling_price')
                    ? (float) $request->input('selling_price')
                    : (float) ($item->selling_price ?? ((float) $item->capital + (float) $item->profit));
                $costPrice = (float) ($item->capital ?? 0);
                $totalAmount = round($unitPrice * $qtySold, 2);
                $profit = round(($unitPrice - $costPrice) * $qtySold, 2);
                $paymentMethod = $request->input('payment_method', 'Cash') ?: 'Cash';

                $clientId = $request->input('client_id');
                $customerUser = $clientId ? DB::table('users')->where('user_id', $clientId)->first() : null;
                $customerName = trim((string) $request->input('customer_name', ''));
                if ($customerName === '' && $customerUser) {
                    $customerName = trim(($customerUser->given_name ?? '') . ' ' . ($customerUser->last_name ?? ''));
                }
                if ($customerName === '') {
                    $customerName = 'Walk-in Customer';
                }
                $customerContact = $request->input('customer_contact') ?: ($customerUser->contact_number ?? null);

                $bookingClientId = $customerUser?->user_id;
                if (! $bookingClientId) {
                    $fallbackCustomer = DB::table('users')->where('role_id', 6)->orderBy('user_id')->first()
                        ?: DB::table('users')->orderBy('user_id')->first();
                    $bookingClientId = $fallbackCustomer?->user_id;
                }

                $serviceName = 'Spare Part Sale: ' . mb_substr($item->item_name, 0, 75);
                $service = DB::table('services')->where('service_name', $serviceName)->first();
                if (! $service) {
                    $serviceId = DB::table('services')->insertGetId([
                        'service_name'  => $serviceName,
                        'description'   => 'Direct spare part sale: ' . $item->item_name,
                        'base_price'    => $unitPrice,
                        'is_active'     => 1,
                        'category'      => 'Spare Part Sale',
                        'display_order' => 99,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ], 'service_id');
                } else {
                    $serviceId = $service->service_id;
                }

                $paymentId = null;
                if ($bookingClientId) {
                    $bookingId = DB::table('bookings')->insertGetId([
                        'client_id'      => $bookingClientId,
                        'service_id'     => $serviceId,
                        'scheduled_date' => now(),
                        'booking_status' => 'Completed',
                        'notes'          => "Spare Part Sale: {$qtySold}x {$item->item_name} to {$customerName}",
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ], 'booking_id');

                    $paymentId = DB::table('payment')->insertGetId([
                        'booking_id'        => $bookingId,
                        'booking_price'     => $totalAmount,
                        'unit_price'        => 0.00,
                        'spare_parts_price' => $totalAmount,
                        'amount_paid'       => $totalAmount,
                        'payment_status'    => 'Paid',
                        'payment_method'    => $paymentMethod,
                        'payment_type'      => 'Full Payment',
                        'payment_date'      => now(),
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ], 'payment_id');
                }

                $soldByUser = $request->user();
                $soldByName = $soldByUser ? trim(($soldByUser->given_name ?? '') . ' ' . ($soldByUser->last_name ?? '')) : 'Tools Man';

                if (Schema::hasTable('inventory_sales')) {
                    $saleId = DB::table('inventory_sales')->insertGetId([
                        'booking_id'       => $bookingId,
                        'payment_id'       => $paymentId,
                        'sale_type'        => 'spare_part',
                        'item_id'          => $itemId,
                        'item_name'        => $item->item_name,
                        'brand'            => $item->compatible_brands ?: 'Universal',
                        'sub_category'     => $item->sub_category ?: 'Spare Parts',
                        'item_type'        => 'Spare Part',
                        'quantity'         => $qtySold,
                        'unit'             => $item->unit ?: 'pcs',
                        'cost_price'       => $costPrice,
                        'unit_price'       => $unitPrice,
                        'total_amount'     => $totalAmount,
                        'profit'           => $profit,
                        'payment_method'   => $paymentMethod,
                        'payment_status'   => 'Paid',
                        'client_id'        => $bookingClientId,
                        'customer_name'    => $customerName,
                        'customer_contact' => $customerContact,
                        'sold_by'          => $soldByUser?->user_id,
                        'sold_by_name'     => $soldByName ?: 'Tools Man',
                        'notes'            => "Spare Part Sale: {$qtySold} × {$item->item_name}",
                        'sold_at'          => now(),
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ], 'sale_id');

                    $soldRecord = DB::table('inventory_sales')->where('sale_id', $saleId)->first();
                }
            }
        });

        $this->logActivity(
            (int) $request->user()->user_id,
            $isSale ? 'SALE' : 'INVENTORY',
            $isSale
                ? sprintf('Sold spare part "%s".', $item->item_name)
                : sprintf('Updated spare part "%s".', $item->item_name)
        );

        $updated = DB::table('inventory_items')->where('item_id', $itemId)->first();

        return response()->json([
            'message'     => $isSale ? 'Spare part sale recorded in Sales & Records.' : 'Spare part updated successfully.',
            'booking_id'  => $bookingId,
            'sold_record' => $soldRecord,
            'data'        => $this->formatSparePart($updated),
        ]);
    }

    public function destroySparePart(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeRole($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->where('item_type', 'Spare Part')->first();
        if (! $item) { abort(404); }

        DB::table('inventory_items')->where('item_id', $itemId)->delete();
        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Deleted spare part %s.', $item->item_name));

        return response()->json(['message' => 'Spare part deleted successfully.']);
    }
}
