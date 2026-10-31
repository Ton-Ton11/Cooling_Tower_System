<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\GmailVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Display the email verification prompt.
     */
    public function __invoke(Request $request): RedirectResponse|Response
    {
        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        // Ensure an active 6-digit OTP exists for this user's Gmail account
        $activeOtp = GmailVerificationService::getActiveOtp($user->email, 'email_verification');
        if (! $activeOtp) {
            GmailVerificationService::sendCustomerVerificationEmail($user);
            $activeOtp = GmailVerificationService::getActiveOtp($user->email, 'email_verification');
        }

        $smtpConfigured = GmailVerificationService::isGmailSmtpConfigured();

        return Inertia::render('Auth/VerifyEmail', [
            'status' => session('status'),
            'email' => $user->email,
            'smtpConfigured' => $smtpConfigured,
            // Only expose fallback code in local development when Gmail SMTP password is not yet entered in .env
            'devOtpCode' => (! $smtpConfigured && config('app.debug')) ? ($activeOtp->code ?? null) : null,
        ]);
    }
}
