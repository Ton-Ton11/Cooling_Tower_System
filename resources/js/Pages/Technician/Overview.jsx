import StatCard from "../../Components/StatCard";
import StatusBadge from "../../Components/StatusBadge";
import { formatDateTime } from "../../utils/superAdmin";

const icons = {
    assigned: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    progress: "M13 10V3L4 14h7v7l9-11h-7z",
    completed: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    tools: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    arrow: "M5 12h14 M13 6l6 6-6 6",
};

export default function TechnicianDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const stats = dashboardData?.stats ?? {};
    const assignedBookings = dashboardData?.assigned_bookings ?? [];
    const recentCompleted = dashboardData?.recent_completed ?? [];

    const statCards = [
        {
            label: "Assigned Jobs",
            value: stats.assigned_bookings ?? 0,
            sub: "Scheduled or dispatched",
            icon: icons.assigned,
            accent: "#3F7DFF",
        },
        {
            label: "In-Progress Jobs",
            value: stats.in_progress_bookings ?? 0,
            sub: "Currently undergoing service",
            icon: icons.progress,
            accent: "#F58A07",
        },
        {
            label: "Completed Jobs",
            value: stats.completed_bookings ?? 0,
            sub: "Total serviced bookings",
            icon: icons.completed,
            accent: "#22C55E",
        },
        {
            label: "Customer Rating",
            value: `${stats.avg_rating ?? 5.0} ★`,
            sub: "Average client score",
            icon: icons.star,
            accent: "#EAB308",
        },
    ];

    const quickActions = [
        {
            label: "My Job Queue & Schedule",
            description: "Start active jobs, log materials, or submit reports.",
            page: "bookings",
        },
        {
            label: "My Issued Tools",
            description: "Check custody of power tools, gauges, and equipment.",
            page: "tools",
        },
        {
            label: "Performance & Reviews",
            description: "View weekly/monthly completion analytics and ratings.",
            page: "performance",
        },
        {
            label: "Company Announcements",
            description: "Read official updates, advisories, and bulletins.",
            page: "announcements",
        },
    ];

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Technician Operations Center</h1>
                    <p className="page-subtitle">
                        Live service queue, active assignments, report submissions, and tools
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
                        onClick={() => onNavigate("bookings")}
                    >
                        Open My Jobs →
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

            {/* Active Job Queue */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                    }}
                >
                    <div>
                        <p className="section-label">Action Queue</p>
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                margin: "2px 0 0",
                            }}
                        >
                            Active & Upcoming Service Jobs
                        </h2>
                    </div>
                    <button
                        className="btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => onNavigate("bookings")}
                    >
                        View Full Schedule →
                    </button>
                </div>

                {assignedBookings.length === 0 ? (
                    <div
                        style={{
                            padding: 32,
                            textAlign: "center",
                            color: "#9CA3AF",
                            fontSize: 13,
                        }}
                    >
                        No active jobs assigned right now. You are all caught up!
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {assignedBookings.map((job) => (
                            <div
                                key={job.booking_id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "14px 16px",
                                    borderRadius: 12,
                                    background: "#F8FAFC",
                                    border: "1px solid #F0F2F5",
                                    flexWrap: "wrap",
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#3F7DFF" }}>
                                            #{job.booking_id}
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                            {job.client_name}
                                        </span>
                                        <StatusBadge status={job.booking_status} />
                                    </div>
                                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>
                                        🛠 {job.service} · 📍 {job.client_address || "Address upon arrival"}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>
                                        📅 Scheduled: {formatDateTime(job.scheduled_date)}
                                    </p>
                                </div>
                                <button
                                    className="btn-primary"
                                    style={{ padding: "6px 14px", fontSize: 12 }}
                                    onClick={() => onNavigate("bookings")}
                                >
                                    {job.booking_status === "In-Progress" ? "Manage In-Progress Job →" : "Open Job Details →"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
