import { useMemo, useState, useEffect } from "react";
import {
    buildMonthCalendarDays,
    getDateSlotInfo,
    getTomorrowLocalYmd,
    toLocalYmd,
} from "../utils/bookingSchedule";

/**
 * Interactive Monthly Calendar Picker with Team Slot Availability
 *
 * @param {Object} props
 * @param {string} props.value - Currently selected date ("YYYY-MM-DD")
 * @param {Function} props.onChange - Callback with (dateYmd)
 * @param {Object} [props.scheduleConfig] - Schedule configuration with slot availability
 * @param {number|null} [props.excludeBookingId] - Booking ID to exclude from occupied counts (for rescheduling)
 * @param {string} [props.minDate] - Earliest selectable date ("YYYY-MM-DD", defaults to tomorrow)
 * @param {Function} [props.onError] - Optional error notification callback (e.g. toast.error)
 * @param {boolean} [props.compact] - Compact sizing for modals
 */
export default function BookingCalendarPicker({
    value,
    onChange,
    scheduleConfig = null,
    excludeBookingId = null,
    minDate = null,
    onError = null,
    compact = false,
}) {
    const effectiveMinDate = minDate || getTomorrowLocalYmd();

    // Determine initial viewing month & year
    const initialDate = useMemo(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split("-").map(Number);
            return new Date(y, m - 1, d);
        }
        const [my, mm, md] = effectiveMinDate.split("-").map(Number);
        return new Date(my, mm - 1, md);
    }, [value, effectiveMinDate]);

    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

    // If selected value changes to another month, sync viewing month
    useEffect(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m] = value.split("-").map(Number);
            setViewYear(y);
            setViewMonth(m - 1);
        }
    }, [value]);

    const minDateObj = useMemo(() => {
        const [y, m, d] = effectiveMinDate.split("-").map(Number);
        return new Date(y, m - 1, d);
    }, [effectiveMinDate]);

    const minYear = minDateObj.getFullYear();
    const minMonth = minDateObj.getMonth();

    const canGoPrev = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth);

    const handlePrevMonth = () => {
        if (!canGoPrev) return;
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const handleJumpEarliest = () => {
        setViewYear(minYear);
        setViewMonth(minMonth);
    };

    const monthName = useMemo(() => {
        return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(
            new Date(viewYear, viewMonth, 1)
        );
    }, [viewYear, viewMonth]);

    const calendarCells = useMemo(() => {
        return buildMonthCalendarDays(viewYear, viewMonth, scheduleConfig, excludeBookingId);
    }, [viewYear, viewMonth, scheduleConfig, excludeBookingId]);

    const selectedSlotInfo = useMemo(() => {
        return value ? getDateSlotInfo(value, scheduleConfig, excludeBookingId) : null;
    }, [value, scheduleConfig, excludeBookingId]);

    const selectedFormatted = useMemo(() => {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const [y, m, d] = value.split("-").map(Number);
        return new Intl.DateTimeFormat("en-PH", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(new Date(y, m - 1, d));
    }, [value]);

    const handleDateClick = (cell) => {
        if (!cell) return;
        if (cell.isPast) {
            onError?.("Please select an upcoming date starting from tomorrow.");
            return;
        }
        if (cell.isSunday) {
            onError?.("Sunday is a worker rest day. Please select Monday to Saturday.");
            return;
        }
        if (cell.isFull) {
            onError?.(`All ${cell.maxSlots} daily team slots on ${cell.dateYmd} are already full.`);
            return;
        }
        onChange(cell.dateYmd);
    };

    const handleManualInputChange = (e) => {
        const val = e.target.value;
        if (!val) {
            onChange("");
            return;
        }
        const info = getDateSlotInfo(val, scheduleConfig, excludeBookingId);
        if (info.isSunday) {
            onError?.("Sunday is a worker rest day. Please select Monday to Saturday.");
        } else if (info.isFull) {
            onError?.(`All ${info.maxSlots} daily team slots on ${val} are already full.`);
        }
        onChange(val);
    };

    const cellHeightClass = compact ? "h-12 sm:h-14" : "h-16 sm:h-20";

    return (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden transition">
            {/* Calendar Header with Month Navigation */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-300 shrink-0">
                        <svg className="w-4 h-4 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-extrabold tracking-tight">{monthName}</h4>
                        <p className="text-[11px] text-slate-300">Click an available date with team slots</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {canGoPrev && (
                        <button
                            type="button"
                            onClick={handleJumpEarliest}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
                            title="Jump to current bookable month"
                        >
                            Earliest
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!canGoPrev}
                        onClick={handlePrevMonth}
                        aria-label="Previous month"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                            canGoPrev
                                ? "bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                                : "bg-white/5 text-slate-500 cursor-not-allowed"
                        }`}
                    >
                        <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        aria-label="Next month"
                        className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"
                    >
                        <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Calendar Weekday Names */}
            <div className="grid grid-cols-7 text-center text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-2 bg-slate-50 border-b border-gray-100 text-gray-500">
                <span className="text-red-500">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
            </div>

            {/* Calendar Day Grid */}
            <div className="p-2 sm:p-3 grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarCells.map((cell, idx) => {
                    if (!cell) {
                        return <div key={`empty_${idx}`} className={`${cellHeightClass} rounded-xl bg-gray-50/40`} />;
                    }

                    const isSelected = value === cell.dateYmd;
                    const isDisabled = cell.isPast || cell.isSunday || cell.isFull;

                    return (
                        <button
                            key={cell.dateYmd}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleDateClick(cell)}
                            className={`${cellHeightClass} p-1 sm:p-1.5 rounded-xl border text-left transition flex flex-col justify-between relative group ${
                                isSelected
                                    ? "border-blue-600 bg-blue-50/90 text-blue-950 ring-2 ring-blue-500/40 shadow-sm z-10"
                                    : cell.isPast
                                    ? "border-transparent bg-gray-50/60 text-gray-300 cursor-not-allowed"
                                    : cell.isSunday
                                    ? "border-gray-200/70 bg-gray-100/70 text-gray-400 cursor-not-allowed"
                                    : cell.isFull
                                    ? "border-rose-200 bg-rose-50/60 text-rose-500 cursor-not-allowed"
                                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-gray-800 cursor-pointer"
                            }`}
                        >
                            {/* Day Number and Today Indicator */}
                            <div className="flex items-center justify-between w-full">
                                <span
                                    className={`text-xs sm:text-sm font-bold ${
                                        isSelected
                                            ? "text-blue-700"
                                            : cell.isSunday
                                            ? "text-red-500"
                                            : cell.isPast
                                            ? "text-gray-300"
                                            : "text-gray-800"
                                    }`}
                                >
                                    {cell.day}
                                </span>
                                {cell.isToday && (
                                    <span className="text-[8px] sm:text-[9px] font-extrabold px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                                        Today
                                    </span>
                                )}
                            </div>

                            {/* Slot Badge Status */}
                            <div className="w-full">
                                {cell.isPast ? (
                                    <span className="text-[9px] text-gray-300 block leading-tight">Passed</span>
                                ) : cell.isSunday ? (
                                    <span className="inline-block text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded bg-gray-200/90 text-gray-600 tracking-tight">
                                        Rest Day
                                    </span>
                                ) : cell.isFull ? (
                                    <span className="inline-block text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 tracking-tight">
                                        Full
                                    </span>
                                ) : (
                                    <span
                                        className={`inline-block text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded tracking-tight transition ${
                                            isSelected
                                                ? "bg-blue-600 text-white"
                                                : cell.remainingSlots <= 2
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200"
                                        }`}
                                    >
                                        <span className="hidden sm:inline">{cell.remainingSlots}/{cell.maxSlots} Slots</span>
                                        <span className="sm:hidden">{cell.remainingSlots}/{cell.maxSlots}</span>
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Selected Date Status, Direct Picker & Legend Footer */}
            <div className="p-3 bg-slate-50/90 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Active Selection Display */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-gray-600 shrink-0">Selected Date:</span>
                    {value && selectedFormatted ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-extrabold text-blue-900 bg-blue-100/90 border border-blue-200 px-2.5 py-1 rounded-lg text-xs">
                                {selectedFormatted}
                            </span>
                            {selectedSlotInfo && (
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                        selectedSlotInfo.isSunday
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : selectedSlotInfo.isFull
                                            ? "bg-rose-50 text-rose-700 border-rose-200"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}
                                >
                                    {selectedSlotInfo.isSunday
                                        ? "Sunday Rest Day (Unavailable)"
                                        : selectedSlotInfo.isFull
                                        ? "Full (0 Slots Left)"
                                        : `${selectedSlotInfo.remainingSlots} of ${selectedSlotInfo.maxSlots} Team Slots Available`}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="italic text-gray-400">Click an available date above</span>
                    )}
                </div>

                {/* Direct date input fallback & Legend */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 font-medium">Or pick date:</span>
                        <input
                            type="date"
                            min={effectiveMinDate}
                            value={value || ""}
                            onChange={handleManualInputChange}
                            className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 border-l border-gray-300/80 pl-3">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Available</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Limited</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Full</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            <span>Rest Day</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
