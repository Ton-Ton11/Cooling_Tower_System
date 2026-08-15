import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React from "react";
import { Fan, ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from 'react';

export default function Login({ onToggleView }) {
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
    <div className="min-h-screen flex bg-background font-sans">
      {/* Left side - Branding & Imagery */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 text-white overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1621252171031-2db473062319?auto=format&fit=crop&q=80&w=1200" 
            alt="AC unit background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="size-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Fan className="size-6" />
          </div>
          <span className="text-2xl font-bold font-['Outfit'] tracking-tight">
            Cooling Tower
          </span>
        </div>

        <div className="relative z-10 max-w-lg mt-auto">
          <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-6 leading-tight">
            Expert climate control for your peace of mind.
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Access your personalized service dashboard, manage appointments, and track your maintenance history in one secure place.
          </p>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex -space-x-3">
              <img className="size-10 rounded-full border-2 border-slate-900" src="https://i.pravatar.cc/100?img=1" alt="User" />
              <img className="size-10 rounded-full border-2 border-slate-900" src="https://i.pravatar.cc/100?img=2" alt="User" />
              <img className="size-10 rounded-full border-2 border-slate-900" src="https://i.pravatar.cc/100?img=3" alt="User" />
            </div>
            <div className="text-slate-400">
              Trusted by <strong className="text-white">10,000+</strong> customers
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {/* Mobile Header */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Fan className="size-6" />
            </div>
            <span className="text-xl font-bold font-['Outfit'] tracking-tight text-foreground">
              Cooling Tower
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold font-['Outfit'] mb-2">Welcome to Cooling Tower</h2>
            <p className="text-muted-foreground">
              Enter your credentials to access your account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input 
                  id="email" 
                  type="email" 
                  placeholder="Enter Email Address"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              {errors.email && <div className="text-sm text-red-600">{errors.email}</div>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <Link href={route('password.request')} className="text-sm text-primary hover:underline font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.password && <div className="text-sm text-red-600">{errors.password}</div>}
            </div>

            <button disabled={processing} className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20">
              Log in to account
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a 
              href="/register" 
              className="text-primary hover:underline font-medium"
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