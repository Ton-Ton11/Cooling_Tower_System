import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
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

const ACTION_CONFIG = {
    returned: {
        label: "Return",
        accent: "#16A34A",
        badgeBg: "#DCFCE7",
        ring: "rgba(22, 163, 74, 0.25)",
        rowBg: "#F0FDF4",
    },
    damaged: {
        label: "Damaged",
        accent: "#DC2626",
        badgeBg: "#FEE2E2",
        ring: "rgba(220, 38, 38, 0.25)",
        rowBg: "#FEF2F2",
    },
    lost: {
        label: "Lost",
        accent: "#D97706",
        badgeBg: "#FEF3C7",
        ring: "rgba(217, 119, 6, 0.25)",
        rowBg: "#FFFBEB",
    },
};

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
    const [toolActions, setToolActions] = useState({}); // { [toolChecklistItemId]: 'returned' | 'damaged' | 'lost' }
    const [materialReturnQtys, setMaterialReturnQtys] = useState({});
    const [returningMaterialId, setReturningMaterialId] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    const issuedMaterials = useMemo(() => {
        const list = [];
        checklists.forEach((cl) => {
            const clStatus = (cl.status || "").toLowerCase();
            const bookingStatus = (cl.booking?.booking_status || cl.booking_status || "").toLowerCase();
            if (clStatus !== "approved" || bookingStatus === "completed" || bookingStatus === "cancelled") return;
            const items = Array.isArray(cl.items) ? cl.items : [];
            items.forEach((item) => {
                if ((item.item_type || "").toLowerCase() === "tool") return;
                const q = searchQuery.trim().toLowerCase();
                if (q) {
                    const match =
                        (item.item_name || "").toLowerCase().includes(q) ||
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
                });
            });
        });
        return list;
    }, [checklists, searchQuery]);

    const handleReturnMaterialQty = async (materialItem, newQty) => {
        if (returningMaterialId) return;
        const maxQty = Number(materialItem.quantity_approved ?? materialItem.quantity_requested ?? 1);
        const qty = Math.max(0, Math.min(maxQty, parseInt(newQty, 10) || 0));
        setReturningMaterialId(materialItem.id);
        try {
            const { data } = await window.axios.post(
                TECHNICIAN_ENDPOINTS.returnChecklistMaterial(materialItem.checklist_id, materialItem.id),
                { quantity_returned: qty }
            );
            addToast(data?.message || `Updated returned quantity for ${materialItem.item_name}.`);
            await fetchChecklists(false);
            await fetchCatalog();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to return material quantity."), "error");
        } finally {
            setReturningMaterialId(null);
        }
    };

    // Active pending tools requiring inspection
    const pendingTools = useMemo(() => {
        return issuedTools.filter(
            (t) =>
                t.status === "assigned" &&
                (t.checklist_status || "").toLowerCase() === "approved"
        );
    }, [issuedTools]);

    const totalPendingCount = pendingTools.length;

    const checkedCount = useMemo(() => {
        return pendingTools.filter((t) => Boolean(toolActions[t.id])).length;
    }, [pendingTools, toolActions]);

    const isAllChecked = totalPendingCount > 0 && checkedCount === totalPendingCount;

    const actionCounts = useMemo(() => {
        let returned = 0;
        let damaged = 0;
        let lost = 0;
        pendingTools.forEach((t) => {
            const action = toolActions[t.id];
            if (action === "returned") returned += 1;
            else if (action === "damaged") damaged += 1;
            else if (action === "lost") lost += 1;
        });
        return { returned, damaged, lost };
    }, [pendingTools, toolActions]);

    const handleSelectAction = (toolId, action) => {
        setToolActions((prev) => {
            const next = { ...prev };
            // If already selected, clicking again deselects
            if (next[toolId] === action) {
                delete next[toolId];
            } else {
                next[toolId] = action;
            }
            return next;
        });
    };

    const handleMarkAllReturn = () => {
        const next = { ...toolActions };
        pendingTools.forEach((t) => {
            next[t.id] = "returned";
        });
        setToolActions(next);
    };

    const handleResetChecks = () => {
        setToolActions({});
    };

    const handleSubmitChecklist = async () => {
        if (!isAllChecked || submitting) return;
        setSubmitting(true);
        try {
            // Group pending items by checklist_id
            const itemsByChecklist = {};
            pendingTools.forEach((tool) => {
                const cid = tool.checklist_id;
                if (!itemsByChecklist[cid]) itemsByChecklist[cid] = [];
                itemsByChecklist[cid].push({
                    item_id: tool.id,
                    status: toolActions[tool.id],
                    notes: null,
                });
            });

            const promises = Object.entries(itemsByChecklist).map(([cid, items]) => {
                return window.axios.patch(
                    TECHNICIAN_ENDPOINTS.updateChecklistBatchStatus(cid),
                    { items }
                );
            });

            await Promise.all(promises);

            addToast(
                `Tool checklist submitted to Tools Man (${actionCounts.returned} returned, ${actionCounts.damaged} damaged, ${actionCounts.lost} lost).`,
                "success"
            );
            setConfirmModalOpen(false);
            setToolActions({});
            await fetchChecklists(false);
            await fetchCatalog();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to submit tool checklist."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const isCatalogItemLowStock = useCallback((item) => {
        if (typeof item?.low_stock === "boolean") return item.low_stock;
        const qty = Number(item?.quantity_on_hand ?? 0);
        const reorder = Number(item?.reorder_level ?? 0);
        const grp = getItemGroup(item);
        if (grp === "power_tool" && Number(item?.initial_stock ?? 1) <= 1 && reorder === 1) {
            return qty <= 0;
        }
        return qty <= reorder;
    }, []);

    const lowStockCatalogCount = useMemo(
        () => catalog.filter((item) => isCatalogItemLowStock(item)).length,
        [catalog, isCatalogItemLowStock]
    );

    const filteredCatalog = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return catalog.filter((item) => {
            const grp = getItemGroup(item);
            if (catalogCategoryFilter === "low_stock") {
                if (!isCatalogItemLowStock(item)) return false;
            } else if (catalogCategoryFilter !== "All" && grp !== catalogCategoryFilter) {
                return false;
            }
            if (!q) return true;
            return (
                (item.item_name || "").toLowerCase().includes(q) ||
                (item.sub_category || "").toLowerCase().includes(q) ||
                (item.serial_number || "").toLowerCase().includes(q)
            );
        });
    }, [catalog, searchQuery, catalogCategoryFilter, isCatalogItemLowStock]);

    const renderActionCheckbox = (tool, action, config) => {
        const isAssigned =
            tool.checklist_status === "Approved" && tool.status === "assigned";

        if (!isAssigned) {
            const isCurrent = (tool.status || "").toLowerCase() === action;
            return (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {isCurrent ? (
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: config.badgeBg,
                                color: config.accent,
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            ✓
                        </span>
                    ) : (
                        <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>
                    )}
                </div>
            );
        }

        const isChecked = toolActions[tool.id] === action;

        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSelectAction(tool.id, action)}
                    title={`Mark as ${config.label}`}
                    aria-label={`Mark ${tool.item_name} as ${config.label}`}
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: isChecked
                            ? `2px solid ${config.accent}`
                            : "2px solid #CBD5E1",
                        background: isChecked ? config.accent : "#FFFFFF",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: submitting ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        outline: "none",
                        boxShadow: isChecked ? `0 0 0 3px ${config.ring}` : "none",
                        padding: 0,
                    }}
                >
                    {isChecked && (
                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </button>
            </div>
        );
    };

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
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#64748B",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Tool
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#64748B",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Booking
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#64748B",
                                        textTransform: "uppercase",
                                        width: 80,
                                    }}
                                >
                                    Qty
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#64748B",
                                        textTransform: "uppercase",
                                        width: 95,
                                    }}
                                >
                                    Status
                                </th>
                                <th
                                    style={{
                                        padding: "10px 10px",
                                        textAlign: "center",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#15803D",
                                        textTransform: "uppercase",
                                        width: 80,
                                    }}
                                >
                                    Return
                                </th>
                                <th
                                    style={{
                                        padding: "10px 10px",
                                        textAlign: "center",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#DC2626",
                                        textTransform: "uppercase",
                                        width: 80,
                                    }}
                                >
                                    Damaged
                                </th>
                                <th
                                    style={{
                                        padding: "10px 10px",
                                        textAlign: "center",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#D97706",
                                        textTransform: "uppercase",
                                        width: 80,
                                    }}
                                >
                                    Lost
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {toolsList.map((tool) => {
                                const selectedAction = toolActions[tool.id];
                                const rowBg =
                                    selectedAction === "returned"
                                        ? "#F0FDF4"
                                        : selectedAction === "damaged"
                                        ? "#FEF2F2"
                                        : selectedAction === "lost"
                                        ? "#FFFBEB"
                                        : "transparent";

                                return (
                                    <tr
                                        key={`${tool.checklist_id}-${tool.id}`}
                                        style={{
                                            borderBottom: "1px solid #F1F5F9",
                                            background: rowBg,
                                            transition: "background 0.15s ease",
                                        }}
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
                                                            : tool.status === "damaged"
                                                            ? "#FEE2E2"
                                                            : tool.status === "lost"
                                                            ? "#FEF3C7"
                                                            : "#DBEAFE",
                                                    color:
                                                        tool.status === "returned"
                                                            ? "#15803D"
                                                            : tool.status === "damaged"
                                                            ? "#B91C1C"
                                                            : tool.status === "lost"
                                                            ? "#92400E"
                                                            : "#1D4ED8",
                                                }}
                                            >
                                                {tool.status === "assigned" ? "In Use" : tool.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                            {renderActionCheckbox(tool, "returned", ACTION_CONFIG.returned)}
                                        </td>
                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                            {renderActionCheckbox(tool, "damaged", ACTION_CONFIG.damaged)}
                                        </td>
                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                            {renderActionCheckbox(tool, "lost", ACTION_CONFIG.lost)}
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
                        Issued Tools &amp; Materials ({issuedTools.length + issuedMaterials.length})
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
                        {totalPendingCount > 0 && (
                            <div
                                className="card"
                                style={{
                                    padding: "12px 16px",
                                    background: isAllChecked ? "#F0FDF4" : "#F8FAFC",
                                    border: isAllChecked ? "1px solid #86EFAC" : "1px solid #E2E8F0",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                    flexWrap: "wrap",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: isAllChecked ? "#15803D" : "#1E293B",
                                            }}
                                        >
                                            Checklist Inspection:
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: 999,
                                                background: isAllChecked ? "#DCFCE7" : "#E2E8F0",
                                                color: isAllChecked ? "#15803D" : "#475569",
                                            }}
                                        >
                                            {checkedCount} / {totalPendingCount} Checked
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={handleMarkAllReturn}
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                border: "1px solid #86EFAC",
                                                background: "#FFFFFF",
                                                color: "#15803D",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Mark all Return
                                        </button>
                                        {checkedCount > 0 && (
                                            <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={handleResetChecks}
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: "4px 8px",
                                                    borderRadius: 6,
                                                    border: "1px solid #E2E8F0",
                                                    background: "#FFFFFF",
                                                    color: "#64748B",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {!isAllChecked && (
                                        <span style={{ fontSize: 11, color: "#64748B" }}>
                                            Check all items to submit
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        disabled={!isAllChecked || submitting}
                                        onClick={() => setConfirmModalOpen(true)}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            padding: "7px 16px",
                                            borderRadius: 7,
                                            border: "none",
                                            background: isAllChecked ? "#16A34A" : "#CBD5E1",
                                            color: "#FFFFFF",
                                            cursor: isAllChecked ? "pointer" : "not-allowed",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                            boxShadow: isAllChecked ? "0 2px 4px rgba(22, 163, 74, 0.25)" : "none",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        {submitting ? (
                                            <>
                                                <svg
                                                    className="animate-spin"
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                >
                                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                                    <path d="M12 2a10 10 0 0110 10" />
                                                </svg>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Submit to Tools Man
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {renderToolSection(
                            "Hand Tools",
                            <WrenchIcon size={15} color="#2563EB" />,
                            "#EAF2FF",
                            "#2563EB",
                            issuedHandTools
                        )}
                        {renderToolSection(
                            "Power Tools",
                            <ZapIcon size={15} color="#10213F" />,
                            "#EAF2FF",
                            "#10213F",
                            issuedPowerTools
                        )}

                        {/* Consumable Materials Return Section */}
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
                                    <PackageIcon size={15} color="#B45309" />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                        Consumable Materials (Return Unused Quantity)
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        background: "#FFFBEB",
                                        color: "#B45309",
                                    }}
                                >
                                    {issuedMaterials.length}
                                </span>
                            </div>

                            {issuedMaterials.length === 0 ? (
                                <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                                    No consumable materials currently issued on active approved checklists.
                                </div>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                                                {["Material", "Booking", "Issued", "Used / Returned", "Return Qty to Inventory"].map((h) => (
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
                                            {issuedMaterials.map((mat) => {
                                                const approvedQty = Number(mat.quantity_approved ?? mat.quantity_requested ?? 1);
                                                const returnedQty = Number(mat.quantity_returned ?? 0);
                                                const usedQty = Math.max(0, approvedQty - returnedQty);
                                                const draftQty = materialReturnQtys[mat.id] !== undefined ? materialReturnQtys[mat.id] : returnedQty;
                                                return (
                                                    <tr key={`${mat.checklist_id}-${mat.id}`} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                                            {mat.item_name}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>
                                                                #{mat.booking_id} · {mat.client_name}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: "#64748B" }}>
                                                                {mat.service_name}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                                            {approvedQty} {mat.unit || "pcs"}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", fontSize: 12 }}>
                                                            <span style={{ fontWeight: 700, color: returnedQty > 0 ? "#15803D" : "#475569" }}>
                                                                {usedQty} used · {returnedQty} returned
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={approvedQty}
                                                                    value={draftQty}
                                                                    disabled={returningMaterialId === mat.id}
                                                                    onChange={(e) =>
                                                                        setMaterialReturnQtys((prev) => ({
                                                                            ...prev,
                                                                            [mat.id]: Math.max(0, Math.min(approvedQty, parseInt(e.target.value || "0", 10) || 0)),
                                                                        }))
                                                                    }
                                                                    style={{
                                                                        width: 60,
                                                                        padding: "4px 8px",
                                                                        borderRadius: 6,
                                                                        border: "1px solid #CBD5E1",
                                                                        fontSize: 12,
                                                                        fontWeight: 700,
                                                                        textAlign: "center",
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={returningMaterialId === mat.id}
                                                                    onClick={() => handleReturnMaterialQty(mat, draftQty)}
                                                                    style={{
                                                                        padding: "5px 10px",
                                                                        borderRadius: 6,
                                                                        border: "1px solid #86EFAC",
                                                                        background: "#F0FDF4",
                                                                        color: "#15803D",
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        cursor: returningMaterialId === mat.id ? "not-allowed" : "pointer",
                                                                    }}
                                                                >
                                                                    {returningMaterialId === mat.id ? "Saving..." : "Return"}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
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
                            { key: "low_stock", label: `Low Stock (${lowStockCatalogCount})`, isLowStock: true },
                        ].map((cat) => {
                            const active = catalogCategoryFilter === cat.key;
                            const isLowBtn = Boolean(cat.isLowStock);
                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setCatalogCategoryFilter(cat.key)}
                                    style={{
                                        padding: "5px 12px",
                                        borderRadius: 6,
                                        border: active
                                            ? isLowBtn
                                                ? "1px solid #D97706"
                                                : "1px solid #3B82F6"
                                            : isLowBtn && lowStockCatalogCount > 0
                                            ? "1px solid #FDE68A"
                                            : "1px solid #E2E8F0",
                                        background: active
                                            ? isLowBtn
                                                ? "#FFFBEB"
                                                : "#EFF6FF"
                                            : isLowBtn && lowStockCatalogCount > 0
                                            ? "#FFFBEB"
                                            : "#FFFFFF",
                                        color: active
                                            ? isLowBtn
                                                ? "#B45309"
                                                : "#1D4ED8"
                                            : isLowBtn && lowStockCatalogCount > 0
                                            ? "#D97706"
                                            : "#64748B",
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
                                                ? "#EAF2FF"
                                                : grp === "hand_tool"
                                                ? "#EAF2FF"
                                                : "#FFFBEB";
                                        const catColor =
                                            grp === "power_tool"
                                                ? "#10213F"
                                                : grp === "hand_tool"
                                                ? "#2563EB"
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

            {/* Checklist Submission Confirmation Modal */}
            <Modal
                show={confirmModalOpen}
                onClose={() => !submitting && setConfirmModalOpen(false)}
                title="Submit Checklist to Tools Man"
                maxWidth="sm"
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                        Submit condition inspection for <strong>{checkedCount}</strong> tools to Tools Man?
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        <div style={{ padding: "10px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#15803D" }}>{actionCounts.returned}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#166534" }}>Return</div>
                        </div>
                        <div style={{ padding: "10px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#DC2626" }}>{actionCounts.damaged}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#991B1B" }}>Damaged</div>
                        </div>
                        <div style={{ padding: "10px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#D97706" }}>{actionCounts.lost}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#92400E" }}>Lost</div>
                        </div>
                    </div>

                    <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
                        Tools Man will review the submitted items to complete and close the checklist.
                    </p>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={submitting}
                            onClick={() => setConfirmModalOpen(false)}
                            style={{ fontSize: 12 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSubmitChecklist}
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "8px 16px",
                                borderRadius: 7,
                                border: "none",
                                background: "#16A34A",
                                color: "#FFFFFF",
                                cursor: submitting ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            {submitting ? "Submitting..." : "Confirm & Submit"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
