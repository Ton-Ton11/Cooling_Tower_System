import { useState } from "react";
import { createPortal } from "react-dom";
import gcashQrImage from "../../imports/gcash_qr_code.jpg";

export const OFFICIAL_GCASH_NUMBER = "0917-877-7670";
export const OFFICIAL_GCASH_NAME = "Cooling Tower Airconditioning Services";

/**
 * Reusable GCash QR + Express Send mobile number card.
 * - Shows the official GCash InstaPay QR code (click to enlarge for easy scanning)
 * - Displays mobile number 0917-877-7670 with one-click Copy button
 */
export default function GcashPaymentCard({
    accountNumber = OFFICIAL_GCASH_NUMBER,
    accountName = OFFICIAL_GCASH_NAME,
    variant = "light", // "light" | "dark"
    compact = false,
    badge = null,
    className = "",
}) {
    const [copied, setCopied] = useState(false);
    const [zoomOpen, setZoomOpen] = useState(false);

    const displayNumber = accountNumber || OFFICIAL_GCASH_NUMBER;
    const displayName = accountName || OFFICIAL_GCASH_NAME;
    const isDark = variant === "dark";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(displayNumber.replace(/[^0-9]/g, ""));
        } catch {
            // Ignore clipboard errors in restricted contexts
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const qrThumbClass = compact ? "w-20 h-20" : "w-24 h-24 sm:w-28 sm:h-28";

    return (
        <>
            <div
                className={`rounded-xl border flex flex-col sm:flex-row items-center gap-3.5 ${
                    compact ? "p-3" : "p-3.5"
                } ${
                    isDark
                        ? "bg-white/10 border-white/15 text-white"
                        : "bg-blue-50/70 border-blue-200 text-slate-900"
                } ${className}`}
            >
                <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    title="Click to enlarge GCash QR code"
                    className={`bg-white rounded-xl p-1.5 border shadow-xs shrink-0 cursor-zoom-in transition hover:scale-[1.03] ${
                        isDark ? "border-white/20" : "border-blue-200"
                    }`}
                >
                    <img
                        src={gcashQrImage}
                        alt="GCash QR Code — 0917-877-7670"
                        className={`${qrThumbClass} object-contain rounded-lg block`}
                    />
                </button>

                <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                                isDark ? "text-blue-200" : "text-blue-700"
                            }`}
                        >
                            GCash QR / Express Send
                        </span>
                        {badge && (
                            <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                    isDark
                                        ? "bg-emerald-500/20 text-emerald-200"
                                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                }`}
                            >
                                {badge}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                        <span
                            className={`font-extrabold font-mono tracking-wider ${
                                compact ? "text-sm" : "text-base"
                            } ${isDark ? "text-white" : "text-blue-900"}`}
                        >
                            {displayNumber}
                        </span>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 ${
                                isDark
                                    ? "bg-blue-500 hover:bg-blue-400 text-white"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        >
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>

                    <p
                        className={`text-[11px] mt-1 truncate ${
                            isDark ? "text-blue-200/90" : "text-slate-600"
                        }`}
                    >
                        {displayName}
                    </p>
                    <p
                        className={`text-[10px] mt-0.5 ${
                            isDark ? "text-blue-300/80" : "text-slate-400"
                        }`}
                    >
                        Scan QR or tap image to enlarge
                    </p>
                </div>
            </div>

            {zoomOpen && typeof document !== "undefined" &&
                createPortal(
                    <div
                        onClick={() => setZoomOpen(false)}
                        className="fixed inset-0 z-[10000] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                                    GCash QR Code
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setZoomOpen(false)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-2">
                                <img
                                    src={gcashQrImage}
                                    alt="GCash QR Code — 0917-877-7670"
                                    className="w-full max-h-[65vh] object-contain mx-auto rounded-lg"
                                />
                            </div>
                            <div className="pt-1">
                                <p className="text-base font-extrabold font-mono text-blue-900">
                                    {displayNumber}
                                </p>
                                <p className="text-xs text-slate-500">{displayName}</p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
