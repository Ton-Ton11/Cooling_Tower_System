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
    Info,
    ChevronDown,
    ChevronUp,
    Award,
    FileText,
    Bell,
} from "lucide-react";

export default function CertificateMonitoring({ addToast, onDataChanged }) {
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [remindingId, setRemindingId] = useState(null);
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

    // Technician submission state
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
                        "Unable to load certificate monitoring records.",
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
                    "Certificate expiration scan completed.",
                "success",
            );
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            notify(
                err?.response?.data?.message || "Could not complete reminder scan.",
                "error",
            );
        } finally {
            setScanning(false);
        }
    };

    const handleRemindCrewMember = async (cert) => {
        try {
            setRemindingId(cert.certification_id);
            const res = await window.axios.post(
                `/forecasting/certifications/${cert.certification_id}/remind`
            );
            notify(
                res.data?.message ||
                    `Reminder sent to ${cert.technician_name || "crew member"}.`,
                "success",
            );
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            notify(
                err?.response?.data?.message || "Failed to send reminder to crew member.",
                "error",
            );
        } finally {
            setRemindingId(null);
        }
    };

    const openTechnicianSubmitModal = (cert) => {
        if (data.is_head_technician && Number(cert.user_id) !== Number(data.user_id)) {
            notify(
                "Head Technicians can only view and remind crew members. Only the crew member can submit their renewal credentials.",
                "error",
            );
            return;
        }
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
                    "Renewal submitted! Awaiting manager verification.",
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
                "Please confirm that you have verified the renewed certificate.",
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
                    "Certificate verified and expiry updated.",
                "success",
            );
            setVerifyingCertObj(null);
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            const firstErr =
                err?.response?.data?.errors?.new_expiry_date?.[0] ||
                err?.response?.data?.message ||
                "Failed to update certificate.";
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
                    "Technician certificate registered successfully.",
                "success",
            );
            setShowAddForm(false);
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            notify(
                err?.response?.data?.message ||
                    "Failed to register certificate.",
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
        <div className="max-w-7xl mx-auto space-y-5">
            {/* ══════════════════════════════════════════════════════════════════
                HEADER BANNER (POLISHED, MINIMAL LABELS)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-[#0F1B35] via-[#16274E] to-[#1F3E7C] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-white/10 relative overflow-hidden">
                <div className="pointer-events-none absolute -top-24 right-10 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-sky-400/30 text-sky-200 text-[11px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="size-3.5 text-emerald-400" />
                            <span>Trade & Safety Compliance</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Certificate Monitoring
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                            {data.is_manager
                                ? "Monitor team certifications, review renewal submissions, and verify updated credentials to maintain compliance."
                                : data.is_head_technician
                                ? "Monitor crew trade and safety certifications and send renewal reminders. Crew members must submit their own renewal credentials for manager review."
                                : "Keep track of your professional safety credentials and trade licenses. When your certificate is within 7 days of expiration, upload your renewal for manager verification."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowGuide(!showGuide)}
                            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <Info className="size-3.5 text-sky-300" />
                            <span>Status Guide</span>
                            {showGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>

                        {(data.is_manager || data.is_head_technician) && (
                            <button
                                type="button"
                                disabled={scanning}
                                onClick={handleTriggerForecastScan}
                                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <RefreshCw
                                    className={`size-3.5 ${scanning ? "animate-spin" : ""}`}
                                />
                                <span>{scanning ? "Scanning..." : "Check Due Dates"}</span>
                            </button>
                        )}

                        {data.is_manager && (
                            <button
                                type="button"
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="px-4 py-2.5 rounded-xl bg-white text-[#0F1B35] hover:bg-sky-50 text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus className="size-3.5 text-blue-600" />
                                <span>{showAddForm ? "Close Form" : "Add Certificate"}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                USER-FRIENDLY STATUS GUIDE (EXPLAINS TERMINOLOGIES CLEARLY)
            ══════════════════════════════════════════════════════════════════ */}
            {showGuide && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
                        <div className="flex items-center gap-2">
                            <Info className="size-4 text-blue-600" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Understanding Certificate Statuses
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowGuide(false)}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            Hide Guide
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-extrabold text-emerald-900">Active</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                                Valid with more than 7 days left. No action is required.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-xs font-extrabold text-amber-900">Expiring Soon</span>
                            </div>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                7 days or less remaining. The upload renewal button is now active.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs font-extrabold text-blue-900">Pending Review</span>
                            </div>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                                Renewal has been submitted and is awaiting manager verification.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-xs font-extrabold text-rose-900">Expired</span>
                            </div>
                            <p className="text-[11px] text-rose-700 leading-relaxed">
                                Past the expiration date. Submit your renewed credential immediately.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                KPI SUMMARY CARDS (MINIMAL LABELS, CLEAN METRICS)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Total Tracked
                        </p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">
                            {summary.total_certificates ?? baseList.length}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {data.is_technician && !data.is_manager ? "Your assigned credentials" : "Total crew certificates"}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Award className="size-5" />
                    </div>
                </div>

                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                            Active & Valid
                        </p>
                        <p className="text-2xl font-black text-emerald-900 mt-0.5">
                            {summary.active_compliant ?? 0}
                        </p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                            More than 7 days left
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShieldCheck className="size-5" />
                    </div>
                </div>

                <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            Expiring Soon
                        </p>
                        <p className="text-2xl font-black text-amber-900 mt-0.5">
                            {summary.expiring_within_1_week ?? 0}
                        </p>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                            7 days or less remaining
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Clock className="size-5" />
                    </div>
                </div>

                <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                            Pending Review
                        </p>
                        <p className="text-2xl font-black text-blue-900 mt-0.5">
                            {summary.pending_manager_verification ?? 0}
                        </p>
                        <p className="text-[10px] text-blue-700 mt-0.5">
                            Awaiting manager check
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileCheck2 className="size-5" />
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                MANAGER ADD NEW CERTIFICATE FORM (IF EXPANDED)
            ══════════════════════════════════════════════════════════════════ */}
            {data.is_manager && showAddForm && (
                <form
                    onSubmit={handleManagerAddCertificate}
                    className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-md space-y-4 text-xs"
                >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-sm font-extrabold text-[#0F1B35]">
                                Register Technician Certificate
                            </h3>
                            <p className="text-xs text-slate-500">
                                The system will monitor the expiration date and trigger reminders 7 days prior.
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
                                Certificate Title
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
                                Issuing Agency
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
                                Date Issued
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
                            className="px-5 py-2 rounded-xl bg-[#0F1B35] hover:bg-blue-700 text-white font-bold shadow-xs"
                        >
                            {addingCert ? "Saving..." : "Save Certificate"}
                        </button>
                    </div>
                </form>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FILTER & SEARCH TOOLBAR (MINIMAL LABELS, CLEAN TABS)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {data.is_head_technician && (
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-slate-200">
                            <button
                                type="button"
                                onClick={() => setScopeTab("all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    scopeTab === "personal"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                My Credentials ({data.personal_certifications?.length || 0})
                            </button>
                        </div>
                    )}

                    {[
                        { id: "all", label: "All" },
                        { id: "active", label: "Active" },
                        { id: "expiring", label: "Expiring Soon" },
                        { id: "submitted", label: "Pending Review" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                filterStatus === tab.id
                                    ? "bg-[#0F1B35] text-white shadow-xs"
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
                        placeholder="Search certificate, number, or issuer..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-slate-50/50"
                    />
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TECHNICIAN RENEWAL SUBMISSION PANEL (CLEAN & SIMPLE)
            ══════════════════════════════════════════════════════════════════ */}
            {submittingCertObj && (
                <div className="bg-amber-50/90 rounded-3xl p-6 border-2 border-amber-300 shadow-lg space-y-4 animate-fadeIn">
                    <div className="flex items-start justify-between gap-4 border-b border-amber-200/80 pb-3">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                                <AlertTriangle className="size-3" />
                                <span>Renewal Window Open</span>
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 mt-1">
                                Submit Certificate Renewal: {submittingCertObj.certification_name}
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Enter your updated certificate number and optional proof. Your manager will verify and activate the new expiration date.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSubmittingCertObj(null)}
                            className="text-slate-400 hover:text-slate-800 font-bold text-sm cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleTechnicianSubmitRenewal} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    New Certificate Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={techCertNumber}
                                    onChange={(e) => setTechCertNumber(e.target.value)}
                                    placeholder="e.g. TESDA-NC2-2026-9910"
                                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Certificate File (Optional Image or PDF)
                                </label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    onChange={(e) => setTechFile(e.target.files?.[0] || null)}
                                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-1">
                                Remarks / Notes (Optional)
                            </label>
                            <input
                                type="text"
                                value={techNotes}
                                onChange={(e) => setTechNotes(e.target.value)}
                                placeholder="e.g. Renewed at TESDA Regional Center"
                                className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setSubmittingCertObj(null)}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={techSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                                <Upload className="size-3.5" />
                                <span>{techSubmitting ? "Submitting..." : "Submit for Verification"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MANAGER VERIFICATION MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {data.is_manager && verifyingCertObj && (
                <div className="bg-indigo-50/90 rounded-3xl p-6 border-2 border-indigo-300 shadow-lg space-y-4 animate-fadeIn">
                    <div className="flex items-start justify-between gap-4 border-b border-indigo-200/80 pb-3">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-950 text-[10px] font-extrabold uppercase tracking-wider">
                                <FileCheck2 className="size-3" />
                                <span>Manager Review & Countdown Reset</span>
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 mt-1">
                                Verify Renewal: {verifyingCertObj.technician_name || "Technician"} ({verifyingCertObj.certification_name})
                            </h3>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Check the submitted renewal information and enter the new expiration date.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVerifyingCertObj(null)}
                            className="text-slate-400 hover:text-slate-800 font-bold text-sm cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    {verifyingCertObj.notes && (
                        <div className="p-3.5 rounded-2xl bg-white border border-indigo-200 text-xs text-slate-700">
                            <span className="font-extrabold text-indigo-900 block mb-0.5">
                                Technician Submission Notes:
                            </span>
                            {verifyingCertObj.notes}
                        </div>
                    )}

                    <form onSubmit={handleManagerConfirmRenewal} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Verified Certificate Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={mgrCertNumber}
                                    onChange={(e) => setMgrCertNumber(e.target.value)}
                                    className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    New Expiration Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={mgrNewExpiryDate}
                                    onChange={(e) => setMgrNewExpiryDate(e.target.value)}
                                    className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-1">
                                Verification Notes (Optional)
                            </label>
                            <input
                                type="text"
                                value={mgrNotes}
                                onChange={(e) => setMgrNotes(e.target.value)}
                                placeholder="e.g. Verified valid certificate copy"
                                className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs"
                            />
                        </div>

                        <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-indigo-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={mgrVerifiedChecked}
                                onChange={(e) => setMgrVerifiedChecked(e.target.checked)}
                                className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500 size-4"
                            />
                            <span className="font-bold text-slate-800">
                                I confirm this renewed certificate is authentic and approved.
                            </span>
                        </label>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setVerifyingCertObj(null)}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mgrSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                                <CheckCircle2 className="size-4" />
                                <span>{mgrSubmitting ? "Saving..." : "Approve & Update Expiry"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                CERTIFICATES LIST (ENHANCED CARD DESIGN & MINIMAL LABELS)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                        Loading certificates...
                    </div>
                ) : filteredCertificates.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                        No certificates found matching your criteria.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCertificates.map((cert) => {
                            const daysLeft = Number(cert.days_until_expiry ?? 99);
                            const isWithinOneWeek = daysLeft <= 7;
                            const isSubmitted = cert.status === "Renewal Submitted";
                            const isExpired = daysLeft < 0;

                            // Minimal, friendly badge definitions
                            let badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                            let badgeText = "Active";

                            if (isSubmitted) {
                                badgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
                                badgeText = "Pending Review";
                            } else if (isExpired) {
                                badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
                                badgeText = "Expired";
                            } else if (isWithinOneWeek) {
                                badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                                badgeText = `Expiring Soon (${daysLeft}d)`;
                            }

                            return (
                                <div
                                    key={cert.certification_id}
                                    className={`p-5 rounded-2xl border transition hover:shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                                        isSubmitted
                                            ? "bg-blue-50/30 border-blue-200/80"
                                            : isWithinOneWeek
                                            ? "bg-amber-50/30 border-amber-200/80"
                                            : "bg-white border-slate-200/80 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="space-y-2.5 max-w-3xl">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {cert.technician_name && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0F1B35] text-white">
                                                    {cert.technician_name}
                                                    {cert.technician_role ? ` • ${cert.technician_role}` : ""}
                                                </span>
                                            )}

                                            <h3 className="text-sm font-extrabold text-slate-900">
                                                {cert.certification_name}
                                            </h3>

                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeStyle}`}
                                            >
                                                {badgeText}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3.5 flex-wrap text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Award className="size-3.5 text-slate-400 shrink-0" />
                                                <span>Issuer:</span>
                                                <strong className="text-slate-700 font-semibold">{cert.issuing_body}</strong>
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <FileText className="size-3.5 text-slate-400 shrink-0" />
                                                <span>License / ID:</span>
                                                <strong className="text-slate-700 font-semibold">{cert.certificate_number || "On File"}</strong>
                                            </span>
                                            {cert.issued_date && (
                                                <span>
                                                    Issued: <strong className="text-slate-700 font-semibold">{cert.issued_date}</strong>
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="size-3.5 text-slate-400 shrink-0" />
                                                <span>Expires:</span>
                                                <strong className="text-slate-900 font-bold">{cert.expiry_date}</strong>
                                            </span>
                                        </div>

                                        <div className="text-[11px] text-slate-600 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/60 leading-relaxed">
                                            {cert.action_notice}
                                        </div>

                                        {cert.notes && (
                                            <p className="text-[11px] text-slate-400 italic">
                                                Note: {cert.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* RIGHT SIDE: COUNTDOWN & ACTION BUTTON */}
                                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2.5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                                        <div className="text-left lg:text-right">
                                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                                                <Clock className={`size-3.5 ${isExpired ? "text-rose-600" : isWithinOneWeek ? "text-amber-600" : "text-slate-600"}`} />
                                                <span>
                                                    {isExpired
                                                        ? `Expired ${Math.abs(daysLeft)}d ago`
                                                        : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`}
                                                </span>
                                            </div>
                                            <span className="block text-[10px] text-slate-400 font-medium">
                                                Renewal opens 7d prior
                                            </span>
                                        </div>

                                        {/* HEAD TECHNICIAN VIEWING CREW: VIEW & REMIND ONLY */}
                                        {data.is_head_technician && Number(cert.user_id) !== Number(data.user_id) && !data.is_manager && (
                                            <div>
                                                {isSubmitted ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                                                        <CheckCircle2 className="size-3.5 text-blue-600" />
                                                        <span>Pending Manager Review</span>
                                                    </span>
                                                ) : isWithinOneWeek || isExpired ? (
                                                    <div className="flex flex-col items-start sm:items-end gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={remindingId === cert.certification_id}
                                                            onClick={() => handleRemindCrewMember(cert)}
                                                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <Bell className="size-3.5" />
                                                            <span>
                                                                {remindingId === cert.certification_id ? "Sending..." : "Remind Crew"}
                                                            </span>
                                                        </button>
                                                        {cert.last_reminded_at && (
                                                            <span className="text-[10px] text-slate-400">
                                                                Reminded: {cert.last_reminded_at}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-start sm:items-end gap-1">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                                                            <ShieldCheck className="size-3.5 text-emerald-600" />
                                                            <span>Valid (Monitoring)</span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={remindingId === cert.certification_id}
                                                            onClick={() => handleRemindCrewMember(cert)}
                                                            className="text-[10.5px] text-blue-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer pt-0.5"
                                                        >
                                                            <Bell className="size-3" />
                                                            <span>Send Reminder</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* TECHNICIAN OWN CERTIFICATE ACTION: UPLOAD RENEWAL */}
                                        {data.is_technician && !data.is_manager && (!data.is_head_technician || Number(cert.user_id) === Number(data.user_id)) && (
                                            <div>
                                                {isSubmitted ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                                                        <CheckCircle2 className="size-3.5 text-blue-600" />
                                                        <span>Pending Manager Review</span>
                                                    </span>
                                                ) : isWithinOneWeek || isExpired ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openTechnicianSubmitModal(cert)}
                                                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Upload className="size-3.5" />
                                                        <span>Upload Renewal</span>
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                                        <ShieldCheck className="size-3.5 text-emerald-600" />
                                                        <span>Valid & Compliant</span>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* MANAGER ACTION */}
                                        {data.is_manager && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => openManagerVerifyModal(cert)}
                                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                                        isSubmitted
                                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                            : "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                    }`}
                                                >
                                                    <FileCheck2 className="size-3.5" />
                                                    <span>
                                                        {isSubmitted
                                                            ? "Review & Set Expiry"
                                                            : "Update Expiry"}
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
