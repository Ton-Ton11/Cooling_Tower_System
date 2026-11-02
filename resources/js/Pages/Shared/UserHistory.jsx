import React, { useEffect, useMemo, useState } from "react";
import {
    Clock,
    Search,
    Trash2,
    ArrowRight,
    LayoutDashboard,
    ClipboardCheck,
    Wrench,
    Calendar,
    PlusCircle,
    History as HistoryIcon,
    Shield,
    HelpCircle,
    BookOpen,
    Users,
    Award,
    UserCheck,
    Cpu,
    DollarSign,
    FileText,
    Bell,
    Activity,
    TrendingUp,
    User,
    RotateCcw,
} from "lucide-react";
import {
    getUserActivityHistory,
    removeUserActivity,
    clearUserActivityHistory,
    formatTimeAgo,
} from "../../utils/userActivityHistory";

const ICON_MAP = {
    dashboard: LayoutDashboard,
    checklists: ClipboardCheck,
    materials: Wrench,
    bookings: Calendar,
    book: PlusCircle,
    service_history: HistoryIcon,
    warranty: Shield,
    complaints: HelpCircle,
    catalog: BookOpen,
    teams: Users,
    certificates: Award,
    staff: UserCheck,
    acunits: Cpu,
    sales: DollarSign,
    documents: FileText,
    announcements: Bell,
    logs: Activity,
    performance: TrendingUp,
    tools: Wrench,
    profile: User,
};

export default function UserHistory({ onNavigate, currentUser, addToast }) {
    const userId = currentUser?.id || currentUser?.user_id || null;
    const [history, setHistory] = useState(() => getUserActivityHistory(userId));
    const [searchQuery, setSearchQuery] = useState("");
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Sync state if history updates in another tab or component
    useEffect(() => {
        const handleUpdate = () => {
            setHistory(getUserActivityHistory(userId));
        };
        window.addEventListener("user-activity-history-updated", handleUpdate);
        return () => window.removeEventListener("user-activity-history-updated", handleUpdate);
    }, [userId]);

    const filteredHistory = useMemo(() => {
        if (!searchQuery.trim()) return history;
        const q = searchQuery.toLowerCase();
        return history.filter(
            (item) =>
                item.title?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q) ||
                item.pageId?.toLowerCase().includes(q)
        );
    }, [history, searchQuery]);

    const handleReturnToActivity = (pageId) => {
        if (!pageId || !onNavigate) return;
        onNavigate(pageId);
    };

    const handleRemoveItem = (e, activityId) => {
        e.stopPropagation();
        const updated = removeUserActivity(userId, activityId);
        setHistory(updated);
        if (addToast) addToast("Activity removed from history.", "info");
    };

    const handleClearAll = () => {
        clearUserActivityHistory(userId);
        setHistory([]);
        setShowClearConfirm(false);
        if (addToast) addToast("Activity history cleared.", "success");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-13 rounded-2xl bg-gradient-to-br from-[#0E1A33] to-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
                            <Clock className="size-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-[#0E1A33] tracking-tight">
                                History
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                Your recent interface activities. Click any item to return to where you were working.
                            </p>
                        </div>
                    </div>

                    {history.length > 0 && (
                        <div className="flex items-center gap-2 self-start md:self-auto">
                            {showClearConfirm ? (
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 rounded-2xl">
                                    <span className="text-xs text-rose-700 font-semibold px-2">
                                        Clear all history?
                                    </span>
                                    <button
                                        onClick={handleClearAll}
                                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
                                    >
                                        Yes, Clear
                                    </button>
                                    <button
                                        onClick={() => setShowClearConfirm(false)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowClearConfirm(true)}
                                    className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 text-slate-600 hover:text-rose-600 text-xs font-bold transition flex items-center gap-2"
                                    title="Clear all recent activities"
                                >
                                    <Trash2 className="size-4" />
                                    <span>Clear History</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Search Bar Toolbar */}
                {history.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search recent activities..."
                                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <span className="text-xs text-slate-400 font-medium self-end sm:self-center">
                            {filteredHistory.length} {filteredHistory.length === 1 ? "activity" : "activities"} recorded
                        </span>
                    </div>
                )}
            </div>

            {/* Activities List */}
            {history.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm space-y-4">
                    <div className="size-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <RotateCcw className="size-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h3 className="text-base font-bold text-slate-800">
                            No recent activity recorded yet
                        </h3>
                        <p className="text-xs text-slate-500">
                            As you navigate and work through your dashboard, your visited sections and actions will appear here for easy 1-click return.
                        </p>
                    </div>
                    <button
                        onClick={() => handleReturnToActivity("dashboard")}
                        className="px-5 py-2.5 rounded-2xl bg-[#0E1A33] hover:bg-[#162D59] text-white text-xs font-bold transition shadow-md shadow-blue-900/10 inline-flex items-center gap-2"
                    >
                        <span>Go to Dashboard</span>
                        <ArrowRight className="size-3.5" />
                    </button>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600">
                        No recent activities match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                        onClick={() => setSearchQuery("")}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                    >
                        Clear search filter
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredHistory.map((item) => {
                        const IconComponent = ICON_MAP[item.icon] || Clock;
                        const fullDateString = item.timestamp
                            ? new Date(item.timestamp).toLocaleString("en-US", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                              })
                            : "";

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleReturnToActivity(item.pageId)}
                                className="group bg-white hover:bg-blue-50/30 rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-400/80 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                    <div className="size-11 sm:size-12 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white transition-colors duration-200 flex items-center justify-center shrink-0">
                                        <IconComponent className="size-5 sm:size-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold text-[#0E1A33] group-hover:text-blue-900 truncate">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {item.description}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400" title={fullDateString}>
                                            <Clock className="size-3" />
                                            <span>{formatTimeAgo(item.timestamp)}</span>
                                            {fullDateString && (
                                                <span className="hidden sm:inline text-slate-300">
                                                    &bull; {fullDateString}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => handleRemoveItem(e, item.id)}
                                        className="size-8 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                                        title="Remove from history"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>

                                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white text-xs font-bold transition-colors">
                                        <span>Return</span>
                                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

