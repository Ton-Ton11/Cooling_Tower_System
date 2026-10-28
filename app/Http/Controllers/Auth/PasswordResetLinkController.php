<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GmailVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(Request $request): Response
    {
        $requestedEmail = (string) session('reset_email', $request->query('email', ''));
        $smtpConfigured = GmailVerificationService::isGmailSmtpConfigured();
        $activeOtp = $requestedEmail !== ''
            ? GmailVerificationService::getActiveOtp($requestedEmail, 'password_reset')
            : null;

        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
            'resetEmail' => $requestedEmail,
            'smtpConfigured' => $smtpConfigured,
            'devOtpCode' => (! $smtpConfigured && config('app.debug') && $activeOtp) ? $activeOtp->code : null,
        ]);
    }

    /**
     * Handle an incoming password reset request via Gmail (sends both 6-digit OTP and reset link).
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => [
                'required',
                'email',
                function ($attribute, $value, $fail) {
                    $norm = strtolower(trim((string) $value));
                    if (! str_ends_with($norm, '@gmail.com') && ! str_ends_with($norm, '@googlemail.com')) {
                        $fail('Please enter the Gmail address (@gmail.com) registered to your account.');
                    }
                },
            ],
        ]);

        $email = strtolower(trim((string) $request->input('email')));
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find a customer account registered with that Gmail address.'],
            ]);
        }

        // Generate standard Laravel Password Reset token and send Gmail message with 6-digit OTP + Reset Link
        $token = Password::broker()->createToken($user);
        GmailVerificationService::sendPasswordResetEmail($user, $token);

        return back()->with([
            'status' => 'We have emailed a 6-digit verification code and password reset link to your Gmail account (' . $user->email . ').',
            'reset_email' => $user->email,
        ]);
    }

    /**
     * Verify the 6-digit Gmail OTP code for Forgot Password and redirect directly to the Reset Password form.
     *
     * @throws ValidationException
     */
    public function verifyResetOtp(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp_code' => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim((string) $request->input('email')));
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find an account with that Gmail address.'],
            ]);
        }

        $isValid = GmailVerificationService::verifyOtp($email, (string) $request->input('otp_code'), 'password_reset', true);
        if (! $isValid) {
            throw ValidationException::withMessages([
                'otp_code' => ['Invalid or expired 6-digit Gmail verification code. Please check your Gmail inbox or request a new code.'],
            ]);
        }

        // Issue a fresh password reset token and redirect to the password reset page
        $token = Password::broker()->createToken($user);

        return redirect()->route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]);
    }
}
