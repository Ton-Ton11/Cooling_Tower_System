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
import ActiveStaffWidget from "../../Components/ActiveStaffWidget";
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
            id: "reports_todo",
            title: "Review Customer Problem Reports & Support Chat",
            sub: `${stats.pending_reports ?? 0} pending customer problem reports & ${stats.unread_customer_chat ?? 0} unread messages`,
            target: "reports",
            badge: "Reports",
        },
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
        {
            id: 5,
            title: "Review tool checklists & dispatch requests",
            sub: `${stats.pending_checklists ?? 0} checklists awaiting verification or dispatch`,
            target: "checklists",
            badge: "Dispatches",
        },
    ];

    const activeStaffUsers = dashboardData?.active_staff_users ?? [
        { id: 1, name: "Toni Admin", role: "Super Admin" },
        { id: 2, name: "Roberto Ramos", role: "Manager" },
        { id: 3, name: "Maria Santos", role: "Admin Assistant" },
        { id: 4, name: "Leo Bautista", role: "Tools Man" },
        { id: 5, name: "Mark Anthony", role: "Head Tech" },
        { id: 6, name: "Angelo Cruz", role: "Technician" },
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
                    <div className="ct-hero-banner rounded-2xl p-6 sm:p-8 text-white border border-[#1E3A6D] relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#EAF2FF] text-[11px] font-semibold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                                    <span>Super Admin System Command</span>
                                </div>
                                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                                    System Command & Enterprise Governance
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                    Live governance across client bookings, inventory levels, role-based staff accounts, security audit trails, and revenue performance.
                                </p>

                                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-200">
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.active_staff ?? 0} Staff
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.pending_bookings ?? 0} Pending
                                    </span>
                                    {Number(stats.pending_checklists ?? 0) > 0 && (
                                        <button
                                            onClick={() => onNavigate("checklists")}
                                            className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                                            {stats.pending_checklists} Checklists Pending
                                        </button>
                                    )}
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.available_ac_units ?? 0} AC Units
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg font-semibold text-white">
                                        {formatCurrency(stats.paid_revenue_this_month ?? 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
                                >
                                    <span>Open Bookings Manager</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("staff")}
                                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>Staff & Access Control</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("revenue")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "revenue"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Revenue & Trends
                            </button>
                            <button
                                onClick={() => setActiveTab("pending")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "pending"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Pending Bookings ({pendingBookings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("activity")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "activity"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Audit Trail ({recentActivity.length})
                            </button>
                        </div>

                        <button
                            onClick={onRefresh}
                            className="px-3 py-1.5 text-xs font-semibold text-[#172B4D] bg-[#F4F7FB] hover:bg-[#EAF2FF] rounded-lg border border-[#E2E8F0] transition self-end sm:self-auto"
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {/* SECTION 3: TAB CONTENT PANELS */}
                    {activeTab === "revenue" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                        Financial Metrics
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Weekly Revenue & Booking Volume
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-[#64748B]">7-Day Gross</span>
                                    <p className="text-lg font-bold text-[#16A34A]">
                                        {formatCurrency(weekRevenueTotal)}
                                    </p>
                                </div>
                            </div>

                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#64748B" }}
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
                                        <Bar dataKey="revenue" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-center">
                                <div className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Paid Bookings (7d)</p>
                                    <p className="text-xl font-bold text-[#10213F] mt-0.5">{weekBookingTotal}</p>
                                </div>
                                <div className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Monthly Revenue</p>
                                    <p className="text-xl font-bold text-[#16A34A] mt-0.5">{formatCurrency(stats.paid_revenue_this_month ?? 0)}</p>
                                </div>
                                <div className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Active Staff</p>
                                    <p className="text-xl font-bold text-[#2563EB] mt-0.5">{stats.active_staff ?? 0} Users</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "pending" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider">
                                        Waiting Action
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Pending Customer Service Requests
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>Open Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {pendingBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#F4F7FB] border border-dashed border-[#E2E8F0]">
                                    <p className="text-sm font-semibold text-[#172B4D]">No pending bookings waiting for action</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#E2E8F0] bg-[#F4F7FB] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                                                <th className="py-3 px-3">Booking</th>
                                                <th className="py-3 px-3">Client</th>
                                                <th className="py-3 px-3">Service</th>
                                                <th className="py-3 px-3">Scheduled</th>
                                                <th className="py-3 px-3">Technician</th>
                                                <th className="py-3 px-3 sticky-action-col text-right" style={{ position: "sticky", right: 0, zIndex: 10, background: "#F4F7FB" }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E2E8F0] text-xs">
                                            {pendingBookings.map((b) => (
                                                <tr key={b.booking_id} className="hover:bg-[#F4F7FB] transition">
                                                    <td className="py-3 px-3 font-semibold text-[#2563EB]">
                                                        #{b.booking_id}
                                                    </td>
                                                    <td className="py-3 px-3 font-semibold text-[#172B4D]">
                                                        {b.client_name}
                                                    </td>
                                                    <td className="py-3 px-3 text-[#64748B]">
                                                        {b.service}
                                                    </td>
                                                    <td className="py-3 px-3 text-[#64748B]">
                                                        {formatDateTime(b.scheduled_date)}
                                                    </td>
                                                    <td className="py-3 px-3 text-[#64748B]">
                                                        {b.assigned_tech_name || "Unassigned"}
                                                    </td>
                                                    <td className="py-3 px-3 sticky-action-col text-right" style={{ position: "sticky", right: 0, zIndex: 5, background: "#FFFFFF" }}>
                                                        <button
                                                            onClick={() => onNavigate("bookings")}
                                                            className="px-2.5 py-1 rounded-lg bg-[#EAF2FF] hover:bg-[#DBEAFE] text-[#2563EB] font-semibold text-[11px] transition"
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
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                        System Trail
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Recent Audit & Governance Logs
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("logs")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>All Logs</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {recentActivity.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#F4F7FB] border border-dashed border-[#E2E8F0]">
                                    <p className="text-sm font-semibold text-[#172B4D]">No recent activity logged</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentActivity.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] flex items-start gap-3.5"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                                                {getInitials(entry.user_name)}
                                            </div>
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-[#172B4D]">
                                                        {entry.user_name}
                                                    </span>
                                                    <span
                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                        style={{
                                                            background: `${ROLE_COLORS[entry.role] || "#64748B"}18`,
                                                            color: ROLE_COLORS[entry.role] || "#64748B",
                                                        }}
                                                    >
                                                        {entry.role}
                                                    </span>
                                                    <span className="text-[10px] text-[#64748B]">
                                                        {entry.action_type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#64748B] leading-relaxed">
                                                    {entry.description}
                                                </p>
                                                <p className="text-[10px] text-[#64748B]">
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
                    RIGHT COLUMN (4 COLS) - MODULAR WIDGETS
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">

                    {/* WIDGET 1: TO-DO */}
                    <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center border border-[#C7DDFD]">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                        <path d={icons.check} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-[#10213F]">To-do</h3>
                            </div>
                            <button
                                onClick={() => onNavigate("bookings")}
                                className="w-7 h-7 rounded-lg bg-[#F4F7FB] hover:bg-[#EAF2FF] text-[#64748B] hover:text-[#2563EB] border border-[#E2E8F0] flex items-center justify-center transition font-semibold"
                                title="Add task"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {superAdminToDos.map((todo) => (
                                <div
                                    key={todo.id}
                                    onClick={() => onNavigate(todo.target)}
                                    className="p-3.5 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] hover:border-[#C7DDFD] transition cursor-pointer flex items-center justify-between gap-3 group"
                                >
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD]">
                                                {todo.badge}
                                            </span>
                                            <p className="text-xs font-semibold text-[#172B4D] truncate group-hover:text-[#2563EB] transition">
                                                {todo.title}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-[#64748B] line-clamp-1">
                                            {todo.sub}
                                        </p>
                                    </div>
                                    <svg className="w-4 h-4 text-[#64748B] group-hover:text-[#2563EB] shrink-0 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.arrow} />
                                    </svg>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* WIDGET 2: UPCOMING */}
                    <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center border border-[#C7DDFD]">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.calendar} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-[#10213F]">Upcoming</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-2.5 py-1 rounded-lg">
                                Governance
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="inline-block px-3 py-1 rounded-full bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] text-[11px] font-semibold">
                                Next Sunday &bull; Database & Security Backup
                            </div>

                            <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-[#172B4D]">
                                        Automated Snapshot & Backup Run
                                    </h4>
                                    <StatusBadge status="Scheduled" />
                                </div>
                                <p className="text-[11px] text-[#64748B]">
                                    Routine automated integrity check across customers, service logs, and payment ledger.
                                </p>
                                <button
                                    onClick={() => onNavigate("logs")}
                                    className="w-full mt-2 py-2 rounded-lg bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] text-[#172B4D] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                >
                                    <span>System Logs & Security</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 3: ANNOUNCEMENTS */}
                    <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center border border-[#C7DDFD]">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.megaphone} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-[#10213F]">Announcements</h3>
                            </div>
                            <button
                                onClick={() => onNavigate("announcements")}
                                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                            >
                                Post Memo +
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div
                                onClick={() => onNavigate("announcements")}
                                className="p-3.5 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] transition cursor-pointer group space-y-1"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-semibold text-[#172B4D] group-hover:text-[#2563EB] transition">
                                        System-Wide Maintenance Advisory
                                    </h4>
                                    <span className="text-[10px] text-[#64748B]">Notice</span>
                                </div>
                                <p className="text-[11px] text-[#64748B]">
                                    Total active notices published across all panels: {stats.announcements ?? 0}. Click to manage broadcasts.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 4: ACTIVE ENTERPRISE STAFF */}
                    <ActiveStaffWidget
                        initialStaff={activeStaffUsers}
                        isSuperAdmin={true}
                        title="Active System Staff"
                    />

                </div>

            </div>
        </div>
    );
}
