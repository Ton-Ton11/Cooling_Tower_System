import { useCallback, useEffect, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatDateTime } from "../../utils/superAdmin";

export default function Complaints({ addToast }) {
    const [complaints, setComplaints] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [complaintDetails, setComplaintDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = (text, key) => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
        setCopiedKey(key);
        if (addToast) {
            addToast(`Copied ${text} to clipboard!`, "success");
        }
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const fallbackCopy = (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const fetchComplaints = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await window.axios.get(CUSTOMER_ENDPOINTS.complaints);
            setComplaints(Array.isArray(data?.data) ? data.data : []);
            setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load complaints."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!complaintDetails.trim() || complaintDetails.trim().length < 10) {
            addToast("Please provide a detailed explanation of the issue (at least 10 characters).", "error");
            return;
        }

        setSubmitting(true);
        try {
            const { data } = await window.axios.post(CUSTOMER_ENDPOINTS.storeComplaint, {
                booking_id: selectedBookingId ? Number(selectedBookingId) : null,
                complaint_details: complaintDetails.trim(),
            });

            addToast(data.message || "Your complaint has been submitted to management.", "success");
            setComplaintDetails("");
            setSelectedBookingId("");
            fetchComplaints();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to submit complaint."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="space-y-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Report a Problem / Customer Support</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Have an issue with a technician, incomplete work, or billing discrepancy? Submit your complaint directly to Cooling Tower management.
                    </p>
                </div>

                {/* Direct Service Center Support Banner */}
                <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase border border-emerald-300">
                                DTI Accredited
                            </span>
                            <span className="font-extrabold text-blue-900">Direct Service Center Contact & Walk-In</span>
                        </div>
                        <p className="text-[11px] text-blue-800">
                            Door 5, Apostol Bldg., Mayor Jaldon St. Canelar Zamboanga City • Authorized Service Center
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleCopy("0917 877 7670", "mobile")}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Click to copy Mobile Number"
                        >
                            <span>📞 {copiedKey === "mobile" ? "✓ Copied 0917 877 7670!" : "0917 877 7670"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCopy("062 310-2275", "telephone")}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs border border-blue-200 transition cursor-pointer"
                            title="Click to copy Telephone Number"
                        >
                            <span>{copiedKey === "telephone" ? "✓ Copied 062 310-2275!" : "Tel: 062 310-2275"}</span>
                        </button>
                        <a
                            href="https://www.facebook.com/share/19w3XmbCza/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-bold text-xs border border-[#1877F2]/30 transition flex items-center gap-1.5"
                            title="Message on Facebook"
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            <span>Facebook</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Submit Complaint Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Submit New Problem Report</h2>
                        <p className="text-xs text-gray-500">Your complaint will be reviewed with high priority by our Operations Manager.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Related Booking (Optional)
                        </label>
                        <select
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                        >
                            <option value="">-- General Service Concern (Not tied to specific booking) --</option>
                            {bookings.map((b) => (
                                <option key={b.booking_id} value={b.booking_id}>
                                    Booking #{b.booking_id} — {b.service_name} ({b.scheduled_date}) [{b.booking_status}]
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Problem Details & Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={4}
                            required
                            placeholder="Please describe the issue in detail (e.g., technician arrived late, unit is still leaking after cleaning, incorrect spare part charge, poor cleaning quality)..."
                            value={complaintDetails}
                            onChange={(e) => setComplaintDetails(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-400">Response time: Usually within 24 hours.</span>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Filing Complaint...
                                </>
                            ) : (
                                "Submit Complaint to Management"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Complaints History */}
            <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-900">Your Submitted Complaints History</h3>

                {loading ? (
                    <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                        Loading complaints history...
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 text-gray-500 text-xs">
                        No complaints filed yet. Everything looks good!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {complaints.map((c) => (
                            <div key={c.complaint_id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-xs text-gray-900">Complaint #{c.complaint_id}</span>
                                            {c.booking_id && (
                                                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                    Booking #{c.booking_id} ({c.service_name})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Submitted on {c.complaint_date_formatted}</p>
                                    </div>
                                    <StatusBadge status={c.status} />
                                </div>

                                <p className="text-xs text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-line">
                                    {c.complaint_details}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
