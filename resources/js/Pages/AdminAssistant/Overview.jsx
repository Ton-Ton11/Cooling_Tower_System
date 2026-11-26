import { useState } from "react";
import {
    AreaChart,
    Area,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import StatusBadge from "../../Components/StatusBadge";
import ActiveStaffWidget from "../../Components/ActiveStaffWidget";
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
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    ac: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
};

export default function AdminAssistantDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("finance"); // "finance" | "sales" | "inventory"

    const stats = dashboardData?.stats ?? {};
    const weeklyRevenue = dashboardData?.weekly_revenue ?? [];
    const announcements = dashboardData?.announcements ?? [];
    const recentSales = dashboardData?.recent_sales ?? [];

    const weekRevenueTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.revenue ?? 0),
        0,
    );

    // Realistic Admin Assistant To-do items
    const adminToDos = [
        {
            id: 1,
            title: "Reconcile booking reservation payments",
            sub: "Verify GCash and Bank transfers against recorded invoices",
            target: "sales",
            badge: "Finance",
        },
        {
            id: 2,
            title: "Audit technician accounts & status",
            sub: `${stats.active_staff ?? 0} active personnel on staff register`,
            target: "staff",
            badge: "Staff",
        },
        {
            id: 3,
            title: "Check AC Units warehouse stock levels",
            sub: `${stats.available_ac_units ?? 0} units available out of ${stats.total_ac_units ?? 0}`,
            target: "acunits",
            badge: "Inventory",
        },
        {
            id: 4,
            title: "Broadcast administrative bulletin",
            sub: "Post updates regarding company schedules or billing dates",
            target: "announcements",
            badge: "Notice",
        },
        {
            id: 5,
            title: "Manage For Sale catalog & pricing",
            sub: "Review retail merchandise, set profit margins, and update stock",
            target: "materials",
            badge: "Catalog",
        },
    ];

    const staffMembers = [
        { id: 1, name: "Maria Santos", role: "Admin Assistant" },
        { id: 2, name: "Grace Fernandez", role: "Accountant" },
        { id: 3, name: "Mark Anthony", role: "Head Tech" },
        { id: 4, name: "Angelo Cruz", role: "Senior Tech" },
        { id: 5, name: "Leo Bautista", role: "Warehouse Lead" },
        { id: 6, name: "Toni Admin", role: "Super Admin" },
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
                    <div className="ct-hero-banner rounded-2xl p-6 sm:p-8 text-white border border-[#1E3A6D] relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#EAF2FF] text-[11px] font-semibold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                                    <span>Administrative & Records Center</span>
                                </div>
                                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                                    Administrative & Financial Records Hub
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                    Oversee staff accounts, manage air conditioning unit inventories, reconcile customer transactions, and publish official memos.
                                </p>

                                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-200">
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.active_staff ?? 0} Staff Personnel
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.available_ac_units ?? 0} AC Units Ready
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg font-semibold text-white">
                                        {formatCurrency(stats.paid_revenue_this_month ?? 0)} Paid This Month
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("staff")}
                                    className="px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
                                >
                                    <span>Manage Staff Directory</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("sales")}
                                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>View Sales & Invoices</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("finance")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "finance"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Revenue Trends (7 Days)
                            </button>
                            <button
                                onClick={() => setActiveTab("sales")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "sales"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Recent Payments ({recentSales.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("inventory")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "inventory"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                AC Inventory Summary
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
                    {activeTab === "finance" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                        Financial Velocity
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Past 7 Days Collected Revenue
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-[#64748B]">7-Day Total</span>
                                    <p className="text-base font-bold text-[#16A34A]">
                                        {formatCurrency(weekRevenueTotal)}
                                    </p>
                                </div>
                            </div>

                            <div className="h-64 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="adminRevenueGrad2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                        />
                                        <Tooltip formatter={(value) => [formatCurrency(value), "Revenue"]} />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#2563EB"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#adminRevenueGrad2)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E2E8F0] text-center">
                                <div className="p-3 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Paid Revenue (This Month)</p>
                                    <p className="text-xl font-bold text-[#16A34A] mt-0.5">
                                        {formatCurrency(stats.paid_revenue_this_month ?? 0)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Tracked AC Units</p>
                                    <p className="text-xl font-bold text-[#10213F] mt-0.5">
                                        {stats.available_ac_units ?? 0} / {stats.total_ac_units ?? 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "sales" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#16A34A] uppercase tracking-wider">
                                        Recent Transactions
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Customer Invoices & Payments
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("sales")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>All Records</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {recentSales.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#F4F7FB] border border-dashed border-[#E2E8F0]">
                                    <p className="text-sm font-semibold text-[#172B4D]">No payment records logged yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentSales.map((s) => (
                                        <div
                                            key={s.payment_id}
                                            className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] flex items-center justify-between gap-4"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-[#172B4D]">
                                                        {s.client_name}
                                                    </h3>
                                                    <StatusBadge status="Paid" />
                                                </div>
                                                <p className="text-xs text-[#64748B]">
                                                    Booking #{s.booking_id} &bull; {s.service_type || "Aircon Service"} &bull; {s.payment_method || "Cash/Online"}
                                                </p>
                                                <p className="text-[11px] text-[#64748B]">
                                                    {s.payment_date ? formatDateTime(s.payment_date) : "Recent"}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-base font-bold text-[#10213F]">
                                                    {formatCurrency(s.amount_paid)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "inventory" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                        Units Status
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        AC Units Warehouse Inventory
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("acunits")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>Manage Units</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#BBF7D0] space-y-1">
                                    <span className="text-xs font-semibold text-[#15803D]">Available Units</span>
                                    <p className="text-2xl font-bold text-[#15803D]">{stats.available_ac_units ?? 0}</p>
                                    <p className="text-[11px] text-[#15803D]">Ready for install or delivery</p>
                                </div>

                                <div className="p-4 rounded-xl bg-[#EAF2FF] border border-[#C7DDFD] space-y-1">
                                    <span className="text-xs font-semibold text-[#2563EB]">Total Catalog</span>
                                    <p className="text-2xl font-bold text-[#10213F]">{stats.total_ac_units ?? 0}</p>
                                    <p className="text-[11px] text-[#64748B]">Total registered in database</p>
                                </div>

                                <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-1 flex flex-col justify-center">
                                    <button
                                        onClick={() => onNavigate("acunits")}
                                        className="w-full py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition"
                                    >
                                        + Add New AC Unit
                                    </button>
                                </div>
                            </div>
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
                                onClick={() => onNavigate("staff")}
                                className="w-7 h-7 rounded-lg bg-[#F4F7FB] hover:bg-[#EAF2FF] text-[#64748B] hover:text-[#2563EB] border border-[#E2E8F0] flex items-center justify-center transition font-semibold"
                                title="Add task"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {adminToDos.map((todo) => (
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
                                Schedule
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="inline-block px-3 py-1 rounded-full bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] text-[11px] font-semibold">
                                End of Month &bull; Financial Closeout
                            </div>

                            <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-[#172B4D]">
                                        Monthly Revenue & Tax Audit
                                    </h4>
                                    <StatusBadge status="Pending" />
                                </div>
                                <p className="text-[11px] text-[#64748B]">
                                    Review all booking invoices, reservation downpayments, and supplier expenses.
                                </p>
                                <button
                                    onClick={() => onNavigate("sales")}
                                    className="w-full mt-2 py-2 rounded-lg bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] text-[#172B4D] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                >
                                    <span>Open Sales Log</span>
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
                            {announcements.length > 0 ? (
                                announcements.slice(0, 3).map((a) => (
                                    <div
                                        key={a.id}
                                        onClick={() => onNavigate("announcements")}
                                        className="p-3.5 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] transition cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold text-[#172B4D] group-hover:text-[#2563EB] transition line-clamp-1">
                                                {a.title}
                                            </h4>
                                            <span className="text-[10px] text-[#64748B] shrink-0">
                                                {a.created_at ? formatDateTime(a.created_at).split("•")[0] : "Recent"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1">
                                            {a.message}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-1">
                                    <p className="text-xs font-semibold text-[#172B4D]">Admin Office Bulletin</p>
                                    <p className="text-[11px] text-[#64748B]">
                                        Please ensure all employee leave requests and overtime sheets are submitted by Friday 5:00 PM.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WIDGET 4: ACTIVE STAFF ON-DUTY */}
                    <ActiveStaffWidget
                        initialStaff={dashboardData?.active_staff_users}
                        isSuperAdmin={false}
                        title="Active Staff"
                    />

                </div>

            </div>
        </div>
    );
}
