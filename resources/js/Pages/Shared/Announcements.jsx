import { useCallback, useEffect, useState } from "react";
import Modal from "../../Components/Modal";
import {
    ANNOUNCEMENT_ROLE_OPTIONS,
    ROLE_COLORS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

const MegaphoneIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
    </svg>
);
const TrashIcon = ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

function Announcements({ addToast, onDataChanged, endpoints, readOnly = false }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [composing, setComposing] = useState(false);
    const [confirmModal, setConfirmModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        title: "",
        message: "",
        target_role: "All Staff",
    });

    const fetchAnnouncements = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    ep.announcements,
                );
                setAnnouncements(Array.isArray(data?.data) ? data.data : []);
            } catch (error) {
                addToast(
                    extractErrorMessage(
                        error,
                        "Unable to load announcements.",
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
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleSubmit = async () => {
        if (creating) {
            return;
        }

        setCreating(true);

        try {
            const { data } = await window.axios.post(
                ep.announcements,
                {
                    title: form.title.trim(),
                    message: form.message.trim(),
                    target_role: form.target_role,
                },
            );

            addToast(data?.message || "Announcement created successfully.");
            setConfirmModal(false);
            setComposing(false);
            setForm({ title: "", message: "", target_role: "All Staff" });
            await fetchAnnouncements(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    "Unable to create the announcement.",
                ),
                "error",
            );
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (deleting || !deleteTarget) {
            return;
        }

        setDeleting(true);

        try {
            const { data } = await window.axios.delete(
                ep.deleteAnnouncement(deleteTarget.id),
            );
            addToast(data?.message || "Announcement deleted successfully.");
            setDeleteTarget(null);
            await fetchAnnouncements(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    "Unable to delete the announcement.",
                ),
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
                        Announcements & Notifications
                    </h1>
                    <p className="page-subtitle">
                        {announcements.length} announcements · live broadcast feed
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchAnnouncements()}
                    >
                        Refresh
                    </button>
                    {!readOnly && (
                        <button
                            className="btn-primary"
                            onClick={() => setComposing((current) => !current)}
                        >
                            {composing ? "← Back to Feed" : "+ New Announcement"}
                        </button>
                    )}
                </div>
            </div>

            {composing && (
                <div
                    className="card"
                    style={{
                        padding: 24,
                        marginBottom: 24,
                        animation: "fadeInUp 0.2s ease",
                    }}
                >
                    <h3
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            marginBottom: 18,
                        }}
                    >
                        Compose Announcement
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Title
                            </p>
                            <input
                                className="input-field"
                                placeholder="Announcement title..."
                                value={form.title}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        title: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Message
                            </p>
                            <textarea
                                className="input-field"
                                style={{ minHeight: 120, resize: "vertical" }}
                                placeholder="Write your announcement here..."
                                value={form.message}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        message: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 8 }}
                            >
                                Recipients
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                }}
                            >
                                {ANNOUNCEMENT_ROLE_OPTIONS.map((option) => {
                                    const selected =
                                        form.target_role === option.role;
                                    const color =
                                        ROLE_COLORS[option.role] || "#3F7DFF";

                                    return (
                                        <button
                                            key={option.role}
                                            onClick={() =>
                                                setForm((previous) => ({
                                                    ...previous,
                                                    target_role: option.role,
                                                }))
                                            }
                                            style={{
                                                padding: "6px 14px",
                                                borderRadius: 20,
                                                cursor: "pointer",
                                                fontSize: 12,
                                                fontFamily:
                                                    "'DM Sans',sans-serif",
                                                fontWeight: 600,
                                                background: selected
                                                    ? `${color}18`
                                                    : "#F5F7FA",
                                                border: selected
                                                    ? `1px solid ${color}`
                                                    : "1px solid #E5E7EB",
                                                color: selected
                                                    ? color
                                                    : "#6B7280",
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            {option.role}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            style={{ display: "flex", gap: 10, paddingTop: 4 }}
                        >
                            <button
                                className="btn-primary"
                                onClick={() => setConfirmModal(true)}
                                disabled={!form.title.trim() || !form.message.trim()}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                                <MegaphoneIcon size={14} />
                                <span>Send Announcement</span>
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setComposing(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="card" style={{ padding: 24, color: "#6B7280" }}>
                    Loading announcements...
                </div>
            ) : announcements.length === 0 ? (
                <div className="card" style={{ padding: 24, color: "#6B7280" }}>
                    No announcements have been posted yet.
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                    }}
                >
                    {announcements.map((announcement) => {
                        const tagColor =
                            ROLE_COLORS[announcement.target_role] || "#3F7DFF";

                        return (
                            <div
                                key={announcement.id}
                                className="card"
                                style={{
                                    padding: 20,
                                    animation: "fadeInUp 0.2s ease",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: 16,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                marginBottom: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 9,
                                                    background:
                                                        "linear-gradient(135deg,#F58A07,#D97706)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#FFFFFF",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <MegaphoneIcon size={18} color="#FFFFFF" />
                                            </div>
                                            <div>
                                                <h4
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: 700,
                                                        color: "#1E2F5F",
                                                        margin: 0,
                                                    }}
                                                >
                                                    {announcement.title}
                                                </h4>
                                                <p
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#9CA3AF",
                                                        margin: "2px 0 0",
                                                    }}
                                                >
                                                    By{" "}
                                                    {announcement.created_by_name ||
                                                        "Unknown"}{" "}
                                                    ·{" "}
                                                    {formatDateTime(
                                                        announcement.created_at,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: 13,
                                                color: "#6B7280",
                                                lineHeight: 1.6,
                                                paddingLeft: 46,
                                                margin: 0,
                                            }}
                                        >
                                            {announcement.message}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 11,
                                                padding: "3px 10px",
                                                borderRadius: 20,
                                                background: `${tagColor}15`,
                                                color: tagColor,
                                                border: `1px solid ${tagColor}30`,
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            → {announcement.target_role}
                                        </span>
                                        <button
                                            className="btn-danger"
                                            style={{
                                                padding: "5px 10px",
                                                fontSize: 11,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                            onClick={() =>
                                                setDeleteTarget(announcement)
                                            }
                                        >
                                            <TrashIcon size={12} />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                open={confirmModal}
                title="Send Announcement?"
                message={`Notify ${form.target_role} with "${form.title}"?`}
                confirmLabel={creating ? "Sending..." : "Yes, Notify"}
                confirmDisabled={creating}
                onConfirm={handleSubmit}
                onCancel={() => !creating && setConfirmModal(false)}
            />

            <Modal
                open={!!deleteTarget}
                title="Delete Announcement?"
                message={`Delete "${deleteTarget?.title}" from the announcement feed?`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />
        </div>
    );
}

export default Announcements;
