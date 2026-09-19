<?php

namespace App\Http\Controllers\Technician;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TechnicianAnnouncementController extends TechnicianBaseController
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
}
