<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\TechnicianCertification;
use App\Services\ForecastingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForecastingController extends Controller
{
    public function __construct(
        protected ForecastingService $forecastingService
    ) {}

    /**
     * List technician certifications for the Technician Certificate Status Monitoring tab.
     */
    public function indexCertifications(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $this->forecastingService->ensureTablesExist();

        $roleId = (int) $user->role_id;
        $userId = (int) $user->user_id;

        // Ensure all technicians have certifications initialized
        $techUsers = \App\Models\User::whereIn('role_id', [5, 7])
            ->orderBy('role_id', 'desc')
            ->orderBy('given_name')
            ->get();

        foreach ($techUsers as $tUser) {
            $this->forecastingService->getTechnicianCertifications((int) $tUser->user_id);
        }

        $personalCerts = in_array($roleId, [5, 7], true)
            ? $this->forecastingService->getTechnicianCertifications($userId)
            : [];

        $analytics = $this->forecastingService->getManagerForecastAnalytics();
        $allCerts = $analytics['technician_alerts'] ?? [];

        // If regular technician (role 5), scope to their own certifications
        $visibleCerts = ($roleId === 5)
            ? $personalCerts
            : $allCerts;

        $summary = [
            'total_certificates'           => count($visibleCerts),
            'active_compliant'             => collect($visibleCerts)->where('status', 'Active')->count(),
            'expiring_within_1_week'       => collect($visibleCerts)->filter(fn ($c) => ($c['days_until_expiry'] ?? 99) <= 7 && ($c['status'] ?? '') !== 'Renewal Submitted')->count(),
            'pending_manager_verification' => collect($visibleCerts)->where('status', 'Renewal Submitted')->count(),
        ];

        $technicianOptions = $techUsers->map(fn ($u) => [
            'user_id'    => (int) $u->user_id,
            'name'       => $u->name,
            'role_id'    => (int) $u->role_id,
            'role_label' => (int) $u->role_id === 7 ? 'Head Technician' : 'Technician',
        ])->values()->all();

        return response()->json([
            'role_id'                 => $roleId,
            'is_manager'              => in_array($roleId, [1, 2], true),
            'is_head_technician'      => $roleId === 7,
            'is_technician'           => in_array($roleId, [5, 7], true),
            'summary'                 => $summary,
            'certifications'          => $visibleCerts,
            'personal_certifications' => $personalCerts,
            'technicians'             => $technicianOptions,
        ]);
    }

    /**
     * Store a new certification for a technician.
     */
    public function storeCertification(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $validated = $request->validate([
            'user_id'            => ['nullable', 'integer', 'exists:users,user_id'],
            'technician_user_id' => ['nullable', 'integer', 'exists:users,user_id'],
            'certification_name' => ['required', 'string', 'max:180'],
            'issuing_body'       => ['required', 'string', 'max:120'],
            'certificate_number' => ['nullable', 'string', 'max:100'],
            'issued_date'        => ['required', 'date'],
            'expiry_date'        => ['required', 'date', 'after_or_equal:issued_date'],
            'renewal_lead_days'  => ['nullable', 'integer', 'min:1', 'max:180'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        $isManagerOrSuperAdmin = in_array((int) $user->role_id, [1, 2], true);
        if (! $isManagerOrSuperAdmin) {
            abort(403, 'Only the Manager can register new technician certificates.');
        }

        $targetUserId = ! empty($validated['user_id'])
            ? (int) $validated['user_id']
            : (! empty($validated['technician_user_id']) ? (int) $validated['technician_user_id'] : (int) $user->user_id);

        $this->forecastingService->ensureTablesExist();

        $expiry = Carbon::parse($validated['expiry_date'])->startOfDay();
        $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);
        $leadDays = 7; // 1-week forecasting validation window
        $status = $daysLeft < 0 ? 'Expired' : ($daysLeft <= 3 ? 'Critical' : ($daysLeft <= $leadDays ? 'Expiring Soon' : 'Active'));

        TechnicianCertification::create([
            'user_id'            => $targetUserId,
            'certification_name' => $validated['certification_name'],
            'issuing_body'       => $validated['issuing_body'],
            'certificate_number' => $validated['certificate_number'] ?? null,
            'issued_date'        => $validated['issued_date'],
            'expiry_date'        => $validated['expiry_date'],
            'renewal_lead_days'  => $leadDays,
            'status'             => $status,
            'notes'              => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message'        => 'Certification added and 1-week forecasting monitor activated.',
            'certifications' => $this->forecastingService->getTechnicianCertifications($targetUserId),
        ], 201);
    }

    /**
     * Handle Technician single-submission of renewed certificate (when within 1 week of expiry)
     * OR Manager verification & new expiration date confirmation to restart the countdown.
     */
    public function renewCertification(Request $request, int $certificationId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $this->forecastingService->ensureTablesExist();

        $cert = TechnicianCertification::findOrFail($certificationId);
        $roleId = (int) $user->role_id;
        $isManagerOrSuperAdmin = in_array($roleId, [1, 2], true);
        $isOwnerOrHeadTech = ((int) $cert->user_id === (int) $user->user_id) || $roleId === 7;

        $action = $request->input('action', $isManagerOrSuperAdmin ? 'update_dates' : 'submit_renewal');

        // ─────────────────────────────────────────────────────────────────────
        // STEP 1: TECHNICIAN SUBMITS RENEWED CERTIFICATE (CAN ONLY SUBMIT ONCE)
        // ─────────────────────────────────────────────────────────────────────
        if ($action === 'submit_renewal') {
            if (! $isOwnerOrHeadTech && ! $isManagerOrSuperAdmin) {
                abort(403, 'You can only submit a renewed certificate for your own certification record.');
            }

            // Enforce single submission rule: Technician can only submit once per renewal cycle
            if ($cert->status === 'Renewal Submitted') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'certificate_number' => ['You have already submitted your renewed certificate (1 submission maximum). Please wait for the Manager to verify your certificate and enter the new expiration date.'],
                ]);
            }

            $expiry = Carbon::parse($cert->expiry_date)->startOfDay();
            $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);

            // Forecasting validation: Reminder & submission unlock when certificate is about to expire 1 week (7 days) from now or less
            if ($daysLeft > 7 && ! $isManagerOrSuperAdmin) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'certificate_number' => ["Forecasting validation: This certificate still has {$daysLeft} days remaining. The renewal reminder and submission unlock when the certificate is 1 week (7 days) away from expiration."],
                ]);
            }

            $validated = $request->validate([
                'certificate_number' => ['required', 'string', 'min:3', 'max:100'],
                'submission_notes'   => ['nullable', 'string', 'max:500'],
                'certificate_file'   => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            ], [
                'certificate_number.required' => 'Please enter your renewed certificate number for Manager verification.',
            ]);

            $proofPath = null;
            if ($request->hasFile('certificate_file')) {
                $file = $request->file('certificate_file');
                $filename = 'cert_' . $cert->certification_id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $destDir = public_path('uploads/certificates');
                if (! is_dir($destDir)) {
                    @mkdir($destDir, 0755, true);
                }
                $file->move($destDir, $filename);
                $proofPath = '/uploads/certificates/' . $filename;
            }

            $submissionSummary = sprintf(
                '[Submitted by Technician %s on %s]: Renewed Cert #%s%s%s',
                $user->name,
                now()->format('M d, Y h:i A'),
                trim($validated['certificate_number']),
                ! empty($validated['submission_notes']) ? ' — ' . trim($validated['submission_notes']) : '',
                $proofPath ? " (Proof: {$proofPath})" : ''
            );

            $cert->update([
                'certificate_number' => trim($validated['certificate_number']),
                'status'             => 'Renewal Submitted',
                'last_reminded_at'   => now(),
                'notes'              => $submissionSummary,
            ]);

            return response()->json([
                'message'        => 'Renewed certificate submitted (1/1)! The Manager will now verify your certificate, confirm the renewal status, and enter the new expiration date.',
                'certifications' => $this->forecastingService->getTechnicianCertifications((int) $cert->user_id),
            ]);
        }

        // ─────────────────────────────────────────────────────────────────────
        // STEP 2: MANAGER VERIFIES CERTIFICATE & ENTERS NEW EXPIRATION DATE
        // ─────────────────────────────────────────────────────────────────────
        if (! $isManagerOrSuperAdmin) {
            abort(403, 'Only the Manager can verify submitted certificates, confirm renewal status, and enter the new expiration date.');
        }

        $validated = $request->validate([
            'new_expiry_date'      => ['required', 'date', 'after:today'],
            'certificate_number'   => ['nullable', 'string', 'max:100'],
            'certificate_verified' => ['nullable', 'boolean'],
            'verification_notes'   => ['nullable', 'string', 'max:500'],
        ], [
            'new_expiry_date.required' => 'Please enter the new expiration date so the certificate countdown can start over again.',
            'new_expiry_date.after'    => 'The new expiration date must be a future date.',
        ]);

        $newExpiry = Carbon::parse($validated['new_expiry_date'])->startOfDay();
        $daysUntilNewExpiry = (int) now()->startOfDay()->diffInDays($newExpiry, false);
        $newStatus = $daysUntilNewExpiry <= 7 ? 'Expiring Soon' : 'Active';

        $cert->update([
            'issued_date'        => now()->toDateString(),
            'expiry_date'        => $newExpiry->toDateString(),
            'certificate_number' => ! empty($validated['certificate_number']) ? trim($validated['certificate_number']) : $cert->certificate_number,
            'renewal_lead_days'  => 7,
            'status'             => $newStatus,
            'last_reminded_at'   => null,
            'notes'              => sprintf(
                '[Verified & Renewed by Manager %s on %s]: New expiration set to %s (%d days). Forecasting countdown restarted.%s',
                $user->name,
                now()->format('M d, Y h:i A'),
                $newExpiry->format('M d, Y'),
                $daysUntilNewExpiry,
                ! empty($validated['verification_notes']) ? ' Note: ' . trim($validated['verification_notes']) : ''
            ),
        ]);

        if (\Illuminate\Support\Facades\Schema::hasTable('technician_details')) {
            \Illuminate\Support\Facades\DB::table('technician_details')
                ->where('user_id', $cert->user_id)
                ->update(['certificate_expiry' => $newExpiry->toDateString()]);
        }

        return response()->json([
            'message'        => "Certificate verified and renewed! Forecasting countdown has restarted until {$newExpiry->format('M d, Y')} ({$daysUntilNewExpiry} days).",
            'certifications' => $this->forecastingService->getTechnicianCertifications((int) $cert->user_id),
        ]);
    }

    /**
     * Trigger automated reminder evaluation manually (Manager / Super Admin / Head Technician).
     */
    public function triggerReminderEvaluation(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAllowed = $user && in_array((int) $user->role_id, [1, 2, 3, 7], true);
        if (! $isAllowed) {
            abort(403);
        }

        $summary = $this->forecastingService->evaluateAndDispatchReminders();

        return response()->json([
            'message' => sprintf(
                'Automated forecasting scan complete: %d customer maintenance notices & %d technician renewal reminders sent.',
                $summary['customer_reminders_sent'],
                $summary['technician_reminders_sent']
            ),
            'summary'   => $summary,
            'analytics' => $this->forecastingService->getManagerForecastAnalytics(),
        ]);
    }

    /**
     * Track AC unit warranty by Serial Number (accessible by Customers and Staff).
     */
    public function trackAcWarranty(Request $request): JsonResponse
    {
        $serialNumber = (string) $request->input('serial_number', $request->query('serial_number', ''));
        $result = $this->forecastingService->trackWarrantyBySerialNumber($serialNumber);

        return response()->json($result);
    }

    /**
     * Get warranty tracking initial context for the logged-in customer
     * (company contact details and any units purchased under their account).
     */
    public function customerWarrantyContext(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->forecastingService->ensureTablesExist();
        $sync = $this->forecastingService->syncExpiredAcWarrantiesAndReleaseParts();

        $myUnits = [];
        if ($user && \Illuminate\Support\Facades\Schema::hasTable('inventory_sales')) {
            $fullName = strtolower(trim(($user->given_name ?? '') . ' ' . ($user->last_name ?? '')));
            $soldUnitIds = \Illuminate\Support\Facades\DB::table('inventory_sales')
                ->where('sale_type', 'ac_unit')
                ->where(function ($q) use ($user, $fullName) {
                    $q->where('client_id', $user->user_id);
                    if ($fullName !== '') {
                        $q->orWhereRaw('LOWER(TRIM(customer_name)) = ?', [$fullName]);
                    }
                })
                ->pluck('ac_unit_id')
                ->filter()
                ->all();

            if (! empty($soldUnitIds)) {
                $myUnits = collect($sync['units'] ?? [])
                    ->whereIn('ac_unit_id', array_map('intval', $soldUnitIds))
                    ->values()
                    ->all();
            }
        }

        return response()->json([
            'contact_info' => $this->forecastingService->getCompanyWarrantyContactInfo(),
            'my_units'     => $myUnits,
        ]);
    }

    /**
     * Update or end an AC unit's warranty status (Staff / Super Admin / Admin Assistant / Tools Man)
     * and automatically release or reserve spare parts accordingly.
     */
    public function updateAcUnitWarrantyStatus(Request $request, int $acUnitId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2, 3, 4], true)) {
            abort(403);
        }

        $validated = $request->validate([
            'action'               => ['required', 'string', 'in:end_warranty,reactivate_warranty,sync'],
            'warranty_start_date'  => ['nullable', 'date'],
            'warranty_expiry_date' => ['nullable', 'date'],
            'warranty_period'      => ['nullable', 'integer', 'min:1'],
            'reserve_source'       => ['nullable', 'string', 'in:on_hand,order_base'],
        ]);

        $unit = \Illuminate\Support\Facades\DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();
        if (! $unit) {
            abort(404, 'AC unit not found.');
        }

        if ($validated['action'] === 'end_warranty') {
            $expiredDate = now()->subDay()->toDateString();
            $startDate = $unit->warranty_start_date ?: Carbon::parse($expiredDate)->subMonths(max(1, (int) $unit->warranty_period))->toDateString();

            $result = $this->forecastingService->activateAcUnitWarrantyForecast($acUnitId, [
                'warranty_start_date'  => $startDate,
                'warranty_expiry_date' => $expiredDate,
            ]);

            return response()->json([
                'message' => "AC Unit ({$unit->serial_number}) warranty marked as Ended. Reserved spare parts have been automatically released (On-Hand returned to Available; Order Base set to Not Reserved).",
                'data'    => $result,
            ]);
        }

        if ($validated['action'] === 'reactivate_warranty') {
            $months = (int) ($validated['warranty_period'] ?? $unit->warranty_period ?: 12);
            $startDate = $validated['warranty_start_date'] ?? now()->toDateString();
            $expiryDate = $validated['warranty_expiry_date'] ?? Carbon::parse($startDate)->addMonths($months)->toDateString();

            $result = $this->forecastingService->activateAcUnitWarrantyForecast($acUnitId, [
                'warranty_period'      => $months,
                'warranty_start_date'  => $startDate,
                'warranty_expiry_date' => $expiryDate,
                'reserve_source'       => $validated['reserve_source'] ?? null,
            ]);

            return response()->json([
                'message' => "AC Unit ({$unit->serial_number}) warranty forecast activated and spare parts automatically reserved.",
                'data'    => $result,
            ]);
        }

        $sync = $this->forecastingService->syncExpiredAcWarrantiesAndReleaseParts();
        return response()->json([
            'message' => 'Warranty statuses and spare part reservations synchronized.',
            'data'    => $sync,
        ]);
    }
}
