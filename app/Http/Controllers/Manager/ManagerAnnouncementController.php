<?php

namespace App\Http\Controllers\Manager;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ManagerAnnouncementController extends ManagerBaseController
{
    public function announcementsIndex(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        return response()->json([
            'data' => $this->mapAnnouncements(
                $this->announcementsBaseQuery()->orderByDesc('announcements.created_at')->get()
            ),
        ]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $payload = $this->normalizeAnnouncementPayload($request);

        $validated = validator($payload, [
            'title'          => ['required', 'string', 'max:255'],
            'message'        => ['required', 'string'],
            'target_role_id' => ['nullable', Rule::in(array_keys(self::ROLE_LABELS))],
        ])->validate();

        $id = DB::table('announcements')->insertGetId([
            'created_by'     => (int) $request->user()->user_id,
            'title'          => $validated['title'],
            'message'        => $validated['message'],
            'target_role_id' => $validated['target_role_id'] ?? null,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'ANNOUNCE',
            sprintf('Posted announcement "%s".', $validated['title'])
        );

        return response()->json([
            'message' => 'Announcement created successfully.',
            'data'    => $this->mapAnnouncements(
                $this->announcementsBaseQuery()->where('announcements.id', $id)->get()
            )->first(),
        ], 201);
    }

    public function destroyAnnouncement(Request $request, int $announcementId): JsonResponse
    {
        $this->authorizeRole($request);

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
}
