import { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import RescheduleModal from "./RescheduleModal";
import CancelModal from "./CancelModal";
import FeedbackModal from "./FeedbackModal";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatCurrency, formatDateTime } from "../../utils/superAdmin";

const TABS = ["Pending", "Active", "Completed", "Cancelled", "All"];

export default function MyBookings({ addToast, onNavigate, defaultTab = "Pending" }) {
    const [tab, setTab] = useState(defaultTab);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modals
    const [rescheduleBooking, setRescheduleBooking] = useState(null);
    const [cancelBooking, setCancelBooking] = useState(null);
    const [feedbackBooking, setFeedbackBooking] = useState(null);
    const [viewDetailsBooking, setViewDetailsBooking] = useState(null);

    const fetchBookings = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(CUSTOMER_ENDPOINTS.bookings);
            setBookings(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load your bookings."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const filteredBookings = useMemo(() => {
        return bookings.filter((b) => {
            // Tab filtering
            let matchTab = true;
            if (tab === "Pending") matchTab = b.booking_status === "Pending" || b.booking_status === "Rescheduled";
            else if (tab === "Active") matchTab = ["Approved", "Dispatched", "In-Progress"].includes(b.booking_status);
            else if (tab === "Completed") matchTab = b.booking_status === "Completed";
            else if (tab === "Cancelled") matchTab = b.booking_status === "Cancelled";

            if (!matchTab) return false;

            // Search filtering
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
                String(b.booking_id).includes(term) ||
                (b.service_name && b.service_name.toLowerCase().includes(term)) ||
                (b.reference_number && b.reference_number.toLowerCase().includes(term)) ||
                (b.assigned_tech_name && b.assigned_tech_name.toLowerCase().includes(term))
            );
        });
    }, [bookings, tab, searchTerm]);

    const counts = useMemo(() => {
        return {
            Pending: bookings.filter(b => b.booking_status === "Pending" || b.booking_status === "Rescheduled").length,
            Active: bookings.filter(b => ["Approved", "Dispatched", "In-Progress"].includes(b.booking_status)).length,
            Completed: bookings.filter(b => b.booking_status === "Completed").length,
            Cancelled: bookings.filter(b => b.booking_status === "Cancelled").length,
            All: bookings.length,
        };
    }, [bookings]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Service Bookings</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Track upcoming appointments, reschedule pending requests, or rate completed services.
                    </p>
                </div>
                <button
                    onClick={() => onNavigate && onNavigate("book")}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 self-start sm:self-auto"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Book New Service
                </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {TABS.map((t) => {
                        const isSel = tab === t;
                        const count = counts[t] ?? 0;
                        return (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                                    isSel
                                        ? "bg-[#1E2F5F] text-white shadow-sm"
                                        : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                                }`}
                            >
                                <span>{t}</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        isSel ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Search booking #, service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Bookings List */}
            {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
                    <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-600">Loading your service bookings...</p>
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-800">No {tab !== "All" ? tab.toLowerCase() : ""} bookings found</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        {tab === "Pending" ? "You don't have any bookings waiting for admin approval." : "You don't have any bookings under this filter category."}
                    </p>
                    <button
                        onClick={() => onNavigate && onNavigate("book")}
                        className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                    >
                        Schedule a Service Now
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredBookings.map((b) => {
                        const isPending = b.booking_status === "Pending" || b.booking_status === "Rescheduled";
                        const isCompleted = b.booking_status === "Completed";
                        const isCancelled = b.booking_status === "Cancelled";
                        const canReschedule = isPending || ["Approved"].includes(b.booking_status);
                        const canCancel = isPending;

                        return (
                            <div
                                key={b.booking_id}
                                className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-all duration-200"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                    <div className="flex items-start gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold text-sm border border-blue-100">
                                            #{b.booking_id}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h3 className="text-base font-extrabold text-gray-900">{b.service_name}</h3>
                                                <StatusBadge status={b.booking_status} />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <span>Booked on {b.created_at_formatted}</span>
                                                <span>•</span>
                                                <span className="font-semibold text-gray-700">Base Price: {formatCurrency(b.service_base_price)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                                        {canReschedule && (
                                            <button
                                                onClick={() => setRescheduleBooking(b)}
                                                className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                Reschedule (₱150)
                                            </button>
                                        )}

                                        {canCancel && (
                                            <button
                                                onClick={() => setCancelBooking(b)}
                                                className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-700 text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                Cancel
                                            </button>
                                        )}

                                        {isCompleted && (
                                            <button
                                                onClick={() => setFeedbackBooking(b)}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                                    b.feedback
                                                        ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                                                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                }`}
                                            >
                                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                {b.feedback ? `Rated (${b.feedback.rating}★)` : "Submit Feedback"}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setViewDetailsBooking(b)}
                                            className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>

                                {/* Body Information Grid */}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Service Schedule</span>
                                        <span className="text-xs font-bold text-gray-800 mt-1 block flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {formatDateTime(b.scheduled_date)}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Assigned Technician</span>
                                        <span className="text-xs font-bold text-gray-800 mt-1 block">
                                            {b.assigned_tech_name ? (
                                                <span className="text-blue-700 font-bold">{b.assigned_tech_name}</span>
                                            ) : (
                                                <span className="text-amber-600 font-semibold italic">Waiting for Dispatch</span>
                                            )}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">GCash Booking Fee</span>
                                        <span className="text-xs font-mono font-bold text-emerald-700 mt-1 block">
                                            ₱{Number(b.booking_fee_paid || 0).toFixed(2)} (Ref: {b.reference_number || "N/A"})
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Service Payment Method</span>
                                        <span className="text-xs font-bold text-gray-800 mt-1 block">
                                            {b.service_payment_method || "Cash"}
                                        </span>
                                    </div>
                                </div>

                                {isCancelled && b.cancellation_reason && (
                                    <div className="mt-3 bg-rose-50/80 border border-rose-100 rounded-xl p-3 text-xs text-rose-900">
                                        <span className="font-bold">Cancellation Reason:</span> {b.cancellation_reason}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            <RescheduleModal
                booking={rescheduleBooking}
                isOpen={Boolean(rescheduleBooking)}
                onClose={() => setRescheduleBooking(null)}
                onSuccess={() => fetchBookings(false)}
                addToast={addToast}
            />

            <CancelModal
                booking={cancelBooking}
                isOpen={Boolean(cancelBooking)}
                onClose={() => setCancelBooking(null)}
                onSuccess={() => fetchBookings(false)}
                addToast={addToast}
            />

            <FeedbackModal
                booking={feedbackBooking}
                isOpen={Boolean(feedbackBooking)}
                onClose={() => setFeedbackBooking(null)}
                onSuccess={() => fetchBookings(false)}
                addToast={addToast}
            />

            {/* View Details Modal */}
            {viewDetailsBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                            <div>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Booking Details</span>
                                <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
                                    #{viewDetailsBooking.booking_id} — {viewDetailsBooking.service_name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setViewDetailsBooking(null)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="font-semibold text-gray-400 uppercase text-[10px]">Status</p>
                                    <div className="mt-1"><StatusBadge status={viewDetailsBooking.booking_status} /></div>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-400 uppercase text-[10px]">Scheduled Date & Time</p>
                                    <p className="font-bold text-gray-800 mt-1">{formatDateTime(viewDetailsBooking.scheduled_date)}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-400 uppercase text-[10px]">Service Base Price</p>
                                    <p className="font-extrabold text-blue-700 mt-1">{formatCurrency(viewDetailsBooking.service_base_price)}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-400 uppercase text-[10px]">Assigned Technician</p>
                                    <p className="font-bold text-gray-800 mt-1">{viewDetailsBooking.assigned_tech_name || "Awaiting Assignment"}</p>
                                </div>
                            </div>

                            {viewDetailsBooking.notes && (
                                <div>
                                    <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Notes & History</p>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 mt-1 whitespace-pre-line">{viewDetailsBooking.notes}</p>
                                </div>
                            )}

                            {/* Payments History */}
                            <div>
                                <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-2">Payment Records</p>
                                {viewDetailsBooking.payments?.length ? (
                                    <div className="space-y-2">
                                        {viewDetailsBooking.payments.map((p, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                                                <div>
                                                    <span className="font-bold text-gray-800">{p.payment_type}</span>
                                                    <p className="text-gray-500 font-mono text-[11px] mt-0.5">Ref: {p.reference_number || "None"} • {p.payment_method}</p>
                                                </div>
                                                <span className="font-extrabold text-emerald-700">{formatCurrency(p.amount_paid)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 italic">No payments logged yet.</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setViewDetailsBooking(null)}
                                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
