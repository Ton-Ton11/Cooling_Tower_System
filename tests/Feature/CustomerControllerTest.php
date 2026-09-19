<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure roles exist
        DB::table('roles')->insert([
            ['role_id' => 1, 'role_name' => 'Super Admin'],
            ['role_id' => 2, 'role_name' => 'Manager'],
            ['role_id' => 3, 'role_name' => 'Admin Assistant'],
            ['role_id' => 4, 'role_name' => 'Tools Man'],
            ['role_id' => 5, 'role_name' => 'Technician'],
            ['role_id' => 6, 'role_name' => 'Customer'],
        ]);

        // Ensure service exists
        DB::table('services')->insert([
            ['service_id' => 1, 'service_name' => 'Basic Cleaning & Filter Wash', 'description' => 'Comprehensive aircon cleaning', 'base_price' => 750.00],
        ]);
    }

    protected function createCustomer(): User
    {
        return User::factory()->create([
            'role_id' => 6,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    public function test_customer_can_access_dashboard_and_fetch_data(): void
    {
        $customer = $this->createCustomer();

        $response = $this->actingAs($customer)->getJson(route('customer.dashboard.data'));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'stats' => ['pending_bookings', 'active_bookings', 'completed_bookings', 'total_bookings'],
                'recent_bookings',
                'services',
                'user',
            ]);
    }

    public function test_customer_can_fetch_services_list(): void
    {
        $customer = $this->createCustomer();

        $response = $this->actingAs($customer)->getJson(route('customer.services'));

        $response->assertStatus(200)
            ->assertJsonFragment(['service_name' => 'Basic Cleaning & Filter Wash']);
    }

    public function test_customer_can_create_booking_with_gcash_booking_fee(): void
    {
        $customer = $this->createCustomer();
        $futureDate = Carbon::now()->addDays(2)->format('Y-m-d H:i:s');

        $payload = [
            'service_id' => 1,
            'aircon_brand' => 'Carrier',
            'aircon_type' => 'Split',
            'unit_quantity' => 2,
            'scheduled_date' => $futureDate,
            'service_payment_method' => 'Cash',
            'booking_fee' => 300.00,
            'reference_number' => 'GCASH123456789',
            'sender_name' => 'Juan Dela Cruz',
            'sender_number' => '09171234567',
            'notes' => 'Please bring ladder.',
            'service_address' => 'Unit 1002 Tower 1, Taguig City',
        ];

        $response = $this->actingAs($customer)->postJson(route('customer.bookings.store'), $payload);

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Your service booking request has been submitted successfully! Please wait for admin approval and technician assignment.']);

        $this->assertDatabaseHas('bookings', [
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'booking_status' => 'Pending',
            'service_payment_method' => 'Cash',
        ]);

        $this->assertDatabaseHas('payment', [
            'amount_paid' => 300.00,
            'reference_number' => 'GCASH123456789',
            'payment_type' => 'Booking Fee',
            'payment_method' => 'GCash',
        ]);
    }

    public function test_customer_can_reschedule_pending_booking(): void
    {
        $customer = $this->createCustomer();
        $originalDate = Carbon::now()->addDays(2)->format('Y-m-d H:i:s');
        $newDate = Carbon::now()->addDays(5)->format('Y-m-d H:i:s');

        $booking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => $originalDate,
            'booking_status' => 'Pending',
            'service_payment_method' => 'Cash',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $payload = [
            'new_scheduled_date' => $newDate,
            'reschedule_fee' => 150.00,
            'reference_number' => 'RESCHED9876543',
            'sender_name' => 'Juan Dela Cruz',
            'reschedule_reason' => 'Doctor appointment conflict',
        ];

        $response = $this->actingAs($customer)->postJson(
            route('customer.bookings.reschedule', ['bookingId' => $booking->booking_id]),
            $payload
        );

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Booking rescheduled successfully! Status is set to Pending for manager confirmation.']);

        $this->assertDatabaseHas('payment', [
            'booking_id' => $booking->booking_id,
            'payment_type' => 'Reschedule Fee',
            'reference_number' => 'RESCHED9876543',
            'amount_paid' => 150.00,
        ]);
    }

    public function test_customer_can_cancel_pending_booking(): void
    {
        $customer = $this->createCustomer();

        $booking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => Carbon::now()->addDays(2),
            'booking_status' => 'Pending',
            'service_payment_method' => 'GCash',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($customer)->patchJson(
            route('customer.bookings.cancel', ['bookingId' => $booking->booking_id]),
            ['cancellation_reason' => 'Emergency trip out of country.']
        );

        $response->assertStatus(200);

        $this->assertDatabaseHas('bookings', [
            'booking_id' => $booking->booking_id,
            'booking_status' => 'Cancelled',
            'cancellation_reason' => 'Emergency trip out of country.',
        ]);
    }

    public function test_customer_can_submit_feedback_for_completed_booking(): void
    {
        $customer = $this->createCustomer();

        $booking = Booking::create([
            'client_id' => $customer->user_id,
            'service_id' => 1,
            'scheduled_date' => Carbon::now()->subDays(1),
            'booking_status' => 'Completed',
            'service_payment_method' => 'Cash',
            'created_at' => now()->subDays(1),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($customer)->postJson(route('customer.feedback.store'), [
            'booking_id' => $booking->booking_id,
            'rating' => 5,
            'feedback' => 'Technician did an outstanding job, very clean and polite!',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Thank you for your valuable feedback! We appreciate your business.']);

        $this->assertDatabaseHas('customer_feedback_and_ratings', [
            'booking_id' => $booking->booking_id,
            'rating' => 5,
            'feedback' => 'Technician did an outstanding job, very clean and polite!',
        ]);
    }

    public function test_customer_can_file_and_view_complaints(): void
    {
        $customer = $this->createCustomer();

        $response = $this->actingAs($customer)->postJson(route('customer.complaints.store'), [
            'complaint_details' => 'Technician arrived 2 hours later than the scheduled arrival window without notice.',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('customer_complaints', [
            'customer_id' => $customer->user_id,
            'status' => 'Pending',
        ]);

        $indexResponse = $this->actingAs($customer)->getJson(route('customer.complaints.index'));
        $indexResponse->assertStatus(200)
            ->assertJsonFragment(['status' => 'Pending']);
    }
}
