<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Complaint;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CustomerSupportController extends Controller
{
    /**
     * Ensure customer_support_messages and customer_complaints tables & columns exist.
     */
    public static function ensureSupportTablesExist(): void
    {
        if (! Schema::hasTable('customer_support_messages')) {
            Schema::create('customer_support_messages', function (Blueprint $table) {
                $table->id('message_id');
                $table->unsignedBigInteger('customer_id')->index();
                $table->unsignedBigInteger('sender_id')->index();
                $table->string('sender_role', 30)->default('customer'); // customer | manager | super_admin
                $table->text('message');
                $table->boolean('is_read_by_customer')->default(false);
                $table->boolean('is_read_by_manager')->default(false);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('customer_complaints')) {
            if (! Schema::hasColumn('customer_complaints', 'management_response')) {
                Schema::table('customer_complaints', function (Blueprint $table) {
                    $table->text('management_response')->nullable()->after('complaint_details');
                    $table->unsignedBigInteger('resolved_by')->nullable()->after('status');
                    $table->timestamp('resolved_at')->nullable()->after('resolved_by');
                });
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // CUSTOMER CHAT ENDPOINTS (role_id = 6)
    // ══════════════════════════════════════════════════════════════════

    /**
     * Fetch chat conversation between the authenticated customer and Manager/Super Admin.
     */
    public function customerChatIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && (int) $user->role_id === 6, 403);

        self::ensureSupportTablesExist();

        $customerId = (int) $user->user_id;

        $messages = $this->getFormattedThreadMessages($customerId, $customerId);
        $unreadCount = collect($messages)->where('is_mine', false)->where('is_read_by_customer', false)->count();

        // Get active manager / support team display info
        $manager = User::whereIn('role_id', [2, 1])
            ->where(function ($q) {
                $q->whereNull('is_active')->orWhere('is_active', 1);
            })
            ->orderByRaw('CASE WHEN role_id = 2 THEN 0 ELSE 1 END')
            ->first();

        $managerName = $manager ? trim("{$manager->given_name} {$manager->last_name}") : 'Operations Manager';

        return response()->json([
            'messages'     => $messages,
            'unread_count' => $unreadCount,
            'manager_info' => [
                'name'   => $managerName,
                'role'   => 'Operations Manager',
                'status' => 'Online',
            ],
        ]);
    }

    /**
     * Customer sends a chat message to Manager.
     */
    public function customerSendMessage(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && (int) $user->role_id === 6, 403);

        self::ensureSupportTablesExist();

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $customerId = (int) $user->user_id;
        $body = trim($validated['message']);

        DB::table('customer_support_messages')->insert([
            'customer_id'         => $customerId,
            'sender_id'           => $customerId,
            'sender_role'         => 'customer',
            'message'             => $body,
            'is_read_by_customer' => true,
            'is_read_by_manager'  => false,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        return $this->customerChatIndex($request);
    }

    /**
     * Customer marks all manager replies as read.
     */
    public function customerMarkRead(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && (int) $user->role_id === 6, 403);

        self::ensureSupportTablesExist();

        $customerId = (int) $user->user_id;

        DB::table('customer_support_messages')
            ->where('customer_id', $customerId)
            ->where('is_read_by_customer', false)
            ->update([
                'is_read_by_customer' => true,
                'updated_at'          => now(),
            ]);

        return response()->json(['status' => 'ok', 'unread_count' => 0]);
    }

    // ══════════════════════════════════════════════════════════════════
    // MANAGER & SUPER ADMIN CHAT ENDPOINTS (role_id = 1, 2)
    // ══════════════════════════════════════════════════════════════════

    /**
     * Fetch all customer chat threads and active conversation messages for Manager / Super Admin.
     */
    public function staffThreadsIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2], true), 403);

        self::ensureSupportTablesExist();

        $selectedCustomerId = $request->integer('customer_id') ?: null;

        // Group threads by customer_id
        $threadStats = DB::table('customer_support_messages')
            ->select([
                'customer_id',
                DB::raw('MAX(message_id) as last_message_id'),
                DB::raw('MAX(created_at) as last_message_at'),
                DB::raw('SUM(CASE WHEN is_read_by_manager = 0 AND sender_role = "customer" THEN 1 ELSE 0 END) as unread_count'),
            ])
            ->groupBy('customer_id')
            ->orderByDesc('last_message_at')
            ->get();

        $customerIds = $threadStats->pluck('customer_id')->map(fn ($id) => (int) $id)->all();
        $lastMessageIds = $threadStats->pluck('last_message_id')->all();

        $customersById = collect();
        if (! empty($customerIds)) {
            $customersById = DB::table('users')
                ->whereIn('user_id', $customerIds)
                ->get(['user_id', 'given_name', 'middle_name', 'last_name', 'email', 'contact_number', 'account_type', 'company_name'])
                ->keyBy('user_id');
        }

        $lastMessagesById = collect();
        if (! empty($lastMessageIds)) {
            $lastMessagesById = DB::table('customer_support_messages')
                ->whereIn('message_id', $lastMessageIds)
                ->get()
                ->keyBy('message_id');
        }

        $threads = $threadStats->map(function ($stat) use ($customersById, $lastMessagesById) {
            $cid = (int) $stat->customer_id;
            $cust = $customersById->get($cid);
            $lastMsg = $lastMessagesById->get($stat->last_message_id);
            $fullName = $cust
                ? trim(implode(' ', array_filter([$cust->given_name ?? '', $cust->middle_name ?? '', $cust->last_name ?? ''])))
                : "Customer #{$cid}";
            $createdAt = $stat->last_message_at ? Carbon::parse($stat->last_message_at) : now();

            return [
                'customer_id'         => $cid,
                'customer_name'       => $fullName ?: "Customer #{$cid}",
                'company_name'        => $cust->company_name ?? null,
                'email'               => $cust->email ?? '',
                'contact_number'      => $cust->contact_number ?? '',
                'last_message'        => $lastMsg->message ?? '',
                'last_sender_role'    => $lastMsg->sender_role ?? 'customer',
                'last_message_at'     => $createdAt->toISOString(),
                'time_ago'            => $createdAt->diffForHumans(null, true, true),
                'formatted_date'      => $createdAt->format('M d, h:i A'),
                'unread_count'        => (int) $stat->unread_count,
            ];
        })->values();

        // Also allow Manager to initiate chat with any customer if needed
        $allCustomers = DB::table('users')
            ->where('role_id', 6)
            ->orderBy('given_name')
            ->limit(60)
            ->get(['user_id', 'given_name', 'last_name', 'email', 'contact_number', 'company_name'])
            ->map(fn ($c) => [
                'customer_id'    => (int) $c->user_id,
                'customer_name'  => trim("{$c->given_name} {$c->last_name}") ?: "Customer #{$c->user_id}",
                'company_name'   => $c->company_name,
                'email'          => $c->email,
                'contact_number' => $c->contact_number,
            ])
            ->values();

        $activeCustomerId = $selectedCustomerId ?: ($threads->first()['customer_id'] ?? null);
        $activeMessages = $activeCustomerId
            ? $this->getFormattedThreadMessages((int) $activeCustomerId, (int) $user->user_id)
            : [];

        $totalUnread = $threads->sum('unread_count');

        return response()->json([
            'threads'            => $threads,
            'all_customers'      => $allCustomers,
            'active_customer_id' => $activeCustomerId,
            'messages'           => $activeMessages,
            'total_unread'       => (int) $totalUnread,
        ]);
    }

    /**
     * Manager or Super Admin sends a message to a specific customer.
     */
    public function staffSendMessage(Request $request, int $customerId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2], true), 403);

        self::ensureSupportTablesExist();

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $senderRole = ((int) $user->role_id === 1) ? 'super_admin' : 'manager';

        DB::table('customer_support_messages')->insert([
            'customer_id'         => $customerId,
            'sender_id'           => (int) $user->user_id,
            'sender_role'         => $senderRole,
            'message'             => trim($validated['message']),
            'is_read_by_customer' => false,
            'is_read_by_manager'  => true,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        // Mark previous customer messages in this thread as read by manager
        DB::table('customer_support_messages')
            ->where('customer_id', $customerId)
            ->where('is_read_by_manager', false)
            ->update([
                'is_read_by_manager' => true,
                'updated_at'         => now(),
            ]);

        $request->merge(['customer_id' => $customerId]);

        return $this->staffThreadsIndex($request);
    }

    /**
     * Manager or Super Admin marks a customer's chat thread as read.
     */
    public function staffMarkThreadRead(Request $request, int $customerId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2], true), 403);

        self::ensureSupportTablesExist();

        DB::table('customer_support_messages')
            ->where('customer_id', $customerId)
            ->where('is_read_by_manager', false)
            ->update([
                'is_read_by_manager' => true,
                'updated_at'         => now(),
            ]);

        $totalUnread = (int) DB::table('customer_support_messages')
            ->where('sender_role', 'customer')
            ->where('is_read_by_manager', false)
            ->count();

        return response()->json([
            'status'       => 'ok',
            'total_unread' => $totalUnread,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    // MANAGER & SUPER ADMIN PROBLEM REPORTS ENDPOINTS (role_id = 1, 2)
    // ══════════════════════════════════════════════════════════════════

    /**
     * List all customer problem reports for Manager and Super Admin.
     */
    public function staffReportsIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2], true), 403);

        self::ensureSupportTablesExist();

        $reports = DB::table('customer_complaints as cc')
            ->join('users as c', 'c.user_id', '=', 'cc.customer_id')
            ->leftJoin('bookings as b', 'b.booking_id', '=', 'cc.booking_id')
            ->leftJoin('services as s', 's.service_id', '=', 'b.service_id')
            ->leftJoin('users as r', 'r.user_id', '=', 'cc.resolved_by')
            ->select([
                'cc.*',
                'c.given_name as customer_given_name',
                'c.middle_name as customer_middle_name',
                'c.last_name as customer_last_name',
                'c.email as customer_email',
                'c.contact_number as customer_contact',
                'c.company_name as customer_company',
                'b.scheduled_date as booking_scheduled_date',
                'b.booking_status',
                's.service_name',
                'r.given_name as resolver_given_name',
                'r.last_name as resolver_last_name',
            ])
            ->orderByRaw("CASE WHEN cc.status = 'Pending' THEN 0 ELSE 1 END")
            ->orderByDesc('cc.complaint_date')
            ->get()
            ->map(function ($row) {
                $customerName = trim(implode(' ', array_filter([
                    $row->customer_given_name ?? '',
                    $row->customer_middle_name ?? '',
                    $row->customer_last_name ?? '',
                ]))) ?: "Customer #{$row->customer_id}";

                $resolverName = ! empty($row->resolver_given_name)
                    ? trim("{$row->resolver_given_name} {$row->resolver_last_name}")
                    : null;

                $dt = $row->complaint_date ? Carbon::parse($row->complaint_date) : now();
                $resolvedDt = ! empty($row->resolved_at) ? Carbon::parse($row->resolved_at) : null;

                return [
                    'complaint_id'             => (int) $row->complaint_id,
                    'customer_id'              => (int) $row->customer_id,
                    'customer_name'            => $customerName,
                    'customer_company'         => $row->customer_company,
                    'customer_email'           => $row->customer_email,
                    'customer_contact'         => $row->customer_contact,
                    'booking_id'               => $row->booking_id ? (int) $row->booking_id : null,
                    'service_name'             => $row->service_name ?? ($row->booking_id ? 'Aircon Service' : 'General Concern'),
                    'booking_status'           => $row->booking_status,
                    'booking_scheduled_date'   => $row->booking_scheduled_date ? Carbon::parse($row->booking_scheduled_date)->format('M d, Y') : null,
                    'complaint_details'        => $row->complaint_details,
                    'management_response'      => $row->management_response ?? null,
                    'status'                   => $row->status ?? 'Pending',
                    'complaint_date'           => $dt->toISOString(),
                    'complaint_date_formatted' => $dt->format('M d, Y • h:i A'),
                    'time_ago'                 => $dt->diffForHumans(),
                    'resolved_by_name'         => $resolverName,
                    'resolved_at_formatted'    => $resolvedDt ? $resolvedDt->format('M d, Y • h:i A') : null,
                ];
            })
            ->values();

        $pendingCount = $reports->where('status', 'Pending')->count();

        return response()->json([
            'data'          => $reports,
            'pending_count' => $pendingCount,
        ]);
    }

    /**
     * Update status and/or management response on a customer problem report.
     */
    public function updateReportStatus(Request $request, int $complaintId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2], true), 403);

        self::ensureSupportTablesExist();

        $validated = $request->validate([
            'status'              => ['required', 'in:Pending,Resolved,Dismissed'],
            'management_response' => ['nullable', 'string', 'max:2000'],
        ]);

        $complaint = Complaint::findOrFail($complaintId);
        $complaint->status = $validated['status'];

        if (array_key_exists('management_response', $validated)) {
            $complaint->management_response = $validated['management_response']
                ? trim($validated['management_response'])
                : null;
        }

        if (in_array($validated['status'], ['Resolved', 'Dismissed'], true)) {
            $complaint->resolved_by = (int) $user->user_id;
            $complaint->resolved_at = now();
        }

        $complaint->updated_at = now();
        $complaint->save();

        // If management entered a response, also post it to the customer's support chat so they see it immediately
        if (! empty($complaint->management_response)) {
            $senderRole = ((int) $user->role_id === 1) ? 'super_admin' : 'manager';
            $reportRef = "Report #{$complaint->complaint_id}" . ($complaint->booking_id ? " (Booking #{$complaint->booking_id})" : '');
            $chatBody = "[Update on {$reportRef} — Status: {$complaint->status}]\n{$complaint->management_response}";

            DB::table('customer_support_messages')->insert([
                'customer_id'         => (int) $complaint->customer_id,
                'sender_id'           => (int) $user->user_id,
                'sender_role'         => $senderRole,
                'message'             => $chatBody,
                'is_read_by_customer' => false,
                'is_read_by_manager'  => true,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }

        if (Schema::hasTable('activity_logs')) {
            DB::table('activity_logs')->insert([
                'user_id'     => (int) $user->user_id,
                'action_type' => 'UPDATE',
                'description' => sprintf(
                    'Updated customer problem report #%d status to %s.',
                    $complaint->complaint_id,
                    $complaint->status
                ),
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        return response()->json([
            'message' => "Problem Report #{$complaint->complaint_id} updated to {$complaint->status}.",
            'data'    => $complaint,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ══════════════════════════════════════════════════════════════════

    protected function getFormattedThreadMessages(int $customerId, int $viewerUserId): array
    {
        return DB::table('customer_support_messages as m')
            ->leftJoin('users as u', 'u.user_id', '=', 'm.sender_id')
            ->where('m.customer_id', $customerId)
            ->orderBy('m.created_at', 'asc')
            ->orderBy('m.message_id', 'asc')
            ->limit(150)
            ->get([
                'm.*',
                'u.given_name',
                'u.last_name',
                'u.role_id as user_role_id',
            ])
            ->map(function ($m) use ($viewerUserId) {
                $dt = $m->created_at ? Carbon::parse($m->created_at) : now();
                $senderName = trim(($m->given_name ?? '') . ' ' . ($m->last_name ?? ''));
                $roleLabel = match ($m->sender_role) {
                    'super_admin' => 'Super Admin',
                    'manager'     => 'Manager',
                    default       => 'Customer',
                };

                $isStaffSender = in_array($m->sender_role, ['manager', 'super_admin'], true);

                return [
                    'message_id'          => (int) $m->message_id,
                    'customer_id'         => (int) $m->customer_id,
                    'sender_id'           => (int) $m->sender_id,
                    'sender_name'         => $senderName ?: $roleLabel,
                    'sender_role'         => $m->sender_role,
                    'sender_role_label'   => $roleLabel,
                    'is_staff_sender'     => $isStaffSender,
                    'is_mine'             => (int) $m->sender_id === $viewerUserId,
                    'message'             => $m->message,
                    'is_read_by_customer' => (bool) $m->is_read_by_customer,
                    'is_read_by_manager'  => (bool) $m->is_read_by_manager,
                    'created_at'          => $dt->toISOString(),
                    'formatted_time'      => $dt->format('h:i A'),
                    'formatted_date'      => $dt->isToday() ? 'Today, ' . $dt->format('h:i A') : $dt->format('M d, h:i A'),
                    'time_ago'            => $dt->diffForHumans(),
                ];
            })
            ->values()
            ->all();
    }
}
