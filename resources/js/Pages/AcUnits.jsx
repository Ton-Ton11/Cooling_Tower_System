import { useState } from "react";
import StatusBadge from "../Components/StatusBadge";
import Modal from "../Components/Modal";
import { acUnits as initialUnits } from "../data/mockData";
const acTypes = [
    "Window",
    "Split",
    "Cassette",
    "Floor Mounted",
    "Ceiling Suspended",
];
function AcUnits({ addToast }) {
    const [units, setUnits] = useState(initialUnits);
    const [subTab, setSubTab] = useState("all");
    const [addModal, setAddModal] = useState(false);
    const [confirmAdd, setConfirmAdd] = useState(false);
    const [form, setForm] = useState({
        brand: "",
        model: "",
        serial_number: "",
        horsepower: "",
        ac_type: "Split",
        refrigerant_type: "R32",
        supplier: "",
        purchase_price: "",
        selling_price: "",
        purchase_date: "2026-08-10",
        warranty_period: "12",
        status: "Available",
    });
    const orderBaseUnits = units.filter((u) => u.status === "Order Base");
    const isLowStock = orderBaseUnits.length >= 2;
    const handleAdd = () => {
        const newUnit = {
            ac_unit_id: Math.max(...units.map((u) => u.ac_unit_id)) + 1,
            brand: form.brand,
            model: form.model,
            serial_number: form.serial_number,
            horsepower: parseFloat(form.horsepower) || 1,
            ac_type: form.ac_type,
            refrigerant_type: form.refrigerant_type,
            supplier: form.supplier,
            purchase_price: parseFloat(form.purchase_price) || 0,
            selling_price: parseFloat(form.selling_price) || 0,
            purchase_date: form.purchase_date,
            warranty_period: parseInt(form.warranty_period) || 12,
            status: form.status,
        };
        setUnits((prev) => [...prev, newUnit]);
        addToast(
            `AC unit ${form.brand} ${form.model} added. Inventory updated.`,
        );
        setAddModal(false);
        setConfirmAdd(false);
        setForm({
            brand: "",
            model: "",
            serial_number: "",
            horsepower: "",
            ac_type: "Split",
            refrigerant_type: "R32",
            supplier: "",
            purchase_price: "",
            selling_price: "",
            purchase_date: "2026-08-10",
            warranty_period: "12",
            status: "Available",
        });
    };
    const displayUnits = subTab === "order" ? orderBaseUnits : units;
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {" "}
            <div className="page-header">
                {" "}
                <div>
                    {" "}
                    <h1 className="page-title font-display">
                        AC Units Inventory
                    </h1>{" "}
                    <p className="page-subtitle">
                        {units.length} units tracked ·{" "}
                        {units.filter((u) => u.status === "Available").length}{" "}
                        available
                    </p>{" "}
                </div>{" "}
                <button
                    className="btn-primary"
                    onClick={() => setAddModal(true)}
                >
                    + Add AC Unit
                </button>{" "}
            </div>{" "}
            {isLowStock && (
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
                    {" "}
                    <span style={{ fontSize: 20 }}>📦</span>{" "}
                    <div>
                        {" "}
                        <p
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#D97706",
                            }}
                        >
                            {" "}
                            Stock Low / Order Base Required{" "}
                        </p>{" "}
                        <p style={{ fontSize: 12, color: "#6B7280" }}>
                            {" "}
                            {orderBaseUnits.length} unit(s) are on Order Base
                            status. Consider restocking.{" "}
                        </p>{" "}
                    </div>{" "}
                </div>
            )}{" "}
            <div
                className="tab-bar"
                style={{ marginBottom: 20, display: "inline-flex" }}
            >
                {" "}
                <button
                    className={`tab-item ${subTab === "all" ? "active" : ""}`}
                    onClick={() => setSubTab("all")}
                >
                    {" "}
                    All Units ({units.length}){" "}
                </button>{" "}
                <button
                    className={`tab-item ${subTab === "order" ? "active" : ""}`}
                    onClick={() => setSubTab("order")}
                >
                    {" "}
                    Order Base ({orderBaseUnits.length}){" "}
                </button>{" "}
            </div>{" "}
            <div className="card" style={{ padding: 20 }}>
                {" "}
                <div style={{ overflowX: "auto" }}>
                    {" "}
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: 900,
                        }}
                    >
                        {" "}
                        <thead>
                            {" "}
                            <tr style={{ background: "#F5F7FA" }}>
                                {" "}
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
                                    "Warranty",
                                    "Status",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "10px 12px",
                                            textAlign: "left",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            letterSpacing: "0.05em",
                                            textTransform: "uppercase",
                                            color: "#6B7280",
                                            whiteSpace: "nowrap",
                                            borderBottom: "1px solid #EAECF0",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}{" "}
                            </tr>{" "}
                        </thead>{" "}
                        <tbody>
                            {" "}
                            {displayUnits.map((u) => (
                                <tr
                                    key={u.ac_unit_id}
                                    style={{ borderTop: "1px solid #F5F7FA" }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                            "rgba(63,125,255,0.04)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                            "transparent")
                                    }
                                >
                                    {" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#3F7DFF",
                                        }}
                                    >
                                        #AC
                                        {u.ac_unit_id
                                            .toString()
                                            .padStart(3, "0")}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "#1E2F5F",
                                        }}
                                    >
                                        {u.brand}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#374151",
                                        }}
                                    >
                                        {u.model}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 11,
                                            color: "#9CA3AF",
                                        }}
                                    >
                                        {u.serial_number}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#6B7280",
                                        }}
                                    >
                                        {u.ac_type}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#374151",
                                        }}
                                    >
                                        {u.horsepower}HP
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#6B7280",
                                        }}
                                    >
                                        {u.refrigerant_type}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#374151",
                                        }}
                                    >
                                        ₱{u.purchase_price.toLocaleString()}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#16A34A",
                                        }}
                                    >
                                        ₱{u.selling_price.toLocaleString()}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#6B7280",
                                        }}
                                    >
                                        {u.warranty_period}mo
                                    </td>{" "}
                                    <td style={{ padding: "10px 12px" }}>
                                        <StatusBadge status={u.status} />
                                    </td>{" "}
                                </tr>
                            ))}{" "}
                        </tbody>{" "}
                    </table>{" "}
                </div>{" "}
            </div>{" "}
            {/* Add Modal */}{" "}
            {addModal && !confirmAdd && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1e3,
                        background: "rgba(0,0,0,0.4)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onClick={() => setAddModal(false)}
                >
                    {" "}
                    <div
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 20,
                            padding: "28px 32px",
                            width: 560,
                            maxHeight: "85vh",
                            overflow: "auto",
                            animation: "fadeIn 0.18s ease",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {" "}
                        <h3
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                marginBottom: 20,
                            }}
                        >
                            {" "}
                            Add New AC Unit — Enter Info & Payment Details{" "}
                        </h3>{" "}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 14,
                                marginBottom: 14,
                            }}
                        >
                            {" "}
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
                                },
                                {
                                    label: "Refrigerant",
                                    key: "refrigerant_type",
                                    placeholder: "R32 / R410A",
                                },
                                {
                                    label: "Supplier",
                                    key: "supplier",
                                    placeholder: "Supplier name",
                                },
                                {
                                    label: "Purchase Price (\u20B1)",
                                    key: "purchase_price",
                                    placeholder: "0.00",
                                },
                                {
                                    label: "Selling Price (\u20B1)",
                                    key: "selling_price",
                                    placeholder: "0.00",
                                },
                                {
                                    label: "Purchase Date",
                                    key: "purchase_date",
                                    placeholder: "YYYY-MM-DD",
                                },
                                {
                                    label: "Warranty (months)",
                                    key: "warranty_period",
                                    placeholder: "12",
                                },
                            ].map((f) => (
                                <div key={f.key}>
                                    {" "}
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 5 }}
                                    >
                                        {f.label}
                                    </p>{" "}
                                    <input
                                        className="input-field"
                                        placeholder={f.placeholder}
                                        value={form[f.key]}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                [f.key]: e.target.value,
                                            }))
                                        }
                                    />{" "}
                                </div>
                            ))}{" "}
                            <div>
                                {" "}
                                <p
                                    className="section-label"
                                    style={{ marginBottom: 5 }}
                                >
                                    AC Type
                                </p>{" "}
                                <select
                                    className="input-field"
                                    value={form.ac_type}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            ac_type: e.target.value,
                                        }))
                                    }
                                >
                                    {" "}
                                    {acTypes.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}{" "}
                                </select>{" "}
                            </div>{" "}
                            <div>
                                {" "}
                                <p
                                    className="section-label"
                                    style={{ marginBottom: 5 }}
                                >
                                    Status
                                </p>{" "}
                                <select
                                    className="input-field"
                                    value={form.status}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            status: e.target.value,
                                        }))
                                    }
                                >
                                    {" "}
                                    {[
                                        "Available",
                                        "Reserved",
                                        "Order Base",
                                    ].map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}{" "}
                                </select>{" "}
                            </div>{" "}
                        </div>{" "}
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                justifyContent: "flex-end",
                            }}
                        >
                            {" "}
                            <button
                                className="btn-secondary"
                                onClick={() => setAddModal(false)}
                            >
                                Cancel
                            </button>{" "}
                            <button
                                className="btn-primary"
                                onClick={() => setConfirmAdd(true)}
                            >
                                Add Unit →
                            </button>{" "}
                        </div>{" "}
                    </div>{" "}
                </div>
            )}{" "}
            <Modal
                open={confirmAdd}
                title="Confirm: Add AC Unit?"
                message={`Add ${form.brand} ${form.model} (${form.ac_type}) to inventory?`}
                confirmLabel="Yes, Add Unit"
                onConfirm={handleAdd}
                onCancel={() => setConfirmAdd(false)}
            />{" "}
        </div>
    );
}
export { AcUnits as default };
