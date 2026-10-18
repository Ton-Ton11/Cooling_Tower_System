<?php

namespace App\Http\Controllers\AdminAssistant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class AdminAssistantAcUnitController extends AdminAssistantBaseController
{
    public function acUnitsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $units = DB::table('ac_units_inventory')->orderBy('brand')->orderBy('model')->get();

        $salesByUnitId = collect();
        $soldRecords = collect();
        if (Schema::hasTable('inventory_sales')) {
            $soldRecords = DB::table('inventory_sales')
                ->where('sale_type', 'ac_unit')
                ->orderByDesc('sold_at')
                ->orderByDesc('sale_id')
                ->get();
            $salesByUnitId = $soldRecords->keyBy('ac_unit_id');
        }

        return response()->json([
            'data' => $units->map(function ($unit) use ($salesByUnitId) {
                $sale = $salesByUnitId->get($unit->ac_unit_id);
                return [
                    'ac_unit_id'       => (int) $unit->ac_unit_id,
                    'brand'            => $unit->brand,
                    'model'            => $unit->model,
                    'serial_number'    => $unit->serial_number,
                    'horsepower'       => (float) $unit->horsepower,
                    'ac_type'          => $unit->ac_type,
                    'refrigerant_type' => $unit->refrigerant_type,
                    'supplier'         => $unit->supplier,
                    'purchase_price'   => (float) $unit->purchase_price,
                    'selling_price'    => $unit->selling_price !== null ? (float) $unit->selling_price : null,
                    'purchase_date'    => $unit->purchase_date,
                    'warranty_period'  => (int) $unit->warranty_period,
                    'status'           => $unit->status,
                    'expected_arrival' => $unit->expected_arrival ?? null,
                    'created_at'       => $unit->created_at,
                    'updated_at'       => $unit->updated_at,
                    'sale_id'          => $sale?->sale_id ? (int) $sale->sale_id : null,
                    'booking_id'       => $sale?->booking_id ? (int) $sale->booking_id : null,
                    'customer_name'    => $sale?->customer_name ?? null,
                    'customer_contact' => $sale?->customer_contact ?? null,
                    'customer_address' => $sale?->customer_address ?? null,
                    'payment_method'   => $sale?->payment_method ?? null,
                    'sold_price'       => $sale ? (float) $sale->total_amount : ($unit->selling_price !== null ? (float) $unit->selling_price : null),
                    'profit'           => $sale ? (float) $sale->profit : ($unit->selling_price !== null ? round((float) $unit->selling_price - (float) $unit->purchase_price, 2) : 0),
                    'sold_by_name'     => $sale?->sold_by_name ?? null,
                    'sold_at'          => $sale?->sold_at ?? null,
                ];
            })->values(),
            'sold_records' => $soldRecords->values(),
        ]);
    }

    public function storeAcUnit(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $validated = $request->validate([
            'brand'            => ['required', 'string', 'max:100'],
            'model'            => ['required', 'string', 'max:100'],
            'serial_number'    => ['required', 'string', 'max:100', 'unique:ac_units_inventory,serial_number'],
            'horsepower'       => ['required', 'numeric', 'min:0.5'],
            'ac_type'          => ['required', 'string', 'max:100'],
            'refrigerant_type' => ['nullable', 'string', 'max:20'],
            'supplier'         => ['nullable', 'string', 'max:150'],
            'purchase_price'   => ['required', 'numeric', 'min:0'],
            'selling_price'    => ['nullable', 'numeric', 'min:0'],
            'purchase_date'    => ['required', 'date'],
            'warranty_period'  => ['required', 'integer', 'min:0'],
            'status'           => ['required', Rule::in(self::AC_STATUSES)],
            'expected_arrival' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $unitId = DB::table('ac_units_inventory')->insertGetId(array_merge($validated, [
            'created_at' => now(),
            'updated_at' => now(),
        ]), 'ac_unit_id');

        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Created AC unit %s %s.', $validated['brand'], $validated['model']));

        return response()->json([
            'message' => 'AC unit created successfully.',
            'data'    => DB::table('ac_units_inventory')->where('ac_unit_id', $unitId)->first(),
        ], 201);
    }

    public function updateAcUnit(Request $request, int $acUnitId): JsonResponse
    {
        $this->authorizeRole($request);

        $unit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();
        if (! $unit) { abort(404); }

        $validated = $request->validate([
            'brand'            => ['sometimes', 'string', 'max:100'],
            'model'            => ['sometimes', 'string', 'max:100'],
            'serial_number'    => ['sometimes', 'string', 'max:100', Rule::unique('ac_units_inventory', 'serial_number')->ignore($acUnitId, 'ac_unit_id')],
            'horsepower'       => ['sometimes', 'numeric', 'min:0.5'],
            'ac_type'          => ['sometimes', 'string', 'max:100'],
            'refrigerant_type' => ['nullable', 'string', 'max:20'],
            'supplier'         => ['nullable', 'string', 'max:150'],
            'purchase_price'   => ['sometimes', 'numeric', 'min:0'],
            'selling_price'    => ['nullable', 'numeric', 'min:0'],
            'purchase_date'    => ['sometimes', 'date'],
            'warranty_period'  => ['sometimes', 'integer', 'min:0'],
            'status'           => ['sometimes', Rule::in(self::AC_STATUSES)],
            'expected_arrival' => ['nullable', 'date'],
            'client_id'        => ['sometimes', 'nullable', 'integer'],
            'customer_name'    => ['sometimes', 'nullable', 'string', 'max:150'],
            'customer_contact' => ['sometimes', 'nullable', 'string', 'max:80'],
            'customer_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_method'   => ['sometimes', 'nullable', 'string', 'max:50'],
            'notes'            => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $unitColumns = [
            'brand', 'model', 'serial_number', 'horsepower', 'ac_type',
            'refrigerant_type', 'supplier', 'purchase_price', 'selling_price',
            'purchase_date', 'warranty_period', 'status', 'expected_arrival',
        ];
        $unitUpdate = array_intersect_key($validated, array_flip($unitColumns));

        $isBeingSold = (($validated['status'] ?? null) === 'Sold' && $unit->status !== 'Sold')
            || (($validated['status'] ?? null) === 'Sold' && $request->hasAny(['customer_name', 'payment_method', 'client_id']));

        $soldRecord = null;
        $bookingId = null;

        DB::transaction(function () use ($acUnitId, $unit, $unitUpdate, $validated, $isBeingSold, $request, &$soldRecord, &$bookingId) {
            if ($unitUpdate !== []) {
                DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->update(array_merge($unitUpdate, ['updated_at' => now()]));
            }

            if ($isBeingSold) {
                $updatedUnit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();
                $sellingPrice = isset($validated['selling_price']) && $validated['selling_price'] !== null
                    ? (float) $validated['selling_price']
                    : (float) ($updatedUnit->selling_price ?? $updatedUnit->purchase_price ?? 0);
                $purchasePrice = (float) ($updatedUnit->purchase_price ?? 0);
                $profit = round($sellingPrice - $purchasePrice, 2);
                $paymentMethod = $validated['payment_method'] ?? 'Cash';
                $warrantyPeriod = isset($validated['warranty_period'])
                    ? (int) $validated['warranty_period']
                    : (int) ($updatedUnit->warranty_period ?? 12);

                $clientId = $validated['client_id'] ?? null;
                $customerUser = null;
                if ($clientId) {
                    $customerUser = DB::table('users')->where('user_id', $clientId)->first();
                }

                $customerName = trim((string) ($validated['customer_name'] ?? ''));
                if ($customerName === '' && $customerUser) {
                    $customerName = trim(($customerUser->given_name ?? '') . ' ' . ($customerUser->last_name ?? ''));
                }
                if ($customerName === '') {
                    $customerName = 'Walk-in Customer';
                }

                $customerContact = $validated['customer_contact'] ?? ($customerUser->contact_number ?? null);
                $customerAddress = $validated['customer_address'] ?? ($customerUser->address ?? null);

                $bookingClientId = $customerUser?->user_id;
                if (! $bookingClientId && $customerName !== '') {
                    $matchedCustomer = DB::table('users')
                        ->where('role_id', 6)
                        ->whereRaw("CONCAT(given_name, ' ', last_name) LIKE ?", ['%' . $customerName . '%'])
                        ->first();
                    $bookingClientId = $matchedCustomer?->user_id;
                }
                if (! $bookingClientId) {
                    $fallbackCustomer = DB::table('users')->where('role_id', 6)->orderBy('user_id')->first()
                        ?: DB::table('users')->orderBy('user_id')->first();
                    $bookingClientId = $fallbackCustomer?->user_id;
                }

                $serviceName = 'AC Unit Sale: ' . trim(($updatedUnit->brand ?? '') . ' ' . ($updatedUnit->model ?? ''));
                $service = DB::table('services')->where('service_name', $serviceName)->first();
                if (! $service) {
                    $serviceId = DB::table('services')->insertGetId([
                        'service_name'  => $serviceName,
                        'description'   => sprintf(
                            'Direct AC Unit Sale (%s - %s HP, SN: %s)',
                            $updatedUnit->ac_type,
                            $updatedUnit->horsepower,
                            $updatedUnit->serial_number
                        ),
                        'base_price'    => $sellingPrice,
                        'is_active'     => 1,
                        'category'      => 'AC Unit Sale',
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
                        'notes'          => sprintf(
                            'Sold AC Unit: %s %s (SN: %s) to %s',
                            $updatedUnit->brand,
                            $updatedUnit->model,
                            $updatedUnit->serial_number,
                            $customerName
                        ),
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ], 'booking_id');

                    $paymentId = DB::table('payment')->insertGetId([
                        'booking_id'        => $bookingId,
                        'booking_price'     => $sellingPrice,
                        'unit_price'        => $sellingPrice,
                        'spare_parts_price' => 0.00,
                        'amount_paid'       => $sellingPrice,
                        'payment_status'    => 'Paid',
                        'payment_method'    => $paymentMethod,
                        'payment_type'      => 'Full Payment',
                        'payment_date'      => now(),
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ], 'payment_id');
                }

                $soldByUser = $request->user();
                $soldByName = $soldByUser ? trim(($soldByUser->given_name ?? '') . ' ' . ($soldByUser->last_name ?? '')) : 'Admin Assistant';

                if (Schema::hasTable('inventory_sales')) {
                    $salePayload = [
                        'booking_id'       => $bookingId,
                        'payment_id'       => $paymentId,
                        'sale_type'        => 'ac_unit',
                        'ac_unit_id'       => $acUnitId,
                        'item_name'        => trim(($updatedUnit->brand ?? '') . ' ' . ($updatedUnit->model ?? '')),
                        'brand'            => $updatedUnit->brand,
                        'model'            => $updatedUnit->model,
                        'serial_number'    => $updatedUnit->serial_number,
                        'sub_category'     => $updatedUnit->ac_type ?: 'Split',
                        'item_type'        => 'AC Unit',
                        'horsepower'       => (string) ($updatedUnit->horsepower ?? '1.0'),
                        'quantity'         => 1,
                        'unit'             => 'unit',
                        'cost_price'       => $purchasePrice,
                        'unit_price'       => $sellingPrice,
                        'total_amount'     => $sellingPrice,
                        'profit'           => $profit,
                        'payment_method'   => $paymentMethod,
                        'payment_status'   => 'Paid',
                        'client_id'        => $bookingClientId,
                        'customer_name'    => $customerName,
                        'customer_contact' => $customerContact,
                        'customer_address' => $customerAddress,
                        'warranty_period'  => $warrantyPeriod,
                        'sold_by'          => $soldByUser?->user_id,
                        'sold_by_name'     => $soldByName ?: 'Admin Assistant',
                        'notes'            => $validated['notes'] ?? sprintf('Sold AC Unit: %s %s (SN: %s)', $updatedUnit->brand, $updatedUnit->model, $updatedUnit->serial_number),
                        'sold_at'          => now(),
                        'updated_at'       => now(),
                    ];

                    $existingSale = DB::table('inventory_sales')
                        ->where('sale_type', 'ac_unit')
                        ->where('ac_unit_id', $acUnitId)
                        ->first();

                    if ($existingSale) {
                        DB::table('inventory_sales')->where('sale_id', $existingSale->sale_id)->update($salePayload);
                        $soldRecord = DB::table('inventory_sales')->where('sale_id', $existingSale->sale_id)->first();
                    } else {
                        $salePayload['created_at'] = now();
                        $saleId = DB::table('inventory_sales')->insertGetId($salePayload, 'sale_id');
                        $soldRecord = DB::table('inventory_sales')->where('sale_id', $saleId)->first();
                    }
                }
            }
        });

        $this->logActivity(
            (int) $request->user()->user_id,
            $isBeingSold ? 'SALE' : 'INVENTORY',
            $isBeingSold
                ? sprintf('Sold AC unit %s %s (SN: %s).', $unit->brand, $unit->model, $unit->serial_number)
                : sprintf('Updated AC unit %s %s.', $unit->brand, $unit->model)
        );

        $freshUnit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();

        return response()->json([
            'message'     => $isBeingSold ? 'AC unit sale recorded in Sales & Records.' : 'AC unit updated successfully.',
            'booking_id'  => $bookingId,
            'sold_record' => $soldRecord,
            'data'        => $freshUnit,
        ]);
    }

    public function destroyAcUnit(Request $request, int $acUnitId): JsonResponse
    {
        $this->authorizeRole($request);

        $unit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();
        if (! $unit) { abort(404); }

        DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->delete();
        $this->logActivity((int) $request->user()->user_id, 'INVENTORY', sprintf('Deleted AC unit %s %s.', $unit->brand, $unit->model));

        return response()->json(['message' => 'AC unit deleted successfully.']);
    }
}
