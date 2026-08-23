import { useCallback, useEffect, useState } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDate,
    formatDateTime,
} from "../../utils/superAdmin";

function Documents({ addToast }) {
    const [docs, setDocs] = useState([]);
    const [viewMode, setViewMode] = useState("list");
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        form_name: "",
        client_name: "",
        service: "",
    });
    const [confirmCreate, setConfirmCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [exportTarget, setExportTarget] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchDocuments = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    SUPER_ADMIN_ENDPOINTS.documents,
                );
                setDocs(Array.isArray(data?.data) ? data.data : []);
            } catch (error) {
                addToast(
                    extractErrorMessage(error, "Unable to load documents."),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleCreate = async () => {
        if (creating) {
            return;
        }

        setCreating(true);

        try {
            const { data } = await window.axios.post(
                SUPER_ADMIN_ENDPOINTS.documents,
                {
                    form_name: form.form_name.trim(),
                    client_name: form.client_name.trim(),
                    service: form.service.trim() || null,
                },
            );

            addToast(data?.message || "Document created successfully.");
            setConfirmCreate(false);
            setViewMode("list");
            setForm({ form_name: "", client_name: "", service: "" });
            await fetchDocuments(false);
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to create the document."),
                "error",
            );
        } finally {
            setCreating(false);
        }
    };

    const handleExport = async () => {
        if (exporting || !exportTarget) {
            return;
        }

        setExporting(true);

        try {
            const { data } = await window.axios.patch(
                SUPER_ADMIN_ENDPOINTS.updateDocument(exportTarget.doc_id),
                {
                    status: "Exported",
                },
            );

            addToast(data?.message || "Document exported successfully.");
            setExportTarget(null);
            await fetchDocuments(false);
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to export the document."),
                "error",
            );
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async () => {
        if (deleting || !deleteTarget) {
            return;
        }

        setDeleting(true);

        try {
            const { data } = await window.axios.delete(
                SUPER_ADMIN_ENDPOINTS.deleteDocument(deleteTarget.doc_id),
            );
            addToast(data?.message || "Document deleted successfully.");
            setDeleteTarget(null);
            await fetchDocuments(false);
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to delete the document."),
                "error",
            );
        } finally {
            setDeleting(false);
        }
    };

    if (viewMode === "create") {
        return (
            <div style={{ animation: "fadeInUp 0.25s ease" }}>
                <div className="page-header">
                    <div>
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
                        </button>
                        <h1 className="page-title font-display">
                            Generate New Form
                        </h1>
                        <p className="page-subtitle">
                            Create a document record using the live Super Admin
                            endpoint
                        </p>
                    </div>
                </div>

                <div className="card" style={{ padding: 28, maxWidth: 560 }}>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Form / Document Name
                            </p>
                            <input
                                className="input-field"
                                placeholder="e.g. Service Agreement — AC Cleaning"
                                value={form.form_name}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        form_name: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Client Name
                            </p>
                            <input
                                className="input-field"
                                placeholder="Full name of customer"
                                value={form.client_name}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        client_name: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Service
                            </p>
                            <input
                                className="input-field"
                                placeholder="e.g. AC Cleaning & Maintenance"
                                value={form.service}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        service: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div
                            style={{
                                padding: 16,
                                borderRadius: 8,
                                border: "1px dashed #D1D5DB",
                                background: "#F9FAFB",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginBottom: 8,
                                }}
                            >
                                Form Preview
                            </p>
                            <p
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#1E2F5F",
                                }}
                            >
                                {form.form_name || "Untitled Form"}
                            </p>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginTop: 4,
                                }}
                            >
                                Client: {form.client_name || "—"}
                            </p>
                            <p style={{ fontSize: 12, color: "#6B7280" }}>
                                Service: {form.service || "—"}
                            </p>
                            <p
                                style={{
                                    fontSize: 11,
                                    color: "#9CA3AF",
                                    marginTop: 8,
                                }}
                            >
                                Date: {formatDate(new Date())} · Status: Draft
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                className="btn-primary"
                                onClick={() => setConfirmCreate(true)}
                            >
                                Create Form
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setViewMode("list")}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <Modal
                    open={confirmCreate}
                    title="Create New Form?"
                    message={`Create "${form.form_name}" for ${form.client_name}?`}
                    confirmLabel={creating ? "Creating..." : "Yes, Create"}
                    confirmDisabled={creating}
                    onConfirm={handleCreate}
                    onCancel={() => !creating && setConfirmCreate(false)}
                />
            </div>
        );
    }

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Documents / Forms
                    </h1>
                    <p className="page-subtitle">
                        {docs.length} documents ·{" "}
                        {docs.filter((document) => document.status === "Draft").length}{" "}
                        drafts
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchDocuments()}
                    >
                        Refresh
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setViewMode("create")}
                    >
                        + Generate New Form
                    </button>
                </div>
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
                        Loading documents...
                    </div>
                ) : docs.length === 0 ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        No document records are available yet.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "Doc ID",
                                        "Form Name",
                                        "Client",
                                        "Service",
                                        "Created",
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
                                {docs.map((document) => (
                                    <tr
                                        key={document.doc_id}
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
                                            #{document.doc_id}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                color: "#1E2F5F",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {document.form_name}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                color: "#374151",
                                            }}
                                        >
                                            {document.client_name}
                                        </td>
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
                                            {document.service || "—"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            <div>{formatDateTime(document.created_at)}</div>
                                            {document.created_by_name && (
                                                <div style={{ marginTop: 4 }}>
                                                    By {document.created_by_name}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <StatusBadge status={document.status} />
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                {document.status !== "Exported" && (
                                                    <button
                                                        className="btn-primary"
                                                        style={{
                                                            padding: "4px 12px",
                                                            fontSize: 11,
                                                        }}
                                                        onClick={() =>
                                                            setExportTarget(
                                                                document,
                                                            )
                                                        }
                                                    >
                                                        ⬇ Export
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-danger"
                                                    style={{
                                                        padding: "4px 12px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() =>
                                                        setDeleteTarget(document)
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
                open={!!exportTarget}
                title="Export Form?"
                message={`Mark "${exportTarget?.form_name}" as exported?`}
                confirmLabel={exporting ? "Exporting..." : "Yes, Export"}
                confirmDisabled={exporting}
                onConfirm={handleExport}
                onCancel={() => !exporting && setExportTarget(null)}
            />

            <Modal
                open={!!deleteTarget}
                title="Delete Document?"
                message={`Delete "${deleteTarget?.form_name}" from the document records?`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />
        </div>
    );
}

export default Documents;
