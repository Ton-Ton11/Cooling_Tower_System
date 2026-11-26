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
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-[#2563EB]" />
                    One-Click Gmail Verification
                </div>
                <h2 className="text-2xl font-bold font-display text-[#10213F] mb-1.5">
                    Check your Gmail Inbox
                </h2>
                <p className="text-sm text-[#64748B] leading-relaxed">
                    We sent a <strong className="text-[#172B4D]">one-click verification link</strong> to your Gmail address. Simply open the email and click the verification button to activate your account:
                </p>

                {email && (
                    <div className="mt-3 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0]">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-8 rounded-lg bg-[#EAF2FF] border border-[#C7DDFD] flex items-center justify-center shrink-0">
                                <Mail className="size-4 text-[#2563EB]" />
                            </div>
                            <span className="text-sm font-semibold text-[#10213F] truncate">{email}</span>
                        </div>
                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] transition-colors"
                        >
                            <span>Open Gmail</span>
                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>
                )}
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-5 rounded-lg bg-[#ECFDF5] border border-[#BBF7D0] px-4 py-3 text-xs font-semibold text-[#15803D] flex items-start gap-2.5">
                    <ShieldCheck className="size-4 shrink-0 mt-0.5 text-[#16A34A]" />
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
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 shadow-xs text-sm cursor-pointer"
                >
                    <Mail className="size-4 text-white" />
                    <span>Open Gmail to Verify</span>
                    <ExternalLink className="size-4 ml-0.5 opacity-80" />
                </a>

                {/* Instant Testing Bypass Button */}
                <form onSubmit={handleQuickVerify}>
                    <button
                        type="submit"
                        disabled={verifyForm.processing}
                        className="w-full py-2.5 bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] text-[#172B4D] font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        <CheckCircle2 className="size-4 text-[#16A34A]" />
                        <span>
                            {verifyForm.processing
                                ? 'Verifying Account...'
                                : 'Or Instantly Verify on this Page (Testing Bypass)'}
                        </span>
                    </button>
                </form>
            </div>

            <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={resendVerification}
                    disabled={resendForm.processing}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors disabled:opacity-50 cursor-pointer"
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
