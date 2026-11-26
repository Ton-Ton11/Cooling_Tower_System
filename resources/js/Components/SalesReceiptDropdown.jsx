import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import StatusBadge from "./StatusBadge";
import { SUPER_ADMIN_ENDPOINTS, formatCurrency } from "../utils/superAdmin";

/**
 * Staff Action-column dropdown ("Receipt / Invoice") for Sales & Records.
 * Mirrors the customer ReceiptActionButton dropdown while supporting staff actions
 * (View, PDF, Void, Approve Void) and quick access to the Record Summary modal.
 */
export default function SalesReceiptDropdown({
    record,
    endpoints,
    currentUser,
    canApproveVoid = false,
    approvingReceiptId = null,
    onRequestVoid,
    onApproveVoid,
    onViewSummary,
}) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const receipts = useMemo(() => {
        const list = [];
        if (Array.isArray(record?.receipts)) {
            list.push(...record.receipts);
        }
        if (record?.receipt && !list.some((r) => Number(r?.receipt_id) === Number(record.receipt.receipt_id))) {
            list.push(record.receipt);
        }
        return list
            .filter((r) => r && r.receipt_id)
            .sort((a, b) => {
                const aVoided = a.status === "Voided" ? 1 : 0;
                const bVoided = b.status === "Voided" ? 1 : 0;
                if (aVoided !== bVoided) return aVoided - bVoided;
                const aInv = a.document_kind !== "acknowledgement_receipt" ? 1 : 0;
                const bInv = b.document_kind !== "acknowledgement_receipt" ? 1 : 0;
                return bInv - aInv || Number(b.receipt_id) - Number(a.receipt_id);
            });
    }, [record]);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const estimatedHeight = Math.min(340, Math.max(130, receipts.length * 64 + 68));
        const openUpward = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
        setMenuPos({
            top: openUpward ? undefined : rect.bottom + 6,
            bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
            right: Math.max(12, window.innerWidth - rect.right),
        });
    }, [receipts.length]);

    useEffect(() => {
        if (!open) return undefined;
        updatePosition();

        const handleOutside = (event) => {
            if (
                triggerRef.current?.contains(event.target) ||
                menuRef.current?.contains(event.target)
            ) {
                return;
            }
            setOpen(false);
        };
        const handleEscape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        const handleScrollOrResize = () => updatePosition();

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", handleScrollOrResize);
        window.addEventListener("scroll", handleScrollOrResize, true);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener("resize", handleScrollOrResize);
            window.removeEventListener("scroll", handleScrollOrResize, true);
        };
    }, [open, updatePosition]);

    const hasReceipts = receipts.length > 0;
    const hasPendingVoid = receipts.some((r) => r.status === "Void Requested");

    const getPrintUrl = (rcp) =>
        ep.receiptPrint
            ? ep.receiptPrint(rcp.receipt_id)
            : `/super-admin/receipts/${rcp.receipt_id}/print`;

    const getPdfUrl = (rcp) =>
        `${
            ep.receiptPdf
                ? ep.receiptPdf(rcp.receipt_id)
                : `/super-admin/receipts/${rcp.receipt_id}/pdf`
        }?download=1`;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    hasPendingVoid
                        ? "border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
                        : hasReceipts
                        ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
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
                <span>Receipt / Invoice</span>
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

            {open && menuPos && typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            position: "fixed",
                            top: menuPos.top,
                            bottom: menuPos.bottom,
                            right: menuPos.right,
                            zIndex: 9998,
                        }}
                        className="w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5"
                    >
                        {hasReceipts ? (
                            <div className="max-h-64 overflow-y-auto space-y-0.5">
                                {receipts.map((rcp) => {
                                    const isInvoice = rcp.document_kind !== "acknowledgement_receipt";
                                    const canApproveThis =
                                        rcp.status === "Void Requested" &&
                                        canApproveVoid &&
                                        Number(currentUser?.user_id) !== Number(rcp.issued_by_user_id);

                                    return (
                                        <div
                                            key={rcp.receipt_id}
                                            className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-xs"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-900 truncate">
                                                        {isInvoice ? "Invoice" : "Receipt"}
                                                    </span>
                                                    {rcp.status && rcp.status !== "Issued" && (
                                                        <StatusBadge status={rcp.status} />
                                                    )}
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                                                    {rcp.receipt_number}
                                                    {rcp.amount_paid_now !== undefined && rcp.amount_paid_now !== null
                                                        ? ` · ${formatCurrency(rcp.amount_paid_now)}`
                                                        : ""}
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
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setOpen(false)}
                                                    className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold"
                                                >
                                                    PDF
                                                </a>
                                                {canApproveThis && onApproveVoid && (
                                                    <button
                                                        type="button"
                                                        disabled={approvingReceiptId === rcp.receipt_id}
                                                        onClick={() => {
                                                            setOpen(false);
                                                            onApproveVoid(rcp);
                                                        }}
                                                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[11px] font-semibold cursor-pointer"
                                                    >
                                                        {approvingReceiptId === rcp.receipt_id
                                                            ? "..."
                                                            : "Approve"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-3 py-2 text-[11px] text-slate-400">
                                No official receipt issued for this record.
                            </div>
                        )}

                        {onViewSummary && (
                            <div className="mt-1 pt-1 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        onViewSummary(record);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center justify-between cursor-pointer"
                                >
                                    <span>Transaction Summary</span>
                                    <span className="text-slate-400">→</span>
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
}
