import { useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { formatCurrency, formatDateTime } from "../../utils/superAdmin";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    tool: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
};

export default function CustomerOverview({ onNavigate, dashboardData, isLoading, onSelectServiceToBook }) {
    const [activeTab, setActiveTab] = useState("services"); // "services" | "requests"
    const [carouselIndex, setCarouselIndex] = useState(0);

    const stats = dashboardData?.stats ?? {};
    const recentBookings = dashboardData?.recent_bookings ?? [];
    const services = dashboardData?.services ?? [];
    const announcements = dashboardData?.announcements ?? [];
    const user = dashboardData?.user ?? {};
    const upcoming = dashboardData?.upcoming_appointment ?? null;
    const toDoItems = dashboardData?.to_do_items ?? [];
    const onlineTechnicians = dashboardData?.online_technicians ?? [
        { id: 1, name: "Mark Anthony", role: "Head Technician" },
        { id: 2, name: "Angelo Cruz", role: "Senior Technician" },
        { id: 3, name: "Crispin Diaz", role: "HVAC Specialist" },
        { id: 4, name: "Dexter A.", role: "Technician" },
        { id: 5, name: "Francis G.", role: "Technician" },
        { id: 6, name: "Ariel G.", role: "Technician" },
    ];

    const serviceVisuals = {
        "Installation": {
            badge: "Turnkey Setup",
            tagline: "Split, Inverter & Multi-Split",
            progressLabel: "100% Certified",
            bgGradient: "from-blue-600 via-indigo-600 to-sky-700",
            iconType: "install",
        },
        "Repair / Check-up": {
            badge: "Troubleshooting",
            tagline: "Water Leaks, Noise & No Cooling",
            progressLabel: "Rapid Diagnosis",
            bgGradient: "from-amber-600 via-orange-600 to-amber-700",
            iconType: "repair",
        },
        "Cleaning / Preventive Maintenance": {
            badge: "Regular Care",
            tagline: "Chemical Wash & Coil Sanitation",
            progressLabel: "Seasonal Wash",
            bgGradient: "from-emerald-600 via-teal-600 to-cyan-700",
            iconType: "cleaning",
        },
    };

    const renderServiceBadgeIcon = (type) => {
        if (type === "install") {
            return (
                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18m-18 0l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3" />
                </svg>
            );
        }
        if (type === "repair") {
            return (
                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
            );
        }
        return (
            <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* ══════════════════════════════════════════════════════════════════
                3-COLUMN ARCHITECTURE: MAIN CANVAS (8 COLS) + RIGHT WIDGETS (4 COLS)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ──────────────────────────────────────────────────────────────
                    LEFT / CENTER COLUMN (8 COLS)
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* SECTION 1: HERO CAROUSEL BANNER (LMS-STYLE PROMO / ADVISORY) */}
                    <div className="bg-gradient-to-r from-[#0E1A33] via-[#162D59] to-[#0A152B] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/5 relative overflow-hidden">
                        {/* Decorative background glow & shapes */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Cooling Tower Quality Assurance</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                    Certified Airconditioning Care for Home & Business
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                                    Schedule a certified technician in minutes. Transparent assessments, official quotations, and guaranteed appointment reservation.
                                </p>
                                
                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-[11px] text-slate-300">
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                        <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span>100% Workmanship Warranty</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                        <svg className="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>Direct Technician Dispatch</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                        <svg className="w-3.5 h-3.5 text-emerald-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <span>Itemized Quotation</span>
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("book")}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icons.plus} />
                                    </svg>
                                    <span>Book a Service Appointment</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>View My Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </div>

                        {/* Carousel Pagination Dots */}
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <span className="w-6 h-2 rounded-full bg-blue-500 transition-all cursor-pointer" />
                            <span className="w-2 h-2 rounded-full bg-white/20 transition-all cursor-pointer hover:bg-white/40" />
                            <span className="w-2 h-2 rounded-full bg-white/20 transition-all cursor-pointer hover:bg-white/40" />
                        </div>
                    </div>

                    {/* SECTION 2: COURSES / SERVICES SHOWCASE WITH FILTER PILLS */}
                    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 space-y-6">
                        {/* Header & Tabs */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Services & Service Requests</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Explore available cooling services or track your active service requests.</p>
                            </div>

                            {/* Filter Pills (STI LMS Style: Enrolled 11 / Completed 52) */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setActiveTab("services")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "services"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <span>Core Services</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "services" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                        {services.length || 3}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("requests")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "requests"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <span>Recent Requests</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "requests" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                        {recentBookings.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: CORE SERVICES GRID (LMS CARD DESIGN) */}
                        {activeTab === "services" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {services.map((srv) => {
                                    const meta = serviceVisuals[srv.service_name] || {
                                        badge: "Certified",
                                        tagline: "HVAC Engineering",
                                        progressLabel: "100% Quality",
                                        bgGradient: "from-blue-600 to-indigo-600",
                                        iconType: "install",
                                    };

                                    return (
                                        <div
                                            key={srv.service_id}
                                            className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                                        >
                                            {/* Card Visual Header Banner */}
                                            <div className={`p-4 bg-gradient-to-r ${meta.bgGradient} text-white flex items-center justify-between`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                                                        {renderServiceBadgeIcon(meta.iconType)}
                                                    </span>
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                                                        {meta.badge}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-white/80 font-medium">Official Quotation</span>
                                            </div>

                                            {/* Body */}
                                            <div className="p-5 space-y-3 flex-1">
                                                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                                                    {srv.service_name}
                                                </h3>
                                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                                                    {srv.description}
                                                </p>
                                                <div className="text-[11px] text-blue-800 font-semibold bg-blue-50/70 p-2.5 rounded-xl border border-blue-100/60">
                                                    Scope: {meta.tagline}
                                                </div>
                                            </div>

                                            {/* Bottom Card Footer with Circular Badge & Action Button */}
                                            <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                    <span className="text-[11px] text-slate-600">{meta.progressLabel}</span>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        if (onSelectServiceToBook) onSelectServiceToBook(srv.service_id);
                                                        onNavigate("book");
                                                    }}
                                                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
                                                >
                                                    <span>Request</span>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icons.arrow} />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* TAB 2: RECENT REQUESTS LIST */}
                        {activeTab === "requests" && (
                            <div className="space-y-3">
                                {recentBookings.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                                        <p>You have not submitted any service requests yet.</p>
                                        <button
                                            onClick={() => onNavigate("book")}
                                            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-sm"
                                        >
                                            Schedule a Service Now
                                        </button>
                                    </div>
                                ) : (
                                    recentBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                                                    #{b.booking_id}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm font-bold text-slate-900">{b.service_name}</h4>
                                                        <StatusBadge status={b.booking_status} />
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                            Quotation: {b.quotation_status || "Pending Assessment"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                                        <span>Scheduled: <strong>{b.scheduled_date_formatted || "To Be Confirmed"}</strong></span>
                                                        <span>•</span>
                                                        <span>Tech: {b.assigned_tech_name || "Awaiting Assignment"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("bookings")}
                                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-xs font-bold text-slate-700 transition shrink-0 self-start sm:self-auto"
                                            >
                                                View Booking &rarr;
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: HVAC HEALTH & MAINTENANCE TIPS BANNER */}
                    <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-2xl p-5 border border-blue-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-blue-200/60 flex items-center justify-center shrink-0 text-amber-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div className="space-y-1 text-xs">
                            <h4 className="font-extrabold text-blue-950">Technician Maintenance Tip: Keep Your Unit Efficient</h4>
                            <p className="text-slate-600 leading-relaxed">
                                Cleaning your air filters every 2 to 4 weeks improves airflow by up to 15% and reduces electricity bills. Book a deep chemical wash every 3 to 6 months to prevent indoor coil freeze-ups and compressor wear.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    RIGHT WIDGET PANEL (4 COLS) - MODULAR WHITE CARDS
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-5">
                    
                    {/* WIDGET 1: TO-DO (STI LMS STYLE WITH + ACTION) */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                <h3 className="text-sm font-extrabold text-slate-900">To-do</h3>
                            </div>
                            <button
                                onClick={() => onNavigate("book")}
                                title="Add New Booking Request"
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 flex items-center justify-center text-xs font-extrabold transition"
                            >
                                +
                            </button>
                        </div>

                        {/* To-Do Items List */}
                        <div className="space-y-3">
                            {toDoItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onNavigate(item.target || "bookings")}
                                    className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 transition cursor-pointer flex items-start justify-between gap-3 group"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                                                {item.title}
                                            </h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 pl-3 leading-snug">{item.sub}</p>
                                    </div>
                                    <span className="text-slate-400 group-hover:text-blue-600 text-xs font-bold transition">
                                        &rarr;
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* WIDGET 2: UPCOMING APPOINTMENTS / MAINTENANCE */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.calendar} />
                            </svg>
                            <h3 className="text-sm font-extrabold text-slate-900">Upcoming</h3>
                        </div>

                        {upcoming ? (
                            <div className="space-y-3">
                                {/* Date Badge Pill (like Mon Sep 28 in the screenshot) */}
                                <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-between">
                                    <span>{upcoming.scheduled_date_formatted}</span>
                                    <span className="text-[10px] font-bold text-blue-700 uppercase">Confirmed</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs space-y-1.5">
                                    <span className="font-extrabold text-blue-900 block text-xs">{upcoming.service_name}</span>
                                    <p className="text-slate-600 text-[11px]">
                                        Assigned Tech: <strong>{upcoming.assigned_tech_name}</strong>
                                    </p>
                                    <button
                                        onClick={() => onNavigate("bookings")}
                                        className="text-[11px] font-bold text-blue-700 hover:underline pt-1 block"
                                    >
                                        View Schedule Details &rarr;
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 text-xs">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500">
                                    No active appointment scheduled for this week.
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-[11px] space-y-1">
                                    <span className="font-extrabold text-emerald-900 block">Quarterly Cleaning Cycle</span>
                                    <p className="text-emerald-700">Recommend booking your routine aircon check every 3 months.</p>
                                    <button
                                        onClick={() => onNavigate("book")}
                                        className="text-emerald-800 font-bold underline pt-0.5 block"
                                    >
                                        Reserve Maintenance &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* WIDGET 3: ANNOUNCEMENTS */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.megaphone} />
                                </svg>
                                <h3 className="text-sm font-extrabold text-slate-900">Announcements</h3>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">Official</span>
                        </div>

                        {announcements.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 italic">None at the moment.</p>
                        ) : (
                            <div className="space-y-3">
                                {announcements.slice(0, 3).map((a) => (
                                    <div key={a.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                                        <h4 className="font-bold text-slate-900">{a.title}</h4>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{a.message}</p>
                                        <span className="text-[10px] text-slate-400 block pt-1">{formatDateTime(a.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* WIDGET 4: CERTIFIED TECHNICIANS / ONLINE SUPPORT */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-sm font-extrabold text-slate-900">Online Technicians</h3>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold">On Duty</span>
                        </div>

                        {/* Avatars Grid (Matching the STI LMS Online Users Grid) */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            {onlineTechnicians.map((t) => {
                                const initials = t.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("");
                                return (
                                    <div key={t.id} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                                                {initials}
                                            </div>
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-800 truncate w-full">
                                            {t.name}
                                        </span>
                                        <span className="text-[9px] text-slate-400 truncate w-full">
                                            {t.role}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Dispatch Hotline Quick Action */}
                        <div className="pt-2 border-t border-slate-100">
                            <a
                                href="tel:09171234567"
                                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-200"
                            >
                                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.phone} />
                                </svg>
                                <span>Dispatch Hotline: 0917-123-4567</span>
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
