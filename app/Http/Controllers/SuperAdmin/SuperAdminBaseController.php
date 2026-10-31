<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

abstract class SuperAdminBaseController extends Controller
{
    protected const ROLE_LABELS = [
        1 => 'Super Admin',
        2 => 'Manager',
        3 => 'Admin Assistant',
        4 => 'Tools Man',
        5 => 'Technician',
        6 => 'Customer',
        7 => 'Head Technician',
    ];

    protected const STAFF_ROLE_IDS = [2, 3, 4, 5, 7];

    protected const BOOKING_ASSIGNABLE_STATUSES = [
        'Approved',
        'Payment Incomplete',
        'Reschedule Notice',
    ];

    protected const INVENTORY_ITEM_TYPES = ['Tool', 'Material', 'Spare Part'];

    protected const INVENTORY_MODES = ['worker', 'sale'];

    protected const TOOL_SUBTYPES = ['power', 'hand'];

    protected const AC_TYPES = ['Window', 'Split', 'Cassette', 'Floor Mounted', 'Ceiling Suspended'];

    protected const AC_STATUSES = ['Available', 'Reserved', 'Sold', 'Order Base', 'Defect', 'Archived'];

    protected const DOCUMENT_STATUSES = ['Draft', 'Exported', 'Finalized'];

    // ─── Authorization ───

    protected function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user() && (int) $request->user()->role_id === 1, 403);
    }

    // ─── Payload Normalizers ───

    protected function resolveRoleIdFromRequest(Request $request, string $roleIdKey, string $roleLabelKey): ?int
    {
        $roleId = $request->input($roleIdKey);

        if ($roleId !== null && $roleId !== '') {
            return (int) $roleId;
        }

        $roleLabel = $request->input($roleLabelKey);

        if ($roleLabel === null || $roleLabel === '') {
            return null;
        }

        $roleId = array_search($roleLabel, self::ROLE_LABELS, true);

        return $roleId === false ? null : (int) $roleId;
    }

    protected function normalizeStaffPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('role_id', $payload) && ! empty($payload['role'])) {
            $payload['role_id'] = array_search($payload['role'], self::ROLE_LABELS, true) ?: null;
        }

        return $payload;
    }

    protected function normalizeBookingAssignmentPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('assigned_tech_id', $payload) && array_key_exists('technician_id', $payload)) {
            $payload['assigned_tech_id'] = $payload['technician_id'];
        }

        return $payload;
    }

    protected function normalizeDocumentPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('service_name', $payload) && array_key_exists('service', $payload)) {
            $payload['service_name'] = $payload['service'];
        }

        return $payload;
    }

    protected function normalizeAnnouncementPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('target_role_id', $payload)) {
            $targetRole = $payload['target_role'] ?? null;

            if ($targetRole === 'All Staff' || $targetRole === null || $targetRole === '') {
                $payload['target_role_id'] = null;
            } elseif ($targetRole) {
                $payload['target_role_id'] = array_search($targetRole, self::ROLE_LABELS, true) ?: null;
            }
        }

        return $payload;
    }

    protected function normalizeSparePartPayload(Request $request): array
    {
        $payload = $request->all();

        if (! array_key_exists('item_name', $payload) && array_key_exists('part_name', $payload)) {
            $payload['item_name'] = $payload['part_name'];
        }

        if (! array_key_exists('quantity_on_hand', $payload) && array_key_exists('qty', $payload)) {
            $payload['quantity_on_hand'] = $payload['qty'];
        }

        if (! array_key_exists('supplier_name', $payload) && array_key_exists('supplier', $payload)) {
            $payload['supplier_name'] = $payload['supplier'];
        }

        return $payload;
    }

    // ─── Query Builders ───

    protected function staffBaseQuery()
    {
        return DB::table('users')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->leftJoin('technician_details', 'technician_details.user_id', '=', 'users.user_id')
            ->select([
                'users.user_id',
                'users.role_id',
                'users.given_name',
                'users.middle_name',
                'users.last_name',
                'users.birthdate',
                'users.sex',
                'users.address',
                'users.contact_number',
                'users.email',
                'users.created_at',
                'users.updated_at',
                'users.is_active',
                'roles.role_name',
                'technician_details.certificate_expiry',
            ]);
    }

    protected function latestPaymentSubquery()
    {
        return DB::table('payment as p1')
            ->select([
                'p1.booking_id',
                'p1.payment_id',
                'p1.payment_status',
                'p1.payment_method',
                'p1.reference_number',
                'p1.payment_date',
                DB::raw('(SELECT COALESCE(MAX(p2.booking_price), 0) FROM payment as p2 WHERE p2.booking_id = p1.booking_id) as booking_price'),
                DB::raw('(SELECT COALESCE(MAX(p2.spare_parts_price), 0) FROM payment as p2 WHERE p2.booking_id = p1.booking_id) as spare_parts_price'),
                DB::raw('(SELECT COALESCE(SUM(p2.amount_paid), 0) FROM payment as p2 WHERE p2.booking_id = p1.booking_id AND p2.payment_status != "Returned") as amount_paid'),
            ])
            ->whereRaw('p1.payment_id = (SELECT MAX(p3.payment_id) FROM payment as p3 WHERE p3.booking_id = p1.booking_id)');
    }

    protected function latestFeedbackSubquery()
    {
        return DB::table('customer_feedback_and_ratings as f1')
            ->select(['f1.booking_id', 'f1.rating', 'f1.feedback'])
            ->whereRaw('f1.feedback_id = (SELECT MAX(f2.feedback_id) FROM customer_feedback_and_ratings as f2 WHERE f2.booking_id = f1.booking_id)');
    }

    protected function bookingsBaseQuery()
    {
        return DB::table('bookings')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->leftJoin('users as technicians', 'technicians.user_id', '=', 'bookings.assigned_tech_id')
            ->leftJoin('users as lead_tech', 'lead_tech.user_id', '=', 'bookings.lead_technician_id')
            ->leftJoin('users as assistant_tech', 'assistant_tech.user_id', '=', 'bookings.assistant_technician_id')
            ->leftJoin('technician_teams', 'technician_teams.team_id', '=', 'bookings.assigned_team_id')
            ->leftJoin('users as assigners', 'assigners.user_id', '=', 'bookings.assigned_by')
            ->leftJoin('service_reports', 'service_reports.booking_id', '=', 'bookings.booking_id')
            ->leftJoinSub($this->latestPaymentSubquery(), 'payment', function ($join) {
                $join->on('payment.booking_id', '=', 'bookings.booking_id');
            })
            ->select([
                'bookings.booking_id',
                'bookings.client_id',
                'bookings.assigned_tech_id',
                'bookings.lead_technician_id',
                'bookings.assistant_technician_id',
                'bookings.assigned_team_id',
                'bookings.assigned_by',
                'bookings.assigned_at',
                'bookings.scheduled_date',
                'bookings.alternative_schedule',
                'bookings.booking_status',
                'bookings.service_payment_method',
                'bookings.service_details',
                'bookings.units_data',
                'bookings.quotation_data',
                'bookings.notes',
                'bookings.cancellation_reason',
                'bookings.created_at',
                'services.service_id',
                'services.service_name',
                'services.base_price',
                'payment.payment_status',
                'payment.payment_method',
                'payment.reference_number as payment_reference_number',
                'payment.amount_paid',
                'payment.payment_date',
                'service_reports.report_id as service_report_id',
                'service_reports.status as service_report_status',
                'service_reports.diagnosis as service_report_diagnosis',
                'service_reports.work_done as service_report_work_done',
                'service_reports.recommendations as service_report_remarks',
                'service_reports.job_started_at',
                'service_reports.job_completed_at',
                'clients.given_name as client_given_name',
                'clients.middle_name as client_middle_name',
                'clients.last_name as client_last_name',
                'clients.address as client_address',
                'clients.contact_number as client_contact_number',
                'clients.email as client_email',
                'technicians.user_id as tech_user_id',
                'technicians.given_name as tech_given_name',
                'technicians.middle_name as tech_middle_name',
                'technicians.last_name as tech_last_name',
                'lead_tech.user_id as lead_tech_user_id',
                'lead_tech.given_name as lead_tech_given_name',
                'lead_tech.middle_name as lead_tech_middle_name',
                'lead_tech.last_name as lead_tech_last_name',
                'assistant_tech.user_id as assistant_tech_user_id',
                'assistant_tech.given_name as assistant_tech_given_name',
                'assistant_tech.middle_name as assistant_tech_middle_name',
                'assistant_tech.last_name as assistant_tech_last_name',
                'technician_teams.team_name as assigned_team_name',
                'assigners.given_name as assigner_given_name',
                'assigners.middle_name as assigner_middle_name',
                'assigners.last_name as assigner_last_name',
            ]);
    }

    protected function salesRecordsBaseQuery()
    {
        return DB::table('bookings')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->leftJoin('users as assigners', 'assigners.user_id', '=', 'bookings.assigned_by')
            ->leftJoinSub($this->latestPaymentSubquery(), 'payment', function ($join) {
                $join->on('payment.booking_id', '=', 'bookings.booking_id');
            })
            ->leftJoinSub($this->latestFeedbackSubquery(), 'feedback', function ($join) {
                $join->on('feedback.booking_id', '=', 'bookings.booking_id');
            })
            ->select([
                'bookings.booking_id',
                'bookings.client_id',
                'bookings.assigned_by',
                'bookings.scheduled_date',
                'bookings.booking_status',
                'bookings.service_details',
                'bookings.notes as booking_notes',
                'bookings.created_at',
                'services.service_name',
                'services.category as service_category',
                'services.base_price',
                'payment.amount_paid',
                'payment.booking_price',
                'payment.spare_parts_price',
                'payment.payment_method',
                'payment.payment_status',
                'payment.payment_date',
                'feedback.rating',
                'feedback.feedback',
                'clients.given_name as client_given_name',
                'clients.middle_name as client_middle_name',
                'clients.last_name as client_last_name',
                'clients.contact_number as client_contact_number',
                'clients.address as client_address',
                'assigners.given_name as assigner_given_name',
                'assigners.middle_name as assigner_middle_name',
                'assigners.last_name as assigner_last_name',
                'assigners.role_id as assigner_role_id',
            ]);
    }

    protected function documentsBaseQuery()
    {
        return DB::table('documents')
            ->leftJoin('users as creators', 'creators.user_id', '=', 'documents.created_by')
            ->select([
                'documents.doc_id',
                'documents.booking_id',
                'documents.created_by',
                'documents.form_name',
                'documents.client_name',
                'documents.service_name',
                'documents.status',
                'documents.file_path',
                'documents.notes',
                'documents.created_at',
                'documents.updated_at',
                'creators.given_name as creator_given_name',
                'creators.middle_name as creator_middle_name',
                'creators.last_name as creator_last_name',
            ]);
    }

    protected function announcementsBaseQuery()
    {
        return DB::table('announcements')
            ->join('users as creators', 'creators.user_id', '=', 'announcements.created_by')
            ->leftJoin('roles', 'roles.role_id', '=', 'announcements.target_role_id')
            ->select([
                'announcements.id',
                'announcements.created_by',
                'announcements.title',
                'announcements.message',
                'announcements.target_role_id',
                'announcements.created_at',
                'announcements.updated_at',
                'creators.given_name as creator_given_name',
                'creators.middle_name as creator_middle_name',
                'creators.last_name as creator_last_name',
                'roles.role_name',
            ]);
    }

    protected function activityLogsBaseQuery()
    {
        return DB::table('activity_logs')
            ->join('users', 'users.user_id', '=', 'activity_logs.user_id')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->select([
                'activity_logs.id',
                'activity_logs.user_id',
                'activity_logs.action_type',
                'activity_logs.description',
                'activity_logs.created_at',
                'users.role_id',
                'users.given_name',
                'users.middle_name',
                'users.last_name',
                'roles.role_name',
            ]);
    }

    // ─── Collection Helpers ───

    protected function techniciansCollection(): Collection
    {
        return $this->staffBaseQuery()
            ->whereIn('users.role_id', [5, 7])
            ->where(function ($query) {
                $query->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })
            ->orderBy('users.last_name')
            ->get()
            ->map(function ($tech) {
                return [
                    'user_id' => (int) $tech->user_id,
                    'given_name' => $tech->given_name,
                    'middle_name' => $tech->middle_name,
                    'last_name' => $tech->last_name,
                    'full_name' => $this->formatName($tech->given_name, $tech->middle_name, $tech->last_name),
                    'certificate_expiry' => $tech->certificate_expiry,
                ];
            })
            ->values();
    }

    protected function teamsCollection(): Collection
    {
        return DB::table('technician_teams')
            ->where('status', 'Active')
            ->orderBy('team_name')
            ->get(['team_id', 'team_name', 'leader_id', 'description'])
            ->map(function ($team) {
                $members = DB::table('technician_team_members')
                    ->join('users', 'users.user_id', '=', 'technician_team_members.technician_id')
                    ->where('technician_team_members.team_id', $team->team_id)
                    ->select([
                        'users.user_id',
                        'users.given_name',
                        'users.middle_name',
                        'users.last_name',
                        'technician_team_members.role_in_team',
                    ])
                    ->get()
                    ->map(fn ($m) => [
                        'user_id' => (int) $m->user_id,
                        'full_name' => $this->formatName($m->given_name, $m->middle_name, $m->last_name),
                        'role_in_team' => $m->role_in_team,
                    ]);

                $leader = $members->firstWhere('user_id', $team->leader_id) ?? $members->first();

                return [
                    'team_id' => (int) $team->team_id,
                    'team_name' => $team->team_name,
                    'leader_id' => $team->leader_id ? (int) $team->leader_id : null,
                    'leader_name' => $leader ? $leader['full_name'] : 'Unassigned',
                    'description' => $team->description,
                    'members_count' => $members->count(),
                    'members' => $members->values(),
                ];
            })
            ->values();
    }

    // ─── Data Mappers ───

    protected function mapStaff(Collection $rows): Collection
    {
        if ($rows->isEmpty()) {
            return collect();
        }

        $specialtiesByUser = DB::table('technician_specialty')
            ->join('specialties', 'specialties.specialty_id', '=', 'technician_specialty.specialty_id')
            ->whereIn('technician_specialty.user_id', $rows->pluck('user_id')->all())
            ->orderBy('specialties.specialty_name')
            ->get(['technician_specialty.user_id', 'specialties.specialty_id', 'specialties.specialty_name'])
            ->groupBy('user_id');

        return $rows->map(function ($row) use ($specialtiesByUser) {
            $specialties = collect($specialtiesByUser->get($row->user_id, []))
                ->map(fn ($specialty) => [
                    'specialty_id' => (int) $specialty->specialty_id,
                    'specialty_name' => $specialty->specialty_name,
                ])
                ->values();

            return [
                'user_id' => (int) $row->user_id,
                'role_id' => (int) $row->role_id,
                'role' => $row->role_name ?? (self::ROLE_LABELS[(int) $row->role_id] ?? 'Staff'),
                'given_name' => $row->given_name,
                'middle_name' => $row->middle_name,
                'last_name' => $row->last_name,
                'full_name' => $this->formatName($row->given_name, $row->middle_name, $row->last_name),
                'birthdate' => $row->birthdate,
                'sex' => $row->sex,
                'address' => $row->address,
                'contact_number' => $row->contact_number,
                'email' => $row->email,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
                'is_active' => $row->is_active === null ? true : (bool) $row->is_active,
                'status' => ((int) $row->is_active === 0) ? 'Deactivated' : 'Active',
                'is_deactivated' => ((int) $row->is_active === 0),
                'can_deactivate' => (int) $row->role_id !== 1,
                'can_edit' => true,
                'certificate_expiry' => $row->certificate_expiry,
                'specialties' => $specialties,
            ];
        })->values();
    }

    protected function mapBookings(Collection $rows): Collection
    {
        if ($rows->isEmpty()) {
            return collect();
        }

        $bookingIds = $rows->pluck('booking_id')->filter()->unique()->all();
        $latestChecklistByBooking = collect();
        if (! empty($bookingIds) && \Illuminate\Support\Facades\Schema::hasTable('tool_checklists')) {
            $latestChecklistByBooking = DB::table('tool_checklists')
                ->whereIn('booking_id', $bookingIds)
                ->orderByDesc('checklist_id')
                ->get(['checklist_id', 'booking_id', 'status'])
                ->groupBy('booking_id')
                ->map(fn ($items) => $items->first());
        }

        return $rows->map(function ($row) use ($latestChecklistByBooking) {
            $leadId = $row->lead_technician_id ?? $row->assigned_tech_id ?? null;
            $leadName = $row->lead_tech_user_id
                ? $this->formatName($row->lead_tech_given_name, $row->lead_tech_middle_name, $row->lead_tech_last_name)
                : ($row->tech_user_id ? $this->formatName($row->tech_given_name, $row->tech_middle_name, $row->tech_last_name) : null);

            $assistantId = $row->assistant_technician_id ?? null;
            $assistantName = $row->assistant_tech_user_id
                ? $this->formatName($row->assistant_tech_given_name, $row->assistant_tech_middle_name, $row->assistant_tech_last_name)
                : null;

            // Generate dynamic team name representing the two-person assigned team
            $teamName = null;
            if ($leadName && $assistantName) {
                $teamName = "{$leadName} & {$assistantName}";
            } elseif ($leadName) {
                $teamName = "{$leadName} (Lead)";
            } elseif (! empty($row->assigned_team_name)) {
                $teamName = $row->assigned_team_name;
            }

            $serviceDetails = [];
            if (! empty($row->service_details)) {
                $serviceDetails = is_string($row->service_details)
                    ? (json_decode($row->service_details, true) ?: [])
                    : (is_array($row->service_details) ? $row->service_details : []);
            }

            $unitsData = [];
            if (! empty($row->units_data)) {
                $unitsData = is_string($row->units_data)
                    ? (json_decode($row->units_data, true) ?: [])
                    : (is_array($row->units_data) ? $row->units_data : []);
            }

            $quotationData = null;
            if (! empty($row->quotation_data)) {
                $quotationData = is_string($row->quotation_data)
                    ? json_decode($row->quotation_data, true)
                    : $row->quotation_data;
            }

            $latestChecklist = $latestChecklistByBooking->get($row->booking_id);

            return [
                'booking_id' => (int) $row->booking_id,
                'client_id' => (int) $row->client_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'client_address' => $row->client_address,
                'client_contact_number' => $row->client_contact_number,
                'client_email' => $row->client_email,
                'service_id' => (int) $row->service_id,
                'service' => $row->service_name,
                'service_name' => $row->service_name,
                'service_base_price' => (float) $row->base_price,
                'assigned_tech_id' => $leadId ? (int) $leadId : null,
                'assigned_tech_name' => $leadName,
                'lead_technician_id' => $leadId ? (int) $leadId : null,
                'lead_technician_name' => $leadName,
                'assistant_technician_id' => $assistantId ? (int) $assistantId : null,
                'assistant_technician_name' => $assistantName,
                'assigned_team' => [
                    'lead' => $leadId ? [
                        'user_id' => (int) $leadId,
                        'name' => $leadName,
                        'role' => 'Lead Technician',
                    ] : null,
                    'assistant' => $assistantId ? [
                        'user_id' => (int) $assistantId,
                        'name' => $assistantName,
                        'role' => 'Assistant Technician',
                    ] : null,
                ],
                'assigned_team_id' => $row->assigned_team_id ? (int) $row->assigned_team_id : null,
                'assigned_team_name' => $teamName,
                'assigned_by' => $row->assigned_by ? (int) $row->assigned_by : null,
                'assigned_by_name' => isset($row->assigner_given_name) ? $this->formatName($row->assigner_given_name, $row->assigner_middle_name, $row->assigner_last_name) : null,
                'assigned_at' => $row->assigned_at ?? null,
                'scheduled_date' => $row->scheduled_date,
                'alternative_schedule' => $row->alternative_schedule ?? null,
                'preferred_arrival_time' => $row->scheduled_date ? Carbon::parse($row->scheduled_date)->format('h:i A') : ($serviceDetails['preferred_arrival_time'] ?? null),
                'rate_type' => $serviceDetails['rate_type'] ?? null,
                'is_differential' => (bool) ($serviceDetails['is_differential'] ?? false),
                'booking_status' => $row->booking_status,
                'service_payment_method' => $row->service_payment_method ?? 'Cash',
                'service_details' => $serviceDetails,
                'units_data' => $unitsData,
                'quotation_data' => $quotationData,
                'notes' => $row->notes ?? null,
                'cancellation_reason' => $row->cancellation_reason ?? null,
                'created_at' => $row->created_at,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_method' => $row->payment_method,
                'reference_number' => $row->payment_reference_number ?? null,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : null,
                'payment_date' => $row->payment_date,
                'checklist_id' => $latestChecklist ? (int) $latestChecklist->checklist_id : null,
                'checklist_status' => $latestChecklist->status ?? null,
                'service_report' => $row->service_report_id ? [
                    'report_id' => (int) $row->service_report_id,
                    'status' => $row->service_report_status,
                    'work_done' => $row->service_report_work_done,
                    'remarks' => $row->service_report_remarks,
                    'job_started_at' => $row->job_started_at,
                    'job_completed_at' => $row->job_completed_at,
                ] : null,
                'payment_turnover' => $serviceDetails['payment_turnover'] ?? null,
                'requested_by_name' => $serviceDetails['requested_by_name'] ?? null,
            ];
        })->values();
    }

    protected function mapSalesRecords(Collection $rows): Collection
    {
        $salesByBookingId = collect();
        if (\Illuminate\Support\Facades\Schema::hasTable('inventory_sales')) {
            $salesByBookingId = DB::table('inventory_sales')
                ->whereNotNull('booking_id')
                ->get()
                ->keyBy('booking_id');
        }

        $bookingIds = $rows->pluck('booking_id')->filter()->unique();
        $paymentsByBooking = collect();
        if ($bookingIds->isNotEmpty() && \Illuminate\Support\Facades\Schema::hasTable('payment')) {
            $paymentsByBooking = DB::table('payment')
                ->whereIn('booking_id', $bookingIds)
                ->orderBy('payment_id')
                ->get()
                ->groupBy('booking_id');
        }

        $consumedMaterialsByBooking = collect();
        if ($bookingIds->isNotEmpty() && \Illuminate\Support\Facades\Schema::hasTable('booking_materials')) {
            $consumedMaterialsByBooking = DB::table('booking_materials')
                ->join('inventory_items', 'inventory_items.item_id', '=', 'booking_materials.item_id')
                ->whereIn('booking_materials.booking_id', $bookingIds)
                ->select([
                    'booking_materials.booking_id',
                    'booking_materials.quantity_used',
                    'inventory_items.item_id',
                    'inventory_items.item_name',
                    'inventory_items.item_type',
                    'inventory_items.sub_category',
                    'inventory_items.selling_price',
                    'inventory_items.capital',
                ])
                ->get()
                ->groupBy('booking_id');
        }

        $serviceReportsByBooking = collect();
        if ($bookingIds->isNotEmpty() && \Illuminate\Support\Facades\Schema::hasTable('service_reports')) {
            $serviceReportsByBooking = DB::table('service_reports')
                ->whereIn('booking_id', $bookingIds)
                ->get(['booking_id', 'parts_replaced', 'diagnosis', 'work_done', 'technician_id'])
                ->keyBy('booking_id');
        }

        $userIdsToFetch = collect();
        foreach ($rows as $r) {
            if (! empty($r->assigned_by)) {
                $userIdsToFetch->push((int) $r->assigned_by);
            }
            $sDetails = ! empty($r->service_details)
                ? (is_string($r->service_details) ? (json_decode($r->service_details, true) ?: []) : (array) $r->service_details)
                : [];
            if (! empty($sDetails['payment_turnover']['verified_by_user_id'])) {
                $userIdsToFetch->push((int) $sDetails['payment_turnover']['verified_by_user_id']);
            }
        }

        $staffUsers = DB::table('users')
            ->whereIn('role_id', [1, 2])
            ->orWhereIn('user_id', $userIdsToFetch->filter()->unique())
            ->get(['user_id', 'given_name', 'middle_name', 'last_name', 'role_id'])
            ->keyBy('user_id');

        $defaultManager = $staffUsers->firstWhere('role_id', 2) ?? $staffUsers->firstWhere('role_id', 1);

        return $rows->map(function ($row) use (
            $salesByBookingId,
            $paymentsByBooking,
            $consumedMaterialsByBooking,
            $serviceReportsByBooking,
            $staffUsers,
            $defaultManager
        ) {
            $invSale = $salesByBookingId->get($row->booking_id);
            $serviceName = (string) ($row->service_name ?? '');

            $saleCategory = 'Service Booking';
            $saleType = 'service';
            if ($invSale) {
                $saleType = $invSale->sale_type ?: 'tools_materials';
                if ($saleType === 'ac_unit') {
                    $saleCategory = 'AC Unit';
                } elseif ($saleType === 'spare_part') {
                    $saleCategory = 'Spare Part';
                } else {
                    $saleCategory = 'Tools & Materials';
                }
            } elseif (str_starts_with($serviceName, 'Retail Sale:')) {
                $saleCategory = 'Tools & Materials';
                $saleType = 'tools_materials';
            } elseif (str_starts_with($serviceName, 'AC Unit Sale:')) {
                $saleCategory = 'AC Unit';
                $saleType = 'ac_unit';
            } elseif (str_starts_with($serviceName, 'Spare Part Sale:')) {
                $saleCategory = 'Spare Part';
                $saleType = 'spare_part';
            } else {
                $saleCategory = $row->service_category ?: 'HVAC Service';
            }

            $serviceDetails = ! empty($row->service_details)
                ? (is_string($row->service_details) ? (json_decode($row->service_details, true) ?: []) : (array) $row->service_details)
                : [];
            $turnover = $serviceDetails['payment_turnover'] ?? [];
            $amountTurnedOver = isset($turnover['amount_turned_over'])
                ? (float) $turnover['amount_turned_over']
                : (isset($turnover['net_collected']) ? (float) $turnover['net_collected'] : 0.0);
            $downPaymentCredited = (float) ($turnover['reservation_down_payment'] ?? 0.0);
            $turnoverVerified = ! empty($turnover['verified_by_manager']);

            $isRepair = str_contains(strtolower($serviceName), 'repair')
                || strtolower($row->service_category ?? '') === 'repair';

            // Consumed materials and spare parts
            $consumedRows = $consumedMaterialsByBooking->get($row->booking_id) ?? collect();
            $sparePartsItems = $consumedRows->filter(function ($m) {
                return $m->item_type === 'Spare Part' || (float) $m->selling_price > 0;
            });
            $consumedSparePartsTotal = (float) $sparePartsItems->sum(function ($m) {
                return (float) ($m->quantity_used * ($m->selling_price ?: 0));
            });
            $consumedSparePartsCapital = (float) $sparePartsItems->sum(function ($m) {
                return (float) ($m->quantity_used * ($m->capital ?: 0));
            });

            // Spare parts price
            $paySpareParts = (float) ($row->spare_parts_price ?? 0.0);
            $turnoverSpareParts = isset($turnover['spare_parts_price']) ? (float) $turnover['spare_parts_price'] : 0.0;
            $sparePartsPrice = 0.0;
            if ($isRepair || $paySpareParts > 0 || $turnoverSpareParts > 0 || $consumedSparePartsTotal > 0) {
                $sparePartsPrice = max($paySpareParts, $turnoverSpareParts, $consumedSparePartsTotal);
            }

            // Booking Fee
            $bookingFee = $saleType === 'service' ? ($downPaymentCredited > 0 ? $downPaymentCredited : 300.00) : null;

            // Base Price
            $rowBookingPrice = (float) ($row->booking_price ?? 0.0);
            $rowBasePrice = (float) ($row->base_price ?? 0.0);
            if ($rowBookingPrice > 0) {
                $basePrice = $rowBookingPrice;
            } elseif ($rowBasePrice > 0) {
                $basePrice = $rowBasePrice;
            } elseif (isset($turnover['total_service_price']) && (float) $turnover['total_service_price'] > 0) {
                $basePrice = max(0.0, (float) $turnover['total_service_price'] - $sparePartsPrice);
            } elseif ($row->amount_paid !== null && (float) $row->amount_paid > 0) {
                $basePrice = max(0.0, (float) $row->amount_paid - $sparePartsPrice);
            } else {
                $basePrice = 0.0;
            }

            // Total Cost / Total Paid
            $totalCost = $basePrice + $sparePartsPrice;
            $amountPaid = $row->amount_paid !== null
                ? (float) $row->amount_paid
                : ($invSale ? (float) $invSale->total_amount : 0.0);

            if ($amountPaid === 0.0 && ($amountTurnedOver > 0 || $row->booking_status === 'Completed')) {
                $amountPaid = $totalCost > 0 ? $totalCost : ($amountTurnedOver + $downPaymentCredited);
            } elseif ($amountPaid === 0.0 && $invSale) {
                $amountPaid = (float) $invSale->total_amount;
            }

            // Managed by
            $managedUser = null;
            $verifierId = $turnover['verified_by_user_id'] ?? null;
            if ($verifierId && isset($staffUsers[$verifierId])) {
                $managedUser = $staffUsers[$verifierId];
            } elseif (! empty($row->assigned_by) && isset($staffUsers[$row->assigned_by])) {
                $managedUser = $staffUsers[$row->assigned_by];
            } elseif (! empty($row->assigner_given_name)) {
                $managedUser = (object) [
                    'given_name' => $row->assigner_given_name,
                    'middle_name' => $row->assigner_middle_name,
                    'last_name' => $row->assigner_last_name,
                    'role_id' => $row->assigner_role_id ?? 2,
                ];
            } elseif ($defaultManager) {
                $managedUser = $defaultManager;
            }

            $managedByName = $managedUser
                ? $this->formatName($managedUser->given_name, $managedUser->middle_name ?? null, $managedUser->last_name)
                : ($invSale->sold_by_name ?? 'Super Admin');
            $managedByRole = $managedUser
                ? (self::ROLE_LABELS[(int) $managedUser->role_id] ?? 'Manager')
                : 'Manager';
            $managedByDisplay = "{$managedByName} ({$managedByRole})";

            // Profit calculation
            $costPrice = $invSale ? (float) $invSale->cost_price : 0.0;
            $qty = $invSale ? (int) ($invSale->quantity ?: 1) : 1;
            if ($invSale) {
                $profit = (float) $invSale->profit;
            } elseif ($saleType === 'service') {
                $profit = max(0.0, round($amountPaid - $consumedSparePartsCapital, 2));
            } else {
                $profit = round($amountPaid - ($costPrice * $qty), 2);
            }

            $clientName = $invSale && ! empty($invSale->customer_name)
                ? $invSale->customer_name
                : $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name);

            $bookingPayments = ($paymentsByBooking->get($row->booking_id) ?? collect())->map(function ($p) {
                return [
                    'payment_id' => (int) $p->payment_id,
                    'payment_type' => $p->payment_type,
                    'amount_paid' => (float) $p->amount_paid,
                    'payment_status' => $p->payment_status,
                    'payment_method' => $p->payment_method,
                    'reference_number' => $p->reference_number,
                    'notes' => $p->notes,
                    'payment_date' => $p->payment_date,
                ];
            })->values()->all();

            $serviceReport = $serviceReportsByBooking->get($row->booking_id);
            $partsReplacedText = $serviceReport ? $serviceReport->parts_replaced : null;

            $consumedPartsList = $sparePartsItems->map(function ($m) {
                return [
                    'item_id' => (int) $m->item_id,
                    'item_name' => $m->item_name,
                    'item_type' => $m->item_type,
                    'quantity' => (int) $m->quantity_used,
                    'price' => (float) ($m->selling_price ?: 0.0),
                    'capital' => (float) ($m->capital ?: 0.0),
                    'total_price' => (float) ($m->quantity_used * ($m->selling_price ?: 0.0)),
                ];
            })->values()->all();

            return [
                'booking_id' => (int) $row->booking_id,
                'sale_id' => $invSale ? (int) $invSale->sale_id : null,
                'sale_type' => $saleType,
                'record_type' => $saleType === 'tools_materials' ? 'for_sale_item' : $saleType,
                'sale_category' => $saleCategory,
                'is_repair' => $isRepair,
                'booking_fee' => $bookingFee,
                'base_price' => $basePrice,
                'spare_parts_price' => $sparePartsPrice,
                'total_cost' => $totalCost,
                'consumed_spare_parts' => $consumedPartsList,
                'parts_replaced' => $partsReplacedText,
                'managed_by' => $managedByDisplay,
                'managed_by_name' => $managedByName,
                'managed_by_role' => $managedByRole,
                'client_name' => $clientName,
                'customer_contact' => $invSale->customer_contact ?? ($row->client_contact_number ?? null),
                'customer_address' => $invSale->customer_address ?? ($row->client_address ?? null),
                'service' => $serviceName,
                'service_category' => $row->service_category ?: ($isRepair ? 'Repair' : 'Service'),
                'item_name' => $invSale->item_name ?? $serviceName,
                'brand' => $invSale->brand ?? null,
                'model' => $invSale->model ?? null,
                'serial_number' => $invSale->serial_number ?? null,
                'sub_category' => $invSale->sub_category ?? ($row->service_category ?? 'HVAC Service'),
                'horsepower' => $invSale->horsepower ?? null,
                'quantity' => $qty,
                'unit' => $invSale->unit ?? ($saleType === 'service' ? 'job' : 'pcs'),
                'cost_price' => $costPrice,
                'unit_price' => $invSale ? (float) $invSale->unit_price : $amountPaid,
                'profit' => $profit,
                'warranty_period' => $invSale->warranty_period ?? null,
                'sold_by_name' => $invSale->sold_by_name ?? null,
                'notes' => $invSale->notes ?? ($row->booking_notes ?? null),
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'amount_paid' => $amountPaid,
                'amount_turned_over' => $amountTurnedOver,
                'down_payment_credited' => $downPaymentCredited,
                'turnover_verified' => $turnoverVerified,
                'turnover_payment_method' => $turnover['payment_method'] ?? null,
                'turnover_reference_number' => $turnover['reference_number'] ?? null,
                'turnover_verified_at' => $turnover['verified_at'] ?? null,
                'requested_by_name' => $serviceDetails['requested_by_name'] ?? null,
                'payments' => $bookingPayments,
                'payment_method' => $row->payment_method ?: ($invSale->payment_method ?? ($turnover['payment_method'] ?? 'Cash')),
                'payment_status' => $row->payment_status ?? ($row->booking_status === 'Completed' ? 'Paid' : ($invSale->payment_status ?? 'Pending')),
                'payment_date' => $row->payment_date ?? ($invSale->sold_at ?? $row->created_at),
                'rating' => $row->rating ? (int) $row->rating : null,
                'feedback' => $row->feedback,
                'created_at' => $row->created_at,
            ];
        })->values();
    }

    protected function mapDocuments(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            return [
                'doc_id' => (int) $row->doc_id,
                'booking_id' => $row->booking_id ? (int) $row->booking_id : null,
                'created_by' => (int) $row->created_by,
                'created_by_name' => $row->creator_given_name ? $this->formatName($row->creator_given_name, $row->creator_middle_name, $row->creator_last_name) : null,
                'form_name' => $row->form_name,
                'client_name' => $row->client_name,
                'service' => $row->service_name,
                'status' => $row->status,
                'file_path' => $row->file_path,
                'notes' => $row->notes,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        })->values();
    }

    protected function mapAnnouncements(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            $targetRoleId = $row->target_role_id !== null ? (int) $row->target_role_id : null;

            return [
                'id' => (int) $row->id,
                'created_by' => (int) $row->created_by,
                'created_by_name' => $this->formatName($row->creator_given_name, $row->creator_middle_name, $row->creator_last_name),
                'title' => $row->title,
                'message' => $row->message,
                'target_role_id' => $targetRoleId,
                'target_role' => $targetRoleId ? (self::ROLE_LABELS[$targetRoleId] ?? $row->role_name) : 'All Staff',
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        })->values();
    }

    protected function mapActivityLogs(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            $roleId = isset($row->role_id) ? (int) $row->role_id : null;

            return [
                'id' => (int) $row->id,
                'user_id' => (int) $row->user_id,
                'user_name' => $this->formatName($row->given_name, $row->middle_name, $row->last_name),
                'role_id' => $roleId,
                'role' => $roleId ? (self::ROLE_LABELS[$roleId] ?? $row->role_name ?? 'User') : ($row->role_name ?? 'User'),
                'action_type' => $row->action_type,
                'description' => $row->description,
                'created_at' => $row->created_at,
            ];
        })->values();
    }

    // ─── Revenue Series Builders ───

    protected function buildWeeklyRevenueSeries(iterable $records): Collection
    {
        $rows = collect($records);
        $today = now()->startOfDay();

        return collect(range(6, 0))->map(function (int $daysAgo) use ($rows, $today) {
            $date = $today->copy()->subDays($daysAgo);
            $matches = $rows->filter(function ($row) use ($date) {
                $paymentDate = data_get($row, 'payment_date');

                if (! $paymentDate) {
                    return false;
                }

                return Carbon::parse($paymentDate)->isSameDay($date);
            });

            return [
                'day' => $date->format('D'),
                'date' => $date->toDateString(),
                'bookings' => $matches->count(),
                'revenue' => (float) $matches->sum(fn ($row) => (float) data_get($row, 'amount_paid', 0)),
                'profit' => (float) $matches->sum(fn ($row) => (float) data_get($row, 'profit', data_get($row, 'amount_paid', 0))),
                'service_revenue' => (float) $matches->filter(fn ($r) => data_get($r, 'sale_type', 'service') === 'service')->sum(fn ($r) => (float) data_get($r, 'amount_paid', 0)),
                'tools_revenue' => (float) $matches->filter(fn ($r) => data_get($r, 'sale_type') === 'tools_materials')->sum(fn ($r) => (float) data_get($r, 'amount_paid', 0)),
                'ac_revenue' => (float) $matches->filter(fn ($r) => in_array(data_get($r, 'sale_type'), ['ac_unit', 'spare_part'], true))->sum(fn ($r) => (float) data_get($r, 'amount_paid', 0)),
            ];
        })->values();
    }

    protected function buildMonthlyRevenueSeries(iterable $records): Collection
    {
        $rows = collect($records);

        return collect(range(11, 0))->map(function (int $monthsAgo) use ($rows) {
            $month = now()->startOfMonth()->subMonths($monthsAgo);
            $matches = $rows->filter(function ($record) use ($month) {
                $paymentDate = data_get($record, 'payment_date');

                if (! $paymentDate) {
                    return false;
                }

                return Carbon::parse($paymentDate)->format('Y-m') === $month->format('Y-m');
            });

            return [
                'month' => $month->format('M'),
                'year_month' => $month->format('Y-m'),
                'revenue' => (float) $matches->sum(fn ($record) => (float) data_get($record, 'amount_paid', 0)),
                'profit' => (float) $matches->sum(fn ($record) => (float) data_get($record, 'profit', data_get($record, 'amount_paid', 0))),
                'service_revenue' => (float) $matches->filter(fn ($r) => data_get($r, 'sale_type', 'service') === 'service')->sum(fn ($r) => (float) data_get($r, 'amount_paid', 0)),
                'tools_revenue' => (float) $matches->filter(fn ($r) => data_get($r, 'sale_type') === 'tools_materials')->sum(fn ($r) => (float) data_get($r, 'amount_paid', 0)),
                'ac_revenue' => (float) $matches->filter(fn ($r) => in_array(data_get($r, 'sale_type'), ['ac_unit', 'spare_part'], true))->sum(fn ($r) => (float) data_get($r, 'amount_paid', 0)),
                'bookings' => $matches->count(),
            ];
        })->values();
    }

    // ─── Inventory Formatters ───

    protected function getInventoryItemById(int $itemId): ?object
    {
        $item = DB::table('inventory_items')->where('item_id', $itemId)->first();

        if (! $item) {
            return null;
        }

        $brands = ! empty($item->compatible_brands)
            ? array_values(array_filter(array_map('trim', explode(',', $item->compatible_brands))))
            : [];

        $capital = $item->capital !== null ? (float) $item->capital : 0.0;
        $profit = $item->profit !== null ? (float) $item->profit : 0.0;
        $sellingPrice = $item->selling_price !== null ? (float) $item->selling_price : ($capital + $profit);

        return (object) [
            'item_id' => (int) $item->item_id,
            'item_name' => $item->item_name,
            'item_type' => $item->item_type,
            'inventory_mode' => $item->inventory_mode ?? 'worker',
            'tool_subtype' => $item->tool_subtype ?? null,
            'compatible_brands' => $brands,
            'serial_number' => $item->serial_number ?? null,
            'quantity_on_hand' => (int) $item->quantity_on_hand,
            'initial_stock' => $item->initial_stock !== null ? (int) $item->initial_stock : (int) $item->quantity_on_hand,
            'reorder_level' => (int) $item->reorder_level,
            'unit' => $item->unit,
            'capital' => $capital,
            'profit' => $profit,
            'selling_price' => $sellingPrice,
            'supplier_name' => $item->supplier_name ?? null,
            'folder_id' => $item->folder_id !== null ? (int) $item->folder_id : null,
            'sub_category' => $item->sub_category ?? null,
            'status' => $item->status ?? 'Available',
            'managed_by' => $item->managed_by ?? null,
            'is_archived' => (bool) ($item->is_archived ?? false),
            'archived_at' => $item->archived_at ?? null,
            'added_at' => $item->created_at ?? $item->last_updated,
            'last_updated' => $item->last_updated,
            'low_stock' => (int) $item->quantity_on_hand <= (int) $item->reorder_level,
        ];
    }

    protected function formatInventoryItem($item): array
    {
        $brands = ! empty($item->compatible_brands)
            ? array_values(array_filter(array_map('trim', explode(',', $item->compatible_brands))))
            : [];

        $capital = $item->capital !== null ? (float) $item->capital : 0.0;
        $profit = $item->profit !== null ? (float) $item->profit : 0.0;
        $sellingPrice = $item->selling_price !== null ? (float) $item->selling_price : ($capital + $profit);

        return [
            'item_id' => (int) $item->item_id,
            'item_name' => $item->item_name,
            'item_type' => $item->item_type,
            'inventory_mode' => $item->inventory_mode ?? 'worker',
            'tool_subtype' => $item->tool_subtype ?? null,
            'folder_id' => $item->folder_id !== null ? (int) $item->folder_id : null,
            'sub_category' => $item->sub_category ?? null,
            'compatible_brands' => $brands,
            'serial_number' => $item->serial_number ?? null,
            'quantity_on_hand' => (int) $item->quantity_on_hand,
            'initial_stock' => $item->initial_stock !== null ? (int) $item->initial_stock : (int) $item->quantity_on_hand,
            'reorder_level' => (int) $item->reorder_level,
            'unit' => $item->unit,
            'capital' => $capital,
            'profit' => $profit,
            'selling_price' => $sellingPrice,
            'supplier_name' => $item->supplier_name ?? null,
            'status' => $item->status ?? 'Available',
            'managed_by' => $item->managed_by ?? null,
            'is_archived' => (bool) ($item->is_archived ?? false),
            'archived_at' => $item->archived_at ?? null,
            'added_at' => $item->created_at ?? $item->last_updated,
            'last_updated' => $item->last_updated,
            'low_stock' => (int) $item->quantity_on_hand <= (int) $item->reorder_level,
        ];
    }

    protected function formatSparePart($item): array
    {
        $brands = ! empty($item->compatible_brands)
            ? array_values(array_filter(array_map('trim', explode(',', $item->compatible_brands))))
            : [];

        $capital = $item->capital !== null ? (float) $item->capital : 0.0;
        $profit = $item->profit !== null ? (float) $item->profit : 0.0;
        $sellingPrice = $item->selling_price !== null ? (float) $item->selling_price : ($capital + $profit);

        $qty = (int) $item->quantity_on_hand;
        $reorder = (int) $item->reorder_level;
        $status = $item->status ?? ($qty === 0 ? 'Out of Stock' : ($qty <= $reorder ? 'Low Stock' : 'Available / On Hand'));

        $isWarrantyReserved = (bool) ($item->is_warranty_reserved ?? ($status === 'Warranty Reserved'));
        $warrantyExpiry = ! empty($item->warranty_expiry_date) ? Carbon::parse($item->warranty_expiry_date)->startOfDay() : null;
        $warrantyDaysLeft = $warrantyExpiry ? (int) now()->startOfDay()->diffInDays($warrantyExpiry, false) : null;

        return [
            'part_id'                 => (int) $item->item_id,
            'item_id'                 => (int) $item->item_id,
            'part_name'               => $item->item_name,
            'item_name'               => $item->item_name,
            'item_type'               => $item->item_type,
            'folder_id'               => $item->folder_id ? (int) $item->folder_id : null,
            'sub_category'            => $item->sub_category ?? null,
            'category'                => $item->sub_category ?? null,
            'compatible_brands'       => $brands,
            'quantity_on_hand'        => $qty,
            'initial_stock'           => $item->initial_stock !== null ? (int) $item->initial_stock : $qty,
            'reorder_level'           => $reorder,
            'unit'                    => $item->unit,
            'capital'                 => $capital,
            'selling_price'           => $sellingPrice,
            'profit'                  => $profit,
            'supplier'                => $item->supplier_name,
            'supplier_name'           => $item->supplier_name,
            'status'                  => $status,
            'reservation_source'      => $item->reservation_source ?? ($isWarrantyReserved ? 'on_hand' : null),
            'is_warranty_reserved'    => $isWarrantyReserved,
            'reserved_for_ac_unit_id' => isset($item->reserved_for_ac_unit_id) && $item->reserved_for_ac_unit_id ? (int) $item->reserved_for_ac_unit_id : null,
            'reserved_for_serial'    => $item->reserved_for_serial ?? null,
            'reserved_for_unit_label' => $item->reserved_for_unit_label ?? null,
            'source_item_id'          => isset($item->source_item_id) && $item->source_item_id ? (int) $item->source_item_id : null,
            'warranty_start_date'     => $item->warranty_start_date ?? null,
            'warranty_expiry_date'    => $item->warranty_expiry_date ?? null,
            'warranty_days_left'      => $warrantyDaysLeft,
            'added_at'                => $item->created_at ?? $item->last_updated,
            'last_updated'            => $item->last_updated,
            'low_stock'               => $qty <= $reorder,
        ];
    }

    // ─── Staff / Technician Helpers ───

    protected function manageableStaffRow(int $userId): object
    {
        $staff = DB::table('users')->where('user_id', $userId)->where('role_id', '!=', 6)->first();

        if (! $staff) {
            abort(404);
        }

        return $staff;
    }

    protected function syncTechnicianRelations(int $userId, int $roleId, ?string $certificateExpiry, ?array $specialtyIds): void
    {
        if (! in_array($roleId, [5, 7], true)) {
            DB::table('technician_specialty')->where('user_id', $userId)->delete();
            DB::table('technician_details')->where('user_id', $userId)->delete();

            return;
        }

        DB::table('technician_details')->updateOrInsert(
            ['user_id' => $userId],
            ['certificate_expiry' => $certificateExpiry]
        );

        if ($specialtyIds === null) {
            return;
        }

        DB::table('technician_specialty')->where('user_id', $userId)->delete();

        if ($specialtyIds === []) {
            return;
        }

        DB::table('technician_specialty')->insert(
            collect($specialtyIds)
                ->unique()
                ->map(fn ($specialtyId) => ['user_id' => $userId, 'specialty_id' => $specialtyId])
                ->values()
                ->all()
        );
    }

    // ─── Utility Helpers ───

    protected function logActivity(int $userId, string $actionType, string $description): void
    {
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function formatName(?string $givenName, ?string $middleName, ?string $lastName): string
    {
        return trim(implode(' ', array_filter([$givenName, $middleName, $lastName])));
    }

    /**
     * Handle Manager / Super Admin management of Pending or Active bookings:
     * - Approved: Assigns 2 technicians (or formed team) with max 4 bookings/day per technician pair/individual.
     * - Payment Incomplete (Return Payment): Gives customer 10 minutes to complete payment, else auto-cancels & returns payment.
     * - Reschedule Notice: Prompts customer to reschedule to a vacant slot for free, blocking morning/noon or afternoon/evening on the original date.
     */
    protected function handleManageBookingAction(Request $request, int $bookingId): array
    {
        \App\Http\Controllers\Customer\CustomerBookingController::autoExpireIncompletePayments();

        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'booking_id' => ['Only pending or active bookings can be managed.'],
            ]);
        }

        $payload = $this->normalizeBookingAssignmentPayload($request);
        $targetStatus = $payload['booking_status'] ?? 'Approved';

        if (! in_array($targetStatus, self::BOOKING_ASSIGNABLE_STATUSES, true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'booking_status' => ['Invalid booking management status selected.'],
            ]);
        }

        $currentUserId = (int) $request->user()->user_id;
        $serviceDetails = [];
        if (! empty($booking->service_details)) {
            $serviceDetails = is_string($booking->service_details)
                ? (json_decode($booking->service_details, true) ?: [])
                : (is_array($booking->service_details) ? $booking->service_details : []);
        }

        // CASE 1: Payment Incomplete (Return Payment) — 10-minute timer
        if ($targetStatus === 'Payment Incomplete') {
            $dueAt = now()->addMinutes(10);
            $serviceDetails['payment_incomplete_notified_at'] = now()->toISOString();
            $serviceDetails['payment_due_at'] = $dueAt->toISOString();
            $serviceDetails['payment_incomplete_note'] = $payload['manager_note'] ?? 'Payment was marked incomplete by Manager. Complete payment within 10 minutes to avoid automatic cancellation and payment return.';

            DB::table('bookings')
                ->where('booking_id', $bookingId)
                ->update([
                    'booking_status' => 'Payment Incomplete',
                    'service_details' => json_encode($serviceDetails),
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Manager]: Marked as Payment Incomplete. Customer given 10 minutes until ' . $dueAt->format('h:i:s A') . ' to complete payment.'),
                    'updated_at' => now(),
                ]);

            DB::table('payment')
                ->where('booking_id', $bookingId)
                ->update([
                    'payment_status' => 'Incomplete',
                    'updated_at' => now(),
                ]);

            $this->logActivity(
                $currentUserId,
                'BOOKING_PAYMENT_INCOMPLETE',
                sprintf('Marked Booking #%d as Payment Incomplete. Customer notified with 10-minute deadline.', $bookingId)
            );

            $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

            return [
                'message' => 'Booking set to Payment Incomplete. The customer has been notified and given 10 minutes to complete the payment, otherwise it will be automatically cancelled and payment returned.',
                'data' => $this->mapBookings(collect([$updated]))->first(),
            ];
        }

        // CASE 2: Reschedule Notice — Free reschedule for customer, half-day blocked on original date
        if ($targetStatus === 'Reschedule Notice') {
            $schedCarbon = $booking->scheduled_date ? Carbon::parse($booking->scheduled_date) : now();
            $originalDateYmd = $schedCarbon->format('Y-m-d');
            $blockedPeriod = ((int) $schedCarbon->hour < 13) ? 'morning_noon' : 'afternoon_evening';
            $periodLabel = $blockedPeriod === 'morning_noon' ? 'Morning / Noon' : 'Afternoon / Evening';

            $serviceDetails['reschedule_notice_by_manager'] = true;
            $serviceDetails['reschedule_notice_at'] = now()->toISOString();
            $serviceDetails['reschedule_notice_original_date'] = $originalDateYmd;
            $serviceDetails['reschedule_notice_blocked_period'] = $blockedPeriod;
            $serviceDetails['reschedule_notice_message'] = $payload['manager_note']
                ?? "Your preferred {$periodLabel} schedule on {$schedCarbon->format('M d, Y')} is no longer available. Please reschedule to a vacant date/time slot at no cost.";

            DB::table('bookings')
                ->where('booking_id', $bookingId)
                ->update([
                    'booking_status' => 'Reschedule Notice',
                    'service_details' => json_encode($serviceDetails),
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . "[Manager]: Issued Reschedule Notice (Free reschedule; {$periodLabel} blocked on {$originalDateYmd})."),
                    'updated_at' => now(),
                ]);

            $this->logActivity(
                $currentUserId,
                'BOOKING_RESCHEDULE_NOTICE',
                sprintf('Issued Reschedule Notice for Booking #%d (%s blocked on %s).', $bookingId, $periodLabel, $originalDateYmd)
            );

            $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

            return [
                'message' => "Reschedule Notice sent to customer (no fee; {$periodLabel} slots on {$originalDateYmd} marked unavailable).",
                'data' => $this->mapBookings(collect([$updated]))->first(),
            ];
        }

        // CASE 3: Approved / Dispatched — Assign Technician Pair or Formed Team (Max 4 bookings/day)
        $techRule = function () {
            return \Illuminate\Validation\Rule::exists('users', 'user_id')->where(function ($query) {
                $query->whereIn('role_id', [5, 7])
                    ->where(function ($inner) {
                        $inner->whereNull('is_active')->orWhere('is_active', 1);
                    });
            });
        };

        $validated = validator($payload, [
            'lead_technician_id' => ['nullable', 'integer', $techRule()],
            'assistant_technician_id' => ['nullable', 'integer', 'different:lead_technician_id', $techRule()],
            'assigned_tech_id' => ['nullable', 'integer', $techRule()],
            'assigned_team_id' => [
                'nullable',
                'integer',
                \Illuminate\Validation\Rule::exists('technician_teams', 'team_id')->where('status', 'Active'),
            ],
            'booking_status' => ['nullable', \Illuminate\Validation\Rule::in(self::BOOKING_ASSIGNABLE_STATUSES)],
        ])->validate();

        $leadTechId = $validated['lead_technician_id'] ?? $validated['assigned_tech_id'] ?? null;
        $assistantTechId = $validated['assistant_technician_id'] ?? null;
        $teamId = $validated['assigned_team_id'] ?? null;

        if ((empty($leadTechId) || empty($assistantTechId)) && $teamId) {
            $teamMembers = DB::table('technician_team_members')
                ->where('team_id', $teamId)
                ->orderBy('role_in_team', 'desc')
                ->pluck('technician_id')
                ->all();
            $team = DB::table('technician_teams')->where('team_id', $teamId)->first();
            $leadTechId = $leadTechId ?: ($team->leader_id ?? ($teamMembers[0] ?? null));
            $assistantTechId = $assistantTechId ?: collect($teamMembers)->first(fn ($id) => (int) $id !== (int) $leadTechId);
        }

        if (empty($leadTechId) || empty($assistantTechId)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'lead_technician_id' => ['Please assign a two-person technician team (Lead Technician & Assistant Technician) or select an active formed team with at least 2 members.'],
            ]);
        }

        if ((int) $leadTechId === (int) $assistantTechId) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'assistant_technician_id' => ['The Lead and Assistant must be two different technicians.'],
            ]);
        }

        // Enforce Sunday rest day, max 5 daily slots, and max 1 job per day per technician/team
        $schedCarbon = $booking->scheduled_date ? Carbon::parse($booking->scheduled_date) : now();
        $targetDateYmd = $schedCarbon->format('Y-m-d');

        if ($schedCarbon->isSunday()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'booking_status' => ["Booking #{$bookingId} is scheduled on a Sunday ({$targetDateYmd}), which is a worker rest day. Please send a Reschedule Notice to the customer instead."],
            ]);
        }

        $maxDailySlots = (int) config('booking_schedule.max_daily_slots', 5);
        $maxJobsPerDay = (int) config('booking_schedule.max_jobs_per_team_per_day', 1);

        $approvedDailyCount = DB::table('bookings')
            ->where('booking_id', '!=', $bookingId)
            ->whereDate('scheduled_date', $targetDateYmd)
            ->whereNotIn('booking_status', ['Cancelled', 'Pending', 'Payment Incomplete', 'Reschedule Notice'])
            ->count();

        if ($approvedDailyCount >= $maxDailySlots) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'booking_status' => ["All {$maxDailySlots} daily team job slots on {$targetDateYmd} are already full. Please issue a Reschedule Notice unless a slot is freed by cancellation or reschedule."],
            ]);
        }

        if ($teamId) {
            $teamDailyCount = DB::table('bookings')
                ->where('booking_id', '!=', $bookingId)
                ->whereDate('scheduled_date', $targetDateYmd)
                ->whereNotIn('booking_status', ['Cancelled', 'Pending', 'Payment Incomplete', 'Reschedule Notice'])
                ->where('assigned_team_id', (int) $teamId)
                ->count();

            if ($teamDailyCount >= $maxJobsPerDay) {
                $teamRow = DB::table('technician_teams')->where('team_id', $teamId)->first(['team_name']);
                $teamLabel = $teamRow->team_name ?? "Team #{$teamId}";
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'assigned_team_id' => ["{$teamLabel} already has a job assigned on {$targetDateYmd}. Each team can only have {$maxJobsPerDay} job per day."],
                ]);
            }
        }

        foreach ([(int) $leadTechId, (int) $assistantTechId] as $tId) {
            $dailyCount = DB::table('bookings')
                ->where('booking_id', '!=', $bookingId)
                ->whereDate('scheduled_date', $targetDateYmd)
                ->whereNotIn('booking_status', ['Cancelled', 'Pending', 'Payment Incomplete', 'Reschedule Notice'])
                ->where(function ($q) use ($tId) {
                    $q->where('lead_technician_id', $tId)
                        ->orWhere('assistant_technician_id', $tId)
                        ->orWhere('assigned_tech_id', $tId);
                })
                ->count();

            if ($dailyCount >= $maxJobsPerDay) {
                $tUser = DB::table('users')->where('user_id', $tId)->first(['given_name', 'middle_name', 'last_name']);
                $tName = $tUser ? $this->formatName($tUser->given_name, $tUser->middle_name, $tUser->last_name) : "Technician #{$tId}";
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'lead_technician_id' => ["{$tName} already has a job assigned on {$targetDateYmd}. Each team technician can only be assigned {$maxJobsPerDay} job per day."],
                ]);
            }
        }

        unset(
            $serviceDetails['payment_due_at'],
            $serviceDetails['reschedule_notice_by_manager'],
            $serviceDetails['reschedule_notice_original_date'],
            $serviceDetails['reschedule_notice_blocked_period'],
            $serviceDetails['job_started_by_tech'],
            $serviceDetails['job_started_at']
        );

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'lead_technician_id' => $leadTechId,
                'assistant_technician_id' => $assistantTechId,
                'assigned_tech_id' => $leadTechId,
                'assigned_team_id' => $teamId,
                'assigned_by' => $currentUserId,
                'assigned_at' => now(),
                'booking_status' => $targetStatus,
                'service_details' => json_encode($serviceDetails),
                'updated_at' => now(),
            ]);

        if ($targetStatus === 'Approved') {
            self::syncAutoStartForTechnicians([(int) $leadTechId, (int) $assistantTechId]);
        }

        $leadUser = DB::table('users')->where('user_id', $leadTechId)->first(['given_name', 'middle_name', 'last_name']);
        $assistantUser = DB::table('users')->where('user_id', $assistantTechId)->first(['given_name', 'middle_name', 'last_name']);

        $leadName = $leadUser ? $this->formatName($leadUser->given_name, $leadUser->middle_name, $leadUser->last_name) : 'Lead';
        $assistantName = $assistantUser ? $this->formatName($assistantUser->given_name, $assistantUser->middle_name, $assistantUser->last_name) : 'Assistant';

        $desc = sprintf(
            'Approved booking #%d and assigned team: %s (Lead) & %s (Assistant).',
            $bookingId,
            $leadName,
            $assistantName
        );

        $this->logActivity($currentUserId, 'APPROVE', $desc);

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return [
            'message' => 'Booking approved and technicians assigned successfully.',
            'data' => $this->mapBookings(collect([$updated]))->first(),
        ];
    }

    /**
     * Handle Manager / Super Admin declaration of booking completion after verifying technician payment turnover
     * and recording who requested the service.
     */
    protected function handleCompleteBookingAction(Request $request, int $bookingId): array
    {
        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        $latestChecklist = DB::table('tool_checklists')
            ->where('booking_id', $bookingId)
            ->orderByDesc('checklist_id')
            ->first(['checklist_id', 'status']);

        if (! $latestChecklist || $latestChecklist->status !== 'Completed') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'checklist' => ['Please ensure the Tools & Materials Checklist is marked Completed by the Tools Man before completing this booking.'],
            ]);
        }

        $serviceDetails = [];
        if (! empty($booking->service_details)) {
            $serviceDetails = is_string($booking->service_details)
                ? (json_decode($booking->service_details, true) ?: [])
                : (is_array($booking->service_details) ? $booking->service_details : []);
        }

        if (empty($serviceDetails['payment_turnover'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'payment_turnover' => ['The assigned technician must turn over the collected customer payment before this booking can be completed.'],
            ]);
        }

        $validated = $request->validate([
            'requested_by_name' => ['required', 'string', 'min:2', 'max:255'],
            'payment_verified' => ['required', 'accepted'],
            'amount_turned_over' => ['nullable', 'numeric', 'min:0'],
            'verification_notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'requested_by_name.required' => 'Please input the name of the person who requested this service.',
            'payment_verified.accepted' => 'Please confirm and verify that the technician has handed over the customer payment.',
        ]);

        $turnover = $serviceDetails['payment_turnover'] ?? [];
        $turnover['verified_by_manager'] = true;
        $turnover['verified_by_user_id'] = (int) $request->user()->user_id;
        $turnover['verified_at'] = now()->toISOString();
        if (isset($validated['amount_turned_over'])) {
            $turnover['amount_turned_over'] = (float) $validated['amount_turned_over'];
        }
        if (! empty($validated['verification_notes'])) {
            $turnover['verification_notes'] = $validated['verification_notes'];
        }

        $turnedOverAmount = isset($validated['amount_turned_over']) && $validated['amount_turned_over'] !== null
            ? (float) $validated['amount_turned_over']
            : (isset($turnover['net_collected']) ? (float) $turnover['net_collected'] : null);

        $totalServicePrice = (float) ($turnover['total_service_price'] ?? ($booking->base_price ?? 0.0));
        $downPayment = (float) ($turnover['reservation_down_payment'] ?? 300.00);

        if ($turnedOverAmount === null) {
            $turnedOverAmount = max(0.0, $totalServicePrice - $downPayment);
        }

        $turnover['amount_turned_over'] = $turnedOverAmount;
        $turnover['status'] = 'Turnover Verified & Booking Completed';
        $turnoverMethod = $turnover['payment_method'] ?? ($booking->service_payment_method ?? 'Cash');
        $turnoverRef = $turnover['reference_number'] ?? null;
        if ($totalServicePrice <= 0 && $turnedOverAmount > 0) {
            $totalServicePrice = $turnedOverAmount + $downPayment;
            $turnover['total_service_price'] = $totalServicePrice;
        }

        $serviceDetails['payment_turnover'] = $turnover;
        $serviceDetails['requested_by_name'] = trim($validated['requested_by_name']);
        $serviceDetails['completed_by_manager_at'] = now()->toISOString();

        DB::transaction(function () use (
            $bookingId,
            $booking,
            $serviceDetails,
            $validated,
            $request,
            $turnedOverAmount,
            $totalServicePrice,
            $turnoverMethod,
            $turnoverRef
        ) {
            DB::table('bookings')
                ->where('booking_id', $bookingId)
                ->update([
                    'booking_status' => 'Completed',
                    'service_details' => json_encode($serviceDetails),
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . sprintf(
                        '[Manager Completion]: Payment turnover verified (₱%.2f via %s). Service requested by: %s.',
                        (float) $turnedOverAmount,
                        $turnoverMethod,
                        trim($validated['requested_by_name'])
                    )),
                    'updated_at' => now(),
                ]);

            DB::table('service_reports')
                ->where('booking_id', $bookingId)
                ->update([
                    'status' => 'Completed',
                    'updated_at' => now(),
                ]);

            $existingPayments = DB::table('payment')
                ->where('booking_id', $bookingId)
                ->get();

            $turnoverPayment = $existingPayments->first(function ($p) {
                $type = strtolower($p->payment_type ?? '');
                return str_contains($type, 'turnover') || str_contains($type, 'balance');
            });

            if ($turnoverPayment) {
                DB::table('payment')
                    ->where('payment_id', $turnoverPayment->payment_id)
                    ->update([
                        'amount_paid' => (float) $turnedOverAmount,
                        'booking_price' => $totalServicePrice,
                        'payment_status' => 'Paid',
                        'payment_method' => $turnoverMethod,
                        'reference_number' => $turnoverRef ?: $turnoverPayment->reference_number,
                        'payment_type' => 'Service Balance Turnover Payment',
                        'notes' => trim(($turnoverPayment->notes ? $turnoverPayment->notes . "\n" : '') . sprintf(
                            '[Manager Verified Turnover]: Verified and received by Manager %s.',
                            $request->user()->given_name ?? 'Manager'
                        )),
                        'payment_date' => now(),
                        'updated_at' => now(),
                    ]);
            } else {
                $zeroOrPendingPayment = $existingPayments->first(function ($p) {
                    return (float) $p->amount_paid <= 0;
                });

                if ($zeroOrPendingPayment) {
                    DB::table('payment')
                        ->where('payment_id', $zeroOrPendingPayment->payment_id)
                        ->update([
                            'amount_paid' => (float) $turnedOverAmount,
                            'booking_price' => $totalServicePrice,
                            'payment_status' => 'Paid',
                            'payment_method' => $turnoverMethod,
                            'reference_number' => $turnoverRef ?: $zeroOrPendingPayment->reference_number,
                            'payment_type' => 'Service Balance Turnover Payment',
                            'notes' => 'Post-service payment turnover verified and received by Manager.',
                            'payment_date' => now(),
                            'updated_at' => now(),
                        ]);
                } elseif ((float) $turnedOverAmount > 0) {
                    DB::table('payment')->insert([
                        'booking_id' => $bookingId,
                        'booking_price' => $totalServicePrice,
                        'unit_price' => 0.00,
                        'spare_parts_price' => 0.00,
                        'amount_paid' => (float) $turnedOverAmount,
                        'payment_status' => 'Paid',
                        'payment_method' => $turnoverMethod,
                        'payment_type' => 'Service Balance Turnover Payment',
                        'reference_number' => $turnoverRef,
                        'notes' => 'Post-service payment turnover verified and received by Manager upon completion.',
                        'payment_date' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } elseif ($existingPayments->isEmpty()) {
                    DB::table('payment')->insert([
                        'booking_id' => $bookingId,
                        'booking_price' => $totalServicePrice,
                        'unit_price' => 0.00,
                        'spare_parts_price' => 0.00,
                        'amount_paid' => $totalServicePrice,
                        'payment_status' => 'Paid',
                        'payment_method' => $turnoverMethod,
                        'payment_type' => 'Service Payment',
                        'reference_number' => $turnoverRef,
                        'notes' => 'Payment recorded upon completion and verified by Manager.',
                        'payment_date' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('payment')
                ->where('booking_id', $bookingId)
                ->where('payment_status', '!=', 'Returned')
                ->update([
                    'payment_status' => 'Paid',
                    'updated_at' => now(),
                ]);

            $this->logActivity(
                (int) $request->user()->user_id,
                'COMPLETE_BOOKING',
                sprintf(
                    'Verified payment turnover (₱%.2f via %s) and declared Booking #%d as Completed (Requested by: %s).',
                    (float) $turnedOverAmount,
                    $turnoverMethod,
                    $bookingId,
                    trim($validated['requested_by_name'])
                )
            );
        });

        app(\App\Services\ForecastingService::class)->generateCustomerForecastForBooking($bookingId);

        // Once this booking is completed (checklist completed + payment turned over + booking completed),
        // automatically start the next eligible present scheduled booking for the assigned technicians.
        self::syncAutoStartForTechnicians(self::getAssignedTechnicianIdsForBooking($booking));

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return [
            'message' => 'Payment turnover verified, booking declared Completed, and post-service forecasting activated.',
            'data' => $this->mapBookings(collect([$updated]))->first(),
        ];
    }

    /**
     * Return all assigned technician IDs for a booking.
     */
    public static function getAssignedTechnicianIdsForBooking(object $booking): array
    {
        $ids = array_values(array_unique(array_filter([
            ! empty($booking->lead_technician_id) ? (int) $booking->lead_technician_id : null,
            ! empty($booking->assistant_technician_id) ? (int) $booking->assistant_technician_id : null,
            ! empty($booking->assigned_tech_id) ? (int) $booking->assigned_tech_id : null,
        ])));

        if (empty($ids) && ! empty($booking->assigned_team_id)) {
            $ids = DB::table('technician_team_members')
                ->where('team_id', (int) $booking->assigned_team_id)
                ->pluck('technician_id')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }

        return $ids;
    }

    /**
     * Evaluate whether an Approved/Dispatched booking can automatically start right now:
     * 1) Its scheduled date must be present (today or earlier).
     * 2) Any recent/earlier or currently active booking assigned to its technicians must have:
     *    - Tools & Materials Checklist completed (status = 'Completed')
     *    - Collected payment turned over to Manager
     *    - Booking marked Completed (booking_status = 'Completed')
     */
    public static function evaluateBookingAutoStart(object $booking): array
    {
        $schedCarbon = ! empty($booking->scheduled_date) ? Carbon::parse($booking->scheduled_date) : null;
        $isScheduledDatePresent = $schedCarbon ? $schedCarbon->copy()->startOfDay()->lte(now()->startOfDay()) : false;

        $techIds = self::getAssignedTechnicianIdsForBooking($booking);
        if (empty($techIds)) {
            return [
                'is_scheduled_date_present' => $isScheduledDatePresent,
                'blocking_booking_id' => null,
                'can_auto_start' => false,
            ];
        }

        $teamIds = DB::table('technician_team_members')
            ->whereIn('technician_id', $techIds)
            ->pluck('team_id')
            ->unique()
            ->values()
            ->all();

        $bookingId = (int) $booking->booking_id;

        $otherBookings = DB::table('bookings')
            ->where('booking_id', '!=', $bookingId)
            ->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Completed'])
            ->where(function ($q) use ($techIds, $teamIds) {
                $q->whereIn('lead_technician_id', $techIds)
                    ->orWhereIn('assistant_technician_id', $techIds)
                    ->orWhereIn('assigned_tech_id', $techIds);

                if (! empty($teamIds)) {
                    $q->orWhere(function ($teamQuery) use ($teamIds) {
                        $teamQuery->whereNull('lead_technician_id')
                            ->whereNull('assistant_technician_id')
                            ->whereNull('assigned_tech_id')
                            ->whereIn('assigned_team_id', $teamIds);
                    });
                }
            })
            ->orderBy('scheduled_date')
            ->orderBy('booking_id')
            ->get([
                'booking_id',
                'booking_status',
                'scheduled_date',
                'service_details',
            ]);

        if ($otherBookings->isEmpty()) {
            return [
                'is_scheduled_date_present' => $isScheduledDatePresent,
                'blocking_booking_id' => null,
                'can_auto_start' => $isScheduledDatePresent,
            ];
        }

        $otherIds = $otherBookings->pluck('booking_id')->all();
        $latestChecklists = DB::table('tool_checklists')
            ->whereIn('booking_id', $otherIds)
            ->orderByDesc('checklist_id')
            ->get(['checklist_id', 'booking_id', 'status'])
            ->groupBy('booking_id')
            ->map(fn ($items) => $items->first());

        $blockingBookingId = null;

        foreach ($otherBookings as $other) {
            $otherDetails = ! empty($other->service_details)
                ? (is_string($other->service_details) ? (json_decode($other->service_details, true) ?: []) : (array) $other->service_details)
                : [];

            $otherSched = ! empty($other->scheduled_date) ? Carbon::parse($other->scheduled_date) : null;

            $isCurrentlyActive = ($other->booking_status === 'In-Progress')
                || (! empty($otherDetails['job_started_by_tech']) && $other->booking_status !== 'Completed');

            $isPrecedingSchedule = $otherSched && $schedCarbon && (
                $otherSched->lt($schedCarbon)
                || ($otherSched->equalTo($schedCarbon) && (int) $other->booking_id < $bookingId)
            );

            if (! $isCurrentlyActive && ! $isPrecedingSchedule) {
                continue;
            }

            $latestCl = $latestChecklists->get($other->booking_id);
            $wasStartedInWorkflow = ! empty($otherDetails['job_started_by_tech']);

            $isBookingCompleted = $other->booking_status === 'Completed';
            $isChecklistCompleted = $latestCl
                ? ($latestCl->status === 'Completed')
                : (! $wasStartedInWorkflow && $isBookingCompleted);
            $isPaymentTurnedOver = ! empty($otherDetails['payment_turnover'])
                || (! $wasStartedInWorkflow && $isBookingCompleted);

            if (! $isBookingCompleted || ! $isChecklistCompleted || ! $isPaymentTurnedOver) {
                $blockingBookingId = (int) $other->booking_id;
                break;
            }
        }

        return [
            'is_scheduled_date_present' => $isScheduledDatePresent,
            'blocking_booking_id' => $blockingBookingId,
            'can_auto_start' => $isScheduledDatePresent && $blockingBookingId === null,
        ];
    }

    /**
     * Synchronize auto-started state in chronological order for all Approved/Dispatched bookings
     * involving the given technician IDs.
     */
    public static function syncAutoStartForTechnicians(array $technicianIds): void
    {
        $techIds = array_values(array_unique(array_filter(array_map('intval', $technicianIds))));
        if (empty($techIds)) {
            return;
        }

        $teamIds = DB::table('technician_team_members')
            ->whereIn('technician_id', $techIds)
            ->pluck('team_id')
            ->unique()
            ->values()
            ->all();

        $candidates = DB::table('bookings')
            ->whereIn('booking_status', ['Approved', 'Dispatched'])
            ->where(function ($q) use ($techIds, $teamIds) {
                $q->whereIn('lead_technician_id', $techIds)
                    ->orWhereIn('assistant_technician_id', $techIds)
                    ->orWhereIn('assigned_tech_id', $techIds);

                if (! empty($teamIds)) {
                    $q->orWhere(function ($teamQuery) use ($teamIds) {
                        $teamQuery->whereNull('lead_technician_id')
                            ->whereNull('assistant_technician_id')
                            ->whereNull('assigned_tech_id')
                            ->whereIn('assigned_team_id', $teamIds);
                    });
                }
            })
            ->orderBy('scheduled_date')
            ->orderBy('booking_id')
            ->get();

        foreach ($candidates as $candidate) {
            $eval = self::evaluateBookingAutoStart($candidate);
            $details = ! empty($candidate->service_details)
                ? (is_string($candidate->service_details) ? (json_decode($candidate->service_details, true) ?: []) : (array) $candidate->service_details)
                : [];

            if ($eval['can_auto_start']) {
                if (empty($details['job_started_by_tech'])) {
                    $details['job_started_by_tech'] = true;
                    $details['job_started_at'] = $details['job_started_at'] ?? now()->toISOString();

                    DB::table('bookings')
                        ->where('booking_id', $candidate->booking_id)
                        ->update([
                            'service_details' => json_encode($details),
                            'updated_at' => now(),
                        ]);
                }

                $leadTechId = (int) ($candidate->lead_technician_id ?: ($candidate->assigned_tech_id ?: $techIds[0]));
                $existingReport = DB::table('service_reports')->where('booking_id', $candidate->booking_id)->first();
                if (! $existingReport) {
                    DB::table('service_reports')->insert([
                        'booking_id' => $candidate->booking_id,
                        'technician_id' => $leadTechId,
                        'job_started_at' => now(),
                        'status' => 'In-Progress',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            } elseif (! empty($details['job_started_by_tech'])) {
                unset($details['job_started_by_tech'], $details['job_started_at']);
                DB::table('bookings')
                    ->where('booking_id', $candidate->booking_id)
                    ->update([
                        'service_details' => json_encode($details),
                        'updated_at' => now(),
                    ]);
            }
        }
    }
}
