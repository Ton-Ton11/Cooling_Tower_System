import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
    CUSTOMER_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
} from "../../utils/superAdmin";
import {
    getOcularWorkspaceState,
    recordUserActivity,
    saveOcularWorkspaceState,
} from "../../utils/userActivityHistory";

const DOWN_PAYMENT = 7000;

const FULFILLMENT_LABELS = {
    pickup: "Store Pick Up",
    delivery: "Delivery to Customer's Place",
    delivery_installation: "Delivery & Installation",
};

export default function OcularInspectionPage({
    mode = "results", // "results" | "payment"
    initialBooking = null,
    initialSelectedRec = null,
    navMeta = null,
    currentUser = null,
    addToast,
    onNavigate,
    onBookingSync,
    onSelectUnitForPayment,
    onScheduleOrderInstallation,
    onDataChanged,
}) {
    const userId = currentUser?.id || currentUser?.user_id || null;
    const savedWorkspace = useMemo(() => getOcularWorkspaceState(userId), [userId]);

    const qtyInputId = useId();
    const refInputId = useId();
    const refHintId = useId();
    const senderInputId = useId();
    const receiptInputId = useId();

    const targetBookingId =
        navMeta?.bookingId ||
        initialBooking?.booking_id ||
        savedWorkspace?.bookingId ||
        null;

    const [booking, setBooking] = useState(() => {
        if (initialBooking && (!targetBookingId || Number(initialBooking.booking_id) === Number(targetBookingId))) {
            return initialBooking;
        }
        return null;
    });
    const [loadingBooking, setLoadingBooking] = useState(() => !booking);

    const [selectedRec, setSelectedRec] = useState(() => {
        if (initialSelectedRec) return initialSelectedRec;
        return null;
    });
    const [quantity, setQuantity] = useState(() =>
        Math.max(1, Number(navMeta?.quantity ?? savedWorkspace?.quantity ?? 1) || 1)
    );
    const [paymentMethod, setPaymentMethod] = useState(
        () => navMeta?.paymentMethod || savedWorkspace?.paymentMethod || "Cash"
    );
    const [fulfillmentType, setFulfillmentType] = useState(
        () =>
            navMeta?.fulfillmentType ||
            savedWorkspace?.fulfillmentType ||
            "delivery_installation"
    );
    const [referenceNumber, setReferenceNumber] = useState("");
    const [senderName, setSenderName] = useState("");
    const [receiptFile, setReceiptFile] = useState(null);
    const [validationError, setValidationError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchBookingById = useCallback(
        async (desiredBookingId, showLoader = false) => {
            if (showLoader) setLoadingBooking(true);
            try {
                const { data } = await window.axios.get(CUSTOMER_ENDPOINTS.bookings);
                const list = Array.isArray(data?.data) ? data.data : [];
                let matched = null;
                if (desiredBookingId) {
                    matched = list.find(
                        (item) => Number(item.booking_id) === Number(desiredBookingId)
                    );
                }
                if (!matched) {
                    matched = list.find(
                        (item) =>
                            (Boolean(item.is_ocular_inspection) || Number(item.service_id) === 4) &&
                            (item.inspection_status === "Submitted" ||
                                (Array.isArray(item.ocular_recommendations) &&
                                    item.ocular_recommendations.length > 0) ||
                                (Array.isArray(item.ocular_rooms) &&
                                    item.ocular_rooms.length > 0))
                    );
                }
                if (matched) {
                    setBooking(matched);
                    if (onBookingSync) onBookingSync(matched);
                }
                return matched;
            } catch (error) {
                if (showLoader && addToast) {
                    addToast(
                        extractErrorMessage(
                            error,
                            "Unable to load ocular inspection results."
                        ),
                        "error"
                    );
                }
                return null;
            } finally {
                if (showLoader) setLoadingBooking(false);
            }
        },
        [addToast, onBookingSync]
    );

    // Sync when initialBooking or navMeta changes
    useEffect(() => {
        if (
            initialBooking &&
            (!navMeta?.bookingId ||
                Number(initialBooking.booking_id) === Number(navMeta.bookingId))
        ) {
            setBooking(initialBooking);
            setLoadingBooking(false);
            fetchBookingById(initialBooking.booking_id, false);
        } else {
            fetchBookingById(targetBookingId, !booking);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBooking?.booking_id, navMeta?.bookingId]);

    // Sync selected recommendation from props, navMeta, or saved workspace
    useEffect(() => {
        if (initialSelectedRec) {
            setSelectedRec(initialSelectedRec);
            return;
        }
        if (!booking) return;
        const recs = Array.isArray(booking.ocular_recommendations)
            ? booking.ocular_recommendations
            : [];
        const desiredRecId =
            navMeta?.recommendationId ||
            (Number(savedWorkspace?.bookingId) === Number(booking.booking_id)
                ? savedWorkspace?.recommendationId
                : null);

        if (desiredRecId) {
            const found = recs.find(
                (r) => Number(r.recommendation_id) === Number(desiredRecId)
            );
            if (found) {
                setSelectedRec(found);
                return;
            }
        }
        if (mode === "payment" && !selectedRec && recs.length > 0) {
            const firstAvailable =
                recs.find((r) => r.ac_unit_id && r.unit_current_status !== "Sold") ||
                recs[0];
            setSelectedRec(firstAvailable || null);
        }
    }, [booking, initialSelectedRec, mode, navMeta?.recommendationId, savedWorkspace, selectedRec]);

    // Restore saved form options when returning via History navMeta
    useEffect(() => {
        if (!navMeta) return;
        if (navMeta.quantity) {
            setQuantity(Math.max(1, Number(navMeta.quantity) || 1));
        }
        if (navMeta.paymentMethod) {
            setPaymentMethod(navMeta.paymentMethod);
        }
        if (navMeta.fulfillmentType) {
            setFulfillmentType(navMeta.fulfillmentType);
        }
    }, [navMeta]);

    const rooms = useMemo(
        () => (Array.isArray(booking?.ocular_rooms) ? booking.ocular_rooms : []),
        [booking]
    );
    const recommendations = useMemo(
        () =>
            Array.isArray(booking?.ocular_recommendations)
                ? booking.ocular_recommendations
                : [],
        [booking]
    );
    const existingOrders = useMemo(
        () => (Array.isArray(booking?.ocular_orders) ? booking.ocular_orders : []),
        [booking]
    );

    // Record customer actions in History and persist workspace state
    useEffect(() => {
        if (!booking?.booking_id) return;

        if (mode === "results") {
            const meta = {
                bookingId: booking.booking_id,
                recommendationId: selectedRec?.recommendation_id || null,
                step: "results",
            };
            saveOcularWorkspaceState(userId, meta);
            recordUserActivity(userId, {
                pageId: "ocular_results",
                dedupeKey: `ocular_results_b${booking.booking_id}`,
                title: `Inspection Results & Recommended AC Units (#${booking.booking_id})`,
                description: `Booking #${booking.booking_id} • ${rooms.length} room(s) inspected • ${recommendations.length} recommended AC unit(s)`,
                icon: "ocular_results",
                meta,
            });
        } else if (mode === "payment" && selectedRec) {
            const meta = {
                bookingId: booking.booking_id,
                recommendationId: selectedRec.recommendation_id,
                quantity,
                paymentMethod,
                fulfillmentType,
                step: "payment",
            };
            saveOcularWorkspaceState(userId, meta);
            const fulfillmentLabel =
                FULFILLMENT_LABELS[fulfillmentType] || fulfillmentType;
            recordUserActivity(userId, {
                pageId: "ocular_payment",
                dedupeKey: `ocular_payment_b${booking.booking_id}`,
                title: `AC Unit Down Payment & Fulfillment (#${booking.booking_id})`,
                description: `${selectedRec.brand_recommendation}${
                    selectedRec.model ? ` ${selectedRec.model}` : ""
                } (${selectedRec.recommended_capacity} HP) • Qty ${quantity} • ${paymentMethod} • ${fulfillmentLabel}`,
                icon: "ocular_payment",
                meta,
            });
        }
    }, [
        booking?.booking_id,
        fulfillmentType,
        mode,
        paymentMethod,
        quantity,
        recommendations.length,
        rooms.length,
        selectedRec,
        userId,
    ]);

    const unitPrice = Number(selectedRec?.unit_price || 0);
    const totalUnitPrice = unitPrice * Math.max(1, Number(quantity) || 1);
    const downPayment = Math.min(
        DOWN_PAYMENT,
        totalUnitPrice > 0 ? totalUnitPrice : DOWN_PAYMENT
    );
    const remainingBalance = Math.max(0, totalUnitPrice - downPayment);

    const handleSelectUnit = (rec) => {
        if (!rec.ac_unit_id) {
            if (addToast) {
                addToast(
                    "This recommendation does not have a specific inventory unit linked yet.",
                    "error"
                );
            }
            return;
        }
        setSelectedRec(rec);
        setQuantity(1);
        setValidationError("");
        const meta = {
            bookingId: booking.booking_id,
            recommendationId: rec.recommendation_id,
            quantity: 1,
            paymentMethod,
            fulfillmentType,
            step: "payment",
        };
        saveOcularWorkspaceState(userId, meta);
        if (onSelectUnitForPayment) {
            onSelectUnitForPayment(booking, rec);
        } else if (onNavigate) {
            onNavigate("ocular_payment", meta);
        }
    };

    const handleGoToResults = () => {
        setValidationError("");
        if (onNavigate) {
            onNavigate("ocular_results", {
                bookingId: booking?.booking_id || null,
                recommendationId: selectedRec?.recommendation_id || null,
                step: "results",
            });
        }
    };

    const handleGoToPaymentStep = () => {
        if (!selectedRec?.ac_unit_id) return;
        setValidationError("");
        if (onNavigate) {
            onNavigate("ocular_payment", {
                bookingId: booking?.booking_id || null,
                recommendationId: selectedRec.recommendation_id,
                quantity,
                paymentMethod,
                fulfillmentType,
                step: "payment",
            });
        }
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setValidationError("");

        if (!booking?.booking_id || !selectedRec?.ac_unit_id) {
            const msg = "Please select an available recommended AC unit first.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        if (
            (paymentMethod === "Bank Transfer" || paymentMethod === "GCash") &&
            referenceNumber.trim().length < 5
        ) {
            const msg = `Please enter a valid ${paymentMethod} reference number (at least 5 characters).`;
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("recommendation_id", selectedRec.recommendation_id);
            fd.append("ac_unit_id", selectedRec.ac_unit_id);
            fd.append("quantity", Math.max(1, Number(quantity) || 1));
            fd.append("payment_method", paymentMethod);
            fd.append("fulfillment_type", fulfillmentType);
            if (referenceNumber.trim()) {
                fd.append("reference_number", referenceNumber.trim());
            }
            if (senderName.trim()) {
                fd.append("sender_name", senderName.trim());
            }
            if (receiptFile) {
                fd.append("receipt_image", receiptFile);
            }

            const { data } = await window.axios.post(
                CUSTOMER_ENDPOINTS.storeAcUnitOrder(booking.booking_id),
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (addToast) {
                addToast(
                    data.message || "AC unit order placed successfully!",
                    "success"
                );
            }
            const createdOrder = data?.order || data?.data;

            if (onDataChanged) {
                onDataChanged();
            }

            const refreshed = await fetchBookingById(booking.booking_id, false);
            const activeBookingId = refreshed?.booking_id || booking.booking_id;

            recordUserActivity(userId, {
                pageId: "ocular_results",
                dedupeKey: `ocular_results_b${activeBookingId}`,
                title: `AC Unit Order Confirmed (#${activeBookingId})`,
                description: `Ordered ${selectedRec.brand_recommendation}${
                    selectedRec.model ? ` ${selectedRec.model}` : ""
                } (${selectedRec.recommended_capacity} HP) • ₱${downPayment.toLocaleString()} down payment (${paymentMethod})`,
                icon: "ocular_results",
                meta: {
                    bookingId: activeBookingId,
                    recommendationId: selectedRec.recommendation_id,
                    step: "results",
                },
            });

            if (
                fulfillmentType === "delivery_installation" &&
                onScheduleOrderInstallation &&
                createdOrder
            ) {
                onScheduleOrderInstallation({
                    ...createdOrder,
                    ocular_booking_id: activeBookingId,
                    brand: selectedRec.brand_recommendation,
                    model: selectedRec.model || "",
                    horsepower: selectedRec.recommended_capacity,
                    ac_type: selectedRec.recommended_ac_type,
                    motor_type: selectedRec.motor_type_recommendation,
                });
            } else if (onNavigate) {
                onNavigate("ocular_results", {
                    bookingId: activeBookingId,
                    step: "results",
                });
            }
        } catch (error) {
            const msg = extractErrorMessage(
                error,
                "Unable to process AC unit purchase."
            );
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingBooking) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
                    <svg
                        className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    <p className="text-sm font-semibold text-gray-600">
                        Loading ocular inspection details...
                    </p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100 space-y-4">
                    <h1 className="text-lg font-extrabold text-gray-900">
                        No Ocular Inspection Selected
                    </h1>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Select an Ocular Inspection booking from My Bookings to view your room assessment and recommended AC units.
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate && onNavigate("bookings")}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                    >
                        &larr; Go to My Bookings
                    </button>
                </div>
            </div>
        );
    }

    const canJumpToPayment = Boolean(selectedRec?.ac_unit_id);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Top Navigation & Progress Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() =>
                        mode === "payment"
                            ? handleGoToResults()
                            : onNavigate && onNavigate("bookings")
                    }
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-700 text-xs font-bold shadow-xs transition self-start"
                >
                    <span>&larr;</span>
                    <span>
                        {mode === "payment"
                            ? "Back to Inspection Results"
                            : "Back to My Bookings"}
                    </span>
                </button>

                <nav
                    aria-label="Ocular inspection purchase steps"
                    className="flex items-center gap-2 text-xs flex-wrap"
                >
                    <button
                        type="button"
                        onClick={handleGoToResults}
                        disabled={submitting}
                        aria-current={mode === "results" ? "step" : undefined}
                        className={`px-3 py-1.5 rounded-xl font-bold transition border ${
                            mode === "results"
                                ? "bg-[#1E2F5F] text-white border-[#1E2F5F] shadow-xs"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                    >
                        1. Inspection Results & Units
                    </button>
                    <span className="text-gray-400 font-bold" aria-hidden="true">
                        &rsaquo;
                    </span>
                    <button
                        type="button"
                        onClick={handleGoToPaymentStep}
                        disabled={!canJumpToPayment || submitting}
                        aria-current={mode === "payment" ? "step" : undefined}
                        className={`px-3 py-1.5 rounded-xl font-bold transition border ${
                            mode === "payment"
                                ? "bg-[#1E2F5F] text-white border-[#1E2F5F] shadow-xs"
                                : canJumpToPayment
                                ? "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                                : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                    >
                        2. Down Payment & Fulfillment
                    </button>
                </nav>
            </div>

            {/* Page Banner Header */}
            <div className="bg-gradient-to-r from-[#1E2F5F] to-indigo-700 rounded-2xl px-6 py-5 text-white shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                    Booking #{booking.booking_id} • Ocular Inspection
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                    {mode === "results"
                        ? "Inspection Results & Recommended AC Units"
                        : "AC Unit Down Payment & Fulfillment"}
                </h1>
            </div>

            {mode === "results" ? (
                <div className="space-y-6">
                    {/* Purchased / Reserved Unit Orders */}
                    {existingOrders.length > 0 && (
                        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 shadow-xs">
                            <h2 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                                Purchased / Reserved Unit Orders ({existingOrders.length})
                            </h2>
                            <div className="space-y-2.5">
                                {existingOrders.map((ord) => (
                                    <div
                                        key={ord.order_id}
                                        className="bg-white rounded-xl p-3.5 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                    >
                                        <div>
                                            <span className="font-extrabold text-gray-900">
                                                Order #{ord.order_id}: {ord.brand}{" "}
                                                {ord.model || ""} ({ord.horsepower} HP)
                                            </span>
                                            <p className="text-gray-600 text-[11px] mt-0.5">
                                                Status: <strong>{ord.order_status}</strong> • Down Payment: ₱
                                                {Number(ord.down_payment_amount).toLocaleString()} • Balance: ₱
                                                {Number(ord.remaining_unit_balance).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {ord.fulfillment_type === "delivery_installation" &&
                                                !ord.installation_booking_id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (onScheduleOrderInstallation) {
                                                                onScheduleOrderInstallation({
                                                                    ...ord,
                                                                    ocular_booking_id: booking.booking_id,
                                                                });
                                                            }
                                                        }}
                                                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                                                    >
                                                        Schedule Installation
                                                    </button>
                                                )}
                                            {ord.manager_receipt_url && (
                                                <a
                                                    href={ord.manager_receipt_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                                                >
                                                    View Receipt
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 1: Inspected Room Dimensions & Thermal Load */}
                    <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                            Inspected Room Dimensions & Thermal Load ({rooms.length})
                        </h2>
                        {rooms.length === 0 ? (
                            <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                Room inspection data is being prepared by our team.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {rooms.map((rm, idx) => (
                                    <div
                                        key={rm.room_id || idx}
                                        className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/80 text-xs space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-extrabold text-gray-900">
                                                {rm.room_name || `Room ${idx + 1}`} — {rm.room_category}
                                            </h3>
                                            {rm.estimated_hp && (
                                                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] shrink-0">
                                                    Est. {rm.estimated_hp} HP
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-600">
                                            <span>
                                                Dimensions:{" "}
                                                <strong>
                                                    {rm.room_length} &times; {rm.room_width} &times;{" "}
                                                    {rm.ceiling_height} {rm.unit_of_measurement}
                                                </strong>
                                            </span>
                                            <span>
                                                Sun Exposure: <strong>{rm.sun_exposure_level}</strong>
                                            </span>
                                            <span>
                                                Max Occupancy: <strong>{rm.maximum_occupancy} pax</strong>
                                            </span>
                                            <span>
                                                Glazing: <strong>{rm.window_size_glazing}</strong>
                                            </span>
                                            <span className="col-span-2">
                                                Heat Equipment:{" "}
                                                <strong>{rm.heat_generating_equipment}</strong>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Section 2: Recommended AC Specifications & Brands */}
                    <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                            Recommended AC Specifications & Brands ({recommendations.length})
                        </h2>
                        {recommendations.length === 0 ? (
                            <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                AC unit recommendations will appear here once submitted by our Admin Assistant.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recommendations.map((rec) => {
                                    const isSoldOut = rec.unit_current_status === "Sold";
                                    const isCurrentlySelected =
                                        Number(selectedRec?.recommendation_id) ===
                                        Number(rec.recommendation_id);
                                    return (
                                        <div
                                            key={rec.recommendation_id}
                                            className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition ${
                                                isCurrentlySelected
                                                    ? "border-blue-500 ring-2 ring-blue-500/15"
                                                    : "border-gray-200 hover:border-blue-400"
                                            }`}
                                        >
                                            <div>
                                                <div className="h-44 bg-slate-100 flex items-center justify-center relative overflow-hidden border-b border-gray-100">
                                                    {rec.unit_image_url ? (
                                                        <img
                                                            src={rec.unit_image_url}
                                                            alt={`${rec.brand_recommendation} ${rec.model || "AC Unit"}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-center text-slate-400 p-4">
                                                            <svg
                                                                className="w-10 h-10 mx-auto mb-1 text-slate-300"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                aria-hidden="true"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="1.8"
                                                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                                />
                                                            </svg>
                                                            <span className="text-[11px] font-semibold">
                                                                {rec.brand_recommendation} {rec.recommended_ac_type}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span
                                                        className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                            rec.inventory_status === "Order-Base"
                                                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                        }`}
                                                    >
                                                        {rec.unit_current_status === "Reserved"
                                                            ? "Reserved"
                                                            : rec.inventory_status || "Available"}
                                                    </span>
                                                </div>

                                                <div className="p-4 space-y-2 text-xs">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <h3 className="text-sm font-extrabold text-gray-900">
                                                                {rec.brand_recommendation}{" "}
                                                                {rec.model ? `• ${rec.model}` : ""}
                                                            </h3>
                                                            {rec.price_range_label && (
                                                                <p className="text-[11px] text-gray-500">
                                                                    {rec.price_range_label}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {rec.unit_price > 0 && (
                                                            <span className="text-sm font-extrabold text-blue-700 shrink-0">
                                                                {formatCurrency(rec.unit_price)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[11px]">
                                                            {rec.recommended_capacity} HP
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-[11px]">
                                                            {rec.recommended_ac_type}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-semibold text-[11px]">
                                                            {rec.motor_type_recommendation}
                                                        </span>
                                                    </div>

                                                    {rec.notes && (
                                                        <p className="text-[11px] text-gray-600 pt-1">
                                                            {rec.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    disabled={!rec.ac_unit_id || isSoldOut}
                                                    onClick={() => handleSelectUnit(rec)}
                                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
                                                >
                                                    {isSoldOut
                                                        ? "Already Sold"
                                                        : "Select Unit to Buy"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            ) : !selectedRec ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 space-y-4">
                    <h2 className="text-base font-extrabold text-gray-900">
                        No AC Unit Selected Yet
                    </h2>
                    <p className="text-xs text-gray-500">
                        Please select a recommended AC unit from your inspection results to proceed with down payment and fulfillment.
                    </p>
                    <button
                        type="button"
                        onClick={handleGoToResults}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                        &larr; View Recommended AC Units
                    </button>
                </div>
            ) : (
                <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
                    <form
                        onSubmit={handleSubmitOrder}
                        noValidate
                        className="space-y-6 text-xs"
                    >
                        {validationError && (
                            <div
                                role="alert"
                                className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 font-semibold"
                            >
                                {validationError}
                            </div>
                        )}

                        {/* Selected AC Unit Summary */}
                        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                {selectedRec.unit_image_url && (
                                    <img
                                        src={selectedRec.unit_image_url}
                                        alt={`${selectedRec.brand_recommendation} ${selectedRec.model || "AC Unit"}`}
                                        className="w-16 h-16 rounded-xl object-cover border border-blue-200 shrink-0"
                                    />
                                )}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                                        Selected AC Unit
                                    </span>
                                    <h2 className="text-sm font-extrabold text-gray-900">
                                        {selectedRec.brand_recommendation}{" "}
                                        {selectedRec.model || ""} (
                                        {selectedRec.recommended_capacity} HP)
                                    </h2>
                                    <p className="text-[11px] text-gray-600">
                                        {selectedRec.recommended_ac_type} •{" "}
                                        {selectedRec.motor_type_recommendation} • Unit Price:{" "}
                                        <strong>{formatCurrency(unitPrice)}</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <label
                                    htmlFor={qtyInputId}
                                    className="font-bold text-gray-700"
                                >
                                    Qty
                                </label>
                                <input
                                    id={qtyInputId}
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={quantity}
                                    onChange={(e) =>
                                        setQuantity(
                                            Math.max(
                                                1,
                                                parseInt(e.target.value, 10) || 1
                                            )
                                        )
                                    }
                                    className="w-16 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-center"
                                />
                            </div>
                        </div>

                        {/* 1. Payment Method Selection */}
                        <fieldset className="space-y-2.5 border-0 p-0 m-0">
                            <legend className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] mb-2">
                                Payment Method
                            </legend>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {["Cash", "Bank Transfer", "GCash"].map((method) => {
                                    const checked = paymentMethod === method;
                                    return (
                                        <label
                                            key={method}
                                            className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                                checked
                                                    ? "border-blue-600 bg-blue-50/70 text-blue-900"
                                                    : "border-gray-200 hover:border-blue-200 bg-white text-gray-700"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="payment_method"
                                                value={method}
                                                checked={checked}
                                                onChange={() => {
                                                    setPaymentMethod(method);
                                                    setValidationError("");
                                                }}
                                                className="mt-0.5 text-blue-600"
                                            />
                                            <div>
                                                <span className="block text-xs font-extrabold">
                                                    {method}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-normal">
                                                    {method === "Cash"
                                                        ? "Pay ₱7,000 down payment"
                                                        : `Transfer ₱7,000 via ${method}`}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* 2. Fulfillment Option */}
                        <fieldset className="space-y-2.5 border-0 p-0 m-0">
                            <legend className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] mb-2">
                                {paymentMethod === "Cash"
                                    ? "How would you like to receive your AC unit?"
                                    : "Unit Fulfillment Option"}
                            </legend>
                            <div className="grid grid-cols-1 gap-2.5">
                                {[
                                    {
                                        id: "pickup",
                                        title: "Store Pick Up",
                                        desc: "Pay ₱7,000 down payment now, then pay the remaining full balance upon store pick up.",
                                    },
                                    {
                                        id: "delivery",
                                        title: "Delivery to Customer's Place",
                                        desc: "Pay ₱7,000 down payment now, then pay the remaining full balance + delivery fee after delivery.",
                                    },
                                    {
                                        id: "delivery_installation",
                                        title: "Delivery & Installation",
                                        desc: "Pay ₱7,000 down payment now, then proceed directly to select your preferred Installation schedule.",
                                    },
                                ].map((opt) => {
                                    const checked = fulfillmentType === opt.id;
                                    return (
                                        <label
                                            key={opt.id}
                                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                                                checked
                                                    ? "border-blue-600 bg-blue-50/50"
                                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="fulfillment_type"
                                                value={opt.id}
                                                checked={checked}
                                                onChange={() => setFulfillmentType(opt.id)}
                                                className="mt-0.5 text-blue-600"
                                            />
                                            <div>
                                                <span className="font-extrabold text-gray-900 block">
                                                    {opt.title}
                                                </span>
                                                <span className="text-[11px] text-gray-600">
                                                    {opt.desc}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* Bank Transfer / GCash Reference Details */}
                        {(paymentMethod === "Bank Transfer" ||
                            paymentMethod === "GCash") && (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3.5">
                                <div className="bg-white rounded-xl p-3.5 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-gray-400 block">
                                            {paymentMethod === "GCash"
                                                ? "GCash Account"
                                                : "BDO Bank Transfer Account"}
                                        </span>
                                        <p className="font-extrabold text-gray-900 text-sm font-mono">
                                            {paymentMethod === "GCash"
                                                ? "0917 877 7670"
                                                : "0045-8012-9431 (BDO Unibank)"}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                            Cooling Tower Airconditioning Services
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold self-start sm:self-auto">
                                        Down Payment: {formatCurrency(downPayment)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label
                                            htmlFor={refInputId}
                                            className="block font-bold text-gray-700 mb-0.5"
                                        >
                                            Reference Number{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <span
                                            id={refHintId}
                                            className="block text-[11px] text-gray-500 mb-1"
                                        >
                                            Enter the transaction reference number from your receipt.
                                        </span>
                                        <input
                                            id={refInputId}
                                            type="text"
                                            required
                                            maxLength={40}
                                            aria-describedby={refHintId}
                                            value={referenceNumber}
                                            onChange={(e) => {
                                                setReferenceNumber(e.target.value);
                                                if (validationError) setValidationError("");
                                            }}
                                            placeholder="e.g. 100234567890"
                                            className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor={senderInputId}
                                            className="block font-bold text-gray-700 mb-0.5"
                                        >
                                            Sender Name
                                        </label>
                                        <span className="block text-[11px] text-gray-500 mb-1">
                                            Account holder name used for transfer.
                                        </span>
                                        <input
                                            id={senderInputId}
                                            type="text"
                                            autoComplete="name"
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            placeholder="e.g. Juan Dela Cruz"
                                            className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor={receiptInputId}
                                        className="block font-bold text-gray-700 mb-1"
                                    >
                                        Upload Payment Receipt (Optional)
                                    </label>
                                    <input
                                        id={receiptInputId}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setReceiptFile(e.target.files?.[0] || null)
                                        }
                                        className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold bg-white border border-gray-300 rounded-xl p-1.5"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Payment Breakdown Summary */}
                        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-2">
                            <div className="flex items-center justify-between text-slate-300">
                                <span>
                                    Total AC Unit Price ({quantity} unit
                                    {quantity > 1 ? "s" : ""})
                                </span>
                                <span className="font-bold text-white">
                                    {formatCurrency(totalUnitPrice)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-300">
                                <span>Required Down Payment Now</span>
                                <span className="text-base font-extrabold">
                                    {formatCurrency(downPayment)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-slate-200">
                                <span>
                                    Remaining Unit Balance
                                    {fulfillmentType === "delivery"
                                        ? " (+ Delivery Fee upon delivery)"
                                        : ""}
                                    {fulfillmentType === "delivery_installation"
                                        ? " (+ Delivery & Installation Fee after service)"
                                        : ""}
                                </span>
                                <span className="font-extrabold">
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleGoToResults}
                                disabled={submitting}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition"
                            >
                                &larr; Back to Units
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold shadow-md disabled:opacity-50 transition"
                            >
                                {submitting
                                    ? "Processing..."
                                    : fulfillmentType === "delivery_installation"
                                    ? `Confirm ₱${downPayment.toLocaleString()} Down Payment & Schedule Installation`
                                    : `Confirm ₱${downPayment.toLocaleString()} Down Payment`}
                            </button>
                        </div>
                    </form>
                </section>
            )}
        </div>
    );
}

