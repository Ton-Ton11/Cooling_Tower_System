<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Shared\LocationAutocompleteController;
use App\Models\User;
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
                7 => redirect()->route('head-technician.dashboard'),
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
            'street_house' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'province' => 'required|string|max:255',
            'landmark' => 'nullable|string|max:255',
            'address' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'contact_number' => ['required', 'string', 'digits:11'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ], [
            'contact_number.digits' => 'The contact number must be exactly 11 digits.',
            'street_house.required' => 'Please enter your street or house/building number.',
            'barangay.required' => 'Please enter and select your barangay.',
            'city.required' => 'City is required (automatically filled when selecting your barangay).',
            'province.required' => 'Province is required (automatically filled when selecting your barangay).',
        ]);

        // Compose standardized full address from street_house, barangay, city, province, and optional landmark
        $streetHouse = trim((string) $request->street_house);
        $barangayRaw = trim((string) $request->barangay);
        $barangayFormatted = preg_match('/^(brgy\.?|barangay)\b/i', $barangayRaw)
            ? $barangayRaw
            : 'Brgy. ' . $barangayRaw;
        $city = trim((string) $request->city);
        $province = trim((string) $request->province);
        $landmark = trim((string) ($request->landmark ?? ''));

        $composedParts = array_filter([$streetHouse, $barangayFormatted, $city, $province], fn ($v) => $v !== '');
        $finalAddress = implode(', ', $composedParts);
        if ($landmark !== '') {
            $finalAddress .= ' (Landmark: ' . $landmark . ')';
        }
        if ($finalAddress === '' && $request->filled('address')) {
            $finalAddress = trim((string) $request->address);
        }

        $user = User::create([
            'role_id' => 6,
            'given_name' => $request->given_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'birthdate' => $request->birthdate,
            'sex' => $request->sex,
            'address' => $finalAddress,
            'contact_number' => $request->contact_number,
            'email' => strtolower($request->email),
            'password' => Hash::make($request->password),
            'email_verified_at' => now(),
        ]);

        Auth::login($user);

        return redirect()->route('customer.dashboard');
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
            'zamboanga del norte', 'zamboanga sibugay',
        ];
        foreach ($outsideCities as $outside) {
            if (str_contains($normalized, $outside) && ! str_contains($normalized, 'zamboanga city')) {
                return false;
            }
        }

        if (str_contains($normalized, 'zamboanga city') || str_contains($normalized, '7000')) {
            return true;
        }

        $zamboangaBarangays = [
            'arena blanco', 'ayala', 'baliwasan', 'baluno', 'boalan', 'bolong', 'buenavista',
            'bunguiao', 'busay', 'cabaluay', 'cabatangan', 'cacao', 'calabasa', 'calarian',
            'camino nuevo', 'campo islam', 'canelar', 'capisan', 'cawit', 'culianan', 'curuan',
            'dita', 'divisoria', 'dulian', 'guisao', 'guiwan', 'kasanyangan', 'la paz', 'labuan',
            'lamisahan', 'landang gua', 'landang laum', 'lanzones', 'lapakan', 'latuan', 'licomo',
            'limaong', 'limpapa', 'lubigan', 'lumayang', 'lumbangan', 'lunzuran', 'maasin',
            'malagutay', 'mampang', 'manalipa', 'mangusu', 'manicahan', 'mariki', 'mercedes',
            'muti', 'pamucutan', 'pangapuyan', 'panubigan', 'pasilmanta', 'pasobolong',
            'pasonanca', 'patalon', 'putik', 'quiniput', 'recodo', 'rio hondo', 'salaan',
            'san jose cawa-cawa', 'san jose gusu', 'san ramon', 'san roque', 'sangali',
            'sibulao', 'sinubung', 'sinunuc', 'sta. barbara', 'santa barbara', 'sta. catalina',
            'santa catalina', 'sta. maria', 'santa maria', 'santo niño', 'santo nino',
            'suterville', 'tagasilay', 'taguiti', 'talabaan', 'talisayan', 'talon-talon',
            'talon talon', 'taluksangay', 'tetuan', 'tictapul', 'tigbalabag', 'tigtabon',
            'tolosa', 'tugbungan', 'tulungatung', 'tumaga', 'tumalutab', 'tumitus', 'victoria',
            'vitali', 'zambowood', 'zone i', 'zone ii', 'zone iii', 'zone iv',
        ];

        foreach ($zamboangaBarangays as $brgy) {
            if (str_contains($normalized, $brgy)) {
                return true;
            }
        }

        return false;
    }
}
