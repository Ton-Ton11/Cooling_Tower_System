<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;

class GmailVerificationService
{
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_OTPS_PER_HOUR = 3;
    public const MAX_OTPS_PER_DAY = 5;

    /**
     * Ensure the email_otps table exists even if migrations were not re-run.
     */
    public static function ensureOtpTableExists(): void
    {
        if (! Schema::hasTable('email_otps')) {
            Schema::create('email_otps', function (Blueprint $table) {
                $table->id();
                $table->string('email', 150)->index();
                $table->string('purpose', 40)->default('email_verification')->index();
                $table->string('code', 10);
                $table->timestamp('expires_at');
                $table->timestamps();
            });
        }
    }

    /**
     * Inspect cooldown, hourly, and daily OTP send limits for an email + purpose.
     */
    public static function getOtpRateLimitStatus(string $email, string $purpose = 'password_reset'): array
    {
        self::ensureOtpTableExists();

        $normalizedEmail = strtolower(trim($email));
        if ($normalizedEmail === '') {
            return [
                'cooldown_seconds' => 0,
                'hourly_used' => 0,
                'hourly_limit' => self::MAX_OTPS_PER_HOUR,
                'hourly_remaining' => self::MAX_OTPS_PER_HOUR,
                'daily_used' => 0,
                'daily_limit' => self::MAX_OTPS_PER_DAY,
                'daily_remaining' => self::MAX_OTPS_PER_DAY,
                'can_send' => true,
                'block_reason' => null,
                'block_message' => null,
            ];
        }

        $now = now();

        // Prune records older than 24 hours to keep table compact
        DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('created_at', '<', $now->copy()->subDay())
            ->delete();

        $recentDayRecords = DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('created_at', '>=', $now->copy()->subDay())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $dailyUsed = $recentDayRecords->count();
        $oneHourAgo = $now->copy()->subHour();
        $recentHourRecords = $recentDayRecords->filter(function ($row) use ($oneHourAgo) {
            return $row->created_at && Carbon::parse($row->created_at)->greaterThanOrEqualTo($oneHourAgo);
        });
        $hourlyUsed = $recentHourRecords->count();

        $latestRecord = $recentDayRecords->first();
        $cooldownSeconds = 0;
        if ($latestRecord && $latestRecord->created_at) {
            $elapsed = (int) Carbon::parse($latestRecord->created_at)->diffInSeconds($now, false);
            if ($elapsed < 0) {
                $elapsed = 0;
            }
            if ($elapsed < self::RESEND_COOLDOWN_SECONDS) {
                $cooldownSeconds = self::RESEND_COOLDOWN_SECONDS - $elapsed;
            }
        }

        $hourlyRemaining = max(0, self::MAX_OTPS_PER_HOUR - $hourlyUsed);
        $dailyRemaining = max(0, self::MAX_OTPS_PER_DAY - $dailyUsed);

        $blockReason = null;
        $blockMessage = null;

        if ($dailyRemaining <= 0) {
            $blockReason = 'daily_limit';
            $blockMessage = sprintf(
                'Daily verification limit reached (%d/%d codes today). Please try again tomorrow.',
                self::MAX_OTPS_PER_DAY,
                self::MAX_OTPS_PER_DAY
            );
        } elseif ($hourlyRemaining <= 0) {
            $oldestInHour = $recentHourRecords->last();
            $minutesLeft = 60;
            if ($oldestInHour && $oldestInHour->created_at) {
                $resetAt = Carbon::parse($oldestInHour->created_at)->addHour();
                $minutesLeft = max(1, (int) ceil($now->diffInSeconds($resetAt, false) / 60));
            }
            $blockReason = 'hourly_limit';
            $blockMessage = sprintf(
                'Hourly limit reached (%d/%d codes per hour). Try again in %d min.',
                self::MAX_OTPS_PER_HOUR,
                self::MAX_OTPS_PER_HOUR,
                $minutesLeft
            );
        } elseif ($cooldownSeconds > 0) {
            $blockReason = 'cooldown';
            $blockMessage = sprintf(
                'Please wait %ds before requesting another verification code.',
                $cooldownSeconds
            );
        }

        return [
            'cooldown_seconds' => $cooldownSeconds,
            'hourly_used' => $hourlyUsed,
            'hourly_limit' => self::MAX_OTPS_PER_HOUR,
            'hourly_remaining' => $hourlyRemaining,
            'daily_used' => $dailyUsed,
            'daily_limit' => self::MAX_OTPS_PER_DAY,
            'daily_remaining' => $dailyRemaining,
            'can_send' => $blockReason === null,
            'block_reason' => $blockReason,
            'block_message' => $blockMessage,
        ];
    }

    /**
     * Generate and store a 6-digit OTP code for Gmail verification or password recovery.
     * Preserves 24-hour send history for rate limiting while expiring previous active codes.
     */
    public static function generateOtp(string $email, string $purpose = 'email_verification', int $ttlMinutes = 15): string
    {
        self::ensureOtpTableExists();

        $normalizedEmail = strtolower(trim($email));
        $code = (string) random_int(100000, 999999);
        $now = now();

        // Remove records older than 24 hours
        DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('created_at', '<', $now->copy()->subDay())
            ->delete();

        // Expire any previous active OTPs for this email & purpose so only the new code is active
        DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('expires_at', '>', $now)
            ->update([
                'expires_at' => $now->copy()->subSecond(),
                'updated_at' => $now,
            ]);

        DB::table('email_otps')->insert([
            'email' => $normalizedEmail,
            'purpose' => $purpose,
            'code' => $code,
            'expires_at' => $now->copy()->addMinutes($ttlMinutes),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $code;
    }

    /**
     * Retrieve the latest active OTP code for an email + purpose (if any).
     */
    public static function getActiveOtp(string $email, string $purpose = 'email_verification'): ?object
    {
        self::ensureOtpTableExists();

        $normalizedEmail = strtolower(trim($email));

        return DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Inspect and verify a 6-digit OTP code with detailed status ('valid', 'expired', 'invalid').
     */
    public static function verifyOtpWithResult(string $email, string $code, string $purpose = 'email_verification', bool $consume = true): string
    {
        self::ensureOtpTableExists();

        $normalizedEmail = strtolower(trim($email));
        $cleanCode = preg_replace('/\D/', '', $code);

        if (strlen($cleanCode) !== 6) {
            return 'invalid';
        }

        $now = now();

        $activeRecord = DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('code', $cleanCode)
            ->where('expires_at', '>', $now)
            ->orderByDesc('id')
            ->first();

        if ($activeRecord) {
            if ($consume) {
                DB::table('email_otps')
                    ->where('email', $normalizedEmail)
                    ->where('purpose', $purpose)
                    ->where('expires_at', '>', $now)
                    ->update([
                        'expires_at' => $now->copy()->subSecond(),
                        'updated_at' => $now,
                    ]);
            }

            return 'valid';
        }

        $expiredRecord = DB::table('email_otps')
            ->where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->where('code', $cleanCode)
            ->where('expires_at', '<=', $now)
            ->orderByDesc('id')
            ->first();

        return $expiredRecord ? 'expired' : 'invalid';
    }

    /**
     * Verify a 6-digit OTP code for an email + purpose.
     */
    public static function verifyOtp(string $email, string $code, string $purpose = 'email_verification', bool $consume = true): bool
    {
        return self::verifyOtpWithResult($email, $code, $purpose, $consume) === 'valid';
    }

    /**
     * Build the signed verification URL for a User.
     */
    public static function buildVerificationUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );
    }

    /**
     * Check whether Gmail SMTP credentials are configured in .env.
     */
    public static function isGmailSmtpConfigured(): bool
    {
        $host = (string) config('mail.mailers.smtp.host', '');
        $username = (string) config('mail.mailers.smtp.username', '');
        $password = (string) config('mail.mailers.smtp.password', '');

        return $host !== '' && $username !== '' && $password !== '' && $username !== 'null' && $password !== 'null';
    }

    /**
     * Send the Gmail Verification email (includes both 6-digit OTP code & 1-click verification link).
     * Automatically falls back to log transport if Gmail App Password hasn't been set yet so registration never crashes.
     */
    public static function sendCustomerVerificationEmail(User $user): array
    {
        $verificationUrl = self::buildVerificationUrl($user);
        $smtpConfigured = self::isGmailSmtpConfigured();
        $deliveredViaSmtp = false;

        try {
            if ($smtpConfigured) {
                Mail::send([], [], function ($message) use ($user, $verificationUrl) {
                    $message->to($user->email, $user->name)
                        ->subject('Cooling Tower — Verify Your Gmail Account')
                        ->html(self::renderVerificationHtml($user->name, $user->email, $verificationUrl));
                });
                $deliveredViaSmtp = true;
            } else {
                Log::info('Gmail Verification Email (Fallback Log Mode)', [
                    'to' => $user->email,
                    'verification_url' => $verificationUrl,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('SMTP Gmail delivery failed; logged verification URL for fallback.', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return [
            'verification_url' => $verificationUrl,
            'smtp_configured' => $smtpConfigured,
            'delivered_via_smtp' => $deliveredViaSmtp,
        ];
    }

    /**
     * Send the Gmail Password Reset email (includes both 6-digit OTP code & 1-click reset link).
     */
    public static function sendPasswordResetEmail(User $user, string $token): array
    {
        $otpCode = self::generateOtp($user->email, 'password_reset', 15);
        $resetUrl = url(route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ], false));

        $smtpConfigured = self::isGmailSmtpConfigured();
        $deliveredViaSmtp = false;

        try {
            if ($smtpConfigured) {
                Mail::send([], [], function ($message) use ($user, $otpCode, $resetUrl) {
                    $message->to($user->email, $user->name)
                        ->subject('Cooling Tower — Gmail Password Reset (Code: ' . $otpCode . ')')
                        ->html(self::renderPasswordResetHtml($user->name, $user->email, $otpCode, $resetUrl));
                });
                $deliveredViaSmtp = true;
            } else {
                Log::info('Gmail Password Reset Email (Fallback Log Mode)', [
                    'to' => $user->email,
                    'otp_code' => $otpCode,
                    'reset_url' => $resetUrl,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('SMTP Gmail password reset failed; logged reset OTP & URL for fallback.', [
                'email' => $user->email,
                'otp_code' => $otpCode,
                'error' => $e->getMessage(),
            ]);
        }

        return [
            'otp_code' => $otpCode,
            'reset_url' => $resetUrl,
            'token' => $token,
            'smtp_configured' => $smtpConfigured,
            'delivered_via_smtp' => $deliveredViaSmtp,
        ];
    }

    private static function renderVerificationHtml(string $name, string $email, string $verificationUrl): string
    {
        $escapedName = e($name ?: 'Valued Customer');
        $escapedEmail = e($email);
        $escapedUrl = e($verificationUrl);

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Gmail Account • Cooling Tower</title>
</head>
<body style="margin:0;padding:24px;background-color:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 10px 30px rgba(14,26,51,0.08);">
        <div style="background:linear-gradient(135deg,#0E1A33,#1D3B7A,#2563EB);padding:28px 32px;color:#FFFFFF;">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#7DD3FC;">Cooling Tower Airconditioning Services</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;">Verify Your Gmail Account</h1>
        </div>
        <div style="padding:28px 32px;">
            <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hello <strong>{$escapedName}</strong>,</p>
            <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 24px;">
                Thank you for registering with <strong>Cooling Tower Airconditioning Services</strong> using your Gmail account (<strong>{$escapedEmail}</strong>).
            </p>
            <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 24px;">
                Please click the button below to verify your email address and activate your customer portal in one click:
            </p>
            <div style="text-align:center;margin:0 0 28px;">
                <a href="{$escapedUrl}" style="display:inline-block;padding:14px 34px;background:linear-gradient(135deg,#1E3A8A,#2563EB);color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;box-shadow:0 6px 18px rgba(37,99,235,0.35);">
                    Verify
                </a>
            </div>
            <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0 0 16px;">
                If you're having trouble clicking the button, copy and paste this verification URL into your browser:
                <br>
                <a href="{$escapedUrl}" style="color:#2563EB;word-break:break-all;">{$escapedUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0 16px;">
            <p style="font-size:12px;color:#94A3B8;line-height:1.5;margin:0;">
                If you did not register for an account, no further action is required.<br>
                Door 5, Apostol Bldg., Mayor Jaldon St., Canelar, Zamboanga City • DTI Accredited Service Center
            </p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private static function renderPasswordResetHtml(string $name, string $email, string $otpCode, string $resetUrl): string
    {
        $escapedName = e($name ?: 'Valued Customer');
        $escapedEmail = e($email);
        $escapedCode = e($otpCode);
        $escapedUrl = e($resetUrl);

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset Verification • Cooling Tower</title>
</head>
<body style="margin:0;padding:24px;background-color:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 10px 30px rgba(14,26,51,0.08);">
        <div style="background:linear-gradient(135deg,#0E1A33,#1D3B7A,#2563EB);padding:28px 32px;color:#FFFFFF;">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#FDBA74;">Account Security & Password Recovery</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;">Reset Your Password via Gmail</h1>
        </div>
        <div style="padding:28px 32px;">
            <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Hello <strong>{$escapedName}</strong>,</p>
            <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px;">
                We received a password reset request for your Cooling Tower account associated with <strong>{$escapedEmail}</strong>. Use the 6-digit Gmail verification code below or click the reset button to set a new password:
            </p>
            <div style="background:#FFF7ED;border:2px dashed #F97316;border-radius:16px;padding:18px;text-align:center;margin:0 0 22px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9A3412;">Your 6-Digit Password Reset Code</p>
                <p style="margin:0;font-size:32px;font-weight:900;letter-spacing:0.25em;color:#9A3412;font-family:monospace;">{$escapedCode}</p>
                <p style="margin:6px 0 0;font-size:11px;color:#9A3412;">Valid for 15 minutes</p>
            </div>
            <div style="text-align:center;margin:0 0 24px;">
                <a href="{$escapedUrl}" style="display:inline-block;padding:13px 28px;background:#2563EB;color:#FFFFFF;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">
                    Reset My Password Now
                </a>
            </div>
            <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0;">
                If you did not request a password reset, no further action is required.
            </p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
