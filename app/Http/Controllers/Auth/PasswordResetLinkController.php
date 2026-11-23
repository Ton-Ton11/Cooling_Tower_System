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
        $requestedEmail = strtolower(trim((string) session('reset_email', $request->query('email', ''))));
        $smtpConfigured = GmailVerificationService::isGmailSmtpConfigured();
        $activeOtp = $requestedEmail !== ''
            ? GmailVerificationService::getActiveOtp($requestedEmail, 'password_reset')
            : null;
        $rateLimit = GmailVerificationService::getOtpRateLimitStatus($requestedEmail, 'password_reset');

        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
            'resetEmail' => $requestedEmail,
            'smtpConfigured' => $smtpConfigured,
            'devOtpCode' => (! $smtpConfigured && config('app.debug') && $activeOtp) ? $activeOtp->code : null,
            'rateLimit' => $rateLimit,
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
            ],
        ]);

        $email = strtolower(trim((string) $request->input('email')));
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account found with that email address.'],
            ]);
        }

        $rateLimit = GmailVerificationService::getOtpRateLimitStatus($user->email, 'password_reset');
        if (! $rateLimit['can_send']) {
            session()->flash('reset_email', $user->email);
            throw ValidationException::withMessages([
                'email' => [$rateLimit['block_message'] ?? 'Please wait before requesting another code.'],
            ]);
        }

        // Generate standard Laravel Password Reset token and send Gmail message with 6-digit OTP + Reset Link
        $token = Password::broker()->createToken($user);
        GmailVerificationService::sendPasswordResetEmail($user, $token);

        return back()->with([
            'status' => 'Verification code sent to ' . $user->email . '.',
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
        $email = strtolower(trim((string) $request->input('email')));
        if ($email !== '') {
            session()->flash('reset_email', $email);
        }

        $rawCode = (string) ($request->input('code') ?? $request->input('otp_code') ?? '');
        $cleanCode = preg_replace('/\D/', '', $rawCode);

        $request->merge([
            'email' => $email,
            'code' => $cleanCode,
        ]);

        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ], [
            'code.required' => 'Please enter the 6-digit verification code.',
            'code.size' => 'Verification code must be 6 digits.',
        ]);

        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account found with that email address.'],
            ]);
        }

        $verifyResult = GmailVerificationService::verifyOtpWithResult($email, $cleanCode, 'password_reset', true);
        if ($verifyResult !== 'valid') {
            $errorMsg = $verifyResult === 'expired'
                ? 'Verification code has expired. Please request a new code.'
                : 'Invalid verification code. Please check the 6-digit code and try again.';

            throw ValidationException::withMessages([
                'code' => [$errorMsg],
                'otp_code' => [$errorMsg],
            ]);
        }

        // Issue a fresh password reset token and redirect to the password reset page
        $token = Password::broker()->createToken($user);

        return redirect()->route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ])->with('status', 'Verification code confirmed. Set your new password below.');
    }
}
