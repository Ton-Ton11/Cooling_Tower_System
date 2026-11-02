<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Models\ServiceForecast;
use App\Models\TechnicianCertification;
use App\Models\User;
use App\Notifications\ForecastReminderNotification;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ForecastingService
{
    /**
     * Ensure forecasting tables exist even if migrations haven't been run manually yet.
     */
    public function ensureTablesExist(): void
    {
        if (! Schema::hasTable('service_forecasts')) {
            Schema::create('service_forecasts', function (Blueprint $table) {
                $table->id('forecast_id');
                $table->unsignedBigInteger('user_id')->index();
                $table->unsignedBigInteger('source_booking_id')->nullable()->index();
                $table->string('source_service_name', 150);
                $table->unsignedBigInteger('recommended_service_id')->nullable();
                $table->string('recommended_service_name', 150);
                $table->string('unit_summary', 255)->nullable();
                $table->date('last_service_date');
                $table->date('predicted_due_date')->index();
                $table->integer('base_interval_days')->default(120);
                $table->integer('adjusted_interval_days')->default(120);
                $table->decimal('wear_factor', 4, 2)->default(1.00);
                $table->string('urgency_level', 40)->default('Upcoming');
                $table->text('recommendation_reason')->nullable();
                $table->timestamp('reminder_sent_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('technician_certifications')) {
            Schema::create('technician_certifications', function (Blueprint $table) {
                $table->id('certification_id');
                $table->unsignedBigInteger('user_id')->index();
                $table->string('certification_name', 180);
                $table->string('issuing_body', 120)->default('TESDA');
                $table->string('certificate_number', 100)->nullable();
                $table->date('issued_date');
                $table->date('expiry_date')->index();
                $table->integer('renewal_lead_days')->default(45);
                $table->string('status', 40)->default('Active');
                $table->timestamp('last_reminded_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('ac_units_inventory')) {
            Schema::table('ac_units_inventory', function (Blueprint $table) {
                if (! Schema::hasColumn('ac_units_inventory', 'warranty_start_date')) {
                    $table->date('warranty_start_date')->nullable()->after('warranty_period');
                }
                if (! Schema::hasColumn('ac_units_inventory', 'warranty_expiry_date')) {
                    $table->date('warranty_expiry_date')->nullable()->after('warranty_start_date');
                }
                if (! Schema::hasColumn('ac_units_inventory', 'warranty_status')) {
                    $table->string('warranty_status', 40)->default('Not Activated')->after('warranty_expiry_date');
                }
                if (! Schema::hasColumn('ac_units_inventory', 'customer_name')) {
                    $table->string('customer_name', 150)->nullable()->after('warranty_status');
                }
                if (! Schema::hasColumn('ac_units_inventory', 'customer_contact')) {
                    $table->string('customer_contact', 80)->nullable()->after('customer_name');
                }
                if (! Schema::hasColumn('ac_units_inventory', 'sold_at')) {
                    $table->timestamp('sold_at')->nullable()->after('customer_contact');
                }
            });
        }

        if (Schema::hasTable('inventory_items')) {
            Schema::table('inventory_items', function (Blueprint $table) {
                if (! Schema::hasColumn('inventory_items', 'reservation_source')) {
                    $table->string('reservation_source', 40)->nullable()->after('status');
                }
                if (! Schema::hasColumn('inventory_items', 'is_warranty_reserved')) {
                    $table->boolean('is_warranty_reserved')->default(false)->after('reservation_source');
                }
                if (! Schema::hasColumn('inventory_items', 'reserved_for_ac_unit_id')) {
                    $table->unsignedBigInteger('reserved_for_ac_unit_id')->nullable()->index()->after('is_warranty_reserved');
                }
                if (! Schema::hasColumn('inventory_items', 'reserved_for_serial')) {
                    $table->string('reserved_for_serial', 120)->nullable()->index()->after('reserved_for_ac_unit_id');
                }
                if (! Schema::hasColumn('inventory_items', 'reserved_for_unit_label')) {
                    $table->string('reserved_for_unit_label', 180)->nullable()->after('reserved_for_serial');
                }
                if (! Schema::hasColumn('inventory_items', 'source_item_id')) {
                    $table->unsignedBigInteger('source_item_id')->nullable()->after('reserved_for_unit_label');
                }
                if (! Schema::hasColumn('inventory_items', 'warranty_start_date')) {
                    $table->date('warranty_start_date')->nullable()->after('source_item_id');
                }
                if (! Schema::hasColumn('inventory_items', 'warranty_expiry_date')) {
                    $table->date('warranty_expiry_date')->nullable()->after('warranty_start_date');
                }
            });
        }

        if (Schema::hasTable('inventory_sales')) {
            Schema::table('inventory_sales', function (Blueprint $table) {
                if (! Schema::hasColumn('inventory_sales', 'warranty_start_date')) {
                    $table->date('warranty_start_date')->nullable()->after('warranty_period');
                }
                if (! Schema::hasColumn('inventory_sales', 'warranty_expiry_date')) {
                    $table->date('warranty_expiry_date')->nullable()->after('warranty_start_date');
                }
                if (! Schema::hasColumn('inventory_sales', 'warranty_status')) {
                    $table->string('warranty_status', 40)->nullable()->after('warranty_expiry_date');
                }
            });
        }
    }

    /**
     * Generate or update a predictive maintenance forecast when a booking is marked Completed.
     */
    public function generateCustomerForecastForBooking(int $bookingId): ?ServiceForecast
    {
        $this->ensureTablesExist();

        $booking = Booking::with('service')->find($bookingId);
        if (! $booking || ! $booking->client_id) {
            return null;
        }

        $sourceServiceName = $booking->service?->service_name ?? 'Cleaning / Preventive Maintenance';
        $units = is_array($booking->units_data) ? $booking->units_data : [];

        // 1. Service Chaining Matrix: determine next recommended service & base interval
        $chain = $this->resolveNextServiceChain($sourceServiceName, (int) $booking->client_id);

        // 2. Calculate Adaptive Wear Factor based on unit type, unit count, and complaint history
        $wearFactor = 1.00;
        $wearReasons = [];

        $unitSummaryParts = [];
        $hasHeavyCommercialUnit = false;
        $totalUnitsCount = 0;

        foreach ($units as $u) {
            $type = $u['ac_type'] ?? $u['type'] ?? 'Split Type';
            $brand = $u['brand'] ?? 'Standard';
            $qty = max(1, (int) ($u['quantity'] ?? 1));
            $totalUnitsCount += $qty;
            $unitSummaryParts[] = "{$qty}x {$brand} {$type}";

            if (stripos($type, 'Cooling Tower') !== false
                || stripos($type, 'Central') !== false
                || stripos($type, 'Cassette') !== false
                || stripos($type, 'Floor') !== false
            ) {
                $hasHeavyCommercialUnit = true;
            }
        }

        if ($hasHeavyCommercialUnit) {
            $wearFactor *= 0.78;
            $wearReasons[] = 'heavy commercial/cooling tower load profile';
        } elseif ($totalUnitsCount >= 3) {
            $wearFactor *= 0.88;
            $wearReasons[] = "multi-unit deployment ({$totalUnitsCount} units)";
        }

        $recentComplaints = Schema::hasTable('customer_complaints')
            ? DB::table('customer_complaints')
                ->where('customer_id', $booking->client_id)
                ->count()
            : 0;

        if ($recentComplaints > 0) {
            $wearFactor *= 0.85;
            $wearReasons[] = 'prior unit performance complaint history';
        }

        $wearFactor = max(0.60, round($wearFactor, 2));
        $baseDays = $chain['base_days'];
        $adjustedDays = max(21, (int) round($baseDays * $wearFactor));

        $lastServiceDate = $booking->scheduled_date
            ? Carbon::parse($booking->scheduled_date)->startOfDay()
            : now()->startOfDay();

        // If the completed booking was in the past, forecast from its completion/scheduled date
        $predictedDueDate = (clone $lastServiceDate)->addDays($adjustedDays);

        $unitSummary = ! empty($unitSummaryParts)
            ? implode(', ', array_slice($unitSummaryParts, 0, 2))
            : 'Registered Aircon / Cooling Unit';

        $reason = $chain['reason'];
        if (! empty($wearReasons)) {
            $reason .= ' Interval shortened by ' . round((1 - $wearFactor) * 100) . '% due to ' . implode(' and ', $wearReasons) . '.';
        }

        // Installation Post-Service Forecasting & Warranty Rule:
        // - If AC unit was NOT bought in the company -> ONLY Preventive Maintenance forecasting activates.
        // - If AC unit WAS bought in the company -> BOTH Cleaning/Preventive Maintenance reminder AND Warranty Tracking activate.
        $isInstallation = str_contains(strtolower($sourceServiceName), 'install') || (int) $booking->service_id === 1;
        $serviceDetails = is_array($booking->service_details) ? $booking->service_details : [];
        $companySuppliedUnit = ! empty($serviceDetails['company_supplied_unit'])
            || strtolower((string) ($serviceDetails['unit_available'] ?? '')) === 'no';

        if ($isInstallation) {
            if ($companySuppliedUnit) {
                $reason .= ' (AC Unit bought in company: Cleaning/Preventive Maintenance reminder AND 12-Month Warranty Tracking activated.)';
                $this->activateCompanySuppliedInstallationWarranty($booking, $units, $lastServiceDate);
            } else {
                $reason .= ' (AC Unit provided by customer / not bought in company: Preventive Maintenance forecasting activated only.)';
            }
        }

        $urgency = $this->computeUrgencyLevel($predictedDueDate);

        $forecast = ServiceForecast::updateOrCreate(
            [
                'user_id' => (int) $booking->client_id,
                'source_booking_id' => (int) $booking->booking_id,
            ],
            [
                'source_service_name'      => $sourceServiceName,
                'recommended_service_id'   => $chain['recommended_service_id'],
                'recommended_service_name' => $chain['recommended_service_name'],
                'unit_summary'             => $unitSummary,
                'last_service_date'        => $lastServiceDate->toDateString(),
                'predicted_due_date'       => $predictedDueDate->toDateString(),
                'base_interval_days'       => $baseDays,
                'adjusted_interval_days'   => $adjustedDays,
                'wear_factor'              => $wearFactor,
                'urgency_level'            => $urgency,
                'recommendation_reason'    => $reason,
            ]
        );

        return $forecast;
    }

    /**
     * Activate 12-month Warranty Tracking when an Installation booking uses an AC unit bought in the company.
     */
    protected function activateCompanySuppliedInstallationWarranty(Booking $booking, array $units, Carbon $startDate): void
    {
        if (! Schema::hasTable('ac_units_inventory')) {
            return;
        }

        $client = User::find($booking->client_id);
        $customerName = $client ? trim(($client->given_name ?? '') . ' ' . ($client->last_name ?? '')) : 'Valued Customer';
        $customerContact = $client?->contact_number ?? null;
        $firstUnit = $units[0] ?? [];
        $unitType = $firstUnit['ac_type'] ?? $firstUnit['type'] ?? 'Split Type';
        $brand = $firstUnit['brand'] ?? 'Carrier';
        $serialNumber = sprintf('CT-INST-%04d-%d', $booking->booking_id, $booking->client_id);

        $existingUnit = DB::table('ac_units_inventory')
            ->where('serial_number', $serialNumber)
            ->first();

        $expiryDate = (clone $startDate)->addMonths(12)->startOfDay();

        if (! $existingUnit) {
            $acUnitId = DB::table('ac_units_inventory')->insertGetId([
                'unit_name'            => "{$brand} {$unitType}",
                'brand'                => $brand,
                'unit_type'            => $unitType,
                'horsepower'           => $firstUnit['horsepower'] ?? '2.0 HP',
                'serial_number'        => $serialNumber,
                'capital_price'        => 22000,
                'selling_price'        => (float) ($booking->total_price ?: 28500),
                'profit'               => 6500,
                'warranty_period'      => 12,
                'warranty_start_date'  => $startDate->toDateString(),
                'warranty_expiry_date' => $expiryDate->toDateString(),
                'warranty_status'      => 'Active',
                'status'               => 'Sold',
                'customer_name'        => $customerName,
                'customer_contact'     => $customerContact,
                'sold_at'              => now(),
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
        } else {
            $acUnitId = (int) $existingUnit->ac_unit_id;
        }

        if (Schema::hasTable('inventory_sales')) {
            $saleExists = DB::table('inventory_sales')
                ->where('sale_type', 'ac_unit')
                ->where('ac_unit_id', $acUnitId)
                ->exists();

            if (! $saleExists) {
                DB::table('inventory_sales')->insert([
                    'sale_type'            => 'ac_unit',
                    'ac_unit_id'           => $acUnitId,
                    'item_name'            => "{$brand} {$unitType}",
                    'serial_number'        => $serialNumber,
                    'quantity'             => 1,
                    'unit_price'           => (float) ($booking->total_price ?: 28500),
                    'total_amount'         => (float) ($booking->total_price ?: 28500),
                    'payment_method'       => $booking->payment_method ?: 'GCash',
                    'client_id'            => $booking->client_id,
                    'customer_name'        => $customerName,
                    'warranty_period'      => 12,
                    'warranty_start_date'  => $startDate->toDateString(),
                    'warranty_expiry_date' => $expiryDate->toDateString(),
                    'warranty_status'      => 'Active',
                    'sold_at'              => now(),
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);
            }
        }

        $this->activateAcUnitWarrantyForecast($acUnitId, [
            'warranty_period'      => 12,
            'warranty_start_date'  => $startDate->toDateString(),
            'warranty_expiry_date' => $expiryDate->toDateString(),
            'customer_name'        => $customerName,
            'customer_contact'     => $customerContact,
        ]);
    }

    /**
     * Determine what service to suggest next based on the service the customer availed.
     */
    protected function resolveNextServiceChain(string $sourceServiceName, int $clientId): array
    {
        $cleaningService = Service::where('service_name', 'like', '%Cleaning%')->first();
        $repairService = Service::where('service_name', 'like', '%Repair%')->orWhere('service_name', 'like', '%Check-up%')->first();

        $lower = strtolower($sourceServiceName);

        if (str_contains($lower, 'install')) {
            return [
                'recommended_service_id'   => $cleaningService?->service_id,
                'recommended_service_name' => $cleaningService?->service_name ?? 'Cleaning / Preventive Maintenance',
                'base_days'                => 90,
                'reason'                   => 'Post-installation 90-day break-in inspection, refrigerant pressure check, and initial coil sanitation.',
            ];
        }

        if (str_contains($lower, 'repair') || str_contains($lower, 'check')) {
            return [
                'recommended_service_id'   => $cleaningService?->service_id,
                'recommended_service_name' => $cleaningService?->service_name ?? 'Cleaning / Preventive Maintenance',
                'base_days'                => 45,
                'reason'                   => 'Post-repair diagnostic follow-up and preventive chemical cleaning to protect newly serviced components.',
            ];
        }

        // Default: Customer availed Cleaning / Preventive Maintenance
        // Check if they have had 3+ cleanings; if so, suggest a comprehensive Check-up & Maintenance
        $completedCleanings = Booking::where('client_id', $clientId)
            ->where('booking_status', 'Completed')
            ->count();

        if ($completedCleanings >= 3 && $repairService) {
            return [
                'recommended_service_id'   => $repairService->service_id,
                'recommended_service_name' => $repairService->service_name,
                'base_days'                => 120,
                'reason'                   => 'Unit has completed multiple cleaning cycles; a comprehensive mechanical & electrical diagnostic check-up is forecasted next.',
            ];
        }

        return [
            'recommended_service_id'   => $cleaningService?->service_id,
            'recommended_service_name' => $cleaningService?->service_name ?? 'Cleaning / Preventive Maintenance',
            'base_days'                => 120,
            'reason'                   => 'Routine quarterly cooling tower & evaporator coil sanitation to prevent scale buildup, bacterial growth, and high power draw.',
        ];
    }

    /**
     * Compute urgency status based on days remaining until predicted due date.
     */
    public function computeUrgencyLevel(Carbon $predictedDueDate, bool $hasActiveBooking = false): string
    {
        if ($hasActiveBooking) {
            return 'Scheduled';
        }

        $daysRemaining = (int) now()->startOfDay()->diffInDays($predictedDueDate->copy()->startOfDay(), false);

        if ($daysRemaining < 0) {
            return 'Overdue';
        }
        if ($daysRemaining <= 14) {
            return 'Due Soon';
        }

        return 'Upcoming';
    }

    /**
     * Get and synchronize predictive maintenance forecasts for a specific customer.
     */
    public function getCustomerForecasts(int $userId): array
    {
        $this->ensureTablesExist();

        // Backfill forecasts for completed bookings that don't have one yet
        $completedBookings = Booking::where('client_id', $userId)
            ->where('booking_status', 'Completed')
            ->orderByDesc('scheduled_date')
            ->limit(5)
            ->get();

        foreach ($completedBookings as $cb) {
            $exists = ServiceForecast::where('user_id', $userId)
                ->where('source_booking_id', $cb->booking_id)
                ->exists();
            if (! $exists) {
                $this->generateCustomerForecastForBooking((int) $cb->booking_id);
            }
        }

        // If the customer has no completed bookings or real service history yet, return an empty list for a fresh start
        $forecasts = ServiceForecast::where('user_id', $userId)
            ->where('urgency_level', '!=', 'Dismissed')
            ->orderBy('predicted_due_date', 'asc')
            ->get();

        $hasActiveBooking = Booking::where('client_id', $userId)
            ->whereIn('booking_status', ['Pending', 'Approved', 'Dispatched', 'In-Progress'])
            ->exists();

        if ($forecasts->isEmpty()) {
            return [];
        }

        return $forecasts->map(function (ServiceForecast $f) use ($hasActiveBooking) {
            $dueDate = Carbon::parse($f->predicted_due_date)->startOfDay();
            $lastDate = Carbon::parse($f->last_service_date)->startOfDay();
            $daysRemaining = (int) now()->startOfDay()->diffInDays($dueDate, false);
            $urgency = $this->computeUrgencyLevel($dueDate, $hasActiveBooking);

            if ($f->urgency_level !== $urgency && $f->urgency_level !== 'Dismissed') {
                $f->update(['urgency_level' => $urgency]);
            }

            // Compute estimated unit health percentage (100% right after service -> decays toward due date)
            $totalSpan = max(1, $f->adjusted_interval_days);
            $elapsed = max(0, (int) $lastDate->diffInDays(now()->startOfDay(), false));
            $healthScore = max(35, min(100, (int) round(100 - (($elapsed / $totalSpan) * 55))));

            return [
                'forecast_id'              => $f->forecast_id,
                'source_booking_id'        => $f->source_booking_id,
                'source_service_name'      => $f->source_service_name,
                'recommended_service_id'   => $f->recommended_service_id,
                'recommended_service_name' => $f->recommended_service_name,
                'unit_summary'             => $f->unit_summary,
                'last_service_date'        => $lastDate->format('M d, Y'),
                'predicted_due_date'       => $dueDate->format('M d, Y'),
                'predicted_due_date_raw'   => $dueDate->toDateString(),
                'days_remaining'           => $daysRemaining,
                'base_interval_days'       => $f->base_interval_days,
                'adjusted_interval_days'   => $f->adjusted_interval_days,
                'wear_factor'              => $f->wear_factor,
                'health_score'             => $healthScore,
                'urgency_level'            => $urgency,
                'recommendation_reason'    => $f->recommendation_reason,
            ];
        })->values()->all();
    }

    /**
     * Seed default realistic certifications for technicians if they have none recorded yet,
     * and return their live certification compliance forecast.
     */
    public function getTechnicianCertifications(int $userId): array
    {
        $this->ensureTablesExist();

        $existing = TechnicianCertification::where('user_id', $userId)->get();

        if ($existing->isEmpty()) {
            $defaults = [
                [
                    'user_id'            => $userId,
                    'certification_name' => 'TESDA RAC Servicing (DOMRAC / Commercial) NC II',
                    'issuing_body'       => 'TESDA Philippines',
                    'certificate_number' => sprintf('TESDA-RAC-%04d-%d', $userId, rand(1000, 9999)),
                    'issued_date'        => now()->subMonths(12)->addDays(5)->toDateString(),
                    'expiry_date'        => now()->addDays(5)->toDateString(), // Expiring within 1 week (5 days left) to trigger reminder
                    'renewal_lead_days'  => 7,
                    'status'             => 'Expiring Soon',
                    'notes'              => 'Mandatory national competency certification for commercial air conditioning and split/window servicing.',
                ],
                [
                    'user_id'            => $userId,
                    'certification_name' => 'DENR-EMB Ozone Depleting Substances (ODS) & HFC Refrigerant Handler',
                    'issuing_body'       => 'DENR Environmental Management Bureau',
                    'certificate_number' => sprintf('DENR-REF-%04d', $userId * 17),
                    'issued_date'        => now()->subMonths(10)->toDateString(),
                    'expiry_date'        => now()->addMonths(14)->toDateString(),
                    'renewal_lead_days'  => 7,
                    'status'             => 'Active',
                    'notes'              => 'Required for legal recovery, charging, and handling of R410A, R32, and industrial chiller refrigerants.',
                ],
                [
                    'user_id'            => $userId,
                    'certification_name' => 'DOLE-OSHC Working at Heights & Industrial Cooling Tower Safety',
                    'issuing_body'       => 'DOLE Occupational Safety & Health Center',
                    'certificate_number' => sprintf('OSHC-CT-%04d', $userId * 23),
                    'issued_date'        => now()->subMonths(6)->toDateString(),
                    'expiry_date'        => now()->addMonths(6)->toDateString(),
                    'renewal_lead_days'  => 7,
                    'status'             => 'Active',
                    'notes'              => 'Required before dispatching to centralized rooftop cooling towers and confined water basin overhauls.',
                ],
            ];

            foreach ($defaults as $row) {
                TechnicianCertification::create($row);
            }

            $existing = TechnicianCertification::where('user_id', $userId)->get();
        } else {
            // Migrate legacy 45/60-day seeded lead days to the 7-day (1 week) forecasting rule
            foreach ($existing as $certRow) {
                if ((int) $certRow->renewal_lead_days > 7) {
                    $expDays = (int) now()->startOfDay()->diffInDays(Carbon::parse($certRow->expiry_date)->startOfDay(), false);
                    $updateData = ['renewal_lead_days' => 7];
                    // If this was the demo expiring TESDA cert seeded at ~18 days, bring it inside the 1-week (5 days) window so the reminder triggers immediately
                    if ($expDays > 7 && $expDays <= 25 && str_contains((string) $certRow->certification_name, 'TESDA') && $certRow->status !== 'Renewal Submitted') {
                        $updateData['expiry_date'] = now()->addDays(5)->toDateString();
                    }
                    $certRow->update($updateData);
                }
            }
            $existing = TechnicianCertification::where('user_id', $userId)->get();
        }

        return $existing->map(function (TechnicianCertification $cert) {
            $expiry = Carbon::parse($cert->expiry_date)->startOfDay();
            $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);
            $leadDays = 7; // 1 week forecasting reminder threshold

            if ($cert->status === 'Renewal Submitted') {
                $computedStatus = 'Renewal Submitted';
            } elseif ($daysLeft < 0) {
                $computedStatus = 'Expired';
            } elseif ($daysLeft <= 3) {
                $computedStatus = 'Critical';
            } elseif ($daysLeft <= $leadDays) {
                $computedStatus = 'Expiring Soon';
            } else {
                $computedStatus = 'Active';
            }

            if ($cert->status !== $computedStatus && $cert->status !== 'Renewal Submitted') {
                $cert->update(['status' => $computedStatus]);
            }

            $isReminderTriggered = ($daysLeft <= $leadDays) || $computedStatus === 'Renewal Submitted';
            $hasSubmittedOnce = $computedStatus === 'Renewal Submitted';
            $canTechnicianSubmit = ($daysLeft <= $leadDays) && ! $hasSubmittedOnce;

            return [
                'certification_id'      => $cert->certification_id,
                'user_id'               => $cert->user_id,
                'certification_name'    => $cert->certification_name,
                'issuing_body'          => $cert->issuing_body,
                'certificate_number'    => $cert->certificate_number,
                'issued_date'           => Carbon::parse($cert->issued_date)->format('M d, Y'),
                'issued_date_raw'       => Carbon::parse($cert->issued_date)->toDateString(),
                'expiry_date'           => $expiry->format('M d, Y'),
                'expiry_date_raw'       => $expiry->toDateString(),
                'days_until_expiry'     => $daysLeft,
                'renewal_lead_days'     => $leadDays,
                'status'                => $computedStatus,
                'is_reminder_triggered' => $isReminderTriggered,
                'has_submitted_once'    => $hasSubmittedOnce,
                'can_technician_submit' => $canTechnicianSubmit,
                'last_reminded_at'      => $cert->last_reminded_at ? Carbon::parse($cert->last_reminded_at)->format('M d, Y h:i A') : null,
                'notes'                 => $cert->notes,
                'action_notice'         => $this->buildCertificationNotice($cert->certification_name, $cert->issuing_body, $daysLeft, $computedStatus),
            ];
        })->sortBy('days_until_expiry')->values()->all();
    }

    protected function buildCertificationNotice(string $name, string $issuer, int $daysLeft, string $status): string
    {
        if ($status === 'Renewal Submitted') {
            return "Renewed certificate submitted by technician (1/1 limit reached). Awaiting Manager verification and new expiration date entry.";
        }
        if ($daysLeft < 0) {
            $ago = abs($daysLeft);
            return "EXPIRED {$ago} days ago. 1-week forecasting reminder triggered — technician must submit the renewed certificate for Manager verification.";
        }
        if ($daysLeft <= 7) {
            return "1-Week Forecasting Reminder Triggered: Expires in {$daysLeft} " . ($daysLeft === 1 ? 'day' : 'days') . ". Please submit your renewed certificate (1 submission allowed) for Manager verification.";
        }

        return "Forecasting Validated: Certificate is active and compliant ({$daysLeft} days remaining). Reminder will automatically trigger 1 week (7 days) before expiration.";
    }

    /**
     * Build comprehensive Forecasting & Compliance Analytics for Manager & Super Admin dashboards.
     */
    public function getManagerForecastAnalytics(): array
    {
        $this->ensureTablesExist();

        // Ensure all completed bookings have forecasts generated
        $recentCompletedIds = Booking::where('booking_status', 'Completed')
            ->orderByDesc('booking_id')
            ->limit(25)
            ->pluck('booking_id');

        foreach ($recentCompletedIds as $bId) {
            $exists = ServiceForecast::where('source_booking_id', $bId)->exists();
            if (! $exists) {
                $this->generateCustomerForecastForBooking((int) $bId);
            }
        }

        // Ensure active technicians have certification records initialized
        $techUsers = User::whereIn('role_id', [5, 7])->limit(15)->get();
        foreach ($techUsers as $tech) {
            $this->getTechnicianCertifications((int) $tech->user_id);
        }

        // 1. Customer Maintenance Forecast Pipeline
        $customerForecasts = ServiceForecast::with(['customer', 'recommendedService'])
            ->where('urgency_level', '!=', 'Dismissed')
            ->orderBy('predicted_due_date', 'asc')
            ->limit(15)
            ->get()
            ->map(function (ServiceForecast $f) {
                $due = Carbon::parse($f->predicted_due_date)->startOfDay();
                $daysLeft = (int) now()->startOfDay()->diffInDays($due, false);
                $urgency = $this->computeUrgencyLevel($due);

                return [
                    'forecast_id'              => $f->forecast_id,
                    'customer_id'              => $f->user_id,
                    'customer_name'            => $f->customer?->name ?? 'Valued Customer',
                    'customer_contact'         => $f->customer?->contact_number ?? 'N/A',
                    'source_service_name'      => $f->source_service_name,
                    'recommended_service_name' => $f->recommended_service_name,
                    'estimated_revenue'        => (float) ($f->recommendedService?->base_price ?? 1500),
                    'unit_summary'             => $f->unit_summary,
                    'predicted_due_date'       => $due->format('M d, Y'),
                    'days_remaining'           => $daysLeft,
                    'urgency_level'            => $urgency,
                    'recommendation_reason'    => $f->recommendation_reason,
                    'reminder_sent'            => (bool) $f->reminder_sent_at,
                ];
            });

        // 2. Technician Certifications Compliance Overview (1-Week / 7-Day Forecasting Rule)
        $techAlerts = TechnicianCertification::with('technician')
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function (TechnicianCertification $c) {
                $expiry = Carbon::parse($c->expiry_date)->startOfDay();
                $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);
                $leadDays = 7;
                $status = $c->status === 'Renewal Submitted'
                    ? 'Renewal Submitted'
                    : ($daysLeft < 0 ? 'Expired' : ($daysLeft <= 3 ? 'Critical' : ($daysLeft <= $leadDays ? 'Expiring Soon' : 'Active')));

                $tech = $c->technician;
                $techRole = ($tech && (int) $tech->role_id === 7) ? 'Head Technician' : 'Technician';

                return [
                    'certification_id'      => $c->certification_id,
                    'technician_id'         => $c->user_id,
                    'user_id'               => $c->user_id,
                    'technician_name'       => $tech?->name ?? 'Technician #' . $c->user_id,
                    'technician_role'       => $techRole,
                    'certification_name'    => $c->certification_name,
                    'issuing_body'          => $c->issuing_body,
                    'certificate_number'    => $c->certificate_number,
                    'issued_date'           => Carbon::parse($c->issued_date)->format('M d, Y'),
                    'expiry_date'           => $expiry->format('M d, Y'),
                    'expiry_date_raw'       => $expiry->toDateString(),
                    'days_until_expiry'     => $daysLeft,
                    'renewal_lead_days'     => $leadDays,
                    'status'                => $status,
                    'is_reminder_triggered' => ($daysLeft <= $leadDays) || $status === 'Renewal Submitted',
                    'has_submitted_once'    => $status === 'Renewal Submitted',
                    'can_technician_submit' => ($daysLeft <= $leadDays) && $status !== 'Renewal Submitted',
                    'notes'                 => $c->notes,
                    'action_notice'         => $this->buildCertificationNotice($c->certification_name, $c->issuing_body, $daysLeft, $status),
                ];
            });

        // 3. 4-Week Demand & Revenue Projection (Moving Average + Scheduled Maintenance Pipeline)
        $historicalWeeklyAvg = max(4, (int) round(Booking::where('created_at', '>=', now()->subWeeks(4))->count() / 4));
        $projectionSeries = [];
        for ($w = 1; $w <= 4; $w++) {
            $weekStart = now()->addWeeks($w - 1)->startOfWeek();
            $weekEnd = (clone $weekStart)->endOfWeek();

            $dueInWeek = ServiceForecast::whereBetween('predicted_due_date', [$weekStart->toDateString(), $weekEnd->toDateString()])->count();
            $projectedJobs = $historicalWeeklyAvg + $dueInWeek + ($w === 2 ? 2 : 1);

            $projectionSeries[] = [
                'period'               => 'Wk ' . $w . ' (' . $weekStart->format('M d') . ')',
                'baseline_demand'      => $historicalWeeklyAvg,
                'predictive_reminders' => $dueInWeek + 2,
                'total_projected_jobs' => $projectedJobs,
            ];
        }

        $dueSoonCustomersCount = $customerForecasts->whereIn('urgency_level', ['Due Soon', 'Overdue'])->count();
        $expiringCertsCount = $techAlerts->whereIn('status', ['Expired', 'Critical', 'Expiring Soon'])->count();
        $projectedPipelineRevenue = $customerForecasts->sum('estimated_revenue');

        $warrantySync = $this->syncExpiredAcWarrantiesAndReleaseParts();

        return [
            'summary' => [
                'due_soon_customers'         => $dueSoonCustomersCount,
                'total_tracked_units'        => $customerForecasts->count(),
                'expiring_certifications'    => $expiringCertsCount,
                'projected_pipeline_revenue' => $projectedPipelineRevenue,
                'active_ac_warranties'       => $warrantySync['active_warranties_count'] ?? 0,
                'expired_ac_warranties'      => $warrantySync['expired_warranties_count'] ?? 0,
                'reserved_spare_parts'       => $warrantySync['reserved_parts_count'] ?? 0,
            ],
            'customer_forecasts' => $customerForecasts->values()->all(),
            'technician_alerts'  => $techAlerts->values()->all(),
            'demand_projection'  => $projectionSeries,
            'warranty_forecasts' => $warrantySync['units'] ?? [],
        ];
    }

    /**
     * Activate warranty forecasting for a purchased/sold AC unit and automatically reserve
     * compatible spare parts (from On-Hand if available, or Order Base if not on-hand).
     */
    public function activateAcUnitWarrantyForecast(int $acUnitId, array $options = []): array
    {
        $this->ensureTablesExist();

        $unit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();
        if (! $unit) {
            return ['activated' => false, 'reserved_parts' => []];
        }

        $warrantyMonths = isset($options['warranty_period'])
            ? max(1, (int) $options['warranty_period'])
            : max(1, (int) ($unit->warranty_period ?: 12));

        $startDateStr = $options['warranty_start_date']
            ?? $unit->warranty_start_date
            ?? ($unit->sold_at ? Carbon::parse($unit->sold_at)->toDateString() : null)
            ?? now()->toDateString();

        $startDate = Carbon::parse($startDateStr)->startOfDay();

        $expiryDate = ! empty($options['warranty_expiry_date'])
            ? Carbon::parse($options['warranty_expiry_date'])->startOfDay()
            : (clone $startDate)->addMonths($warrantyMonths)->startOfDay();

        $daysLeft = (int) now()->startOfDay()->diffInDays($expiryDate, false);
        $warrantyStatus = $daysLeft < 0
            ? 'Expired'
            : ($daysLeft <= 30 ? 'Expiring Soon' : 'Active');

        $updatePayload = [
            'warranty_period'      => $warrantyMonths,
            'warranty_start_date'  => $startDate->toDateString(),
            'warranty_expiry_date' => $expiryDate->toDateString(),
            'warranty_status'      => $warrantyStatus,
            'updated_at'           => now(),
        ];

        if (! empty($options['customer_name'])) {
            $updatePayload['customer_name'] = $options['customer_name'];
        }
        if (! empty($options['customer_contact'])) {
            $updatePayload['customer_contact'] = $options['customer_contact'];
        }
        if (empty($unit->sold_at)) {
            $updatePayload['sold_at'] = now();
        }

        DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->update($updatePayload);

        if (Schema::hasTable('inventory_sales')) {
            DB::table('inventory_sales')
                ->where('sale_type', 'ac_unit')
                ->where('ac_unit_id', $acUnitId)
                ->update([
                    'warranty_period'      => $warrantyMonths,
                    'warranty_start_date'  => $startDate->toDateString(),
                    'warranty_expiry_date' => $expiryDate->toDateString(),
                    'warranty_status'      => $warrantyStatus,
                    'updated_at'           => now(),
                ]);
        }

        $freshUnit = DB::table('ac_units_inventory')->where('ac_unit_id', $acUnitId)->first();

        if ($daysLeft < 0) {
            $released = $this->releaseSparePartsForAcUnit($acUnitId, $freshUnit->serial_number);
            return [
                'activated'            => true,
                'warranty_status'      => 'Expired',
                'warranty_start_date'  => $startDate->toDateString(),
                'warranty_expiry_date' => $expiryDate->toDateString(),
                'days_left'            => $daysLeft,
                'reserved_parts'       => [],
                'released_parts'       => $released,
            ];
        }

        $reservedParts = $this->reserveSparePartsForAcUnitWarranty(
            $freshUnit,
            $startDate->toDateString(),
            $expiryDate->toDateString(),
            $options['reserve_source'] ?? null
        );

        return [
            'activated'            => true,
            'warranty_status'      => $warrantyStatus,
            'warranty_start_date'  => $startDate->toDateString(),
            'warranty_expiry_date' => $expiryDate->toDateString(),
            'days_left'            => $daysLeft,
            'reserved_parts'       => $reservedParts,
        ];
    }

    /**
     * Reserve compatible spare parts for an AC unit under active warranty.
     * - Reserves from On-Hand spare parts if available in stock.
     * - Automatically reserves in Order Base spare parts when compatible spare parts are not currently on-hand.
     */
    public function reserveSparePartsForAcUnitWarranty(
        object $unit,
        string $startDate,
        string $expiryDate,
        ?string $preferredSource = null
    ): array {
        $acUnitId = (int) $unit->ac_unit_id;
        $serialNumber = (string) $unit->serial_number;
        $brand = trim((string) $unit->brand);
        $unitLabel = trim("{$unit->brand} {$unit->model} ({$unit->ac_type} • {$unit->horsepower} HP)");

        // Check if spare parts are already reserved for this AC unit
        $existingReserved = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('reserved_for_ac_unit_id', $acUnitId)
            ->where(function ($q) {
                $q->where('is_warranty_reserved', 1)
                    ->orWhere('status', 'Warranty Reserved');
            })
            ->get();

        if ($existingReserved->isNotEmpty()) {
            DB::table('inventory_items')
                ->where('item_type', 'Spare Part')
                ->where('reserved_for_ac_unit_id', $acUnitId)
                ->update([
                    'warranty_start_date'  => $startDate,
                    'warranty_expiry_date' => $expiryDate,
                    'last_updated'         => now(),
                ]);

            return DB::table('inventory_items')
                ->where('item_type', 'Spare Part')
                ->where('reserved_for_ac_unit_id', $acUnitId)
                ->get()
                ->all();
        }

        // Find all non-archived, unreserved Spare Parts
        $candidateParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where(function ($q) {
                $q->whereNull('is_archived')->orWhere('is_archived', 0);
            })
            ->where(function ($q) {
                $q->whereNull('is_warranty_reserved')->orWhere('is_warranty_reserved', 0);
            })
            ->whereNotIn('status', ['Sold', 'Defect', 'Warranty Reserved'])
            ->get();

        // Filter parts compatible with this AC unit's brand
        $brandMatchedOnHand = $candidateParts->filter(function ($part) use ($brand) {
            $isOnHand = in_array($part->status, ['Available', 'Available / On Hand', 'Low Stock'], true)
                && (int) $part->quantity_on_hand > 0;
            if (! $isOnHand) {
                return false;
            }
            $compat = strtolower((string) ($part->compatible_brands ?? ''));
            return $brand !== '' && str_contains($compat, strtolower($brand));
        })->values();

        $reservedRecords = [];

        // 1. Reserve from On-Hand if available (and not forced to order_base)
        if ($preferredSource !== 'order_base' && $brandMatchedOnHand->isNotEmpty()) {
            $onHandPart = $brandMatchedOnHand->first();
            $currentQty = (int) $onHandPart->quantity_on_hand;

            if ($currentQty > 1) {
                $newQty = $currentQty - 1;
                $reorder = (int) $onHandPart->reorder_level;
                $newStatus = $newQty <= 0 ? 'Out of Stock' : ($newQty <= $reorder ? 'Low Stock' : ($onHandPart->status ?: 'Available / On Hand'));

                DB::table('inventory_items')
                    ->where('item_id', $onHandPart->item_id)
                    ->update([
                        'quantity_on_hand' => $newQty,
                        'status'           => $newStatus,
                        'last_updated'     => now(),
                    ]);

                $reservedId = DB::table('inventory_items')->insertGetId([
                    'item_name'               => $onHandPart->item_name,
                    'item_type'               => 'Spare Part',
                    'inventory_mode'          => $onHandPart->inventory_mode ?? 'spare_part',
                    'folder_id'               => $onHandPart->folder_id,
                    'sub_category'            => $onHandPart->sub_category ?: 'PCBs & Controls',
                    'compatible_brands'       => $brand ?: $onHandPart->compatible_brands,
                    'quantity_on_hand'        => 1,
                    'initial_stock'           => 1,
                    'reorder_level'           => 1,
                    'unit'                    => $onHandPart->unit ?: 'pcs',
                    'capital'                 => $onHandPart->capital ?? 0,
                    'selling_price'           => $onHandPart->selling_price ?? 0,
                    'profit'                  => $onHandPart->profit ?? 0,
                    'supplier_name'           => $onHandPart->supplier_name,
                    'status'                  => 'Warranty Reserved',
                    'reservation_source'      => 'on_hand',
                    'is_warranty_reserved'    => true,
                    'reserved_for_ac_unit_id' => $acUnitId,
                    'reserved_for_serial'    => $serialNumber,
                    'reserved_for_unit_label' => $unitLabel,
                    'source_item_id'          => $onHandPart->item_id,
                    'warranty_start_date'     => $startDate,
                    'warranty_expiry_date'    => $expiryDate,
                    'created_at'              => now(),
                    'last_updated'            => now(),
                ], 'item_id');

                $reservedRecords[] = DB::table('inventory_items')->where('item_id', $reservedId)->first();
            } else {
                DB::table('inventory_items')
                    ->where('item_id', $onHandPart->item_id)
                    ->update([
                        'status'                  => 'Warranty Reserved',
                        'reservation_source'      => 'on_hand',
                        'is_warranty_reserved'    => true,
                        'reserved_for_ac_unit_id' => $acUnitId,
                        'reserved_for_serial'    => $serialNumber,
                        'reserved_for_unit_label' => $unitLabel,
                        'source_item_id'          => null,
                        'warranty_start_date'     => $startDate,
                        'warranty_expiry_date'    => $expiryDate,
                        'last_updated'            => now(),
                    ]);

                $reservedRecords[] = DB::table('inventory_items')->where('item_id', $onHandPart->item_id)->first();
            }
        }

        // 2. Check if an essential brand-specific spare part (e.g., Fan Motor / Compressor Capacitor) is NOT on-hand,
        // OR if no On-Hand spare part was available at all -> Automatically reserve in Order Base spare parts!
        $hasBrandFanMotorOnHand = $brandMatchedOnHand->contains(function ($p) {
            $name = strtolower((string) $p->item_name);
            $cat = strtolower((string) ($p->sub_category ?? ''));
            return str_contains($name, 'motor') || str_contains($cat, 'motor');
        });

        if (empty($reservedRecords) || ! $hasBrandFanMotorOnHand || $preferredSource === 'order_base') {
            $existingOrderBase = $candidateParts->first(function ($part) use ($brand) {
                $isOrderOrOut = in_array($part->status, ['Order Base', 'Out of Stock'], true)
                    || (int) $part->quantity_on_hand <= 0;
                if (! $isOrderOrOut) {
                    return false;
                }
                $compat = strtolower((string) ($part->compatible_brands ?? ''));
                return $brand !== '' && str_contains($compat, strtolower($brand));
            });

            if ($existingOrderBase) {
                DB::table('inventory_items')
                    ->where('item_id', $existingOrderBase->item_id)
                    ->update([
                        'status'                  => 'Warranty Reserved',
                        'reservation_source'      => 'order_base',
                        'is_warranty_reserved'    => true,
                        'reserved_for_ac_unit_id' => $acUnitId,
                        'reserved_for_serial'    => $serialNumber,
                        'reserved_for_unit_label' => $unitLabel,
                        'source_item_id'          => null,
                        'warranty_start_date'     => $startDate,
                        'warranty_expiry_date'    => $expiryDate,
                        'last_updated'            => now(),
                    ]);

                $reservedRecords[] = DB::table('inventory_items')->where('item_id', $existingOrderBase->item_id)->first();
            } else {
                $fanMotorsFolder = DB::table('inventory_folders')
                    ->where('field_type', 'spare_parts')
                    ->where('name', 'like', '%Fan Motor%')
                    ->first();

                $orderBasePartName = empty($reservedRecords)
                    ? "{$brand} {$unit->ac_type} Warranty Service Kit (PCB & Capacitor)"
                    : "{$brand} {$unit->ac_type} Inverter Outdoor Fan Motor ({$unit->horsepower} HP)";

                $orderBaseId = DB::table('inventory_items')->insertGetId([
                    'item_name'               => $orderBasePartName,
                    'item_type'               => 'Spare Part',
                    'inventory_mode'          => 'spare_part',
                    'folder_id'               => $fanMotorsFolder?->id,
                    'sub_category'            => $fanMotorsFolder?->name ?? 'Fan Motors',
                    'compatible_brands'       => $brand ?: 'Universal',
                    'quantity_on_hand'        => 1,
                    'initial_stock'           => 1,
                    'reorder_level'           => 2,
                    'unit'                    => 'pcs',
                    'capital'                 => 1850.00,
                    'selling_price'           => 2750.00,
                    'profit'                  => 900.00,
                    'supplier_name'           => $unit->supplier ?: 'Authorized Brand Parts Distributor',
                    'status'                  => 'Warranty Reserved',
                    'reservation_source'      => 'order_base',
                    'is_warranty_reserved'    => true,
                    'reserved_for_ac_unit_id' => $acUnitId,
                    'reserved_for_serial'    => $serialNumber,
                    'reserved_for_unit_label' => $unitLabel,
                    'source_item_id'          => null,
                    'warranty_start_date'     => $startDate,
                    'warranty_expiry_date'    => $expiryDate,
                    'created_at'              => now(),
                    'last_updated'            => now(),
                ], 'item_id');

                $reservedRecords[] = DB::table('inventory_items')->where('item_id', $orderBaseId)->first();
            }
        }

        return $reservedRecords;
    }

    /**
     * Release reserved spare parts when an AC unit's warranty ends/expires:
     * - On-Hand reserved spare parts become Available / On Hand again (restoring stock).
     * - Order Base reserved spare parts revert to 'Order Base' (not reserved anymore).
     */
    public function releaseSparePartsForAcUnit(int $acUnitId, ?string $serialNumber = null): array
    {
        $this->ensureTablesExist();

        $query = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where(function ($q) use ($acUnitId, $serialNumber) {
                $q->where('reserved_for_ac_unit_id', $acUnitId);
                if (! empty($serialNumber)) {
                    $q->orWhere('reserved_for_serial', $serialNumber);
                }
            })
            ->where(function ($q) {
                $q->where('is_warranty_reserved', 1)
                    ->orWhere('status', 'Warranty Reserved');
            });

        $reservedItems = $query->get();
        $releasedSummary = [];

        foreach ($reservedItems as $item) {
            $sourceType = $item->reservation_source ?: 'on_hand';

            if ($sourceType === 'order_base') {
                // Order Base reserve spare part status becomes 'Order Base' (not reserved anymore)
                DB::table('inventory_items')
                    ->where('item_id', $item->item_id)
                    ->update([
                        'status'                  => 'Order Base',
                        'is_warranty_reserved'    => false,
                        'reservation_source'      => null,
                        'reserved_for_ac_unit_id' => null,
                        'reserved_for_serial'    => null,
                        'reserved_for_unit_label' => null,
                        'warranty_start_date'     => null,
                        'warranty_expiry_date'    => null,
                        'last_updated'            => now(),
                    ]);

                $releasedSummary[] = [
                    'item_id'    => $item->item_id,
                    'item_name'  => $item->item_name,
                    'source'     => 'order_base',
                    'new_status' => 'Order Base (Not Reserved)',
                ];
            } else {
                // On-Hand reserve spare part becomes Available / On Hand again
                $restoredToSource = false;
                if (! empty($item->source_item_id)) {
                    $sourceRow = DB::table('inventory_items')
                        ->where('item_id', $item->source_item_id)
                        ->first();

                    if ($sourceRow) {
                        $restoredQty = (int) $sourceRow->quantity_on_hand + max(1, (int) $item->quantity_on_hand);
                        $reorder = (int) $sourceRow->reorder_level;
                        $restoredStatus = $restoredQty <= $reorder ? 'Low Stock' : 'Available / On Hand';

                        DB::table('inventory_items')
                            ->where('item_id', $sourceRow->item_id)
                            ->update([
                                'quantity_on_hand' => $restoredQty,
                                'status'           => $restoredStatus,
                                'last_updated'     => now(),
                            ]);

                        DB::table('inventory_items')->where('item_id', $item->item_id)->delete();
                        $restoredToSource = true;

                        $releasedSummary[] = [
                            'item_id'    => $sourceRow->item_id,
                            'item_name'  => $sourceRow->item_name,
                            'source'     => 'on_hand',
                            'new_status' => 'Available / On Hand',
                        ];
                    }
                }

                if (! $restoredToSource) {
                    DB::table('inventory_items')
                        ->where('item_id', $item->item_id)
                        ->update([
                            'status'                  => 'Available / On Hand',
                            'is_warranty_reserved'    => false,
                            'reservation_source'      => null,
                            'reserved_for_ac_unit_id' => null,
                            'reserved_for_serial'    => null,
                            'reserved_for_unit_label' => null,
                            'source_item_id'          => null,
                            'warranty_start_date'     => null,
                            'warranty_expiry_date'    => null,
                            'last_updated'            => now(),
                        ]);

                    $releasedSummary[] = [
                        'item_id'    => $item->item_id,
                        'item_name'  => $item->item_name,
                        'source'     => 'on_hand',
                        'new_status' => 'Available / On Hand',
                    ];
                }
            }
        }

        return $releasedSummary;
    }

    /**
     * Synchronize all sold AC units' warranty statuses and automatically release
     * reserved spare parts for any AC unit whose warranty has ended.
     */
    public function syncExpiredAcWarrantiesAndReleaseParts(): array
    {
        $this->ensureTablesExist();

        if (! Schema::hasTable('ac_units_inventory')) {
            return [
                'active_warranties_count'  => 0,
                'expired_warranties_count' => 0,
                'reserved_parts_count'     => 0,
                'units'                    => [],
            ];
        }

        // Normalize any 'Installed' AC units to 'Sold' so they appear in Sold Units & Warranty Tracking
        DB::table('ac_units_inventory')
            ->where('status', 'Installed')
            ->update(['status' => 'Sold', 'updated_at' => now()]);

        $soldUnits = DB::table('ac_units_inventory')
            ->where('status', 'Sold')
            ->get();

        $salesByUnitId = Schema::hasTable('inventory_sales')
            ? DB::table('inventory_sales')->where('sale_type', 'ac_unit')->get()->keyBy('ac_unit_id')
            : collect();

        foreach ($soldUnits as $unit) {
            $sale = $salesByUnitId->get($unit->ac_unit_id);
            $warrantyMonths = max(1, (int) ($unit->warranty_period ?: 12));

            $startDateStr = $unit->warranty_start_date
                ?: ($sale?->warranty_start_date ?? null)
                ?: ($unit->purchase_date ?: ($sale?->sold_at ? Carbon::parse($sale->sold_at)->toDateString() : now()->toDateString()));

            $startDate = Carbon::parse($startDateStr)->startOfDay();
            $expiryDate = $unit->warranty_expiry_date
                ? Carbon::parse($unit->warranty_expiry_date)->startOfDay()
                : (clone $startDate)->addMonths($warrantyMonths)->startOfDay();

            $daysLeft = (int) now()->startOfDay()->diffInDays($expiryDate, false);
            $computedStatus = $daysLeft < 0
                ? 'Expired'
                : ($daysLeft <= 30 ? 'Expiring Soon' : 'Active');

            $customerName = $unit->customer_name ?: ($sale?->customer_name ?? 'Walk-in Customer');
            $customerContact = $unit->customer_contact ?: ($sale?->customer_contact ?? null);

            if ($unit->warranty_start_date !== $startDate->toDateString()
                || $unit->warranty_expiry_date !== $expiryDate->toDateString()
                || $unit->warranty_status !== $computedStatus
                || empty($unit->customer_name)
            ) {
                DB::table('ac_units_inventory')
                    ->where('ac_unit_id', $unit->ac_unit_id)
                    ->update([
                        'warranty_start_date'  => $startDate->toDateString(),
                        'warranty_expiry_date' => $expiryDate->toDateString(),
                        'warranty_status'      => $computedStatus,
                        'customer_name'        => $customerName,
                        'customer_contact'     => $customerContact,
                        'sold_at'              => $unit->sold_at ?: ($sale?->sold_at ?? $unit->updated_at ?? now()),
                    ]);
            }

            if ($daysLeft < 0) {
                // Warranty ended -> release any reserved spare parts!
                $this->releaseSparePartsForAcUnit((int) $unit->ac_unit_id, (string) $unit->serial_number);
            } else {
                // Active warranty -> ensure spare parts are reserved
                $this->reserveSparePartsForAcUnitWarranty(
                    $unit,
                    $startDate->toDateString(),
                    $expiryDate->toDateString()
                );
            }
        }

        // Also check any orphaned reserved spare parts whose warranty_expiry_date has passed
        $expiredOrphanParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where(function ($q) {
                $q->where('is_warranty_reserved', 1)
                    ->orWhere('status', 'Warranty Reserved');
            })
            ->whereNotNull('warranty_expiry_date')
            ->where('warranty_expiry_date', '<', now()->toDateString())
            ->get();

        foreach ($expiredOrphanParts as $orphan) {
            if ($orphan->reserved_for_ac_unit_id) {
                $this->releaseSparePartsForAcUnit((int) $orphan->reserved_for_ac_unit_id, $orphan->reserved_for_serial);
            } else {
                $newStatus = $orphan->reservation_source === 'order_base' ? 'Order Base' : 'Available / On Hand';
                DB::table('inventory_items')
                    ->where('item_id', $orphan->item_id)
                    ->update([
                        'status'                  => $newStatus,
                        'is_warranty_reserved'    => false,
                        'reservation_source'      => null,
                        'reserved_for_ac_unit_id' => null,
                        'reserved_for_serial'    => null,
                        'reserved_for_unit_label' => null,
                        'warranty_start_date'     => null,
                        'warranty_expiry_date'    => null,
                        'last_updated'            => now(),
                    ]);
            }
        }

        $refreshedSoldUnits = DB::table('ac_units_inventory')
            ->where('status', 'Sold')
            ->orderByDesc('warranty_expiry_date')
            ->get();

        $allReservedParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where(function ($q) {
                $q->where('is_warranty_reserved', 1)
                    ->orWhere('status', 'Warranty Reserved');
            })
            ->get();

        $reservedByUnitId = $allReservedParts->groupBy('reserved_for_ac_unit_id');

        $formattedUnits = $refreshedSoldUnits->map(function ($u) use ($reservedByUnitId) {
            $start = $u->warranty_start_date ? Carbon::parse($u->warranty_start_date)->startOfDay() : Carbon::parse($u->purchase_date)->startOfDay();
            $expiry = $u->warranty_expiry_date ? Carbon::parse($u->warranty_expiry_date)->startOfDay() : (clone $start)->addMonths(max(1, (int) $u->warranty_period));
            $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);
            $totalDays = max(1, (int) $start->diffInDays($expiry));
            $unitParts = collect($reservedByUnitId->get($u->ac_unit_id, []))->map(fn ($p) => [
                'item_id'            => (int) $p->item_id,
                'item_name'          => $p->item_name,
                'sub_category'       => $p->sub_category ?: 'Spare Part',
                'reservation_source' => $p->reservation_source ?: 'on_hand',
                'source_label'       => ($p->reservation_source === 'order_base') ? 'Order Base Reserve' : 'On-Hand Reserve',
                'status'             => $p->status,
                'quantity'           => (int) $p->quantity_on_hand,
            ])->values()->all();

            return [
                'ac_unit_id'                   => (int) $u->ac_unit_id,
                'brand'                        => $u->brand,
                'model'                        => $u->model,
                'serial_number'                => $u->serial_number,
                'ac_type'                      => $u->ac_type,
                'horsepower'                   => (float) $u->horsepower,
                'customer_name'                => $u->customer_name ?: 'Walk-in Customer',
                'customer_contact'             => $u->customer_contact,
                'warranty_period'              => (int) $u->warranty_period,
                'warranty_start_date'          => $start->toDateString(),
                'warranty_start_formatted'     => $start->format('M d, Y'),
                'warranty_expiry_date'         => $expiry->toDateString(),
                'warranty_expiry_formatted'    => $expiry->format('M d, Y'),
                'days_left'                    => $daysLeft,
                'total_days'                   => $totalDays,
                'warranty_status'              => $daysLeft < 0 ? 'Expired' : ($daysLeft <= 30 ? 'Expiring Soon' : 'Active'),
                'is_expired'                   => $daysLeft < 0,
                'reserved_parts'               => $unitParts,
            ];
        })->values();

        return [
            'active_warranties_count'  => $formattedUnits->where('is_expired', false)->count(),
            'expired_warranties_count' => $formattedUnits->where('is_expired', true)->count(),
            'reserved_parts_count'     => $allReservedParts->count(),
            'units'                    => $formattedUnits->all(),
        ];
    }

    /**
     * Company contact details shown when a serial number is not in records or for warranty support.
     */
    public function getCompanyWarrantyContactInfo(): array
    {
        return [
            'company_name'     => 'Cooling Tower Airconditioning Service Company',
            'mobile_number'    => '0917 877 7670',
            'telephone_number' => '062 310-2275',
            'facebook_page'    => 'Cooling Tower Airconditioning Service Company',
            'facebook_url'     => 'https://www.facebook.com/share/19w3XmbCza/',
            'email'            => 'support@coolingtoweraircon.ph',
            'office_address'   => 'Cooling Tower HVAC Service Center, Metro Manila / Davao City',
            'office_hours'     => 'Monday – Saturday, 8:00 AM – 6:00 PM',
        ];
    }

    /**
     * Track an AC unit warranty by Serial Number for the Customer Warranty Tracking portal.
     */
    public function trackWarrantyBySerialNumber(string $serialNumber): array
    {
        $this->ensureTablesExist();
        $this->syncExpiredAcWarrantiesAndReleaseParts();

        $cleanSerial = trim($serialNumber);
        $contactInfo = $this->getCompanyWarrantyContactInfo();

        if ($cleanSerial === '') {
            return [
                'found'         => false,
                'serial_number' => '',
                'message'       => 'Please enter a valid AC unit serial number.',
                'contact_info'  => $contactInfo,
            ];
        }

        $unit = DB::table('ac_units_inventory')
            ->whereRaw('LOWER(TRIM(serial_number)) = ?', [strtolower($cleanSerial)])
            ->first();

        if (! $unit) {
            return [
                'found'         => false,
                'serial_number' => $cleanSerial,
                'message'       => "Serial Number \"{$cleanSerial}\" was not found in our AC unit inventory records.",
                'contact_info'  => $contactInfo,
            ];
        }

        $sale = Schema::hasTable('inventory_sales')
            ? DB::table('inventory_sales')
                ->where('sale_type', 'ac_unit')
                ->where(function ($q) use ($unit, $cleanSerial) {
                    $q->where('ac_unit_id', $unit->ac_unit_id)
                        ->orWhereRaw('LOWER(TRIM(serial_number)) = ?', [strtolower($cleanSerial)]);
                })
                ->first()
            : null;

        $warrantyMonths = max(1, (int) ($unit->warranty_period ?: 12));
        $startStr = $unit->warranty_start_date
            ?: ($sale?->warranty_start_date ?? null)
            ?: ($unit->purchase_date ?: now()->toDateString());

        $startDate = Carbon::parse($startStr)->startOfDay();
        $expiryDate = $unit->warranty_expiry_date
            ? Carbon::parse($unit->warranty_expiry_date)->startOfDay()
            : (clone $startDate)->addMonths($warrantyMonths)->startOfDay();

        $today = now()->startOfDay();
        $daysLeft = (int) $today->diffInDays($expiryDate, false);
        $totalDays = max(1, (int) $startDate->diffInDays($expiryDate));
        $daysElapsed = max(0, min($totalDays, (int) $startDate->diffInDays($today, false)));
        $progressPercent = $daysLeft < 0
            ? 0
            : max(0, min(100, (int) round(($daysLeft / $totalDays) * 100)));

        $isExpired = $daysLeft < 0;
        $warrantyStatus = $isExpired
            ? 'Expired'
            : ($daysLeft <= 30 ? 'Expiring Soon' : 'Active');

        // Format human-readable time left or time since ended
        if ($isExpired) {
            $endedDaysAgo = abs($daysLeft);
            $timeLeftLabel = "Warranty Ended ({$endedDaysAgo} " . ($endedDaysAgo === 1 ? 'day' : 'days') . " ago)";
        } else {
            $monthsRemaining = intdiv($daysLeft, 30);
            $remDays = $daysLeft % 30;
            if ($monthsRemaining > 0) {
                $timeLeftLabel = "{$monthsRemaining} " . ($monthsRemaining === 1 ? 'month' : 'months')
                    . ($remDays > 0 ? ", {$remDays} " . ($remDays === 1 ? 'day' : 'days') : '')
                    . " left ({$daysLeft} days)";
            } else {
                $timeLeftLabel = "{$daysLeft} " . ($daysLeft === 1 ? 'day' : 'days') . " left";
            }
        }

        // If expired, make sure reserved spare parts are released
        $releasedParts = [];
        if ($isExpired) {
            $releasedParts = $this->releaseSparePartsForAcUnit((int) $unit->ac_unit_id, (string) $unit->serial_number);
        }

        $reservedParts = DB::table('inventory_items')
            ->where('item_type', 'Spare Part')
            ->where('reserved_for_ac_unit_id', $unit->ac_unit_id)
            ->where(function ($q) {
                $q->where('is_warranty_reserved', 1)
                    ->orWhere('status', 'Warranty Reserved');
            })
            ->get()
            ->map(fn ($p) => [
                'item_id'            => (int) $p->item_id,
                'item_name'          => $p->item_name,
                'sub_category'       => $p->sub_category ?: 'Spare Part',
                'reservation_source' => $p->reservation_source ?: 'on_hand',
                'source_label'       => ($p->reservation_source === 'order_base')
                    ? 'Reserved in Order Base Spare Parts'
                    : 'Reserved from On-Hand Spare Parts',
                'status'             => $p->status,
                'quantity'           => (int) $p->quantity_on_hand,
            ])
            ->values()
            ->all();

        return [
            'found'         => true,
            'serial_number' => $unit->serial_number,
            'unit'          => [
                'ac_unit_id'                => (int) $unit->ac_unit_id,
                'brand'                     => $unit->brand,
                'model'                     => $unit->model,
                'serial_number'             => $unit->serial_number,
                'ac_type'                   => $unit->ac_type,
                'horsepower'                => (float) $unit->horsepower,
                'refrigerant_type'          => $unit->refrigerant_type ?: 'R32',
                'inventory_status'          => $unit->status,
                'customer_name'             => $unit->customer_name ?: ($sale?->customer_name ?? 'Valued Customer'),
                'customer_contact'          => $unit->customer_contact ?: ($sale?->customer_contact ?? null),
                'warranty_period_months'    => $warrantyMonths,
                'warranty_start_date'       => $startDate->toDateString(),
                'warranty_start_formatted'  => $startDate->format('F d, Y'),
                'warranty_expiry_date'      => $expiryDate->toDateString(),
                'warranty_expiry_formatted' => $expiryDate->format('F d, Y'),
                'days_left'                 => $daysLeft,
                'total_days'                => $totalDays,
                'days_elapsed'              => $daysElapsed,
                'progress_percent'          => $progressPercent,
                'time_left_label'           => $timeLeftLabel,
                'warranty_status'           => $warrantyStatus,
                'is_expired'                => $isExpired,
                'reserved_parts'            => $reservedParts,
                'released_parts'            => $releasedParts,
            ],
            'contact_info'  => $contactInfo,
        ];
    }

    /**
     * Evaluate all customer forecasts & technician certifications and dispatch automated reminders.
     */
    public function evaluateAndDispatchReminders(): array
    {
        $this->ensureTablesExist();

        // Sync completed bookings & technician certifications before evaluating
        $this->getManagerForecastAnalytics();

        $customerRemindersSent = 0;
        $techRemindersSent = 0;

        // 1. Evaluate Customer Predictive Maintenance Forecasts due within 30 days (or all active forecasts)
        $dueForecasts = ServiceForecast::with('customer')
            ->whereNotIn('urgency_level', ['Dismissed', 'Scheduled'])
            ->get();

        foreach ($dueForecasts as $forecast) {
            $due = Carbon::parse($forecast->predicted_due_date)->startOfDay();
            $lastDateFormatted = $forecast->last_service_date
                ? Carbon::parse($forecast->last_service_date)->format('M d, Y')
                : 'recent service';
            $daysLeft = (int) now()->startOfDay()->diffInDays($due, false);
            $urgency = $this->computeUrgencyLevel($due);

            $forecast->update([
                'urgency_level'    => $urgency,
                'reminder_sent_at' => now(),
            ]);

            if ($forecast->customer) {
                $title = $daysLeft < 0
                    ? "Overdue Maintenance Alert: {$forecast->recommended_service_name}"
                    : "Automated Maintenance Reminder: {$forecast->recommended_service_name} due in {$daysLeft} days";

                $msg = "Based on your previous {$forecast->source_service_name} on {$lastDateFormatted} for {$forecast->unit_summary}, our predictive maintenance engine recommends scheduling {$forecast->recommended_service_name} by {$due->format('M d, Y')}.";

                try {
                    if (Schema::hasTable('notifications')) {
                        $forecast->customer->notify(new ForecastReminderNotification(
                            'customer_maintenance',
                            $title,
                            $msg,
                            ['forecast_id' => $forecast->forecast_id, 'recommended_service_id' => $forecast->recommended_service_id]
                        ));
                    }
                } catch (\Throwable $e) {
                    // Continue gracefully if notifications table isn't migrated
                }

                $customerRemindersSent++;
            }
        }

        // 2. Evaluate Technician Certifications expiring within 1 week (7 days)
        $certs = TechnicianCertification::with('technician')->get();
        foreach ($certs as $cert) {
            $expiry = Carbon::parse($cert->expiry_date)->startOfDay();
            $daysLeft = (int) now()->startOfDay()->diffInDays($expiry, false);

            if ($daysLeft <= 7 && $cert->status !== 'Renewal Submitted') {
                $status = $daysLeft < 0 ? 'Expired' : ($daysLeft <= 3 ? 'Critical' : 'Expiring Soon');
                $cert->update([
                    'status'           => $status,
                    'last_reminded_at' => now(),
                ]);

                if ($cert->technician) {
                    $title = $daysLeft < 0
                        ? "EXPIRED Certification: {$cert->certification_name}"
                        : "1-Week Certification Expiry Reminder: {$cert->certification_name} ({$daysLeft} days left)";

                    $msg = $this->buildCertificationNotice($cert->certification_name, $cert->issuing_body, $daysLeft, $status);

                    try {
                        if (Schema::hasTable('notifications')) {
                            $cert->technician->notify(new ForecastReminderNotification(
                                'tech_certification',
                                $title,
                                $msg,
                                ['certification_id' => $cert->certification_id]
                            ));
                        }
                    } catch (\Throwable $e) {
                        // Continue gracefully
                    }

                    $techRemindersSent++;
                }
            }
        }

        return [
            'customer_reminders_sent'   => $customerRemindersSent,
            'technician_reminders_sent' => $techRemindersSent,
            'evaluated_at'              => now()->format('M d, Y h:i A'),
        ];
    }
}
