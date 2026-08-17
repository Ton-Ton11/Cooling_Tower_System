export const SUPER_ADMIN_ENDPOINTS = {
    dashboard: "/super-admin/dashboard/data",
    bookings: "/super-admin/bookings",
    approveBooking: (bookingId) => `/super-admin/bookings/${bookingId}/approve`,
    staff: "/super-admin/staff",
    updateStaff: (userId) => `/super-admin/staff/${userId}`,
    archiveStaff: (userId) => `/super-admin/staff/${userId}/archive`,
    restoreStaff: (userId) => `/super-admin/staff/${userId}/restore`,
    inventory: "/super-admin/inventory-items",
    updateInventory: (itemId) => `/super-admin/inventory-items/${itemId}`,
    deleteInventory: (itemId) => `/super-admin/inventory-items/${itemId}`,
    acUnits: "/super-admin/ac-units",
    updateAcUnit: (acUnitId) => `/super-admin/ac-units/${acUnitId}`,
    deleteAcUnit: (acUnitId) => `/super-admin/ac-units/${acUnitId}`,
    salesRecords: "/super-admin/sales-records",
    documents: "/super-admin/documents",
    updateDocument: (docId) => `/super-admin/documents/${docId}`,
    deleteDocument: (docId) => `/super-admin/documents/${docId}`,
    announcements: "/super-admin/announcements",
    updateAnnouncement: (announcementId) =>
        `/super-admin/announcements/${announcementId}`,
    deleteAnnouncement: (announcementId) =>
        `/super-admin/announcements/${announcementId}`,
    activityLogs: "/super-admin/activity-logs",
};

export const STAFF_ROLE_OPTIONS = [
    { role_id: 2, role: "Manager" },
    { role_id: 3, role: "Admin Assistant" },
    { role_id: 4, role: "Tools Man" },
    { role_id: 5, role: "Technician" },
];

export const ANNOUNCEMENT_ROLE_OPTIONS = [
    { role_id: null, role: "All Staff" },
    { role_id: 1, role: "Super Admin" },
    { role_id: 2, role: "Manager" },
    { role_id: 3, role: "Admin Assistant" },
    { role_id: 4, role: "Tools Man" },
    { role_id: 5, role: "Technician" },
    { role_id: 6, role: "Customer" },
];

export const INVENTORY_TYPE_OPTIONS = ["Tool", "Material", "Spare Part"];

export const AC_TYPE_OPTIONS = [
    "Window",
    "Split",
    "Cassette",
    "Floor Mounted",
    "Ceiling Suspended",
];

export const AC_STATUS_OPTIONS = [
    "Available",
    "Reserved",
    "Installed",
    "Order Base",
    "Defect",
];

export const ROLE_COLORS = {
    "All Staff": "#3F7DFF",
    "Super Admin": "#EF4444",
    Manager: "#F58A07",
    "Admin Assistant": "#3F7DFF",
    "Tools Man": "#22C55E",
    Technician: "#8B5CF6",
    Customer: "#9CA3AF",
};

export const ACTION_COLORS = {
    CREATE: "#22C55E",
    APPROVE: "#3F7DFF",
    UPDATE: "#59B7FF",
    ARCHIVE: "#9CA3AF",
    RESTORE: "#22C55E",
    REPORT: "#F58A07",
    CHECKOUT: "#F58A07",
    DAMAGE_REPORT: "#EF4444",
    ANNOUNCE: "#F58A07",
    CANCEL: "#EF4444",
    COMPLETE: "#22C55E",
    INVENTORY: "#3F7DFF",
    PROMOTE: "#8B5CF6",
};

export function asNumber(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const stringValue = String(value).trim();

    if (!stringValue) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        const [year, month, day] = stringValue.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    const normalized = stringValue.includes("T")
        ? stringValue
        : stringValue.replace(" ", "T");
    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimestamp(value, options) {
    const parsed = parseDate(value);

    if (!parsed) {
        return value ? String(value) : "—";
    }

    return new Intl.DateTimeFormat("en-PH", options).format(parsed);
}

export function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(asNumber(value));
}

export function formatDate(value, options = {}) {
    return formatTimestamp(value, {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options,
    });
}

export function formatDateTime(value, options = {}) {
    return formatTimestamp(value, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        ...options,
    });
}

export function toInputDate(value) {
    const parsed = parseDate(value);

    if (!parsed) {
        return "";
    }

    const adjusted = new Date(
        parsed.getTime() - parsed.getTimezoneOffset() * 60 * 1000,
    );

    return adjusted.toISOString().slice(0, 10);
}

export function getInitials(value) {
    const parts = String(value || "")
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return "NA";
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

export function extractErrorMessage(
    error,
    fallback = "Something went wrong.",
) {
    const validationErrors = error?.response?.data?.errors;

    if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        const firstMessage = validationErrors[firstKey]?.[0];

        if (firstMessage) {
            return firstMessage;
        }
    }

    return (
        error?.response?.data?.message ||
        error?.message ||
        fallback
    );
}

export function normalizeInventoryItem(item) {
    const quantityOnHand = asNumber(item?.quantity_on_hand);
    const reorderLevel = asNumber(item?.reorder_level);

    return {
        ...item,
        quantity_on_hand: quantityOnHand,
        reorder_level: reorderLevel,
        low_stock:
            typeof item?.low_stock === "boolean"
                ? item.low_stock
                : quantityOnHand <= reorderLevel,
    };
}

export function normalizeAcUnit(unit) {
    return {
        ...unit,
        horsepower: asNumber(unit?.horsepower),
        purchase_price: asNumber(unit?.purchase_price),
        selling_price:
            unit?.selling_price === null ||
            unit?.selling_price === undefined ||
            unit?.selling_price === ""
                ? null
                : asNumber(unit?.selling_price),
        warranty_period: asNumber(unit?.warranty_period),
    };
}

export function buildAnnualRevenue(monthlyRevenue = []) {
    const grouped = monthlyRevenue.reduce((carry, row) => {
        const year = String(row?.year_month || "").slice(0, 4) || "Unknown";

        if (!carry[year]) {
            carry[year] = { year, revenue: 0, bookings: 0 };
        }

        carry[year].revenue += asNumber(row?.revenue);
        carry[year].bookings += asNumber(row?.bookings);

        return carry;
    }, {});

    return Object.values(grouped).sort((left, right) =>
        String(left.year).localeCompare(String(right.year)),
    );
}
