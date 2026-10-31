<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'given_name' => 'Maria',
            'last_name' => 'Santos',
            'birthdate' => '1995-05-15',
            'sex' => 'Female',
            'street_house' => 'Block 1 Lot 2',
            'barangay' => 'Tetuan',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga del Sur',
            'contact_number' => '09123456789',
            'email' => 'maria.customer@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('customer.dashboard'));
        $this->assertNotNull(auth()->user()->email_verified_at);
    }
}
