<?php

namespace App\Http\Controllers\AdminAssistant;

use App\Http\Controllers\SuperAdmin\SuperAdminBaseController;
use Illuminate\Http\Request;

abstract class AdminAssistantBaseController extends SuperAdminBaseController
{
    protected function authorizeRole(Request $request): void
    {
        abort_unless($request->user() && in_array((int) $request->user()->role_id, [1, 3], true), 403);
    }
}
