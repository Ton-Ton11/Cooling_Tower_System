import { useEffect, useState } from "react";
import { Bell, Calendar, CheckCircle2, Clock, Wrench } from "lucide-react";

const tickSubscribers = new Set();
let tickIntervalId = null;
let temporalPolyfillAttempted = false;

function ensureTemporalSupport() {
    if (typeof window === "undefined" || temporalPolyfillAttempted) {
        return;
    }
    temporalPolyfillAttempted = true;
    if (typeof globalThis.Temporal === "undefined") {
        import(/* @vite-ignore */ "https://esm.sh/temporal-polyfill")
            .then((mod) => {
                if (mod?.Temporal && typeof globalThis.Temporal === "undefined") {
                    globalThis.Temporal = mod.Temporal;
                }
            })
            .catch(() => {
                // Offline fallback remains active when CDN is unreachable
            });
    }
}

function subscribeTicker(listener) {
    ensureTemporalSupport();
    tickSubscribers.add(listener);
    if (!tickIntervalId && typeof window !== "undefined") {
        tickIntervalId = window.setInterval(() => {
            const now = Date.now();
            tickSubscribers.forEach((fn) => fn(now));
        }, 1000);
    }
    return () => {
        tickSubscribers.delete(listener);
        if (tickSubscribers.size === 0 && tickIntervalId) {
            window.clearInterval(tickIntervalId);
            tickIntervalId = null;
        }
    };
}

const pad2 = (value) => String(Math.max(0, Number(value || 0))).padStart(2, "0");

/**
 * Compute remaining countdown differential using Temporal.ZonedDateTime + Intl.DurationFormat
 * when available, with a graceful fallback for browsers without native Temporal support.
 */
export function computeMaintenanceCountdown(reminder, nowEpochMs) {
    if (!reminder) {
        return {
            isPast: false,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isoDuration: "PT0S",
            localizedSummary: "0 sec",
        };
    }

    const tz = reminder.time_zone || "Asia/Manila";
    const dueDateStr = reminder.due_date || null;
    const dueTimeStr = reminder.due_time || "08:00:00";

    if (typeof globalThis.Temporal !== "undefined" && dueDateStr) {
        try {
            const T = globalThis.Temporal;
            const now = T.Now.zonedDateTimeISO(tz);
            const end = T.PlainDate.from(dueDateStr)
                .toPlainDateTime(dueTimeStr)
                .toZonedDateTime(tz);
            const remaining = now.until(end, {
                largestUnit: "day",
                smallestUnit: "second",
            });

            if (remaining.sign <= 0) {
                return {
                    isPast: true,
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isoDuration: "PT0S",
                    localizedSummary: "Due now",
                };
            }

            let localizedSummary = "";
            if (typeof remaining.toLocaleString === "function") {
                try {
                    localizedSummary = remaining.toLocaleString("en-US", {
                        style: "narrow",
                    });
                } catch {
                    localizedSummary = "";
                }
            }
            if (!localizedSummary && typeof Intl !== "undefined" && typeof Intl.DurationFormat === "function") {
                try {
                    localizedSummary = new Intl.DurationFormat("en-US", {
                        style: "narrow",
                    }).format({
                        days: remaining.days,
                        hours: remaining.hours,
                        minutes: remaining.minutes,
                        seconds: remaining.seconds,
                    });
                } catch {
                    localizedSummary = "";
                }
            }

            return {
                isPast: false,
                days: remaining.days,
                hours: remaining.hours,
                minutes: remaining.minutes,
                seconds: remaining.seconds,
                isoDuration: remaining.toString(),
                localizedSummary:
                    localizedSummary ||
                    `${remaining.days}d ${pad2(remaining.hours)}h ${pad2(remaining.minutes)}m ${pad2(remaining.seconds)}s`,
            };
        } catch {
            // Fall through to resilient fallback
        }
    }

    const targetMs = reminder.target_iso ? Date.parse(reminder.target_iso) : NaN;
    if (Number.isNaN(targetMs)) {
        return {
            isPast: false,
            days: Math.max(0, Number(reminder.days_remaining || 0)),
            hours: 0,
            minutes: 0,
            seconds: 0,
            isoDuration: "PT0S",
            localizedSummary: `${Math.max(0, Number(reminder.days_remaining || 0))}d`,
        };
    }

    const diffSeconds = Math.floor((targetMs - nowEpochMs) / 1000);
    if (diffSeconds <= 0) {
        return {
            isPast: true,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isoDuration: "PT0S",
            localizedSummary: "Due now",
        };
    }

    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    let localizedSummary = `${days}d ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
    if (typeof Intl !== "undefined" && typeof Intl.DurationFormat === "function") {
        try {
            localizedSummary = new Intl.DurationFormat("en-US", {
                style: "narrow",
            }).format({ days, hours, minutes, seconds });
        } catch {
            // Keep compact fallback format
        }
    }

    return {
        isPast: false,
        days,
        hours,
        minutes,
        seconds,
        isoDuration: `P${days}DT${hours}H${minutes}M${seconds}S`,
        localizedSummary,
    };
}

export default function MaintenanceReminderCountdown({
    reminder,
    variant = "card", // "card" | "table" | "drawer"
    onBookService = null,
}) {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!reminder) return undefined;
        return subscribeTicker(setNowMs);
    }, [reminder]);

    if (!reminder) {
        return null;
    }

    const countdown = computeMaintenanceCountdown(reminder, nowMs);
    const isScheduled = reminder.status === "Scheduled";
    const isDueNow = !isScheduled && (reminder.status === "Due Now" || countdown.isPast);
    const isDueSoon = !isScheduled && !isDueNow && (reminder.status === "Due Soon" || countdown.days <= 7);

    // 1. Compact Table Pill for Super Admin & Manager Bookings Tab
    if (variant === "table") {
        const badgeStyles = isScheduled
            ? {
                  bg: "#ECFDF5",
                  border: "#A7F3D0",
                  titleColor: "#065F46",
                  valueColor: "#047857",
                  pillBg: "#D1FAE5",
                  pillText: "Scheduled",
              }
            : isDueNow
            ? {
                  bg: "#FFFBEB",
                  border: "#FDE68A",
                  titleColor: "#92400E",
                  valueColor: "#B45309",
                  pillBg: "#FDE68A",
                  pillText: "Due Now",
              }
            : isDueSoon
            ? {
                  bg: "#FFFBEB",
                  border: "#FDE68A",
                  titleColor: "#92400E",
                  valueColor: "#B45309",
                  pillBg: "#FEF3C7",
                  pillText: "Due Soon",
              }
            : {
                  bg: "#EFF6FF",
                  border: "#BFDBFE",
                  titleColor: "#1E3A8A",
                  valueColor: "#1D4ED8",
                  pillBg: "#DBEAFE",
                  pillText: "Reminder",
              };

        return (
            <div
                title={`Repair/Check-up & Cleaning/Preventive Maintenance Reminder — Due ${reminder.due_date_formatted}`}
                style={{
                    marginTop: 5,
                    padding: "5px 8px",
                    borderRadius: 8,
                    background: badgeStyles.bg,
                    border: `1px solid ${badgeStyles.border}`,
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 165,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                    }}
                >
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: badgeStyles.titleColor,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "nowrap",
                        }}
                    >
                        <Bell size={10} />
                        <span>Check-up &amp; Cleaning</span>
                    </span>
                    <span
                        style={{
                            fontSize: 9,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "1px 5px",
                            borderRadius: 999,
                            background: badgeStyles.pillBg,
                            color: badgeStyles.titleColor,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {badgeStyles.pillText}
                    </span>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                        fontSize: 11,
                    }}
                >
                    {isScheduled ? (
                        <span style={{ fontWeight: 700, color: badgeStyles.valueColor }}>
                            Follow-up Booked
                        </span>
                    ) : isDueNow ? (
                        <span style={{ fontWeight: 800, color: badgeStyles.valueColor }}>
                            Active ({reminder.due_date_formatted})
                        </span>
                    ) : (
                        <time
                            dateTime={countdown.isoDuration}
                            aria-label={countdown.localizedSummary}
                            style={{
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                fontWeight: 800,
                                color: badgeStyles.valueColor,
                                fontVariantNumeric: "tabular-nums",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {countdown.days}d {pad2(countdown.hours)}h {pad2(countdown.minutes)}m {pad2(countdown.seconds)}s
                        </time>
                    )}
                    {!isDueNow && (
                        <span
                            style={{
                                fontSize: 10,
                                color: "#64748B",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {reminder.due_date_formatted}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // 2. Drawer Card for Super Admin & Manager Client Panel
    if (variant === "drawer") {
        const tone = isScheduled
            ? { bg: "#F0FDF4", border: "#BBF7D0", accent: "#15803D", label: "Scheduled" }
            : isDueNow
            ? { bg: "#FFFBEB", border: "#FDE68A", accent: "#B45309", label: "Due Now" }
            : isDueSoon
            ? { bg: "#FFFBEB", border: "#FDE68A", accent: "#B45309", label: "Due Soon" }
            : { bg: "#EFF6FF", border: "#BFDBFE", accent: "#1D4ED8", label: "3-Month Cycle" };

        return (
            <div
                style={{
                    background: tone.bg,
                    border: `1px solid ${tone.border}`,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#1E2F5F",
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        <Bell size={13} color={tone.accent} />
                        <span>Reminder Countdown</span>
                    </span>
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#FFFFFF",
                            border: `1px solid ${tone.border}`,
                            color: tone.accent,
                        }}
                    >
                        {tone.label}
                    </span>
                </div>

                <p style={{ margin: "0 0 10px", fontSize: 11, color: "#475569", fontWeight: 600 }}>
                    Repair / Check-up &bull; Cleaning / Preventive Maintenance
                </p>

                {isScheduled ? (
                    <div
                        style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: "#FFFFFF",
                            border: `1px solid ${tone.border}`,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#15803D",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <CheckCircle2 size={14} />
                        <span>Follow-up service scheduled (Due {reminder.due_date_formatted})</span>
                    </div>
                ) : isDueNow ? (
                    <div
                        style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: "#FEF3C7",
                            border: "1px solid #FCD34D",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#92400E",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <span>Automated reminder active</span>
                        <span>{reminder.due_date_formatted}</span>
                    </div>
                ) : (
                    <time
                        dateTime={countdown.isoDuration}
                        aria-label={countdown.localizedSummary}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                            gap: 6,
                            textAlign: "center",
                        }}
                    >
                        {[
                            { label: "Days", value: countdown.days },
                            { label: "Hrs", value: pad2(countdown.hours) },
                            { label: "Mins", value: pad2(countdown.minutes) },
                            { label: "Secs", value: pad2(countdown.seconds) },
                        ].map((box) => (
                            <div
                                key={box.label}
                                style={{
                                    background: "#FFFFFF",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: 10,
                                    padding: "6px 4px",
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: "#0F172A",
                                        fontVariantNumeric: "tabular-nums",
                                        lineHeight: 1.1,
                                    }}
                                >
                                    {box.value}
                                </div>
                                <div
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        color: "#64748B",
                                        marginTop: 2,
                                    }}
                                >
                                    {box.label}
                                </div>
                            </div>
                        ))}
                    </time>
                )}

                <div
                    style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: "#64748B",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>Last Service: {reminder.last_service_formatted}</span>
                    <strong style={{ color: "#1E2F5F" }}>Due: {reminder.due_date_formatted}</strong>
                </div>
            </div>
        );
    }

    // 3. Default Card Strip for Customer Service History & Completed Bookings
    const cardTone = isScheduled
        ? "bg-[#F0FDF4] border-[#BBF7D0]"
        : isDueNow || isDueSoon
        ? "bg-[#FFFBEB] border-[#FDE68A]"
        : "bg-[#F4F8FF] border-[#CFE0FF]";

    const statusBadgeClass = isScheduled
        ? "bg-white text-[#15803D] border-[#BBF7D0]"
        : isDueNow || isDueSoon
        ? "bg-amber-100 text-[#B45309] border-amber-300"
        : "bg-white text-[#2563EB] border-[#C7DDFD]";

    const statusText = isScheduled
        ? "Scheduled"
        : isDueNow
        ? "Due Now"
        : isDueSoon
        ? "Due Soon"
        : "3-Month Cycle";

    return (
        <div className={`mt-3.5 rounded-xl border p-3.5 sm:p-4 ${cardTone}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Left: Minimal Label & Scope */}
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#172B4D]">
                            <Bell
                                size={14}
                                className={
                                    isScheduled
                                        ? "text-[#16A34A]"
                                        : isDueNow || isDueSoon
                                        ? "text-[#D97706]"
                                        : "text-[#2563EB]"
                                }
                            />
                            <span>Automated Reminder</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
                            {statusText}
                        </span>
                    </div>

                    <p className="text-xs font-semibold text-[#334155]">
                        Repair / Check-up &bull; Cleaning / Preventive Maintenance
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-[#64748B] flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            <Calendar size={12} className="text-[#2563EB]" />
                            <span>Due <strong className="text-[#172B4D]">{reminder.due_date_formatted}</strong></span>
                        </span>
                        <span>&bull;</span>
                        <span>Since {reminder.last_service_formatted}</span>
                    </div>
                </div>

                {/* Right: Live Countdown + Minimal Quick Book Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                    {isScheduled ? (
                        <div className="px-3 py-2 rounded-lg bg-white border border-[#BBF7D0] text-xs font-bold text-[#15803D] inline-flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            <span>Follow-up Scheduled</span>
                        </div>
                    ) : isDueNow ? (
                        <div className="px-3 py-2 rounded-lg bg-amber-100/90 border border-amber-300 text-xs font-bold text-amber-900 inline-flex items-center gap-1.5">
                            <Clock size={14} className="text-amber-700" />
                            <span>Service Due Now</span>
                        </div>
                    ) : (
                        <time
                            dateTime={countdown.isoDuration}
                            aria-label={countdown.localizedSummary}
                            className="grid grid-cols-4 gap-1.5 text-center"
                        >
                            {[
                                { label: "Days", value: countdown.days },
                                { label: "Hrs", value: pad2(countdown.hours) },
                                { label: "Mins", value: pad2(countdown.minutes) },
                                { label: "Secs", value: pad2(countdown.seconds) },
                            ].map((unit) => (
                                <div
                                    key={unit.label}
                                    className="min-w-[50px] py-1.5 px-2 rounded-lg bg-white border border-[#DCE6F5] shadow-2xs"
                                >
                                    <span className="block font-mono text-sm font-extrabold text-[#172B4D] tabular-nums leading-none">
                                        {unit.value}
                                    </span>
                                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64748B] mt-1">
                                        {unit.label}
                                    </span>
                                </div>
                            ))}
                        </time>
                    )}

                    {onBookService && !isScheduled && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => onBookService(reminder.cleaning_service_id || 3)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            >
                                Book Cleaning
                            </button>
                            <button
                                type="button"
                                onClick={() => onBookService(reminder.repair_service_id || 2)}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EAF2FF] text-[#172B4D] hover:text-[#2563EB] border border-[#CBD5E1] hover:border-[#93C5FD] text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                                <Wrench size={11} />
                                <span>Check-up</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
