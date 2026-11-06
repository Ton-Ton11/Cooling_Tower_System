import React from "react";

const cfg = {
    Pending: {
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
        dot: "#D97706",
    },
    Approved: {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#BFDBFE",
        dot: "#2563EB",
    },
    "Partially Completed": {
        bg: "#CCFBF1",
        text: "#115E59",
        border: "#99F6E4",
        dot: "#0D9488",
    },
    Completed: {
        bg: "#DCFCE7",
        text: "#166534",
        border: "#BBF7D0",
        dot: "#16A34A",
    },
    Invalid: {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FECACA",
        dot: "#DC2626",
    },
    Cancelled: {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FECACA",
        dot: "#DC2626",
    },
    Active: {
        bg: "#DCFCE7",
        text: "#166534",
        border: "#BBF7D0",
        dot: "#16A34A",
    },
    Archived: {
        bg: "#F1F5F9",
        text: "#475569",
        border: "#E2E8F0",
        dot: "#64748B",
    },
    Dispatched: {
        bg: "#E0F2FE",
        text: "#0369A1",
        border: "#BAE6FD",
        dot: "#0284C7",
    },
    "In-Progress": {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#BFDBFE",
        dot: "#2563EB",
    },
    Incomplete: {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FECACA",
        dot: "#DC2626",
    },
    Rescheduled: {
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
        dot: "#D97706",
    },
    Available: {
        bg: "#DCFCE7",
        text: "#166534",
        border: "#BBF7D0",
        dot: "#16A34A",
    },
    Reserved: {
        bg: "#E0F2FE",
        text: "#0369A1",
        border: "#BAE6FD",
        dot: "#0284C7",
    },
    Installed: {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#BFDBFE",
        dot: "#2563EB",
    },
    "Order Base": {
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
        dot: "#D97706",
    },
    Defect: {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FECACA",
        dot: "#DC2626",
    },
    Paid: {
        bg: "#DCFCE7",
        text: "#166534",
        border: "#BBF7D0",
        dot: "#16A34A",
    },
    "Checked Out": {
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
        dot: "#D97706",
    },
    "Lost/Damaged": {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FECACA",
        dot: "#DC2626",
    },
    Draft: {
        bg: "#F1F5F9",
        text: "#475569",
        border: "#E2E8F0",
        dot: "#64748B",
    },
    Finalized: {
        bg: "#E0F2FE",
        text: "#0369A1",
        border: "#BAE6FD",
        dot: "#0284C7",
    },
    Exported: {
        bg: "#DCFCE7",
        text: "#166534",
        border: "#BBF7D0",
        dot: "#16A34A",
    },
    Tool: {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#BFDBFE",
        dot: "#2563EB",
    },
    Material: {
        bg: "#E0F2FE",
        text: "#0369A1",
        border: "#BAE6FD",
        dot: "#0284C7",
    },
    "Spare Part": {
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
        dot: "#D97706",
    },
    Admin: {
        bg: "#F3E8FF",
        text: "#6B21A8",
        border: "#E9D5FF",
        dot: "#9333EA",
    },
    Staff: {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#BFDBFE",
        dot: "#2563EB",
    },
    Technician: {
        bg: "#E0F2FE",
        text: "#0369A1",
        border: "#BAE6FD",
        dot: "#0284C7",
    },
    Inactive: {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FECACA",
        dot: "#DC2626",
    },
};

function StatusBadge({ status }) {
    const c = cfg[status] ?? {
        bg: "#F1F5F9",
        text: "#475569",
        border: "#E2E8F0",
        dot: "#64748B",
    };

    return (
        <span
            style={{
                backgroundColor: c.bg,
                color: c.text,
                border: `1px solid ${c.border || "transparent"}`,
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap"
        >
            <span
                style={{ backgroundColor: c.dot }}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            />
            {status}
        </span>
    );
}

export { StatusBadge as default };
