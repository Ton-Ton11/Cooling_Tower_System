import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, ShieldCheck, RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function VerifyEmail({ status, email }) {
    const resendForm = useForm({});
    const verifyForm = useForm({});

    const handleQuickVerify = (e) => {
        e.preventDefault();
        verifyForm.post(route('verification.quick'));
    };

    const resendVerification = (e) => {
        e.preventDefault();
        resendForm.post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verify Your Gmail • Cooling Tower" />

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-blue-600" />
                    One-Click Gmail Verification
                </div>
                <h2 className="text-2xl font-extrabold font-display text-[#14224A] mb-1.5">
                    Check your Gmail Inbox
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    We sent a <strong className="text-slate-700">one-click verification link</strong> to your Gmail address. Simply open the email and click the verification button to activate your account:
                </p>

                {email && (
                    <div className="mt-3 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                <Mail className="size-4 text-red-600" />
                            </div>
                            <span className="text-sm font-bold text-[#14224A] truncate">{email}</span>
                        </div>
                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors"
                        >
                            <span>Open Gmail</span>
                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>
                )}
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-start gap-2.5">
                    <ShieldCheck className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                        A fresh one-click verification link has been sent to your Gmail inbox!
                    </span>
                </div>
            )}

            {/* Direct Action Area */}
            <div className="space-y-3">
                <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-bold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 text-sm cursor-pointer"
                >
                    <Mail className="size-4 text-white" />
                    <span>Open Gmail to Verify (1-Click)</span>
                    <ExternalLink className="size-4 ml-0.5 opacity-80" />
                </a>

                {/* Instant Testing Bypass Button */}
                <form onSubmit={handleQuickVerify}>
                    <button
                        type="submit"
                        disabled={verifyForm.processing}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>
                            {verifyForm.processing
                                ? 'Verifying Account...'
                                : 'Or Instantly Verify on this Page (Testing Bypass)'}
                        </span>
                    </button>
                </form>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={resendVerification}
                    disabled={resendForm.processing}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-orange-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw
                        className={`size-3.5 ${
                            resendForm.processing ? 'animate-spin' : ''
                        }`}
                    />
                    <span>
                        {resendForm.processing
                            ? 'Sending Email...'
                            : 'Resend Verification Link to Gmail'}
                    </span>
                </button>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors focus:outline-none"
                >
                    Log Out
                </Link>
            </div>
        </GuestLayout>
    );
}
