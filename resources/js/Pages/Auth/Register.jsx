import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState, useRef } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Calendar,
  Phone,
  Eye,
  EyeOff,
  Building2,
  User,
  Briefcase,
  FileText,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";
import logo from "../../../imports/cooling_tower_airconditioning_services_logo-1.jpg";
import GeospatialAddressAutocomplete from "../../Components/GeospatialAddressAutocomplete";
import InputError from "../../Components/InputError";

export default function Register({ onToggleView }) {
  const [showPassword, setShowPassword] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [gmailError, setGmailError] = useState('');
  const [fileError, setFileError] = useState('');
  const [geocodeStatus, setGeocodeStatus] = useState(null);
  const fileInputRef = useRef(null);

  const { data, setData, post, processing, errors, clearErrors } = useForm({
    account_type: 'individual', // 'individual' | 'business'
    given_name: '',
    last_name: '',
    middle_name: '',
    birthdate: '',
    sex: 'Male',
    contact_number: '',
    company_name: '',
    representative_role: '',
    tin: '',
    business_permit: null,
    street_house: '',
    barangay: '',
    city: '',
    province: '',
    landmark: '',
    address: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const isBusiness = data.account_type === 'business';

  // Capitalizes the first letter of each word
  function formatCapitalizedWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Formats TIN digits cleanly as XXX-XXX-XXX-XXX (supports 9 to 12 digits)
  function formatTinNumber(rawValue) {
    const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function handleAccountTypeSwitch(type) {
    if (data.account_type === type) return;
    setLocationError('');
    setGmailError('');
    setFileError('');
    clearErrors();
    setData('account_type', type);
  }

  function handlePermitFileChange(e) {
    const file = e.target.files?.[0] || null;
    setFileError('');
    if (!file) {
      setData('business_permit', null);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExt = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);

    if (!allowedTypes.includes(file.type) && !validExt) {
      setFileError('Please upload a valid PDF, JPG, or PNG document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size must not exceed 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setData('business_permit', file);
  }

  function removePermitFile() {
    setData('business_permit', null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!data.street_house.trim()) {
      setLocationError(
        isBusiness
          ? 'Please enter your company building, unit, or street address.'
          : 'Please enter your street or house/building number.'
      );
      return;
    }
    if (!data.barangay.trim() || !data.city.trim() || !data.province.trim()) {
      setLocationError('Please type your barangay and select from the geospatial suggestions to auto-fill Barangay, City, and Province.');
      return;
    }
    setLocationError('');
    if (!isValidEmail(data.email)) {
      setGmailError('Please enter a valid email address.');
      return;
    }
    setGmailError('');

    if (isBusiness && !data.business_permit) {
      setFileError('Please attach your business registration proof (DTI / SEC Registration or Mayor\'s Permit).');
      return;
    }
    setFileError('');

    post('/register', {
      forceFormData: true,
    });
  }

  const inputBaseClass =
    "w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F4F7FB] text-[#172B4D] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-sm";

  const iconInputClass =
    "w-full pl-11 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F4F7FB] text-[#172B4D] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-sm";

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] font-sans text-[#172B4D] selection:bg-[#2563EB] selection:text-white">
      <Head title="Create Account • Cooling Tower" />

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
            {isBusiness ? "B2B Corporate & Commercial Portal" : "Client Onboarding & Service Portal"}
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight mb-5 leading-tight text-white">
            Expert climate control for your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-orange-400">
              {isBusiness ? "business operations." : "peace of mind."}
            </span>
          </h1>
          <p className="text-slate-200 text-lg mb-8 leading-relaxed">
            {isBusiness
              ? "Partner with AC TOWER for commercial HVAC maintenance, multi-unit installations, and priority corporate servicing."
              : "Join thousands of satisfied customers. Create an account to easily book services and manage your property's climate control."}
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg my-auto bg-white p-8 sm:p-10 rounded-xl border border-[#E2E8F0] shadow-sm">
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

          <div className="mb-6">
            <div className="hidden lg:inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-3">
              <span className="size-1.5 rounded-full bg-[#2563EB]"></span>
              {isBusiness ? "Business / Corporate Registration" : "Customer Registration"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#10213F] mb-2">Create an account</h2>
            <p className="text-[#64748B] text-sm">
              {isBusiness
                ? "Register your company profile for verified commercial HVAC servicing."
                : "Fill in your details below to get started."}
            </p>
          </div>

          {/* Account Type Segmented Toggle */}
          <div className="mb-6 p-1.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleAccountTypeSwitch('individual')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                !isBusiness
                  ? "bg-white text-[#10213F] shadow-xs border border-[#E2E8F0]"
                  : "text-[#64748B] hover:text-[#172B4D]"
              }`}
            >
              <User className={`size-4 ${!isBusiness ? "text-[#2563EB]" : "text-[#64748B]"}`} />
              <span>Individual Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeSwitch('business')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isBusiness
                  ? "bg-white text-[#10213F] shadow-xs border border-[#E2E8F0]"
                  : "text-[#64748B] hover:text-[#172B4D]"
              }`}
            >
              <Building2 className={`size-4 ${isBusiness ? "text-[#2563EB]" : "text-[#64748B]"}`} />
              <span>Business / Corporate</span>
            </button>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {!isBusiness ? (
              /* ═══════════════════════════════════════════════════════════════
                 INDIVIDUAL CUSTOMER FLOW (EXISTING)
              ═══════════════════════════════════════════════════════════════ */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="given_name">Given name</label>
                    <input
                      id="given_name"
                      type="text"
                      placeholder="Enter Given Name"
                      value={data.given_name}
                      onChange={(e) => setData('given_name', formatCapitalizedWords(e.target.value))}
                      className={inputBaseClass}
                    />
                    <InputError message={errors.given_name} className="text-xs font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="last_name">Last name</label>
                    <input
                      id="last_name"
                      type="text"
                      placeholder="Enter Last Name"
                      value={data.last_name}
                      onChange={(e) => setData('last_name', formatCapitalizedWords(e.target.value))}
                      className={inputBaseClass}
                    />
                    <InputError message={errors.last_name} className="text-xs font-medium" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="middle_name">
                    Middle name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="middle_name"
                    type="text"
                    maxLength={1}
                    placeholder="Enter Middle Name"
                    value={data.middle_name}
                    onChange={(e) => {
                      const letter = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase();
                      setData('middle_name', letter);
                    }}
                    className={inputBaseClass}
                  />
                  <InputError message={errors.middle_name} className="text-xs font-medium" />
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
                    <InputError message={errors.birthdate} className="text-xs font-medium" />
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
                    <InputError message={errors.sex} className="text-xs font-medium" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="contact_number">Contact number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                    <input
                      id="contact_number"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="Enter 11-digit contact number"
                      value={data.contact_number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setData('contact_number', val);
                      }}
                      className={iconInputClass}
                    />
                  </div>
                  <InputError message={errors.contact_number} className="text-xs font-medium" />
                </div>
              </>
            ) : (
              /* ═══════════════════════════════════════════════════════════════
                 BUSINESS / CORPORATE (B2B) FLOW — MINIMALIST & FRICTIONLESS
              ═══════════════════════════════════════════════════════════════ */
              <>
                {/* Group 1: Company Identity & Tax Verification */}
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#14224A] flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-blue-600" />
                      Company Details
                    </span>
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/70 px-2 py-0.5 rounded-full">
                      Trust &amp; Verify
                    </span>
                  </div>

                  {/* 5. Registered Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="company_name">
                      Registered Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <input
                        id="company_name"
                        type="text"
                        placeholder="Enter Company Name"
                        value={data.company_name}
                        onChange={(e) => setData('company_name', e.target.value)}
                        className={`${iconInputClass} bg-white`}
                      />
                    </div>
                    <InputError message={errors.company_name} className="text-xs font-medium" />
                  </div>

                  {/* 6. Tax Identification Number (TIN) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700" htmlFor="tin">
                        Tax Identification Number (TIN) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">XXX-XXX-XXX-XXX</span>
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <input
                        id="tin"
                        type="text"
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="Enter Tax Identification Number"
                        value={data.tin}
                        onChange={(e) => setData('tin', formatTinNumber(e.target.value))}
                        className={`${iconInputClass} bg-white font-mono tracking-wide`}
                      />
                    </div>
                    <InputError message={errors.tin} className="text-xs font-medium" />
                  </div>
                </div>

                {/* Group 2: Authorized Representative & Contact */}
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#14224A] flex items-center gap-1.5">
                    <User className="size-3.5 text-blue-600" />
                    Authorized Representative
                  </span>

                  {/* 1. Representative Full Name (Split cleanly to match users table schema) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700" htmlFor="biz_given_name">
                        First / Given Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="biz_given_name"
                        type="text"
                        placeholder="Enter Given Name"
                        value={data.given_name}
                        onChange={(e) => setData('given_name', formatCapitalizedWords(e.target.value))}
                        className={`${inputBaseClass} bg-white`}
                      />
                      <InputError message={errors.given_name} className="text-xs font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700" htmlFor="biz_last_name">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="biz_last_name"
                        type="text"
                        placeholder="Enter Last Name"
                        value={data.last_name}
                        onChange={(e) => setData('last_name', formatCapitalizedWords(e.target.value))}
                        className={`${inputBaseClass} bg-white`}
                      />
                      <InputError message={errors.last_name} className="text-xs font-medium" />
                    </div>
                  </div>

                  {/* 2. Job Title / Role & 4. Direct Contact Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700" htmlFor="representative_role">
                        Job Title / Role <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        <input
                          id="representative_role"
                          type="text"
                          placeholder="Enter Job Title / Role"
                          value={data.representative_role}
                          onChange={(e) => setData('representative_role', e.target.value)}
                          className={`${iconInputClass} bg-white`}
                        />
                      </div>
                      <InputError message={errors.representative_role} className="text-xs font-medium" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700" htmlFor="biz_contact_number">
                        Direct Contact Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        <input
                          id="biz_contact_number"
                          type="tel"
                          maxLength={15}
                          placeholder="Enter Contact Number"
                          value={data.contact_number}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9+\-\s()]/g, '').slice(0, 15);
                            setData('contact_number', val);
                          }}
                          className={`${iconInputClass} bg-white`}
                        />
                      </div>
                      <InputError message={errors.contact_number} className="text-xs font-medium" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 7. Main Operating Address / Residential Address (GeospatialAddressAutocomplete) */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              {isBusiness && (
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#14224A]">
                    Main Operating Address
                  </span>
                </div>
              )}
              <GeospatialAddressAutocomplete
                id="reg_address"
                structured={true}
                allowOutsideSave={true}
                structuredValues={{
                  street_house: data.street_house,
                  barangay: data.barangay,
                  city: data.city,
                  province: data.province,
                  landmark: data.landmark,
                }}
                structuredErrors={{
                  street_house: errors.street_house,
                  barangay: errors.barangay,
                  city: errors.city,
                  province: errors.province,
                  landmark: errors.landmark,
                }}
                onStructuredChange={(nextFields, composedAddress) => {
                  setData((prev) => ({
                    ...prev,
                    street_house: nextFields.street_house,
                    barangay: nextFields.barangay,
                    city: nextFields.city,
                    province: nextFields.province,
                    landmark: nextFields.landmark,
                    address: composedAddress,
                  }));
                  if (locationError) setLocationError('');
                }}
                onGeocodeResult={(res) => setGeocodeStatus(res)}
                error={locationError || errors.address}
              />
            </div>

            {/* 9. Business Proof Upload (Required for Business / Corporate) */}
            {isBusiness && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="business_permit">
                    Business Proof Upload <span className="text-red-500">*</span>
                  </label>
                </div>
                <input
                  ref={fileInputRef}
                  id="business_permit"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handlePermitFileChange}
                  className="hidden"
                />
                {!data.business_permit ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-400 transition-all flex items-center justify-between gap-3 text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shrink-0">
                        <Upload className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 group-hover:text-[#14224A] truncate">
                          Attach DTI / SEC Registration or Mayor&apos;s Permit
                        </p>
                        <p className="text-[11px] text-slate-400">
                          PDF, JPG, or PNG • Max 5MB
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 group-hover:border-blue-300 group-hover:text-blue-700 shrink-0">
                      Browse
                    </span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {data.business_permit.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(data.business_permit.size / (1024 * 1024)).toFixed(2)} MB • Ready for verification
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePermitFile}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      aria-label="Remove uploaded file"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
                <InputError message={fileError || errors.business_permit} className="text-xs font-medium" />
              </div>
            )}

            <div className="border-t border-slate-100 my-4 pt-3"></div>

            {/* 3. Corporate / Work Email (or Personal Email) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reg_email">
                  {isBusiness ? (
                    <>Corporate / Work Email <span className="text-red-500">*</span></>
                  ) : (
                    "Email Address"
                  )}
                </label>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input
                  id="reg_email"
                  type="email"
                  placeholder={isBusiness ? "name@company.com" : "Enter Email"}
                  value={data.email}
                  onChange={(e) => {
                    setData('email', e.target.value);
                    if (gmailError) setGmailError('');
                  }}
                  className={iconInputClass}
                />
              </div>
              <InputError message={gmailError || errors.email} className="text-xs font-medium" />
            </div>

            {/* 8. Password & Confirm Password */}
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
                <InputError message={errors.password} className="text-xs font-medium" />
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
                <InputError message={errors.password_confirmation} className="text-xs font-medium" />
              </div>
            </div>

            {isBusiness && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                <strong>Verification Notice:</strong> You can access your dashboard immediately after signing up. Service booking creation will unlock automatically once our team verifies your company TIN and details.
              </div>
            )}

            <button
              disabled={processing}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 mt-6 shadow-xs disabled:opacity-60"
            >
              <span>
                {processing
                  ? "Creating account..."
                  : isBusiness
                  ? "Create Business Account"
                  : "Create Account"}
              </span>
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-[#E2E8F0] text-center text-sm text-[#64748B]">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold transition-colors"
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
