<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Shared\LocationAutocompleteController;
use App\Models\User;
use App\Services\GmailVerificationService;
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
            'address' => [
                'required',
                'string',
                'min:3',
                'max:1000',
            ],
            'contact_number' => 'required|string|max:50',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
                function ($attribute, $value, $fail) {
                    $normalized = strtolower(trim((string) $value));
                    if (! str_ends_with($normalized, '@gmail.com') && ! str_ends_with($normalized, '@googlemail.com')) {
                        $fail('Please register using a valid Gmail account (@gmail.com) so we can send your verification code to your Gmail inbox.');
                    }
                },
            ],
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

        Auth::login($user);

        // Send verification email + 6-digit OTP to customer's Gmail account
        GmailVerificationService::sendCustomerVerificationEmail($user);

        return redirect()->route('verification.notice')->with('status', 'verification-link-sent');
    }

    public static function isZamboangaCityAddress(string $address): bool
    {
        $normalized = strtolower(trim($address));
        if ($normalized === '') {
            return false;
        }

        // Explicitly reject other cities/provinces if mentioned without Zamboanga City
        $outsideCities = [
            'manila', 'quezon city', 'makati', 'taguig', 'pasig', 'cebu', 'davao',
            'cagayan de oro', 'iloilo', 'bacolod', 'general santos', 'butuan',
            'dipolog', 'pagadian', 'ipil', 'basilan', 'isabela city', 'jolo', 'bongao',
            'zamboanga del norte', 'zamboanga del sur', 'zamboanga sibugay',
        ];
        foreach ($outsideCities as $outside) {
            if (str_contains($normalized, $outside) && ! str_contains($normalized, 'zamboanga city')) {
                return false;
            }
        }

        if (str_contains($normalized, 'zamboanga city') || str_contains($normalized, 'zamboanga') || str_contains($normalized, '7000')) {
            return true;
        }

        $zamboangaBarangays = [
            'tetuan', 'putik', 'guiwan', 'sta. maria', 'santa maria', 'pasonanca', 'tumaga',
            'boalan', 'divisoria', 'zambowood', 'mercedes', 'culianan', 'talon-talon', 'talon talon',
            'mampang', 'arena blanco', 'tugbungan', 'kasanyangan', 'sta. catalina', 'santa catalina',
            'san jose cawa-cawa', 'san jose gusu', 'baliwasan', 'san roque', 'suterville',
            'campo islam', 'malagutay', 'calarian', 'sinunuc', 'maasin', 'reclamation', 'ayala',
            'talisayan', 'san ramon', 'labuan', 'cabatangan', 'lunzuran', 'bunguiao', 'curuan',
            'vitali', 'manicahan', 'sangali', 'bolong', 'canelar', 'camino nuevo', 'zone i',
            'zone ii', 'zone iii', 'zone iv', 'pueblo', 'sta. barbara', 'santa barbara', 'rio hondo',
            'mariki', 'pasobolong', 'salaan', 'cacao', 'lapakan', 'lamisahan', 'victoria',
        ];

        foreach ($zamboangaBarangays as $brgy) {
            if (str_contains($normalized, $brgy)) {
                return true;
            }
        }

        return false;
    }
}
