import { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import Modal from "../../Components/Modal";
import {
    ADMIN_ASSISTANT_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

const FILTER_TABS = [
    { id: "All", label: "All", countKey: "all" },
    { id: "Pending Payment Review", label: "Pending Review", countKey: "pending_review" },
    { id: "Payment Incomplete", label: "Incomplete", countKey: "payment_incomplete" },
    { id: "Ready for Pickup", label: "Ready for Pickup", countKey: "ready_for_pickup" },
    { id: "Awaiting Fulfillment Choice", label: "Awaiting Choice", countKey: "awaiting_fulfillment" },
    { id: "Scheduled for Replacement", label: "Replacement", countKey: "scheduled_replacement" },
    { id: "Completed", label: "Completed", countKey: "completed" },
    { id: "Cancelled", label: "Cancelled", countKey: "cancelled" },
];

const CATEGORY_LABELS = {
    spare_part: "Spare Part",
    material: "Material",
    tool: "Tool",
};

export default function ItemOrders({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? ADMIN_ASSISTANT_ENDPOINTS;

    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");
    const [search, setSearch] = useState("");
    const [nowMs, setNowMs] = useState(Date.now());

    // Review GCash Down Payment Modal
    const [reviewModal, setReviewModal] = useState(null);
    const [reviewDecision, setReviewDecision] = useState("sufficient"); // 'sufficient' | 'incomplete'
    const [reviewNotes, setReviewNotes] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Release Pickup & Balance Confirmation Modal
    const [pickupModal, setPickupModal] = useState(null);
    const [pickupMethod, setPickupMethod] = useState("Cash");
    const [pickupNotes, setPickupNotes] = useState("");
    const [submittingPickup, setSubmittingPickup] = useState(false);

    // Generated / Printable Receipt Modal
    const [receiptModal, setReceiptModal] = useState(null);

    const fetchOrders = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);
            try {
                const { data } = await window.axios.get(ep.itemOrders);
                setOrders(Array.isArray(data?.data) ? data.data : []);
                setCounts(data?.counts || {});
            } catch (error) {
                addToast(extractErrorMessage(error, "Unable to load item orders."), "error");
            } finally {
                setLoading(false);
            }
        },
        [addToast, ep.itemOrders]
    );

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const hasIncompleteTimers = useMemo(
        () => orders.some((o) => o.order_status === "Payment Incomplete"),
        [orders]
    );

    useEffect(() => {
        if (!hasIncompleteTimers) return;
        const interval = setInterval(() => {
            const current = Date.now();
            setNowMs(current);
            const justExpired = orders.some((o) => {
                if (o.order_status !== "Payment Incomplete" || !o.payment_deadline_at) return false;
                const diff = new Date(o.payment_deadline_at).getTime() - current;
                return diff <= 0 && diff > -1500;
            });
            if (justExpired) {
                fetchOrders(false);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [hasIncompleteTimers, orders, fetchOrders]);

    const filteredOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (activeTab !== "All" && o.order_status !== activeTab) return false;
            if (!q) return true;
            const hay = [
                o.order_id,
                o.client_name,
                o.client_contact,
                o.item_name,
                o.reference_number,
                o.receipt_reference_number,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [orders, activeTab, search]);

    const formatCountdown = (deadlineIso) => {
        if (!deadlineIso) return "00:00";
        const secs = Math.max(0, Math.floor((new Date(deadlineIso).getTime() - nowMs) / 1000));
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        return `${m}:${s}`;
    };

    const openReviewModal = (order) => {
        setReviewModal(order);
        setReviewDecision("sufficient");
        setReviewNotes("");
    };

    const handleSubmitReview = async () => {
        if (!reviewModal || submittingReview) return;
        setSubmittingReview(true);
        try {
            const { data } = await window.axios.post(
                ep.reviewItemOrderPayment(reviewModal.order_id),
                {
                    decision: reviewDecision,
                    notes: reviewNotes.trim() || null,
                }
            );
            addToast(data?.message || "Payment review saved.", "success");
            setReviewModal(null);
            await fetchOrders(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to save payment review."), "error");
        } finally {
            setSubmittingReview(false);
        }
    };

    const openPickupModal = (order) => {
        setPickupModal(order);
        setPickupMethod(order.remaining_balance <= 0 && order.payment_method === "GCash" ? "GCash" : "Cash");
        setPickupNotes("");
    };

    const handleConfirmPickup = async () => {
        if (!pickupModal || submittingPickup) return;
        setSubmittingPickup(true);
        try {
            const { data } = await window.axios.post(
                ep.confirmItemOrderPickup(pickupModal.order_id),
                {
                    payment_method: pickupMethod,
                    notes: pickupNotes.trim() || null,
                }
            );
            addToast(data?.message || "Pickup confirmed & receipt generated!", "success");
            setPickupModal(null);
            await fetchOrders(false);
            onDataChanged?.();
            if (data?.data) {
                setReceiptModal(data.data);
            }
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to confirm pickup."), "error");
        } finally {
            setSubmittingPickup(false);
        }
    };

    const handlePrintReceipt = (order) => {
        const win = window.open("", "_blank", "width=520,height=680");
        if (!win) return;
        win.document.write(`
            <html>
                <head>
                    <title>Receipt ${order.receipt_reference_number || `#${order.order_id}`}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
                        .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; max-width: 440px; margin: 0 auto; }
                        h2 { margin: 0 0 4px; font-size: 18px; }
                        .sub { color: #64748b; font-size: 12px; margin-bottom: 18px; }
                        .row { display: flex; justify-content: space-between; font-size: 13px; padding: 7px 0; border-bottom: 1px dashed #e2e8f0; }
                        .row strong { color: #0f172a; }
                        .total { font-size: 16px; font-weight: 800; color: #15803d; border-bottom: none; padding-top: 12px; }
                    </style>
                </head>
                <body>
                    <div class="box">
                        <h2>Cooling Tower Airconditioning Services</h2>
                        <div class="sub">Official Item Sale & Pickup Receipt</div>
                        <div class="row"><span>Reference No.</span><strong>${order.receipt_reference_number || "—"}</strong></div>
                        <div class="row"><span>Transaction Date</span><strong>${order.transaction_date_formatted || formatDateTime(order.transaction_date)}</strong></div>
                        <div class="row"><span>Admin Assistant</span><strong>${order.confirmed_by_name || "Admin Assistant"}</strong></div>
                        <div class="row"><span>Customer</span><strong>${order.client_name || "Customer"}</strong></div>
                        <div class="row"><span>Item</span><strong>${order.item_name}</strong></div>
                        <div class="row"><span>Quantity</span><strong>${order.quantity} ${order.unit || "pc"}</strong></div>
                        <div class="row"><span>Unit Price</span><strong>${formatCurrency(order.unit_price)}</strong></div>
                        <div class="row total"><span>Total Paid</span><span>${formatCurrency(order.total_amount)}</span></div>
                    </div>
                    <script>window.onload = () => window.print();</script>
                </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Item Orders</h1>
                    <p className="page-subtitle">
                        Review GCash down payments and confirm walk-in pickup balances
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => fetchOrders()}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Pills & Search */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        background: "#FFFFFF",
                        padding: 6,
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                    }}
                >
                    {FILTER_TABS.map((t) => {
                        const active = activeTab === t.id;
                        const cnt = counts[t.countKey] ?? 0;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: active ? "#2563EB" : "transparent",
                                    color: active ? "#FFFFFF" : "#64748B",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <span>{t.label}</span>
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        padding: "1px 6px",
                                        borderRadius: 999,
                                        background: active ? "rgba(255,255,255,0.22)" : "#F1F5F9",
                                        color: active ? "#FFFFFF" : "#334155",
                                    }}
                                >
                                    {cnt}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order #, client, item, ref..."
                    className="input-field"
                    style={{ width: 250, fontSize: 12, padding: "8px 12px" }}
                />
            </div>

            {/* Orders Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                            <tr
                                style={{
                                    background: "#F8FAFC",
                                    borderBottom: "1px solid #E2E8F0",
                                    textAlign: "left",
                                    fontSize: 11,
                                    color: "#64748B",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                <th style={{ padding: "12px 16px" }}>ID</th>
                                <th style={{ padding: "12px 16px" }}>Client</th>
                                <th style={{ padding: "12px 16px" }}>Item</th>
                                <th style={{ padding: "12px 16px" }}>Payment</th>
                                <th style={{ padding: "12px 16px" }}>Status</th>
                                <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: 36, textAlign: "center", color: "#64748B" }}>
                                        Loading item orders...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: 36, textAlign: "center", color: "#64748B" }}>
                                        No item orders found.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const canReviewPayment = ["Pending Payment Review", "Payment Incomplete"].includes(
                                        order.order_status
                                    );
                                    const canReleasePickup = order.order_status === "Ready for Pickup";
                                    const isCompleted = order.order_status === "Completed";

                                    return (
                                        <tr
                                            key={order.order_id}
                                            style={{ borderTop: "1px solid #F1F5F9" }}
                                        >
                                            <td style={{ padding: "12px 16px", fontWeight: 800, color: "#2563EB" }}>
                                                #{order.order_id}
                                                <div style={{ fontSize: 10.5, fontWeight: 500, color: "#94A3B8", marginTop: 2 }}>
                                                    {order.created_at_formatted}
                                                </div>
                                            </td>

                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ fontWeight: 700, color: "#0F172A" }}>
                                                    {order.client_name || "Customer"}
                                                </div>
                                                {order.client_contact && (
                                                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                                                        {order.client_contact}
                                                    </div>
                                                )}
                                            </td>

                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ fontWeight: 700, color: "#0F172A" }}>
                                                    {order.quantity}x {order.item_name}
                                                </div>
                                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                                                    <span style={{ fontSize: 11, color: "#64748B" }}>
                                                        {CATEGORY_LABELS[order.item_category] || order.item_category}
                                                    </span>
                                                    {order.is_order_base && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                fontWeight: 700,
                                                                padding: "1px 6px",
                                                                borderRadius: 6,
                                                                background: "#FFFBEB",
                                                                color: "#B45309",
                                                                border: "1px solid #FDE68A",
                                                            }}
                                                        >
                                                            Order Base
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ fontWeight: 700, color: "#0F172A" }}>
                                                    Total: {formatCurrency(order.total_amount)}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#15803D", fontWeight: 600, marginTop: 2 }}>
                                                    Paid: {formatCurrency(order.amount_paid)} ({order.payment_method})
                                                </div>
                                                {order.remaining_balance > 0 && (
                                                    <div style={{ fontSize: 11, color: "#B45309", fontWeight: 600 }}>
                                                        Balance: {formatCurrency(order.remaining_balance)}
                                                    </div>
                                                )}
                                                {order.reference_number && (
                                                    <div style={{ fontSize: 10.5, fontFamily: "monospace", color: "#64748B" }}>
                                                        Ref: {order.reference_number}
                                                    </div>
                                                )}
                                            </td>

                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                                                    <StatusBadge status={order.order_status} />
                                                    {order.order_status === "Payment Incomplete" && (
                                                        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#DC2626", fontFamily: "monospace" }}>
                                                            Timer: {formatCountdown(order.payment_deadline_at)}
                                                        </span>
                                                    )}
                                                    {order.linked_booking_id && (
                                                        <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>
                                                            Booking #{order.linked_booking_id}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                                <div style={{ display: "inline-flex", gap: 6 }}>
                                                    {canReviewPayment && (
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            style={{ padding: "6px 12px", fontSize: 11.5 }}
                                                            onClick={() => openReviewModal(order)}
                                                        >
                                                            Review Payment
                                                        </button>
                                                    )}

                                                    {canReleasePickup && (
                                                        <button
                                                            type="button"
                                                            style={{
                                                                padding: "6px 12px",
                                                                fontSize: 11.5,
                                                                fontWeight: 700,
                                                                borderRadius: 8,
                                                                border: "1px solid #16A34A",
                                                                background: "#16A34A",
                                                                color: "#FFFFFF",
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={() => openPickupModal(order)}
                                                        >
                                                            Release Pickup
                                                        </button>
                                                    )}

                                                    {isCompleted && order.receipt_reference_number && (
                                                        <button
                                                            type="button"
                                                            className="btn-secondary"
                                                            style={{ padding: "6px 12px", fontSize: 11.5 }}
                                                            onClick={() => setReceiptModal(order)}
                                                        >
                                                            Receipt
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 1: REVIEW GCASH DOWN PAYMENT (MATCHES SHARED/BOOKINGS UX)
            ══════════════════════════════════════════════════════════════════ */}
            <Modal show={!!reviewModal} onClose={() => !submittingReview && setReviewModal(null)} maxWidth="lg">
                {reviewModal && (
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                                    Review Payment — Order #{reviewModal.order_id}
                                </h3>
                                <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
                                    Verify customer GCash down payment details
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReviewModal(null)}
                                style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Customer & Item Summary Box */}
                        <div
                            style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                padding: 14,
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                                fontSize: 12,
                            }}
                        >
                            <div>
                                <span style={{ color: "#64748B", fontWeight: 700, fontSize: 11 }}>Customer</span>
                                <div style={{ fontWeight: 800, color: "#1E2F5F", marginTop: 2, fontSize: 13 }}>
                                    {reviewModal.client_name}
                                </div>
                                <div style={{ color: "#475569", marginTop: 4 }}>{reviewModal.client_contact || "—"}</div>
                                <div style={{ color: "#64748B", marginTop: 2, fontSize: 11 }}>
                                    {reviewModal.client_address || ""}
                                </div>
                            </div>
                            <div>
                                <span style={{ color: "#64748B", fontWeight: 700, fontSize: 11 }}>Order Summary</span>
                                <div style={{ fontWeight: 800, color: "#2563EB", marginTop: 2, fontSize: 13 }}>
                                    {reviewModal.quantity}x {reviewModal.item_name}
                                </div>
                                <div style={{ color: "#334155", marginTop: 4 }}>
                                    Total: <strong>{formatCurrency(reviewModal.total_amount)}</strong> · Min 50%:{" "}
                                    <strong>{formatCurrency(reviewModal.down_payment_amount)}</strong>
                                </div>
                                <div style={{ color: "#15803D", marginTop: 4, fontWeight: 700 }}>
                                    Paid: {formatCurrency(reviewModal.amount_paid)} ({reviewModal.payment_method})
                                </div>
                            </div>
                        </div>

                        {/* GCash Proof Details */}
                        <div
                            style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                padding: 14,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                                fontSize: 12,
                            }}
                        >
                            <div>
                                <div>
                                    <span style={{ color: "#64748B" }}>GCash Ref: </span>
                                    <strong style={{ fontFamily: "monospace", color: "#0F172A" }}>
                                        {reviewModal.reference_number || "—"}
                                    </strong>
                                </div>
                                <div style={{ marginTop: 4, color: "#475569" }}>
                                    Sender: <strong>{reviewModal.sender_name || "—"}</strong>
                                    {reviewModal.sender_number ? ` · ${reviewModal.sender_number}` : ""}
                                </div>
                            </div>

                            {reviewModal.payment_receipt_url ? (
                                <a
                                    href={reviewModal.payment_receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: "inline-block" }}
                                >
                                    <img
                                        src={reviewModal.payment_receipt_url}
                                        alt="GCash Receipt"
                                        style={{
                                            width: 72,
                                            height: 72,
                                            objectFit: "cover",
                                            borderRadius: 10,
                                            border: "1px solid #CBD5E1",
                                        }}
                                    />
                                </a>
                            ) : (
                                <span style={{ fontSize: 11, color: "#94A3B8" }}>No receipt image uploaded</span>
                            )}
                        </div>

                        {/* Payment Review Decision Cards (Identical UX to Manager Booking Review) */}
                        <div>
                            <label
                                style={{
                                    marginBottom: 6,
                                    display: "block",
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                }}
                            >
                                Payment Verification
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                {[
                                    {
                                        value: "sufficient",
                                        title: "Sufficient Payment",
                                        subtitle:
                                            reviewModal.item_category === "spare_part"
                                                ? "Unlock customer fulfillment choice"
                                                : "Set order Ready for Pickup",
                                        activeBg: "#EFF6FF",
                                        activeBorder: "#2563EB",
                                        activeText: "#1E40AF",
                                    },
                                    {
                                        value: "incomplete",
                                        title: "Payment Incomplete",
                                        subtitle: "10-min window to settle",
                                        activeBg: "#FFFBEB",
                                        activeBorder: "#D97706",
                                        activeText: "#92400E",
                                    },
                                ].map((opt) => {
                                    const isSel = reviewDecision === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setReviewDecision(opt.value)}
                                            style={{
                                                textAlign: "left",
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: `2px solid ${isSel ? opt.activeBorder : "#E2E8F0"}`,
                                                background: isSel ? opt.activeBg : "#FFFFFF",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    color: isSel ? opt.activeText : "#1E2F5F",
                                                }}
                                            >
                                                {opt.title}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                                                {opt.subtitle}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                {reviewDecision === "incomplete" ? "Reason / Settlement Note" : "Note (Optional)"}
                            </label>
                            <input
                                type="text"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder={
                                    reviewDecision === "incomplete"
                                        ? "e.g. Sent amount is below required 50% down payment"
                                        : "Optional verification note"
                                }
                                className="input-field"
                                style={{ width: "100%", fontSize: 12 }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setReviewModal(null)}
                                disabled={submittingReview}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSubmitReview}
                                disabled={submittingReview}
                            >
                                {submittingReview ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 2: CONFIRM REMAINING BALANCE & RELEASE PICKUP
            ══════════════════════════════════════════════════════════════════ */}
            <Modal show={!!pickupModal} onClose={() => !submittingPickup && setPickupModal(null)} maxWidth="md">
                {pickupModal && (
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                                    Release Pickup — Order #{pickupModal.order_id}
                                </h3>
                                <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
                                    {pickupModal.client_name} · {pickupModal.quantity}x {pickupModal.item_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPickupModal(null)}
                                style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div
                            style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                padding: 14,
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                gap: 10,
                                fontSize: 12,
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600 }}>Total Amount</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                                    {formatCurrency(pickupModal.total_amount)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600 }}>Paid Advance</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#15803D", marginTop: 2 }}>
                                    {formatCurrency(pickupModal.amount_paid)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10.5, color: "#B45309", fontWeight: 700 }}>Collect Now</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#B45309", marginTop: 2 }}>
                                    {formatCurrency(pickupModal.remaining_balance)}
                                </div>
                            </div>
                        </div>

                        {pickupModal.remaining_balance > 0 && (
                            <div>
                                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                                    Walk-in Payment Method
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {["Cash", "GCash"].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPickupMethod(m)}
                                            style={{
                                                flex: 1,
                                                padding: "8px 12px",
                                                borderRadius: 9,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                border: `2px solid ${pickupMethod === m ? "#2563EB" : "#E2E8F0"}`,
                                                background: pickupMethod === m ? "#EFF6FF" : "#FFFFFF",
                                                color: pickupMethod === m ? "#1E40AF" : "#475569",
                                            }}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                Notes (Optional)
                            </label>
                            <input
                                type="text"
                                value={pickupNotes}
                                onChange={(e) => setPickupNotes(e.target.value)}
                                placeholder="Optional release note"
                                className="input-field"
                                style={{ width: "100%", fontSize: 12 }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setPickupModal(null)}
                                disabled={submittingPickup}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 9,
                                    border: "none",
                                    background: "#16A34A",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                }}
                                onClick={handleConfirmPickup}
                                disabled={submittingPickup}
                            >
                                {submittingPickup ? "Releasing..." : "Confirm & Generate Receipt"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 3: GENERATED RECEIPT VIEW & PRINT
            ══════════════════════════════════════════════════════════════════ */}
            <Modal show={!!receiptModal} onClose={() => setReceiptModal(null)} maxWidth="sm">
                {receiptModal && (
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: "#15803D", textTransform: "uppercase" }}>
                                    Official Receipt Recorded
                                </span>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "2px 0 0", fontFamily: "monospace" }}>
                                    {receiptModal.receipt_reference_number}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReceiptModal(null)}
                                style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div
                            style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                padding: 14,
                                fontSize: 12,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748B" }}>Admin Assistant</span>
                                <strong style={{ color: "#0F172A" }}>{receiptModal.confirmed_by_name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748B" }}>Transaction Date</span>
                                <strong style={{ color: "#0F172A" }}>
                                    {receiptModal.transaction_date_formatted || formatDateTime(receiptModal.transaction_date)}
                                </strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748B" }}>Reference No.</span>
                                <strong style={{ color: "#0F172A", fontFamily: "monospace" }}>
                                    {receiptModal.receipt_reference_number}
                                </strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #CBD5E1", paddingTop: 8 }}>
                                <span style={{ color: "#64748B" }}>Customer</span>
                                <strong style={{ color: "#0F172A" }}>{receiptModal.client_name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748B" }}>Item</span>
                                <strong style={{ color: "#0F172A" }}>
                                    {receiptModal.quantity}x {receiptModal.item_name}
                                </strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E8F0", paddingTop: 8, fontSize: 14 }}>
                                <strong style={{ color: "#0F172A" }}>Total Paid</strong>
                                <strong style={{ color: "#15803D" }}>{formatCurrency(receiptModal.total_amount)}</strong>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button type="button" className="btn-secondary" onClick={() => setReceiptModal(null)}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handlePrintReceipt(receiptModal)}
                            >
                                Print Receipt
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
