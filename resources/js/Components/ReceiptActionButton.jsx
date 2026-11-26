import { useEffect, useRef, useState } from "react";
import { CUSTOMER_ENDPOINTS } from "../utils/superAdmin";

/**
 * Minimalist customer receipt action:
 * - Single clean "Receipt" link when 1 active receipt exists.
 * - Compact dropdown only when multiple receipts (e.g. both AR and final INV) exist.
 */
export default function ReceiptActionButton({ receipts = [], className = "" }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const activeReceipts = (Array.isArray(receipts) ? receipts : []).filter(
        (r) => r && r.status !== "Voided"
    );

    useEffect(() => {
        if (!open) return undefined;
        const handleOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    if (activeReceipts.length === 0) {
        return null;
    }

    const getPrintUrl = (rcp) =>
        rcp.print_url || CUSTOMER_ENDPOINTS.receiptPrint(rcp.receipt_id);
    const getPdfUrl = (rcp) =>
        `${rcp.pdf_url || CUSTOMER_ENDPOINTS.receiptPdf(rcp.receipt_id)}?download=1`;

    if (activeReceipts.length === 1) {
        const single = activeReceipts[0];
        return (
            <a
                href={getPrintUrl(single)}
                target="_blank"
                rel="noopener noreferrer"
                title={`${single.receipt_number} — Print or Download PDF`}
                className={`px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap ${className}`}
            >
                <svg
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <span>Receipt</span>
            </a>
        );
    }

    const sorted = [...activeReceipts].sort((a, b) => {
        const aInv = a.document_kind !== "acknowledgement_receipt" ? 1 : 0;
        const bInv = b.document_kind !== "acknowledgement_receipt" ? 1 : 0;
        return bInv - aInv || Number(b.receipt_id) - Number(a.receipt_id);
    });

    return (
        <div ref={containerRef} className={`relative inline-block ${className}`}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
                <svg
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <span>Receipt</span>
                <svg
                    aria-hidden="true"
                    className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-white border border-slate-200 shadow-lg p-1.5 z-30">
                    {sorted.map((rcp) => {
                        const isInvoice = rcp.document_kind !== "acknowledgement_receipt";
                        return (
                            <div
                                key={rcp.receipt_id}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-xs"
                            >
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">
                                        {isInvoice ? "Invoice" : "Receipt"}
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 truncate">
                                        {rcp.receipt_number}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a
                                        href={getPrintUrl(rcp)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setOpen(false)}
                                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold"
                                    >
                                        View
                                    </a>
                                    <a
                                        href={getPdfUrl(rcp)}
                                        onClick={() => setOpen(false)}
                                        className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold"
                                    >
                                        PDF
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
