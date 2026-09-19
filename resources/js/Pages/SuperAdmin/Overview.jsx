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
    ROLE_COLORS,
    formatCurrency,
    formatDateTime,
    getInitials,
} from "../../utils/superAdmin";

const icons = {
    staff:
        "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    bookings:
        "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    inventory: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    acunits: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    revenue: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    arrow: "M5 12h14 M13 6l6 6-6 6",
};

function Dashboard({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const stats = dashboardData?.stats ?? {};
    const pendingBookings = dashboardData?.pending_bookings ?? [];
    const recentActivity = dashboardData?.recent_activity ?? [];
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
            label: "Active Staff",
            value: stats.active_staff ?? 0,
            sub: "Current users with access",
            icon: icons.staff,
            accent: "#3F7DFF",
        },
        {
            label: "Pending Bookings",
            value: stats.pending_bookings ?? 0,
            sub: "Awaiting approval or assignment",
            icon: icons.bookings,
            accent: "#F58A07",
        },
        {
            label: "Low Stock Items",
            value: stats.low_stock_items ?? 0,
            sub: "Inventory items at reorder level",
            icon: icons.inventory,
            accent: "#EF4444",
        },
        {
            label: "Available AC Units",
            value: stats.available_ac_units ?? 0,
            sub: "Ready for installation or sale",
            icon: icons.acunits,
            accent: "#22C55E",
        },
        {
            label: "Announcements",
            value: stats.announcements ?? 0,
            sub: "Published notices and updates",
            icon: icons.announcements,
            accent: "#8B5CF6",
        },
        {
            label: "Paid Revenue This Month",
            value: formatCurrency(stats.paid_revenue_this_month ?? 0),
            sub: "Collected booking payments",
            icon: icons.revenue,
            accent: "#16A34A",
        },
    ];

    const quickActions = [
        {
            label: "Review Pending Bookings",
            description: "Approve or assign technicians to waiting clients.",
            page: "bookings",
        },
        {
            label: "Manage Staff Accounts",
            description: "Create, edit, archive, or restore employee access.",
            page: "staff",
        },
        {
            label: "Check Inventory",
            description: "Restock low materials and update quantities.",
            page: "materials",
        },
        {
            label: "Post Announcement",
            description: "Send updates to staff or customers.",
            page: "announcements",
        },
    ];

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Super Admin Dashboard
                    </h1>
                    <p className="page-subtitle">
                        Live overview of bookings, inventory, staff activity, and
                        revenue
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
                        Open Bookings
                    </button>
                </div>
            </div>

            {isLoading && !dashboardData ? (
                <div className="card" style={{ padding: 24 }}>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1E2F5F",
                        }}
                    >
                        Loading dashboard overview...
                    </p>
                    <p
                        style={{
                            margin: "6px 0 0",
                            fontSize: 13,
                            color: "#6B7280",
                        }}
                    >
                        Fetching live statistics from the Super Admin endpoints.
                    </p>
                </div>
            ) : (
                <>
                    <div
                        className="summary-grid"
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(220px,1fr))",
                            gap: 16,
                            marginBottom: 24,
                        }}
                    >
                        {statCards.map((card) => (
                            <StatCard
                                key={card.label}
                                label={card.label}
                                value={card.value}
                                sub={card.sub}
                                icon={card.icon}
                                accent={card.accent}
                            />
                        ))}
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(320px,1fr))",
                            gap: 16,
                            marginBottom: 24,
                        }}
                    >
                        <div className="card" style={{ padding: 24 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 16,
                                    flexWrap: "wrap",
                                    marginBottom: 20,
                                }}
                            >
                                <div>
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 8 }}
                                    >
                                        Weekly Revenue
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 24,
                                            fontWeight: 700,
                                            color: "#1E2F5F",
                                        }}
                                    >
                                        {formatCurrency(weekRevenueTotal)}
                                    </p>
                                    <p
                                        style={{
                                            margin: "4px 0 0",
                                            fontSize: 12,
                                            color: "#6B7280",
                                        }}
                                    >
                                        {weekBookingTotal} paid booking
                                        {weekBookingTotal === 1 ? "" : "s"} in the
                                        last 7 days
                                    </p>
                                </div>
                                <span
                                    style={{
                                        alignSelf: "flex-start",
                                        fontSize: 12,
                                        color: "#3F7DFF",
                                        background: "rgba(63,125,255,0.08)",
                                        border: "1px solid rgba(63,125,255,0.2)",
                                        borderRadius: 999,
                                        padding: "6px 12px",
                                    }}
                                >
                                    Live payment totals
                                </span>
                            </div>
                            <div style={{ width: "100%", height: 260 }}>
                                <ResponsiveContainer>
                                    <BarChart data={weeklyRevenue}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#F0F2F5"
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fontSize: 11, fill: "#9CA3AF" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) =>
                                                `₱${Math.round(Number(value) / 1000)}k`
                                            }
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [
                                                name === "revenue"
                                                    ? formatCurrency(value)
                                                    : value,
                                                name === "revenue"
                                                    ? "Revenue"
                                                    : "Paid Bookings",
                                            ]}
                                            labelFormatter={(label, payload) => {
                                                const date =
                                                    payload?.[0]?.payload?.date;
                                                return date
                                                    ? `${label} · ${date}`
                                                    : label;
                                            }}
                                            contentStyle={{
                                                background: "#fff",
                                                border: "1px solid #E5E7EB",
                                                borderRadius: 12,
                                            }}
                                        />
                                        <Bar
                                            dataKey="revenue"
                                            fill="#3F7DFF"
                                            radius={[8, 8, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 24 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 16,
                                    marginBottom: 16,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div>
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 8 }}
                                    >
                                        Paid Bookings Trend
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 24,
                                            fontWeight: 700,
                                            color: "#1E2F5F",
                                        }}
                                    >
                                        {weekBookingTotal}
                                    </p>
                                    <p
                                        style={{
                                            margin: "4px 0 0",
                                            fontSize: 12,
                                            color: "#6B7280",
                                        }}
                                    >
                                        Completed payments across the last week
                                    </p>
                                </div>
                                <button
                                    className="btn-secondary"
                                    onClick={() => onNavigate("sales")}
                                >
                                    Open Sales Records
                                </button>
                            </div>
                            <div style={{ width: "100%", height: 260 }}>
                                <ResponsiveContainer>
                                    <LineChart data={weeklyRevenue}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#F0F2F5"
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fontSize: 11, fill: "#9CA3AF" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            formatter={(value) => [
                                                value,
                                                "Paid Bookings",
                                            ]}
                                            labelFormatter={(label, payload) => {
                                                const date =
                                                    payload?.[0]?.payload?.date;
                                                return date
                                                    ? `${label} · ${date}`
                                                    : label;
                                            }}
                                            contentStyle={{
                                                background: "#fff",
                                                border: "1px solid #E5E7EB",
                                                borderRadius: 12,
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="bookings"
                                            stroke="#F58A07"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "#F58A07" }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(320px,1fr))",
                            gap: 16,
                            marginBottom: 24,
                        }}
                    >
                        <div className="card" style={{ padding: 24 }}>
                            <div className="page-header" style={{ marginBottom: 16 }}>
                                <div>
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 8 }}
                                    >
                                        Pending Bookings
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 13,
                                            color: "#6B7280",
                                        }}
                                    >
                                        Latest requests awaiting approval or
                                        assignment
                                    </p>
                                </div>
                                <button
                                    className="btn-secondary"
                                    onClick={() => onNavigate("bookings")}
                                >
                                    View All
                                </button>
                            </div>

                            {pendingBookings.length === 0 ? (
                                <div
                                    style={{
                                        padding: 18,
                                        borderRadius: 12,
                                        background: "#F9FAFB",
                                        color: "#6B7280",
                                        fontSize: 13,
                                    }}
                                >
                                    No pending bookings are waiting for action.
                                </div>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            minWidth: 680,
                                        }}
                                    >
                                        <thead>
                                            <tr style={{ background: "#F5F7FA" }}>
                                                {[
                                                    "Booking",
                                                    "Client",
                                                    "Service",
                                                    "Scheduled",
                                                    "Technician",
                                                    "Status",
                                                ].map((heading) => (
                                                    <th
                                                        key={heading}
                                                        style={{
                                                            padding: "10px 12px",
                                                            textAlign: "left",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            letterSpacing: "0.05em",
                                                            textTransform:
                                                                "uppercase",
                                                            color: "#6B7280",
                                                            borderBottom:
                                                                "1px solid #EAECF0",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {heading}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingBookings.map((booking) => (
                                                <tr
                                                    key={booking.booking_id}
                                                    style={{
                                                        borderTop:
                                                            "1px solid #F5F7FA",
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            padding: "10px 12px",
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: "#3F7DFF",
                                                        }}
                                                    >
                                                        #{booking.booking_id}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 12px",
                                                            fontSize: 13,
                                                            color: "#1E2F5F",
                                                        }}
                                                    >
                                                        {booking.client_name}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 12px",
                                                            fontSize: 12,
                                                            color: "#6B7280",
                                                        }}
                                                    >
                                                        {booking.service}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 12px",
                                                            fontSize: 12,
                                                            color: "#6B7280",
                                                        }}
                                                    >
                                                        {formatDateTime(
                                                            booking.scheduled_date,
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 12px",
                                                            fontSize: 12,
                                                            color:
                                                                booking.assigned_tech_name
                                                                    ? "#374151"
                                                                    : "#9CA3AF",
                                                        }}
                                                    >
                                                        {booking.assigned_tech_name ||
                                                            "Unassigned"}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 12px",
                                                        }}
                                                    >
                                                        <StatusBadge
                                                            status={
                                                                booking.booking_status
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="card" style={{ padding: 24 }}>
                            <div className="page-header" style={{ marginBottom: 16 }}>
                                <div>
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 8 }}
                                    >
                                        Quick Actions
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 13,
                                            color: "#6B7280",
                                        }}
                                    >
                                        Jump to the areas that need attention
                                    </p>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                }}
                            >
                                {quickActions.map((action) => (
                                    <button
                                        key={action.page}
                                        onClick={() => onNavigate(action.page)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            padding: "14px 16px",
                                            borderRadius: 14,
                                            border: "1px solid #E5E7EB",
                                            background: "#fff",
                                            cursor: "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        <div>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: "#1E2F5F",
                                                }}
                                            >
                                                {action.label}
                                            </p>
                                            <p
                                                style={{
                                                    margin: "4px 0 0",
                                                    fontSize: 12,
                                                    color: "#6B7280",
                                                }}
                                            >
                                                {action.description}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: 10,
                                                background:
                                                    "rgba(63,125,255,0.10)",
                                                color: "#3F7DFF",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d={icons.arrow} />
                                            </svg>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <div className="page-header" style={{ marginBottom: 16 }}>
                            <div>
                                <p
                                    className="section-label"
                                    style={{ marginBottom: 8 }}
                                >
                                    Recent Activity
                                </p>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 13,
                                        color: "#6B7280",
                                    }}
                                >
                                    Latest Super Admin audit trail entries
                                </p>
                            </div>
                            <button
                                className="btn-secondary"
                                onClick={() => onNavigate("logs")}
                            >
                                Open Activity Logs
                            </button>
                        </div>

                        {recentActivity.length === 0 ? (
                            <div
                                style={{
                                    padding: 18,
                                    borderRadius: 12,
                                    background: "#F9FAFB",
                                    color: "#6B7280",
                                    fontSize: 13,
                                }}
                            >
                                No recent activity has been logged yet.
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                }}
                            >
                                {recentActivity.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="feed-row"
                                        style={{
                                            display: "flex",
                                            gap: 14,
                                            alignItems: "flex-start",
                                            padding: 16,
                                            borderRadius: 14,
                                            border: "1px solid #F0F2F5",
                                            background: "#fff",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 12,
                                                background:
                                                    "linear-gradient(135deg,#3F7DFF,#1E2F5F)",
                                                color: "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {getInitials(entry.user_name)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    flexWrap: "wrap",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        color: "#1E2F5F",
                                                    }}
                                                >
                                                    {entry.user_name}
                                                </p>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        padding: "2px 8px",
                                                        borderRadius: 20,
                                                        background: `${
                                                            ROLE_COLORS[
                                                                entry.role
                                                            ] || "#8A93A6"
                                                        }18`,
                                                        color:
                                                            ROLE_COLORS[
                                                                entry.role
                                                            ] || "#8A93A6",
                                                        border: `1px solid ${
                                                            ROLE_COLORS[
                                                                entry.role
                                                            ] || "#8A93A6"
                                                        }30`,
                                                        fontWeight: 600,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {entry.role}
                                                </span>
                                                <span
                                                    className="feed-tag"
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#6B7280",
                                                        background: "#F5F7FA",
                                                        borderRadius: 999,
                                                        padding: "3px 10px",
                                                    }}
                                                >
                                                    {entry.action_type}
                                                </span>
                                            </div>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: 13,
                                                    color: "#6B7280",
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                {entry.description}
                                            </p>
                                            <p
                                                style={{
                                                    margin: "6px 0 0",
                                                    fontSize: 11,
                                                    color: "#9CA3AF",
                                                }}
                                            >
                                                {formatDateTime(entry.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default Dashboard;
