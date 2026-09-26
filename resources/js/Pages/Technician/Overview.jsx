import { useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { formatDateTime } from "../../utils/superAdmin";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    tool: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

export default function TechnicianDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("assigned"); // "assigned" | "completed"

    const stats = dashboardData?.stats ?? {};
    const assignedBookings = dashboardData?.assigned_bookings ?? [];
    const recentCompleted = dashboardData?.recent_completed ?? [];
    const announcements = dashboardData?.announcements ?? [];

    const nextJob = assignedBookings[0] || null;

    // Realistic technician to-do items
    const technicianToDos = [
        {
            id: 1,
            title: "Submit diagnostic findings for active jobs",
            sub: "Fill in checklist & upload refrigerant readings",
            target: "bookings",
            badge: "Checklist",
        },
        {
            id: 2,
            title: "Upload Before & After photo proof",
            sub: "Required for coil cleaning & parts replacement",
            target: "bookings",
            badge: "Proof",
        },
        {
            id: 3,
            title: "Reconcile borrowed gauges & power tools",
            sub: "Verify custody status with Tools Man warehouse",
            target: "tools",
            badge: "Equipment",
        },
        {
            id: 4,
            title: "Review customer service satisfaction rating",
            sub: `Current rating: ${stats.avg_rating ?? 5.0} ★ Average score`,
            target: "performance",
            badge: "Quality",
        },
    ];

    const teamMembers = [
        { id: 1, name: "Mark Anthony", role: "Head Tech" },
        { id: 2, name: "Angelo Cruz", role: "Senior Tech" },
        { id: 3, name: "Crispin Diaz", role: "Specialist" },
        { id: 4, name: "Dexter A.", role: "Technician" },
        { id: 5, name: "Francis G.", role: "Technician" },
        { id: 6, name: "Mario Lopez", role: "Field Dispatch" },
    ];

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
                    
                    {/* SECTION 1: HERO OPERATIONS BANNER */}
                    <div className="bg-gradient-to-r from-[#0E1A33] via-[#162D59] to-[#0A152B] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Field Operations Center</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                    Live Service Queue & Diagnostic Workstation
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                                    Access customer service orders, complete unit checklists, verify equipment custody, and record diagnostic results.
                                </p>
                                
                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-[11px] text-slate-300">
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        📋 {stats.assigned_bookings ?? 0} Assigned Jobs
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        ⚡ {stats.in_progress_bookings ?? 0} In-Progress
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        ★ {stats.avg_rating ?? 5.0} Rating
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <span>Open My Job Queue</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("tools")}
                                    className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>My Issued Tools</span>
                                </button>
                            </div>
                        </div>

                        {/* Carousel Pagination Dots */}
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <span className="w-6 h-2 rounded-full bg-blue-500 transition-all" />
                            <span className="w-2 h-2 rounded-full bg-white/20 transition-all" />
                            <span className="w-2 h-2 rounded-full bg-white/20 transition-all" />
                        </div>
                    </div>

                    {/* SECTION 2: JOB QUEUE WITH FILTER PILLS */}
                    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Assignments & Service Schedule</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Dispatched jobs, technical questionnaires, and customer appointments.</p>
                            </div>

                            {/* Filter Pills */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setActiveTab("assigned")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "assigned"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <span>Active Jobs</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "assigned" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                        {assignedBookings.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("completed")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "completed"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <span>Recently Serviced</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "completed" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                        {recentCompleted.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: ACTIVE JOBS */}
                        {activeTab === "assigned" && (
                            <div className="space-y-3">
                                {assignedBookings.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                                        <p>No active jobs currently assigned to your queue.</p>
                                        <button onClick={onRefresh} className="text-blue-600 font-bold hover:underline">
                                            Check for new dispatches ↻
                                        </button>
                                    </div>
                                ) : (
                                    assignedBookings.map((b) => (
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
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                            Client: {b.client_name || "Assigned Customer"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                                        <span>Arrival: <strong>{formatDateTime(b.scheduled_date)}</strong></span>
                                                        <span>•</span>
                                                        <span>Location: {b.client_address || "Customer Address On File"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("bookings")}
                                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shrink-0 shadow-sm flex items-center gap-1.5"
                                            >
                                                <span>Work on Job</span>
                                                <span>&rarr;</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 2: COMPLETED JOBS */}
                        {activeTab === "completed" && (
                            <div className="space-y-3">
                                {recentCompleted.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs">
                                        No finished service reports logged yet.
                                    </div>
                                ) : (
                                    recentCompleted.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-4"
                                        >
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">Job #{b.booking_id}: {b.service_name}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Completed on {formatDateTime(b.updated_at || b.scheduled_date)} • Client: {b.client_name}
                                                </p>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Completed ✓
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: SAFETY & WORKMANSHIP PROTOCOLS BANNER */}
                    <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 rounded-2xl p-5 border border-amber-200/80 flex items-start gap-4">
                        <span className="text-2xl p-2 rounded-xl bg-white shadow-sm border border-amber-100 shrink-0">
                            🛡️
                        </span>
                        <div className="space-y-1 text-xs">
                            <h4 className="font-extrabold text-amber-950">Field Safety & Customer Courtesy Protocol</h4>
                            <p className="text-amber-900/80 leading-relaxed">
                                Always wear safety goggles and insulated gloves when testing capacitors or high-pressure refrigerant lines. Lay down clean floor drop-cloths before commencing indoor coil chemical cleaning.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    RIGHT WIDGET PANEL (4 COLS)
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-5">
                    
                    {/* WIDGET 1: TO-DO */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                    ✓
                                </span>
                                <h3 className="text-sm font-extrabold text-slate-900">To-do</h3>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                                Tasks
                            </span>
                        </div>

                        <div className="space-y-3">
                            {technicianToDos.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onNavigate(item.target)}
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

                    {/* WIDGET 2: UPCOMING DISPATCHES */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.calendar} />
                            </svg>
                            <h3 className="text-sm font-extrabold text-slate-900">Upcoming Dispatch</h3>
                        </div>

                        {nextJob ? (
                            <div className="space-y-3">
                                <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-between">
                                    <span>{formatDateTime(nextJob.scheduled_date)}</span>
                                    <span className="text-[10px] font-bold text-blue-700 uppercase">Next Slot</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs space-y-1.5">
                                    <span className="font-extrabold text-blue-900 block text-xs">{nextJob.service_name}</span>
                                    <p className="text-slate-600 text-[11px]">
                                        Customer: <strong>{nextJob.client_name || "Valued Client"}</strong>
                                    </p>
                                    <p className="text-slate-500 text-[11px] truncate">
                                        📍 {nextJob.client_address || "Service Location"}
                                    </p>
                                    <button
                                        onClick={() => onNavigate("bookings")}
                                        className="text-[11px] font-bold text-blue-700 hover:underline pt-1 block"
                                    >
                                        View Job Details &rarr;
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500">
                                    All scheduled jobs for today have been attended to.
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
                            <span className="text-[11px] font-bold text-slate-400">Notices</span>
                        </div>

                        {announcements.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 italic">No memos posted.</p>
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

                    {/* WIDGET 4: FIELD TEAM & DISPATCH */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-sm font-extrabold text-slate-900">Field Team On-Duty</h3>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold">Active</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            {teamMembers.map((t) => {
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
                    </div>

                </div>
            </div>
        </div>
    );
}
