import { useState } from "react";
import Modal from "../Components/Modal";
import { announcements as initialAnnouncements } from "../data/mockData";
const roleOptions = [
    "All Staff",
    "Super Admin",
    "Manager",
    "Admin Assistant",
    "Tools Man",
    "Technician",
    "Customer",
];
const roleColors = {
    "All Staff": "#3F7DFF",
    "Super Admin": "#EF4444",
    Manager: "#F58A07",
    "Admin Assistant": "#59B7FF",
    "Tools Man": "#22C55E",
    Technician: "#8B5CF6",
    Customer: "#9CA3AF",
};
function Announcements({ addToast }) {
    const [announcements, setAnnouncements] = useState(initialAnnouncements);
    const [composing, setComposing] = useState(false);
    const [confirmModal, setConfirmModal] = useState(false);
    const [form, setForm] = useState({
        title: "",
        message: "",
        target_role: "All Staff",
    });
    const handleSubmit = () => {
        const newAnn = {
            id: Math.max(...announcements.map((a) => a.id)) + 1,
            created_by: "Super User",
            title: form.title,
            message: form.message,
            target_role: form.target_role,
            created_at:
                "2026-08-10 " +
                /* @__PURE__ */ new Date().toTimeString().slice(0, 5),
        };
        setAnnouncements((prev) => [newAnn, ...prev]);
        addToast(
            `The selected employees/staff (${form.target_role}) will be notified of your announcement.`,
        );
        setConfirmModal(false);
        setComposing(false);
        setForm({ title: "", message: "", target_role: "All Staff" });
    };
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {" "}
            <div className="page-header">
                {" "}
                <div>
                    {" "}
                    <h1 className="page-title font-display">
                        Announcements & Notifications
                    </h1>{" "}
                    <p className="page-subtitle">
                        {announcements.length} announcements · Reach staff and
                        clients
                    </p>{" "}
                </div>{" "}
                <button
                    className="btn-primary"
                    onClick={() => setComposing(!composing)}
                >
                    {" "}
                    {composing
                        ? "\u2190 Back to Feed"
                        : "+ New Announcement"}{" "}
                </button>{" "}
            </div>{" "}
            {composing && (
                <div
                    className="card"
                    style={{
                        padding: 24,
                        marginBottom: 24,
                        animation: "fadeInUp 0.2s ease",
                    }}
                >
                    {" "}
                    <h3
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            marginBottom: 18,
                        }}
                    >
                        {" "}
                        Compose Announcement{" "}
                    </h3>{" "}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        {" "}
                        <div>
                            {" "}
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Title
                            </p>{" "}
                            <input
                                className="input-field"
                                placeholder="Announcement title..."
                                value={form.title}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        title: e.target.value,
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
                                Message
                            </p>{" "}
                            <textarea
                                className="input-field"
                                style={{ height: 100, resize: "none" }}
                                placeholder="Write your announcement here..."
                                value={form.message}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        message: e.target.value,
                                    }))
                                }
                            />{" "}
                        </div>{" "}
                        <div>
                            {" "}
                            <p
                                className="section-label"
                                style={{ marginBottom: 8 }}
                            >
                                Recipients
                            </p>{" "}
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                }}
                            >
                                {" "}
                                {roleOptions.map((role) => (
                                    <button
                                        key={role}
                                        onClick={() =>
                                            setForm((p) => ({
                                                ...p,
                                                target_role: role,
                                            }))
                                        }
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 20,
                                            cursor: "pointer",
                                            fontSize: 12,
                                            fontFamily: "'DM Sans',sans-serif",
                                            fontWeight: 600,
                                            background:
                                                form.target_role === role
                                                    ? `${roleColors[role] || "#3F7DFF"}18`
                                                    : "#F5F7FA",
                                            border:
                                                form.target_role === role
                                                    ? `1px solid ${roleColors[role] || "#3F7DFF"}`
                                                    : "1px solid #E5E7EB",
                                            color:
                                                form.target_role === role
                                                    ? roleColors[role] ||
                                                      "#3F7DFF"
                                                    : "#6B7280",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        {" "}
                                        {role}{" "}
                                    </button>
                                ))}{" "}
                            </div>{" "}
                        </div>{" "}
                        <div
                            style={{ display: "flex", gap: 10, paddingTop: 4 }}
                        >
                            {" "}
                            <button
                                className="btn-primary"
                                onClick={() => setConfirmModal(true)}
                                disabled={!form.title || !form.message}
                            >
                                {" "}
                                📢 Send Announcement{" "}
                            </button>{" "}
                            <button
                                className="btn-secondary"
                                onClick={() => setComposing(false)}
                            >
                                Cancel
                            </button>{" "}
                        </div>{" "}
                    </div>{" "}
                </div>
            )}{" "}
            {/* Feed */}{" "}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {" "}
                {announcements.map((ann) => (
                    <div
                        key={ann.id}
                        className="card"
                        style={{ padding: 20, animation: "fadeInUp 0.2s ease" }}
                    >
                        {" "}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 16,
                            }}
                        >
                            {" "}
                            <div style={{ flex: 1 }}>
                                {" "}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        marginBottom: 8,
                                    }}
                                >
                                    {" "}
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
                                            fontSize: 17,
                                            flexShrink: 0,
                                        }}
                                    >
                                        📢
                                    </div>{" "}
                                    <div>
                                        {" "}
                                        <h4
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 700,
                                                color: "#1E2F5F",
                                            }}
                                        >
                                            {ann.title}
                                        </h4>{" "}
                                        <p
                                            style={{
                                                fontSize: 11,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            By {ann.created_by} ·{" "}
                                            {ann.created_at}
                                        </p>{" "}
                                    </div>{" "}
                                </div>{" "}
                                <p
                                    style={{
                                        fontSize: 13,
                                        color: "#6B7280",
                                        lineHeight: 1.6,
                                        paddingLeft: 46,
                                    }}
                                >
                                    {ann.message}
                                </p>{" "}
                            </div>{" "}
                            <div>
                                {" "}
                                <span
                                    style={{
                                        fontSize: 11,
                                        padding: "3px 10px",
                                        borderRadius: 20,
                                        background: `${roleColors[ann.target_role] || "#3F7DFF"}15`,
                                        color:
                                            roleColors[ann.target_role] ||
                                            "#3F7DFF",
                                        border: `1px solid ${roleColors[ann.target_role] || "#3F7DFF"}30`,
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {" "}
                                    → {ann.target_role}{" "}
                                </span>{" "}
                            </div>{" "}
                        </div>{" "}
                    </div>
                ))}{" "}
            </div>{" "}
            <Modal
                open={confirmModal}
                title="Confirm Action?"
                message={`Send announcement "${form.title}" to: ${form.target_role}?`}
                confirmLabel="Yes, Notify"
                onConfirm={handleSubmit}
                onCancel={() => setConfirmModal(false)}
            />{" "}
        </div>
    );
}
export { Announcements as default };
