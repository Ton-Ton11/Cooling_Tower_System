import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    TECHNICIAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

const LockIcon = ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);
const InfoIcon = ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);
const ClipboardIcon = ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
);
const UserIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const UsersIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);
const PackageIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4L7.55 4.24a1.78 1.78 0 00-2.5 1.55v12.42a1.78 1.78 0 002.5 1.55l8.95-5.16a1.78 1.78 0 000-3.1z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
);
const EyeIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EditIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const AlertCircleIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const MessageSquareIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
);

export default function TechnicianTools({ addToast, onNavigate, onDataChanged }) {
    const [viewTab, setViewTab] = useState("checklists"); // 'checklists' | 'catalog'
    const [checklists, setChecklists] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [assignedBookings, setAssignedBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [loading, setLoading] = useState(true);

    // Modal state for Creating / Editing Checklist
    const [checklistModalOpen, setChecklistModalOpen] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState(null);
    const [savingChecklist, setSavingChecklist] = useState(false);

    // Checklist Form State
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [checklistNotes, setChecklistNotes] = useState("");
    // selectedItems is a map of item_id -> { selected: boolean, quantity: number, notes: string }
    const [selectedItemsMap, setSelectedItemsMap] = useState({});
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogTypeFilter, setCatalogTypeFilter] = useState("All");
    const [activeCategoryTab, setActiveCategoryTab] = useState("materials"); // 'materials' | 'power_tools' | 'hand_tools'
    const [updatingToolItemId, setUpdatingToolItemId] = useState(null);

    // Modal state for viewing checklist details
    const [viewChecklistModal, setViewChecklistModal] = useState(null);

    // Fetch checklists
    const fetchChecklists = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.checklists);
            setChecklists(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load task checklists."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Fetch catalog (view-only catalog & item picker)
    const fetchCatalog = useCallback(async () => {
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.availableCatalog);
            setCatalog(Array.isArray(data?.data) ? data.data : []);
        } catch {
            // non-blocking
        }
    }, []);

    // Fetch technician's automatically started bookings (Approved / In-Progress) to populate the task checklist tab
    const fetchAssignedBookings = useCallback(async () => {
        setLoadingBookings(true);
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.bookings);
            const list = Array.isArray(data?.data) ? data.data : [];
            const startedTasks = list.filter((b) =>
                (Boolean(b.lead_technician_id) || Boolean(b.assistant_technician_id) || Boolean(b.assigned_tech_id) || Boolean(b.assigned_team_id)) &&
                ["Approved", "Dispatched", "In-Progress"].includes(b.booking_status) &&
                (Boolean(b.job_started_by_tech) || b.booking_status === "In-Progress")
            );
            setAssignedBookings(startedTasks);
        } catch {
            // non-blocking
        } finally {
            setLoadingBookings(false);
        }
    }, []);

    useEffect(() => {
        fetchChecklists();
        fetchCatalog();
        fetchAssignedBookings();
    }, [fetchChecklists, fetchCatalog, fetchAssignedBookings]);

    // Check if there was a pre-selected booking passed from "Create Tools & Materials Checklist" in My Jobs
    useEffect(() => {
        const storedBooking = localStorage.getItem("cooling_tower_selected_booking_checklist");
        if (storedBooking) {
            try {
                const parsed = JSON.parse(storedBooking);
                if (parsed?.booking_id) {
                    setSelectedBookingId(String(parsed.booking_id));
                    setAssignedBookings((prev) => {
                        if (prev.some((b) => Number(b.booking_id) === Number(parsed.booking_id))) {
                            return prev;
                        }
                        return [
                            {
                                booking_id: parsed.booking_id,
                                client_name: parsed.client_name || "Customer",
                                service: parsed.service || "Service",
                                booking_status: parsed.booking_status || "Approved",
                                assigned_team_name: parsed.team_name || "",
                            },
                            ...prev,
                        ];
                    });
                    setEditingChecklist(null);
                    setChecklistNotes("");
                    setSelectedItemsMap({});
                    setChecklistModalOpen(true);
                }
            } catch {
                // ignore JSON parse error
            } finally {
                localStorage.removeItem("cooling_tower_selected_booking_checklist");
            }
        }
    }, []);

    // Support opening a specific checklist passed from My Jobs
    useEffect(() => {
        if (checklists.length === 0) return;
        const viewId = localStorage.getItem("cooling_tower_view_checklist_id");
        if (viewId) {
            localStorage.removeItem("cooling_tower_view_checklist_id");
            const target = checklists.find((c) => String(c.checklist_id) === String(viewId));
            if (target) {
                setViewChecklistModal(target);
            }
        }
    }, [checklists]);

    const openCreateChecklistModal = (prefillBookingId = "") => {
        if (assignedBookings.length === 0 && !prefillBookingId) {
            addToast("No active approved job is currently assigned to you for checklist creation.", "error");
            return;
        }
        const bookingsWithoutChecklist = assignedBookings.filter(
            (b) => !checklists.some((c) => Number(c.booking_id) === Number(b.booking_id))
        );
        if (!prefillBookingId && bookingsWithoutChecklist.length === 0) {
            addToast("All of your active assigned jobs already have a checklist created. You can view or edit a Pending checklist below.", "error");
            return;
        }
        const defaultBookingId =
            prefillBookingId ||
            (bookingsWithoutChecklist[0]
                ? String(bookingsWithoutChecklist[0].booking_id)
                : assignedBookings[0]
                ? String(assignedBookings[0].booking_id)
                : "");
        setEditingChecklist(null);
        setSelectedBookingId(defaultBookingId);
        setChecklistNotes("");
        setSelectedItemsMap({});
        setActiveCategoryTab("materials");
        setChecklistModalOpen(true);
    };

    const handleReturnToolStatus = async (checklistId, itemId, newStatus) => {
        if (updatingToolItemId) return;
        setUpdatingToolItemId(itemId);
        try {
            const { data } = await window.axios.patch(
                TECHNICIAN_ENDPOINTS.updateChecklistItemStatus(checklistId, itemId),
                { status: newStatus }
            );
            addToast(
                newStatus === "returned"
                    ? "Tool marked as returned to Tools Man."
                    : `Tool marked as ${newStatus} and recorded in Worker's Inventory (Damaged / Lost category).`
            );
            await fetchChecklists(false);
            await fetchCatalog();
            setViewChecklistModal((prev) => {
                if (!prev || prev.checklist_id !== checklistId) return prev;
                return {
                    ...prev,
                    items: (prev.items || []).map((it) =>
                        it.id === itemId ? { ...it, status: data?.data?.status || newStatus } : it
                    ),
                };
            });
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update tool return status."), "error");
        } finally {
            setUpdatingToolItemId(null);
        }
    };

    const openEditChecklistModal = (checklist) => {
        if (checklist.status !== "Pending") {
            addToast("This checklist is approved and locked. Only Tools Man can modify it.", "error");
            return;
        }
        setEditingChecklist(checklist);
        setSelectedBookingId(String(checklist.booking_id));
        setChecklistNotes(checklist.notes || "");

        // Prepopulate selectedItemsMap from checklist.items
        const newMap = {};
        if (Array.isArray(checklist.items)) {
            checklist.items.forEach((item) => {
                newMap[item.item_id] = {
                    selected: true,
                    quantity: item.quantity_requested || 1,
                    notes: item.notes || "",
                };
            });
        }
        setSelectedItemsMap(newMap);
        setChecklistModalOpen(true);
    };

    const toggleItemSelection = (itemOrId) => {
        const itemId = typeof itemOrId === "object" && itemOrId !== null ? itemOrId.item_id : itemOrId;
        const catalogItem = typeof itemOrId === "object" && itemOrId !== null ? itemOrId : catalog.find((c) => c.item_id === itemId);

        if (catalogItem) {
            const statusLower = (catalogItem.status || "").toLowerCase();
            const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
            const isBorrowed = statusLower === "borrowed";
            const isOutOfStock = Number(catalogItem.quantity_on_hand) <= 0;

            if (!catalogItem.is_available || isDamaged || isBorrowed || isOutOfStock) {
                const reason = isDamaged
                    ? "damaged or broken"
                    : isBorrowed
                    ? "currently borrowed / in use"
                    : "out of stock";
                addToast(`"${catalogItem.item_name}" is ${reason} and cannot be selected.`, "error");
                return;
            }
        }

        setSelectedItemsMap((prev) => {
            const current = prev[itemId];
            if (current && current.selected) {
                const updated = { ...prev };
                delete updated[itemId];
                return updated;
            }
            return {
                ...prev,
                [itemId]: {
                    selected: true,
                    quantity: 1,
                    notes: "",
                },
            };
        });
    };

    const updateItemQuantity = (itemId, qty, maxStock) => {
        const parsed = parseInt(qty, 10);
        const validQty = isNaN(parsed) || parsed < 1 ? 1 : maxStock ? Math.min(parsed, maxStock) : parsed;
        setSelectedItemsMap((prev) => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                quantity: validQty,
            },
        }));
    };

    const handleSaveChecklist = async () => {
        if (!selectedBookingId) {
            addToast("Please select an assigned task/booking.", "error");
            return;
        }

        const selectedItemIds = Object.keys(selectedItemsMap).filter(
            (id) => selectedItemsMap[id]?.selected,
        );

        if (selectedItemIds.length === 0) {
            addToast("Please select at least one tool or material for this checklist.", "error");
            return;
        }

        // Validate availability of all selected items
        for (const id of selectedItemIds) {
            const catItem = catalog.find((c) => c.item_id === Number(id));
            if (catItem) {
                const statusLower = (catItem.status || "").toLowerCase();
                const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                const isBorrowed = statusLower === "borrowed";
                const isOutOfStock = Number(catItem.quantity_on_hand) <= 0;

                if (!catItem.is_available || isDamaged || isBorrowed || isOutOfStock) {
                    const reason = isDamaged ? "damaged/broken" : isBorrowed ? "currently in use" : "out of stock";
                    addToast(`Cannot submit checklist: "${catItem.item_name}" is ${reason}. Please uncheck it before submitting.`, "error");
                    return;
                }
            }
        }

        const itemsPayload = selectedItemIds.map((id) => ({
            item_id: Number(id),
            quantity: selectedItemsMap[id].quantity || 1,
            notes: selectedItemsMap[id].notes || null,
        }));

        setSavingChecklist(true);
        try {
            if (editingChecklist) {
                const url = TECHNICIAN_ENDPOINTS.updateChecklist(editingChecklist.checklist_id);
                const { data } = await window.axios.patch(url, {
                    notes: checklistNotes,
                    items: itemsPayload,
                });
                addToast(data?.message || "Checklist updated successfully.");
            } else {
                const url = TECHNICIAN_ENDPOINTS.storeChecklist;
                const { data } = await window.axios.post(url, {
                    booking_id: Number(selectedBookingId),
                    notes: checklistNotes,
                    items: itemsPayload,
                });
                addToast(data?.message || "Task checklist submitted to Tools Man for review.");
            }

            setChecklistModalOpen(false);
            await fetchChecklists(false);
            await fetchAssignedBookings();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to save checklist."), "error");
        } finally {
            setSavingChecklist(false);
        }
    };

    // Filter catalog items for picker & view-only table
    const filteredCatalog = useMemo(() => {
        return catalog.filter((item) => {
            const matchesSearch =
                !catalogSearch.trim() ||
                item.item_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                (item.tool_subtype && item.tool_subtype.toLowerCase().includes(catalogSearch.toLowerCase())) ||
                (item.serial_number && item.serial_number.toLowerCase().includes(catalogSearch.toLowerCase()));

            const matchesType =
                catalogTypeFilter === "All" ||
                item.item_type === catalogTypeFilter;

            return matchesSearch && matchesType;
        });
    }, [catalog, catalogSearch, catalogTypeFilter]);

    const selectedItemsCount = useMemo(() => {
        return Object.values(selectedItemsMap).filter((item) => item?.selected).length;
    }, [selectedItemsMap]);

    // Categorize worker inventory items into Materials, Power Tools, and Hand Tools
    const categorizedCatalog = useMemo(() => {
        const search = catalogSearch.trim().toLowerCase();
        const matchesQuery = (item) =>
            !search ||
            (item.item_name || "").toLowerCase().includes(search) ||
            (item.sub_category || "").toLowerCase().includes(search) ||
            (item.serial_number || "").toLowerCase().includes(search);

        const materials = catalog.filter(
            (item) => (item.item_type || "").toLowerCase() !== "tool" && matchesQuery(item)
        );
        const powerTools = catalog.filter(
            (item) =>
                (item.item_type || "").toLowerCase() === "tool" &&
                (item.tool_subtype || "").toLowerCase() === "power" &&
                matchesQuery(item)
        );
        const handTools = catalog.filter(
            (item) =>
                (item.item_type || "").toLowerCase() === "tool" &&
                (item.tool_subtype || "").toLowerCase() !== "power" &&
                matchesQuery(item)
        );

        return {
            materials,
            power_tools: powerTools,
            hand_tools: handTools,
        };
    }, [catalog, catalogSearch]);

    // Dedicated New Page View (NOT a Modal) for Creating / Editing a Task Checklist
    if (checklistModalOpen) {
        const activeCategoryItems = categorizedCatalog[activeCategoryTab] || [];
        const groupedBySubCategory = activeCategoryItems.reduce((acc, item) => {
            const subCat =
                item.sub_category ||
                (activeCategoryTab === "materials"
                    ? "General Materials"
                    : activeCategoryTab === "power_tools"
                    ? "Power Tools"
                    : "Hand Tools");
            if (!acc[subCat]) acc[subCat] = [];
            acc[subCat].push(item);
            return acc;
        }, {});

        const selectedFullItems = Object.keys(selectedItemsMap)
            .filter((id) => selectedItemsMap[id]?.selected)
            .map((id) => {
                const catItem = catalog.find((c) => Number(c.item_id) === Number(id));
                return {
                    item_id: Number(id),
                    item_name: catItem?.item_name || `Item #${id}`,
                    item_type: catItem?.item_type || "Tool",
                    tool_subtype: catItem?.tool_subtype || "",
                    unit: catItem?.unit || "pcs",
                    quantity: selectedItemsMap[id]?.quantity || 1,
                };
            });

        return (
            <div style={{ animation: "fadeInUp 0.25s ease" }}>
                <div className="page-header" style={{ marginBottom: 20 }}>
                    <div>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ marginBottom: 10, padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                            onClick={() => !savingChecklist && setChecklistModalOpen(false)}
                        >
                            ← Back to My Tools & Materials Checklists
                        </button>
                        <h1 className="page-title font-display">
                            {editingChecklist
                                ? `Edit Tools & Materials Checklist #${editingChecklist.checklist_id}`
                                : "Create Tools & Materials Checklist"}
                        </h1>
                        <p className="page-subtitle">
                            Select items from Worker&apos;s Inventory organized by Materials, Power Tools, and Hand Tools, then submit to Tools Man for approval (which updates customer booking status from Approved to In-Progress).
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={savingChecklist}
                            onClick={() => setChecklistModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={savingChecklist || !selectedBookingId || selectedItemsCount === 0}
                            onClick={handleSaveChecklist}
                        >
                            {savingChecklist
                                ? "Submitting..."
                                : editingChecklist
                                ? "Update Checklist"
                                : `Submit Checklist to Tools Man (${selectedItemsCount})`}
                        </button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20, alignItems: "start" }}>
                    {/* Left Column: Booking Selection & Categorized Worker Inventory */}
                    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                        <div>
                            <label className="section-label" style={{ marginBottom: 6, display: "block" }}>
                                1. Assigned Job
                            </label>
                            {loadingBookings && assignedBookings.length === 0 ? (
                                <div style={{ padding: "12px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, color: "#1E40AF", fontSize: 13 }}>
                                    Loading your assigned job...
                                </div>
                            ) : assignedBookings.length === 0 ? (
                                <div style={{ padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#475569", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                    <AlertCircleIcon size={16} color="#64748B" />
                                    <span>No active job is ready for a checklist yet. Jobs start automatically on their scheduled date once your previous job is completed.</span>
                                </div>
                            ) : (
                                <select
                                    className="input-field"
                                    value={selectedBookingId}
                                    onChange={(e) => setSelectedBookingId(e.target.value)}
                                    disabled={!!editingChecklist}
                                >
                                    <option value="">Select your assigned job</option>
                                    {assignedBookings.map((b) => {
                                        const existingCl = !editingChecklist
                                            ? checklists.find((c) => Number(c.booking_id) === Number(b.booking_id))
                                            : null;
                                        return (
                                            <option key={b.booking_id} value={b.booking_id} disabled={Boolean(existingCl)}>
                                                Booking #{b.booking_id} · {b.client_name} — {b.service || b.service_name}{existingCl ? " (Checklist Created)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>

                        {/* Category Tabs: Materials, Power Tools, Hand Tools */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                                <label className="section-label" style={{ margin: 0 }}>
                                    2. Worker&apos;s Inventory Categories
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search Materials, Power Tools, or Hand Tools..."
                                    className="input-field"
                                    style={{ maxWidth: 280, padding: "7px 12px", fontSize: 12 }}
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                />
                            </div>

                            <div style={{ display: "flex", gap: 8, background: "#F1F5F9", padding: 5, borderRadius: 10, marginBottom: 16, flexWrap: "wrap" }}>
                                {[
                                    {
                                        key: "materials",
                                        label: "Materials",
                                        count: categorizedCatalog.materials.length,
                                        badgeBg: "#FEF3C7",
                                        badgeColor: "#B45309",
                                    },
                                    {
                                        key: "power_tools",
                                        label: "Power Tools",
                                        count: categorizedCatalog.power_tools.length,
                                        badgeBg: "#EDE9FE",
                                        badgeColor: "#6D28D9",
                                    },
                                    {
                                        key: "hand_tools",
                                        label: "Hand Tools",
                                        count: categorizedCatalog.hand_tools.length,
                                        badgeBg: "#DBEAFE",
                                        badgeColor: "#1D4ED8",
                                    },
                                ].map((cat) => {
                                    const isActive = activeCategoryTab === cat.key;
                                    return (
                                        <button
                                            key={cat.key}
                                            type="button"
                                            onClick={() => setActiveCategoryTab(cat.key)}
                                            style={{
                                                flex: 1,
                                                minWidth: 140,
                                                padding: "10px 14px",
                                                borderRadius: 8,
                                                border: isActive ? "1px solid #3B82F6" : "1px solid transparent",
                                                background: isActive ? "#FFFFFF" : "transparent",
                                                color: isActive ? "#1E2F5F" : "#64748B",
                                                fontWeight: 700,
                                                fontSize: 13,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 8,
                                                boxShadow: isActive ? "0 2px 6px rgba(15,23,42,0.06)" : "none",
                                            }}
                                        >
                                            <span>{cat.label}</span>
                                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: cat.badgeBg, color: cat.badgeColor }}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Items inside active category grouped by sub-category */}
                            {Object.keys(groupedBySubCategory).length === 0 ? (
                                <div style={{ padding: 32, textAlign: "center", background: "#F8FAFC", borderRadius: 10, color: "#94A3B8", fontSize: 13 }}>
                                    No items found in this category matching your search.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {Object.entries(groupedBySubCategory).map(([subCategoryName, itemsInGroup]) => (
                                        <div key={subCategoryName} style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                                            <div style={{ background: "#F8FAFC", padding: "10px 14px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                    {subCategoryName}
                                                </span>
                                                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                                                    {itemsInGroup.length} item(s)
                                                </span>
                                            </div>
                                            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                                                {itemsInGroup.map((item) => {
                                                    const entry = selectedItemsMap[item.item_id];
                                                    const isSelected = !!entry?.selected;
                                                    const qty = entry?.quantity || 1;

                                                    const statusLower = (item.status || "").toLowerCase();
                                                    const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                                    const isBorrowed = statusLower === "borrowed";
                                                    const isOutOfStock = Number(item.quantity_on_hand) <= 0;
                                                    const isUnavailable = !item.is_available || isDamaged || isBorrowed || isOutOfStock;

                                                    return (
                                                        <div
                                                            key={item.item_id}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between",
                                                                padding: "10px 14px",
                                                                borderRadius: 10,
                                                                background: isUnavailable ? "#F8FAFC" : isSelected ? "#EFF6FF" : "#FFFFFF",
                                                                border: `1px solid ${isUnavailable ? "#E2E8F0" : isSelected ? "#3B82F6" : "#E5E7EB"}`,
                                                                gap: 12,
                                                                opacity: isUnavailable ? 0.65 : 1,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 10,
                                                                    cursor: isUnavailable ? "not-allowed" : "pointer",
                                                                    flex: 1,
                                                                }}
                                                                onClick={() => !isUnavailable && toggleItemSelection(item)}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected && !isUnavailable}
                                                                    disabled={isUnavailable}
                                                                    onChange={() => {}}
                                                                    style={{ cursor: isUnavailable ? "not-allowed" : "pointer", width: 16, height: 16 }}
                                                                />
                                                                <div>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: isUnavailable ? "#64748B" : "#1E2F5F" }}>
                                                                            {item.item_name}
                                                                        </span>
                                                                        {isDamaged && (
                                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#FEE2E2", color: "#DC2626" }}>
                                                                                Damaged / Lost — Unavailable
                                                                            </span>
                                                                        )}
                                                                        {isBorrowed && !isDamaged && (
                                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#DBEAFE", color: "#1E40AF" }}>
                                                                                In Use / Borrowed
                                                                            </span>
                                                                        )}
                                                                        {isOutOfStock && !isDamaged && !isBorrowed && (
                                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#FEF3C7", color: "#D97706" }}>
                                                                                Out of Stock
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                                                                        {item.serial_number ? `S/N: ${item.serial_number} · ` : ""}
                                                                        <span style={{ fontWeight: 600, color: item.quantity_on_hand > 0 ? "#059669" : "#DC2626" }}>
                                                                            Available: {item.quantity_on_hand} {item.unit || "pcs"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isSelected && !isUnavailable && (
                                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                    <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Qty:</span>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={item.quantity_on_hand || 99}
                                                                        value={qty}
                                                                        className="input-field"
                                                                        style={{ width: 70, padding: "4px 8px", fontSize: 12, textAlign: "center" }}
                                                                        onChange={(e) => updateItemQuantity(item.item_id, e.target.value, item.quantity_on_hand)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Selected Checklist Summary & Notes */}
                    <div className="card" style={{ padding: 20, position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>
                                Checklist Summary ({selectedFullItems.length})
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>
                                Review selected Materials, Power Tools, and Hand Tools before submitting to Tools Man.
                            </p>
                        </div>

                        {selectedFullItems.length === 0 ? (
                            <div style={{ padding: "20px 12px", textAlign: "center", background: "#F8FAFC", borderRadius: 8, color: "#94A3B8", fontSize: 12 }}>
                                No items selected yet. Choose items from the categories on the left.
                            </div>
                        ) : (
                            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                                {selectedFullItems.map((it) => (
                                    <div key={it.item_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: "#1E2F5F" }}>{it.item_name}</div>
                                            <div style={{ fontSize: 10, color: "#64748B" }}>
                                                {it.item_type === "Tool"
                                                    ? it.tool_subtype === "power"
                                                        ? "Power Tool"
                                                        : "Hand Tool"
                                                    : "Material"}{" "}
                                                · Qty: {it.quantity} {it.unit}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleItemSelection(it.item_id)}
                                            style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                                Checklist Notes / Additional Request (Optional)
                            </label>
                            <textarea
                                className="input-field"
                                rows={3}
                                placeholder="Any special tool or material notes for the Tools Man..."
                                value={checklistNotes}
                                onChange={(e) => setChecklistNotes(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            className="btn-primary"
                            style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}
                            disabled={savingChecklist || !selectedBookingId || selectedItemsCount === 0}
                            onClick={handleSaveChecklist}
                        >
                            {savingChecklist
                                ? "Submitting to Tools Man..."
                                : editingChecklist
                                ? "Save Checklist Changes"
                                : "Submit Checklist to Tools Man"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">My Tools & Materials Checklist</h1>
                    <p className="page-subtitle">
                        Create categorized checklists for started jobs, submit to Tools Man, and return tools after service
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="btn-secondary" onClick={() => { fetchChecklists(); fetchCatalog(); fetchAssignedBookings(); }}>
                        Refresh
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => openCreateChecklistModal()}
                    >
                        + Create Task Checklist
                    </button>
                </div>
            </div>

            {/* Navigation Switcher */}
            <div className="tab-bar" style={{ marginBottom: 20, display: "inline-flex" }}>
                <button
                    className={`tab-item ${viewTab === "checklists" ? "active" : ""}`}
                    onClick={() => setViewTab("checklists")}
                >
                    My Tools & Materials Checklists
                    <span style={{ marginLeft: 6, fontSize: 10, color: viewTab === "checklists" ? "#3F7DFF" : "#9CA3AF" }}>
                        {checklists.length}
                    </span>
                </button>
                <button
                    className={`tab-item ${viewTab === "catalog" ? "active" : ""}`}
                    onClick={() => setViewTab("catalog")}
                >
                    Inventory Catalog (View-Only)
                    <span style={{ marginLeft: 6, fontSize: 10, color: viewTab === "catalog" ? "#3F7DFF" : "#9CA3AF" }}>
                        {catalog.length}
                    </span>
                </button>
            </div>

            {/* View 1: Task Checklists */}
            {viewTab === "checklists" && (
                <div className="card" style={{ padding: 20 }}>
                    {/* Started Bookings Ready for Checklist Creation */}
                    {assignedBookings.length > 0 && (
                        <div style={{ marginBottom: 20, padding: 16, background: "#F8FAFF", border: "1px solid #BFDBFE", borderRadius: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A8A", marginBottom: 10 }}>
                                Active Assigned Jobs (Automatically Started Upon Booking Approval)
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {assignedBookings.map((b) => {
                                    const existingCl = checklists.find((c) => Number(c.booking_id) === Number(b.booking_id));
                                    return (
                                        <div
                                            key={b.booking_id}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                flexWrap: "wrap",
                                                gap: 10,
                                                padding: "10px 14px",
                                                background: "#FFFFFF",
                                                borderRadius: 10,
                                                border: "1px solid #DBEAFE",
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span>Booking #{b.booking_id} · {b.client_name}</span>
                                                    <StatusBadge status={b.booking_status} />
                                                </div>
                                                <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>
                                                    {b.service}{b.scheduled_date ? ` · Scheduled ${formatDateTime(b.scheduled_date)}` : ""}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                                {existingCl ? (
                                                    <>
                                                        {existingCl.status === "Pending" && (
                                                            <button
                                                                type="button"
                                                                className="btn-secondary"
                                                                style={{ fontSize: 12, padding: "6px 12px", borderColor: "#2563EB", color: "#1D4ED8" }}
                                                                onClick={() => openEditChecklistModal(existingCl)}
                                                            >
                                                                Edit Checklist #{existingCl.checklist_id}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn-secondary"
                                                            style={{ fontSize: 12, padding: "6px 12px" }}
                                                            onClick={() => setViewChecklistModal(existingCl)}
                                                        >
                                                            Checklist #{existingCl.checklist_id} ({existingCl.status}) — {existingCl.status === "Pending" ? "Awaiting Tools Man Approval" : "View Checklist"}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        style={{ fontSize: 12, padding: "7px 14px" }}
                                                        onClick={() => openCreateChecklistModal(String(b.booking_id))}
                                                    >
                                                        + Create Tools &amp; Materials Checklist
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                        <div>
                            <p className="section-label" style={{ margin: 0 }}>
                                Checklists Created for Started Bookings
                            </p>
                            <span style={{ fontSize: 12, color: "#64748B" }}>
                                Tools Man reviews and approves your checklist to set the customer booking status from Approved to In-Progress. After service, mark all tools as Returned, Damaged, or Lost.
                            </span>
                        </div>
                    </div>

                    {/* Task Assignment Status Notice */}
                    {!loadingBookings && assignedBookings.length === 0 && (
                        <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1E40AF" }}>
                            <InfoIcon size={18} color="#1E40AF" />
                            <div>
                                <strong>Awaiting Booking Approval:</strong> Once a booking is approved and assigned to you, the job will automatically start and appear here so you can create your Tools &amp; Materials Checklist for Tools Man approval.
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
                            Loading task checklists...
                        </div>
                    ) : checklists.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "#9CA3AF" }}>
                                <ClipboardIcon size={36} />
                            </div>
                            <p style={{ fontWeight: 600, margin: "0 0 6px", color: "#1E2F5F" }}>
                                No task checklists created yet
                            </p>
                            <p style={{ fontSize: 12, margin: "0 0 16px" }}>
                                Choose an assigned task to create a checklist and request tools/materials from the Tools Man.
                            </p>
                            <button className="btn-primary" onClick={() => openCreateChecklistModal()}>
                                + Create Your First Checklist
                            </button>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#F8FAFC" }}>
                                        {[
                                            "Checklist ID",
                                            "Assigned Task",
                                            "Customer",
                                            "Team / Tech",
                                            "Items Count",
                                            "Status",
                                            "Date",
                                            "Actions",
                                        ].map((heading) => {
                                            const isAction = heading === "Actions";
                                            return (
                                                <th
                                                    key={heading}
                                                    className={isAction ? "sticky-action-col" : ""}
                                                    style={{
                                                        padding: "10px 14px",
                                                        textAlign: isAction ? "right" : "left",
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: "#6B7280",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.05em",
                                                        borderBottom: "1px solid #EAECF0",
                                                        ...(isAction
                                                            ? {
                                                                  position: "sticky",
                                                                  right: 0,
                                                                  zIndex: 10,
                                                                  background: "#F8FAFC",
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
                                    {checklists.map((cl) => {
                                        const isPending = cl.status === "Pending";
                                        const isApproved = cl.status === "Approved";
                                        const isCompleted = cl.status === "Completed";

                                        return (
                                            <tr key={cl.checklist_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#3F7DFF" }}>
                                                    #{cl.checklist_id}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 13, color: "#1E2F5F" }}>
                                                    <strong>Booking #{cl.booking_id}</strong>
                                                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                                                        {cl.service_name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>
                                                    {cl.client_name}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12 }}>
                                                    {cl.team_name ? (
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#1D4ED8", fontWeight: 600 }}>
                                                            <UsersIcon size={14} color="#1D4ED8" />
                                                            <span>{cl.team_name}</span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#4B5563" }}>
                                                            <UserIcon size={14} color="#6B7280" />
                                                            <span>{cl.technician_name}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151", fontWeight: 600 }}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                        <PackageIcon size={14} color="#64748B" />
                                                        <span>{cl.total_items_count} items</span>
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <StatusBadge status={cl.status} />
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 11, color: "#9CA3AF" }}>
                                                    {formatDateTime(cl.created_at)}
                                                </td>
                                                <td
                                                    className="sticky-action-col"
                                                    style={{
                                                        padding: "12px 14px",
                                                        position: "sticky",
                                                        right: 0,
                                                        zIndex: 5,
                                                        background: "#FFFFFF",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ padding: "5px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}
                                                            onClick={() => setViewChecklistModal(cl)}
                                                        >
                                                            <EyeIcon size={12} />
                                                            <span>Items</span>
                                                        </button>
                                                        {isPending ? (
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: "5px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}
                                                                onClick={() => openEditChecklistModal(cl)}
                                                            >
                                                                <EditIcon size={12} />
                                                                <span>Edit</span>
                                                            </button>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#6B7280",
                                                                    background: "#F3F4F6",
                                                                    padding: "4px 8px",
                                                                    borderRadius: 6,
                                                                    cursor: "help",
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                }}
                                                                title="Approved checklists are locked for technicians. Only Tools Man can modify items."
                                                            >
                                                                <LockIcon size={11} color="#9CA3AF" />
                                                                <span>Locked</span>
                                                            </span>
                                                        )}
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
            )}

            {/* View 2: View-Only Inventory Catalog */}
            {viewTab === "catalog" && (
                <div className="card" style={{ padding: 20 }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                            flexWrap: "wrap",
                            gap: 10,
                        }}
                    >
                        <div style={{ display: "flex", gap: 8 }}>
                            {["All", "Tool", "Material"].map((t) => (
                                <button
                                    key={t}
                                    className={`tab-item ${catalogTypeFilter === t ? "active" : ""}`}
                                    style={{ padding: "6px 14px", fontSize: 12 }}
                                    onClick={() => setCatalogTypeFilter(t)}
                                >
                                    {t === "All" ? "All Items" : `${t}s`}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Search catalog by name or code..."
                            className="input-field"
                            style={{ maxWidth: 280, padding: "7px 12px", fontSize: 13 }}
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {["Item Name", "Type", "Subtype / Spec", "Serial / Code", "Stock (Avail / Total)", "Status", "Request Mode"].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                borderBottom: "1px solid #EAECF0",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCatalog.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#9CA3AF" }}>
                                            No inventory items match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCatalog.map((item) => {
                                        const statusLower = (item.status || "").toLowerCase();
                                        const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                        const isBorrowed = statusLower === "borrowed";
                                        const isOutOfStock = Number(item.quantity_on_hand) <= 0;

                                        return (
                                            <tr key={item.item_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                                    {item.item_name}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12 }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "2px 8px",
                                                            borderRadius: 6,
                                                            background: item.item_type === "Tool" ? "#EFF6FF" : "#FEF3C7",
                                                            color: item.item_type === "Tool" ? "#1E40AF" : "#92400E",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {item.item_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                                    {item.tool_subtype || item.unit || "—"}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                                    {item.serial_number || "—"}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 13 }}>
                                                    <span style={{ fontWeight: 700, color: item.quantity_on_hand > 0 ? "#10B981" : "#EF4444" }}>
                                                        {item.quantity_on_hand}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: "#64748B" }}>
                                                        {" "}/ {item.initial_stock || item.quantity_on_hand} {item.unit || "pcs"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    {isDamaged ? (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#FEE2E2", color: "#DC2626", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            <AlertCircleIcon size={12} color="#DC2626" />
                                                            <span>Damaged / Lost</span>
                                                        </span>
                                                    ) : isBorrowed ? (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#DBEAFE", color: "#1E40AF", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            In Use / Borrowed
                                                        </span>
                                                    ) : isOutOfStock ? (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#FEF3C7", color: "#D97706", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            <AlertCircleIcon size={12} color="#D97706" />
                                                            <span>Out of Stock</span>
                                                        </span>
                                                    ) : (
                                                        <StatusBadge status={item.status} />
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 11, color: "#64748B" }}>
                                                    <span style={{ background: "#F1F5F9", padding: "3px 8px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                                                        Via Task Checklist
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Checklist Details & Tool Return Modal */}
            <Modal
                open={!!viewChecklistModal}
                title={`Checklist #${viewChecklistModal?.checklist_id} Items & Tool Return`}
                message={`Items requested for Booking #${viewChecklistModal?.booking_id} (${viewChecklistModal?.client_name}). After service, return all tools to the Tools Man by marking each tool as Returned, Damaged, or Lost.`}
                confirmLabel="Close"
                maxWidth={720}
                onConfirm={() => setViewChecklistModal(null)}
                onCancel={() => setViewChecklistModal(null)}
            >
                {viewChecklistModal && (
                    <div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                padding: "10px 14px",
                                borderRadius: 8,
                                fontSize: 12,
                                marginBottom: 14,
                            }}
                        >
                            <div>
                                <span>Status: </span>
                                <StatusBadge status={viewChecklistModal.status} />
                            </div>
                            <div>
                                <span>Service: </span>
                                <strong style={{ color: "#1E2F5F" }}>{viewChecklistModal.service_name}</strong>
                            </div>
                        </div>

                        {viewChecklistModal.notes && (
                            <p style={{ fontSize: 12, color: "#475569", background: "#F1F5F9", padding: "8px 12px", borderRadius: 8, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                                <MessageSquareIcon size={14} color="#64748B" />
                                <span><strong>Technician Note:</strong> {viewChecklistModal.notes}</span>
                            </p>
                        )}

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#F1F5F9" }}>
                                        {["Item Name", "Type", "Requested", "Approved", "Tool Return Status (Returned / Damaged / Lost)"].map((h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    padding: "8px 10px",
                                                    textAlign: "left",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "#64748B",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(viewChecklistModal.items) && viewChecklistModal.items.length > 0 ? (
                                        viewChecklistModal.items.map((item) => (
                                            <tr key={item.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                                                <td style={{ padding: "10px", fontSize: 12, fontWeight: 600, color: "#1E2F5F" }}>
                                                    {item.item_name}
                                                    {item.serial_number && (
                                                        <div style={{ fontSize: 10, color: "#9CA3AF" }}>S/N: {item.serial_number}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "10px", fontSize: 11 }}>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: 4,
                                                        background: item.item_type === "Tool" ? "#EFF6FF" : "#FEF3C7",
                                                        color: item.item_type === "Tool" ? "#1D4ED8" : "#B45309",
                                                        fontWeight: 600,
                                                    }}>
                                                        {item.item_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px", fontSize: 12, fontWeight: 600 }}>
                                                    {item.quantity_requested}
                                                </td>
                                                <td style={{ padding: "10px", fontSize: 12, fontWeight: 600, color: "#059669" }}>
                                                    {item.quantity_approved}
                                                </td>
                                                <td style={{ padding: "10px" }}>
                                                    {(item.item_type || "").toLowerCase() === "tool" ? (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                            <span style={{
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                padding: "2px 8px",
                                                                borderRadius: 6,
                                                                textTransform: "capitalize",
                                                                background:
                                                                    item.status === "assigned" ? "#DBEAFE" :
                                                                    item.status === "returned" ? "#D1FAE5" :
                                                                    item.status === "damaged" ? "#FEE2E2" :
                                                                    item.status === "lost" ? "#4B5563" : "#F3F4F6",
                                                                color:
                                                                    item.status === "assigned" ? "#1E40AF" :
                                                                    item.status === "returned" ? "#065F46" :
                                                                    item.status === "damaged" ? "#991B1B" :
                                                                    item.status === "lost" ? "#FFFFFF" : "#374151",
                                                            }}>
                                                                {item.status}
                                                            </span>
                                                            {viewChecklistModal.status === "Approved" && (
                                                                <div style={{ display: "inline-flex", gap: 4 }}>
                                                                    {[
                                                                        { key: "returned", label: "Returned", bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
                                                                        { key: "damaged", label: "Damaged", bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
                                                                        { key: "lost", label: "Lost", bg: "#F3F4F6", color: "#1F2937", border: "#D1D5DB" },
                                                                    ].map((opt) => (
                                                                        <button
                                                                            key={opt.key}
                                                                            type="button"
                                                                            disabled={updatingToolItemId === item.id || item.status === opt.key}
                                                                            onClick={() => handleReturnToolStatus(viewChecklistModal.checklist_id, item.id, opt.key)}
                                                                            style={{
                                                                                fontSize: 10,
                                                                                fontWeight: 700,
                                                                                padding: "3px 7px",
                                                                                borderRadius: 5,
                                                                                border: `1px solid ${opt.border}`,
                                                                                background: item.status === opt.key ? opt.color : opt.bg,
                                                                                color: item.status === opt.key ? "#FFFFFF" : opt.color,
                                                                                cursor: updatingToolItemId === item.id || item.status === opt.key ? "default" : "pointer",
                                                                                opacity: updatingToolItemId === item.id ? 0.6 : 1,
                                                                            }}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>
                                                            — (Consumable)
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 14, textAlign: "center", color: "#9CA3AF" }}>
                                                No items in this checklist.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
