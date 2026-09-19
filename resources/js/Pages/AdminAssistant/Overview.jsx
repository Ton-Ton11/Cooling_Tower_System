import {
    AreaChart,
    Area,
    CartesianGrid,
    LineChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import StatCard from "../../Components/StatCard";
import {
    formatCurrency,
} from "../../utils/superAdmin";

const icons = {
    staff: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    acunits: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    revenue: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    arrow: "M5 12h14 M13 6l6 6-6 6",
};

export default function AdminAssistantDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const stats = dashboardData?.stats ?? {};
    const weeklyRevenue = dashboardData?.weekly_revenue ?? [];

    const statCards = [
        {
            label: "Active Staff",
            value: stats.active_staff ?? 0,
            sub: "Registered staff personnel",
            icon: icons.staff,
            accent: "#3F7DFF",
        },
        {
            label: "Available AC Units",
            value: stats.available_ac_units ?? 0,
            sub: `Out of ${stats.total_ac_units ?? 0} total units`,
            icon: icons.acunits,
            accent: "#22C55E",
        },
        {
            label: "Paid Revenue This Month",
            value: formatCurrency(stats.paid_revenue_this_month ?? 0),
            sub: "Collected sales & booking revenue",
            icon: icons.revenue,
            accent: "#16A34A",
        },
        {
            label: "Announcements",
            value: stats.announcements ?? 0,
            sub: "Active announcements feed",
            icon: icons.announcements,
            accent: "#8B5CF6",
        },
    ];

    const quickActions = [
        {
            label: "Manage Staff Accounts",
            description: "View and edit technician and employee accounts.",
            page: "staff",
        },
        {
            label: "AC Units Inventory",
            description: "Track inventory, stock arrival, and sales.",
            page: "acunits",
        },
        {
            label: "Sales & Records",
            description: "Review financial transaction logs and earnings.",
            page: "sales",
        },
        {
            label: "Post Announcement",
            description: "Create official company broadcast memos.",
            page: "announcements",
        },
    ];

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Admin Assistant Dashboard</h1>
                    <p className="page-subtitle">
                        Staff administration, AC inventory oversight, sales records, and bulletins
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
                    <button className="btn-secondary" onClick={onRefresh}>
                        Refresh Overview
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => onNavigate("staff")}
                    >
                        Manage Staff →
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

            {/* Weekly Revenue Chart */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                    <p className="section-label">Financial Overview</p>
                    <h2
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            margin: "2px 0 0",
                        }}
                    >
                        Weekly Revenue Trends (Past 7 Days)
                    </h2>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3F7DFF" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#3F7DFF" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                        <YAxis
                            tick={{ fontSize: 12, fill: "#9CA3AF" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        />
                        <Tooltip
                            formatter={(value) => [formatCurrency(value), "Revenue"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3F7DFF"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#adminRevenueGrad)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
