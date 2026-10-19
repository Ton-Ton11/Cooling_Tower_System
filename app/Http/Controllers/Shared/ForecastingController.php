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
            'certification_name' => ['required', 'string', 'max:180'],
            'issuing_body'       => ['required', 'string', 'max:120'],
            'certificate_number' => ['nullable', 'string', 'max:100'],
            'issued_date'        => ['required', 'date'],
            'expiry_date'        => ['required', 'date', 'after_or_equal:issued_date'],
            'renewal_lead_days'  => ['nullable', 'integer', 'min:7', 'max:180'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        $isLeaderOrAdmin = in_array((int) $user->role_id, [1, 2, 3, 7], true) || (bool) $user->is_head_technician;

        // Technicians can only add for themselves unless Manager/Super Admin/Head Tech
        $targetUserId = ($isLeaderOrAdmin && ! empty($validated['user_id']))
            ? (int) $validated['user_id']
            : (int) $user->user_id;

        $this->forecastingService->ensureTablesExist();

        $expiry = Carbon::parse($validated['expiry_date'])->startOfDay();
        $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);
        $leadDays = (int) ($validated['renewal_lead_days'] ?? 45);
        $status = $daysLeft < 0 ? 'Expired' : ($daysLeft <= 14 ? 'Critical' : ($daysLeft <= $leadDays ? 'Expiring Soon' : 'Active'));

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
            'message'        => 'Certification added and compliance forecast updated.',
            'certifications' => $this->forecastingService->getTechnicianCertifications($targetUserId),
        ], 201);
    }

    /**
     * Mark a technician certification as renewed or renewal submitted.
     */
    public function renewCertification(Request $request, int $certificationId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $this->forecastingService->ensureTablesExist();

        $cert = TechnicianCertification::findOrFail($certificationId);
        $isLeaderOrAdmin = in_array((int) $user->role_id, [1, 2, 3, 7], true) || (bool) $user->is_head_technician;

        if ((int) $cert->user_id !== (int) $user->user_id && ! $isLeaderOrAdmin) {
            abort(403, 'Unauthorized to update this certification.');
        }

        $validated = $request->validate([
            'action'             => ['nullable', 'string', 'in:submit_renewal,update_dates'],
            'new_expiry_date'    => ['nullable', 'date'],
            'certificate_number' => ['nullable', 'string', 'max:100'],
        ]);

        if (($validated['action'] ?? 'submit_renewal') === 'update_dates' && ! empty($validated['new_expiry_date'])) {
            $cert->update([
                'issued_date'        => now()->toDateString(),
                'expiry_date'        => $validated['new_expiry_date'],
                'certificate_number' => $validated['certificate_number'] ?? $cert->certificate_number,
                'status'             => 'Active',
                'last_reminded_at'   => null,
            ]);
            $msg = 'Certification renewed and new expiry date recorded!';
        } else {
            $cert->update([
                'status'           => 'Renewal Submitted',
                'last_reminded_at' => now(),
            ]);
            $msg = 'Certification marked as Renewal Submitted.';
        }

        return response()->json([
            'message'        => $msg,
            'certifications' => $this->forecastingService->getTechnicianCertifications((int) $cert->user_id),
        ]);
    }

    /**
     * Trigger automated reminder evaluation manually (Manager / Super Admin / Head Technician).
     */
    public function triggerReminderEvaluation(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAllowed = $user && (in_array((int) $user->role_id, [1, 2, 3, 7], true) || (bool) $user->is_head_technician);
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
