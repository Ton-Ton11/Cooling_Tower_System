import { Head, Link } from '@inertiajs/react';
import React from "react";
import { ThermometerSnowflake, Wrench, CalendarCheck, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import logo from "../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

export default function App() {
  return (
    <div className="min-h-screen font-sans bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      <Head title="Cooling Tower Airconditioning Services" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-11 rounded-full bg-white p-0.5 shadow-md shadow-[#14224A]/15 ring-2 ring-[#14224A]/10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
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
              <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-600 mt-0.5">
                Airconditioning Services
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Services</a>
            <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">About Us</a>
            <a href="#testimonials" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Why Choose Us</a>
          </nav>

          <div className="flex items-center gap-3.5">
            <Link 
              href="/login" 
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-[#14224A] hover:text-blue-600 hover:bg-slate-100/80 transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/register" 
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#0E1A33] text-white">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&q=80&w=2000" 
              alt="Air conditioning unit" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E1A33] via-[#14224A]/90 to-[#14224A]/60"></div>
            {/* Ambient glows matching logo's cyan-blue & warm orange blades */}
            <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-start">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 text-sky-200 border border-sky-400/30 backdrop-blur-xs text-sm font-medium mb-6 shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              Available for Emergency Repair 24/7
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold font-display tracking-tight max-w-3xl leading-tight mb-6">
              Keep your space{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-orange-400">
                perfectly chilled
              </span>{" "}
              all year round.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-200/90 max-w-2xl mb-10 leading-relaxed">
              Professional air conditioning installation, maintenance, and repair services for residential and commercial properties. Fast, reliable, and guaranteed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 px-8 text-base font-semibold text-white shadow-lg shadow-blue-950/50 transition-all hover:brightness-110 hover:-translate-y-0.5"
              >
                Book a Service
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#services"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-8 text-base font-semibold text-white transition-colors hover:bg-white/20 backdrop-blur-sm border border-white/15"
              >
                View Services
              </a>
            </div>
          </div>
        </section>

        {/* Features/Services Section */}
        <section id="services" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full mb-3">
                What We Do
              </span>
              <h2 className="text-3xl font-extrabold font-display text-[#14224A] mb-4">Our Core Services</h2>
              <p className="text-slate-600 text-lg">Comprehensive cooling solutions tailored to your specific needs, delivered by certified professionals.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: ThermometerSnowflake,
                  title: "Installation",
                  description: "Expert installation of split, ducted, and multi-system air conditioners with energy efficiency in mind.",
                  accent: "bg-sky-50 text-sky-600 border-sky-100 group-hover:bg-sky-600 group-hover:text-white"
                },
                {
                  icon: Wrench,
                  title: "Repair & Fixing",
                  description: "Fast diagnostics and repair for all major brands. We fix leaks, cooling issues, and strange noises.",
                  accent: "bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-500 group-hover:text-white"
                },
                {
                  icon: CalendarCheck,
                  title: "Annual Maintenance",
                  description: "Preventative care to extend the life of your AC, improve air quality, and lower your energy bills.",
                  accent: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-[#14224A] group-hover:text-white"
                }
              ].map((service, i) => (
                <div key={i} className="group relative bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:shadow-[#14224A]/5 transition-all hover:-translate-y-1 hover:border-blue-300">
                  <div className={`size-14 rounded-xl border flex items-center justify-center mb-6 transition-all duration-200 ${service.accent}`}>
                    <service.icon className="size-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[#14224A] mb-3">{service.title}</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section id="about" className="py-24 bg-white border-y border-slate-200/80">
          <div id="testimonials" className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full mb-3">
                Trusted HVAC Partner
              </span>
              <h2 className="text-3xl font-extrabold font-display text-[#14224A] mb-6">Why trust Cooling Tower with your comfort?</h2>
              <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                With over a decade of experience, we've built a reputation for excellence, transparency, and unmatched technical expertise. We don't just fix ACs; we optimize your indoor climate.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "Licensed & Insured Technicians" },
                  { icon: Clock, text: "On-Time Guarantee & Automated Maintenance Alerts" },
                  { icon: CheckCircle2, text: "Upfront, Transparent Pricing" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <div className="size-7 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                      <item.icon className="size-4" />
                    </div>
                    <span className="font-semibold text-slate-800">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-900/10">
                <img 
                  src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200" 
                  alt="Technician working on AC"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-[#14224A]">4.9</div>
                  <div>
                    <div className="flex text-orange-500 text-sm mb-1 tracking-wider">
                      ★★★★★
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Based on 500+ reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0B1528] text-slate-400 py-12 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4 text-white">
              <div className="size-9 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logo} alt="Cooling Tower Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="text-lg font-bold font-display">Cooling Tower</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Premium air conditioning services for your home and business. Stay cool, comfortable, and stress-free.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#services" className="hover:text-sky-400 transition-colors">AC Installation</a></li>
              <li><a href="#services" className="hover:text-sky-400 transition-colors">AC Repair</a></li>
              <li><a href="#services" className="hover:text-sky-400 transition-colors">Maintenance Plans</a></li>
              <li><a href="#services" className="hover:text-sky-400 transition-colors">Cooling Tower Overhaul</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-sky-400 transition-colors">About Us</a></li>
              <li><a href="#testimonials" className="hover:text-sky-400 transition-colors">Why Choose Us</a></li>
              <li><Link href="/login" className="hover:text-sky-400 transition-colors">Staff Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-sky-400 transition-colors">Log In</Link></li>
              <li><Link href="/register" className="hover:text-sky-400 transition-colors">Register</Link></li>
              <li><Link href="/login" className="hover:text-orange-400 transition-colors font-medium">Book Online &rarr;</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 text-sm text-center md:text-left flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} Cooling Tower Airconditioning Services. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}