import { useEffect, useState } from "react";
import {
    ShieldCheck,
    Search,
    PhoneCall,
    Phone,
    Smartphone,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Wrench,
    Calendar,
    ArrowRight,
    RotateCcw,
    Copy,
    Check,
} from "lucide-react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../../utils/superAdmin";

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

function ContactCards({ contactInfo, isAlert = false, addToast }) {
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
            {/* Mobile Number Button */}
            <button
                type="button"
                onClick={() =>
                    handleCopy(contactInfo.mobile_number, "mobile", "Mobile number")
                }
                title="Click to copy mobile number"
                className={`group flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    copiedKey === "mobile"
                        ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs"
                        : isAlert
                        ? "bg-white hover:bg-rose-50/50 border-rose-200 hover:border-rose-300"
                        : "bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs"
                }`}
            >
                <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                        copiedKey === "mobile"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}
                >
                    {copiedKey === "mobile" ? (
                        <Check size={18} className="animate-in zoom-in" />
                    ) : (
                        <Smartphone size={18} />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Mobile Number
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                                copiedKey === "mobile"
                                    ? "text-emerald-700 font-bold"
                                    : "text-slate-400 group-hover:text-blue-600"
                            }`}
                        >
                            {copiedKey === "mobile" ? (
                                <>
                                    <Check size={12} />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={12} />
                                    <span>Copy</span>
                                </>
                            )}
                        </span>
                    </div>
                    <span className="block text-sm font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors mt-0.5">
                        {contactInfo.mobile_number}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                        {copiedKey === "mobile" ? "Saved to clipboard" : "Calls, SMS & Viber"}
                    </span>
                </div>
            </button>

            {/* Telephone Number Button */}
            <button
                type="button"
                onClick={() =>
                    handleCopy(contactInfo.telephone_number, "telephone", "Telephone number")
                }
                title="Click to copy telephone number"
                className={`group flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    copiedKey === "telephone"
                        ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/20 shadow-xs"
                        : isAlert
                        ? "bg-white hover:bg-rose-50/50 border-rose-200 hover:border-rose-300"
                        : "bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs"
                }`}
            >
                <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                        copiedKey === "telephone"
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}
                >
                    {copiedKey === "telephone" ? (
                        <Check size={18} className="animate-in zoom-in" />
                    ) : (
                        <Phone size={18} />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Telephone Number
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                                copiedKey === "telephone"
                                    ? "text-indigo-700 font-bold"
                                    : "text-slate-400 group-hover:text-blue-600"
                            }`}
                        >
                            {copiedKey === "telephone" ? (
                                <>
                                    <Check size={12} />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={12} />
                                    <span>Copy</span>
                                </>
                            )}
                        </span>
                    </div>
                    <span className="block text-sm font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors mt-0.5">
                        {contactInfo.telephone_number}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 truncate">
                        {copiedKey === "telephone"
                            ? "Saved to clipboard"
                            : contactInfo.office_hours || "Mon – Sat, 8:00 AM – 6:00 PM"}
                    </span>
                </div>
            </button>

            {/* Facebook Page */}
            <a
                href={contactInfo.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-200 sm:col-span-2 lg:col-span-1 ${
                    isAlert
                        ? "bg-white hover:bg-rose-50/50 border-rose-200 hover:border-rose-300"
                        : "bg-blue-50/60 hover:bg-blue-50 border-blue-200/80 hover:border-blue-300 hover:shadow-xs"
                }`}
            >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <FacebookIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                            Facebook Page
                        </span>
                        <ExternalLink size={12} className="text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="block text-sm font-bold text-blue-950 truncate mt-0.5">
                        {contactInfo.facebook_page}
                    </span>
                    <span className="block text-[11px] text-blue-600/80 mt-0.5">
                        Message on Messenger
                    </span>
                </div>
            </a>
        </div>
    );
}

export default function WarrantyTracking({ addToast, onNavigate }) {
    const [serialInput, setSerialInput] = useState("");
    const [searching, setSearching] = useState(false);
    const [lookupResult, setLookupResult] = useState(null);
    const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);
    const [myUnits, setMyUnits] = useState([]);

    useEffect(() => {
        let mounted = true;
        window.axios
            .get(CUSTOMER_ENDPOINTS.warrantyContext)
            .then((res) => {
                if (!mounted) return;
                if (res.data?.contact_info) {
                    setContactInfo(res.data.contact_info);
                }
                if (Array.isArray(res.data?.my_units)) {
                    setMyUnits(res.data.my_units);
                }
            })
            .catch(() => {});
        return () => {
            mounted = false;
        };
    }, []);

    const handleSearch = async (e, overrideSerial = null) => {
        if (e) e.preventDefault();
        const targetSerial = (overrideSerial !== null ? overrideSerial : serialInput).trim();
        if (!targetSerial) {
            addToast?.("Please enter the Serial Number of your AC unit.", "error");
            return;
        }
        if (overrideSerial !== null) {
            setSerialInput(targetSerial);
        }

        setSearching(true);
        try {
            const response = await window.axios.post(CUSTOMER_ENDPOINTS.trackWarranty, {
                serial_number: targetSerial,
            });
            setLookupResult(response.data);
            if (response.data?.contact_info) {
                setContactInfo(response.data.contact_info);
            }
            if (!response.data?.found) {
                addToast?.(
                    `Alert: Serial Number "${targetSerial}" was not found in our inventory records.`,
                    "error"
                );
            } else if (response.data?.unit?.is_expired) {
                addToast?.(
                    `Notice: The warranty for AC unit "${targetSerial}" has already ended.`,
                    "error"
                );
            } else {
                addToast?.(
                    `Warranty record found for "${targetSerial}" (${response.data.unit.days_left} days remaining).`
                );
            }
        } catch (error) {
            addToast?.(extractErrorMessage(error, "Unable to verify serial number right now."), "error");
        } finally {
            setSearching(false);
        }
    };

    const unit = lookupResult?.found ? lookupResult.unit : null;
    const notFound = lookupResult && !lookupResult.found;

    return (
        <div className="flex flex-col gap-6">
            {/* Top Banner & Serial Number Search Card */}
            <div
                className="relative overflow-hidden p-6 sm:p-7 rounded-2xl text-white shadow-xl"
                style={{
                    background: "linear-gradient(135deg, #0F172A 0%, #1E2F5F 55%, #1D4ED8 100%)",
                    boxShadow: "0 14px 34px rgba(30, 47, 95, 0.20)",
                }}
            >
                {/* Decorative subtle ambient blur */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-3xl space-y-4">
                    {/* Official Verification Badge without emojis */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wide text-blue-100">
                        <ShieldCheck size={14} className="text-blue-300 shrink-0" />
                        <span>Official Warranty Verification & Smart Spare Parts Forecast</span>
                    </div>

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                            AC Unit Warranty Tracking
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                            Enter the <strong className="text-white font-semibold">Serial Number</strong> of the air conditioning unit you purchased from{" "}
                            <strong className="text-white font-semibold">Cooling Tower Airconditioning Service Company</strong> to check your warranty start date, expiration date, remaining days, and reserved spare parts coverage.
                        </p>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-2.5 pt-1">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value)}
                                placeholder="Enter AC Unit Serial Number (e.g., MD-WNF-2026-88219)"
                                className="w-full px-4 py-3 rounded-xl bg-white text-slate-900 font-mono text-sm font-semibold border-2 border-white/20 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-white transition shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={searching}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-blue-900/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
                            >
                                {searching ? (
                                    <>
                                        <RotateCcw size={15} className="animate-spin shrink-0" />
                                        <span>Checking Records...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={15} className="shrink-0" />
                                        <span>Track Warranty</span>
                                    </>
                                )}
                            </button>
                            {lookupResult && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSerialInput("");
                                        setLookupResult(null);
                                    }}
                                    className="px-4 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white text-sm font-semibold transition cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Quick selection for customer's purchased units */}
                    {myUnits.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-300 font-medium">Your Units:</span>
                            {myUnits.map((u) => (
                                <button
                                    key={u.ac_unit_id}
                                    type="button"
                                    onClick={() => handleSearch(null, u.serial_number)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/25 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium transition cursor-pointer"
                                >
                                    <span>{u.serial_number}</span>
                                    <span className="text-[10px] text-blue-200">({u.brand})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                CASE 1: SERIAL NUMBER NOT FOUND IN INVENTORY RECORDS
               ═══════════════════════════════════════════════════════════════════ */}
            {notFound && (
                <div className="p-6 border-2 border-rose-200 bg-rose-50/60 rounded-2xl space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                                Unit Not Found
                            </span>
                            <h3 className="text-lg font-bold text-rose-950">
                                This Serial Number Is Not Recorded in Our Inventory
                            </h3>
                            <p className="text-xs sm:text-sm text-rose-900 leading-relaxed">
                                We could not find any air conditioning unit with Serial Number{" "}
                                <code className="bg-rose-100 px-2 py-0.5 rounded font-mono font-bold text-rose-950">
                                    {lookupResult.serial_number}
                                </code>{" "}
                                in the <strong>Cooling Tower Airconditioning Service Company</strong> inventory database.
                                Please double-check the serial number sticker on your unit or on your official sales invoice.
                            </p>
                        </div>
                    </div>

                    {/* Support channels card */}
                    <div className="p-5 bg-white border border-rose-200 rounded-xl space-y-3.5">
                        <div className="flex items-center gap-2 text-slate-800">
                            <PhoneCall size={16} className="text-blue-600 shrink-0" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Contact Us for Any Concern
                            </h4>
                        </div>
                        <p className="text-xs text-slate-500">
                            If you purchased your unit from us or need assistance verifying your warranty record, please reach out to our team:
                        </p>
                        <ContactCards contactInfo={contactInfo} isAlert={true} addToast={addToast} />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                CASE 2: VALID SERIAL NUMBER FOUND IN INVENTORY RECORDS
               ═══════════════════════════════════════════════════════════════════ */}
            {unit && (
                <div className="flex flex-col gap-5">
                    {/* Expired vs Active Status Alert Banner */}
                    {unit.is_expired ? (
                        <div className="p-5 sm:p-6 bg-rose-50/70 border-2 border-rose-300 rounded-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <XCircle size={24} />
                                    </div>
                                    <div>
                                        <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider mb-1">
                                            Warranty Ended
                                        </span>
                                        <h3 className="text-lg font-bold text-rose-950">
                                            Your AC Unit Warranty Has Ended
                                        </h3>
                                        <p className="text-xs sm:text-sm text-rose-800 mt-0.5">
                                            The {unit.warranty_period_months}-month warranty coverage for{" "}
                                            <strong>
                                                {unit.brand} {unit.model} (SN: {unit.serial_number})
                                            </strong>{" "}
                                            started on <strong>{unit.warranty_start_formatted}</strong> and ended on{" "}
                                            <strong>{unit.warranty_expiry_formatted}</strong> ({Math.abs(unit.days_left)}{" "}
                                            {Math.abs(unit.days_left) === 1 ? "day" : "days"} ago).
                                        </p>
                                    </div>
                                </div>
                                {onNavigate && (
                                    <button
                                        type="button"
                                        className="btn-primary self-start sm:self-auto shrink-0 inline-flex items-center gap-2"
                                        onClick={() => onNavigate("book")}
                                    >
                                        <span>Book Regular Service</span>
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`p-5 sm:p-6 rounded-2xl border-2 ${
                                unit.warranty_status === "Expiring Soon"
                                    ? "bg-amber-50/80 border-amber-300"
                                    : "bg-emerald-50/80 border-emerald-300"
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                                            unit.warranty_status === "Expiring Soon"
                                                ? "bg-amber-600"
                                                : "bg-emerald-600"
                                        }`}
                                    >
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <span
                                            className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white uppercase tracking-wider mb-1 ${
                                                unit.warranty_status === "Expiring Soon"
                                                    ? "bg-amber-600"
                                                    : "bg-emerald-600"
                                            }`}
                                        >
                                            {unit.warranty_status === "Expiring Soon"
                                                ? "Warranty Expiring Soon"
                                                : "Active Warranty Coverage"}
                                        </span>
                                        <h3
                                            className={`text-lg font-bold ${
                                                unit.warranty_status === "Expiring Soon"
                                                    ? "text-amber-950"
                                                    : "text-emerald-950"
                                            }`}
                                        >
                                            {unit.brand} {unit.model} — {unit.time_left_label}
                                        </h3>
                                        <p
                                            className={`text-xs sm:text-sm mt-0.5 ${
                                                unit.warranty_status === "Expiring Soon"
                                                    ? "text-amber-800"
                                                    : "text-emerald-800"
                                            }`}
                                        >
                                            Verified in Cooling Tower records • Serial Number:{" "}
                                            <code className="font-mono font-bold">{unit.serial_number}</code>
                                        </p>
                                    </div>
                                </div>
                                {onNavigate && (
                                    <button
                                        type="button"
                                        className="btn-primary self-start sm:self-auto shrink-0 inline-flex items-center gap-2"
                                        onClick={() => onNavigate("book")}
                                    >
                                        <span>Book Warranty Service</span>
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Warranty Dates & Countdown Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 border-l-4 border-l-blue-600 shadow-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    Start Date
                                </span>
                                <Calendar size={15} className="text-blue-500" />
                            </div>
                            <p className="text-xl font-extrabold text-slate-900">
                                {unit.warranty_start_formatted}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Activated at purchase
                            </p>
                        </div>

                        <div
                            className={`p-5 rounded-2xl bg-white border border-slate-200 border-l-4 shadow-xs space-y-1 ${
                                unit.is_expired ? "border-l-rose-600" : "border-l-purple-600"
                            }`}
                        >
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    Expiration Date
                                </span>
                                <Clock size={15} className={unit.is_expired ? "text-rose-500" : "text-purple-500"} />
                            </div>
                            <p
                                className={`text-xl font-extrabold ${
                                    unit.is_expired ? "text-rose-600" : "text-slate-900"
                                }`}
                            >
                                {unit.warranty_expiry_formatted}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                {unit.warranty_period_months} Months Total Coverage
                            </p>
                        </div>

                        <div
                            className={`p-5 rounded-2xl bg-white border border-slate-200 border-l-4 shadow-xs space-y-1 ${
                                unit.is_expired
                                    ? "border-l-rose-600"
                                    : unit.days_left <= 30
                                    ? "border-l-amber-500"
                                    : "border-l-emerald-600"
                            }`}
                        >
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    Warranty Time Left
                                </span>
                                <ShieldCheck
                                    size={15}
                                    className={
                                        unit.is_expired
                                            ? "text-rose-500"
                                            : unit.days_left <= 30
                                            ? "text-amber-500"
                                            : "text-emerald-500"
                                    }
                                />
                            </div>
                            <p
                                className={`text-xl font-extrabold ${
                                    unit.is_expired
                                        ? "text-rose-600"
                                        : unit.days_left <= 30
                                        ? "text-amber-700"
                                        : "text-emerald-700"
                                }`}
                            >
                                {unit.is_expired ? "0 Days Left (Ended)" : `${unit.days_left} Days Left`}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {unit.time_left_label}
                            </p>
                        </div>
                    </div>

                    {/* Visual Warranty Timeline Bar & Unit Specifications */}
                    <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800">
                                    Coverage Timeline ({unit.warranty_start_formatted} → {unit.warranty_expiry_formatted})
                                </span>
                                <span
                                    className={`font-extrabold ${
                                        unit.is_expired ? "text-rose-600" : "text-emerald-700"
                                    }`}
                                >
                                    {unit.is_expired
                                        ? "Warranty Ended (0% Remaining)"
                                        : `${unit.progress_percent}% of Warranty Remaining`}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        unit.is_expired
                                            ? "bg-rose-500"
                                            : unit.days_left <= 30
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                    }`}
                                    style={{
                                        width: `${unit.is_expired ? 100 : Math.max(6, unit.progress_percent)}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                            <div>
                                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Serial Number
                                </span>
                                <span className="block text-sm font-bold font-mono text-slate-900 mt-0.5">
                                    {unit.serial_number}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Brand & Model
                                </span>
                                <span className="block text-sm font-bold text-slate-900 mt-0.5">
                                    {unit.brand} — {unit.model}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Type & Capacity
                                </span>
                                <span className="block text-sm font-bold text-slate-900 mt-0.5">
                                    {unit.ac_type} • {unit.horsepower} HP
                                </span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Registered Owner
                                </span>
                                <span className="block text-sm font-bold text-slate-900 mt-0.5 truncate">
                                    {unit.customer_name || "Walk-in Customer"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Forecasted & Reserved Warranty Spare Parts Card */}
                    <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <Wrench size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Smart Forecasting: Reserved Warranty Spare Parts
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {unit.is_expired
                                            ? "Because this warranty has ended, previously reserved spare parts have been returned to inventory."
                                            : "Our forecasting system automatically reserves compatible spare parts throughout your active warranty."}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full ${
                                    unit.is_expired
                                        ? "bg-slate-100 text-slate-600"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                            >
                                {unit.is_expired
                                    ? "Reservations Released"
                                    : `${(unit.reserved_parts || []).length} Part(s) Reserved`}
                            </span>
                        </div>

                        {unit.is_expired ? (
                            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-slate-800">Warranty Reserve Status:</strong> All spare parts previously reserved for{" "}
                                    <code className="font-mono font-bold text-slate-800">{unit.serial_number}</code> have been released. On-hand spare parts are now available in inventory, and Order Base parts are not reserved anymore.
                                </div>
                            </div>
                        ) : (unit.reserved_parts || []).length === 0 ? (
                            <div className="p-4 text-xs text-slate-500 rounded-xl bg-slate-50 border border-slate-200">
                                Standard warranty spare parts coverage is active for your unit.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unit.reserved_parts.map((part) => (
                                    <div
                                        key={part.item_id}
                                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    part.reservation_source === "order_base"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-blue-100 text-blue-800"
                                                }`}
                                            >
                                                {part.source_label}
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700">
                                                {part.quantity} pc Reserved
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-tight">
                                                {part.item_name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Category: {part.sub_category} • Held until {unit.warranty_expiry_formatted}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Always visible Contact Us support card at bottom when not showing notFound */}
            {!notFound && (
                <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <PhoneCall size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Contact Us for Any Concern
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Have questions about your AC unit warranty coverage, serial number verification, or spare parts replacement?
                            </p>
                        </div>
                    </div>

                    <ContactCards contactInfo={contactInfo} addToast={addToast} />
                </div>
            )}
        </div>
    );
}
