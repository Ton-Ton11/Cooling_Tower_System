import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../Components/Modal";
import StatusBadge from "../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
    formatDateTime,
} from "../utils/superAdmin";

const tabs = [
    "Pending",
    "Approved",
    "Dispatched",
    "Completed",
    "Cancelled",
    "All",
];

function Bookings({ addToast, onDataChanged }) {
    const [tab, setTab] = useState("Pending");
    const [bookings, setBookings] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [approveModal, setApproveModal] = useState(null);
    const [assignment, setAssignment] = useState({
        assigned_tech_id: "",
        booking_status: "Approved",
    });
    const [clientPanel, setClientPanel] = useState(null);

    const fetchBookings = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    SUPER_ADMIN_ENDPOINTS.bookings,
                );
                setBookings(Array.isArray(data?.data) ? data.data : []);
                setTechnicians(
                    Array.isArray(data?.technicians) ? data.technicians : [],
                );
            } catch (error) {
                addToast(
                    extractErrorMessage(error, "Unable to load bookings."),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const filtered = useMemo(
        () =>
            tab === "All"
                ? bookings
                : bookings.filter((booking) => booking.booking_status === tab),
        [bookings, tab],
    );

    const clientHistory = useMemo(() => {
        if (!clientPanel) {
            return [];
        }

        return bookings.filter(
            (booking) =>
                booking.client_id === clientPanel.client_id &&
                booking.booking_id !== clientPanel.booking_id,
        );
    }, [bookings, clientPanel]);

    const openAssignmentModal = (booking) => {
        setApproveModal(booking);
        setAssignment({
            assigned_tech_id: String(
                booking.assigned_tech_id ?? technicians[0]?.user_id ?? "",
            ),
            booking_status:
                booking.booking_status === "Dispatched"
                    ? "Dispatched"
                    : "Approved",
        });
    };

    const handleAssign = async () => {
        if (assigning || !approveModal) {
            return;
        }

        if (!assignment.assigned_tech_id) {
            addToast("Select a technician before saving.", "error");
            return;
        }

        setAssigning(true);

        try {
            const { data } = await window.axios.patch(
                SUPER_ADMIN_ENDPOINTS.approveBooking(approveModal.booking_id),
                {
                    assigned_tech_id: Number(assignment.assigned_tech_id),
                    booking_status: assignment.booking_status,
                },
            );

            addToast(data?.message || "Booking updated successfully.");
            setApproveModal(null);
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to update the booking."),
                "error",
            );
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Bookings Management
                    </h1>
                    <p className="page-subtitle">
                        Review, approve, assign, and track live service bookings
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                        {
                            bookings.filter(
                                (booking) => booking.booking_status === "Pending",
                            ).length
                        }{" "}
                        pending
                    </span>
                    <button className="btn-secondary" onClick={() => fetchBookings()}>
                        Refresh
                    </button>
                </div>
            </div>

            <div
                className="tab-bar"
                style={{ marginBottom: 20, display: "inline-flex" }}
            >
                {tabs.map((currentTab) => {
                    const count =
                        currentTab === "All"
                            ? bookings.length
                            : bookings.filter(
                                  (booking) =>
                                      booking.booking_status === currentTab,
                              ).length;

                    return (
                        <button
                            key={currentTab}
                            className={`tab-item ${tab === currentTab ? "active" : ""}`}
                            onClick={() => setTab(currentTab)}
                        >
                            {currentTab}
                            <span
                                style={{
                                    marginLeft: 6,
                                    fontSize: 10,
                                    color:
                                        tab === currentTab
                                            ? "#3F7DFF"
                                            : "#9CA3AF",
                                }}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="card" style={{ padding: 20, marginTop: 16 }}>
                <p className="section-label" style={{ marginBottom: 12 }}>
                    Booking Details — manage assignments and view client records
                </p>

                {loading ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        Loading bookings...
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        No bookings match the selected tab.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 860,
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "ID",
                                        "Client",
                                        "Service",
                                        "Scheduled",
                                        "Technician",
                                        "Status",
                                        "Payment",
                                        "Action",
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
                                {filtered.map((booking) => {
                                    const canAssign = [
                                        "Pending",
                                        "Approved",
                                        "Dispatched",
                                    ].includes(booking.booking_status);

                                    return (
                                        <tr
                                            key={booking.booking_id}
                                            style={{
                                                borderTop: "1px solid #F5F7FA",
                                            }}
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
                                                #{booking.booking_id}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 13,
                                                    color: "#1E2F5F",
                                                }}
                                            >
                                                {booking.client_name}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    color: "#6B7280",
                                                    maxWidth: 220,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {booking.service}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    color: "#9CA3AF",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatDateTime(
                                                    booking.scheduled_date,
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 13,
                                                    color: booking.assigned_tech_name
                                                        ? "#374151"
                                                        : "#9CA3AF",
                                                }}
                                            >
                                                {booking.assigned_tech_name ||
                                                    "Unassigned"}
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <StatusBadge
                                                    status={booking.booking_status}
                                                />
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <StatusBadge
                                                    status={booking.payment_status}
                                                />
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    {canAssign && (
                                                        <button
                                                            className="btn-primary"
                                                            style={{
                                                                padding:
                                                                    "5px 10px",
                                                                fontSize: 11,
                                                            }}
                                                            onClick={() =>
                                                                openAssignmentModal(
                                                                    booking,
                                                                )
                                                            }
                                                        >
                                                            {booking.booking_status ===
                                                            "Pending"
                                                                ? "✅ Approve"
                                                                : "🛠 Reassign"}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11,
                                                        }}
                                                        onClick={() =>
                                                            setClientPanel(booking)
                                                        }
                                                    >
                                                        👤 Client
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

            <Modal
                open={!!approveModal}
                title={
                    approveModal?.booking_status === "Pending"
                        ? `Approve Booking #${approveModal?.booking_id}`
                        : `Update Booking #${approveModal?.booking_id}`
                }
                message={
                    approveModal
                        ? `Assign a technician and update the live status for ${approveModal.client_name}.`
                        : ""
                }
                confirmLabel={assigning ? "Saving..." : "Save Changes"}
                confirmDisabled={
                    assigning ||
                    technicians.length === 0 ||
                    !assignment.assigned_tech_id
                }
                maxWidth={560}
                onConfirm={handleAssign}
                onCancel={() => !assigning && setApproveModal(null)}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                    }}
                >
                    <div style={{ gridColumn: "1 / -1" }}>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Technician
                        </p>
                        <select
                            className="input-field"
                            value={assignment.assigned_tech_id}
                            onChange={(event) =>
                                setAssignment((previous) => ({
                                    ...previous,
                                    assigned_tech_id: event.target.value,
                                }))
                            }
                        >
                            {technicians.length === 0 ? (
                                <option value="">
                                    No active technicians available
                                </option>
                            ) : (
                                technicians.map((technician) => (
                                    <option
                                        key={technician.user_id}
                                        value={technician.user_id}
                                    >
                                        {technician.full_name}
                                        {technician.certificate_expiry
                                            ? ` · Expires ${technician.certificate_expiry}`
                                            : ""}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Booking Status
                        </p>
                        <select
                            className="input-field"
                            value={assignment.booking_status}
                            onChange={(event) =>
                                setAssignment((previous) => ({
                                    ...previous,
                                    booking_status: event.target.value,
                                }))
                            }
                        >
                            <option value="Approved">Approved</option>
                            <option value="Dispatched">Dispatched</option>
                        </select>
                    </div>

                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            Service
                        </p>
                        <div
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: "#F5F7FA",
                                border: "1px solid #E5E7EB",
                                fontSize: 13,
                                color: "#374151",
                            }}
                        >
                            {approveModal?.service}
                        </div>
                    </div>
                </div>
            </Modal>

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
                    <div
                        style={{
                            width: 420,
                            height: "100vh",
                            background: "#fff",
                            borderLeft: "1px solid #E5E7EB",
                            overflow: "auto",
                            padding: 24,
                            animation: "slideInRight 0.25s ease",
                            boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 20,
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                    margin: 0,
                                }}
                            >
                                Client Details
                            </h3>
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
                            </button>
                        </div>

                        <div
                            style={{
                                background: "#F5F7FA",
                                borderRadius: 14,
                                padding: 16,
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: 12,
                                    alignItems: "center",
                                    marginBottom: 12,
                                }}
                            >
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
                                </div>
                                <div>
                                    <p
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 700,
                                            color: "#1E2F5F",
                                            margin: 0,
                                        }}
                                    >
                                        {clientPanel.client_name}
                                    </p>
                                    <p
                                        style={{
                                            fontSize: 12,
                                            color: "#9CA3AF",
                                            margin: "2px 0 0",
                                        }}
                                    >
                                        Client ID #{clientPanel.client_id}
                                    </p>
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "#6B7280",
                                    lineHeight: 1.9,
                                }}
                            >
                                <p style={{ margin: 0 }}>
                                    📋 Service:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {clientPanel.service}
                                    </strong>
                                </p>
                                <p style={{ margin: 0 }}>
                                    📅 Scheduled:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {formatDateTime(clientPanel.scheduled_date)}
                                    </strong>
                                </p>
                                <p style={{ margin: 0 }}>
                                    📞 Contact:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {clientPanel.client_contact_number ||
                                            "Not provided"}
                                    </strong>
                                </p>
                                <p style={{ margin: 0 }}>
                                    ✉️ Email:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {clientPanel.client_email ||
                                            "Not provided"}
                                    </strong>
                                </p>
                                <p style={{ margin: 0 }}>
                                    📍 Address:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {clientPanel.client_address ||
                                            "Not provided"}
                                    </strong>
                                </p>
                                <p style={{ margin: 0 }}>
                                    💳 Payment:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {clientPanel.payment_status}
                                        {clientPanel.amount_paid
                                            ? ` · ${formatCurrency(clientPanel.amount_paid)}`
                                            : ""}
                                    </strong>
                                </p>
                                <p style={{ margin: 0 }}>
                                    🧑‍🔧 Assigned Tech:{" "}
                                    <strong style={{ color: "#1E2F5F" }}>
                                        {clientPanel.assigned_tech_name ||
                                            "Unassigned"}
                                    </strong>
                                </p>
                            </div>
                        </div>

                        {clientHistory.length > 0 && (
                            <div>
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
                                </p>
                                {clientHistory.map((booking) => (
                                    <div
                                        key={booking.booking_id}
                                        style={{
                                            background: "#F5F7FA",
                                            borderRadius: 12,
                                            padding: 12,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: 8,
                                            }}
                                        >
                                            <div>
                                                <p
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#3F7DFF",
                                                        fontWeight: 600,
                                                        margin: 0,
                                                    }}
                                                >
                                                    #{booking.booking_id}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#1E2F5F",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {booking.service}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#9CA3AF",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {formatDateTime(
                                                        booking.scheduled_date,
                                                    )}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={booking.booking_status}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Bookings;
