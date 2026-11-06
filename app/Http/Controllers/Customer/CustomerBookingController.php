<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Shared\LocationAutocompleteController;
use App\Models\Booking;
use App\Models\Brand;
use App\Models\CustomerUnitDetail;
use App\Models\DisabledBookingDate;
use App\Models\Payment;
use App\Models\RescheduleBooking;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerBookingController extends Controller
{
    /**
     * Ensure the 4 primary customer-facing services exist in the database.
     */
    public static function ensurePrimaryServicesExist(): void
    {
        $primaryServices = [
            1 => [
                'service_name' => 'Installation',
                'description' => 'For new air-conditioning unit installation, replacement, or relocation.',
                'base_price' => 0.00,
                'category' => 'Installation',
                'display_order' => 1,
                'is_active' => true,
            ],
            2 => [
                'service_name' => 'Repair / Check-up',
                'description' => 'For air-conditioning problems, troubleshooting, inspection, diagnosis, and repair requests.',
                'base_price' => 0.00,
                'category' => 'Repair',
                'display_order' => 2,
                'is_active' => true,
            ],
            3 => [
                'service_name' => 'Cleaning / Preventive Maintenance',
                'description' => 'For regular cleaning, deep cleaning, and preventive maintenance of your air-conditioning unit.',
                'base_price' => 0.00,
                'category' => 'Maintenance',
                'display_order' => 3,
                'is_active' => true,
            ],
            4 => [
                'service_name' => 'Ocular Inspection',
                'description' => 'Free site and room thermal load inspection with AC unit recommendations for customers planning to buy and install AC units.',
                'base_price' => 0.00,
                'category' => 'Ocular Inspection',
                'display_order' => 4,
                'is_active' => true,
            ],
        ];

        // 1. Re-map any bookings referencing legacy service IDs to 1, 2, 3 (preserving 4 = Ocular Inspection)
        DB::table('bookings')->whereIn('service_id', [6, 7, 14])->update(['service_id' => 1]);
        DB::table('bookings')->whereIn('service_id', [5, 8, 15])->update(['service_id' => 2]);
        DB::table('bookings')->whereIn('service_id', [16])->update(['service_id' => 3]);

        // 2. Remove any services outside 1, 2, 3, 4 (preserve internal AC Unit Sale service if present)
        DB::table('services')
            ->whereNotIn('service_id', [1, 2, 3, 4])
            ->where('service_name', 'not like', 'AC Unit Sale%')
            ->delete();

        // 3. Upsert IDs 1, 2, 3, 4 with primary definitions
        foreach ($primaryServices as $id => $ps) {
            DB::table('services')->updateOrInsert(
                ['service_id' => $id],
                array_merge($ps, [
                    'updated_at' => now(),
                ])
            );
        }
    }

    /**
     * Determine whether a booking model or record represents an Ocular Inspection.
     */
    public static function isOcularBooking($booking, ?string $serviceName = null): bool
    {
        if (! $booking) {
            return false;
        }
        $serviceId = (int) ($booking->service_id ?? 0);
        if ($serviceId === 4) {
            return true;
        }
        $resolvedName = $serviceName ?? ($booking->service_name ?? ($booking->service->service_name ?? ''));
        if ($resolvedName && stripos((string) $resolvedName, 'ocular') !== false) {
            return true;
        }
        $details = is_array($booking->service_details ?? null)
            ? $booking->service_details
            : (is_string($booking->service_details ?? null) ? (json_decode($booking->service_details, true) ?: []) : []);

        return ! empty($details['is_ocular_inspection']);
    }

    /**
     * Get available customer service categories.
     */
    public function services(): JsonResponse
    {
        static::ensurePrimaryServicesExist();

        $services = Service::whereIn('service_name', [
            'Installation',
            'Repair / Check-up',
            'Cleaning / Preventive Maintenance',
            'Ocular Inspection',
        ])
        ->orderBy('display_order')
        ->get();

        return response()->json([
            'data' => $services,
        ]);
    }

    /**
     * Get dynamic customer catalog (4 customer services, 9 visual unit types, brands, capacities, and policy).
     */
    public function catalog(): JsonResponse
    {
        static::ensurePrimaryServicesExist();

        $services = Service::whereIn('service_name', [
            'Installation',
            'Repair / Check-up',
            'Cleaning / Preventive Maintenance',
            'Ocular Inspection',
        ])
        ->orderBy('display_order')
        ->get();

        $unitTypes = [
            [
                'id' => 1,
                'name' => 'Wall-Mounted Split Type',
                'code' => 'Wall-Mounted Split Type',
                'description' => 'Common residential and small commercial split-type unit.',
                'icon' => 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
            ],
            [
                'id' => 2,
                'name' => 'Window Type',
                'code' => 'Window Type',
                'description' => 'Self-contained air-conditioning unit installed in a window or wall opening.',
                'icon' => 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
            ],
            [
                'id' => 3,
                'name' => 'Floor-Mounted',
                'code' => 'Floor-Mounted',
                'description' => 'Floor-standing air-conditioning unit.',
                'icon' => 'M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
            ],
            [
                'id' => 4,
                'name' => 'Ceiling Cassette',
                'code' => 'Ceiling Cassette',
                'description' => 'Ceiling-mounted cassette type air-conditioning unit.',
                'icon' => 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
            ],
            [
                'id' => 5,
                'name' => 'Ceiling Suspended',
                'code' => 'Ceiling Suspended',
                'description' => 'Ceiling-suspended air-conditioning unit.',
                'icon' => 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8',
            ],
            [
                'id' => 6,
                'name' => 'Ducted / Concealed',
                'code' => 'Ducted / Concealed',
                'description' => 'Air-conditioning system with concealed indoor unit and ductwork.',
                'icon' => 'M3 7h18M3 12h18M3 17h18',
            ],
            [
                'id' => 7,
                'name' => 'Central / Package Unit',
                'code' => 'Central / Package Unit',
                'description' => 'Larger centralized or packaged air-conditioning system.',
                'icon' => 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
            ],
            [
                'id' => 8,
                'name' => 'VRF / VRV System',
                'code' => 'VRF / VRV System',
                'description' => 'Multi-unit air-conditioning system commonly used in commercial buildings.',
                'icon' => 'M4 4h7v7H4V4zm9 0h7v7h-7V4zm0 9h7v7h-7v-7zm-9 0h7v7H4v-7z',
            ],
            [
                'id' => 9,
                'name' => 'Other / Not Sure',
                'code' => 'Other / Not Sure',
                'description' => "I’m not sure what type of unit I have.",
                'icon' => 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            ],
        ];

        $dbBrands = Brand::where('is_active', true)
            ->where('name', '!=', 'Other Brand')
            ->where('name', '!=', 'Other')
            ->where('name', '!=', 'Others')
            ->orderBy('display_order')
            ->orderBy('name')
            ->pluck('name')
            ->toArray();

        $brands = !empty($dbBrands) ? $dbBrands : [
            'Carrier',
            'Daikin',
            'Panasonic',
            'LG',
            'Mitsubishi',
            'Samsung',
            'Midea',
            'Kolin',
            'York',
            'Haier',
            'AUX',
            'Everest',
            'Mitsubishi Heavy Ind.',
        ];

        $capacities = [
            'hp' => ['0.5 HP', '0.75 HP', '1.0 HP', '1.5 HP', '2.0 HP', '2.5 HP', '3.0 HP', '4.0 HP', '5.0 HP', 'Not Sure'],
            'commercial' => ['1.0 TR', '1.5 TR', '2.0 TR', '2.5 TR', '3.0 TR', '4.0 TR', '5.0 TR', '10.0+ TR', 'BTU Capacity', 'Not Sure'],
        ];

        $motorTypes = [
            'Inverter',
            'Non-Inverter',
            'Not Sure',
        ];

        $policy = [
            'fee_name' => 'Appointment Reservation Fee',
            'amount' => 300.00,
            'reschedule_fee' => 150.00,
            'unit_down_payment' => 7000.00,
            'default_delivery_fee' => 500.00,
            'allowed_cancellation_hours' => 24,
            'gcash_account' => '0917-123-4567',
            'gcash_name' => 'Cooling Tower Airconditioning Services',
            'bank_name' => 'BDO Unibank',
            'bank_account_number' => '0042-8891-2045',
            'bank_account_name' => 'Cooling Tower Airconditioning Services',
            'notice' => 'An appointment reservation fee is required to secure your requested service schedule. Your reservation fee is separate from the final service quotation.',
            'terms' => [
                'Service Request Only: This booking is an initial service request and schedule reservation. Final service charges will be determined by assessment and an official quotation.',
                'Reservation Fee Separation: The ₱300.00 reservation fee is strictly for reserving your schedule and is not the full service price.',
                'Fee Crediting: If your service proceeds, the reservation fee may be credited toward your final service bill based on company policy.',
                'Cancellation Policy: Cancellations made at least 24 hours prior to the appointment are eligible for rescheduling or refund.',
                'Rescheduling Policy: Rescheduling requested within the allowed window transfers the reservation fee to your new schedule.',
                'Late Cancellation / No-Show: Late cancellations (under 24 hours) or customer no-shows may forfeit the reservation fee to cover administrative costs.',
                'Company Cancellation: If the service appointment is rescheduled or cancelled by the company due to emergencies or weather, your booking and fee are fully protected.',
            ],
        ];

        return response()->json([
            'services' => $services,
            'unit_types' => $unitTypes,
            'brands' => $brands,
            'capacities' => $capacities,
            'motor_types' => $motorTypes,
            'policy' => $policy,
            'schedule_config' => $this->getScheduleConfig(),
        ]);
    }

    /**
     * Automatically cancel bookings in 'Payment Incomplete' status whose 10-minute deadline has expired,
     * and mark their reservation payment status as 'Returned'.
     */
    public static function autoExpireIncompletePayments(): void
    {
        $expiredBookings = Booking::with('payments')
            ->where('booking_status', 'Payment Incomplete')
            ->get();

        foreach ($expiredBookings as $booking) {
            $details = is_array($booking->service_details) ? $booking->service_details : [];
            $dueAtStr = $details['payment_due_at'] ?? null;
            $dueAt = $dueAtStr ? Carbon::parse($dueAtStr) : ($booking->updated_at ? $booking->updated_at->copy()->addMinutes(10) : now()->subMinute());

            if (now()->greaterThanOrEqualTo($dueAt)) {
                DB::transaction(function () use ($booking, $details) {
                    $details['payment_expired_at'] = now()->toISOString();
                    $details['payment_returned'] = true;

                    $booking->update([
                        'booking_status' => 'Cancelled',
                        'cancellation_reason' => 'Automatically cancelled: Incomplete payment was not completed within the 10-minute window. Payment returned.',
                        'service_details' => $details,
                        'updated_at' => now(),
                    ]);

                    DB::table('payment')
                        ->where('booking_id', $booking->booking_id)
                        ->update([
                            'payment_status' => 'Returned',
                            'notes' => 'Payment returned after 10-minute payment completion timeout.',
                            'updated_at' => now(),
                        ]);

                    DB::table('activity_logs')->insert([
                        'user_id' => $booking->client_id,
                        'action_type' => 'BOOKING_AUTO_CANCEL_PAYMENT_TIMEOUT',
                        'description' => "Booking #{$booking->booking_id} was automatically cancelled after the 10-minute payment completion timer expired. Payment status set to Returned.",
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
            }
        }
    }

    /**
     * List bookings belonging to the authenticated customer.
     */
    public function bookingsIndex(Request $request): JsonResponse
    {
        static::autoExpireIncompletePayments();
        $userId = (int) $request->user()->user_id;

        $query = Booking::with(['service', 'technician', 'team', 'payments', 'feedback', 'rescheduleBookings'])
            ->where('client_id', $userId)
            ->orderByDesc('created_at');

        if ($status = $request->string('status')->trim()->value()) {
            if ($status === 'Active') {
                $query->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress', 'Partially Completed', 'Payment Incomplete', 'Reschedule Notice']);
            } elseif ($status !== 'All') {
                $query->where('booking_status', $status);
            }
        }

        $bookingModels = $query->get();
        $bookingIds = $bookingModels->pluck('booking_id')->all();
        $serviceReports = ! empty($bookingIds)
            ? DB::table('service_reports')->whereIn('booking_id', $bookingIds)->get()->keyBy('booking_id')
            : collect();

        $ocularRoomsByBooking = (! empty($bookingIds) && DB::getSchemaBuilder()->hasTable('ocular_inspection_rooms'))
            ? DB::table('ocular_inspection_rooms')
                ->whereIn('booking_id', $bookingIds)
                ->orderBy('room_id')
                ->get()
                ->groupBy('booking_id')
            : collect();

        $ocularRecsByBooking = (! empty($bookingIds) && DB::getSchemaBuilder()->hasTable('ocular_inspection_recommendations'))
            ? DB::table('ocular_inspection_recommendations as r')
                ->leftJoin('ac_units_inventory as u', 'u.ac_unit_id', '=', 'r.ac_unit_id')
                ->whereIn('r.booking_id', $bookingIds)
                ->whereIn('r.status', ['Submitted', 'Selected'])
                ->select([
                    'r.*',
                    'u.brand as unit_brand',
                    'u.model as unit_model',
                    'u.horsepower as unit_horsepower',
                    'u.ac_type as unit_ac_type',
                    'u.motor_type as unit_motor_type',
                    'u.selling_price as unit_selling_price',
                    'u.purchase_price as unit_purchase_price',
                    'u.status as unit_current_status',
                    'u.image_path as unit_inventory_image_path',
                    'u.warranty_period as unit_warranty_period',
                ])
                ->orderBy('r.recommendation_id')
                ->get()
                ->groupBy('booking_id')
            : collect();

        $customerOrders = DB::getSchemaBuilder()->hasTable('ac_unit_orders')
            ? DB::table('ac_unit_orders as o')
                ->leftJoin('ac_units_inventory as u', 'u.ac_unit_id', '=', 'o.ac_unit_id')
                ->where('o.client_id', $userId)
                ->select([
                    'o.*',
                    'u.brand as unit_brand',
                    'u.model as unit_model',
                    'u.serial_number as unit_serial_number',
                    'u.horsepower as unit_horsepower',
                    'u.ac_type as unit_ac_type',
                    'u.motor_type as unit_motor_type',
                    'u.image_path as unit_image_path',
                    'u.status as unit_inventory_status',
                    'u.warranty_period as unit_warranty_period',
                ])
                ->orderByDesc('o.order_id')
                ->get()
                ->map(function ($o) {
                    return [
                        'order_id' => (int) $o->order_id,
                        'ocular_booking_id' => $o->ocular_booking_id ? (int) $o->ocular_booking_id : null,
                        'installation_booking_id' => $o->installation_booking_id ? (int) $o->installation_booking_id : null,
                        'recommendation_id' => $o->recommendation_id ? (int) $o->recommendation_id : null,
                        'ac_unit_id' => (int) $o->ac_unit_id,
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
                        'delivery_address' => $o->delivery_address,
                        'contact_number' => $o->contact_number,
                        'installation_fee_forfeited' => (bool) ($o->installation_fee_forfeited ?? false),
                        'order_status' => $o->order_status,
                        'confirmed_at' => $o->confirmed_at,
                        'notes' => $o->notes,
                        'brand' => $o->unit_brand,
                        'model' => $o->unit_model,
                        'serial_number' => $o->unit_serial_number,
                        'horsepower' => (float) ($o->unit_horsepower ?? 0),
                        'ac_type' => $o->unit_ac_type,
                        'motor_type' => $o->unit_motor_type ?? 'Inverter',
                        'unit_image_url' => $o->unit_image_path ? asset('storage/' . $o->unit_image_path) : null,
                        'warranty_period' => (int) ($o->unit_warranty_period ?? 12),
                        'created_at' => $o->created_at,
                    ];
                })
            : collect();

        $ordersByOcularBooking = $customerOrders->whereNotNull('ocular_booking_id')->groupBy('ocular_booking_id');
        $ordersByInstallBooking = $customerOrders->whereNotNull('installation_booking_id')->keyBy('installation_booking_id');
        $ordersById = $customerOrders->keyBy('order_id');

        $bookings = $bookingModels->map(function ($b) use ($serviceReports, $ocularRoomsByBooking, $ocularRecsByBooking, $ordersByOcularBooking, $ordersByInstallBooking, $ordersById) {
            $isOcular = static::isOcularBooking($b);
            $details = is_array($b->service_details) ? $b->service_details : [];
            $ocularPersonnel = is_array($details['ocular_personnel'] ?? null) ? $details['ocular_personnel'] : [];
            $inspectionStatus = $details['inspection_status'] ?? ($isOcular ? 'Pending Inspection' : null);

            $latestPay = $b->payments->sortByDesc('payment_id')->first();
            $reservationPay = $b->payments->firstWhere('payment_type', 'Appointment Reservation Fee')
                ?? $b->payments->sortBy('payment_id')->first();
            $report = $serviceReports->get($b->booking_id);
            $unitsList = is_array($b->units_data) ? $b->units_data : [];
            $totalUnitsCount = 0;
            if (! empty($unitsList)) {
                foreach ($unitsList as $u) {
                    $totalUnitsCount += max(1, (int) ($u['quantity'] ?? 1));
                }
            } else {
                $totalUnitsCount = 1;
            }

            $leadUser = $b->leadTechnician ?: $b->technician;
            $leadName = $leadUser ? trim("{$leadUser->given_name} {$leadUser->middle_name} {$leadUser->last_name}") : null;
            $assistantUser = $b->assistantTechnician;
            $assistantName = $assistantUser ? trim("{$assistantUser->given_name} {$assistantUser->middle_name} {$assistantUser->last_name}") : null;

            $assignedTeamName = null;
            if (! empty($ocularPersonnel)) {
                $assignedTeamName = collect($ocularPersonnel)
                    ->map(fn ($p) => ($p['full_name'] ?? 'Staff') . (! empty($p['role_name']) ? " ({$p['role_name']})" : ''))
                    ->implode(', ');
            } elseif ($leadName && $assistantName) {
                $assignedTeamName = "{$leadName} & {$assistantName}";
            } elseif ($leadName) {
                $assignedTeamName = "{$leadName} (Lead)";
            } elseif ($b->team?->team_name) {
                $assignedTeamName = $b->team->team_name;
            }

            $rooms = ($ocularRoomsByBooking->get($b->booking_id) ?? collect())->map(function ($rm) {
                return [
                    'room_id' => (int) $rm->room_id,
                    'room_name' => $rm->room_name,
                    'unit_of_measurement' => $rm->unit_of_measurement,
                    'room_length' => (float) $rm->room_length,
                    'room_width' => (float) $rm->room_width,
                    'ceiling_height' => (float) $rm->ceiling_height,
                    'room_category' => $rm->room_category,
                    'sun_exposure_level' => $rm->sun_exposure_level,
                    'maximum_occupancy' => (int) $rm->maximum_occupancy,
                    'window_size_glazing' => $rm->window_size_glazing,
                    'heat_generating_equipment' => (int) $rm->heat_generating_equipment,
                    'estimated_btu' => $rm->estimated_btu !== null ? (float) $rm->estimated_btu : null,
                    'estimated_hp' => $rm->estimated_hp !== null ? (float) $rm->estimated_hp : null,
                ];
            })->values()->all();

            $recommendations = ($ocularRecsByBooking->get($b->booking_id) ?? collect())->map(function ($rec) {
                $imgPath = $rec->unit_image_path ?: $rec->unit_inventory_image_path;
                $resolvedPrice = $rec->unit_price !== null
                    ? (float) $rec->unit_price
                    : (float) ($rec->unit_selling_price ?? $rec->unit_purchase_price ?? 0);

                return [
                    'recommendation_id' => (int) $rec->recommendation_id,
                    'room_id' => $rec->room_id ? (int) $rec->room_id : null,
                    'ac_unit_id' => $rec->ac_unit_id ? (int) $rec->ac_unit_id : null,
                    'recommended_capacity' => (float) $rec->recommended_capacity,
                    'recommended_ac_type' => $rec->recommended_ac_type,
                    'motor_type_recommendation' => $rec->motor_type_recommendation,
                    'brand_recommendation' => $rec->brand_recommendation,
                    'price_range_label' => $rec->price_range_label,
                    'model' => $rec->model ?: $rec->unit_model,
                    'inventory_status' => $rec->unit_current_status ?: $rec->inventory_status,
                    'unit_price' => $resolvedPrice,
                    'unit_image_url' => $imgPath ? asset('storage/' . $imgPath) : null,
                    'warranty_period' => (int) ($rec->unit_warranty_period ?? 12),
                    'notes' => $rec->notes,
                    'status' => $rec->status,
                ];
            })->values()->all();

            $linkedOrder = $ordersByInstallBooking->get($b->booking_id)
                ?? (! empty($details['ac_unit_order_id']) ? $ordersById->get((int) $details['ac_unit_order_id']) : null);
            $ocularOrders = ($ordersByOcularBooking->get($b->booking_id) ?? collect())->values()->all();

            return [
                'booking_id' => $b->booking_id,
                'client_id' => $b->client_id,
                'service_id' => $b->service_id,
                'service_name' => $b->service?->service_name ?? 'Aircon Service',
                'service_description' => $b->service?->description,
                'is_ocular_inspection' => $isOcular,
                'inspection_status' => $inspectionStatus,
                'ocular_personnel' => $ocularPersonnel,
                'ocular_rooms' => $rooms,
                'ocular_recommendations' => $recommendations,
                'ocular_orders' => $ocularOrders,
                'ac_unit_order' => $linkedOrder,
                'assigned_tech_id' => $b->lead_technician_id ?? $b->assigned_tech_id,
                'assigned_tech_name' => $leadName ?: (! empty($ocularPersonnel) ? ($ocularPersonnel[0]['full_name'] ?? null) : null),
                'lead_technician_id' => $b->lead_technician_id ?? $b->assigned_tech_id,
                'lead_technician_name' => $leadName,
                'assistant_technician_id' => $b->assistant_technician_id,
                'assistant_technician_name' => $assistantName,
                'assigned_team' => [
                    'lead' => $leadUser ? [
                        'user_id' => (int) $leadUser->user_id,
                        'name' => $leadName,
                        'role' => 'Lead Technician',
                    ] : null,
                    'assistant' => $assistantUser ? [
                        'user_id' => (int) $assistantUser->user_id,
                        'name' => $assistantName,
                        'role' => 'Assistant Technician',
                    ] : null,
                ],
                'assigned_tech_contact' => $leadUser?->contact_number,
                'assigned_team_id' => $b->assigned_team_id,
                'assigned_team_name' => $assignedTeamName,
                'scheduled_date' => $b->scheduled_date?->format('Y-m-d H:i:s'),
                'scheduled_date_formatted' => $b->scheduled_date ? $b->scheduled_date->format('M d, Y h:i A') : 'TBD',
                'alternative_schedule' => $b->alternative_schedule,
                'booking_status' => $b->booking_status,
                'quotation_status' => $b->quotation_status ?? 'Pending Assessment',
                'quotation_data' => $b->quotation_data,
                'service_order_status' => $b->service_order_status ?? 'Pending Quotation',
                'soa_data' => $b->soa_data,
                'policy_acknowledged' => (bool) $b->policy_acknowledged,
                'total_units_count' => $totalUnitsCount,
                'units_data' => $unitsList,
                'service_details' => $details,
                'payment_turnover' => $details['payment_turnover'] ?? null,
                'service_report' => $report ? [
                    'report_id' => $report->report_id,
                    'diagnosis' => $report->diagnosis,
                    'work_done' => $report->work_done,
                    'parts_replaced' => $report->parts_replaced,
                    'ac_brand' => $report->ac_brand,
                    'ac_type' => $report->ac_type,
                ] : null,
                'preferred_arrival_time' => $b->scheduled_date ? $b->scheduled_date->format('h:i A') : ($details['preferred_arrival_time'] ?? null),
                'rate_type' => $details['rate_type'] ?? null,
                'is_differential' => (bool) ($details['is_differential'] ?? false),
                'service_payment_method' => $b->service_payment_method ?? 'Cash',
                'cancellation_reason' => $b->cancellation_reason,
                'notes' => $b->notes,
                'created_at' => $b->created_at?->toISOString(),
                'created_at_formatted' => $b->created_at ? $b->created_at->format('M d, Y h:i A') : '',
                'payment_status' => $latestPay?->payment_status ?? ($isOcular ? 'Free' : 'Pending'),
                'payment_method' => $latestPay?->payment_method ?? ($isOcular ? 'Free Service' : 'GCash'),
                'booking_fee_paid' => $isOcular ? 0.0 : (float) ($reservationPay?->amount_paid ?? 300),
                'reference_number' => $reservationPay?->reference_number ?? $latestPay?->reference_number,
                'payments' => $b->payments->map(function ($p) {
                    return [
                        'payment_id' => $p->payment_id,
                        'payment_type' => $p->payment_type ?? 'Appointment Reservation Fee',
                        'amount_paid' => (float) $p->amount_paid,
                        'payment_method' => $p->payment_method,
                        'payment_status' => $p->payment_status,
                        'reference_number' => $p->reference_number,
                        'sender_name' => $p->sender_name,
                        'sender_number' => $p->sender_number,
                        'receipt_image' => $p->receipt_image ? asset('storage/' . $p->receipt_image) : null,
                        'payment_date' => $p->payment_date?->toISOString(),
                    ];
                }),
                'feedback' => $b->feedback ? [
                    'feedback_id' => $b->feedback->feedback_id,
                    'rating' => $b->feedback->rating,
                    'feedback' => $b->feedback->feedback,
                    'submitted_at' => $b->feedback->submitted_at?->toISOString(),
                ] : null,
                'is_rescheduled' => $b->rescheduleBookings->isNotEmpty(),
                'reschedules' => $b->rescheduleBookings->map(function ($r) {
                    return [
                        'reschedule_id' => $r->reschedule_id,
                        'previous_scheduled_date' => $r->previous_scheduled_date?->format('Y-m-d H:i:s'),
                        'previous_scheduled_date_formatted' => $r->previous_scheduled_date ? $r->previous_scheduled_date->format('M d, Y h:i A') : 'N/A',
                        'new_scheduled_date' => $r->new_scheduled_date?->format('Y-m-d H:i:s'),
                        'new_scheduled_date_formatted' => $r->new_scheduled_date ? $r->new_scheduled_date->format('M d, Y h:i A') : 'N/A',
                        'reason' => $r->reschedule_reason,
                        'fee' => (float) $r->reschedule_fee,
                        'status' => $r->status,
                        'created_at' => $r->created_at?->toISOString(),
                        'created_at_formatted' => $r->created_at ? $r->created_at->format('M d, Y h:i A') : '',
                    ];
                }),
            ];
        });

        return response()->json([
            'data' => $bookings,
            'unit_orders' => $customerOrders->values(),
            'schedule_config' => $this->getScheduleConfig(),
        ]);
    }

    /**
     * Store a newly created service booking request with GCash reservation fee.
     */
    public function storeBooking(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->user_id;

        // Auto-heal primary services in database and expire timed-out incomplete payments
        static::ensurePrimaryServicesExist();
        static::autoExpireIncompletePayments();

        // Resolve or fallback service_id intelligently if missing or non-existent
        $reqServiceId = (int) $request->input('service_id');
        if (! in_array($reqServiceId, [1, 2, 3, 4], true) || ! Service::where('service_id', $reqServiceId)->exists()) {
            $serviceDetails = $request->input('service_details');
            if (is_string($serviceDetails)) {
                $serviceDetails = json_decode($serviceDetails, true) ?: [];
            }
            $category = $serviceDetails['category'] ?? null;

            $resolvedId = match ($reqServiceId) {
                1, 6, 7, 14 => 1,
                2, 5, 8, 15 => 2,
                3, 16 => 3,
                4 => 4,
                default => null,
            };

            if (! $resolvedId && $category) {
                $resolvedId = match (true) {
                    str_contains(strtolower($category), 'ocular') => 4,
                    str_contains(strtolower($category), 'install') => 1,
                    str_contains(strtolower($category), 'repair') || str_contains(strtolower($category), 'check') => 2,
                    default => 3,
                };
            }

            $resolvedId = $resolvedId ?: 1;
            $request->merge(['service_id' => $resolvedId]);
        }

        $targetService = Service::find((int) $request->input('service_id'));
        $isOcularRequest = ((int) $request->input('service_id') === 4)
            || ($targetService && stripos((string) $targetService->service_name, 'ocular') !== false);

        $validated = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,service_id'],
            'ac_unit_order_id' => ['nullable', 'integer'],
            'units' => ['nullable'],
            'service_details' => ['nullable'],
            'aircon_brand' => ['nullable', 'string', 'max:100'],
            'aircon_type' => ['nullable', 'string', 'max:100'],
            'unit_quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'scheduled_date' => [
                'required',
                'date',
                function ($attribute, $value, $fail) {
                    try {
                        $parsed = Carbon::parse($value);
                        $now = Carbon::now(config('app.timezone', 'Asia/Manila'))->subMinutes(2);
                        if ($parsed->lt($now)) {
                            $fail('The scheduled date and arrival time cannot be in the past.');
                        }
                    } catch (\Exception $e) {
                        $fail('The scheduled date is not a valid date.');
                    }
                },
            ],
            'preferred_arrival_time' => ['nullable', 'string', 'max:50'],
            'rate_type' => ['nullable', 'string', 'max:50'],
            'is_differential' => ['nullable'],
            'alternative_schedule' => ['nullable', 'string', 'max:150'],
            'service_payment_method' => ['nullable', 'string', Rule::in(['Cash', 'GCash', 'Bank Transfer', 'Free'])],
            'booking_fee' => ['nullable', 'numeric', 'min:0'],
            'reference_number' => $isOcularRequest
                ? ['nullable', 'string', 'max:40']
                : ['required', 'string', 'min:5', 'max:13'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:11'],
            'notes' => ['nullable', 'string', 'max:1500'],
            'service_address' => [
                'nullable',
                'string',
                'max:1000',
                function ($attribute, $value, $fail) use ($user, $request) {
                    $effectiveAddress = trim((string) ($value ?: $user->address));
                    $lat = $request->filled('service_latitude') ? (float) $request->input('service_latitude') : null;
                    $lon = $request->filled('service_longitude') ? (float) $request->input('service_longitude') : null;
                    $eval = LocationAutocompleteController::evaluateGeospatialLocation($effectiveAddress, $lat, $lon);
                    if (! $eval['is_within_zamboanga_city']) {
                        $fail('This booking service is available within Zamboanga City only. Your forward-geocoded location (' . ($eval['detected_city'] ?: $effectiveAddress) . ') is outside Zamboanga City.');
                    }
                },
            ],
            'service_latitude' => ['nullable', 'numeric'],
            'service_longitude' => ['nullable', 'numeric'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'additional_contact_number' => ['nullable', 'string', 'max:11'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'repair_media' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,mp4,mov,webm', 'max:20480'],
            'policy_acknowledged' => ['nullable'],
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts', 'public');
        }

        $repairMediaPath = null;
        if ($request->hasFile('repair_media')) {
            $repairMediaPath = $request->file('repair_media')->store('repair_media', 'public');
        }

        $service = Service::findOrFail($validated['service_id']);
        $isOcularInspection = ((int) $service->service_id === 4) || stripos((string) $service->service_name, 'ocular') !== false;
        $bookingFee = $isOcularInspection
            ? 0.00
            : (isset($validated['booking_fee']) && (float) $validated['booking_fee'] > 0
                ? (float) $validated['booking_fee']
                : 300.00);

        // Parse units data
        $units = $request->input('units');
        if (is_string($units)) {
            $units = json_decode($units, true) ?: [];
        }
        if (! is_array($units)) {
            $units = [];
        }
        $allowedMotorTypes = ['Inverter', 'Non-Inverter', 'Not Sure'];
        $units = array_values(array_map(function ($u) use ($allowedMotorTypes) {
            if (! is_array($u)) {
                return [];
            }
            $motor = trim((string) ($u['motor_type'] ?? ''));
            $u['motor_type'] = in_array($motor, $allowedMotorTypes, true) ? $motor : 'Not Sure';
            return $u;
        }, array_filter($units, 'is_array')));

        // Parse service specific details
        $serviceDetails = $request->input('service_details');
        if (is_string($serviceDetails)) {
            $serviceDetails = json_decode($serviceDetails, true) ?: [];
        }
        if (! is_array($serviceDetails)) {
            $serviceDetails = [];
        }

        $firstUnit = $units[0] ?? null;
        $primaryBrand = $firstUnit['brand'] ?? $validated['aircon_brand'] ?? 'Carrier';
        if ($primaryBrand === 'Other' && ! empty($firstUnit['other_brand'])) {
            $primaryBrand = $firstUnit['other_brand'];
        }
        $primaryType = $firstUnit['unit_type'] ?? $validated['aircon_type'] ?? 'Wall-Mounted Split Type';
        $primaryMotorType = $firstUnit['motor_type'] ?? 'Not Sure';
        $serviceDetails['primary_motor_type'] = $primaryMotorType;
        $totalQuantity = 0;
        if (! empty($units)) {
            foreach ($units as $u) {
                $totalQuantity += max(1, (int) ($u['quantity'] ?? 1));
            }
        } else {
            $totalQuantity = max(1, (int) ($validated['unit_quantity'] ?? 1));
        }

        DB::beginTransaction();
        try {
            // 1. Update customer unit details & address
            CustomerUnitDetail::updateOrCreate(
                ['user_id' => $userId],
                [
                    'aircon_brand' => $primaryBrand,
                    'aircon_type' => $primaryType,
                    'unit_quantity' => $totalQuantity,
                ]
            );

            $updateData = [];
            if (! empty($validated['service_address']) && $validated['service_address'] !== $user->address) {
                $updateData['address'] = $validated['service_address'];
            }
            if (! empty($validated['contact_number']) && $validated['contact_number'] !== $user->contact_number) {
                $updateData['contact_number'] = $validated['contact_number'];
            }
            if (! empty($updateData)) {
                $updateData['updated_at'] = now();
                DB::table('users')->where('user_id', $userId)->update($updateData);
            }

            // 2. Validate Sunday rest day & 5-slot daily capacity before creating Booking
            $scheduledDateTime = Carbon::parse($validated['scheduled_date']);
            $targetDateYmd = $scheduledDateTime->format('Y-m-d');

            if ($scheduledDateTime->isSunday()) {
                throw ValidationException::withMessages([
                    'scheduled_date' => ['Bookings are not available on Sundays as it is a rest day for our workers. Please select a date from Monday to Saturday.'],
                ]);
            }

            // Check if date has been disabled by manager or super admin
            $disabledDateRecord = DisabledBookingDate::where('disabled_date', $targetDateYmd)->first();
            if ($disabledDateRecord) {
                $reasonText = $disabledDateRecord->reason ?: 'No operation / Holiday';
                throw ValidationException::withMessages([
                    'scheduled_date' => ["Bookings are unavailable on {$scheduledDateTime->format('M d, Y')} ({$reasonText}). Please select another date."],
                ]);
            }

            if (! empty($validated['alternative_schedule']) && preg_match('/^(\d{4}-\d{2}-\d{2})/', $validated['alternative_schedule'], $altMatch)) {
                $altCarbon = Carbon::parse($altMatch[1]);
                if ($altCarbon->isSunday()) {
                    throw ValidationException::withMessages([
                        'alternative_schedule' => ['Alternative schedule cannot fall on a Sunday as it is a rest day for our workers.'],
                    ]);
                }
                if (DisabledBookingDate::where('disabled_date', $altCarbon->format('Y-m-d'))->exists()) {
                    throw ValidationException::withMessages([
                        'alternative_schedule' => ['The selected alternative date has been disabled for bookings.'],
                    ]);
                }
            }

            $maxDailySlots = (int) config('booking_schedule.max_daily_slots', 5);
            $activeBookingsOnDate = Booking::whereDate('scheduled_date', $targetDateYmd)
                ->whereNotIn('booking_status', ['Cancelled', 'Reschedule Notice'])
                ->lockForUpdate()
                ->count();

            if ($activeBookingsOnDate >= $maxDailySlots) {
                throw ValidationException::withMessages([
                    'scheduled_date' => ["All {$maxDailySlots} daily booking slots for {$scheduledDateTime->format('M d, Y')} are already full. This date is unavailable unless a booking is cancelled or rescheduled."],
                ]);
            }

            $preferredArrivalTime = $scheduledDateTime->format('h:i A');

            // Determine rate type based on schedule configuration
            $diffConfig = config('booking_schedule.differential', ['start_time' => '17:00', 'end_time' => '07:00']);
            $timeMinutes = ($scheduledDateTime->hour * 60) + $scheduledDateTime->minute;
            $diffStartParts = explode(':', $diffConfig['start_time'] ?? '17:00');
            $diffStartMins = ((int) $diffStartParts[0] * 60) + (int) ($diffStartParts[1] ?? 0);
            $diffEndParts = explode(':', $diffConfig['end_time'] ?? '07:00');
            $diffEndMins = ((int) $diffEndParts[0] * 60) + (int) ($diffEndParts[1] ?? 0);

            if ($diffStartMins > $diffEndMins) {
                // Overnight window (e.g. 17:00 to 07:00 next day)
                $isDiff = ($timeMinutes >= $diffStartMins || $timeMinutes <= $diffEndMins);
            } else {
                $isDiff = ($timeMinutes >= $diffStartMins && $timeMinutes <= $diffEndMins);
            }
            $rateType = $isDiff ? 'Differential Rate' : 'Regular Rate';

            $serviceDetails['preferred_arrival_time'] = $preferredArrivalTime;
            $serviceDetails['preferred_arrival_time_raw'] = $scheduledDateTime->format('H:i');
            $serviceDetails['rate_type'] = $rateType;
            $serviceDetails['is_differential'] = $isDiff;
            if ($repairMediaPath) {
                $serviceDetails['repair_media_path'] = $repairMediaPath;
                $serviceDetails['repair_media_url'] = asset('storage/' . $repairMediaPath);
            }
            if ($isOcularInspection) {
                $serviceDetails['is_ocular_inspection'] = true;
                $serviceDetails['inspection_status'] = 'Pending Inspection';
            }

            $linkedOrderId = (int) ($validated['ac_unit_order_id'] ?? ($serviceDetails['ac_unit_order_id'] ?? 0));
            $linkedOrder = null;
            if ($linkedOrderId > 0 && DB::getSchemaBuilder()->hasTable('ac_unit_orders')) {
                $linkedOrder = DB::table('ac_unit_orders')
                    ->where('order_id', $linkedOrderId)
                    ->where('client_id', $userId)
                    ->lockForUpdate()
                    ->first();
                if ($linkedOrder) {
                    $serviceDetails['ac_unit_order_id'] = (int) $linkedOrder->order_id;
                    $serviceDetails['company_supplied_unit'] = true;
                    $serviceDetails['unit_available'] = 'Yes (Purchased from Cooling Tower)';
                }
            }

            if ((int) $service->service_id === 1 && ! array_key_exists('company_supplied_unit', $serviceDetails)) {
                $serviceDetails['company_supplied_unit'] = (($serviceDetails['unit_available'] ?? 'Yes') === 'No');
            }

            $bookingNotes = $validated['notes'] ?? null;
            if (! empty($validated['additional_contact_number'])) {
                $serviceDetails['additional_contact_number'] = $validated['additional_contact_number'];
                $altContactNote = 'Additional Contact: ' . $validated['additional_contact_number'];
                $bookingNotes = $bookingNotes ? ($bookingNotes . ' | ' . $altContactNote) : $altContactNote;
            }

            $booking = Booking::create([
                'client_id' => $userId,
                'service_id' => $service->service_id,
                'assigned_tech_id' => null,
                'scheduled_date' => $scheduledDateTime,
                'alternative_schedule' => $validated['alternative_schedule'] ?? null,
                'booking_status' => 'Pending',
                'quotation_status' => $isOcularInspection ? 'Not Applicable' : 'Pending Assessment',
                'service_order_status' => $isOcularInspection ? 'Pending Inspection' : 'Pending Quotation',
                'service_payment_method' => $isOcularInspection ? 'Free' : ($validated['service_payment_method'] ?? 'Cash'),
                'notes' => $bookingNotes,
                'units_data' => $units,
                'service_details' => $serviceDetails,
                'policy_acknowledged' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($linkedOrder) {
                DB::table('ac_unit_orders')
                    ->where('order_id', $linkedOrder->order_id)
                    ->update([
                        'installation_booking_id' => $booking->booking_id,
                        'order_status' => 'Installation Scheduled',
                        'updated_at' => now(),
                    ]);
            }

            // 3. Create Payment record for Appointment Reservation Fee (skip for Free Ocular Inspection)
            if (! $isOcularInspection) {
                Payment::create([
                    'booking_id' => $booking->booking_id,
                    'booking_price' => 0.00,
                    'unit_price' => 0.00,
                    'spare_parts_price' => 0.00,
                    'amount_paid' => $bookingFee,
                    'payment_status' => 'Paid',
                    'payment_method' => 'GCash',
                    'payment_type' => 'Appointment Reservation Fee',
                    'reference_number' => $validated['reference_number'],
                    'sender_name' => $validated['sender_name'] ?? $user->name,
                    'sender_number' => $validated['sender_number'] ?? $user->contact_number,
                    'receipt_image' => $receiptPath,
                    'notes' => 'Appointment Reservation Fee (Schedule Security)',
                    'payment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 4. Activity Log
            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_CREATE',
                'description' => sprintf(
                    'Customer submitted service request #%d for %s with %d unit(s) scheduled on %s (%s). %s',
                    $booking->booking_id,
                    $service->service_name,
                    $totalQuantity,
                    $scheduledDateTime->format('M d, Y h:i A'),
                    $rateType,
                    $isOcularInspection ? 'Free Ocular Inspection (No booking fee).' : ('GCash Ref: ' . ($validated['reference_number'] ?? 'N/A') . '.')
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => $isOcularInspection
                    ? 'Your free Ocular Inspection request has been submitted! Status is set to Pending for Manager scheduling and personnel assignment.'
                    : 'Your service request and appointment reservation have been received! Our staff will review your request and prepare an official quotation.',
                'booking_id' => $booking->booking_id,
                'booking' => $booking->fresh(['service']),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Respond to an official quotation (Accept, Decline, or Request Clarification).
     */
    public function respondQuotation(Request $request, int $bookingId): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['accept', 'decline', 'clarify'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $action = $validated['action'];
        $notes = $validated['notes'] ?? null;

        DB::beginTransaction();
        try {
            if ($action === 'accept') {
                $booking->update([
                    'quotation_status' => 'Accepted',
                    'service_order_status' => 'Service Order Generated',
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Customer]: Accepted quotation on ' . now()->format('M d, Y h:i A') . ($notes ? ". Customer Notes: {$notes}" : '')),
                    'updated_at' => now(),
                ]);
                $msg = 'You have accepted the official quotation! A Service Order has been generated for technician dispatch.';
            } elseif ($action === 'decline') {
                $booking->update([
                    'quotation_status' => 'Declined',
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Customer]: Declined quotation on ' . now()->format('M d, Y h:i A') . ($notes ? ". Reason: {$notes}" : '')),
                    'updated_at' => now(),
                ]);
                $msg = 'You have declined the quotation. Our customer representative will get in touch with you.';
            } else {
                $booking->update([
                    'quotation_status' => 'Clarification Requested',
                    'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . '[Customer Clarification]: ' . ($notes ?: 'Customer requested clarification regarding quotation.')),
                    'updated_at' => now(),
                ]);
                $msg = 'Your quotation clarification request has been submitted to our team.';
            }

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'QUOTATION_' . strtoupper($action),
                'description' => "Customer {$action}ed quotation for Booking #{$booking->booking_id}.",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => $msg,
                'booking' => $booking->fresh(['service', 'technician', 'team', 'payments']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Complete an incomplete payment within the 10-minute deadline set by Manager.
     */
    public function completePayment(Request $request, int $bookingId): JsonResponse
    {
        static::autoExpireIncompletePayments();
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if ($booking->booking_status !== 'Payment Incomplete') {
            throw ValidationException::withMessages([
                'booking' => ['This booking is no longer awaiting payment completion (it may have expired or already been updated).'],
            ]);
        }

        $details = is_array($booking->service_details) ? $booking->service_details : [];
        if (! empty($details['payment_due_at']) && now()->greaterThanOrEqualTo(Carbon::parse($details['payment_due_at']))) {
            static::autoExpireIncompletePayments();
            throw ValidationException::withMessages([
                'booking' => ['The 10-minute payment window has expired. Your booking was automatically cancelled and your payment marked for return.'],
            ]);
        }

        $validated = $request->validate([
            'reference_number' => ['required', 'string', 'min:5', 'max:13'],
            'amount_paid' => ['nullable', 'numeric', 'min:1'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:11'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts', 'public');
        }

        DB::beginTransaction();
        try {
            $details['payment_completed_at'] = now()->toISOString();
            unset($details['payment_due_at']);

            $booking->update([
                'booking_status' => 'Pending',
                'service_details' => $details,
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . "[Customer]: Completed reservation payment within 10-minute window (Ref: {$validated['reference_number']})."),
                'updated_at' => now(),
            ]);

            Payment::create([
                'booking_id' => $booking->booking_id,
                'booking_price' => 0.00,
                'amount_paid' => isset($validated['amount_paid']) ? (float) $validated['amount_paid'] : 300.00,
                'payment_status' => 'Paid',
                'payment_method' => 'GCash',
                'payment_type' => 'Appointment Reservation Fee (Completed)',
                'reference_number' => $validated['reference_number'],
                'sender_name' => $validated['sender_name'] ?? $request->user()->name,
                'sender_number' => $validated['sender_number'] ?? $request->user()->contact_number,
                'receipt_image' => $receiptPath,
                'notes' => 'Completed payment within 10-minute deadline.',
                'payment_date' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_PAYMENT_COMPLETED',
                'description' => "Customer completed payment for Booking #{$booking->booking_id} within the 10-minute deadline (GCash Ref: {$validated['reference_number']}). Status reset to Pending.",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment submitted successfully! Your booking has been returned to Pending for manager approval.',
                'booking' => $booking->fresh(['service', 'technician', 'payments']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Reschedule a booking (requires GCash rescheduling fee unless Manager set Reschedule Notice).
     */
    public function reschedule(Request $request, int $bookingId): JsonResponse
    {
        static::autoExpireIncompletePayments();
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking' => ['Completed or Cancelled bookings cannot be rescheduled.'],
            ]);
        }

        $details = is_array($booking->service_details) ? $booking->service_details : [];
        $isManagerRescheduleNotice = $booking->booking_status === 'Reschedule Notice'
            || ! empty($details['reschedule_notice_by_manager']);

        $validated = $request->validate([
            'new_scheduled_date' => [
                'required',
                'date',
                function ($attribute, $value, $fail) {
                    try {
                        $parsed = Carbon::parse($value);
                        $now = Carbon::now(config('app.timezone', 'Asia/Manila'))->subMinutes(2);
                        if ($parsed->lt($now)) {
                            $fail('The new scheduled date and arrival time cannot be in the past.');
                        }
                    } catch (\Exception $e) {
                        $fail('The new scheduled date is not a valid date.');
                    }
                },
            ],
            'reschedule_fee' => ['nullable', 'numeric', 'min:0'],
            'reference_number' => $isManagerRescheduleNotice
                ? ['nullable', 'string', 'max:13']
                : ['required', 'string', 'min:5', 'max:13'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:11'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'reschedule_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newDate = Carbon::parse($validated['new_scheduled_date']);
        $targetDateYmd = $newDate->format('Y-m-d');

        if ($newDate->isSunday()) {
            throw ValidationException::withMessages([
                'new_scheduled_date' => ['Rescheduling is not available on Sundays as it is a rest day for our workers. Please select a date from Monday to Saturday.'],
            ]);
        }

        // Check if date has been disabled by manager or super admin
        $disabledDateRecord = DisabledBookingDate::where('disabled_date', $targetDateYmd)->first();
        if ($disabledDateRecord) {
            $reasonText = $disabledDateRecord->reason ?: 'No operation / Holiday';
            throw ValidationException::withMessages([
                'new_scheduled_date' => ["Rescheduling is unavailable on {$newDate->format('M d, Y')} ({$reasonText}). Please select another date."],
            ]);
        }

        $maxDailySlots = (int) config('booking_schedule.max_daily_slots', 5);
        $activeBookingsOnDate = Booking::where('booking_id', '!=', $booking->booking_id)
            ->whereDate('scheduled_date', $targetDateYmd)
            ->whereNotIn('booking_status', ['Cancelled', 'Reschedule Notice'])
            ->count();

        if ($activeBookingsOnDate >= $maxDailySlots) {
            throw ValidationException::withMessages([
                'new_scheduled_date' => ["All {$maxDailySlots} daily booking slots for {$newDate->format('M d, Y')} are already full. This date is unavailable unless a booking is cancelled or rescheduled."],
            ]);
        }

        // Enforce half-day slot blocking on the original date if triggered by Manager's Reschedule Notice
        if ($isManagerRescheduleNotice) {
            $blockedDate = $details['reschedule_notice_original_date']
                ?? ($booking->scheduled_date ? $booking->scheduled_date->format('Y-m-d') : null);
            $blockedPeriod = $details['reschedule_notice_blocked_period']
                ?? (($booking->scheduled_date && (int) $booking->scheduled_date->hour < 13) ? 'morning_noon' : 'afternoon_evening');

            if ($blockedDate && $newDate->format('Y-m-d') === $blockedDate) {
                $newHour = (int) $newDate->hour;
                if ($blockedPeriod === 'morning_noon' && $newHour < 13) {
                    throw ValidationException::withMessages([
                        'new_scheduled_date' => ['Morning and noon slots are unavailable on this date per the reschedule notice. Please choose an afternoon slot or another date.'],
                    ]);
                }
                if ($blockedPeriod === 'afternoon_evening' && $newHour >= 13) {
                    throw ValidationException::withMessages([
                        'new_scheduled_date' => ['Afternoon and evening slots are unavailable on this date per the reschedule notice. Please choose a morning/noon slot or another date.'],
                    ]);
                }
            }
        }

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts', 'public');
        }

        $rescheduleFee = $isManagerRescheduleNotice
            ? 0.00
            : (isset($validated['reschedule_fee']) && (float) $validated['reschedule_fee'] > 0
                ? (float) $validated['reschedule_fee']
                : 150.00);

        DB::beginTransaction();
        try {
            $oldDate = $booking->scheduled_date;
            $oldDateStr = $oldDate ? $oldDate->format('M d, Y h:i A') : 'N/A';

            $diffConfig = config('booking_schedule.differential', ['start_time' => '17:00', 'end_time' => '07:00']);
            $timeMinutes = ($newDate->hour * 60) + $newDate->minute;
            $diffStartParts = explode(':', $diffConfig['start_time'] ?? '17:00');
            $diffStartMins = ((int) $diffStartParts[0] * 60) + (int) ($diffStartParts[1] ?? 0);
            $diffEndParts = explode(':', $diffConfig['end_time'] ?? '07:00');
            $diffEndMins = ((int) $diffEndParts[0] * 60) + (int) ($diffEndParts[1] ?? 0);
            if ($diffStartMins > $diffEndMins) {
                $isDiff = ($timeMinutes >= $diffStartMins || $timeMinutes <= $diffEndMins);
            } else {
                $isDiff = ($timeMinutes >= $diffStartMins && $timeMinutes <= $diffEndMins);
            }
            $rateType = $isDiff ? 'Differential Rate' : 'Regular Rate';

            $details['preferred_arrival_time'] = $newDate->format('h:i A');
            $details['preferred_arrival_time_raw'] = $newDate->format('H:i');
            $details['rate_type'] = $rateType;
            $details['is_differential'] = $isDiff;
            unset(
                $details['reschedule_notice_by_manager'],
                $details['reschedule_notice_original_date'],
                $details['reschedule_notice_blocked_period'],
                $details['reschedule_notice_message']
            );

            $booking->update([
                'scheduled_date' => $newDate,
                'booking_status' => 'Pending', // Resets to Pending so Admin/Manager can re-dispatch
                'assigned_tech_id' => null,
                'lead_technician_id' => null,
                'assistant_technician_id' => null,
                'assigned_team_id' => null,
                'assigned_by' => null,
                'assigned_at' => null,
                'service_details' => $details,
                'notes' => trim(($booking->notes ? $booking->notes . "\n" : '') . "Rescheduled from {$oldDateStr} to " . $newDate->format('M d, Y h:i A') . " ({$rateType})" . ($isManagerRescheduleNotice ? ' [Free via Manager Reschedule Notice]' : '') . ". Reason: " . ($validated['reschedule_reason'] ?? 'Customer request')),
                'updated_at' => now(),
            ]);

            $paymentId = null;
            if (! $isManagerRescheduleNotice && $rescheduleFee > 0) {
                $payment = Payment::create([
                    'booking_id' => $booking->booking_id,
                    'booking_price' => 0.00,
                    'amount_paid' => $rescheduleFee,
                    'payment_status' => 'Paid',
                    'payment_method' => 'GCash',
                    'payment_type' => 'Reschedule Fee',
                    'reference_number' => $validated['reference_number'],
                    'sender_name' => $validated['sender_name'] ?? $request->user()->name,
                    'sender_number' => $validated['sender_number'] ?? $request->user()->contact_number,
                    'receipt_image' => $receiptPath,
                    'notes' => 'Rescheduling Fee payment',
                    'payment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $paymentId = $payment->payment_id;
            }

            $reschedule = RescheduleBooking::create([
                'booking_id' => $booking->booking_id,
                'client_id' => $userId,
                'previous_scheduled_date' => $oldDate,
                'new_scheduled_date' => $newDate,
                'reschedule_reason' => $validated['reschedule_reason'] ?? ($isManagerRescheduleNotice ? 'Manager Reschedule Notice' : 'Customer request'),
                'reschedule_fee' => $rescheduleFee,
                'payment_id' => $paymentId,
                'status' => 'Pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_RESCHEDULE',
                'description' => sprintf(
                    'Customer rescheduled booking #%d to %s (%s). Reschedule record #%d.',
                    $booking->booking_id,
                    $newDate->format('M d, Y h:i A'),
                    $isManagerRescheduleNotice ? 'Free Reschedule Notice' : ('GCash Ref: ' . ($validated['reference_number'] ?? 'N/A')),
                    $reschedule->reschedule_id
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Booking rescheduled successfully! Status is set to Pending for manager confirmation.',
                'booking' => $booking->fresh(['service', 'technician', 'payments', 'rescheduleBookings']),
                'reschedule' => $reschedule,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Cancel a pending or active booking (including fulfillment switches for linked AC unit installation bookings).
     */
    public function cancel(Request $request, int $bookingId): JsonResponse
    {
        $userId = (int) $request->user()->user_id;

        $booking = Booking::where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        if (in_array($booking->booking_status, ['Completed', 'Cancelled'], true)) {
            throw ValidationException::withMessages([
                'booking' => ['This booking is already completed or cancelled.'],
            ]);
        }

        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:1000'],
            'fulfillment_switch' => ['nullable', 'string', Rule::in(['delivery', 'pickup'])],
        ]);

        $details = is_array($booking->service_details) ? $booking->service_details : [];
        $fulfillmentSwitch = $validated['fulfillment_switch'] ?? null;
        $linkedOrder = null;

        if (DB::getSchemaBuilder()->hasTable('ac_unit_orders')) {
            $linkedOrder = DB::table('ac_unit_orders')
                ->where('client_id', $userId)
                ->where(function ($q) use ($booking, $details) {
                    $q->where('installation_booking_id', $booking->booking_id);
                    if (! empty($details['ac_unit_order_id'])) {
                        $q->orWhere('order_id', (int) $details['ac_unit_order_id']);
                    }
                })
                ->first();
        }

        $responseMsg = 'Booking has been cancelled.';

        DB::transaction(function () use ($booking, $userId, $validated, $fulfillmentSwitch, $linkedOrder, &$details, &$responseMsg) {
            if ($linkedOrder && $fulfillmentSwitch === 'delivery') {
                $details['cancelled_for_fulfillment_switch'] = 'delivery';
                $deliveryFee = max(500.00, (float) ($linkedOrder->delivery_fee ?? 0));

                DB::table('ac_unit_orders')
                    ->where('order_id', $linkedOrder->order_id)
                    ->update([
                        'fulfillment_type' => 'delivery',
                        'order_status' => 'Awaiting Delivery',
                        'delivery_fee' => $deliveryFee,
                        'installation_booking_id' => null,
                        'notes' => trim(($linkedOrder->notes ? $linkedOrder->notes . "\n" : '') . "[Switch to Delivery]: Installation Booking #{$booking->booking_id} cancelled; customer will pay remaining unit balance + delivery fee upon delivery."),
                        'updated_at' => now(),
                    ]);

                $responseMsg = 'Installation booking cancelled. Your AC unit order has been switched to Delivery — remaining unit balance and delivery fee will be collected upon delivery.';
            } elseif ($linkedOrder && $fulfillmentSwitch === 'pickup') {
                $details['cancelled_for_fulfillment_switch'] = 'pickup';
                $details['booking_fee_non_refundable'] = true;

                DB::table('ac_unit_orders')
                    ->where('order_id', $linkedOrder->order_id)
                    ->update([
                        'fulfillment_type' => 'pickup',
                        'order_status' => 'Awaiting Pickup',
                        'delivery_fee' => 0.00,
                        'installation_fee_forfeited' => true,
                        'installation_booking_id' => null,
                        'notes' => trim(($linkedOrder->notes ? $linkedOrder->notes . "\n" : '') . "[Switch to Pick Up]: Delivery & Installation Booking #{$booking->booking_id} cancelled; installation booking fee is non-refundable."),
                        'updated_at' => now(),
                    ]);

                DB::table('payment')
                    ->where('booking_id', $booking->booking_id)
                    ->where('payment_type', 'like', '%Reservation%')
                    ->update([
                        'payment_status' => 'Non-Refundable',
                        'notes' => 'Delivery & installation cancelled for Pick Up switch — installation booking fee is non-refundable.',
                        'updated_at' => now(),
                    ]);

                $responseMsg = 'Delivery and installation booking cancelled and switched to Pick Up. Please note that the installation booking fee is non-refundable.';
            }

            $booking->update([
                'booking_status' => 'Cancelled',
                'cancellation_reason' => $validated['cancellation_reason'],
                'service_details' => $details,
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'BOOKING_CANCEL',
                'description' => sprintf(
                    'Customer cancelled booking #%d%s. Reason: %s',
                    $booking->booking_id,
                    $fulfillmentSwitch ? " (switched AC unit fulfillment to {$fulfillmentSwitch})" : '',
                    $validated['cancellation_reason']
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        return response()->json([
            'message' => $responseMsg,
            'booking' => $booking->fresh(['service', 'technician']),
        ]);
    }

    /**
     * Customer selects a recommended AC unit from an Ocular Inspection and submits ₱7,000 down payment + fulfillment choice.
     */
    public function storeAcUnitOrder(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->user_id;

        $ocularBooking = Booking::with('service')
            ->where('booking_id', $bookingId)
            ->where('client_id', $userId)
            ->firstOrFail();

        $validated = $request->validate([
            'recommendation_id' => ['nullable', 'integer'],
            'ac_unit_id' => ['nullable', 'integer'],
            'payment_method' => ['required', 'string', Rule::in(['Cash', 'Bank Transfer', 'GCash'])],
            'fulfillment_type' => ['required', 'string', Rule::in(['pickup', 'delivery', 'delivery_installation'])],
            'reference_number' => [
                Rule::requiredIf(fn () => in_array($request->input('payment_method'), ['Bank Transfer', 'GCash'], true)),
                'nullable',
                'string',
                'min:4',
                'max:60',
            ],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'sender_number' => ['nullable', 'string', 'max:30'],
            'receipt_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'delivery_address' => ['nullable', 'string', 'max:1000'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $request->file('receipt_image')->store('receipts/down_payments', 'public');
        }

        DB::beginTransaction();
        try {
            $rec = null;
            if (! empty($validated['recommendation_id'])) {
                $rec = DB::table('ocular_inspection_recommendations')
                    ->where('recommendation_id', (int) $validated['recommendation_id'])
                    ->where('booking_id', $ocularBooking->booking_id)
                    ->first();
            }

            $targetAcUnitId = (int) (($validated['ac_unit_id'] ?? null) ?: ($rec->ac_unit_id ?? 0));
            $acUnit = $targetAcUnitId > 0
                ? DB::table('ac_units_inventory')->where('ac_unit_id', $targetAcUnitId)->lockForUpdate()->first()
                : null;

            if ($acUnit && $acUnit->status === 'Sold') {
                // Attempt to find another Available or Order Base unit with identical brand & model
                $fallback = DB::table('ac_units_inventory')
                    ->where('brand', $acUnit->brand)
                    ->where('model', $acUnit->model)
                    ->whereIn('status', ['Available', 'Order Base'])
                    ->lockForUpdate()
                    ->first();
                if ($fallback) {
                    $acUnit = $fallback;
                } else {
                    throw ValidationException::withMessages([
                        'ac_unit_id' => ['This recommended AC unit has already been sold. Please choose another recommended unit or contact our Admin Assistant.'],
                    ]);
                }
            }

            if (! $acUnit && $rec) {
                $acUnit = DB::table('ac_units_inventory')
                    ->where('brand', $rec->brand_recommendation)
                    ->whereIn('status', ['Available', 'Order Base'])
                    ->orderByRaw("CASE WHEN status = 'Available' THEN 0 ELSE 1 END")
                    ->lockForUpdate()
                    ->first();
            }

            if (! $acUnit) {
                throw ValidationException::withMessages([
                    'ac_unit_id' => ['Please select a valid AC unit from the inspection recommendations.'],
                ]);
            }

            $unitPrice = $rec && $rec->unit_price !== null && (float) $rec->unit_price > 0
                ? (float) $rec->unit_price
                : (float) ($acUnit->selling_price ?: $acUnit->purchase_price ?: 0);

            $downPayment = 7000.00;
            $remainingBalance = max(0.0, round($unitPrice - $downPayment, 2));
            $fulfillment = $validated['fulfillment_type'];
            $deliveryFee = in_array($fulfillment, ['delivery', 'delivery_installation'], true) ? 500.00 : 0.00;

            $deliveryAddress = !empty($validated['delivery_address'])
                ? $validated['delivery_address']
                : ($user->address ?? $ocularBooking->client_address ?? '');
            $contactNumber = !empty($validated['contact_number'])
                ? $validated['contact_number']
                : ($user->contact_number ?? $ocularBooking->client_contact_number ?? '');
            $notes = $validated['notes'] ?? null;
            $senderName = !empty($validated['sender_name']) ? $validated['sender_name'] : $user->name;
            $senderNumber = !empty($validated['sender_number']) ? $validated['sender_number'] : ($user->contact_number ?? '');
            $referenceNumber = $validated['reference_number'] ?? null;

            $orderStatus = match ($fulfillment) {
                'pickup' => 'Awaiting Pickup',
                'delivery' => 'Awaiting Delivery',
                default => 'Pending Installation Schedule',
            };

            $orderId = DB::table('ac_unit_orders')->insertGetId([
                'ocular_booking_id' => $ocularBooking->booking_id,
                'installation_booking_id' => null,
                'client_id' => $userId,
                'recommendation_id' => $rec?->recommendation_id,
                'ac_unit_id' => $acUnit->ac_unit_id,
                'quantity' => 1,
                'unit_price' => $unitPrice,
                'total_unit_price' => $unitPrice,
                'down_payment_amount' => $downPayment,
                'remaining_unit_balance' => $remainingBalance,
                'delivery_fee' => $deliveryFee,
                'installation_fee' => 0.00,
                'payment_method' => $validated['payment_method'],
                'fulfillment_type' => $fulfillment,
                'reference_number' => $referenceNumber,
                'sender_name' => $senderName,
                'sender_number' => $senderNumber,
                'down_payment_receipt_path' => $receiptPath,
                'delivery_address' => $deliveryAddress,
                'contact_number' => $contactNumber,
                'installation_fee_forfeited' => false,
                'order_status' => $orderStatus,
                'notes' => $notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($acUnit->status === 'Available') {
                DB::table('ac_units_inventory')
                    ->where('ac_unit_id', $acUnit->ac_unit_id)
                    ->update([
                        'status' => 'Reserved',
                        'customer_name' => $user->name,
                        'customer_contact' => $contactNumber,
                        'updated_at' => now(),
                    ]);
            }

            if ($rec) {
                DB::table('ocular_inspection_recommendations')
                    ->where('recommendation_id', $rec->recommendation_id)
                    ->update([
                        'status' => 'Selected',
                        'updated_at' => now(),
                    ]);
            }

            Payment::create([
                'booking_id' => $ocularBooking->booking_id,
                'booking_price' => 0.00,
                'unit_price' => $unitPrice,
                'spare_parts_price' => 0.00,
                'amount_paid' => $downPayment,
                'payment_status' => $validated['payment_method'] === 'Cash' ? 'Down Payment (Cash)' : 'Paid',
                'payment_method' => $validated['payment_method'],
                'payment_type' => 'AC Unit Down Payment',
                'reference_number' => $referenceNumber ?? ('CASH-DP-' . $orderId),
                'sender_name' => $senderName,
                'sender_number' => $senderNumber,
                'receipt_image' => $receiptPath,
                'notes' => sprintf(
                    '₱7,000.00 down payment for %s %s (%s HP %s) — Fulfillment: %s',
                    $acUnit->brand,
                    $acUnit->model,
                    $acUnit->horsepower,
                    $acUnit->ac_type,
                    str_replace('_', ' & ', ucfirst($fulfillment))
                ),
                'payment_date' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'user_id' => $userId,
                'action_type' => 'AC_UNIT_ORDER_CREATED',
                'description' => sprintf(
                    'Customer placed AC Unit Order #%d from Ocular Inspection #%d for %s %s (₱%s, ₱7,000 down payment via %s, fulfillment: %s).',
                    $orderId,
                    $ocularBooking->booking_id,
                    $acUnit->brand,
                    $acUnit->model,
                    number_format($unitPrice, 2),
                    $validated['payment_method'],
                    $fulfillment
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            $imgPath = ($rec?->unit_image_path) ?: ($acUnit->image_path ?? null);

            $orderPayload = [
                'order_id' => (int) $orderId,
                'ocular_booking_id' => (int) $ocularBooking->booking_id,
                'ac_unit_id' => (int) $acUnit->ac_unit_id,
                'brand' => $acUnit->brand,
                'model' => $acUnit->model,
                'horsepower' => (float) $acUnit->horsepower,
                'ac_type' => $acUnit->ac_type,
                'motor_type' => $acUnit->motor_type ?? 'Inverter',
                'unit_price' => $unitPrice,
                'down_payment_amount' => $downPayment,
                'remaining_unit_balance' => $remainingBalance,
                'delivery_fee' => $deliveryFee,
                'payment_method' => $validated['payment_method'],
                'fulfillment_type' => $fulfillment,
                'delivery_address' => $deliveryAddress,
                'contact_number' => $contactNumber,
                'order_status' => $orderStatus,
                'unit_image_url' => $imgPath ? asset('storage/' . $imgPath) : null,
            ];

            return response()->json([
                'message' => $fulfillment === 'delivery_installation'
                    ? '₱7,000.00 down payment recorded! Proceeding to Installation schedule selection.'
                    : ($fulfillment === 'delivery'
                        ? '₱7,000.00 down payment recorded! Remaining unit balance and delivery fee will be paid upon delivery.'
                        : '₱7,000.00 down payment recorded! Remaining full balance will be paid upon unit pick up.'),
                'order' => $orderPayload,
                'data' => $orderPayload,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($receiptPath) {
                Storage::disk('public')->delete($receiptPath);
            }
            throw $e;
        }
    }

    /**
     * Build the dynamic booking schedule and arrival time slots.
     */
    private function getScheduleConfig(): array
    {
        static::autoExpireIncompletePayments();

        $config = config('booking_schedule', []);
        $interval = (int) ($config['interval_minutes'] ?? 30);
        $maxDailySlots = (int) ($config['max_daily_slots'] ?? 5);
        $maxJobsPerTeamPerDay = (int) ($config['max_jobs_per_team_per_day'] ?? 1);
        $closedDaysOfWeek = $config['closed_days_of_week'] ?? [0];

        $generateSlots = function (string $startTime, string $endTime, string $rateType, string $badge, bool $isDifferential) use ($interval) {
            $slots = [];
            $startMinutes = $this->timeStringToMinutes($startTime);
            $endMinutes = $this->timeStringToMinutes($endTime);

            // Handle overnight slot ranges (e.g., 17:00 to 07:00)
            if ($startMinutes > $endMinutes) {
                // First segment: startTime to 23:30 (before 24:00)
                $curr = $startMinutes;
                while ($curr < 1440) {
                    $hours = intdiv($curr, 60);
                    $mins = $curr % 60;
                    $time24 = sprintf('%02d:%02d', $hours, $mins);
                    $dateTime = Carbon::createFromTime($hours, $mins, 0);
                    $label = $dateTime->format('h:i A');

                    $slots[] = [
                        'id' => $time24,
                        'time' => $time24,
                        'label' => $label,
                        'rate_type' => $rateType,
                        'badge' => $badge,
                        'is_differential' => $isDifferential,
                    ];

                    $curr += $interval;
                }
                // Second segment: 00:00 to endTime
                $curr = 0;
                while ($curr <= $endMinutes) {
                    $hours = intdiv($curr, 60);
                    $mins = $curr % 60;
                    $time24 = sprintf('%02d:%02d', $hours, $mins);
                    $dateTime = Carbon::createFromTime($hours, $mins, 0);
                    $label = $dateTime->format('h:i A');

                    $slots[] = [
                        'id' => $time24,
                        'time' => $time24,
                        'label' => $label,
                        'rate_type' => $rateType,
                        'badge' => $badge,
                        'is_differential' => $isDifferential,
                    ];

                    $curr += $interval;
                }
            } else {
                $curr = $startMinutes;
                while ($curr <= $endMinutes) {
                    $hours = intdiv($curr, 60);
                    $mins = $curr % 60;
                    $time24 = sprintf('%02d:%02d', $hours, $mins);
                    $dateTime = Carbon::createFromTime($hours, $mins, 0);
                    $label = $dateTime->format('h:i A');

                    $slots[] = [
                        'id' => $time24,
                        'time' => $time24,
                        'label' => $label,
                        'rate_type' => $rateType,
                        'badge' => $badge,
                        'is_differential' => $isDifferential,
                    ];

                    $curr += $interval;
                }
            }

            return $slots;
        };

        $regular = $config['regular'] ?? [
            'key' => 'regular',
            'title' => 'Regular Hours',
            'subtitle' => 'Standard Business Hours (08:00 AM – 04:00 PM)',
            'rate_name' => 'Regular Rate',
            'badge' => 'Regular',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'notice_title' => 'Regular Rate',
            'notice_message' => 'Standard service rate applies.',
            'is_differential' => false,
        ];

        $differential = $config['differential'] ?? [
            'key' => 'differential',
            'title' => 'Differential Hours',
            'subtitle' => 'Night Shift (05:00 PM – 07:00 AM)',
            'rate_name' => 'Differential Rate',
            'badge' => 'Differential',
            'start_time' => '17:00',
            'end_time' => '07:00',
            'notice_title' => 'Differential Rate Applies',
            'notice_message' => 'An additional differential charge will be included in your quotation.',
            'is_differential' => true,
        ];

        $regular['slots'] = $generateSlots(
            $regular['start_time'] ?? '08:00',
            $regular['end_time'] ?? '16:00',
            'regular',
            $regular['badge'] ?? 'Regular',
            false
        );

        $differential['slots'] = $generateSlots(
            $differential['start_time'] ?? '17:00',
            $differential['end_time'] ?? '07:00',
            'differential',
            $differential['badge'] ?? 'Differential',
            true
        );

        // Compute daily active slot counts and booked times from today onwards
        // Active bookings are those not in 'Cancelled' or 'Reschedule Notice'
        $activeBookings = DB::table('bookings')
            ->whereNotNull('scheduled_date')
            ->whereDate('scheduled_date', '>=', now()->toDateString())
            ->whereNotIn('booking_status', ['Cancelled', 'Reschedule Notice'])
            ->get(['booking_id', 'scheduled_date', 'booking_status']);

        $dailySlotCounts = [];
        $bookingsByDate = [];
        foreach ($activeBookings as $b) {
            $dt = Carbon::parse($b->scheduled_date);
            $ymd = $dt->format('Y-m-d');
            $time24 = $dt->format('H:i');

            $dailySlotCounts[$ymd] = ($dailySlotCounts[$ymd] ?? 0) + 1;
            if (! isset($bookingsByDate[$ymd])) {
                $bookingsByDate[$ymd] = [];
            }
            $bookingsByDate[$ymd][] = [
                'booking_id' => (int) $b->booking_id,
                'time' => $time24,
                'status' => $b->booking_status,
            ];
        }

        $fullDates = [];
        foreach ($dailySlotCounts as $ymd => $count) {
            if ($count >= $maxDailySlots) {
                $fullDates[] = $ymd;
            }
        }

        // Fetch disabled dates set by Manager / Super Admin
        $disabledDates = DisabledBookingDate::orderBy('disabled_date')
            ->get(['disabled_date_id', 'disabled_date', 'reason'])
            ->map(function ($d) {
                return [
                    'id' => $d->disabled_date_id,
                    'date' => Carbon::parse($d->disabled_date)->format('Y-m-d'),
                    'reason' => $d->reason ?: 'No operation / Holiday',
                ];
            })
            ->values()
            ->toArray();

        return [
            'interval_minutes' => $interval,
            'max_daily_slots' => $maxDailySlots,
            'max_jobs_per_team_per_day' => $maxJobsPerTeamPerDay,
            'closed_days_of_week' => $closedDaysOfWeek,
            'daily_slot_counts' => $dailySlotCounts,
            'bookings_by_date' => $bookingsByDate,
            'full_dates' => $fullDates,
            'disabled_dates' => $disabledDates,
            'regular' => $regular,
            'differential' => $differential,
        ];
    }

    private function timeStringToMinutes(string $timeStr): int
    {
        $parts = explode(':', $timeStr);
        $hours = isset($parts[0]) ? (int) $parts[0] : 0;
        $mins = isset($parts[1]) ? (int) $parts[1] : 0;
        return ($hours * 60) + $mins;
    }
}

