<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SuperAdminAcUnitController extends SuperAdminBaseController
{
    public function acUnitsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $units = DB::table('ac_units_inventory')->orderBy('brand')->orderBy('model')->get();

        return response()->json([
            'data' => $units->map(function ($unit) {
                return [
                    'ac_unit_id' => (int) $unit->ac_unit_id,
                    'brand' => $unit->brand,
                    'model' => $unit->model,
                    'serial_number' => $unit->serial_number,
                    'horsepower' => (float) $unit->horsepower,
                    'ac_type' => $unit->ac_type,
                    'refrigerant_type' => $unit->refrigerant_type,
                    'supplier' => $unit->supplier,
                    'purchase_price' => (float) $unit->purchase_price,
                    'selling_price' => $unit->selling_price !== null ? (float) $unit->selling_price : null,
                    'purchase_date' => $unit->purchase_date,
                    'warranty_period' => (int) $unit->warranty_period,
                    'status' => $unit->status,
                    'expected_arrival' => $unit->expected_arrival ?? null,
                    'created_at' => $unit->created_at,
                    'updated_at' => $unit->updated_at,
                ];
            })->values(),
        ]);
    }

    public function storeAcUnit(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'brand' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'serial_number' => ['required', 'string', 'max:100', 'unique:ac_units_inventory,serial_number'],
            'horsepower' => ['required', 'numeric', 'min:0.5'],
            'ac_type' => ['required', Rule::in(self::AC_TYPES)],
            'refrigerant_type' => ['nullable', 'string', 'max:20'],
            'supplier' => ['nullable', 'string', 'max:150'],
            'purchase_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'purchase_date' => ['required', 'date'],
            'warranty_period' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in(self::AC_STATUSES)],
            'expected_arrival' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $unitId = DB::table('ac_units_inventory')->insertGetId(array_merge($validated, [
            'created_at' => now(),
            'updated_at' => now(),
        ]), 'ac_unit_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Created AC unit %s %s.', $validated['brand'], $validated['model'])
        );

        return response()->json([
            'message' => 'AC unit created successfully.',
            'data' => DB::table('ac_units_inventory')->where('ac_unit_id', $unitId)->first(),
        ], 201);
    }

    public function updateAcUnit(Request $request, int $acUnitId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $unit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();

        if (! $unit) {
            abort(404);
        }

        $validated = $request->validate([
            'brand' => ['sometimes', 'string', 'max:100'],
            'model' => ['sometimes', 'string', 'max:100'],
            'serial_number' => ['sometimes', 'string', 'max:100', Rule::unique('ac_units_inventory', 'serial_number')->ignore($acUnitId, 'ac_unit_id')],
            'horsepower' => ['sometimes', 'numeric', 'min:0.5'],
            'ac_type' => ['sometimes', Rule::in(self::AC_TYPES)],
            'refrigerant_type' => ['nullable', 'string', 'max:20'],
            'supplier' => ['nullable', 'string', 'max:150'],
            'purchase_price' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'purchase_date' => ['sometimes', 'date'],
            'warranty_period' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::in(self::AC_STATUSES)],
            'expected_arrival' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        if ($validated !== []) {
            DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->update(array_merge($validated, [
                'updated_at' => now(),
            ]));
        }

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Updated AC unit %s %s.', $unit->brand, $unit->model)
        );

        return response()->json([
            'message' => 'AC unit updated successfully.',
            'data' => DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first(),
        ]);
    }

    public function destroyAcUnit(Request $request, int $acUnitId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $unit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();

        if (! $unit) {
            abort(404);
        }

        DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->delete();

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Deleted AC unit %s %s.', $unit->brand, $unit->model)
        );

        return response()->json(['message' => 'AC unit deleted successfully.']);
    }
}
