import { Link } from '@inertiajs/react';
import logo from '../../imports/cooling_tower_airconditioning_services_logo-1.jpg';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F4F7FB] px-4 py-10 font-sans text-[#172B4D] selection:bg-[#2563EB] selection:text-white overflow-hidden">
            <div className="relative z-10 mb-6 flex flex-col items-center">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="size-12 rounded-full bg-white p-0.5 shadow-sm border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                        <img
                            src={logo}
                            alt="Cooling Tower Logo"
                            className="w-full h-full object-contain rounded-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold font-display tracking-tight text-[#10213F] leading-none">
                            Cooling Tower
                        </span>
                        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#2563EB] mt-1">
                            Airconditioning Services
                        </span>
                    </div>
                </Link>
            </div>

            <div className="relative z-10 w-full sm:max-w-md bg-white px-7 py-8 sm:px-9 sm:py-9 shadow-sm border border-[#E2E8F0] rounded-xl">
                {children}
            </div>
        </div>
    );
}
