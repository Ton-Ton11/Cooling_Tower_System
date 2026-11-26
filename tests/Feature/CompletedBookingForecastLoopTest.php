<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceForecast;
use App\Models\User;
use App\Notifications\ForecastReminderNotification;
use App\Services\ForecastingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompletedBookingForecastLoopTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('roles')->insertOrIgnore([
            ['role_id' => 1, 'role_name' => 'Super Admin', 'is_system' => true],
            ['role_id' => 2, 'role_name' => 'Manager', 'is_system' => true],
            ['role_id' => 3, 'role_name' => 'Admin Assistant', 'is_system' => true],
            ['role_id' => 4, 'role_name' => 'Tools Man', 'is_system' => true],
            ['role_id' => 5, 'role_name' => 'Technician', 'is_system' => true],
            ['role_id' => 6, 'role_name' => 'Customer', 'is_system' => true],
            ['role_id' => 7, 'role_name' => 'Head Technician', 'is_system' => true],
        ]);

        DB::table('services')->insertOrIgnore([
            ['service_id' => 1, 'service_name' => 'Installation', 'category' => 'Installation', 'description' => 'AC Installation', 'base_price' => 2500.00, 'booking_fee' => 50.00, 'is_active' => 1],
            ['service_id' => 2, 'service_name' => 'Repair / Check-up', 'category' => 'Repair', 'description' => 'AC Repair', 'base_price' => 1200.00, 'booking_fee' => 50.00, 'is_active' => 1],
            ['service_id' => 3, 'service_name' => 'Cleaning / Preventive Maintenance', 'category' => 'Cleaning', 'description' => 'AC Cleaning', 'base_price' => 800.00, 'booking_fee' => 50.00, 'is_active' => 1],
            ['service_id' => 4, 'service_name' => 'Ocular Inspection', 'category' => 'Ocular Inspection', 'description' => 'Free Ocular Inspection', 'base_price' => 0.00, 'booking_fee' => 0.00, 'is_active' => 1],
        ]);
    }

    private function makeCustomer(): User
    {
        return User::factory()->create([
            'role_id' => 6,
            'given_name' => 'Lia',
            'last_name' => 'Customer',
            'address' => 'Canelar, Zamboanga City',
            'contact_number' => '09171234567',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function makeBooking(User $customer, int $serviceId, string $status, Carbon $scheduledDate): Booking
    {
        return Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => $serviceId,
            'scheduled_date' => $scheduledDate,
            'service_address' => 'Canelar, Zamboanga City',
            'booking_status' => $status,
            'quotation_status' => $status === 'Completed' ? 'Accepted' : 'Quotation Issued',
            'payment_status' => 'Paid',
            'units_data' => [
                ['unit_type' => 'Split Type', 'brand' => 'Carrier', 'capacity' => '1.5 HP', 'quantity' => 1],
            ],
            'notes' => 'Forecast loop test booking',
        ]);
    }

    public function test_completed_booking_countdown_end_notifies_alerts_visibly_and_loops_new_3_months(): void
    {
        $tz = config('app.timezone', 'Asia/Manila');
        $today = Carbon::now($tz)->startOfDay();
        $endedDueDate = $today->copy()->subDay();
        $completedDate = $endedDueDate->copy()->subDays(90);

        $customer = $this->makeCustomer();
        $booking = $this->makeBooking($customer, 3, 'Completed', $completedDate);

        // Prior read timestamp before countdown ends
        DB::table('user_notification_reads')->updateOrInsert(
            ['user_id' => $customer->user_id],
            ['last_read_at' => now()->subDays(2), 'created_at' => now(), 'updated_at' => now()]
        );

        $forecast = ServiceForecast::create([
            'user_id' => $customer->user_id,
            'source_booking_id' => $booking->booking_id,
            'source_service_name' => 'Cleaning / Preventive Maintenance',
            'recommended_service_id' => 3,
            'recommended_service_name' => 'Cleaning / Preventive Maintenance',
            'unit_summary' => '1x Carrier Split Type',
            'last_service_date' => $completedDate->toDateString(),
            'predicted_due_date' => $endedDueDate->toDateString(),
            'base_interval_days' => 90,
            'adjusted_interval_days' => 90,
            'wear_factor' => 1.00,
            'urgency_level' => 'Due Soon',
        ]);

        // 1. Fetching customer completed bookings should detect ended countdown, notify once, flag visible alert, and loop +90 days
        $res = $this->actingAs($customer)->getJson('/customer/bookings?status=Completed');
        $res->assertOk();

        $bookingRow = collect($res->json('data'))->firstWhere('booking_id', $booking->booking_id);
        $this->assertNotNull($bookingRow);

        $reminder = $bookingRow['maintenance_reminder'];
        $this->assertTrue($reminder['is_alert_active']);
        $this->assertSame(1, $reminder['cycle_count']);
        $this->assertSame(2, $reminder['cycle_number']);
        $this->assertSame($endedDueDate->toDateString(), $reminder['last_reminded_due_date']);
        $this->assertSame($endedDueDate->copy()->addDays(90)->toDateString(), $reminder['due_date']);
        $this->assertGreaterThan(80, $reminder['days_remaining']);

        // 2. Database notification exists once
        $notifCount = DB::table('notifications')
            ->where('notifiable_id', $customer->user_id)
            ->where('type', ForecastReminderNotification::class)
            ->count();
        $this->assertSame(1, $notifCount);

        // 3. Re-fetching does not duplicate notifications or re-increment cycle_count
        $this->actingAs($customer)->getJson('/customer/bookings?status=Completed')->assertOk();
        $this->assertSame(
            1,
            DB::table('notifications')
                ->where('notifiable_id', $customer->user_id)
                ->where('type', ForecastReminderNotification::class)
                ->count()
        );
        $forecast->refresh();
        $this->assertSame(1, (int) $forecast->cycle_count);

        // 4. Topbar notification bell reflects unread Maintenance Due alert
        $widgetRes = $this->actingAs($customer)->getJson('/topbar/widgets');
        $widgetRes->assertOk();
        $this->assertGreaterThanOrEqual(1, $widgetRes->json('unread_notifications_count'));

        $forecastNotif = collect($widgetRes->json('notifications'))
            ->first(fn ($n) => ($n['type'] ?? '') === 'forecast' && ($n['badge'] ?? '') === 'Maintenance Due');
        $this->assertNotNull($forecastNotif);
        $this->assertTrue($forecastNotif['unread']);
    }

    public function test_live_countdown_end_endpoint_and_alert_dismissal(): void
    {
        $tz = config('app.timezone', 'Asia/Manila');
        $targetDay = Carbon::now($tz)->startOfDay()->addDay();
        $completedDate = $targetDay->copy()->subDays(90);

        $customer = $this->makeCustomer();
        $booking = $this->makeBooking($customer, 1, 'Completed', $completedDate);

        $forecast = ServiceForecast::create([
            'user_id' => $customer->user_id,
            'source_booking_id' => $booking->booking_id,
            'source_service_name' => 'Installation',
            'recommended_service_id' => 3,
            'recommended_service_name' => 'Cleaning / Preventive Maintenance',
            'unit_summary' => '1x Carrier Split Type',
            'last_service_date' => $completedDate->toDateString(),
            'predicted_due_date' => $targetDay->toDateString(),
            'base_interval_days' => 90,
            'adjusted_interval_days' => 90,
            'wear_factor' => 1.00,
            'urgency_level' => 'Due Soon',
        ]);

        // Travel to exact 08:00:01 AM on targetDay when browser countdown hits 0
        $this->travelTo($targetDay->copy()->setTime(8, 0, 1));

        $completeRes = $this->actingAs($customer)
            ->postJson("/customer/forecasts/{$forecast->forecast_id}/complete-cycle");

        $completeRes->assertOk()
            ->assertJsonPath('rolled_over', true)
            ->assertJsonPath('reminder.is_alert_active', true)
            ->assertJsonPath('reminder.cycle_count', 1)
            ->assertJsonPath('reminder.cycle_number', 2)
            ->assertJsonPath('reminder.due_date', $targetDay->copy()->addDays(90)->toDateString());

        $this->assertSame(
            1,
            DB::table('notifications')
                ->where('notifiable_id', $customer->user_id)
                ->where('type', ForecastReminderNotification::class)
                ->count()
        );

        // Customer dismisses visible alert banner; looped 3-month countdown keeps running
        $ackRes = $this->actingAs($customer)
            ->postJson("/customer/forecasts/{$forecast->forecast_id}/acknowledge");
        $ackRes->assertOk()->assertJsonPath('acknowledged', true);

        $dashRes = $this->actingAs($customer)->getJson('/customer/dashboard/data');
        $dashRes->assertOk();
        $dashForecast = collect($dashRes->json('service_forecasts'))->firstWhere('forecast_id', $forecast->forecast_id);
        $this->assertNotNull($dashForecast);
        $this->assertFalse($dashForecast['is_alert_active']);
        $this->assertSame(2, $dashForecast['cycle_number']);
        $this->assertSame($targetDay->copy()->addDays(90)->toDateString(), $dashForecast['predicted_due_date_raw']);
    }

    public function test_pending_and_ocular_bookings_do_not_enter_forecast_loop_and_multi_cycle_loops_cleanly(): void
    {
        $tz = config('app.timezone', 'Asia/Manila');
        $today = Carbon::now($tz)->startOfDay();
        $oldCompletedDate = $today->copy()->subDays(280);
        $oldDueDate = $oldCompletedDate->copy()->addDays(90);

        $customer = $this->makeCustomer();
        $pendingCleaning = $this->makeBooking($customer, 3, 'Pending', $today->copy()->subDays(100));
        $completedOcular = $this->makeBooking($customer, 4, 'Completed', $today->copy()->subDays(100));
        $completedRepair = $this->makeBooking($customer, 2, 'Completed', $oldCompletedDate);

        // No follow-up pending repair/cleaning should block completedRepair test? Wait: pendingCleaning IS an active booking!
        // Let's keep pendingCleaning as Installation? No, pending Installation still creates no forecast; Pending service 3 blocks Repair/Cleaning.
        // Change pendingCleaning to Pending Ocular to isolate pending forecast exclusion cleanly first, and test active follow-up suppression separately.
        $pendingCleaning->update(['booking_status' => 'Cancelled']);
        $pendingInstall = $this->makeBooking($customer, 1, 'Pending', $today->copy()->subDays(100));

        $oldForecast = ServiceForecast::create([
            'user_id' => $customer->user_id,
            'source_booking_id' => $completedRepair->booking_id,
            'source_service_name' => 'Repair / Check-up',
            'recommended_service_id' => 3,
            'recommended_service_name' => 'Cleaning / Preventive Maintenance',
            'unit_summary' => '1x Carrier Split Type',
            'last_service_date' => $oldCompletedDate->toDateString(),
            'predicted_due_date' => $oldDueDate->toDateString(),
            'base_interval_days' => 90,
            'adjusted_interval_days' => 90,
            'wear_factor' => 1.00,
            'urgency_level' => 'Upcoming',
        ]);

        // Run scheduler command
        $eval = app(ForecastingService::class)->evaluateAndDispatchReminders();
        $this->assertGreaterThanOrEqual(1, $eval['customer_reminders_sent']);

        $oldForecast->refresh();
        // 190 days past initial due date => 3 loops of 90 days (total +270 days => +80 days from today)
        $this->assertSame(3, (int) $oldForecast->cycle_count);
        $this->assertTrue(Carbon::parse($oldForecast->predicted_due_date)->gt($today));

        // Ocular & Pending Installation must NOT have any ServiceForecast record
        $this->assertDatabaseMissing('service_forecasts', ['source_booking_id' => $completedOcular->booking_id]);
        $this->assertDatabaseMissing('service_forecasts', ['source_booking_id' => $pendingInstall->booking_id]);
    }
}
