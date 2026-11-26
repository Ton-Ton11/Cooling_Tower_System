import React from "react";

const BLUE = { bg: "#EAF2FF", text: "#2563EB", border: "#C7DDFD", dot: "#2563EB" };
const GREEN = { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", dot: "#16A34A" };
const AMBER = { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", dot: "#D97706" };
const RED = { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", dot: "#DC2626" };
const SLATE = { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", dot: "#64748B" };

const cfg = {
    Pending: AMBER,
    pending: AMBER,
    "Pending Verification": AMBER,
    "Pending Review": AMBER,
    "Pending Payment Review": AMBER,
    "Under Review": AMBER,
    "Reschedule Notice": AMBER,
    "Payment Incomplete": AMBER,
    Rescheduled: AMBER,
    "Order Base": AMBER,
    "Checked Out": AMBER,
    Lost: AMBER,
    lost: AMBER,
    "Spare Part": AMBER,
    "Partially Completed": AMBER,
    "Low Stock": AMBER,
    "Expiring Soon": AMBER,
    "waiting for customer to sign": AMBER,
    "Waiting for Customer to Sign": AMBER,
    "Partially Returned": AMBER,
    "Pending Manager Review": AMBER,
    "Void Requested": AMBER,

    Approved: BLUE,
    Dispatched: BLUE,
    "In-Progress": BLUE,
    "In-progress": BLUE,
    Reserved: BLUE,
    Installed: BLUE,
    Finalized: BLUE,
    Tool: BLUE,
    Material: BLUE,
    "Warranty Reserved": BLUE,
    "Awaiting Fulfillment Choice": BLUE,
    "Ready for Pickup": BLUE,
    "Scheduled for Replacement": BLUE,

    approved: GREEN,
    Sufficient: GREEN,
    Verified: GREEN,
    Completed: GREEN,
    Active: GREEN,
    Available: GREEN,
    "Available / On Hand": GREEN,
    Paid: GREEN,
    Sold: GREEN,
    Exported: GREEN,
    Valid: GREEN,
    Issued: GREEN,
    Returned: GREEN,
    returned: GREEN,

    Rejected: RED,
    rejected: RED,
    Invalid: RED,
    Voided: RED,
    Cancelled: RED,
    Incomplete: RED,
    Defect: RED,
    Damaged: RED,
    damaged: RED,
    "Damaged / Lost": RED,
    "Lost/Damaged": RED,
    "Out of Stock": RED,
    Expired: RED,
    Critical: RED,
    "Customer Refused to Sign": RED,
    "Failed Booking": RED,

    Archived: SLATE,
    Deactivated: SLATE,
    Draft: SLATE,
};

function StatusBadge({ status }) {
    const isSigned = typeof status === "string" && status.startsWith("Signed by ");
    const c = isSigned ? GREEN : (cfg[status] ?? SLATE);
    return (
        <span
            style={{
                background: c.bg,
                color: c.text,
                border: `1px solid ${c.border}`,
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
        >
            <span
                style={{ background: c.dot }}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            />
            {status}
        </span>
    );
}

export { StatusBadge as default };
