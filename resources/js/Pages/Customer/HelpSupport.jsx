import { useState } from "react";

const COMPANY_DETAILS = {
    address: "Door 5, Apostol Bldg., Mayor Jaldon St. Canelar Zamboanga City",
    mobile: "0917 877 7670",
    telephone: "062 310-2275",
    facebook: "Cooling Tower Airconditioning Services",
    facebookUrl: "https://www.facebook.com/share/19w3XmbCza/",
    hours: "Monday – Saturday • 8:00 AM – 6:00 PM",
};

const FAQ_ITEMS = [
    {
        q: "How do I book an aircon cleaning, repair, or installation?",
        a: "Go to Book a Service (or click Quick Book Service in the sidebar), choose your service type, select your AC unit details, and pick an available schedule slot.",
    },
    {
        q: "How do I track my AC unit warranty and 3-month maintenance countdown?",
        a: "Open the Purchase History tab to automatically view your purchased AC units, warranty period, and live real-time preventive maintenance countdown.",
    },
    {
        q: "How do I chat with the Manager or report a service problem?",
        a: "Click the floating Chat Manager button in the bottom-right corner to message the Manager directly, or use Report Problem in the bottom-left sidebar to submit a formal report to the Manager and Super Admin.",
    },
    {
        q: "What happens if I need to reschedule my booking?",
        a: "Open My Bookings and click Reschedule on your appointment. Standard customer reschedules carry a ₱50.00 fee, while company-issued Reschedule Notices are free (₱0.00).",
    },
];

export default function HelpSupport({ addToast, onNavigate }) {
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = (text, key) => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
        }
        setCopiedKey(key);
        if (addToast) {
            addToast(`Copied ${text}`, "success");
        }
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleOpenManagerChat = () => {
        window.dispatchEvent(new CustomEvent("open-customer-support-chat"));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Header Banner */}
            <div
                className="p-6 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{
                    background: "linear-gradient(135deg, #10213F 0%, #17315E 100%)",
                }}
            >
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Help & Support
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-200">
                        Direct service center contact, live manager chat, and customer assistance.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                        type="button"
                        onClick={handleOpenManagerChat}
                        className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
                    >
                        <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 18v-6a9 9 0 0118 0v6"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
                            />
                        </svg>
                        <span>Chat Manager</span>
                    </button>

                    {onNavigate && (
                        <button
                            type="button"
                            onClick={() => onNavigate("complaints")}
                            className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Report Problem
                        </button>
                    )}
                </div>
            </div>

            {/* Direct Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    type="button"
                    onClick={() => handleCopy(COMPANY_DETAILS.mobile, "mobile")}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 shadow-2xs text-left transition cursor-pointer group"
                >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Mobile Hotline
                    </span>
                    <span className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 mt-1 block">
                        {COMPANY_DETAILS.mobile}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 mt-1 block">
                        {copiedKey === "mobile" ? "✓ Copied!" : "Click to copy"}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleCopy(COMPANY_DETAILS.telephone, "tel")}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 shadow-2xs text-left transition cursor-pointer group"
                >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Landline
                    </span>
                    <span className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 mt-1 block">
                        {COMPANY_DETAILS.telephone}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 mt-1 block">
                        {copiedKey === "tel" ? "✓ Copied!" : "Click to copy"}
                    </span>
                </button>

                <a
                    href={COMPANY_DETAILS.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 shadow-2xs text-left transition group block"
                >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Official Facebook
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 mt-1 block truncate">
                        {COMPANY_DETAILS.facebook}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 mt-1 block">
                        Visit Page &rarr;
                    </span>
                </a>
            </div>

            {/* Service Center Location & Hours */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                            DTI Accredited
                        </span>
                        <span className="font-extrabold text-slate-900">
                            Service Center Office
                        </span>
                    </div>
                    <p className="text-slate-600">{COMPANY_DETAILS.address}</p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                        Service Hours
                    </span>
                    <span className="font-bold text-slate-800">
                        {COMPANY_DETAILS.hours}
                    </span>
                </div>
            </div>

            {/* Quick FAQ Guide */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                <h2 className="text-base font-extrabold text-slate-900">
                    Frequently Asked Questions
                </h2>
                <div className="divide-y divide-slate-100">
                    {FAQ_ITEMS.map((item, idx) => (
                        <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                                {item.q}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {item.a}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
