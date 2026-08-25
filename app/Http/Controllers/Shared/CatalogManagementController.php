<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Service;
use App\Models\UnitType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatalogManagementController extends Controller
{
    /**
     * Get all services, unit types, and brands for catalog administration.
     */
    public function index(Request $request): JsonResponse
    {
        $services = Service::withCount('bookings')
            ->orderBy('display_order')
            ->orderBy('service_id')
            ->get();

        $unitTypes = UnitType::orderBy('display_order')
            ->orderBy('id')
            ->get();

        $brands = Brand::orderBy('display_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'services' => $services,
            'unit_types' => $unitTypes,
            'brands' => $brands,
            'stats' => [
                'total_services' => $services->count(),
                'active_services' => $services->where('is_active', true)->count(),
                'total_unit_types' => $unitTypes->count(),
                'active_unit_types' => $unitTypes->where('is_active', true)->count(),
                'total_brands' => $brands->count(),
                'active_brands' => $brands->where('is_active', true)->count(),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    // SERVICES CRUD
    // ══════════════════════════════════════════════════════════════════

    /**
     * Store a new service.
     */
    public function storeService(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'service_name' => ['required', 'string', 'max:100', 'unique:services,service_name'],
            'description' => ['nullable', 'string', 'max:1000'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'category' => ['nullable', 'string', 'max:50'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $service = Service::create([
            'service_name' => $validated['service_name'],
            'description' => $validated['description'] ?? null,
            'base_price' => $validated['base_price'],
            'category' => $validated['category'] ?? 'General',
            'display_order' => $validated['display_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->logActivity(
            $request->user()->user_id,
            'SERVICE_CREATE',
            sprintf('Created new service "%s" with base price ₱%s.', $service->service_name, number_format($service->base_price, 2))
        );

        return response()->json([
            'message' => 'Service created successfully!',
            'service' => $service,
        ], 201);
    }

    /**
     * Update an existing service.
     */
    public function updateService(Request $request, int $serviceId): JsonResponse
    {
        $service = Service::findOrFail($serviceId);

        $validated = $request->validate([
            'service_name' => ['required', 'string', 'max:100', Rule::unique('services', 'service_name')->ignore($service->service_id, 'service_id')],
            'description' => ['nullable', 'string', 'max:1000'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'category' => ['nullable', 'string', 'max:50'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $oldPrice = $service->base_price;
        $service->update($validated);

        $this->logActivity(
            $request->user()->user_id,
            'SERVICE_UPDATE',
            sprintf('Updated service "%s" (Base Price: ₱%s → ₱%s).', $service->service_name, number_format($oldPrice, 2), number_format($service->base_price, 2))
        );

        return response()->json([
            'message' => 'Service updated successfully!',
            'service' => $service->fresh(),
        ]);
    }

    /**
     * Toggle service active status.
     */
    public function toggleServiceStatus(Request $request, int $serviceId): JsonResponse
    {
        $service = Service::findOrFail($serviceId);
        $service->is_active = ! $service->is_active;
        $service->save();

        $statusStr = $service->is_active ? 'Activated' : 'Deactivated';
        $this->logActivity(
            $request->user()->user_id,
            'SERVICE_STATUS_TOGGLE',
            sprintf('%s service "%s".', $statusStr, $service->service_name)
        );

        return response()->json([
            'message' => sprintf('Service "%s" is now %s.', $service->service_name, strtolower($statusStr)),
            'service' => $service,
        ]);
    }

    /**
     * Delete a service.
     */
    public function destroyService(Request $request, int $serviceId): JsonResponse
    {
        $service = Service::findOrFail($serviceId);

        $bookingsCount = $service->bookings()->count();
        if ($bookingsCount > 0) {
            // Cannot hard delete if associated with bookings; deactivate instead
            $service->update(['is_active' => false]);

            $this->logActivity(
                $request->user()->user_id,
                'SERVICE_DEACTIVATE',
                sprintf('Deactivated service "%s" because it has %d associated booking(s).', $service->service_name, $bookingsCount)
            );

            return response()->json([
                'message' => sprintf('Service has %d booking record(s). It has been deactivated instead of permanently deleted to preserve history.', $bookingsCount),
                'service' => $service,
                'deactivated' => true,
            ]);
        }

        $name = $service->service_name;
        $service->delete();

        $this->logActivity(
            $request->user()->user_id,
            'SERVICE_DELETE',
            sprintf('Deleted service "%s".', $name)
        );

        return response()->json([
            'message' => sprintf('Service "%s" deleted permanently.', $name),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    // UNIT TYPES CRUD
    // ══════════════════════════════════════════════════════════════════

    /**
     * Store a new unit type.
     */
    public function storeUnitType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:50', 'unique:unit_types,code'],
            'icon' => ['nullable', 'string'],
            'description' => ['nullable', 'string', 'max:500'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $unitType = UnitType::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'icon' => $validated['icon'] ?? 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
            'description' => $validated['description'] ?? null,
            'display_order' => $validated['display_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->logActivity(
            $request->user()->user_id,
            'UNIT_TYPE_CREATE',
            sprintf('Created new unit type "%s" (code: %s).', $unitType->name, $unitType->code)
        );

        return response()->json([
            'message' => 'AC Unit Type created successfully!',
            'unit_type' => $unitType,
        ], 201);
    }

    /**
     * Update an existing unit type.
     */
    public function updateUnitType(Request $request, int $id): JsonResponse
    {
        $unitType = UnitType::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:50', Rule::unique('unit_types', 'code')->ignore($unitType->id)],
            'icon' => ['nullable', 'string'],
            'description' => ['nullable', 'string', 'max:500'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $unitType->update($validated);

        $this->logActivity(
            $request->user()->user_id,
            'UNIT_TYPE_UPDATE',
            sprintf('Updated unit type "%s" (code: %s).', $unitType->name, $unitType->code)
        );

        return response()->json([
            'message' => 'AC Unit Type updated successfully!',
            'unit_type' => $unitType->fresh(),
        ]);
    }

    /**
     * Toggle unit type active status.
     */
    public function toggleUnitTypeStatus(Request $request, int $id): JsonResponse
    {
        $unitType = UnitType::findOrFail($id);
        $unitType->is_active = ! $unitType->is_active;
        $unitType->save();

        $statusStr = $unitType->is_active ? 'Activated' : 'Deactivated';
        $this->logActivity(
            $request->user()->user_id,
            'UNIT_TYPE_STATUS_TOGGLE',
            sprintf('%s AC unit type "%s".', $statusStr, $unitType->name)
        );

        return response()->json([
            'message' => sprintf('AC Unit Type "%s" is now %s.', $unitType->name, strtolower($statusStr)),
            'unit_type' => $unitType,
        ]);
    }

    /**
     * Delete a unit type.
     */
    public function destroyUnitType(Request $request, int $id): JsonResponse
    {
        $unitType = UnitType::findOrFail($id);
        $name = $unitType->name;
        $unitType->delete();

        $this->logActivity(
            $request->user()->user_id,
            'UNIT_TYPE_DELETE',
            sprintf('Deleted AC unit type "%s".', $name)
        );

        return response()->json([
            'message' => sprintf('Unit Type "%s" deleted successfully.', $name),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    // BRANDS CRUD
    // ══════════════════════════════════════════════════════════════════

    /**
     * Store a new brand.
     */
    public function storeBrand(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:brands,name'],
            'country_of_origin' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $brand = Brand::create([
            'name' => $validated['name'],
            'country_of_origin' => $validated['country_of_origin'] ?? null,
            'description' => $validated['description'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'display_order' => $validated['display_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->logActivity(
            $request->user()->user_id,
            'BRAND_CREATE',
            sprintf('Created new AC brand "%s".', $brand->name)
        );

        return response()->json([
            'message' => 'AC Brand created successfully!',
            'brand' => $brand,
        ], 201);
    }

    /**
     * Update an existing brand.
     */
    public function updateBrand(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('brands', 'name')->ignore($brand->id)],
            'country_of_origin' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'logo_url' => ['nullable', 'string', 'max:255'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $brand->update($validated);

        $this->logActivity(
            $request->user()->user_id,
            'BRAND_UPDATE',
            sprintf('Updated AC brand "%s".', $brand->name)
        );

        return response()->json([
            'message' => 'AC Brand updated successfully!',
            'brand' => $brand->fresh(),
        ]);
    }

    /**
     * Toggle brand active status.
     */
    public function toggleBrandStatus(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $brand->is_active = ! $brand->is_active;
        $brand->save();

        $statusStr = $brand->is_active ? 'Activated' : 'Deactivated';
        $this->logActivity(
            $request->user()->user_id,
            'BRAND_STATUS_TOGGLE',
            sprintf('%s AC brand "%s".', $statusStr, $brand->name)
        );

        return response()->json([
            'message' => sprintf('AC Brand "%s" is now %s.', $brand->name, strtolower($statusStr)),
            'brand' => $brand,
        ]);
    }

    /**
     * Delete a brand.
     */
    public function destroyBrand(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $name = $brand->name;
        $brand->delete();

        $this->logActivity(
            $request->user()->user_id,
            'BRAND_DELETE',
            sprintf('Deleted AC brand "%s".', $name)
        );

        return response()->json([
            'message' => sprintf('Brand "%s" deleted successfully.', $name),
        ]);
    }

    /**
     * Helper to log activity.
     */
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
