<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $allowedRoles = [];
        foreach ($roles as $roleGroup) {
            foreach (explode(',', (string) $roleGroup) as $r) {
                $trimmed = trim($r);
                if ($trimmed !== '') {
                    $allowedRoles[] = (int) $trimmed;
                }
            }
        }

        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized access.');
        }

        $hasRole = in_array((int) $user->role_id, $allowedRoles, true)
            || (in_array(7, $allowedRoles, true) && method_exists($user, 'isHeadTechnician') && $user->isHeadTechnician());

        if (! $hasRole) {
            abort(403, 'Unauthorized access.');
        }

        return $next($request);
    }
}
