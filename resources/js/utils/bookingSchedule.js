// utils/bookingSchedule.js

/**
 * Default schedule configuration for customer booking arrival times and rate classifications.
 * Configurable dynamically from backend via catalog API (schedule_config).
 */
export const DEFAULT_SCHEDULE_CONFIG = {
    interval_minutes: 30,
    regular: {
        key: "regular",
        title: "Regular Hours",
        subtitle: "Standard Business Hours (08:00 AM – 05:00 PM)",
        rate_name: "Regular Rate",
        badge: "Regular",
        start_time: "08:00", // 08:00 AM
        end_time: "17:00",   // 05:00 PM
        notice_title: "Regular Rate",
        notice_message: "Standard service rate applies.",
        is_differential: false,
    },
    differential: {
        key: "differential",
        title: "Differential Hours",
        subtitle: "Early Morning (Kadlawon / 12:00 AM – 05:00 AM)",
        rate_name: "Differential Rate",
        badge: "Differential",
        start_time: "00:00", // 12:00 AM
        end_time: "05:00",   // 05:00 AM
        notice_title: "Differential Rate Applies",
        notice_message: "An additional differential charge will be included in your quotation.",
        is_differential: true,
    },
};

/**
 * Converts "HH:MM" (24-hour) to "hh:mm AM/PM" 12-hour format.
 * E.g., "00:00" -> "12:00 AM", "01:30" -> "01:30 AM", "13:00" -> "01:00 PM".
 */
export function formatTime24To12(time24) {
    if (!time24 || typeof time24 !== "string") return time24 || "";
    const clean = time24.trim();
    if (clean.includes("AM") || clean.includes("PM")) {
        return clean;
    }
    const [hStr, mStr] = clean.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr !== undefined ? parseInt(mStr, 10) : 0;
    if (isNaN(h)) return clean;

    const period = h >= 12 ? "PM" : "AM";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    const padH = String(hour12).padStart(2, "0");
    const padM = String(isNaN(m) ? 0 : m).padStart(2, "0");
    return `${padH}:${padM} ${period}`;
}

/**
 * Converts a time string (e.g. "08:30" or "01:00 PM") to total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();

    if (str.toUpperCase().includes("AM") || str.toUpperCase().includes("PM")) {
        const isPM = str.toUpperCase().includes("PM");
        const isAM = str.toUpperCase().includes("AM");
        const parts = str.replace(/(AM|PM)/i, "").trim().split(":");
        let h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        return h * 60 + m;
    }

    const [h, m] = str.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

/**
 * Generates an array of time slot objects for a given start and end time in minutes.
 */
export function generateTimeSlots(startTimeStr, endTimeStr, intervalMinutes = 30, rateType = "regular", badge = "Regular", isDifferential = false) {
    const startMins = parseTimeToMinutes(startTimeStr);
    const endMins = parseTimeToMinutes(endTimeStr);
    const interval = Number(intervalMinutes) || 30;

    const slots = [];
    let curr = startMins;
    while (curr <= endMins) {
        const h = Math.floor(curr / 60);
        const m = curr % 60;
        const time24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const label = formatTime24To12(time24);

        slots.push({
            id: time24,
            time: time24,
            label,
            rate_type: rateType,
            badge,
            is_differential: isDifferential,
        });

        curr += interval;
    }

    return slots;
}

/**
 * Resolves full slot lists and helpers based on active schedule configuration.
 */
export function resolveScheduleSlots(config = null) {
    const activeConfig = config || DEFAULT_SCHEDULE_CONFIG;
    const interval = activeConfig.interval_minutes || 30;

    const regularConfig = activeConfig.regular || DEFAULT_SCHEDULE_CONFIG.regular;
    const differentialConfig = activeConfig.differential || DEFAULT_SCHEDULE_CONFIG.differential;

    // Use pre-computed slots from backend if available, or generate client-side
    const regularSlots = Array.isArray(regularConfig.slots) && regularConfig.slots.length > 0
        ? regularConfig.slots
        : generateTimeSlots(
            regularConfig.start_time || "08:00",
            regularConfig.end_time || "17:00",
            interval,
            "regular",
            regularConfig.badge || "Regular",
            false
        );

    const differentialSlots = Array.isArray(differentialConfig.slots) && differentialConfig.slots.length > 0
        ? differentialConfig.slots
        : generateTimeSlots(
            differentialConfig.start_time || "00:00",
            differentialConfig.end_time || "05:00",
            interval,
            "differential",
            differentialConfig.badge || "Differential",
            true
        );

    const allSlots = [...regularSlots, ...differentialSlots];

    const findSlot = (idOrLabel) => {
        if (!idOrLabel) return null;
        const normalized = String(idOrLabel).trim();
        return allSlots.find(s => s.id === normalized || s.label.toLowerCase() === normalized.toLowerCase()) || null;
    };

    const classifyTime = (idOrLabel) => {
        const slot = findSlot(idOrLabel);
        if (slot) {
            return {
                isDifferential: Boolean(slot.is_differential),
                rateType: slot.rate_type || (slot.is_differential ? "differential" : "regular"),
                rateName: slot.is_differential ? (differentialConfig.rate_name || "Differential Rate") : (regularConfig.rate_name || "Regular Rate"),
                badge: slot.badge || (slot.is_differential ? "Differential" : "Regular"),
                noticeTitle: slot.is_differential
                    ? (differentialConfig.notice_title || "Differential Rate Applies")
                    : (regularConfig.notice_title || "Regular Rate"),
                noticeMessage: slot.is_differential
                    ? (differentialConfig.notice_message || "An additional differential charge will be included in your quotation.")
                    : (regularConfig.notice_message || "Standard service rate applies."),
                label: slot.label,
                time: slot.id,
            };
        }

        // Fallback calculation using time minutes if slot object wasn't found
        const mins = parseTimeToMinutes(idOrLabel);
        const diffStart = parseTimeToMinutes(differentialConfig.start_time || "00:00");
        const diffEnd = parseTimeToMinutes(differentialConfig.end_time || "05:00");
        const isDiff = mins >= diffStart && mins <= diffEnd;

        return {
            isDifferential: isDiff,
            rateType: isDiff ? "differential" : "regular",
            rateName: isDiff ? (differentialConfig.rate_name || "Differential Rate") : (regularConfig.rate_name || "Regular Rate"),
            badge: isDiff ? (differentialConfig.badge || "Differential") : (regularConfig.badge || "Regular"),
            noticeTitle: isDiff
                ? (differentialConfig.notice_title || "Differential Rate Applies")
                : (regularConfig.notice_title || "Regular Rate"),
            noticeMessage: isDiff
                ? (differentialConfig.notice_message || "An additional differential charge will be included in your quotation.")
                : (regularConfig.notice_message || "Standard service rate applies."),
            label: formatTime24To12(idOrLabel),
            time: idOrLabel,
        };
    };

    return {
        regularConfig,
        differentialConfig,
        regularSlots,
        differentialSlots,
        allSlots,
        findSlot,
        classifyTime,
    };
}
