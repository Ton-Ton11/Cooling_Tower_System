<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\SuperAdmin\SuperAdminBaseController;
use Illuminate\Http\Request;

abstract class ManagerBaseController extends SuperAdminBaseController
{
    protected function authorizeRole(Request $request): void
    {
        abort_unless($request->user() && in_array((int) $request->user()->role_id, [1, 2], true), 403);
    }
}
