import { Head, Link, useForm } from '@inertiajs/react';
import React from "react";
import { Fan, ArrowRight, ShieldCheck, Mail, Lock, Calendar, MapPin, Phone, Eye, EyeOff } from "lucide-react";
import { useState } from 'react';

export default function Register({ onToggleView }) {
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    given_name: '',
    last_name: '',
    middle_name: '',
    birthdate: '',
    sex: 'Male',
    contact_number: '',
    address: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  function submit(e) {
    e.preventDefault();
    post('/register');
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
            Join thousands of satisfied customers. Create an account to easily book services and manage your property's climate control.
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
            <h2 className="text-3xl font-bold font-['Outfit'] mb-2">Create an account</h2>
            <p className="text-muted-foreground">
              Fill in your details below to get started.
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="given_name">Given name</label>
                <input 
                  id="given_name" 
                  type="text" 
                  placeholder="John"
                  value={data.given_name}
                  onChange={(e) => setData('given_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
                {errors.given_name && <div className="text-sm text-red-600">{errors.given_name}</div>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="last_name">Last name</label>
                <input 
                  id="last_name" 
                  type="text" 
                  placeholder="Doe"
                  value={data.last_name}
                  onChange={(e) => setData('last_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
                {errors.last_name && <div className="text-sm text-red-600">{errors.last_name}</div>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="middle_name">Middle name (Optional)</label>
              <input 
                id="middle_name" 
                type="text" 
                placeholder="Smith"
                value={data.middle_name}
                onChange={(e) => setData('middle_name', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              {errors.middle_name && <div className="text-sm text-red-600">{errors.middle_name}</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="birthdate">Birthdate</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                  <input 
                    id="birthdate" 
                    type="date" 
                    value={data.birthdate}
                    onChange={(e) => setData('birthdate', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                  />
                </div>
                {errors.birthdate && <div className="text-sm text-red-600">{errors.birthdate}</div>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="sex">Sex</label>
                <select 
                  id="sex" 
                  value={data.sex}
                  onChange={(e) => setData('sex', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm appearance-none bg-no-repeat"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
                {errors.sex && <div className="text-sm text-red-600">{errors.sex}</div>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="contact_number">Contact number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input 
                  id="contact_number" 
                  type="tel" 
                  placeholder="+1 (555) 000-0000"
                  value={data.contact_number}
                  onChange={(e) => setData('contact_number', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              {errors.contact_number && <div className="text-sm text-red-600">{errors.contact_number}</div>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="address">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 size-5 text-muted-foreground" />
                <textarea 
                  id="address" 
                  rows={2}
                  placeholder="Enter your full address"
                  value={data.address}
                  onChange={(e) => setData('address', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                ></textarea>
              </div>
              {errors.address && <div className="text-sm text-red-600">{errors.address}</div>}
            </div>

            <div className="border-t border-border my-4 pt-4"></div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reg_email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input 
                  id="reg_email" 
                  type="email" 
                  placeholder="Create an Email Address"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              {errors.email && <div className="text-sm text-red-600">{errors.email}</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reg_password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                  <input 
                    id="reg_password" 
                    type={showPassword ? "text" : "password"}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
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

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password_confirmation">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                  <input 
                    id="password_confirmation" 
                    type={showPassword ? "text" : "password"}
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
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
                {errors.password_confirmation && <div className="text-sm text-red-600">{errors.password_confirmation}</div>}
              </div>
            </div>

            <button disabled={processing} className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all flex items-center justify-center gap-2 mt-6 shadow-md shadow-primary/20">
              Create Account
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a 
              href="/login" 
              className="text-primary hover:underline font-medium"
              onClick={(e) => {
                if (onToggleView) {
                  e.preventDefault();
                  onToggleView();
                }
              }}
            >
              Log in here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}