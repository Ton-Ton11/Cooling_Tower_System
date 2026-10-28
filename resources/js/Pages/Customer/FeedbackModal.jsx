import { useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../../utils/superAdmin";

export default function FeedbackModal({ booking, isOpen, onClose, onSuccess, addToast }) {
    const [rating, setRating] = useState(booking?.feedback?.rating ?? 5);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState(booking?.feedback?.feedback ?? "");
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !booking) return null;

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

            addToast(data.message || "Feedback submitted successfully!", "success");
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Rate & Review Service</h3>
                            <p className="text-xs text-emerald-100">Booking #{booking.booking_id} — {booking.service_name}</p>
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

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Star Selection */}
                    <div className="text-center py-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            How would you rate our service?
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
                                        className="p-1.5 focus:outline-none transition-transform hover:scale-125"
                                    >
                                        <svg
                                            className={`w-9 h-9 transition-colors ${
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
                        <p className="text-xs font-semibold text-emerald-700 mt-2.5">
                            {ratingDescriptions[hoverRating || rating]}
                        </p>
                    </div>

                    {/* Feedback Comments */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Write Your Feedback / Comments (Optional)
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Share your experience with the technician's punctuality, cleaning quality, and overall service..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                        />
                    </div>

                    {booking.assigned_tech_name && (
                        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 flex items-center gap-2 border border-gray-100">
                            <span className="font-semibold">Serviced by:</span> {booking.assigned_tech_name}
                        </div>
                    )}

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
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting ? "Submitting..." : "Submit Feedback"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
