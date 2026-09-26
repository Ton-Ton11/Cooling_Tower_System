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

    // Quotation action state
    const [quotationActionLoading, setQuotationActionLoading] = useState(false);
    const [quotationNotesModal, setQuotationNotesModal] = useState(null); // { action: 'accept'|'decline'|'clarify', bookingId }
    const [quotationNotes, setQuotationNotes] = useState("");

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
            let matchTab = true;
            if (tab === "Pending") matchTab = b.booking_status === "Pending" || b.booking_status === "Rescheduled";
            else if (tab === "Active") matchTab = ["Approved", "Dispatched", "In-Progress"].includes(b.booking_status);
            else if (tab === "Completed") matchTab = b.booking_status === "Completed";
            else if (tab === "Cancelled") matchTab = b.booking_status === "Cancelled";

            if (!matchTab) return false;

            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
                String(b.booking_id).includes(term) ||
                (b.service_name && b.service_name.toLowerCase().includes(term)) ||
                (b.reference_number && b.reference_number.toLowerCase().includes(term)) ||
                (b.assigned_tech_name && b.assigned_tech_name.toLowerCase().includes(term)) ||
                (b.quotation_status && b.quotation_status.toLowerCase().includes(term))
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

    // Handle Quotation Response (Accept / Decline / Clarify)
    const handleQuotationResponse = async (action, bookingId, notes = "") => {
        setQuotationActionLoading(true);
        try {
            const url = CUSTOMER_ENDPOINTS.respondQuotation(bookingId);
            const { data } = await window.axios.post(url, {
                action,
                notes: notes.trim() || null,
            });

            addToast(data.message || `Quotation response recorded (${action})!`, "success");
            setQuotationNotesModal(null);
            setQuotationNotes("");

            // Update in-memory state
            fetchBookings(false);

            if (viewDetailsBooking && viewDetailsBooking.booking_id === bookingId) {
                setViewDetailsBooking(prev => ({
                    ...prev,
                    quotation_status: action === "accept" ? "Accepted" : action === "decline" ? "Declined" : "Clarification Requested",
                    service_order_status: action === "accept" ? "Service Order Generated" : prev.service_order_status,
                }));
            }
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to submit quotation response."), "error");
        } finally {
            setQuotationActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Service Bookings</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Track your service requests, review official quotations, confirm appointment schedules, and view service orders.
                    </p>
                </div>
                <button
                    onClick={() => onNavigate && onNavigate("book")}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 self-start sm:self-auto"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Service Request
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
                        {tab === "Pending" ? "You don't have any service requests currently in review." : "You don't have any bookings matching this category."}
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
                        const unitsCount = b.total_units_count
                            ? b.total_units_count
                            : Array.isArray(b.units_data) && b.units_data.length > 0
                            ? b.units_data.reduce((sum, u) => sum + (parseInt(u.quantity, 10) || 1), 0)
                            : 1;
                        const qStatus = b.quotation_status || "Pending Assessment";
                        const hasQuotationToReview = qStatus === "Quotation Issued";

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
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                                    qStatus === "Accepted"
                                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                        : qStatus === "Quotation Issued"
                                                        ? "bg-blue-50 text-blue-800 border-blue-200 animate-pulse"
                                                        : qStatus === "Declined"
                                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                                }`}>
                                                    Quotation: {qStatus}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                                <span>Requested on {b.created_at_formatted}</span>
                                                <span>•</span>
                                                <span className="font-semibold text-gray-700">{unitsCount} Aircon Unit(s)</span>
                                                <span>•</span>
                                                <span className="text-emerald-700 font-semibold">Reservation Fee: ₱{Number(b.booking_fee_paid || 300).toFixed(2)} (Paid)</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                                        {hasQuotationToReview && (
                                            <button
                                                onClick={() => setViewDetailsBooking(b)}
                                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                                            >
                                                <span>📋 Review Quotation</span>
                                            </button>
                                        )}

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
                                            View Details & Quotation
                                        </button>
                                    </div>
                                </div>

                                {/* Body Information Grid */}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Preferred Schedule</span>
                                        <span className="text-xs font-bold text-gray-800 mt-1 block flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {formatDateTime(b.scheduled_date)}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Assigned Service Team</span>
                                        <span className="text-xs font-bold text-gray-800 mt-1 block">
                                            {b.assigned_team_name ? (
                                                <span className="text-blue-700 font-bold flex items-center gap-1">
                                                    <span>👥</span>
                                                    <span>{b.assigned_team_name}</span>
                                                </span>
                                            ) : b.assigned_tech_name ? (
                                                <span className="text-blue-700 font-bold">👤 {b.assigned_tech_name}</span>
                                            ) : (
                                                <span className="text-amber-600 font-semibold italic">Waiting for Assessment</span>
                                            )}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Reservation Fee</span>
                                        <span className="text-xs font-mono font-bold text-emerald-700 mt-1 block">
                                            ₱{Number(b.booking_fee_paid || 300).toFixed(2)} (Ref: {b.reference_number || "N/A"})
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Service Order Status</span>
                                        <span className="text-xs font-bold text-gray-800 mt-1 block">
                                            {b.service_order_status || "Pending Quotation"}
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

            {/* ══════════════════════════════════════════════════════════════════
                VIEW DETAILS & OFFICIAL QUOTATION MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {viewDetailsBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                            <div>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Service Request Details</span>
                                <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">
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

                        {/* Top Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                            <div>
                                <p className="font-semibold text-gray-400 uppercase text-[10px]">Booking Status</p>
                                <div className="mt-1"><StatusBadge status={viewDetailsBooking.booking_status} /></div>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-400 uppercase text-[10px]">Quotation Status</p>
                                <p className="font-bold text-blue-700 mt-1">{viewDetailsBooking.quotation_status || "Pending Assessment"}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-400 uppercase text-[10px]">Preferred Date</p>
                                <p className="font-bold text-gray-800 mt-1">{formatDateTime(viewDetailsBooking.scheduled_date)}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-400 uppercase text-[10px]">Service Order</p>
                                <p className="font-bold text-gray-800 mt-1">{viewDetailsBooking.service_order_status || "Pending Quotation"}</p>
                            </div>
                        </div>

                        {/* SECTION: OFFICIAL QUOTATION WORKFLOW */}
                        <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                        ₱
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-extrabold text-blue-950">Official Service Quotation</h4>
                                        <p className="text-[11px] text-blue-800/80">Proposed final charges for requested service scope</p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                                    viewDetailsBooking.quotation_status === "Accepted"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : viewDetailsBooking.quotation_status === "Declined"
                                        ? "bg-rose-100 text-rose-800"
                                        : viewDetailsBooking.quotation_status === "Quotation Issued"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-amber-100 text-amber-800"
                                }`}>
                                    {viewDetailsBooking.quotation_status || "Pending Assessment"}
                                </span>
                            </div>

                            {/* Quotation Content */}
                            {viewDetailsBooking.quotation_data ? (
                                <div className="space-y-4 text-xs">
                                    {/* Breakdown Table */}
                                    <div className="bg-white rounded-xl p-4 border border-blue-100 space-y-2.5">
                                        <div className="flex items-center justify-between text-gray-600">
                                            <span>Labor & Technical Work</span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(viewDetailsBooking.quotation_data.labor || 0)}</span>
                                        </div>
                                        {viewDetailsBooking.quotation_data.spare_parts > 0 && (
                                            <div className="flex items-center justify-between text-gray-600">
                                                <span>Spare Parts</span>
                                                <span className="font-semibold text-gray-900">{formatCurrency(viewDetailsBooking.quotation_data.spare_parts)}</span>
                                            </div>
                                        )}
                                        {viewDetailsBooking.quotation_data.materials > 0 && (
                                            <div className="flex items-center justify-between text-gray-600">
                                                <span>Materials & Piping</span>
                                                <span className="font-semibold text-gray-900">{formatCurrency(viewDetailsBooking.quotation_data.materials)}</span>
                                            </div>
                                        )}
                                        {viewDetailsBooking.quotation_data.refrigerant > 0 && (
                                            <div className="flex items-center justify-between text-gray-600">
                                                <span>Refrigerant / Freon</span>
                                                <span className="font-semibold text-gray-900">{formatCurrency(viewDetailsBooking.quotation_data.refrigerant)}</span>
                                            </div>
                                        )}
                                        {viewDetailsBooking.quotation_data.additional_charges > 0 && (
                                            <div className="flex items-center justify-between text-gray-600">
                                                <span>Additional Charges</span>
                                                <span className="font-semibold text-gray-900">{formatCurrency(viewDetailsBooking.quotation_data.additional_charges)}</span>
                                            </div>
                                        )}

                                        <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-gray-700 font-semibold">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(viewDetailsBooking.quotation_data.subtotal || 0)}</span>
                                        </div>

                                        {/* Reservation Fee Deduction */}
                                        <div className="flex items-center justify-between text-emerald-700 font-medium">
                                            <span>Less: Appointment Reservation Fee Paid</span>
                                            <span>- {formatCurrency(300)}</span>
                                        </div>

                                        <div className="border-t-2 border-blue-600 pt-2 flex items-center justify-between text-sm font-extrabold text-blue-950">
                                            <span>Net Payable Balance</span>
                                            <span className="text-base text-blue-700">
                                                {formatCurrency((viewDetailsBooking.quotation_data.total || 0) - 300)}
                                            </span>
                                        </div>
                                    </div>

                                    {viewDetailsBooking.quotation_data.terms && (
                                        <div className="text-[11px] text-gray-500 italic bg-white/60 p-2.5 rounded-xl border border-blue-100">
                                            Terms: {viewDetailsBooking.quotation_data.terms}
                                        </div>
                                    )}

                                    {/* Action Buttons for Customer if Quotation is Issued */}
                                    {viewDetailsBooking.quotation_status === "Quotation Issued" && (
                                        <div className="pt-2 flex items-center gap-3">
                                            <button
                                                type="button"
                                                disabled={quotationActionLoading}
                                                onClick={() => handleQuotationResponse("accept", viewDetailsBooking.booking_id)}
                                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center gap-1.5"
                                            >
                                                <span>✓ Accept & Agree</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={quotationActionLoading}
                                                onClick={() => setQuotationNotesModal({ action: "clarify", bookingId: viewDetailsBooking.booking_id })}
                                                className="px-4 py-2.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-bold transition"
                                            >
                                                Request Clarification
                                            </button>
                                            <button
                                                type="button"
                                                disabled={quotationActionLoading}
                                                onClick={() => setQuotationNotesModal({ action: "decline", bookingId: viewDetailsBooking.booking_id })}
                                                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold transition"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl p-4 border border-blue-100 text-xs text-blue-900 leading-relaxed space-y-2">
                                    <div className="flex items-center gap-2 text-amber-700 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <span>Quotation Pending Technical Assessment</span>
                                    </div>
                                    <p className="text-gray-600">
                                        Our certified HVAC technicians are reviewing your unit details and service request. Once technical evaluation is complete, an itemized quotation will be presented here for your agreement before work commences.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* SECTION: CONFIGURED AIRCON UNITS */}
                        <div className="space-y-3">
                            {(() => {
                                const totalModalUnits = viewDetailsBooking.total_units_count
                                    ? viewDetailsBooking.total_units_count
                                    : Array.isArray(viewDetailsBooking.units_data) && viewDetailsBooking.units_data.length > 0
                                    ? viewDetailsBooking.units_data.reduce((sum, u) => sum + (parseInt(u.quantity, 10) || 1), 0)
                                    : 1;
                                return (
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                                        <span>Aircon Units in this Request ({totalModalUnits} Unit{totalModalUnits === 1 ? "" : "s"} Total)</span>
                                        {Array.isArray(viewDetailsBooking.units_data) && viewDetailsBooking.units_data.length > 1 && (
                                            <span className="text-[11px] font-normal text-gray-500 lowercase">({viewDetailsBooking.units_data.length} unit models)</span>
                                        )}
                                    </h4>
                                );
                            })()}
                            <div className="space-y-2">
                                {Array.isArray(viewDetailsBooking.units_data) && viewDetailsBooking.units_data.length > 0 ? (
                                    viewDetailsBooking.units_data.map((u, idx) => {
                                        const qty = parseInt(u.quantity, 10) || 1;
                                        return (
                                            <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-extrabold text-blue-900">Unit #{idx + 1}: {u.unit_type}</span>
                                                        {qty > 1 && (
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                                                                Qty: {qty} units
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500">
                                                        Brand: <strong>{u.brand}</strong> • Capacity: <strong>{u.capacity}</strong>
                                                        {u.model_number ? ` • Model: ${u.model_number}` : ""}
                                                        {qty > 1 ? ` • Quantity: ${qty} identical units` : ""}
                                                    </p>
                                                    {u.issue && (
                                                        <p className="text-gray-700 italic text-[11px] mt-0.5">Symptom / Request: {u.issue}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-600">
                                        Single aircon unit configured.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION: PAYMENTS & RESERVATION FEE */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Appointment Reservation Fee & Payment History</h4>
                            {viewDetailsBooking.payments?.length ? (
                                <div className="space-y-2 text-xs">
                                    {viewDetailsBooking.payments.map((p, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-gray-800">{p.payment_type}</span>
                                                <p className="text-gray-500 font-mono text-[11px] mt-0.5">
                                                    Ref: {p.reference_number || "None"} • {p.payment_method}
                                                </p>
                                            </div>
                                            <span className="font-extrabold text-emerald-700">{formatCurrency(p.amount_paid)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No payments logged yet.</p>
                            )}
                        </div>

                        {viewDetailsBooking.notes && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Notes & History</h4>
                                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-line">
                                    {viewDetailsBooking.notes}
                                </p>
                            </div>
                        )}

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

            {/* Quotation Notes Modal (for Decline or Clarify) */}
            {quotationNotesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-base font-extrabold text-gray-900">
                            {quotationNotesModal.action === "decline" ? "Decline Official Quotation" : "Request Quotation Clarification"}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {quotationNotesModal.action === "decline"
                                ? "Please provide a reason so our customer representative can assist you."
                                : "Please state what part of the quotation or service scope you would like clarified."}
                        </p>
                        <textarea
                            rows={3}
                            value={quotationNotes}
                            onChange={(e) => setQuotationNotes(e.target.value)}
                            placeholder="Type your message here..."
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setQuotationNotesModal(null);
                                    setQuotationNotes("");
                                }}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={quotationActionLoading}
                                onClick={() => handleQuotationResponse(quotationNotesModal.action, quotationNotesModal.bookingId, quotationNotes)}
                                className={`px-5 py-2 rounded-xl text-xs font-bold text-white ${
                                    quotationNotesModal.action === "decline" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                Submit Response
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
