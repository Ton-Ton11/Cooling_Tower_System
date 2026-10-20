<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ServiceForecast;
use App\Models\TechnicianCertification;
use App\Models\User;
use App\Services\ForecastingService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TopbarWidgetController extends Controller
{
    public function __construct(
        protected ForecastingService $forecastingService
    ) {}

    protected function ensureWidgetTablesExist(): void
    {
        $this->forecastingService->ensureTablesExist();

        if (! Schema::hasTable('staff_messages')) {
            Schema::create('staff_messages', function (Blueprint $table) {
                $table->id('message_id');
                $table->unsignedBigInteger('sender_id')->index();
                $table->unsignedBigInteger('recipient_id')->nullable()->index(); // null = broadcast to all employees
                $table->string('subject', 160)->nullable();
                $table->text('body');
                $table->boolean('is_read')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('user_notification_reads')) {
            Schema::create('user_notification_reads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->timestamp('last_read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Fetch live notifications, employee messages, and calendar events for the Topbar.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $this->ensureWidgetTablesExist();

        $userId = (int) $user->user_id;
        $roleId = (int) $user->role_id;
        $isHeadTech = $roleId === 7;
        $effectiveRoleId = $isHeadTech ? 7 : $roleId;
        $isCustomer = ! $isHeadTech && $roleId === 6;

        $readRow = DB::table('user_notification_reads')->where('user_id', $userId)->first();
        $lastReadAt = $readRow?->last_read_at ? Carbon::parse($readRow->last_read_at) : null;

        // 1. Build Notifications (for both Customers and Employees, including Head Technician)
        $notifications = $this->buildNotificationsForUser($userId, $effectiveRoleId, $isHeadTech, $lastReadAt);
        $unreadNotificationsCount = collect($notifications)->where('unread', true)->count();

        // If Customer, only return notifications (no messages or employee calendar)
        if ($isCustomer) {
            return response()->json([
                'is_customer'                => true,
                'is_head_technician'         => false,
                'role_label'                 => 'Customer',
                'notifications'              => $notifications,
                'unread_notifications_count' => $unreadNotificationsCount,
                'messages'                   => [],
                'unread_messages_count'      => 0,
                'staff_recipients'           => [],
                'calendar_events'            => [],
            ]);
        }

        // 2. Build Employee Messages & Recipients (applies to all employees including Head Technician)
        $this->seedInitialStaffMessagesIfEmpty($userId);

        $messages = DB::table('staff_messages')
            ->join('users as senders', 'senders.user_id', '=', 'staff_messages.sender_id')
            ->leftJoin('roles as sender_roles', 'sender_roles.role_id', '=', 'senders.role_id')
            ->leftJoin('users as recipients', 'recipients.user_id', '=', 'staff_messages.recipient_id')
            ->where(function ($q) use ($userId) {
                $q->where('staff_messages.recipient_id', $userId)
                    ->orWhereNull('staff_messages.recipient_id')
                    ->orWhere('staff_messages.sender_id', $userId);
            })
            ->select([
                'staff_messages.message_id',
                'staff_messages.sender_id',
                'staff_messages.recipient_id',
                'staff_messages.subject',
                'staff_messages.body',
                'staff_messages.is_read',
                'staff_messages.created_at',
                'senders.role_id as sender_role_id',
                'sender_roles.role_name as sender_role',
                DB::raw("TRIM(CONCAT_WS(' ', senders.given_name, senders.last_name)) as sender_name"),
                DB::raw("TRIM(CONCAT_WS(' ', recipients.given_name, recipients.last_name)) as recipient_name"),
            ])
            ->orderByDesc('staff_messages.created_at')
            ->limit(25)
            ->get()
            ->map(function ($m) use ($userId) {
                $createdAt = Carbon::parse($m->created_at);
                $isUnread = ! $m->is_read && (int) $m->sender_id !== $userId;
                $senderRoleLabel = ((int) $m->sender_role_id === 7)
                    ? 'Head Technician'
                    : ($m->sender_role ?: 'Staff');

                return [
                    'message_id'     => (int) $m->message_id,
                    'sender_id'      => (int) $m->sender_id,
                    'sender_name'    => $m->sender_name ?: 'Staff Member',
                    'sender_role'    => $senderRoleLabel,
                    'recipient_id'   => $m->recipient_id ? (int) $m->recipient_id : null,
                    'recipient_name' => $m->recipient_name ?: 'All Employees',
                    'subject'        => $m->subject ?: 'Operations Update',
                    'body'           => $m->body,
                    'unread'         => $isUnread,
                    'is_mine'        => (int) $m->sender_id === $userId,
                    'time_ago'       => $createdAt->diffForHumans(),
                    'formatted_date' => $createdAt->format('M d, h:i A'),
                ];
            })
            ->values()
            ->all();

        $unreadMessagesCount = collect($messages)->where('unread', true)->count();

        $staffRecipients = DB::table('users')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->where('users.role_id', '!=', 6)
            ->where('users.user_id', '!=', $userId)
            ->select([
                'users.user_id',
                'users.role_id',
                'users.given_name',
                'users.last_name',
                'roles.role_name',
            ])
            ->orderBy('users.role_id')
            ->limit(40)
            ->get()
            ->map(function ($u) {
                $rLabel = ((int) $u->role_id === 7)
                    ? 'Head Technician'
                    : ($u->role_name ?: 'Staff');

                return [
                    'user_id' => (int) $u->user_id,
                    'name'    => trim("{$u->given_name} {$u->last_name}"),
                    'role'    => $rLabel,
                    'role_id' => (int) $u->role_id,
                ];
            })
            ->values()
            ->all();

        // 3. Build Employee Calendar Events (Bookings, Predictive Maintenance, Certifications)
        $calendarEvents = $this->buildEmployeeCalendarEvents($userId, $effectiveRoleId, $isHeadTech);

        return response()->json([
            'is_customer'                => false,
            'is_head_technician'         => $isHeadTech,
            'role_label'                 => $isHeadTech ? 'Head Technician' : ($user->role?->role_name ?? 'Staff'),
            'notifications'              => $notifications,
            'unread_notifications_count' => $unreadNotificationsCount,
            'messages'                   => $messages,
            'unread_messages_count'      => $unreadMessagesCount,
            'staff_recipients'           => $staffRecipients,
            'calendar_events'            => $calendarEvents,
        ]);
    }

    /**
     * Send a new internal staff message (All Employees including Head Technician).
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $user = $request->user();
        $isHeadTech = $user && ((int) $user->role_id === 7);
        if (! $user || (! $isHeadTech && (int) $user->role_id === 6)) {
            abort(403, 'Employee access required.');
        }

        $this->ensureWidgetTablesExist();

        $validated = $request->validate([
            'recipient_id' => ['nullable', 'integer', 'exists:users,user_id'],
            'subject'      => ['nullable', 'string', 'max:160'],
            'body'         => ['required', 'string', 'max:1000'],
        ]);

        DB::table('staff_messages')->insert([
            'sender_id'    => (int) $user->user_id,
            'recipient_id' => ! empty($validated['recipient_id']) ? (int) $validated['recipient_id'] : null,
            'subject'      => $validated['subject'] ?: ($isHeadTech ? 'Head Technician Dispatch Directive' : 'Field & Dispatch Coordination'),
            'body'         => $validated['body'],
            'is_read'      => false,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return $this->index($request);
    }

    /**
     * Mark messages as read for the current employee.
     */
    public function markMessagesRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $this->ensureWidgetTablesExist();
        $userId = (int) $user->user_id;

        DB::table('staff_messages')
            ->where(function ($q) use ($userId) {
                $q->where('recipient_id', $userId)
                    ->orWhereNull('recipient_id');
            })
            ->where('sender_id', '!=', $userId)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Mark all notifications as read for the current user.
     */
    public function markNotificationsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $this->ensureWidgetTablesExist();
        $userId = (int) $user->user_id;

        DB::table('user_notification_reads')->updateOrInsert(
            ['user_id' => $userId],
            ['last_read_at' => now(), 'updated_at' => now(), 'created_at' => now()]
        );

        if (Schema::hasTable('notifications')) {
            DB::table('notifications')
                ->where('notifiable_id', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json(['status' => 'ok']);
    }

    protected function buildNotificationsForUser(int $userId, int $roleId, bool $isHeadTech, ?Carbon $lastReadAt): array
    {
        $items = [];

        if (! $isHeadTech && $roleId === 6) {
            // CUSTOMER NOTIFICATIONS:
            // 1. Predictive Maintenance Forecasts
            $forecasts = $this->forecastingService->getCustomerForecasts($userId);
            foreach (array_slice($forecasts, 0, 3) as $f) {
                $createdAt = now()->subHours(2);
                $items[] = [
                    'id'          => 'cust_forecast_' . ($f['forecast_id'] ?? 0),
                    'type'        => 'forecast',
                    'badge'       => $f['urgency_level'],
                    'badge_color' => $f['urgency_level'] === 'Overdue' ? 'rose' : 'indigo',
                    'title'       => 'Predictive Maintenance: ' . $f['recommended_service_name'],
                    'message'     => "Suggested by {$f['predicted_due_date']} for {$f['unit_summary']} following your {$f['source_service_name']}.",
                    'time_ago'    => 'Automated Forecast',
                    'target_page' => 'book',
                    'unread'      => ! $lastReadAt || $createdAt->gt($lastReadAt),
                ];
            }

            // 2. Customer Booking Updates
            $bookings = Booking::with('service')
                ->where('client_id', $userId)
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get();

            foreach ($bookings as $b) {
                $updated = $b->updated_at ? Carbon::parse($b->updated_at) : now()->subDay();
                $srvName = $b->service?->service_name ?? 'Aircon Service';
                $items[] = [
                    'id'          => 'cust_booking_' . $b->booking_id,
                    'type'        => 'booking',
                    'badge'       => $b->booking_status,
                    'badge_color' => $b->booking_status === 'Completed' ? 'emerald' : ($b->booking_status === 'Pending' ? 'amber' : 'blue'),
                    'title'       => "Booking #{$b->booking_id} ({$srvName}) is {$b->booking_status}",
                    'message'     => $b->quotation_status === 'Quotation Issued'
                        ? 'Your official quotation is ready for review and acceptance.'
                        : 'Scheduled for ' . ($b->scheduled_date ? $b->scheduled_date->format('M d, Y h:i A') : 'TBD'),
                    'time_ago'    => $updated->diffForHumans(),
                    'target_page' => 'bookings',
                    'unread'      => ! $lastReadAt || $updated->gt($lastReadAt),
                ];
            }
        } elseif ($isHeadTech) {
            // HEAD TECHNICIAN NOTIFICATIONS (Employee + Head of Technicians):
            // Ensure all technicians have certifications initialized
            $techUsers = User::whereIn('role_id', [5, 7])->get();
            foreach ($techUsers as $tUser) {
                $this->forecastingService->getTechnicianCertifications((int) $tUser->user_id);
            }

            // 1. Personal Certifications of the Head Technician
            $myCerts = $this->forecastingService->getTechnicianCertifications($userId);
            foreach ($myCerts as $mc) {
                if (in_array($mc['status'], ['Expired', 'Critical', 'Expiring Soon'], true)) {
                    $items[] = [
                        'id'          => 'head_own_cert_' . $mc['certification_id'],
                        'type'        => 'certification',
                        'badge'       => 'My License • ' . $mc['status'],
                        'badge_color' => $mc['status'] === 'Expiring Soon' ? 'amber' : 'rose',
                        'title'       => 'Your Certification Renewal: ' . $mc['certification_name'],
                        'message'     => $mc['action_notice'],
                        'time_ago'    => 'Expiry: ' . $mc['expiry_date'],
                        'target_page' => 'dashboard',
                        'unread'      => ! $lastReadAt || now()->subMinutes(30)->gt($lastReadAt),
                    ];
                }
            }

            // 2. Crew / Subordinate Technicians' Certification Compliance Alerts
            $crewCerts = TechnicianCertification::with('technician')
                ->where('user_id', '!=', $userId)
                ->orderBy('expiry_date', 'asc')
                ->limit(4)
                ->get();

            foreach ($crewCerts as $cc) {
                $techName = $cc->technician?->name ?? 'Technician #' . $cc->user_id;
                $exp = Carbon::parse($cc->expiry_date)->startOfDay();
                $daysLeft = (int) now()->startOfDay()->diffInDays($exp, false);
                $isUrgent = $daysLeft <= $cc->renewal_lead_days;

                $items[] = [
                    'id'          => 'head_crew_cert_' . $cc->certification_id,
                    'type'        => 'certification',
                    'badge'       => $isUrgent ? 'Crew Renewal Due' : 'Crew Compliance',
                    'badge_color' => $daysLeft <= 14 ? 'rose' : ($isUrgent ? 'amber' : 'indigo'),
                    'title'       => "Tech Crew License ({$techName}): {$cc->certification_name}",
                    'message'     => $isUrgent
                        ? "Expires on {$exp->format('M d, Y')} ({$daysLeft} days left). Remind {$techName} to renew before field dispatch."
                        : "Valid through {$exp->format('M d, Y')} ({$daysLeft} days remaining). Verified for squad assignment.",
                    'time_ago'    => 'Due ' . $exp->format('M d, Y'),
                    'target_page' => 'dashboard',
                    'unread'      => ! $lastReadAt || now()->subHours(1)->gt($lastReadAt),
                ];
            }

            // 3. Pending Tool Checklists for Technician Teams
            if (Schema::hasTable('tool_checklists')) {
                $pendingChecklists = DB::table('tool_checklists')
                    ->leftJoin('technician_teams', 'technician_teams.team_id', '=', 'tool_checklists.team_id')
                    ->whereIn('tool_checklists.status', ['Pending', 'Approved'])
                    ->orderByDesc('tool_checklists.created_at')
                    ->limit(2)
                    ->get([
                        'tool_checklists.checklist_id',
                        'tool_checklists.booking_id',
                        'tool_checklists.status',
                        'tool_checklists.notes',
                        'technician_teams.team_name',
                    ]);

                foreach ($pendingChecklists as $chk) {
                    $squadName = $chk->team_name ?: 'Field Squad';
                    $items[] = [
                        'id'          => 'head_chk_' . $chk->checklist_id,
                        'type'        => 'checklist',
                        'badge'       => 'Checklist • ' . $chk->status,
                        'badge_color' => $chk->status === 'Pending' ? 'amber' : 'blue',
                        'title'       => "Tool Checklist #{$chk->checklist_id} ({$squadName}) — Booking #{$chk->booking_id}",
                        'message'     => $chk->notes ?: 'Verify field tools and equipment custody for your technician team.',
                        'time_ago'    => 'Squad Equipment',
                        'target_page' => 'tools',
                        'unread'      => ! $lastReadAt || now()->subHours(2)->gt($lastReadAt),
                    ];
                }
            }

            // 4. Active & Upcoming Team Dispatches
            $teamBookings = Booking::with(['service', 'client'])
                ->whereIn('booking_status', ['Pending', 'Approved', 'Dispatched', 'In-Progress'])
                ->orderBy('scheduled_date', 'asc')
                ->limit(3)
                ->get();

            foreach ($teamBookings as $tb) {
                $updated = $tb->updated_at ? Carbon::parse($tb->updated_at) : now()->subHours(3);
                $clientName = $tb->client?->name ?? 'Customer';
                $srvName = $tb->service?->service_name ?? 'HVAC Service';
                $items[] = [
                    'id'          => 'head_booking_' . $tb->booking_id,
                    'type'        => 'booking',
                    'badge'       => 'Dispatch • ' . $tb->booking_status,
                    'badge_color' => $tb->booking_status === 'Pending' ? 'amber' : 'blue',
                    'title'       => "Squad Job #{$tb->booking_id}: {$srvName}",
                    'message'     => "Client: {$clientName} • Scheduled " . ($tb->scheduled_date ? $tb->scheduled_date->format('M d, Y h:i A') : 'TBD'),
                    'time_ago'    => $updated->diffForHumans(),
                    'target_page' => 'bookings',
                    'unread'      => ! $lastReadAt || $updated->gt($lastReadAt),
                ];
            }
        } else {
            // REGULAR TECHNICIAN (roleId = 5) OR OFFICE STAFF (roleId = 1, 2, 3, 4):
            if ($roleId === 5) {
                $certs = $this->forecastingService->getTechnicianCertifications($userId);
                foreach ($certs as $c) {
                    $isUrgent = in_array($c['status'], ['Expired', 'Critical', 'Expiring Soon'], true);
                    $items[] = [
                        'id'          => 'tech_cert_' . $c['certification_id'],
                        'type'        => 'certification',
                        'badge'       => $c['status'],
                        'badge_color' => $c['status'] === 'Active' ? 'emerald' : ($c['status'] === 'Expiring Soon' ? 'amber' : 'rose'),
                        'title'       => ($isUrgent ? 'License Renewal Reminder: ' : 'License Tracked: ') . $c['certification_name'],
                        'message'     => $c['action_notice'],
                        'time_ago'    => 'Expiry: ' . $c['expiry_date'],
                        'target_page' => 'dashboard',
                        'unread'      => ! $lastReadAt || now()->subHours(1)->gt($lastReadAt),
                    ];
                }
            } else {
                // Managers / Super Admin / Admin Assistant / Tools Man
                $expiringCerts = TechnicianCertification::with('technician')
                    ->orderBy('expiry_date')
                    ->limit(3)
                    ->get();

                foreach ($expiringCerts as $ec) {
                    $techName = $ec->technician?->name ?? 'Technician';
                    $exp = Carbon::parse($ec->expiry_date);
                    $daysLeft = (int) now()->startOfDay()->diffInDays($exp->copy()->startOfDay(), false);
                    $items[] = [
                        'id'          => 'mgr_cert_' . $ec->certification_id,
                        'type'        => 'certification',
                        'badge'       => $daysLeft <= 45 ? 'Renewal Due' : 'Compliance',
                        'badge_color' => $daysLeft <= 45 ? 'amber' : 'indigo',
                        'title'       => "{$techName}: {$ec->certification_name}",
                        'message'     => "Certification expires on {$exp->format('M d, Y')} ({$daysLeft} days left).",
                        'time_ago'    => $exp->diffForHumans(),
                        'target_page' => 'dashboard',
                        'unread'      => ! $lastReadAt || now()->subHours(1)->gt($lastReadAt),
                    ];
                }

                // Customer Predictive Maintenance Alerts for Managers/Admins
                $dueForecasts = ServiceForecast::with('customer')
                    ->where('urgency_level', '!=', 'Dismissed')
                    ->orderBy('predicted_due_date')
                    ->limit(3)
                    ->get();

                foreach ($dueForecasts as $df) {
                    $cName = $df->customer?->name ?? 'Customer';
                    $due = Carbon::parse($df->predicted_due_date);
                    $items[] = [
                        'id'          => 'mgr_forecast_' . $df->forecast_id,
                        'type'        => 'forecast',
                        'badge'       => $df->urgency_level,
                        'badge_color' => 'indigo',
                        'title'       => "Predictive Maintenance: {$cName}",
                        'message'     => "Recommended {$df->recommended_service_name} for {$df->unit_summary} by {$due->format('M d, Y')}.",
                        'time_ago'    => 'Due ' . $due->format('M d'),
                        'target_page' => 'dashboard',
                        'unread'      => ! $lastReadAt || now()->subHours(2)->gt($lastReadAt),
                    ];
                }
            }

            // Recent Bookings / Dispatches
            $recentBookings = Booking::with(['service', 'client'])
                ->orderByDesc('updated_at')
                ->limit(4)
                ->get();

            foreach ($recentBookings as $rb) {
                $updated = $rb->updated_at ? Carbon::parse($rb->updated_at) : now()->subHours(4);
                $clientName = $rb->client?->name ?? 'Customer';
                $srvName = $rb->service?->service_name ?? 'Service';
                $items[] = [
                    'id'          => 'emp_booking_' . $rb->booking_id,
                    'type'        => 'booking',
                    'badge'       => $rb->booking_status,
                    'badge_color' => $rb->booking_status === 'Pending' ? 'amber' : 'blue',
                    'title'       => "Booking #{$rb->booking_id}: {$srvName}",
                    'message'     => "Client: {$clientName} • Scheduled " . ($rb->scheduled_date ? $rb->scheduled_date->format('M d, Y h:i A') : 'TBD'),
                    'time_ago'    => $updated->diffForHumans(),
                    'target_page' => $roleId === 4 ? 'checklists' : 'bookings',
                    'unread'      => ! $lastReadAt || $updated->gt($lastReadAt),
                ];
            }
        }

        // Official Announcements (All Roles)
        if (Schema::hasTable('announcements')) {
            $announcements = DB::table('announcements')
                ->where(function ($q) use ($roleId, $isHeadTech) {
                    $q->whereNull('target_role_id')
                        ->orWhere('target_role_id', $roleId);
                    if ($isHeadTech) {
                        $q->orWhereIn('target_role_id', [5, 7]);
                    }
                })
                ->orderByDesc('created_at')
                ->limit(3)
                ->get();

            foreach ($announcements as $a) {
                $created = $a->created_at ? Carbon::parse($a->created_at) : now()->subDays(2);
                $items[] = [
                    'id'          => 'ann_' . $a->id,
                    'type'        => 'announcement',
                    'badge'       => 'Notice',
                    'badge_color' => 'emerald',
                    'title'       => $a->title,
                    'message'     => $a->message,
                    'time_ago'    => $created->diffForHumans(),
                    'target_page' => 'announcements',
                    'unread'      => ! $lastReadAt || $created->gt($lastReadAt),
                ];
            }
        }

        return array_slice($items, 0, 12);
    }

    protected function buildEmployeeCalendarEvents(int $userId, int $roleId, bool $isHeadTech): array
    {
        $events = [];

        // 1. Scheduled Bookings
        // Note: Head Technician (isHeadTech) oversees ALL technician squads and sees all field bookings.
        // Regular Technician (roleId = 5 and not Head Tech) sees their personal/team bookings.
        $bookingsQuery = Booking::with(['service', 'client'])
            ->whereNotNull('scheduled_date')
            ->where('booking_status', '!=', 'Cancelled');

        if ($roleId === 5 && ! $isHeadTech) {
            $myTeamIds = DB::table('technician_team_members')
                ->where('technician_id', $userId)
                ->pluck('team_id')
                ->all();

            $bookingsQuery->where(function ($q) use ($userId, $myTeamIds) {
                $q->where('assigned_tech_id', $userId)
                    ->orWhere('lead_technician_id', $userId)
                    ->orWhere('assistant_technician_id', $userId);
                if (! empty($myTeamIds)) {
                    $q->orWhereIn('assigned_team_id', $myTeamIds);
                }
            });
        }

        $bookings = $bookingsQuery->orderBy('scheduled_date', 'asc')->limit(40)->get();
        foreach ($bookings as $b) {
            $dt = Carbon::parse($b->scheduled_date);
            $events[] = [
                'id'          => 'cal_booking_' . $b->booking_id,
                'date'        => $dt->toDateString(),
                'time'        => $dt->format('h:i A'),
                'type'        => $isHeadTech ? 'Squad Dispatch' : 'Booking',
                'color'       => $b->booking_status === 'Completed' ? 'emerald' : ($b->booking_status === 'Pending' ? 'amber' : 'blue'),
                'title'       => "#{$b->booking_id} " . ($b->service?->service_name ?? 'HVAC Service'),
                'subtitle'    => ($b->client?->name ?? 'Client') . " • Status: {$b->booking_status}",
                'target_page' => 'bookings',
            ];
        }

        // 2. Predictive Maintenance Forecasts
        $forecasts = ServiceForecast::with('customer')
            ->where('urgency_level', '!=', 'Dismissed')
            ->orderBy('predicted_due_date', 'asc')
            ->limit(20)
            ->get();

        foreach ($forecasts as $f) {
            $dt = Carbon::parse($f->predicted_due_date);
            $events[] = [
                'id'          => 'cal_forecast_' . $f->forecast_id,
                'date'        => $dt->toDateString(),
                'time'        => 'Forecast Due',
                'type'        => 'Maintenance Forecast',
                'color'       => 'indigo',
                'title'       => 'Forecast: ' . $f->recommended_service_name,
                'subtitle'    => ($f->customer?->name ?? 'Customer') . ' (' . $f->unit_summary . ')',
                'target_page' => 'dashboard',
            ];
        }

        // 3. Technician Certification Expiries
        // Head Technician sees ALL technicians' certification expiries; regular tech sees their own.
        $certsQuery = TechnicianCertification::with('technician')->orderBy('expiry_date', 'asc');
        if ($roleId === 5 && ! $isHeadTech) {
            $certsQuery->where('user_id', $userId);
        }
        foreach ($certsQuery->limit(20)->get() as $c) {
            $dt = Carbon::parse($c->expiry_date);
            $techName = $c->technician?->name ?? 'Technician #' . $c->user_id;
            $events[] = [
                'id'          => 'cal_cert_' . $c->certification_id,
                'date'        => $dt->toDateString(),
                'time'        => 'License Expiry',
                'type'        => ((int) $c->user_id === $userId) ? 'My Certification' : 'Crew Certification',
                'color'       => 'rose',
                'title'       => "Cert Expiry ({$techName}): {$c->certification_name}",
                'subtitle'    => $c->issuing_body . ' • #' . ($c->certificate_number ?: 'On File'),
                'target_page' => 'dashboard',
            ];
        }

        return $events;
    }

    protected function seedInitialStaffMessagesIfEmpty(int $currentUserId): void
    {
        if (DB::table('staff_messages')->count() > 0) {
            return;
        }

        $sender = DB::table('users')->whereIn('role_id', [1, 2, 3])->first()
            ?? DB::table('users')->first();

        $senderId = $sender ? (int) $sender->user_id : $currentUserId;

        $headTech = DB::table('users')
            ->where('role_id', 7)
            ->first();
        $headTechId = $headTech ? (int) $headTech->user_id : $senderId;

        $starters = [
            [
                'sender_id'    => $headTechId,
                'recipient_id' => null,
                'subject'      => 'Head Technician Briefing: Squad Assignments & Tool Checklists',
                'body'         => 'All technicians: please verify your manifold gauges, vacuum pumps, and TESDA/DOLE safety licenses before morning dispatch.',
                'is_read'      => false,
                'created_at'   => now()->subHours(2),
                'updated_at'   => now()->subHours(2),
            ],
            [
                'sender_id'    => $senderId,
                'recipient_id' => null,
                'subject'      => 'Predictive Maintenance & Certification Renewal Reminders',
                'body'         => 'Our automated forecasting engine is active. Head Technician and Managers can monitor crew certification expiries and upcoming customer maintenance schedules from the dashboard and calendar.',
                'is_read'      => false,
                'created_at'   => now()->subHours(1),
                'updated_at'   => now()->subHours(1),
            ],
        ];

        DB::table('staff_messages')->insert($starters);
    }
}
