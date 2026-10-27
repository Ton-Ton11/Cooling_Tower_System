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
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      <Head title="Log In • Cooling Tower" />

      {/* Left side - Branding & Imagery */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0E1A33] text-white overflow-hidden flex-col justify-between p-12 border-r border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1621252171031-2db473062319?auto=format&fit=crop&q=80&w=1200" 
            alt="AC unit background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-[#14224A]/85 to-[#0E1A33]/60"></div>
          {/* Subtle ambient glows matching the logo's cyan-blue and warm orange blades */}
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-12 right-10 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none"></div>
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-3.5 w-fit group">
          <div className="size-12 rounded-full bg-white p-0.5 shadow-lg shadow-black/30 ring-2 ring-sky-400/30 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
            <img
              src={logo}
              alt="Cooling Tower Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold font-display tracking-tight text-white leading-none">
              Cooling Tower
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-300 mt-1">
              Airconditioning Services
            </span>
          </div>
        </Link>

        <div className="relative z-10 max-w-lg mt-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-sky-400/25 text-sky-200 text-xs font-semibold mb-5 backdrop-blur-xs">
            <span className="size-2 rounded-full bg-orange-400"></span>
            Operations & Service Portal
          </div>
          <h1 className="text-4xl font-extrabold font-display tracking-tight mb-5 leading-tight text-white">
            Expert climate control for your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-300 to-orange-300">
              peace of mind.
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Access your personalized service dashboard, manage appointments, and track your maintenance history in one secure place.
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto relative">
        <div className="w-full max-w-md my-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-[#14224A]/5">
          {/* Mobile Header */}
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-8">
            <div className="size-11 rounded-full bg-white p-0.5 shadow-md ring-2 ring-[#14224A]/10 flex items-center justify-center overflow-hidden">
              <img
                src={logo}
                alt="Cooling Tower Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold font-display tracking-tight text-[#14224A] leading-none">
                Cooling Tower
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-sky-600 mt-0.5">
                Airconditioning Services
              </span>
            </div>
          </Link>

          <div className="mb-8">
            <div className="hidden lg:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
              <span className="size-1.5 rounded-full bg-orange-500"></span>
              Account Sign In
            </div>
            <h2 className="text-3xl font-extrabold font-display text-[#14224A] mb-2">Welcome to Cooling Tower</h2>
            <p className="text-slate-500 text-sm">
              Enter your credentials to access your account.
            </p>
          </div>

          {status && (
            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-start gap-2.5">
              <ShieldCheck className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{status}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input 
                  id="email" 
                  type="email" 
                  placeholder="Enter Email Address"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>
              {errors.email && <div className="text-xs font-medium text-red-600">{errors.email}</div>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
                <Link href={route('password.request')} className="text-xs text-blue-600 hover:text-orange-600 hover:underline font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="w-full pl-11 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14224A] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.password && <div className="text-xs font-medium text-red-600">{errors.password}</div>}
            </div>

            <button
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-semibold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-60"
            >
              <span>{processing ? "Signing in..." : "Log in to account"}</span>
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <a 
              href="/register" 
              className="text-blue-600 hover:text-orange-600 hover:underline font-semibold transition-colors"
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