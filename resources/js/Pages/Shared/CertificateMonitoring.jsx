import React, { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
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
    XCircle,
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
            expired: 0,
        },
        certifications: [],
        personal_certifications: [],
        technicians: [],
    });

    const [filterStatus, setFilterStatus] = useState("all"); // "all" | "active" | "expiring" | "submitted" | "expired"
    const [searchQuery, setSearchQuery] = useState("");
    const [scopeTab, setScopeTab] = useState("all"); // "all" | "personal" (for Head Technician)

    // Technician submission state
    const [submittingCertObj, setSubmittingCertObj] = useState(null);
    const [techCertNumber, setTechCertNumber] = useState("");
    const [techNotes, setTechNotes] = useState("");
    const [techFile, setTechFile] = useState(null);
    const [techSubmitting, setTechSubmitting] = useState(false);
    const [showTechConfirmModal, setShowTechConfirmModal] = useState(false);

    // Manager verification & new expiration date state
    const [verifyingCertObj, setVerifyingCertObj] = useState(null);
    const [mgrActionTab, setMgrActionTab] = useState("approve"); // "approve" | "decline"
    const [mgrVerifiedChecked, setMgrVerifiedChecked] = useState(false);
    const [mgrNewExpiryDate, setMgrNewExpiryDate] = useState("");
    const [mgrCertNumber, setMgrCertNumber] = useState("");
    const [mgrNotes, setMgrNotes] = useState("");
    const [mgrSubmitting, setMgrSubmitting] = useState(false);
    const [mgrDeclineReason, setMgrDeclineReason] = useState("");
    const [mgrDeclining, setMgrDeclining] = useState(false);
    const [showMgrConfirmModal, setShowMgrConfirmModal] = useState(false);

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
        if (submittingCertObj?.certification_id === cert.certification_id) {
            setSubmittingCertObj(null);
            setShowTechConfirmModal(false);
            return;
        }
        if (data.is_head_technician && Number(cert.user_id) !== Number(data.user_id)) {
            notify(
                "Head Technicians can only view and remind crew members. Only the crew member can submit their renewal credentials.",
                "error",
            );
            return;
        }
        setSubmittingCertObj(cert);
        setShowTechConfirmModal(false);
        setTechCertNumber(cert.certificate_number || "");
        setTechNotes("");
        setTechFile(null);
    };

    const handleTechnicianSubmitClick = (e) => {
        e.preventDefault();
        if (!submittingCertObj) return;

        if (!techCertNumber.trim()) {
            notify("Please enter your renewed certificate number.", "error");
            return;
        }

        if (!techFile) {
            notify(
                "Please attach a clear photo or document copy of your renewed certificate (JPG, PNG, or PDF).",
                "error",
            );
            return;
        }

        setShowTechConfirmModal(true);
    };

    const executeTechnicianSubmitRenewal = async () => {
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
            setShowTechConfirmModal(false);
            setSubmittingCertObj(null);
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            const firstErr =
                err?.response?.data?.errors?.certificate_file?.[0] ||
                err?.response?.data?.errors?.certificate_number?.[0] ||
                err?.response?.data?.message ||
                "Failed to submit renewed certificate.";
            notify(firstErr, "error");
        } finally {
            setTechSubmitting(false);
        }
    };

    const openManagerVerifyModal = (cert) => {
        if (verifyingCertObj?.certification_id === cert.certification_id) {
            setVerifyingCertObj(null);
            setShowMgrConfirmModal(false);
            return;
        }
        setVerifyingCertObj(cert);
        setShowMgrConfirmModal(false);
        setMgrActionTab("approve");
        setMgrDeclineReason("");
        setMgrVerifiedChecked(true);
        setMgrCertNumber(cert.certificate_number || "");
        const baseDate = cert.expiry_date_raw ? new Date(cert.expiry_date_raw) : new Date();
        const nextYear = new Date(baseDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const today = new Date();
        const validNextYear = nextYear > today ? nextYear : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        setMgrNewExpiryDate(
            !isNaN(validNextYear.getTime())
                ? validNextYear.toISOString().slice(0, 10)
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10),
        );
        setMgrNotes("");
    };

    const handleManagerDeclineRenewal = async (e) => {
        e.preventDefault();
        if (!verifyingCertObj) return;

        if (!mgrDeclineReason.trim()) {
            notify(
                "Please enter the reason for declining this certificate submission so the technician knows what to correct.",
                "error",
            );
            return;
        }

        try {
            setMgrDeclining(true);
            const res = await window.axios.patch(
                `/forecasting/certifications/${verifyingCertObj.certification_id}/renew`,
                {
                    action: "decline_submission",
                    decline_reason: mgrDeclineReason.trim(),
                },
            );

            notify(
                res.data?.message ||
                    "Certificate renewal submission has been declined. The technician can now resubmit with valid details.",
                "success",
            );
            setVerifyingCertObj(null);
            setMgrDeclineReason("");
            await fetchCertifications(false);
            if (onDataChanged) onDataChanged();
        } catch (err) {
            const firstErr =
                err?.response?.data?.errors?.decline_reason?.[0] ||
                err?.response?.data?.message ||
                "Failed to decline submission.";
            notify(firstErr, "error");
        } finally {
            setMgrDeclining(false);
        }
    };

    const handleManagerSubmitClick = (e) => {
        e.preventDefault();
        if (!verifyingCertObj) return;

        if (!mgrVerifiedChecked) {
            notify(
                "Please confirm that you have verified the renewed certificate.",
                "error",
            );
            return;
        }

        if (!mgrCertNumber.trim()) {
            notify("Please enter the certificate number.", "error");
            return;
        }

        if (!mgrNewExpiryDate) {
            notify("Please select the new expiration date.", "error");
            return;
        }

        setShowMgrConfirmModal(true);
    };

    const executeManagerConfirmRenewal = async () => {
        if (!verifyingCertObj) return;

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
            setShowMgrConfirmModal(false);
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

    const counts = useMemo(() => {
        let active = 0;
        let expiring = 0;
        let submitted = 0;
        let expired = 0;

        baseList.forEach((c) => {
            const daysLeft = Number(c.days_until_expiry ?? 99);
            const isSubmitted = c.status === "Renewal Submitted";
            const isDeclined = c.status === "Renewal Declined";
            const isExpired = (daysLeft < 0 || c.status === "Expired") && !isSubmitted;
            const isExpiringSoon = (daysLeft <= 7 && daysLeft >= 0 && !isSubmitted && !isExpired) || (isDeclined && !isExpired);

            if (isSubmitted) {
                submitted++;
            } else if (isExpired) {
                expired++;
            } else if (isExpiringSoon) {
                expiring++;
            } else {
                active++;
            }
        });

        return {
            all: baseList.length,
            active,
            expiring,
            submitted,
            expired,
        };
    }, [baseList]);

    const filteredCertificates = useMemo(() => {
        return baseList.filter((c) => {
            const daysLeft = Number(c.days_until_expiry ?? 99);
            const isSubmitted = c.status === "Renewal Submitted";
            const isDeclined = c.status === "Renewal Declined";
            const isExpired = (daysLeft < 0 || c.status === "Expired") && !isSubmitted;
            const isExpiringSoon = (daysLeft <= 7 && daysLeft >= 0 && !isSubmitted && !isExpired) || (isDeclined && !isExpired);
            const isActive = !isSubmitted && !isExpired && !isExpiringSoon && !isDeclined;

            if (filterStatus === "submitted" && !isSubmitted) {
                return false;
            }
            if (filterStatus === "expiring" && !isExpiringSoon) {
                return false;
            }
            if (filterStatus === "active" && !isActive) {
                return false;
            }
            if (filterStatus === "expired" && !isExpired) {
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                                7 days or less remaining. Upload renewal button unlocks.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs font-extrabold text-blue-900">Pending Review</span>
                            </div>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                                Renewal submitted and awaiting manager verification.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                <span className="text-xs font-extrabold text-purple-900">Renewal Declined</span>
                            </div>
                            <p className="text-[11px] text-purple-700 leading-relaxed">
                                Details were invalid. Review manager feedback & resubmit.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-xs font-extrabold text-rose-900">Expired</span>
                            </div>
                            <p className="text-[11px] text-rose-700 leading-relaxed">
                                Past expiry date. Technician can submit renewal or manager can restore.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                KPI SUMMARY CARDS (MINIMAL LABELS, CLEAN METRICS)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Total Tracked
                        </p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">
                            {summary.total_certificates ?? counts.all}
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
                            {summary.active_compliant ?? counts.active}
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
                            {summary.expiring_within_1_week ?? counts.expiring}
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
                            {summary.pending_manager_verification ?? counts.submitted}
                        </p>
                        <p className="text-[10px] text-blue-700 mt-0.5">
                            Awaiting manager check
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileCheck2 className="size-5" />
                    </div>
                </div>

                <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200/80 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                            Expired
                        </p>
                        <p className="text-2xl font-black text-rose-900 mt-0.5">
                            {summary.expired ?? counts.expired}
                        </p>
                        <p className="text-[10px] text-rose-700 mt-0.5">
                            Past expiration date
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <AlertTriangle className="size-5" />
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
                        { id: "all", label: "All", count: counts.all },
                        { id: "active", label: "Active", count: counts.active },
                        { id: "expiring", label: "Expiring Soon", count: counts.expiring },
                        { id: "submitted", label: "Pending Review", count: counts.submitted },
                        { id: "expired", label: "Expired", count: counts.expired },
                    ].map((tab) => {
                        const isExpiredTab = tab.id === "expired";
                        const isSelected = filterStatus === tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setFilterStatus(tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                        ? isExpiredTab
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : "bg-[#0F1B35] text-white shadow-xs"
                                        : isExpiredTab && tab.count > 0
                                        ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                            isSelected
                                                ? "bg-white/20 text-white"
                                                : isExpiredTab && tab.count > 0
                                                ? "bg-rose-200/70 text-rose-800"
                                                : "bg-slate-200 text-slate-700"
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
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
                            const isSubmitted = cert.status === "Renewal Submitted";
                            const isDeclined = cert.status === "Renewal Declined";
                            const isExpired = (daysLeft < 0 || cert.status === "Expired") && !isSubmitted;
                            const isWithinOneWeek = daysLeft <= 7 && daysLeft >= 0 && !isSubmitted && !isExpired;

                            // Minimal, friendly badge definitions
                            let badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                            let badgeText = "Active";

                            if (isSubmitted) {
                                badgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
                                badgeText = "Pending Review";
                            } else if (isDeclined) {
                                badgeStyle = "bg-purple-50 text-purple-800 border-purple-200";
                                badgeText = isExpired ? "Declined (Expired)" : "Renewal Declined";
                            } else if (isExpired) {
                                badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
                                badgeText = "Expired";
                            } else if (isWithinOneWeek) {
                                badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                                badgeText = `Expiring Soon (${daysLeft}d)`;
                            }

                            const isManagerFormOpen = data.is_manager && verifyingCertObj?.certification_id === cert.certification_id;
                            const isTechFormOpen = data.is_technician && !data.is_manager && submittingCertObj?.certification_id === cert.certification_id;

                            return (
                                <div
                                    key={cert.certification_id}
                                    className={`p-5 rounded-2xl border transition hover:shadow-xs flex flex-col justify-between gap-4 ${
                                        isSubmitted
                                            ? "bg-blue-50/30 border-blue-200/80"
                                            : isDeclined
                                            ? "bg-purple-50/30 border-purple-200/80"
                                            : isExpired
                                            ? "bg-rose-50/25 border-rose-200/80 hover:border-rose-300"
                                            : isWithinOneWeek
                                            ? "bg-amber-50/30 border-amber-200/80"
                                            : "bg-white border-slate-200/80 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

                                            {isDeclined && (
                                                <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50/90 border border-purple-200 text-purple-900 text-xs">
                                                    <AlertTriangle className="size-4 text-purple-600 shrink-0 mt-0.5" />
                                                    <div className="space-y-0.5">
                                                        <span className="font-extrabold text-purple-950 block">Renewal Submission Declined by Manager</span>
                                                        <p className="text-[11px] text-purple-800 leading-relaxed">
                                                            {cert.notes?.includes("[Declined by Manager")
                                                                ? cert.notes
                                                                : "The submitted details were marked invalid by the manager. Please review feedback, correct your certificate details, and resubmit."}
                         
                                </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-[11px] text-slate-600 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/60 leading-relaxed">
                                                {cert.action_notice}
                                            </div>

                                            {cert.notes && !isDeclined && (
                                                <p className="text-[11px] text-slate-400 italic">
                                                    Note: {cert.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* RIGHT SIDE: COUNTDOWN & ACTION BUTTON */}
                                        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2.5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                                            <div className="text-left lg:text-right">
                                                <div className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                                                    <Clock className={`size-3.5 ${isExpired ? "text-rose-600" : isDeclined ? "text-purple-600" : isWithinOneWeek ? "text-amber-600" : "text-slate-600"}`} />
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
                                                    ) : isWithinOneWeek || isExpired || isDeclined ? (
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

                                            {/* TECHNICIAN OWN CERTIFICATE ACTION: UPLOAD / RESUBMIT RENEWAL */}
                                            {data.is_technician && !data.is_manager && (!data.is_head_technician || Number(cert.user_id) === Number(data.user_id)) && (
                                                <div>
                                                    {isSubmitted ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                                                            <CheckCircle2 className="size-3.5 text-blue-600" />
                                                            <span>Pending Manager Review</span>
                                                        </span>
                                                    ) : isWithinOneWeek || isExpired || isDeclined ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openTechnicianSubmitModal(cert)}
                                                            className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                                                                isTechFormOpen
                                                                    ? "bg-slate-800 hover:bg-slate-900 text-white"
                                                                    : isDeclined
                                                                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                                    : isExpired
                                                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                                                    : "bg-amber-600 hover:bg-amber-700 text-white"
                                                            }`}
                                                        >
                                                            <Upload className="size-3.5" />
                                                            <span>
                                                                {isTechFormOpen
                                                                    ? "Close Form"
                                                                    : isDeclined
                                                                    ? "Resubmit Renewal"
                                                                    : "Upload Renewal"}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                                            <ShieldCheck className="size-3.5 text-emerald-600" />
                                                            <span>Valid & Compliant</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* MANAGER & SUPER ADMIN ACTION */}
                                            {data.is_manager && (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => openManagerVerifyModal(cert)}
                                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                                            isManagerFormOpen
                                                                ? "bg-slate-800 hover:bg-slate-900 text-white"
                                                                : isSubmitted
                                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                : isExpired
                                                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                                                : "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                        }`}
                                                    >
                                                        <FileCheck2 className="size-3.5" />
                                                        <span>
                                                            {isManagerFormOpen
                                                                ? "Close Form"
                                                                : isSubmitted
                                                                ? "Review & Set Expiry"
                                                                : isExpired
                                                                ? "Update Expiry (Restore)"
                                                                : "Update Expiry"}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* INLINE MANAGER & SUPER ADMIN UPDATE EXPIRY DRAWER (EXPANDS DIRECTLY BELOW THIS CERTIFICATE) */}
                                    {isManagerFormOpen && (
                                        <div className="mt-2 pt-4 border-t border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-blue-50/40 -mx-5 -mb-5 p-5 rounded-b-2xl animate-fadeIn space-y-4 text-xs">
                                            <div className="flex items-start justify-between gap-4 border-b border-indigo-200/70 pb-3">
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-950 text-[10px] font-extrabold uppercase tracking-wider">
                                                        <FileCheck2 className="size-3" />
                                                        <span>
                                                            {isSubmitted
                                                                ? "Manager Review & Verification"
                                                                : isExpired
                                                                ? "Restore Expired Certificate"
                                                                : "Update Expiration Date"}
                                                        </span>
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-slate-900">
                                                        {isSubmitted
                                                            ? "Review Renewal Submission"
                                                            : isExpired
                                                            ? "Restore Expired Certificate"
                                                            : "Update Certificate Expiry"}
                                                        : {cert.technician_name ? `${cert.technician_name} — ` : ""}
                                                        {cert.certification_name}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-600">
                                                        {isSubmitted
                                                            ? "Verify the submitted renewal credentials and approve with new expiration date, or decline if details are invalid."
                                                            : isExpired
                                                            ? "Assign a new valid expiration date to restore this expired credential to active compliant status and restart the countdown."
                                                            : "Assign a new valid expiration date for this technician's certificate."}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setVerifyingCertObj(null)}
                                                    className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer px-2 py-1"
                                                    title="Close Form"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* IF SUBMISSION PENDING: TAB SWITCHER BETWEEN APPROVE AND DECLINE */}
                                            {isSubmitted && (
                                                <div className="flex items-center gap-2 border-b border-indigo-200/70 pb-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMgrActionTab("approve")}
                                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                            mgrActionTab === "approve"
                                                                ? "bg-indigo-600 text-white shadow-xs"
                                                                : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200"
                                                        }`}
                                                    >
                                                        <CheckCircle2 className="size-3.5" />
                                                        <span>Approve & Set Expiry</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMgrActionTab("decline")}
                                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                            mgrActionTab === "decline"
                                                                ? "bg-rose-600 text-white shadow-xs"
                                                                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                                                        }`}
                                                    >
                                                        <XCircle className="size-3.5" />
                                                        <span>Decline Submission (Invalid Details)</span>
                                                    </button>
                                                </div>
                                            )}

                                            {cert.notes && isSubmitted && (
                                                <div className="p-3 rounded-xl bg-white border border-indigo-200 text-xs text-slate-700">
                                                    <span className="font-extrabold text-indigo-900 block mb-0.5">
                                                        Technician Submission Details:
                                                    </span>
                                                    {cert.notes}
                                                </div>
                                            )}

                                            {/* TAB CONTENT: DECLINE SUBMISSION */}
                                            {isSubmitted && mgrActionTab === "decline" ? (
                                                <form onSubmit={handleManagerDeclineRenewal} className="space-y-3.5">
                                                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                                                        <span className="font-extrabold block text-rose-950">
                                                            Decline Submission
                                                        </span>
                                                        <p className="text-[11px] leading-relaxed">
                                                            If the submitted certificate number, issuer, or attachment is invalid or cannot be verified, provide the reason below. The technician will be notified with your feedback and required to resubmit.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                            Reason for Decline <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                            required
                                                            rows={3}
                                                            value={mgrDeclineReason}
                                                            onChange={(e) => setMgrDeclineReason(e.target.value)}
                                                            placeholder="e.g. Certificate number not found in official TESDA registry. Please provide correct certificate ID or re-upload clear copy."
                                                            className="w-full rounded-xl border border-rose-300 bg-white p-3 text-xs focus:outline-none focus:border-rose-500"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200/60">
                                                        <button
                                                            type="button"
                                                            onClick={() => setVerifyingCertObj(null)}
                                                            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={mgrDeclining}
                                                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <XCircle className="size-3.5" />
                                                            <span>{mgrDeclining ? "Declining..." : "Decline Submission"}</span>
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                /* APPROVAL & UPDATE EXPIRY FORM */
                                                <form onSubmit={handleManagerSubmitClick} className="space-y-3.5">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                        <div>
                                                            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                                Certificate Number <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={mgrCertNumber}
                                                                onChange={(e) => setMgrCertNumber(e.target.value)}
                                                                placeholder="e.g. TESDA-RAC-0008-4633"
                                                                className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                                New Expiration Date <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="date"
                                                                required
                                                                value={mgrNewExpiryDate}
                                                                onChange={(e) => setMgrNewExpiryDate(e.target.value)}
                                                                className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                            Verification Notes (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={mgrNotes}
                                                            onChange={(e) => setMgrNotes(e.target.value)}
                                                            placeholder="e.g. Verified valid certificate copy"
                                                            className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                                        />
                                                    </div>

                                                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-indigo-200 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={mgrVerifiedChecked}
                                                            onChange={(e) => setMgrVerifiedChecked(e.target.checked)}
                                                            className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500 size-4"
                                                        />
                                                        <span className="font-semibold text-slate-800 text-xs">
                                                            Confirm authentic credential & update expiration countdown.
                                                        </span>
                                                    </label>

                                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200/60">
                                                        <button
                                                            type="button"
                                                            onClick={() => setVerifyingCertObj(null)}
                                                            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={mgrSubmitting}
                                                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <CheckCircle2 className="size-3.5" />
                                                            <span>
                                                                {mgrSubmitting
                                                                    ? "Saving..."
                                                                    : isSubmitted
                                                                    ? "Approve & Update Expiry"
                                                                    : isExpired
                                                                    ? "Restore & Update Expiry"
                                                                    : "Save Changes"}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}

                                    {/* INLINE TECHNICIAN RENEWAL SUBMISSION DRAWER (EXPANDS DIRECTLY BELOW THIS CERTIFICATE) */}
                                    {isTechFormOpen && (
                                        <div className="mt-2 pt-4 border-t border-amber-200 bg-gradient-to-br from-amber-50/70 to-yellow-50/40 -mx-5 -mb-5 p-5 rounded-b-2xl animate-fadeIn space-y-4 text-xs">
                                            <div className="flex items-start justify-between gap-4 border-b border-amber-200/70 pb-3">
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-extrabold uppercase tracking-wider">
                                                        <Upload className="size-3" />
                                                        <span>
                                                            {isDeclined
                                                                ? "Resubmit Renewal Credentials"
                                                                : isExpired
                                                                ? "Submit Expired Renewal"
                                                                : "Submit Renewal Details"}
                                                        </span>
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-slate-900">
                                                        {isDeclined ? "Resubmit Renewal" : "Upload Renewal"}: {cert.certification_name}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-600">
                                                        {isDeclined
                                                            ? "Enter your corrected certificate number and upload clear proof for manager re-verification."
                                                            : isExpired
                                                            ? "Your certificate is currently expired. Enter your renewed certificate number and proof to submit for manager review."
                                                            : "Enter your updated certificate number and optional proof. Your manager will verify and activate the new expiration date."}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubmittingCertObj(null)}
                                                    className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer px-2 py-1"
                                                    title="Close Form"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <form onSubmit={handleTechnicianSubmitClick} className="space-y-3.5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                    <div>
                                                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                            Renewed Certificate Number <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={techCertNumber}
                                                            onChange={(e) => setTechCertNumber(e.target.value)}
                                                            placeholder="e.g. TESDA-NC2-2026-9910"
                                                            className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                            Certificate File / Proof <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="file"
                                                            required
                                                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                            onChange={(e) => setTechFile(e.target.files?.[0] || null)}
                                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-amber-100 file:text-amber-900"
                                                        />
                                                        <span className="block text-[10px] text-slate-500 mt-1 font-medium">
                                                            Required: Upload a clear copy or photo (JPG, PNG, PDF up to 5MB).
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                                        Remarks / Notes (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={techNotes}
                                                        onChange={(e) => setTechNotes(e.target.value)}
                                                        placeholder="e.g. Corrected credential ID or renewed at TESDA Regional Center"
                                                        className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSubmittingCertObj(null)}
                                                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={techSubmitting}
                                                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Upload className="size-3.5" />
                                                        <span>
                                                            {techSubmitting
                                                                ? "Submitting..."
                                                                : isDeclined
                                                                ? "Resubmit for Verification"
                                                                : "Submit for Verification"}
                                                        </span>
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                MANAGER CONFIRMATION MODAL (SAVE CHANGES / APPROVE & UPDATE)
            ══════════════════════════════════════════════════════════════════ */}
            <Modal
                open={showMgrConfirmModal && Boolean(verifyingCertObj)}
                title={
                    verifyingCertObj?.status === "Renewal Submitted"
                        ? "Confirm Renewal Approval"
                        : Number(verifyingCertObj?.days_until_expiry) < 0
                        ? "Confirm Expiration Date & Restore"
                        : "Confirm Expiration Date Update"
                }
                message={
                    verifyingCertObj?.status === "Renewal Submitted"
                        ? "Are you sure you want to approve this renewal submission? This will update the certificate details and restart the compliance monitoring countdown."
                        : Number(verifyingCertObj?.days_until_expiry) < 0
                        ? "Are you sure you want to restore this expired certificate? It will be marked as Active & Valid with the new expiration date."
                        : "Are you sure you want to update the expiration date for this certificate? The monitoring countdown will be updated accordingly."
                }
                confirmLabel={
                    mgrSubmitting
                        ? "Saving..."
                        : verifyingCertObj?.status === "Renewal Submitted"
                        ? "Confirm & Approve"
                        : Number(verifyingCertObj?.days_until_expiry) < 0
                        ? "Confirm & Restore"
                        : "Confirm & Save Changes"
                }
                cancelLabel="Cancel"
                confirmDisabled={mgrSubmitting}
                cancelDisabled={mgrSubmitting}
                onConfirm={executeManagerConfirmRenewal}
                onCancel={() => setShowMgrConfirmModal(false)}
                maxWidth="lg"
            >
                {verifyingCertObj && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">Technician:</span>
                            <span className="font-extrabold text-[#0F1B35]">
                                {verifyingCertObj.technician_name || "Assigned Technician"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">Certificate:</span>
                            <span className="font-bold text-slate-900 text-right">
                                {verifyingCertObj.certification_name}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">Verified Certificate #:</span>
                            <span className="font-mono font-bold text-indigo-700">
                                {mgrCertNumber || verifyingCertObj.certificate_number}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">New Expiration Date:</span>
                            <span className="font-bold text-emerald-700">
                                {mgrNewExpiryDate}
                            </span>
                        </div>
                        {mgrNotes.trim() && (
                            <div className="flex flex-col gap-1 pt-1">
                                <span className="text-slate-500 font-semibold">Verification Notes:</span>
                                <span className="text-slate-800 bg-white p-2 rounded-xl border border-slate-200 italic">
                                    {mgrNotes.trim()}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                TECHNICIAN CONFIRMATION MODAL (SUBMIT RENEWAL FORM)
            ══════════════════════════════════════════════════════════════════ */}
            <Modal
                open={showTechConfirmModal && Boolean(submittingCertObj)}
                title={
                    submittingCertObj?.status === "Renewal Declined"
                        ? "Confirm Renewal Resubmission"
                        : "Confirm Renewal Submission"
                }
                message="Please double-check your renewed certificate credentials and proof before submitting. Your manager will be notified to review and verify these details."
                confirmLabel={
                    techSubmitting
                        ? "Submitting..."
                        : submittingCertObj?.status === "Renewal Declined"
                        ? "Confirm & Resubmit"
                        : "Confirm & Submit"
                }
                cancelLabel="Cancel"
                confirmDisabled={techSubmitting}
                cancelDisabled={techSubmitting}
                onConfirm={executeTechnicianSubmitRenewal}
                onCancel={() => setShowTechConfirmModal(false)}
                maxWidth="lg"
            >
                {submittingCertObj && (
                    <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 space-y-2.5 text-xs text-slate-700">
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">Certificate:</span>
                            <span className="font-bold text-slate-900 text-right">
                                {submittingCertObj.certification_name}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">Renewed Certificate #:</span>
                            <span className="font-mono font-bold text-amber-900">
                                {techCertNumber}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                            <span className="text-slate-500 font-semibold">Attached File / Proof:</span>
                            <span className="font-semibold text-blue-700 flex items-center gap-1">
                                <FileText className="size-3.5" />
                                {techFile?.name || "Uploaded file"}
                            </span>
                        </div>
                        {techNotes.trim() && (
                            <div className="flex flex-col gap-1 pt-1">
                                <span className="text-slate-500 font-semibold">Remarks:</span>
                                <span className="text-slate-800 bg-white p-2 rounded-xl border border-amber-200 italic">
                                    {techNotes.trim()}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
