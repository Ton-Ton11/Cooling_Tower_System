import {
    BarChart,
    Bar,
    CartesianGrid,
    LineChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import StatCard from "../../Components/StatCard";
import StatusBadge from "../../Components/StatusBadge";
import {
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

const icons = {
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    active: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    completed: "M5 13l4 4L19 7",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    arrow: "M5 12h14 M13 6l6 6-6 6",
};

export default function ManagerDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const stats = dashboardData?.stats ?? {};
    const pendingBookings = dashboardData?.pending_bookings ?? [];
    const weeklyRevenue = dashboardData?.weekly_revenue ?? [];
    const weekRevenueTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.revenue ?? 0),
        0,
    );
    const weekBookingTotal = weeklyRevenue.reduce(
        (sum, row) => sum + Number(row.bookings ?? 0),
        0,
    );

    const statCards = [
        {
            label: "Pending Bookings",
            value: stats.pending_bookings ?? 0,
            sub: "Awaiting approval or assignment",
            icon: icons.bookings,
            accent: "#F58A07",
        },
        {
            label: "Active Bookings",
            value: stats.active_bookings ?? 0,
            sub: "Approved or dispatched jobs",
            icon: icons.active,
            accent: "#3F7DFF",
        },
        {
            label: "Completed Bookings",
            value: stats.completed_bookings ?? 0,
            sub: "Successfully serviced bookings",
            icon: icons.completed,
            accent: "#22C55E",
        },
        {
            label: "Announcements",
            value: stats.announcements ?? 0,
            sub: "Published updates and bulletins",
            icon: icons.announcements,
            accent: "#8B5CF6",
        },
    ];

    const quickActions = [
        {
            label: "Review & Dispatch Bookings",
            description: "Approve pending requests and assign technicians.",
            page: "bookings",
        },
        {
            label: "View Performance Analytics",
            description: "Check weekly, monthly, and yearly technician completions.",
            page: "performance",
        },
        {
            label: "Post New Announcement",
            description: "Broadcast alerts and news to staff.",
            page: "announcements",
        },
    ];

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Manager Dashboard</h1>
                    <p className="page-subtitle">
                        Live booking operations, technician dispatching, and broadcast notifications
                    </p>
                </div>
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <span
                        style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            background: "#F5F7FA",
                            border: "1px solid #E5E7EB",
                            padding: "5px 12px",
                            borderRadius: 8,
                        }}
                    >
                        {stats.pending_bookings ?? 0} pending bookings
                    </span>
                    <button className="btn-secondary" onClick={onRefresh}>
                        Refresh Overview
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => onNavigate("bookings")}
                    >
                        Go to Bookings →
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
                {statCards.map((card, index) => (
                    <StatCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        sub={card.sub}
                        icon={card.icon}
                        accent={card.accent}
                        loading={isLoading}
                        index={index}
                    />
                ))}
            </div>

            {/* Quick Actions */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => onNavigate(action.page)}
                        className="card card-hover"
                        style={{
                            textAlign: "left",
                            padding: "16px 18px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            background: "#fff",
                            border: "1px solid #F0F2F5",
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                    margin: 0,
                                }}
                            >
                                {action.label}
                            </p>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    margin: "4px 0 0",
                                }}
                            >
                                {action.description}
                            </p>
                        </div>
                        <span
                            style={{
                                color: "#3F7DFF",
                                display: "inline-flex",
                                flexShrink: 0,
                            }}
                        >
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d={icons.arrow} />
                            </svg>
                        </span>
                    </button>
                ))}
            </div>

            {/* Main Content Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                    gap: 24,
                    marginBottom: 24,
                }}
            >
                {/* Pending Bookings */}
                <div className="card" style={{ padding: 20 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 16,
                        }}
                    >
                        <div>
                            <p className="section-label">Action Needed</p>
                            <h2
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                    margin: "2px 0 0",
                                }}
                            >
                                Pending Bookings
                            </h2>
                        </div>
                        <button
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: 12 }}
                            onClick={() => onNavigate("bookings")}
                        >
                            View All →
                        </button>
                    </div>

                    {pendingBookings.length === 0 ? (
                        <div
                            style={{
                                padding: 32,
                                textAlign: "center",
                                color: "#9CA3AF",
                                fontSize: 13,
                            }}
                        >
                            No pending bookings waiting for assignment.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {pendingBookings.map((b) => (
                                <div
                                    key={b.booking_id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "12px 14px",
                                        borderRadius: 10,
                                        background: "#F8FAFC",
                                        border: "1px solid #F0F2F5",
                                    }}
                                >
                                    <div>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                            #{b.booking_id} · {b.client_name}
                                        </p>
                                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
                                            {b.service} · {formatDateTime(b.scheduled_date)}
                                        </p>
                                    </div>
                                    <button
                                        className="btn-primary"
                                        style={{ padding: "5px 12px", fontSize: 11 }}
                                        onClick={() => onNavigate("bookings")}
                                    >
                                        Assign Tech
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 7-day Activity Chart */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ marginBottom: 16 }}>
                        <p className="section-label">Weekly Activity</p>
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                margin: "2px 0 0",
                            }}
                        >
                            Past 7 Days Job Volume
                        </h2>
                    </div>

                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="bookings" name="Bookings" fill="#3F7DFF" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
