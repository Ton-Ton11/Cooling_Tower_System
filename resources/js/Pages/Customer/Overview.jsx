import { useState, useMemo, useEffect } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { formatDateTime } from "../../utils/superAdmin";
import { evaluateZamboangaGeospatial } from "../../Components/GeospatialAddressAutocomplete";
import { isGeospatialAlertAcknowledged, persistGeospatialAlertAcknowledgment } from "../../utils/geospatialAlert";

const icons = {
    check: "M5 13l4 4L19 7",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    tool: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    arrow: "M9 5l7 7-7 7",
    plus: "M12 4v16m8-8H4",
    phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
};

const ACCREDITED_BRANDS = [
    { name: "Panasonic", tag: "Inverter & Split" },
    { name: "Daikin", tag: "Specialist" },
    { name: "Carrier", tag: "Commercial & Home" },
    { name: "Condura", tag: "Heavy Duty" },
    { name: "Kelvinator", tag: "Certified Care" },
    { name: "Gree", tag: "Smart Cooling" },
    { name: "Midea", tag: "Eco Inverter" },
];

const COMPANY_DETAILS = {
    address: "Door 5, Apostol Bldg., Mayor Jaldon St. Canelar Zamboanga City",
    mobile: "0917 877 7670",
    telephone: "062 310-2275",
    facebook: "Cooling Tower Airconditioning Services",
    facebookUrl: "https://www.facebook.com/share/19w3XmbCza/",
};

export default function CustomerOverview({ onNavigate, dashboardData, isLoading, onSelectServiceToBook }) {
    const [activeTab, setActiveTab] = useState("services"); // "services" | "requests"
    const [copiedKey, setCopiedKey] = useState(null);
    const [outsideZamboangaAlertOpen, setOutsideZamboangaAlertOpen] = useState(false);

    const [nowTime, setNowTime] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNowTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const todayIso = `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, "0")}-${String(nowTime.getDate()).padStart(2, "0")}`;
    const [calMonth, setCalMonth] = useState(() => new Date(nowTime.getFullYear(), nowTime.getMonth(), 1));
    const [selectedCalDate, setSelectedCalDate] = useState(null);

    const user = dashboardData?.user ?? {};
    const isUnverifiedBusiness =
        user?.account_type === "business" && (user?.verification_status || "pending") !== "approved";

    const handleAttemptBookService = (serviceId = null) => {
        if (isUnverifiedBusiness) {
            return;
        }
        if (serviceId && onSelectServiceToBook) {
            onSelectServiceToBook(serviceId);
        }
        const currentAddr = (dashboardData?.user?.address || "").trim();
        const isWithin = dashboardData?.user?.is_within_zamboanga_city !== undefined
            ? Boolean(dashboardData.user.is_within_zamboanga_city)
            : evaluateZamboangaGeospatial(currentAddr).is_within_zamboanga_city;

        if (currentAddr.length > 2 && !isWithin && !isGeospatialAlertAcknowledged(dashboardData?.user)) {
            setOutsideZamboangaAlertOpen(true);
            return;
        }
        onNavigate("book");
    };

    const handleCopy = (text, key) => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const fallbackCopy = (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const recentBookings = dashboardData?.recent_bookings ?? [];
    const services = useMemo(() => {
        return (dashboardData?.services ?? []).filter(s => s.is_active !== false && s.is_active !== 0);
    }, [dashboardData?.services]);
    const announcements = dashboardData?.announcements ?? [];

    const customerCalendarEvents = useMemo(() => {
        if (Array.isArray(dashboardData?.calendar_events) && dashboardData.calendar_events.length > 0) {
            return dashboardData.calendar_events;
        }
        // Fallback from recent_bookings if calendar_events hasn't loaded yet
        return (dashboardData?.recent_bookings ?? [])
            .filter((b) => b.scheduled_date && b.booking_status !== "Cancelled")
            .map((b) => {
                const iso = String(b.scheduled_date).slice(0, 10);
                const statusStr = String(b.booking_status || "Pending");
                return {
                    id: `fallback_booking_${b.booking_id}`,
                    booking_id: b.booking_id,
                    date: iso,
                    date_label: b.scheduled_date_formatted ? b.scheduled_date_formatted.split(" ").slice(0, 3).join(" ") : iso,
                    time: b.scheduled_date_formatted ? b.scheduled_date_formatted.split(" ").slice(3).join(" ") : "",
                    kind: "booking",
                    badge: statusStr === "Approved" ? "Confirmed" : statusStr,
                    tone: statusStr === "Completed" ? "emerald" : statusStr === "Pending" ? "amber" : "blue",
                    title: b.service_name || "Aircon Service",
                    subtitle: `Tech: ${b.assigned_tech_name || "Pending Assignment"}`,
                };
            });
    }, [dashboardData?.calendar_events, dashboardData?.recent_bookings]);

    const calendarCells = useMemo(() => {
        const year = calMonth.getFullYear();
        const month = calMonth.getMonth();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const makeIso = (dObj) =>
            `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;

        const cells = [];

        // Leading days from previous month
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            const dObj = new Date(year, month - 1, day);
            const iso = makeIso(dObj);
            cells.push({
                day,
                label: String(day).padStart(2, "0"),
                iso,
                isCurrentMonth: false,
                targetMonth: new Date(dObj.getFullYear(), dObj.getMonth(), 1),
                events: customerCalendarEvents.filter((ev) => ev.date === iso),
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            cells.push({
                day,
                label: String(day).padStart(2, "0"),
                iso,
                isCurrentMonth: true,
                targetMonth: null,
                events: customerCalendarEvents.filter((ev) => ev.date === iso),
            });
        }

        // Trailing days from next month to fill 6 rows (42 cells)
        const remaining = 42 - cells.length;
        for (let day = 1; day <= remaining; day++) {
            const dObj = new Date(year, month + 1, day);
            const iso = makeIso(dObj);
            cells.push({
                day,
                label: String(day).padStart(2, "0"),
                iso,
                isCurrentMonth: false,
                targetMonth: new Date(dObj.getFullYear(), dObj.getMonth(), 1),
                events: customerCalendarEvents.filter((ev) => ev.date === iso),
            });
        }

        return cells;
    }, [calMonth, customerCalendarEvents]);

    const footerFullDate = useMemo(() => {
        if (selectedCalDate) {
            const [y, m, d] = selectedCalDate.split("-").map(Number);
            return new Date(y, m - 1, d).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
            });
        }
        return nowTime.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }, [selectedCalDate, nowTime]);

    const serviceVisuals = {
        "Installation": {
            badge: "Turnkey Setup",
            tagline: "Split, Inverter & Multi-Split",
            progressLabel: "100% Certified",
            iconType: "install",
        },
        "Repair / Check-up": {
            badge: "Troubleshooting",
            tagline: "Water Leaks, Noise & No Cooling",
            progressLabel: "Rapid Diagnosis",
            iconType: "repair",
        },
        "Cleaning / Preventive Maintenance": {
            badge: "Regular Care",
            tagline: "Chemical Wash & Coil Sanitation",
            progressLabel: "Seasonal Wash",
            iconType: "cleaning",
        },
        "Ocular Inspection": {
            badge: "Free Inspection",
            tagline: "Buy & Install AC Room Sizing",
            progressLabel: "Free (₱0.00)",
            iconType: "ocular",
        },
    };

    const renderServiceIcon = (type) => {
        if (type === "install") {
            return (
                <svg className="w-5 h-5 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            );
        }
        if (type === "repair") {
            return (
                <svg className="w-5 h-5 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
            );
        }
        if (type === "ocular") {
            return (
                <svg className="w-5 h-5 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            );
        }
        return (
            <svg className="w-5 h-5 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ──────────────────────────────────────────────────────────────
                    MAIN CONTENT COLUMN (8 COLS)
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-8 space-y-6">
                    {/* SECTION 1: HERO BANNER */}
                    <div
                        className="rounded-xl p-6 sm:p-8 text-white border border-white/10"
                        style={{
                            background: "linear-gradient(135deg, #10213F 0%, #17315E 100%)",
                        }}
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/15 text-[#EAF2FF] text-[11px] font-semibold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
                                    <span>Authorized Dealer, Installer & Service Center</span>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                                    Certified Airconditioning Care for Home & Business
                                </h1>
                                <p className="text-sm text-slate-200 leading-relaxed">
                                    Schedule a certified technician in minutes. Transparent assessments, official quotations, and guaranteed appointment reservation.
                                </p>

                                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-200">
                                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-md">
                                        <svg className="w-3.5 h-3.5 text-[#93C5FD] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>100% Workmanship Warranty</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-md">
                                        <svg className="w-3.5 h-3.5 text-[#93C5FD] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <span>Authorized Multi-Brand Center</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-md">
                                        <svg className="w-3.5 h-3.5 text-[#93C5FD] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Itemized Quotation</span>
                                    </span>
                                </div>
                            </div>

                            {/* Primary Call-To-Action */}
                            <div className="flex flex-col gap-2.5 shrink-0 self-start md:self-center w-full sm:w-auto">
                                <button
                                    onClick={() => handleAttemptBookService(null)}
                                    disabled={isUnverifiedBusiness}
                                    title={isUnverifiedBusiness ? "Booking is locked until your Business / Corporate account is verified by an administrator." : undefined}
                                    className="px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d={icons.plus} />
                                    </svg>
                                    <span>{isUnverifiedBusiness ? "Booking Locked (Pending Review)" : "Book a Service Appointment"}</span>
                                </button>
                                <button
                                    onClick={() => onNavigate("bookings")}
                                    className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>View My Bookings</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ACCREDITATION & PARTNER BRANDS */}
                    <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#DCE4F0] shadow-[0_1px_6px_rgba(16,33,63,0.04)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8EEF7] pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#15803D] bg-[#F0FDF4] px-2.5 py-0.5 rounded-md border border-[#BBF7D0]">
                                            DTI Accredited
                                        </span>
                                        <span className="text-xs font-medium text-[#64748B]">Official Warranty Protection</span>
                                    </div>
                                    <h2 className="text-sm font-semibold text-[#172B4D] mt-1">
                                        Accredited Dealer, Installer & Service Center
                                    </h2>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="text-xs font-semibold text-[#172B4D] block">Factory-Certified Technicians</span>
                                <span className="text-xs text-[#64748B]">100% genuine parts • Preserves unit factory warranty</span>
                            </div>
                        </div>

                        {/* Partner Brands Neutral Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                            {ACCREDITED_BRANDS.map((brand) => (
                                <div
                                    key={brand.name}
                                    className="ct-service-card p-3 rounded-lg bg-[#FAFCFF] border border-[#DCE6F5] hover:border-[#93B8F5] transition-colors text-center"
                                >
                                    <span className="block text-xs font-semibold text-[#172B4D] uppercase tracking-tight">
                                        {brand.name}
                                    </span>
                                    <span className="block text-[11px] text-[#64748B] truncate mt-0.5">
                                        {brand.tag}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 3: SERVICES & SERVICE REQUESTS */}
                    <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#D5E0F0] shadow-[0_2px_10px_rgba(16,33,63,0.05)] space-y-5">
                        {/* Header & Tabs */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6EEF8] pb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-[#172B4D] tracking-tight">Services & Service Requests</h2>
                                <p className="text-xs text-[#64748B] mt-0.5">Explore available cooling services or track your active service requests.</p>
                            </div>

                            <div className="inline-flex items-center bg-[#F4F7FB] p-1 rounded-lg border border-[#DCE6F5] self-start sm:self-auto">
                                <button
                                    onClick={() => setActiveTab("services")}
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === "services"
                                            ? "bg-[#2563EB] text-white shadow-[0_1px_3px_rgba(37,99,235,0.25)]"
                                            : "text-[#64748B] hover:text-[#172B4D]"
                                    }`}
                                >
                                    <span>Core Services</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[11px] ${activeTab === "services" ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#172B4D]"}`}>
                                        {services.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("requests")}
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === "requests"
                                            ? "bg-[#2563EB] text-white shadow-[0_1px_3px_rgba(37,99,235,0.25)]"
                                            : "text-[#64748B] hover:text-[#172B4D]"
                                    }`}
                                >
                                    <span>Recent Requests</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[11px] ${activeTab === "requests" ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#172B4D]"}`}>
                                        {recentBookings.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: SUBTLE BLUE-WHITE SERVICE CARDS */}
                        {activeTab === "services" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {services.map((srv) => {
                                    const meta = serviceVisuals[srv.service_name] || {
                                        badge: "Certified Service",
                                        tagline: "HVAC Engineering",
                                        progressLabel: "100% Quality",
                                        iconType: "install",
                                    };

                                    return (
                                        <div
                                            key={srv.service_id}
                                            className="ct-service-card bg-[#EFF6FF] rounded-xl border border-[#CFE0FF] shadow-[0_1px_3px_rgba(16,33,63,0.04)] hover:border-[#93C5FD] hover:shadow-[0_4px_10px_rgba(37,99,235,0.07)] p-5 transition-all duration-150 flex flex-col justify-between min-h-[250px]"
                                        >
                                            <div className="space-y-3.5">
                                                {/* Unified Light-Blue Icon & Category Badge Row */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] border border-[#D4E4FF] flex items-center justify-center shrink-0">
                                                        {renderServiceIcon(meta.iconType)}
                                                    </div>
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD] text-[11px] font-semibold uppercase tracking-wide">
                                                        {meta.badge}
                                                    </span>
                                                </div>

                                                {/* Title & Description */}
                                                <div className="space-y-1.5">
                                                    <h3 className="text-base font-semibold text-[#172B4D]">
                                                        {srv.service_name}
                                                    </h3>
                                                    <p className="text-xs text-[#64748B] leading-relaxed line-clamp-3">
                                                        {srv.description}
                                                    </p>
                                                </div>

                                                {/* Light-Blue Scope Section */}
                                                <div className="bg-[#EAF2FF] border border-[#D6E6FF] rounded-lg px-3 py-2 text-xs">
                                                    <span className="font-semibold text-[#2563EB]">Scope: </span>
                                                    <span className="font-medium text-[#172B4D]">{meta.tagline}</span>
                                                </div>
                                            </div>

                                            {/* Card Footer */}
                                            <div className="pt-4 mt-4 border-t border-[#E3ECFA] flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
                                                    <span className="w-4 h-4 rounded-full bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                    <span>{meta.progressLabel}</span>
                                                </div>

                                                <button
                                                    onClick={() => handleAttemptBookService(srv.service_id)}
                                                    disabled={isUnverifiedBusiness}
                                                    title={isUnverifiedBusiness ? "Booking is locked until your Business / Corporate account is verified." : undefined}
                                                    className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <span>{isUnverifiedBusiness ? "Locked" : "Request"}</span>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d={icons.arrow} />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* TAB 2: RECENT REQUESTS LIST */}
                        {activeTab === "requests" && (
                            <div className="space-y-3">
                                {recentBookings.length === 0 ? (
                                    <div className="ct-service-card py-10 px-4 text-center rounded-xl bg-[#FAFCFF] border border-[#DCE6F5] space-y-3">
                                        <p className="text-xs text-[#64748B]">You have not submitted any service requests yet.</p>
                                        <button
                                            onClick={() => onNavigate("book")}
                                            className="px-4 py-2 rounded-lg bg-[#2563EB] text-white font-semibold text-xs hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                                        >
                                            Schedule a Service Now
                                        </button>
                                    </div>
                                ) : (
                                    recentBookings.map((b) => (
                                        <div
                                            key={b.booking_id}
                                            className="ct-service-card p-4 rounded-xl border border-[#DCE6F5] bg-[#FAFCFF] hover:border-[#8DB4F7] hover:shadow-[0_4px_12px_rgba(37,99,235,0.07)] transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] text-[#2563EB] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#C7DDFD]">
                                                    #{b.booking_id}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm font-semibold text-[#172B4D]">{b.service_name}</h4>
                                                        <StatusBadge status={b.booking_status} />
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                                                            Quotation: {b.quotation_status || "Pending Assessment"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#64748B] mt-1 flex items-center gap-2 flex-wrap">
                                                        <span>Scheduled: <strong className="text-[#172B4D]">{b.scheduled_date_formatted || "To Be Confirmed"}</strong></span>
                                                        <span>•</span>
                                                        <span>Tech: {b.assigned_tech_name || "Awaiting Assignment"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onNavigate("bookings")}
                                                className="px-3.5 py-2 rounded-lg bg-white border border-[#DCE6F5] hover:border-[#2563EB] hover:text-[#2563EB] text-xs font-semibold text-[#172B4D] transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                                            >
                                                View Booking &rarr;
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* SECTION 4: MAINTENANCE ADVISORY */}
                    <div className="bg-[#EAF2FF] rounded-xl p-5 border border-[#C7DDFD] shadow-[0_1px_4px_rgba(37,99,235,0.05)] flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-lg bg-white border border-[#C7DDFD] flex items-center justify-center shrink-0 text-[#2563EB]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="space-y-1 text-xs">
                            <h4 className="font-semibold text-[#172B4D]">Technician Maintenance Tip: Keep Your Unit Efficient</h4>
                            <p className="text-[#64748B] leading-relaxed">
                                Cleaning your air filters every 2 to 4 weeks improves airflow by up to 15% and reduces electricity bills. Book a deep chemical wash every 3 to 6 months to prevent indoor coil freeze-ups and compressor wear.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    RIGHT COLUMN WIDGETS (4 COLS)
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-5">
                    {/* WIDGET 1: CLEAN CALENDAR WIDGET */}
                    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-[0_2px_10px_rgba(16,33,63,0.06)] overflow-hidden">
                        {/* Dark Navy Header + Blue Accent Line */}
                        <div className="px-5 py-4 bg-[#10213F] text-white flex items-center justify-between gap-3 border-b-[3px] border-[#2563EB]">
                            <button
                                type="button"
                                title="Jump to current month"
                                onClick={() => {
                                    setCalMonth(new Date(nowTime.getFullYear(), nowTime.getMonth(), 1));
                                    setSelectedCalDate(null);
                                }}
                                className="text-base sm:text-[17px] font-bold text-white tracking-tight hover:text-[#93C5FD] transition-colors cursor-pointer text-left"
                            >
                                {calMonth.toLocaleDateString("en-US", { month: "long" })}, {calMonth.getFullYear()}
                            </button>

                            {/* Pill Month Switcher */}
                            <div className="inline-flex items-center rounded-full bg-[#2563EB] px-2 py-1 gap-2.5 shrink-0 shadow-xs">
                                <button
                                    type="button"
                                    aria-label="Previous month"
                                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                                    className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                                >
                                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 16 16">
                                        <path d="M10.5 3L4.5 8l6 5V3z" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next month"
                                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                                    className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                                >
                                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 16 16">
                                        <path d="M5.5 3l6 5-6 5V3z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* White Calendar Date Grid */}
                        <div className="px-5 pt-4 pb-3 bg-white">
                            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#1E293B] pb-3">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                    <span key={d}>{d}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
                                {calendarCells.map((cell) => {
                                    const isSelected = selectedCalDate === cell.iso;
                                    const isToday = cell.iso === todayIso;
                                    const hasBooking = cell.events.some((ev) => ev.kind === "booking");
                                    const isClosed = cell.events.some((ev) => ev.kind === "closed");
                                    const eventTooltip = cell.events.length > 0
                                        ? cell.events.map((ev) => `${ev.title}${ev.time ? ` (${ev.time})` : ""}`).join(" • ")
                                        : undefined;

                                    return (
                                        <button
                                            key={cell.iso}
                                            type="button"
                                            title={eventTooltip}
                                            onClick={() => {
                                                if (!cell.isCurrentMonth && cell.targetMonth) {
                                                    setCalMonth(cell.targetMonth);
                                                }
                                                setSelectedCalDate(isSelected ? null : cell.iso);
                                            }}
                                            className={`h-8 rounded-lg text-xs tabular-nums flex flex-col items-center justify-center relative transition-colors duration-150 cursor-pointer ${
                                                !cell.isCurrentMonth
                                                    ? "text-[#CBD5E1] font-medium hover:text-[#64748B] hover:bg-[#F4F7FB]"
                                                    : isSelected
                                                    ? "bg-[#2563EB] text-white font-bold shadow-xs"
                                                    : isToday
                                                    ? "bg-[#DBEAFE] text-[#1E40AF] font-bold ring-1 ring-inset ring-[#2563EB]"
                                                    : isClosed
                                                    ? "bg-[#FEF3C7] text-[#92400E] font-semibold"
                                                    : hasBooking
                                                    ? "bg-[#F4F7FB] text-[#2563EB] font-bold hover:bg-[#DBEAFE]"
                                                    : "text-[#1E293B] font-semibold hover:bg-[#DBEAFE]/60"
                                            }`}
                                        >
                                            <span>{cell.label}</span>
                                            {cell.isCurrentMonth && (hasBooking || isClosed) && (
                                                <span
                                                    className={`w-1 h-1 rounded-full absolute bottom-1 ${
                                                        isSelected
                                                            ? "bg-white"
                                                            : isClosed
                                                            ? "bg-[#D97706]"
                                                            : "bg-[#2563EB]"
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Live Clock + Full Date + Year Switcher Footer */}
                        <div className="px-5 py-3 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xs sm:text-[13px] font-extrabold text-[#10213F] tabular-nums whitespace-nowrap">
                                    {nowTime.toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        hour12: true,
                                    })}
                                </span>
                                <span className="w-[1.5px] h-4 bg-[#93C5FD] shrink-0" />
                                <span className="text-[11px] font-bold text-[#1E293B] truncate" title={footerFullDate}>
                                    {footerFullDate}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    title="Previous year"
                                    aria-label="Previous year"
                                    onClick={() => setCalMonth(new Date(calMonth.getFullYear() - 1, calMonth.getMonth(), 1))}
                                    className="w-6 h-6 rounded-md text-[#2563EB] hover:bg-[#DBEAFE] flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                        <path d="M10.5 5l-5 5 5 5V5zm5 0l-5 5 5 5V5z" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    title="Next year"
                                    aria-label="Next year"
                                    onClick={() => setCalMonth(new Date(calMonth.getFullYear() + 1, calMonth.getMonth(), 1))}
                                    className="w-6 h-6 rounded-md text-[#2563EB] hover:bg-[#DBEAFE] flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                        <path d="M4.5 5l5 5-5 5V5zm5 0l5 5-5 5V5z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* WIDGET 2: ANNOUNCEMENTS */}
                    <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#DCE4F0] shadow-[0_1px_6px_rgba(16,33,63,0.04)] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E8EEF7] pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.megaphone} />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-semibold text-[#172B4D]">Announcements</h3>
                            </div>
                            <span className="text-[11px] font-medium text-[#64748B]">Official</span>
                        </div>

                        {announcements.length === 0 ? (
                            <div className="p-3.5 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#64748B]">
                                No new announcements at the moment.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {announcements.slice(0, 3).map((a) => (
                                    <div key={a.id} className="ct-service-card p-3.5 rounded-lg bg-[#FAFCFF] border border-[#DCE6F5] text-xs space-y-1.5">
                                        <h4 className="font-semibold text-[#172B4D] leading-snug">{a.title}</h4>
                                        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">{a.message}</p>
                                        <span className="text-[11px] text-[#64748B] block pt-0.5">{formatDateTime(a.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* WIDGET 3: SERVICE CENTER OFFICE */}
                    <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#DCE4F0] shadow-[0_1px_6px_rgba(16,33,63,0.04)] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E8EEF7] pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[#172B4D]">Service Center Office</h3>
                                    <span className="text-[11px] text-[#15803D] font-medium">DTI Accredited</span>
                                </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EAF2FF] text-[#2563EB] border border-[#C7DDFD]">
                                Official Center
                            </span>
                        </div>

                        {/* Physical Address */}
                        <div className="ct-service-card p-3.5 rounded-lg bg-[#FAFCFF] border border-[#DCE6F5] text-xs">
                            <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="font-semibold text-[#172B4D] block text-xs">Main Office & Facility</span>
                                    <p className="text-xs text-[#64748B] leading-relaxed mt-0.5">
                                        {COMPANY_DETAILS.address}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Organized Contact Details */}
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handleCopy(COMPANY_DETAILS.mobile, "mobile-widget")}
                                className="ct-service-card w-full py-2.5 px-3 rounded-lg bg-[#FAFCFF] hover:bg-[#EAF2FF] text-[#172B4D] border border-[#DCE6F5] hover:border-[#93B8F5] text-xs font-medium transition-colors flex items-center justify-between cursor-pointer"
                                title="Click to copy Mobile Hotline"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-md bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.phone} />
                                        </svg>
                                    </span>
                                    <span className="font-semibold text-[#172B4D]">Mobile Hotline</span>
                                </div>
                                <span className="font-semibold font-mono text-xs text-[#2563EB]">
                                    {copiedKey === "mobile-widget" ? "✓ Copied" : COMPANY_DETAILS.mobile}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleCopy(COMPANY_DETAILS.telephone, "telephone-widget")}
                                className="ct-service-card w-full py-2.5 px-3 rounded-lg bg-[#FAFCFF] hover:bg-[#EAF2FF] text-[#172B4D] border border-[#DCE6F5] hover:border-[#93B8F5] text-xs font-medium transition-colors flex items-center justify-between cursor-pointer"
                                title="Click to copy Office Telephone"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-md bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.phone} />
                                        </svg>
                                    </span>
                                    <span className="font-semibold text-[#172B4D]">Office Telephone</span>
                                </div>
                                <span className="font-semibold font-mono text-xs text-[#172B4D]">
                                    {copiedKey === "telephone-widget" ? "✓ Copied" : COMPANY_DETAILS.telephone}
                                </span>
                            </button>

                            <a
                                href={COMPANY_DETAILS.facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ct-service-card w-full py-2.5 px-3 rounded-lg bg-[#FAFCFF] hover:bg-[#EAF2FF] text-[#172B4D] border border-[#DCE6F5] hover:border-[#93B8F5] text-xs font-medium transition-colors flex items-center justify-between group"
                                title="Open Facebook Page"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-md bg-[#EAF2FF] border border-[#D4E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                    </span>
                                    <span className="font-semibold text-[#172B4D]">Facebook Page</span>
                                </div>
                                <span className="font-semibold text-xs text-[#2563EB] group-hover:underline truncate max-w-[155px]">
                                    {COMPANY_DETAILS.facebook}
                                </span>
                            </a>
                        </div>

                        {/* Accredited Brands Footer */}
                        <div className="pt-2.5 border-t border-[#E2E8F0] text-[11px] text-[#64748B] leading-relaxed">
                            <span className="font-semibold text-[#172B4D] block mb-0.5">Accredited Dealer, Installer & Service Center:</span>
                            <span>Panasonic • Daikin • Carrier • Condura • Kelvinator • Gree • Midea</span>
                        </div>
                    </div>
                </div>
            </div>

            {outsideZamboangaAlertOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10213F]/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-[#E2E8F0] p-6 space-y-5 text-center">
                        <div className="w-14 h-14 rounded-xl bg-[#FEF2F2] text-[#DC2626] mx-auto flex items-center justify-center border border-[#FECACA]">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[11px] font-semibold uppercase tracking-wide">
                                Geospatial Boundary Alert
                            </span>
                            <h3 className="text-lg font-bold text-[#172B4D]">
                                This Booking Is Available Within Zamboanga City Only
                            </h3>
                            <p className="text-xs text-[#64748B] leading-relaxed">
                                Our automated forward-geocoding service detected that your registered address (<strong className="text-[#172B4D]">{user?.address || "Outside Location"}</strong>) is <strong>not within Zamboanga City</strong>.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={async () => {
                                    setOutsideZamboangaAlertOpen(false);
                                    await persistGeospatialAlertAcknowledgment(dashboardData?.user);
                                }}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#172B4D] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                            >
                                Close Alert
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setOutsideZamboangaAlertOpen(false);
                                    await persistGeospatialAlertAcknowledgment(dashboardData?.user);
                                    onNavigate("book");
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                                I Understand &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
