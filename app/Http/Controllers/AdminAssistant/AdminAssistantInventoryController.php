<?php

namespace App\Http\Controllers\AdminAssistant;

use App\Http\Controllers\SuperAdmin\SuperAdminInventoryController;
use Illuminate\Http\Request;

class AdminAssistantInventoryController extends SuperAdminInventoryController
{
    /**
     * Authorize Admin Assistant (role 3) or Super Admin (role 1).
     */
    protected function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user() && in_array((int) $request->user()->role_id, [1, 3], true), 403);
    }
}
