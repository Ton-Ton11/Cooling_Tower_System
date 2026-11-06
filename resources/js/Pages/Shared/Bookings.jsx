
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
import {
    toLocalYmd,
    isSundayDate,
    MAX_DAILY_SLOTS,
    MAX_JOBS_PER_TEAM_PER_DAY,
} from "../../utils/bookingSchedule";

const tabs = [
    "All",
    "Pending",
    "Approved",
    "In-Progress",
    "Completed",
    "Cancelled",
];

const PhoneIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
);
const MapPinIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const CalendarIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const CreditCardIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);
const MailIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);
const UserIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const FileTextIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);
const CheckIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const WrenchIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
);
const ReportFlagIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

function Bookings({ addToast, onDataChanged, endpoints, readOnly = false, navMeta = null, defaultTab = "All" }) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const initialTab = navMeta?.tab || defaultTab || "All";
    const [tab, setTab] = useState(initialTab);

    useEffect(() => {
        const nextTab = navMeta?.tab || defaultTab || "All";
        setTab(nextTab);
    }, [navMeta?.tab, defaultTab]);
    const [bookings, setBookings] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [adminAssistants, setAdminAssistants] = useState([]);
    const [unitOrders, setUnitOrders] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [approveModal, setApproveModal] = useState(null);
    const [completeModal, setCompleteModal] = useState(null);
    const [purchaseReceiptFile, setPurchaseReceiptFile] = useState(null);
    const [purchaseReceiptPreview, setPurchaseReceiptPreview] = useState("");
    const [confirmOrderModal, setConfirmOrderModal] = useState(null);
    const [confirmOrderForm, setConfirmOrderForm] = useState({ delivery_fee: "", notes: "" });
    const [confirmOrderReceiptFile, setConfirmOrderReceiptFile] = useState(null);
    const [confirmOrderReceiptPreview, setConfirmOrderReceiptPreview] = useState("");
    const [confirmingOrder, setConfirmingOrder] = useState(false);
    const [assignment, setAssignment] = useState({
        booking_status: "Approved",
        assign_mode: "individual", // "individual" | "team"
        assigned_team_id: "",
        lead_technician_id: "",
        assistant_technician_id: "",
        ocular_personnel_ids: [],
        manager_note: "",
    });
    const [completionForm, setCompletionForm] = useState({
        requested_by_name: "",
        payment_verified: true,
        amount_turned_over: "",
        verification_notes: "",
    });
    const [invalidModal, setInvalidModal] = useState(false);
    const [invalidReason, setInvalidReason] = useState("");
    const [invalidating, setInvalidating] = useState(false);

    const [reportModal, setReportModal] = useState(null);
    const [reportForm, setReportForm] = useState({ subject: "", elaboration: "" });
    const [reportConfirmModal, setReportConfirmModal] = useState(false);
    const [reportingSubmitting, setReportingSubmitting] = useState(false);

    const [clientPanel, setClientPanel] = useState(null);
    const [disabledDatesModal, setDisabledDatesModal] = useState(false);
    const [disabledDatesList, setDisabledDatesList] = useState([]);
    const [loadingDisabledDates, setLoadingDisabledDates] = useState(false);
    const [disabledDateForm, setDisabledDateForm] = useState({ date: "", reason: "" });
    const [savingDisabledDate, setSavingDisabledDate] = useState(false);

    const fetchDisabledDates = useCallback(async () => {
        if (!ep.disabledDates) return;
        setLoadingDisabledDates(true);
        try {
            const { data } = await window.axios.get(ep.disabledDates);
            setDisabledDatesList(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            // ignore
        } finally {
            setLoadingDisabledDates(false);
        }
    }, [ep.disabledDates]);

    const handleAddDisabledDate = async (e) => {
        e.preventDefault();
        if (!disabledDateForm.date) {
            addToast("Please select a date.", "error");
            return;
        }
        setSavingDisabledDate(true);
        try {
            const epStore = ep.storeDisabledDate || ep.disabledDates;
            const { data } = await window.axios.post(epStore, {
                disabled_date: disabledDateForm.date,
                reason: disabledDateForm.reason.trim(),
            });
            addToast(data?.message || "Date disabled for bookings.");
            setDisabledDateForm({ date: "", reason: "" });
            fetchDisabledDates();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to disable date."), "error");
        } finally {
            setSavingDisabledDate(false);
        }
    };

    const handleRemoveDisabledDate = async (id) => {
        try {
            const epDel = ep.deleteDisabledDate ? ep.deleteDisabledDate(id) : `/api/manager/disabled-dates/${id}`;
            const { data } = await window.axios.delete(epDel);
            addToast(data?.message || "Date re-enabled for bookings.");
            fetchDisabledDates();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to re-enable date."), "error");
        }
    };

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
                setAdminAssistants(
                    Array.isArray(data?.admin_assistants) ? data.admin_assistants : [],
                );
                setUnitOrders(
                    Array.isArray(data?.unit_orders) ? data.unit_orders : [],
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
                : tab === "Pending"
                ? bookings.filter((booking) =>
                      ["Pending", "Payment Incomplete", "Reschedule Notice"].includes(
                          booking.booking_status,
                      ),
                  )
                : tab === "Completed"
                ? bookings.filter((booking) =>
                      ["Partially Completed", "Completed"].includes(
                          booking.booking_status,
                      ),
                  )
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
        const isOcular = Boolean(booking.is_ocular_inspection || Number(booking.service_id) === 4 || String(booking.service || "").toLowerCase().includes("ocular"));
        const existingOcularIds = Array.isArray(booking.ocular_personnel)
            ? booking.ocular_personnel.map((p) => Number(p.user_id)).filter(Boolean)
            : [];
        setApproveModal({ ...booking, is_ocular_inspection: isOcular });
        setAssignment({
            booking_status: isOcular
                ? (booking.booking_status === "Reschedule Notice" ? "Reschedule Notice" : "Approved")
                : (["Payment Incomplete", "Reschedule Notice"].includes(booking.booking_status)
                    ? booking.booking_status
                    : "Approved"),
            assign_mode: booking.assigned_team_id ? "team" : "individual",
            assigned_team_id: booking.assigned_team_id ? String(booking.assigned_team_id) : "",
            lead_technician_id: booking.lead_technician_id
                ? String(booking.lead_technician_id)
                : (booking.assigned_tech_id ? String(booking.assigned_tech_id) : ""),
            assistant_technician_id: booking.assistant_technician_id
                ? String(booking.assistant_technician_id)
                : "",
            ocular_personnel_ids: existingOcularIds,
            manager_note: "",
        });
    };

    const openCompleteModal = (booking) => {
        const turnover = booking.payment_turnover || booking.service_details?.payment_turnover || {};
        setCompleteModal(booking);
        setPurchaseReceiptFile(null);
        setPurchaseReceiptPreview("");
        setInvalidModal(false);
        setInvalidReason("");
        setCompletionForm({
            requested_by_name: booking.requested_by_name || booking.service_details?.requested_by_name || booking.client_name || "",
            payment_verified: true,
            amount_turned_over: turnover.net_collected !== undefined ? String(turnover.net_collected) : "",
            verification_notes: "",
        });
    };

    const handleInvalidateTurnover = async () => {
        if (invalidating || !completeModal) return;
        if (!invalidReason.trim()) {
            addToast("Please enter the reason why the turnover is invalid.", "error");
            return;
        }
        setInvalidating(true);
        try {
            const endpoint = ep.invalidateTurnover
                ? ep.invalidateTurnover(completeModal.booking_id)
                : `/manager/bookings/${completeModal.booking_id}/invalidate-turnover`;
            const { data } = await window.axios.patch(endpoint, {
                invalid_reason: invalidReason.trim(),
            });
            addToast(data?.message || `Turnover for Booking #${completeModal.booking_id} marked as Invalid.`);
            setInvalidModal(false);
            setCompleteModal(null);
            setInvalidReason("");
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to mark turnover as invalid."), "error");
        } finally {
            setInvalidating(false);
        }
    };

    const openReportModal = (booking) => {
        setReportModal(booking);
        setReportForm({ subject: "", elaboration: "" });
        setReportConfirmModal(false);
    };

    const handleReportSubmitConfirm = async () => {
        if (reportingSubmitting || !reportModal) return;
        setReportingSubmitting(true);
        try {
            const endpoint = ep.reportBooking
                ? ep.reportBooking(reportModal.booking_id)
                : `/manager/bookings/${reportModal.booking_id}/report`;
            const { data } = await window.axios.post(endpoint, {
                subject: reportForm.subject.trim(),
                elaboration: reportForm.elaboration.trim(),
            });
            addToast(data?.message || "Report submitted to Super Admin.");
            setReportConfirmModal(false);
            setReportModal(null);
            setReportForm({ subject: "", elaboration: "" });
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to submit report."), "error");
        } finally {
            setReportingSubmitting(false);
        }
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

        const isOcular = Boolean(approveModal.is_ocular_inspection);

        if (assignment.booking_status === "Approved") {
            if (isOcular) {
                const count = Array.isArray(assignment.ocular_personnel_ids) ? assignment.ocular_personnel_ids.length : 0;
                if (count < 1 || count > 4) {
                    addToast("Please assign between 1 and 4 personnel (Technician or Admin Assistant) for Ocular Inspection.", "error");
                    return;
                }
            } else if (assignment.assign_mode === "team") {
                if (!assignment.assigned_team_id && (!assignment.lead_technician_id || !assignment.assistant_technician_id)) {
                    addToast("Please select a formed team with at least two technicians.", "error");
                    return;
                }
            } else {
                if (!assignment.lead_technician_id || !assignment.assistant_technician_id) {
                    addToast("Please select both a Lead Technician and an Assistant Technician.", "error");
                    return;
                }
                if (assignment.lead_technician_id === assignment.assistant_technician_id) {
                    addToast("The Lead and Assistant must be two different technicians.", "error");
                    return;
                }
            }
        }

        setAssigning(true);

        try {
            const payload = {
                booking_status: assignment.booking_status,
                manager_note: assignment.manager_note?.trim() || null,
            };

            if (assignment.booking_status === "Approved") {
                if (isOcular) {
                    payload.ocular_personnel_ids = assignment.ocular_personnel_ids.map(Number);
                } else {
                    if (assignment.assign_mode === "team" && assignment.assigned_team_id) {
                        payload.assigned_team_id = Number(assignment.assigned_team_id);
                    }
                    if (assignment.lead_technician_id) {
                        payload.lead_technician_id = Number(assignment.lead_technician_id);
                    }
                    if (assignment.assistant_technician_id) {
                        payload.assistant_technician_id = Number(assignment.assistant_technician_id);
                    }
                }
            }

            const { data } = await window.axios.patch(
                ep.approveBooking(approveModal.booking_id),
                payload,
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

    const handleCompleteBooking = async () => {
        if (completing || !completeModal) return;
        const hasLinkedUnitOrder = Boolean(completeModal.ac_unit_order);
        if (hasLinkedUnitOrder && !purchaseReceiptFile) {
            addToast("Please upload a picture of the AC unit purchase receipt to confirm unit sale.", "error");
            return;
        }
        const turnover = completeModal.payment_turnover || completeModal.service_details?.payment_turnover || {};
        const reqByName = (completionForm.requested_by_name || completeModal.client_name || "Customer").trim();
        const amountVal = completionForm.amount_turned_over !== ""
            ? Number(completionForm.amount_turned_over)
            : (turnover.net_collected !== undefined ? Number(turnover.net_collected) : null);

        setCompleting(true);
        try {
            const completeEndpoint = ep.completeBooking ? ep.completeBooking(completeModal.booking_id) : `/manager/bookings/${completeModal.booking_id}/complete`;
            let res;
            if (hasLinkedUnitOrder && purchaseReceiptFile) {
                const fd = new FormData();
                fd.append("requested_by_name", reqByName);
                fd.append("payment_verified", "1");
                if (amountVal !== null && Number.isFinite(amountVal)) {
                    fd.append("amount_turned_over", String(amountVal));
                }
                if (completionForm.verification_notes.trim()) {
                    fd.append("verification_notes", completionForm.verification_notes.trim());
                }
                fd.append("purchase_receipt_image", purchaseReceiptFile);
                res = await window.axios.post(completeEndpoint, fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                res = await window.axios.patch(completeEndpoint, {
                    requested_by_name: reqByName,
                    payment_verified: 1,
                    amount_turned_over: amountVal,
                    verification_notes: completionForm.verification_notes.trim() || null,
                });
            }
            addToast(res.data?.message || `Booking #${completeModal.booking_id} confirmed and declared completed!`);
            setCompleteModal(null);
            setPurchaseReceiptFile(null);
            setPurchaseReceiptPreview("");
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

    const openConfirmOrderModal = (order) => {
        setConfirmOrderModal(order);
        setConfirmOrderForm({
            delivery_fee: order.fulfillment_type === "delivery" ? String(order.delivery_fee || 500) : "0",
            notes: "",
        });
        setConfirmOrderReceiptFile(null);
        setConfirmOrderReceiptPreview("");
    };

    const handleConfirmStandaloneOrder = async (e) => {
        e?.preventDefault();
        if (confirmingOrder || !confirmOrderModal) return;
        if (!confirmOrderReceiptFile) {
            addToast("Please upload a picture of the unit purchase receipt.", "error");
            return;
        }
        setConfirmingOrder(true);
        try {
            const fd = new FormData();
            fd.append("purchase_receipt_image", confirmOrderReceiptFile);
            if (confirmOrderModal.fulfillment_type === "delivery") {
                fd.append("delivery_fee", String(Number(confirmOrderForm.delivery_fee || 0)));
            }
            if (confirmOrderForm.notes.trim()) {
                fd.append("notes", confirmOrderForm.notes.trim());
            }
            const url = ep.confirmUnitOrder
                ? ep.confirmUnitOrder(confirmOrderModal.order_id)
                : `/manager/unit-orders/${confirmOrderModal.order_id}/confirm`;
            const { data } = await window.axios.post(url, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            addToast(data?.message || "AC unit purchase confirmed!");
            setConfirmOrderModal(null);
            setConfirmOrderReceiptFile(null);
            setConfirmOrderReceiptPreview("");
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to confirm AC unit order."), "error");
        } finally {
            setConfirmingOrder(false);
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
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            setDisabledDatesModal(true);
                            fetchDisabledDates();
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                        <CalendarIcon size={14} color="#4B5563" />
                        <span>Disabled Dates</span>
                    </button>
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
                            : currentTab === "Pending"
                            ? bookings.filter((booking) =>
                                  ["Pending", "Payment Incomplete", "Reschedule Notice"].includes(
                                      booking.booking_status,
                                  ),
                              ).length
                            : currentTab === "Completed"
                            ? bookings.filter((booking) =>
                                  ["Partially Completed", "Completed"].includes(
                                      booking.booking_status,
                                  ),
                              ).length
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

            {(() => {
                const pendingStandaloneOrders = unitOrders.filter(
                    (o) =>
                        ["pickup", "delivery"].includes(o.fulfillment_type) &&
                        !["Completed", "Cancelled"].includes(o.order_status),
                );
                if (pendingStandaloneOrders.length === 0) return null;
                return (
                    <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: "4px solid #2563EB" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <p className="section-label" style={{ margin: 0 }}>
                                AC Unit Pick Up &amp; Delivery Orders ({pendingStandaloneOrders.length})
                            </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {pendingStandaloneOrders.map((ord) => (
                                <div
                                    key={ord.order_id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 10,
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                        fontSize: 12,
                                    }}
                                >
                                    <div>
                                        <span style={{ fontWeight: 700, color: "#1E2F5F" }}>
                                            Order #{ord.order_id} · {ord.customer_name || "Customer"}
                                        </span>
                                        <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 6, background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, fontSize: 11 }}>
                                            {ord.fulfillment_type === "pickup" ? "Store Pick Up" : "Delivery"}
                                        </span>
                                        <div style={{ color: "#475569", marginTop: 3 }}>
                                            <strong>{ord.unit_brand} {ord.unit_model}</strong> ({ord.unit_horsepower} HP · {ord.unit_ac_type}) — Price: {formatCurrency(ord.unit_price)} · Down Paid: {formatCurrency(ord.down_payment)} · Balance: <strong>{formatCurrency(ord.remaining_balance)}</strong> ({ord.payment_method})
                                        </div>
                                    </div>
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{ padding: "6px 12px", fontSize: 11 }}
                                            onClick={() => openConfirmOrderModal(ord)}
                                        >
                                            Confirm Receipt &amp; Sale
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            <div className="card" style={{ padding: 0, marginTop: 16, overflow: "hidden", borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(16,29,56,0.05)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Bookings Directory</h3>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                            Manage assignments, dispatch status, and customer service orders
                        </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>
                        {filtered.length} of {bookings.length} total
                    </span>
                </div>

                {loading ? (
                    <div
                        style={{
                            padding: 32,
                            textAlign: "center",
                            color: "#6B7280",
                            fontSize: 13,
                        }}
                    >
                        Loading bookings...
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        style={{
                            padding: 36,
                            textAlign: "center",
                            color: "#94A3B8",
                            fontSize: 13,
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
                                <tr style={{ background: "#F8FAFC" }}>
                                    {[
                                        "ID",
                                        "Client",
                                        "Service",
                                        "Scheduled",
                                        "Assigned Team & Tech",
                                        "Status",
                                        ...(tab !== "Pending" ? ["Payment"] : []),
                                        "Action",
                                    ].map((heading) => {
                                        const isAction = heading === "Action";
                                        return (
                                            <th
                                                key={heading}
                                                className={isAction ? "sticky-action-col" : ""}
                                                style={{
                                                    padding: "10px 12px",
                                                    textAlign: isAction ? "right" : "left",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    letterSpacing: "0.05em",
                                                    textTransform: "uppercase",
                                                    color: "#6B7280",
                                                    whiteSpace: "nowrap",
                                                    borderBottom: "1px solid #EAECF0",
                                                    ...(isAction
                                                        ? {
                                                              position: "sticky",
                                                              right: 0,
                                                              zIndex: 10,
                                                              background: "#F5F7FA",
                                                          }
                                                        : {}),
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((booking) => {
                                    const canAssign = [
                                        "Pending",
                                        "Payment Incomplete",
                                        "Reschedule Notice",
                                        "Approved",
                                    ].includes(booking.booking_status);
                                    const canComplete = [
                                        "In-Progress",
                                    ].includes(booking.booking_status);
                                    const isCompletedBooking = [
                                        "Partially Completed",
                                        "Completed",
                                    ].includes(booking.booking_status);
                                    const turnover = booking.payment_turnover || booking.service_details?.payment_turnover || null;
                                    const isTurnoverInvalid = Boolean(turnover && (turnover.status === "Invalid" || turnover.is_invalid));
                                    const isTurnoverSubmitted = Boolean(turnover && !isTurnoverInvalid);

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
                                                <div>{booking.service}</div>
                                                {booking.ac_unit_order && (
                                                    <span style={{ display: "inline-block", marginTop: 2, fontSize: 10, fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: 4 }}>
                                                        Unit Order #{booking.ac_unit_order.order_id}
                                                    </span>
                                                )}
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
                                                {booking.is_ocular_inspection && Array.isArray(booking.ocular_personnel) && booking.ocular_personnel.length > 0 ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                        {booking.ocular_personnel.map((person) => (
                                                            <div key={person.user_id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#0E1A33" }}>
                                                                <UserIcon size={12} color={Number(person.role_id) === 3 ? "#7C3AED" : "#2563EB"} />
                                                                <span>{person.name}</span>
                                                                <span style={{
                                                                    fontSize: 9,
                                                                    fontWeight: 800,
                                                                    background: Number(person.role_id) === 3 ? "#F3E8FF" : "#EFF6FF",
                                                                    color: Number(person.role_id) === 3 ? "#6D28D9" : "#1D4ED8",
                                                                    padding: "1px 5px",
                                                                    borderRadius: 4,
                                                                    textTransform: "uppercase",
                                                                }}>
                                                                    {Number(person.role_id) === 3 ? "Admin Asst" : "Tech"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : booking.lead_technician_name || booking.assigned_tech_name ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#0E1A33" }}>
                                                            <UserIcon size={12} color="#2563EB" />
                                                            <span>{booking.lead_technician_name || booking.assigned_tech_name}</span>
                                                            <span style={{ fontSize: 9, fontWeight: 800, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>
                                                                Lead
                                                            </span>
                                                        </div>
                                                        {booking.assistant_technician_name && (
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", fontWeight: 600 }}>
                                                                <UserIcon size={12} color="#64748B" />
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
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                                                    <StatusBadge
                                                        status={booking.booking_status}
                                                    />
                                                    {canComplete && isTurnoverSubmitted && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", padding: "1px 6px", borderRadius: 6 }}>
                                                            Turnover Ready
                                                        </span>
                                                    )}
                                                    {canComplete && isTurnoverInvalid && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: 6 }}>
                                                            Turnover Invalid
                                                        </span>
                                                    )}
                                                    {booking.rating != null && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", padding: "1px 6px", borderRadius: 6 }}>
                                                            ★ {booking.rating}/5 Rated
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {tab !== "Pending" && (
                                                <td style={{ padding: "10px 12px" }}>
                                                    <StatusBadge
                                                        status={booking.payment_status}
                                                    />
                                                </td>
                                            )}
                                            <td
                                                className="sticky-action-col"
                                                style={{
                                                    padding: "10px 12px",
                                                    position: "sticky",
                                                    right: 0,
                                                    zIndex: 5,
                                                    background: "#FFFFFF",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        flexWrap: "nowrap",
                                                        alignItems: "center",
                                                        justifyContent: "flex-end",
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
                                                            Manage
                                                        </button>
                                                    )}
                                                    {canComplete && !readOnly && (
                                                        <button
                                                            className="btn-secondary"
                                                            disabled={!isTurnoverSubmitted}
                                                            title={
                                                                isTurnoverSubmitted
                                                                    ? "Review technician turnover & complete booking"
                                                                    : isTurnoverInvalid
                                                                    ? "Turnover marked Invalid — waiting for technician to resubmit"
                                                                    : "Waiting for technician to submit Turn Over Payment"
                                                            }
                                                            style={{
                                                                padding: "5px 10px",
                                                                fontSize: 11,
                                                                background: isTurnoverSubmitted ? "#ECFDF5" : "#F3F4F6",
                                                                color: isTurnoverSubmitted ? "#065F46" : "#9CA3AF",
                                                                borderColor: isTurnoverSubmitted ? "#A7F3D0" : "#E5E7EB",
                                                                fontWeight: 700,
                                                                cursor: isTurnoverSubmitted ? "pointer" : "not-allowed",
                                                                opacity: isTurnoverSubmitted ? 1 : 0.65,
                                                            }}
                                                            onClick={() => isTurnoverSubmitted && openCompleteModal(booking)}
                                                        >
                                                            Complete
                                                        </button>
                                                    )}
                                                    {isCompletedBooking && !readOnly && (
                                                        <button
                                                            type="button"
                                                            title="Report Booking to Super Admin"
                                                            onClick={() => openReportModal(booking)}
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                padding: "5px 8px",
                                                                borderRadius: 8,
                                                                border: "1px solid #FECACA",
                                                                background: "#FEF2F2",
                                                                color: "#DC2626",
                                                                cursor: "pointer",
                                                                transition: "all 0.15s ease",
                                                            }}
                                                        >
                                                            <ReportFlagIcon size={13} color="#DC2626" />
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
                                                        Client
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

            {/* Manage Booking Modal (3 Statuses: Approve, Return Payment / Payment Incomplete, Reschedule Notice) */}
            {(() => {
                const isApproveSelected = assignment.booking_status === "Approved";
                const selectedLead = technicians.find((t) => String(t.user_id) === String(assignment.lead_technician_id));
                const selectedAssistant = technicians.find((t) => String(t.user_id) === String(assignment.assistant_technician_id));
                const isBothSelected = Boolean(selectedLead && selectedAssistant && selectedLead.user_id !== selectedAssistant.user_id);

                // Count daily bookings on the same local date as approveModal.scheduled_date
                const modalDateYmd = approveModal?.scheduled_date
                    ? toLocalYmd(approveModal.scheduled_date)
                    : null;
                const isModalDateSunday = modalDateYmd ? isSundayDate(modalDateYmd) : false;

                // Count approved/active jobs already assigned on modalDateYmd
                const approvedOnDateCount = modalDateYmd
                    ? bookings.filter((b) => {
                          if (b.booking_id === approveModal?.booking_id) return false;
                          if (["Cancelled", "Pending", "Payment Incomplete", "Reschedule Notice"].includes(b.booking_status)) return false;
                          const bYmd = b.scheduled_date ? toLocalYmd(b.scheduled_date) : null;
                          return bYmd === modalDateYmd;
                      }).length
                    : 0;
                const isDateSlotsFull = approvedOnDateCount >= MAX_DAILY_SLOTS;

                const getTechDailyCount = (techId) => {
                    if (!modalDateYmd || !techId) return 0;
                    return bookings.filter((b) => {
                        if (b.booking_id === approveModal?.booking_id) return false;
                        if (["Cancelled", "Pending", "Payment Incomplete", "Reschedule Notice"].includes(b.booking_status)) return false;
                        const bYmd = b.scheduled_date ? toLocalYmd(b.scheduled_date) : null;
                        if (bYmd !== modalDateYmd) return false;
                        return (
                            Number(b.lead_technician_id) === Number(techId) ||
                            Number(b.assistant_technician_id) === Number(techId) ||
                            Number(b.assigned_tech_id) === Number(techId)
                        );
                    }).length;
                };

                const getTeamDailyCount = (team) => {
                    if (!modalDateYmd || !team) return 0;
                    const memberIds = Array.isArray(team.members)
                        ? team.members.map((m) => Number(m.user_id))
                        : [];
                    return bookings.filter((b) => {
                        if (b.booking_id === approveModal?.booking_id) return false;
                        if (["Cancelled", "Pending", "Payment Incomplete", "Reschedule Notice"].includes(b.booking_status)) return false;
                        const bYmd = b.scheduled_date ? toLocalYmd(b.scheduled_date) : null;
                        if (bYmd !== modalDateYmd) return false;
                        if (Number(b.assigned_team_id) === Number(team.team_id)) return true;
                        return (
                            memberIds.includes(Number(b.lead_technician_id)) ||
                            memberIds.includes(Number(b.assistant_technician_id)) ||
                            memberIds.includes(Number(b.assigned_tech_id))
                        );
                    }).length;
                };

                const isOcularModal = Boolean(approveModal?.is_ocular_inspection);
                const selectedOcularIds = Array.isArray(assignment.ocular_personnel_ids) ? assignment.ocular_personnel_ids : [];
                const ocularCountValid = selectedOcularIds.length >= 1 && selectedOcularIds.length <= 4;

                const leadDailyCount = selectedLead ? getTechDailyCount(selectedLead.user_id) : 0;
                const assistantDailyCount = selectedAssistant ? getTechDailyCount(selectedAssistant.user_id) : 0;
                const exceedsDailyLimit =
                    isApproveSelected &&
                    (isOcularModal
                        ? (isDateSlotsFull || isModalDateSunday)
                        : (leadDailyCount >= MAX_JOBS_PER_TEAM_PER_DAY ||
                            assistantDailyCount >= MAX_JOBS_PER_TEAM_PER_DAY ||
                            isDateSlotsFull ||
                            isModalDateSunday));

                const canConfirmManage = isApproveSelected
                    ? (isOcularModal ? ocularCountValid && !exceedsDailyLimit : isBothSelected && !exceedsDailyLimit)
                    : true;

                return (
                    <Modal
                        open={!!approveModal}
                        title={`Manage Booking #${approveModal?.booking_id ?? ""}`}
                        message="Review booking and choose an action below."
                        confirmLabel={
                            assigning
                                ? "Processing..."
                                : isApproveSelected
                                ? "Approve & Assign"
                                : assignment.booking_status === "Payment Incomplete"
                                ? "Mark Payment Incomplete"
                                : "Send Reschedule Notice"
                        }
                        confirmDisabled={assigning || !canConfirmManage}
                        maxWidth={640}
                        onConfirm={handleAssign}
                        onCancel={() => !assigning && setApproveModal(null)}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {/* Customer & Service Summary Box */}
                            {approveModal && (
                                <div
                                    style={{
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                        borderRadius: 12,
                                        padding: 12,
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 12,
                                        fontSize: 12,
                                    }}
                                >
                                    <div>
                                        <span style={{ color: "#64748B", fontWeight: 700, fontSize: 11 }}>Customer</span>
                                        <div style={{ fontWeight: 800, color: "#1E2F5F", marginTop: 2, fontSize: 13 }}>{approveModal.client_name}</div>
                                        <div style={{ color: "#475569", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                            <PhoneIcon size={13} color="#64748B" />
                                            <span>{approveModal.client_contact_number || "No contact"}</span>
                                        </div>
                                        <div style={{ color: "#475569", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                            <MapPinIcon size={13} color="#64748B" />
                                            <span>{approveModal.client_address || "No address"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748B", fontWeight: 700, fontSize: 11 }}>Service</span>
                                        <div style={{ fontWeight: 800, color: "#2563EB", marginTop: 2, fontSize: 13 }}>{approveModal.service}</div>
                                        {Array.isArray(approveModal.units_data) && approveModal.units_data.length > 0 && (
                                            <div style={{ color: "#334155", marginTop: 4, fontSize: 11, fontWeight: 600 }}>
                                                {approveModal.units_data.map((u, idx) => (
                                                    <span key={idx}>
                                                        {idx > 0 ? " | " : ""}
                                                        {u.unit_type || "AC Unit"}{u.motor_type ? ` · ${u.motor_type}` : ""}{u.capacity ? ` · ${u.capacity}` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ color: "#475569", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                            <CalendarIcon size={13} color="#64748B" />
                                            <span>{formatDateTime(approveModal.scheduled_date)}</span>
                                        </div>
                                        <div style={{ color: "#475569", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                            <CreditCardIcon size={13} color="#64748B" />
                                            <span>{approveModal.payment_status} ({formatCurrency(approveModal.amount_paid)}) {approveModal.reference_number ? `• Ref: ${approveModal.reference_number}` : ""}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Booking Status */}
                            <div>
                                <label className="section-label" style={{ marginBottom: 6, display: "block", fontWeight: 700, color: "#1E2F5F", fontSize: 11 }}>
                                    Booking Status
                                </label>
                                <div style={{ display: "grid", gridTemplateColumns: isOcularModal ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
                                    {[
                                        {
                                            value: "Approved",
                                            title: "Approve",
                                            subtitle: isOcularModal ? "Assign 1–4 personnel" : "Assign technicians to job",
                                            activeBg: "#EFF6FF",
                                            activeBorder: "#2563EB",
                                            activeText: "#1E40AF",
                                        },
                                        ...(!isOcularModal
                                            ? [
                                                  {
                                                      value: "Payment Incomplete",
                                                      title: "Incomplete Payment",
                                                      subtitle: "10-min window to settle",
                                                      activeBg: "#FFFBEB",
                                                      activeBorder: "#D97706",
                                                      activeText: "#92400E",
                                                  },
                                              ]
                                            : []),
                                        {
                                            value: "Reschedule Notice",
                                            title: "Reschedule Notice",
                                            subtitle: "Request date change (Free)",
                                            activeBg: "#EEF2FF",
                                            activeBorder: "#4F46E5",
                                            activeText: "#3730A3",
                                        },
                                    ].map((opt) => {
                                        const isSel = assignment.booking_status === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() =>
                                                    setAssignment((prev) => ({
                                                        ...prev,
                                                        booking_status: opt.value,
                                                    }))
                                                }
                                                style={{
                                                    textAlign: "left",
                                                    padding: "10px 12px",
                                                    borderRadius: 10,
                                                    border: `2px solid ${isSel ? opt.activeBorder : "#E2E8F0"}`,
                                                    background: isSel ? opt.activeBg : "#FFFFFF",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                <div style={{ fontSize: 12, fontWeight: 800, color: isSel ? opt.activeText : "#1E2F5F" }}>
                                                    {opt.title}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, lineHeight: 1.3 }}>
                                                    {opt.subtitle}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* IF STATUS == APPROVED: Ocular Inspection Personnel OR Standard Technician Assignment */}
                            {isApproveSelected && isOcularModal && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F1F5F9", padding: "8px 12px", borderRadius: 10 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                                            Assign Personnel (Technician / Admin Assistant) — Min 1, Max 4
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: ocularCountValid ? "#16A34A" : "#D97706" }}>
                                            {selectedOcularIds.length} / 4 Selected
                                        </span>
                                    </div>

                                    {(isModalDateSunday || isDateSlotsFull) && (
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>
                                            {isModalDateSunday
                                                ? "⚠ Sunday is a rest day. Please send a Reschedule Notice."
                                                : `⚠ All ${MAX_DAILY_SLOTS} slots on ${modalDateYmd} are already assigned.`}
                                        </div>
                                    )}

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 220, overflowY: "auto", padding: 2 }}>
                                        {[
                                            ...adminAssistants.map((a) => ({
                                                user_id: Number(a.user_id),
                                                full_name: a.full_name || a.name,
                                                role_label: "Admin Assistant",
                                                is_admin_asst: true,
                                            })),
                                            ...technicians.map((t) => ({
                                                user_id: Number(t.user_id),
                                                full_name: t.full_name || t.name,
                                                role_label: "Technician",
                                                is_admin_asst: false,
                                            })),
                                        ].map((person) => {
                                            const isChecked = selectedOcularIds.includes(person.user_id);
                                            const isMaxReached = !isChecked && selectedOcularIds.length >= 4;
                                            const checkboxId = `ocular-person-${person.user_id}`;
                                            return (
                                                <label
                                                    key={person.user_id}
                                                    htmlFor={checkboxId}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: 8,
                                                        padding: "8px 10px",
                                                        borderRadius: 9,
                                                        border: `1.5px solid ${isChecked ? "#2563EB" : "#E2E8F0"}`,
                                                        background: isChecked ? "#EFF6FF" : "#FFFFFF",
                                                        cursor: isMaxReached ? "not-allowed" : "pointer",
                                                        opacity: isMaxReached ? 0.55 : 1,
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                        <input
                                                            id={checkboxId}
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={isMaxReached}
                                                            onChange={() => {
                                                                setAssignment((prev) => {
                                                                    const cur = Array.isArray(prev.ocular_personnel_ids) ? prev.ocular_personnel_ids : [];
                                                                    if (cur.includes(person.user_id)) {
                                                                        return { ...prev, ocular_personnel_ids: cur.filter((id) => id !== person.user_id) };
                                                                    }
                                                                    if (cur.length >= 4) return prev;
                                                                    return { ...prev, ocular_personnel_ids: [...cur, person.user_id] };
                                                                });
                                                            }}
                                                            style={{ accentColor: "#2563EB", width: 15, height: 15, cursor: isMaxReached ? "not-allowed" : "pointer" }}
                                                        />
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {person.full_name}
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        padding: "2px 6px",
                                                        borderRadius: 5,
                                                        background: person.is_admin_asst ? "#F3E8FF" : "#DBEAFE",
                                                        color: person.is_admin_asst ? "#6D28D9" : "#1D4ED8",
                                                        flexShrink: 0,
                                                    }}>
                                                        {person.is_admin_asst ? "Admin Asst" : "Tech"}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* IF STATUS == APPROVED: Show Technician / Formed Team Assignment Fields */}
                            {isApproveSelected && !isOcularModal && (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F1F5F9", padding: "8px 12px", borderRadius: 10 }}>
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", display: "block" }}>
                                                Assign Technicians • {approvedOnDateCount}/{MAX_DAILY_SLOTS} slots booked on {modalDateYmd || "date"}
                                            </span>
                                            {isModalDateSunday && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626" }}>
                                                    ⚠ Sunday is a rest day. Please send a Reschedule Notice.
                                                </span>
                                            )}
                                            {!isModalDateSunday && isDateSlotsFull && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626" }}>
                                                    ⚠ All {MAX_DAILY_SLOTS} slots on {modalDateYmd} are already assigned.
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => setAssignment(prev => ({ ...prev, assign_mode: "individual", assigned_team_id: "" }))}
                                                style={{
                                                    padding: "5px 10px",
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    border: "none",
                                                    cursor: "pointer",
                                                    background: assignment.assign_mode === "individual" ? "#2563EB" : "#FFFFFF",
                                                    color: assignment.assign_mode === "individual" ? "#FFFFFF" : "#475569",
                                                }}
                                            >
                                                Pair Technicians
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAssignment(prev => ({ ...prev, assign_mode: "team" }))}
                                                style={{
                                                    padding: "5px 10px",
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    border: "none",
                                                    cursor: "pointer",
                                                    background: assignment.assign_mode === "team" ? "#2563EB" : "#FFFFFF",
                                                    color: assignment.assign_mode === "team" ? "#FFFFFF" : "#475569",
                                                }}
                                            >
                                                Teams ({teams.length})
                                            </button>
                                        </div>
                                    </div>

                                    {assignment.assign_mode === "team" && (
                                        <div>
                                            <label className="section-label" style={{ marginBottom: 4, display: "block", fontWeight: 700, color: "#1E2F5F", fontSize: 11 }}>
                                                Select Team
                                            </label>
                                            <select
                                                className="input-field"
                                                value={assignment.assigned_team_id}
                                                onChange={(e) => {
                                                    const tId = e.target.value;
                                                    const foundTeam = teams.find(t => String(t.team_id) === String(tId));
                                                    let leadId = "";
                                                    let asstId = "";
                                                    if (foundTeam && Array.isArray(foundTeam.members)) {
                                                        leadId = foundTeam.leader_id
                                                            ? String(foundTeam.leader_id)
                                                            : (foundTeam.members[0] ? String(foundTeam.members[0].user_id) : "");
                                                        const second = foundTeam.members.find(m => String(m.user_id) !== leadId);
                                                        asstId = second ? String(second.user_id) : "";
                                                    }
                                                    setAssignment(prev => ({
                                                        ...prev,
                                                        assigned_team_id: tId,
                                                        lead_technician_id: leadId || prev.lead_technician_id,
                                                        assistant_technician_id: asstId || prev.assistant_technician_id,
                                                    }));
                                                }}
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, borderColor: "#CBD5E1", fontSize: 12 }}
                                            >
                                                <option value="">-- Choose Team --</option>
                                                {teams.map((tm) => {
                                                    const teamCount = getTeamDailyCount(tm);
                                                    const teamFull = teamCount >= MAX_JOBS_PER_TEAM_PER_DAY;
                                                    return (
                                                        <option key={tm.team_id} value={tm.team_id} disabled={teamFull}>
                                                            {tm.team_name} — Lead: {tm.leader_name}{teamFull ? " (Booked)" : ""}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    )}

                                    {/* Technician Selection Controls */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        {/* Lead Technician */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                                <label className="section-label" style={{ margin: 0, fontWeight: 700, color: "#1E2F5F", fontSize: 11 }}>
                                                    Lead Technician
                                                </label>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "1px 5px", borderRadius: 4 }}>
                                                    Lead
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
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, borderColor: "#CBD5E1", fontSize: 12 }}
                                            >
                                                <option value="">Select Technician</option>
                                                {technicians
                                                    .filter((technician) => !assignment.assistant_technician_id || String(technician.user_id) !== String(assignment.assistant_technician_id))
                                                    .map((technician) => {
                                                        const countToday = getTechDailyCount(technician.user_id);
                                                        const isFull = countToday >= MAX_JOBS_PER_TEAM_PER_DAY;
                                                        return (
                                                            <option
                                                                key={technician.user_id}
                                                                value={technician.user_id}
                                                                disabled={isFull}
                                                            >
                                                                {technician.full_name}{isFull ? " — Booked" : ""}
                                                            </option>
                                                        );
                                                    })}
                                            </select>
                                        </div>

                                        {/* Assistant Technician */}
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                                <label className="section-label" style={{ margin: 0, fontWeight: 700, color: "#1E2F5F", fontSize: 11 }}>
                                                    Assistant Technician
                                                </label>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: "#64748B", background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>
                                                    Partner
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
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, borderColor: "#CBD5E1", fontSize: 12 }}
                                            >
                                                <option value="">Select Technician</option>
                                                {technicians
                                                    .filter((technician) => !assignment.lead_technician_id || String(technician.user_id) !== String(assignment.lead_technician_id))
                                                    .map((technician) => {
                                                        const countToday = getTechDailyCount(technician.user_id);
                                                        const isFull = countToday >= MAX_JOBS_PER_TEAM_PER_DAY;
                                                        return (
                                                            <option
                                                                key={technician.user_id}
                                                                value={technician.user_id}
                                                                disabled={isFull}
                                                            >
                                                                {technician.full_name}{isFull ? " — Booked" : ""}
                                                            </option>
                                                        );
                                                    })}
                                            </select>
                                        </div>
                                    </div>

                                    {(assignment.lead_technician_id || assignment.assistant_technician_id) && (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 11, color: exceedsDailyLimit ? "#DC2626" : "#64748B", fontWeight: 500 }}>
                                                {isModalDateSunday
                                                    ? "Sunday is a rest day. Please reschedule."
                                                    : isDateSlotsFull
                                                        ? `All ${MAX_DAILY_SLOTS} slots on ${modalDateYmd} are full.`
                                                        : exceedsDailyLimit
                                                            ? `Technician already has a job on ${modalDateYmd}.`
                                                            : `1 job per team/day (${MAX_DAILY_SLOTS} max daily slots).`}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleSwapRoles}
                                                style={{
                                                    border: "none",
                                                    background: "transparent",
                                                    color: "#2563EB",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                <span>⇄</span> Swap Roles
                                            </button>
                                        </div>
                                    )}

                                    {/* ASSIGNED TEAM VISUAL CONFIRMATION BOX */}
                                    <div
                                        style={{
                                            background: isBothSelected ? "#F0FDF4" : "#F8FAFC",
                                            border: `1px solid ${isBothSelected ? "#86EFAC" : "#E2E8F0"}`,
                                            borderRadius: 10,
                                            padding: "10px 14px",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: isBothSelected ? "#166534" : "#64748B" }}>
                                                Assigned Team
                                            </span>
                                            {isBothSelected ? (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A" }}>
                                                    ✓ Ready
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: 11, fontWeight: 500, color: "#D97706" }}>
                                                    Select 2 Technicians
                                                </span>
                                            )}
                                        </div>
                                        {isBothSelected ? (
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#0E1A33" }}>
                                                {selectedLead?.full_name} (Lead) &amp; {selectedAssistant?.full_name} (Assistant)
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 11, color: "#94A3B8" }}>
                                                Choose a Lead and an Assistant technician above.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* IF STATUS == PAYMENT INCOMPLETE */}
                            {assignment.booking_status === "Payment Incomplete" && (
                                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: 12, fontSize: 12, color: "#92400E" }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                        Payment Incomplete (10-Minute Timer)
                                    </div>
                                    <p style={{ margin: "0 0 8px", lineHeight: 1.4, fontSize: 11 }}>
                                        Customer will be given 10 minutes to settle payment, after which the booking will be automatically cancelled.
                                    </p>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Optional note to customer..."
                                        value={assignment.manager_note}
                                        onChange={(e) => setAssignment(prev => ({ ...prev, manager_note: e.target.value }))}
                                        style={{ width: "100%", background: "#FFFFFF", fontSize: 12 }}
                                    />
                                </div>
                            )}

                            {/* IF STATUS == RESCHEDULE NOTICE */}
                            {assignment.booking_status === "Reschedule Notice" && (
                                <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: 12, fontSize: 12, color: "#3730A3" }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                        Reschedule Notice (Free)
                                    </div>
                                    <p style={{ margin: "0 0 8px", lineHeight: 1.4, fontSize: 11 }}>
                                        Customer will be notified to pick another available date and time slot free of charge.
                                    </p>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Optional note explaining why..."
                                        value={assignment.manager_note}
                                        onChange={(e) => setAssignment(prev => ({ ...prev, manager_note: e.target.value }))}
                                        style={{ width: "100%", background: "#FFFFFF", fontSize: 12 }}
                                    />
                                </div>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {/* Review Turn Over Payment & Service Report Modal */}
            <Modal
                show={!!completeModal && !invalidModal}
                onClose={() => !completing && setCompleteModal(null)}
                maxWidth="xl"
                padding={0}
            >
                {completeModal && (() => {
                    const turnover = completeModal.payment_turnover || completeModal.service_details?.payment_turnover || {};
                    const diagnosis = turnover.diagnosis || completeModal.report_diagnosis || "—";
                    const workDone = turnover.work_done || completeModal.report_work_done || "—";
                    const acBrand = turnover.ac_brand || completeModal.report_ac_brand || "";
                    const acType = turnover.ac_type || completeModal.report_ac_type || "";
                    const partsReplaced = turnover.parts_replaced || completeModal.report_parts_replaced || "";
                    const proofImageUrl = turnover.proof_image_url || null;

                    return (
                        <div style={{ padding: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                                        Review Turn Over Payment
                                    </h3>
                                    <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
                                        Booking #{completeModal.booking_id} · {completeModal.service} for {completeModal.client_name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => !completing && setCompleteModal(null)}
                                    style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer" }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "68vh", overflowY: "auto", paddingRight: 4 }}>
                                {/* Payment Breakdown */}
                                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14 }}>
                                    {completeModal.ac_unit_order && (
                                        <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed #86EFAC" }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: "#1E40AF", marginBottom: 4 }}>
                                                AC Unit Purchase #{completeModal.ac_unit_order.order_id} · {completeModal.ac_unit_order.unit_brand} {completeModal.ac_unit_order.unit_model}
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 3 }}>
                                                <span>Unit Price (Less ₱7,000 Down Payment)</span>
                                                <span style={{ fontWeight: 700, color: "#0F172A" }}>
                                                    {formatCurrency(turnover.unit_remaining_balance ?? completeModal.ac_unit_order.remaining_balance ?? 0)}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
                                                <span>Delivery Fee</span>
                                                <span style={{ fontWeight: 700, color: "#0F172A" }}>
                                                    {formatCurrency(turnover.delivery_fee ?? completeModal.ac_unit_order.delivery_fee ?? 0)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 4 }}>
                                        <span>{completeModal.ac_unit_order ? "Installation Service Fee" : "Total Service Fee"}</span>
                                        <span style={{ fontWeight: 700, color: "#0F172A" }}>
                                            {formatCurrency(turnover.total_service_price || 0)}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2563EB", marginBottom: 6 }}>
                                        <span>Less Reservation Fee</span>
                                        <span style={{ fontWeight: 700 }}>
                                            - {formatCurrency(turnover.reservation_down_payment || completeModal.booking_fee_paid || 100)}
                                        </span>
                                    </div>
                                    <div style={{ borderTop: "1px dashed #86EFAC", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, fontWeight: 800, color: "#15803D" }}>
                                        <span>Net Balance Turned Over</span>
                                        <span>
                                            {formatCurrency(turnover.net_collected || 0)} ({turnover.payment_method || completeModal.service_payment_method || "Cash"})
                                        </span>
                                    </div>
                                    {turnover.reference_number && (
                                        <div style={{ marginTop: 6, fontSize: 12, color: "#166534", fontWeight: 600 }}>
                                            Ref: {turnover.reference_number}
                                        </div>
                                    )}
                                </div>

                                {/* Service Details */}
                                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Diagnosis &amp; Findings</div>
                                            <div style={{ fontSize: 13, color: "#0F172A", marginTop: 2 }}>{diagnosis}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Work Performed</div>
                                            <div style={{ fontSize: 13, color: "#0F172A", marginTop: 2 }}>{workDone}</div>
                                        </div>
                                    </div>

                                    {(acBrand || acType || partsReplaced) && (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, borderTop: "1px solid #E2E8F0", paddingTop: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>AC Unit</div>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginTop: 2 }}>
                                                    {[acBrand, acType].filter(Boolean).join(" · ") || "—"}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Parts Replaced</div>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginTop: 2 }}>
                                                    {partsReplaced || "None"}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 8, fontSize: 12, color: "#475569" }}>
                                        <strong style={{ color: "#0F172A" }}>Technicians:</strong>{" "}
                                        {completeModal.lead_technician_name
                                            ? `${completeModal.lead_technician_name} & ${completeModal.assistant_technician_name || "Assistant"}`
                                            : completeModal.assigned_tech_name || "Assigned Team"}
                                    </div>
                                </div>

                                {/* Proof Picture */}
                                {proofImageUrl && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                                            Technician Turnover Proof Picture
                                        </div>
                                        <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 8, background: "#FFFFFF", textAlign: "center" }}>
                                            <a href={proofImageUrl} target="_blank" rel="noreferrer" title="Click to view full image">
                                                <img
                                                    src={proofImageUrl}
                                                    alt="Turnover Proof"
                                                    style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, objectFit: "contain" }}
                                                />
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Confirm AC Unit Purchase Receipt Upload */}
                                {completeModal.ac_unit_order && (
                                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 14 }}>
                                        <label
                                            htmlFor="manager-unit-receipt-upload"
                                            style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1E3A8A", marginBottom: 4 }}
                                        >
                                            Confirm Unit Purchase — Upload Receipt Picture *
                                        </label>
                                        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#475569" }}>
                                            Upload official receipt photo to mark <strong>{completeModal.ac_unit_order.unit_brand} {completeModal.ac_unit_order.unit_model}</strong> as Sold, reflect in Admin Assistant sales, and activate warranty &amp; spare parts forecasting.
                                        </p>
                                        <input
                                            id="manager-unit-receipt-upload"
                                            name="purchase_receipt_image"
                                            type="file"
                                            accept="image/*"
                                            required
                                            className="input-field"
                                            style={{ background: "#FFFFFF", fontSize: 12, padding: "6px 10px" }}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0] || null;
                                                setPurchaseReceiptFile(f);
                                                setPurchaseReceiptPreview(f ? URL.createObjectURL(f) : "");
                                            }}
                                        />
                                        {purchaseReceiptPreview && (
                                            <div style={{ marginTop: 8 }}>
                                                <img
                                                    src={purchaseReceiptPreview}
                                                    alt="Purchase receipt preview"
                                                    style={{ maxHeight: 140, borderRadius: 8, border: "1px solid #BFDBFE", objectFit: "contain", background: "#FFF" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
                                <button
                                    type="button"
                                    disabled={completing}
                                    onClick={() => setInvalidModal(true)}
                                    style={{
                                        padding: "9px 16px",
                                        borderRadius: 10,
                                        border: "1px solid #FECACA",
                                        background: "#FEF2F2",
                                        color: "#DC2626",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    Invalid
                                </button>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={completing}
                                        onClick={() => setCompleteModal(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={completing}
                                        onClick={handleCompleteBooking}
                                        style={{
                                            padding: "9px 18px",
                                            borderRadius: 10,
                                            border: "none",
                                            background: "#16A34A",
                                            color: "#FFFFFF",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: completing ? "not-allowed" : "pointer",
                                            opacity: completing ? 0.65 : 1,
                                        }}
                                    >
                                        {completing ? "Confirming..." : "Confirm & Complete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Invalid Turnover Reason Modal */}
            <Modal
                show={!!completeModal && invalidModal}
                onClose={() => !invalidating && setInvalidModal(false)}
                maxWidth="md"
                padding={0}
            >
                {completeModal && (
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#991B1B", margin: "0 0 4px" }}>
                            Mark Turn Over as Invalid
                        </h3>
                        <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 14px" }}>
                            Booking #{completeModal.booking_id} · Technician will be notified to edit and resubmit.
                        </p>

                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                                Reason <span style={{ color: "#DC2626" }}>*</span>
                            </label>
                            <textarea
                                className="input-field"
                                rows={3}
                                value={invalidReason}
                                onChange={(e) => setInvalidReason(e.target.value)}
                                placeholder="State what needs to be corrected (e.g., unclear proof photo, wrong amount)..."
                                style={{ width: "100%", fontSize: 13 }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={invalidating}
                                onClick={() => setInvalidModal(false)}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={invalidating || !invalidReason.trim()}
                                onClick={handleInvalidateTurnover}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: "#DC2626",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: invalidating || !invalidReason.trim() ? "not-allowed" : "pointer",
                                    opacity: invalidating || !invalidReason.trim() ? 0.6 : 1,
                                }}
                            >
                                {invalidating ? "Submitting..." : "Submit Invalid"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Report Booking to Super Admin Modal */}
            <Modal
                show={!!reportModal && !reportConfirmModal}
                onClose={() => !reportingSubmitting && setReportModal(null)}
                maxWidth="md"
                padding={0}
            >
                {reportModal && (
                    <div style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                                    Report Booking #{reportModal.booking_id}
                                </h3>
                                <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
                                    Send a report to Super Admin regarding {reportModal.client_name}'s booking.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReportModal(null)}
                                style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                    Subject / Issue <span style={{ color: "#DC2626" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={reportForm.subject}
                                    onChange={(e) => setReportForm((prev) => ({ ...prev, subject: e.target.value }))}
                                    placeholder="e.g., Payment discrepancy or service concern"
                                    style={{ width: "100%", fontSize: 13 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                    Elaborate Situation <span style={{ color: "#DC2626" }}>*</span>
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    value={reportForm.elaboration}
                                    onChange={(e) => setReportForm((prev) => ({ ...prev, elaboration: e.target.value }))}
                                    placeholder="Provide clear details of the situation for Super Admin..."
                                    style={{ width: "100%", fontSize: 13 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setReportModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!reportForm.subject.trim() || !reportForm.elaboration.trim()}
                                onClick={() => setReportConfirmModal(true)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: "#DC2626",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: !reportForm.subject.trim() || !reportForm.elaboration.trim() ? "not-allowed" : "pointer",
                                    opacity: !reportForm.subject.trim() || !reportForm.elaboration.trim() ? 0.6 : 1,
                                }}
                            >
                                Submit Report
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Report Confirmation Modal */}
            <Modal
                show={!!reportModal && reportConfirmModal}
                onClose={() => !reportingSubmitting && setReportConfirmModal(false)}
                maxWidth="sm"
                padding={0}
            >
                {reportModal && (
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
                            Confirm Report Submission
                        </h3>
                        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
                            Send this report for <strong>Booking #{reportModal.booking_id}</strong> to the Super Admin?
                        </p>
                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, fontSize: 12, color: "#334155", marginBottom: 18 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{reportForm.subject}</div>
                            <div style={{ color: "#64748B", whiteSpace: "pre-wrap" }}>{reportForm.elaboration}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={reportingSubmitting}
                                onClick={() => setReportConfirmModal(false)}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={reportingSubmitting}
                                onClick={handleReportSubmitConfirm}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: "#DC2626",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: reportingSubmitting ? "not-allowed" : "pointer",
                                }}
                            >
                                {reportingSubmitting ? "Sending..." : "Confirm & Send"}
                            </button>
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
                                        color: "#fff",
                                    }}
                                >
                                    <UserIcon size={20} color="#fff" />
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
                                    lineHeight: 2.1,
                                }}
                            >
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <FileTextIcon size={14} color="#64748B" />
                                    <span>Service: <strong style={{ color: "#1E2F5F" }}>{clientPanel.service}</strong></span>
                                </p>
                                {Array.isArray(clientPanel.units_data) && clientPanel.units_data.length > 0 && (
                                    <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                        <WrenchIcon size={14} color="#64748B" />
                                        <span>
                                            Unit:{" "}
                                            <strong style={{ color: "#1E2F5F" }}>
                                                {clientPanel.units_data.map((u, idx) => (
                                                    <span key={idx}>
                                                        {idx > 0 ? " | " : ""}
                                                        {u.brand ? `${u.brand} ` : ""}{u.unit_type || "AC"}{u.motor_type ? ` · ${u.motor_type}` : ""}{u.capacity ? ` · ${u.capacity}` : ""}
                                                    </span>
                                                ))}
                                            </strong>
                                        </span>
                                    </p>
                                )}
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <CalendarIcon size={14} color="#64748B" />
                                    <span>Scheduled: <strong style={{ color: "#1E2F5F" }}>{formatDateTime(clientPanel.scheduled_date)}</strong></span>
                                </p>
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <PhoneIcon size={14} color="#64748B" />
                                    <span>Contact: <strong style={{ color: "#1E2F5F" }}>{clientPanel.client_contact_number || "Not provided"}</strong></span>
                                </p>
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <MailIcon size={14} color="#64748B" />
                                    <span>Email: <strong style={{ color: "#1E2F5F" }}>{clientPanel.client_email || "Not provided"}</strong></span>
                                </p>
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <MapPinIcon size={14} color="#64748B" />
                                    <span>Address: <strong style={{ color: "#1E2F5F" }}>{clientPanel.client_address || "Not provided"}</strong></span>
                                </p>
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <CreditCardIcon size={14} color="#64748B" />
                                    <span>Payment: <strong style={{ color: "#1E2F5F" }}>{clientPanel.payment_status}{clientPanel.amount_paid ? ` · ${formatCurrency(clientPanel.amount_paid)}` : ""}</strong></span>
                                </p>
                                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    <WrenchIcon size={14} color="#64748B" />
                                    <span>Assigned Tech: <strong style={{ color: "#1E2F5F" }}>{clientPanel.assigned_tech_name || "Unassigned"}</strong></span>
                                </p>
                            </div>
                        </div>

                        {clientPanel.rating != null && (
                            <div
                                style={{
                                    background: "#FFFBEB",
                                    border: "1px solid #FDE68A",
                                    borderRadius: 14,
                                    padding: 14,
                                    marginBottom: 16,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>
                                        Customer Rating &amp; Feedback
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: "#D97706" }}>
                                        {"★".repeat(Number(clientPanel.rating))}{"☆".repeat(Math.max(0, 5 - Number(clientPanel.rating)))} ({clientPanel.rating}/5)
                                    </span>
                                </div>
                                {clientPanel.feedback && (
                                    <p style={{ margin: 0, fontSize: 12, color: "#78350F", fontStyle: "italic" }}>
                                        "{clientPanel.feedback}"
                                    </p>
                                )}
                            </div>
                        )}

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
            {/* Disabled Dates Management Modal */}
            <Modal
                show={disabledDatesModal}
                onClose={() => setDisabledDatesModal(false)}
                maxWidth="lg"
            >
                <div style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                                Disabled Booking Dates
                            </h3>
                            <p style={{ fontSize: 12, color: "#6B7280", margin: "4px 0 0" }}>
                                Close dates for holidays or occasions. Customers cannot book on these dates.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDisabledDatesModal(false)}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: 18,
                                color: "#9CA3AF",
                                cursor: "pointer",
                                padding: 4,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Add Form */}
                    <form onSubmit={handleAddDisabledDate} style={{ background: "#F9FAFB", padding: 14, borderRadius: 10, border: "1px solid #E5E7EB", marginBottom: 18 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr auto", gap: 10, alignItems: "end" }}>
                            <div>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4B5563", marginBottom: 4 }}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={disabledDateForm.date}
                                    onChange={(e) => setDisabledDateForm(prev => ({ ...prev, date: e.target.value }))}
                                    style={{
                                        width: "100%",
                                        fontSize: 13,
                                        padding: "7px 10px",
                                        borderRadius: 8,
                                        border: "1px solid #D1D5DB",
                                        background: "#FFF",
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#4B5563", marginBottom: 4 }}>
                                    Reason (e.g. Holiday, Maintenance)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Optional reason"
                                    value={disabledDateForm.reason}
                                    onChange={(e) => setDisabledDateForm(prev => ({ ...prev, reason: e.target.value }))}
                                    style={{
                                        width: "100%",
                                        fontSize: 13,
                                        padding: "7px 10px",
                                        borderRadius: 8,
                                        border: "1px solid #D1D5DB",
                                        background: "#FFF",
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={savingDisabledDate}
                                className="btn-primary"
                                style={{ padding: "8px 16px", fontSize: 12, height: 35, whiteSpace: "nowrap" }}
                            >
                                {savingDisabledDate ? "Saving..." : "Disable Date"}
                            </button>
                        </div>
                    </form>

                    {/* List */}
                    <div>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                            Current Disabled Dates ({disabledDatesList.length})
                        </h4>
                        {loadingDisabledDates ? (
                            <p style={{ fontSize: 12, color: "#9CA3AF" }}>Loading...</p>
                        ) : disabledDatesList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 20, color: "#9CA3AF", fontSize: 12, border: "1px dashed #E5E7EB", borderRadius: 8 }}>
                                No disabled dates yet. Standard days (except Sundays) are open.
                            </div>
                        ) : (
                            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                                {disabledDatesList.map((item) => (
                                    <div
                                        key={item.disabled_date_id}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px 12px",
                                            background: "#FFF",
                                            border: "1px solid #E5E7EB",
                                            borderRadius: 8,
                                            fontSize: 12,
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 700, color: "#1F2937", marginRight: 8 }}>
                                                {item.disabled_date}
                                            </span>
                                            <span style={{ color: "#6B7280" }}>
                                                — {item.reason || "No operation"}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDisabledDate(item.disabled_date_id)}
                                            style={{
                                                background: "none",
                                                border: "1px solid #FECACA",
                                                color: "#DC2626",
                                                borderRadius: 6,
                                                padding: "3px 8px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            {/* Standalone Pick Up / Delivery AC Unit Order Confirmation Modal */}
            <Modal
                show={!!confirmOrderModal}
                onClose={() => !confirmingOrder && setConfirmOrderModal(null)}
                maxWidth="md"
            >
                {confirmOrderModal && (
                    <form onSubmit={handleConfirmStandaloneOrder} style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                                    Confirm AC Unit Purchase #{confirmOrderModal.order_id}
                                </h3>
                                <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
                                    {confirmOrderModal.customer_name || "Customer"} · {confirmOrderModal.fulfillment_type === "pickup" ? "Store Pick Up" : "Delivery"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => !confirmingOrder && setConfirmOrderModal(null)}
                                style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, fontSize: 12, marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, color: "#1E2F5F", marginBottom: 4 }}>
                                {confirmOrderModal.unit_brand} {confirmOrderModal.unit_model} ({confirmOrderModal.unit_horsepower} HP · {confirmOrderModal.unit_ac_type})
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                                <span>Unit Price:</span>
                                <strong>{formatCurrency(confirmOrderModal.unit_price)}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#2563EB" }}>
                                <span>Down Payment Paid:</span>
                                <strong>- {formatCurrency(confirmOrderModal.down_payment)}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#15803D", fontWeight: 700, marginTop: 4, paddingTop: 4, borderTop: "1px dashed #CBD5E1" }}>
                                <span>Remaining Unit Balance ({confirmOrderModal.payment_method}):</span>
                                <span>{formatCurrency(confirmOrderModal.remaining_balance)}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {confirmOrderModal.fulfillment_type === "delivery" && (
                                <div>
                                    <label htmlFor="standalone-order-delivery-fee" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                        Delivery Fee (₱) *
                                    </label>
                                    <input
                                        id="standalone-order-delivery-fee"
                                        name="delivery_fee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        className="input-field"
                                        value={confirmOrderForm.delivery_fee}
                                        onChange={(e) => setConfirmOrderForm((p) => ({ ...p, delivery_fee: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="standalone-order-receipt" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                    Upload Official Receipt Picture *
                                </label>
                                <input
                                    id="standalone-order-receipt"
                                    name="purchase_receipt_image"
                                    type="file"
                                    accept="image/*"
                                    required
                                    className="input-field"
                                    style={{ fontSize: 12, padding: "6px 10px" }}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        setConfirmOrderReceiptFile(f);
                                        setConfirmOrderReceiptPreview(f ? URL.createObjectURL(f) : "");
                                    }}
                                />
                                {confirmOrderReceiptPreview && (
                                    <img
                                        src={confirmOrderReceiptPreview}
                                        alt="Receipt preview"
                                        style={{ marginTop: 8, maxHeight: 130, borderRadius: 8, border: "1px solid #CBD5E1", objectFit: "contain" }}
                                    />
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={confirmingOrder}
                                onClick={() => setConfirmOrderModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ background: "#16A34A" }}
                                disabled={confirmingOrder}
                            >
                                {confirmingOrder ? "Confirming..." : "Confirm Purchase & Receipt"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

export default Bookings;
