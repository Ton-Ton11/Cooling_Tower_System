import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../Components/Modal";
import StatusBadge from "../Components/StatusBadge";
import {
    AC_STATUS_OPTIONS,
    AC_TYPE_OPTIONS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
    formatDate,
    normalizeAcUnit,
    toInputDate,
} from "../utils/superAdmin";

const createEmptyForm = () => ({
    brand: "",
    model: "",
    serial_number: "",
    horsepower: "",
    ac_type: "Split",
    refrigerant_type: "R32",
    supplier: "",
    purchase_price: "",
    selling_price: "",
    purchase_date: toInputDate(new Date()),
    warranty_period: "12",
    status: "Available",
});

function AcUnits({ addToast, onDataChanged }) {
    const [units, setUnits] = useState([]);
    const [subTab, setSubTab] = useState("all");
    const [loading, setLoading] = useState(true);
    const [editorMode, setEditorMode] = useState(null);
    const [editingUnit, setEditingUnit] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUnits = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    SUPER_ADMIN_ENDPOINTS.acUnits,
                );
                setUnits(
                    (Array.isArray(data?.data) ? data.data : []).map(
                        normalizeAcUnit,
                    ),
                );
            } catch (error) {
                addToast(
                    extractErrorMessage(error, "Unable to load AC units."),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const orderBaseUnits = useMemo(
        () => units.filter((unit) => unit.status === "Order Base"),
        [units],
    );
    const displayUnits = subTab === "order" ? orderBaseUnits : units;

    const openCreateModal = () => {
        setEditingUnit(null);
        setForm(createEmptyForm());
        setEditorMode("create");
    };

    const openEditModal = (unit) => {
        setEditingUnit(unit);
        setForm({
            brand: unit.brand ?? "",
            model: unit.model ?? "",
            serial_number: unit.serial_number ?? "",
            horsepower: String(unit.horsepower ?? ""),
            ac_type: unit.ac_type ?? "Split",
            refrigerant_type: unit.refrigerant_type ?? "",
            supplier: unit.supplier ?? "",
            purchase_price: String(unit.purchase_price ?? ""),
            selling_price:
                unit.selling_price === null || unit.selling_price === undefined
                    ? ""
                    : String(unit.selling_price),
            purchase_date: toInputDate(unit.purchase_date),
            warranty_period: String(unit.warranty_period ?? ""),
            status: unit.status ?? "Available",
        });
        setEditorMode("edit");
    };

    const closeEditor = () => {
        if (saving) {
            return;
        }

        setEditorMode(null);
        setEditingUnit(null);
        setForm(createEmptyForm());
    };

    const handleSave = async () => {
        if (saving) {
            return;
        }

        setSaving(true);

        const payload = {
            brand: form.brand.trim(),
            model: form.model.trim(),
            serial_number: form.serial_number.trim(),
            horsepower: Number(form.horsepower),
            ac_type: form.ac_type,
            refrigerant_type: form.refrigerant_type.trim() || null,
            supplier: form.supplier.trim() || null,
            purchase_price: Number(form.purchase_price),
            selling_price:
                form.selling_price === "" ? null : Number(form.selling_price),
            purchase_date: form.purchase_date,
            warranty_period: Number(form.warranty_period),
            status: form.status,
        };

        try {
            const response =
                editorMode === "edit" && editingUnit
                    ? await window.axios.patch(
                          SUPER_ADMIN_ENDPOINTS.updateAcUnit(
                              editingUnit.ac_unit_id,
                          ),
                          payload,
                      )
                    : await window.axios.post(
                          SUPER_ADMIN_ENDPOINTS.acUnits,
                          payload,
                      );

            addToast(
                response?.data?.message ||
                    (editorMode === "edit"
                        ? "AC unit updated successfully."
                        : "AC unit created successfully."),
            );
            setEditorMode(null);
            setEditingUnit(null);
            setForm(createEmptyForm());
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    editorMode === "edit"
                        ? "Unable to update the AC unit."
                        : "Unable to create the AC unit.",
                ),
                "error",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleting || !deleteTarget) {
            return;
        }

        setDeleting(true);

        try {
            const { data } = await window.axios.delete(
                SUPER_ADMIN_ENDPOINTS.deleteAcUnit(deleteTarget.ac_unit_id),
            );
            addToast(data?.message || "AC unit deleted successfully.");
            setDeleteTarget(null);
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to delete the AC unit."),
                "error",
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        AC Units Inventory
                    </h1>
                    <p className="page-subtitle">
                        {units.length} units tracked ·{" "}
                        {units.filter((unit) => unit.status === "Available").length}{" "}
                        available
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-secondary" onClick={() => fetchUnits()}>
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={openCreateModal}>
                        + Add AC Unit
                    </button>
                </div>
            </div>

            {orderBaseUnits.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        marginBottom: 20,
                        background: "rgba(245,138,7,0.08)",
                        border: "1px solid rgba(245,138,7,0.3)",
                    }}
                >
                    <span style={{ fontSize: 20 }}>📦</span>
                    <div>
                        <p
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#D97706",
                            }}
                        >
                            Stock Low / Order Base Required
                        </p>
                        <p style={{ fontSize: 12, color: "#6B7280" }}>
                            {orderBaseUnits.length} unit(s) are currently marked as
                            Order Base.
                        </p>
                    </div>
                </div>
            )}

            <div
                className="tab-bar"
                style={{ marginBottom: 20, display: "inline-flex" }}
            >
                <button
                    className={`tab-item ${subTab === "all" ? "active" : ""}`}
                    onClick={() => setSubTab("all")}
                >
                    All Units ({units.length})
                </button>
                <button
                    className={`tab-item ${subTab === "order" ? "active" : ""}`}
                    onClick={() => setSubTab("order")}
                >
                    Order Base ({orderBaseUnits.length})
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
                        Loading AC units...
                    </div>
                ) : displayUnits.length === 0 ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        No AC units are available in this view.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 1180,
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "Unit ID",
                                        "Brand",
                                        "Model",
                                        "Serial No.",
                                        "Type",
                                        "HP",
                                        "Refrigerant",
                                        "Purchase Price",
                                        "Selling Price",
                                        "Purchase Date",
                                        "Warranty",
                                        "Status",
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
                                {displayUnits.map((unit) => (
                                    <tr
                                        key={unit.ac_unit_id}
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
                                                fontWeight: 600,
                                                color: "#3F7DFF",
                                            }}
                                        >
                                            #AC
                                            {String(unit.ac_unit_id).padStart(
                                                3,
                                                "0",
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: "#1E2F5F",
                                            }}
                                        >
                                            {unit.brand}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#374151",
                                            }}
                                        >
                                            {unit.model}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 11,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            {unit.serial_number}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                            }}
                                        >
                                            {unit.ac_type}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#374151",
                                            }}
                                        >
                                            {unit.horsepower}HP
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                            }}
                                        >
                                            {unit.refrigerant_type || "—"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#374151",
                                            }}
                                        >
                                            {formatCurrency(unit.purchase_price)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "#16A34A",
                                            }}
                                        >
                                            {unit.selling_price
                                                ? formatCurrency(unit.selling_price)
                                                : "—"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                            }}
                                        >
                                            {formatDate(unit.purchase_date)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                            }}
                                        >
                                            {unit.warranty_period} mo
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <StatusBadge status={unit.status} />
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
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: "4px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() => openEditModal(unit)}
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
                                                        setDeleteTarget(unit)
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
                    editorMode === "edit" ? "Edit AC Unit" : "Add New AC Unit"
                }
                message={
                    editorMode === "edit"
                        ? "Update the saved AC unit details below."
                        : "Enter the inventory and pricing details for the new AC unit."
                }
                confirmLabel={saving ? "Saving..." : "Save Unit"}
                confirmDisabled={saving}
                maxWidth={760}
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
                    {[
                        {
                            label: "Brand",
                            key: "brand",
                            placeholder: "e.g. Daikin",
                        },
                        {
                            label: "Model",
                            key: "model",
                            placeholder: "e.g. FTKC25UVM",
                        },
                        {
                            label: "Serial Number",
                            key: "serial_number",
                            placeholder: "e.g. DK-2026-0009",
                        },
                        {
                            label: "Horsepower",
                            key: "horsepower",
                            placeholder: "e.g. 1.5",
                            type: "number",
                            min: "0.5",
                            step: "0.1",
                        },
                        {
                            label: "Refrigerant Type",
                            key: "refrigerant_type",
                            placeholder: "R32 / R410A",
                        },
                        {
                            label: "Supplier",
                            key: "supplier",
                            placeholder: "Supplier name",
                        },
                        {
                            label: "Purchase Price",
                            key: "purchase_price",
                            placeholder: "0.00",
                            type: "number",
                            min: "0",
                            step: "0.01",
                        },
                        {
                            label: "Selling Price",
                            key: "selling_price",
                            placeholder: "0.00",
                            type: "number",
                            min: "0",
                            step: "0.01",
                        },
                        {
                            label: "Purchase Date",
                            key: "purchase_date",
                            type: "date",
                        },
                        {
                            label: "Warranty Period (months)",
                            key: "warranty_period",
                            type: "number",
                            min: "0",
                            step: "1",
                        },
                    ].map((field) => (
                        <div key={field.key}>
                            <p className="section-label" style={{ marginBottom: 6 }}>
                                {field.label}
                            </p>
                            <input
                                type={field.type || "text"}
                                min={field.min}
                                step={field.step}
                                className="input-field"
                                placeholder={field.placeholder}
                                value={form[field.key]}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        [field.key]: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    ))}

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            AC Type
                        </p>
                        <select
                            className="input-field"
                            value={form.ac_type}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    ac_type: event.target.value,
                                }))
                            }
                        >
                            {AC_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Status
                        </p>
                        <select
                            className="input-field"
                            value={form.status}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    status: event.target.value,
                                }))
                            }
                        >
                            {AC_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Modal>

            <Modal
                open={!!deleteTarget}
                title="Delete AC Unit?"
                message={`Remove ${deleteTarget?.brand || ""} ${deleteTarget?.model || ""} from inventory? This action cannot be undone.`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />
        </div>
    );
}

export default AcUnits;
