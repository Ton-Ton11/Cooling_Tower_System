import { Head, Link } from '@inertiajs/react';
import React from "react";
import { Fan, ThermometerSnowflake, Wrench, CalendarCheck, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Fan className="size-6" />
            </div>
            <span className="text-xl font-bold font-['Outfit'] tracking-tight">
              Cooling Tower
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Services</a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About Us</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Testimonials</a>
          </nav>

          <div className="flex items-center gap-4">
            <a 
              href="/login" 
              className="hidden sm:inline-flex text-sm font-medium hover:text-primary transition-colors"
            >
              Log in
            </a>
            <a 
              href="/register" 
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Register
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&q=80&w=2000" 
              alt="Air conditioning unit" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Available for Emergency Repair 24/7
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold font-['Outfit'] tracking-tight max-w-3xl leading-tight mb-6">
              Keep your space perfectly chilled all year round.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
              Professional air conditioning installation, maintenance, and repair services for residential and commercial properties. Fast, reliable, and guaranteed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-white transition-colors hover:bg-primary/90">
                Book a Service
                <ArrowRight className="size-4" />
              </button>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white/10 px-8 text-base font-medium text-white transition-colors hover:bg-white/20 backdrop-blur-sm border border-white/10">
                View Pricing
              </button>
            </div>
          </div>
        </section>

        {/* Features/Services Section */}
        <section id="services" className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold font-['Outfit'] mb-4">Our Core Services</h2>
              <p className="text-muted-foreground text-lg">Comprehensive cooling solutions tailored to your specific needs, delivered by certified professionals.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: ThermometerSnowflake,
                  title: "Installation",
                  description: "Expert installation of split, ducted, and multi-system air conditioners with energy efficiency in mind."
                },
                {
                  icon: Wrench,
                  title: "Repair & Fixing",
                  description: "Fast diagnostics and repair for all major brands. We fix leaks, cooling issues, and strange noises."
                },
                {
                  icon: CalendarCheck,
                  title: "Annual Maintenance",
                  description: "Preventative care to extend the life of your AC, improve air quality, and lower your energy bills."
                }
              ].map((service, i) => (
                <div key={i} className="group relative bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:border-primary/30">
                  <div className="size-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <service.icon className="size-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-24 bg-muted/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold font-['Outfit'] mb-6">Why trust Cooling Tower with your comfort?</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                With over a decade of experience, we've built a reputation for excellence, transparency, and unmatched technical expertise. We don't just fix ACs; we optimize your indoor climate.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "Licensed & Insured Technicians" },
                  { icon: Clock, text: "On-Time Guarantee" },
                  { icon: CheckCircle2, text: "Upfront, Transparent Pricing" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <item.icon className="size-3.5" />
                    </div>
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200" 
                  alt="Technician working on AC"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl border border-border shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-primary">4.9</div>
                  <div>
                    <div className="flex text-yellow-400 text-sm mb-1">
                      ★★★★★
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Based on 500+ reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 text-white">
              <Fan className="size-5 text-primary" />
              <span className="text-lg font-bold font-['Outfit']">Cooling Tower</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Premium air conditioning services for your home and business. Stay cool, comfortable, and stress-free.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">AC Installation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">AC Repair</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Maintenance Plans</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Duct Cleaning</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/login" className="hover:text-primary transition-colors">Log In</a></li>
              <li><a href="/register" className="hover:text-primary transition-colors">Register</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Book Online</a></li>
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