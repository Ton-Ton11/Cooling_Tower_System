import { useState } from "react";
import {
    BarChart,
    Bar,
    CartesianGrid,
    LineChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import StatusBadge from "../../Components/StatusBadge";
import {
    ROLE_COLORS,
    formatCurrency,
    formatDateTime,
    getInitials,
} from "../../utils/superAdmin";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    team: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    activity: "M13 10V3L4 14h7v7l9-11h-7z",
};

export default function Dashboard({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("revenue"); // "revenue" | "pending" | "activity"

    const stats = dashboardData?.stats ?? {};
    const pendingBookings = dashboardData?.pending_bookings ?? [];
    const recentActivity = dashboardData?.recent_activity ?? [];
    const weeklyRevenue = dashboardData?.weekly_revenue ?? [];

    const weekRevenueTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.revenue ?? 0),
        0,
    );
    const weekBookingTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.bookings ?? 0),
        0,
    );

    // Realistic Super Admin To-do items
    const superAdminToDos = [
        {
            id: 1,
            title: "Review & resolve pending bookings",
            sub: `${stats.pending_bookings ?? 0} bookings awaiting approval or field assignment`,
            target: "bookings",
            badge: "Bookings",
        },
        {
            id: 2,
            title: "Audit staff access & role permissions",
            sub: `${stats.active_staff ?? 0} active employees on platform`,
            target: "staff",
            badge: "Security",
        },
        {
            id: 3,
            title: "Check warehouse inventory reorder status",
            sub: `${stats.low_stock_items ?? 0} items at or below critical stock levels`,
            target: "materials",
            badge: "Inventory",
        },
        {
            id: 4,
            title: "Review monthly revenue reports & transactions",
            sub: `Current monthly collections: ${formatCurrency(stats.paid_revenue_this_month ?? 0)}`,
            target: "sales",
            badge: "Finance",
        },
    ];

    const activeStaffUsers = [
        { id: 1, name: "Toni Admin", role: "Super Admin" },
        { id: 2, name: "Mark Anthony", role: "Head Tech" },
        { id: 3, name: "Maria Santos", role: "Admin Assistant" },
        { id: 4, name: "Angelo Cruz", role: "Senior Tech" },
        { id: 5, name: "Leo Bautista", role: "Tools Man" },
        { id: 6, name: "Roberto Ramos", role: "Manager" },
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

                    {/* SECTION 1: HERO SYSTEM BANNER */}
                    <div className="bg-gradient-to-r from-[#0E1A33] via-[#162D59] to-[#0A152B] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Super Admin System Command</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                    System Command & Enterprise Governance
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                                    Live governance across client bookings, inventory levels, role-based staff accounts, security audit trails, and revenue performance.
                                </p>

                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-[11px] text-slate-300">
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        {stats.active_staff ?? 0} Staff
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        {stats.pending_bookings ?? 0} Pending
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        {stats.available_ac_units ?? 0} AC Units
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg font-bold text-emerald-300">
                                        {formatCurrency(stats.paid_revenue_this_month ?? 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <span>Open Bookings Manager</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("staff")}
                                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold border border-white/10 transition flex items-center justify-center gap-2"
                                >
                                    <span>Staff & Access Control</span>
                                </button>
                            </div>
                        </div>

                        {/* Carousel / Indicator Dots */}
                        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-white/10">
                            <span className="w-6 h-1.5 rounded-full bg-blue-400" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <span className="text-[10px] text-slate-300 ml-2 font-medium">
                                Enterprise security policies & audit engine active
                            </span>
                        </div>
                    </div>

                    {/* SECTION 2: TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("revenue")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm ${
                                    activeTab === "revenue"
                                        ? "bg-[#0E1A33] text-white shadow-blue-900/20"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                Revenue & Trends
                            </button>
                            <button
                                onClick={() => setActiveTab("pending")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                    activeTab === "pending"
                                        ? "bg-[#0E1A33] text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                Pending Bookings ({pendingBookings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("activity")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                    activeTab === "activity"
                                        ? "bg-[#0E1A33] text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                Audit Trail ({recentActivity.length})
                            </button>
                        </div>

                        <button
                            onClick={onRefresh}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition self-end sm:self-auto"
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {/* SECTION 3: TAB CONTENT PANELS */}
                    {activeTab === "revenue" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                                        Financial Metrics
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Weekly Revenue & Booking Volume
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500">7-Day Gross</span>
                                    <p className="text-lg font-black text-emerald-600">
                                        {formatCurrency(weekRevenueTotal)}
                                    </p>
                                </div>
                            </div>

                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#94A3B8" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `₱${Math.round(Number(val) / 1000)}k`}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [
                                                name === "revenue" ? formatCurrency(value) : value,
                                                name === "revenue" ? "Revenue" : "Paid Bookings",
                                            ]}
                                        />
                                        <Bar dataKey="revenue" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center">
                                <div className="p-3.5 rounded-2xl bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Paid Bookings (7d)</p>
                                    <p className="text-xl font-black text-[#0E1A33] mt-0.5">{weekBookingTotal}</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Monthly Revenue</p>
                                    <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(stats.paid_revenue_this_month ?? 0)}</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Active Staff</p>
                                    <p className="text-xl font-black text-blue-600 mt-0.5">{stats.active_staff ?? 0} Users</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "pending" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                                        Waiting Action
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Pending Customer Service Requests
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <span>Open Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {pendingBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                    <p className="text-sm font-bold text-slate-800">No pending bookings waiting for action</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="py-3 px-3">Booking</th>
                                                <th className="py-3 px-3">Client</th>
                                                <th className="py-3 px-3">Service</th>
                                                <th className="py-3 px-3">Scheduled</th>
                                                <th className="py-3 px-3">Technician</th>
                                                <th className="py-3 px-3">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {pendingBookings.map((b) => (
                                                <tr key={b.booking_id} className="hover:bg-slate-50/70 transition">
                                                    <td className="py-3 px-3 font-bold text-blue-600">
                                                        #{b.booking_id}
                                                    </td>
                                                    <td className="py-3 px-3 font-semibold text-slate-900">
                                                        {b.client_name}
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-600">
                                                        {b.service}
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-500">
                                                        {formatDateTime(b.scheduled_date)}
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-600">
                                                        {b.assigned_tech_name || "Unassigned"}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <button
                                                            onClick={() => onNavigate("bookings")}
                                                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition"
                                                        >
                                                            Dispatch &rarr;
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "activity" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                                        System Trail
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Recent Audit & Governance Logs
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("logs")}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <span>All Logs</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {recentActivity.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                    <p className="text-sm font-bold text-slate-800">No recent activity logged</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentActivity.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex items-start gap-3.5"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                                {getInitials(entry.user_name)}
                                            </div>
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {entry.user_name}
                                                    </span>
                                                    <span
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                        style={{
                                                            background: `${ROLE_COLORS[entry.role] || "#8A93A6"}18`,
                                                            color: ROLE_COLORS[entry.role] || "#8A93A6",
                                                        }}
                                                    >
                                                        {entry.role}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {entry.action_type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    {entry.description}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {formatDateTime(entry.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                title="Add task"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {superAdminToDos.map((todo) => (
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
                                Governance
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="inline-block px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold">
                                Next Sunday &bull; Database & Security Backup
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900">
                                        Automated Snapshot & Backup Run
                                    </h4>
                                    <StatusBadge status="Scheduled" />
                                </div>
                                <p className="text-[11px] text-slate-600">
                                    Routine automated integrity check across customers, service logs, and payment ledger.
                                </p>
                                <button
                                    onClick={() => onNavigate("logs")}
                                    className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                >
                                    <span>System Logs & Security</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </div>
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
                            <div
                                onClick={() => onNavigate("announcements")}
                                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition cursor-pointer group space-y-1"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                                        System-Wide Maintenance Advisory
                                    </h4>
                                    <span className="text-[10px] text-slate-400">Notice</span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Total active notices published across all panels: {stats.announcements ?? 0}. Click to manage broadcasts.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 4: ACTIVE ENTERPRISE STAFF */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.team} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-extrabold text-[#0E1A33]">Active System Staff</h3>
                            </div>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {stats.active_staff ?? 6} Active
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {activeStaffUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] ring-2 ring-emerald-500 ring-offset-2">
                                            {user.name.split(" ").map((n) => n[0]).join("")}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                            {user.role}
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
