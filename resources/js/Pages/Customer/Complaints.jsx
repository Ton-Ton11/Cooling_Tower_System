import { useCallback, useEffect, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../../utils/superAdmin";

export default function Complaints({ addToast }) {
    const [complaints, setComplaints] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [complaintDetails, setComplaintDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchComplaints = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await window.axios.get(CUSTOMER_ENDPOINTS.complaints);
            setComplaints(Array.isArray(data?.data) ? data.data : []);
            setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
        } catch (error) {
            if (addToast) {
                addToast(extractErrorMessage(error, "Unable to load problem reports."), "error");
            }
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
            if (addToast) {
                addToast("Please describe the problem in at least 10 characters.", "error");
            }
            return;
        }

        setSubmitting(true);
        try {
            const { data } = await window.axios.post(CUSTOMER_ENDPOINTS.storeComplaint, {
                booking_id: selectedBookingId ? Number(selectedBookingId) : null,
                complaint_details: complaintDetails.trim(),
            });

            if (addToast) {
                addToast(data.message || "Problem report sent to Manager and Super Admin.", "success");
            }
            setComplaintDetails("");
            setSelectedBookingId("");
            fetchComplaints();
        } catch (error) {
            if (addToast) {
                addToast(extractErrorMessage(error, "Failed to submit problem report."), "error");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChat = () => {
        window.dispatchEvent(new CustomEvent("open-customer-support-chat"));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Minimal Header */}
            <div
                className="p-6 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{
                    background: "linear-gradient(135deg, #0E1A33 0%, #1E2F5F 60%, #1D4ED8 100%)",
                }}
            >
                <div className="space-y-1">
                    <h1 className="text-2xl font-extrabold tracking-tight text-white">
                        Report Problem
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300">
                        Submit a service issue directly to the Manager and Super Admin.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleOpenChat}
                    className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-extrabold transition cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                    </svg>
                    <span>Chat Manager</span>
                </button>
            </div>

            {/* Submit Problem Report Card */}
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Related Booking (Optional)
                        </label>
                        <select
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                            <option value="">General Service Concern</option>
                            {bookings.map((b) => (
                                <option key={b.booking_id} value={b.booking_id}>
                                    Booking #{b.booking_id} — {b.service_name} ({b.scheduled_date}) [{b.booking_status}]
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Problem Details <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={4}
                            required
                            placeholder="Describe the issue clearly (e.g. unit still leaking after service, technician delay, or billing discrepancy)..."
                            value={complaintDetails}
                            onChange={(e) => setComplaintDetails(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-slate-400">
                            Delivered directly to Manager & Super Admin
                        </span>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold shadow-sm disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
                        >
                            {submitting ? "Submitting..." : "Submit Report"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Submitted Problem Reports List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-slate-900">
                        Submitted Reports ({complaints.length})
                    </h2>
                    <button
                        type="button"
                        onClick={fetchComplaints}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200/80">
                        Loading submitted reports...
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 text-slate-400 text-xs">
                        No problem reports submitted yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {complaints.map((c) => (
                            <div
                                key={c.complaint_id}
                                className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-xs text-slate-900">
                                                Report #{c.complaint_id}
                                            </span>
                                            {c.booking_id && (
                                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                    Booking #{c.booking_id} ({c.service_name || "Service"})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {c.complaint_date_formatted}
                                        </p>
                                    </div>
                                    <StatusBadge status={c.status} />
                                </div>

                                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                                    {c.complaint_details}
                                </p>

                                {c.management_response && (
                                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-extrabold text-blue-900">
                                                Management Response
                                            </span>
                                            {c.resolved_at_formatted && (
                                                <span className="text-[10px] text-blue-600">
                                                    {c.resolved_at_formatted}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-blue-950 leading-relaxed whitespace-pre-line">
                                            {c.management_response}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
