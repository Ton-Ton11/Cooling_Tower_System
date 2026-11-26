import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Mail,
    ArrowRight,
    KeyRound,
    ExternalLink,
    RefreshCw,
    ShieldCheck,
    Info,
    AlertCircle,
    Clock,
} from 'lucide-react';

export default function ForgotPassword({
    status,
    resetEmail = '',
    smtpConfigured = false,
    devOtpCode = null,
    rateLimit = null,
}) {
    const [showCodeStep, setShowCodeStep] = useState(Boolean(resetEmail || status));
    const [cooldown, setCooldown] = useState(Number(rateLimit?.cooldown_seconds || 0));

    const hourlyLimit = Number(rateLimit?.hourly_limit ?? 3);
    const hourlyRemaining = Number(rateLimit?.hourly_remaining ?? hourlyLimit);
    const dailyLimit = Number(rateLimit?.daily_limit ?? 5);
    const dailyRemaining = Number(rateLimit?.daily_remaining ?? dailyLimit);
    const quotaExhausted = hourlyRemaining <= 0 || dailyRemaining <= 0;

    const emailForm = useForm({
        email: resetEmail || '',
    });

    const otpForm = useForm({
        email: resetEmail || '',
        code: '',
    });

    useEffect(() => {
        if (resetEmail) {
            emailForm.setData('email', resetEmail);
            otpForm.setData('email', resetEmail);
            setShowCodeStep(true);
        }
    }, [resetEmail]);

    useEffect(() => {
        setCooldown(Number(rateLimit?.cooldown_seconds || 0));
    }, [rateLimit?.cooldown_seconds]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const submitEmail = (e) => {
        if (e) e.preventDefault();
        if (emailForm.processing || (showCodeStep && (cooldown > 0 || quotaExhausted))) {
            return;
        }
        otpForm.clearErrors();
        emailForm.post(route('password.email'), {
            preserveScroll: true,
            onSuccess: () => {
                otpForm.setData('email', emailForm.data.email);
                setShowCodeStep(true);
            },
        });
    };

    const submitOtp = (e) => {
        e.preventDefault();
        if (otpForm.processing || otpForm.data.code.length !== 6) return;
        otpForm.post(route('password.verify-otp'), {
            preserveScroll: true,
        });
    };

    const otpError = otpForm.errors.code || otpForm.errors.otp_code;

    return (
        <GuestLayout>
            <Head title="Forgot Password • Cooling Tower" />

            <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-2.5">
                    <span className="size-1.5 rounded-full bg-[#2563EB]" />
                    Account Recovery
                </div>
                <h2 className="text-2xl font-bold font-display text-[#10213F] mb-1">
                    Forgot your password?
                </h2>
                <p className="text-sm text-[#64748B]">
                    Enter your registered Gmail to receive a 6-digit verification code.
                </p>
            </div>

            {status && !otpError && (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                    <span>{status}</span>
                </div>
            )}

            <form onSubmit={submitEmail} className="space-y-3.5">
                <div className="space-y-1.5">
                    <label
                        htmlFor="email"
                        className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center justify-between"
                    >
                        <span>Gmail Address</span>
                        <span className="text-[11px] font-semibold lowercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/70">
                            @gmail.com
                        </span>
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={emailForm.data.email}
                            autoFocus={!showCodeStep}
                            placeholder="yourname@gmail.com"
                            onChange={(e) => {
                                emailForm.setData('email', e.target.value);
                                otpForm.setData('email', e.target.value);
                                if (emailForm.errors.email) {
                                    emailForm.clearErrors('email');
                                }
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                        />
                    </div>
                    {emailForm.errors.email && (
                        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>{emailForm.errors.email}</span>
                        </div>
                    )}
                </div>

                {!showCodeStep && (
                    <button
                        type="submit"
                        disabled={emailForm.processing || !emailForm.data.email}
                        className="w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs disabled:opacity-60"
                    >
                        <span>
                            {emailForm.processing ? 'Sending Code...' : 'Send Verification Code'}
                        </span>
                        <ArrowRight className="size-4" />
                    </button>
                )}
            </form>

            {!showCodeStep && (
                <div className="mt-3 text-center">
                    <button
                        type="button"
                        onClick={() => setShowCodeStep(true)}
                        className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                    >
                        Already have a 6-digit code? Enter it here
                    </button>
                </div>
            )}

            {showCodeStep && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#172B4D]">
                                6-Digit Verification Code
                            </h3>
                            <p className="text-[11px] text-[#64748B]">
                                Enter the code from Gmail to continue
                            </p>
                        </div>
                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] shrink-0 px-2.5 py-1.5 rounded-lg bg-[#EAF2FF] border border-[#C7DDFD] transition-colors"
                        >
                            <span>Open Gmail</span>
                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>

                    {!smtpConfigured && devOtpCode && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200/90 p-3 text-xs text-amber-900 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold flex items-center gap-1.5">
                                    <Info className="size-3.5 text-amber-600 shrink-0" />
                                    <span>Local Preview Code</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        otpForm.setData('code', String(devOtpCode));
                                        otpForm.clearErrors();
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    Autofill
                                </button>
                            </div>
                            <div className="bg-white rounded-lg px-3 py-1.5 border border-amber-200 text-center">
                                <span className="font-mono text-base font-extrabold tracking-[0.25em] text-[#14224A]">
                                    {devOtpCode}
                                </span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submitOtp} className="space-y-3">
                        <div className="space-y-1.5">
                            <div className="relative">
                                <KeyRound
                                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none ${
                                        otpError ? 'text-red-500' : 'text-slate-400'
                                    }`}
                                />
                                <input
                                    id="reset_otp_code"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    autoFocus
                                    placeholder="000000"
                                    value={otpForm.data.code}
                                    onChange={(e) => {
                                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        otpForm.setData('code', cleaned);
                                        if (otpError) {
                                            otpForm.clearErrors();
                                        }
                                    }}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-mono text-lg font-extrabold tracking-[0.35em] placeholder:text-slate-300 placeholder:tracking-[0.35em] focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                        otpError
                                            ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-red-500/20 focus:border-red-500'
                                            : 'border-slate-200 bg-slate-50/70 text-[#14224A] focus:ring-blue-600/20 focus:border-blue-600'
                                    }`}
                                />
                            </div>

                            {otpError && (
                                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                                    <AlertCircle className="size-3.5 shrink-0" />
                                    <span>{otpError}</span>
                                </div>
                            )}
                            {otpForm.errors.email && (
                                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                                    <AlertCircle className="size-3.5 shrink-0" />
                                    <span>{otpForm.errors.email}</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={
                                otpForm.processing ||
                                otpForm.data.code.length !== 6 ||
                                !otpForm.data.email
                            }
                            className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 text-sm"
                        >
                            <span>
                                {otpForm.processing ? 'Verifying Code...' : 'Verify & Continue'}
                            </span>
                            <ArrowRight className="size-4" />
                        </button>
                    </form>

                    {/* Minimal Resend & Rate Limit Footer */}
                    <div className="pt-2 flex items-center justify-between gap-2 text-xs">
                        <button
                            type="button"
                            onClick={submitEmail}
                            disabled={
                                emailForm.processing ||
                                cooldown > 0 ||
                                quotaExhausted ||
                                !emailForm.data.email
                            }
                            className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:text-[#64748B] disabled:cursor-not-allowed transition-colors"
                        >
                            {cooldown > 0 ? (
                                <>
                                    <Clock className="size-3.5" />
                                    <span>Resend in {cooldown}s</span>
                                </>
                            ) : quotaExhausted ? (
                                <>
                                    <Clock className="size-3.5" />
                                    <span>Limit Reached</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw
                                        className={`size-3.5 ${
                                            emailForm.processing ? 'animate-spin' : ''
                                        }`}
                                    />
                                    <span>
                                        {emailForm.processing ? 'Sending...' : 'Resend Code'}
                                    </span>
                                </>
                            )}
                        </button>

                        <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                quotaExhausted
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200/80'
                            }`}
                            title="Remaining code requests per hour and per day"
                        >
                            {hourlyRemaining}/{hourlyLimit} hr · {dailyRemaining}/{dailyLimit} day
                        </span>
                    </div>
                </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center text-sm text-[#64748B]">
                Remembered your password?{' '}
                <Link
                    href="/login"
                    className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold transition-colors"
                >
                    Back to log in
                </Link>
            </div>
        </GuestLayout>
    );
}
