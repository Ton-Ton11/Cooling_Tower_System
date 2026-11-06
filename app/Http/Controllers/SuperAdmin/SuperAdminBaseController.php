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

    protected const AC_MOTOR_TYPES = ['Inverter', 'Non-Inverter'];

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
            ->leftJoinSub($this->latestFeedbackSubquery(), 'feedback', function ($join) {
                $join->on('feedback.booking_id', '=', 'bookings.booking_id');
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
                'service_reports.parts_replaced as service_report_parts_replaced',
                'service_reports.ac_brand as service_report_ac_brand',
                'service_reports.ac_type as service_report_ac_type',
                'service_reports.recommendations as service_report_remarks',
                'service_reports.job_started_at',
                'service_reports.job_completed_at',
                'feedback.rating',
                'feedback.feedback as feedback_text',
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
                    'role_id' => (int) $tech->role_id,
                    'role_name' => $tech->role_name ?? 'Technician',
                    'given_name' => $tech->given_name,
                    'middle_name' => $tech->middle_name,
                    'last_name' => $tech->last_name,
                    'full_name' => $this->formatName($tech->given_name, $tech->middle_name, $tech->last_name),
                    'certificate_expiry' => $tech->certificate_expiry,
                ];
            })
            ->values();
    }

    protected function adminAssistantsCollection(): Collection
    {
        return $this->staffBaseQuery()
            ->where('users.role_id', 3)
            ->where(function ($query) {
                $query->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })
            ->orderBy('users.last_name')
            ->get()
            ->map(function ($staff) {
                return [
                    'user_id' => (int) $staff->user_id,
                    'role_id' => (int) $staff->role_id,
                    'role_name' => $staff->role_name ?? 'Admin Assistant',
                    'given_name' => $staff->given_name,
                    'middle_name' => $staff->middle_name,
                    'last_name' => $staff->last_name,
                    'full_name' => $this->formatName($staff->given_name, $staff->middle_name, $staff->last_name),
                ];
            })
            ->values();
    }

    protected function unitOrdersCollection(): Collection
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('ac_unit_orders')) {
            return collect();
        }

        return DB::table('ac_unit_orders as o')
            ->join('users as c', 'c.user_id', '=', 'o.client_id')
            ->join('ac_units_inventory as u', 'u.ac_unit_id', '=', 'o.ac_unit_id')
            ->select([
                'o.*',
                'c.given_name as client_given_name',
                'c.middle_name as client_middle_name',
                'c.last_name as client_last_name',
                'c.contact_number as client_contact_number',
                'c.address as client_address',
                'u.brand as unit_brand',
                'u.model as unit_model',
                'u.serial_number as unit_serial_number',
                'u.horsepower as unit_horsepower',
                'u.ac_type as unit_ac_type',
                'u.motor_type as unit_motor_type',
                'u.image_path as unit_image_path',
                'u.warranty_period as unit_warranty_period',
            ])
            ->orderByDesc('o.order_id')
            ->get()
            ->map(function ($o) {
                return [
                    'order_id' => (int) $o->order_id,
                    'ocular_booking_id' => $o->ocular_booking_id ? (int) $o->ocular_booking_id : null,
                    'installation_booking_id' => $o->installation_booking_id ? (int) $o->installation_booking_id : null,
                    'client_id' => (int) $o->client_id,
                    'client_name' => $this->formatName($o->client_given_name, $o->client_middle_name, $o->client_last_name),
                    'client_contact_number' => $o->contact_number ?: $o->client_contact_number,
                    'delivery_address' => $o->delivery_address ?: $o->client_address,
                    'ac_unit_id' => (int) $o->ac_unit_id,
                    'brand' => $o->unit_brand,
                    'model' => $o->unit_model,
                    'serial_number' => $o->unit_serial_number,
                    'horsepower' => (float) ($o->unit_horsepower ?? 0),
                    'ac_type' => $o->unit_ac_type,
                    'motor_type' => $o->unit_motor_type ?? 'Inverter',
                    'unit_image_url' => $o->unit_image_path ? asset('storage/' . $o->unit_image_path) : null,
                    'warranty_period' => (int) ($o->unit_warranty_period ?? 12),
                    'quantity' => (int) ($o->quantity ?? 1),
                    'unit_price' => (float) ($o->unit_price ?? 0),
                    'total_unit_price' => (float) ($o->total_unit_price ?? 0),
                    'down_payment_amount' => (float) ($o->down_payment_amount ?? 7000),
                    'remaining_unit_balance' => (float) ($o->remaining_unit_balance ?? 0),
                    'delivery_fee' => (float) ($o->delivery_fee ?? 0),
                    'installation_fee' => (float) ($o->installation_fee ?? 0),
                    'payment_method' => $o->payment_method,
                    'fulfillment_type' => $o->fulfillment_type,
                    'reference_number' => $o->reference_number,
                    'down_payment_receipt_url' => $o->down_payment_receipt_path ? asset('storage/' . $o->down_payment_receipt_path) : null,
                    'manager_receipt_url' => $o->manager_receipt_path ? asset('storage/' . $o->manager_receipt_path) : null,
                    'installation_fee_forfeited' => (bool) ($o->installation_fee_forfeited ?? false),
                    'order_status' => $o->order_status,
                    'confirmed_at' => $o->confirmed_at,
                    'notes' => $o->notes,
                    'created_at' => $o->created_at,
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

        $unitOrdersByInstall = collect();
        $unitOrdersById = collect();
        if (! empty($bookingIds) && \Illuminate\Support\Facades\Schema::hasTable('ac_unit_orders')) {
            $allOrders = $this->unitOrdersCollection();
            $unitOrdersByInstall = $allOrders->whereNotNull('installation_booking_id')->keyBy('installation_booking_id');
            $unitOrdersById = $allOrders->keyBy('order_id');
        }

        return $rows->map(function ($row) use ($latestChecklistByBooking, $unitOrdersByInstall, $unitOrdersById) {
            $leadId = $row->lead_technician_id ?? $row->assigned_tech_id ?? null;
            $leadName = $row->lead_tech_user_id
                ? $this->formatName($row->lead_tech_given_name, $row->lead_tech_middle_name, $row->lead_tech_last_name)
                : ($row->tech_user_id ? $this->formatName($row->tech_given_name, $row->tech_middle_name, $row->tech_last_name) : null);

            $assistantId = $row->assistant_technician_id ?? null;
            $assistantName = $row->assistant_tech_user_id
                ? $this->formatName($row->assistant_tech_given_name, $row->assistant_tech_middle_name, $row->assistant_tech_last_name)
                : null;

            $serviceDetails = [];
            if (! empty($row->service_details)) {
                $serviceDetails = is_string($row->service_details)
                    ? (json_decode($row->service_details, true) ?: [])
                    : (is_array($row->service_details) ? $row->service_details : []);
            }

            $isOcular = ((int) $row->service_id === 4)
                || stripos((string) ($row->service_name ?? ''), 'ocular') !== false
                || ! empty($serviceDetails['is_ocular_inspection']);
            $ocularPersonnel = is_array($serviceDetails['ocular_personnel'] ?? null) ? $serviceDetails['ocular_personnel'] : [];

            // Generate dynamic team name representing the assigned team or ocular inspection personnel
            $teamName = null;
            if (! empty($ocularPersonnel)) {
                $teamName = collect($ocularPersonnel)
                    ->map(fn ($p) => ($p['full_name'] ?? 'Staff') . (! empty($p['role_name']) ? " ({$p['role_name']})" : ''))
                    ->implode(', ');
            } elseif ($leadName && $assistantName) {
                $teamName = "{$leadName} & {$assistantName}";
            } elseif ($leadName) {
                $teamName = "{$leadName} (Lead)";
            } elseif (! empty($row->assigned_team_name)) {
                $teamName = $row->assigned_team_name;
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
            $linkedUnitOrder = $unitOrdersByInstall->get((int) $row->booking_id)
                ?? (! empty($serviceDetails['ac_unit_order_id']) ? $unitOrdersById->get((int) $serviceDetails['ac_unit_order_id']) : null);

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
                'is_ocular_inspection' => $isOcular,
                'ocular_personnel' => $ocularPersonnel,
                'inspection_status' => $serviceDetails['inspection_status'] ?? ($isOcular ? 'Pending Inspection' : null),
                'ac_unit_order' => $linkedUnitOrder,
                'assigned_tech_id' => $leadId ? (int) $leadId : null,
                'assigned_tech_name' => $leadName ?: (! empty($ocularPersonnel) ? ($ocularPersonnel[0]['full_name'] ?? null) : null),
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
                'service_payment_method' => $row->service_payment_method ?? ($isOcular ? 'Free' : 'Cash'),
                'service_details' => $serviceDetails,
                'units_data' => $unitsData,
                'quotation_data' => $quotationData,
                'notes' => $row->notes ?? null,
                'cancellation_reason' => $row->cancellation_reason ?? null,
                'created_at' => $row->created_at,
                'payment_status' => $row->payment_status ?? ($isOcular ? 'Free' : 'Pending'),
                'payment_method' => $row->payment_method ?? ($isOcular ? 'Free Service' : null),
                'reference_number' => $row->payment_reference_number ?? null,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : ($isOcular ? 0.0 : null),
                'payment_date' => $row->payment_date,
                'checklist_id' => $latestChecklist ? (int) $latestChecklist->checklist_id : null,
                'checklist_status' => $latestChecklist->status ?? null,
                'service_report' => $row->service_report_id ? [
                    'report_id' => (int) $row->service_report_id,
                    'status' => $row->service_report_status,
                    'diagnosis' => $row->service_report_diagnosis,
                    'work_done' => $row->service_report_work_done,
                    'parts_replaced' => $row->service_report_parts_replaced ?? null,
                    'ac_brand' => $row->service_report_ac_brand ?? null,
                    'ac_type' => $row->service_report_ac_type ?? null,
                    'remarks' => $row->service_report_remarks,
                    'job_started_at' => $row->job_started_at,
                    'job_completed_at' => $row->job_completed_at,
                ] : null,
                'payment_turnover' => $serviceDetails['payment_turnover'] ?? null,
                'requested_by_name' => $serviceDetails['requested_by_name'] ?? null,
                'rating' => isset($row->rating) && $row->rating !== null ? (int) $row->rating : null,
                'feedback' => $row->feedback_text ?? null,
                'manager_reports' => $serviceDetails['manager_reports'] ?? [],
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
        foreach ($salesByBookingId as $is) {
            if (! empty($is->sold_by)) {
                $userIdsToFetch->push((int) $is->sold_by);
            }
        }

        $staffUsers = DB::table('users')
            ->whereIn('role_id', [1, 2, 3])
            ->orWhereIn('user_id', $userIdsToFetch->filter()->unique())
            ->get(['user_id', 'given_name', 'middle_name', 'last_name', 'role_id'])
            ->keyBy('user_id');

        $defaultAdminAssistant = $staffUsers->firstWhere('role_id', 3);
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

            if ($amountPaid === 0.0 && ($amountTurnedOver > 0 || in_array($row->booking_status, ['Partially Completed', 'Completed'], true))) {
                $amountPaid = $totalCost > 0 ? $totalCost : ($amountTurnedOver + $downPaymentCredited);
            } elseif ($amountPaid === 0.0 && $invSale) {
                $amountPaid = (float) $invSale->total_amount;
            }

            // Managed by / Sold by
            $managedUser = null;
            $isForSaleRecord = in_array($saleType, ['tools_materials', 'ac_unit', 'spare_part'], true)
                || $invSale !== null
                || str_starts_with($serviceName, 'Retail Sale:')
                || str_starts_with($serviceName, 'AC Unit Sale:')
                || str_starts_with($serviceName, 'Spare Part Sale:');

            if ($isForSaleRecord) {
                // Admin Assistants are in charge of for-sale tools & materials, spare parts, and AC units
                $soldById = $invSale->sold_by ?? null;
                if ($soldById && isset($staffUsers[$soldById]) && (int) $staffUsers[$soldById]->role_id === 3) {
                    $managedUser = $staffUsers[$soldById];
                } elseif (! empty($row->assigned_by) && isset($staffUsers[$row->assigned_by]) && (int) $staffUsers[$row->assigned_by]->role_id === 3) {
                    $managedUser = $staffUsers[$row->assigned_by];
                } elseif ($defaultAdminAssistant) {
                    $managedUser = $defaultAdminAssistant;
                } elseif ($soldById && isset($staffUsers[$soldById])) {
                    $managedUser = $staffUsers[$soldById];
                } elseif (! empty($row->assigned_by) && isset($staffUsers[$row->assigned_by])) {
                    $managedUser = $staffUsers[$row->assigned_by];
                } elseif (! empty($invSale->sold_by_name)) {
                    $managedUser = (object) [
                        'given_name' => $invSale->sold_by_name,
                        'middle_name' => null,
                        'last_name' => '',
                        'role_id' => 3,
                    ];
                } elseif ($defaultManager) {
                    $managedUser = $defaultManager;
                }
            } else {
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
            }

            $managedByName = $managedUser
                ? $this->formatName($managedUser->given_name, $managedUser->middle_name ?? null, $managedUser->last_name)
                : ($invSale->sold_by_name ?? ($isForSaleRecord ? 'Juan Mercado' : 'Super Admin'));
            $managedByRole = $managedUser
                ? (self::ROLE_LABELS[(int) $managedUser->role_id] ?? ($isForSaleRecord ? 'Admin Assistant' : 'Manager'))
                : ($isForSaleRecord ? 'Admin Assistant' : 'Manager');
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
                'payment_status' => $row->payment_status ?? (in_array($row->booking_status, ['Partially Completed', 'Completed'], true) ? 'Paid' : ($invSale->payment_status ?? 'Pending')),
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
            'managed_by' => $item->managed_by ?? (($item->inventory_mode ?? '') === 'sale' ? 'Juan Mercado' : null),
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

        $isTool = strtolower($item->item_type ?? '') === 'tool';
        $rawSubtype = strtolower((string) ($item->tool_subtype ?? ''));
        $normalizedSubtype = $isTool ? (str_contains($rawSubtype, 'power') ? 'power' : 'hand') : ($item->tool_subtype ?? null);

        return [
            'item_id' => (int) $item->item_id,
            'item_name' => $item->item_name,
            'item_type' => $item->item_type,
            'inventory_mode' => $item->inventory_mode ?? 'worker',
            'tool_subtype' => $normalizedSubtype,
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
            'managed_by' => $item->managed_by ?? (($item->inventory_mode ?? '') === 'sale' ? 'Juan Mercado' : null),
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

        $serviceRow = DB::table('services')->where('service_id', $booking->service_id)->first(['service_name']);
        $isOcularInspection = ((int) $booking->service_id === 4)
            || ($serviceRow && stripos((string) $serviceRow->service_name, 'ocular') !== false)
            || ! empty($serviceDetails['is_ocular_inspection']);

        if ($isOcularInspection && ! in_array($targetStatus, ['Approved', 'Reschedule Notice'], true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'booking_status' => ['For Ocular Inspection bookings, only Reschedule Notice and Approve can be declared.'],
            ]);
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

        // CASE 2B: Ocular Inspection Approval — Assign 1 to 4 personnel (Technician and/or Admin Assistant)
        if ($isOcularInspection) {
            $rawPersonnelIds = $request->input('ocular_personnel_ids');
            if (is_string($rawPersonnelIds)) {
                $rawPersonnelIds = json_decode($rawPersonnelIds, true) ?: [];
            }
            if (! is_array($rawPersonnelIds) || empty($rawPersonnelIds)) {
                $rawPersonnelIds = array_filter([
                    $payload['lead_technician_id'] ?? null,
                    $payload['assistant_technician_id'] ?? null,
                ]);
            }

            $personnelIds = array_values(array_unique(array_filter(array_map('intval', $rawPersonnelIds))));
            if (count($personnelIds) < 1 || count($personnelIds) > 4) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'ocular_personnel_ids' => ['Please assign a minimum of 1 and a maximum of 4 personnel (Technician and/or Admin Assistant) for the Ocular Inspection.'],
                ]);
            }

            $staffRows = DB::table('users')
                ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
                ->whereIn('users.user_id', $personnelIds)
                ->whereIn('users.role_id', [3, 5, 7])
                ->where(function ($q) {
                    $q->whereNull('users.is_active')->orWhere('users.is_active', 1);
                })
                ->get([
                    'users.user_id',
                    'users.role_id',
                    'users.given_name',
                    'users.middle_name',
                    'users.last_name',
                    'roles.role_name',
                ])
                ->keyBy('user_id');

            if ($staffRows->count() !== count($personnelIds)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'ocular_personnel_ids' => ['One or more selected personnel are invalid or inactive. Only active Technicians and Admin Assistants can be assigned.'],
                ]);
            }

            $schedCarbon = $booking->scheduled_date ? Carbon::parse($booking->scheduled_date) : now();
            $targetDateYmd = $schedCarbon->format('Y-m-d');
            if ($schedCarbon->isSunday()) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'booking_status' => ["Booking #{$bookingId} is scheduled on a Sunday ({$targetDateYmd}), which is a worker rest day. Please send a Reschedule Notice instead."],
                ]);
            }

            $ocularPersonnel = [];
            $assignedTechIds = [];
            foreach ($personnelIds as $pid) {
                $st = $staffRows->get($pid);
                $roleId = (int) $st->role_id;
                $roleLabel = $roleId === 3 ? 'Admin Assistant' : ($st->role_name ?: 'Technician');
                $ocularPersonnel[] = [
                    'user_id' => (int) $st->user_id,
                    'full_name' => $this->formatName($st->given_name, $st->middle_name, $st->last_name),
                    'role_id' => $roleId,
                    'role_name' => $roleLabel,
                ];
                if (in_array($roleId, [5, 7], true)) {
                    $assignedTechIds[] = (int) $st->user_id;
                }
            }

            $leadTechId = $assignedTechIds[0] ?? null;
            $assistantTechId = $assignedTechIds[1] ?? null;

            unset(
                $serviceDetails['payment_due_at'],
                $serviceDetails['reschedule_notice_by_manager'],
                $serviceDetails['reschedule_notice_original_date'],
                $serviceDetails['reschedule_notice_blocked_period'],
                $serviceDetails['job_started_by_tech'],
                $serviceDetails['job_started_at']
            );
            $serviceDetails['is_ocular_inspection'] = true;
            $serviceDetails['ocular_personnel'] = $ocularPersonnel;
            if (empty($serviceDetails['inspection_status'])) {
                $serviceDetails['inspection_status'] = 'Pending Inspection';
            }

            DB::table('bookings')
                ->where('booking_id', $bookingId)
                ->update([
                    'lead_technician_id' => $leadTechId,
                    'assistant_technician_id' => $assistantTechId,
                    'assigned_tech_id' => $leadTechId,
                    'assigned_team_id' => null,
                    'assigned_by' => $currentUserId,
                    'assigned_at' => now(),
                    'booking_status' => 'Approved',
                    'service_details' => json_encode($serviceDetails),
                    'updated_at' => now(),
                ]);

            if (! empty($assignedTechIds)) {
                self::syncAutoStartForTechnicians($assignedTechIds);
            }

            $personnelSummary = collect($ocularPersonnel)
                ->map(fn ($p) => "{$p['full_name']} ({$p['role_name']})")
                ->implode(', ');

            $this->logActivity(
                $currentUserId,
                'APPROVE_OCULAR_INSPECTION',
                sprintf('Approved Ocular Inspection #%d and assigned %d personnel: %s.', $bookingId, count($ocularPersonnel), $personnelSummary)
            );

            $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

            return [
                'message' => 'Ocular Inspection approved and personnel assigned! Assigned Technician / Admin Assistant can now create a tools-only checklist.',
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

        if (($serviceDetails['payment_turnover']['status'] ?? '') === 'Invalid' || ! empty($serviceDetails['payment_turnover']['is_invalid'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'payment_turnover' => ['This payment turnover was marked Invalid. The technician must edit and resubmit the turnover first.'],
            ]);
        }

        $linkedOrder = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('ac_unit_orders')) {
            $linkedOrder = DB::table('ac_unit_orders')
                ->where('installation_booking_id', $bookingId)
                ->orWhere(function ($q) use ($serviceDetails) {
                    if (! empty($serviceDetails['ac_unit_order_id'])) {
                        $q->where('order_id', (int) $serviceDetails['ac_unit_order_id']);
                    }
                })
                ->first();
        }

        $validated = $request->validate([
            'requested_by_name' => ['nullable', 'string', 'max:255'],
            'payment_verified' => ['nullable'],
            'amount_turned_over' => ['nullable', 'numeric', 'min:0'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'installation_fee' => ['nullable', 'numeric', 'min:0'],
            'verification_notes' => ['nullable', 'string', 'max:1000'],
            'purchase_receipt_image' => [
                $linkedOrder && empty($linkedOrder->manager_receipt_path) ? 'required' : 'nullable',
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:8192',
            ],
        ], [
            'purchase_receipt_image.required' => 'Please upload a picture of the purchase receipt to confirm that the customer successfully bought the AC unit.',
        ]);

        $receiptPath = null;
        if ($request->hasFile('purchase_receipt_image')) {
            $receiptPath = $request->file('purchase_receipt_image')->store('receipts/unit_purchases', 'public');
        }

        $clientUser = DB::table('users')->where('user_id', $booking->client_id)->first(['given_name', 'middle_name', 'last_name', 'contact_number', 'address']);
        $defaultClientName = $clientUser ? $this->formatName($clientUser->given_name, $clientUser->middle_name, $clientUser->last_name) : 'Customer';
        $requestedByName = ! empty(trim((string) ($validated['requested_by_name'] ?? '')))
            ? trim((string) $validated['requested_by_name'])
            : ($serviceDetails['requested_by_name'] ?? $defaultClientName);

        $turnover = $serviceDetails['payment_turnover'] ?? [];
        $turnover['verified_by_manager'] = true;
        $turnover['verified_by_user_id'] = (int) $request->user()->user_id;
        $turnover['verified_at'] = now()->toISOString();
        $turnover['is_invalid'] = false;
        $turnover['invalid_reason'] = null;
        if (isset($validated['amount_turned_over']) && $validated['amount_turned_over'] !== null) {
            $turnover['amount_turned_over'] = (float) $validated['amount_turned_over'];
        }
        if (! empty($validated['verification_notes'])) {
            $turnover['verification_notes'] = $validated['verification_notes'];
        }

        $turnedOverAmount = isset($validated['amount_turned_over']) && $validated['amount_turned_over'] !== null
            ? (float) $validated['amount_turned_over']
            : (isset($turnover['net_collected']) ? (float) $turnover['net_collected'] : null);

        $totalServicePrice = (float) ($validated['installation_fee'] ?? ($turnover['total_service_price'] ?? ($booking->base_price ?? 0.0)));
        $downPayment = (float) ($turnover['reservation_down_payment'] ?? 300.00);
        $deliveryFee = (float) ($validated['delivery_fee'] ?? ($turnover['delivery_fee'] ?? ($linkedOrder->delivery_fee ?? 0.0)));

        if ($turnedOverAmount === null) {
            $unitRem = $linkedOrder ? (float) ($turnover['unit_remaining_balance'] ?? $linkedOrder->remaining_unit_balance ?? 0.0) : 0.0;
            $turnedOverAmount = max(0.0, ($totalServicePrice - $downPayment) + $unitRem + $deliveryFee);
        }

        $turnover['amount_turned_over'] = $turnedOverAmount;
        $turnover['delivery_fee'] = $deliveryFee;
        $turnover['status'] = 'Turnover Verified & Booking Completed';
        $turnoverMethod = $turnover['payment_method'] ?? ($booking->service_payment_method ?? 'Cash');
        $turnoverRef = $turnover['reference_number'] ?? null;
        if ($totalServicePrice <= 0 && $turnedOverAmount > 0 && ! $linkedOrder) {
            $totalServicePrice = $turnedOverAmount + $downPayment;
            $turnover['total_service_price'] = $totalServicePrice;
        }

        if ($receiptPath) {
            $serviceDetails['unit_purchase_receipt_path'] = $receiptPath;
            $serviceDetails['unit_purchase_receipt_url'] = asset('storage/' . $receiptPath);
        }
        if ($linkedOrder) {
            $serviceDetails['company_supplied_unit'] = true;
            $serviceDetails['unit_purchase_confirmed_at'] = now()->toISOString();
        }

        $serviceDetails['payment_turnover'] = $turnover;
        $serviceDetails['requested_by_name'] = $requestedByName;
        $serviceDetails['completed_by_manager_at'] = now()->toISOString();

        $finalBookingStatus = $linkedOrder ? 'Completed' : 'Partially Completed';

        DB::transaction(function () use (
            $bookingId,
            $booking,
            $serviceDetails,
            $requestedByName,
            $request,
            $turnedOverAmount,
            $totalServicePrice,
            $downPayment,
            $deliveryFee,
            $turnoverMethod,
            $turnoverRef,
            $linkedOrder,
            $receiptPath,
            $finalBookingStatus,
            $clientUser,
            $defaultClientName
        ) {
            DB::table('bookings')
                ->where('booking_id', $bookingId)
                ->update([
                    'booking_status' => $finalBookingStatus,
                    'service_order_status' => $linkedOrder ? 'Completed' : ($booking->service_order_status ?? 'Completed'),
                    'service_details' => json_encode($serviceDetails),
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . sprintf(
                        '[Manager Completion]: Payment turnover verified (₱%.2f via %s)%s. Service requested by: %s.',
                        (float) $turnedOverAmount,
                        $turnoverMethod,
                        $linkedOrder ? ' & AC Unit Purchase confirmed with receipt' : '',
                        $requestedByName
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

            $hasReservationRow = $existingPayments->contains(function ($p) {
                $type = strtolower($p->payment_type ?? '');
                return str_contains($type, 'reservation') || str_contains($type, 'appointment');
            });

            $effectivePaymentAmount = $hasReservationRow ? (float) $turnedOverAmount : (float) max($totalServicePrice, $turnedOverAmount + $downPayment);

            $turnoverPayment = $existingPayments->first(function ($p) {
                $type = strtolower($p->payment_type ?? '');
                return str_contains($type, 'turnover') || str_contains($type, 'balance');
            });

            if ($turnoverPayment) {
                DB::table('payment')
                    ->where('payment_id', $turnoverPayment->payment_id)
                    ->update([
                        'amount_paid' => $effectivePaymentAmount,
                        'booking_price' => $totalServicePrice,
                        'unit_price' => $linkedOrder ? (float) $linkedOrder->unit_price : (float) ($turnoverPayment->unit_price ?? 0),
                        'payment_status' => 'Paid',
                        'payment_method' => $turnoverMethod,
                        'reference_number' => $turnoverRef ?: $turnoverPayment->reference_number,
                        'receipt_image' => $receiptPath ?: $turnoverPayment->receipt_image,
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
                            'amount_paid' => $effectivePaymentAmount,
                            'booking_price' => $totalServicePrice,
                            'unit_price' => $linkedOrder ? (float) $linkedOrder->unit_price : 0.00,
                            'payment_status' => 'Paid',
                            'payment_method' => $turnoverMethod,
                            'reference_number' => $turnoverRef ?: $zeroOrPendingPayment->reference_number,
                            'receipt_image' => $receiptPath ?: $zeroOrPendingPayment->receipt_image,
                            'payment_type' => 'Service Balance Turnover Payment',
                            'notes' => 'Post-service payment turnover verified and received by Manager.',
                            'payment_date' => now(),
                            'updated_at' => now(),
                        ]);
                } elseif ($effectivePaymentAmount > 0) {
                    DB::table('payment')->insert([
                        'booking_id' => $bookingId,
                        'booking_price' => $totalServicePrice,
                        'unit_price' => $linkedOrder ? (float) $linkedOrder->unit_price : 0.00,
                        'spare_parts_price' => 0.00,
                        'amount_paid' => $effectivePaymentAmount,
                        'payment_status' => 'Paid',
                        'payment_method' => $turnoverMethod,
                        'payment_type' => 'Service Balance Turnover Payment',
                        'reference_number' => $turnoverRef,
                        'receipt_image' => $receiptPath,
                        'notes' => 'Post-service payment turnover verified and received by Manager upon completion.',
                        'payment_date' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } elseif ($existingPayments->isEmpty()) {
                    DB::table('payment')->insert([
                        'booking_id' => $bookingId,
                        'booking_price' => $totalServicePrice,
                        'unit_price' => $linkedOrder ? (float) $linkedOrder->unit_price : 0.00,
                        'spare_parts_price' => 0.00,
                        'amount_paid' => $totalServicePrice,
                        'payment_status' => 'Paid',
                        'payment_method' => $turnoverMethod,
                        'payment_type' => 'Service Payment',
                        'reference_number' => $turnoverRef,
                        'receipt_image' => $receiptPath,
                        'notes' => 'Payment recorded upon completion and verified by Manager.',
                        'payment_date' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('payment')
                ->where('booking_id', $bookingId)
                ->whereNotIn('payment_status', ['Returned', 'Non-Refundable'])
                ->update([
                    'payment_status' => 'Paid',
                    'updated_at' => now(),
                ]);

            if ($linkedOrder) {
                $this->finalizeAcUnitPurchaseSale(
                    $linkedOrder,
                    $bookingId,
                    (int) $request->user()->user_id,
                    $this->formatName($request->user()->given_name ?? '', $request->user()->middle_name ?? '', $request->user()->last_name ?? '') ?: 'Manager',
                    $receiptPath ?: $linkedOrder->manager_receipt_path,
                    $deliveryFee,
                    $totalServicePrice,
                    $turnoverMethod,
                    $defaultClientName,
                    $clientUser->contact_number ?? $linkedOrder->contact_number,
                    $linkedOrder->delivery_address ?: ($clientUser->address ?? null)
                );
            }

            $this->logActivity(
                (int) $request->user()->user_id,
                'COMPLETE_BOOKING',
                sprintf(
                    'Verified payment turnover (₱%.2f via %s)%s and declared Booking #%d as Completed (Requested by: %s).',
                    (float) $turnedOverAmount,
                    $turnoverMethod,
                    $linkedOrder ? ' + confirmed AC unit purchase with receipt' : '',
                    $bookingId,
                    $requestedByName
                )
            );
        });

        $forecasting = app(\App\Services\ForecastingService::class);
        if ($linkedOrder) {
            $forecasting->activateAcUnitWarrantyForecast((int) $linkedOrder->ac_unit_id, [
                'customer_name' => $defaultClientName,
                'customer_contact' => $clientUser->contact_number ?? $linkedOrder->contact_number,
                'warranty_start_date' => now()->toDateString(),
            ]);
        }
        $forecasting->generateCustomerForecastForBooking($bookingId);

        // Once this booking is completed (checklist completed + payment turned over + booking completed),
        // automatically start the next eligible present scheduled booking for the assigned technicians.
        self::syncAutoStartForTechnicians(self::getAssignedTechnicianIdsForBooking($booking));

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return [
            'message' => $linkedOrder
                ? 'AC unit purchase confirmed with receipt, reflected to Admin Assistant, warranty & spare parts reservation activated, and booking declared Completed!'
                : 'Payment turnover verified, recorded to Sales & Records, and booking declared Completed!',
            'data' => $this->mapBookings(collect([$updated]))->first(),
        ];
    }

    /**
     * Finalize an AC Unit Order sale so it marks ac_units_inventory as Sold and inserts/updates inventory_sales
     * (immediately reflecting to Admin Assistant Sold Units & Sales Records).
     */
    protected function finalizeAcUnitPurchaseSale(
        object $order,
        ?int $bookingId,
        int $managerId,
        string $managerName,
        ?string $receiptPath,
        float $deliveryFee,
        float $installationFee,
        string $paymentMethod,
        string $customerName,
        ?string $customerContact,
        ?string $customerAddress
    ): void {
        $acUnit = DB::table('ac_units_inventory')->where('ac_unit_id', $order->ac_unit_id)->first();
        if (! $acUnit) {
            return;
        }

        $unitPrice = (float) ($order->unit_price ?: ($acUnit->selling_price ?: $acUnit->purchase_price));
        $costPrice = (float) ($acUnit->purchase_price ?? 0);
        $profit = round($unitPrice - $costPrice, 2);

        DB::table('ac_unit_orders')
            ->where('order_id', $order->order_id)
            ->update([
                'manager_receipt_path' => $receiptPath,
                'delivery_fee' => $deliveryFee,
                'installation_fee' => $installationFee,
                'remaining_unit_balance' => 0.00,
                'order_status' => 'Completed',
                'confirmed_by' => $managerId,
                'confirmed_at' => now(),
                'updated_at' => now(),
            ]);

        DB::table('ac_units_inventory')
            ->where('ac_unit_id', $acUnit->ac_unit_id)
            ->update([
                'status' => 'Sold',
                'selling_price' => $unitPrice,
                'customer_name' => $customerName,
                'customer_contact' => $customerContact,
                'sold_at' => now(),
                'updated_at' => now(),
            ]);

        if (\Illuminate\Support\Facades\Schema::hasTable('inventory_sales')) {
            $existingSale = DB::table('inventory_sales')
                ->where('sale_type', 'ac_unit')
                ->where('ac_unit_id', $acUnit->ac_unit_id)
                ->first();

            $salePayload = [
                'booking_id' => $bookingId ?: $order->ocular_booking_id,
                'sale_type' => 'ac_unit',
                'ac_unit_id' => $acUnit->ac_unit_id,
                'item_name' => trim("{$acUnit->brand} {$acUnit->model}"),
                'brand' => $acUnit->brand,
                'model' => $acUnit->model,
                'serial_number' => $acUnit->serial_number,
                'sub_category' => $acUnit->ac_type,
                'motor_type' => $acUnit->motor_type ?? 'Inverter',
                'item_type' => 'AC Unit',
                'horsepower' => (string) $acUnit->horsepower,
                'quantity' => 1,
                'unit' => 'unit',
                'cost_price' => $costPrice,
                'unit_price' => $unitPrice,
                'total_amount' => $unitPrice,
                'profit' => $profit,
                'payment_method' => $paymentMethod ?: ($order->payment_method ?: 'Cash'),
                'payment_status' => 'Paid',
                'client_id' => (int) $order->client_id,
                'customer_name' => $customerName,
                'customer_contact' => $customerContact,
                'customer_address' => $customerAddress,
                'warranty_period' => max(1, (int) ($acUnit->warranty_period ?: 12)),
                'sold_by' => $managerId,
                'sold_by_name' => $managerName,
                'notes' => sprintf(
                    'Confirmed AC Unit Purchase (Order #%d, Fulfillment: %s%s)',
                    $order->order_id,
                    str_replace('_', ' & ', ucfirst((string) $order->fulfillment_type)),
                    $deliveryFee > 0 ? sprintf(', Delivery Fee: ₱%.2f', $deliveryFee) : ''
                ),
                'sold_at' => now(),
                'updated_at' => now(),
            ];

            if ($existingSale) {
                DB::table('inventory_sales')->where('sale_id', $existingSale->sale_id)->update($salePayload);
            } else {
                $salePayload['created_at'] = now();
                DB::table('inventory_sales')->insert($salePayload);
            }
        }
    }

    /**
     * Confirm a standalone Pick Up or Delivery AC Unit Order with Manager receipt upload.
     */
    protected function handleConfirmUnitOrderAction(Request $request, int $orderId): array
    {
        $order = DB::table('ac_unit_orders')->where('order_id', $orderId)->first();
        if (! $order) {
            abort(404);
        }

        if ($order->order_status === 'Completed') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'order_id' => ['This AC unit order has already been confirmed and completed.'],
            ]);
        }

        $validated = $request->validate([
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'verification_notes' => ['nullable', 'string', 'max:1000'],
            'purchase_receipt_image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:8192'],
        ], [
            'purchase_receipt_image.required' => 'Please upload a picture of the receipt to confirm that the customer successfully bought the AC unit.',
        ]);

        $receiptPath = $request->file('purchase_receipt_image')->store('receipts/unit_purchases', 'public');
        $clientUser = DB::table('users')->where('user_id', $order->client_id)->first(['given_name', 'middle_name', 'last_name', 'contact_number', 'address']);
        $clientName = $clientUser ? $this->formatName($clientUser->given_name, $clientUser->middle_name, $clientUser->last_name) : 'Customer';
        $managerId = (int) $request->user()->user_id;
        $managerName = $this->formatName($request->user()->given_name ?? '', $request->user()->middle_name ?? '', $request->user()->last_name ?? '') ?: 'Manager';
        $deliveryFee = $order->fulfillment_type === 'delivery'
            ? (float) ($validated['delivery_fee'] ?? ($order->delivery_fee ?? 0.0))
            : 0.0;

        DB::transaction(function () use (
            $order,
            $managerId,
            $managerName,
            $receiptPath,
            $deliveryFee,
            $clientName,
            $clientUser,
            $validated
        ) {
            $this->finalizeAcUnitPurchaseSale(
                $order,
                $order->ocular_booking_id ? (int) $order->ocular_booking_id : null,
                $managerId,
                $managerName,
                $receiptPath,
                $deliveryFee,
                0.00,
                $order->payment_method ?: 'Cash',
                $clientName,
                $order->contact_number ?: ($clientUser->contact_number ?? null),
                $order->delivery_address ?: ($clientUser->address ?? null)
            );

            if ($order->ocular_booking_id) {
                $remPaid = (float) ($order->remaining_unit_balance ?? 0) + $deliveryFee;
                DB::table('payment')->insert([
                    'booking_id' => (int) $order->ocular_booking_id,
                    'booking_price' => $deliveryFee,
                    'unit_price' => (float) $order->unit_price,
                    'spare_parts_price' => 0.00,
                    'amount_paid' => $remPaid,
                    'payment_status' => 'Paid',
                    'payment_method' => $order->payment_method ?: 'Cash',
                    'payment_type' => $order->fulfillment_type === 'delivery'
                        ? 'AC Unit Full Balance & Delivery Fee'
                        : 'AC Unit Full Balance (Pick Up)',
                    'receipt_image' => $receiptPath,
                    'notes' => trim(($validated['verification_notes'] ?? '') . " Confirmed by {$managerName}."),
                    'payment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('payment')
                    ->where('booking_id', (int) $order->ocular_booking_id)
                    ->whereNotIn('payment_status', ['Returned', 'Non-Refundable'])
                    ->update(['payment_status' => 'Paid', 'updated_at' => now()]);

                DB::table('bookings')
                    ->where('booking_id', (int) $order->ocular_booking_id)
                    ->whereNotIn('booking_status', ['Cancelled'])
                    ->update([
                        'booking_status' => 'Completed',
                        'service_order_status' => 'Completed',
                        'updated_at' => now(),
                    ]);
            }

            $this->logActivity(
                $managerId,
                'CONFIRM_UNIT_ORDER_PURCHASE',
                sprintf(
                    'Confirmed AC Unit Order #%d (%s) for %s with uploaded receipt (Delivery fee: ₱%.2f).',
                    $order->order_id,
                    $order->fulfillment_type,
                    $clientName,
                    $deliveryFee
                )
            );
        });

        $forecasting = app(\App\Services\ForecastingService::class);
        $forecasting->activateAcUnitWarrantyForecast((int) $order->ac_unit_id, [
            'customer_name' => $clientName,
            'customer_contact' => $order->contact_number ?: ($clientUser->contact_number ?? null),
            'warranty_start_date' => now()->toDateString(),
        ]);
        if ($order->ocular_booking_id) {
            $forecasting->generateCustomerForecastForBooking((int) $order->ocular_booking_id);
        }

        return [
            'message' => 'AC unit purchase confirmed with receipt! Unit reflected as Sold to Admin Assistant, customer notified, and warranty + spare parts reservation activated.',
            'unit_orders' => $this->unitOrdersCollection(),
        ];
    }

    /**
     * Mark technician's submitted turnover payment as Invalid with a reason so the technician can edit and resubmit.
     */
    protected function handleInvalidateTurnoverAction(Request $request, int $bookingId): array
    {
        $booking = DB::table('bookings')->where('booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        $validated = $request->validate([
            'invalid_reason' => ['required', 'string', 'min:2', 'max:1000'],
        ], [
            'invalid_reason.required' => 'Please enter a reason why the turnover payment is invalid.',
        ]);

        $serviceDetails = ! empty($booking->service_details)
            ? (is_string($booking->service_details) ? (json_decode($booking->service_details, true) ?: []) : (array) $booking->service_details)
            : [];

        if (empty($serviceDetails['payment_turnover'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'payment_turnover' => ['No payment turnover has been submitted for this booking yet.'],
            ]);
        }

        $reason = trim($validated['invalid_reason']);
        $serviceDetails['payment_turnover']['status'] = 'Invalid';
        $serviceDetails['payment_turnover']['is_invalid'] = true;
        $serviceDetails['payment_turnover']['invalid_reason'] = $reason;
        $serviceDetails['payment_turnover']['invalidated_at'] = now()->toISOString();
        $serviceDetails['payment_turnover']['invalidated_by_user_id'] = (int) $request->user()->user_id;

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'service_details' => json_encode($serviceDetails),
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . sprintf(
                    '[Manager Invalidated Turnover]: Marked turnover as Invalid. Reason: %s',
                    $reason
                )),
                'updated_at' => now(),
            ]);

        $this->logActivity(
            (int) $request->user()->user_id,
            'INVALIDATE_TURNOVER',
            sprintf('Marked payment turnover for Booking #%d as Invalid. Reason: %s', $bookingId, $reason)
        );

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return [
            'message' => 'Turnover marked as Invalid. The technician has been notified to edit and resubmit.',
            'data' => $this->mapBookings(collect([$updated]))->first(),
        ];
    }

    /**
     * Submit a Manager Report regarding a Completed booking to the Super Admin (creates staff message & notification).
     */
    protected function handleReportBookingAction(Request $request, int $bookingId): array
    {
        $booking = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        if (! $booking) {
            abort(404);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'min:2', 'max:160'],
            'details' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $sender = $request->user();
        $senderId = (int) $sender->user_id;
        $senderName = $this->formatName($sender->given_name ?? '', $sender->middle_name ?? '', $sender->last_name ?? '') ?: 'Manager';

        $mappedBooking = $this->mapBookings(collect([$booking]))->first();
        $clientName = $mappedBooking['client_name'] ?? 'Customer';
        $serviceName = $mappedBooking['service'] ?? 'Service';
        $teamName = $mappedBooking['assigned_team_name'] ?? ($mappedBooking['lead_technician_name'] ?? 'Assigned Team');

        $subjectLine = sprintf('Booking #%d Report: %s', $bookingId, trim($validated['subject']));
        $bodyText = sprintf(
            "Booking #%d (%s — Client: %s | Team: %s)\nReported by %s:\n%s",
            $bookingId,
            $serviceName,
            $clientName,
            $teamName,
            $senderName,
            trim($validated['details'])
        );

        if (! \Illuminate\Support\Facades\Schema::hasTable('staff_messages')) {
            \Illuminate\Support\Facades\Schema::create('staff_messages', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id('message_id');
                $table->unsignedBigInteger('sender_id')->index();
                $table->unsignedBigInteger('recipient_id')->nullable()->index();
                $table->string('subject', 160)->nullable();
                $table->text('body');
                $table->boolean('is_read')->default(false);
                $table->timestamps();
            });
        }

        $superAdmins = DB::table('users')->where('role_id', 1)->pluck('user_id')->all();
        if (empty($superAdmins)) {
            DB::table('staff_messages')->insert([
                'sender_id' => $senderId,
                'recipient_id' => null,
                'subject' => mb_substr($subjectLine, 0, 160),
                'body' => $bodyText,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            foreach ($superAdmins as $saId) {
                DB::table('staff_messages')->insert([
                    'sender_id' => $senderId,
                    'recipient_id' => (int) $saId,
                    'subject' => mb_substr($subjectLine, 0, 160),
                    'body' => $bodyText,
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $rawBooking = DB::table('bookings')->where('booking_id', $bookingId)->first();
        $serviceDetails = ! empty($rawBooking->service_details)
            ? (is_string($rawBooking->service_details) ? (json_decode($rawBooking->service_details, true) ?: []) : (array) $rawBooking->service_details)
            : [];

        $reports = $serviceDetails['manager_reports'] ?? [];
        $reports[] = [
            'subject' => trim($validated['subject']),
            'details' => trim($validated['details']),
            'reported_by_user_id' => $senderId,
            'reported_by_name' => $senderName,
            'reported_at' => now()->toISOString(),
        ];
        $serviceDetails['manager_reports'] = $reports;

        DB::table('bookings')
            ->where('booking_id', $bookingId)
            ->update([
                'service_details' => json_encode($serviceDetails),
                'updated_at' => now(),
            ]);

        $this->logActivity(
            $senderId,
            'MANAGER_REPORT_TO_SUPERADMIN',
            sprintf('Submitted report to Super Admin for Booking #%d (%s): %s', $bookingId, trim($validated['subject']), trim($validated['details']))
        );

        $updated = $this->bookingsBaseQuery()->where('bookings.booking_id', $bookingId)->first();

        return [
            'message' => 'Report submitted! The Super Admin has been notified and received your message.',
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
            ->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Partially Completed', 'Completed'])
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
                || (! empty($otherDetails['job_started_by_tech']) && ! in_array($other->booking_status, ['Partially Completed', 'Completed'], true));

            $isPrecedingSchedule = $otherSched && $schedCarbon && (
                $otherSched->lt($schedCarbon)
                || ($otherSched->equalTo($schedCarbon) && (int) $other->booking_id < $bookingId)
            );

            if (! $isCurrentlyActive && ! $isPrecedingSchedule) {
                continue;
            }

            $latestCl = $latestChecklists->get($other->booking_id);
            $wasStartedInWorkflow = ! empty($otherDetails['job_started_by_tech']);

            $isBookingCompleted = in_array($other->booking_status, ['Partially Completed', 'Completed'], true);
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
