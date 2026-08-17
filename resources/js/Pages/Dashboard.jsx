import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import logo from "../../imports/cooling_tower_airconditioning_services_logo-1.jpg";
const Icon = ({ d, size = 18 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {" "}
        <path d={d} />{" "}
    </svg>
);
const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    clients:
        "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    employees:
        "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    inventory:
        "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    documents:
        "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    reports: "M18 20V10 M12 20V4 M6 20v-6",
    notifications:
        "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
    activity: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    settings:
        "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
    trend_up: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
    trend_down: "M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6",
    plus: "M12 5v14M5 12h14",
    user_plus:
        "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M20 8v6M23 11h-6",
    wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    megaphone: "M3 11l19-9-9 19-2-8-8-2z",
    check_circle: "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash: "M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
    thermometer: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    package:
        "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 001 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
    tool: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
};
const monthlyBookings = [
    { month: "Jan", bookings: 142, revenue: 284e3 },
    { month: "Feb", bookings: 168, revenue: 336e3 },
    { month: "Mar", bookings: 195, revenue: 39e4 },
    { month: "Apr", bookings: 210, revenue: 42e4 },
    { month: "May", bookings: 187, revenue: 374e3 },
    { month: "Jun", bookings: 232, revenue: 464e3 },
    { month: "Jul", bookings: 258, revenue: 516e3 },
];
const statusData = [
    { name: "Completed", value: 58, color: "#22C55E" },
    { name: "Pending", value: 22, color: "#F58A07" },
    { name: "Approved", value: 14, color: "#3F7DFF" },
    { name: "Cancelled", value: 6, color: "#EF4444" },
];
const techPerf = [
    { name: "Rico M.", jobs: 47, rating: 4.9 },
    { name: "Mark S.", jobs: 42, rating: 4.8 },
    { name: "Jay L.", jobs: 38, rating: 4.7 },
    { name: "Ben A.", jobs: 35, rating: 4.6 },
    { name: "Carl T.", jobs: 29, rating: 4.5 },
];
const invUsage = [
    { month: "Apr", units: 12, parts: 45, materials: 30 },
    { month: "May", units: 15, parts: 52, materials: 38 },
    { month: "Jun", units: 10, parts: 48, materials: 42 },
    { month: "Jul", units: 18, parts: 61, materials: 55 },
];
const recentBookings = [
    {
        id: "BK-2026-0781",
        customer: "Maria Santos",
        service: "AC Installation",
        address: "42 Sampaguita St, QC",
        technician: "Rico Mendoza",
        date: "Jul 30, 2026",
        status: "Pending",
    },
    {
        id: "BK-2026-0780",
        customer: "Jose Reyes",
        service: "Prev. Maintenance",
        address: "18 Rizal Ave, Makati",
        technician: "Mark Santiago",
        date: "Jul 30, 2026",
        status: "Approved",
    },
    {
        id: "BK-2026-0779",
        customer: "Ana Cruz",
        service: "Aircon Cleaning",
        address: "7 Mabini St, Pasig",
        technician: "Jay Lim",
        date: "Jul 29, 2026",
        status: "Completed",
    },
    {
        id: "BK-2026-0778",
        customer: "Ramon dela Torre",
        service: "Refrigerant Refill",
        address: "89 Bonifacio Dr, Mandaluyong",
        technician: "Ben Aguilar",
        date: "Jul 29, 2026",
        status: "Completed",
    },
    {
        id: "BK-2026-0777",
        customer: "Liza Ocampo",
        service: "Repair & Diagnostic",
        address: "3 Magsaysay Blvd, Taguig",
        technician: "Carl Torres",
        date: "Jul 28, 2026",
        status: "Cancelled",
    },
    {
        id: "BK-2026-0776",
        customer: "Roberto Tan",
        service: "AC Installation",
        address: "55 Aurora Blvd, San Juan",
        technician: "Rico Mendoza",
        date: "Jul 28, 2026",
        status: "Completed",
    },
    {
        id: "BK-2026-0775",
        customer: "Grace Villanueva",
        service: "Prev. Maintenance",
        address: "21 Katipunan Ave, QC",
        technician: "Mark Santiago",
        date: "Jul 27, 2026",
        status: "Approved",
    },
];
const employees = [
    {
        id: 1,
        name: "Marco Reyes",
        position: "Operations Manager",
        status: "Active",
        avatar: "MR",
        color: "#3F7DFF",
    },
    {
        id: 2,
        name: "Carla Bautista",
        position: "Scheduler",
        status: "Active",
        avatar: "CB",
        color: "#22C55E",
    },
    {
        id: 3,
        name: "Daniel Flores",
        position: "Billing Officer",
        status: "On Leave",
        avatar: "DF",
        color: "#F58A07",
    },
    {
        id: 4,
        name: "Sofia Aquino",
        position: "Customer Service",
        status: "Active",
        avatar: "SA",
        color: "#59B7FF",
    },
];
const notifications = [
    {
        id: 1,
        icon: ic.check_circle,
        title: "Booking Approved",
        desc: "BK-2026-0780 approved for Jose Reyes",
        time: "2 min ago",
        color: "#22C55E",
    },
    {
        id: 2,
        icon: ic.plus,
        title: "New Booking Received",
        desc: "Maria Santos submitted BK-2026-0781",
        time: "15 min ago",
        color: "#3F7DFF",
    },
    {
        id: 3,
        icon: ic.alert,
        title: "Low Inventory Alert",
        desc: "Refrigerant R-410A below 20% stock",
        time: "1 hr ago",
        color: "#F58A07",
    },
    {
        id: 4,
        icon: ic.wrench,
        title: "Technician Assigned",
        desc: "Rico Mendoza assigned to BK-2026-0781",
        time: "2 hr ago",
        color: "#59B7FF",
    },
    {
        id: 5,
        icon: ic.megaphone,
        title: "Team Announcement",
        desc: "Safety briefing scheduled Aug 2, 9AM",
        time: "3 hr ago",
        color: "#8B5CF6",
    },
];
const timeline = [
    {
        user: "Maria Santos",
        activity: "Submitted a new booking request",
        date: "Jul 30, 2026",
        time: "09:14 AM",
        avatar: "MS",
        color: "#3F7DFF",
    },
    {
        user: "Marco Reyes",
        activity: "Approved booking BK-2026-0780",
        date: "Jul 30, 2026",
        time: "08:52 AM",
        avatar: "MR",
        color: "#22C55E",
    },
    {
        user: "Rico Mendoza",
        activity: "Completed service for Ana Cruz",
        date: "Jul 29, 2026",
        time: "05:30 PM",
        avatar: "RM",
        color: "#59B7FF",
    },
    {
        user: "Carla Bautista",
        activity: "Generated July sales report",
        date: "Jul 29, 2026",
        time: "03:15 PM",
        avatar: "CB",
        color: "#F58A07",
    },
    {
        user: "System",
        activity: "Low inventory alert triggered \u2014 R-410A",
        date: "Jul 29, 2026",
        time: "02:00 PM",
        avatar: "SY",
        color: "#EF4444",
    },
    {
        user: "Jay Lim",
        activity: "Completed aircon cleaning \u2014 Pasig unit",
        date: "Jul 29, 2026",
        time: "11:45 AM",
        avatar: "JL",
        color: "#8B5CF6",
    },
];
const card = {
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.06)",
    padding: "18px 20px",
};
function SectionHead({ title, action }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
            }}
        >
            {" "}
            <h2
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1E2F5F",
                    margin: 0,
                }}
            >
                {title}
            </h2>{" "}
            {action && (
                <button
                    style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#3F7DFF",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                    }}
                >
                    {" "}
                    {action} →{" "}
                </button>
            )}{" "}
        </div>
    );
}
function StatCard({ label, value, sub, icon, accent, trend, trendVal }) {
    return (
        <div
            style={{
                ...card,
                padding: 16,
                position: "relative",
                overflow: "hidden",
            }}
        >
            {" "}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 88,
                    height: 88,
                    borderRadius: "0 0 0 100%",
                    background: accent,
                    opacity: 0.06,
                }}
            />{" "}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 10,
                }}
            >
                {" "}
                <div
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${accent}1A`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: accent,
                    }}
                >
                    {" "}
                    <Icon d={icon} size={17} />{" "}
                </div>{" "}
                {trend && trendVal && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: 8,
                            background: trend === "up" ? "#F0FDF4" : "#FEF2F2",
                            color: trend === "up" ? "#16A34A" : "#DC2626",
                        }}
                    >
                        {" "}
                        <Icon
                            d={trend === "up" ? ic.trend_up : ic.trend_down}
                            size={10}
                        />{" "}
                        {trendVal}{" "}
                    </div>
                )}{" "}
            </div>{" "}
            <p
                style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1E2F5F",
                    margin: 0,
                    lineHeight: 1.1,
                }}
            >
                {value}
            </p>{" "}
            <p
                style={{
                    fontSize: 12,
                    color: "#6B7280",
                    fontWeight: 500,
                    margin: "3px 0 0",
                }}
            >
                {label}
            </p>{" "}
            {sub && (
                <p
                    style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        margin: "2px 0 0",
                    }}
                >
                    {sub}
                </p>
            )}{" "}
        </div>
    );
}
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid #F0F2F5",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                padding: "10px 14px",
                fontSize: 12,
            }}
        >
            {" "}
            <p style={{ fontWeight: 600, color: "#1E2F5F", marginBottom: 6 }}>
                {label}
            </p>{" "}
            {payload.map((p, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                    }}
                >
                    {" "}
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: p.color || p.fill,
                            display: "inline-block",
                        }}
                    />{" "}
                    <span style={{ color: "#6B7280" }}>{p.name}:</span>{" "}
                    <span style={{ fontWeight: 600, color: "#1E2F5F" }}>
                        {" "}
                        {p.name === "revenue"
                            ? `\u20B1${(Number(p.value) / 1e3).toFixed(0)}K`
                            : p.value}{" "}
                    </span>{" "}
                </div>
            ))}{" "}
        </div>
    );
}
const statusCfg = {
    Pending: { bg: "rgba(245,138,7,0.12)", text: "#D97706", dot: "#F58A07" },
    Approved: { bg: "rgba(63,125,255,0.12)", text: "#2563EB", dot: "#3F7DFF" },
    Completed: { bg: "rgba(34,197,94,0.12)", text: "#16A34A", dot: "#22C55E" },
    Cancelled: { bg: "rgba(239,68,68,0.12)", text: "#DC2626", dot: "#EF4444" },
};
function InventoryBar({ label, total, used, unit, icon, color }) {
    const pct = Math.round((used / total) * 100);
    const barColor = pct > 75 ? "#EF4444" : pct > 50 ? "#F58A07" : "#22C55E";
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
            }}
        >
            {" "}
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color,
                    flexShrink: 0,
                }}
            >
                {" "}
                <Icon d={icon} size={14} />{" "}
            </div>{" "}
            <div style={{ flex: 1, minWidth: 0 }}>
                {" "}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                    }}
                >
                    {" "}
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1E2F5F",
                        }}
                    >
                        {label}
                    </span>{" "}
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: barColor,
                            marginLeft: 8,
                        }}
                    >
                        {pct}%
                    </span>{" "}
                </div>{" "}
                <div
                    style={{
                        height: 6,
                        background: "#F0F2F5",
                        borderRadius: 99,
                        overflow: "hidden",
                    }}
                >
                    {" "}
                    <div
                        style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: barColor,
                            borderRadius: 99,
                        }}
                    />{" "}
                </div>{" "}
                <p
                    style={{
                        fontSize: 10,
                        color: "#9CA3AF",
                        margin: "2px 0 0",
                    }}
                >
                    {used}/{total} {unit}
                </p>{" "}
            </div>{" "}
        </div>
    );
}
function Dashboard({ onNavigate, addToast }) {
    const gap = 16;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap }}>
            {" "}
            {/* Page header */}{" "}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                {" "}
                <div>
                    {" "}
                    <h1
                        style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            margin: 0,
                        }}
                    >
                        Dashboard Overview
                    </h1>{" "}
                    <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
                        Welcome back, Super Admin. Here"s what"s happening
                        today.
                    </p>{" "}
                </div>{" "}
                <div style={{ display: "flex", gap: 8 }}>
                    {" "}
                    <button
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            background: "#fff",
                            border: "1px solid #E5E7EB",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#6B7280",
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        {" "}
                        <Icon d={ic.download} size={13} /> Export{" "}
                    </button>{" "}
                    <button
                        onClick={() => onNavigate("bookings")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            background:
                                "linear-gradient(135deg,#3F7DFF,#1E2F5F)",
                            border: "none",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#fff",
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        {" "}
                        <Icon d={ic.plus} size={13} /> New Booking{" "}
                    </button>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── Stat Cards ── */}{" "}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                    gap,
                }}
            >
                {" "}
                <StatCard
                    label="Total Bookings"
                    value="1,284"
                    icon={ic.bookings}
                    accent="#3F7DFF"
                    trend="up"
                    trendVal="+12.4%"
                    sub="All time"
                />{" "}
                <StatCard
                    label="Pending Bookings"
                    value="47"
                    icon={ic.alert}
                    accent="#F58A07"
                    trend="up"
                    trendVal="+8"
                    sub="Needs action"
                />{" "}
                <StatCard
                    label="Completed Services"
                    value="891"
                    icon={ic.check_circle}
                    accent="#22C55E"
                    trend="up"
                    trendVal="+5.2%"
                    sub="This year"
                />{" "}
                <StatCard
                    label="Cancelled"
                    value="38"
                    icon={ic.trash}
                    accent="#EF4444"
                    trend="down"
                    trendVal="-2.1%"
                    sub="This year"
                />{" "}
                <StatCard
                    label="Total Clients"
                    value="326"
                    icon={ic.clients}
                    accent="#8B5CF6"
                    trend="up"
                    trendVal="+18"
                    sub="Registered"
                />{" "}
                <StatCard
                    label="Total Employees"
                    value="24"
                    icon={ic.employees}
                    accent="#3F7DFF"
                    sub="Active staff"
                />{" "}
                <StatCard
                    label="Available AC Units"
                    value="142"
                    icon={ic.thermometer}
                    accent="#59B7FF"
                    trend="up"
                    trendVal="+6"
                    sub="In inventory"
                />{" "}
                <StatCard
                    label="Inventory Status"
                    value="74%"
                    icon={ic.box}
                    accent="#F58A07"
                    sub="Overall stock"
                />{" "}
                <StatCard
                    label="Monthly Revenue"
                    value="₱516K"
                    icon={ic.dollar}
                    accent="#22C55E"
                    trend="up"
                    trendVal="+11.2%"
                    sub="July 2026"
                />{" "}
            </div>{" "}
            {/* ── Charts Row: Area + Pie ── */}{" "}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap,
                    minWidth: 0,
                }}
            >
                {" "}
                <div style={card}>
                    {" "}
                    <SectionHead
                        title="Monthly Bookings & Revenue"
                        action="Full Report"
                    />{" "}
                    <ResponsiveContainer width="100%" height={200}>
                        {" "}
                        <AreaChart
                            data={monthlyBookings}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                        >
                            {" "}
                            <defs>
                                {" "}
                                <linearGradient
                                    id="bookGrad"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    {" "}
                                    <stop
                                        offset="5%"
                                        stopColor="#3F7DFF"
                                        stopOpacity={0.2}
                                    />{" "}
                                    <stop
                                        offset="95%"
                                        stopColor="#3F7DFF"
                                        stopOpacity={0}
                                    />{" "}
                                </linearGradient>{" "}
                                <linearGradient
                                    id="revGrad"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    {" "}
                                    <stop
                                        offset="5%"
                                        stopColor="#F58A07"
                                        stopOpacity={0.2}
                                    />{" "}
                                    <stop
                                        offset="95%"
                                        stopColor="#F58A07"
                                        stopOpacity={0}
                                    />{" "}
                                </linearGradient>{" "}
                            </defs>{" "}
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#F0F2F5"
                            />{" "}
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                            />{" "}
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                            />{" "}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) =>
                                    `\u20B1${Number(v) / 1e3}K`
                                }
                            />{" "}
                            <Tooltip content={<ChartTooltip />} />{" "}
                            <Legend
                                iconType="circle"
                                iconSize={7}
                                wrapperStyle={{ fontSize: 10 }}
                            />{" "}
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="bookings"
                                stroke="#3F7DFF"
                                strokeWidth={2}
                                fill="url(#bookGrad)"
                                name="bookings"
                                dot={false}
                            />{" "}
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="revenue"
                                stroke="#F58A07"
                                strokeWidth={2}
                                fill="url(#revGrad)"
                                name="revenue"
                                dot={false}
                            />{" "}
                        </AreaChart>{" "}
                    </ResponsiveContainer>{" "}
                </div>{" "}
                <div style={card}>
                    {" "}
                    <SectionHead title="Booking Status" />{" "}
                    <ResponsiveContainer width="100%" height={150}>
                        {" "}
                        <PieChart>
                            {" "}
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={62}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {" "}
                                {statusData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}{" "}
                            </Pie>{" "}
                            <Tooltip formatter={(val) => `${val}%`} />{" "}
                        </PieChart>{" "}
                    </ResponsiveContainer>{" "}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "6px 16px",
                            marginTop: 8,
                        }}
                    >
                        {" "}
                        {statusData.map((s) => (
                            <div
                                key={s.name}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                {" "}
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: s.color,
                                        flexShrink: 0,
                                    }}
                                />{" "}
                                <span
                                    style={{
                                        fontSize: 11,
                                        color: "#6B7280",
                                        flex: 1,
                                    }}
                                >
                                    {s.name}
                                </span>{" "}
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: "#1E2F5F",
                                    }}
                                >
                                    {s.value}%
                                </span>{" "}
                            </div>
                        ))}{" "}
                    </div>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── Technician + Inventory Charts ── */}{" "}
            <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}
            >
                {" "}
                <div style={card}>
                    {" "}
                    <SectionHead
                        title="Technician Performance"
                        action="View All"
                    />{" "}
                    <ResponsiveContainer width="100%" height={170}>
                        {" "}
                        <BarChart
                            data={techPerf}
                            layout="vertical"
                            margin={{ left: 0, right: 16 }}
                        >
                            {" "}
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="#F0F2F5"
                            />{" "}
                            <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                            />{" "}
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={52}
                                tick={{ fontSize: 10, fill: "#6B7280" }}
                                axisLine={false}
                                tickLine={false}
                            />{" "}
                            <Tooltip content={<ChartTooltip />} />{" "}
                            <Bar
                                dataKey="jobs"
                                fill="#3F7DFF"
                                radius={[0, 6, 6, 0]}
                                name="Jobs Completed"
                            />{" "}
                        </BarChart>{" "}
                    </ResponsiveContainer>{" "}
                </div>{" "}
                <div style={card}>
                    {" "}
                    <SectionHead title="Inventory Usage Trend" />{" "}
                    <ResponsiveContainer width="100%" height={170}>
                        {" "}
                        <LineChart
                            data={invUsage}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                        >
                            {" "}
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#F0F2F5"
                            />{" "}
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                            />{" "}
                            <YAxis
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                            />{" "}
                            <Tooltip content={<ChartTooltip />} />{" "}
                            <Legend
                                iconType="circle"
                                iconSize={7}
                                wrapperStyle={{ fontSize: 10 }}
                            />{" "}
                            <Line
                                type="monotone"
                                dataKey="units"
                                stroke="#59B7FF"
                                strokeWidth={2}
                                dot={false}
                                name="AC Units"
                            />{" "}
                            <Line
                                type="monotone"
                                dataKey="parts"
                                stroke="#3F7DFF"
                                strokeWidth={2}
                                dot={false}
                                name="Spare Parts"
                            />{" "}
                            <Line
                                type="monotone"
                                dataKey="materials"
                                stroke="#F58A07"
                                strokeWidth={2}
                                dot={false}
                                name="Materials"
                            />{" "}
                        </LineChart>{" "}
                    </ResponsiveContainer>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── Recent Bookings Table ── */}{" "}
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                {" "}
                <div
                    style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #F5F7FA",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    {" "}
                    <h2
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1E2F5F",
                            margin: 0,
                        }}
                    >
                        Recent Bookings
                    </h2>{" "}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        {" "}
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                            Showing 7 of 1,284
                        </span>{" "}
                        <button
                            onClick={() => onNavigate("bookings")}
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#3F7DFF",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            View All →
                        </button>{" "}
                    </div>{" "}
                </div>{" "}
                <div style={{ overflowX: "auto" }}>
                    {" "}
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: 700,
                        }}
                    >
                        {" "}
                        <thead>
                            {" "}
                            <tr style={{ background: "#F5F7FA" }}>
                                {" "}
                                {[
                                    "Booking ID",
                                    "Customer",
                                    "Service",
                                    "Address",
                                    "Technician",
                                    "Date",
                                    "Status",
                                    "Actions",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "10px 14px",
                                            textAlign: "left",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: "#6B7280",
                                            letterSpacing: "0.04em",
                                            textTransform: "uppercase",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}{" "}
                            </tr>{" "}
                        </thead>{" "}
                        <tbody>
                            {" "}
                            {recentBookings.map((b, i) => {
                                const sc = statusCfg[b.status];
                                return (
                                    <tr
                                        key={b.id}
                                        style={{
                                            borderTop: "1px solid #F5F7FA",
                                            background:
                                                i % 2 !== 0
                                                    ? "rgba(245,247,250,0.4)"
                                                    : "#fff",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background =
                                                "rgba(63,125,255,0.04)")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background =
                                                i % 2 !== 0
                                                    ? "rgba(245,247,250,0.4)"
                                                    : "#fff")
                                        }
                                    >
                                        {" "}
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "#3F7DFF",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.id}
                                        </td>{" "}
                                        <td style={{ padding: "10px 14px" }}>
                                            {" "}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                {" "}
                                                <div
                                                    style={{
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: 7,
                                                        background:
                                                            "linear-gradient(135deg,#3F7DFF,#1E2F5F)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        color: "#fff",
                                                        fontSize: 9,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {" "}
                                                    {b.customer
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")
                                                        .slice(0, 2)}{" "}
                                                </div>{" "}
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        color: "#1E2F5F",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {b.customer}
                                                </span>{" "}
                                            </div>{" "}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.service}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                                maxWidth: 140,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.address}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.technician}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.date}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {" "}
                                            <span
                                                style={{
                                                    background: sc.bg,
                                                    color: sc.text,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 5,
                                                    padding: "4px 10px",
                                                    borderRadius: 99,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {" "}
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: "50%",
                                                        background: sc.dot,
                                                    }}
                                                />{" "}
                                                {b.status}{" "}
                                            </span>{" "}
                                        </td>{" "}
                                        <td style={{ padding: "10px 14px" }}>
                                            {" "}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 4,
                                                }}
                                            >
                                                {" "}
                                                {[
                                                    {
                                                        d: ic.eye,
                                                        hover: "#3F7DFF",
                                                    },
                                                    {
                                                        d: ic.edit,
                                                        hover: "#F58A07",
                                                    },
                                                    {
                                                        d: ic.trash,
                                                        hover: "#EF4444",
                                                    },
                                                ].map((btn, j) => (
                                                    <button
                                                        key={j}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            border: "none",
                                                            background:
                                                                "transparent",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            color: "#D1D5DB",
                                                            cursor: "pointer",
                                                            transition:
                                                                "all 0.15s",
                                                            fontFamily:
                                                                "inherit",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.color =
                                                                btn.hover;
                                                            e.currentTarget.style.background = `${btn.hover}12`;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.color =
                                                                "#D1D5DB";
                                                            e.currentTarget.style.background =
                                                                "transparent";
                                                        }}
                                                    >
                                                        {" "}
                                                        <Icon
                                                            d={btn.d}
                                                            size={13}
                                                        />{" "}
                                                    </button>
                                                ))}{" "}
                                            </div>{" "}
                                        </td>{" "}
                                    </tr>
                                );
                            })}{" "}
                        </tbody>{" "}
                    </table>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── Quick Actions + Inventory + Notifications ── */}{" "}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap,
                }}
            >
                {" "}
                {/* Quick Actions */}{" "}
                <div style={card}>
                    {" "}
                    <SectionHead title="Quick Actions" />{" "}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4,1fr)",
                            gap: 8,
                        }}
                    >
                        {" "}
                        {[
                            {
                                icon: ic.plus,
                                label: "Add Booking",
                                color: "#3F7DFF",
                                bg: "#EFF4FF",
                                page: "bookings",
                            },
                            {
                                icon: ic.user_plus,
                                label: "Add Employee",
                                color: "#22C55E",
                                bg: "#F0FDF4",
                                page: "staff",
                            },
                            {
                                icon: ic.wrench,
                                label: "Add Tech.",
                                color: "#59B7FF",
                                bg: "#EFF9FF",
                                page: "staff",
                            },
                            {
                                icon: ic.box,
                                label: "Inventory",
                                color: "#F58A07",
                                bg: "#FFF7ED",
                                page: "materials",
                            },
                            {
                                icon: ic.reports,
                                label: "Gen. Report",
                                color: "#8B5CF6",
                                bg: "#F5F3FF",
                                page: "sales",
                            },
                            {
                                icon: ic.megaphone,
                                label: "Announce",
                                color: "#EC4899",
                                bg: "#FDF2F8",
                                page: "announcements",
                            },
                            {
                                icon: ic.download,
                                label: "Export Data",
                                color: "#1E2F5F",
                                bg: "#EFF2FA",
                                page: "sales",
                            },
                        ].map((a) => (
                            <button
                                key={a.label}
                                onClick={() => onNavigate(a.page)}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "10px 4px",
                                    borderRadius: 14,
                                    border: "1px solid #F0F2F5",
                                    background: "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = a.bg;
                                    e.currentTarget.style.boxShadow =
                                        "0 4px 12px rgba(0,0,0,0.08)";
                                    e.currentTarget.style.borderColor =
                                        "transparent";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fff";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.borderColor =
                                        "#F0F2F5";
                                }}
                            >
                                {" "}
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: `${a.color}18`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: a.color,
                                    }}
                                >
                                    {" "}
                                    <Icon d={a.icon} size={16} />{" "}
                                </div>{" "}
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: "#1E2F5F",
                                        textAlign: "center",
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {a.label}
                                </span>{" "}
                            </button>
                        ))}{" "}
                    </div>{" "}
                </div>{" "}
                {/* Inventory Overview */}{" "}
                <div style={card}>
                    {" "}
                    <SectionHead
                        title="Inventory Overview"
                        action="Manage"
                    />{" "}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0,
                        }}
                    >
                        {" "}
                        <InventoryBar
                            label="AC Units"
                            total={200}
                            used={58}
                            unit="units"
                            icon={ic.thermometer}
                            color="#3F7DFF"
                        />{" "}
                        <InventoryBar
                            label="Spare Parts"
                            total={500}
                            used={312}
                            unit="pcs"
                            icon={ic.layers}
                            color="#F58A07"
                        />{" "}
                        <InventoryBar
                            label="Materials"
                            total={300}
                            used={195}
                            unit="sets"
                            icon={ic.package}
                            color="#59B7FF"
                        />{" "}
                        <InventoryBar
                            label="Tools & Equipment"
                            total={80}
                            used={52}
                            unit="items"
                            icon={ic.tool}
                            color="#8B5CF6"
                        />{" "}
                    </div>{" "}
                </div>{" "}
                {/* Notifications */}{" "}
                <div style={card}>
                    {" "}
                    <SectionHead title="Notifications" action="View All" />{" "}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {" "}
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 10,
                                    padding: "8px",
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                        "#F5F7FA")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                        "transparent")
                                }
                            >
                                {" "}
                                <div
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 10,
                                        background: `${n.color}15`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: n.color,
                                        flexShrink: 0,
                                    }}
                                >
                                    {" "}
                                    <Icon d={n.icon} size={13} />{" "}
                                </div>{" "}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {" "}
                                    <p
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#1E2F5F",
                                            margin: 0,
                                        }}
                                    >
                                        {n.title}
                                    </p>{" "}
                                    <p
                                        style={{
                                            fontSize: 11,
                                            color: "#9CA3AF",
                                            margin: "2px 0 0",
                                            lineHeight: 1.3,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {n.desc}
                                    </p>{" "}
                                    <p
                                        style={{
                                            fontSize: 10,
                                            color: "#D1D5DB",
                                            margin: "2px 0 0",
                                        }}
                                    >
                                        {n.time}
                                    </p>{" "}
                                </div>{" "}
                            </div>
                        ))}{" "}
                    </div>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── Employees + Timeline ── */}{" "}
            <div
                style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap }}
            >
                {" "}
                <div style={card}>
                    {" "}
                    <SectionHead
                        title="Employee Overview"
                        action="View All"
                    />{" "}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                            marginBottom: 16,
                        }}
                    >
                        {" "}
                        {employees.map((emp) => (
                            <div
                                key={emp.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    background: "#F5F7FA",
                                    transition: "background 0.15s",
                                    cursor: "default",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                        "rgba(63,125,255,0.07)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                        "#F5F7FA")
                                }
                            >
                                {" "}
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 10,
                                        background: emp.color,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#fff",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                >
                                    {" "}
                                    {emp.avatar}{" "}
                                </div>{" "}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {" "}
                                    <p
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#1E2F5F",
                                            margin: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {emp.name}
                                    </p>{" "}
                                    <p
                                        style={{
                                            fontSize: 11,
                                            color: "#9CA3AF",
                                            margin: "1px 0 0",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {emp.position}
                                    </p>{" "}
                                </div>{" "}
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        padding: "3px 8px",
                                        borderRadius: 99,
                                        flexShrink: 0,
                                        background:
                                            emp.status === "Active"
                                                ? "#F0FDF4"
                                                : "#FFFBEB",
                                        color:
                                            emp.status === "Active"
                                                ? "#16A34A"
                                                : "#D97706",
                                    }}
                                >
                                    {" "}
                                    {emp.status}{" "}
                                </span>{" "}
                            </div>
                        ))}{" "}
                    </div>{" "}
                    <div
                        style={{
                            paddingTop: 14,
                            borderTop: "1px solid #F5F7FA",
                        }}
                    >
                        {" "}
                        <p
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#1E2F5F",
                                marginBottom: 12,
                            }}
                        >
                            Top Technicians This Month
                        </p>{" "}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                            }}
                        >
                            {" "}
                            {techPerf.slice(0, 3).map((t, i) => (
                                <div
                                    key={t.name}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                    }}
                                >
                                    {" "}
                                    <span
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 6,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 10,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                            background: [
                                                "#F58A0722",
                                                "#9CA3AF22",
                                                "#CD7F3222",
                                            ][i],
                                            color: [
                                                "#D97706",
                                                "#6B7280",
                                                "#92400E",
                                            ][i],
                                        }}
                                    >
                                        {" "}
                                        {i + 1}{" "}
                                    </span>{" "}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {" "}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {" "}
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    color: "#1E2F5F",
                                                }}
                                            >
                                                {t.name}
                                            </span>{" "}
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    color: "#9CA3AF",
                                                }}
                                            >
                                                {t.jobs} jobs · ⭐ {t.rating}
                                            </span>{" "}
                                        </div>{" "}
                                        <div
                                            style={{
                                                height: 6,
                                                background: "#F0F2F5",
                                                borderRadius: 99,
                                                overflow: "hidden",
                                            }}
                                        >
                                            {" "}
                                            <div
                                                style={{
                                                    height: "100%",
                                                    width: `${(t.jobs / 50) * 100}%`,
                                                    background:
                                                        "linear-gradient(90deg,#3F7DFF,#59B7FF)",
                                                    borderRadius: 99,
                                                }}
                                            />{" "}
                                        </div>{" "}
                                    </div>{" "}
                                </div>
                            ))}{" "}
                        </div>{" "}
                    </div>{" "}
                </div>{" "}
                {/* Activity Timeline */}{" "}
                <div style={card}>
                    {" "}
                    <SectionHead
                        title="Activity Timeline"
                        action="View Logs"
                    />{" "}
                    <div style={{ position: "relative" }}>
                        {" "}
                        <div
                            style={{
                                position: "absolute",
                                left: 15,
                                top: 0,
                                bottom: 0,
                                width: 1,
                                background: "#F0F2F5",
                            }}
                        />{" "}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 14,
                            }}
                        >
                            {" "}
                            {timeline.map((t, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        gap: 10,
                                        position: "relative",
                                    }}
                                >
                                    {" "}
                                    <div
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 10,
                                            background: t.color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#fff",
                                            fontSize: 9,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                            zIndex: 1,
                                            boxShadow: "0 0 0 2px #fff",
                                        }}
                                    >
                                        {" "}
                                        {t.avatar}{" "}
                                    </div>{" "}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {" "}
                                        <p
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "#1E2F5F",
                                                margin: 0,
                                            }}
                                        >
                                            {t.user}
                                        </p>{" "}
                                        <p
                                            style={{
                                                fontSize: 11,
                                                color: "#9CA3AF",
                                                margin: "2px 0 0",
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {t.activity}
                                        </p>{" "}
                                        <p
                                            style={{
                                                fontSize: 10,
                                                color: "#D1D5DB",
                                                margin: "2px 0 0",
                                            }}
                                        >
                                            {t.date} · {t.time}
                                        </p>{" "}
                                    </div>{" "}
                                </div>
                            ))}{" "}
                        </div>{" "}
                    </div>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── CTA Banner ── */}{" "}
            <div
                style={{
                    position: "relative",
                    borderRadius: 18,
                    overflow: "hidden",
                    padding: "22px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    background:
                        "linear-gradient(135deg,#1E2F5F 0%,#3F7DFF 60%,#59B7FF 100%)",
                }}
            >
                {" "}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                            "radial-gradient(circle at 20% 50%,rgba(255,255,255,0.08) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(89,183,255,0.15) 0%,transparent 50%)",
                        pointerEvents: "none",
                    }}
                />{" "}
                <div style={{ position: "relative" }}>
                    {" "}
                    <p
                        style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 15,
                            margin: 0,
                        }}
                    >
                        Ready to generate your monthly report?
                    </p>{" "}
                    <p
                        style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: 12,
                            margin: "4px 0 0",
                        }}
                    >
                        July 2026 — 258 bookings · ₱516,000 revenue · 94%
                        satisfaction
                    </p>{" "}
                </div>{" "}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                        position: "relative",
                    }}
                >
                    {" "}
                    <button
                        style={{
                            padding: "9px 16px",
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: 10,
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        {" "}
                        View Analytics{" "}
                    </button>{" "}
                    <button
                        onClick={() => {
                            addToast(
                                "Sales report for July 2026 generated successfully!",
                                "success",
                            );
                            onNavigate("sales");
                        }}
                        style={{
                            padding: "9px 16px",
                            background: "#F58A07",
                            border: "none",
                            borderRadius: 10,
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            boxShadow: "0 4px 14px rgba(245,138,7,0.4)",
                        }}
                    >
                        {" "}
                        Generate Report{" "}
                    </button>{" "}
                </div>{" "}
            </div>{" "}
            {/* ── Footer ── */}{" "}
            <div
                style={{
                    textAlign: "center",
                    padding: "12px 0",
                    borderTop: "1px solid #F0F2F5",
                }}
            >
                {" "}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                    }}
                >
                    {" "}
                    <img
                        src={logo}
                        alt="Logo"
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            objectFit: "cover",
                            opacity: 0.5,
                        }}
                    />{" "}
                    <p style={{ fontSize: 12, color: "#D1D5DB", margin: 0 }}>
                        Cooling Tower Airconditioning Services © 2026. All
                        rights reserved.
                    </p>{" "}
                </div>{" "}
            </div>{" "}
        </div>
    );
}
export { Dashboard as default };
