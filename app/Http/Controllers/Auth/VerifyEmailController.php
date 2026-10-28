<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\GmailVerificationService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified via signed link.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
        }

        if ($request->user()->markEmailAsVerified()) {
            event(new Verified($request->user()));
        }

        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
    }

    /**
     * One-click instant account verification for testing purposes.
     */
    public function quickVerify(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user && ! $user->hasVerifiedEmail()) {
            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }
        }

        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
    }

    /**
     * Verify the authenticated user's Gmail address using the 6-digit OTP code sent to their Gmail inbox.
     */
    public function verifyOtp(Request $request): RedirectResponse
    {
        $request->validate([
            'otp_code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
        }

        $isValid = GmailVerificationService::verifyOtp($user->email, (string) $request->input('otp_code'), 'email_verification', true);
        if (! $isValid) {
            throw ValidationException::withMessages([
                'otp_code' => 'Invalid or expired 6-digit Gmail verification code. Please check your Gmail inbox or click Resend Code.',
            ]);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
    }
}
