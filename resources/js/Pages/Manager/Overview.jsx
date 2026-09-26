import { useState } from "react";
import {
    BarChart,
    Bar,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import StatusBadge from "../../Components/StatusBadge";
import {
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    team: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    sparkle: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    booking: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function ManagerDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("pending"); // "pending" | "active" | "chart"

    const stats = dashboardData?.stats ?? {};
    const pendingBookings = dashboardData?.pending_bookings ?? [];
    const activeBookings = dashboardData?.active_bookings ?? [];
    const announcements = dashboardData?.announcements ?? [];
    const weeklyRevenue = dashboardData?.weekly_revenue ?? [];

    const weekRevenueTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.revenue ?? 0),
        0,
    );
    const weekBookingTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.bookings ?? 0),
        0,
    );

    const nextDispatch = activeBookings[0] || pendingBookings[0] || null;

    // Realistic Manager To-do items
    const managerToDos = [
        {
            id: 1,
            title: "Review & assign pending booking requests",
            sub: `${stats.pending_bookings ?? 0} customer requests awaiting field team assignment`,
            target: "bookings",
            badge: "Dispatch",
        },
        {
            id: 2,
            title: "Check weekly technician completion rates",
            sub: "Verify job sign-offs, customer feedback and ratings",
            target: "performance",
            badge: "Quality",
        },
        {
            id: 3,
            title: "Broadcast weather or operational advisories",
            sub: "Notify technicians of rainy conditions or high-demand alerts",
            target: "announcements",
            badge: "Bulletin",
        },
        {
            id: 4,
            title: "Evaluate weekly revenue and booking intake",
            sub: `${weekBookingTotal} service orders logged across last 7 days`,
            target: "performance",
            badge: "Revenue",
        },
    ];

    const onDutyStaff = [
        { id: 1, name: "Mark Anthony", role: "Head Tech", status: "Active" },
        { id: 2, name: "Angelo Cruz", role: "Senior Tech", status: "On Job" },
        { id: 3, name: "Crispin Diaz", role: "Specialist", status: "Active" },
        { id: 4, name: "Dexter A.", role: "Technician", status: "Active" },
        { id: 5, name: "Francis G.", role: "Technician", status: "Active" },
        { id: 6, name: "Mario Lopez", role: "Field Dispatch", status: "Active" },
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
                                    <span>Manager Operations Command</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                    Service Dispatching & Operations Hub
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                                    Monitor customer appointment requests, assign certified technician teams, inspect weekly job turnover, and publish company notices.
                                </p>

                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-[11px] text-slate-300">
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        ⚡ {stats.pending_bookings ?? 0} Pending Approvals
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        🛠️ {stats.active_bookings ?? 0} Active Dispatches
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        ✅ {stats.completed_bookings ?? 0} Completed
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        📢 {stats.announcements ?? 0} Memos
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <span>Dispatch & Assign Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("performance")}
                                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold border border-white/10 transition flex items-center justify-center gap-2"
                                >
                                    <span>Performance Analytics</span>
                                </button>
                            </div>
                        </div>

                        {/* Carousel / Indicator Dots */}
                        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-white/10">
                            <span className="w-6 h-1.5 rounded-full bg-blue-400" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <span className="text-[10px] text-slate-300 ml-2 font-medium">
                                Real-time dispatching synchronizer active
                            </span>
                        </div>
                    </div>

                    {/* SECTION 2: METRICS & TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("pending")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm ${
                                    activeTab === "pending"
                                        ? "bg-[#0E1A33] text-white shadow-blue-900/20"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                ⏳ Pending Bookings ({pendingBookings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("active")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                    activeTab === "active"
                                        ? "bg-[#0E1A33] text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                🚀 Active Dispatches ({activeBookings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("chart")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                    activeTab === "chart"
                                        ? "bg-[#0E1A33] text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                📊 Weekly Trends
                            </button>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                onClick={onRefresh}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition flex items-center gap-1"
                            >
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* SECTION 3: TAB CONTENT PANELS */}
                    {activeTab === "pending" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                                        Immediate Attention
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Pending Customer Service Requests
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <span>All Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {pendingBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                                        ✓
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">All caught up!</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        No pending bookings currently waiting for team assignment.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-2xl bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200/70 hover:border-blue-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    #{b.booking_id}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-sm font-bold text-slate-900">
                                                            {b.client_name}
                                                        </h3>
                                                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-800">
                                                            Pending Assignment
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">
                                                        {b.service} &bull; {b.ac_type || "Standard Split/Window"}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                            <path d={icons.calendar} />
                                                        </svg>
                                                        <span>Scheduled: {formatDateTime(b.scheduled_date)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                <button
                                                    onClick={() => onNavigate("bookings")}
                                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                                                >
                                                    <span>Assign Tech</span>
                                                    <span>&rarr;</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "active" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                                        On-Field Dispatch
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Active & Dispatched Service Work
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <span>Manage Jobs</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {activeBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                    <p className="text-sm font-bold text-slate-800">No active dispatches right now</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        Dispatched and in-progress field jobs will show up here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-bold text-slate-900">
                                                        #{b.booking_id} &bull; {b.client_name}
                                                    </h3>
                                                    <StatusBadge status={b.booking_status} />
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    {b.service} &bull; {b.address || "Client Location"}
                                                </p>
                                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                        <path d={icons.clock} />
                                                    </svg>
                                                    <span>Target Date: {formatDateTime(b.scheduled_date)}</span>
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("bookings")}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                                            >
                                                Inspect Details &rarr;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "chart" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div>
                                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                                    7-Day Volume
                                </span>
                                <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                    Weekly Booking Intake
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Total bookings and revenue generated across the past 7 days.
                                </p>
                            </div>

                            <div className="h-64 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="bookings" name="Bookings" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={42} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-center">
                                <div className="p-3 rounded-2xl bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Past 7 Days Bookings</p>
                                    <p className="text-xl font-black text-[#0E1A33] mt-0.5">{weekBookingTotal}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Estimated 7-Day Revenue</p>
                                    <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(weekRevenueTotal)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    RIGHT COLUMN (4 COLS) - 4 STI-STYLE MODULAR WIDGETS
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">

                    {/* WIDGET 1: TO-DO */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path d={icons.check} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-extrabold text-[#0E1A33]">To-do</h3>
                            </div>
                            <button
                                onClick={() => onNavigate("bookings")}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition font-bold"
                                title="Add task or view all"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {managerToDos.map((todo) => (
                                <div
                                    key={todo.id}
                                    onClick={() => onNavigate(todo.target)}
                                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 transition cursor-pointer flex items-center justify-between gap-3 group"
                                >
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100/80 text-blue-700">
                                                {todo.badge}
                                            </span>
                                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                                                {todo.title}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-1">
                                            {todo.sub}
                                        </p>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transform group-hover:translate-x-0.5 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.arrow} />
                                    </svg>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* WIDGET 2: UPCOMING */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.calendar} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-extrabold text-[#0E1A33]">Upcoming</h3>
                            </div>
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                Dispatches
                            </span>
                        </div>

                        {nextDispatch ? (
                            <div className="space-y-3">
                                <div className="inline-block px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold">
                                    {formatDateTime(nextDispatch.scheduled_date)}
                                </div>

                                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-900">
                                            {nextDispatch.service}
                                        </h4>
                                        <StatusBadge status={nextDispatch.booking_status} />
                                    </div>
                                    <p className="text-[11px] text-slate-600">
                                        Client: <span className="font-semibold text-slate-800">{nextDispatch.client_name}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Location: {nextDispatch.address || "Standard Client Site"}
                                    </p>
                                    <button
                                        onClick={() => onNavigate("bookings")}
                                        className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                    >
                                        <span>Dispatch Work Order</span>
                                        <span>&rarr;</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-400 text-xs">
                                No scheduled dispatches on the docket today.
                            </div>
                        )}
                    </div>

                    {/* WIDGET 3: ANNOUNCEMENTS */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.megaphone} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-extrabold text-[#0E1A33]">Announcements</h3>
                            </div>
                            <button
                                onClick={() => onNavigate("announcements")}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                            >
                                Post Memo +
                            </button>
                        </div>

                        <div className="space-y-3">
                            {announcements.length > 0 ? (
                                announcements.slice(0, 3).map((a) => (
                                    <div
                                        key={a.id}
                                        onClick={() => onNavigate("announcements")}
                                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                                                {a.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {a.created_at ? formatDateTime(a.created_at).split("•")[0] : "Recent"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                            {a.message}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                    <p className="text-xs font-bold text-slate-800">Field Operations Advisory</p>
                                    <p className="text-[11px] text-slate-500">
                                        Please ensure all technicians log digital check-in times upon arriving at the customer site.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WIDGET 4: ON-DUTY TEAM / ONLINE TECHNICIANS */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.team} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-extrabold text-[#0E1A33]">Field Team On-Duty</h3>
                            </div>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                6 Active
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {onDutyStaff.map((tech) => (
                                <div
                                    key={tech.id}
                                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] ring-2 ring-emerald-500 ring-offset-2">
                                            {tech.name.split(" ").map((n) => n[0]).join("")}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {tech.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                            {tech.role}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
