import { useCallback, useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";

const icons = {
    team: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
    eyeCircle: "M12 9a3 3 0 100 6 3 3 0 000-6z",
    eyeOff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24",
    eyeOffLine: "M1 1l22 22",
};

function formatInitials(name = "") {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!parts.length) return "SA";
    return parts
        .slice(0, 3)
        .map((p) => p[0].toUpperCase())
        .join("");
}

export default function ActiveStaffWidget({
    initialStaff = null,
    isSuperAdmin: propIsSuperAdmin = null,
    title = "Active System Staff",
    className = "",
    addToast = null,
}) {
    const pageProps = usePage()?.props || {};
    const authUser = pageProps.auth?.user || null;
    const isSuperAdmin =
        propIsSuperAdmin !== null
            ? propIsSuperAdmin
            : Number(authUser?.role_id) === 1;

    const [staff, setStaff] = useState(() => initialStaff || []);
    const [hideActiveStatus, setHideActiveStatus] = useState(
        () => Boolean(authUser?.hide_active_status),
    );
    const [filter, setFilter] = useState("all"); // "all" | "online" | "offline"
    const [toggling, setToggling] = useState(false);
    const [loading, setLoading] = useState(!initialStaff || initialStaff.length === 0);

    const fetchStaffPresence = useCallback(async (isMounted = true) => {
        try {
            if (!window.axios) return;
            const { data } = await window.axios.get("/user/presence/staff");
            if (isMounted && data) {
                if (Array.isArray(data.staff)) {
                    setStaff(data.staff);
                }
                if (typeof data.hide_active_status === "boolean") {
                    setHideActiveStatus(data.hide_active_status);
                }
            }
        } catch {
            // Keep existing state if offline or network drop
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    }, []);

    // Initial fetch if needed and sync on prop updates
    useEffect(() => {
        if (initialStaff && initialStaff.length > 0) {
            setStaff(initialStaff);
            setLoading(false);
        } else {
            fetchStaffPresence(true);
        }
    }, [initialStaff, fetchStaffPresence]);

    // Real-time polling every 15 seconds
    useEffect(() => {
        let isMounted = true;
        const intervalId = setInterval(() => {
            fetchStaffPresence(isMounted);
        }, 15000);

        const handlePresenceUpdated = () => {
            fetchStaffPresence(isMounted);
        };
        window.addEventListener("presence-updated", handlePresenceUpdated);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener("presence-updated", handlePresenceUpdated);
        };
    }, [fetchStaffPresence]);

    // Toggle Super Admin presence visibility (Hide / Unhide)
    const handleToggleVisibility = async () => {
        if (toggling || !isSuperAdmin) return;
        setToggling(true);
        const previous = hideActiveStatus;
        const next = !previous;
        setHideActiveStatus(next);

        try {
            const { data } = await window.axios.post(
                "/user/presence/toggle-visibility",
                { hide: next },
            );
            if (data?.success) {
                setHideActiveStatus(Boolean(data.hide_active_status));
                if (addToast) {
                    addToast(
                        data.hide_active_status
                            ? "Active status is now hidden from employee users."
                            : "Active status is now visible to employee users.",
                        "info",
                    );
                }
                window.dispatchEvent(new CustomEvent("presence-updated"));
            }
        } catch {
            setHideActiveStatus(previous);
            if (addToast) {
                addToast("Failed to update active status visibility.", "error");
            }
        } finally {
            setToggling(false);
        }
    };

    const onlineCount = useMemo(() => {
        return staff.filter((u) => u.is_online).length;
    }, [staff]);

    const offlineCount = useMemo(() => {
        return staff.length - onlineCount;
    }, [staff, onlineCount]);

    const displayedStaff = useMemo(() => {
        let list = [...staff];
        if (filter === "online") {
            list = list.filter((u) => u.is_online);
        } else if (filter === "offline") {
            list = list.filter((u) => !u.is_online);
        }
        return list;
    }, [staff, filter]);

    return (
        <div
            className={`bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm space-y-4 ${className}`}
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                        <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path d={icons.team} />
                        </svg>
                    </div>
                    <h3 className="text-base font-extrabold text-[#0E1A33] tracking-tight">
                        {title}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    {/* Super Admin Hide / Unhide Toggle */}
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={handleToggleVisibility}
                            disabled={toggling}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer shadow-xs ${
                                hideActiveStatus
                                    ? "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100"
                                    : "bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100"
                            } ${toggling ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={
                                hideActiveStatus
                                    ? "Your active status is currently HIDDEN from employee users. Click to make visible."
                                    : "Your active status is currently VISIBLE to employee users. Click to hide."
                            }
                        >
                            {hideActiveStatus ? (
                                <svg
                                    className="w-3.5 h-3.5 text-amber-700"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d={icons.eyeOff} />
                                    <path d={icons.eyeOffLine} />
                                </svg>
                            ) : (
                                <svg
                                    className="w-3.5 h-3.5 text-blue-700"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d={icons.eye} />
                                    <path d={icons.eyeCircle} />
                                </svg>
                            )}
                            <span>{hideActiveStatus ? "Hidden" : "Visible"}</span>
                        </button>
                    )}

                    {/* Online count badge */}
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {onlineCount} Online
                    </span>
                </div>
            </div>

            {/* Minimal Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[11px]">
                <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        filter === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                >
                    All ({staff.length})
                </button>
                <button
                    type="button"
                    onClick={() => setFilter("online")}
                    className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                        filter === "online"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online ({onlineCount})
                </button>
                <button
                    type="button"
                    onClick={() => setFilter("offline")}
                    className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        filter === "offline"
                            ? "bg-slate-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                >
                    Offline ({offlineCount})
                </button>
            </div>

            {/* Staff Grid matching screenshot */}
            {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    Loading staff status...
                </div>
            ) : displayedStaff.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No {filter !== "all" ? filter : ""} staff members found.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-0.5">
                    {displayedStaff.map((user) => {
                        const isOnline = Boolean(user.is_online);
                        return (
                            <div
                                key={user.id}
                                className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition ${
                                    isOnline
                                        ? "bg-slate-50/90 border-slate-100 hover:border-emerald-200"
                                        : "bg-slate-50/50 border-slate-100/70 opacity-75 hover:opacity-100"
                                }`}
                            >
                                <div className="relative shrink-0">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ring-2 ring-offset-2 transition ${
                                            isOnline
                                                ? "bg-gradient-to-tr from-blue-700 to-indigo-600 text-white ring-emerald-500"
                                                : "bg-gradient-to-tr from-slate-400 to-slate-500 text-white/95 ring-slate-300"
                                        }`}
                                    >
                                        {formatInitials(user.name)}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                        {user.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-[10px] text-slate-500 truncate max-w-[80px]">
                                            {user.role}
                                        </p>
                                        <span className="text-[9px] text-slate-300">•</span>
                                        <span
                                            className={`inline-flex items-center gap-1 text-[9px] font-bold ${
                                                isOnline
                                                    ? "text-emerald-600"
                                                    : "text-slate-400 font-medium"
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    isOnline
                                                        ? "bg-emerald-500 animate-pulse"
                                                        : "bg-slate-300"
                                                }`}
                                            />
                                            {isOnline ? "Online" : "Offline"}
                                        </span>
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
