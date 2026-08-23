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
    ];

    protected const STAFF_ROLE_IDS = [2, 3, 4, 5];

    protected const BOOKING_ASSIGNABLE_STATUSES = ['Approved', 'Dispatched'];

    protected const INVENTORY_ITEM_TYPES = ['Tool', 'Material', 'Spare Part'];

    protected const INVENTORY_MODES = ['worker', 'sale'];

    protected const TOOL_SUBTYPES = ['power', 'hand'];

    protected const AC_TYPES = ['Window', 'Split', 'Cassette', 'Floor Mounted', 'Ceiling Suspended'];

    // Added 'Sold' to AC_STATUSES
    protected const AC_STATUSES = ['Available', 'Reserved', 'Installed', 'Order Base', 'Defect', 'Sold'];

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

    protected function bookingsBaseQuery()
    {
        return DB::table('bookings')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->leftJoin('users as technicians', 'technicians.user_id', '=', 'bookings.assigned_tech_id')
            ->leftJoin('payment', 'payment.booking_id', '=', 'bookings.booking_id')
            ->select([
                'bookings.booking_id',
                'bookings.client_id',
                'bookings.assigned_tech_id',
                'bookings.scheduled_date',
                'bookings.booking_status',
                'bookings.created_at',
                'services.service_id',
                'services.service_name',
                'services.base_price',
                'payment.payment_status',
                'payment.payment_method',
                'payment.amount_paid',
                'payment.payment_date',
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
            ]);
    }

    protected function salesRecordsBaseQuery()
    {
        return DB::table('bookings')
            ->join('users as clients', 'clients.user_id', '=', 'bookings.client_id')
            ->join('services', 'services.service_id', '=', 'bookings.service_id')
            ->leftJoin('payment', 'payment.booking_id', '=', 'bookings.booking_id')
            ->leftJoin('customer_feedback_and_ratings as feedback', 'feedback.booking_id', '=', 'bookings.booking_id')
            ->select([
                'bookings.booking_id',
                'bookings.scheduled_date',
                'bookings.booking_status',
                'bookings.created_at',
                'services.service_name',
                'payment.amount_paid',
                'payment.payment_method',
                'payment.payment_status',
                'payment.payment_date',
                'feedback.rating',
                'feedback.feedback',
                'clients.given_name as client_given_name',
                'clients.middle_name as client_middle_name',
                'clients.last_name as client_last_name',
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
            ->where('users.role_id', 5)
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
                'role' => self::ROLE_LABELS[(int) $row->role_id] ?? ($row->role_name ?? 'Staff'),
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
                'status' => ((int) $row->is_active === 0) ? 'Archived' : 'Active',
                'certificate_expiry' => $row->certificate_expiry,
                'specialties' => $specialties,
            ];
        })->values();
    }

    protected function mapBookings(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            return [
                'booking_id' => (int) $row->booking_id,
                'client_id' => (int) $row->client_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'client_address' => $row->client_address,
                'client_contact_number' => $row->client_contact_number,
                'client_email' => $row->client_email,
                'service_id' => (int) $row->service_id,
                'service' => $row->service_name,
                'service_base_price' => (float) $row->base_price,
                'assigned_tech_id' => $row->assigned_tech_id ? (int) $row->assigned_tech_id : null,
                'assigned_tech_name' => $row->tech_user_id ? $this->formatName($row->tech_given_name, $row->tech_middle_name, $row->tech_last_name) : null,
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'created_at' => $row->created_at,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_method' => $row->payment_method,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : null,
                'payment_date' => $row->payment_date,
            ];
        })->values();
    }

    protected function mapSalesRecords(Collection $rows): Collection
    {
        return $rows->map(function ($row) {
            return [
                'booking_id' => (int) $row->booking_id,
                'client_name' => $this->formatName($row->client_given_name, $row->client_middle_name, $row->client_last_name),
                'service' => $row->service_name,
                'scheduled_date' => $row->scheduled_date,
                'booking_status' => $row->booking_status,
                'amount_paid' => $row->amount_paid !== null ? (float) $row->amount_paid : 0.0,
                'payment_method' => $row->payment_method,
                'payment_status' => $row->payment_status ?? 'Pending',
                'payment_date' => $row->payment_date,
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
                'revenue' => (float) $matches->sum(function ($row) {
                    return (float) data_get($row, 'amount_paid', 0);
                }),
            ];
        })->values();
    }

    protected function buildMonthlyRevenueSeries(Collection $records): Collection
    {
        return collect(range(11, 0))->map(function (int $monthsAgo) use ($records) {
            $month = now()->startOfMonth()->subMonths($monthsAgo);
            $matches = $records->filter(function ($record) use ($month) {
                $paymentDate = $record['payment_date'] ?? null;

                if (! $paymentDate) {
                    return false;
                }

                return Carbon::parse($paymentDate)->format('Y-m') === $month->format('Y-m');
            });

            return [
                'month' => $month->format('M'),
                'year_month' => $month->format('Y-m'),
                'revenue' => (float) $matches->sum('amount_paid'),
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
            'status' => $item->status ?? 'Available',
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
        $status = $item->status ?? ($qty === 0 ? 'Out of Stock' : ($qty <= $reorder ? 'Low Stock' : 'Available'));

        return [
            'part_id' => (int) $item->item_id,
            'item_id' => (int) $item->item_id,
            'part_name' => $item->item_name,
            'item_name' => $item->item_name,
            'item_type' => $item->item_type,
            'compatible_brands' => $brands,
            'quantity_on_hand' => $qty,
            'initial_stock' => $item->initial_stock !== null ? (int) $item->initial_stock : $qty,
            'reorder_level' => $reorder,
            'unit' => $item->unit,
            'capital' => $capital,
            'selling_price' => $sellingPrice,
            'profit' => $profit,
            'supplier' => $item->supplier_name,
            'supplier_name' => $item->supplier_name,
            'status' => $status,
            'added_at' => $item->created_at ?? $item->last_updated,
            'last_updated' => $item->last_updated,
            'low_stock' => $qty <= $reorder,
        ];
    }

    // ─── Staff / Technician Helpers ───

    protected function manageableStaffRow(int $userId): object
    {
        $staff = DB::table('users')->where('user_id', $userId)->whereIn('role_id', self::STAFF_ROLE_IDS)->first();

        if (! $staff) {
            abort(404);
        }

        return $staff;
    }

    protected function syncTechnicianRelations(int $userId, int $roleId, ?string $certificateExpiry, ?array $specialtyIds): void
    {
        if ($roleId !== 5) {
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
}
