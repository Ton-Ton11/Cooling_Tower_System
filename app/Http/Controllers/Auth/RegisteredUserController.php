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
     * Format a raw TIN string into standard XXX-XXX-XXX or XXX-XXX-XXX-XXX representation.
     */
    public static function normalizeTin(?string $rawTin): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $rawTin);
        if ($digits === '' || $digits === null) {
            return null;
        }

        $digits = substr($digits, 0, 12);
        if (strlen($digits) <= 3) {
            return $digits;
        }
        if (strlen($digits) <= 6) {
            return substr($digits, 0, 3) . '-' . substr($digits, 3);
        }
        if (strlen($digits) <= 9) {
            return substr($digits, 0, 3) . '-' . substr($digits, 3, 3) . '-' . substr($digits, 6);
        }

        // Pad branch code to 3 digits if 10 or 11 digits provided, or format 12 digits as XXX-XXX-XXX-XXX
        return substr($digits, 0, 3)
            . '-' . substr($digits, 3, 3)
            . '-' . substr($digits, 6, 3)
            . '-' . substr($digits, 9);
    }

    /**
     * Handle an incoming registration request (Individual Customer or Business / Corporate B2B).
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $accountType = $request->input('account_type') === 'business' ? 'business' : 'individual';
        $isBusiness = $accountType === 'business';

        if ($isBusiness && $request->filled('tin')) {
            $request->merge([
                'tin' => static::normalizeTin($request->input('tin')),
            ]);
        }

        // If representative_full_name was passed instead of split given_name/last_name, split cleanly
        if ($isBusiness && (! $request->filled('given_name') || ! $request->filled('last_name')) && $request->filled('representative_name')) {
            $parts = preg_split('/\s+/', trim((string) $request->input('representative_name')));
            if (count($parts) === 1) {
                $request->merge([
                    'given_name' => $parts[0],
                    'last_name' => $request->input('last_name') ?: 'Representative',
                ]);
            } elseif (count($parts) > 1) {
                $lastName = array_pop($parts);
                $request->merge([
                    'given_name' => implode(' ', $parts),
                    'last_name' => $lastName,
                ]);
            }
        }

        $rules = [
            'account_type' => ['nullable', 'string', 'in:individual,business'],
            'given_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => $isBusiness ? ['nullable', 'date', 'before:today'] : ['required', 'date', 'before:today'],
            'sex' => $isBusiness ? ['nullable', 'in:Male,Female'] : ['required', 'in:Male,Female'],
            'street_house' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'province' => ['required', 'string', 'max:255'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'contact_number' => $isBusiness
                ? ['required', 'string', 'min:7', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/']
                : ['required', 'string', 'digits:11'],
            'email' => [
                'required',
                'string',
                'email',
                'max:150',
                'unique:users,email',
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];

        if ($isBusiness) {
            $rules['company_name'] = ['required', 'string', 'max:255'];
            $rules['representative_role'] = ['required', 'string', 'max:150'];
            $rules['tin'] = [
                'required',
                'string',
                'max:50',
                'regex:/^\d{3}-\d{3}-\d{3}(-\d{3})?$/',
                'unique:users,tin',
            ];
            $rules['business_permit'] = [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:5120',
            ];
        }

        $request->validate($rules, [
            'given_name.required' => $isBusiness ? 'Please enter the representative’s first/given name.' : 'The given name field is required.',
            'last_name.required' => $isBusiness ? 'Please enter the representative’s last name.' : 'The last name field is required.',
            'company_name.required' => 'Please enter your registered company or business name.',
            'representative_role.required' => 'Please enter your job title or role in the company (e.g., CEO, Manager, Authorized Representative).',
            'tin.required' => 'Please enter your company’s Tax Identification Number (TIN).',
            'tin.regex' => 'Please enter a valid 9-digit or 12-digit TIN formatted as XXX-XXX-XXX or XXX-XXX-XXX-XXX.',
            'tin.unique' => 'This Tax Identification Number (TIN) is already registered to an existing business account. To prevent business impersonation, duplicate TINs are not allowed. Please contact your company administrator or AC TOWER Customer Support if you need assistance.',
            'business_permit.required' => 'Please upload your business registration proof (DTI / SEC Registration or Mayor’s Permit).',
            'business_permit.mimes' => 'The business registration proof must be a PDF, JPG, or PNG file.',
            'business_permit.max' => 'The business registration proof must not exceed 5MB.',
            'contact_number.digits' => 'The contact number must be exactly 11 digits.',
            'contact_number.regex' => 'Please enter a valid Philippine mobile or landline contact number.',
            'street_house.required' => $isBusiness ? 'Please enter the company building, unit, or street address.' : 'Please enter your street or house/building number.',
            'barangay.required' => 'Please enter and select the barangay.',
            'city.required' => 'City is required (automatically filled when selecting the barangay).',
            'province.required' => 'Province is required (automatically filled when selecting the barangay).',
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

        // Handle optional Business Proof / Permit Upload
        $businessPermitPath = null;
        if ($isBusiness && $request->hasFile('business_permit')) {
            $file = $request->file('business_permit');
            $ext = strtolower($file->getClientOriginalExtension() ?: 'pdf');
            $safeTin = preg_replace('/\D/', '', (string) $request->input('tin'));
            $filename = 'permit_' . ($safeTin ?: 'biz') . '_' . time() . '_' . bin2hex(random_bytes(3)) . '.' . $ext;

            // Store in storage/app/public/uploads/business-permits
            $storedRelativePath = $file->storeAs('uploads/business-permits', $filename, 'public');

            // Also mirror in public/uploads/business-permits matching existing public/uploads/ convention
            try {
                $publicUploadDir = public_path('uploads/business-permits');
                if (! \Illuminate\Support\Facades\File::exists($publicUploadDir)) {
                    \Illuminate\Support\Facades\File::makeDirectory($publicUploadDir, 0755, true);
                }
                $storageFullPath = storage_path('app/public/' . $storedRelativePath);
                if (\Illuminate\Support\Facades\File::exists($storageFullPath)) {
                    \Illuminate\Support\Facades\File::copy($storageFullPath, $publicUploadDir . DIRECTORY_SEPARATOR . $filename);
                }
            } catch (\Throwable $e) {
                // Public storage disk fallback route in routes/web.php will still serve the file
            }

            $businessPermitPath = 'uploads/business-permits/' . $filename;
        }

        $user = User::create([
            'role_id' => 6,
            'account_type' => $accountType,
            'company_name' => $isBusiness ? trim((string) $request->input('company_name')) : null,
            'representative_role' => $isBusiness ? trim((string) $request->input('representative_role')) : null,
            'tin' => $isBusiness ? $request->input('tin') : null,
            'business_permit_path' => $businessPermitPath,
            'verification_status' => $isBusiness ? 'pending' : 'approved',
            'given_name' => trim((string) $request->given_name),
            'middle_name' => $request->filled('middle_name') ? trim((string) $request->middle_name) : null,
            'last_name' => trim((string) $request->last_name),
            'birthdate' => $request->filled('birthdate') ? $request->birthdate : null,
            'sex' => $request->filled('sex') ? $request->sex : 'Male',
            'address' => $finalAddress,
            'contact_number' => trim((string) $request->contact_number),
            'email' => strtolower(trim((string) $request->email)),
            'password' => Hash::make($request->password),
            'email_verified_at' => now(),
        ]);

        if ($isBusiness) {
            try {
                \Illuminate\Support\Facades\DB::table('activity_logs')->insert([
                    'user_id' => $user->user_id,
                    'action_type' => 'B2B_REGISTER',
                    'description' => sprintf(
                        'Business customer account registered for "%s" (TIN: %s) by %s (%s) — Pending admin verification.',
                        $user->company_name,
                        $user->tin,
                        $user->name,
                        $user->representative_role
                    ),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable $e) {
                // Ignore if activity log fails
            }
        }

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
