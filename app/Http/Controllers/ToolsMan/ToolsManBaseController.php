<?php

namespace App\Http\Controllers\ToolsMan;

use App\Http\Controllers\SuperAdmin\SuperAdminBaseController;
use Illuminate\Http\Request;

abstract class ToolsManBaseController extends SuperAdminBaseController
{
    protected function authorizeRole(Request $request): void
    {
        abort_unless($request->user() && in_array((int) $request->user()->role_id, [1, 4], true), 403);
    }
}
