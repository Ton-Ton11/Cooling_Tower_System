import { useCallback, useEffect, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import FeedbackModal from "./FeedbackModal";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatCurrency, formatDateTime } from "../../utils/superAdmin";

export default function ServiceHistory({ addToast }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedbackBooking, setFeedbackBooking] = useState(null);

    const fetchCompletedBookings = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await window.axios.get(`${CUSTOMER_ENDPOINTS.bookings}?status=Completed`);
            setBookings(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load service history."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchCompletedBookings();
    }, [fetchCompletedBookings]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Completed Service History</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Review your completed airconditioning service history and provide feedback on our technicians' performance.
                </p>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
                    <svg className="animate-spin h-8 w-8 text-emerald-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-600">Loading service history...</p>
                </div>
            ) : bookings.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-800">No Completed Services Yet</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        Once our technicians complete your scheduled service appointments, your history and review forms will appear here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {bookings.map((b) => (
                        <div
                            key={b.booking_id}
                            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all duration-200"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                <div className="flex items-start gap-3.5">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-xs border border-emerald-100">
                                        #{b.booking_id}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h3 className="text-base font-bold text-gray-900">{b.service_name}</h3>
                                            <StatusBadge status="Completed" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Serviced on {formatDateTime(b.scheduled_date)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setFeedbackBooking(b)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                                            b.feedback
                                                ? "bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                                        }`}
                                    >
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        {b.feedback ? `Update Rating (${b.feedback.rating}★)` : "Rate This Service"}
                                    </button>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Assigned Technician</span>
                                    <p className="font-bold text-gray-800 mt-0.5">{b.assigned_tech_name || "Cooling Tower Technician"}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Service Cost</span>
                                    <p className="font-bold text-blue-700 mt-0.5">{formatCurrency(b.service_base_price)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Payment Status</span>
                                    <p className="font-bold text-emerald-700 mt-0.5">Paid in Full ({b.service_payment_method || "Cash"})</p>
                                </div>
                            </div>

                            {/* Feedback Preview if already reviewed */}
                            {b.feedback && (
                                <div className="mt-3 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                                    <div className="flex text-amber-400 shrink-0 mt-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <svg
                                                key={star}
                                                className={`w-3.5 h-3.5 ${star <= b.feedback.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <div>
                                        <span className="font-bold text-amber-900">Your Review:</span>
                                        <p className="text-amber-800/90 mt-0.5 italic">"{b.feedback.feedback || "Service rating submitted."}"</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <FeedbackModal
                booking={feedbackBooking}
                isOpen={Boolean(feedbackBooking)}
                onClose={() => setFeedbackBooking(null)}
                onSuccess={() => fetchCompletedBookings()}
                addToast={addToast}
            />
        </div>
    );
}
