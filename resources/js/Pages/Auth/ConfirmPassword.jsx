import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function ConfirmPassword() {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password • Cooling Tower" />

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-3">
                    <span className="size-1.5 rounded-full bg-[#2563EB]" />
                    Security Check
                </div>
                <h2 className="text-2xl font-bold font-display text-[#10213F] mb-1.5">
                    Confirm your password
                </h2>
                <p className="text-sm text-[#64748B] leading-relaxed">
                    This is a secure area of the application. Please confirm your
                    password before continuing.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                        Password
                    </label>

                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            autoFocus
                            placeholder="Enter your password"
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
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

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 text-sm"
                >
                    <span>{processing ? 'Confirming...' : 'Confirm Password'}</span>
                    <ArrowRight className="size-4" />
                </button>
            </form>
        </GuestLayout>
    );
}
