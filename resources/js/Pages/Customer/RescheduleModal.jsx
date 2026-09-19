import { useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatDateTime } from "../../utils/superAdmin";

export default function RescheduleModal({ booking, isOpen, onClose, onSuccess, addToast }) {
    const [newDate, setNewDate] = useState("");
    const [timeSlot, setTimeSlot] = useState("09:00");
    const [refNumber, setRefNumber] = useState("");
    const [senderName, setSenderName] = useState("");
    const [senderNumber, setSenderNumber] = useState("");
    const [reason, setReason] = useState("");
    const [receiptFile, setReceiptFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen || !booking) return null;

    const gcashAccount = "0917-123-4567";
    const gcashName = "Cooling Tower Airconditioning Services";
    const rescheduleFee = 150.00;

    const handleCopy = () => {
        navigator.clipboard.writeText("09171234567");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Calculate minimum allowed date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split("T")[0];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newDate) {
            addToast("Please select a new scheduled date.", "error");
            return;
        }

        if (!refNumber.trim() || refNumber.trim().length < 5) {
            addToast("Please enter a valid GCash reference number.", "error");
            return;
        }

        setSubmitting(true);
        const combinedDateTime = `${newDate} ${timeSlot}:00`;

        const formData = new FormData();
        formData.append("new_scheduled_date", combinedDateTime);
        formData.append("reschedule_fee", rescheduleFee);
        formData.append("reference_number", refNumber.trim());
        if (senderName.trim()) formData.append("sender_name", senderName.trim());
        if (senderNumber.trim()) formData.append("sender_number", senderNumber.trim());
        if (reason.trim()) formData.append("reschedule_reason", reason.trim());
        if (receiptFile) formData.append("receipt_image", receiptFile);

        try {
            const url = CUSTOMER_ENDPOINTS.rescheduleBooking(booking.booking_id);
            const { data } = await window.axios.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            addToast(data.message || "Booking rescheduled successfully!", "success");
            onSuccess();
            onClose();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to reschedule booking."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1E2F5F] to-[#2A437E] p-6 text-white rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold">Reschedule Service Booking</h3>
                        <p className="text-xs text-blue-200 mt-1">Booking #{booking.booking_id} — {booking.service_name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Current Schedule Info */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Schedule</p>
                            <p className="text-sm font-bold text-gray-800">{formatDateTime(booking.scheduled_date)}</p>
                        </div>
                    </div>

                    {/* New Schedule Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Select New Date & Time Slot <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">New Date</label>
                                <input
                                    type="date"
                                    min={minDateStr}
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Preferred Time</label>
                                <select
                                    value={timeSlot}
                                    onChange={(e) => setTimeSlot(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                >
                                    <option value="08:00">08:00 AM (Morning)</option>
                                    <option value="09:00">09:00 AM (Morning)</option>
                                    <option value="10:00">10:00 AM (Morning)</option>
                                    <option value="11:00">11:00 AM (Late Morning)</option>
                                    <option value="13:00">01:00 PM (Afternoon)</option>
                                    <option value="14:00">02:00 PM (Afternoon)</option>
                                    <option value="15:00">03:00 PM (Afternoon)</option>
                                    <option value="16:00">04:00 PM (Late Afternoon)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Reschedule Reason */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Reason for Rescheduling
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Unforeseen appointment, Out of town, Emergency"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                    </div>

                    {/* GCash Rescheduling Fee Notice */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-amber-500 ring-4 ring-amber-200" />
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                    Rescheduling Fee: ₱{rescheduleFee.toFixed(2)}
                                </h4>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-800">
                                GCash P2P
                            </span>
                        </div>
                        <p className="text-xs text-amber-800/80 mt-1.5 leading-relaxed">
                            To adjust technician dispatch and schedule locks, please send the ₱150.00 rescheduling fee via GCash Express Send.
                        </p>

                        <div className="mt-3 bg-white/90 rounded-lg p-2.5 border border-amber-200/60 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] text-gray-500 font-medium">GCash Account Name: <span className="font-bold text-gray-800">{gcashName}</span></p>
                                <p className="text-xs font-bold text-blue-600 font-mono tracking-wide mt-0.5">{gcashAccount}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition shrink-0"
                            >
                                {copied ? "Copied!" : "Copy No."}
                            </button>
                        </div>
                    </div>

                    {/* Payment Validation Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                GCash Reference Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 1002345678901 (13 digits)"
                                value={refNumber}
                                onChange={(e) => setRefNumber(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Sender Account Name</label>
                                <input
                                    type="text"
                                    placeholder="GCash account name"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Sender Contact No.</label>
                                <input
                                    type="text"
                                    placeholder="09XX XXX XXXX"
                                    value={senderNumber}
                                    onChange={(e) => setSenderNumber(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Upload GCash Receipt (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                "Confirm Reschedule"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
