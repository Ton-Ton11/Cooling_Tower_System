import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, ArrowRight } from 'lucide-react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password • Cooling Tower" />

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-orange-500" />
                    Password Recovery
                </div>
                <h2 className="text-2xl font-extrabold font-display text-[#14224A] mb-1.5">
                    Forgot your password?
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    No problem. Enter your email address below and we will send you a password reset link to choose a new one.
                </p>
            </div>

            {status && (
                <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-semibold text-emerald-700">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                        Email address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoFocus
                            placeholder="Enter your email address"
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                        />
                    </div>
                    {errors.email && (
                        <div className="text-xs font-medium text-red-600">{errors.email}</div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-semibold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-60 text-sm"
                >
                    <span>{processing ? 'Sending link...' : 'Email Password Reset Link'}</span>
                    <ArrowRight className="size-4" />
                </button>
            </form>

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
