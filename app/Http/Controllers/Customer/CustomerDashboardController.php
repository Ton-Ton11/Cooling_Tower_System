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
                'title' => 'Rate technician performance for ' . ($unratedBooking->service?->service_name ?? 'Service'),
                'sub' => 'Help us recognize quality service',
                'target' => 'history',
                'badge' => 'Rate Service',
                'badge_color' => 'blue',
            ];
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

        $toDoItems[] = [
            'id' => 'maintenance_check',
            'title' => 'Schedule regular quarterly aircon cleaning',
            'sub' => 'Recommended every 3–6 months for optimal cooling',
            'target' => 'book',
            'badge' => 'Routine Care',
            'badge_color' => 'emerald',
        ];

        $onlineTechnicians = DB::table('users')
            ->join('roles', 'roles.role_id', '=', 'users.role_id')
            ->whereIn('users.role_id', [5, 7])
            ->select([
                'users.user_id',
                'users.given_name',
                'users.last_name',
                'roles.role_name',
                'users.contact_number',
            ])
            ->limit(6)
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->user_id,
                    'name' => trim("{$t->given_name} {$t->last_name}"),
                    'role' => $t->role_name,
                    'online' => true,
                ];
            });

        $services = Service::whereIn('service_name', [
            'Installation',
            'Repair / Check-up',
            'Cleaning / Preventive Maintenance'
        ])
        ->orderBy('display_order')
        ->get()
        ->map(function ($s) {
            return [
                'service_id' => $s->service_id,
                'service_name' => $s->service_name,
                'description' => $s->description,
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
            'upcoming_appointment' => $upcomingBooking ? [
                'booking_id' => $upcomingBooking->booking_id,
                'service_name' => $upcomingBooking->service?->service_name ?? 'Aircon Service',
                'scheduled_date' => $upcomingBooking->scheduled_date?->toISOString(),
                'scheduled_date_formatted' => $upcomingBooking->scheduled_date ? $upcomingBooking->scheduled_date->format('D, M d, Y • h:i A') : 'TBD',
                'booking_status' => $upcomingBooking->booking_status,
                'assigned_tech_name' => $upcomingBooking->technician ? trim("{$upcomingBooking->technician->given_name} {$upcomingBooking->technician->last_name}") : 'Pending Assignment',
            ] : null,
            'to_do_items' => $toDoItems,
            'online_technicians' => $onlineTechnicians,
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
