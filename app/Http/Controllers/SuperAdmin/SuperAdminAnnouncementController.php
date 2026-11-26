<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SuperAdminAnnouncementController extends SuperAdminBaseController
{
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
}
