<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response|RedirectResponse
    {
        if (Auth::check()) {
            $user = Auth::user();
            $roleId = (int) $user->role_id;

            return match ($roleId) {
                1 => redirect()->route('super-admin.dashboard'),
                2 => redirect()->route('manager.dashboard'),
                3 => redirect()->route('admin-assistant.dashboard'),
                4 => redirect()->route('tools-man.dashboard'),
                5 => redirect()->route('technician.dashboard'),
                6 => redirect()->route('customer.dashboard'),
                default => redirect()->route('login'),
            };
        }

        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'given_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'birthdate' => 'required|date|before:today',
            'sex' => 'required|in:Male,Female',
            'address' => 'required|string|max:1000',
            'contact_number' => 'required|string|max:50',
            'email' => ['required','string','email','max:255','unique:users,email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'role_id' => 6,
            'given_name' => $request->given_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'birthdate' => $request->birthdate,
            'sex' => $request->sex,
            'address' => $request->address,
            'contact_number' => $request->contact_number,
            'email' => strtolower($request->email),
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect()->route('customer.dashboard');
    }
}
