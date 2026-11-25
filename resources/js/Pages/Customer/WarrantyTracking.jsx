import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ShieldCheck,
    Search,
    PhoneCall,
    Phone,
    Smartphone,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    Wrench,
    Calendar,
    ArrowRight,
    RotateCcw,
    Copy,
    Check,
    Bell,
    Package,
} from "lucide-react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatCurrency } from "../../utils/superAdmin";

const DEFAULT_CONTACT_INFO = {
    company_name: "Cooling Tower Airconditioning Service Company",
    mobile_number: "0917 877 7670",
    telephone_number: "062 310-2275",
    facebook_page: "Cooling Tower Airconditioning Services",
    facebook_url: "https://www.facebook.com/share/19w3XmbCza/",
    email: "support@coolingtoweraircon.ph",
    office_hours: "Monday – Saturday, 8:00 AM – 6:00 PM",
};

function FacebookIcon({ size = 16, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    );
}

function ContactCards({ contactInfo, addToast }) {
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = (text, key, label) => {
        if (!text) return;
        const cleanNumber = String(text).trim();

        const copySuccess = () => {
            setCopiedKey(key);
            addToast?.(`${label} (${cleanNumber}) copied to clipboard!`, "success");
            setTimeout(() => setCopiedKey(null), 2000);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(cleanNumber)
                .then(copySuccess)
                .catch(() => fallbackCopy(cleanNumber));
        } else {
            fallbackCopy(cleanNumber);
        }

        function fallbackCopy(val) {
            try {
                const ta = document.createElement("textarea");
                ta.value = val;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                copySuccess();
            } catch {
                addToast?.("Failed to copy number.", "error");
            }
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
                type="button"
                onClick={() => handleCopy(contactInfo.mobile_number, "mobile", "Mobile number")}
                className={`group flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    copiedKey === "mobile"
                        ? "bg-emerald-50/80 border-emerald-300"
                        : "bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-blue-300"
                }`}
            >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    {copiedKey === "mobile" ? <Check size={16} /> : <Smartphone size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Mobile
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 flex items-center gap-1">
                            {copiedKey === "mobile" ? "Copied" : <><Copy size={11} /> Copy</>}
                        </span>
                    </div>
                    <span className="block text-sm font-bold text-slate-900 mt-0.5">
                        {contactInfo.mobile_number}
                    </span>
                </div>
            </button>

            <button
                type="button"
                onClick={() => handleCopy(contactInfo.telephone_number, "telephone", "Telephone number")}
                className={`group flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    copiedKey === "telephone"
                        ? "bg-indigo-50/80 border-indigo-300"
                        : "bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-blue-300"
                }`}
            >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    {copiedKey === "telephone" ? <Check size={16} /> : <Phone size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Landline
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 flex items-center gap-1">
                            {copiedKey === "telephone" ? "Copied" : <><Copy size={11} /> Copy</>}
                        </span>
                    </div>
                    <span className="block text-sm font-bold text-slate-900 mt-0.5">
                        {contactInfo.telephone_number}
                    </span>
                </div>
            </button>

            <a
                href={contactInfo.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-3.5 rounded-xl border bg-blue-50/60 hover:bg-blue-50 border-blue-200/80 hover:border-blue-300 transition-all sm:col-span-2 lg:col-span-1"
            >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <FacebookIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            Facebook
                        </span>
                        <ExternalLink size={11} className="text-blue-500" />
                    </div>
                    <span className="block text-sm font-bold text-blue-950 truncate mt-0.5">
                        {contactInfo.facebook_page}
                    </span>
                </div>
            </a>
        </div>
    );
}

/**
 * Compute live real-time countdown from nowMs to target ISO timestamp.
 */
function computeRealTimeCountdown(targetIso, nowMs) {
    if (!targetIso) {
        return { isPast: false, days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    }
    const targetMs = new Date(targetIso).getTime();
    if (Number.isNaN(targetMs)) {
        return { isPast: false, days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    }
    const diffMs = targetMs - nowMs;
    if (diffMs <= 0) {
        const pastSeconds = Math.floor(Math.abs(diffMs) / 1000);
        const pastDays = Math.floor(pastSeconds / 86400);
        return {
            isPast: true,
            days: pastDays,
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalSeconds: 0,
        };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        isPast: false,
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
    };
}

const pad2 = (n) => String(Math.max(0, Number(n || 0))).padStart(2, "0");

export default function WarrantyTracking({ addToast, onNavigate, onSelectServiceToBook }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [units, setUnits] = useState([]);
    const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'expired'
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedSerial, setCopiedSerial] = useState(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    // Real-time 1-second ticker for live warranty and maintenance reminder countdowns
    useEffect(() => {
        const timer = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchPurchaseHistory = useCallback(
        async (isSilent = false) => {
            if (isSilent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            try {
                const res = await window.axios.get(CUSTOMER_ENDPOINTS.warrantyContext);
                if (res.data?.contact_info) {
                    setContactInfo(res.data.contact_info);
                }
                const list = Array.isArray(res.data?.purchase_history)
                    ? res.data.purchase_history
                    : Array.isArray(res.data?.my_units)
                    ? res.data.my_units
                    : [];
                setUnits(list);
            } catch (error) {
                if (isSilent) {
                    addToast?.(extractErrorMessage(error, "Unable to refresh purchase history."), "error");
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [addToast]
    );

    useEffect(() => {
        fetchPurchaseHistory(false);
    }, [fetchPurchaseHistory]);

    const handleCopySerial = (serial) => {
        if (!serial) return;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(serial).catch(() => {});
        }
        setCopiedSerial(serial);
        addToast?.(`Serial Number ${serial} copied.`, "success");
        setTimeout(() => setCopiedSerial(null), 2000);
    };

    const handleBookMaintenance = (unit) => {
        if (onSelectServiceToBook) {
            onSelectServiceToBook(unit?.recommended_service_id || 3);
        }
        if (onNavigate) {
            onNavigate("book");
        }
    };

    const activeWarrantyCount = useMemo(
        () => units.filter((u) => !u.is_expired).length,
        [units]
    );

    const nextReminderUnit = useMemo(() => {
        if (units.length === 0) return null;
        return [...units].sort((a, b) => {
            const aTime = new Date(a.automated_reminder_iso || a.automated_reminder_date || 0).getTime();
            const bTime = new Date(b.automated_reminder_iso || b.automated_reminder_date || 0).getTime();
            return aTime - bTime;
        })[0];
    }, [units]);

    const filteredUnits = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return units.filter((u) => {
            if (statusFilter === "active" && u.is_expired) return false;
            if (statusFilter === "expired" && !u.is_expired) return false;
            if (!q) return true;
            return (
                (u.brand || "").toLowerCase().includes(q) ||
                (u.model || "").toLowerCase().includes(q) ||
                (u.serial_number || "").toLowerCase().includes(q) ||
                (u.ac_type || "").toLowerCase().includes(q)
            );
        });
    }, [units, statusFilter, searchQuery]);

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto">
            {/* Top Minimal Header & Real-Time Status Strip */}
            <div
                className="relative overflow-hidden p-5 sm:p-6 rounded-2xl text-white shadow-lg"
                style={{
                    background: "linear-gradient(135deg, #0F172A 0%, #1E2F5F 55%, #1D4ED8 100%)",
                }}
            >
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-extrabold tracking-tight text-white">
                            Purchase History
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300">
                            Your purchased AC units, warranty span, and real-time preventive maintenance countdown.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                        <button
                            type="button"
                            disabled={refreshing}
                            onClick={() => fetchPurchaseHistory(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        >
                            <RotateCcw size={13} className={refreshing ? "animate-spin" : ""} />
                            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
                        </button>
                        {onNavigate && (
                            <button
                                type="button"
                                onClick={() => onNavigate("book")}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                            >
                                <span>Book Service</span>
                                <ArrowRight size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Minimal KPI Summary Row */}
                {units.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/15">
                        <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-200">
                                    Purchased Units
                                </span>
                                <span className="text-lg font-extrabold text-white">
                                    {units.length} {units.length === 1 ? "Unit" : "Units"}
                                </span>
                            </div>
                            <Package size={18} className="text-blue-300" />
                        </div>

                        <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                                    Active Warranty
                                </span>
                                <span className="text-lg font-extrabold text-white">
                                    {activeWarrantyCount} of {units.length} Covered
                                </span>
                            </div>
                            <ShieldCheck size={18} className="text-emerald-300" />
                        </div>

                        <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-200">
                                    Next Automated Reminder
                                </span>
                                <span className="text-sm font-extrabold text-white">
                                    {nextReminderUnit?.automated_reminder_formatted || "Scheduled"}
                                </span>
                            </div>
                            <Bell size={18} className="text-amber-300" />
                        </div>
                    </div>
                )}
            </div>

            {/* Filter & Search Bar (Shown when customer has units) */}
            {units.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                            { id: "all", label: `All Units (${units.length})` },
                            { id: "active", label: `Active Warranty (${activeWarrantyCount})` },
                            { id: "expired", label: `Warranty Ended (${units.length - activeWarrantyCount})` },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    statusFilter === tab.id
                                        ? "bg-[#14224A] text-white shadow-xs"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter brand, model, serial..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {loading ? (
                <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
                    <RotateCcw size={22} className="animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">
                        Loading your AC unit purchase history...
                    </p>
                </div>
            ) : units.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                        <Package size={22} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h3 className="text-base font-extrabold text-slate-900">
                            No Purchased AC Units Yet
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            AC units you purchase from Cooling Tower will automatically appear here with their warranty span and live preventive maintenance reminder countdown.
                        </p>
                    </div>
                    {onNavigate && (
                        <button
                            type="button"
                            onClick={() => {
                                if (onSelectServiceToBook) {
                                    onSelectServiceToBook(4); // Free Ocular Inspection for AC Purchase
                                }
                                onNavigate("book");
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                            <span>Book Free Ocular Inspection to Buy an AC Unit</span>
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            ) : filteredUnits.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                    No purchased AC units match your current filter.
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {filteredUnits.map((unit) => {
                        const warrantyCountdown = computeRealTimeCountdown(
                            unit.warranty_expiry_iso,
                            nowMs
                        );
                        const maintenanceCountdown = computeRealTimeCountdown(
                            unit.automated_reminder_iso,
                            nowMs
                        );

                        const isWarrantyExpired = Boolean(unit.is_expired || warrantyCountdown.isPast);
                        const isWarrantySoon = !isWarrantyExpired && unit.days_left <= 30;

                        const isReminderActive =
                            unit.maintenance_status === "Reminder Active" ||
                            maintenanceCountdown.isPast;
                        const isReminderSoon =
                            !isReminderActive &&
                            (unit.maintenance_status === "Due Soon" ||
                                maintenanceCountdown.days <= 7);

                        return (
                            <div
                                key={unit.ac_unit_id}
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
                            >
                                {/* 1. UNIT DETAILS HEADER */}
                                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-[#14224A] text-white flex items-center justify-center shrink-0 font-extrabold text-xs">
                                                {(unit.brand || "AC").slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                                                        {unit.brand} — {unit.model}
                                                    </h2>
                                                    <span
                                                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                                            isWarrantyExpired
                                                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                                                : isWarrantySoon
                                                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                        }`}
                                                    >
                                                        {isWarrantyExpired
                                                            ? "Warranty Ended"
                                                            : isWarrantySoon
                                                            ? "Expiring Soon"
                                                            : "Active Warranty"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Purchased on <strong>{unit.purchase_date_formatted}</strong> •{" "}
                                                    {unit.purchase_status || "Purchased"}
                                                </p>
                                            </div>
                                        </div>

                                        {unit.unit_price > 0 && (
                                            <div className="sm:text-right shrink-0">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Unit Price ({unit.payment_method || "Paid"})
                                                </span>
                                                <span className="text-base font-extrabold text-slate-900">
                                                    {formatCurrency(unit.unit_price)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Minimal Unit Specs Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60">
                                        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/80">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Serial Number
                                            </span>
                                            <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                                <span className="text-xs font-bold font-mono text-slate-900 truncate">
                                                    {unit.serial_number}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopySerial(unit.serial_number)}
                                                    title="Copy serial number"
                                                    className="text-slate-400 hover:text-blue-600 shrink-0 cursor-pointer"
                                                >
                                                    {copiedSerial === unit.serial_number ? (
                                                        <Check size={12} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/80">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                AC Type
                                            </span>
                                            <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate">
                                                {unit.ac_type}
                                            </span>
                                        </div>

                                        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/80">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Capacity & Motor
                                            </span>
                                            <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate">
                                                {unit.horsepower} HP • {unit.motor_type || "Inverter"}
                                            </span>
                                        </div>

                                        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/80">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Purchase Date
                                            </span>
                                            <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate">
                                                {unit.purchase_date_formatted}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. WARRANTY SPAN & PREVENTIVE MAINTENANCE REMINDER (SIDE-BY-SIDE) */}
                                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* LEFT PANEL: WARRANTY SPAN */}
                                    <div
                                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3.5 ${
                                            isWarrantyExpired
                                                ? "bg-rose-50/40 border-rose-200"
                                                : isWarrantySoon
                                                ? "bg-amber-50/40 border-amber-200"
                                                : "bg-emerald-50/35 border-emerald-200"
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck
                                                        size={16}
                                                        className={
                                                            isWarrantyExpired
                                                                ? "text-rose-600"
                                                                : isWarrantySoon
                                                                ? "text-amber-600"
                                                                : "text-emerald-600"
                                                        }
                                                    />
                                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                                        Warranty Span
                                                    </h3>
                                                </div>
                                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                                    {unit.warranty_duration_label || `${unit.warranty_period_months} Months`}
                                                </span>
                                            </div>

                                            {/* Start & End Dates */}
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        Start Date
                                                    </span>
                                                    <span className="block text-xs font-extrabold text-slate-900 mt-0.5">
                                                        {unit.warranty_start_formatted}
                                                    </span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        Expiration Date
                                                    </span>
                                                    <span
                                                        className={`block text-xs font-extrabold mt-0.5 ${
                                                            isWarrantyExpired ? "text-rose-600" : "text-slate-900"
                                                        }`}
                                                    >
                                                        {unit.warranty_expiry_formatted}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Live Real-Time Warranty Countdown & Progress */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-slate-600">
                                                        Remaining Coverage
                                                    </span>
                                                    <span
                                                        className={`font-mono font-extrabold ${
                                                            isWarrantyExpired
                                                                ? "text-rose-600"
                                                                : isWarrantySoon
                                                                ? "text-amber-700"
                                                                : "text-emerald-700"
                                                        }`}
                                                    >
                                                        {isWarrantyExpired
                                                            ? "Ended (0d left)"
                                                            : `${warrantyCountdown.days}d ${pad2(
                                                                  warrantyCountdown.hours
                                                              )}h ${pad2(
                                                                  warrantyCountdown.minutes
                                                              )}m ${pad2(
                                                                  warrantyCountdown.seconds
                                                              )}s`}
                                                    </span>
                                                </div>
                                                <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200/80 p-0.5">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            isWarrantyExpired
                                                                ? "bg-rose-500"
                                                                : isWarrantySoon
                                                                ? "bg-amber-500"
                                                                : "bg-emerald-500"
                                                        }`}
                                                        style={{
                                                            width: `${
                                                                isWarrantyExpired
                                                                    ? 100
                                                                    : Math.max(5, unit.progress_percent || 0)
                                                            }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reserved Warranty Spare Parts Summary */}
                                        <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-[11px]">
                                            <span className="text-slate-600 font-medium flex items-center gap-1.5 truncate">
                                                <Wrench size={13} className="text-blue-600 shrink-0" />
                                                <span className="truncate">
                                                    {isWarrantyExpired
                                                        ? "Warranty spare part reserves released"
                                                        : (unit.reserved_parts || []).length > 0
                                                        ? `${unit.reserved_parts.length} Warranty Spare Part(s) Reserved`
                                                        : "Standard warranty parts coverage active"}
                                                </span>
                                            </span>
                                            {!isWarrantyExpired && (unit.reserved_parts || []).length > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                                    Reserved
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT PANEL: PREVENTIVE MAINTENANCE & CHECK-UP REMINDER COUNTDOWN (REAL-TIME) */}
                                    <div
                                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3.5 ${
                                            isReminderActive
                                                ? "bg-amber-50/70 border-amber-300"
                                                : isReminderSoon
                                                ? "bg-orange-50/50 border-orange-200"
                                                : "bg-blue-50/35 border-blue-200"
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Bell
                                                        size={16}
                                                        className={
                                                            isReminderActive
                                                                ? "text-amber-600 animate-bounce"
                                                                : "text-blue-600"
                                                        }
                                                    />
                                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                                        Preventive Maintenance & Check-up
                                                    </h3>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                                        unit.maintenance_status === "Scheduled"
                                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                            : isReminderActive
                                                            ? "bg-amber-200 text-amber-950"
                                                            : isReminderSoon
                                                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                                                            : "bg-white text-blue-700 border border-blue-200"
                                                    }`}
                                                >
                                                    {unit.maintenance_status === "Scheduled"
                                                        ? "Appointment Scheduled"
                                                        : isReminderActive
                                                        ? "Reminder Active"
                                                        : "3-Month Cycle"}
                                                </span>
                                            </div>

                                            {/* Automated Reminder Date Display */}
                                            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Calendar size={15} className="text-blue-600 shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            Automated Reminder Date
                                                        </span>
                                                        <span className="block text-xs font-extrabold text-slate-900 truncate">
                                                            {unit.automated_reminder_datetime_formatted ||
                                                                unit.automated_reminder_formatted}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                                    Since {unit.last_maintenance_formatted}
                                                </span>
                                            </div>

                                            {/* Real-Time Live Countdown Tiles */}
                                            {isReminderActive ? (
                                                <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between gap-2">
                                                    <span>
                                                        Automated Maintenance & Check-up Reminder is active now!
                                                    </span>
                                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-600 text-white shrink-0">
                                                        Due Now
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-4 gap-2 text-center">
                                                    {[
                                                        { label: "Days", value: maintenanceCountdown.days },
                                                        { label: "Hours", value: pad2(maintenanceCountdown.hours) },
                                                        { label: "Minutes", value: pad2(maintenanceCountdown.minutes) },
                                                        { label: "Seconds", value: pad2(maintenanceCountdown.seconds) },
                                                    ].map((box) => (
                                                        <div
                                                            key={box.label}
                                                            className="py-2 px-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs"
                                                        >
                                                            <span className="block font-mono text-base sm:text-lg font-extrabold text-[#14224A] leading-none">
                                                                {box.value}
                                                            </span>
                                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                                                {box.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Action Button */}
                                        <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                            <span className="text-[11px] text-slate-600 font-medium">
                                                Routine cleaning & check-up every 90 days
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleBookMaintenance(unit)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer shrink-0"
                                            >
                                                <span>Book Maintenance</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Compact Support Contact Footer */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <PhoneCall size={15} className="text-blue-600" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                            Warranty & Maintenance Support
                        </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                        {contactInfo.office_hours}
                    </span>
                </div>
                <ContactCards contactInfo={contactInfo} addToast={addToast} />
            </div>
        </div>
    );
}
