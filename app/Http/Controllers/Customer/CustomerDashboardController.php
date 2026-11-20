<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Shared\LocationAutocompleteController;
use App\Models\Booking;
use App\Models\Complaint;
use App\Models\CustomerUnitDetail;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CustomerDashboardController extends Controller
{
    /**
     * Render the customer dashboard SPA.
     */
    public function dashboard(Request $request): Response
    {
        return Inertia::render('Customer/Dashboard');
    }

    /**
     * Provide overview data for the customer dashboard.
     */
    public function dashboardData(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->user_id;

        $bookingsQuery = Booking::where('client_id', $userId);

        $pendingCount = (clone $bookingsQuery)->where('booking_status', 'Pending')->count();
        $activeCount = (clone $bookingsQuery)->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress'])->count();
        $completedCount = (clone $bookingsQuery)->where('booking_status', 'Completed')->count();
        $cancelledCount = (clone $bookingsQuery)->where('booking_status', 'Cancelled')->count();
        $totalCount = (clone $bookingsQuery)->count();

        $complaintsCount = Complaint::where('customer_id', $userId)->where('status', 'Pending')->count();

        $announcements = DB::table('announcements')
            ->join('users as creators', 'creators.user_id', '=', 'announcements.created_by')
            ->where(function ($query) {
                $query->whereNull('announcements.target_role_id')
                    ->orWhere('announcements.target_role_id', 6);
            })
            ->select([
                'announcements.id',
                'announcements.title',
                'announcements.message',
                'announcements.created_at',
                DB::raw("TRIM(CONCAT_WS(' ', creators.given_name, creators.middle_name, creators.last_name)) as author_name"),
            ])
            ->orderByDesc('announcements.created_at')
            ->limit(5)
            ->get();

        $recentBookings = Booking::with(['service', 'technician', 'latestPayment', 'feedback'])
            ->where('client_id', $userId)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($b) {
                return [
                    'booking_id' => $b->booking_id,
                    'service_id' => $b->service_id,
                    'service_name' => $b->service?->service_name ?? 'Aircon Service',
                    'service_base_price' => (float) ($b->service?->base_price ?? 0),
                    'scheduled_date' => $b->scheduled_date?->format('Y-m-d H:i:s'),
                    'scheduled_date_formatted' => $b->scheduled_date ? $b->scheduled_date->format('M d, Y h:i A') : 'TBD',
                    'booking_status' => $b->booking_status,
                    'quotation_status' => $b->quotation_status ?? 'Pending Assessment',
                    'service_order_status' => $b->service_order_status ?? 'Pending Quotation',
                    'units_data' => $b->units_data ?? [],
                    'service_payment_method' => $b->service_payment_method ?? 'Cash',
                    'cancellation_reason' => $b->cancellation_reason,
                    'notes' => $b->notes,
                    'created_at' => $b->created_at?->toISOString(),
                    'created_at_formatted' => $b->created_at ? $b->created_at->format('M d, Y') : '',
                    'assigned_tech_name' => $b->technician ? trim("{$b->technician->given_name} {$b->technician->middle_name} {$b->technician->last_name}") : null,
                    'assigned_tech_contact' => $b->technician?->contact_number,
                    'payment_status' => $b->latestPayment?->payment_status ?? 'Pending',
                    'payment_method' => $b->latestPayment?->payment_method ?? 'GCash',
                    'booking_fee_paid' => (float) ($b->latestPayment?->amount_paid ?? 0),
                    'reference_number' => $b->latestPayment?->reference_number,
                    'has_feedback' => (bool) $b->feedback,
                    'rating' => $b->feedback?->rating,
                ];
            });

        $upcomingBooking = Booking::with(['service', 'technician'])
            ->where('client_id', $userId)
            ->whereNotIn('booking_status', ['Cancelled', 'Completed'])
            ->orderBy('scheduled_date', 'asc')
            ->first();

        $toDoItems = [];
        $quotationBooking = Booking::where('client_id', $userId)
            ->where('quotation_status', 'Quotation Issued')
            ->latest('booking_id')
            ->first();
        if ($quotationBooking) {
            $toDoItems[] = [
                'id' => 'quote_' . $quotationBooking->booking_id,
                'title' => 'Review & accept official quotation for Booking #' . $quotationBooking->booking_id,
                'sub' => 'Action required before technician dispatch',
                'target' => 'bookings',
                'badge' => 'Quotation Ready',
                'badge_color' => 'amber',
            ];
        }

        $unratedBooking = Booking::with('service')
            ->where('client_id', $userId)
            ->where('booking_status', 'Completed')
            ->whereDoesntHave('feedback')
            ->latest('booking_id')
            ->first();
        if ($unratedBooking) {
            $toDoItems[] = [
                'id' => 'feedback_' . $unratedBooking->booking_id,
                'title' => 'Booking #' . $unratedBooking->booking_id . ' (' . ($unratedBooking->service?->service_name ?? 'Service') . ') is complete — leave a rating & feedback',
                'sub' => 'Your service is complete. Share your rating and feedback with our team.',
                'target' => 'bookings',
                'badge' => 'Rate Service',
                'badge_color' => 'blue',
            ];
        }

        if (DB::getSchemaBuilder()->hasTable('ocular_inspection_recommendations')) {
            $readyOcular = DB::table('ocular_inspection_recommendations as r')
                ->join('bookings as b', 'b.booking_id', '=', 'r.booking_id')
                ->where('b.client_id', $userId)
                ->where('r.status', 'Submitted')
                ->orderByDesc('r.booking_id')
                ->first(['r.booking_id']);

            if ($readyOcular) {
                array_unshift($toDoItems, [
                    'id' => 'ocular_ready_' . $readyOcular->booking_id,
                    'title' => 'View Ocular Inspection Results & AC Recommendations (Booking #' . $readyOcular->booking_id . ')',
                    'sub' => 'Select your preferred AC unit and proceed to payment & installation scheduling',
                    'target' => 'bookings',
                    'badge' => 'Recommendations Ready',
                    'badge_color' => 'emerald',
                ]);
            }
        }

        if (empty($user->address) || empty($user->contact_number)) {
            $toDoItems[] = [
                'id' => 'profile_complete',
                'title' => 'Set default service address and contact number',
                'sub' => 'Fast-tracks your next technician arrival',
                'target' => 'book',
                'badge' => 'Profile',
                'badge_color' => 'slate',
            ];
        }

        CustomerBookingController::ensurePrimaryServicesExist();

        $services = Service::active()
            ->where('service_name', 'not like', 'AC Unit Sale%')
            ->orderBy('display_order')
            ->get()
            ->map(function ($s) {
                return [
                    'service_id' => $s->service_id,
                    'service_name' => $s->service_name,
                    'description' => $s->description,
                    'category' => $s->category,
                    'booking_fee' => (float) ($s->booking_fee ?? 300.00),
                    'is_active' => (bool) $s->is_active,
                ];
            });

        $unitTypes = \App\Models\UnitType::active()->orderBy('display_order')->orderBy('id')->get();
        $brands = \App\Models\Brand::active()->orderBy('display_order')->orderBy('name')->get();

        $unitDetail = CustomerUnitDetail::where('user_id', $userId)->first();
        $serviceForecasts = app(\App\Services\ForecastingService::class)->getCustomerForecasts($userId);

        if (! empty($serviceForecasts)) {
            $primaryForecast = $serviceForecasts[0];
            $isDueWeek = ($primaryForecast['urgency_level'] ?? '') === 'Due This Week';
            $badgeColor = match ($primaryForecast['urgency_level'] ?? '') {
                'Due This Week' => 'amber',
                'Scheduled'     => 'emerald',
                'Due Soon'      => 'orange',
                default         => 'blue',
            };
            array_unshift($toDoItems, [
                'id' => 'forecast_' . ($primaryForecast['forecast_id'] ?? 0),
                'title' => 'Maintenance Reminder: ' . $primaryForecast['recommended_service_name'] . ' (' . $primaryForecast['unit_summary'] . ')',
                'sub' => ($isDueWeek ? 'Due this week • ' : 'Next due on ') . $primaryForecast['predicted_due_date'] . ' (3-Month Cycle)',
                'target' => 'book',
                'recommended_service_id' => $primaryForecast['recommended_service_id'],
                'badge' => $primaryForecast['urgency_level'],
                'badge_color' => $badgeColor,
            ]);
        }

        return response()->json([
            'stats' => [
                'pending_bookings' => $pendingCount,
                'active_bookings' => $activeCount,
                'completed_bookings' => $completedCount,
                'cancelled_bookings' => $cancelledCount,
                'total_bookings' => $totalCount,
                'complaints' => $complaintsCount,
                'announcements' => $announcements->count(),
            ],
            'recent_bookings' => $recentBookings,
            'upcoming_appointment' => $upcomingBooking ? [
                'booking_id' => $upcomingBooking->booking_id,
                'service_name' => $upcomingBooking->service?->service_name ?? 'Aircon Service',
                'scheduled_date' => $upcomingBooking->scheduled_date?->format('Y-m-d H:i:s'),
                'scheduled_date_formatted' => $upcomingBooking->scheduled_date ? $upcomingBooking->scheduled_date->format('D, M d, Y • h:i A') : 'TBD',
                'booking_status' => $upcomingBooking->booking_status,
                'assigned_tech_name' => $upcomingBooking->technician ? trim("{$upcomingBooking->technician->given_name} {$upcomingBooking->technician->last_name}") : 'Pending Assignment',
            ] : null,
            'service_forecasts' => $serviceForecasts,
            'to_do_items' => $toDoItems,
            'services' => $services,
            'unit_types' => $unitTypes,
            'brands' => $brands,
            'announcements' => $announcements,
            'unit_detail' => $unitDetail,
            'user' => (function () use ($user) {
                $geo = LocationAutocompleteController::evaluateGeospatialLocation($user->address);
                return [
                    'user_id' => $user->user_id,
                    'account_type' => $user->account_type ?? 'individual',
                    'company_name' => $user->company_name,
                    'representative_role' => $user->representative_role,
                    'tin' => $user->tin,
                    'business_permit_path' => $user->business_permit_path,
                    'business_permit_url' => $user->business_permit_url,
                    'verification_status' => $user->verification_status ?? 'approved',
                    'verification_rejection_reason' => $user->verification_rejection_reason,
                    'resubmission_attempts' => (int) ($user->resubmission_attempts ?? 0),
                    'last_resubmitted_at' => $user->last_resubmitted_at?->toISOString(),
                    'remaining_daily_attempts' => $user->getDailyResubmissionAttemptsRemaining(),
                    'can_resubmit_today' => $user->getDailyResubmissionAttemptsRemaining() > 0,
                    'verified_at' => $user->verified_at?->toISOString(),
                    'is_business_account' => $user->isBusinessCustomer(),
                    'is_business_verified' => $user->isBusinessVerified(),
                    'given_name' => $user->given_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'full_name' => $user->name,
                    'email' => $user->email,
                    'contact_number' => $user->contact_number,
                    'address' => $user->address,
                    'is_within_zamboanga_city' => $geo['is_within_zamboanga_city'],
                    'location_verification' => $geo,
                    'geospatial_alert_acknowledged' => (bool) $user->geospatial_alert_acknowledged_at,
                    'geospatial_alert_acknowledged_at' => $user->geospatial_alert_acknowledged_at?->toISOString(),
                ];
            })(),
        ]);
    }

    /**
     * Acknowledge the geospatial boundary alert so it will never show again for this customer.
     */
    public function acknowledgeGeospatialAlert(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && ! $user->geospatial_alert_acknowledged_at) {
            $user->update(['geospatial_alert_acknowledged_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'geospatial_alert_acknowledged' => true,
            'acknowledged_at' => $user?->geospatial_alert_acknowledged_at?->toISOString() ?? now()->toISOString(),
        ]);
    }

    /**
     * Get announcements visible to customers.
     */
    public function announcementsIndex(Request $request): JsonResponse
    {
        $announcements = DB::table('announcements')
            ->join('users as creators', 'creators.user_id', '=', 'announcements.created_by')
            ->leftJoin('roles', 'roles.role_id', '=', 'announcements.target_role_id')
            ->where(function ($query) {
                $query->whereNull('announcements.target_role_id')
                    ->orWhere('announcements.target_role_id', 6);
            })
            ->select([
                'announcements.id',
                'announcements.created_by',
                'announcements.title',
                'announcements.message',
                'announcements.target_role_id',
                'announcements.created_at',
                'announcements.updated_at',
                DB::raw("TRIM(CONCAT_WS(' ', creators.given_name, creators.middle_name, creators.last_name)) as author_name"),
                'roles.role_name',
            ])
            ->orderByDesc('announcements.created_at')
            ->get()
            ->map(function ($row) {
                return [
                    'id' => (int) $row->id,
                    'title' => $row->title,
                    'message' => $row->message,
                    'target_role' => $row->role_name ?? 'All Staff & Customers',
                    'author' => $row->author_name,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ];
            });

        return response()->json([
            'data' => $announcements,
        ]);
    }

    /**
     * Re-submit business verification details after rejection (Rate limited to 3 daily attempts).
     */
    public function resubmitBusinessVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || (int) $user->role_id !== 6 || ! $user->isBusinessCustomer()) {
            return response()->json([
                'message' => 'Unauthorized. Only Business / Corporate customers can submit verification details.',
            ], 403);
        }

        if ($user->verification_status === 'approved') {
            return response()->json([
                'message' => 'Your business account is already verified and approved.',
            ], 422);
        }

        if ($user->verification_status === 'pending') {
            return response()->json([
                'message' => 'Your business account verification is currently under review by our administrators.',
            ], 422);
        }

        // Strict daily limit: 3 attempts per calendar day
        $remainingAttempts = $user->getDailyResubmissionAttemptsRemaining();
        if ($remainingAttempts <= 0) {
            return response()->json([
                'message' => 'You have reached the maximum limit of 3 verification re-submission attempts for today. Please try again tomorrow.',
            ], 422);
        }

        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'representative_role' => ['required', 'string', 'max:150'],
            'tin' => [
                'required',
                'string',
                'max:50',
                Rule::unique('users', 'tin')->ignore($user->user_id, 'user_id'),
            ],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:500'],
            'business_permit' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // Max 5MB
        ], [
            'tin.unique' => 'This Tax Identification Number (TIN) is already registered to another business account. If your company already has an account, please contact AC TOWER Support.',
            'business_permit.max' => 'The uploaded business permit must not exceed 5MB.',
            'business_permit.mimes' => 'The business permit must be a valid PDF, JPG, JPEG, or PNG document.',
        ]);

        // Normalize TIN
        $rawTin = (string) $validated['tin'];
        $digitsOnly = preg_replace('/[^0-9]/', '', $rawTin);
        if (strlen($digitsOnly) === 9) {
            $formattedTin = sprintf('%s-%s-%s-000', substr($digitsOnly, 0, 3), substr($digitsOnly, 3, 3), substr($digitsOnly, 6, 3));
        } elseif (strlen($digitsOnly) === 12) {
            $formattedTin = sprintf('%s-%s-%s-%s', substr($digitsOnly, 0, 3), substr($digitsOnly, 3, 3), substr($digitsOnly, 6, 3), substr($digitsOnly, 9, 3));
        } else {
            $formattedTin = strtoupper(trim($rawTin));
        }

        // Handle business permit document upload if provided
        if ($request->hasFile('business_permit')) {
            $file = $request->file('business_permit');
            $filename = 'permit_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('uploads/business-permits', $filename, 'public');

            // Ensure file is mirrored to public/uploads/business-permits for frictionless serving
            $publicPermitDir = public_path('uploads/business-permits');
            if (! File::exists($publicPermitDir)) {
                File::makeDirectory($publicPermitDir, 0755, true);
            }
            @copy(storage_path('app/public/' . $path), $publicPermitDir . '/' . $filename);

            $user->business_permit_path = $path;
        }

        // Calculate daily attempt sequence
        $tz = config('app.timezone', 'Asia/Manila');
        $isToday = $user->last_resubmitted_at && $user->last_resubmitted_at->timezone($tz)->isToday();
        $newAttempts = $isToday ? ((int) $user->resubmission_attempts + 1) : 1;

        $user->company_name = trim($validated['company_name']);
        $user->representative_role = trim($validated['representative_role']);
        $user->tin = $formattedTin;
        $user->contact_number = trim($validated['contact_number']);
        $user->address = trim($validated['address']);
        $user->verification_status = 'pending';
        $user->verification_rejection_reason = null;
        $user->resubmission_attempts = $newAttempts;
        $user->last_resubmitted_at = now();
        $user->save();

        if (Schema::hasTable('activity_logs')) {
            DB::table('activity_logs')->insert([
                'user_id' => $user->user_id,
                'action' => 'UPDATE',
                'description' => "Business customer {$user->name} ({$user->company_name}) re-submitted verification details (Daily attempt {$newAttempts}/3).",
                'ip_address' => $request->ip(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $leftToday = max(0, 3 - $newAttempts);

        return response()->json([
            'success' => true,
            'message' => "Your business verification details have been successfully re-submitted for admin review. You have {$leftToday} re-submission attempt(s) remaining today.",
            'user' => [
                'user_id' => $user->user_id,
                'account_type' => $user->account_type,
                'company_name' => $user->company_name,
                'representative_role' => $user->representative_role,
                'tin' => $user->tin,
                'business_permit_path' => $user->business_permit_path,
                'business_permit_url' => $user->business_permit_url,
                'verification_status' => $user->verification_status,
                'verification_rejection_reason' => null,
                'resubmission_attempts' => $newAttempts,
                'remaining_daily_attempts' => $leftToday,
                'can_resubmit_today' => $leftToday > 0,
                'last_resubmitted_at' => $user->last_resubmitted_at->toISOString(),
                'address' => $user->address,
                'contact_number' => $user->contact_number,
            ],
        ]);
    }
}
