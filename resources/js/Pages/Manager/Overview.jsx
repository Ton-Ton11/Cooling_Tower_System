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
    sparkle: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    booking: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function ManagerDashboardOverview({ addToast, onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("pending"); // "pending" | "active" | "chart" | "forecasting"
    const [evaluatingReminders, setEvaluatingReminders] = useState(false);
    const [renewingCert, setRenewingCert] = useState(null);
    const [renewCertNumber, setRenewCertNumber] = useState("");
    const [renewExpiryDate, setRenewExpiryDate] = useState("");
    const [submittingCertRenewal, setSubmittingCertRenewal] = useState(false);

    const stats = dashboardData?.stats ?? {};
    const pendingBookings = dashboardData?.pending_bookings ?? [];
    const activeBookings = dashboardData?.active_bookings ?? [];
    const announcements = dashboardData?.announcements ?? [];
    const weeklyRevenue = dashboardData?.weekly_revenue ?? [];
    const forecastAnalytics = dashboardData?.forecast_analytics ?? {};
    const forecastSummary = forecastAnalytics?.summary ?? {};
    const customerForecasts = forecastAnalytics?.customer_forecasts ?? [];
    const technicianAlerts = forecastAnalytics?.technician_alerts ?? [];
    const demandProjection = forecastAnalytics?.demand_projection ?? [];

    const handleTriggerReminderEvaluation = async () => {
        try {
            setEvaluatingReminders(true);
            const res = await window.axios.post("/forecasting/evaluate-reminders");
            if (addToast) addToast(res.data?.message || "Automated reminders dispatched.", "success");
            if (onRefresh) onRefresh();
        } catch (err) {
            if (addToast) addToast(err?.response?.data?.message || "Could not evaluate reminders.", "error");
        } finally {
            setEvaluatingReminders(false);
        }
    };

    const openRenewCertModal = (cert) => {
        setRenewingCert(cert);
        setRenewCertNumber(cert.certificate_number || "");
        setRenewExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    };

    const handleManagerRenewTechCert = async (e) => {
        if (e) e.preventDefault();
        if (!renewingCert) return;
        try {
            setSubmittingCertRenewal(true);
            const res = await window.axios.patch(`/forecasting/certifications/${renewingCert.certification_id}/renew`, {
                action: "update_dates",
                certificate_number: renewCertNumber.trim() || undefined,
                new_expiry_date: renewExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            });
            if (addToast) addToast(res.data?.message || "Technician renewed certificate submitted and verified.", "success");
            setRenewingCert(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            if (addToast) addToast(err?.response?.data?.message || "Failed to update certification.", "error");
        } finally {
            setSubmittingCertRenewal(false);
        }
    };

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
            id: "reports_todo",
            title: "Review Customer Reports & Support Chat",
            sub: `${stats.pending_reports ?? 0} pending problem reports & ${stats.unread_customer_chat ?? 0} unread chat messages`,
            target: "reports",
            badge: "Support",
        },
        {
            id: "forecast_todo",
            title: "Review Predictive Maintenance & License Alerts",
            sub: `${forecastSummary.due_soon_customers ?? 0} customer reminders & ${forecastSummary.expiring_certifications ?? 0} tech renewals due`,
            target: "forecasting_tab",
            badge: "Forecast",
        },
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

    const onDutyStaff = dashboardData?.on_duty_staff ?? [
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
                    <div className="ct-hero-banner rounded-2xl p-6 sm:p-8 text-white border border-[#1E3A6D] relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#EAF2FF] text-[11px] font-semibold uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                                    <span>Manager Operations Command</span>
                                </div>
                                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                                    Service Dispatching & Operations Hub
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                    Monitor customer appointment requests, assign certified technician teams, inspect weekly job turnover, and publish company notices.
                                </p>

                                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-200">
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.pending_bookings ?? 0} Pending Approvals
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.active_bookings ?? 0} Active Dispatches
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.completed_bookings ?? 0} Completed
                                    </span>
                                    <span className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg">
                                        {stats.announcements ?? 0} Memos
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
                                >
                                    <span>Dispatch & Assign Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("performance")}
                                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>Performance Analytics</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: METRICS & TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
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
                                onClick={() => setActiveTab("active")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "active"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Active Dispatches ({activeBookings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("chart")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                                    activeTab === "chart"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-transparent text-[#64748B] hover:bg-[#F4F7FB] hover:text-[#172B4D]"
                                }`}
                            >
                                Weekly Trends
                            </button>
                            <button
                                onClick={() => setActiveTab("forecasting")}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                                    activeTab === "forecasting"
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-[#EAF2FF] text-[#2563EB] hover:bg-[#DBEAFE]"
                                }`}
                            >
                                <span>Forecasting & Compliance</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "forecasting" ? "bg-white/20 text-white" : "bg-white text-[#2563EB]"}`}>
                                    {(forecastSummary.due_soon_customers ?? 0) + (forecastSummary.expiring_certifications ?? 0)}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                onClick={onRefresh}
                                className="px-3 py-1.5 text-xs font-semibold text-[#172B4D] bg-[#F4F7FB] hover:bg-[#EAF2FF] rounded-lg border border-[#E2E8F0] transition flex items-center gap-1"
                            >
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* SECTION 3: TAB CONTENT PANELS */}
                    {activeTab === "pending" && (
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider">
                                        Immediate Attention
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Pending Customer Service Requests
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>All Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {pendingBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#F4F7FB] border border-dashed border-[#E2E8F0]">
                                    <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm font-semibold text-[#172B4D]">All caught up!</p>
                                    <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                                        No pending bookings currently waiting for team assignment.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-xl bg-[#F4F7FB] hover:bg-[#EAF2FF] border border-[#E2E8F0] hover:border-[#C7DDFD] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] flex items-center justify-center font-semibold text-sm shrink-0">
                                                    #{b.booking_id}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-sm font-semibold text-[#172B4D]">
                                                            {b.client_name}
                                                        </h3>
                                                        <StatusBadge status="Pending" />
                                                    </div>
                                                    <p className="text-xs text-[#64748B]">
                                                        {b.service} &bull; {b.ac_type || "Standard Split/Window"}
                                                    </p>
                                                    <p className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                            <path d={icons.calendar} />
                                                        </svg>
                                                        <span>Scheduled: {formatDateTime(b.scheduled_date)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                <button
                                                    onClick={() => onNavigate("bookings")}
                                                    className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
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
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                        On-Field Dispatch
                                    </span>
                                    <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                        Active & Dispatched Service Work
                                    </h2>
                                </div>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                                >
                                    <span>Manage Jobs</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            {activeBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 rounded-xl bg-[#F4F7FB] border border-dashed border-[#E2E8F0]">
                                    <p className="text-sm font-semibold text-[#172B4D]">No active dispatches right now</p>
                                    <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                                        Dispatched and in-progress field jobs will show up here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-semibold text-[#172B4D]">
                                                        #{b.booking_id} &bull; {b.client_name}
                                                    </h3>
                                                    <StatusBadge status={b.booking_status} />
                                                </div>
                                                <p className="text-xs text-[#64748B]">
                                                    {b.service} &bull; {b.address || "Client Location"}
                                                </p>
                                                <p className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                        <path d={icons.clock} />
                                                    </svg>
                                                    <span>Target Date: {formatDateTime(b.scheduled_date)}</span>
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("bookings")}
                                                className="px-3 py-1.5 text-xs font-semibold text-[#172B4D] bg-white hover:bg-[#EAF2FF] rounded-lg border border-[#E2E8F0] transition"
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
                        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                            <div>
                                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                    7-Day Volume
                                </span>
                                <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                    Weekly Booking Intake
                                </h2>
                                <p className="text-xs text-[#64748B] mt-1">
                                    Total bookings and revenue generated across the past 7 days.
                                </p>
                            </div>

                            <div className="h-64 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="bookings" name="Bookings" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={42} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E2E8F0] text-center">
                                <div className="p-3 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Past 7 Days Bookings</p>
                                    <p className="text-xl font-bold text-[#10213F] mt-0.5">{weekBookingTotal}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0]">
                                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">Estimated 7-Day Revenue</p>
                                    <p className="text-xl font-bold text-[#16A34A] mt-0.5">{formatCurrency(weekRevenueTotal)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "forecasting" && (
                        <div className="space-y-6">
                            {/* TOP SUMMARY & SCAN BUTTON */}
                            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                                    <div>
                                        <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                                            Predictive Intelligence Engine
                                        </span>
                                        <h2 className="text-lg font-semibold text-[#10213F] mt-0.5">
                                            Customer Predictive Maintenance & Technician License Forecasting
                                        </h2>
                                        <p className="text-xs text-[#64748B] mt-0.5">
                                            Automated reminders for customer next-service cycles and technician certification renewals.
                                        </p>
                                    </div>

                                    <button
                                        disabled={evaluatingReminders}
                                        onClick={handleTriggerReminderEvaluation}
                                        className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition shrink-0"
                                    >
                                        {evaluatingReminders ? "Dispatching Notices..." : "Run Automated Reminder Scan"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                    <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                                        <p className="text-[10px] font-semibold uppercase text-[#B45309]">Units Due / Overdue</p>
                                        <p className="text-xl font-bold text-[#92400E] mt-1">{forecastSummary.due_soon_customers ?? 0}</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                                        <p className="text-[10px] font-semibold uppercase text-[#DC2626]">Tech Licenses Expiring</p>
                                        <p className="text-xl font-bold text-[#991B1B] mt-1">{forecastSummary.expiring_certifications ?? 0}</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-[#EAF2FF] border border-[#C7DDFD]">
                                        <p className="text-[10px] font-semibold uppercase text-[#2563EB]">Tracked Client Units</p>
                                        <p className="text-xl font-bold text-[#10213F] mt-1">{forecastSummary.total_tracked_units ?? 0}</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#BBF7D0]">
                                        <p className="text-[10px] font-semibold uppercase text-[#15803D]">Pipeline Revenue</p>
                                        <p className="text-lg font-bold text-[#15803D] mt-1">
                                            {formatCurrency(forecastSummary.projected_pipeline_revenue ?? 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* 4-WEEK DEMAND PROJECTION CHART */}
                                {demandProjection.length > 0 && (
                                    <div className="pt-2">
                                        <h3 className="text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-2">
                                            4-Week Service Demand Projection (Baseline + Predictive Reminders)
                                        </h3>
                                        <div className="h-52 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={demandProjection} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                    <Tooltip />
                                                    <Bar dataKey="baseline_demand" name="Baseline Bookings" stackId="a" fill="#94A3B8" radius={[0, 0, 0, 0]} maxBarSize={38} />
                                                    <Bar dataKey="predictive_reminders" name="Forecasted Maintenance" stackId="a" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* CUSTOMER PREDICTIVE MAINTENANCE PIPELINE */}
                            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2563EB]">
                                        Customer Retention & Preventive Care
                                    </span>
                                    <h3 className="text-base font-semibold text-[#10213F]">
                                        Upcoming Customer Predictive Maintenance Reminders
                                    </h3>
                                </div>

                                {customerForecasts.length === 0 ? (
                                    <p className="text-xs text-[#64748B] py-4 text-center">
                                        No completed bookings to forecast yet. Complete a booking to automatically generate customer maintenance schedules.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {customerForecasts.slice(0, 6).map((cf) => (
                                            <div
                                                key={cf.forecast_id}
                                                className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-semibold text-[#172B4D]">
                                                            {cf.customer_name}
                                                        </span>
                                                        <span className="text-[11px] text-[#64748B]">
                                                            ({cf.unit_summary})
                                                        </span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                                                cf.urgency_level === "Overdue"
                                                                    ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                                                                    : cf.urgency_level === "Due Soon"
                                                                    ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                                                                    : "bg-[#ECFDF5] text-[#15803D] border border-[#BBF7D0]"
                                                            }`}
                                                        >
                                                            {cf.urgency_level}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#64748B]">
                                                        Previous: <strong>{cf.source_service_name}</strong> &rarr; Suggested Next:{" "}
                                                        <strong className="text-[#2563EB]">{cf.recommended_service_name}</strong>
                                                    </p>
                                                    <p className="text-[11px] text-[#64748B]">
                                                        {cf.recommendation_reason}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-bold text-[#10213F] block">
                                                        Due: {cf.predicted_due_date}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-[#64748B] block">
                                                        {cf.days_remaining < 0
                                                            ? `${Math.abs(cf.days_remaining)}d overdue`
                                                            : `in ${cf.days_remaining} days`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* TECHNICIAN CERTIFICATION COMPLIANCE MATRIX */}
                            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D97706]">
                                            Workforce Qualification & 1-Week Expiry Validation
                                        </span>
                                        <h3 className="text-base font-semibold text-[#10213F]">
                                            Technician Certificate Status Monitoring & Verification
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onNavigate("certificates")}
                                        className="px-3.5 py-2 rounded-lg bg-[#EAF2FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#C7DDFD] text-xs font-semibold transition shrink-0 self-start sm:self-center"
                                    >
                                        Open Certificate Monitoring Tab &rarr;
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {technicianAlerts.slice(0, 8).map((ta) => (
                                        <div
                                            key={ta.certification_id}
                                            className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-[#172B4D]">
                                                        {ta.technician_name}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                                            ta.status === "Expired" || ta.status === "Critical"
                                                                ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                                                                : ta.status === "Expiring Soon"
                                                                ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                                                                : ta.status === "Renewal Submitted"
                                                                ? "bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD]"
                                                                : "bg-[#ECFDF5] text-[#15803D] border border-[#BBF7D0]"
                                                        }`}
                                                    >
                                                        {ta.status}
                                                    </span>
                                                    {ta.status === "Renewal Submitted" && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2563EB] text-white">
                                                            Technician Submitted (1/1)
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#172B4D] font-medium">
                                                    {ta.certification_name} ({ta.issuing_body}) • Cert #: {ta.certificate_number || "On File"}
                                                </p>
                                                <p className="text-[11px] text-[#64748B]">
                                                    Expires: <strong>{ta.expiry_date}</strong> ({ta.days_until_expiry < 0 ? `${Math.abs(ta.days_until_expiry)}d ago` : `${ta.days_until_expiry} days left`})
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openRenewCertModal(ta)}
                                                className={`px-3.5 py-2 rounded-lg text-white text-xs font-semibold transition shrink-0 self-end sm:self-center shadow-xs ${
                                                    ta.status === "Renewal Submitted"
                                                        ? "bg-[#16A34A] hover:bg-[#15803D]"
                                                        : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                                                }`}
                                            >
                                                {ta.status === "Renewal Submitted"
                                                    ? "Verify & Set New Expiration"
                                                    : "Verify & Renew Certificate"}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {renewingCert && (
                                    <form
                                        onSubmit={handleManagerRenewTechCert}
                                        className="mt-4 p-4 rounded-xl bg-[#EAF2FF] border border-[#C7DDFD] space-y-3 text-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-[#10213F]">
                                                Verify Certificate & Reset Expiration Countdown — {renewingCert.technician_name} ({renewingCert.certification_name})
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setRenewingCert(null)}
                                                className="text-[#64748B] hover:text-[#172B4D] font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-semibold text-[#172B4D] mb-1">
                                                    Verified Certificate Number
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={renewCertNumber}
                                                    onChange={(e) => setRenewCertNumber(e.target.value)}
                                                    placeholder="e.g. TESDA-NC2-2026-8841"
                                                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 bg-white text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-[#172B4D] mb-1">
                                                    New Expiration Date (Restarts Countdown)
                                                </label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={renewExpiryDate}
                                                    onChange={(e) => setRenewExpiryDate(e.target.value)}
                                                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 bg-white text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setRenewingCert(null)}
                                                className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#172B4D] font-semibold"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submittingCertRenewal}
                                                className="px-4 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold shadow-xs"
                                            >
                                                {submittingCertRenewal ? "Verifying..." : "Verify & Confirm Renew Status"}
                                            </button>
                                        </div>
                                    </form>
                                )}
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
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] flex items-center justify-center">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                        <path d={icons.check} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-[#10213F]">To-do</h3>
                            </div>
                            <button
                                onClick={() => onNavigate("bookings")}
                                className="w-7 h-7 rounded-lg bg-[#F4F7FB] hover:bg-[#EAF2FF] text-[#64748B] hover:text-[#2563EB] border border-[#E2E8F0] flex items-center justify-center transition font-semibold"
                                title="Add task or view all"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                    <path d={icons.plus} />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {managerToDos.map((todo) => (
                                <div
                                    key={todo.id}
                                    onClick={() => {
                                        if (todo.target === "forecasting_tab") {
                                            setActiveTab("forecasting");
                                        } else {
                                            onNavigate(todo.target);
                                        }
                                    }}
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
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] flex items-center justify-center">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d={icons.calendar} />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-[#10213F]">Upcoming</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EAF2FF] border border-[#C7DDFD] px-2.5 py-1 rounded-lg">
                                Dispatches
                            </span>
                        </div>

                        {nextDispatch ? (
                            <div className="space-y-3">
                                <div className="inline-block px-3 py-1 rounded-full bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] text-[11px] font-semibold">
                                    {formatDateTime(nextDispatch.scheduled_date)}
                                </div>

                                <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-[#172B4D]">
                                            {nextDispatch.service}
                                        </h4>
                                        <StatusBadge status={nextDispatch.booking_status} />
                                    </div>
                                    <p className="text-[11px] text-[#64748B]">
                                        Client: <span className="font-semibold text-[#172B4D]">{nextDispatch.client_name}</span>
                                    </p>
                                    <p className="text-[11px] text-[#64748B]">
                                        Location: {nextDispatch.address || "Standard Client Site"}
                                    </p>
                                    <button
                                        onClick={() => onNavigate("bookings")}
                                        className="w-full mt-2 py-2 rounded-lg bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] text-[#172B4D] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                    >
                                        <span>Dispatch Work Order</span>
                                        <span>&rarr;</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-[#64748B] text-xs">
                                No scheduled dispatches on the docket today.
                            </div>
                        )}
                    </div>

                    {/* WIDGET 3: ANNOUNCEMENTS */}
                    <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] flex items-center justify-center">
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
                                    <p className="text-xs font-semibold text-[#172B4D]">Field Operations Advisory</p>
                                    <p className="text-[11px] text-[#64748B]">
                                        Please ensure all technicians log digital check-in times upon arriving at the customer site.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WIDGET 4: ON-DUTY TEAM / ONLINE TECHNICIANS */}
                    <ActiveStaffWidget
                        initialStaff={dashboardData?.active_staff_users || onDutyStaff}
                        isSuperAdmin={false}
                        title="Field Team On-Duty"
                    />

                </div>

            </div>
        </div>
    );
}
