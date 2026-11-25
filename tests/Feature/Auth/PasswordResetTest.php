<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\GmailVerificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    protected function getTestCustomer(): User
    {
        $email = 'reset.customer@gmail.com';
        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = User::create([
                'given_name' => 'Reset',
                'last_name' => 'Customer',
                'email' => $email,
                'password' => Hash::make('OldPassword123!'),
                'role_id' => 6,
                'is_active' => true,
                'email_verified_at' => now(),
                'birthdate' => '1995-05-15',
                'sex' => 'Male',
                'contact_number' => '09171234567',
                'address' => 'Zamboanga City',
            ]);
        }

        DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', 'password_reset')
            ->delete();

        return $user;
    }

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_password_otp_can_be_requested_and_verified_to_redirect_to_reset_screen(): void
    {
        $user = $this->getTestCustomer();

        $response = $this->post('/forgot-password', ['email' => $user->email]);
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('reset_email', $user->email);

        $activeOtp = GmailVerificationService::getActiveOtp($user->email, 'password_reset');
        $this->assertNotNull($activeOtp);

        // Verify with invalid code first -> returns clear error on 'code'
        $invalidResponse = $this->from('/forgot-password')->post('/forgot-password/verify-otp', [
            'email' => $user->email,
            'code' => '000000',
        ]);
        $invalidResponse->assertSessionHasErrors(['code']);

        // Verify with valid 6-digit code -> redirects directly to reset-password page
        $validResponse = $this->post('/forgot-password/verify-otp', [
            'email' => $user->email,
            'code' => $activeOtp->code,
        ]);
        $validResponse->assertSessionHasNoErrors();
        $validResponse->assertRedirect();
        $this->assertStringContainsString('/reset-password/', $validResponse->headers->get('Location'));
    }

    public function test_resend_verification_code_enforces_cooldown_and_hourly_limit(): void
    {
        $user = $this->getTestCustomer();

        // First request succeeds
        $first = $this->post('/forgot-password', ['email' => $user->email]);
        $first->assertSessionHasNoErrors();

        // Immediate second request within 60s cooldown is blocked
        $second = $this->from('/forgot-password')->post('/forgot-password', ['email' => $user->email]);
        $second->assertSessionHasErrors(['email']);

        // Simulate 3 codes already sent within the past hour (past 60s cooldown)
        DB::table('email_otps')
            ->where('email', $user->email)
            ->where('purpose', 'password_reset')
            ->delete();

        for ($i = 1; $i <= GmailVerificationService::MAX_OTPS_PER_HOUR; $i++) {
            DB::table('email_otps')->insert([
                'email' => $user->email,
                'purpose' => 'password_reset',
                'code' => (string) (100000 + $i),
                'expires_at' => now()->addMinutes(10),
                'created_at' => now()->subMinutes(5 * $i),
                'updated_at' => now()->subMinutes(5 * $i),
            ]);
        }

        $hourlyBlocked = $this->from('/forgot-password')->post('/forgot-password', ['email' => $user->email]);
        $hourlyBlocked->assertSessionHasErrors(['email']);

        // Clean up
        DB::table('email_otps')->where('email', $user->email)->delete();
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        $user = $this->getTestCustomer();
        $token = Password::broker()->createToken($user);

        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));

        DB::table('email_otps')->where('email', $user->email)->delete();
    }
}
