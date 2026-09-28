import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    TECHNICIAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

export default function TechnicianTools({ addToast, onNavigate }) {
    const [viewTab, setViewTab] = useState("checklists"); // 'checklists' | 'catalog'
    const [checklists, setChecklists] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [assignedBookings, setAssignedBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Creating / Editing Checklist
    const [checklistModalOpen, setChecklistModalOpen] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState(null);
    const [savingChecklist, setSavingChecklist] = useState(false);

    // Checklist Form State
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [checklistNotes, setChecklistNotes] = useState("");
    // selectedItems is a map of item_id -> { selected: boolean, quantity: number, notes: string }
    const [selectedItemsMap, setSelectedItemsMap] = useState({});
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogTypeFilter, setCatalogTypeFilter] = useState("All");

    // Modal state for viewing checklist details
    const [viewChecklistModal, setViewChecklistModal] = useState(null);

    // Fetch checklists
    const fetchChecklists = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.checklists);
            setChecklists(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load task checklists."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Fetch catalog (view-only catalog & item picker)
    const fetchCatalog = useCallback(async () => {
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.availableCatalog);
            setCatalog(Array.isArray(data?.data) ? data.data : []);
        } catch {
            // non-blocking
        }
    }, []);

    // Fetch technician's assigned bookings to populate the task dropdown
    const fetchAssignedBookings = useCallback(async () => {
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.bookings);
            const list = Array.isArray(data?.data) ? data.data : [];
            // Task Requirement: Bookings assigned to this technician (Lead, Assistant, or legacy) by the manager
            const activeTasks = list.filter((b) =>
                (Boolean(b.lead_technician_id) || Boolean(b.assistant_technician_id) || Boolean(b.assigned_tech_id) || Boolean(b.assigned_team_id)) &&
                ["Approved", "Dispatched", "In-Progress"].includes(b.booking_status),
            );
            setAssignedBookings(activeTasks);
        } catch {
            // non-blocking
        }
    }, []);

    useEffect(() => {
        fetchChecklists();
        fetchCatalog();
        fetchAssignedBookings();
    }, [fetchChecklists, fetchCatalog, fetchAssignedBookings]);

    // Check if there was a pre-selected booking passed from "Choose Task & Prepare Checklist" in Jobs
    useEffect(() => {
        const storedBooking = localStorage.getItem("cooling_tower_selected_booking_checklist");
        if (storedBooking) {
            try {
                const parsed = JSON.parse(storedBooking);
                if (parsed?.booking_id) {
                    setSelectedBookingId(String(parsed.booking_id));
                    setEditingChecklist(null);
                    setChecklistNotes("");
                    setSelectedItemsMap({});
                    setChecklistModalOpen(true);
                }
            } catch {
                // ignore JSON parse error
            } finally {
                localStorage.removeItem("cooling_tower_selected_booking_checklist");
            }
        }
    }, []);

    const openCreateChecklistModal = (prefillBookingId = "") => {
        if (assignedBookings.length === 0) {
            addToast("You cannot create a checklist until the manager assigns a service booking to you.", "error");
            return;
        }
        setEditingChecklist(null);
        setSelectedBookingId(prefillBookingId || (assignedBookings[0] ? String(assignedBookings[0].booking_id) : ""));
        setChecklistNotes("");
        setSelectedItemsMap({});
        setChecklistModalOpen(true);
    };

    const openEditChecklistModal = (checklist) => {
        if (checklist.status !== "Pending") {
            addToast("This checklist is approved and locked. Only Tools Man can modify it.", "error");
            return;
        }
        setEditingChecklist(checklist);
        setSelectedBookingId(String(checklist.booking_id));
        setChecklistNotes(checklist.notes || "");

        // Prepopulate selectedItemsMap from checklist.items
        const newMap = {};
        if (Array.isArray(checklist.items)) {
            checklist.items.forEach((item) => {
                newMap[item.item_id] = {
                    selected: true,
                    quantity: item.quantity_requested || 1,
                    notes: item.notes || "",
                };
            });
        }
        setSelectedItemsMap(newMap);
        setChecklistModalOpen(true);
    };

    const toggleItemSelection = (itemOrId) => {
        const itemId = typeof itemOrId === "object" && itemOrId !== null ? itemOrId.item_id : itemOrId;
        const catalogItem = typeof itemOrId === "object" && itemOrId !== null ? itemOrId : catalog.find((c) => c.item_id === itemId);

        if (catalogItem) {
            const statusLower = (catalogItem.status || "").toLowerCase();
            const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
            const isBorrowed = statusLower === "borrowed";
            const isOutOfStock = Number(catalogItem.quantity_on_hand) <= 0;

            if (!catalogItem.is_available || isDamaged || isBorrowed || isOutOfStock) {
                const reason = isDamaged
                    ? "damaged or broken"
                    : isBorrowed
                    ? "currently borrowed / in use"
                    : "out of stock";
                addToast(`"${catalogItem.item_name}" is ${reason} and cannot be selected.`, "error");
                return;
            }
        }

        setSelectedItemsMap((prev) => {
            const current = prev[itemId];
            if (current && current.selected) {
                const updated = { ...prev };
                delete updated[itemId];
                return updated;
            }
            return {
                ...prev,
                [itemId]: {
                    selected: true,
                    quantity: 1,
                    notes: "",
                },
            };
        });
    };

    const updateItemQuantity = (itemId, qty, maxStock) => {
        const parsed = parseInt(qty, 10);
        const validQty = isNaN(parsed) || parsed < 1 ? 1 : maxStock ? Math.min(parsed, maxStock) : parsed;
        setSelectedItemsMap((prev) => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                quantity: validQty,
            },
        }));
    };

    const handleSaveChecklist = async () => {
        if (!selectedBookingId) {
            addToast("Please select an assigned task/booking.", "error");
            return;
        }

        const selectedItemIds = Object.keys(selectedItemsMap).filter(
            (id) => selectedItemsMap[id]?.selected,
        );

        if (selectedItemIds.length === 0) {
            addToast("Please select at least one tool or material for this checklist.", "error");
            return;
        }

        // Validate availability of all selected items
        for (const id of selectedItemIds) {
            const catItem = catalog.find((c) => c.item_id === Number(id));
            if (catItem) {
                const statusLower = (catItem.status || "").toLowerCase();
                const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                const isBorrowed = statusLower === "borrowed";
                const isOutOfStock = Number(catItem.quantity_on_hand) <= 0;

                if (!catItem.is_available || isDamaged || isBorrowed || isOutOfStock) {
                    const reason = isDamaged ? "damaged/broken" : isBorrowed ? "currently in use" : "out of stock";
                    addToast(`Cannot submit checklist: "${catItem.item_name}" is ${reason}. Please uncheck it before submitting.`, "error");
                    return;
                }
            }
        }

        const itemsPayload = selectedItemIds.map((id) => ({
            item_id: Number(id),
            quantity: selectedItemsMap[id].quantity || 1,
            notes: selectedItemsMap[id].notes || null,
        }));

        setSavingChecklist(true);
        try {
            if (editingChecklist) {
                const url = TECHNICIAN_ENDPOINTS.updateChecklist(editingChecklist.checklist_id);
                const { data } = await window.axios.patch(url, {
                    notes: checklistNotes,
                    items: itemsPayload,
                });
                addToast(data?.message || "Checklist updated successfully.");
            } else {
                const url = TECHNICIAN_ENDPOINTS.storeChecklist;
                const { data } = await window.axios.post(url, {
                    booking_id: Number(selectedBookingId),
                    notes: checklistNotes,
                    items: itemsPayload,
                });
                addToast(data?.message || "Task checklist submitted to Tools Man for review.");
            }

            setChecklistModalOpen(false);
            await fetchChecklists(false);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to save checklist."), "error");
        } finally {
            setSavingChecklist(false);
        }
    };

    // Filter catalog items for picker & view-only table
    const filteredCatalog = useMemo(() => {
        return catalog.filter((item) => {
            const matchesSearch =
                !catalogSearch.trim() ||
                item.item_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                (item.tool_subtype && item.tool_subtype.toLowerCase().includes(catalogSearch.toLowerCase())) ||
                (item.serial_number && item.serial_number.toLowerCase().includes(catalogSearch.toLowerCase()));

            const matchesType =
                catalogTypeFilter === "All" ||
                item.item_type === catalogTypeFilter;

            return matchesSearch && matchesType;
        });
    }, [catalog, catalogSearch, catalogTypeFilter]);

    const selectedItemsCount = useMemo(() => {
        return Object.values(selectedItemsMap).filter((item) => item?.selected).length;
    }, [selectedItemsMap]);

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">My Tools & Checklists</h1>
                    <p className="page-subtitle">
                        Create multi-item task checklists, track custody, and browse the inventory catalog
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="btn-secondary" onClick={() => { fetchChecklists(); fetchCatalog(); }}>
                        Refresh
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => openCreateChecklistModal()}
                    >
                        + Create Task Checklist
                    </button>
                </div>
            </div>

            {/* Navigation Switcher */}
            <div className="tab-bar" style={{ marginBottom: 20, display: "inline-flex" }}>
                <button
                    className={`tab-item ${viewTab === "checklists" ? "active" : ""}`}
                    onClick={() => setViewTab("checklists")}
                >
                    📋 Task Checklists
                    <span style={{ marginLeft: 6, fontSize: 10, color: viewTab === "checklists" ? "#3F7DFF" : "#9CA3AF" }}>
                        {checklists.length}
                    </span>
                </button>
                <button
                    className={`tab-item ${viewTab === "catalog" ? "active" : ""}`}
                    onClick={() => setViewTab("catalog")}
                >
                    🔒 Inventory Catalog (View-Only)
                    <span style={{ marginLeft: 6, fontSize: 10, color: viewTab === "catalog" ? "#3F7DFF" : "#9CA3AF" }}>
                        {catalog.length}
                    </span>
                </button>
            </div>

            {/* View 1: Task Checklists */}
            {viewTab === "checklists" && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                        <div>
                            <p className="section-label" style={{ margin: 0 }}>
                                Checklists Created for Assigned Tasks
                            </p>
                            <span style={{ fontSize: 12, color: "#64748B" }}>
                                Tools Man reviews and issues tools. While Pending, you may edit items. Once Approved, only Tools Man can add/modify items.
                            </span>
                        </div>
                    </div>

                    {/* Task Assignment Status Notice */}
                    {assignedBookings.length === 0 && (
                        <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1E40AF" }}>
                            <span style={{ fontSize: 18 }}>ℹ️</span>
                            <div>
                                <strong>Manager Assignment Required:</strong> Technicians can create a tool checklist once a task is assigned to them by the manager. Once a booking is assigned to you, it will appear here for checklist preparation.
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
                            Loading task checklists...
                        </div>
                    ) : checklists.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                            <p style={{ fontWeight: 600, margin: "0 0 6px", color: "#1E2F5F" }}>
                                No task checklists created yet
                            </p>
                            <p style={{ fontSize: 12, margin: "0 0 16px" }}>
                                Choose an assigned task to create a checklist and request tools/materials from the Tools Man.
                            </p>
                            <button className="btn-primary" onClick={() => openCreateChecklistModal()}>
                                + Create Your First Checklist
                            </button>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#F8FAFC" }}>
                                        {[
                                            "Checklist ID",
                                            "Assigned Task",
                                            "Customer",
                                            "Team / Tech",
                                            "Items Count",
                                            "Status",
                                            "Date",
                                            "Actions",
                                        ].map((heading) => (
                                            <th
                                                key={heading}
                                                style={{
                                                    padding: "10px 14px",
                                                    textAlign: "left",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "#6B7280",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    borderBottom: "1px solid #EAECF0",
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {checklists.map((cl) => {
                                        const isPending = cl.status === "Pending";
                                        const isApproved = cl.status === "Approved";
                                        const isCompleted = cl.status === "Completed";

                                        return (
                                            <tr key={cl.checklist_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#3F7DFF" }}>
                                                    #{cl.checklist_id}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 13, color: "#1E2F5F" }}>
                                                    <strong>Booking #{cl.booking_id}</strong>
                                                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                                                        {cl.service_name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>
                                                    {cl.client_name}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12 }}>
                                                    {cl.team_name ? (
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1D4ED8", fontWeight: 600 }}>
                                                            👥 {cl.team_name}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#4B5563" }}>
                                                            👤 {cl.technician_name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151", fontWeight: 600 }}>
                                                    📦 {cl.total_items_count} items
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <StatusBadge status={cl.status} />
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 11, color: "#9CA3AF" }}>
                                                    {formatDateTime(cl.created_at)}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ padding: "5px 10px", fontSize: 11 }}
                                                            onClick={() => setViewChecklistModal(cl)}
                                                        >
                                                            👁 Items
                                                        </button>
                                                        {isPending ? (
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: "5px 10px", fontSize: 11 }}
                                                                onClick={() => openEditChecklistModal(cl)}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#9CA3AF",
                                                                    background: "#F3F4F6",
                                                                    padding: "4px 8px",
                                                                    borderRadius: 6,
                                                                    cursor: "help",
                                                                }}
                                                                title="Approved checklists are locked for technicians. Only Tools Man can modify items."
                                                            >
                                                                🔒 Locked
                                                            </span>
                                                        )}
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
            )}

            {/* View 2: View-Only Inventory Catalog */}
            {viewTab === "catalog" && (
                <div className="card" style={{ padding: 20 }}>
                    {/* Strict View-Only Notice Banner */}
                    <div
                        style={{
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            borderRadius: 10,
                            padding: "12px 16px",
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        <span style={{ fontSize: 24 }}>🔒</span>
                        <div>
                            <strong style={{ color: "#991B1B", fontSize: 13, display: "block" }}>
                                View-Only Equipment & Material Inventory
                            </strong>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#B91C1C", lineHeight: 1.4 }}>
                                Technicians cannot checkout or assign tools or materials directly from inventory.
                                To request tools, select an assigned task and submit a <strong>Task Checklist</strong>. Tools Man will review, approve, and issue the items.
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                            flexWrap: "wrap",
                            gap: 10,
                        }}
                    >
                        <div style={{ display: "flex", gap: 8 }}>
                            {["All", "Tool", "Material"].map((t) => (
                                <button
                                    key={t}
                                    className={`tab-item ${catalogTypeFilter === t ? "active" : ""}`}
                                    style={{ padding: "6px 14px", fontSize: 12 }}
                                    onClick={() => setCatalogTypeFilter(t)}
                                >
                                    {t === "All" ? "All Items" : `${t}s`}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Search catalog by name or code..."
                            className="input-field"
                            style={{ maxWidth: 280, padding: "7px 12px", fontSize: 13 }}
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {["Item Name", "Type", "Subtype / Spec", "Serial / Code", "Stock (Avail / Total)", "Status", "Request Mode"].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#6B7280",
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
                                {filteredCatalog.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#9CA3AF" }}>
                                            No inventory items match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCatalog.map((item) => {
                                        const statusLower = (item.status || "").toLowerCase();
                                        const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                        const isBorrowed = statusLower === "borrowed";
                                        const isOutOfStock = Number(item.quantity_on_hand) <= 0;

                                        return (
                                            <tr key={item.item_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                                    {item.item_name}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12 }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "2px 8px",
                                                            borderRadius: 6,
                                                            background: item.item_type === "Tool" ? "#EFF6FF" : "#FEF3C7",
                                                            color: item.item_type === "Tool" ? "#1E40AF" : "#92400E",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {item.item_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                                    {item.tool_subtype || item.unit || "—"}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                                    {item.serial_number || "—"}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 13 }}>
                                                    <span style={{ fontWeight: 700, color: item.quantity_on_hand > 0 ? "#10B981" : "#EF4444" }}>
                                                        {item.quantity_on_hand}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: "#64748B" }}>
                                                        {" "}/ {item.initial_stock || item.quantity_on_hand} {item.unit || "pcs"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    {isDamaged ? (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#FEE2E2", color: "#DC2626", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            ⚠️ Damaged / Lost
                                                        </span>
                                                    ) : isBorrowed ? (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#DBEAFE", color: "#1E40AF", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            In Use / Borrowed
                                                        </span>
                                                    ) : isOutOfStock ? (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#FEF3C7", color: "#D97706", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            ⚠️ Out of Stock
                                                        </span>
                                                    ) : (
                                                        <StatusBadge status={item.status} />
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 11, color: "#64748B" }}>
                                                    <span style={{ background: "#F1F5F9", padding: "3px 8px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                                                        📋 Via Task Checklist
                                                    </span>
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

            {/* Create / Edit Checklist Modal */}
            <Modal
                open={checklistModalOpen}
                title={editingChecklist ? `Edit Checklist #${editingChecklist.checklist_id}` : "Create New Task Checklist"}
                message="Select an assigned task, multi-select required tools and materials with quantities, and submit for Tools Man approval."
                confirmLabel={savingChecklist ? "Submitting..." : editingChecklist ? "Update Checklist" : "Submit Checklist"}
                confirmDisabled={savingChecklist || !selectedBookingId || selectedItemsCount === 0}
                maxWidth={720}
                onConfirm={handleSaveChecklist}
                onCancel={() => !savingChecklist && setChecklistModalOpen(false)}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Step 1: Select Task Booking */}
                    <div>
                        <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                            Assigned Task / Booking (Required)
                        </label>
                        {assignedBookings.length === 0 ? (
                            <div style={{ padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#991B1B", fontSize: 13 }}>
                                ⚠️ <strong>No Assigned Tasks:</strong> You can create a checklist once a service booking is assigned to you by the manager.
                            </div>
                        ) : (
                            <select
                                className="input-field"
                                value={selectedBookingId}
                                onChange={(e) => setSelectedBookingId(e.target.value)}
                                disabled={!!editingChecklist}
                            >
                                <option value="">Select an assigned service task</option>
                                {assignedBookings.map((b) => (
                                    <option key={b.booking_id} value={b.booking_id}>
                                        Booking #{b.booking_id} · {b.client_name} — {b.service || b.service_name} ({b.assigned_team_name ? `Team: ${b.assigned_team_name}` : "Assigned Team"}) [{b.booking_status}]
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Step 2: Multi-Item Selection Table */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                            <label className="section-label" style={{ margin: 0 }}>
                                Select Tools & Materials ({selectedItemsCount} selected)
                            </label>
                            <input
                                type="text"
                                placeholder="Search items..."
                                className="input-field"
                                style={{ maxWidth: 200, padding: "5px 10px", fontSize: 12 }}
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                            />
                        </div>

                        <div
                            style={{
                                maxHeight: 260,
                                overflowY: "auto",
                                border: "1px solid #E5E7EB",
                                borderRadius: 10,
                                background: "#F9FAFB",
                                padding: 8,
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                            }}
                        >
                            {filteredCatalog.length === 0 ? (
                                <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", margin: "16px 0" }}>
                                    No available tools or materials found.
                                </p>
                            ) : (
                                filteredCatalog.map((item) => {
                                    const entry = selectedItemsMap[item.item_id];
                                    const isSelected = !!entry?.selected;
                                    const qty = entry?.quantity || 1;

                                    const statusLower = (item.status || "").toLowerCase();
                                    const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                    const isBorrowed = statusLower === "borrowed";
                                    const isOutOfStock = Number(item.quantity_on_hand) <= 0;
                                    const isUnavailable = !item.is_available || isDamaged || isBorrowed || isOutOfStock;

                                    return (
                                        <div
                                            key={item.item_id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                background: isUnavailable ? "#F8FAFC" : isSelected ? "#EFF6FF" : "#FFFFFF",
                                                border: `1px solid ${isUnavailable ? "#E2E8F0" : isSelected ? "#93C5FD" : "#E5E7EB"}`,
                                                gap: 12,
                                                opacity: isUnavailable ? 0.68 : 1,
                                                cursor: isUnavailable ? "not-allowed" : "default",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    cursor: isUnavailable ? "not-allowed" : "pointer",
                                                    flex: 1,
                                                }}
                                                onClick={() => !isUnavailable && toggleItemSelection(item)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected && !isUnavailable}
                                                    disabled={isUnavailable}
                                                    onChange={() => {}} // handled by parent onClick
                                                    style={{ cursor: isUnavailable ? "not-allowed" : "pointer", width: 16, height: 16 }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isUnavailable ? "#64748B" : "#1E2F5F" }}>
                                                            {item.item_name}
                                                        </span>
                                                        {isDamaged && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#FEE2E2", color: "#DC2626" }}>
                                                                ⚠️ Damaged / Broken — Unavailable
                                                            </span>
                                                        )}
                                                        {isBorrowed && !isDamaged && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#DBEAFE", color: "#1E40AF" }}>
                                                                ⚠️ In Use / Borrowed
                                                            </span>
                                                        )}
                                                        {isOutOfStock && !isDamaged && !isBorrowed && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#FEF3C7", color: "#D97706" }}>
                                                                ⚠️ Out of Stock — Unavailable
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                                                        <span style={{ fontWeight: 600, color: item.item_type === "Tool" ? "#2563EB" : "#D97706" }}>
                                                            {item.item_type}
                                                        </span>
                                                        {item.tool_subtype ? ` · ${item.tool_subtype}` : ""}
                                                        {item.serial_number ? ` · S/N: ${item.serial_number}` : ""}
                                                        <span style={{ marginLeft: 6, fontWeight: 600, color: item.quantity_on_hand > 0 ? "#059669" : "#DC2626" }}>
                                                            · Available: {item.quantity_on_hand} / Total: {item.initial_stock || item.quantity_on_hand} {item.unit || "pcs"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && !isUnavailable && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Qty:</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={item.quantity_on_hand || 99}
                                                        value={qty}
                                                        className="input-field"
                                                        style={{ width: 68, padding: "4px 8px", fontSize: 12, textAlign: "center" }}
                                                        onChange={(e) => updateItemQuantity(item.item_id, e.target.value, item.quantity_on_hand)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Step 3: Notes / Reason */}
                    <div>
                        <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                            Checklist Notes / Instructions (Optional)
                        </label>
                        <textarea
                            className="input-field"
                            rows={2}
                            placeholder="e.g. Special tools required for rooftop chiller fan blade overhaul."
                            value={checklistNotes}
                            onChange={(e) => setChecklistNotes(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>

            {/* View Checklist Details Modal */}
            <Modal
                open={!!viewChecklistModal}
                title={`Checklist #${viewChecklistModal?.checklist_id} Items`}
                message={`Items requested for Booking #${viewChecklistModal?.booking_id} (${viewChecklistModal?.client_name})`}
                confirmLabel="Close"
                maxWidth={620}
                onConfirm={() => setViewChecklistModal(null)}
                onCancel={() => setViewChecklistModal(null)}
            >
                {viewChecklistModal && (
                    <div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                padding: "10px 14px",
                                borderRadius: 8,
                                fontSize: 12,
                                marginBottom: 14,
                            }}
                        >
                            <div>
                                <span>Status: </span>
                                <StatusBadge status={viewChecklistModal.status} />
                            </div>
                            <div>
                                <span>Service: </span>
                                <strong style={{ color: "#1E2F5F" }}>{viewChecklistModal.service_name}</strong>
                            </div>
                        </div>

                        {viewChecklistModal.notes && (
                            <p style={{ fontSize: 12, color: "#475569", background: "#F1F5F9", padding: "8px 12px", borderRadius: 8, margin: "0 0 14px" }}>
                                💬 <strong>Technician Note:</strong> {viewChecklistModal.notes}
                            </p>
                        )}

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#F1F5F9" }}>
                                        {["Item Name", "Type", "Requested", "Approved", "Item Status"].map((h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    padding: "8px 10px",
                                                    textAlign: "left",
                                                    fontSize: 11,
                                                    fontWeight: 600,
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
                                    {Array.isArray(viewChecklistModal.items) && viewChecklistModal.items.length > 0 ? (
                                        viewChecklistModal.items.map((item) => (
                                            <tr key={item.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                                                <td style={{ padding: "10px", fontSize: 12, fontWeight: 600, color: "#1E2F5F" }}>
                                                    {item.item_name}
                                                    {item.serial_number && (
                                                        <div style={{ fontSize: 10, color: "#9CA3AF" }}>S/N: {item.serial_number}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "10px", fontSize: 11 }}>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: 4,
                                                        background: item.item_type === "Tool" ? "#EFF6FF" : "#FEF3C7",
                                                        color: item.item_type === "Tool" ? "#1D4ED8" : "#B45309",
                                                        fontWeight: 600,
                                                    }}>
                                                        {item.item_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px", fontSize: 12, fontWeight: 600 }}>
                                                    {item.quantity_requested}
                                                </td>
                                                <td style={{ padding: "10px", fontSize: 12, fontWeight: 600, color: "#059669" }}>
                                                    {item.quantity_approved}
                                                </td>
                                                <td style={{ padding: "10px" }}>
                                                    {(item.item_type || "").toLowerCase() === "tool" ? (
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            padding: "2px 8px",
                                                            borderRadius: 6,
                                                            textTransform: "capitalize",
                                                            background:
                                                                item.status === "assigned" ? "#DBEAFE" :
                                                                item.status === "returned" ? "#D1FAE5" :
                                                                item.status === "damaged" ? "#FEE2E2" :
                                                                item.status === "lost" ? "#4B5563" : "#F3F4F6",
                                                            color:
                                                                item.status === "assigned" ? "#1E40AF" :
                                                                item.status === "returned" ? "#065F46" :
                                                                item.status === "damaged" ? "#991B1B" :
                                                                item.status === "lost" ? "#FFFFFF" : "#374151",
                                                        }}>
                                                            {item.status}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>
                                                            — (Consumable)
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 14, textAlign: "center", color: "#9CA3AF" }}>
                                                No items in this checklist.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
