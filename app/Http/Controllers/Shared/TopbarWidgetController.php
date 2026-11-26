<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\DisabledBookingDate;
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
        \App\Http\Controllers\Shared\CustomerSupportController::ensureSupportTablesExist();

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

        $unreadCustomerChatsCount = 0;
        $pendingCustomerReportsCount = 0;
        if (in_array($effectiveRoleId, [1, 2], true)) {
            if (Schema::hasTable('customer_support_messages')) {
                $unreadCustomerChatsCount = (int) DB::table('customer_support_messages')
                    ->where('sender_role', 'customer')
                    ->where('is_read_by_manager', false)
                    ->count();
            }
            if (Schema::hasTable('customer_complaints')) {
                $pendingCustomerReportsCount = (int) DB::table('customer_complaints')
                    ->where('status', 'Pending')
                    ->count();
            }
        }

        return response()->json([
            'is_customer'                    => false,
            'is_head_technician'             => $isHeadTech,
            'role_label'                     => $isHeadTech ? 'Head Technician' : ($user->role?->role_name ?? 'Staff'),
            'notifications'                  => $notifications,
            'unread_notifications_count'     => $unreadNotificationsCount,
            'messages'                       => $messages,
            'unread_messages_count'          => $unreadMessagesCount,
            'unread_customer_chats_count'    => $unreadCustomerChatsCount,
            'pending_customer_reports_count' => $pendingCustomerReportsCount,
            'staff_recipients'               => $staffRecipients,
            'calendar_events'                => $calendarEvents,
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
            // 1. Completed-Booking 3-Month Maintenance Reminders (notify on end of countdown + loop to next cycle)
            $forecasts = $this->forecastingService->getCustomerForecasts($userId);
            foreach (array_slice($forecasts, 0, 4) as $f) {
                $isAlertActive = ! empty($f['is_alert_active']);
                $isDueWeek = ($f['urgency_level'] === 'Due This Week') || $isAlertActive;
                $eventTime = ! empty($f['reminder_sent_at'])
                    ? Carbon::parse($f['reminder_sent_at'])
                    : now()->subDays(1);
                $badgeColor = $isAlertActive ? 'amber' : match ($f['urgency_level']) {
                    'Due This Week' => 'amber',
                    'Due Soon'      => 'orange',
                    'Scheduled'     => 'emerald',
                    default         => 'indigo',
                };
                $cycleNumber = (int) ($f['cycle_number'] ?? 1);
                $isUnread = ! empty($f['reminder_sent_at'])
                    ? (! $lastReadAt || $eventTime->gt($lastReadAt))
                    : (! $lastReadAt && $isDueWeek);

                $items[] = [
                    'id'          => 'cust_forecast_' . ($f['forecast_id'] ?? 0) . '_c' . $cycleNumber,
                    'type'        => 'forecast',
                    'badge'       => $isAlertActive ? 'Maintenance Due' : ($isDueWeek ? 'Due Soon' : $f['urgency_level']),
                    'badge_color' => $badgeColor,
                    'title'       => ($isAlertActive ? 'Maintenance Due: ' : 'Maintenance Reminder: ') . $f['recommended_service_name'],
                    'message'     => $isAlertActive
                        ? "3-month countdown ended (" . ($f['last_reminded_formatted'] ?? 'today') . ") for {$f['unit_summary']}. Cycle #{$cycleNumber} started (due {$f['predicted_due_date']})."
                        : "Due {$f['predicted_due_date']} for {$f['unit_summary']} ({$f['source_service_name']}).",
                    'time_ago'    => ! empty($f['reminder_sent_at']) ? $eventTime->diffForHumans() : ($f['days_remaining'] <= 0 ? 'Due today' : "{$f['days_remaining']} days left"),
                    'target_page' => 'book',
                    'unread'      => $isUnread,
                ];
            }

            // 2. Customer Booking Updates (including Payment Incomplete 10-min timer, Reschedule Notice, Ocular Results & Rating Reminder)
            $bookings = Booking::with(['service', 'feedback'])
                ->where('client_id', $userId)
                ->orderByDesc('updated_at')
                ->limit(6)
                ->get();

            foreach ($bookings as $b) {
                $updated = $b->updated_at ? Carbon::parse($b->updated_at) : now()->subDay();
                $srvName = $b->service?->service_name ?? 'Aircon Service';
                $status = (string) $b->booking_status;
                $sDetails = is_array($b->service_details)
                    ? $b->service_details
                    : (is_string($b->service_details) ? (json_decode($b->service_details, true) ?: []) : []);
                $isOcularSubmitted = ($sDetails['inspection_status'] ?? null) === 'Submitted';

                $badgeColor = match ($status) {
                    'Completed' => 'emerald',
                    'Payment Incomplete', 'Cancelled' => 'rose',
                    'Reschedule Notice', 'Pending' => 'amber',
                    default => 'blue',
                };

                if ($status === 'Payment Incomplete') {
                    $msg = 'Action required: Complete your GCash reservation payment within 10 minutes or the booking will be automatically cancelled and your payment returned.';
                } elseif ($status === 'Reschedule Notice') {
                    $msg = 'Your preferred schedule slot is unavailable. Please select a new available date and time at no extra cost (₱0.00).';
                } elseif ($isOcularSubmitted) {
                    $msg = 'Your Ocular Inspection results and recommended AC units are ready for review and selection.';
                } elseif ($status === 'Completed' && ! $b->feedback) {
                    $msg = 'Your booking is complete! Thank you for choosing Cooling Tower — you can now leave a rating and feedback.';
                } elseif ($b->quotation_status === 'Quotation Issued') {
                    $msg = 'Your official quotation is ready for review and acceptance.';
                } elseif ($b->quotation_status === 'waiting for customer to sign') {
                    $msg = 'Service is now in progress. Quotation is waiting for your signature in person.';
                } elseif (is_string($b->quotation_status) && str_starts_with($b->quotation_status, 'Signed by ')) {
                    $msg = 'Quotation ' . $b->quotation_status . '. Service payment turned over for verification.';
                } elseif ($status === 'Cancelled' && ! empty($sDetails['booking_fee_forfeited'])) {
                    $msg = 'Booking cancelled because quotation was not signed. The reservation booking fee is forfeited and recorded.';
                } else {
                    $msg = 'Scheduled for ' . ($b->scheduled_date ? $b->scheduled_date->format('M d, Y h:i A') : 'TBD');
                }

                $items[] = [
                    'id'          => 'cust_booking_' . $b->booking_id,
                    'type'        => 'booking',
                    'badge'       => $isOcularSubmitted ? 'Recommendations Ready' : $status,
                    'badge_color' => $isOcularSubmitted ? 'emerald' : $badgeColor,
                    'title'       => "Booking #{$b->booking_id} ({$srvName}) is {$status}",
                    'message'     => $msg,
                    'time_ago'    => $updated->diffForHumans(),
                    'target_page' => 'bookings',
                    'unread'      => ! $lastReadAt || $updated->gt($lastReadAt),
                ];
            }

            // 3. Customer AC Unit Orders & Arrival Notifications
            if (Schema::hasTable('ac_unit_orders')) {
                $orders = DB::table('ac_unit_orders')
                    ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ac_unit_orders.ac_unit_id')
                    ->where('ac_unit_orders.client_id', $userId)
                    ->select([
                        'ac_unit_orders.*',
                        'ac_units_inventory.brand',
                        'ac_units_inventory.model',
                        'ac_units_inventory.expected_arrival',
                        'ac_units_inventory.status as unit_status',
                    ])
                    ->orderByDesc('ac_unit_orders.created_at')
                    ->limit(4)
                    ->get();

                foreach ($orders as $ord) {
                    $created = $ord->created_at ? Carbon::parse($ord->created_at) : now();
                    $isOrderBase = ($ord->unit_status === 'Order Base')
                        || str_contains(strtolower($ord->notes ?? ''), 'order-base')
                        || str_contains(strtolower($ord->notes ?? ''), 'estimated arrival');
                    $arrivalText = null;
                    if (! empty($ord->expected_arrival)) {
                        $arrivalText = Carbon::parse($ord->expected_arrival)->format('M d, Y');
                    } elseif (preg_match('/Estimated Arrival:\s*([^|]+)/i', $ord->notes ?? '', $m)) {
                        $arrivalText = trim($m[1]);
                    }

                    $msg = "Order #{$ord->order_id}: {$ord->brand} {$ord->model} ({$ord->order_status}).";
                    if ($isOrderBase && $arrivalText) {
                        $msg .= " Estimated arrival date: {$arrivalText}.";
                    }

                    $items[] = [
                        'id'          => 'cust_ac_order_' . $ord->order_id,
                        'type'        => 'ac_unit_order',
                        'badge'       => $isOrderBase ? 'Order-Base Unit' : 'AC Unit Order',
                        'badge_color' => $isOrderBase ? 'amber' : 'blue',
                        'title'       => "AC Unit Order #{$ord->order_id} • " . ($isOrderBase && $arrivalText ? "Arrival: {$arrivalText}" : $ord->order_status),
                        'message'     => $msg,
                        'time_ago'    => $created->diffForHumans(),
                        'target_page' => 'bookings',
                        'unread'      => ! $lastReadAt || $created->gt($lastReadAt),
                    ];
                }
            }

            // 3.5. Official Receipts & Invoices (Issued / Voided)
            if (Schema::hasTable('receipts')) {
                $customerReceipts = DB::table('receipts')
                    ->where('client_id', $userId)
                    ->orderByDesc('updated_at')
                    ->limit(5)
                    ->get();

                foreach ($customerReceipts as $rcp) {
                    $eventTime = ($rcp->status === 'Voided' && $rcp->voided_at)
                        ? Carbon::parse($rcp->voided_at)
                        : ($rcp->issued_at ? Carbon::parse($rcp->issued_at) : Carbon::parse($rcp->created_at));
                    $isVoided = $rcp->status === 'Voided';
                    $kindLabel = $rcp->document_kind === 'acknowledgement_receipt'
                        ? 'Acknowledgement Receipt'
                        : ($rcp->document_kind === 'sales_invoice' ? 'Sales Invoice' : 'Service Invoice');
                    $targetPage = $rcp->source_type === 'item_order'
                        ? 'buy_items'
                        : ($rcp->source_type === 'ac_unit_order' ? 'warranty' : 'bookings');

                    $items[] = [
                        'id'          => 'cust_receipt_' . $rcp->receipt_id . '_' . strtolower($rcp->status),
                        'type'        => 'receipt',
                        'badge'       => $isVoided ? 'Receipt Voided' : 'Official Receipt',
                        'badge_color' => $isVoided ? 'rose' : 'emerald',
                        'title'       => ($isVoided ? "Voided: {$rcp->receipt_number}" : "{$kindLabel} Issued: {$rcp->receipt_number}"),
                        'message'     => $isVoided
                            ? "Receipt {$rcp->receipt_number} was voided" . ($rcp->void_reason ? " ({$rcp->void_reason})." : '.')
                            : "Amount paid: ₱" . number_format((float) $rcp->amount_paid_now, 2) . " via {$rcp->payment_method}. Ready to view or download PDF.",
                        'time_ago'    => $eventTime->diffForHumans(),
                        'target_page' => $targetPage,
                        'unread'      => ! $lastReadAt || $eventTime->gt($lastReadAt),
                    ];
                }
            }

            // 4. Manager Replies in Customer Support Chat & Resolved Problem Reports
            if (Schema::hasTable('customer_support_messages')) {
                $unreadMgrReplies = DB::table('customer_support_messages')
                    ->where('customer_id', $userId)
                    ->whereIn('sender_role', ['manager', 'super_admin'])
                    ->where('is_read_by_customer', false)
                    ->orderByDesc('created_at')
                    ->limit(3)
                    ->get();

                foreach ($unreadMgrReplies as $reply) {
                    $replyTime = $reply->created_at ? Carbon::parse($reply->created_at) : now();
                    $items[] = [
                        'id'          => 'cust_mgr_reply_' . $reply->message_id,
                        'type'        => 'support_chat_reply',
                        'badge'       => 'Manager Reply',
                        'badge_color' => 'blue',
                        'title'       => 'New message from Manager',
                        'message'     => \Illuminate\Support\Str::limit($reply->message, 130),
                        'time_ago'    => $replyTime->diffForHumans(),
                        'target_page' => 'open_support_chat',
                        'unread'      => true,
                    ];
                }
            }

            if (Schema::hasTable('customer_complaints')) {
                $updatedComplaints = DB::table('customer_complaints')
                    ->where('customer_id', $userId)
                    ->where('status', '!=', 'Pending')
                    ->orderByDesc('updated_at')
                    ->limit(2)
                    ->get();

                foreach ($updatedComplaints as $uc) {
                    $ucUpdated = $uc->updated_at ? Carbon::parse($uc->updated_at) : now();
                    $items[] = [
                        'id'          => 'cust_report_status_' . $uc->complaint_id,
                        'type'        => 'problem_report_update',
                        'badge'       => "Report • {$uc->status}",
                        'badge_color' => $uc->status === 'Resolved' ? 'emerald' : 'amber',
                        'title'       => "Problem Report #{$uc->complaint_id} marked {$uc->status}",
                        'message'     => ! empty($uc->management_response)
                            ? "Manager response: " . \Illuminate\Support\Str::limit($uc->management_response, 120)
                            : \Illuminate\Support\Str::limit($uc->complaint_details, 110),
                        'time_ago'    => $ucUpdated->diffForHumans(),
                        'target_page' => 'complaints',
                        'unread'      => ! $lastReadAt || $ucUpdated->gt($lastReadAt),
                    ];
                }
            }
        } elseif ($isHeadTech) {
            // HEAD TECHNICIAN NOTIFICATIONS (Employee + Head of Technicians):
            // Ensure all technicians have certifications initialized
            $techUsers = User::whereIn('role_id', [5, 7])->get();
            foreach ($techUsers as $tUser) {
                $this->forecastingService->getTechnicianCertifications((int) $tUser->user_id);
            }

            // 1. Personal Certifications of the Head Technician (1-week forecasting reminder)
            $myCerts = $this->forecastingService->getTechnicianCertifications($userId);
            foreach ($myCerts as $mc) {
                if (($mc['days_until_expiry'] ?? 99) <= 7 || $mc['status'] === 'Renewal Submitted') {
                    $items[] = [
                        'id'          => 'head_own_cert_' . $mc['certification_id'],
                        'type'        => 'certification',
                        'badge'       => 'My License • ' . $mc['status'],
                        'badge_color' => $mc['status'] === 'Renewal Submitted' ? 'blue' : ($mc['status'] === 'Expiring Soon' ? 'amber' : 'rose'),
                        'title'       => '1-Week Certificate Forecast: ' . $mc['certification_name'],
                        'message'     => $mc['action_notice'],
                        'time_ago'    => 'Expiry: ' . $mc['expiry_date'],
                        'target_page' => 'certificates',
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
                $isUrgent = $daysLeft <= 7;

                $items[] = [
                    'id'          => 'head_crew_cert_' . $cc->certification_id,
                    'type'        => 'certification',
                    'badge'       => $cc->status === 'Renewal Submitted' ? 'Submitted (1/1)' : ($isUrgent ? '1-Wk Reminder' : 'Crew Compliance'),
                    'badge_color' => $cc->status === 'Renewal Submitted' ? 'blue' : ($daysLeft <= 3 ? 'rose' : ($isUrgent ? 'amber' : 'indigo')),
                    'title'       => "Tech Crew License ({$techName}): {$cc->certification_name}",
                    'message'     => $cc->status === 'Renewal Submitted'
                        ? "{$techName} submitted a renewed certificate. Awaiting Manager verification and new expiration date."
                        : ($isUrgent
                            ? "Expires within 1 week on {$exp->format('M d, Y')} ({$daysLeft} days left). {$techName} must submit renewed certificate."
                            : "Valid through {$exp->format('M d, Y')} ({$daysLeft} days remaining)."),
                    'time_ago'    => 'Due ' . $exp->format('M d, Y'),
                    'target_page' => 'certificates',
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

            // 4. Invalid Failed Booking Notices for Head Technician / Crew
            $invalidFailedBookings = Booking::with(['service', 'client'])
                ->where('service_details', 'like', '%failed_booking%')
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get();

            foreach ($invalidFailedBookings as $ifb) {
                $details = is_array($ifb->service_details)
                    ? $ifb->service_details
                    : (is_string($ifb->service_details) ? (json_decode($ifb->service_details, true) ?: []) : []);
                $fb = $details['failed_booking'] ?? null;
                if (($fb['status'] ?? '') !== 'Invalid') {
                    continue;
                }
                $fbTime = ! empty($fb['reviewed_at']) ? Carbon::parse($fb['reviewed_at']) : ($ifb->updated_at ? Carbon::parse($ifb->updated_at) : now());
                $srvName = $ifb->service?->service_name ?? 'Service';
                $items[] = [
                    'id'          => 'head_invalid_failed_' . $ifb->booking_id,
                    'type'        => 'failed_booking_invalid',
                    'badge'       => 'Invalid Failed Booking',
                    'badge_color' => 'rose',
                    'title'       => "Invalid Failed Booking Notice: Booking #{$ifb->booking_id} ({$srvName})",
                    'message'     => 'Manager marked failed booking report as Invalid: ' . ($fb['invalid_reason'] ?? 'Please review and proceed with service or resubmit.'),
                    'time_ago'    => $fbTime->diffForHumans(),
                    'target_page' => 'bookings',
                    'unread'      => ! $lastReadAt || $fbTime->gt($lastReadAt),
                ];
            }

            // 5. Active & Upcoming Team Dispatches
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
                    $isUrgent = ($c['days_until_expiry'] ?? 99) <= 7;
                    $items[] = [
                        'id'          => 'tech_cert_' . $c['certification_id'],
                        'type'        => 'certification',
                        'badge'       => $c['status'],
                        'badge_color' => $c['status'] === 'Active' ? 'emerald' : ($c['status'] === 'Renewal Submitted' ? 'blue' : ($c['status'] === 'Expiring Soon' ? 'amber' : 'rose')),
                        'title'       => ($isUrgent ? '1-Week Certificate Reminder: ' : 'Certificate Tracked: ') . $c['certification_name'],
                        'message'     => $c['action_notice'],
                        'time_ago'    => 'Expiry: ' . $c['expiry_date'],
                        'target_page' => 'certificates',
                        'unread'      => ! $lastReadAt || now()->subHours(1)->gt($lastReadAt),
                    ];
                }
            } else {
                if ($roleId === 1) {
                    $mgrReports = DB::table('staff_messages')
                        ->join('users as sender', 'sender.user_id', '=', 'staff_messages.sender_id')
                        ->where('staff_messages.recipient_id', $userId)
                        ->where('staff_messages.subject', 'like', 'Booking #% Report:%')
                        ->orderByDesc('staff_messages.created_at')
                        ->limit(5)
                        ->select('staff_messages.*', DB::raw("TRIM(CONCAT_WS(' ', sender.given_name, sender.last_name)) as sender_name"))
                        ->get();

                    foreach ($mgrReports as $mr) {
                        $mrTime = $mr->created_at ? Carbon::parse($mr->created_at) : now();
                        $items[] = [
                            'id'          => 'mgr_report_' . $mr->message_id,
                            'type'        => 'manager_report',
                            'badge'       => 'Manager Report',
                            'badge_color' => 'rose',
                            'title'       => $mr->subject,
                            'message'     => "From {$mr->sender_name}: " . \Illuminate\Support\Str::limit($mr->body, 140),
                            'time_ago'    => $mrTime->diffForHumans(),
                            'target_page' => 'bookings',
                            'unread'      => ! $mr->is_read,
                        ];
                    }
                }

                // Customer Problem Reports & Customer Live Support Messages for Manager (roleId = 2) and Super Admin (roleId = 1)
                if (in_array($roleId, [1, 2], true)) {
                    if (Schema::hasTable('customer_complaints')) {
                        $recentComplaints = DB::table('customer_complaints as cc')
                            ->join('users as c', 'c.user_id', '=', 'cc.customer_id')
                            ->leftJoin('bookings as b', 'b.booking_id', '=', 'cc.booking_id')
                            ->leftJoin('services as s', 's.service_id', '=', 'b.service_id')
                            ->orderByRaw("CASE WHEN cc.status = 'Pending' THEN 0 ELSE 1 END")
                            ->orderByDesc('cc.complaint_date')
                            ->limit(5)
                            ->select([
                                'cc.*',
                                'c.given_name',
                                'c.last_name',
                                's.service_name',
                            ])
                            ->get();

                        foreach ($recentComplaints as $rc) {
                            $rcTime = $rc->complaint_date ? Carbon::parse($rc->complaint_date) : now();
                            $cName = trim(($rc->given_name ?? '') . ' ' . ($rc->last_name ?? '')) ?: 'Customer';
                            $bookingLabel = $rc->booking_id
                                ? " • Booking #{$rc->booking_id}" . ($rc->service_name ? " ({$rc->service_name})" : '')
                                : '';
                            $isPending = ($rc->status ?? 'Pending') === 'Pending';

                            $items[] = [
                                'id'          => 'cust_problem_report_' . $rc->complaint_id,
                                'type'        => 'customer_report',
                                'badge'       => $isPending ? 'Problem Report' : "Report • {$rc->status}",
                                'badge_color' => $isPending ? 'rose' : 'emerald',
                                'title'       => "Report #{$rc->complaint_id} from {$cName}{$bookingLabel}",
                                'message'     => \Illuminate\Support\Str::limit($rc->complaint_details, 140),
                                'time_ago'    => $rcTime->diffForHumans(),
                                'target_page' => 'reports',
                                'unread'      => $isPending && (! $lastReadAt || $rcTime->gt($lastReadAt)),
                            ];
                        }
                    }

                    if (Schema::hasTable('customer_support_messages')) {
                        $unreadChats = DB::table('customer_support_messages as m')
                            ->join('users as c', 'c.user_id', '=', 'm.customer_id')
                            ->where('m.sender_role', 'customer')
                            ->where('m.is_read_by_manager', false)
                            ->orderByDesc('m.created_at')
                            ->limit(4)
                            ->select([
                                'm.*',
                                'c.given_name',
                                'c.last_name',
                            ])
                            ->get();

                        foreach ($unreadChats as $uc) {
                            $ucTime = $uc->created_at ? Carbon::parse($uc->created_at) : now();
                            $cName = trim(($uc->given_name ?? '') . ' ' . ($uc->last_name ?? '')) ?: 'Customer';
                            $items[] = [
                                'id'          => 'cust_chat_' . $uc->message_id,
                                'type'        => 'customer_chat',
                                'badge'       => 'Customer Chat',
                                'badge_color' => 'blue',
                                'title'       => "New message from {$cName}",
                                'message'     => \Illuminate\Support\Str::limit($uc->message, 130),
                                'time_ago'    => $ucTime->diffForHumans(),
                                'target_page' => 'reports',
                                'unread'      => true,
                            ];
                        }
                    }
                }

                // Managers / Super Admin / Admin Assistant / Tools Man
                $expiringCerts = TechnicianCertification::with('technician')
                    ->orderByRaw("CASE WHEN status = 'Renewal Submitted' THEN 0 ELSE 1 END")
                    ->orderBy('expiry_date')
                    ->limit(4)
                    ->get();

                foreach ($expiringCerts as $ec) {
                    $techName = $ec->technician?->name ?? 'Technician';
                    $exp = Carbon::parse($ec->expiry_date);
                    $daysLeft = (int) now()->startOfDay()->diffInDays($exp->copy()->startOfDay(), false);
                    $isSubmitted = $ec->status === 'Renewal Submitted';
                    $items[] = [
                        'id'          => 'mgr_cert_' . $ec->certification_id,
                        'type'        => 'certification',
                        'badge'       => $isSubmitted ? 'Verify Renewal' : ($daysLeft <= 7 ? '1-Wk Expiry' : 'Compliance'),
                        'badge_color' => $isSubmitted ? 'blue' : ($daysLeft <= 7 ? 'amber' : 'indigo'),
                        'title'       => "{$techName}: {$ec->certification_name}",
                        'message'     => $isSubmitted
                            ? "Technician submitted renewed certificate (Cert #{$ec->certificate_number}). Verify and enter new expiration date."
                            : "Certification expires on {$exp->format('M d, Y')} ({$daysLeft} days left).",
                        'time_ago'    => $exp->diffForHumans(),
                        'target_page' => 'certificates',
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

            // Recent Confirmed AC Unit Purchases for Admin Assistant & Super Admin
            if (in_array($roleId, [1, 3], true) && Schema::hasTable('ac_unit_orders')) {
                $confirmedOrders = DB::table('ac_unit_orders')
                    ->leftJoin('ac_units_inventory', 'ac_units_inventory.ac_unit_id', '=', 'ac_unit_orders.ac_unit_id')
                    ->leftJoin('users as clients', 'clients.user_id', '=', 'ac_unit_orders.client_id')
                    ->where('ac_unit_orders.order_status', 'Completed')
                    ->orderByDesc('ac_unit_orders.confirmed_at')
                    ->limit(3)
                    ->select([
                        'ac_unit_orders.order_id',
                        'ac_unit_orders.total_unit_price',
                        'ac_unit_orders.confirmed_at',
                        'ac_unit_orders.updated_at',
                        'ac_units_inventory.brand',
                        'ac_units_inventory.model',
                        'clients.given_name',
                        'clients.last_name',
                    ])
                    ->get();

                foreach ($confirmedOrders as $co) {
                    $coTime = $co->confirmed_at ? Carbon::parse($co->confirmed_at) : ($co->updated_at ? Carbon::parse($co->updated_at) : now());
                    $buyerName = trim(($co->given_name ?? '') . ' ' . ($co->last_name ?? '')) ?: 'Customer';
                    $items[] = [
                        'id'          => 'unit_sold_' . $co->order_id,
                        'type'        => 'ac_unit_sale',
                        'badge'       => 'Unit Sold',
                        'badge_color' => 'emerald',
                        'title'       => "AC Unit Sold: {$co->brand} {$co->model}",
                        'message'     => "{$buyerName} completed unit purchase (₱" . number_format((float) $co->total_unit_price, 2) . "). Warranty & spare parts forecast activated.",
                        'time_ago'    => $coTime->diffForHumans(),
                        'target_page' => 'ac-units',
                        'unread'      => ! $lastReadAt || $coTime->gt($lastReadAt),
                    ];
                }
            }

            // Pending Receipt Void Requests awaiting Manager / Super Admin Approval
            if (in_array($roleId, [1, 2], true) && Schema::hasTable('receipts')) {
                $pendingVoidReceipts = DB::table('receipts')
                    ->where('status', 'Void Requested')
                    ->orderByDesc('updated_at')
                    ->limit(5)
                    ->get();

                foreach ($pendingVoidReceipts as $vr) {
                    $vrTime = $vr->updated_at ? Carbon::parse($vr->updated_at) : now();
                    $items[] = [
                        'id'          => 'void_req_' . $vr->receipt_id,
                        'type'        => 'receipt_void_request',
                        'badge'       => 'Void Requested',
                        'badge_color' => 'amber',
                        'title'       => "Void Approval Needed: {$vr->receipt_number}",
                        'message'     => "Customer: {$vr->customer_name} • ₱" . number_format((float) $vr->amount_paid_now, 2) . ($vr->void_reason ? " — Reason: {$vr->void_reason}" : ''),
                        'time_ago'    => $vrTime->diffForHumans(),
                        'target_page' => 'sales',
                        'unread'      => ! $lastReadAt || $vrTime->gt($lastReadAt),
                    ];
                }
            }

            // Pending Failed Booking Reports awaiting Manager / Super Admin Review
            if (in_array($roleId, [1, 2], true)) {
                $pendingFailedBookings = Booking::with(['service', 'client'])
                    ->where('booking_status', 'In-Progress')
                    ->where('service_details', 'like', '%Pending Manager Review%')
                    ->orderByDesc('updated_at')
                    ->limit(5)
                    ->get();

                foreach ($pendingFailedBookings as $pfb) {
                    $details = is_array($pfb->service_details)
                        ? $pfb->service_details
                        : (is_string($pfb->service_details) ? (json_decode($pfb->service_details, true) ?: []) : []);
                    $fb = $details['failed_booking'] ?? null;
                    if (($fb['status'] ?? '') !== 'Pending Manager Review') {
                        continue;
                    }
                    $fbTime = ! empty($fb['submitted_at']) ? Carbon::parse($fb['submitted_at']) : ($pfb->updated_at ? Carbon::parse($pfb->updated_at) : now());
                    $srvName = $pfb->service?->service_name ?? 'Service';
                    $techName = $fb['submitted_by_name'] ?? 'Technician';
                    $items[] = [
                        'id'          => 'failed_booking_review_' . $pfb->booking_id,
                        'type'        => 'failed_booking_review',
                        'badge'       => 'Failed Booking Review',
                        'badge_color' => 'rose',
                        'title'       => "Failed Booking Report: Booking #{$pfb->booking_id} ({$srvName})",
                        'message'     => "Submitted by {$techName}: " . \Illuminate\Support\Str::limit((string) ($fb['reason'] ?? ''), 130),
                        'time_ago'    => $fbTime->diffForHumans(),
                        'target_page' => 'bookings',
                        'unread'      => ! $lastReadAt || $fbTime->gt($lastReadAt),
                    ];
                }
            }

            // Invalid Failed Booking Notices for Assigned Technician (roleId = 5)
            if ($roleId === 5) {
                $myTeamIds = DB::table('technician_team_members')
                    ->where('technician_id', $userId)
                    ->pluck('team_id')
                    ->all();

                $techInvalidFailed = Booking::with(['service', 'client'])
                    ->where('service_details', 'like', '%failed_booking%')
                    ->where(function ($q) use ($userId, $myTeamIds) {
                        $q->where('lead_technician_id', $userId)
                            ->orWhere('assistant_technician_id', $userId)
                            ->orWhere('assigned_tech_id', $userId);
                        if (! empty($myTeamIds)) {
                            $q->orWhereIn('assigned_team_id', $myTeamIds);
                        }
                    })
                    ->orderByDesc('updated_at')
                    ->limit(5)
                    ->get();

                foreach ($techInvalidFailed as $tif) {
                    $details = is_array($tif->service_details)
                        ? $tif->service_details
                        : (is_string($tif->service_details) ? (json_decode($tif->service_details, true) ?: []) : []);
                    $fb = $details['failed_booking'] ?? null;
                    if (($fb['status'] ?? '') !== 'Invalid') {
                        continue;
                    }
                    $fbTime = ! empty($fb['reviewed_at']) ? Carbon::parse($fb['reviewed_at']) : ($tif->updated_at ? Carbon::parse($tif->updated_at) : now());
                    $srvName = $tif->service?->service_name ?? 'Service';
                    $items[] = [
                        'id'          => 'tech_invalid_failed_' . $tif->booking_id,
                        'type'        => 'failed_booking_invalid',
                        'badge'       => 'Invalid Failed Booking',
                        'badge_color' => 'rose',
                        'title'       => "Notice: Invalid Failed Booking Report (Booking #{$tif->booking_id})",
                        'message'     => "{$srvName}: Manager rejected failed booking report — " . ($fb['invalid_reason'] ?? 'Please review and follow up.'),
                        'time_ago'    => $fbTime->diffForHumans(),
                        'target_page' => 'bookings',
                        'unread'      => ! $lastReadAt || $fbTime->gt($lastReadAt),
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

        // 4. Disabled Booking Dates (Holidays / No Operation)
        if (Schema::hasTable('disabled_booking_dates')) {
            $disabledDates = DisabledBookingDate::orderBy('disabled_date', 'asc')->get();
            foreach ($disabledDates as $dd) {
                $dt = Carbon::parse($dd->disabled_date);
                $events[] = [
                    'id'          => 'cal_disabled_' . $dd->disabled_date_id,
                    'disabled_date_id' => $dd->disabled_date_id,
                    'date'        => $dt->toDateString(),
                    'time'        => 'No Operation',
                    'type'        => 'Disabled Date',
                    'color'       => 'amber',
                    'title'       => 'Closed: ' . ($dd->reason ?: 'No Operation / Occasion'),
                    'subtitle'    => 'Booking disabled for customers',
                    'target_page' => null,
                    'is_disabled_date' => true,
                ];
            }
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
