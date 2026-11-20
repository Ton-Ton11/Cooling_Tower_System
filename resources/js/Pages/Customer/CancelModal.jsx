import { useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../../utils/superAdmin";

export default function CancelModal({ booking, isOpen, onClose, onSuccess, addToast }) {
    const [reasonPreset, setReasonPreset] = useState("Change of personal schedule / No longer available");
    const [customReason, setCustomReason] = useState("");
    const [fulfillmentSwitch, setFulfillmentSwitch] = useState("delivery");
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !booking) return null;

    const linkedOrder = booking.ac_unit_order || null;

    const reasons = [
        "Change of personal schedule / No longer available",
        "Found alternative service / Already resolved",
        "Need to select a different AC unit / service type",
        "Emergency / Out of town",
        "Other reasons",
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        const finalReason = reasonPreset === "Other reasons"
            ? customReason.trim()
            : (customReason.trim() ? `${reasonPreset}: ${customReason.trim()}` : reasonPreset);

        if (!finalReason || finalReason.length < 5) {
            addToast("Please provide a valid cancellation reason (at least 5 characters).", "error");
            return;
        }

        setSubmitting(true);
        try {
            const url = CUSTOMER_ENDPOINTS.cancelBooking(booking.booking_id);
            const payload = {
                cancellation_reason: finalReason,
            };
            if (linkedOrder) {
                payload.fulfillment_switch = fulfillmentSwitch;
            }
            const { data } = await window.axios.patch(url, payload);

            addToast(data.message || "Booking has been cancelled.", "success");
            onSuccess();
            onClose();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to cancel booking."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Cancel Service Booking</h3>
                            <p className="text-xs text-red-100">Booking #{booking.booking_id} — {booking.service_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-900 leading-relaxed">
                        Are you sure you want to cancel this booking request? Once cancelled, the assigned technician reservation will be released.
                    </div>

                    {linkedOrder && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                            <p className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                                Purchased AC Unit Fulfillment Option ({linkedOrder.brand} {linkedOrder.model || ""})
                            </p>
                            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                                fulfillmentSwitch === "delivery" ? "bg-white border-blue-500 ring-1 ring-blue-500/20" : "bg-white/60 border-amber-200"
                            }`}>
                                <input
                                    type="radio"
                                    name="fulfillment_switch"
                                    value="delivery"
                                    checked={fulfillmentSwitch === "delivery"}
                                    onChange={() => setFulfillmentSwitch("delivery")}
                                    className="mt-0.5 text-blue-600"
                                />
                                <div>
                                    <span className="font-bold text-gray-900 block">Delivery Instead (Cancel Installation Only)</span>
                                    <span className="text-gray-600 text-[11px]">
                                        Unit will be delivered to your address. Remaining unit balance + delivery fee payable upon delivery.
                                    </span>
                                </div>
                            </label>

                            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                                fulfillmentSwitch === "pickup" ? "bg-white border-rose-500 ring-1 ring-rose-500/20" : "bg-white/60 border-amber-200"
                            }`}>
                                <input
                                    type="radio"
                                    name="fulfillment_switch"
                                    value="pickup"
                                    checked={fulfillmentSwitch === "pickup"}
                                    onChange={() => setFulfillmentSwitch("pickup")}
                                    className="mt-0.5 text-rose-600"
                                />
                                <div>
                                    <span className="font-bold text-gray-900 block">Pick Up Instead (Cancel Delivery & Installation)</span>
                                    <span className="text-rose-700 font-semibold text-[11px]">
                                        Note: Installation booking fee (₱300.00) is non-refundable. Remaining unit balance payable upon store pick up.
                                    </span>
                                </div>
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Reason for Cancellation <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={reasonPreset}
                            onChange={(e) => setReasonPreset(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition mb-3"
                        >
                            {reasons.map((r, i) => (
                                <option key={i} value={r}>{r}</option>
                            ))}
                        </select>

                        <label className="block text-xs text-gray-500 mb-1">
                            Additional Details / Explanation {reasonPreset === "Other reasons" && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Please provide any additional details for our team..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            required={reasonPreset === "Other reasons"}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-none"
                        />
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Keep Booking
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-500/20 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting ? "Cancelling..." : "Confirm Cancellation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
