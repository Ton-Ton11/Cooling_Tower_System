import { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import {
    TECHNICIAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

const WrenchIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
);

const ZapIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const PackageIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4L7.55 4.24a1.78 1.78 0 00-2.5 1.55v12.42a1.78 1.78 0 002.5 1.55l8.95-5.16a1.78 1.78 0 000-3.1z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
);

const getItemGroup = (item) => {
    const type = (item?.item_type || "").toLowerCase();
    if (type !== "tool") return "material";
    const subtype = (item?.tool_subtype || "").toLowerCase();
    return subtype === "power" ? "power_tool" : "hand_tool";
};

export default function TechnicianTools({ addToast, onNavigate, onDataChanged }) {
    const [viewTab, setViewTab] = useState("issued"); // 'issued' | 'catalog'
    const [checklists, setChecklists] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("All"); // 'All' | 'hand_tool' | 'power_tool' | 'material'
    const [updatingToolItemId, setUpdatingToolItemId] = useState(null);

    const fetchChecklists = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.checklists);
            setChecklists(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load tools."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const fetchCatalog = useCallback(async () => {
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.availableCatalog);
            setCatalog(Array.isArray(data?.data) ? data.data : []);
        } catch {
            // non-blocking
        }
    }, []);

    useEffect(() => {
        fetchChecklists();
        fetchCatalog();
    }, [fetchChecklists, fetchCatalog]);

    const handleReturnToolStatus = async (checklistId, itemId, newStatus) => {
        if (updatingToolItemId) return;
        setUpdatingToolItemId(itemId);
        try {
            await window.axios.patch(
                TECHNICIAN_ENDPOINTS.updateChecklistItemStatus(checklistId, itemId),
                { status: newStatus }
            );
            addToast(
                newStatus === "returned"
                    ? "Tool marked as returned."
                    : `Tool marked as ${newStatus}.`
            );
            await fetchChecklists(false);
            await fetchCatalog();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update tool status."), "error");
        } finally {
            setUpdatingToolItemId(null);
        }
    };

    // Extract all issued tools from active approved checklists (cleared when checklist or booking is completed)
    const issuedTools = useMemo(() => {
        const list = [];
        checklists.forEach((cl) => {
            const clStatus = (cl.status || "").toLowerCase();
            const bookingStatus = (cl.booking?.booking_status || cl.booking_status || "").toLowerCase();
            if (clStatus === "pending" || clStatus === "completed" || bookingStatus === "completed" || bookingStatus === "cancelled") return;
            const items = Array.isArray(cl.items) ? cl.items : [];
            items.forEach((item) => {
                if ((item.item_type || "").toLowerCase() !== "tool") return;
                const q = searchQuery.trim().toLowerCase();
                if (q) {
                    const match =
                        (item.item_name || "").toLowerCase().includes(q) ||
                        (item.serial_number || "").toLowerCase().includes(q) ||
                        (cl.client_name || "").toLowerCase().includes(q) ||
                        (cl.service_name || "").toLowerCase().includes(q) ||
                        String(cl.booking_id || "").includes(q);
                    if (!match) return;
                }
                list.push({
                    ...item,
                    checklist_id: cl.checklist_id,
                    checklist_status: cl.status,
                    booking_id: cl.booking_id,
                    client_name: cl.client_name || cl.booking?.client_name || "Customer",
                    service_name: cl.service_name || cl.booking?.service_name || "Service",
                    team_name: cl.team_name || cl.team?.name || "",
                    approved_at: cl.approved_at || cl.created_at,
                    category_group: getItemGroup(item),
                });
            });
        });
        return list;
    }, [checklists, searchQuery]);

    const issuedHandTools = useMemo(
        () => issuedTools.filter((t) => t.category_group === "hand_tool"),
        [issuedTools]
    );

    const issuedPowerTools = useMemo(
        () => issuedTools.filter((t) => t.category_group === "power_tool"),
        [issuedTools]
    );

    const filteredCatalog = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return catalog.filter((item) => {
            const grp = getItemGroup(item);
            if (catalogCategoryFilter !== "All" && grp !== catalogCategoryFilter) {
                return false;
            }
            if (!q) return true;
            return (
                (item.item_name || "").toLowerCase().includes(q) ||
                (item.sub_category || "").toLowerCase().includes(q) ||
                (item.serial_number || "").toLowerCase().includes(q)
            );
        });
    }, [catalog, searchQuery, catalogCategoryFilter]);

    const renderToolSection = (title, icon, badgeBg, badgeColor, toolsList) => (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
                style={{
                    padding: "12px 16px",
                    background: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {icon}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                        {title}
                    </span>
                </div>
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: badgeBg,
                        color: badgeColor,
                    }}
                >
                    {toolsList.length}
                </span>
            </div>

            {toolsList.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                    No {title.toLowerCase()} issued.
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                                {["Tool", "Booking", "Qty", "Status", "Action"].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "10px 14px",
                                            textAlign: "left",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: "#64748B",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {toolsList.map((tool) => {
                                const isUpdating = updatingToolItemId === tool.id;
                                const canUpdate =
                                    tool.checklist_status === "Approved" &&
                                    tool.status === "assigned";
                                return (
                                    <tr
                                        key={`${tool.checklist_id}-${tool.id}`}
                                        style={{ borderBottom: "1px solid #F1F5F9" }}
                                    >
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                                {tool.item_name}
                                            </div>
                                            {tool.serial_number && (
                                                <div style={{ fontSize: 11, color: "#64748B" }}>
                                                    S/N: {tool.serial_number}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>
                                                #{tool.booking_id} · {tool.client_name}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#64748B" }}>
                                                {tool.service_name}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                            {tool.quantity_approved ?? tool.quantity_requested} {tool.unit || "pcs"}
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: "3px 8px",
                                                    borderRadius: 6,
                                                    textTransform: "capitalize",
                                                    background:
                                                        tool.status === "returned"
                                                            ? "#DCFCE7"
                                                            : tool.status === "damaged" || tool.status === "lost"
                                                            ? "#FEE2E2"
                                                            : "#DBEAFE",
                                                    color:
                                                        tool.status === "returned"
                                                            ? "#15803D"
                                                            : tool.status === "damaged" || tool.status === "lost"
                                                            ? "#B91C1C"
                                                            : "#1D4ED8",
                                                }}
                                            >
                                                {tool.status === "assigned" ? "In Use" : tool.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            {canUpdate ? (
                                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            handleReturnToolStatus(
                                                                tool.checklist_id,
                                                                tool.id,
                                                                "returned"
                                                            )
                                                        }
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #86EFAC",
                                                            background: "#DCFCE7",
                                                            color: "#15803D",
                                                            fontWeight: 700,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Returned
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            handleReturnToolStatus(
                                                                tool.checklist_id,
                                                                tool.id,
                                                                "damaged"
                                                            )
                                                        }
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #FCA5A5",
                                                            background: "#FEE2E2",
                                                            color: "#DC2626",
                                                            fontWeight: 700,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Damaged
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            handleReturnToolStatus(
                                                                tool.checklist_id,
                                                                tool.id,
                                                                "lost"
                                                            )
                                                        }
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #CBD5E1",
                                                            background: "#F1F5F9",
                                                            color: "#475569",
                                                            fontWeight: 700,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Lost
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 11, color: "#94A3B8" }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">My Tools</h1>
                    <p className="page-subtitle">
                        Issued tools for your active jobs and available worker inventory
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {onNavigate && (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => onNavigate("bookings")}
                        >
                            Go to My Jobs and Checklist
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                            fetchChecklists();
                            fetchCatalog();
                        }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Sub-navigation & Search */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: "wrap",
                }}
            >
                <div className="tab-bar" style={{ margin: 0 }}>
                    <button
                        type="button"
                        className={`tab-item ${viewTab === "issued" ? "active" : ""}`}
                        onClick={() => setViewTab("issued")}
                    >
                        Issued Tools ({issuedTools.length})
                    </button>
                    <button
                        type="button"
                        className={`tab-item ${viewTab === "catalog" ? "active" : ""}`}
                        onClick={() => setViewTab("catalog")}
                    >
                        Worker Inventory ({catalog.length})
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search tools..."
                    className="input-field"
                    style={{ maxWidth: 260, padding: "7px 12px", fontSize: 12 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {viewTab === "issued" ? (
                loading ? (
                    <div className="card" style={{ padding: 32, textAlign: "center", color: "#94A3B8" }}>
                        Loading tools...
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {renderToolSection(
                            "Hand Tools",
                            <WrenchIcon size={15} color="#1D4ED8" />,
                            "#DBEAFE",
                            "#1D4ED8",
                            issuedHandTools
                        )}
                        {renderToolSection(
                            "Power Tools",
                            <ZapIcon size={15} color="#6D28D9" />,
                            "#EDE9FE",
                            "#6D28D9",
                            issuedPowerTools
                        )}
                    </div>
                )
            ) : (
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div
                        style={{
                            padding: "12px 16px",
                            background: "#F8FAFC",
                            borderBottom: "1px solid #E2E8F0",
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        {[
                            { key: "All", label: "All" },
                            { key: "hand_tool", label: "Hand Tools" },
                            { key: "power_tool", label: "Power Tools" },
                            { key: "material", label: "Materials" },
                        ].map((cat) => {
                            const active = catalogCategoryFilter === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setCatalogCategoryFilter(cat.key)}
                                    style={{
                                        padding: "5px 12px",
                                        borderRadius: 6,
                                        border: active ? "1px solid #3B82F6" : "1px solid #E2E8F0",
                                        background: active ? "#EFF6FF" : "#FFFFFF",
                                        color: active ? "#1D4ED8" : "#64748B",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                                    {["Item", "Category", "Serial #", "Available", "Status"].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: "#64748B",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCatalog.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>
                                            No items found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCatalog.map((item) => {
                                        const grp = getItemGroup(item);
                                        const catLabel =
                                            grp === "power_tool"
                                                ? "Power Tool"
                                                : grp === "hand_tool"
                                                ? "Hand Tool"
                                                : "Material";
                                        const catBg =
                                            grp === "power_tool"
                                                ? "#EDE9FE"
                                                : grp === "hand_tool"
                                                ? "#DBEAFE"
                                                : "#FEF3C7";
                                        const catColor =
                                            grp === "power_tool"
                                                ? "#6D28D9"
                                                : grp === "hand_tool"
                                                ? "#1D4ED8"
                                                : "#B45309";
                                        return (
                                            <tr key={item.item_id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                                    {item.item_name}
                                                </td>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: "2px 8px",
                                                            borderRadius: 6,
                                                            background: catBg,
                                                            color: catColor,
                                                        }}
                                                    >
                                                        {catLabel}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>
                                                    {item.serial_number || "—"}
                                                </td>
                                                <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: item.quantity_on_hand > 0 ? "#059669" : "#DC2626" }}>
                                                    {item.quantity_on_hand} {item.unit || "pcs"}
                                                </td>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <StatusBadge status={item.status || "Available"} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
