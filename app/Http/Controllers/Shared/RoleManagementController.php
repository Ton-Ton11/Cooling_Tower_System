<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RoleManagementController extends Controller
{
    /**
     * Get all staff role categories and user counts.
     */
    public function index(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $isSuperAdmin = (int) $currentUser->role_id === 1;

        // Query all staff roles (exclude Customer role 6)
        $query = Role::where('role_id', '!=', 6)->orderBy('role_id');

        $roles = $query->get()->map(function ($role) use ($isSuperAdmin) {
            $totalUsers = User::where('role_id', $role->role_id)->count();
            $activeUsers = User::where('role_id', $role->role_id)->where(function ($q) {
                $q->whereNull('is_active')->orWhere('is_active', 1);
            })->count();
            $deactivatedUsers = User::where('role_id', $role->role_id)->where('is_active', 0)->count();

            return [
                'role_id' => (int) $role->role_id,
                'role' => $role->role_name,
                'role_name' => $role->role_name,
                'description' => $role->description,
                'is_system' => (bool) $role->is_system || in_array((int) $role->role_id, [1, 2, 3, 4, 5, 6], true),
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'deactivated_users' => $deactivatedUsers,
                'can_manage' => $isSuperAdmin || (int) $role->role_id !== 1,
            ];
        });

        return response()->json([
            'roles' => $roles,
            'can_create_super_admin' => $isSuperAdmin,
        ]);
    }

    /**
     * Store a newly created role category.
     */
    public function storeRole(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $userRoleId = (int) $currentUser->role_id;

        if (! in_array($userRoleId, [1, 3], true)) {
            abort(403, 'Unauthorized access.');
        }

        $validated = $request->validate([
            'role_name' => [
                'required',
                'string',
                'max:50',
                'unique:roles,role_name',
                Rule::notIn(['Customer', 'Super Admin', 'super admin', 'customer']),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'role_name.not_in' => 'The Customer or Super Admin role cannot be recreated.',
        ]);

        $role = Role::create([
            'role_name' => trim($validated['role_name']),
            'description' => $validated['description'] ?? null,
            'is_system' => false,
        ]);

        $this->logActivity(
            $currentUser->user_id,
            'ROLE_CREATE',
            sprintf('Created new role category "%s".', $role->role_name)
        );

        return response()->json([
            'message' => sprintf('Role category "%s" created successfully!', $role->role_name),
            'role' => [
                'role_id' => (int) $role->role_id,
                'role' => $role->role_name,
                'role_name' => $role->role_name,
                'description' => $role->description,
                'is_system' => false,
                'total_users' => 0,
                'active_users' => 0,
                'deactivated_users' => 0,
                'can_manage' => true,
            ],
        ], 201);
    }

    /**
     * Update an existing role category.
     */
    public function updateRole(Request $request, int $roleId): JsonResponse
    {
        $currentUser = $request->user();
        $userRoleId = (int) $currentUser->role_id;

        if (! in_array($userRoleId, [1, 3], true)) {
            abort(403, 'Unauthorized access.');
        }

        $role = Role::findOrFail($roleId);

        // Protect Super Admin from Admin Assistant
        if ($roleId === 1 && $userRoleId !== 1) {
            throw ValidationException::withMessages([
                'role_id' => ['Admin Assistants cannot modify the Super Admin role.'],
            ]);
        }

        // Protect core system roles from renaming (allow description updates)
        $isCoreSystem = (bool) $role->is_system || in_array($roleId, [1, 2, 3, 4, 5, 6], true);

        $rules = [
            'description' => ['nullable', 'string', 'max:500'],
        ];

        if (! $isCoreSystem) {
            $rules['role_name'] = [
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'role_name')->ignore($roleId, 'role_id'),
                Rule::notIn(['Customer', 'Super Admin', 'super admin', 'customer']),
            ];
        }

        $validated = $request->validate($rules);

        $oldName = $role->role_name;
        if (! empty($validated['role_name'])) {
            $role->role_name = trim($validated['role_name']);
        }
        if (array_key_exists('description', $validated)) {
            $role->description = $validated['description'];
        }
        $role->save();

        $this->logActivity(
            $currentUser->user_id,
            'ROLE_UPDATE',
            sprintf('Updated role category "%s".', $oldName)
        );

        return response()->json([
            'message' => sprintf('Role category "%s" updated successfully!', $role->role_name),
            'role' => $role->fresh(),
        ]);
    }

    /**
     * Delete a custom role category.
     */
    public function destroyRole(Request $request, int $roleId): JsonResponse
    {
        $currentUser = $request->user();
        $userRoleId = (int) $currentUser->role_id;

        if (! in_array($userRoleId, [1, 3], true)) {
            abort(403, 'Unauthorized access.');
        }

        $role = Role::findOrFail($roleId);

        // Core system roles cannot be deleted
        if ($role->is_system || in_array($roleId, [1, 2, 3, 4, 5, 6], true)) {
            throw ValidationException::withMessages([
                'role_id' => [sprintf('The core system role "%s" cannot be deleted.', $role->role_name)],
            ]);
        }

        // Check if any users exist in this role
        $usersCount = User::where('role_id', $roleId)->count();
        if ($usersCount > 0) {
            throw ValidationException::withMessages([
                'role_id' => [sprintf('Cannot delete role "%s" because %d account(s) are currently assigned to this role. Reassign or delete those accounts first.', $role->role_name, $usersCount)],
            ]);
        }

        $name = $role->role_name;
        $role->delete();

        $this->logActivity(
            $currentUser->user_id,
            'ROLE_DELETE',
            sprintf('Deleted custom role category "%s".', $name)
        );

        return response()->json([
            'message' => sprintf('Role category "%s" deleted successfully.', $name),
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
