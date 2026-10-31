// utils/bookingSchedule.js

/**
 * Default schedule configuration for customer booking arrival times and rate classifications.
 * Configurable dynamically from backend via catalog API (schedule_config).
 */
export const MAX_DAILY_SLOTS = 5;
export const MAX_JOBS_PER_TEAM_PER_DAY = 1;

export const DEFAULT_SCHEDULE_CONFIG = {
    interval_minutes: 30,
    max_daily_slots: MAX_DAILY_SLOTS,
    max_jobs_per_team_per_day: MAX_JOBS_PER_TEAM_PER_DAY,
    closed_days_of_week: [0], // 0 = Sunday (Rest Day)
    daily_slot_counts: {},
    bookings_by_date: {},
    full_dates: [],
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
        maxDailySlots: Number(activeConfig.max_daily_slots) || MAX_DAILY_SLOTS,
        maxJobsPerTeamPerDay: Number(activeConfig.max_jobs_per_team_per_day) || MAX_JOBS_PER_TEAM_PER_DAY,
        closedDaysOfWeek: Array.isArray(activeConfig.closed_days_of_week) ? activeConfig.closed_days_of_week : [0],
        dailySlotCounts: activeConfig.daily_slot_counts || {},
        bookingsByDate: activeConfig.bookings_by_date || {},
        fullDates: Array.isArray(activeConfig.full_dates) ? activeConfig.full_dates : [],
        regularConfig,
        differentialConfig,
        regularSlots,
        differentialSlots,
        allSlots,
        findSlot,
        classifyTime,
    };
}

/**
 * Formats a Date object or date/datetime string to local "YYYY-MM-DD" without UTC shift.
 */
export function toLocalYmd(value) {
    if (!value) return "";
    if (typeof value === "string") {
        const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Extracts "HH:MM" (24-hour) from a datetime string like "2026-11-03 09:30:00" or "09:30 AM".
 */
export function extractTime24(value, fallback = "08:00") {
    if (!value) return fallback;
    const str = String(value).trim();
    const dtMatch = str.match(/^\d{4}-\d{2}-\d{2}[T\s](\d{2}):(\d{2})/);
    if (dtMatch) {
        return `${dtMatch[1]}:${dtMatch[2]}`;
    }
    if (/^\d{2}:\d{2}$/.test(str)) {
        return str;
    }
    const mins = parseTimeToMinutes(str);
    if (mins >= 0) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return fallback;
}

/**
 * Checks whether a "YYYY-MM-DD" date falls on Sunday (worker rest day).
 */
export function isSundayDate(dateYmd) {
    const ymd = toLocalYmd(dateYmd);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
    const [y, m, d] = ymd.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.getDay() === 0;
}

/**
 * Returns slot availability info for a given "YYYY-MM-DD" date.
 * Each day has 5 slots (1 job per team for 5 teams). Sunday is a rest day.
 */
export function getDateSlotInfo(dateYmd, scheduleConfig = null, excludeBookingId = null) {
    const ymd = toLocalYmd(dateYmd);
    const maxSlots = Number(scheduleConfig?.max_daily_slots) || MAX_DAILY_SLOTS;

    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        return {
            dateYmd: "",
            maxSlots,
            occupiedSlots: 0,
            remainingSlots: maxSlots,
            isSunday: false,
            isFull: false,
            isAvailable: false,
            bookedTimes: [],
        };
    }

    const isSunday = isSundayDate(ymd);
    const bookingsOnDate = scheduleConfig?.bookings_by_date?.[ymd];

    let occupiedSlots = 0;
    let bookedTimes = [];

    if (Array.isArray(bookingsOnDate)) {
        const filtered = excludeBookingId
            ? bookingsOnDate.filter((b) => Number(b.booking_id) !== Number(excludeBookingId))
            : bookingsOnDate;
        occupiedSlots = filtered.length;
        bookedTimes = filtered.map((b) => b.time).filter(Boolean);
    } else if (scheduleConfig?.daily_slot_counts && scheduleConfig.daily_slot_counts[ymd] !== undefined) {
        occupiedSlots = Number(scheduleConfig.daily_slot_counts[ymd]) || 0;
    }

    const remainingSlots = isSunday ? 0 : Math.max(0, maxSlots - occupiedSlots);
    const isFull = !isSunday && occupiedSlots >= maxSlots;
    const isAvailable = !isSunday && !isFull;

    return {
        dateYmd: ymd,
        maxSlots,
        occupiedSlots,
        remainingSlots,
        isSunday,
        isFull,
        isAvailable,
        bookedTimes,
    };
}

/**
 * Returns tomorrow's local "YYYY-MM-DD" (minimum date for date inputs).
 */
export function getTomorrowLocalYmd() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalYmd(d);
}

/**
 * Finds the next available bookable date (skipping Sundays and dates with 5/5 full slots).
 */
export function findNextAvailableDateYmd(startDateYmd = null, scheduleConfig = null, excludeBookingId = null) {
    const baseYmd = startDateYmd && /^\d{4}-\d{2}-\d{2}$/.test(startDateYmd)
        ? startDateYmd
        : getTomorrowLocalYmd();
    const [y, m, d] = baseYmd.split("-").map(Number);

    for (let offset = 0; offset < 90; offset++) {
        const candidate = new Date(y, m - 1, d + offset);
        const candidateYmd = toLocalYmd(candidate);
        const info = getDateSlotInfo(candidateYmd, scheduleConfig, excludeBookingId);
        if (info.isAvailable) {
            return candidateYmd;
        }
    }

    return baseYmd;
}

/**
 * Generates an array of upcoming calendar days (starting from tomorrow) with slot availability metadata.
 */
export function buildUpcomingScheduleCalendar(daysCount = 14, scheduleConfig = null, excludeBookingId = null) {
    const tomorrowYmd = getTomorrowLocalYmd();
    const [y, m, d] = tomorrowYmd.split("-").map(Number);
    const days = [];

    const weekdayFmt = new Intl.DateTimeFormat("en-PH", { weekday: "short" });
    const monthDayFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
    const fullFmt = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

    for (let i = 0; i < daysCount; i++) {
        const dt = new Date(y, m - 1, d + i);
        const dateYmd = toLocalYmd(dt);
        const slotInfo = getDateSlotInfo(dateYmd, scheduleConfig, excludeBookingId);

        days.push({
            ...slotInfo,
            isSelectable: Boolean(slotInfo.isAvailable),
            dayShort: weekdayFmt.format(dt),
            weekdayShort: weekdayFmt.format(dt),
            monthDay: monthDayFmt.format(dt),
            monthDayLabel: monthDayFmt.format(dt),
            fullLabel: fullFmt.format(dt),
            bookedCount: slotInfo.occupiedSlots,
        });
    }

    return days;
}

/**
 * Generates calendar grid cells for a given year & month (0-indexed month) with slot metadata.
 */
export function buildMonthCalendarDays(year, month, scheduleConfig = null, excludeBookingId = null) {
    const tomorrowYmd = getTomorrowLocalYmd();
    const todayYmd = toLocalYmd(new Date());
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];

    // Empty padding cells for preceding days of week
    for (let i = 0; i < firstDayOfWeek; i++) {
        cells.push(null);
    }

    const weekdayFmt = new Intl.DateTimeFormat("en-PH", { weekday: "short" });
    const monthDayFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
    const fullFmt = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const dt = new Date(year, month, dayNum);
        const dateYmd = toLocalYmd(dt);
        const slotInfo = getDateSlotInfo(dateYmd, scheduleConfig, excludeBookingId);
        const isPast = dateYmd < tomorrowYmd;
        const isToday = dateYmd === todayYmd;
        const isSelectable = !isPast && Boolean(slotInfo.isAvailable);

        cells.push({
            ...slotInfo,
            day: dayNum,
            dateYmd,
            isToday,
            isPast,
            isSelectable,
            dayShort: weekdayFmt.format(dt),
            weekdayShort: weekdayFmt.format(dt),
            monthDay: monthDayFmt.format(dt),
            monthDayLabel: monthDayFmt.format(dt),
            fullLabel: fullFmt.format(dt),
            bookedCount: slotInfo.occupiedSlots,
        });
    }

    return cells;
}
