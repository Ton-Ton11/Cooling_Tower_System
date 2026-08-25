<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Complaint;
use App\Models\CustomerUnitDetail;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                    'scheduled_date' => $b->scheduled_date?->toISOString(),
                    'booking_status' => $b->booking_status,
                    'service_payment_method' => $b->service_payment_method ?? 'Cash',
                    'cancellation_reason' => $b->cancellation_reason,
                    'notes' => $b->notes,
                    'created_at' => $b->created_at?->toISOString(),
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

        $services = Service::active()->orderBy('display_order')->orderBy('service_id')->get()->map(function ($s) {
            return [
                'service_id' => $s->service_id,
                'service_name' => $s->service_name,
                'description' => $s->description,
                'base_price' => (float) $s->base_price,
                'category' => $s->category,
            ];
        });

        $unitTypes = \App\Models\UnitType::active()->orderBy('display_order')->orderBy('id')->get();
        $brands = \App\Models\Brand::active()->orderBy('display_order')->orderBy('name')->get();

        $unitDetail = CustomerUnitDetail::where('user_id', $userId)->first();

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
            'services' => $services,
            'unit_types' => $unitTypes,
            'brands' => $brands,
            'announcements' => $announcements,
            'unit_detail' => $unitDetail,
            'user' => [
                'user_id' => $user->user_id,
                'given_name' => $user->given_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'full_name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'address' => $user->address,
            ],
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
}
