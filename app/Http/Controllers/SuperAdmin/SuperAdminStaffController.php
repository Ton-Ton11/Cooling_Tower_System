<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SuperAdminStaffController extends SuperAdminBaseController
{
    public function staffIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $query = $this->staffBaseQuery()
            ->where('users.role_id', '!=', 6)
            ->orderBy('users.role_id')
            ->orderBy('users.last_name');

        if (! $request->boolean('include_archived') && ! $request->boolean('include_deactivated', true)) {
            $query->where(function ($builder) {
                $builder->whereNull('users.is_active')->orWhere('users.is_active', 1);
            });
        }

        if ($roleId = $this->resolveRoleIdFromRequest($request, 'role_id', 'role')) {
            $query->where('users.role_id', $roleId);
        }

        $roles = Role::where('role_id', '!=', 6)
            ->orderBy('role_id')
            ->get(['role_id', 'role_name', 'description', 'is_system'])
            ->map(fn ($r) => [
                'role_id' => (int) $r->role_id,
                'role' => $r->role_name,
                'role_name' => $r->role_name,
                'description' => $r->description,
                'is_system' => (bool) $r->is_system,
            ])
            ->values();

        $businessCustomers = \Illuminate\Support\Facades\Schema::hasColumn('users', 'account_type')
            ? $this->mapBusinessCustomers(
                $this->businessCustomersBaseQuery()
                    ->orderByRaw("CASE WHEN users.verification_status = 'pending' THEN 0 WHEN users.verification_status = 'rejected' THEN 1 ELSE 2 END")
                    ->orderByDesc('users.created_at')
                    ->get()
            )
            : collect();

        return response()->json([
            'data' => $this->mapStaff($query->get()),
            'meta' => [
                'roles' => $roles,
                'specialties' => DB::table('specialties')->orderBy('specialty_name')->get(['specialty_id', 'specialty_name']),
                'business_customers' => $businessCustomers,
                'pending_business_verifications' => $businessCustomers->where('verification_status', 'pending')->count(),
            ],
        ]);
    }

    public function businessCustomersIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $query = $this->businessCustomersBaseQuery()
            ->orderByRaw("CASE WHEN users.verification_status = 'pending' THEN 0 WHEN users.verification_status = 'rejected' THEN 1 ELSE 2 END")
            ->orderByDesc('users.created_at');

        if ($status = strtolower(trim((string) $request->input('status', '')))) {
            if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
                $query->where('users.verification_status', $status);
            }
        }

        $customers = $this->mapBusinessCustomers($query->get());

        return response()->json([
            'data' => $customers,
            'meta' => [
                'pending_count' => $customers->where('verification_status', 'pending')->count(),
                'approved_count' => $customers->where('verification_status', 'approved')->count(),
                'rejected_count' => $customers->where('verification_status', 'rejected')->count(),
            ],
        ]);
    }

    public function verifyBusinessCustomer(Request $request, int $userId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $rawStatus = strtolower(trim((string) ($request->input('status') ?? $request->input('verification_status') ?? $request->input('action') ?? '')));
        $normalizedStatus = match ($rawStatus) {
            'approve', 'approved' => 'approved',
            'reject', 'rejected' => 'rejected',
            'pending' => 'pending',
            default => $rawStatus,
        };

        $request->merge(['verification_status' => $normalizedStatus]);

        $validated = $request->validate([
            'verification_status' => ['required', Rule::in(['approved', 'rejected'])],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $customer = DB::table('users')
            ->where('user_id', $userId)
            ->where('role_id', 6)
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'user_id' => ['Customer account not found.'],
            ]);
        }

        $isApproved = $validated['verification_status'] === 'approved';
        $rejectionReason = ! $isApproved ? trim((string) ($validated['rejection_reason'] ?? '')) : null;

        DB::table('users')
            ->where('user_id', $userId)
            ->update([
                'verification_status' => $validated['verification_status'],
                'verification_rejection_reason' => $rejectionReason ?: null,
                'verified_at' => now(),
                'verified_by' => (int) $request->user()->user_id,
                'updated_at' => now(),
            ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            $isApproved ? 'APPROVE' : 'UPDATE',
            sprintf(
                '%s Business Customer account for "%s" (TIN: %s, Rep: %s)%s.',
                $isApproved ? 'Approved' : 'Rejected',
                $customer->company_name ?: 'Company',
                $customer->tin ?: 'N/A',
                $this->formatName($customer->given_name, $customer->middle_name, $customer->last_name),
                (! $isApproved && $rejectionReason) ? " — Reason: {$rejectionReason}" : ''
            )
        );

        $updated = $this->businessCustomersBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => $isApproved
                ? sprintf('Business account for "%s" has been approved and unlocked for service bookings.', $customer->company_name ?: 'Customer')
                : sprintf('Business account verification for "%s" has been rejected.', $customer->company_name ?: 'Customer'),
            'data' => $updated ? $this->mapBusinessCustomers(collect([$updated]))->first() : null,
        ]);
    }

    public function storeStaff(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $payload = $this->normalizeStaffPayload($request);

        $validated = validator($payload, [
            'role_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'role_id'),
                Rule::notIn([6]), // Super Admin cannot create Customer accounts via staff
            ],
            'given_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => ['required', 'date', 'before:today'],
            'sex' => ['required', Rule::in(['Male', 'Female'])],
            'address' => ['required', 'string'],
            'contact_number' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'certificate_expiry' => ['nullable', 'date'],
            'specialty_ids' => ['nullable', 'array'],
            'specialty_ids.*' => ['integer', Rule::exists('specialties', 'specialty_id')],
        ], [
            'role_id.not_in' => 'Customer accounts cannot be created in staff management.',
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
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ], 'user_id');

            $this->syncTechnicianRelations($userId, (int) $validated['role_id'], $validated['certificate_expiry'] ?? null, $validated['specialty_ids'] ?? []);

            $role = Role::find($validated['role_id']);
            $this->logActivity(
                (int) $request->user()->user_id,
                'CREATE',
                sprintf(
                    'Created staff account for %s (%s).',
                    $this->formatName($validated['given_name'], $validated['middle_name'] ?? null, $validated['last_name']),
                    $role ? $role->role_name : 'Staff'
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
            'role_id' => [
                'sometimes',
                'integer',
                Rule::exists('roles', 'role_id'),
                Rule::notIn([6]),
            ],
            'given_name' => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'birthdate' => ['sometimes', 'date', 'before:today'],
            'sex' => ['sometimes', Rule::in(['Male', 'Female'])],
            'address' => ['sometimes', 'string'],
            'contact_number' => ['sometimes', 'string', 'max:50'],
            'email' => ['sometimes', 'string', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId, 'user_id')],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'certificate_expiry' => ['nullable', 'date'],
            'specialty_ids' => ['nullable', 'array'],
            'specialty_ids.*' => ['integer', Rule::exists('specialties', 'specialty_id')],
        ], [
            'role_id.not_in' => 'Staff cannot be assigned to the Customer role.',
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

    public function deactivateStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $staff = $this->manageableStaffRow($userId);

        if ((int) $staff->role_id === 1) {
            throw ValidationException::withMessages([
                'user_id' => ['Super Admin accounts cannot be deactivated.'],
            ]);
        }

        if ((int) $request->user()->user_id === $userId) {
            throw ValidationException::withMessages([
                'user_id' => ['You cannot deactivate your own account.'],
            ]);
        }

        DB::table('users')->where('user_id', $userId)->update([
            'is_active' => false,
            'updated_at' => now(),
        ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'DEACTIVATE',
            sprintf('Deactivated staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name))
        );

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account deactivated successfully.',
            'data' => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    public function reactivateStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $staff = $this->manageableStaffRow($userId);

        DB::table('users')->where('user_id', $userId)->update([
            'is_active' => true,
            'updated_at' => now(),
        ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'REACTIVATE',
            sprintf('Reactivated staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name))
        );

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account reactivated successfully.',
            'data' => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    // Legacy aliases for backward compatibility
    public function archiveStaff(Request $request, int $userId): JsonResponse
    {
        return $this->deactivateStaff($request, $userId);
    }

    public function restoreStaff(Request $request, int $userId): JsonResponse
    {
        return $this->reactivateStaff($request, $userId);
    }
}
