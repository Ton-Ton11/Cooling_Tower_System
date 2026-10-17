import { useEffect, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import { getInitials } from "../utils/superAdmin";

const Icon = ({ d, size = 18 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={d} />
    </svg>
);

const ic = {
    chevron_left: "M15 18l-6-6 6-6",
    chevron_right: "M9 18l6-6-6-6",
    menu: "M3 6h18 M3 12h18 M3 18h18",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    calendar:
        "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
    send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    check: "M5 13l4 4L19 7",
    plus: "M12 4v16m8-8H4",
};

function Topbar({ collapsed, isMobile = false, onToggleSidebar, onNavigate, addToast }) {
    const { auth = {} } = usePage().props;
    const [liveUser, setLiveUser] = useState(auth.user || {});

    useEffect(() => {
        setLiveUser(auth.user || {});
    }, [auth.user]);

    useEffect(() => {
        const handleProfileUpdate = (e) => {
            if (e.detail) {
                setLiveUser((prev) => ({ ...prev, ...e.detail }));
            }
        };
        window.addEventListener("profile-updated", handleProfileUpdate);
        return () => window.removeEventListener("profile-updated", handleProfileUpdate);
    }, []);

    const user = liveUser || {};
    const displayName =
        user.name ||
        [user.given_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(" ") ||
        user.email ||
        "User";
    const profilePhotoUrl = user.profile_photo_url || null;
    const isHeadTech =
        Boolean(auth.isHeadTechnician) ||
        Boolean(user.is_head_technician) ||
        Number(user.role_id) === 7 ||
        String(auth.role_name || "").toLowerCase().includes("head");
    const isLeaderOrAdmin = isHeadTech || [1, 2].includes(Number(user.role_id));
    const roleLabel = isHeadTech
        ? "Head Technician"
        : auth.role_name || (Number(user.role_id) === 6 ? "Customer" : "Staff");
    const isCustomer =
        !isHeadTech &&
        ![1, 2, 3, 4, 5, 7].includes(Number(user.role_id)) &&
        (Number(user.role_id) === 6 ||
            String(roleLabel).toLowerCase().includes("customer"));
    const initials = getInitials(displayName);

    // Active popover: null | "messages" | "notifications" | "calendar"
    const [openPanel, setOpenPanel] = useState(null);
    const [widgetData, setWidgetData] = useState({
        notifications: [],
        unread_notifications_count: 0,
        messages: [],
        unread_messages_count: 0,
        staff_recipients: [],
        calendar_events: [],
    });
    const [loadingWidgets, setLoadingWidgets] = useState(false);

    // Compose Message State (Employees only)
    const [composing, setComposing] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [msgForm, setMsgForm] = useState({
        recipient_id: "",
        subject: "",
        body: "",
    });

    // Calendar State (Employees only)
    const todayStr = new Date().toISOString().slice(0, 10);
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(null); // null = show all upcoming

    const dropdownRef = useRef(null);

    const fetchWidgets = async () => {
        try {
            setLoadingWidgets(true);
            const { data } = await window.axios.get("/topbar/widgets");
            setWidgetData({
                notifications: data.notifications || [],
                unread_notifications_count: data.unread_notifications_count || 0,
                messages: data.messages || [],
                unread_messages_count: data.unread_messages_count || 0,
                staff_recipients: data.staff_recipients || [],
                calendar_events: data.calendar_events || [],
            });
        } catch {
            // Silently ignore if unauthenticated
        } finally {
            setLoadingWidgets(false);
        }
    };

    useEffect(() => {
        fetchWidgets();
        const timer = setInterval(fetchWidgets, 45000);
        return () => clearInterval(timer);
    }, []);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenPanel(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleTogglePanel = async (panel) => {
        const next = openPanel === panel ? null : panel;
        setOpenPanel(next);

        if (next === "notifications" && widgetData.unread_notifications_count > 0) {
            try {
                await window.axios.post("/topbar/notifications/mark-read");
                setWidgetData((prev) => ({
                    ...prev,
                    unread_notifications_count: 0,
                    notifications: prev.notifications.map((n) => ({ ...n, unread: false })),
                }));
            } catch {
                // ignore
            }
        }

        if (next === "messages" && widgetData.unread_messages_count > 0) {
            try {
                await window.axios.post("/topbar/messages/mark-read");
                setWidgetData((prev) => ({
                    ...prev,
                    unread_messages_count: 0,
                    messages: prev.messages.map((m) => ({ ...m, unread: false })),
                }));
            } catch {
                // ignore
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!msgForm.body.trim()) return;

        try {
            setSendingMsg(true);
            const { data } = await window.axios.post("/topbar/messages", {
                recipient_id: msgForm.recipient_id ? Number(msgForm.recipient_id) : null,
                subject: msgForm.subject,
                body: msgForm.body,
            });
            setWidgetData((prev) => ({
                ...prev,
                messages: data.messages || prev.messages,
                unread_messages_count: data.unread_messages_count || 0,
            }));
            setMsgForm({ recipient_id: "", subject: "", body: "" });
            setComposing(false);
            if (addToast) addToast("Message sent to staff inbox.", "success");
        } catch (err) {
            if (addToast) addToast(err?.response?.data?.message || "Failed to send message.", "error");
        } finally {
            setSendingMsg(false);
        }
    };

    // Build calendar days for the current calMonth
    const buildCalendarDays = () => {
        const year = calMonth.getFullYear();
        const month = calMonth.getMonth();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = (widgetData.calendar_events || []).filter((ev) => ev.date === iso);
            cells.push({ day, iso, events: dayEvents });
        }
        return cells;
    };

    const calendarCells = !isCustomer ? buildCalendarDays() : [];
    const filteredCalendarEvents = selectedDate
        ? (widgetData.calendar_events || []).filter((ev) => ev.date === selectedDate)
        : (widgetData.calendar_events || []).slice(0, 8);

    const badgeColorMap = {
        rose: "bg-rose-100 text-rose-800 border-rose-200",
        amber: "bg-amber-100 text-amber-800 border-amber-200",
        indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
        emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
        blue: "bg-blue-100 text-blue-800 border-blue-200",
    };

    return (
        <header
            style={{
                background: "#fff",
                borderBottom: "1px solid #F0F2F5",
                padding: isMobile ? "0 12px" : "0 20px",
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
                zIndex: 30,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                position: "relative",
            }}
        >
            <button
                onClick={onToggleSidebar}
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748B",
                    flexShrink: 0,
                    transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F1F5F9";
                    e.currentTarget.style.color = "#0F172A";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#64748B";
                }}
            >
                <Icon
                    d={isMobile ? ic.menu : collapsed ? ic.chevron_right : ic.chevron_left}
                    size={16}
                />
            </button>

            {!isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#0E1A33", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                        Cooling Tower System
                    </span>
                </div>
            )}

            {!isMobile && (
                <div style={{ position: "relative", flex: 1, maxWidth: 380, margin: "0 auto" }}>
                    <span
                        style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#64748B",
                            display: "flex",
                            pointerEvents: "none",
                        }}
                    >
                        <Icon d={ic.search} size={15} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search services, bookings..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && onNavigate) {
                                onNavigate("bookings");
                            }
                        }}
                        style={{
                            width: "100%",
                            paddingLeft: 38,
                            paddingRight: 32,
                            paddingTop: 8,
                            paddingBottom: 8,
                            background: "#F1F5F9",
                            border: "1px solid #E2E8F0",
                            borderRadius: 999,
                            fontSize: 13,
                            color: "#1E293B",
                            outline: "none",
                            fontFamily: "inherit",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#2563EB";
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#E2E8F0";
                            e.currentTarget.style.background = "#F1F5F9";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                </div>
            )}

            {/* Right Action Icons + User Profile */}
            <div
                ref={dropdownRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? 8 : 10,
                    marginLeft: "auto",
                    position: "relative",
                }}
            >
                {/* 1. ENVELOPE (MESSAGES) - EMPLOYEES ONLY */}
                {!isCustomer && (
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            onClick={() => handleTogglePanel("messages")}
                            title="Staff Messages & Dispatch Inbox"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                border: openPanel === "messages" ? "1px solid #BFDBFE" : "none",
                                background: openPanel === "messages" ? "#EFF6FF" : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: openPanel === "messages" ? "#2563EB" : "#64748B",
                                transition: "all 0.15s",
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        </button>
                        {widgetData.unread_messages_count > 0 && (
                            <span
                                style={{
                                    position: "absolute",
                                    top: -2,
                                    right: -2,
                                    background: "#0284C7",
                                    color: "#fff",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: 999,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "0 4px",
                                    border: "2px solid #fff",
                                    pointerEvents: "none",
                                }}
                            >
                                {widgetData.unread_messages_count > 99 ? "99+" : widgetData.unread_messages_count}
                            </span>
                        )}
                    </div>
                )}

                {/* 2. BELL (NOTIFICATIONS) - ALL USERS (EMPLOYEES + CUSTOMERS) */}
                <div style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => handleTogglePanel("notifications")}
                        title="Notifications & Forecast Reminders"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            border: openPanel === "notifications" ? "1px solid #BFDBFE" : "none",
                            background: openPanel === "notifications" ? "#EFF6FF" : "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: openPanel === "notifications" ? "#2563EB" : "#64748B",
                            transition: "all 0.15s",
                        }}
                    >
                        <Icon d={ic.bell} size={18} />
                    </button>
                    {widgetData.unread_notifications_count > 0 && (
                        <span
                            style={{
                                position: "absolute",
                                top: -2,
                                right: -2,
                                background: "#EF4444",
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: 700,
                                minWidth: 18,
                                height: 18,
                                borderRadius: 999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 4px",
                                border: "2px solid #fff",
                                pointerEvents: "none",
                            }}
                        >
                            {widgetData.unread_notifications_count > 99 ? "99+" : widgetData.unread_notifications_count}
                        </span>
                    )}
                </div>

                {/* 3. CALENDAR (SCHEDULE & FORECAST CALENDAR) - EMPLOYEES ONLY */}
                {!isCustomer && (
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            onClick={() => handleTogglePanel("calendar")}
                            title="Operations & Forecast Calendar"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                border: openPanel === "calendar" ? "1px solid #BFDBFE" : "none",
                                background: openPanel === "calendar" ? "#EFF6FF" : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: openPanel === "calendar" ? "#2563EB" : "#64748B",
                                transition: "all 0.15s",
                            }}
                        >
                            <Icon d={ic.calendar} size={18} />
                        </button>
                        {widgetData.calendar_events?.length > 0 && (
                            <span
                                style={{
                                    position: "absolute",
                                    bottom: 2,
                                    right: 2,
                                    width: 8,
                                    height: 8,
                                    background: "#4F46E5",
                                    borderRadius: "50%",
                                    border: "1.5px solid #fff",
                                    pointerEvents: "none",
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    POPOVER 1: EMPLOYEE MESSAGES (ENVELOPE)
                ══════════════════════════════════════════════════════════════ */}
                {!isCustomer && openPanel === "messages" && (
                    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-50">
                        <div className="p-4 bg-gradient-to-r from-[#0E1A33] to-[#1E3A8A] text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-extrabold">Staff Dispatch & Messages</h3>
                                <p className="text-[11px] text-blue-200">Internal coordination across employee roles</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setComposing(!composing)}
                                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition flex items-center gap-1"
                            >
                                <span>{composing ? "View Inbox" : "+ New Message"}</span>
                            </button>
                        </div>

                        {composing ? (
                            <form onSubmit={handleSendMessage} className="p-4 space-y-3 bg-slate-50 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Recipient</label>
                                    <select
                                        value={msgForm.recipient_id}
                                        onChange={(e) => setMsgForm({ ...msgForm, recipient_id: e.target.value })}
                                        className="w-full rounded-xl border-slate-300 text-xs py-2 px-3 bg-white"
                                    >
                                        <option value="">All Employees (Broadcast)</option>
                                        {widgetData.staff_recipients.map((r) => (
                                            <option key={r.user_id} value={r.user_id}>
                                                {r.name} ({r.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Tool Checklist / Dispatch Update"
                                        value={msgForm.subject}
                                        onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
                                        className="w-full rounded-xl border-slate-300 text-xs py-2 px-3 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Message</label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="Write your message to the team..."
                                        value={msgForm.body}
                                        onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                                        className="w-full rounded-xl border-slate-300 text-xs py-2 px-3 bg-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setComposing(false)}
                                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingMsg}
                                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
                                    >
                                        <Icon d={ic.send} size={13} />
                                        <span>{sendingMsg ? "Sending..." : "Send"}</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                                {widgetData.messages.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        No staff messages yet. Click <strong>+ New Message</strong> to coordinate with your team.
                                    </div>
                                ) : (
                                    widgetData.messages.map((m) => (
                                        <div
                                            key={m.message_id}
                                            className={`p-3.5 hover:bg-slate-50 transition text-xs space-y-1 ${
                                                m.unread ? "bg-blue-50/40" : "bg-white"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="font-extrabold text-slate-900 truncate">
                                                        {m.sender_name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                        {m.sender_role}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0">{m.time_ago}</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-blue-900">
                                                {m.subject} <span className="font-normal text-slate-400">&rarr; {m.recipient_name}</span>
                                            </p>
                                            <p className="text-xs text-slate-600 leading-relaxed">{m.body}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    POPOVER 2: NOTIFICATIONS (BELL) - ALL USERS
                ══════════════════════════════════════════════════════════════ */}
                {openPanel === "notifications" && (
                    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-50">
                        <div className="p-4 bg-gradient-to-r from-[#0E1A33] to-[#1E3A8A] text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-extrabold">Notifications & Reminders</h3>
                                <p className="text-[11px] text-blue-200">
                                    {isCustomer
                                        ? "Predictive maintenance & booking status updates"
                                        : isHeadTech
                                        ? "Crew license compliance, tool custody & squad dispatches"
                                        : "Forecast alerts, license renewals & dispatch notices"}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {isLeaderOrAdmin && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const res = await window.axios.post("/forecasting/evaluate-reminders");
                                                if (addToast) {
                                                    addToast(res.data?.message || "Reminder scan completed.", "success");
                                                }
                                                fetchWidgets();
                                            } catch (err) {
                                                if (addToast) {
                                                    addToast(
                                                        err?.response?.data?.message || "Failed to run reminder scan.",
                                                        "error",
                                                    );
                                                }
                                            }
                                        }}
                                        title="Scan expiring technician certifications & due customer services"
                                        className="px-2.5 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-[10px] font-extrabold text-white transition"
                                    >
                                        Remind Crew
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={fetchWidgets}
                                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold text-white transition"
                                >
                                    ↻ Sync
                                </button>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                            {widgetData.notifications.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    You are all caught up! No new notifications at this time.
                                </div>
                            ) : (
                                widgetData.notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            if (onNavigate && n.target_page) {
                                                onNavigate(n.target_page);
                                            }
                                            setOpenPanel(null);
                                        }}
                                        className="p-3.5 hover:bg-blue-50/50 transition cursor-pointer text-xs space-y-1"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                                    badgeColorMap[n.badge_color] || badgeColorMap.blue
                                                }`}
                                            >
                                                {n.badge}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{n.time_ago}</span>
                                        </div>
                                        <h4 className="font-extrabold text-slate-900 pt-0.5">{n.title}</h4>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    POPOVER 3: OPERATIONS & FORECAST CALENDAR - EMPLOYEES ONLY
                ══════════════════════════════════════════════════════════════ */}
                {!isCustomer && openPanel === "calendar" && (
                    <div className="absolute right-0 top-12 w-80 sm:w-[410px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-50">
                        <div className="p-4 bg-gradient-to-r from-[#0E1A33] to-[#1E3A8A] text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-extrabold">Operations & Forecast Calendar</h3>
                                <p className="text-[11px] text-blue-200">
                                    Dispatches, predictive maintenance & license expiries
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                                    }
                                    className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                                >
                                    <Icon d={ic.chevron_left} size={14} />
                                </button>
                                <span className="text-xs font-bold px-1.5 whitespace-nowrap">
                                    {calMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                                    }
                                    className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                                >
                                    <Icon d={ic.chevron_right} size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/70">
                            <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400 uppercase pb-1.5">
                                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                    <span key={d}>{d}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarCells.map((cell, idx) => {
                                    if (!cell) {
                                        return <div key={`empty_${idx}`} className="h-8" />;
                                    }
                                    const isSelected = selectedDate === cell.iso;
                                    const isToday = cell.iso === todayStr;
                                    const hasEvents = cell.events.length > 0;

                                    return (
                                        <button
                                            key={cell.iso}
                                            type="button"
                                            onClick={() => setSelectedDate(isSelected ? null : cell.iso)}
                                            className={`h-8 rounded-xl text-xs font-bold flex flex-col items-center justify-center relative transition ${
                                                isSelected
                                                    ? "bg-blue-600 text-white shadow-xs"
                                                    : isToday
                                                    ? "bg-blue-100 text-blue-900 border border-blue-300"
                                                    : hasEvents
                                                    ? "bg-white text-slate-900 border border-indigo-200 hover:bg-indigo-50"
                                                    : "text-slate-600 hover:bg-slate-200/60"
                                            }`}
                                        >
                                            <span>{cell.day}</span>
                                            {hasEvents && (
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                                                        isSelected ? "bg-white" : "bg-indigo-600"
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-between pt-2.5 text-[10px] text-slate-500">
                                <span>
                                    {selectedDate ? `Showing events for ${selectedDate}` : "Showing upcoming schedule & forecasts"}
                                </span>
                                {selectedDate && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDate(null)}
                                        className="font-bold text-blue-600 hover:underline"
                                    >
                                        Show All
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Calendar Events List */}
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                            {filteredCalendarEvents.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No dispatches or forecast reminders scheduled for this date.
                                </div>
                            ) : (
                                filteredCalendarEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        onClick={() => {
                                            if (onNavigate && ev.target_page) {
                                                onNavigate(ev.target_page);
                                            }
                                            setOpenPanel(null);
                                        }}
                                        className="p-3 hover:bg-blue-50/50 transition cursor-pointer flex items-start justify-between gap-3 text-xs"
                                    >
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                                        badgeColorMap[ev.color] || badgeColorMap.blue
                                                    }`}
                                                >
                                                    {ev.type}
                                                </span>
                                                <span className="font-extrabold text-slate-900 truncate">
                                                    {ev.title}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate">{ev.subtitle}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[11px] font-bold text-slate-800 block">{ev.date}</span>
                                            <span className="text-[10px] text-slate-400 block">{ev.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        width: 1,
                        height: 24,
                        background: "#E2E8F0",
                        margin: "0 4px",
                    }}
                />

                {/* User Profile Avatar with Online Ring (Click to open Profile & Settings) */}
                <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("profile")}
                    title="My Profile & Settings"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "transparent",
                        border: "1px solid transparent",
                        borderRadius: 12,
                        padding: "4px 8px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#F8FAFC";
                        e.currentTarget.style.borderColor = "#E2E8F0";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                    }}
                >
                    {!isMobile && (
                        <div style={{ textAlign: "right" }}>
                            <p
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#0E1A33",
                                    lineHeight: 1.2,
                                    margin: 0,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {displayName}
                            </p>
                            <p
                                style={{
                                    fontSize: 11,
                                    color: "#64748B",
                                    lineHeight: 1.2,
                                    margin: "2px 0 0",
                                }}
                            >
                                {roleLabel}
                            </p>
                        </div>
                    )}
                    <div style={{ position: "relative" }}>
                        {profilePhotoUrl ? (
                            <img
                                src={profilePhotoUrl}
                                alt={displayName}
                                onError={() =>
                                    setLiveUser((prev) => ({
                                        ...prev,
                                        profile_photo_url: null,
                                    }))
                                }
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "2px solid #DBEAFE",
                                    flexShrink: 0,
                                    boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg,#2563EB,#0E1A33)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 800,
                                    flexShrink: 0,
                                    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                                }}
                            >
                                {initials}
                            </div>
                        )}
                        <span
                            style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                background: "#10B981",
                                borderRadius: "50%",
                                border: "2px solid #fff",
                            }}
                        />
                    </div>
                </button>
            </div>
        </header>
    );
}

export default Topbar;
