import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function ResetPassword({ token, email }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const inputClass =
        'w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm';

    return (
        <GuestLayout>
            <Head title="Reset Password • Cooling Tower" />

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-orange-500" />
                    Credentials Update
                </div>
                <h2 className="text-2xl font-extrabold font-display text-[#14224A] mb-1.5">
                    Reset your password
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Choose a strong new password below to secure your account.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
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
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                        />
                    </div>
                    {errors.email && (
                        <div className="text-xs font-medium text-red-600">{errors.email}</div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                        New Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            autoComplete="new-password"
                            autoFocus
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                            className={inputClass}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14224A] transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <div className="text-xs font-medium text-red-600">{errors.password}</div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password_confirmation" className="text-sm font-semibold text-slate-700">
                        Confirm Password
                    </label>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password_confirmation"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className={inputClass}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14224A] transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    {errors.password_confirmation && (
                        <div className="text-xs font-medium text-red-600">
                            {errors.password_confirmation}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 mt-2 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-semibold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-60 text-sm"
                >
                    <span>{processing ? 'Updating...' : 'Reset Password'}</span>
                    <ArrowRight className="size-4" />
                </button>
            </form>
        </GuestLayout>
    );
}
