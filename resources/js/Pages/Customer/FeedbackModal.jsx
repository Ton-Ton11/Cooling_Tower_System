import { useEffect, useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatCurrency, formatStorageUrl } from "../../utils/superAdmin";

export default function FeedbackModal({ booking, isOpen, onClose, onSuccess, addToast }) {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (booking) {
            setRating(booking?.feedback?.rating ?? 5);
            setFeedback(booking?.feedback?.feedback ?? "");
        }
    }, [booking]);

    if (!isOpen || !booking) return null;

    const isPartiallyCompleted = booking.booking_status === "Partially Completed";
    const turnover = booking.payment_turnover || booking.service_details?.payment_turnover || {};
    const report = booking.service_report || {};
    const diagnosis = turnover.diagnosis || report.diagnosis || "—";
    const workDone = turnover.work_done || report.work_done || "—";
    const acBrand = turnover.ac_brand || report.ac_brand || "";
    const acType = turnover.ac_type || report.ac_type || "";
    const partsReplaced = turnover.parts_replaced || report.parts_replaced || "";
    const proofImageUrl = formatStorageUrl(turnover.proof_image_url || "");
    const teamDisplay = booking.assigned_team_name || booking.assigned_tech_name || "Assigned Team";

    const ratingDescriptions = {
        1: "Poor - Very unsatisfied with the service",
        2: "Fair - Needs significant improvement",
        3: "Good - Satisfactory work completed",
        4: "Very Good - Highly skilled and clean work",
        5: "Excellent - Outstanding service and professionalism!",
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!rating || rating < 1 || rating > 5) {
            addToast("Please select a star rating from 1 to 5.", "error");
            return;
        }

        setSubmitting(true);
        try {
            const { data } = await window.axios.post(CUSTOMER_ENDPOINTS.feedback, {
                booking_id: booking.booking_id,
                rating,
                feedback: feedback.trim() || null,
            });

            addToast(
                isPartiallyCompleted
                    ? "Service completed and feedback submitted! Thank you."
                    : (data.message || "Feedback submitted successfully!"),
                "success"
            );
            onSuccess();
            onClose();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to submit feedback."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">
                                {booking.feedback ? "Your Rating & Review" : "Rate Service & Experience"}
                            </h3>
                            <p className="text-xs text-emerald-100">Booking #{booking.booking_id} · {booking.service_name}</p>
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

                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
                    {/* Turn Over Payment & Service Summary */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1.5">
                        <div className="flex justify-between text-gray-600">
                            <span>Total Service Fee</span>
                            <span className="font-bold text-gray-900">
                                {formatCurrency(turnover.total_service_price || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-blue-700">
                            <span>Less Reservation Fee</span>
                            <span className="font-bold">
                                - {formatCurrency(turnover.reservation_down_payment || 300)}
                            </span>
                        </div>
                        <div className="border-t border-dashed border-emerald-300 pt-1.5 flex justify-between items-center text-sm font-extrabold text-emerald-800">
                            <span>Balance Paid</span>
                            <span>
                                {formatCurrency(turnover.net_collected || 0)} ({turnover.payment_method || booking.service_payment_method || "Cash"})
                            </span>
                        </div>
                        {turnover.reference_number && (
                            <div className="text-[11px] text-emerald-800 font-semibold pt-0.5">
                                GCash Ref: {turnover.reference_number}
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <span className="text-[11px] font-bold text-gray-500 block">Diagnosis &amp; Findings</span>
                                <span className="text-gray-900 font-medium">{diagnosis}</span>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-gray-500 block">Work Performed</span>
                                <span className="text-gray-900 font-medium">{workDone}</span>
                            </div>
                        </div>
                        {(acBrand || acType || partsReplaced) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-gray-200 pt-2">
                                <div>
                                    <span className="text-[11px] font-bold text-gray-500 block">AC Unit</span>
                                    <span className="text-gray-900 font-semibold">{[acBrand, acType].filter(Boolean).join(" · ") || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-gray-500 block">Parts Replaced</span>
                                    <span className="text-gray-900 font-semibold">{partsReplaced || "None"}</span>
                                </div>
                            </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 text-gray-700">
                            <span className="font-bold text-gray-900">Technicians:</span> {teamDisplay}
                        </div>
                    </div>

                    {proofImageUrl && (
                        <div>
                            <span className="block text-[11px] font-bold text-gray-500 mb-1.5">Proof Picture</span>
                            <div className="border border-gray-200 rounded-xl p-2 bg-gray-50 text-center">
                                <a href={proofImageUrl} target="_blank" rel="noreferrer">
                                    <img
                                        src={proofImageUrl}
                                        alt="Service Proof"
                                        className="max-h-44 mx-auto rounded-lg object-contain"
                                    />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Star Selection */}
                    <div className="text-center pt-1">
                        <label className="block text-xs font-bold text-gray-600 mb-2">
                            Rate Service &amp; Technicians
                        </label>
                        <div className="flex items-center justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const isFilled = (hoverRating || rating) >= star;
                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        className="p-1 focus:outline-none transition-transform hover:scale-125"
                                    >
                                        <svg
                                            className={`w-8 h-8 transition-colors ${
                                                isFilled ? "text-amber-400 fill-amber-400 drop-shadow-sm" : "text-gray-200 fill-gray-100"
                                            }`}
                                            viewBox="0 0 20 20"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs font-semibold text-emerald-700 mt-1.5">
                            {ratingDescriptions[hoverRating || rating]}
                        </p>
                    </div>

                    {/* Feedback Comments */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Feedback (Optional)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Share your feedback about the service and technicians..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                        />
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting
                                ? "Submitting..."
                                : isPartiallyCompleted
                                ? "Complete Service & Submit"
                                : "Submit Feedback"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
