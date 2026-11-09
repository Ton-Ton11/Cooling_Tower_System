<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceForecast;
use App\Models\TechnicianCertification;
use App\Models\ToolChecklist;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the standalone Inertia profile page (redirects/renders role-aware profile).
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'profilePayload' => $this->buildProfilePayload($request->user()),
        ]);
    }

    /**
     * Return JSON profile data + role-specific metrics for the SPA dashboard shells.
     */
    public function data(Request $request): JsonResponse
    {
        $user = $request->user()->fresh(['role']);

        return response()->json($this->buildProfilePayload($user));
    }

    /**
     * Update the user's profile information and optional profile photo.
     */
    public function update(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'given_name' => ['required', 'string', 'max:120'],
            'middle_name' => ['nullable', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'birthdate' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'in:Male,Female,Other'],
            'contact_number' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:500'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->user_id, 'user_id'),
            ],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        if ($request->hasFile('profile_photo')) {
            $file = $request->file('profile_photo');
            $uploadDir = public_path('uploads/profile-photos');

            if (! File::exists($uploadDir)) {
                File::makeDirectory($uploadDir, 0755, true);
            }

            // Remove old uploaded photo if it exists in uploads/profile-photos
            if (! empty($user->profile_photo_path) && str_starts_with($user->profile_photo_path, 'uploads/profile-photos/')) {
                $oldPath = public_path($user->profile_photo_path);
                if (File::exists($oldPath)) {
                    @File::delete($oldPath);
                }
            }

            $filename = 'user_' . $user->user_id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move($uploadDir, $filename);
            $user->profile_photo_path = 'uploads/profile-photos/' . $filename;
        }

        $user->given_name = $validated['given_name'];
        $user->middle_name = $validated['middle_name'] ?? null;
        $user->last_name = $validated['last_name'];
        $user->birthdate = $validated['birthdate'] ?? $user->birthdate;
        $user->sex = $validated['sex'] ?? $user->sex;
        $user->contact_number = $validated['contact_number'] ?? $user->contact_number;
        $user->address = $validated['address'] ?? $user->address;

        if ($user->email !== $validated['email']) {
            $user->email = $validated['email'];
        }

        $user->save();
        $user->load('role');

        if ($request->wantsJson() || $request->ajax() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Profile information updated successfully.',
                ...$this->buildProfilePayload($user),
            ]);
        }

        return Redirect::back()->with('status', 'profile-updated');
    }

    /**
     * Upload/attach only the user's profile picture.
     */
    public function updatePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'profile_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $user = $request->user();
        $file = $request->file('profile_photo');
        $uploadDir = public_path('uploads/profile-photos');

        if (! File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        if (! empty($user->profile_photo_path) && str_starts_with($user->profile_photo_path, 'uploads/profile-photos/')) {
            $oldPath = public_path($user->profile_photo_path);
            if (File::exists($oldPath)) {
                @File::delete($oldPath);
            }
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = 'user_' . $user->user_id . '_' . time() . '.' . $ext;
        $file->move($uploadDir, $filename);

        $user->profile_photo_path = 'uploads/profile-photos/' . $filename;
        $user->save();
        $user->load('role');

        return response()->json([
            'message' => 'Profile picture updated successfully.',
            ...$this->buildProfilePayload($user),
        ]);
    }

    /**
     * Serve an uploaded profile picture safely.
     */
    public function servePhoto(string $filename)
    {
        $safeFilename = basename($filename);
        $path = public_path('uploads/profile-photos/' . $safeFilename);

        if (! File::exists($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Remove the user's attached profile picture.
     */
    public function destroyPhoto(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! empty($user->profile_photo_path) && str_starts_with($user->profile_photo_path, 'uploads/profile-photos/')) {
            $oldPath = public_path($user->profile_photo_path);
            if (File::exists($oldPath)) {
                @File::delete($oldPath);
            }
        }

        $user->profile_photo_path = null;
        $user->save();
        $user->load('role');

        return response()->json([
            'message' => 'Profile picture removed.',
            ...$this->buildProfilePayload($user),
        ]);
    }

    /**
     * Update the user's password via SPA JSON or form request.
     */
    public function updatePassword(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user = $request->user();
        $user->password = Hash::make($validated['password']);
        $user->save();

        if ($request->wantsJson() || $request->ajax() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Password updated successfully.',
            ]);
        }

        return back()->with('status', 'password-updated');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    /**
     * Build role-aware profile display data & summary statistics for all 7 roles.
     */
    private function buildProfilePayload(User $user): array
    {
        $user->loadMissing('role');
        $roleId = (int) $user->role_id;
        $isHeadTech = $roleId === 7;

        $roleMeta = match (true) {
            $roleId === 1 => [
                'role_label' => 'Super Admin',
                'department' => 'Executive System Administration',
                'description' => 'Full system governance, RBAC security, staff accounts, inventory, and enterprise audit logs.',
                'badge_tone' => 'navy',
            ],
            $roleId === 2 => [
                'role_label' => 'Manager',
                'department' => 'Operations & Business Intelligence',
                'description' => 'Oversees service operations, revenue analytics, predictive maintenance forecasts, and technician compliance.',
                'badge_tone' => 'blue',
            ],
            $roleId === 3 => [
                'role_label' => 'Admin Assistant',
                'department' => 'Front-Office Dispatch & Scheduling',
                'description' => 'Coordinates incoming customer bookings, dispatches technician squads, and manages schedules.',
                'badge_tone' => 'sky',
            ],
            $roleId === 4 => [
                'role_label' => 'Tools Man',
                'department' => 'Warehouse & Equipment Custody',
                'description' => 'Manages HVAC tools, spare parts inventory, pre-job tool checklists, and return inspections.',
                'badge_tone' => 'orange',
            ],
            $isHeadTech => [
                'role_label' => 'Head Technician',
                'department' => 'Field Crew Leadership & Compliance',
                'description' => 'Leads field technician squads, signs off on tool checklists, and oversees crew certification renewals.',
                'badge_tone' => 'indigo',
            ],
            $roleId === 5 => [
                'role_label' => 'Technician',
                'department' => 'Field HVAC & Cooling Tower Operations',
                'description' => 'Executes assigned installations, preventative maintenance, diagnostics, and repairs.',
                'badge_tone' => 'blue',
            ],
            default => [
                'role_label' => 'Customer',
                'department' => 'Client Service Portal',
                'description' => 'Books residential and commercial HVAC services, tracks maintenance forecasts, and views service history.',
                'badge_tone' => 'emerald',
            ],
        };

        $highlights = [];

        try {
            if ($roleId === 6) {
                $totalBookings = Booking::where('client_id', $user->user_id)->count();
                $completedBookings = Booking::where('client_id', $user->user_id)->where('booking_status', 'Completed')->count();
                $activeForecasts = ServiceForecast::where('user_id', $user->user_id)
                    ->whereIn('urgency_level', ['Upcoming', 'Due Soon', 'Overdue'])
                    ->count();
                $highlights = [
                    ['label' => 'Total Bookings', 'value' => $totalBookings],
                    ['label' => 'Completed Services', 'value' => $completedBookings],
                    ['label' => 'Maintenance Forecasts', 'value' => $activeForecasts],
                ];
            } elseif ($isHeadTech || $roleId === 5) {
                $assignedJobs = Booking::where('assigned_tech_id', $user->user_id)->count();
                $myCerts = TechnicianCertification::where('user_id', $user->user_id)->count();
                $crewCerts = $isHeadTech ? TechnicianCertification::count() : $myCerts;
                $highlights = [
                    ['label' => $isHeadTech ? 'Personal + Squad Jobs' : 'Assigned Jobs', 'value' => $assignedJobs],
                    ['label' => 'My Certifications', 'value' => $myCerts],
                    ['label' => $isHeadTech ? 'Crew Licenses Tracked' : 'Active Status', 'value' => $isHeadTech ? $crewCerts : 'Verified'],
                ];
            } elseif ($roleId === 4) {
                $checklists = ToolChecklist::count();
                $pendingChecklists = ToolChecklist::whereIn('status', ['Pending', 'Issued'])->count();
                $highlights = [
                    ['label' => 'Total Tool Checklists', 'value' => $checklists],
                    ['label' => 'Active Checkouts', 'value' => $pendingChecklists],
                    ['label' => 'Warehouse Access', 'value' => 'Full Custody'],
                ];
            } else {
                $totalSystemBookings = Booking::count();
                $activeStaff = User::whereIn('role_id', [1, 2, 3, 4, 5, 7])->where('is_active', true)->count();
                $activeForecasts = ServiceForecast::whereIn('urgency_level', ['Upcoming', 'Due Soon', 'Overdue'])->count();
                $highlights = [
                    ['label' => 'System Bookings', 'value' => $totalSystemBookings],
                    ['label' => 'Active Staff', 'value' => $activeStaff],
                    ['label' => 'Tracked Forecasts', 'value' => $activeForecasts],
                ];
            }
        } catch (\Throwable $e) {
            $highlights = [
                ['label' => 'Account Status', 'value' => $user->is_active ? 'Active' : 'Inactive'],
            ];
        }

        $certifications = [];
        if ($isHeadTech || $roleId === 5) {
            try {
                $certifications = app(\App\Services\ForecastingService::class)->getTechnicianCertifications((int) $user->user_id);
            } catch (\Throwable $e) {
                $certifications = [];
            }
        }

        return [
            'user' => [
                'user_id' => $user->user_id,
                'role_id' => $roleId,
                'is_head_technician' => $isHeadTech,
                'given_name' => $user->given_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'address' => $user->address,
                'birthdate' => $user->birthdate ? $user->birthdate->format('Y-m-d') : '',
                'sex' => $user->sex ?? 'Male',
                'is_active' => (bool) $user->is_active,
                'profile_photo_url' => $user->profile_photo_url,
                'created_at' => optional($user->created_at)->format('M d, Y'),
            ],
            'role_meta' => $roleMeta,
            'highlights' => $highlights,
            'certifications' => $certifications,
        ];
    }
}
