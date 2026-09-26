import { useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
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

export default function ToolsManDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("recent"); // "recent" | "lowstock" | "categories"

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
                    <div className="bg-gradient-to-r from-[#0E1A33] via-[#162D59] to-[#0A152B] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Warehouse Supply & Custody Hub</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                    Tools & Materials Inventory Center
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                                    Monitor tool checkouts, supervise inventory stocks, flag replenishment orders, and inspect returned equipment after customer dispatches.
                                </p>

                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-[11px] text-slate-300">
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        📦 {stats.total_items ?? 0} Total Items
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        🔧 {stats.total_tools ?? 0} Tools In Stock
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                                        🧰 {stats.total_materials ?? 0} Materials
                                    </span>
                                    {(stats.low_stock_items ?? 0) > 0 && (
                                        <span className="flex items-center gap-1 bg-rose-500/30 border border-rose-400/40 text-rose-200 px-2.5 py-1 rounded-lg font-bold">
                                            ⚠️ {stats.low_stock_items} Low Stock
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <span>Open Supply Inventory</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("announcements")}
                                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold border border-white/10 transition flex items-center justify-center gap-2"
                                >
                                    <span>Post Supply Bulletin</span>
                                </button>
                            </div>
                        </div>

                        {/* Carousel / Indicator Dots */}
                        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-white/10">
                            <span className="w-6 h-1.5 rounded-full bg-blue-400" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <span className="text-[10px] text-slate-300 ml-2 font-medium">
                                Tool checkout and inventory balances verified
                            </span>
                        </div>
                    </div>

                    {/* SECTION 2: TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("recent")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm ${
                                    activeTab === "recent"
                                        ? "bg-[#0E1A33] text-white shadow-blue-900/20"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                📋 Recently Updated ({recentItems.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("lowstock")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                    activeTab === "lowstock"
                                        ? "bg-[#0E1A33] text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                ⚠️ Low Stock Alerts ({stats.low_stock_items ?? 0})
                            </button>
                            <button
                                onClick={() => setActiveTab("categories")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                                    activeTab === "categories"
                                        ? "bg-[#0E1A33] text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                🗂️ Categories Breakdown
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
                    {activeTab === "recent" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                                        Warehouse Activity
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Recently Updated Inventory Items
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <span>Full Inventory</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {recentItems.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                    <p className="text-sm font-bold text-slate-800">No items updated recently</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentItems.map((item) => (
                                        <div
                                            key={item.item_id}
                                            className="p-4 rounded-2xl bg-slate-50/70 hover:bg-blue-50/30 border border-slate-200/70 hover:border-blue-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                                                    {item.item_type === "Tool" ? "🔧" : "📦"}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-bold text-slate-900">
                                                            {item.item_name}
                                                        </h3>
                                                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-700">
                                                            {item.item_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        Reorder Threshold: {item.reorder_level} {item.unit}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 self-end sm:self-auto">
                                                <div className="text-right">
                                                    <p className={`text-base font-black ${item.low_stock ? "text-rose-600" : "text-slate-900"}`}>
                                                        {item.quantity_on_hand} {item.unit}
                                                    </p>
                                                    <StatusBadge status={item.low_stock ? "Low Stock" : "Available"} />
                                                </div>
                                                <button
                                                    onClick={() => onNavigate("materials")}
                                                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition"
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
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                                        Immediate Action Required
                                    </span>
                                    <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                        Low Stock & Reorder Warnings
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition"
                                >
                                    + Create Purchase Order
                                </button>
                            </div>

                            {lowStockItems.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-2xl bg-emerald-50/50 border border-dashed border-emerald-200">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                                        ✓
                                    </div>
                                    <p className="text-sm font-bold text-emerald-900">All supplies well stocked!</p>
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                        No items currently breached the warehouse reorder limit.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {lowStockItems.map((item) => (
                                        <div
                                            key={item.item_id}
                                            className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between gap-4"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-rose-950">
                                                        {item.item_name}
                                                    </h3>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                                                        Critical Reorder
                                                    </span>
                                                </div>
                                                <p className="text-xs text-rose-700">
                                                    Current Stock: <span className="font-extrabold">{item.quantity_on_hand} {item.unit}</span> (Min Threshold: {item.reorder_level} {item.unit})
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("materials")}
                                                className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-800 transition"
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
                        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                            <div>
                                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                                    Inventory Classification
                                </span>
                                <h2 className="text-lg font-extrabold text-[#0E1A33] mt-0.5">
                                    Tools vs Materials Breakdown
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Power & Hand Tools</span>
                                        <span className="text-base">🔧</span>
                                    </div>
                                    <p className="text-3xl font-black text-[#0E1A33]">{stats.total_tools ?? 0}</p>
                                    <p className="text-xs text-slate-500">
                                        Manifold gauges, vacuum pumps, flaring tools, and meters in active checkout custody.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Materials & Supplies</span>
                                        <span className="text-base">📦</span>
                                    </div>
                                    <p className="text-3xl font-black text-[#0E1A33]">{stats.total_materials ?? 0}</p>
                                    <p className="text-xs text-slate-500">
                                        Refrigerant tanks, copper tubings, electrical tapes, insulation foam, and capacitor units.
                                    </p>
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
                                onClick={() => onNavigate("materials")}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition font-bold"
                                title="Add task"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {toolsToDos.map((todo) => (
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
                                Calibration
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="inline-block px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-bold">
                                Friday 4:00 PM &bull; Weekly Equipment Audit
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900">
                                        Gauge Calibration & Physical Count
                                    </h4>
                                    <StatusBadge status="Scheduled" />
                                </div>
                                <p className="text-[11px] text-slate-600">
                                    Ensure all digital manifold gauges and vacuum pumps are brought back to the warehouse for inspection.
                                </p>
                                <button
                                    onClick={() => onNavigate("materials")}
                                    className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                >
                                    <span>Checklist & Calibration</span>
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
                                    <p className="text-xs font-bold text-slate-800">Warehouse Policy Bulletin</p>
                                    <p className="text-[11px] text-slate-500">
                                        All technicians are required to sign the tool log sheet when taking high-value power equipment.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WIDGET 4: TECHNICIANS WITH ACTIVE CUSTODY */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.team} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-extrabold text-[#0E1A33]">Active Tool Custody</h3>
                            </div>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {techniciansWithCustody.length} Techs
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {techniciansWithCustody.map((tech) => (
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
                                        <p className="text-[10px] text-blue-600 font-semibold truncate">
                                            {tech.itemsCount} tools borrowed
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
