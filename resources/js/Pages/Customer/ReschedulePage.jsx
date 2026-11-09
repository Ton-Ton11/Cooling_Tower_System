import { useState, useEffect, useMemo, useId, useCallback } from "react";
import {
    CUSTOMER_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";
import {
    resolveScheduleSlots,
    toLocalYmd,
    extractTime24,
    getTodayLocalYmd,
    getDateSlotInfo,
    findNextAvailableDateYmd,
    isSlotTimeInPast,
    findFirstAvailableSlotId,
} from "../../utils/bookingSchedule";
import BookingCalendarPicker from "../../Components/BookingCalendarPicker";
import { recordUserActivity } from "../../utils/userActivityHistory";

export default function ReschedulePage({
    initialBooking = null,
    navMeta = null,
    scheduleConfig: propScheduleConfig = null,
    currentUser = null,
    addToast,
    onNavigate,
    onSuccess,
    onDataChanged,
}) {
    const userId = currentUser?.id || currentUser?.user_id || null;
    const targetBookingId = navMeta?.bookingId || initialBooking?.booking_id || null;

    const [booking, setBooking] = useState(initialBooking);
    const [scheduleConfig, setScheduleConfig] = useState(propScheduleConfig);
    const [loadingBooking, setLoadingBooking] = useState(!initialBooking);

    // Current local time ticker (ticks every 30 seconds to automatically update past arrival times)
    const [currentTime, setCurrentTime] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    const [newDate, setNewDate] = useState("");
    const [timeSlot, setTimeSlot] = useState("09:00");
    const [refNumber, setRefNumber] = useState("");
    const [senderName, setSenderName] = useState("");
    const [senderNumber, setSenderNumber] = useState("");
    const [reason, setReason] = useState("");
    const [receiptFile, setReceiptFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [validationError, setValidationError] = useState("");

    const datePickerId = useId();
    const reasonInputId = useId();
    const refInputId = useId();
    const refHintId = useId();
    const senderNameId = useId();
    const senderNumberId = useId();
    const receiptFileId = useId();

    const fetchBookingData = useCallback(async (desiredId, showLoader = false) => {
        if (showLoader) setLoadingBooking(true);
        try {
            const { data } = await window.axios.get(CUSTOMER_ENDPOINTS.bookings);
            const list = Array.isArray(data?.data) ? data.data : [];
            if (data?.schedule_config) {
                setScheduleConfig(data.schedule_config);
            }
            let found = null;
            if (desiredId) {
                found = list.find((b) => Number(b.booking_id) === Number(desiredId));
            }
            if (!found && list.length > 0) {
                found = list.find(
                    (b) =>
                        ["Pending", "Rescheduled", "Payment Incomplete", "Reschedule Notice", "Approved", "In-Progress"].includes(
                            b.booking_status
                        )
                );
            }
            if (found) {
                setBooking(found);
            }
            return found;
        } catch (error) {
            if (addToast && showLoader) {
                addToast(extractErrorMessage(error, "Unable to load booking details."), "error");
            }
            return null;
        } finally {
            if (showLoader) setLoadingBooking(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (initialBooking && (!targetBookingId || Number(initialBooking.booking_id) === Number(targetBookingId))) {
            setBooking(initialBooking);
            setLoadingBooking(false);
            if (!scheduleConfig) {
                fetchBookingData(initialBooking.booking_id, false);
            }
        } else {
            fetchBookingData(targetBookingId, !booking);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBooking?.booking_id, targetBookingId]);

    const details = booking?.service_details || {};
    const isManagerNotice =
        booking?.booking_status === "Reschedule Notice" ||
        Boolean(details.reschedule_notice_by_manager);
    const isApprovedStatus = booking?.booking_status === "Approved";
    const isInProgressStatus = booking?.booking_status === "In-Progress";

    // Rescheduling is FREE during Approved, Pending, or Reschedule Notice.
    // Reschedule fee applies ONLY during In-Progress status.
    const isFeeRequired = isInProgressStatus && !isManagerNotice;
    const rescheduleFee = isFeeRequired ? (Number(scheduleConfig?.reschedule_fee) || 150.0) : 0.0;
    const isFreeReschedule = !isFeeRequired;

    const minDateStr = useMemo(() => getTodayLocalYmd(), []);

    const scheduleSlotsData = useMemo(() => {
        return resolveScheduleSlots(scheduleConfig);
    }, [scheduleConfig]);

    const allTimeSlots = useMemo(() => {
        const mapSlot = (s) => {
            const [hhStr] = String(s.id || "09:00").split(":");
            return {
                value: s.id,
                label: s.label,
                hour: parseInt(hhStr, 10) || 0,
                isDifferential: Boolean(s.isDifferential),
            };
        };
        return [
            ...scheduleSlotsData.regularSlots.map(mapSlot),
            ...scheduleSlotsData.differentialSlots.map(mapSlot),
        ];
    }, [scheduleSlotsData]);

    const originalDateYmd = useMemo(() => {
        if (details.reschedule_notice_original_date) return details.reschedule_notice_original_date;
        if (!booking?.scheduled_date) return null;
        return toLocalYmd(booking.scheduled_date) || null;
    }, [booking, details]);

    const blockedPeriodOnOriginalDate = useMemo(() => {
        if (!isManagerNotice) return null;
        if (details.reschedule_notice_blocked_period) return details.reschedule_notice_blocked_period;
        if (booking?.scheduled_date) {
            const t24 = extractTime24(booking.scheduled_date, "09:00");
            const hour = parseInt(t24.split(":")[0], 10) || 9;
            return hour < 13 ? "morning_noon" : "afternoon_evening";
        }
        return null;
    }, [isManagerNotice, details, booking]);

    const isSlotBlocked = useCallback(
        (slotHour, targetDate) => {
            if (!isManagerNotice || !originalDateYmd || targetDate !== originalDateYmd) return false;
            if (blockedPeriodOnOriginalDate === "morning_noon" && slotHour < 13) return true;
            if (blockedPeriodOnOriginalDate === "afternoon_evening" && slotHour >= 13) return true;
            return false;
        },
        [isManagerNotice, originalDateYmd, blockedPeriodOnOriginalDate]
    );

    const activeRateInfo = useMemo(() => {
        return scheduleSlotsData.classifyTime(timeSlot);
    }, [timeSlot, scheduleSlotsData]);

    const selectedDateSlotInfo = useMemo(() => {
        return getDateSlotInfo(newDate, scheduleConfig, booking?.booking_id);
    }, [newDate, scheduleConfig, booking?.booking_id]);

    const isSelectedTimePast = useMemo(() => {
        return isSlotTimeInPast(newDate, timeSlot, currentTime);
    }, [newDate, timeSlot, currentTime]);

    // Set initial preferred date and time when booking loads
    useEffect(() => {
        if (!booking) return;
        const preferredNextDate = findNextAvailableDateYmd(
            minDateStr,
            scheduleConfig,
            booking.booking_id
        );
        setNewDate(preferredNextDate);

        const initialTime =
            details.preferred_arrival_time_raw || extractTime24(booking.scheduled_date, "09:00");
        const exists = allTimeSlots.some((s) => s.value === initialTime);
        setTimeSlot(exists ? initialTime : "09:00");
    }, [booking?.booking_id, minDateStr, scheduleConfig]);

    // Automatically select the next available future slot if current selection has passed or is blocked
    useEffect(() => {
        if (!newDate || !scheduleSlotsData?.allSlots?.length) return;
        const hour = parseInt(String(timeSlot).split(":")[0], 10) || 0;
        const isPast = isSlotTimeInPast(newDate, timeSlot, currentTime);
        const isBlocked = isSlotBlocked(hour, newDate);
        if (isPast || isBlocked) {
            const nextSlot = findFirstAvailableSlotId(
                scheduleSlotsData.allSlots,
                newDate,
                (slot) => {
                    const h = parseInt(String(slot.id).split(":")[0], 10) || 0;
                    return isSlotBlocked(h, newDate);
                },
                currentTime
            );
            if (nextSlot) {
                setTimeSlot(nextSlot);
            }
        }
    }, [newDate, scheduleSlotsData, currentTime, isSlotBlocked]);

    const gcashAccount = scheduleConfig?.payment_gcash_account || "0917 877 7670";
    const gcashName = scheduleConfig?.payment_gcash_name || "Cooling Tower Airconditioning Services";

    const handleCopyGcash = async () => {
        try {
            await navigator.clipboard.writeText(gcashAccount.replace(/\s+/g, ""));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (addToast) addToast("GCash number copied to clipboard!", "success");
        } catch {
            if (addToast) addToast("Failed to copy GCash number.", "error");
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setReceiptFile(null);
            return;
        }
        if (!file.type.startsWith("image/")) {
            if (addToast) addToast("Only image files (JPEG, PNG, WEBP) are allowed.", "error");
            e.target.value = "";
            setReceiptFile(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            if (addToast) addToast("Image size must not exceed 5MB.", "error");
            e.target.value = "";
            setReceiptFile(null);
            return;
        }
        setReceiptFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError("");

        if (!booking) {
            const msg = "No active booking found to reschedule.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        if (!newDate) {
            const msg = "Please select a new preferred service date.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        if (newDate < minDateStr) {
            const msg = "You cannot select a past date.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        const dateCheck = getDateSlotInfo(newDate, scheduleConfig, booking.booking_id);
        if (dateCheck.isSunday) {
            const msg = "Sunday is a rest day for our workers. Please select Monday to Saturday.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }
        if (dateCheck.isFull) {
            const msg = `All ${dateCheck.maxSlots} daily team slots for ${newDate} are already full. Please select another date.`;
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        const chosenSlot = allTimeSlots.find((s) => s.value === timeSlot);
        if (chosenSlot && isSlotBlocked(chosenSlot.hour, newDate)) {
            const msg = "That time slot is unavailable on this date per the reschedule notice. Please choose another time slot or date.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        if (isSlotTimeInPast(newDate, timeSlot, currentTime)) {
            const msg = "The selected arrival time has already passed. Please select a future time slot.";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        if (isFeeRequired && (!refNumber.trim() || refNumber.trim().length < 5 || refNumber.trim().length > 13)) {
            const msg = "Please enter a valid GCash reference number (5 to 13 digits).";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        if (isFeeRequired && senderNumber.trim() && senderNumber.trim().length !== 11) {
            const msg = "Sender contact number must be 11 digits only (e.g., 09XXXXXXXXX).";
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
            return;
        }

        setSubmitting(true);
        const combinedDateTime = `${newDate} ${timeSlot}:00`;

        const formData = new FormData();
        formData.append("new_scheduled_date", combinedDateTime);
        formData.append("reschedule_fee", rescheduleFee);
        if (refNumber.trim()) formData.append("reference_number", refNumber.trim());
        if (senderName.trim()) formData.append("sender_name", senderName.trim());
        if (senderNumber.trim()) formData.append("sender_number", senderNumber.trim());
        if (reason.trim()) formData.append("reschedule_reason", reason.trim());
        if (receiptFile) formData.append("receipt_image", receiptFile);

        try {
            const url = CUSTOMER_ENDPOINTS.rescheduleBooking(booking.booking_id);
            const { data } = await window.axios.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (addToast) {
                addToast(data.message || "Booking rescheduled successfully!", "success");
            }
            if (onSuccess) onSuccess();
            if (onDataChanged) onDataChanged();

            recordUserActivity(userId, {
                pageId: "bookings",
                title: "My Service Bookings",
                description: `Rescheduled booking #${booking.booking_id} to ${combinedDateTime}`,
                icon: "bookings",
            });

            if (onNavigate) {
                onNavigate("bookings");
            }
        } catch (error) {
            const msg = extractErrorMessage(error, "Failed to reschedule booking.");
            setValidationError(msg);
            if (addToast) addToast(msg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingBooking) {
        return (
            <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
                <p className="text-sm text-gray-500 font-medium">Loading booking details...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
                <div className="size-14 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-xl font-bold">
                    !
                </div>
                <h3 className="text-base font-bold text-gray-900">Booking Not Found</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                    We could not locate the booking details for rescheduling. Please return to your service bookings.
                </p>
                <div>
                    <button
                        type="button"
                        onClick={() => onNavigate && onNavigate("bookings")}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                    >
                        Back to My Bookings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Top Back Navigation */}
            <div>
                <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("bookings")}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-700 text-xs font-bold shadow-xs transition cursor-pointer"
                >
                    <span>&larr;</span>
                    <span>Back to My Bookings</span>
                </button>
            </div>

            {/* Header Banner Card */}
            <div className="bg-gradient-to-r from-[#1E2F5F] to-[#2A437E] rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                        Booking #{booking.booking_id} • {booking.service_name}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">Reschedule Service Booking</h1>
                    <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
                        Select an available calendar date and preferred arrival window from available technician team slots.
                    </p>
                </div>
                <div className="bg-white/10 border border-white/15 backdrop-blur-xs rounded-2xl px-5 py-3.5 shrink-0 self-start md:self-auto shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Current Schedule</span>
                    <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">{formatDateTime(booking.scheduled_date)}</p>
                </div>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {validationError && (
                    <div
                        role="alert"
                        className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold"
                    >
                        {validationError}
                    </div>
                )}

                {/* Section 1: Full-Width Spacious Calendar Picker */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-800">
                                Select New Date (Mon–Sat • 5 Slots/Day) <span className="text-red-500">*</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Operating business days with open technician capacity. Sundays are reserved as worker rest days.
                            </p>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-extrabold self-start sm:self-auto">
                            Step 1: Choose Date
                        </span>
                    </div>

                    <div className="pt-2 space-y-3">
                        <BookingCalendarPicker
                            id={datePickerId}
                            value={newDate}
                            onChange={(val) => {
                                setNewDate(val);
                                if (validationError) setValidationError("");
                            }}
                            scheduleConfig={scheduleConfig}
                            excludeBookingId={booking?.booking_id}
                            minDate={minDateStr}
                            onError={(msg) => addToast && addToast(msg, "error")}
                            compact={false}
                        />
                        {selectedDateSlotInfo?.isLimited && (
                            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
                                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <span className="font-extrabold text-amber-800">
                                        {selectedDateSlotInfo.remainingSlots} {selectedDateSlotInfo.remainingSlots === 1 ? "Slot" : "Slots"} Left (Limited) — Extended Approval Time:
                                    </span>{" "}
                                    <span>
                                        Pending bookings on this date may take longer to approve because the remaining 2 teams (4 technicians) serve as backup in case assigned technicians on the 3 active bookings are suddenly absent or sick.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Preferred Arrival Time (Same as Service Booking Wizard) */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-100 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-800">
                                Preferred Arrival Time <span className="text-red-500">*</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Technician arrival window at your service location.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[11px] font-semibold text-gray-500">Selected:</span>
                            <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    isSelectedTimePast
                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                        : activeRateInfo.isDifferential
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-blue-100 text-blue-900 border border-blue-200"
                                }`}
                            >
                                {activeRateInfo.label || timeSlot} {isSelectedTimePast ? "(Past Time)" : `(${activeRateInfo.rateName})`}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-extrabold">
                                Step 2: Choose Arrival Time
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Notice if all arrival times for today have already passed */}
                        {selectedDateSlotInfo?.allSlotsPast && (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>All service arrival time slots for today have already passed. Please select tomorrow or another future date on the calendar above.</span>
                            </div>
                        )}

                        {/* Notice if manager notice has blocked period on original date */}
                        {isManagerNotice && newDate === originalDateYmd && (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
                                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>
                                    <strong>Manager Reschedule Notice:</strong> Because your previous appointment on {originalDateYmd} was in the{" "}
                                    {blockedPeriodOnOriginalDate === "morning_noon" ? "morning/noon" : "afternoon/evening"},{" "}
                                    {blockedPeriodOnOriginalDate === "morning_noon"
                                        ? "morning and noon"
                                        : "afternoon and evening"}{" "}
                                    slots are unavailable for this date.
                                </span>
                            </div>
                        )}

                        {/* 1. Regular Hours Section */}
                        <div className="bg-gray-50/70 rounded-2xl p-4 sm:p-5 border border-gray-200">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" />
                                    <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        {scheduleSlotsData.regularConfig?.title || "Regular Hours"}
                                    </h5>
                                </div>
                                <span className="text-[11px] text-gray-500 font-medium">
                                    {scheduleSlotsData.regularConfig?.subtitle || "Standard Business Hours (08:00 AM – 04:00 PM)"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                {scheduleSlotsData.regularSlots.map((slot) => {
                                    const isSel = timeSlot === slot.id;
                                    const hour = parseInt(String(slot.id).split(":")[0], 10) || 0;
                                    const blocked = isSlotBlocked(hour, newDate);
                                    const isPast = isSlotTimeInPast(newDate, slot.id, currentTime);
                                    const disabled = blocked || isPast;
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => {
                                                if (!disabled) {
                                                    setTimeSlot(slot.id);
                                                    if (validationError) setValidationError("");
                                                }
                                            }}
                                            className={`p-3 rounded-2xl border transition text-left flex flex-col justify-between ${
                                                disabled
                                                    ? "border-gray-200/50 bg-gray-100/60 text-gray-300 opacity-40 cursor-not-allowed select-none"
                                                    : isSel
                                                    ? "border-blue-600 bg-blue-50 text-blue-950 shadow-sm ring-2 ring-blue-500/20 font-bold"
                                                    : "border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50/80 text-gray-800 cursor-pointer"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-xs font-bold tracking-tight ${disabled ? "text-gray-400 line-through decoration-gray-300" : ""}`}>
                                                    {slot.label}
                                                </span>
                                                {blocked ? (
                                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                                        Blocked
                                                    </span>
                                                ) : isPast ? (
                                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-200/80 text-gray-500">
                                                        Past
                                                    </span>
                                                ) : (
                                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSel ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                                                    }`}>
                                                        {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex items-center gap-1">
                                                {!disabled && isSel && (
                                                    <svg className="w-2.5 h-2.5 text-blue-600 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                )}
                                                <span className={`text-[10px] font-semibold ${disabled ? "text-gray-400" : isSel ? "text-blue-700 font-bold" : "text-gray-400"}`}>
                                                    Regular
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Differential Hours Section */}
                        <div className="bg-amber-50/40 rounded-2xl p-4 sm:p-5 border border-amber-200/80">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />
                                    <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                        {scheduleSlotsData.differentialConfig?.title || "Differential Hours"}
                                    </h5>
                                </div>
                                <span className="text-[11px] text-amber-900/80 font-medium">
                                    {scheduleSlotsData.differentialConfig?.subtitle || "Night Shift (05:00 PM – 07:00 AM)"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                {scheduleSlotsData.differentialSlots.map((slot) => {
                                    const isSel = timeSlot === slot.id;
                                    const hour = parseInt(String(slot.id).split(":")[0], 10) || 0;
                                    const blocked = isSlotBlocked(hour, newDate);
                                    const isPast = isSlotTimeInPast(newDate, slot.id, currentTime);
                                    const disabled = blocked || isPast;
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => {
                                                if (!disabled) {
                                                    setTimeSlot(slot.id);
                                                    if (validationError) setValidationError("");
                                                }
                                            }}
                                            className={`p-3 rounded-2xl border transition text-left flex flex-col justify-between ${
                                                disabled
                                                    ? "border-amber-100/50 bg-amber-50/20 text-gray-300 opacity-40 cursor-not-allowed select-none"
                                                    : isSel
                                                    ? "border-amber-500 bg-amber-100/90 text-amber-950 shadow-sm ring-2 ring-amber-400/30 font-bold"
                                                    : "border-amber-200/80 hover:border-amber-300 bg-white hover:bg-amber-50/50 text-gray-800 cursor-pointer"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-xs font-bold tracking-tight ${disabled ? "text-gray-400 line-through decoration-gray-300" : ""}`}>
                                                    {slot.label}
                                                </span>
                                                {blocked ? (
                                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                                                        Blocked
                                                    </span>
                                                ) : isPast ? (
                                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-700/60">
                                                        Past
                                                    </span>
                                                ) : (
                                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSel ? "bg-amber-600 border-amber-600 text-white" : "border-amber-300"
                                                    }`}>
                                                        {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex items-center">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                                                    disabled
                                                        ? "bg-gray-100 text-gray-400"
                                                        : isSel
                                                        ? "bg-amber-200 text-amber-900"
                                                        : "bg-amber-100/80 text-amber-800"
                                                }`}>
                                                    {!disabled && isSel && (
                                                        <svg className="w-2.5 h-2.5 text-amber-900 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                    )}
                                                    Differential
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Dynamic Rate Classification Status Banner */}
                        {activeRateInfo.isDifferential ? (
                            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-950 flex items-start gap-3 transition">
                                <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
                                    <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
                                            {activeRateInfo.noticeTitle || "Differential Rate Applies"}
                                        </span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 text-amber-900">
                                            {activeRateInfo.label || timeSlot} • Differential
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                        {activeRateInfo.noticeMessage || "An additional differential charge will be included in your quotation."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 flex items-start gap-3 transition">
                                <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-700">
                                    <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                                            {activeRateInfo.noticeTitle || "Regular Rate"}
                                        </span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                            {activeRateInfo.label || timeSlot} • Regular
                                        </span>
                                    </div>
                                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                        {activeRateInfo.noticeMessage || "Standard service rate applies."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: Unified Reschedule Details, Payment & Confirmation Container (Top-to-Bottom) */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-100 space-y-6">
                    {/* Container Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-800">
                                Reschedule Details & Payment Confirmation
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Provide reason, complete fee verification, and confirm your updated appointment schedule.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            {isFreeReschedule ? (
                                <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Free Reschedule (₱0.00)
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Fee: ₱{rescheduleFee.toFixed(2)}
                                </span>
                            )}
                            <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-extrabold">
                                Step 3: Confirm
                            </span>
                        </div>
                    </div>

                    {/* Top-to-Bottom Sequence of Fields */}
                    <div className="space-y-6">
                        {/* 1. Reason for Rescheduling (Optional) */}
                        <div className="bg-gray-50/70 rounded-2xl p-4 sm:p-5 border border-gray-200/80 space-y-2">
                            <label htmlFor={reasonInputId} className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                                Reason for Rescheduling <span className="text-gray-400 font-normal lowercase">(optional)</span>
                            </label>
                            <input
                                id={reasonInputId}
                                type="text"
                                placeholder="e.g. Schedule conflict, client unavailable, unexpected travel"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                            <p className="text-[11px] text-gray-500">
                                Providing a reason helps our service managers coordinate technician resources effectively.
                            </p>
                        </div>

                        {/* 2. Fee & Payment Fields */}
                        {isFreeReschedule ? (
                            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                        {isManagerNotice
                                            ? "Manager Reschedule Notice"
                                            : isApprovedStatus
                                            ? "Approved Booking — Free Reschedule"
                                            : "Free Schedule Adjustment"}
                                    </span>
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                        Free (₱0.00)
                                    </span>
                                </div>
                                <p className="text-xs text-emerald-900 leading-relaxed">
                                    {isManagerNotice
                                        ? "Your previous schedule required adjustment by our operations team. Selecting a new vacant schedule is free of charge."
                                        : isApprovedStatus
                                        ? "Rescheduling while your booking is in Approved status is free of charge. No additional fee or GCash payment is required."
                                        : "Rescheduling at this stage is free of charge. Pick your preferred new date and arrival time to continue."}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200/70 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                                            In-Progress Rescheduling Fee: ₱{rescheduleFee.toFixed(2)}
                                        </h3>
                                    </div>
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                        GCash Express
                                    </span>
                                </div>

                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Because this service is currently in progress with technician and equipment allocated, a ₱{rescheduleFee.toFixed(2)} rescheduling fee applies to coordinate new team dispatch.
                                </p>

                                {/* GCash Account Box */}
                                <div className="bg-blue-50/90 rounded-xl p-3.5 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] text-gray-500 font-medium">
                                            Account Name: <strong className="text-gray-900">{gcashName}</strong>
                                        </p>
                                        <p className="text-sm font-extrabold text-blue-700 font-mono tracking-wide mt-0.5">
                                            {gcashAccount}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyGcash}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                                    >
                                        <span>{copied ? "Copied!" : "Copy"}</span>
                                    </button>
                                </div>

                                {/* Reference Number */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor={refInputId} className="block text-xs font-bold text-gray-700">
                                            GCash Reference Number (Max 13 digits) <span className="text-red-500">*</span>
                                        </label>
                                        <span id={refHintId} className="text-[10px] text-gray-400 font-mono">
                                            {refNumber.length}/13 characters
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        Found on your GCash transaction receipt.
                                    </p>
                                    <input
                                        id={refInputId}
                                        aria-describedby={refHintId}
                                        type="text"
                                        maxLength={13}
                                        placeholder="e.g. 1002345678901"
                                        value={refNumber}
                                        onChange={(e) => {
                                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 13);
                                            setRefNumber(digitsOnly);
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-mono tracking-wider focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    />
                                </div>

                                {/* Sender Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label htmlFor={senderNameId} className="block text-[11px] font-bold text-gray-700">
                                            Sender Account Name
                                        </label>
                                        <input
                                            id={senderNameId}
                                            type="text"
                                            placeholder="GCash account name"
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor={senderNumberId} className="block text-[11px] font-bold text-gray-700">
                                            Sender Contact No. (11 digits)
                                        </label>
                                        <input
                                            id={senderNumberId}
                                            type="text"
                                            maxLength={11}
                                            placeholder="e.g. 09171234567"
                                            value={senderNumber}
                                            onChange={(e) => {
                                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                                                setSenderNumber(digitsOnly);
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                        />
                                    </div>
                                </div>

                                {/* Receipt Proof Upload */}
                                <div className="space-y-1">
                                    <label htmlFor={receiptFileId} className="block text-[11px] font-bold text-gray-700">
                                        Upload GCash Receipt Proof <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        id={receiptFileId}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-xl bg-white p-1 transition cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. Summary & Confirmation Actions Card */}
                        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Summary
                                    </span>
                                    <h3 className="text-sm font-extrabold text-white mt-0.5">
                                        Reschedule Confirmation
                                    </h3>
                                </div>
                                <span className="text-xs text-slate-300 font-semibold">
                                    Booking #{booking.booking_id} • {booking.service_name}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <span className="text-slate-400 text-[11px] block">Selected New Date</span>
                                    <strong className="text-white font-mono text-sm block mt-0.5">{newDate || "Not chosen"}</strong>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <span className="text-slate-400 text-[11px] block">Arrival Window</span>
                                    <strong className="text-white text-sm block mt-0.5">{timeSlot} ({activeRateInfo.rateName})</strong>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <span className="text-emerald-300 text-[11px] block">Reschedule Fee</span>
                                    <strong className="text-emerald-300 font-mono text-sm block mt-0.5">
                                        {isFreeReschedule ? "Free (₱0.00)" : `₱${rescheduleFee.toFixed(2)}`}
                                    </strong>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => onNavigate && onNavigate("bookings")}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl border border-white/20 text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <span>Confirm</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
