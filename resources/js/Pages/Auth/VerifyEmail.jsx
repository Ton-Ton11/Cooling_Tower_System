import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, ArrowRight } from 'lucide-react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification • Cooling Tower" />

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-orange-500" />
                    Email Verification
                </div>
                <h2 className="text-2xl font-extrabold font-display text-[#14224A] mb-1.5">
                    Verify your email address
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Thanks for signing up! Before getting started, please verify
                    your email address by clicking on the link we just emailed to
                    you. If you didn&apos;t receive the email, we will gladly send you
                    another.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-start gap-2.5">
                    <Mail className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                        A new verification link has been sent to the email address
                        you provided during registration.
                    </span>
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-semibold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-60 text-sm"
                >
                    <span>{processing ? 'Sending...' : 'Resend Verification Email'}</span>
                    <ArrowRight className="size-4" />
                </button>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors focus:outline-none"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
