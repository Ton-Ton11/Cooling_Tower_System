import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ShieldCheck,
    AlertTriangle,
    Clock,
    CheckCircle2,
    Upload,
    RefreshCw,
    FileCheck2,
    Calendar,
    Plus,
    Search,
} from "lucide-react";

export default function CertificateMonitoring({ addToast, onDataChanged }) {
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [data, setData] = useState({
        role_id: 5,
        is_manager: false,
        is_head_technician: false,
        is_technician: true,
        summary: {
            total_certificates: 0,
            active_compliant: 0,
            expiring_within_1_week: 0,
            pending_manager_verification: 0,
        },
        certifications: [],
        personal_certifications: [],
        technicians: [],
    });

    const [filterStatus, setFilterStatus] = useState("all"); // "all" | "submitted" | "expiring" | "active"
    const [searchQuery, setSearchQuery] = useState("");
    const [scopeTab, setScopeTab] = useState("all"); // "all" | "personal" (for Head Technician)

    // Technician 1-time submission state
    const [submittingCertObj, setSubmittingCertObj] = useState(null);
    const [techCertNumber, setTechCertNumber] = useState("");
    const [techNotes, setTechNotes] = useState("");
    const [techFile, setTechFile] = useState(null);
    const [techSubmitting, setTechSubmitting] = useState(false);

    // Manager verification & new expiration date state
    const [verifyingCertObj, setVerifyingCertObj] = useState(null);
    const [mgrVerifiedChecked, setMgrVerifiedChecked] = useState(false);
    const [mgrNewExpiryDate, setMgrNewExpiryDate] = useState("");
    const [mgrCertNumber, setMgrCertNumber] = useState("");
    const [mgrNotes, setMgrNotes] = useState("");
    const [mgrSubmitting, setMgrSubmitting] = useState(false);

    // Manager add new certificate state
    const [showAddForm, setShowAddForm] = useState(false);
    const [addingCert, setAddingCert] = useState(false);
    const [newCertForm, setNewCertForm] = useState({
        user_id: "",
        certification_name: "TESDA RAC Servicing (DOMRAC / Commercial) NC II",
        issuing_body: "TESDA Philippines",
        certificate_number: "",
        issued_date: new Date().toISOString().slice(0, 10),
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        notes: "",
    });

    const notify = useCallback(
        (msg, type = "success") => {
            if (addToast) addToast(msg, type);
        },
        [addToast],
    );

    const fetchCertifications = useCallback(
        async (showSpinner = true) => {
            try {
                if (showSpinner) setLoading(true);
                const res = await window.axios.get("/forecasting/certifications");
                if (res.data) {
                    setData(res.data);
                }
            } catch (err) {
                notify(
                    err?.response?.data?.message ||
                        "Unable to load technician certificate monitoring data.",
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [notify],
    );

    useEffect(() => {
        fetchCertifications(true);
    }, [fetchCertifications]);

    const handleTriggerForecastScan = async () => {
        try {
            setScanning(true);
            const res = await window.axios.post("/forecasting/evaluate-reminders");
            notify(
                res.data?.message ||
                    "1-week certificate forecasting validation & reminder scan completed.",
                "success",
            );
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            notify(
                err?.response?.data?.message || "Could not run reminder scan.",
                "error",
            );
        } finally {
            setScanning(false);
        }
    };

    const openTechnicianSubmitModal = (cert) => {
        setSubmittingCertObj(cert);
        setTechCertNumber(cert.certificate_number || "");
        setTechNotes("");
        setTechFile(null);
    };

    const handleTechnicianSubmitRenewal = async (e) => {
        e.preventDefault();
        if (!submittingCertObj) return;

        try {
            setTechSubmitting(true);
            const fd = new FormData();
            fd.append("action", "submit_renewal");
            fd.append("certificate_number", techCertNumber.trim());
            if (techNotes.trim()) {
                fd.append("submission_notes", techNotes.trim());
            }
            if (techFile) {
                fd.append("certificate_file", techFile);
            }

            const res = await window.axios.post(
                `/forecasting/certifications/${submittingCertObj.certification_id}/renew`,
                fd,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            );

            notify(
                res.data?.message ||
                    "Renewed certificate submitted (1/1)! Awaiting Manager verification.",
                "success",
            );
            setSubmittingCertObj(null);
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            const firstErr =
                err?.response?.data?.errors?.certificate_number?.[0] ||
                err?.response?.data?.message ||
                "Failed to submit renewed certificate.";
            notify(firstErr, "error");
        } finally {
            setTechSubmitting(false);
        }
    };

    const openManagerVerifyModal = (cert) => {
        setVerifyingCertObj(cert);
        setMgrVerifiedChecked(false);
        setMgrCertNumber(cert.certificate_number || "");
        setMgrNewExpiryDate(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10),
        );
        setMgrNotes("");
    };

    const handleManagerConfirmRenewal = async (e) => {
        e.preventDefault();
        if (!verifyingCertObj) return;

        if (!mgrVerifiedChecked) {
            notify(
                "Please check the verification box to confirm you have verified the technician's certificate.",
                "error",
            );
            return;
        }

        try {
            setMgrSubmitting(true);
            const res = await window.axios.patch(
                `/forecasting/certifications/${verifyingCertObj.certification_id}/renew`,
                {
                    action: "update_dates",
                    certificate_verified: true,
                    certificate_number: mgrCertNumber.trim() || undefined,
                    new_expiry_date: mgrNewExpiryDate,
                    verification_notes: mgrNotes.trim() || undefined,
                },
            );

            notify(
                res.data?.message ||
                    "Certificate verified and renewed! Forecasting countdown restarted.",
                "success",
            );
            setVerifyingCertObj(null);
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            const firstErr =
                err?.response?.data?.errors?.new_expiry_date?.[0] ||
                err?.response?.data?.message ||
                "Failed to verify and renew certificate.";
            notify(firstErr, "error");
        } finally {
            setMgrSubmitting(false);
        }
    };

    const handleManagerAddCertificate = async (e) => {
        e.preventDefault();
        try {
            setAddingCert(true);
            const res = await window.axios.post(
                "/forecasting/certifications",
                newCertForm,
            );
            notify(
                res.data?.message ||
                    "Technician certificate registered and forecasting activated.",
                "success",
            );
            setShowAddForm(false);
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            notify(
                err?.response?.data?.message ||
                    "Failed to register technician certificate.",
                "error",
            );
        } finally {
            setAddingCert(false);
        }
    };

    const baseList = useMemo(() => {
        if (data.is_head_technician && scopeTab === "personal") {
            return data.personal_certifications || [];
        }
        return data.certifications || [];
    }, [data, scopeTab]);

    const filteredCertificates = useMemo(() => {
        return baseList.filter((c) => {
            if (filterStatus === "submitted" && c.status !== "Renewal Submitted") {
                return false;
            }
            if (
                filterStatus === "expiring" &&
                !(c.days_until_expiry <= 7 && c.status !== "Renewal Submitted")
            ) {
                return false;
            }
            if (filterStatus === "active" && c.status !== "Active") {
                return false;
            }

            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const matchName = (c.technician_name || "")
                    .toLowerCase()
                    .includes(q);
                const matchCert = (c.certification_name || "")
                    .toLowerCase()
                    .includes(q);
                const matchNum = (c.certificate_number || "")
                    .toLowerCase()
                    .includes(q);
                const matchIssuer = (c.issuing_body || "")
                    .toLowerCase()
                    .includes(q);
                return matchName || matchCert || matchNum || matchIssuer;
            }

            return true;
        });
    }, [baseList, filterStatus, searchQuery]);

    const summary = data.summary || {};

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* HEADER BANNER */}
            <div className="bg-gradient-to-r from-[#0E1A33] via-[#14224A] to-[#1D3B7A] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/10 relative overflow-hidden">
                <div className="pointer-events-none absolute -top-20 right-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-sky-400/30 text-sky-200 text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="size-3.5 text-emerald-400" />
                            <span>1-Week Forecasting Certificate Validation</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Technician Certificate Status Monitoring
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                            {data.is_manager
                                ? "Forecasting automatically validates technician certificates and triggers reminders 1 week (7 days) before expiration. Verify technician-submitted renewals (1 submission allowed per cycle) and enter the new expiration date to restart the countdown."
                                : "Forecasting monitors your trade and safety certificates. When a certificate is 1 week (7 days) from expiration, a reminder triggers so you can submit your renewed certificate once for Manager verification."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        {(data.is_manager || data.is_head_technician) && (
                            <button
                                type="button"
                                disabled={scanning}
                                onClick={handleTriggerForecastScan}
                                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md transition flex items-center gap-1.5"
                            >
                                <RefreshCw
                                    className={`size-3.5 ${scanning ? "animate-spin" : ""}`}
                                />
                                <span>
                                    {scanning
                                        ? "Validating..."
                                        : "Run 1-Week Reminder Scan"}
                                </span>
                            </button>
                        )}
                        {data.is_manager && (
                            <button
                                type="button"
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="px-4 py-2.5 rounded-xl bg-white text-[#14224A] hover:bg-sky-50 text-xs font-extrabold shadow-md transition flex items-center gap-1.5"
                            >
                                <Plus className="size-3.5" />
                                <span>
                                    {showAddForm
                                        ? "Close Form"
                                        : "Register Certificate"}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Tracked Certificates
                    </p>
                    <p className="text-2xl font-black text-[#14224A] mt-1">
                        {summary.total_certificates ?? baseList.length}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Monitored by forecasting engine
                    </p>
                </div>

                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                        Active & Compliant
                    </p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">
                        {summary.active_compliant ?? 0}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                        More than 1 week (&gt; 7 days) left
                    </p>
                </div>

                <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/80 shadow-xs">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                        1-Week Reminder Triggered
                    </p>
                    <p className="text-2xl font-black text-amber-900 mt-1">
                        {summary.expiring_within_1_week ?? 0}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                        Expiring in &le; 7 days (Tech must submit)
                    </p>
                </div>

                <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-xs">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">
                        Awaiting Manager Verification
                    </p>
                    <p className="text-2xl font-black text-blue-900 mt-1">
                        {summary.pending_manager_verification ?? 0}
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                        Submitted (1/1) • Ready for new expiry
                    </p>
                </div>
            </div>

            {/* MANAGER ADD NEW CERTIFICATE FORM */}
            {data.is_manager && showAddForm && (
                <form
                    onSubmit={handleManagerAddCertificate}
                    className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-md space-y-4 text-xs"
                >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-sm font-extrabold text-[#14224A]">
                                Register New Technician Certification
                            </h3>
                            <p className="text-xs text-slate-500">
                                Forecasting will automatically monitor the expiration date and trigger a reminder 1 week (7 days) prior.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="text-slate-400 hover:text-slate-700 font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Technician
                            </label>
                            <select
                                required
                                value={newCertForm.user_id}
                                onChange={(e) =>
                                    setNewCertForm({
                                        ...newCertForm,
                                        user_id: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                            >
                                <option value="">Select Technician...</option>
                                {(data.technicians || []).map((t) => (
                                    <option key={t.user_id} value={t.user_id}>
                                        {t.name} ({t.role_label})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Certification Title
                            </label>
                            <input
                                type="text"
                                required
                                value={newCertForm.certification_name}
                                onChange={(e) =>
                                    setNewCertForm({
                                        ...newCertForm,
                                        certification_name: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Issuing Body
                            </label>
                            <input
                                type="text"
                                required
                                value={newCertForm.issuing_body}
                                onChange={(e) =>
                                    setNewCertForm({
                                        ...newCertForm,
                                        issuing_body: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Certificate Number
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. TESDA-NC2-2026-8812"
                                value={newCertForm.certificate_number}
                                onChange={(e) =>
                                    setNewCertForm({
                                        ...newCertForm,
                                        certificate_number: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Issued Date
                            </label>
                            <input
                                type="date"
                                required
                                value={newCertForm.issued_date}
                                onChange={(e) =>
                                    setNewCertForm({
                                        ...newCertForm,
                                        issued_date: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Expiration Date
                            </label>
                            <input
                                type="date"
                                required
                                value={newCertForm.expiry_date}
                                onChange={(e) =>
                                    setNewCertForm({
                                        ...newCertForm,
                                        expiry_date: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addingCert}
                            className="px-5 py-2 rounded-xl bg-[#14224A] hover:bg-blue-700 text-white font-bold shadow-xs"
                        >
                            {addingCert
                                ? "Saving..."
                                : "Save & Activate Forecasting"}
                        </button>
                    </div>
                </form>
            )}

            {/* FILTER BAR */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {data.is_head_technician && (
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-slate-200">
                            <button
                                type="button"
                                onClick={() => setScopeTab("all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                                    scopeTab === "all"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                All Crew ({data.certifications?.length || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => setScopeTab("personal")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                                    scopeTab === "personal"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                My Certificates (
                                {data.personal_certifications?.length || 0})
                            </button>
                        </div>
                    )}

                    {[
                        { id: "all", label: "All Certificates" },
                        {
                            id: "submitted",
                            label: "Submitted for Verification",
                        },
                        { id: "expiring", label: "1-Week Reminder (≤ 7 Days)" },
                        { id: "active", label: "Active (> 7 Days)" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                                filterStatus === tab.id
                                    ? "bg-[#14224A] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search technician, cert #, or issuer..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                    />
                </div>
            </div>

            {/* TECHNICIAN SINGLE-SUBMISSION MODAL / PANEL */}
            {submittingCertObj && (
                <div className="bg-amber-50/90 rounded-3xl p-6 border-2 border-amber-300 shadow-lg space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-amber-200 pb-3">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 text-[10px] font-extrabold uppercase">
                                <AlertTriangle className="size-3" />
                                1-Week Forecasting Reminder • Single Submission (1/1)
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 mt-1">
                                Submit Renewed Certificate —{" "}
                                {submittingCertObj.certification_name}
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                                You can only submit your renewed certificate{" "}
                                <strong>once</strong> per renewal cycle. After submission, the Manager will verify your certificate, confirm the renewal status, and enter the new expiration date.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSubmittingCertObj(null)}
                            className="text-slate-500 hover:text-slate-900 font-bold text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    <form
                        onSubmit={handleTechnicianSubmitRenewal}
                        className="space-y-4 text-xs"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Renewed Certificate Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={techCertNumber}
                                    onChange={(e) =>
                                        setTechCertNumber(e.target.value)
                                    }
                                    placeholder="Enter new certificate number (e.g. TESDA-NC2-2026-9910)"
                                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Attach Renewed Certificate Proof (Optional Image/PDF)
                                </label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    onChange={(e) =>
                                        setTechFile(e.target.files?.[0] || null)
                                    }
                                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-1">
                                Submission Remarks / Issuing Details (Optional)
                            </label>
                            <input
                                type="text"
                                value={techNotes}
                                onChange={(e) => setTechNotes(e.target.value)}
                                placeholder="e.g. Renewed at TESDA Zamboanga Regional Assessment Center"
                                className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setSubmittingCertObj(null)}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={techSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm flex items-center gap-1.5"
                            >
                                <Upload className="size-3.5" />
                                <span>
                                    {techSubmitting
                                        ? "Submitting..."
                                        : "Submit Renewed Certificate (1/1)"}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MANAGER VERIFICATION & NEW EXPIRATION DATE PANEL */}
            {data.is_manager && verifyingCertObj && (
                <div className="bg-indigo-50/90 rounded-3xl p-6 border-2 border-indigo-300 shadow-lg space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-indigo-200 pb-3">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-200/80 text-indigo-950 text-[10px] font-extrabold uppercase">
                                <FileCheck2 className="size-3" />
                                Manager Certificate Verification & Countdown Reset
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 mt-1">
                                Verify & Confirm Renewal —{" "}
                                {verifyingCertObj.technician_name || "Technician"} (
                                {verifyingCertObj.certification_name})
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Verify the technician&apos;s submitted certificate details below, confirm the renewal status, and enter the{" "}
                                <strong>new expiration date</strong> so the forecasting countdown starts over again.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVerifyingCertObj(null)}
                            className="text-slate-500 hover:text-slate-900 font-bold text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {verifyingCertObj.notes && (
                        <div className="p-3.5 rounded-2xl bg-white border border-indigo-200 text-xs text-slate-700">
                            <span className="font-extrabold text-indigo-900 block mb-0.5">
                                Technician Submission Record:
                            </span>
                            {verifyingCertObj.notes}
                        </div>
                    )}

                    <form
                        onSubmit={handleManagerConfirmRenewal}
                        className="space-y-4 text-xs"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Verified Certificate Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={mgrCertNumber}
                                    onChange={(e) =>
                                        setMgrCertNumber(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    New Expiration Date (Restarts Countdown) *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={mgrNewExpiryDate}
                                    onChange={(e) =>
                                        setMgrNewExpiryDate(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-1">
                                Manager Verification Notes (Optional)
                            </label>
                            <input
                                type="text"
                                value={mgrNotes}
                                onChange={(e) => setMgrNotes(e.target.value)}
                                placeholder="e.g. Verified authentic TESDA certificate and official receipt."
                                className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs"
                            />
                        </div>

                        <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-indigo-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={mgrVerifiedChecked}
                                onChange={(e) =>
                                    setMgrVerifiedChecked(e.target.checked)
                                }
                                className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500 size-4"
                            />
                            <span className="font-bold text-slate-800">
                                I have carefully verified the technician&apos;s renewed certificate and confirm activating the new expiration countdown.
                            </span>
                        </label>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setVerifyingCertObj(null)}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mgrSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="size-4" />
                                <span>
                                    {mgrSubmitting
                                        ? "Confirming..."
                                        : "Confirm Renew Status & Restart Countdown"}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CERTIFICATES LIST */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                        Loading technician certificate forecasting records...
                    </div>
                ) : filteredCertificates.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                        No technician certificates match the current filter.
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {filteredCertificates.map((cert) => {
                            const daysLeft = Number(
                                cert.days_until_expiry ?? 99,
                            );
                            const isWithinOneWeek = daysLeft <= 7;
                            const isSubmitted =
                                cert.status === "Renewal Submitted";

                            return (
                                <div
                                    key={cert.certification_id}
                                    className={`p-5 rounded-2xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                                        isSubmitted
                                            ? "bg-blue-50/50 border-blue-200"
                                            : isWithinOneWeek
                                            ? "bg-amber-50/50 border-amber-200"
                                            : "bg-slate-50/60 border-slate-200/80"
                                    }`}
                                >
                                    <div className="space-y-2 max-w-3xl">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {cert.technician_name && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#14224A] text-white">
                                                    {cert.technician_name}
                                                    {cert.technician_role
                                                        ? ` • ${cert.technician_role}`
                                                        : ""}
                                                </span>
                                            )}

                                            <h3 className="text-sm font-extrabold text-slate-900">
                                                {cert.certification_name}
                                            </h3>

                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                    isSubmitted
                                                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                                                        : daysLeft < 0 ||
                                                          cert.status ===
                                                              "Critical"
                                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                                        : isWithinOneWeek
                                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                }`}
                                            >
                                                {isSubmitted
                                                    ? "Renewal Submitted (1/1)"
                                                    : isWithinOneWeek &&
                                                      daysLeft >= 0
                                                    ? `1-Week Reminder (${daysLeft}d left)`
                                                    : cert.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600">
                                            <span>
                                                Issuer:{" "}
                                                <strong className="text-slate-800">
                                                    {cert.issuing_body}
                                                </strong>
                                            </span>
                                            <span>
                                                Certificate #:{" "}
                                                <strong className="text-slate-800">
                                                    {cert.certificate_number ||
                                                        "On File"}
                                                </strong>
                                            </span>
                                            {cert.issued_date && (
                                                <span>
                                                    Issued:{" "}
                                                    <strong>
                                                        {cert.issued_date}
                                                    </strong>
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="size-3.5 text-slate-400" />
                                                Expires:{" "}
                                                <strong className="text-slate-900">
                                                    {cert.expiry_date}
                                                </strong>
                                            </span>
                                        </div>

                                        <div className="text-xs text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80">
                                            {cert.action_notice}
                                        </div>

                                        {cert.notes && (
                                            <p className="text-[11px] text-slate-500 italic">
                                                {cert.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* RIGHT SIDE: COUNTDOWN & ROLE-SPECIFIC ACTIONS */}
                                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2.5 shrink-0">
                                        <div className="text-left lg:text-right">
                                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                                                <Clock className="size-3.5 text-indigo-600" />
                                                <span>
                                                    {daysLeft < 0
                                                        ? `Expired ${Math.abs(daysLeft)} days ago`
                                                        : `${daysLeft} ${
                                                              daysLeft === 1
                                                                  ? "day"
                                                                  : "days"
                                                          } remaining`}
                                                </span>
                                            </div>
                                            <span className="block text-[10px] font-semibold text-slate-400">
                                                1-Week Reminder Window: &le; 7 days
                                            </span>
                                        </div>

                                        {/* TECHNICIAN ACTIONS: Submit once when <= 7 days */}
                                        {data.is_technician && !data.is_manager && (
                                            <div>
                                                {isSubmitted ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 text-xs font-extrabold">
                                                        <CheckCircle2 className="size-3.5 text-blue-700" />
                                                        <span>
                                                            Submitted (1/1) • Awaiting Manager Verification
                                                        </span>
                                                    </span>
                                                ) : isWithinOneWeek ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openTechnicianSubmitModal(
                                                                cert,
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1.5"
                                                    >
                                                        <Upload className="size-3.5" />
                                                        <span>
                                                            Submit Renewed Certificate (1/1)
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                                        <ShieldCheck className="size-3.5 text-emerald-600" />
                                                        <span>
                                                            Validated • Reminder at 7 Days Left
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* MANAGER ACTIONS: Verify & Enter New Expiration Date */}
                                        {data.is_manager && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openManagerVerifyModal(
                                                            cert,
                                                        )
                                                    }
                                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs flex items-center gap-1.5 ${
                                                        isSubmitted
                                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                            : "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                    }`}
                                                >
                                                    <FileCheck2 className="size-3.5" />
                                                    <span>
                                                        {isSubmitted
                                                            ? "Verify Submitted Cert & Set New Expiry"
                                                            : "Verify & Set New Expiration"}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
