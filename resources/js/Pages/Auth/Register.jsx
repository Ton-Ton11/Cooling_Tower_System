import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState } from "react";
import { ArrowRight, ShieldCheck, Mail, Lock, Calendar, Phone, Eye, EyeOff } from "lucide-react";
import logo from "../../../imports/cooling_tower_airconditioning_services_logo-1.jpg";
import GeospatialAddressAutocomplete, { evaluateZamboangaGeospatial } from "../../Components/GeospatialAddressAutocomplete";

export default function Register({ onToggleView }) {
  const [showPassword, setShowPassword] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [gmailError, setGmailError] = useState('');
  const [geocodeStatus, setGeocodeStatus] = useState(null);
  const { data, setData, post, processing, errors } = useForm({
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

  function isValidGmail(email) {
    return /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(String(email || '').trim());
  }

  function submit(e) {
    e.preventDefault();
    if (!data.address.trim()) {
      setLocationError('Please enter your complete address or choose a real-time geospatial suggestion.');
      return;
    }
    setLocationError('');
    if (!isValidGmail(data.email)) {
      setGmailError('Please enter a valid Gmail address (@gmail.com) so we can send your account verification code.');
      return;
    }
    setGmailError('');
    post('/register');
  }

  const inputBaseClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm";

  const iconInputClass =
    "w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm";

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      <Head title="Create Account • Cooling Tower" />

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
            Client Onboarding & Service Portal
          </div>
          <h1 className="text-4xl font-extrabold font-display tracking-tight mb-5 leading-tight text-white">
            Expert climate control for your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-300 to-orange-300">
              peace of mind.
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Join thousands of satisfied customers. Create an account to easily book services and manage your property's climate control.
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg my-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-[#14224A]/5">
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

          <div className="mb-7">
            <div className="hidden lg:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-3">
              <span className="size-1.5 rounded-full bg-orange-500"></span>
              Customer Registration
            </div>
            <h2 className="text-3xl font-extrabold font-display text-[#14224A] mb-2">Create an account</h2>
            <p className="text-slate-500 text-sm">
              Fill in your details below to get started.
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="given_name">Given name</label>
                <input 
                  id="given_name" 
                  type="text" 
                  value={data.given_name}
                  onChange={(e) => setData('given_name', e.target.value)}
                  className={inputBaseClass}
                />
                {errors.given_name && <div className="text-xs font-medium text-red-600">{errors.given_name}</div>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="last_name">Last name</label>
                <input 
                  id="last_name" 
                  type="text" 
                  value={data.last_name}
                  onChange={(e) => setData('last_name', e.target.value)}
                  className={inputBaseClass}
                />
                {errors.last_name && <div className="text-xs font-medium text-red-600">{errors.last_name}</div>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="middle_name">
                Middle name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input 
                id="middle_name" 
                type="text" 
                value={data.middle_name}
                onChange={(e) => setData('middle_name', e.target.value)}
                className={inputBaseClass}
              />
              {errors.middle_name && <div className="text-xs font-medium text-red-600">{errors.middle_name}</div>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="birthdate">Birthdate</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                  <input 
                    id="birthdate" 
                    type="date" 
                    value={data.birthdate}
                    onChange={(e) => setData('birthdate', e.target.value)}
                    className={iconInputClass}
                  />
                </div>
                {errors.birthdate && <div className="text-xs font-medium text-red-600">{errors.birthdate}</div>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="sex">Sex</label>
                <select 
                  id="sex" 
                  value={data.sex}
                  onChange={(e) => setData('sex', e.target.value)}
                  className={`${inputBaseClass} appearance-none bg-no-repeat`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em 1.25em' }}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
                {errors.sex && <div className="text-xs font-medium text-red-600">{errors.sex}</div>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="contact_number">Contact number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input 
                  id="contact_number" 
                  type="tel" 
                  value={data.contact_number}
                  onChange={(e) => setData('contact_number', e.target.value)}
                  className={iconInputClass}
                />
              </div>
              {errors.contact_number && <div className="text-xs font-medium text-red-600">{errors.contact_number}</div>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="address">
                Address
              </label>
              <GeospatialAddressAutocomplete
                id="address"
                value={data.address}
                allowOutsideSave={true}
                placeholder="Type street, barangay, or city"
                onChange={(val) => {
                  setData('address', val);
                  if (locationError) setLocationError('');
                }}
                onGeocodeResult={(res) => setGeocodeStatus(res)}
                error={locationError || errors.address}
              />
            </div>

            <div className="border-t border-slate-100 my-4 pt-3"></div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reg_email">
                  Gmail Address
                </label>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input 
                  id="reg_email" 
                  type="email" 
                  placeholder="yourname@gmail.com"
                  value={data.email}
                  onChange={(e) => {
                    setData('email', e.target.value);
                    if (gmailError) setGmailError('');
                  }}
                  className={iconInputClass}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                A verification link will be sent to your Gmail inbox.
              </p>
              {(gmailError || errors.email) && (
                <div className="text-xs font-medium text-red-600">{gmailError || errors.email}</div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reg_password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                  <input 
                    id="reg_password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14224A] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && <div className="text-xs font-medium text-red-600">{errors.password}</div>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password_confirmation">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                  <input 
                    id="password_confirmation" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14224A] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password_confirmation && <div className="text-xs font-medium text-red-600">{errors.password_confirmation}</div>}
              </div>
            </div>

            <button
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-semibold rounded-xl hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-900/20 disabled:opacity-60"
            >
              <span>{processing ? "Creating account..." : "Create Account"}</span>
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <a 
              href="/login" 
              className="text-blue-600 hover:text-orange-600 hover:underline font-semibold transition-colors"
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