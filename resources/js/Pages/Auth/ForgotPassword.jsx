import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Mail, ArrowRight, KeyRound, ExternalLink, RefreshCw, ShieldCheck, Info } from 'lucide-react';

export default function ForgotPassword({ status, resetEmail = '', smtpConfigured = false, devOtpCode = null }) {
    const [showCodeStep, setShowCodeStep] = useState(Boolean(resetEmail || status));

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

    const submitEmail = (e) => {
        e.preventDefault();
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
        otpForm.post(route('password.verify-otp'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password via Gmail • Cooling Tower" />

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-orange-500" />
                    Gmail Password Recovery
                </div>
                <h2 className="text-2xl font-extrabold font-display text-[#14224A] mb-1.5">
                    Forgot your password?
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Enter your registered <strong className="text-slate-700">Gmail address (@gmail.com)</strong> below. We will send a 6-digit verification code and password reset link to your Gmail inbox.
                </p>
            </div>

            {status && (
                <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-start gap-2.5">
                    <ShieldCheck className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{status}</span>
                </div>
            )}

            <form onSubmit={submitEmail} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                        <span>Registered Gmail Address</span>
                        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/70">
                            @gmail.com
                        </span>
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
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
                            }}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                        />
                    </div>
                    {emailForm.errors.email && (
                        <div className="text-xs font-medium text-red-600">{emailForm.errors.email}</div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={emailForm.processing}
                    className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${
                        showCodeStep
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                            : 'bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white hover:brightness-110 shadow-lg shadow-blue-900/20'
                    } disabled:opacity-60`}
                >
                    {showCodeStep ? (
                        <>
                            <RefreshCw className={`size-4 ${emailForm.processing ? 'animate-spin' : ''}`} />
                            <span>{emailForm.processing ? 'Resending to Gmail...' : 'Resend Verification Code to Gmail'}</span>
                        </>
                    ) : (
                        <>
                            <span>{emailForm.processing ? 'Sending to Gmail...' : 'Send Verification Code to Gmail'}</span>
                            <ArrowRight className="size-4" />
                        </>
                    )}
                </button>
            </form>

            {!showCodeStep && (
                <div className="mt-3 text-center">
                    <button
                        type="button"
                        onClick={() => setShowCodeStep(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-orange-600 hover:underline"
                    >
                        Already received a 6-digit Gmail code? Enter it here
                    </button>
                </div>
            )}

            {showCodeStep && (
                <div className="mt-6 pt-5 border-t border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-extrabold text-[#14224A]">
                                Verify with your 6-Digit Gmail Code
                            </h3>
                            <p className="text-xs text-slate-500">
                                Enter the 6-digit code sent to your Gmail or click the link inside the email.
                            </p>
                        </div>
                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-orange-600 shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 transition-colors"
                        >
                            <span>Open Gmail</span>
                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>

                    {!smtpConfigured && devOtpCode && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200/90 p-3.5 text-xs text-amber-900 space-y-2">
                            <div className="flex items-start gap-2">
                                <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="leading-relaxed">
                                    <span className="font-bold">Local Gmail SMTP Preview:</span> Add your 16-character Google App Password to <code className="px-1 py-0.5 rounded bg-amber-100 font-mono">MAIL_PASSWORD</code> in <code className="px-1 py-0.5 rounded bg-amber-100 font-mono">.env</code> for live Gmail delivery. Your generated code is:
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                                <span className="font-mono text-base font-extrabold tracking-[0.25em] text-[#14224A]">
                                    {devOtpCode}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => otpForm.setData('code', String(devOtpCode))}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    Autofill Code
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submitOtp} className="space-y-3.5">
                        <div className="space-y-1.5">
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                                <input
                                    id="reset_otp_code"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    autoFocus
                                    placeholder="000000"
                                    value={otpForm.data.code}
                                    onChange={(e) => otpForm.setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-[#14224A] font-mono text-lg font-extrabold tracking-[0.35em] placeholder:text-slate-300 placeholder:tracking-[0.35em] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                                />
                            </div>
                            {otpForm.errors.code && (
                                <div className="text-xs font-medium text-red-600">{otpForm.errors.code}</div>
                            )}
                            {otpForm.errors.email && (
                                <div className="text-xs font-medium text-red-600">{otpForm.errors.email}</div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={otpForm.processing || otpForm.data.code.length !== 6 || !otpForm.data.email}
                            className="w-full py-3 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-semibold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-60 text-sm"
                        >
                            <span>{otpForm.processing ? 'Verifying Gmail Code...' : 'Verify Code & Reset Password'}</span>
                            <ArrowRight className="size-4" />
                        </button>
                    </form>
                </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
                Remembered your password?{' '}
                <Link
                    href="/login"
                    className="text-blue-600 hover:text-orange-600 hover:underline font-semibold transition-colors"
                >
                    Back to log in
                </Link>
            </div>
        </GuestLayout>
    );
}
