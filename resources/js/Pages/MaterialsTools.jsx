import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../Components/Modal";
import StatusBadge from "../Components/StatusBadge";
import {
    INVENTORY_TYPE_OPTIONS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDate,
    normalizeInventoryItem,
} from "../utils/superAdmin";

const createEmptyForm = (itemType = "Material") => ({
    item_name: "",
    item_type: itemType,
    quantity_on_hand: "0",
    reorder_level: "0",
    unit: "",
});

function MaterialsTools({ addToast, onDataChanged }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState("materials");
    const [editorMode, setEditorMode] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    const [qtyAction, setQtyAction] = useState(null);
    const [qtyValue, setQtyValue] = useState("");
    const [updatingQty, setUpdatingQty] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchItems = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    SUPER_ADMIN_ENDPOINTS.inventory,
                );
                setItems(
                    (Array.isArray(data?.data) ? data.data : []).map(
                        normalizeInventoryItem,
                    ),
                );
            } catch (error) {
                addToast(
                    extractErrorMessage(
                        error,
                        "Unable to load inventory items.",
                    ),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const materials = useMemo(
        () => items.filter((item) => item.item_type !== "Tool"),
        [items],
    );
    const tools = useMemo(
        () => items.filter((item) => item.item_type === "Tool"),
        [items],
    );
    const lowStockItems = useMemo(
        () => items.filter((item) => item.low_stock),
        [items],
    );

    const openCreateModal = () => {
        setEditingItem(null);
        setForm(createEmptyForm(subTab === "tools" ? "Tool" : "Material"));
        setEditorMode("create");
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setForm({
            item_name: item.item_name ?? "",
            item_type: item.item_type ?? "Material",
            quantity_on_hand: String(item.quantity_on_hand ?? 0),
            reorder_level: String(item.reorder_level ?? 0),
            unit: item.unit ?? "",
        });
        setEditorMode("edit");
    };

    const closeEditor = () => {
        if (saving) {
            return;
        }

        setEditorMode(null);
        setEditingItem(null);
        setForm(createEmptyForm());
    };

    const handleSave = async () => {
        if (saving) {
            return;
        }

        setSaving(true);

        const payload = {
            item_name: form.item_name.trim(),
            item_type: form.item_type,
            quantity_on_hand: Math.max(0, Number(form.quantity_on_hand || 0)),
            reorder_level: Math.max(0, Number(form.reorder_level || 0)),
            unit: form.unit.trim(),
        };

        try {
            const response =
                editorMode === "edit" && editingItem
                    ? await window.axios.patch(
                          SUPER_ADMIN_ENDPOINTS.updateInventory(
                              editingItem.item_id,
                          ),
                          payload,
                      )
                    : await window.axios.post(
                          SUPER_ADMIN_ENDPOINTS.inventory,
                          payload,
                      );

            addToast(
                response?.data?.message ||
                    (editorMode === "edit"
                        ? "Inventory item updated successfully."
                        : "Inventory item created successfully."),
            );
            setEditorMode(null);
            setEditingItem(null);
            setForm(createEmptyForm());
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    editorMode === "edit"
                        ? "Unable to update the inventory item."
                        : "Unable to create the inventory item.",
                ),
                "error",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleQtyUpdate = async () => {
        if (updatingQty || !qtyAction) {
            return;
        }

        const amount = Number(qtyValue);

        if (!Number.isFinite(amount) || amount <= 0) {
            addToast("Enter a valid quantity greater than zero.", "error");
            return;
        }

        setUpdatingQty(true);

        try {
            const nextQuantity =
                qtyAction.mode === "add"
                    ? qtyAction.item.quantity_on_hand + amount
                    : Math.max(0, qtyAction.item.quantity_on_hand - amount);

            const { data } = await window.axios.patch(
                SUPER_ADMIN_ENDPOINTS.updateInventory(qtyAction.item.item_id),
                {
                    quantity_on_hand: nextQuantity,
                },
            );

            addToast(data?.message || "Inventory quantity updated successfully.");
            setQtyAction(null);
            setQtyValue("");
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    "Unable to update the item quantity.",
                ),
                "error",
            );
        } finally {
            setUpdatingQty(false);
        }
    };

    const handleDelete = async () => {
        if (deleting || !deleteTarget) {
            return;
        }

        setDeleting(true);

        try {
            const { data } = await window.axios.delete(
                SUPER_ADMIN_ENDPOINTS.deleteInventory(deleteTarget.item_id),
            );
            addToast(data?.message || "Inventory item deleted successfully.");
            setDeleteTarget(null);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    "Unable to delete the inventory item.",
                ),
                "error",
            );
        } finally {
            setDeleting(false);
        }
    };

    const displayItems = subTab === "tools" ? tools : materials;

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Materials & Tools Inventory
                    </h1>
                    <p className="page-subtitle">
                        {items.length} items tracked · {lowStockItems.length} low
                        stock alerts
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-secondary" onClick={() => fetchItems()}>
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={openCreateModal}>
                        + Add Inventory Item
                    </button>
                </div>
            </div>

            {lowStockItems.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        marginBottom: 20,
                        background: "rgba(245,138,7,0.08)",
                        border: "1px solid rgba(245,138,7,0.25)",
                    }}
                >
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                        <p
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#D97706",
                            }}
                        >
                            Low Stock Alert
                        </p>
                        <p style={{ fontSize: 12, color: "#6B7280" }}>
                            {lowStockItems.map((item) => item.item_name).join(" · ")}
                            {" — "}at or below reorder level
                        </p>
                    </div>
                </div>
            )}

            <div
                className="tab-bar"
                style={{ marginBottom: 20, display: "inline-flex" }}
            >
                <button
                    className={`tab-item ${subTab === "materials" ? "active" : ""}`}
                    onClick={() => setSubTab("materials")}
                >
                    Materials & Spare Parts ({materials.length})
                </button>
                <button
                    className={`tab-item ${subTab === "tools" ? "active" : ""}`}
                    onClick={() => setSubTab("tools")}
                >
                    Tools ({tools.length})
                </button>
            </div>

            <div className="card" style={{ padding: 20 }}>
                {loading ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        Loading inventory items...
                    </div>
                ) : displayItems.length === 0 ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        No inventory items are available in this view.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 960,
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "ID",
                                        subTab === "tools"
                                            ? "Tool Name"
                                            : "Item Name",
                                        subTab === "tools" ? "Category" : "Type",
                                        "Qty on Hand",
                                        "Reorder Level",
                                        "Unit",
                                        "Last Updated",
                                        "Actions",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                letterSpacing: "0.05em",
                                                textTransform: "uppercase",
                                                color: "#6B7280",
                                                whiteSpace: "nowrap",
                                                borderBottom:
                                                    "1px solid #EAECF0",
                                            }}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map((item) => (
                                    <tr
                                        key={item.item_id}
                                        style={{ borderTop: "1px solid #F5F7FA" }}
                                        onMouseEnter={(event) => {
                                            event.currentTarget.style.background =
                                                "rgba(63,125,255,0.04)";
                                        }}
                                        onMouseLeave={(event) => {
                                            event.currentTarget.style.background =
                                                "transparent";
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            #{item.item_id}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                color: "#1E2F5F",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {item.item_name}
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <StatusBadge status={item.item_type} />
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: item.low_stock
                                                    ? "#D97706"
                                                    : "#16A34A",
                                            }}
                                        >
                                            {item.quantity_on_hand}
                                            {item.low_stock && (
                                                <span
                                                    style={{
                                                        marginLeft: 8,
                                                        fontSize: 10,
                                                        color: "#D97706",
                                                    }}
                                                >
                                                    LOW
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            {item.reorder_level}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                            }}
                                        >
                                            {item.unit}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            {formatDate(item.last_updated)}
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <button
                                                    className="btn-primary"
                                                    style={{
                                                        padding: "4px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() => {
                                                        setQtyAction({
                                                            item,
                                                            mode: "add",
                                                        });
                                                        setQtyValue("");
                                                    }}
                                                >
                                                    + Add
                                                </button>
                                                <button
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: "4px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() => {
                                                        setQtyAction({
                                                            item,
                                                            mode: "reduce",
                                                        });
                                                        setQtyValue("");
                                                    }}
                                                >
                                                    − Reduce
                                                </button>
                                                <button
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: "4px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() => openEditModal(item)}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btn-danger"
                                                    style={{
                                                        padding: "4px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() =>
                                                        setDeleteTarget(item)
                                                    }
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                open={!!editorMode}
                title={
                    editorMode === "edit"
                        ? "Edit Inventory Item"
                        : "Add Inventory Item"
                }
                message={
                    editorMode === "edit"
                        ? "Update the saved inventory values below."
                        : "Enter the details for the new inventory item."
                }
                confirmLabel={saving ? "Saving..." : "Save Item"}
                confirmDisabled={saving}
                maxWidth={620}
                onConfirm={handleSave}
                onCancel={closeEditor}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                        gap: 16,
                    }}
                >
                    <div style={{ gridColumn: "1 / -1" }}>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Item Name
                        </p>
                        <input
                            className="input-field"
                            placeholder="e.g. Refrigerant R410A (1kg)"
                            value={form.item_name}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    item_name: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Item Type
                        </p>
                        <select
                            className="input-field"
                            value={form.item_type}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    item_type: event.target.value,
                                }))
                            }
                        >
                            {INVENTORY_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Unit
                        </p>
                        <input
                            className="input-field"
                            placeholder="e.g. pcs / set / can"
                            value={form.unit}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    unit: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Quantity on Hand
                        </p>
                        <input
                            type="number"
                            min="0"
                            className="input-field"
                            value={form.quantity_on_hand}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    quantity_on_hand: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Reorder Level
                        </p>
                        <input
                            type="number"
                            min="0"
                            className="input-field"
                            value={form.reorder_level}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    reorder_level: event.target.value,
                                }))
                            }
                        />
                    </div>
                </div>
            </Modal>

            <Modal
                open={!!qtyAction}
                title={
                    qtyAction
                        ? `${qtyAction.mode === "add" ? "Add" : "Reduce"} Quantity`
                        : "Update Quantity"
                }
                message={
                    qtyAction
                        ? `${qtyAction.item.item_name} currently has ${qtyAction.item.quantity_on_hand} ${qtyAction.item.unit} on hand.`
                        : ""
                }
                confirmLabel={updatingQty ? "Updating..." : "Update Quantity"}
                confirmDisabled={updatingQty}
                onConfirm={handleQtyUpdate}
                onCancel={() => {
                    if (!updatingQty) {
                        setQtyAction(null);
                        setQtyValue("");
                    }
                }}
            >
                <div>
                    <p className="section-label" style={{ marginBottom: 6 }}>
                        Quantity to {qtyAction?.mode === "add" ? "add" : "reduce"}
                    </p>
                    <input
                        type="number"
                        min="1"
                        className="input-field"
                        placeholder="Enter quantity"
                        value={qtyValue}
                        onChange={(event) => setQtyValue(event.target.value)}
                    />
                </div>
            </Modal>

            <Modal
                open={!!deleteTarget}
                title="Delete Inventory Item?"
                message={`Remove "${deleteTarget?.item_name}" from inventory records? This cannot be undone.`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />
        </div>
    );
}

export default MaterialsTools;
