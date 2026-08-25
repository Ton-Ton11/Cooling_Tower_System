import StatCard from "../../Components/StatCard";
import StatusBadge from "../../Components/StatusBadge";
import { formatDate } from "../../utils/superAdmin";

const icons = {
    inventory: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    lowstock: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    tools: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    materials: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    arrow: "M5 12h14 M13 6l6 6-6 6",
};

export default function ToolsManDashboardOverview({ onNavigate, dashboardData, isLoading, onRefresh }) {
    const stats = dashboardData?.stats ?? {};
    const recentItems = dashboardData?.recent_items ?? [];

    const statCards = [
        {
            label: "Total Items Tracked",
            value: stats.total_items ?? 0,
            sub: "Tools and materials inventory",
            icon: icons.inventory,
            accent: "#3F7DFF",
        },
        {
            label: "Low Stock Items",
            value: stats.low_stock_items ?? 0,
            sub: "Requires immediate reordering",
            icon: icons.lowstock,
            accent: "#EF4444",
        },
        {
            label: "Total Tools",
            value: stats.total_tools ?? 0,
            sub: "Power & hand tools in custody",
            icon: icons.tools,
            accent: "#F58A07",
        },
        {
            label: "Total Materials",
            value: stats.total_materials ?? 0,
            sub: "Consumables & installation supplies",
            icon: icons.materials,
            accent: "#10B981",
        },
    ];

    const quickActions = [
        {
            label: "Manage Materials & Tools",
            description: "View warehouse inventory, checkout tools, or restock.",
            page: "materials",
        },
        {
            label: "Broadcast Announcement",
            description: "Notify technicians of tool maintenance or arrivals.",
            page: "announcements",
        },
    ];

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Tools Man Dashboard</h1>
                    <p className="page-subtitle">
                        Warehouse supply monitoring, tool issuance, stock levels, and announcements
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
                        onClick={() => onNavigate("materials")}
                    >
                        Go to Inventory →
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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

            {/* Recent Inventory Items */}
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
                        <p className="section-label">Inventory Activity</p>
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                margin: "2px 0 0",
                            }}
                        >
                            Recently Updated Stock
                        </h2>
                    </div>
                    <button
                        className="btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => onNavigate("materials")}
                    >
                        View Full Inventory →
                    </button>
                </div>

                {recentItems.length === 0 ? (
                    <div
                        style={{
                            padding: 32,
                            textAlign: "center",
                            color: "#9CA3AF",
                            fontSize: 13,
                        }}
                    >
                        No items updated recently.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {["Item Name", "Type", "Current Stock", "Reorder Level", "Status"].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#9CA3AF",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                borderBottom: "1px solid #EAECF0",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentItems.map((item) => (
                                    <tr key={item.item_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                            {item.item_name}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                            {item.item_type}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: item.low_stock ? "#EF4444" : "#1E2F5F" }}>
                                            {item.quantity_on_hand} {item.unit}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#9CA3AF" }}>
                                            {item.reorder_level} {item.unit}
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <StatusBadge status={item.low_stock ? "Low Stock" : "Available"} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
