// utils/superAdmin.js

export const SUPER_ADMIN_ENDPOINTS = {
    dashboard: "/super-admin/dashboard/data",
    bookings: "/super-admin/bookings",
    approveBooking: (bookingId) => `/super-admin/bookings/${bookingId}/approve`,
    completeBooking: (bookingId) => `/super-admin/bookings/${bookingId}/complete`,
    staff: "/super-admin/staff",
    updateStaff: (userId) => `/super-admin/staff/${userId}`,
    deactivateStaff: (userId) => `/super-admin/staff/${userId}/deactivate`,
    reactivateStaff: (userId) => `/super-admin/staff/${userId}/reactivate`,
    archiveStaff: (userId) => `/super-admin/staff/${userId}/deactivate`,
    restoreStaff: (userId) => `/super-admin/staff/${userId}/reactivate`,

    // Technician Teams
    teams: "/super-admin/teams",
    storeTeam: "/super-admin/teams",
    updateTeam: (id) => `/super-admin/teams/${id}`,
    deleteTeam: (id) => `/super-admin/teams/${id}`,
    archiveTeam: (id) => `/super-admin/teams/${id}/archive`,
    restoreTeam: (id) => `/super-admin/teams/${id}/restore`,
    forceDeleteTeam: (id) => `/super-admin/teams/${id}/force-delete`,
    availableTechnicians: "/super-admin/teams/available-technicians",
    addTeamMember: (teamId) => `/super-admin/teams/${teamId}/members`,
    removeTeamMember: (teamId, techId) => `/super-admin/teams/${teamId}/members/${techId}`,

    // Tool Checklists
    checklists: "/super-admin/checklists",
    approveChecklist: (id) => `/super-admin/checklists/${id}/approve`,
    updateChecklistItems: (id) => `/super-admin/checklists/${id}/items`,
    updateToolStatus: (checklistId, itemId) => `/super-admin/checklists/${checklistId}/items/${itemId}/status`,
    completeChecklist: (id) => `/super-admin/checklists/${id}/complete`,

    // Dynamic Roles
    roles: "/super-admin/roles",
    storeRole: "/super-admin/roles",
    updateRole: (roleId) => `/super-admin/roles/${roleId}`,
    deleteRole: (roleId) => `/super-admin/roles/${roleId}`,
    
    // Legacy inventory endpoints (keep for backward compatibility)
    inventory: "/super-admin/inventory-items",
    updateInventory: (itemId) => `/super-admin/inventory-items/${itemId}`,
    deleteInventory: (itemId) => `/super-admin/inventory-items/${itemId}`,
    
    // NEW: Enhanced inventory endpoints for MaterialsTools component
    inventoryEnhanced: "/super-admin/inventory",
    inventoryGrouped: "/super-admin/inventory/grouped",
    updateInventoryEnhanced: (itemId) => `/super-admin/inventory/${itemId}`,
    deleteInventoryEnhanced: (itemId) => `/super-admin/inventory/${itemId}`,
    archiveInventory: (itemId) => `/super-admin/inventory/${itemId}/archive`,
    restoreInventory: (itemId) => `/super-admin/inventory/${itemId}/restore`,

    // Inventory Checkout & Usage Tracking
    checkoutInventory: "/super-admin/inventory/checkout",
    returnInventory: "/super-admin/inventory/return",
    inventoryCheckouts: "/super-admin/inventory/checkouts",
    inventoryCheckoutOptions: "/super-admin/inventory/checkout-options",
    sellInventoryItem: (itemId) => `/super-admin/inventory/${itemId}/sell`,
    inventoryCustomers: "/super-admin/inventory/customers",

    // Inventory Sub-folders
    inventoryFolders: "/super-admin/inventory/folders",
    storeInventoryFolder: "/super-admin/inventory/folders",
    updateInventoryFolder: (id) => `/super-admin/inventory/folders/${id}`,
    deleteInventoryFolder: (id) => `/super-admin/inventory/folders/${id}`,
    
    acUnits: "/super-admin/ac-units",
    updateAcUnit: (acUnitId) => `/super-admin/ac-units/${acUnitId}`,
    deleteAcUnit: (acUnitId) => `/super-admin/ac-units/${acUnitId}`,

    // Spare Parts endpoints
    spareParts: "/super-admin/spare-parts",
    updateSparePart: (itemId) => `/super-admin/spare-parts/${itemId}`,
    deleteSparePart: (itemId) => `/super-admin/spare-parts/${itemId}`,

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
    performance: "/super-admin/performance",

    // Catalog Management endpoints
    catalog: "/super-admin/catalog",
    storeService: "/super-admin/catalog/services",
    updateService: (id) => `/super-admin/catalog/services/${id}`,
    toggleService: (id) => `/super-admin/catalog/services/${id}/toggle`,
    deleteService: (id) => `/super-admin/catalog/services/${id}`,
    archiveService: (id) => `/super-admin/catalog/services/${id}/archive`,
    restoreService: (id) => `/super-admin/catalog/services/${id}/restore`,
    forceDeleteService: (id) => `/super-admin/catalog/services/${id}/force-delete`,

    storeUnitType: "/super-admin/catalog/unit-types",
    updateUnitType: (id) => `/super-admin/catalog/unit-types/${id}`,
    toggleUnitType: (id) => `/super-admin/catalog/unit-types/${id}/toggle`,
    deleteUnitType: (id) => `/super-admin/catalog/unit-types/${id}`,
    archiveUnitType: (id) => `/super-admin/catalog/unit-types/${id}/archive`,
    restoreUnitType: (id) => `/super-admin/catalog/unit-types/${id}/restore`,
    forceDeleteUnitType: (id) => `/super-admin/catalog/unit-types/${id}/force-delete`,

    storeBrand: "/super-admin/catalog/brands",
    updateBrand: (id) => `/super-admin/catalog/brands/${id}`,
    toggleBrand: (id) => `/super-admin/catalog/brands/${id}/toggle`,
    deleteBrand: (id) => `/super-admin/catalog/brands/${id}`,
    archiveBrand: (id) => `/super-admin/catalog/brands/${id}/archive`,
    restoreBrand: (id) => `/super-admin/catalog/brands/${id}/restore`,
    forceDeleteBrand: (id) => `/super-admin/catalog/brands/${id}/force-delete`,
};

// ── Manager Endpoints ────────────────────────────────────────────────────────
export const MANAGER_ENDPOINTS = {
    dashboard: "/manager/dashboard/data",
    bookings: "/manager/bookings",
    approveBooking: (bookingId) => `/manager/bookings/${bookingId}/approve`,
    completeBooking: (bookingId) => `/manager/bookings/${bookingId}/complete`,
    teams: "/manager/teams",
    archiveTeam: (id) => `/manager/teams/${id}/archive`,
    restoreTeam: (id) => `/manager/teams/${id}/restore`,
    announcements: "/manager/announcements",
    deleteAnnouncement: (id) => `/manager/announcements/${id}`,
    performance: "/manager/performance",

    // Catalog Management endpoints
    catalog: "/manager/catalog",
    storeService: "/manager/catalog/services",
    updateService: (id) => `/manager/catalog/services/${id}`,
    toggleService: (id) => `/manager/catalog/services/${id}/toggle`,
    deleteService: (id) => `/manager/catalog/services/${id}`,
    archiveService: (id) => `/manager/catalog/services/${id}/archive`,
    restoreService: (id) => `/manager/catalog/services/${id}/restore`,

    storeUnitType: "/manager/catalog/unit-types",
    updateUnitType: (id) => `/manager/catalog/unit-types/${id}`,
    toggleUnitType: (id) => `/manager/catalog/unit-types/${id}/toggle`,
    deleteUnitType: (id) => `/manager/catalog/unit-types/${id}`,
    archiveUnitType: (id) => `/manager/catalog/unit-types/${id}/archive`,
    restoreUnitType: (id) => `/manager/catalog/unit-types/${id}/restore`,

    storeBrand: "/manager/catalog/brands",
    updateBrand: (id) => `/manager/catalog/brands/${id}`,
    toggleBrand: (id) => `/manager/catalog/brands/${id}/toggle`,
    deleteBrand: (id) => `/manager/catalog/brands/${id}`,
    archiveBrand: (id) => `/manager/catalog/brands/${id}/archive`,
    restoreBrand: (id) => `/manager/catalog/brands/${id}/restore`,
};

// ── Admin Assistant Endpoints ────────────────────────────────────────────────
export const ADMIN_ASSISTANT_ENDPOINTS = {
    dashboard: "/admin-assistant/dashboard/data",
    staff: "/admin-assistant/staff",
    updateStaff: (userId) => `/admin-assistant/staff/${userId}`,
    deactivateStaff: (userId) => `/admin-assistant/staff/${userId}/deactivate`,
    reactivateStaff: (userId) => `/admin-assistant/staff/${userId}/reactivate`,
    archiveStaff: (userId) => `/admin-assistant/staff/${userId}/deactivate`,
    restoreStaff: (userId) => `/admin-assistant/staff/${userId}/reactivate`,

    // Dynamic Roles
    roles: "/admin-assistant/roles",
    storeRole: "/admin-assistant/roles",
    updateRole: (roleId) => `/admin-assistant/roles/${roleId}`,
    deleteRole: (roleId) => `/admin-assistant/roles/${roleId}`,

    inventoryFolders: "/admin-assistant/inventory/folders",
    storeInventoryFolder: "/admin-assistant/inventory/folders",
    updateInventoryFolder: (id) => `/admin-assistant/inventory/folders/${id}`,
    deleteInventoryFolder: (id) => `/admin-assistant/inventory/folders/${id}`,

    acUnits: "/admin-assistant/ac-units",
    updateAcUnit: (id) => `/admin-assistant/ac-units/${id}`,
    deleteAcUnit: (id) => `/admin-assistant/ac-units/${id}`,
    spareParts: "/admin-assistant/spare-parts",
    updateSparePart: (id) => `/admin-assistant/spare-parts/${id}`,
    deleteSparePart: (id) => `/admin-assistant/spare-parts/${id}`,
    checkoutInventory: "/super-admin/inventory/checkout",
    returnInventory: "/super-admin/inventory/return",
    inventoryCheckouts: "/super-admin/inventory/checkouts",
    inventoryCheckoutOptions: "/super-admin/inventory/checkout-options",
    sellInventoryItem: (itemId) => `/super-admin/inventory/${itemId}/sell`,
    inventoryCustomers: "/super-admin/inventory/customers",
    salesRecords: "/admin-assistant/sales-records",
    announcements: "/admin-assistant/announcements",
    deleteAnnouncement: (id) => `/admin-assistant/announcements/${id}`,

    // Catalog Management endpoints
    catalog: "/admin-assistant/catalog",
    storeService: "/admin-assistant/catalog/services",
    updateService: (id) => `/admin-assistant/catalog/services/${id}`,
    toggleService: (id) => `/admin-assistant/catalog/services/${id}/toggle`,
    deleteService: (id) => `/admin-assistant/catalog/services/${id}`,
    archiveService: (id) => `/admin-assistant/catalog/services/${id}/archive`,
    restoreService: (id) => `/admin-assistant/catalog/services/${id}/restore`,

    storeUnitType: "/admin-assistant/catalog/unit-types",
    updateUnitType: (id) => `/admin-assistant/catalog/unit-types/${id}`,
    toggleUnitType: (id) => `/admin-assistant/catalog/unit-types/${id}/toggle`,
    deleteUnitType: (id) => `/admin-assistant/catalog/unit-types/${id}`,
    archiveUnitType: (id) => `/admin-assistant/catalog/unit-types/${id}/archive`,
    restoreUnitType: (id) => `/admin-assistant/catalog/unit-types/${id}/restore`,

    storeBrand: "/admin-assistant/catalog/brands",
    updateBrand: (id) => `/admin-assistant/catalog/brands/${id}`,
    toggleBrand: (id) => `/admin-assistant/catalog/brands/${id}/toggle`,
    deleteBrand: (id) => `/admin-assistant/catalog/brands/${id}`,
    archiveBrand: (id) => `/admin-assistant/catalog/brands/${id}/archive`,
    restoreBrand: (id) => `/admin-assistant/catalog/brands/${id}/restore`,
};

// ── Tools Man Endpoints ──────────────────────────────────────────────────────
export const TOOLS_MAN_ENDPOINTS = {
    dashboard: "/tools-man/dashboard/data",
    inventory: "/tools-man/inventory",
    updateInventory: (id) => `/tools-man/inventory/${id}`,
    deleteInventory: (id) => `/tools-man/inventory/${id}`,
    inventoryEnhanced: "/tools-man/inventory",
    inventoryGrouped: "/tools-man/inventory",
    updateInventoryEnhanced: (id) => `/tools-man/inventory/${id}`,
    deleteInventoryEnhanced: (id) => `/tools-man/inventory/${id}`,
    archiveInventory: (id) => `/tools-man/inventory/${id}/archive`,
    restoreInventory: (id) => `/tools-man/inventory/${id}/restore`,

    // Tool Checklists Management
    checklists: "/tools-man/checklists",
    approveChecklist: (id) => `/tools-man/checklists/${id}/approve`,
    updateChecklistItems: (id) => `/tools-man/checklists/${id}/items`,
    updateToolStatus: (checklistId, itemId) => `/tools-man/checklists/${checklistId}/items/${itemId}/status`,
    completeChecklist: (id) => `/tools-man/checklists/${id}/complete`,

    // Inventory Checkout & Usage Tracking
    checkoutInventory: "/tools-man/inventory/checkout",
    returnInventory: "/tools-man/inventory/return",
    inventoryCheckouts: "/tools-man/inventory/checkouts",
    inventoryCheckoutOptions: "/tools-man/inventory/checkout-options",
    sellInventoryItem: (itemId) => `/tools-man/inventory/${itemId}/sell`,
    inventoryCustomers: "/tools-man/inventory/customers",

    // Inventory Sub-folders
    inventoryFolders: "/tools-man/inventory/folders",
    storeInventoryFolder: "/tools-man/inventory/folders",
    updateInventoryFolder: (id) => `/tools-man/inventory/folders/${id}`,
    deleteInventoryFolder: (id) => `/tools-man/inventory/folders/${id}`,

    spareParts: "/tools-man/spare-parts",
    updateSparePart: (id) => `/tools-man/spare-parts/${id}`,
    deleteSparePart: (id) => `/tools-man/spare-parts/${id}`,
    announcements: "/tools-man/announcements",
    deleteAnnouncement: (id) => `/tools-man/announcements/${id}`,
};

// ── Technician Endpoints ─────────────────────────────────────────────────────
export const TECHNICIAN_ENDPOINTS = {
    dashboard: "/technician/dashboard/data",
    bookings: "/technician/bookings",
    startJob: (bookingId) => `/technician/bookings/${bookingId}/start`,
    completeJob: (bookingId) => `/technician/bookings/${bookingId}/complete`,
    logMaterial: (bookingId) => `/technician/bookings/${bookingId}/materials`,
    materialsList: "/technician/materials-list",
    myTools: "/technician/my-tools",
    checklists: "/technician/checklists",
    storeChecklist: "/technician/checklists",
    updateChecklist: (id) => `/technician/checklists/${id}`,
    availableCatalog: "/technician/available-catalog",
    announcements: "/technician/announcements",
    performance: "/technician/performance",
};

// ── Head Technician Endpoints ────────────────────────────────────────────────
export const HEAD_TECHNICIAN_ENDPOINTS = {
    dashboard: "/head-technician/dashboard/data",
    teams: "/head-technician/teams",
    storeTeam: "/head-technician/teams",
    updateTeam: (id) => `/head-technician/teams/${id}`,
    deleteTeam: (id) => `/head-technician/teams/${id}`,
    archiveTeam: (id) => `/head-technician/teams/${id}/archive`,
    restoreTeam: (id) => `/head-technician/teams/${id}/restore`,
    availableTechnicians: "/head-technician/teams/available-technicians",
    addTeamMember: (teamId) => `/head-technician/teams/${teamId}/members`,
    removeTeamMember: (teamId, techId) => `/head-technician/teams/${teamId}/members/${techId}`,
    bookings: "/head-technician/bookings",
    startJob: (bookingId) => `/head-technician/bookings/${bookingId}/start`,
    completeJob: (bookingId) => `/head-technician/bookings/${bookingId}/complete`,
    logMaterial: (bookingId) => `/head-technician/bookings/${bookingId}/materials`,
    materialsList: "/head-technician/materials-list",
    myTools: "/head-technician/my-tools",
    checklists: "/head-technician/checklists",
    storeChecklist: "/head-technician/checklists",
    updateChecklist: (id) => `/head-technician/checklists/${id}`,
    availableCatalog: "/head-technician/available-catalog",
    announcements: "/head-technician/announcements",
    performance: "/head-technician/performance",
};

// ── Customer Endpoints ───────────────────────────────────────────────────────
export const CUSTOMER_ENDPOINTS = {
    dashboard: "/customer/dashboard/data",
    services: "/customer/services",
    catalog: "/customer/catalog",
    bookings: "/customer/bookings",
    storeBooking: "/customer/bookings",
    rescheduleBooking: (bookingId) => `/customer/bookings/${bookingId}/reschedule`,
    cancelBooking: (bookingId) => `/customer/bookings/${bookingId}/cancel`,
    respondQuotation: (bookingId) => `/customer/bookings/${bookingId}/quotation-response`,
    feedback: "/customer/feedback",
    complaints: "/customer/complaints",
    storeComplaint: "/customer/complaints",
    announcements: "/customer/announcements",
};

export const STAFF_ROLE_OPTIONS = [
    { role_id: 2, role: "Manager" },
    { role_id: 3, role: "Admin Assistant" },
    { role_id: 4, role: "Tools Man" },
    { role_id: 5, role: "Technician" },
    { role_id: 7, role: "Head Technician" },
];

export const ANNOUNCEMENT_ROLE_OPTIONS = [
    { role_id: null, role: "All Staff" },
    { role_id: 1, role: "Super Admin" },
    { role_id: 2, role: "Manager" },
    { role_id: 3, role: "Admin Assistant" },
    { role_id: 4, role: "Tools Man" },
    { role_id: 5, role: "Technician" },
    { role_id: 7, role: "Head Technician" },
    { role_id: 6, role: "Customer" },
];

export const INVENTORY_TYPE_OPTIONS = ["Tool", "Material", "Spare Part"];

// Inventory mode options
export const INVENTORY_MODE_OPTIONS = ["worker", "sale"];

// Tool subtype options
export const TOOL_SUBTYPE_OPTIONS = ["power", "hand"];

// Inventory status options
export const INVENTORY_STATUS_OPTIONS = ["Available", "Borrowed", "Lost/Damaged"];

// Unit options for comboboxes
export const UNIT_OPTIONS = ['can', 'roll', 'm', 'pc', 'set', 'unit', 'L', 'kg', 'box', 'pair', 'spool'];

// Brand options for comboboxes
export const BRAND_OPTIONS = ['Daikin', 'Carrier', 'Mitsubishi', 'Panasonic', 'LG', 'Midea', 'Samsung', 'Haier', 'Toshiba'];

// Part names for comboboxes
export const PART_NAMES = ['Capacitor 35+5 MFD', 'Contactor 25A', 'Fan Motor 1/5HP', 'Thermistor Sensor', 'PCB Control Board', 'Expansion Valve', 'Drain Pan', 'Filter Drier', 'Relay Switch', 'Overload Protector'];

// Worker material names for comboboxes
export const WORKER_MATERIAL_NAMES = [
    'Refrigerant R32 (1kg)', 'Refrigerant R410A (1kg)', 'Copper Pipe 1/4"', 'Copper Pipe 3/8"',
    'Insulation Tape', 'Electrical Cable 2.0mm', 'AC Coil Cleaner (spray)',
    'Flux Paste', 'Brazing Rod', 'PVC Drain Hose', 'Filter Mesh', 'Condenser Fins',
];

// Sale item names for comboboxes
export const SALE_ITEM_NAMES = [
    'AC Coil Cleaner (spray)', 'Insulation Tape', 'Refrigerant R32 (1kg)', 'Refrigerant R410A (1kg)',
    'Pipe Flaring Tool', 'Digital Clamp Meter', 'Manifold Gauge Set', 'Vacuum Pump',
    'Torque Wrench Set', 'Drill Machine',
];

// Power tool names for comboboxes
export const POWER_TOOL_NAMES = [
    'Manifold Gauge Set', 'Vacuum Pump', 'Digital Clamp Meter', 'Cordless Drill',
    'Refrigerant Recovery Machine', 'High-Pressure Washer', 'Cable Tester', 'Level Meter',
];

// Hand tool names for comboboxes
export const HAND_TOOL_NAMES = [
    'Pipe Flaring Tool Set', 'Torque Wrench Set', 'Screwdriver Set', 'Hex Key Set',
    'Pliers Set', 'Wire Stripper Set', 'Tape Measure', 'Utility Knife Set',
];

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
    "Sold",
    "Order Base",
    "Defect",
];

export const SPARE_PART_STATUS_OPTIONS = [
    "Available / On Hand",
    "Order Base",
    "Defect",
    "Warranty Reserved",
    "Sold",
];

export const ROLE_COLORS = {
    "All Staff": "#3F7DFF",
    "Super Admin": "#EF4444",
    Manager: "#F58A07",
    "Admin Assistant": "#3F7DFF",
    "Tools Man": "#22C55E",
    Technician: "#8B5CF6",
    "Head Technician": "#6366F1",
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

/**
 * Normalize inventory item from API response
 * Handles both legacy and enhanced inventory formats
 */
export function normalizeInventoryItem(item) {
    if (!item) return null;

    const quantityOnHand = asNumber(item?.quantity_on_hand);
    const reorderLevel = asNumber(item?.reorder_level);
    const initialStock = item?.initial_stock !== null && item?.initial_stock !== undefined 
        ? asNumber(item?.initial_stock) 
        : quantityOnHand;
    const capital = asNumber(item?.capital);
    const profit = asNumber(item?.profit);
    const sellingPrice = item?.selling_price !== null && item?.selling_price !== undefined && item?.selling_price !== ""
        ? asNumber(item?.selling_price)
        : (capital + profit);

    let brands = [];
    if (Array.isArray(item?.compatible_brands)) {
        brands = item.compatible_brands;
    } else if (typeof item?.compatible_brands === 'string') {
        try {
            const parsed = JSON.parse(item.compatible_brands);
            brands = Array.isArray(parsed) ? parsed : item.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
        } catch {
            brands = item.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
        }
    }

    return {
        item_id: item.item_id,
        item_name: item.item_name || '',
        item_type: item.item_type || 'Material',
        inventory_mode: item.inventory_mode || 'worker',
        tool_subtype: item.tool_subtype || null,
        folder_id: item.folder_id ? Number(item.folder_id) : null,
        sub_category: item.sub_category || item.category || '',
        category: item.sub_category || item.category || '',
        compatible_brands: brands,
        serial_number: item.serial_number || null,
        quantity_on_hand: quantityOnHand,
        initial_stock: initialStock,
        reorder_level: reorderLevel,
        unit: item.unit || '',
        capital: capital,
        profit: profit,
        selling_price: sellingPrice,
        supplier_name: item.supplier_name || null,
        managed_by: item.managed_by || '',
        is_archived: Boolean(item.is_archived),
        archived_at: item.archived_at || null,
        status: item.status || 'Available',
        added_at: item.created_at || item.added_at || item.last_updated,
        last_updated: item.last_updated,
        low_stock: typeof item?.low_stock === 'boolean' 
            ? item.low_stock 
            : quantityOnHand <= reorderLevel,
    };
}

export function normalizeSparePart(part) {
    if (!part) return null;

    const quantityOnHand = asNumber(part?.quantity_on_hand ?? part?.qty);
    const reorderLevel = asNumber(part?.reorder_level);
    const initialStock = part?.initial_stock !== null && part?.initial_stock !== undefined 
        ? asNumber(part?.initial_stock) 
        : quantityOnHand;
    const capital = asNumber(part?.capital);
    const sellingPrice = part?.selling_price !== null && part?.selling_price !== undefined && part?.selling_price !== ""
        ? asNumber(part?.selling_price)
        : (capital + asNumber(part?.profit));
    const profit = asNumber(part?.profit, Math.max(0, sellingPrice - capital));

    let brands = [];
    if (Array.isArray(part?.compatible_brands)) {
        brands = part.compatible_brands;
    } else if (typeof part?.compatible_brands === 'string') {
        try {
            const parsed = JSON.parse(part.compatible_brands);
            brands = Array.isArray(parsed) ? parsed : part.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
        } catch {
            brands = part.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
        }
    }

    const explicitStatus = part?.status;
    const status = explicitStatus 
        ? explicitStatus 
        : (quantityOnHand === 0 ? 'Out of Stock' : (quantityOnHand <= reorderLevel ? 'Low Stock' : 'Available / On Hand'));

    return {
        part_id: part.item_id || part.part_id,
        item_id: part.item_id || part.part_id,
        part_name: part.part_name || part.item_name || '',
        item_name: part.item_name || part.part_name || '',
        item_type: 'Spare Part',
        folder_id: part.folder_id ? Number(part.folder_id) : null,
        sub_category: part.sub_category || part.category || '',
        category: part.sub_category || part.category || '',
        compatible_brands: brands,
        quantity_on_hand: quantityOnHand,
        initial_stock: initialStock,
        reorder_level: reorderLevel,
        unit: part.unit || '',
        capital: capital,
        selling_price: sellingPrice,
        profit: profit,
        supplier: part.supplier || part.supplier_name || '',
        supplier_name: part.supplier_name || part.supplier || '',
        status: status,
        added_at: part.created_at || part.added_at || part.last_updated || '',
        last_updated: part.last_updated || part.updated_at || '',
        low_stock: quantityOnHand <= reorderLevel,
    };
}

export function normalizeAcUnit(unit) {
    if (!unit) return null;
    
    return {
        ac_unit_id: unit.ac_unit_id,
        brand: unit.brand || '',
        model: unit.model || '',
        serial_number: unit.serial_number || '',
        horsepower: asNumber(unit?.horsepower),
        ac_type: unit.ac_type || 'Split',
        refrigerant_type: unit.refrigerant_type || null,
        supplier: unit.supplier || null,
        purchase_price: asNumber(unit?.purchase_price),
        selling_price: unit?.selling_price === null || unit?.selling_price === undefined || unit?.selling_price === ""
            ? null
            : asNumber(unit?.selling_price),
        purchase_date: unit.purchase_date,
        warranty_period: asNumber(unit?.warranty_period),
        status: unit.status || 'Available',
        expected_arrival: unit.expected_arrival || null,
        created_at: unit.created_at,
        updated_at: unit.updated_at,
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