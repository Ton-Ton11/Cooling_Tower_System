import { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import ReceiptActionButton from "../../Components/ReceiptActionButton";
import GcashPaymentCard, { OFFICIAL_GCASH_NUMBER } from "../../Components/GcashPaymentCard";
import Modal from "../../Components/Modal";
import {
    CUSTOMER_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

const CATEGORY_TABS = [
    { id: "spare_part", label: "Spare Parts" },
    { id: "material", label: "Materials" },
    { id: "tool", label: "Tools" },
];

export default function BuyItems({
    addToast,
    currentUser,
    onScheduleReplacement,
    onDataChanged,
}) {
    const [activeSection, setActiveSection] = useState("catalog"); // 'catalog' | 'orders'
    const [category, setCategory] = useState("spare_part");
    const [toolSubtypeFilter, setToolSubtypeFilter] = useState("all"); // 'all' | 'hand' | 'power'
    const [search, setSearch] = useState("");
    const [items, setItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [gcashInfo, setGcashInfo] = useState({
        account_number: OFFICIAL_GCASH_NUMBER,
        account_name: "Cooling Tower Airconditioning Services",
    });
    const [loading, setLoading] = useState(true);
    const [nowMs, setNowMs] = useState(Date.now());

    // Order Modal State
    const [selectedItem, setSelectedItem] = useState(null);
    const [techConsultAck, setTechConsultAck] = useState(false);
    const [sparePartStep, setSparePartStep] = useState("reminder"); // 'reminder' | 'checkout'
    const [quantity, setQuantity] = useState(1);
    const [amountPaid, setAmountPaid] = useState("");
    const [refNumber, setRefNumber] = useState("");
    const [senderName, setSenderName] = useState(currentUser?.full_name || "");
    const [senderNumber, setSenderNumber] = useState(currentUser?.contact_number || "");
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [notes, setNotes] = useState("");
    const [copied, setCopied] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Incomplete Payment Settlement Modal
    const [settleOrder, setSettleOrder] = useState(null);
    const [settleAmount, setSettleAmount] = useState("");
    const [settleRef, setSettleRef] = useState("");
    const [settleSenderName, setSettleSenderName] = useState("");
    const [settleSenderNumber, setSettleSenderNumber] = useState("");
    const [settleReceiptFile, setSettleReceiptFile] = useState(null);
    const [settling, setSettling] = useState(false);

    // Fulfillment & Receipt State
    const [fulfillmentSubmittingId, setFulfillmentSubmittingId] = useState(null);
    const [receiptModalOrder, setReceiptModalOrder] = useState(null);

    const isUnverifiedBusiness =
        currentUser?.account_type === "business" &&
        (currentUser?.verification_status || "approved") !== "approved";

    const fetchData = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);
            try {
                const { data } = await window.axios.get(CUSTOMER_ENDPOINTS.itemOrders);
                setItems(Array.isArray(data?.items) ? data.items : []);
                setOrders(Array.isArray(data?.orders) ? data.orders : []);
                if (data?.gcash) {
                    setGcashInfo(data.gcash);
                }
            } catch (error) {
                addToast(extractErrorMessage(error, "Unable to load items."), "error");
            } finally {
                setLoading(false);
            }
        },
        [addToast]
    );

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Tick every second when any order has an active 10-minute incomplete payment timer
    const hasIncompleteOrders = useMemo(
        () => orders.some((o) => o.order_status === "Payment Incomplete"),
        [orders]
    );

    useEffect(() => {
        if (!hasIncompleteOrders) return;
        const interval = setInterval(() => {
            const current = Date.now();
            setNowMs(current);
            // Auto-refresh once when any timer crosses zero so server auto-cancels immediately
            const justExpired = orders.some((o) => {
                if (o.order_status !== "Payment Incomplete" || !o.payment_deadline_at) return false;
                const diff = new Date(o.payment_deadline_at).getTime() - current;
                return diff <= 0 && diff > -1500;
            });
            if (justExpired) {
                fetchData(false);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [hasIncompleteOrders, orders, fetchData]);

    const categoryCounts = useMemo(() => {
        return {
            spare_part: items.filter((i) => i.item_category === "spare_part").length,
            material: items.filter((i) => i.item_category === "material").length,
            tool: items.filter((i) => i.item_category === "tool").length,
        };
    }, [items]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            if (item.item_category !== category) return false;
            if (category === "tool" && toolSubtypeFilter !== "all" && item.tool_subtype !== toolSubtypeFilter) {
                return false;
            }
            if (!q) return true;
            const hay = [
                item.item_name,
                item.sub_category,
                ...(Array.isArray(item.compatible_brands) ? item.compatible_brands : []),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [items, category, toolSubtypeFilter, search]);

    const actionableOrders = useMemo(
        () =>
            orders.filter((o) =>
                ["Payment Incomplete", "Awaiting Fulfillment Choice"].includes(o.order_status)
            ),
        [orders]
    );

    const openOrderModal = (item) => {
        if (isUnverifiedBusiness) {
            addToast("Item ordering will unlock once your business account is verified.", "error");
            return;
        }
        setSelectedItem(item);
        setQuantity(1);
        const initialTotal = Number(item.unit_price || 0);
        const minDown = Math.round(initialTotal * 0.5 * 100) / 100;
        setAmountPaid(item.item_category === "spare_part" ? minDown.toFixed(2) : "");
        setRefNumber("");
        setSenderName(currentUser?.full_name || "");
        setSenderNumber(currentUser?.contact_number || "");
        setReceiptFile(null);
        setReceiptPreview(null);
        setNotes("");
        if (item.item_category === "spare_part") {
            setTechConsultAck(false);
            setSparePartStep("reminder");
        } else {
            setTechConsultAck(true);
            setSparePartStep("checkout");
        }
    };

    const closeOrderModal = () => {
        if (submitting) return;
        setSelectedItem(null);
        setReceiptFile(null);
        setReceiptPreview(null);
    };

    const maxSelectableQty = useMemo(() => {
        if (!selectedItem) return 1;
        if (selectedItem.item_category === "spare_part" && selectedItem.is_order_base) {
            return 50;
        }
        return Math.max(1, Number(selectedItem.quantity_on_hand || 1));
    }, [selectedItem]);

    const totalPrice = useMemo(() => {
        if (!selectedItem) return 0;
        return Math.round(Number(selectedItem.unit_price || 0) * quantity * 100) / 100;
    }, [selectedItem, quantity]);

    const requiresGcash = useMemo(() => {
        if (!selectedItem) return false;
        return selectedItem.item_category === "spare_part" || quantity >= 6;
    }, [selectedItem, quantity]);

    const minDownPayment = useMemo(() => {
        if (!requiresGcash) return 0;
        return Math.round(totalPrice * 0.5 * 100) / 100;
    }, [requiresGcash, totalPrice]);

    // Sync default 50% down payment when quantity or GCash requirement changes
    const handleQuantityChange = (nextQtyRaw) => {
        const clamped = Math.max(1, Math.min(maxSelectableQty, parseInt(nextQtyRaw, 10) || 1));
        setQuantity(clamped);
        if (selectedItem) {
            const nextTotal = Math.round(Number(selectedItem.unit_price || 0) * clamped * 100) / 100;
            const willNeedGcash = selectedItem.item_category === "spare_part" || clamped >= 6;
            if (willNeedGcash) {
                setAmountPaid((Math.round(nextTotal * 0.5 * 100) / 100).toFixed(2));
            } else {
                setAmountPaid("");
            }
        }
    };

    const handleCopyGcash = () => {
        navigator.clipboard.writeText((gcashInfo.account_number || "09178777670").replace(/[^0-9]/g, ""));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (!selectedItem || submitting) return;

        if (selectedItem.item_category === "spare_part" && !techConsultAck) {
            addToast("Please acknowledge the technician check-up reminder first.", "error");
            return;
        }

        if (requiresGcash) {
            const numericPaid = Number(amountPaid);
            if (!Number.isFinite(numericPaid) || numericPaid < minDownPayment - 0.009) {
                addToast(`Down payment must be at least 50% (${formatCurrency(minDownPayment)}).`, "error");
                return;
            }
            if (numericPaid > totalPrice + 0.009) {
                addToast(`Amount paid cannot exceed ${formatCurrency(totalPrice)}.`, "error");
                return;
            }
            if (refNumber.trim().length < 5 || refNumber.trim().length > 13) {
                addToast("Enter a valid GCash reference number (5–13 characters).", "error");
                return;
            }
        }

        setSubmitting(true);
        const fd = new FormData();
        fd.append("item_id", selectedItem.item_id);
        fd.append("quantity", quantity);
        if (selectedItem.item_category === "spare_part") {
            fd.append("technician_consulted_acknowledged", "1");
        }
        if (notes.trim()) fd.append("notes", notes.trim());

        if (requiresGcash) {
            fd.append("amount_paid", Number(amountPaid).toFixed(2));
            fd.append("reference_number", refNumber.trim());
            if (senderName.trim()) fd.append("sender_name", senderName.trim());
            if (senderNumber.trim()) fd.append("sender_number", senderNumber.trim());
            if (receiptFile) fd.append("receipt_image", receiptFile);
        }

        try {
            const { data } = await window.axios.post(CUSTOMER_ENDPOINTS.storeItemOrder, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            addToast(data?.message || "Order placed!", "success");
            setSelectedItem(null);
            await fetchData(false);
            setActiveSection("orders");
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to place item order."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const openSettleModal = (order) => {
        setSettleOrder(order);
        const minNeeded = Math.max(Number(order.down_payment_amount || 0), Number(order.amount_paid || 0));
        setSettleAmount(minNeeded.toFixed(2));
        setSettleRef("");
        setSettleSenderName(order.sender_name || currentUser?.full_name || "");
        setSettleSenderNumber(order.sender_number || currentUser?.contact_number || "");
        setSettleReceiptFile(null);
    };

    const handleSettleSubmit = async (e) => {
        e.preventDefault();
        if (!settleOrder || settling) return;
        const minDown = Number(settleOrder.down_payment_amount || 0);
        const total = Number(settleOrder.total_amount || 0);
        const numericPaid = Number(settleAmount);

        if (!Number.isFinite(numericPaid) || numericPaid < minDown - 0.009 || numericPaid > total + 0.009) {
            addToast(`Enter a valid GCash payment between ${formatCurrency(minDown)} and ${formatCurrency(total)}.`, "error");
            return;
        }
        if (settleRef.trim().length < 5 || settleRef.trim().length > 13) {
            addToast("Enter a valid GCash reference number (5–13 characters).", "error");
            return;
        }

        setSettling(true);
        const fd = new FormData();
        fd.append("amount_paid", numericPaid.toFixed(2));
        fd.append("reference_number", settleRef.trim());
        if (settleSenderName.trim()) fd.append("sender_name", settleSenderName.trim());
        if (settleSenderNumber.trim()) fd.append("sender_number", settleSenderNumber.trim());
        if (settleReceiptFile) fd.append("receipt_image", settleReceiptFile);

        try {
            const { data } = await window.axios.post(
                CUSTOMER_ENDPOINTS.completeItemOrderPayment(settleOrder.order_id),
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            addToast(data?.message || "Payment submitted!", "success");
            setSettleOrder(null);
            await fetchData(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to settle payment."), "error");
            fetchData(false);
        } finally {
            setSettling(false);
        }
    };

    const handleSelectFulfillment = async (order, choice) => {
        if (fulfillmentSubmittingId) return;
        setFulfillmentSubmittingId(order.order_id);
        try {
            const { data } = await window.axios.post(
                CUSTOMER_ENDPOINTS.selectItemOrderFulfillment(order.order_id),
                { fulfillment_type: choice }
            );
            addToast(data?.message || "Fulfillment updated.", "success");
            const updatedOrder = data?.data || order;
            await fetchData(false);
            onDataChanged?.();

            if (choice === "delivery_replace" && onScheduleReplacement) {
                onScheduleReplacement(updatedOrder);
            }
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update fulfillment choice."), "error");
        } finally {
            setFulfillmentSubmittingId(null);
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
                        <div class="sub">Official Item Purchase Receipt</div>
                        <div class="row"><span>Reference No.</span><strong>${order.receipt_reference_number || "—"}</strong></div>
                        <div class="row"><span>Transaction Date</span><strong>${order.transaction_date_formatted || formatDateTime(order.transaction_date)}</strong></div>
                        <div class="row"><span>Confirmed By</span><strong>${order.confirmed_by_name || "Admin Assistant"}</strong></div>
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

    const formatCountdown = (deadlineIso) => {
        if (!deadlineIso) return "00:00";
        const secs = Math.max(0, Math.floor((new Date(deadlineIso).getTime() - nowMs) / 1000));
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        return `${m}:${s}`;
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">Buy Items</h1>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                        Reserve AC spare parts or purchase on-hand materials and tools.
                    </p>
                </div>

                {/* View Switcher */}
                <div className="inline-flex items-center bg-white border border-[#E2E8F0] rounded-xl p-1 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setActiveSection("catalog")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activeSection === "catalog"
                                ? "bg-[#2563EB] text-white"
                                : "text-[#64748B] hover:text-[#172B4D]"
                        }`}
                    >
                        Catalog
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection("orders")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeSection === "orders"
                                ? "bg-[#2563EB] text-white"
                                : "text-[#64748B] hover:text-[#172B4D]"
                        }`}
                    >
                        <span>My Orders</span>
                        {orders.length > 0 && (
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    activeSection === "orders"
                                        ? "bg-white/20 text-white"
                                        : actionableOrders.length > 0
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                {orders.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Urgent Action Banner when on Catalog tab */}
            {activeSection === "catalog" && actionableOrders.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-amber-950">
                        <span className="font-extrabold">Action Required:</span>{" "}
                        {actionableOrders[0].order_status === "Payment Incomplete" ? (
                            <>
                                Order #{actionableOrders[0].order_id} ({actionableOrders[0].item_name}) needs payment settlement within{" "}
                                <strong className="font-mono text-red-700">
                                    {formatCountdown(actionableOrders[0].payment_deadline_at)}
                                </strong>
                                .
                            </>
                        ) : (
                            <>
                                Payment confirmed for Order #{actionableOrders[0].order_id} ({actionableOrders[0].item_name}) — choose Store Pickup or Technician Replacement.
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setActiveSection("orders")}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                        View Order
                    </button>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                CATALOG VIEW
            ══════════════════════════════════════════════════════════════════ */}
            {activeSection === "catalog" && (
                <>
                    {/* Category Filter & Search */}
                    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {CATEGORY_TABS.map((t) => {
                                const isSel = category === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setCategory(t.id)}
                                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                                            isSel
                                                ? "bg-[#2563EB] text-white"
                                                : "bg-[#F4F7FB] hover:bg-[#EAF2FF] text-[#64748B] hover:text-[#172B4D]"
                                        }`}
                                    >
                                        <span>{t.label}</span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                isSel ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#172B4D]"
                                            }`}
                                        >
                                            {categoryCounts[t.id] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}

                            {category === "tool" && (
                                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                                    {[
                                        { id: "all", label: "All" },
                                        { id: "hand", label: "Hand" },
                                        { id: "power", label: "Power" },
                                    ].map((sub) => (
                                        <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => setToolSubtypeFilter(sub.id)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                                toolSubtypeFilter === sub.id
                                                    ? "bg-slate-800 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {sub.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search item or brand..."
                                className="w-full pl-9 pr-3.5 py-2 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg text-xs text-[#172B4D] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] transition"
                            />
                            <svg
                                className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Concise Category Policy Hint */}
                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                        {category === "spare_part" ? (
                            <span>
                                <strong>Spare Parts:</strong> Min. 50% GCash down payment • Store Pickup or Free-Booking Technician Replacement once confirmed.
                            </span>
                        ) : (
                            <span>
                                <strong>{category === "material" ? "Materials" : "Tools"}:</strong> Store Pickup only • Pay in store for 1–5 items (50% GCash down payment for 6+ items).
                            </span>
                        )}
                    </div>

                    {/* Items Grid */}
                    {loading ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                            <p className="text-sm font-semibold text-slate-500">Loading items...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                            <p className="text-sm font-bold text-slate-700">No available items in this category</p>
                            <p className="text-xs text-slate-400 mt-1">Try switching categories or clearing your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.item_id}
                                    className="bg-white rounded-2xl p-5 border border-[#E2E8F0] hover:border-blue-300 transition flex flex-col justify-between gap-4 shadow-xs"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                {item.sub_category}
                                                {item.tool_subtype
                                                    ? ` · ${item.tool_subtype === "power" ? "Power Tool" : "Hand Tool"}`
                                                    : ""}
                                            </span>
                                            <StatusBadge status={item.is_order_base ? "Order Base" : "Available"} />
                                        </div>

                                        <h3 className="text-sm font-extrabold text-[#0F172A] leading-snug">
                                            {item.item_name}
                                        </h3>

                                        {item.compatible_brands?.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {item.compatible_brands.slice(0, 4).map((br) => (
                                                    <span
                                                        key={br}
                                                        className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100"
                                                    >
                                                        {br}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-extrabold text-[#172B4D]">
                                                {formatCurrency(item.unit_price)}
                                                <span className="text-xs font-normal text-slate-400"> / {item.unit}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                {item.is_order_base
                                                    ? "Pre-order / Order-Base"
                                                    : `${item.quantity_on_hand} ${item.unit} on hand`}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openOrderModal(item)}
                                            className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition cursor-pointer shrink-0"
                                        >
                                            {item.item_category === "spare_part" ? "Order" : "Buy"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MY ITEM ORDERS VIEW
            ══════════════════════════════════════════════════════════════════ */}
            {activeSection === "orders" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                            <p className="text-sm font-semibold text-slate-500">Loading your orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 space-y-3">
                            <p className="text-sm font-bold text-slate-700">No item orders yet</p>
                            <button
                                type="button"
                                onClick={() => setActiveSection("catalog")}
                                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                            >
                                Browse Catalog
                            </button>
                        </div>
                    ) : (
                        orders.map((order) => {
                            const isSparePart = order.item_category === "spare_part";
                            const isPaymentIncomplete = order.order_status === "Payment Incomplete";
                            const canChooseFulfillment =
                                isSparePart &&
                                order.payment_review_status === "Sufficient" &&
                                order.order_status === "Awaiting Fulfillment Choice";
                            const isCompleted = order.order_status === "Completed";

                            return (
                                <div
                                    key={order.order_id}
                                    className="bg-white rounded-2xl p-5 border border-[#E2E8F0] space-y-4 shadow-xs"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                                    Order #{order.order_id}
                                                </span>
                                                <h3 className="text-base font-extrabold text-[#0F172A]">
                                                    {order.item_name}
                                                </h3>
                                                <StatusBadge status={order.order_status} />
                                                {order.is_order_base && <StatusBadge status="Order Base" />}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Qty: <strong>{order.quantity} {order.unit}</strong> · Total:{" "}
                                                <strong>{formatCurrency(order.total_amount)}</strong> · Paid:{" "}
                                                <strong className="text-emerald-700">{formatCurrency(order.amount_paid)}</strong>
                                                {order.remaining_balance > 0 && (
                                                    <>
                                                        {" "}· Balance:{" "}
                                                        <strong className="text-amber-700">
                                                            {formatCurrency(order.remaining_balance)}
                                                        </strong>
                                                    </>
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {isPaymentIncomplete && (
                                                <button
                                                    type="button"
                                                    onClick={() => openSettleModal(order)}
                                                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                                                >
                                                    Settle Payment ({formatCountdown(order.payment_deadline_at)})
                                                </button>
                                            )}

                                            {Array.isArray(order.receipts) && order.receipts.length > 0 ? (
                                                <ReceiptActionButton receipts={order.receipts} />
                                            ) : (
                                                isCompleted &&
                                                order.receipt_reference_number && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReceiptModalOrder(order)}
                                                        className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
                                                    >
                                                        Receipt
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Incomplete Payment Notice */}
                                    {isPaymentIncomplete && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <strong>Payment Incomplete:</strong>{" "}
                                                {order.payment_incomplete_reason || "Please settle the required 50% GCash down payment."}
                                            </div>
                                            <span className="font-mono font-extrabold text-red-700 shrink-0">
                                                Auto-cancels in {formatCountdown(order.payment_deadline_at)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Locked Fulfillment Info while Pending Payment Review */}
                                    {isSparePart && order.order_status === "Pending Payment Review" && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                                            Waiting for Admin Assistant payment verification. Fulfillment options (Store Pickup or Technician Replacement) will unlock once confirmed.
                                        </div>
                                    )}

                                    {/* Unlocked Post-Confirmation Fulfillment Choice for Spare Parts */}
                                    {canChooseFulfillment && (
                                        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
                                            <div className="text-xs font-bold text-blue-950">
                                                Payment Confirmed — Choose Fulfillment Option:
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    disabled={fulfillmentSubmittingId === order.order_id}
                                                    onClick={() => handleSelectFulfillment(order, "pickup")}
                                                    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-left transition cursor-pointer"
                                                >
                                                    <div className="text-xs font-extrabold text-slate-900">
                                                        Pick Up (Store Pickup)
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-1">
                                                        Pick up at Cooling Tower store and settle any remaining balance on-site.
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={fulfillmentSubmittingId === order.order_id}
                                                    onClick={() => handleSelectFulfillment(order, "delivery_replace")}
                                                    className="p-3.5 rounded-xl bg-white border border-blue-300 hover:border-blue-600 text-left transition cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-extrabold text-blue-900">
                                                            Deliver & Replace by Technician
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                            Free Booking Fee
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 mt-1">
                                                        Schedule a Repair / Replacement visit (₱0.00 booking fee waived).
                                                    </p>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ready for Pickup Info */}
                                    {order.order_status === "Ready for Pickup" && (
                                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                                            <span>
                                                <strong>Ready for Store Pickup</strong> ·{" "}
                                                {order.remaining_balance > 0
                                                    ? `Remaining balance on pickup: ${formatCurrency(order.remaining_balance)}`
                                                    : "Fully paid — ready to release at store"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Linked Replacement Booking Info */}
                                    {order.linked_booking_id && (
                                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
                                            <span>
                                                Linked Replacement Booking: <strong>#{order.linked_booking_id}</strong>
                                                {order.linked_scheduled_date ? ` · ${order.linked_scheduled_date}` : ""}
                                            </span>
                                            {order.linked_booking_status && (
                                                <StatusBadge status={order.linked_booking_status} />
                                            )}
                                        </div>
                                    )}

                                    {order.order_status === "Cancelled" && order.cancellation_reason && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                                            {order.cancellation_reason}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: ORDER / BUY ITEM
            ══════════════════════════════════════════════════════════════════ */}
            <Modal show={!!selectedItem} onClose={closeOrderModal} maxWidth="lg">
                {selectedItem && (
                    <div className="p-6 space-y-5">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
                            <div>
                                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                                    {selectedItem.item_category === "spare_part"
                                        ? "AC Spare Part Order"
                                        : `Store Pickup · ${selectedItem.item_type}`}
                                </span>
                                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                                    {selectedItem.item_name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={closeOrderModal}
                                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step 1 for Spare Parts: Mandatory Technician Check-up Reminder */}
                        {selectedItem.item_category === "spare_part" && sparePartStep === "reminder" ? (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="space-y-1 text-xs text-amber-950 leading-relaxed">
                                        <p className="font-extrabold text-sm">Technician Check-up Reminder</p>
                                        <p>
                                            Before choosing spare parts, please make sure your AC unit has already been checked up or consulted by a technician.
                                        </p>
                                    </div>
                                </div>

                                <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={techConsultAck}
                                        onChange={(e) => setTechConsultAck(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300"
                                    />
                                    <span className="text-xs font-semibold text-slate-800">
                                        I confirm that my AC unit has already been checked up or consulted by a technician.
                                    </span>
                                </label>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeOrderModal}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!techConsultAck}
                                        onClick={() => setSparePartStep("checkout")}
                                        className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitOrder} className="space-y-4">
                                {/* Item & Quantity Summary */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Unit Price: <strong>{formatCurrency(selectedItem.unit_price)}</strong> / {selectedItem.unit}
                                        </div>
                                        <div className="text-base font-extrabold text-slate-900 mt-1">
                                            Total: {formatCurrency(totalPrice)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-slate-700">Qty</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={maxSelectableQty}
                                            value={quantity}
                                            onChange={(e) => handleQuantityChange(e.target.value)}
                                            className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center"
                                        />
                                    </div>
                                </div>

                                {selectedItem.item_category !== "spare_part" && (
                                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                                        <strong>Store Pickup Only:</strong>{" "}
                                        {quantity >= 6
                                            ? `Orders of 6 or more items require at least 50% GCash down payment (${formatCurrency(minDownPayment)}).`
                                            : "No advance payment needed for 1–5 items. Pay in store upon pickup."}
                                    </div>
                                )}

                                {/* GCash Payment Section (Spare Parts OR >= 6 Materials/Tools) */}
                                {requiresGcash && (
                                    <div className="space-y-3.5">
                                        <div className="bg-[#10213F] rounded-xl p-4 text-white space-y-3">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                                                    Min. 50% GCash Down Payment
                                                </span>
                                                <div className="text-xl font-extrabold mt-0.5">
                                                    {formatCurrency(minDownPayment)}
                                                    <span className="text-xs font-normal text-blue-200">
                                                        {" "}– {formatCurrency(totalPrice)}
                                                    </span>
                                                </div>
                                            </div>

                                            <GcashPaymentCard
                                                variant="dark"
                                                compact
                                                accountNumber={gcashInfo.account_number}
                                                accountName={gcashInfo.account_name}
                                            />
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs font-bold text-slate-700">
                                                        Amount Paid via GCash <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAmountPaid(minDownPayment.toFixed(2))}
                                                            className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold cursor-pointer"
                                                        >
                                                            50% ({formatCurrency(minDownPayment)})
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAmountPaid(totalPrice.toFixed(2))}
                                                            className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold cursor-pointer"
                                                        >
                                                            100% ({formatCurrency(totalPrice)})
                                                        </button>
                                                    </div>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min={minDownPayment}
                                                    max={totalPrice}
                                                    value={amountPaid}
                                                    onChange={(e) => setAmountPaid(e.target.value)}
                                                    required
                                                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    GCash Reference No. <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={13}
                                                    value={refNumber}
                                                    onChange={(e) =>
                                                        setRefNumber(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 13))
                                                    }
                                                    placeholder="e.g. 1002345678901"
                                                    required
                                                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-600 mb-1">Sender Name</label>
                                                    <input
                                                        type="text"
                                                        value={senderName}
                                                        onChange={(e) => setSenderName(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-600 mb-1">Sender Number</label>
                                                    <input
                                                        type="tel"
                                                        maxLength={11}
                                                        value={senderNumber}
                                                        onChange={(e) =>
                                                            setSenderNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
                                                        }
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">GCash Receipt Image</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0] || null;
                                                        setReceiptFile(f);
                                                        setReceiptPreview(f ? URL.createObjectURL(f) : null);
                                                    }}
                                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
                                                />
                                                {receiptPreview && (
                                                    <img
                                                        src={receiptPreview}
                                                        alt="Receipt preview"
                                                        className="mt-2 w-24 h-24 object-cover rounded-xl border border-slate-200"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeOrderModal}
                                        disabled={submitting}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : requiresGcash
                                            ? "Submit Order & Payment"
                                            : "Reserve for Pickup"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: SETTLE INCOMPLETE PAYMENT (10-MIN TIMER)
            ══════════════════════════════════════════════════════════════════ */}
            <Modal show={!!settleOrder} onClose={() => !settling && setSettleOrder(null)} maxWidth="md">
                {settleOrder && (
                    <form onSubmit={handleSettleSubmit} className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    Settle GCash Payment — Order #{settleOrder.order_id}
                                </h3>
                                <p className="text-xs text-red-700 font-bold mt-0.5">
                                    Time remaining: {formatCountdown(settleOrder.payment_deadline_at)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettleOrder(null)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {settleOrder.payment_incomplete_reason && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950">
                                {settleOrder.payment_incomplete_reason}
                            </div>
                        )}

                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1">
                            <div>
                                Item: <strong>{settleOrder.quantity}x {settleOrder.item_name}</strong>
                            </div>
                            <div>
                                Required Min. 50% Down Payment:{" "}
                                <strong>{formatCurrency(settleOrder.down_payment_amount)}</strong> (Total:{" "}
                                {formatCurrency(settleOrder.total_amount)})
                            </div>
                        </div>

                        <GcashPaymentCard
                            variant="light"
                            compact
                            accountNumber={gcashInfo.account_number}
                            accountName={gcashInfo.account_name}
                        />

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Total GCash Amount Paid <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min={settleOrder.down_payment_amount}
                                max={settleOrder.total_amount}
                                value={settleAmount}
                                onChange={(e) => setSettleAmount(e.target.value)}
                                required
                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                GCash Reference No. <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={13}
                                value={settleRef}
                                onChange={(e) => setSettleRef(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 13))}
                                required
                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Updated Receipt Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSettleReceiptFile(e.target.files?.[0] || null)}
                                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setSettleOrder(null)}
                                disabled={settling}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={settling}
                                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
                            >
                                {settling ? "Submitting..." : "Submit Payment"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: COMPLETED ORDER RECEIPT
            ══════════════════════════════════════════════════════════════════ */}
            <Modal show={!!receiptModalOrder} onClose={() => setReceiptModalOrder(null)} maxWidth="sm">
                {receiptModalOrder && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                    Official Receipt
                                </span>
                                <h3 className="text-base font-extrabold text-slate-900 mt-0.5 font-mono">
                                    {receiptModalOrder.receipt_reference_number}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReceiptModalOrder(null)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                                <span className="text-slate-500">Transaction Date</span>
                                <strong className="text-slate-900">
                                    {receiptModalOrder.transaction_date_formatted ||
                                        formatDateTime(receiptModalOrder.transaction_date)}
                                </strong>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                                <span className="text-slate-500">Confirmed By</span>
                                <strong className="text-slate-900">
                                    {receiptModalOrder.confirmed_by_name || "Admin Assistant"}
                                </strong>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                                <span className="text-slate-500">Item</span>
                                <strong className="text-slate-900">
                                    {receiptModalOrder.quantity}x {receiptModalOrder.item_name}
                                </strong>
                            </div>
                            <div className="flex justify-between pt-2 text-sm">
                                <span className="font-bold text-slate-700">Total Paid</span>
                                <strong className="text-emerald-700 font-extrabold">
                                    {formatCurrency(receiptModalOrder.total_amount)}
                                </strong>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setReceiptModalOrder(null)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrintReceipt(receiptModalOrder)}
                                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
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
