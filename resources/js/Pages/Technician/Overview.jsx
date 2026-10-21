import { useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { formatDateTime } from "../../utils/superAdmin";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    tool: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

export default function TechnicianDashboardOverview({ addToast, onNavigate, dashboardData, isLoading, onRefresh }) {
    const [activeTab, setActiveTab] = useState("assigned"); // "assigned" | "completed" | "certifications"
    const [certScope, setCertScope] = useState("crew"); // "crew" | "personal" (for Head Technician)
    const [showAddCertModal, setShowAddCertModal] = useState(false);
    const [submittingCert, setSubmittingCert] = useState(false);
    const [scanningReminders, setScanningReminders] = useState(false);
    const [certForm, setCertForm] = useState({
        technician_user_id: "",
        certification_name: "TESDA RAC Servicing NC III (Commercial HVAC)",
        issuing_body: "TESDA Philippines",
        certificate_number: "",
        issued_date: new Date().toISOString().slice(0, 10),
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        renewal_lead_days: 45,
        notes: "",
    });

    const isHeadTechnician = Boolean(dashboardData?.is_head_technician);
    const stats = dashboardData?.stats ?? {};
    const assignedBookings = dashboardData?.assigned_bookings ?? [];
    const recentCompleted = dashboardData?.recent_completed ?? [];
    const announcements = dashboardData?.announcements ?? [];
    const certifications = dashboardData?.certifications ?? [];
    const teamCertifications = dashboardData?.team_certifications ?? [];
    const technicianList = dashboardData?.technician_list ?? [];

    const displayedCertifications =
        isHeadTechnician && certScope === "crew" && teamCertifications.length > 0
            ? teamCertifications
            : certifications;

    const allRelevantCerts =
        isHeadTechnician && teamCertifications.length > 0 ? teamCertifications : certifications;

    const expiringCerts = allRelevantCerts.filter((c) =>
        ["Expired", "Critical", "Expiring Soon"].includes(c.status),
    );
    const urgentCert = expiringCerts[0] || null;

    const handleTriggerCrewReminderScan = async () => {
        try {
            setScanningReminders(true);
            const res = await window.axios.post("/forecasting/evaluate-reminders");
            if (addToast) {
                addToast(res.data?.message || "Crew certification & service reminder scan completed.", "success");
            }
            if (onRefresh) onRefresh();
        } catch (err) {
            if (addToast) {
                addToast(err?.response?.data?.message || "Failed to run reminder scan.", "error");
            }
        } finally {
            setScanningReminders(false);
        }
    };

    const handleRenewCertification = async (certId, action = "submit_renewal") => {
        try {
            setSubmittingCert(true);
            const payload =
                action === "update_dates"
                    ? {
                          action: "update_dates",
                          new_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                              .toISOString()
                              .slice(0, 10),
                      }
                    : { action: "submit_renewal" };

            const res = await window.axios.patch(`/forecasting/certifications/${certId}/renew`, payload);
            if (addToast) addToast(res.data?.message || "Certification status updated.", "success");
            if (onRefresh) onRefresh();
        } catch (err) {
            if (addToast) addToast(err?.response?.data?.message || "Failed to update certification.", "error");
        } finally {
            setSubmittingCert(false);
        }
    };

    const handleAddCertification = async (e) => {
        e.preventDefault();
        try {
            setSubmittingCert(true);
            const payload = { ...certForm };
            if (!payload.technician_user_id) {
                delete payload.technician_user_id;
            }
            const res = await window.axios.post("/forecasting/certifications", payload);
            if (addToast) addToast(res.data?.message || "Certification added.", "success");
            setShowAddCertModal(false);
            if (onRefresh) onRefresh();
        } catch (err) {
            if (addToast) addToast(err?.response?.data?.message || "Could not save certification.", "error");
        } finally {
            setSubmittingCert(false);
        }
    };

    const nextJob = assignedBookings[0] || null;

    // Realistic technician to-do items (with dynamic certification renewal alert at top!)
    const technicianToDos = [
        ...(urgentCert
            ? [
                  {
                      id: `cert_${urgentCert.certification_id}`,
                      title: urgentCert.technician_name
                          ? `${urgentCert.technician_name}: Renew ${urgentCert.certification_name}`
                          : `Renew ${urgentCert.certification_name}`,
                      sub:
                          urgentCert.days_until_expiry < 0
                              ? `Expired ${Math.abs(urgentCert.days_until_expiry)} days ago • ${urgentCert.issuing_body}`
                              : `Expires in ${urgentCert.days_until_expiry} days (${urgentCert.expiry_date})`,
                      target: "certifications_tab",
                      badge: urgentCert.status,
                  },
              ]
            : []),
        {
            id: 1,
            title: "Submit diagnostic findings for active jobs",
            sub: "Fill in checklist & upload refrigerant readings",
            target: "bookings",
            badge: "Checklist",
        },
        {
            id: 2,
            title: "Upload Before & After photo proof",
            sub: "Required for coil cleaning & parts replacement",
            target: "bookings",
            badge: "Proof",
        },
        {
            id: 3,
            title: "Reconcile borrowed gauges & power tools",
            sub: "Verify custody status with Tools Man warehouse",
            target: "tools",
            badge: "Equipment",
        },
        {
            id: 4,
            title: "Review customer service satisfaction rating",
            sub: `Current rating: ${stats.avg_rating ?? 5.0} Average score`,
            target: "performance",
            badge: "Quality",
        },
    ];

    const teamMembers = [
        { id: 1, name: "Mark Anthony", role: "Head Tech" },
        { id: 2, name: "Angelo Cruz", role: "Senior Tech" },
        { id: 3, name: "Crispin Diaz", role: "Specialist" },
        { id: 4, name: "Dexter A.", role: "Technician" },
        { id: 5, name: "Francis G.", role: "Technician" },
        { id: 6, name: "Mario Lopez", role: "Field Dispatch" },
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
                                    <span>Field Operations Center</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                    Live Service Queue & Diagnostic Workstation
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                                    Access customer service orders, complete unit checklists, verify equipment custody, and record diagnostic results.
                                </p>
                                
                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-[11px] text-slate-300">
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                        <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        {stats.assigned_bookings ?? 0} Assigned Jobs
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        {stats.in_progress_bookings ?? 0} In-Progress
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                                        <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                        {stats.avg_rating ?? 5.0} Rating
                                    </span>
                                </div>
                            </div>

                            {/* Quick CTA Actions */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <span>Open My Job Queue</span>
                                    <span>&rarr;</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("tools")}
                                    className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/15 transition flex items-center justify-center gap-2"
                                >
                                    <span>My Issued Tools</span>
                                </button>
                            </div>
                        </div>

                        {/* Carousel Pagination Dots */}
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <span className="w-6 h-2 rounded-full bg-blue-500 transition-all" />
                            <span className="w-2 h-2 rounded-full bg-white/20 transition-all" />
                            <span className="w-2 h-2 rounded-full bg-white/20 transition-all" />
                        </div>
                    </div>

                    {/* SECTION 1.5: AUTOMATED CERTIFICATION EXPIRY FORECAST ALERT */}
                    {urgentCert && (
                        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-amber-200 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs shadow-sm ${
                                        urgentCert.days_until_expiry < 0 || urgentCert.status === "Critical"
                                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                                            : "bg-amber-100 text-amber-800 border border-amber-200"
                                    }`}
                                >
                                    {urgentCert.days_until_expiry < 0
                                        ? "EXP"
                                        : `${urgentCert.days_until_expiry}d`}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                                            {isHeadTechnician
                                                ? "Head Tech Crew Certification Alert"
                                                : "Automated Certification Renewal Notice"}
                                        </span>
                                        {urgentCert.technician_name && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                {urgentCert.technician_name}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {urgentCert.issuing_body} • #{urgentCert.certificate_number}
                                        </span>
                                    </div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                                        {urgentCert.certification_name}
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {urgentCert.action_notice} (Expiry: <strong>{urgentCert.expiry_date}</strong>)
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {isHeadTechnician && (
                                    <button
                                        type="button"
                                        disabled={scanningReminders}
                                        onClick={handleTriggerCrewReminderScan}
                                        className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-extrabold transition"
                                    >
                                        {scanningReminders ? "Scanning..." : "Remind Crew"}
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab("certifications")}
                                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition"
                                >
                                    Manage & Renew &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: JOB QUEUE & CERTIFICATIONS WITH FILTER PILLS */}
                    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                    {isHeadTechnician
                                        ? "Head Technician Dispatch & Crew Compliance Forecast"
                                        : "Active Assignments & Compliance Forecast"}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isHeadTechnician
                                        ? "Oversee squad dispatches, service reports, and all technicians' valid certifications."
                                        : "Dispatched jobs, service history, and valid technician certification renewal tracking."}
                                </p>
                            </div>

                            {/* Filter Pills */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setActiveTab("assigned")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "assigned"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <span>Active Jobs</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "assigned" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                        {assignedBookings.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("completed")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "completed"
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <span>Recently Serviced</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "completed" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                        {recentCompleted.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("certifications")}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                                        activeTab === "certifications"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                                            : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                    }`}
                                >
                                    <span>{isHeadTechnician ? "Crew Certifications" : "Certifications"}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "certifications" ? "bg-white/20 text-white" : "bg-amber-200/80 text-amber-900"}`}>
                                        {allRelevantCerts.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: ACTIVE JOBS */}
                        {activeTab === "assigned" && (
                            <div className="space-y-3">
                                {assignedBookings.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                                        <p>No active jobs currently assigned to your queue.</p>
                                        <button onClick={onRefresh} className="text-blue-600 font-bold hover:underline">
                                            Check for new dispatches ↻
                                        </button>
                                    </div>
                                ) : (
                                    assignedBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                                                    #{b.booking_id}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm font-bold text-slate-900">{b.service_name}</h4>
                                                        <StatusBadge status={b.booking_status} />
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                            Client: {b.client_name || "Assigned Customer"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                                        <span>Arrival: <strong>{formatDateTime(b.scheduled_date)}</strong></span>
                                                        <span>•</span>
                                                        <span>Location: {b.client_address || "Customer Address On File"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("bookings")}
                                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shrink-0 shadow-sm flex items-center gap-1.5"
                                            >
                                                <span>Work on Job</span>
                                                <span>&rarr;</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 2: COMPLETED JOBS */}
                        {activeTab === "completed" && (
                            <div className="space-y-3">
                                {recentCompleted.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs">
                                        No finished service reports logged yet.
                                    </div>
                                ) : (
                                    recentCompleted.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-4"
                                        >
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">Job #{b.booking_id}: {b.service_name}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Completed on {formatDateTime(b.updated_at || b.scheduled_date)} • Client: {b.client_name}
                                                </p>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Completed
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 3: TECHNICIAN CERTIFICATIONS & EXPIRY FORECAST */}
                        {activeTab === "certifications" && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                                    <div>
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                                            {isHeadTechnician
                                                ? "Head Technician • Crew & Personal License Compliance Tracker"
                                                : "Automated License & Certification Tracker (1-Week Forecast Window)"}
                                        </h3>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            When your certificate is <strong>about to expire 1 week (7 days) from now</strong>, a forecasting reminder triggers and you must submit your renewed certificate <strong>once (1/1)</strong>. The Manager will verify it and enter the new expiration date to restart the countdown.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                                        {isHeadTechnician && (
                                            <button
                                                type="button"
                                                disabled={scanningReminders}
                                                onClick={handleTriggerCrewReminderScan}
                                                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition shadow-sm"
                                            >
                                                {scanningReminders ? "Scanning..." : "Send Crew 1-Week Reminders"}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onNavigate("certificates")}
                                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shrink-0 transition shadow-sm"
                                        >
                                            Open Certificate Monitoring Tab &rarr;
                                        </button>
                                    </div>
                                </div>

                                {isHeadTechnician && teamCertifications.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCertScope("crew")}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                                                certScope === "crew"
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            All Crew Technicians ({teamCertifications.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCertScope("personal")}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                                                certScope === "personal"
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            My Personal Licenses ({certifications.length})
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {displayedCertifications.map((cert) => {
                                        const isUrgent = ["Expired", "Critical", "Expiring Soon"].includes(cert.status);
                                        const isSubmitted = cert.status === "Renewal Submitted";
                                        const canSubmit = Number(cert.days_until_expiry ?? 999) <= 7 && !isSubmitted;
                                        return (
                                            <div
                                                key={cert.certification_id}
                                                className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                                    isSubmitted
                                                        ? "bg-blue-50/40 border-blue-200"
                                                        : isUrgent
                                                        ? "bg-amber-50/40 border-amber-200"
                                                        : "bg-white border-slate-200/80"
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {cert.technician_name && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                                {cert.technician_name}
                                                                {cert.technician_role ? ` • ${cert.technician_role}` : ""}
                                                            </span>
                                                        )}
                                                        <h4 className="text-sm font-extrabold text-slate-900">
                                                            {cert.certification_name}
                                                        </h4>
                                                        <span
                                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                                cert.status === "Expired" || cert.status === "Critical"
                                                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                                                    : cert.status === "Expiring Soon"
                                                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                                    : cert.status === "Renewal Submitted"
                                                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                            }`}
                                                        >
                                                            {cert.status}
                                                        </span>
                                                        {Number(cert.days_until_expiry ?? 999) <= 7 && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                                                                1-Week Reminder Active
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        Issuer: <strong>{cert.issuing_body}</strong> • Cert #:{" "}
                                                        <strong>{cert.certificate_number || "On File"}</strong> • Valid:{" "}
                                                        {cert.issued_date} to <strong>{cert.expiry_date}</strong>
                                                    </p>
                                                    <p className="text-xs text-slate-700 font-medium bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200/60">
                                                        {cert.action_notice}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                                                    {isSubmitted ? (
                                                        <span className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-extrabold">
                                                            ✓ Submitted (1/1) — Awaiting Manager Verification
                                                        </span>
                                                    ) : canSubmit ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onNavigate("certificates")}
                                                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition"
                                                        >
                                                            Submit Renewed Certificate (1/1) &rarr;
                                                        </button>
                                                    ) : (
                                                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                                            Valid • Triggered at ≤ 7 Days Left
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => onNavigate("certificates")}
                                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline"
                                                    >
                                                        Open Certificate Monitoring
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: SAFETY & WORKMANSHIP PROTOCOLS BANNER */}
                    <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 rounded-2xl p-5 border border-amber-200/80 flex items-start gap-4">
                        <span className="p-2 rounded-xl bg-white shadow-sm border border-amber-100 shrink-0 text-amber-600 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </span>
                        <div className="space-y-1 text-xs">
                            <h4 className="font-extrabold text-amber-950">Field Safety & Customer Courtesy Protocol</h4>
                            <p className="text-amber-900/80 leading-relaxed">
                                Always wear safety goggles and insulated gloves when testing capacitors or high-pressure refrigerant lines. Lay down clean floor drop-cloths before commencing indoor coil chemical cleaning.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    RIGHT WIDGET PANEL (4 COLS)
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-5">
                    
                    {/* WIDGET 1: TO-DO */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                </span>
                                <h3 className="text-sm font-extrabold text-slate-900">To-do</h3>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                                Tasks
                            </span>
                        </div>

                        <div className="space-y-3">
                            {technicianToDos.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (item.target === "certifications_tab") {
                                            setActiveTab("certifications");
                                        } else {
                                            onNavigate(item.target);
                                        }
                                    }}
                                    className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 transition cursor-pointer flex items-start justify-between gap-3 group"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                                                {item.title}
                                            </h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 pl-3 leading-snug">{item.sub}</p>
                                    </div>
                                    <span className="text-slate-400 group-hover:text-blue-600 text-xs font-bold transition">
                                        &rarr;
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* WIDGET 2: UPCOMING DISPATCHES */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.calendar} />
                            </svg>
                            <h3 className="text-sm font-extrabold text-slate-900">Upcoming Dispatch</h3>
                        </div>

                        {nextJob ? (
                            <div className="space-y-3">
                                <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-between">
                                    <span>{formatDateTime(nextJob.scheduled_date)}</span>
                                    <span className="text-[10px] font-bold text-blue-700 uppercase">Next Slot</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs space-y-1.5">
                                    <span className="font-extrabold text-blue-900 block text-xs">{nextJob.service_name}</span>
                                    <p className="text-slate-600 text-[11px]">
                                        Customer: <strong>{nextJob.client_name || "Valued Client"}</strong>
                                    </p>
                                    <p className="text-slate-500 text-[11px] truncate flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span>{nextJob.client_address || "Service Location"}</span>
                                    </p>
                                    <button
                                        onClick={() => onNavigate("bookings")}
                                        className="text-[11px] font-bold text-blue-700 hover:underline pt-1 block"
                                    >
                                        View Job Details &rarr;
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500">
                                    All scheduled jobs for today have been attended to.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* WIDGET 3: ANNOUNCEMENTS */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.megaphone} />
                                </svg>
                                <h3 className="text-sm font-extrabold text-slate-900">Announcements</h3>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">Notices</span>
                        </div>

                        {announcements.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 italic">No memos posted.</p>
                        ) : (
                            <div className="space-y-3">
                                {announcements.slice(0, 3).map((a) => (
                                    <div key={a.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                                        <h4 className="font-bold text-slate-900">{a.title}</h4>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{a.message}</p>
                                        <span className="text-[10px] text-slate-400 block pt-1">{formatDateTime(a.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* WIDGET 4: FIELD TEAM & DISPATCH */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-sm font-extrabold text-slate-900">Field Team On-Duty</h3>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold">Active</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            {teamMembers.map((t) => {
                                const initials = t.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("");
                                return (
                                    <div key={t.id} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                                                {initials}
                                            </div>
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-800 truncate w-full">
                                            {t.name}
                                        </span>
                                        <span className="text-[9px] text-slate-400 truncate w-full">
                                            {t.role}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
