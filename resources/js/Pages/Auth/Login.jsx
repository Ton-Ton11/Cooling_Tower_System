import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState } from "react";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import logo from "../../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

export default function Login({ onToggleView, status }) {
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  function submit(e) {
    e.preventDefault();
    post('/login');
  }

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] font-sans text-[#172B4D] selection:bg-[#2563EB] selection:text-white">
      <Head title="Log In • Cooling Tower" />

      {/* Left side - Branding & Imagery */}
      <div className="hidden lg:flex w-1/2 relative bg-[#10213F] text-white overflow-hidden flex-col justify-between p-12 border-r border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1621252171031-2db473062319?auto=format&fit=crop&q=80&w=1200"
            alt="AC unit background"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10213F] via-[#10213F]/90 to-[#17315E]/75"></div>
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-3.5 w-fit group">
          <div className="size-12 rounded-full bg-white p-0.5 shadow-sm border border-white/20 flex items-center justify-center overflow-hidden">
            <img
              src={logo}
              alt="Cooling Tower Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-display tracking-tight text-white leading-none">
              Cooling Tower
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#93C5FD] mt-1">
              Airconditioning Services
            </span>
          </div>
        </Link>

        <div className="relative z-10 max-w-lg mt-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#EAF2FF] text-xs font-semibold mb-5">
            <span className="size-2 rounded-full bg-[#16A34A]"></span>
            Operations & Service Portal
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight mb-5 leading-tight text-white">
            Expert climate control for your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-orange-400">
              peace of mind.
            </span>
          </h1>
          <p className="text-slate-200 text-lg mb-8 leading-relaxed">
            Access your personalized service dashboard, manage appointments, and track your maintenance history in one secure place.
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto relative">
        <div className="w-full max-w-md my-auto bg-white p-8 sm:p-10 rounded-xl border border-[#E2E8F0] shadow-sm">
          {/* Mobile Header */}
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-8">
            <div className="size-11 rounded-full bg-white p-0.5 border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
              <img
                src={logo}
                alt="Cooling Tower Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-display tracking-tight text-[#10213F] leading-none">
                Cooling Tower
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#2563EB] mt-0.5">
                Airconditioning Services
              </span>
            </div>
          </Link>

          <div className="mb-8">
            <div className="hidden lg:inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-3">
              <span className="size-1.5 rounded-full bg-[#2563EB]"></span>
              Account Sign In
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#10213F] mb-2">Welcome to Cooling Tower</h2>
            <p className="text-[#64748B] text-sm">
              Enter your credentials to access your account.
            </p>
          </div>

          {status && (
            <div className="mb-5 rounded-lg bg-[#ECFDF5] border border-[#BBF7D0] px-4 py-3 text-xs font-semibold text-[#15803D] flex items-start gap-2.5">
              <ShieldCheck className="size-4 shrink-0 mt-0.5 text-[#16A34A]" />
              <span>{status}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#172B4D]" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#64748B] pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter Email Address"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F4F7FB] text-[#172B4D] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
              </div>
              {errors.email && <div className="text-xs font-medium text-[#DC2626]">{errors.email}</div>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#172B4D]" htmlFor="password">Password</label>
                <Link href={route('password.request')} className="text-xs text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#64748B] pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="w-full pl-11 pr-12 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F4F7FB] text-[#172B4D] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172B4D] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.password && <div className="text-xs font-medium text-[#DC2626]">{errors.password}</div>}
            </div>

            <button
              disabled={processing}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              <span>{processing ? "Signing in..." : "Log in to account"}</span>
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E2E8F0] text-center text-sm text-[#64748B]">
            Don't have an account?{" "}
            <a
              href="/register"
              className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold transition-colors"
              onClick={(e) => {
                if (onToggleView) {
                  e.preventDefault();
                  onToggleView();
                }
              }}
            >
              Register here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}