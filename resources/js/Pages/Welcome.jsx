import { Head, Link } from '@inertiajs/react';
import React from "react";
import { ThermometerSnowflake, Wrench, CalendarCheck, ArrowRight, ShieldCheck, Clock, CheckCircle2, Phone, MapPin, Award, Check, Copy } from "lucide-react";
import logo from "../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

const ACCREDITED_BRANDS = [
  { name: "Panasonic"},
  { name: "Daikin"},
  { name: "Carrier"},
  { name: "Condura"},
  { name: "Kelvinator"},
  { name: "Gree"},
  { name: "Midea"},
];

export default function App() {
  const [copiedKey, setCopiedKey] = React.useState(null);

  const handleCopy = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };
  return (
    <div className="min-h-screen font-sans bg-[#F4F7FB] text-[#172B4D] flex flex-col selection:bg-[#2563EB] selection:text-white">
      <Head title="Cooling Tower Airconditioning Services - DTI Accredited" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
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
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#2563EB] mt-0.5">
                Airconditioning Services
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors">Services</a>
            <a href="#testimonials" className="text-sm font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors">Why Choose Us</a>
            <a href="#brands" className="text-sm font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors">Accreditations</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-semibold text-[#172B4D] hover:text-[#2563EB] hover:bg-[#EAF2FF] transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/register" 
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-6 text-sm font-semibold text-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#10213F] text-white">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&q=80&w=2000" 
              alt="Air conditioning unit" 
              className="w-full h-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10213F] via-[#10213F]/95 to-[#17315E]/85"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 flex flex-col items-start">
            <div className="flex items-center gap-2 flex-wrap mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-[#EAF2FF] border border-white/15 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]"></span>
                24/7 Emergency Dispatch
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold font-display tracking-tight max-w-3xl leading-tight mb-6 text-white">
              Keep your space{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-orange-400">
                perfectly chilled
              </span>{" "}
              all year round.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mb-8 leading-relaxed">
              DTI-accredited air conditioning installation, maintenance, and warranty repair services. Official dealer and authorized service center for top international brands.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mb-10">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-8 text-base font-semibold text-white shadow-sm transition-colors"
              >
                Book a Service
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#services"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white/10 px-8 text-base font-semibold text-white transition-colors hover:bg-white/15 border border-white/20"
              >
                View Services
              </a>
            </div>

            {/* Micro Credential Bar */}
            <div className="pt-6 border-t border-white/15 flex items-center gap-2 flex-wrap text-xs text-slate-300">
              <span className="font-semibold text-[#93C5FD] uppercase tracking-wider text-[11px]">Authorized For:</span>
              <span className="text-white font-medium">Panasonic • Daikin • Carrier • Condura • Kelvinator • Gree • Midea</span>
            </div>
          </div>
        </section>

        {/* Authorized Brands & Accreditation Showcase */}
        <section id="brands" className="bg-white border-b border-[#E2E8F0] relative z-20">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-3.5 shrink-0">
                <div className="size-12 rounded-xl bg-[#EAF2FF] border border-[#C7DDFD] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Award className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#15803D] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                      DTI Accredited
                    </span>
                    <span className="text-xs font-semibold text-[#64748B]">Official Brand Certification</span>
                  </div>
                  <h3 className="text-base font-bold text-[#10213F] mt-0.5">
                    Accredited Dealer, Installer & Service Center
                  </h3>
                  <p className="text-xs text-[#64748B]">Guaranteed factory-backed warranty & 100% genuine replacement parts</p>
                </div>
              </div>

              {/* Brand Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {ACCREDITED_BRANDS.map((brand) => (
                  <div
                    key={brand.name}
                    className="p-3 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] hover:border-[#C7DDFD] transition-colors text-center group cursor-default"
                  >
                    <span className="block text-xs font-bold text-[#10213F] group-hover:text-[#2563EB] transition uppercase tracking-tight">
                      {brand.name}
                    </span>
                    <span className="block text-[9px] font-semibold text-[#64748B] truncate mt-0.5">
                      {brand.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features/Services Section */}
        <section id="services" className="py-24 bg-[#F4F7FB]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-3">
                What We Do
              </span>
              <h2 className="text-3xl font-bold font-display text-[#10213F] mb-4">Our Core Services</h2>
              <p className="text-[#64748B] text-lg">Comprehensive cooling solutions tailored to your specific needs, delivered by certified professionals.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: ThermometerSnowflake,
                  title: "Installation & Setup",
                  description: "Factory-certified installation for split, multi-split, and commercial air conditioning systems with full warranty protection.",
                },
                {
                  icon: Wrench,
                  title: "Diagnostics & Repair",
                  description: "Authorized service center troubleshooting for all major brands. Genuine parts, rapid response, and transparent billing.",
                },
                {
                  icon: CalendarCheck,
                  title: "Preventive Maintenance",
                  description: "Routine chemical washing, coil sanitization, and automated scheduling to maximize cooling efficiency and unit lifespan.",
                }
              ].map((service, i) => (
                <div key={i} className="group relative bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#2563EB] hover:shadow-sm transition-all">
                  <div className="size-12 rounded-xl border border-[#C7DDFD] bg-[#EAF2FF] text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white flex items-center justify-center mb-6 transition-colors">
                    <service.icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#10213F] mb-3">{service.title}</h3>
                  <p className="text-[#64748B] leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section id="testimonials" className="py-24 bg-white border-y border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-3 py-1 rounded-full mb-3">
                Trusted HVAC Partner
              </span>
              <h2 className="text-3xl font-bold font-display text-[#10213F] mb-6">Why trust Cooling Tower with your comfort?</h2>
              <p className="text-[#64748B] text-lg mb-8 leading-relaxed">
                With over a decade of technical excellence, we are Zamboanga City's trusted DTI-accredited HVAC contractor and authorized service center. We don't just fix ACs; we optimize your indoor climate with genuine parts and factory expertise.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "DTI Accredited Multi-Brand Dealer & Service Center" },
                  { icon: CheckCircle2, text: "Authorized for Panasonic, Daikin, Carrier, Condura, Kelvinator, Gree & Midea" },
                  { icon: Clock, text: "On-Time Dispatch Guarantee & Automated Maintenance Forecasts" },
                  { icon: CheckCircle2, text: "Itemized Quotation & 100% Workmanship Warranty" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <div className="size-7 rounded-full bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] flex items-center justify-center shrink-0">
                      <item.icon className="size-4" />
                    </div>
                    <span className="font-semibold text-[#172B4D]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#E2E8F0]">
                <img 
                  src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200" 
                  alt="Technician working on AC"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-md">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-[#10213F]">4.9</div>
                  <div>
                    <div className="flex text-[#D97706] text-sm mb-1 tracking-wider">
                      ★★★★★
                    </div>
                    <div className="text-sm text-[#64748B] font-medium">Based on 500+ satisfied clients</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#10213F] text-slate-400 py-14 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Col 1: Company Profile & Accreditations */}
          <div>
            <div className="flex items-center gap-3 mb-4 text-white">
              <div className="size-10 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                <img src={logo} alt="Cooling Tower Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold font-display leading-tight">Cooling Tower</span>
                <span className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">Airconditioning Services</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed mb-4 text-slate-400">
              Professional residential and commercial cooling solutions. Certified technicians, transparent diagnostics, and factory-authorized care.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-slate-200">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span className="font-extrabold text-emerald-300">DTI Accredited Business</span>
            </div>
          </div>

          {/* Col 2: Accredited Brands */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Accredited Brands</h4>
            <p className="text-xs text-slate-400 mb-3">
              Official Dealer, Installer & Service Center for:
            </p>
            <ul className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Panasonic</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Daikin</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Carrier</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Condura</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Kelvinator</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Gree</span>
              </li>
              <li className="col-span-2 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                <span>Midea</span>
              </li>
            </ul>
            <p className="text-[11px] text-slate-500 mt-3 italic">
              Original parts & factory warranty preserved.
            </p>
          </div>

          {/* Col 3: Service Center Office & Contact Details */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Service Center & Office</h4>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-[#93C5FD] shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold block">Office & Service Facility:</span>
                  <span className="text-slate-400 leading-relaxed block mt-0.5">
                    Door 5, Apostol Bldg., Mayor Jaldon St. Canelar Zamboanga City
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <Phone className="size-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold block">Mobile Hotline:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("0917 877 7670", "mobile")}
                    className="text-sky-300 hover:text-white font-mono font-bold transition-colors flex items-center gap-1.5 mt-0.5 group text-left cursor-pointer"
                    title="Click to copy Mobile Number"
                  >
                    <span>0917 877 7670</span>
                    {copiedKey === "mobile" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-1.5 py-0.5 rounded shadow-2xs">
                        <Check className="size-2.5 text-emerald-400" />
                        Copied!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Copy className="size-2.5" />
                        Copy
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <Phone className="size-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold block">Telephone (Landline):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("062 310-2275", "landline")}
                    className="text-sky-300 hover:text-white font-mono font-bold transition-colors flex items-center gap-1.5 mt-0.5 group text-left cursor-pointer"
                    title="Click to copy Telephone Number"
                  >
                    <span>062 310-2275</span>
                    {copiedKey === "landline" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-1.5 py-0.5 rounded shadow-2xs">
                        <Check className="size-2.5 text-emerald-400" />
                        Copied!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Copy className="size-2.5" />
                        Copy
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <svg className="size-4 text-[#1877F2] shrink-0 mt-0.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <div>
                  <span className="text-white font-semibold block">Facebook:</span>
                  <a
                    href="https://www.facebook.com/share/19w3XmbCza/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 hover:text-white font-medium transition-colors block mt-0.5 hover:underline"
                    title="Follow Cooling Tower Airconditioning Services on Facebook"
                  >
                    Cooling Tower Airconditioning Services
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Col 4: Quick Links & Customer Portal */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Customer Portal</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/login" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="size-3 text-sky-500" />
                  <span>Customer Log In</span>
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="size-3 text-sky-500" />
                  <span>Register an Account</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[#93C5FD] hover:text-white font-semibold flex items-center gap-1.5">
                  <ArrowRight className="size-3" />
                  <span>Book AC Service Online</span>
                </Link>
              </li>
              <li className="pt-2 border-t border-slate-800">
                <Link href="/login" className="text-slate-400 hover:text-slate-300 transition-colors">
                  Staff & Technician Access
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://www.facebook.com/share/19w3XmbCza/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline decoration-slate-600 underline-offset-2 transition-colors font-medium"
              title="Visit Cooling Tower Airconditioning Services on Facebook"
            >
              Cooling Tower Airconditioning Services
            </a>
            . DTI Accredited. Authorized Dealer, Installer & Service Center for Panasonic, Daikin, Carrier, Condura, Kelvinator, Gree & Midea.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}