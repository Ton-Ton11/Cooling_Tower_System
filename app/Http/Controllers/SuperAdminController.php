<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminController extends Controller
{
    private const ROLE_LABELS = [
        1 => 'Super Admin',
        2 => 'Manager',
        3 => 'Admin Assistant',
        4 => 'Tools Man',
        5 => 'Technician',
        6 => 'Customer',
    ];

    private const STAFF_ROLE_IDS = [2, 3, 4, 5];

    private const BOOKING_ASSIGNABLE_STATUSES = ['Approved', 'Dispatched'];

    private const INVENTORY_ITEM_TYPES = ['Tool', 'Material', 'Spare Part'];

    private const AC_TYPES = ['Window', 'Split', 'Cassette', 'Floor Mounted', 'Ceiling Suspended'];

    private const AC_STATUSES = ['Available', 'Reserved', 'Installed', 'Order Base', 'Defect'];

    private const DOCUMENT_STATUSES = ['Draft', 'Exported', 'Finalized'];

    public function dashboard(): Response
    {
        return Inertia::render('SuperAdminDashboard');
    }

    public function dashboardData(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $stats = [
            'active_staff' => $this->staffBaseQuery()->whereIn('users.role_id', self::STAFF_ROLE_IDS)->where(function ($query) {
                $query->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })->count(),
            'pending_bookings' => DB::table('bookings')->where('booking_status', 'Pending')->count(),
            'low_stock_items' => DB::table('inventory_items')->whereColumn('quantity_on_hand', '<=', 'reorder_level')->count(),
            'available_ac_units' => DB::table('ac_units_inventory')->where('status', 'Available')->count(),
            'announcements' => DB::table('announcements')->count(),
            'paid_revenue_this_month' => (float) DB::table('payment')
                ->where('payment_status', 'Paid')
                ->whereBetween('payment_date', [$monthStart, $monthEnd])
                ->sum('amount_paid'),
        ];

        $pendingBookings = $this->bookingsBaseQuery()
            ->where('bookings.booking_status', 'Pending')
            ->orderByDesc('bookings.created_at')
            ->limit(5)
            ->get();

        $recentActivity = $this->activityLogsBaseQuery()
            ->orderByDesc('activity_logs.created_at')
            ->limit(10)
            ->get();

        $paidPayments = DB::table('payment')
            ->where('payment_status', 'Paid')
            ->whereNotNull('payment_date')
            ->get(['amount_paid', 'payment_date']);

        return response()->json([
            'stats' => $stats,
            'pending_bookings' => $this->mapBookings($pendingBookings),
            'recent_activity' => $this->mapActivityLogs($recentActivity),
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidPayments),
        ]);
    }

    public function bookingsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $query = $this->bookingsBaseQuery()->orderByDesc('bookings.created_at');

        if ($status = $request->string('status')->trim()->value()) {
            $query->where('bookings.booking_status', $status);
        }

        return response()->json([
            'data' => $this->mapBookings($query->get()),
            'technicians' => $this->techniciansCollection(),
        ]);
    }

    public function approveBooking(Request $request, int $bookingId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        if (in_array($booking->booking_status, ['Completed', 'Cancelled', 'Incomplete'], true)) {
            throw ValidationException::withMessages([
                'booking_id' => ['Only pending or active bookings can be approved or reassigned.'],
            ]);
        }

        $payload = $this->normalizeBookingAssignmentPayload($request);

        $validated = validator($payload, [
            'assigned_tech_id' => [
                'required',
                'integer',
                Rule::exists('users', 'user_id')->where(function ($query) {
                    $query->where('role_id', 5)
                        ->where(function ($inner) {
                            $inner->whereNull('is_active')->orWhere('is_active', 1);
                        });
                }),
            ],
            'booking_status' => ['nullable', Rule::in(self::BOOKING_ASSIGNABLE_STATUSES)],
        ])->validate();

        $assignedTech = DB::table('users')
            ->where('user_id', $validated['assigned_tech_id'])
            ->first(['user_id', 'given_name', 'middle_name', 'last_name']);

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'assigned_tech_id' => $validated['assigned_tech_id'],
                'booking_status' => $validated['booking_status'] ?? 'Approved',
            ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'APPROVE',
            sprintf(
                'Approved booking #%d and assigned %s.',
                $bookingId,
                $this->formatName($assignedTech->given_name, $assignedTech->middle_name, $assignedTech->last_name)
            )
        );

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return response()->json([
            'message' => 'Booking updated successfully.',
            'data' => $this->mapBookings(collect([$updated]))->first(),
        ]);
    }

    public function staffIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $query = $this->staffBaseQuery()->where('users.role_id', '!=', 6)->orderBy('users.role_id')->orderBy('users.last_name');

        if (! $request->boolean('include_archived')) {
            $query->where(function ($builder) {
                $builder->whereNull('users.is_active')->orWhere('users.is_active', 1);
            });
        }

        if ($roleId = $this->resolveRoleIdFromRequest($request, 'role_id', 'role')) {
            $query->where('users.role_id', $roleId);
        }

        return response()->json([
            'data' => $this->mapStaff($query->get()),
            'meta' => [
                'roles' => collect(self::ROLE_LABELS)
                    ->only(self::STAFF_ROLE_IDS)
                    ->map(fn (string $label, int $roleId) => ['role_id' => $roleId, 'role' => $label])
                    ->values(),
                'specialties' => DB::table('specialties')->orderBy('specialty_name')->get(['specialty_id', 'specialty_name']),
            ],
        ]);
    }

    public function storeStaff(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $payload = $this->normalizeStaffPayload($request);

        $validated = validator($payload, [
            'role_id' => ['required', Rule::in(self::STAFF_ROLE_IDS)],
            'given_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => ['required', 'date', 'before:today'],
            'sex' => ['required', Rule::in(['Male', 'Female'])],
            'address' => ['required', 'string'],
            'contact_number' => ['required', 'string', 'max:15'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'certificate_expiry' => ['nullable', 'date'],
            'specialty_ids' => ['nullable', 'array'],
            'specialty_ids.*' => ['integer', Rule::exists('specialties', 'specialty_id')],
        ])->validate();

        if ((int) $validated['role_id'] === 5 && empty($validated['certificate_expiry'])) {
            throw ValidationException::withMessages([
                'certificate_expiry' => ['A technician certificate expiry date is required.'],
            ]);
        }

        $userId = DB::transaction(function () use ($validated, $request) {
            $userId = DB::table('users')->insertGetId([
                'role_id' => $validated['role_id'],
                'given_name' => $validated['given_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name' => $validated['last_name'],
                'birthdate' => $validated['birthdate'],
                'sex' => $validated['sex'],
                'address' => $validated['address'],
                'contact_number' => $validated['contact_number'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ], 'user_id');

            $this->syncTechnicianRelations($userId, (int) $validated['role_id'], $validated['certificate_expiry'] ?? null, $validated['specialty_ids'] ?? []);

            $this->logActivity(
                (int) $request->user()->user_id,
                'CREATE',
                sprintf(
                    'Created staff account for %s (%s).',
                    $this->formatName($validated['given_name'], $validated['middle_name'] ?? null, $validated['last_name']),
                    self::ROLE_LABELS[(int) $validated['role_id']] ?? 'Staff'
                )
            );

            return $userId;
        });

        $created = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account created successfully.',
            'data' => $this->mapStaff(collect([$created]))->first(),
        ], 201);
    }

    public function updateStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $staff = $this->manageableStaffRow($userId);

        $payload = $this->normalizeStaffPayload($request);

        $validated = validator($payload, [
            'role_id' => ['sometimes', Rule::in(self::STAFF_ROLE_IDS)],
            'given_name' => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'birthdate' => ['sometimes', 'date', 'before:today'],
            'sex' => ['sometimes', Rule::in(['Male', 'Female'])],
            'address' => ['sometimes', 'string'],
            'contact_number' => ['sometimes', 'string', 'max:15'],
            'email' => ['sometimes', 'string', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId, 'user_id')],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'certificate_expiry' => ['nullable', 'date'],
            'specialty_ids' => ['nullable', 'array'],
            'specialty_ids.*' => ['integer', Rule::exists('specialties', 'specialty_id')],
        ])->validate();

        $finalRoleId = (int) ($validated['role_id'] ?? $staff->role_id);
        $existingTechnicianDetails = DB::table('technician_details')->where('user_id', $userId)->first();

        if ($finalRoleId === 5 && empty($validated['certificate_expiry']) && ! $existingTechnicianDetails) {
            throw ValidationException::withMessages([
                'certificate_expiry' => ['A technician certificate expiry date is required.'],
            ]);
        }

        DB::transaction(function () use ($validated, $userId, $finalRoleId, $existingTechnicianDetails, $request, $staff) {
            $updateData = collect([
                'role_id' => $validated['role_id'] ?? null,
                'given_name' => $validated['given_name'] ?? null,
                'middle_name' => array_key_exists('middle_name', $validated) ? $validated['middle_name'] : null,
                'last_name' => $validated['last_name'] ?? null,
                'birthdate' => $validated['birthdate'] ?? null,
                'sex' => $validated['sex'] ?? null,
                'address' => $validated['address'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'email' => $validated['email'] ?? null,
                'updated_at' => now(),
            ])->filter(function ($value, $key) use ($validated) {
                return $key === 'updated_at' || array_key_exists($key, $validated);
            })->all();

            if (! empty($validated['password'])) {
                $updateData['password'] = Hash::make($validated['password']);
            }

            DB::table('users')->where('user_id', $userId)->update($updateData);

            $this->syncTechnicianRelations(
                $userId,
                $finalRoleId,
                $validated['certificate_expiry'] ?? ($existingTechnicianDetails->certificate_expiry ?? null),
                $validated['specialty_ids'] ?? null
            );

            $this->logActivity(
                (int) $request->user()->user_id,
                'UPDATE',
                sprintf(
                    'Updated staff account for %s.',
                    $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name)
                )
            );
        });

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account updated successfully.',
            'data' => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    public function archiveStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        if ((int) $request->user()->user_id === $userId) {
            throw ValidationException::withMessages([
                'user_id' => ['You cannot archive your own account.'],
            ]);
        }

        $staff = $this->manageableStaffRow($userId);

        DB::table('users')->where('user_id', $userId)->update([
            'is_active' => false,
            'updated_at' => now(),
        ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'ARCHIVE',
            sprintf('Archived staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name))
        );

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account archived successfully.',
            'data' => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    public function restoreStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $staff = $this->manageableStaffRow($userId);

        DB::table('users')->where('user_id', $userId)->update([
            'is_active' => true,
            'updated_at' => now(),
        ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'RESTORE',
            sprintf('Restored staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name))
        );

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account restored successfully.',
            'data' => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    public function inventoryIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $items = DB::table('inventory_items')->orderBy('item_type')->orderBy('item_name')->get();

        return response()->json([
            'data' => $items->map(function ($item) {
                return [
                    'item_id' => (int) $item->item_id,
                    'item_name' => $item->item_name,
                    'item_type' => $item->item_type,
                    'quantity_on_hand' => (int) $item->quantity_on_hand,
                    'reorder_level' => (int) $item->reorder_level,
                    'unit' => $item->unit,
                    'last_updated' => $item->last_updated,
                    'low_stock' => (int) $item->quantity_on_hand <= (int) $item->reorder_level,
                ];
            })->values(),
        ]);
    }

    public function storeInventoryItem(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:100'],
            'item_type' => ['required', Rule::in(self::INVENTORY_ITEM_TYPES)],
            'quantity_on_hand' => ['required', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'unit' => ['required', 'string', 'max:20'],
        ]);

        $itemId = DB::table('inventory_items')->insertGetId($validated, 'item_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Created inventory item %s.', $validated['item_name'])
        );

        return response()->json([
            'message' => 'Inventory item created successfully.',
            'data' => DB::table('inventory_items')->where('item_id', $itemId)->first(),
        ], 201);
    }

    public function updateInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();

        if (! $item) {
            abort(404);
        }

        $validated = $request->validate([
            'item_name' => ['sometimes', 'string', 'max:100'],
            'item_type' => ['sometimes', Rule::in(self::INVENTORY_ITEM_TYPES)],
            'quantity_on_hand' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:20'],
        ]);

        if ($validated !== []) {
            DB::table('inventory_items')->where('item_id', $itemId)->update($validated);
        }

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Updated inventory item %s.', $item->item_name)
        );

        return response()->json([
            'message' => 'Inventory item updated successfully.',
            'data' => DB::table('inventory_items')->where('item_id', $itemId)->first(),
        ]);
    }

    public function destroyInventoryItem(Request $request, int $itemId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();

        if (! $item) {
            abort(404);
        }

        DB::table('inventory_items')->where('item_id', $itemId)->delete();

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVENTORY',
            sprintf('Deleted inventory item %s.', $item->item_name)
        );

        return response()->json(['message' => 'Inventory item deleted successfully.']);
    }

    public function acUnitsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return response()->json([
            'data' => DB::table('ac_units_inventory')->orderBy('brand')->orderBy('model')->get(),
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

    public function salesRecordsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $records = $this->salesRecordsBaseQuery()
            ->orderByDesc('payment.payment_date')
            ->orderByDesc('bookings.created_at')
            ->get();

        $mappedRecords = $this->mapSalesRecords($records);
        $paidRecords = $mappedRecords->filter(fn (array $record) => $record['payment_status'] === 'Paid');

        return response()->json([
            'summary' => [
                'total_revenue' => $paidRecords->sum('amount_paid'),
                'paid_bookings' => $paidRecords->count(),
                'gcash_revenue' => $paidRecords->where('payment_method', 'GCash')->sum('amount_paid'),
                'cash_revenue' => $paidRecords->where('payment_method', 'Cash')->sum('amount_paid'),
            ],
            'weekly_revenue' => $this->buildWeeklyRevenueSeries($paidRecords),
            'monthly_revenue' => $this->buildMonthlyRevenueSeries($paidRecords),
            'data' => $mappedRecords->values(),
        ]);
    }

    public function documentsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return response()->json([
            'data' => $this->mapDocuments($this->documentsBaseQuery()->orderByDesc('documents.created_at')->get()),
        ]);
    }

    public function storeDocument(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $payload = $this->normalizeDocumentPayload($request);

        $validated = validator($payload, [
            'form_name' => ['required', 'string', 'max:150'],
            'client_name' => ['required', 'string', 'max:150'],
            'service_name' => ['nullable', 'string', 'max:150'],
            'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'booking_id')],
            'status' => ['nullable', Rule::in(self::DOCUMENT_STATUSES)],
            'notes' => ['nullable', 'string'],
            'file_path' => ['nullable', 'string', 'max:255'],
        ])->validate();

        $docId = DB::table('documents')->insertGetId([
            'booking_id' => $validated['booking_id'] ?? null,
            'created_by' => (int) $request->user()->user_id,
            'form_name' => $validated['form_name'],
            'client_name' => $validated['client_name'],
            'service_name' => $validated['service_name'] ?? null,
            'status' => $validated['status'] ?? 'Draft',
            'notes' => $validated['notes'] ?? null,
            'file_path' => $validated['file_path'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'doc_id');

        $this->logActivity(
            (int) $request->user()->user_id,
            'CREATE',
            sprintf('Created document "%s".', $validated['form_name'])
        );

        return response()->json([
            'message' => 'Document created successfully.',
            'data' => $this->mapDocuments($this->documentsBaseQuery()->where('documents.doc_id', $docId)->get())->first(),
        ], 201);
    }

    public function updateDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $document = DB::table('documents')->where('doc_id', $docId)->first();

        if (! $document) {
            abort(404);
        }

        $payload = $this->normalizeDocumentPayload($request);

        $validated = validator($payload, [
            'form_name' => ['sometimes', 'string', 'max:150'],
            'client_name' => ['sometimes', 'string', 'max:150'],
            'service_name' => ['nullable', 'string', 'max:150'],
            'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'booking_id')],
            'status' => ['sometimes', Rule::in(self::DOCUMENT_STATUSES)],
            'notes' => ['nullable', 'string'],
            'file_path' => ['nullable', 'string', 'max:255'],
        ])->validate();

        if ($validated !== []) {
            DB::table('documents')->where('doc_id', $docId)->update(array_merge($validated, [
                'updated_at' => now(),
            ]));
        }

        $this->logActivity(
            (int) $request->user()->user_id,
            'UPDATE',
            sprintf('Updated document "%s".', $document->form_name)
        );

        return response()->json([
            'message' => 'Document updated successfully.',
            'data' => $this->mapDocuments($this->documentsBaseQuery()->where('documents.doc_id', $docId)->get())->first(),
        ]);
    }

    public function destroyDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $document = DB::table('documents')->where('doc_id', $docId)->first();

        if (! $document) {
            abort(404);
        }

        DB::table('documents')->where('doc_id', $docId)->delete();

        $this->logActivity(
            (int) $request->user()->user_id,
            'UPDATE',
            sprintf('Deleted document "%s".', $document->form_name)
        );

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function announcementsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return response()->json([
            'data' => $this->mapAnnouncements($this->announcementsBaseQuery()->orderByDesc('announcements.created_at')->get()),
        ]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $payload = $this->normalizeAnnouncementPayload($request);

        $validated = validator($payload, [
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'target_role_id' => ['nullable', Rule::in(array_keys(self::ROLE_LABELS))],
        ])->validate();

        $id = DB::table('announcements')->insertGetId([
            'created_by' => (int) $request->user()->user_id,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'target_role_id' => $validated['target_role_id'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'ANNOUNCE',
            sprintf('Posted announcement "%s".', $validated['title'])
        );

        return response()->json([
            'message' => 'Announcement created successfully.',
            'data' => $this->mapAnnouncements($this->announcementsBaseQuery()->where('announcements.id', $id)->get())->first(),
        ], 201);
    }

    public function updateAnnouncement(Request $request, int $announcementId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $announcement = DB::table('announcements')->where('id', $announcementId)->first();

        if (! $announcement) {
            abort(404);
        }

        $payload = $this->normalizeAnnouncementPayload($request);

        $validated = validator($payload, [
            'title' => ['sometimes', 'string', 'max:255'],
            'message' => ['sometimes', 'string'],
            'target_role_id' => ['nullable', Rule::in(array_keys(self::ROLE_LABELS))],
        ])->validate();

        if ($validated !== []) {
            DB::table('announcements')->where('id', $announcementId)->update(array_merge($validated, [
                'updated_at' => now(),
            ]));
        }

        $this->logActivity(
            (int) $request->user()->user_id,
            'ANNOUNCE',
            sprintf('Updated announcement "%s".', $announcement->title)
        );

        return response()->json([
            'message' => 'Announcement updated successfully.',
            'data' => $this->mapAnnouncements($this->announcementsBaseQuery()->where('announcements.id', $announcementId)->get())->first(),
        ]);
    }

    public function destroyAnnouncement(Request $request, int $announcementId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $announcement = DB::table('announcements')->where('id', $announcementId)->first();

        if (! $announcement) {
            abort(404);
        }

        DB::table('announcements')->where('id', $announcementId)->delete();

        $this->logActivity(
            (int) $request->user()->user_id,
            'ANNOUNCE',
            sprintf('Deleted announcement "%s".', $announcement->title)
        );

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

    public function activityLogsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $query = $this->activityLogsBaseQuery()->orderByDesc('activity_logs.created_at');

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($builder) use ($search) {
                $builder->where('activity_logs.action_type', 'like', "%{$search}%")
                    ->orWhere('activity_logs.description', 'like', "%{$search}%")
                    ->orWhere('users.given_name', 'like', "%{$search}%")
                    ->orWhere('users.last_name', 'like', "%{$search}%");
            });
        }

        if ($actionType = $request->string('action_type')->trim()->value()) {
            $query->where('activity_logs.action_type', $actionType);
        }

        if ($roleId = $this->resolveRoleIdFromRequest($request, 'role_id', 'role')) {
            $query->where('users.role_id', $roleId);
        }

        $limit = min(max((int) $request->integer('limit', 100), 1), 200);

        return response()->json([
            'data' => $this->mapActivityLogs($query->limit($limit)->get()),
        ]);
    }

    protected function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user() && (int) $request->user()->role_id === 1, 403);
    }

    protected function resolveRoleIdFromRequest(Request $request, string $roleIdKey, string $roleLabelKey): ?int
    {
        $roleId = $request->input($roleIdKey);

        if ($roleId !== null && $roleId !== '') {
            return (int) $roleId;
        }

        $roleLabel = $request->input($roleLabelKey);

        if ($roleLabel === null || $roleLabel === '') {
            return null;
        }

        $roleId = array_search($roleLabel, self::ROLE_LABELS, true);

        return $roleId === false ? null : (int) $roleId;
    }

    protected function normalizeStaffPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('role_id', $payload) && ! empty($payload['role'])) {
            $payload['role_id'] = array_search($payload['role'], self::ROLE_LABELS, true) ?: null;
        }

        return $payload;
    }

    protected function normalizeBookingAssignmentPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('assigned_tech_id', $payload) && array_key_exists('technician_id', $payload)) {
            $payload['assigned_tech_id'] = $payload['technician_id'];
        }

        return $payload;
    }

    protected function normalizeDocumentPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('service_name', $payload) && array_key_exists('service', $payload)) {
            $payload['service_name'] = $payload['service'];
        }

        return $payload;
    }

    protected function normalizeAnnouncementPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('target_role_id', $payload)) {
            $targetRole = $payload['target_role'] ?? null;

            if ($targetRole === 'All Staff' || $targetRole === null || $targetRole === '') {
                $payload['target_role_id'] = null;
            } elseif ($targetRole) {
                $payload['target_role_id'] = array_search($targetRole, self::ROLE_LABELS, true) ?: null;
            }
        }

        return $payload;
    }

    protected function staffBaseQuery()
    {
        return DB::table('users')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->leftJoin('technician_details', 'technician_details.user_id', '=', 'users.user_id')
            ->select([
                'users.user_id',
                'users.role_id',
                'users.given_name',
                'users.middle_name',
                'users.last_name',
                'users.birthdate',
                'users.sex',
                'users.address',
                'users.contact_number',
                'users.email',
                'users.created_at',
                'users.updated_at',
                'users.is_active',
                'roles.role_name',
                'technician_details.certificate_expiry',
            ]);
    }

    protected function bookingsBaseQuery()
    {
        return DB::table('bookings')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->leftJoin('users as technicians', 'technicians.user_id', '=', 'bookings.assigned_tech_id')
            ->leftJoin('payment', 'payment.booking_id', '=', 'bookings.booking_id')
            ->select([
                'bookings.booking_id',
                'bookings.client_id',
                'bookings.assigned_tech_id',
                'bookings.scheduled_date',
                'bookings.booking_status',
                'bookings.created_at',
                'services.service_id',
                'services.service_name',
                'services.base_price',
                'payment.payment_status',
                'payment.payment_method',
                'payment.amount_paid',
                'payment.payment_date',
                'clients.given_name as client_given_name',
                'clients.middle_name as client_middle_name',
                'clients.last_name as client_last_name',
                'clients.address as client_address',
                'clients.contact_number as client_contact_number',
                'clients.email as client_email',
                'technicians.user_id as tech_user_id',
                'technicians.given_name as tech_given_name',
                'technicians.middle_name as tech_middle_name',
                'technicians.last_name as tech_last_name',
            ]);
    }

    protected function salesRecordsBaseQuery()
    {
        return DB::table('bookings')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->leftJoin('payment', 'payment.booking_id', '=', 'bookings.booking_id')
            ->leftJoin('customer_feedback_and_ratings as feedback', 'feedback.booking_id', '=', 'bookings.booking_id')
            ->select([
                'bookings.booking_id',
                'bookings.scheduled_date',
                'bookings.booking_status',
                'bookings.created_at',
                'services.service_name',
                'payment.amount_paid',
                'payment.payment_method',
                'payment.payment_status',
                'payment.payment_date',
                'feedback.rating',
                'feedback.feedback',
                'clients.given_name as client_given_name',
                'clients.middle_name as client_middle_name',
                'clients.last_name as client_last_name',
            ]);
    }

    protected function documentsBaseQuery()
    {
        return DB::table('documents')
            ->leftJoin('users as creators', 'creators.user_id', '=', 'documents.created_by')
            ->select([
                'documents.doc_id',
                'documents.booking_id',
                'documents.created_by',
                'documents.form_name',
                'documents.client_name',
                'documents.service_name',
                'documents.status',
                'documents.file_path',
                'documents.notes',
                'documents.created_at',
                'documents.updated_at',
                'creators.given_name as creator_given_name',
                'creators.middle_name as creator_middle_name',
                'creators.last_name as creator_last_name',
            ]);
    }

    protected function announcementsBaseQuery()
    {
        return DB::table('announcements')
            ->join('users as creators', 'creators.user_id', '=', 'announcements.created_by')
            ->leftJoin('roles', 'roles.role_id', '=', 'announcements.target_role_id')
            ->select([
                'announcements.id',
                'announcements.created_by',
                'announcements.title',
                'announcements.message',
                'announcements.target_role_id',
                'announcements.created_at',
                'announcements.updated_at',
                'creators.given_name as creator_given_name',
                'creators.middle_name as creator_middle_name',
                'creators.last_name as creator_last_name',
                'roles.role_name',
            ]);
    }

    protected function activityLogsBaseQuery()
    {
        return DB::table('activity_logs')
            ->join('users', 'users.user_id', '=', 'activity_logs.user_id')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->select([
                'activity_logs.id',
                'activity_logs.user_id',
                'activity_logs.action_type',
                'activity_logs.description',
                'activity_logs.created_at',
                'users.role_id',
                'users.given_name',
                'users.middle_name',
                'users.last_name',
                'roles.role_name',
            ]);
    }

    protected function techniciansCollection(): Collection
    {
        return $this->staffBaseQuery()
            ->where('users.role_id', 5)
            ->where(function ($query) {
                $query->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })
            ->orderBy('users.last_name')
            ->get()
            ->map(function ($tech) {
                return [
                    'user_id' => (int) $tech->user_id,
                    'given_name' => $tech->given_name,
                    'middle_name' => $tech->middle_name,
                    'last_name' => $tech->last_name,
                    'full_name' => $this->formatName($tech->given_name, $tech->middle_name, $tech->last_name),
                    'certificate_expiry' => $tech->certificate_expiry,
                ];
            })
            ->values();
    }

    protected function mapStaff(Collection $rows): Collection
    {
        if ($rows->isEmpty()) {
            return collect();
        }

        $specialtiesByUser = DB::table('technician_specialty')
            ->join('specialties', 'specialties.specialty_id', '=', 'technician_specialty.specialty_id')
            ->whereIn('technician_specialty.user_id', $rows->pluck('user_id')->all())
            ->orderBy('specialties.specialty_name')
            ->get(['technician_specialty.user_id', 'specialties.specialty_id', 'specialties.specialty_name'])
            ->groupBy('user_id');

        return $rows->map(function ($row) use ($specialtiesByUser) {
            $specialties = collect($specialtiesByUser->get($row->user_id, []))
                ->map(fn ($specialty) => [
                    'specialty_id' => (int) $specialty->specialty_id,
                    'specialty_name' => $specialty->specialty_name,
                ])
                ->values();

            return [
                'user_id' => (int) $row->user_id,
                'role_id' => (int) $row->role_id,
                'role' => self::ROLE_LABELS[(int) $row->role_id] ?? ($row->role_name ?? 'Staff'),
                'given_name' => $row->given_name,
                'middle_name' => $row->middle_name,
                'last_name' => $row->last_name,
                'full_name' => $this->formatName($row->given_name, $row->middle_name, $row->last_name),
                'birthdate' => $row->birthdate,
                'sex' => $row->sex,
                'address' => $row->address,
                'contact_number' => $row->contact_number,
                'email' => $row->email,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
                'is_active' => $row->is_active === null ? true : (bool) $row->is_active,
                'status' => ((int) $row->is_active === 0) ? 'Archived' : 'Active',
                'certificate_expiry' => $row->certificate_expiry,
                'specialties' => $specialties,
            ];
        })->values();
    }

    protected function mapBookings(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            return [
                'booking_id' => (int) $row->booking_id,
                'client_id' => (int) $row->client_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'client_address' => $row->client_address,
                'client_contact_number' => $row->client_contact_number,
                'client_email' => $row->client_email,
                'service_id' => (int) $row->service_id,
                'service' => $row->service_name,
                'service_base_price' => (float) $row->base_price,
                'assigned_tech_id' => $row->assigned_tech_id ? (int) $row->assigned_tech_id : null,
                'assigned_tech_name' => $row->tech_user_id ? $this->formatName($row->tech_given_name, $row->tech_middle_name, $row->tech_last_name) : null,
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'created_at' => $row->created_at,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_method' => $row->payment_method,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : null,
                'payment_date' => $row->payment_date,
            ];
        })->values();
    }

    protected function mapSalesRecords(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            return [
                'booking_id' => (int) $row->booking_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'service' => $row->service_name,
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : 0.0,
                'payment_method' => $row->payment_method,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_date' => $row->payment_date,
                'rating' => $row->rating ? (int) $row->rating : null,
                'feedback' => $row->feedback,
                'created_at' => $row->created_at,
            ];
        })->values();
    }

    protected function mapDocuments(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            return [
                'doc_id' => (int) $row->doc_id,
                'booking_id' => $row->booking_id ? (int) $row->booking_id : null,
                'created_by' => (int) $row->created_by,
                'created_by_name' => $row->creator_given_name ? $this->formatName($row->creator_given_name, $row->creator_middle_name, $row->creator_last_name) : null,
                'form_name' => $row->form_name,
                'client_name' => $row->client_name,
                'service' => $row->service_name,
                'status' => $row->status,
                'file_path' => $row->file_path,
                'notes' => $row->notes,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        })->values();
    }

    protected function mapAnnouncements(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            $targetRoleId = $row->target_role_id !== null ? (int) $row->target_role_id : null;

            return [
                'id' => (int) $row->id,
                'created_by' => (int) $row->created_by,
                'created_by_name' => $this->formatName($row->creator_given_name, $row->creator_middle_name, $row->creator_last_name),
                'title' => $row->title,
                'message' => $row->message,
                'target_role_id' => $targetRoleId,
                'target_role' => $targetRoleId ? (self::ROLE_LABELS[$targetRoleId] ?? $row->role_name) : 'All Staff',
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        })->values();
    }

    protected function mapActivityLogs(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            $roleId = isset($row->role_id) ? (int) $row->role_id : null;

            return [
                'id' => (int) $row->id,
                'user_id' => (int) $row->user_id,
                'user_name' => $this->formatName($row->given_name, $row->middle_name, $row->last_name),
                'role_id' => $roleId,
                'role' => $roleId ? (self::ROLE_LABELS[$roleId] ?? $row->role_name ?? 'User') : ($row->role_name ?? 'User'),
                'action_type' => $row->action_type,
                'description' => $row->description,
                'created_at' => $row->created_at,
            ];
        })->values();
    }

    protected function buildWeeklyRevenueSeries(iterable $records): Collection
    {
        $rows = collect($records);
        $today = now()->startOfDay();

        return collect(range(6, 0))->map(function (int $daysAgo) use ($rows, $today) {
            $date = $today->copy()->subDays($daysAgo);
            $matches = $rows->filter(function ($row) use ($date) {
                $paymentDate = data_get($row, 'payment_date');

                if (! $paymentDate) {
                    return false;
                }

                return Carbon::parse($paymentDate)->isSameDay($date);
            });

            return [
                'day' => $date->format('D'),
                'date' => $date->toDateString(),
                'bookings' => $matches->count(),
                'revenue' => (float) $matches->sum(function ($row) {
                    return (float) data_get($row, 'amount_paid', 0);
                }),
            ];
        })->values();
    }

    protected function buildMonthlyRevenueSeries(Collection $records): Collection
    {
        return collect(range(11, 0))->map(function (int $monthsAgo) use ($records) {
            $month = now()->startOfMonth()->subMonths($monthsAgo);
            $matches = $records->filter(function ($record) use ($month) {
                $paymentDate = $record['payment_date'] ?? null;

                if (! $paymentDate) {
                    return false;
                }

                return Carbon::parse($paymentDate)->format('Y-m') === $month->format('Y-m');
            });

            return [
                'month' => $month->format('M'),
                'year_month' => $month->format('Y-m'),
                'revenue' => (float) $matches->sum('amount_paid'),
                'bookings' => $matches->count(),
            ];
        })->values();
    }

    protected function manageableStaffRow(int $userId): object
    {
        $staff = DB::table('users')->where('user_id', $userId)->whereIn('role_id', self::STAFF_ROLE_IDS)->first();

        if (! $staff) {
            abort(404);
        }

        return $staff;
    }

    protected function syncTechnicianRelations(int $userId, int $roleId, ?string $certificateExpiry, ?array $specialtyIds): void
    {
        if ($roleId !== 5) {
            DB::table('technician_specialty')->where('user_id', $userId)->delete();
            DB::table('technician_details')->where('user_id', $userId)->delete();

            return;
        }

        DB::table('technician_details')->updateOrInsert(
            ['user_id' => $userId],
            ['certificate_expiry' => $certificateExpiry]
        );

        if ($specialtyIds === null) {
            return;
        }

        DB::table('technician_specialty')->where('user_id', $userId)->delete();

        if ($specialtyIds === []) {
            return;
        }

        DB::table('technician_specialty')->insert(
            collect($specialtyIds)
                ->unique()
                ->map(fn ($specialtyId) => ['user_id' => $userId, 'specialty_id' => $specialtyId])
                ->values()
                ->all()
        );
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

    protected function formatName(?string $givenName, ?string $middleName, ?string $lastName): string
    {
        return trim(implode(' ', array_filter([$givenName, $middleName, $lastName])));
    }
}
