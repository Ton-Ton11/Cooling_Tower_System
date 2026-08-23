<?php

namespace App\Http\Controllers\Technician;

use App\Http\Controllers\SuperAdmin\SuperAdminBaseController;
use Illuminate\Http\Request;

abstract class TechnicianBaseController extends SuperAdminBaseController
{
    protected function authorizeRole(Request $request): void
    {
        abort_unless($request->user() && in_array((int) $request->user()->role_id, [1, 5], true), 403);
    }
}
