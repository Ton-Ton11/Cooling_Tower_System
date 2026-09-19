<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $intended = $this->redirectTo((int) $request->user()->role_id);

        return redirect()->intended($intended);
    }

    private function redirectTo(int $roleId): string
    {
        return match ($roleId) {
            1 => route('super-admin.dashboard', absolute: false),
            2 => route('manager.dashboard', absolute: false),
            3 => route('admin-assistant.dashboard', absolute: false),
            4 => route('tools-man.dashboard', absolute: false),
            5 => route('technician.dashboard', absolute: false),
            6 => route('customer.dashboard', absolute: false),
            default => route('login', absolute: false),
        };
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
