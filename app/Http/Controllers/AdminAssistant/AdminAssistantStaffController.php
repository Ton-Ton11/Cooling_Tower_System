<?php

namespace App\Http\Controllers\AdminAssistant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminAssistantStaffController extends AdminAssistantBaseController
{
    public function staffIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $query = $this->staffBaseQuery()
            ->where('users.role_id', '!=', 6)
            ->orderBy('users.role_id')
            ->orderBy('users.last_name');

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
                'roles'      => collect(self::ROLE_LABELS)
                    ->only(self::STAFF_ROLE_IDS)
                    ->map(fn (string $label, int $roleId) => ['role_id' => $roleId, 'role' => $label])
                    ->values(),
                'specialties' => DB::table('specialties')->orderBy('specialty_name')->get(['specialty_id', 'specialty_name']),
            ],
        ]);
    }

    public function storeStaff(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $payload = $this->normalizeStaffPayload($request);

        $validated = validator($payload, [
            'role_id'            => ['required', Rule::in(self::STAFF_ROLE_IDS)],
            'given_name'         => ['required', 'string', 'max:100'],
            'middle_name'        => ['nullable', 'string', 'max:100'],
            'last_name'          => ['required', 'string', 'max:100'],
            'birthdate'          => ['required', 'date', 'before:today'],
            'sex'                => ['required', Rule::in(['Male', 'Female'])],
            'address'            => ['required', 'string'],
            'contact_number'     => ['required', 'string', 'max:15'],
            'email'              => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'password'           => ['required', 'string', 'min:8', 'confirmed'],
            'certificate_expiry' => ['nullable', 'date'],
            'specialty_ids'      => ['nullable', 'array'],
            'specialty_ids.*'    => ['integer', Rule::exists('specialties', 'specialty_id')],
        ])->validate();

        if ((int) $validated['role_id'] === 5 && empty($validated['certificate_expiry'])) {
            throw ValidationException::withMessages([
                'certificate_expiry' => ['A technician certificate expiry date is required.'],
            ]);
        }

        $userId = DB::transaction(function () use ($validated, $request) {
            $userId = DB::table('users')->insertGetId([
                'role_id'        => $validated['role_id'],
                'given_name'     => $validated['given_name'],
                'middle_name'    => $validated['middle_name'] ?? null,
                'last_name'      => $validated['last_name'],
                'birthdate'      => $validated['birthdate'],
                'sex'            => $validated['sex'],
                'address'        => $validated['address'],
                'contact_number' => $validated['contact_number'],
                'email'          => $validated['email'],
                'password'       => Hash::make($validated['password']),
                'is_active'      => true,
                'created_at'     => now(),
                'updated_at'     => now(),
            ], 'user_id');

            $this->syncTechnicianRelations($userId, (int) $validated['role_id'], $validated['certificate_expiry'] ?? null, $validated['specialty_ids'] ?? []);
            $this->logActivity((int) $request->user()->user_id, 'CREATE', sprintf('Created staff account for %s (%s).', $this->formatName($validated['given_name'], $validated['middle_name'] ?? null, $validated['last_name']), self::ROLE_LABELS[(int) $validated['role_id']] ?? 'Staff'));

            return $userId;
        });

        $created = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account created successfully.',
            'data'    => $this->mapStaff(collect([$created]))->first(),
        ], 201);
    }

    public function updateStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeRole($request);

        $staff   = $this->manageableStaffRow($userId);
        $payload = $this->normalizeStaffPayload($request);

        $validated = validator($payload, [
            'role_id'            => ['sometimes', Rule::in(self::STAFF_ROLE_IDS)],
            'given_name'         => ['sometimes', 'string', 'max:100'],
            'middle_name'        => ['nullable', 'string', 'max:100'],
            'last_name'          => ['sometimes', 'string', 'max:100'],
            'birthdate'          => ['sometimes', 'date', 'before:today'],
            'sex'                => ['sometimes', Rule::in(['Male', 'Female'])],
            'address'            => ['sometimes', 'string'],
            'contact_number'     => ['sometimes', 'string', 'max:15'],
            'email'              => ['sometimes', 'string', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId, 'user_id')],
            'password'           => ['nullable', 'string', 'min:8', 'confirmed'],
            'certificate_expiry' => ['nullable', 'date'],
            'specialty_ids'      => ['nullable', 'array'],
            'specialty_ids.*'    => ['integer', Rule::exists('specialties', 'specialty_id')],
        ])->validate();

        $finalRoleId             = (int) ($validated['role_id'] ?? $staff->role_id);
        $existingTechDetails     = DB::table('technician_details')->where('user_id', $userId)->first();

        if ($finalRoleId === 5 && empty($validated['certificate_expiry']) && ! $existingTechDetails) {
            throw ValidationException::withMessages(['certificate_expiry' => ['A technician certificate expiry date is required.']]);
        }

        DB::transaction(function () use ($validated, $userId, $finalRoleId, $existingTechDetails, $request, $staff) {
            $updateData = collect([
                'role_id'        => $validated['role_id'] ?? null,
                'given_name'     => $validated['given_name'] ?? null,
                'middle_name'    => array_key_exists('middle_name', $validated) ? $validated['middle_name'] : null,
                'last_name'      => $validated['last_name'] ?? null,
                'birthdate'      => $validated['birthdate'] ?? null,
                'sex'            => $validated['sex'] ?? null,
                'address'        => $validated['address'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'email'          => $validated['email'] ?? null,
                'updated_at'     => now(),
            ])->filter(fn ($v, $k) => $k === 'updated_at' || array_key_exists($k, $validated))->all();

            if (! empty($validated['password'])) {
                $updateData['password'] = Hash::make($validated['password']);
            }

            DB::table('users')->where('user_id', $userId)->update($updateData);
            $this->syncTechnicianRelations($userId, $finalRoleId, $validated['certificate_expiry'] ?? ($existingTechDetails->certificate_expiry ?? null), $validated['specialty_ids'] ?? null);
            $this->logActivity((int) $request->user()->user_id, 'UPDATE', sprintf('Updated staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name)));
        });

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account updated successfully.',
            'data'    => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    public function archiveStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeRole($request);

        if ((int) $request->user()->user_id === $userId) {
            throw ValidationException::withMessages(['user_id' => ['You cannot archive your own account.']]);
        }

        $staff = $this->manageableStaffRow($userId);

        DB::table('users')->where('user_id', $userId)->update(['is_active' => false, 'updated_at' => now()]);
        $this->logActivity((int) $request->user()->user_id, 'ARCHIVE', sprintf('Archived staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name)));

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account archived successfully.',
            'data'    => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }

    public function restoreStaff(Request $request, int $userId): JsonResponse
    {
        $this->authorizeRole($request);

        $staff = $this->manageableStaffRow($userId);

        DB::table('users')->where('user_id', $userId)->update(['is_active' => true, 'updated_at' => now()]);
        $this->logActivity((int) $request->user()->user_id, 'RESTORE', sprintf('Restored staff account for %s.', $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name)));

        $updated = $this->staffBaseQuery()->where('users.user_id', $userId)->first();

        return response()->json([
            'message' => 'Staff account restored successfully.',
            'data'    => $this->mapStaff(collect([$updated]))->first(),
        ]);
    }
}
