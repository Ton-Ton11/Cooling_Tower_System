import { useState } from "react";
import StatusBadge from "../Components/StatusBadge";
import Modal from "../Components/Modal";
import { documents as initialDocs } from "../data/mockData";
function Documents({ addToast }) {
    const [docs, setDocs] = useState(initialDocs);
    const [viewMode, setViewMode] = useState("list");
    const [exportModal, setExportModal] = useState(null);
    const [form, setForm] = useState({
        form_name: "",
        client_name: "",
        service: "",
    });
    const [confirmCreate, setConfirmCreate] = useState(false);
    const handleCreate = () => {
        const newDoc = {
            doc_id: Math.max(...docs.map((d) => d.doc_id)) + 1,
            form_name: form.form_name,
            client_name: form.client_name,
            service: form.service,
            created_at: "2026-08-10",
            status: "Draft",
        };
        setDocs((prev) => [...prev, newDoc]);
        addToast("New Form Created successfully.");
        setConfirmCreate(false);
        setViewMode("list");
        setForm({ form_name: "", client_name: "", service: "" });
    };
    const handleExport = () => {
        if (!exportModal) return;
        setDocs((prev) =>
            prev.map((d) =>
                d.doc_id === exportModal.doc_id
                    ? { ...d, status: "Exported" }
                    : d,
            ),
        );
        addToast(`Form "${exportModal.form_name}" has been exported.`);
        setExportModal(null);
    };
    if (viewMode === "create") {
        return (
            <div style={{ animation: "fadeInUp 0.25s ease" }}>
                {" "}
                <div className="page-header">
                    {" "}
                    <div>
                        {" "}
                        <button
                            onClick={() => setViewMode("list")}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#3F7DFF",
                                cursor: "pointer",
                                fontSize: 13,
                                marginBottom: 6,
                                fontFamily: "inherit",
                            }}
                        >
                            ← Back to Documents
                        </button>{" "}
                        <h1 className="page-title font-display">
                            Generate New Form
                        </h1>{" "}
                        <p className="page-subtitle">
                            Edit form with customer information
                        </p>{" "}
                    </div>{" "}
                </div>{" "}
                <div className="card" style={{ padding: 28, maxWidth: 560 }}>
                    {" "}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        {" "}
                        <div>
                            {" "}
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Form / Document Name
                            </p>{" "}
                            <input
                                className="input-field"
                                placeholder="e.g. Service Agreement — AC Cleaning"
                                value={form.form_name}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        form_name: e.target.value,
                                    }))
                                }
                            />{" "}
                        </div>{" "}
                        <div>
                            {" "}
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Client Name
                            </p>{" "}
                            <input
                                className="input-field"
                                placeholder="Full name of customer"
                                value={form.client_name}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        client_name: e.target.value,
                                    }))
                                }
                            />{" "}
                        </div>{" "}
                        <div>
                            {" "}
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Service
                            </p>{" "}
                            <input
                                className="input-field"
                                placeholder="e.g. AC Cleaning & Maintenance"
                                value={form.service}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        service: e.target.value,
                                    }))
                                }
                            />{" "}
                        </div>{" "}
                        <div
                            style={{
                                padding: "16px",
                                borderRadius: 8,
                                border: "1px dashed #D1D5DB",
                                background: "#F9FAFB",
                            }}
                        >
                            {" "}
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginBottom: 8,
                                }}
                            >
                                Form Preview
                            </p>{" "}
                            <p
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#1E2F5F",
                                }}
                            >
                                {form.form_name || "Untitled Form"}
                            </p>{" "}
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginTop: 4,
                                }}
                            >
                                Client: {form.client_name || "\u2014"}
                            </p>{" "}
                            <p style={{ fontSize: 12, color: "#6B7280" }}>
                                Service: {form.service || "\u2014"}
                            </p>{" "}
                            <p
                                style={{
                                    fontSize: 11,
                                    color: "#9CA3AF",
                                    marginTop: 8,
                                }}
                            >
                                Date: 2026-08-10 · Status: Draft
                            </p>{" "}
                        </div>{" "}
                        <div style={{ display: "flex", gap: 10 }}>
                            {" "}
                            <button
                                className="btn-primary"
                                onClick={() => setConfirmCreate(true)}
                            >
                                Create Form
                            </button>{" "}
                            <button
                                className="btn-secondary"
                                onClick={() => setViewMode("list")}
                            >
                                Cancel
                            </button>{" "}
                        </div>{" "}
                    </div>{" "}
                </div>{" "}
                <Modal
                    open={confirmCreate}
                    title="Create New Form?"
                    message={`Create "${form.form_name}" for ${form.client_name}?`}
                    confirmLabel="Yes, Create"
                    onConfirm={handleCreate}
                    onCancel={() => setConfirmCreate(false)}
                />{" "}
            </div>
        );
    }
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {" "}
            <div className="page-header">
                {" "}
                <div>
                    {" "}
                    <h1 className="page-title font-display">
                        Documents / Forms
                    </h1>{" "}
                    <p className="page-subtitle">
                        {docs.length} documents ·{" "}
                        {docs.filter((d) => d.status === "Draft").length} drafts
                    </p>{" "}
                </div>{" "}
                <button
                    className="btn-primary"
                    onClick={() => setViewMode("create")}
                >
                    + Generate New Form
                </button>{" "}
            </div>{" "}
            <div className="card" style={{ padding: 20 }}>
                {" "}
                <div style={{ overflowX: "auto" }}>
                    {" "}
                    <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                        {" "}
                        <thead>
                            {" "}
                            <tr style={{ background: "#F5F7FA" }}>
                                {" "}
                                {[
                                    "Doc ID",
                                    "Form Name",
                                    "Client",
                                    "Service",
                                    "Created",
                                    "Status",
                                    "Actions",
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
                            {docs.map((d) => (
                                <tr
                                    key={d.doc_id}
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
                                        #{d.doc_id}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 13,
                                            color: "#1E2F5F",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {d.form_name}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 13,
                                            color: "#374151",
                                        }}
                                    >
                                        {d.client_name}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 12,
                                            color: "#6B7280",
                                            maxWidth: 180,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {d.service}
                                    </td>{" "}
                                    <td
                                        style={{
                                            padding: "10px 12px",
                                            fontSize: 11,
                                            color: "#9CA3AF",
                                        }}
                                    >
                                        {d.created_at}
                                    </td>{" "}
                                    <td style={{ padding: "10px 12px" }}>
                                        <StatusBadge status={d.status} />
                                    </td>{" "}
                                    <td style={{ padding: "10px 12px" }}>
                                        {" "}
                                        {d.status !== "Exported" && (
                                            <button
                                                className="btn-primary"
                                                style={{
                                                    padding: "4px 12px",
                                                    fontSize: 11,
                                                }}
                                                onClick={() =>
                                                    setExportModal(d)
                                                }
                                            >
                                                {" "}
                                                ⬇ Export{" "}
                                            </button>
                                        )}{" "}
                                        {d.status === "Exported" && (
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    color: "#16A34A",
                                                }}
                                            >
                                                ✓ Exported
                                            </span>
                                        )}{" "}
                                    </td>{" "}
                                </tr>
                            ))}{" "}
                        </tbody>{" "}
                    </table>{" "}
                </div>{" "}
            </div>{" "}
            <Modal
                open={!!exportModal}
                title="Export Form?"
                message={`Export "${exportModal?.form_name}" to PDF?`}
                confirmLabel="Yes, Export"
                onConfirm={handleExport}
                onCancel={() => setExportModal(null)}
            />{" "}
        </div>
    );
}
export { Documents as default };
