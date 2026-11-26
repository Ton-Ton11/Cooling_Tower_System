import { useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import ActiveStaffWidget from "../../Components/ActiveStaffWidget";
import { formatDateTime } from "../../utils/superAdmin";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    team: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    tool: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

const ToolSvg = ({ className = "w-5 h-5", strokeWidth = 2 }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={icons.tool} />
    </svg>
);
const BoxSvg = ({ className = "w-5 h-5", strokeWidth = 2 }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={icons.box} />
    </svg>
);

export default function ToolsManDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("recent"); // "recent" | "lowstock" | "categories"
    const [widgetTab, setWidgetTab] = useState("custody"); // "custody" | "staff"

    const stats = dashboardData?.stats ?? {};
    const recentItems = dashboardData?.recent_items ?? [];
    const lowStockItems = dashboardData?.low_stock_items ?? [];
    const announcements = dashboardData?.announcements ?? [];

    // Realistic Tools Man To-do items
    const toolsToDos = [
        {
            id: 1,
            title: "Inspect returned power tools & gauges",
            sub: "Check pressure gauges, vacuum pumps, and manifold kits for wear",
            target: "materials",
            badge: "Check-in",
        },
        {
            id: 2,
            title: "Reorder low stock consumables",
            sub: `${stats.low_stock_items ?? 0} items currently at or below minimum threshold`,
            target: "materials",
            badge: "Restock",
        },
        {
            id: 3,
            title: "Safety check & calibration cycle",
            sub: "Verify refrigerant leak detectors and multimeters",
            target: "materials",
            badge: "Safety",
        },
        {
            id: 4,
            title: "Verify technician active tool custody",
            sub: "Ensure all tools issued for today's field jobs are accounted for",
            target: "materials",
            badge: "Custody",
        },
    ];

    const techniciansWithCustody = [
        { id: 1, name: "Mark Anthony", role: "Head Tech", itemsCount: 4 },
        { id: 2, name: "Angelo Cruz", role: "Senior Tech", itemsCount: 3 },
        { id: 3, name: "Crispin Diaz", role: "Specialist", itemsCount: 2 },
        { id: 4, name: "Dexter A.", role: "Technician", itemsCount: 2 },
        { id: 5, name: "Francis G.", role: "Technician", itemsCount: 1 },
        { id: 6, name: "Mario Lopez", role: "Field Dispatch", itemsCount: 2 },
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
                                    <span>Warehouse Supply & Custody Hub</span>
                                </div>
                                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                                    Tools & Materials Inventory Center
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                    Monitor tool checkouts, supervise inventory stocks, flag replenishment orders, and inspect returned equipment after customer dispatches.
                                </p>

                                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-200">
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.total_items ?? 0} Total Items
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.total_tools ?? 0} Tools In Stock
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.total_materials ?? 0} Materials
                                    </span>
                                    {(stats.low_stock_items ?? 0) > 0 && (
                                        <span className="flex items-center gap-1 bg-red-500/25 border border-red-400/40 text-red-100 px-2.5 py-1 rounded-lg font-semibold">
                                            {stats.low_stock_items} Low Stock
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
                                >
                                    <span>Open Supply Inventory</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("announcements")}
                                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>Post Supply Bulletin</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("recent")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "recent"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Recently Updated ({recentItems.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("lowstock")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "lowstock"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Low Stock Alerts ({stats.low_stock_items ?? 0})
                            </button>
                            <button
                                onClick={() => setActiveTab("categories")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "categories"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Categories Breakdown
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
                    {activeTab === "recent" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                        Warehouse Activity
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Recently Updated Inventory Items
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>Full Inventory</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {recentItems.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#F4F7FB] border border-dashed border-[#E2E8F0]">
                                    <p className="text-sm font-semibold text-[#172B4D]">No items updated recently</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentItems.map((item) => (
                                        <div
                                            key={item.item_id}
                                            className="p-4 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] hover:border-[#C7DDFD] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] flex items-center justify-center font-semibold text-base shrink-0">
                                                    {item.item_type === "Tool" ? <ToolSvg className="w-5 h-5" /> : <BoxSvg className="w-5 h-5" />}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-semibold text-[#172B4D]">
                                                            {item.item_name}
                                                        </h3>
                                                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD]">
                                                            {item.item_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#64748B]">
                                                        Reorder Threshold: {item.reorder_level} {item.unit}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 self-end sm:self-auto">
                                                <div className="text-right">
                                                    <p className={`text-base font-bold ${item.low_stock ? "text-[#DC2626]" : "text-[#10213F]"}`}>
                                                        {item.quantity_on_hand} {item.unit}
                                                    </p>
                                                    <StatusBadge status={item.low_stock ? "Low Stock" : "Available"} />
                                                </div>
                                                <button
                                                    onClick={() => onNavigate("materials")}
                                                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] text-xs font-semibold text-[#172B4D] transition"
                                                >
                                                    Edit Stock &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "lowstock" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wider">
                                        Immediate Action Required
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Low Stock & Reorder Warnings
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="px-4 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold shadow-xs transition"
                                >
                                    + Create Purchase Order
                                </button>
                            </div>

                            {lowStockItems.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#ECFDF5] border border-dashed border-[#BBF7D0]">
                                    <div className="w-12 h-12 rounded-full bg-white text-[#15803D] border border-[#BBF7D0] flex items-center justify-center mx-auto mb-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm font-semibold text-[#15803D]">All supplies well stocked!</p>
                                    <p className="text-xs text-[#15803D] mt-0.5">
                                        No items currently breached the warehouse reorder limit.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {lowStockItems.map((item) => (
                                        <div
                                            key={item.item_id}
                                            className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between gap-4"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-[#991B1B]">
                                                        {item.item_name}
                                                    </h3>
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-[#FECACA] text-[#DC2626]">
                                                        Critical Reorder
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#B91C1C]">
                                                    Current Stock: <span className="font-bold">{item.quantity_on_hand} {item.unit}</span> (Min Threshold: {item.reorder_level} {item.unit})
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("materials")}
                                                className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#FEE2E2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] transition"
                                            >
                                                Restock &rarr;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "categories" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div>
                                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                    Inventory Classification
                                </span>
                                <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                    Tools vs Materials Breakdown
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[#64748B] uppercase">Power & Hand Tools</span>
                                        <ToolSvg className="w-5 h-5 text-[#2563EB]" />
                                    </div>
                                    <p className="text-3xl font-bold text-[#10213F]">{stats.total_tools ?? 0}</p>
                                    <p className="text-xs text-[#64748B]">
                                        Manifold gauges, vacuum pumps, flaring tools, and meters in active checkout custody.
                                    </p>
                                </div>

                                <div className="p-5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[#64748B] uppercase">Materials & Supplies</span>
                                        <BoxSvg className="w-5 h-5 text-[#2563EB]" />
                                    </div>
                                    <p className="text-3xl font-bold text-[#10213F]">{stats.total_materials ?? 0}</p>
                                    <p className="text-xs text-[#64748B]">
                                        Refrigerant tanks, copper tubings, electrical tapes, insulation foam, and capacitor units.
                                    </p>
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
                                onClick={() => onNavigate("materials")}
                                className="w-7 h-7 rounded-lg bg-[#F4F7FB] hover:bg-[#EAF2FF] text-[#64748B] hover:text-[#2563EB] border border-[#E2E8F0] flex items-center justify-center transition font-semibold"
                                title="Add task"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {toolsToDos.map((todo) => (
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
                                Calibration
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="inline-block px-3 py-1 rounded-full bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] text-[11px] font-semibold">
                                Friday 4:00 PM &bull; Weekly Equipment Audit
                            </div>

                            <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-[#172B4D]">
                                        Gauge Calibration & Physical Count
                                    </h4>
                                    <StatusBadge status="Scheduled" />
                                </div>
                                <p className="text-[11px] text-[#64748B]">
                                    Ensure all digital manifold gauges and vacuum pumps are brought back to the warehouse for inspection.
                                </p>
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="w-full mt-2 py-2 rounded-lg bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] text-[#172B4D] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                >
                                    <span>Checklist & Calibration</span>
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
                                    <p className="text-xs font-semibold text-[#172B4D]">Warehouse Policy Bulletin</p>
                                    <p className="text-[11px] text-[#64748B]">
                                        All technicians are required to sign the tool log sheet when taking high-value power equipment.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WIDGET 4: TECHNICIANS WITH ACTIVE CUSTODY / ACTIVE STAFF */}
                    {widgetTab === "staff" ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-end px-2">
                                <button
                                    onClick={() => setWidgetTab("custody")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
                                >
                                    <span>&larr; Switch to Tool Custody</span>
                                </button>
                            </div>
                            <ActiveStaffWidget
                                initialStaff={dashboardData?.active_staff_users}
                                isSuperAdmin={false}
                                title="Active Staff"
                            />
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center border border-[#C7DDFD]">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path d={icons.team} />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-[#10213F]">Active Tool Custody</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setWidgetTab("staff")}
                                        className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EAF2FF] border border-[#C7DDFD] px-2.5 py-0.5 rounded-full transition cursor-pointer"
                                        title="View real-time staff status"
                                    >
                                        Staff Status &rarr;
                                    </button>
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#15803D] bg-[#ECFDF5] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                                        {techniciansWithCustody.length} Techs
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                {techniciansWithCustody.map((tech) => (
                                    <div
                                        key={tech.id}
                                        className="p-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] flex items-center gap-2.5"
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold text-[11px]">
                                                {tech.name.split(" ").map((n) => n[0]).join("")}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-[#172B4D] truncate">
                                                {tech.name}
                                            </p>
                                            <p className="text-[10px] text-[#2563EB] font-semibold truncate">
                                                {tech.itemsCount} tools borrowed
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
