<?php

namespace App\Http\Controllers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class UserPresenceController extends Controller
{
    private const ROLE_LABELS = [
        1 => 'Super Admin',
        2 => 'Manager',
        3 => 'Admin Assistant',
        4 => 'Tools Man',
        5 => 'Technician',
        6 => 'Customer',
        7 => 'Head Tech',
    ];

    /**
     * Heartbeat endpoint to refresh online status and timestamp.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->update([
                'is_online' => true,
                'last_seen_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'is_online' => true,
            'last_seen_at' => $user?->last_seen_at?->toISOString() ?? now()->toISOString(),
        ]);
    }

    /**
     * Get real-time active staff list and presence status.
     */
    public function staffPresence(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $staffList = self::getStaffPresenceList($currentUser);

        $onlineCount = $staffList->where('is_online', true)->count();
        $isSuperAdmin = (int) ($currentUser?->role_id ?? 0) === 1;

        return response()->json([
            'staff' => $staffList->values(),
            'online_count' => $onlineCount,
            'total_count' => $staffList->count(),
            'is_super_admin' => $isSuperAdmin,
            'hide_active_status' => (bool) ($currentUser?->hide_active_status ?? false),
        ]);
    }

    /**
     * Toggle or set Super Admin's active status visibility.
     */
    public function toggleVisibility(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || (int) $user->role_id !== 1) {
            return response()->json([
                'success' => false,
                'message' => 'Only Super Admin can change active status visibility.',
            ], 403);
        }

        if ($request->has('hide')) {
            $user->hide_active_status = $request->boolean('hide');
        } else {
            $user->hide_active_status = ! (bool) $user->hide_active_status;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'hide_active_status' => (bool) $user->hide_active_status,
            'message' => $user->hide_active_status
                ? 'Your active status is now hidden from employee users.'
                : 'Your active status is now visible to employee users.',
        ]);
    }

    /**
     * Core reusable query to get staff presence list respecting Super Admin hide setting.
     *
     * @param User|null $currentUser
     * @return Collection
     */
    public static function getStaffPresenceList(?User $currentUser): Collection
    {
        $isSuperAdmin = $currentUser && (int) $currentUser->role_id === 1;

        $query = DB::table('users')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->where('users.role_id', '!=', 6) // Exclude customers
            ->where(function ($q) {
                $q->whereNull('users.is_active')->orWhere('users.is_active', 1);
            });

        // If the viewer is NOT Super Admin, filter out Super Admins whose active status is hidden
        if (! $isSuperAdmin) {
            $query->where(function ($q) {
                // Non-super-admins are always visible
                $q->where('users.role_id', '!=', 1)
                  // Super admin is visible only if hide_active_status is explicitly false
                  ->orWhere(function ($sa) {
                      $sa->where('users.role_id', 1)
                         ->where('users.hide_active_status', false);
                  });
            });
        }

        $records = $query->select([
            'users.user_id',
            'users.role_id',
            'users.given_name',
            'users.middle_name',
            'users.last_name',
            'users.is_online',
            'users.last_seen_at',
            'users.hide_active_status',
            'roles.role_name',
        ])
        ->orderBy('users.role_id')
        ->orderBy('users.last_name')
        ->get();

        $now = now();
        $onlineThreshold = $now->copy()->subMinutes(2);

        return $records->map(function ($staff) use ($onlineThreshold) {
            $lastSeen = $staff->last_seen_at ? Carbon::parse($staff->last_seen_at) : null;
            $isOnline = (bool) $staff->is_online && $lastSeen && $lastSeen->greaterThanOrEqualTo($onlineThreshold);

            $fullName = trim("{$staff->given_name} " . ($staff->middle_name ? "{$staff->middle_name} " : "") . $staff->last_name);

            return [
                'id' => (int) $staff->user_id,
                'name' => $fullName,
                'role' => $staff->role_name ?? (self::ROLE_LABELS[(int) $staff->role_id] ?? 'Staff'),
                'role_id' => (int) $staff->role_id,
                'is_online' => (bool) $isOnline,
                'status' => $isOnline ? 'Online' : 'Offline',
                'last_seen_at' => $staff->last_seen_at,
                'hide_active_status' => (bool) ($staff->hide_active_status ?? false),
                'is_super_admin' => (int) $staff->role_id === 1,
            ];
        });
    }
}
