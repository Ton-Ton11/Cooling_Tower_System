import { useState } from "react";
import StatusBadge from "../Components/StatusBadge";
import { bookings as initialBookings, technicians } from "../data/mockData";
function Bookings({ addToast }) {
    const [tab, setTab] = useState("Pending");
    const [bookings, setBookings] = useState(initialBookings);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [approveModal, setApproveModal] = useState(null);
    const [selectedTech, setSelectedTech] = useState(
        technicians[0]?.user_id.toString() || "",
    );
    const [clientPanel, setClientPanel] = useState(null);
    const filtered =
        tab === "All"
            ? bookings
            : bookings.filter((b) => b.booking_status === tab);
    const handleApprove = () => {
        if (!approveModal) return;
        const tech = technicians.find(
            (t) => t.user_id.toString() === selectedTech,
        );
        setBookings((prev) =>
            prev.map((b) =>
                b.booking_id === approveModal.booking_id
                    ? {
                          ...b,
                          booking_status: "Approved",
                          assigned_tech_id: tech?.user_id,
                          assigned_tech_name: tech
                              ? `${tech.given_name} ${tech.last_name}`
                              : b.assigned_tech_name,
                      }
                    : b,
            ),
        );
        addToast(
            `Booking #${approveModal.booking_id} approved. ${tech?.given_name || "Technician"} has been assigned and will be notified.`,
        );
        setApproveModal(null);
    };
    const cols = [
        {
            key: "booking_id",
            label: "ID",
            mono: true,
            render: (r) => (
                <span style={{ color: "#3F7DFF", fontWeight: 600 }}>
                    #{r.booking_id}
                </span>
            ),
        },
        { key: "client_name", label: "Client" },
        { key: "service", label: "Service", sortable: false },
        { key: "scheduled_date", label: "Scheduled", mono: true },
        {
            key: "assigned_tech_name",
            label: "Technician",
            render: (r) =>
                r.assigned_tech_name || (
                    <span style={{ color: "#9CA3AF" }}>—</span>
                ),
        },
        {
            key: "booking_status",
            label: "Status",
            render: (r) => <StatusBadge status={r.booking_status} />,
        },
        {
            key: "payment_status",
            label: "Payment",
            render: (r) => <StatusBadge status={r.payment_status} />,
        },
    ];
    const getActions = (row) => {
        const acts = [
            {
                label: "\u{1F464} View Client Details",
                onClick: (r) => setClientPanel(r),
            },
        ];
        if (row.booking_status === "Pending") {
            acts.unshift({
                label: "\u2705 Approve & Assign",
                onClick: (r) => {
                    setApproveModal(r);
                    setSelectedTech(technicians[0]?.user_id.toString() || "");
                },
            });
        }
        return acts;
    };
    const clientHistory = clientPanel
        ? bookings.filter(
              (b) =>
                  b.client_id === clientPanel.client_id &&
                  b.booking_id !== clientPanel.booking_id,
          )
        : [];
    const tabs = ["Pending", "Approved", "Completed", "Cancelled", "All"];
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {" "}
            <div className="page-header">
                {" "}
                <div>
                    {" "}
                    <h1 className="page-title font-display">
                        Bookings Management
                    </h1>{" "}
                    <p className="page-subtitle">
                        Review, approve, and track all service bookings
                    </p>{" "}
                </div>{" "}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {" "}
                    <span
                        style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            background: "#F5F7FA",
                            border: "1px solid #E5E7EB",
                            padding: "5px 12px",
                            borderRadius: 8,
                        }}
                    >
                        {" "}
                        {
                            bookings.filter(
                                (b) => b.booking_status === "Pending",
                            ).length
                        }{" "}
                        pending{" "}
                    </span>{" "}
                </div>{" "}
            </div>{" "}
            {/* Tab bar */}{" "}
            <div
                className="tab-bar"
                style={{ marginBottom: 20, display: "inline-flex" }}
            >
                {" "}
                {tabs.map((t) => (
                    <button
                        key={t}
                        className={`tab-item ${tab === t ? "active" : ""}`}
                        onClick={() => setTab(t)}
                    >
                        {" "}
                        {t}{" "}
                        <span
                            style={{
                                marginLeft: 6,
                                fontSize: 10,
                                color: tab === t ? "#3F7DFF" : "#9CA3AF",
                            }}
                        >
                            {" "}
                            {t === "All"
                                ? bookings.length
                                : bookings.filter((b) => b.booking_status === t)
                                      .length}{" "}
                        </span>{" "}
                    </button>
                ))}{" "}
            </div>{" "}
            {/* Note: DataTable actions are per-row. Wrapping properly: */}{" "}
            {filtered.length > 0 && (
                <div className="card" style={{ padding: 20, marginTop: 16 }}>
                    {" "}
                    <p className="section-label" style={{ marginBottom: 12 }}>
                        Booking Details — Click ⋯ on any row to take action
                    </p>{" "}
                    <div style={{ overflowX: "auto" }}>
                        {" "}
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 800,
                            }}
                        >
                            {" "}
                            <thead>
                                {" "}
                                <tr style={{ background: "#F5F7FA" }}>
                                    {" "}
                                    {[
                                        "ID",
                                        "Client",
                                        "Service",
                                        "Scheduled",
                                        "Technician",
                                        "Status",
                                        "Payment",
                                        "Action",
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
                                                borderBottom:
                                                    "1px solid #EAECF0",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}{" "}
                                </tr>{" "}
                            </thead>{" "}
                            <tbody>
                                {" "}
                                {filtered.map((b) => (
                                    <tr
                                        key={b.booking_id}
                                        style={{
                                            borderTop: "1px solid #F5F7FA",
                                        }}
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
                                            #{b.booking_id}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                color: "#1E2F5F",
                                            }}
                                        >
                                            {b.client_name}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                                maxWidth: 200,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.service}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 11,
                                                color: "#9CA3AF",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {b.scheduled_date}
                                        </td>{" "}
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                color: b.assigned_tech_name
                                                    ? "#374151"
                                                    : "#9CA3AF",
                                            }}
                                        >
                                            {b.assigned_tech_name || "\u2014"}
                                        </td>{" "}
                                        <td style={{ padding: "10px 12px" }}>
                                            <StatusBadge
                                                status={b.booking_status}
                                            />
                                        </td>{" "}
                                        <td style={{ padding: "10px 12px" }}>
                                            <StatusBadge
                                                status={b.payment_status}
                                            />
                                        </td>{" "}
                                        <td style={{ padding: "10px 12px" }}>
                                            {" "}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                }}
                                            >
                                                {" "}
                                                {b.booking_status ===
                                                    "Pending" && (
                                                    <button
                                                        className="btn-primary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11,
                                                        }}
                                                        onClick={() => {
                                                            setApproveModal(b);
                                                            setSelectedTech(
                                                                technicians[0]?.user_id.toString() ||
                                                                    "",
                                                            );
                                                        }}
                                                    >
                                                        {" "}
                                                        ✅ Approve{" "}
                                                    </button>
                                                )}{" "}
                                                <button
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: "5px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() =>
                                                        setClientPanel(b)
                                                    }
                                                >
                                                    {" "}
                                                    👤 Client{" "}
                                                </button>{" "}
                                            </div>{" "}
                                        </td>{" "}
                                    </tr>
                                ))}{" "}
                            </tbody>{" "}
                        </table>{" "}
                    </div>{" "}
                </div>
            )}{" "}
            {/* Approve Modal */}{" "}
            {approveModal && (
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
                        padding: 16,
                    }}
                >
                    {" "}
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: 20,
                            padding: "28px",
                            maxWidth: 420,
                            width: "100%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                            border: "1px solid rgba(0,0,0,0.06)",
                        }}
                    >
                        {" "}
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                margin: "0 0 8px",
                            }}
                        >
                            Approve Booking #{approveModal.booking_id}?
                        </h2>{" "}
                        <p
                            style={{
                                fontSize: 13,
                                color: "#6B7280",
                                marginBottom: 16,
                            }}
                        >
                            {" "}
                            Service:{" "}
                            <strong style={{ color: "#1E2F5F" }}>
                                {approveModal.service}
                            </strong>
                            <br /> Client:{" "}
                            <strong style={{ color: "#1E2F5F" }}>
                                {approveModal.client_name}
                            </strong>{" "}
                        </p>{" "}
                        <p
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#6B7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                marginBottom: 6,
                            }}
                        >
                            Assign Technician
                        </p>{" "}
                        <select
                            className="input-field"
                            value={selectedTech}
                            onChange={(e) => setSelectedTech(e.target.value)}
                            style={{ marginBottom: 20 }}
                        >
                            {" "}
                            {technicians.map((t) => (
                                <option key={t.user_id} value={t.user_id}>
                                    {t.given_name} {t.last_name} — {t.specialty}
                                </option>
                            ))}{" "}
                        </select>{" "}
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                justifyContent: "flex-end",
                            }}
                        >
                            {" "}
                            <button
                                onClick={() => setApproveModal(null)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>{" "}
                            <button
                                onClick={handleApprove}
                                className="btn-primary"
                            >
                                Approve & Assign
                            </button>{" "}
                        </div>{" "}
                    </div>{" "}
                </div>
            )}{" "}
            {/* Client Details Panel */}{" "}
            {clientPanel && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 500,
                        background: "rgba(0,0,0,0.4)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                    }}
                    onClick={() => setClientPanel(null)}
                >
                    {" "}
                    <div
                        style={{
                            width: 400,
                            height: "100vh",
                            background: "#fff",
                            borderLeft: "1px solid #E5E7EB",
                            overflow: "auto",
                            padding: 24,
                            animation: "slideInRight 0.25s ease",
                            boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {" "}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 20,
                            }}
                        >
                            {" "}
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                    margin: 0,
                                }}
                            >
                                Client Details
                            </h3>{" "}
                            <button
                                onClick={() => setClientPanel(null)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#9CA3AF",
                                    cursor: "pointer",
                                    fontSize: 20,
                                }}
                            >
                                ✕
                            </button>{" "}
                        </div>{" "}
                        <div
                            style={{
                                background: "#F5F7FA",
                                borderRadius: 14,
                                padding: 16,
                                marginBottom: 16,
                            }}
                        >
                            {" "}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 12,
                                    alignItems: "center",
                                    marginBottom: 12,
                                }}
                            >
                                {" "}
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background:
                                            "linear-gradient(135deg,#3F7DFF,#1E2F5F)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 18,
                                        color: "#fff",
                                    }}
                                >
                                    👤
                                </div>{" "}
                                <div>
                                    {" "}
                                    <p
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 700,
                                            color: "#1E2F5F",
                                            margin: 0,
                                        }}
                                    >
                                        {clientPanel.client_name}
                                    </p>{" "}
                                    <p
                                        style={{
                                            fontSize: 12,
                                            color: "#9CA3AF",
                                            margin: "2px 0 0",
                                        }}
                                    >
                                        Client ID #{clientPanel.client_id}
                                    </p>{" "}
                                </div>{" "}
                            </div>{" "}
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "#6B7280",
                                    lineHeight: 1.9,
                                }}
                            >
                                {" "}
                                <p style={{ margin: 0 }}>
                                    📋 Service:{" "}
                                    <span
                                        style={{
                                            color: "#1E2F5F",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {clientPanel.service}
                                    </span>
                                </p>{" "}
                                <p style={{ margin: 0 }}>
                                    📅 Scheduled:{" "}
                                    <span
                                        style={{
                                            color: "#1E2F5F",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {clientPanel.scheduled_date}
                                    </span>
                                </p>{" "}
                                <p style={{ margin: 0 }}>
                                    💳 Payment:{" "}
                                    <span
                                        style={{
                                            color: "#1E2F5F",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {clientPanel.payment_method ||
                                            "Not yet specified"}
                                    </span>
                                </p>{" "}
                                {clientPanel.rating && (
                                    <p style={{ margin: 0 }}>
                                        ⭐ Rating:{" "}
                                        <span style={{ color: "#F58A07" }}>
                                            {"\u2605".repeat(
                                                clientPanel.rating,
                                            )}
                                            {"\u2606".repeat(
                                                5 - clientPanel.rating,
                                            )}
                                        </span>
                                    </p>
                                )}{" "}
                                {clientPanel.feedback && (
                                    <p
                                        style={{
                                            marginTop: 8,
                                            fontStyle: "italic",
                                            color: "#9CA3AF",
                                        }}
                                    >
                                        &ldquo;{clientPanel.feedback}&rdquo;
                                    </p>
                                )}{" "}
                            </div>{" "}
                        </div>{" "}
                        {clientHistory.length > 0 && (
                            <div>
                                {" "}
                                <p
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: "#6B7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: 10,
                                    }}
                                >
                                    Booking History
                                </p>{" "}
                                {clientHistory.map((b) => (
                                    <div
                                        key={b.booking_id}
                                        style={{
                                            background: "#F5F7FA",
                                            borderRadius: 12,
                                            padding: 12,
                                            marginBottom: 8,
                                        }}
                                    >
                                        {" "}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            {" "}
                                            <div>
                                                {" "}
                                                <p
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#3F7DFF",
                                                        fontWeight: 600,
                                                        margin: 0,
                                                    }}
                                                >
                                                    #{b.booking_id}
                                                </p>{" "}
                                                <p
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#1E2F5F",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {b.service}
                                                </p>{" "}
                                                <p
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#9CA3AF",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {b.scheduled_date}
                                                </p>{" "}
                                            </div>{" "}
                                            <StatusBadge
                                                status={b.booking_status}
                                            />{" "}
                                        </div>{" "}
                                    </div>
                                ))}{" "}
                            </div>
                        )}{" "}
                    </div>{" "}
                </div>
            )}{" "}
        </div>
    );
}
export { Bookings as default };
