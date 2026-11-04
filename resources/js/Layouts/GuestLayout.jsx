import { Link } from '@inertiajs/react';
import logo from '../../imports/cooling_tower_airconditioning_services_logo-1.jpg';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 font-sans text-slate-900 selection:bg-blue-600 selection:text-white overflow-hidden">
            {/* Subtle ambient background accents matching the logo palette */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative z-10 mb-6 flex flex-col items-center">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="size-12 rounded-full bg-white p-0.5 shadow-md shadow-[#14224A]/15 ring-2 ring-[#14224A]/10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                        <img
                            src={logo}
                            alt="Cooling Tower Logo"
                            className="w-full h-full object-contain rounded-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-extrabold font-display tracking-tight text-[#14224A] leading-none">
                            Cooling Tower
                        </span>
                        <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-600 mt-1">
                            Airconditioning Services
                        </span>
                    </div>
                </Link>
            </div>

            <div className="relative z-10 w-full sm:max-w-md bg-white px-7 py-8 sm:px-9 sm:py-9 shadow-xl shadow-[#14224A]/5 border border-slate-200/80 rounded-3xl">
                {children}
            </div>
        </div>
    );
}
