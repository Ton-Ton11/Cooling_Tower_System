import { useCallback, useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

const tabs = [
    "Pending",
    "Approved",
    "Dispatched",
    "In-Progress",
    "Completed",
    "Cancelled",
    "All",
];

function Bookings({ addToast, onDataChanged, endpoints, readOnly = false }) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [tab, setTab] = useState("Pending");
    const [bookings, setBookings] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [approveModal, setApproveModal] = useState(null);
    const [completeModal, setCompleteModal] = useState(null);
    const [assignment, setAssignment] = useState({
        lead_technician_id: "",
        assistant_technician_id: "",
        booking_status: "Approved",
    });
    const [clientPanel, setClientPanel] = useState(null);

    const fetchBookings = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(ep.bookings);
                setBookings(Array.isArray(data?.data) ? data.data : []);
                setTechnicians(
                    Array.isArray(data?.technicians) ? data.technicians : [],
                );
                if (Array.isArray(data?.teams)) {
                    setTeams(data.teams);
                } else if (ep.teams) {
                    try {
                        const teamsRes = await window.axios.get(ep.teams);
                        setTeams(Array.isArray(teamsRes.data?.data) ? teamsRes.data.data : []);
                    } catch {
                        // ignore teams error
                    }
                }
            } catch (error) {
                addToast(
                    extractErrorMessage(error, "Unable to load bookings."),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast, ep],
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
            lead_technician_id: booking.lead_technician_id
                ? String(booking.lead_technician_id)
                : (booking.assigned_tech_id ? String(booking.assigned_tech_id) : ""),
            assistant_technician_id: booking.assistant_technician_id
                ? String(booking.assistant_technician_id)
                : "",
            booking_status:
                booking.booking_status === "Dispatched"
                    ? "Dispatched"
                    : "Approved",
        });
    };

    const handleSwapRoles = () => {
        setAssignment((prev) => ({
            ...prev,
            lead_technician_id: prev.assistant_technician_id,
            assistant_technician_id: prev.lead_technician_id,
        }));
    };

    const handleAssign = async () => {
        if (assigning || !approveModal) {
            return;
        }

        if (!assignment.lead_technician_id || !assignment.assistant_technician_id) {
            addToast("Please select both a Lead Technician and an Assistant Technician.", "error");
            return;
        }

        if (assignment.lead_technician_id === assignment.assistant_technician_id) {
            addToast("The Lead and Assistant must be two different technicians.", "error");
            return;
        }

        setAssigning(true);

        try {
            const payload = {
                lead_technician_id: Number(assignment.lead_technician_id),
                assistant_technician_id: Number(assignment.assistant_technician_id),
                booking_status: assignment.booking_status,
            };

            const { data } = await window.axios.patch(
                ep.approveBooking(approveModal.booking_id),
                payload,
            );

            addToast(data?.message || "Technicians assigned successfully.");
            setApproveModal(null);
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to update the booking assignment."),
                "error",
            );
        } finally {
            setAssigning(false);
        }
    };

    const handleCompleteBooking = async () => {
        if (completing || !completeModal) return;
        setCompleting(true);
        try {
            const completeEndpoint = ep.completeBooking ? ep.completeBooking(completeModal.booking_id) : `/api/manager/bookings/${completeModal.booking_id}/complete`;
            const { data } = await window.axios.patch(completeEndpoint);
            addToast(data?.message || `Booking #${completeModal.booking_id} declared completed!`);
            setCompleteModal(null);
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to complete booking."),
                "error",
            );
        } finally {
            setCompleting(false);
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
                                        "Assigned Team & Tech",
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
                                    const canComplete = [
                                        "Approved",
                                        "Dispatched",
                                        "In-Progress",
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
                                                    maxWidth: 200,
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
                                                    fontSize: 12,
                                                }}
                                            >
                                                {booking.lead_technician_name || booking.assigned_tech_name ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#0E1A33" }}>
                                                            <span>👤</span>
                                                            <span>{booking.lead_technician_name || booking.assigned_tech_name}</span>
                                                            <span style={{ fontSize: 9, fontWeight: 800, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>
                                                                Lead
                                                            </span>
                                                        </div>
                                                        {booking.assistant_technician_name && (
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", fontWeight: 600 }}>
                                                                <span>👤</span>
                                                                <span>{booking.assistant_technician_name}</span>
                                                                <span style={{ fontSize: 9, fontWeight: 800, background: "#F1F5F9", color: "#64748B", padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>
                                                                    Assistant
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "#D97706", fontWeight: 600, fontSize: 11, background: "#FEF3C7", padding: "2px 8px", borderRadius: 6 }}>
                                                        Awaiting Assignment
                                                    </span>
                                                )}
                                                {booking.assigned_by_name && (
                                                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
                                                        assigned by {booking.assigned_by_name}
                                                    </div>
                                                )}
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
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {canAssign && !readOnly && (
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
                                                                ? "✅ Assign Team"
                                                                : "🛠 Reassign"}
                                                        </button>
                                                    )}
                                                    {canComplete && !readOnly && (
                                                        <button
                                                            className="btn-secondary"
                                                            style={{
                                                                padding: "5px 10px",
                                                                fontSize: 11,
                                                                background: "#ECFDF5",
                                                                color: "#065F46",
                                                                borderColor: "#A7F3D0",
                                                                fontWeight: 600,
                                                            }}
                                                            onClick={() => setCompleteModal(booking)}
                                                        >
                                                            🏁 Complete
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

            {/* Assign Technicians Modal */}
            {(() => {
                const selectedLead = technicians.find((t) => String(t.user_id) === String(assignment.lead_technician_id));
                const selectedAssistant = technicians.find((t) => String(t.user_id) === String(assignment.assistant_technician_id));
                const isBothSelected = Boolean(selectedLead && selectedAssistant && selectedLead.user_id !== selectedAssistant.user_id);

                return (
                    <Modal
                        open={!!approveModal}
                        title="ASSIGN TECHNICIANS"
                        message="Select the two technicians who will handle this service."
                        confirmLabel={assigning ? "Confirming..." : "Confirm Assignment"}
                        confirmDisabled={assigning || !isBothSelected}
                        maxWidth={620}
                        onConfirm={handleAssign}
                        onCancel={() => !assigning && setApproveModal(null)}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Customer & Service Summary Box */}
                            {approveModal && (
                                <div
                                    style={{
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                        borderRadius: 12,
                                        padding: 14,
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 12,
                                        fontSize: 12,
                                    }}
                                >
                                    <div>
                                        <span style={{ color: "#64748B", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.04em" }}>Customer Details</span>
                                        <div style={{ fontWeight: 800, color: "#1E2F5F", marginTop: 2, fontSize: 13 }}>{approveModal.client_name}</div>
                                        <div style={{ color: "#475569", marginTop: 2 }}>📞 {approveModal.client_contact_number || "No contact"}</div>
                                        <div style={{ color: "#475569", marginTop: 2 }}>📍 {approveModal.client_address || "No address"}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748B", fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.04em" }}>Requested Service</span>
                                        <div style={{ fontWeight: 800, color: "#2563EB", marginTop: 2, fontSize: 13 }}>{approveModal.service}</div>
                                        <div style={{ color: "#475569", marginTop: 2 }}>📅 {formatDateTime(approveModal.scheduled_date)}</div>
                                        <div style={{ color: "#475569", marginTop: 2 }}>💳 {approveModal.payment_status} ({formatCurrency(approveModal.amount_paid)})</div>
                                    </div>
                                </div>
                            )}

                            {/* Assigned By Info */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "#F1F5F9",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: "#334155",
                                }}
                            >
                                <span>Assigned By:</span>
                                <strong style={{ color: "#1E2F5F" }}>
                                    {currentUser?.full_name || currentUser?.name || "Manager / Super Admin"}
                                </strong>
                            </div>

                            {/* Technician Selection Controls */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                {/* Lead Technician */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                        <label className="section-label" style={{ margin: 0, fontWeight: 700, color: "#1E2F5F" }}>
                                            LEAD TECHNICIAN
                                        </label>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "1px 6px", borderRadius: 4 }}>
                                            Primary Lead
                                        </span>
                                    </div>
                                    <select
                                        className="input-field"
                                        value={assignment.lead_technician_id}
                                        onChange={(event) =>
                                            setAssignment((prev) => ({
                                                ...prev,
                                                lead_technician_id: event.target.value,
                                            }))
                                        }
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, borderColor: "#CBD5E1" }}
                                    >
                                        <option value="">Select Technician</option>
                                        {technicians.map((technician) => {
                                            const isAssistant = String(technician.user_id) === String(assignment.assistant_technician_id);
                                            return (
                                                <option
                                                    key={technician.user_id}
                                                    value={technician.user_id}
                                                    disabled={isAssistant}
                                                >
                                                    {technician.full_name} {isAssistant ? "(Selected as Assistant)" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Assistant Technician */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                        <label className="section-label" style={{ margin: 0, fontWeight: 700, color: "#1E2F5F" }}>
                                            ASSISTANT TECHNICIAN
                                        </label>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", background: "#F1F5F9", padding: "1px 6px", borderRadius: 4 }}>
                                            Partner Tech
                                        </span>
                                    </div>
                                    <select
                                        className="input-field"
                                        value={assignment.assistant_technician_id}
                                        onChange={(event) =>
                                            setAssignment((prev) => ({
                                                ...prev,
                                                assistant_technician_id: event.target.value,
                                            }))
                                        }
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, borderColor: "#CBD5E1" }}
                                    >
                                        <option value="">Select Technician</option>
                                        {technicians.map((technician) => {
                                            const isLead = String(technician.user_id) === String(assignment.lead_technician_id);
                                            return (
                                                <option
                                                    key={technician.user_id}
                                                    value={technician.user_id}
                                                    disabled={isLead}
                                                >
                                                    {technician.full_name} {isLead ? "(Selected as Lead)" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Swap Roles Button */}
                            {(assignment.lead_technician_id || assignment.assistant_technician_id) && (
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                        type="button"
                                        onClick={handleSwapRoles}
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            color: "#2563EB",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <span>⇄</span> Swap Roles (Lead & Assistant)
                                    </button>
                                </div>
                            )}

                            {/* ASSIGNED TEAM VISUAL CONFIRMATION BOX */}
                            <div
                                style={{
                                    background: isBothSelected ? "#F0FDF4" : "#F8FAFC",
                                    border: `1.5px solid ${isBothSelected ? "#86EFAC" : "#E2E8F0"}`,
                                    borderRadius: 14,
                                    padding: "16px 18px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: isBothSelected ? "#166534" : "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                        ASSIGNED TEAM
                                    </span>
                                    {isBothSelected ? (
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", display: "flex", alignItems: "center", gap: 4 }}>
                                            ✓ 2 Technicians Assigned
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706" }}>
                                            Exactly 2 Technicians Required
                                        </span>
                                    )}
                                </div>

                                {isBothSelected ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", padding: "10px 14px", borderRadius: 10, border: "1px solid #DCFCE7" }}>
                                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                                                👤
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0E1A33" }}>
                                                    {selectedLead?.full_name}
                                                </p>
                                                <span style={{ fontSize: 10, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                    LEAD TECHNICIAN
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", padding: "10px 14px", borderRadius: 10, border: "1px solid #DCFCE7" }}>
                                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                                                👤
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0E1A33" }}>
                                                    {selectedAssistant?.full_name}
                                                </p>
                                                <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                    ASSISTANT TECHNICIAN
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ padding: "12px", textAlign: "center", color: "#94A3B8", fontSize: 12, background: "#FFFFFF", borderRadius: 10, border: "1px dashed #CBD5E1" }}>
                                        {assignment.lead_technician_id && !assignment.assistant_technician_id
                                            ? "👤 Lead selected. Please select an Assistant Technician to complete the pair."
                                            : !assignment.lead_technician_id && assignment.assistant_technician_id
                                            ? "👤 Assistant selected. Please select a Lead Technician to complete the pair."
                                            : "Select both a Lead Technician and an Assistant Technician above."}
                                    </div>
                                )}
                            </div>

                            {/* Booking Status Dropdown */}
                            <div>
                                <label className="section-label" style={{ marginBottom: 6, display: "block", fontWeight: 700, color: "#1E2F5F" }}>
                                    BOOKING STATUS
                                </label>
                                <select
                                    className="input-field"
                                    value={assignment.booking_status}
                                    onChange={(event) =>
                                        setAssignment((previous) => ({
                                            ...previous,
                                            booking_status: event.target.value,
                                        }))
                                    }
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, borderColor: "#CBD5E1" }}
                                >
                                    <option value="Approved">Approved</option>
                                    <option value="Dispatched">Dispatched</option>
                                </select>
                            </div>
                        </div>
                    </Modal>
                );
            })()}

            {/* Declare Completed Modal */}
            <Modal
                open={!!completeModal}
                title={`Declare Booking #${completeModal?.booking_id} Completed`}
                message="Are you sure the technician team has finished this service job?"
                confirmLabel={completing ? "Declaring Completed..." : "Confirm Booking Completed"}
                confirmDisabled={completing}
                maxWidth={500}
                onConfirm={handleCompleteBooking}
                onCancel={() => !completing && setCompleteModal(null)}
            >
                {completeModal && (
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                        <div
                            style={{
                                background: "#F9FAFB",
                                border: "1px solid #E5E7EB",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 14,
                            }}
                        >
                            <p style={{ margin: "0 0 4px" }}>
                                <strong>Customer:</strong> {completeModal.client_name}
                            </p>
                            <p style={{ margin: "0 0 4px" }}>
                                <strong>Service:</strong> {completeModal.service}
                            </p>
                            <p style={{ margin: "0 0 4px" }}>
                                <strong>Assigned Team:</strong> {completeModal.lead_technician_name ? `${completeModal.lead_technician_name} (Lead) & ${completeModal.assistant_technician_name || "Assistant"}` : (completeModal.assigned_tech_name || "Unassigned")}
                            </p>
                        </div>
                        <div
                            style={{
                                background: "#ECFDF5",
                                border: "1px solid #A7F3D0",
                                borderRadius: 8,
                                padding: "10px 12px",
                                fontSize: 12,
                                color: "#065F46",
                            }}
                        >
                            🏁 Declaring this booking completed will close the active service cycle and update the status across Super Admin, Manager, Technician, and Customer views immediately.
                        </div>
                    </div>
                )}
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
