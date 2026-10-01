import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    TOOLS_MAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

const tabs = ["All", "Pending", "Approved", "Completed", "History"];

const WrenchIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
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
const SearchIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const ClipboardIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
);
const ClockIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);
const AlertCircleIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const ZapIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export default function ToolsManChecklists({ addToast, onDataChanged, currentUser }) {
    let authUser = currentUser || null;
    if (!authUser && typeof window !== 'undefined') {
        authUser = window?.__page?.props?.auth?.user || window?.__inertia_page?.props?.auth?.user || null;
    }
    if (!authUser && typeof document !== 'undefined') {
        try {
            const appEl = document.getElementById('app');
            if (appEl?.dataset?.page) {
                const parsed = JSON.parse(appEl.dataset.page);
                authUser = parsed?.props?.auth?.user || null;
            }
        } catch (e) {}
    }
    const userId = authUser?.user_id || authUser?.id || null;
    const userStorageKey = useMemo(() => {
        return userId ? `toolsman_recent_checklists_u${userId}` : 'toolsman_recent_checklists_guest';
    }, [userId]);

    const [tab, setTab] = useState("All");
    const [checklists, setChecklists] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showRecentSection, setShowRecentSection] = useState(true);

    // Track recently inspected/accessed checklist IDs in localStorage (User-Scoped)
    const [recentChecklistIds, setRecentChecklistIds] = useState(() => {
        if (typeof window === "undefined") return [];
        try {
            const stored = localStorage.getItem(userStorageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = localStorage.getItem(userStorageKey);
            setRecentChecklistIds(stored ? JSON.parse(stored) : []);
        } catch {
            setRecentChecklistIds([]);
        }
    }, [userStorageKey]);

    const trackRecentChecklist = useCallback((checklistId) => {
        if (!checklistId) return;
        setRecentChecklistIds((prev) => {
            const next = [
                checklistId,
                ...prev.filter((id) => id !== checklistId),
            ].slice(0, 8);
            try {
                localStorage.setItem(
                    userStorageKey,
                    JSON.stringify(next),
                );
            } catch {
                // Ignore storage write issues
            }
            return next;
        });
    }, [userStorageKey]);

    const handleClearRecent = () => {
        setRecentChecklistIds([]);
        try {
            localStorage.removeItem(userStorageKey);
        } catch {
            // Ignore
        }
    };

    const handleOpenManageModal = (cl) => {
        if (!cl) return;
        trackRecentChecklist(cl.checklist_id);
        setManagingChecklist(cl);
        setExtraItemForm({ item_id: "", quantity: 1 });
        setItemSearchQuery("");
    };

    // Selected checklist for the management modal
    const [managingChecklist, setManagingChecklist] = useState(null);
    const [approving, setApproving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    // Filter catalog to existing tools and materials in worker's inventory ONLY
    const workerInventoryCatalog = useMemo(() => {
        if (!Array.isArray(catalog)) return [];
        return catalog.filter((item) => {
            // Must be worker inventory (not sale or spare part)
            const isWorker = !item.inventory_mode || item.inventory_mode === "worker";
            // Must be Tool or Material
            const type = (item.item_type || "").toLowerCase();
            const isToolOrMaterial = type === "tool" || type === "material";
            return isWorker && isToolOrMaterial;
        });
    }, [catalog]);

    // Search query for worker inventory item selector
    const [itemSearchQuery, setItemSearchQuery] = useState("");

    // Filtered worker catalog based on search input
    const filteredWorkerCatalog = useMemo(() => {
        const q = (itemSearchQuery || "").trim().toLowerCase();
        if (!q) return workerInventoryCatalog;
        return workerInventoryCatalog.filter((item) => {
            const name = (item.item_name || "").toLowerCase();
            const subCat = (item.sub_category || "").toLowerCase();
            const subtype = (item.tool_subtype || "").toLowerCase();
            const sn = (item.serial_number || "").toLowerCase();
            const type = (item.item_type || "").toLowerCase();
            return (
                name.includes(q) ||
                subCat.includes(q) ||
                subtype.includes(q) ||
                sn.includes(q) ||
                type.includes(q)
            );
        });
    }, [workerInventoryCatalog, itemSearchQuery]);

    // Add extra item state
    const [extraItemForm, setExtraItemForm] = useState({
        item_id: "",
        quantity: 1,
    });
    const [addingItem, setAddingItem] = useState(false);

    // Selected catalog item and stock availability in inventory
    const selectedCatalogItem = useMemo(() => {
        if (!extraItemForm.item_id) return null;
        return workerInventoryCatalog.find(
            (i) => Number(i.item_id) === Number(extraItemForm.item_id),
        );
    }, [workerInventoryCatalog, extraItemForm.item_id]);

    const availableStock = selectedCatalogItem
        ? Math.max(0, Number(selectedCatalogItem.quantity_on_hand) || 0)
        : 0;

    const fetchChecklists = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);
            try {
                const { data } = await window.axios.get(
                    TOOLS_MAN_ENDPOINTS.checklists,
                );
                const list = Array.isArray(data?.data) ? data.data : [];
                setChecklists(list);
                // If modal is open, refresh the selected checklist object safely without triggering infinite loops
                setManagingChecklist((curr) => {
                    if (!curr) return null;
                    const found = list.find(
                        (c) => c.checklist_id === curr.checklist_id,
                    );
                    return found || curr;
                });
            } catch (error) {
                addToast(
                    extractErrorMessage(error, "Unable to load checklists."),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    const fetchCatalog = useCallback(async () => {
        try {
            const { data } = await window.axios.get(
                TOOLS_MAN_ENDPOINTS.inventory,
            );
            setCatalog(Array.isArray(data?.data) ? data.data : []);
        } catch {
            // non-blocking
        }
    }, []);

    useEffect(() => {
        fetchChecklists();
        fetchCatalog();
    }, [fetchChecklists, fetchCatalog]);

    // Compute quick-access recent items (tracked IDs supplemented by most recent dispatches)
    const recentChecklists = useMemo(() => {
        if (!checklists || checklists.length === 0) return [];

        const list = [];
        for (const id of recentChecklistIds) {
            const item = checklists.find((c) => c.checklist_id === id);
            if (
                item &&
                !list.some((x) => x.checklist_id === item.checklist_id)
            ) {
                list.push(item);
            }
        }

        if (list.length < 4) {
            const sorted = [...checklists]
                .filter(
                    (c) =>
                        !list.some(
                            (x) => x.checklist_id === c.checklist_id,
                        ),
                )
                .sort((a, b) => {
                    const dateA = new Date(
                        a.updated_at || a.created_at || 0,
                    ).getTime();
                    const dateB = new Date(
                        b.updated_at || b.created_at || 0,
                    ).getTime();
                    return dateB - dateA;
                });
            for (const item of sorted) {
                if (list.length >= 6) break;
                list.push(item);
            }
        }

        return list.slice(0, 6);
    }, [checklists, recentChecklistIds]);

    const filtered = useMemo(() => {
        let result = checklists;

        if (tab === "Pending") {
            result = result.filter((c) => c.status === "Pending");
        } else if (tab === "Approved") {
            result = result.filter((c) => c.status === "Approved");
        } else if (tab === "Completed") {
            result = result.filter((c) => c.status === "Completed");
        } else if (tab === "History") {
            // History tab: completed checklists & verified dispatches sorted newest first
            result = result
                .filter(
                    (c) => c.status === "Completed" || Boolean(c.completed_at),
                )
                .sort((a, b) => {
                    const dateA = new Date(
                        a.completed_at || a.updated_at || a.created_at || 0,
                    ).getTime();
                    const dateB = new Date(
                        b.completed_at || b.updated_at || b.created_at || 0,
                    ).getTime();
                    return dateB - dateA;
                });
        }

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            result = result.filter((c) => {
                if (String(c.checklist_id).toLowerCase().includes(q))
                    return true;
                if (`#${c.checklist_id}`.toLowerCase().includes(q))
                    return true;
                if (String(c.booking_id).toLowerCase().includes(q))
                    return true;
                if (`booking #${c.booking_id}`.toLowerCase().includes(q))
                    return true;

                const client = (
                    c.client_name ||
                    c.booking?.client_name ||
                    ""
                ).toLowerCase();
                if (client.includes(q)) return true;

                const service = (
                    c.service_name ||
                    c.booking?.service_name ||
                    ""
                ).toLowerCase();
                if (service.includes(q)) return true;

                const team = (
                    c.team_name ||
                    c.team?.name ||
                    ""
                ).toLowerCase();
                if (team.includes(q)) return true;

                const tech = (
                    c.technician_name ||
                    c.technician?.name ||
                    ""
                ).toLowerCase();
                if (tech.includes(q)) return true;

                if ((c.status || "").toLowerCase().includes(q)) return true;
                if (
                    (c.booking?.booking_status || "").toLowerCase().includes(q)
                )
                    return true;
                if ((c.notes || "").toLowerCase().includes(q)) return true;

                if (Array.isArray(c.items)) {
                    const itemMatch = c.items.some((i) => {
                        const name = (i.item_name || "").toLowerCase();
                        const sn = (i.serial_number || "").toLowerCase();
                        const subtype = (i.tool_subtype || "").toLowerCase();
                        const inotes = (i.notes || "").toLowerCase();
                        return (
                            name.includes(q) ||
                            sn.includes(q) ||
                            subtype.includes(q) ||
                            inotes.includes(q)
                        );
                    });
                    if (itemMatch) return true;
                }

                return false;
            });
        }

        return result;
    }, [checklists, tab, searchQuery]);

    // Handle Approve Checklist & Dispatch Booking
    const handleApproveChecklist = async (checklistId) => {
        if (approving) return;
        setApproving(true);
        try {
            const url = TOOLS_MAN_ENDPOINTS.approveChecklist(checklistId);
            const { data } = await window.axios.patch(url);
            addToast(
                data?.message ||
                    "Checklist approved! Tools marked as assigned and booking dispatched.",
            );
            if (data?.data) {
                setManagingChecklist(data.data);
            }
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to approve checklist."),
                "error",
            );
        } finally {
            setApproving(false);
        }
    };

    // Handle Tool Status Change (assigned, returned, damaged, lost)
    const handleStatusChange = async (checklistId, itemId, newStatus) => {
        setUpdatingStatusId(itemId);
        // Optimistically update the status in modal
        setManagingChecklist((prev) => {
            if (!prev || !prev.items) return prev;
            return {
                ...prev,
                items: prev.items.map((i) =>
                    i.id === itemId ? { ...i, status: newStatus } : i,
                ),
            };
        });
        try {
            const url = TOOLS_MAN_ENDPOINTS.updateToolStatus(
                checklistId,
                itemId,
            );
            const { data } = await window.axios.patch(url, {
                status: newStatus,
            });
            addToast(data?.message || `Status updated to ${newStatus}.`);
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to update tool status."),
                "error",
            );
            await fetchChecklists(false);
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // Handle Adding an Extra Item to Checklist (Tools Man authority)
    const handleAddExtraItem = async () => {
        if (!managingChecklist || !extraItemForm.item_id || addingItem) return;

        if (!selectedCatalogItem) {
            addToast("Please select an item from worker inventory.", "error");
            return;
        }

        const statusLower = (selectedCatalogItem.status || "").toLowerCase();
        const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
        const isBorrowed = statusLower === "borrowed";

        if (isDamaged) {
            addToast(
                `"${selectedCatalogItem.item_name}" is damaged / lost and cannot be added to a checklist.`,
                "error",
            );
            return;
        }

        if (isBorrowed) {
            addToast(
                `"${selectedCatalogItem.item_name}" is currently in use / borrowed.`,
                "error",
            );
            return;
        }

        if (availableStock <= 0) {
            addToast(
                `"${selectedCatalogItem.item_name}" is currently out of stock in inventory.`,
                "error",
            );
            return;
        }

        const qty = parseInt(extraItemForm.quantity, 10);
        if (isNaN(qty) || qty < 1) {
            addToast("Please enter a valid quantity of at least 1.", "error");
            return;
        }

        if (qty > availableStock) {
            addToast(
                `Cannot add ${qty} units of "${selectedCatalogItem.item_name}". Only ${availableStock} available in inventory.`,
                "error",
            );
            return;
        }

        setAddingItem(true);
        try {
            const existingItems = Array.isArray(managingChecklist.items)
                ? managingChecklist.items.map((i) => ({
                      item_id: i.item_id,
                      quantity_approved: i.quantity_approved,
                      status: i.status,
                      notes: i.notes,
                  }))
                : [];

            const newItemId = Number(extraItemForm.item_id);
            const matchIndex = existingItems.findIndex(
                (i) => i.item_id === newItemId,
            );

            const isTool = (selectedCatalogItem.item_type || "").toLowerCase() === "tool";

            if (matchIndex >= 0) {
                const newTotal = existingItems[matchIndex].quantity_approved + qty;
                if (newTotal > availableStock) {
                    addToast(
                        `Checklist already has ${existingItems[matchIndex].quantity_approved} allocated. Total (${newTotal}) would exceed available stock (${availableStock}).`,
                        "error",
                    );
                    setAddingItem(false);
                    return;
                }
                existingItems[matchIndex].quantity_approved = newTotal;
            } else {
                existingItems.push({
                    item_id: newItemId,
                    quantity_approved: qty,
                    status: isTool ? "assigned" : "consumed",
                    notes: "Added by Tools Man",
                });
            }

            const url = TOOLS_MAN_ENDPOINTS.updateChecklistItems(
                managingChecklist.checklist_id,
            );
            const { data } = await window.axios.patch(url, {
                items: existingItems,
            });

            addToast(data?.message || "Item added to checklist successfully.");
            setExtraItemForm({ item_id: "", quantity: 1 });
            setItemSearchQuery("");
            if (data?.data) {
                setManagingChecklist(data.data);
            }
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to add item to checklist."),
                "error",
            );
        } finally {
            setAddingItem(false);
        }
    };

    // Handle Declare Checklist Complete
    const handleCompleteChecklist = async (checklistId) => {
        if (completing) return;

        // Client-side pre-validation: check for any unresolved tools
        if (managingChecklist) {
            const unresolved = managingChecklist.items?.filter(
                (i) => (i.item_type || "").toLowerCase() === "tool" && i.status === "assigned",
            );
            if (unresolved && unresolved.length > 0) {
                addToast(
                    `Cannot complete checklist: ${unresolved.length} tool(s) are still in "assigned" status. Please declare them as returned, damaged, or lost.`,
                    "error",
                );
                return;
            }
        }

        setCompleting(true);
        try {
            const url = TOOLS_MAN_ENDPOINTS.completeChecklist(checklistId);
            const { data } = await window.axios.post(url);
            addToast(
                data?.message || "Checklist declared complete successfully!",
            );
            setManagingChecklist(null);
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to complete checklist."),
                "error",
            );
        } finally {
            setCompleting(false);
        }
    };

    // Calculate count of unresolved tools on managingChecklist
    const unresolvedToolsCount = useMemo(() => {
        if (!managingChecklist || !Array.isArray(managingChecklist.items))
            return 0;
        return managingChecklist.items.filter(
            (i) => (i.item_type || "").toLowerCase() === "tool" && i.status === "assigned",
        ).length;
    }, [managingChecklist]);

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Checklists & Tool Dispatches
                    </h1>
                    <p className="page-subtitle">
                        Review technician tool requests, approve & issue equipment, track custody statuses, and complete checklists
                    </p>
                </div>
                <div>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchChecklists()}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                    marginBottom: 20,
                }}
            >
                <div className="card" style={{ padding: 16 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#6B7280",
                            fontWeight: 600,
                            textTransform: "uppercase",
                        }}
                    >
                        Total Checklists
                    </span>
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            marginTop: 4,
                        }}
                    >
                        {checklists.length}
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#6B7280",
                            fontWeight: 600,
                            textTransform: "uppercase",
                        }}
                    >
                        Pending Review
                    </span>
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#F59E0B",
                            marginTop: 4,
                        }}
                    >
                        {
                            checklists.filter((c) => c.status === "Pending")
                                .length
                        }
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#6B7280",
                            fontWeight: 600,
                            textTransform: "uppercase",
                        }}
                    >
                        Active Dispatched
                    </span>
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#3F7DFF",
                            marginTop: 4,
                        }}
                    >
                        {
                            checklists.filter((c) => c.status === "Approved")
                                .length
                        }
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#6B7280",
                            fontWeight: 600,
                            textTransform: "uppercase",
                        }}
                    >
                        Completed
                    </span>
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#10B981",
                            marginTop: 4,
                        }}
                    >
                        {
                            checklists.filter((c) => c.status === "Completed")
                                .length
                        }
                    </div>
                </div>
            </div>

            {/* Recent & Quick Access Field */}
            {recentChecklists.length > 0 && (
                <div
                    className="card"
                    style={{
                        padding: "16px 20px",
                        marginBottom: 20,
                        background: "linear-gradient(to right, #FFFFFF, #F8FAFC)",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: showRecentSection ? 14 : 0,
                            flexWrap: "wrap",
                            gap: 8,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 28,
                                    height: 28,
                                    borderRadius: 7,
                                    background: "#EFF6FF",
                                    color: "#3F7DFF",
                                }}
                            >
                                <ZapIcon size={14} color="#3F7DFF" />
                            </span>
                            <div>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "#1E2F5F",
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    Recent Checklists & Quick Access
                                </h3>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 11,
                                        color: "#6B7280",
                                    }}
                                >
                                    Fast 1-click access to your recently inspected, dispatched, or active workflows
                                </p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {recentChecklistIds.length > 0 && (
                                <button
                                    onClick={handleClearRecent}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#9CA3AF",
                                        fontSize: 11,
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                        padding: "4px 6px",
                                    }}
                                >
                                    Clear History
                                </button>
                            )}
                            <button
                                onClick={() => setShowRecentSection((prev) => !prev)}
                                style={{
                                    background: "#F1F5F9",
                                    border: "1px solid #CBD5E1",
                                    borderRadius: 6,
                                    padding: "4px 10px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#475569",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                {showRecentSection ? "Hide ▲" : "Show Recent ▼"}
                            </button>
                        </div>
                    </div>

                    {showRecentSection && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(240px, 1fr))",
                                gap: 12,
                            }}
                        >
                            {recentChecklists.map((cl) => {
                                const clientName =
                                    cl.client_name ||
                                    cl.booking?.client_name ||
                                    "Customer";
                                const serviceName =
                                    cl.service_name ||
                                    cl.booking?.service_name ||
                                    "Aircon Service";

                                return (
                                    <div
                                        key={cl.checklist_id}
                                        onClick={() => handleOpenManageModal(cl)}
                                        style={{
                                            background: "#FFFFFF",
                                            border: "1px solid #E2E8F0",
                                            borderRadius: 8,
                                            padding: "12px 14px",
                                            cursor: "pointer",
                                            transition:
                                                "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            position: "relative",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform =
                                                "translateY(-2px)";
                                            e.currentTarget.style.borderColor =
                                                "#3F7DFF";
                                            e.currentTarget.style.boxShadow =
                                                "0 6px 16px rgba(63,125,255,0.09)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform =
                                                "translateY(0)";
                                            e.currentTarget.style.borderColor =
                                                "#E2E8F0";
                                            e.currentTarget.style.boxShadow =
                                                "none";
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: "#3F7DFF",
                                                    }}
                                                >
                                                    #{cl.checklist_id}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#6B7280",
                                                    }}
                                                >
                                                    Booking #{cl.booking_id}
                                                </span>
                                            </div>
                                            <StatusBadge status={cl.status} />
                                        </div>

                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: "#1E2F5F",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title={clientName}
                                            >
                                                {clientName}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "#4B5563",
                                                    marginTop: 2,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                <WrenchIcon size={12} color="#64748B" />
                                                <span>{serviceName}</span>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems: "center",
                                                marginTop: 2,
                                                paddingTop: 8,
                                                borderTop: "1px dashed #F1F5F9",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    color: cl.team_name
                                                        ? "#1D4ED8"
                                                        : "#9CA3AF",
                                                    fontWeight: 500,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: 130,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                {cl.team_name ? (
                                                    <>
                                                        <UsersIcon size={12} color="#1D4ED8" />
                                                        <span>{cl.team_name}</span>
                                                    </>
                                                ) : (
                                                    "No team"
                                                )}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    color: "#3F7DFF",
                                                    fontWeight: 600,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 2,
                                                }}
                                            >
                                                Inspect ↗
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Filter Tabs & Search Bar Toolbar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 16,
                    flexWrap: "wrap",
                }}
            >
                {/* Tabs */}
                <div
                    className="tab-bar"
                    style={{ margin: 0, display: "inline-flex", flexWrap: "wrap" }}
                >
                    {tabs.map((t) => {
                        let count = 0;
                        if (t === "All") count = checklists.length;
                        else if (t === "History")
                            count = checklists.filter(
                                (c) =>
                                    c.status === "Completed" ||
                                    Boolean(c.completed_at),
                            ).length;
                        else
                            count = checklists.filter(
                                (c) => c.status === t,
                            ).length;

                        return (
                            <button
                                key={t}
                                className={`tab-item ${tab === t ? "active" : ""}`}
                                onClick={() => setTab(t)}
                            >
                                {t}
                                <span
                                    style={{
                                        marginLeft: 6,
                                        fontSize: 10,
                                        color: tab === t ? "#3F7DFF" : "#9CA3AF",
                                        fontWeight: 600,
                                    }}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: "1 1 300px",
                        maxWidth: 440,
                        minWidth: 260,
                    }}
                >
                    <div style={{ position: "relative", width: "100%" }}>
                        <span
                            style={{
                                position: "absolute",
                                left: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#9CA3AF",
                                pointerEvents: "none",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Search by ID, client, booking, team, tool, serial..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                paddingLeft: 34,
                                paddingRight: searchQuery ? 30 : 12,
                                paddingTop: 8,
                                paddingBottom: 8,
                                fontSize: 13,
                                borderRadius: 8,
                                width: "100%",
                                borderColor: searchQuery ? "#3F7DFF" : "#E5E7EB",
                                transition: "border-color 0.15s ease",
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                title="Clear search"
                                style={{
                                    position: "absolute",
                                    right: 8,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    color: "#9CA3AF",
                                    cursor: "pointer",
                                    padding: 2,
                                    fontSize: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <span
                            style={{
                                fontSize: 12,
                                color: "#1D4ED8",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                background: "#EFF6FF",
                                padding: "5px 9px",
                                borderRadius: 6,
                                border: "1px solid #DBEAFE",
                            }}
                        >
                            {filtered.length} found
                        </span>
                    )}
                </div>
            </div>

            {/* History Tab Explanatory Banner */}
            {tab === "History" && (
                <div
                    style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        padding: "10px 14px",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#475569",
                        flexWrap: "wrap",
                        gap: 8,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ClockIcon size={16} color="#64748B" />
                        <span>
                            <strong>Dispatched & Completed History:</strong> Displaying all completed checklists and verified dispatches ordered chronologically.
                        </span>
                    </div>
                    <span style={{ fontWeight: 600, color: "#10B981" }}>
                        {filtered.length} Archived Record{filtered.length === 1 ? "" : "s"}
                    </span>
                </div>
            )}

            {/* Checklists Table */}
            <div className="card" style={{ padding: 20 }}>
                {loading ? (
                    <div
                        style={{
                            padding: 32,
                            textAlign: "center",
                            color: "#6B7280",
                        }}
                    >
                        Loading checklists...
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        style={{
                            padding: 48,
                            textAlign: "center",
                        }}
                    >
                        {searchQuery.trim() ? (
                            <div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#64748B" }}>
                                    <SearchIcon size={22} />
                                </div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: "#1E2F5F",
                                    }}
                                >
                                    No checklists or dispatches match &ldquo;{searchQuery}&rdquo;
                                </div>
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "#6B7280",
                                        marginTop: 6,
                                        maxWidth: 420,
                                        margin: "6px auto 0",
                                    }}
                                >
                                    Try checking for typos or searching by checklist ID, client name, booking ID, technician team, or tool serial number.
                                </p>
                                <button
                                    className="btn-secondary"
                                    style={{
                                        marginTop: 16,
                                        padding: "7px 16px",
                                        fontSize: 12,
                                    }}
                                    onClick={() => setSearchQuery("")}
                                >
                                    Clear Search Query
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: "#64748B" }}>
                                    <ClipboardIcon size={22} />
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "#64748B",
                                    }}
                                >
                                    No checklists in &ldquo;{tab}&rdquo; status.
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 800,
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {[
                                        "ID",
                                        "Assigned Booking",
                                        "Client & Service",
                                        "Technician Team",
                                        "Items",
                                        "Status",
                                        "Submitted",
                                        "Action",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
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
                                {filtered.map((cl) => {
                                    const isPending = cl.status === "Pending";
                                    const isApproved = cl.status === "Approved";
                                    const isCompleted =
                                        cl.status === "Completed";

                                    return (
                                        <tr
                                            key={cl.checklist_id}
                                            style={{
                                                borderTop:
                                                    "1px solid #F0F2F5",
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#3F7DFF",
                                                }}
                                            >
                                                #{cl.checklist_id}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    fontSize: 13,
                                                    color: "#1E2F5F",
                                                }}
                                            >
                                                <strong>
                                                    Booking #{cl.booking_id}
                                                </strong>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#6B7280",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {cl.booking
                                                        ?.booking_status ? (
                                                        <span
                                                            style={{
                                                                color: "#3F7DFF",
                                                            }}
                                                        >
                                                            {
                                                                cl.booking
                                                                    .booking_status
                                                            }
                                                        </span>
                                                    ) : (
                                                        "Active"
                                                    )}
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    fontSize: 12,
                                                }}
                                            >
                                                <strong
                                                    style={{ color: "#1E2F5F" }}
                                                >
                                                    {cl.client_name || cl.booking?.client_name || "Customer"}
                                                </strong>
                                                <div
                                                    style={{
                                                        color: "#4B5563",
                                                        marginTop: 2,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 5,
                                                    }}
                                                >
                                                    <WrenchIcon size={12} color="#64748B" />
                                                    <span>{cl.service_name || cl.booking?.service_name || "Aircon Service"}</span>
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {cl.team_name ? (
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: "#1D4ED8",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 5,
                                                        }}
                                                    >
                                                        <UsersIcon size={13} color="#1D4ED8" />
                                                        <span>
                                                            {cl.team_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span
                                                        style={{
                                                            color: "#9CA3AF",
                                                        }}
                                                    >
                                                        No team
                                                    </span>
                                                )}
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#6B7280",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Tech:{" "}
                                                    {cl.technician_name || "—"}
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                                    <PackageIcon size={13} color="#64748B" />
                                                    <span>{cl.items_count} items</span>
                                                </span>
                                                {cl.has_unresolved_tools && (
                                                    <span
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 4,
                                                            fontSize: 10,
                                                            color: "#D97706",
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        <ClockIcon size={11} color="#D97706" />
                                                        <span>Tools in custody</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                }}
                                            >
                                                <StatusBadge
                                                    status={cl.status}
                                                />
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    fontSize: 11,
                                                    color: "#9CA3AF",
                                                }}
                                            >
                                                {formatDateTime(cl.created_at)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <button
                                                        className="btn-primary"
                                                        style={{
                                                            padding:
                                                                "6px 12px",
                                                            fontSize: 12,
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 5,
                                                        }}
                                                        onClick={() =>
                                                            handleOpenManageModal(
                                                                cl,
                                                            )
                                                        }
                                                    >
                                                        <WrenchIcon size={12} color="#FFFFFF" />
                                                        <span>Inspect & Manage</span>
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

            {/* Inspect & Manage Checklist Modal */}
            <Modal
                open={!!managingChecklist}
                title={`Manage Checklist #${managingChecklist?.checklist_id}`}
                message={`For Booking #${managingChecklist?.booking_id} — ${managingChecklist?.client_name || managingChecklist?.booking?.client_name || "Customer"} (${managingChecklist?.service_name || managingChecklist?.booking?.service_name || "Aircon Service"})`}
                confirmLabel="Close"
                cancelLabel={false}
                maxWidth={780}
                onConfirm={() => setManagingChecklist(null)}
                onCancel={() => setManagingChecklist(null)}
            >
                {managingChecklist && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        {/* Status & Approval Banner */}
                        <div
                            style={{
                                background:
                                    managingChecklist.status === "Approved"
                                        ? "#EFF6FF"
                                        : managingChecklist.status ===
                                            "Completed"
                                          ? "#ECFDF5"
                                          : "#FFFBEB",
                                border: `1px solid ${
                                    managingChecklist.status === "Approved"
                                        ? "#BFDBFE"
                                        : managingChecklist.status ===
                                            "Completed"
                                          ? "#A7F3D0"
                                          : "#FDE68A"
                                }`,
                                borderRadius: 10,
                                padding: "12px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            color: "#1E2F5F",
                                            fontSize: 14,
                                        }}
                                    >
                                        Status: {managingChecklist.status}
                                    </span>
                                    {managingChecklist.team_name && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                background: "#DBEAFE",
                                                color: "#1E40AF",
                                                padding: "2px 8px",
                                                borderRadius: 6,
                                                fontWeight: 600,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            <UsersIcon size={12} color="#1E40AF" />
                                            <span>{managingChecklist.team_name}</span>
                                        </span>
                                    )}
                                </div>
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: "#4B5563",
                                        marginTop: 2,
                                        display: "block",
                                    }}
                                >
                                    {managingChecklist.status === "Pending"
                                        ? "Review requested items and click 'Approve & Issue Tools' to dispatch team."
                                        : managingChecklist.status ===
                                            "Approved"
                                          ? "Tools are in custody. Update each tool status to returned, damaged, or lost before completing."
                                          : "This checklist is completed and all tools have been accounted for."}
                                </span>
                            </div>

                            {/* Approve button for Pending */}
                            {managingChecklist.status === "Pending" && (
                                <button
                                    className="btn-primary"
                                    style={{
                                        background: "#16A34A",
                                        borderColor: "#15803D",
                                        padding: "8px 16px",
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                    disabled={approving}
                                    onClick={() =>
                                        handleApproveChecklist(
                                            managingChecklist.checklist_id,
                                        )
                                    }
                                >
                                    {approving
                                        ? "Approving..."
                                        : "Approve & Issue Tools"}
                                </button>
                            )}

                            {/* Declare Complete Button for Approved */}
                            {managingChecklist.status === "Approved" && (
                                <button
                                    className="btn-primary"
                                    style={{
                                        background:
                                            unresolvedToolsCount === 0
                                                ? "#16A34A"
                                                : "#9CA3AF",
                                        cursor:
                                            unresolvedToolsCount === 0
                                                ? "pointer"
                                                : "not-allowed",
                                        padding: "8px 16px",
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                    disabled={
                                        completing || unresolvedToolsCount > 0
                                    }
                                    onClick={() =>
                                        handleCompleteChecklist(
                                            managingChecklist.checklist_id,
                                        )
                                    }
                                    title={
                                        unresolvedToolsCount > 0
                                            ? `Cannot complete: ${unresolvedToolsCount} tool(s) still in 'assigned' status.`
                                            : "Declare checklist completed"
                                    }
                                >
                                    {completing
                                        ? "Completing..."
                                        : "Declare Checklist Complete"}
                                </button>
                            )}
                        </div>

                        {/* Unresolved Tools Warning Pill */}
                        {managingChecklist.status === "Approved" &&
                            unresolvedToolsCount > 0 && (
                                <div
                                    style={{
                                        background: "#FEF2F2",
                                        border: "1px solid #FECACA",
                                        borderRadius: 8,
                                        padding: "8px 12px",
                                        fontSize: 12,
                                        color: "#B91C1C",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <AlertCircleIcon size={16} color="#DC2626" />
                                    <span>
                                        <strong>
                                            {unresolvedToolsCount} tool(s)
                                        </strong>{" "}
                                        are currently in <em>"assigned"</em>{" "}
                                        custody. To declare this checklist
                                        complete, change their status to{" "}
                                        <strong>returned</strong>,{" "}
                                        <strong>damaged</strong>, or{" "}
                                        <strong>lost</strong> below.
                                    </span>
                                </div>
                            )}

                        {/* Items Table with Status Controls */}
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 8,
                                }}
                            >
                                <span
                                    className="section-label"
                                    style={{ margin: 0 }}
                                >
                                    Equipment & Materials on Checklist (
                                    {managingChecklist.items?.length || 0})
                                </span>
                            </div>

                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                    }}
                                >
                                    <thead>
                                        <tr style={{ background: "#F1F5F9" }}>
                                            {[
                                                "Item Name",
                                                "Type",
                                                "Approved Qty",
                                                "Custody / Return Status",
                                                "Action / Set Status",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    style={{
                                                        padding: "8px 10px",
                                                        textAlign: "left",
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: "#64748B",
                                                        textTransform:
                                                            "uppercase",
                                                    }}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(
                                            managingChecklist.items,
                                        ) &&
                                        managingChecklist.items.length > 0 ? (
                                            managingChecklist.items.map(
                                                (item) => {
                                                    const isTool =
                                                        (item.item_type || "").toLowerCase() ===
                                                        "tool";
                                                    const isUpdating =
                                                        updatingStatusId ===
                                                        item.id;

                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            style={{
                                                                borderTop:
                                                                    "1px solid #E2E8F0",
                                                            }}
                                                        >
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "10px",
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    color: "#1E2F5F",
                                                                }}
                                                            >
                                                                {item.item_name}
                                                                {item.serial_number && (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: "#9CA3AF",
                                                                        }}
                                                                    >
                                                                        S/N:{" "}
                                                                        {
                                                                            item.serial_number
                                                                        }
                                                                    </div>
                                                                )}
                                                                {item.notes && (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: "#6B7280",
                                                                            fontStyle: "italic",
                                                                            marginTop: 2,
                                                                        }}
                                                                    >
                                                                        Note: {item.notes}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "10px",
                                                                    fontSize: 11,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        padding:
                                                                            "2px 6px",
                                                                        borderRadius: 4,
                                                                        background:
                                                                            isTool
                                                                                ? "#EFF6FF"
                                                                                : "#FEF3C7",
                                                                        color: isTool
                                                                            ? "#1D4ED8"
                                                                            : "#B45309",
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    {
                                                                        item.item_type
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "10px",
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {
                                                                    item.quantity_approved
                                                                }{" "}
                                                                {item.unit ||
                                                                    "pcs"}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "10px",
                                                                }}
                                                            >
                                                                {isTool ? (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            padding:
                                                                                "3px 8px",
                                                                            borderRadius: 6,
                                                                            textTransform:
                                                                                "capitalize",
                                                                            background:
                                                                                item.status ===
                                                                                "assigned"
                                                                                    ? "#DBEAFE"
                                                                                    : item.status ===
                                                                                          "returned"
                                                                                      ? "#D1FAE5"
                                                                                      : item.status ===
                                                                                            "damaged"
                                                                                        ? "#FEE2E2"
                                                                                        : item.status ===
                                                                                              "lost"
                                                                                          ? "#4B5563"
                                                                                          : "#F3F4F6",
                                                                            color:
                                                                                item.status ===
                                                                                "assigned"
                                                                                    ? "#1E40AF"
                                                                                    : item.status ===
                                                                                          "returned"
                                                                                      ? "#065F46"
                                                                                      : item.status ===
                                                                                            "damaged"
                                                                                        ? "#991B1B"
                                                                                        : item.status ===
                                                                                              "lost"
                                                                                          ? "#FFFFFF"
                                                                                          : "#374151",
                                                                        }}
                                                                    >
                                                                        {item.status ===
                                                                        "assigned"
                                                                            ? "In Custody (Assigned)"
                                                                            : item.status}
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "#64748B",
                                                                            background: "#F1F5F9",
                                                                            padding: "3px 8px",
                                                                            borderRadius: 6,
                                                                            fontWeight: 500,
                                                                            display: "inline-block",
                                                                        }}
                                                                    >
                                                                        — (Consumable)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "10px",
                                                                }}
                                                            >
                                                                {/* Status Dropdown selector for Tools Man (Tools Only) */}
                                                                {isTool ? (
                                                                    <select
                                                                        className="input-field"
                                                                        style={{
                                                                            fontSize: 11,
                                                                            padding:
                                                                                "4px 8px",
                                                                            maxWidth: 140,
                                                                        }}
                                                                        value={
                                                                            item.status
                                                                        }
                                                                        disabled={
                                                                            isUpdating ||
                                                                            managingChecklist.status ===
                                                                                "Completed"
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            handleStatusChange(
                                                                                managingChecklist.checklist_id,
                                                                                item.id,
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                    >
                                                                        <option value="assigned">
                                                                            Assigned
                                                                        </option>
                                                                        <option value="returned">
                                                                            Returned
                                                                        </option>
                                                                        <option value="damaged">
                                                                            Damaged
                                                                        </option>
                                                                        <option value="lost">
                                                                            Lost
                                                                        </option>
                                                                    </select>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            color: "#94A3B8",
                                                                            fontSize: 12,
                                                                            paddingLeft: 4,
                                                                        }}
                                                                    >
                                                                        —
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    style={{
                                                        padding: 16,
                                                        textAlign: "center",
                                                        color: "#9CA3AF",
                                                    }}
                                                >
                                                    No items recorded on this
                                                    checklist.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Extra Items Add Section (Tools Man Authority - Search-based & Stock Restricted) */}
                        {managingChecklist.status !== "Completed" && (
                            <div
                                style={{
                                    borderTop: "1px solid #E2E8F0",
                                    paddingTop: 14,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <span className="section-label" style={{ margin: 0 }}>
                                        Add Additional Tool / Material to Checklist
                                    </span>
                                    <span style={{ fontSize: 11, color: "#64748B" }}>
                                        Only worker tools & materials · Stock-restricted
                                    </span>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {/* Search Filter Input */}
                                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                                        <span
                                            style={{
                                                position: "absolute",
                                                left: 10,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                color: "#9CA3AF",
                                                pointerEvents: "none",
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            <SearchIcon size={13} />
                                        </span>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Search worker tools & materials..."
                                            value={itemSearchQuery}
                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                            style={{
                                                paddingLeft: 30,
                                                paddingRight: itemSearchQuery ? 26 : 10,
                                                fontSize: 12,
                                                paddingTop: 6,
                                                paddingBottom: 6,
                                                width: "100%",
                                            }}
                                        />
                                        {itemSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setItemSearchQuery("")}
                                                style={{
                                                    position: "absolute",
                                                    right: 8,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "none",
                                                    border: "none",
                                                    color: "#9CA3AF",
                                                    cursor: "pointer",
                                                    fontSize: 11,
                                                }}
                                            >
                                                <span style={{ fontSize: 14, lineHeight: 1 }}>&times;</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Filtered Dropdown Selector */}
                                    <select
                                        className="input-field"
                                        style={{
                                            flex: 1.5,
                                            minWidth: 240,
                                            fontSize: 12,
                                            paddingTop: 6,
                                            paddingBottom: 6,
                                        }}
                                        value={extraItemForm.item_id}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const found = workerInventoryCatalog.find(
                                                (i) => Number(i.item_id) === Number(val),
                                            );
                                            const stock = found ? Math.max(0, Number(found.quantity_on_hand) || 0) : 0;
                                            setExtraItemForm({
                                                item_id: val,
                                                quantity: stock > 0 ? 1 : 0,
                                            });
                                        }}
                                    >
                                        <option value="">
                                            {filteredWorkerCatalog.length === 0
                                                ? `No worker inventory items match "${itemSearchQuery}"`
                                                : `-- Select Worker Tool / Material (${filteredWorkerCatalog.length} available) --`}
                                        </option>
                                        {/* Worker Tools */}
                                        {filteredWorkerCatalog.filter((i) => (i.item_type || "").toLowerCase() === "tool").length > 0 && (
                                            <optgroup label="Worker Tools (Power & Hand)">
                                                {filteredWorkerCatalog
                                                    .filter((i) => (i.item_type || "").toLowerCase() === "tool")
                                                    .map((catItem) => {
                                                        const statusLower = (catItem.status || "").toLowerCase();
                                                        const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                                        const isBorrowed = statusLower === "borrowed";
                                                        const isOutOfStock = catItem.quantity_on_hand <= 0;
                                                        const isUnavailable = !catItem.is_available || isDamaged || isBorrowed || isOutOfStock;
                                                        const statusText = isDamaged
                                                            ? "DAMAGED / BROKEN"
                                                            : isBorrowed
                                                            ? "CURRENTLY IN USE"
                                                            : isOutOfStock
                                                            ? "OUT OF STOCK"
                                                            : `Stock: ${catItem.quantity_on_hand} / Total: ${catItem.initial_stock || catItem.quantity_on_hand} ${catItem.unit || "pcs"}`;

                                                        return (
                                                            <option
                                                                key={catItem.item_id}
                                                                value={catItem.item_id}
                                                                disabled={isUnavailable}
                                                            >
                                                                [Tool{catItem.tool_subtype ? ` - ${catItem.tool_subtype}` : ""}] {catItem.item_name}
                                                                {catItem.serial_number ? ` (S/N: ${catItem.serial_number})` : ""} — {statusText}
                                                            </option>
                                                        );
                                                    })}
                                            </optgroup>
                                        )}
                                        {/* Worker Materials */}
                                        {filteredWorkerCatalog.filter((i) => (i.item_type || "").toLowerCase() !== "tool").length > 0 && (
                                            <optgroup label="Worker Materials (Consumables)">
                                                {filteredWorkerCatalog
                                                    .filter((i) => (i.item_type || "").toLowerCase() !== "tool")
                                                    .map((catItem) => {
                                                        const isOutOfStock = catItem.quantity_on_hand <= 0;
                                                        const isUnavailable = !catItem.is_available || isOutOfStock;
                                                        const statusText = isOutOfStock
                                                            ? "OUT OF STOCK"
                                                            : `Stock: ${catItem.quantity_on_hand} / Total: ${catItem.initial_stock || catItem.quantity_on_hand} ${catItem.unit || "pcs"}`;

                                                        return (
                                                            <option
                                                                key={catItem.item_id}
                                                                value={catItem.item_id}
                                                                disabled={isUnavailable}
                                                            >
                                                                [Material] {catItem.item_name} — {statusText}
                                                            </option>
                                                        );
                                                    })}
                                            </optgroup>
                                        )}
                                    </select>

                                    {/* Quantity Input Constrained to Stock Availability */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <input
                                            type="number"
                                            min={availableStock > 0 ? 1 : 0}
                                            max={availableStock}
                                            value={extraItemForm.quantity}
                                            disabled={!selectedCatalogItem || availableStock <= 0 || addingItem || ["lost/damaged", "damaged", "lost", "broken"].includes((selectedCatalogItem?.status || "").toLowerCase()) || (selectedCatalogItem?.status || "").toLowerCase() === "borrowed"}
                                            className="input-field"
                                            placeholder="Qty"
                                            style={{
                                                width: 70,
                                                fontSize: 12,
                                                textAlign: "center",
                                                paddingTop: 6,
                                                paddingBottom: 6,
                                                borderColor:
                                                    Number(extraItemForm.quantity) > availableStock
                                                        ? "#EF4444"
                                                        : undefined,
                                            }}
                                            title={
                                                selectedCatalogItem
                                                    ? `Max quantity available in inventory: ${availableStock} ${selectedCatalogItem.unit || "pcs"}`
                                                    : "Select an item to set quantity"
                                            }
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                    setExtraItemForm((prev) => ({ ...prev, quantity: "" }));
                                                    return;
                                                }
                                                let num = parseInt(val, 10);
                                                if (isNaN(num)) num = 1;
                                                if (num < 1 && availableStock > 0) num = 1;
                                                if (num > availableStock) num = availableStock;
                                                setExtraItemForm((prev) => ({
                                                    ...prev,
                                                    quantity: num,
                                                }));
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{
                                                whiteSpace: "nowrap",
                                                fontSize: 12,
                                                padding: "6px 14px",
                                            }}
                                            disabled={
                                                !selectedCatalogItem ||
                                                availableStock <= 0 ||
                                                addingItem ||
                                                !extraItemForm.quantity ||
                                                Number(extraItemForm.quantity) < 1 ||
                                                Number(extraItemForm.quantity) > availableStock ||
                                                ["lost/damaged", "damaged", "lost", "broken"].includes((selectedCatalogItem?.status || "").toLowerCase()) ||
                                                (selectedCatalogItem?.status || "").toLowerCase() === "borrowed"
                                            }
                                            onClick={handleAddExtraItem}
                                        >
                                            {addingItem
                                                ? "Adding..."
                                                : "+ Add to Checklist"}
                                        </button>
                                    </div>
                                </div>

                                {/* Stock Availability Preview Card */}
                                {selectedCatalogItem && (() => {
                                    const selStatusLower = (selectedCatalogItem.status || "").toLowerCase();
                                    const selIsDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(selStatusLower);
                                    const selIsBorrowed = selStatusLower === "borrowed";

                                    return (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "7px 12px",
                                                borderRadius: 7,
                                                background: (selIsDamaged || availableStock <= 0) ? "#FEF2F2" : selIsBorrowed ? "#EFF6FF" : "#F0FDF4",
                                                border: `1px solid ${(selIsDamaged || availableStock <= 0) ? "#FECACA" : selIsBorrowed ? "#BFDBFE" : "#BBF7D0"}`,
                                                fontSize: 12,
                                                marginTop: 8,
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span
                                                    style={{
                                                        padding: "2px 6px",
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        background:
                                                            selectedCatalogItem.item_type === "Tool"
                                                                ? "#DBEAFE"
                                                                : "#FEF3C7",
                                                        color:
                                                            selectedCatalogItem.item_type === "Tool"
                                                                ? "#1E40AF"
                                                                : "#92400E",
                                                    }}
                                                >
                                                    {selectedCatalogItem.item_type}
                                                    {selectedCatalogItem.tool_subtype
                                                        ? ` · ${selectedCatalogItem.tool_subtype}`
                                                        : ""}
                                                </span>
                                                <span style={{ fontWeight: 600, color: "#1E293B" }}>
                                                    {selectedCatalogItem.item_name}
                                                </span>
                                                {selectedCatalogItem.serial_number && (
                                                    <span style={{ color: "#64748B", fontSize: 11 }}>
                                                        (S/N: {selectedCatalogItem.serial_number})
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {selIsDamaged ? (
                                                    <span style={{ color: "#DC2626", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                        <AlertCircleIcon size={12} color="#DC2626" />
                                                        <span>Damaged / Broken in inventory</span>
                                                    </span>
                                                ) : selIsBorrowed ? (
                                                    <span style={{ color: "#1E40AF", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                        <AlertCircleIcon size={12} color="#1E40AF" />
                                                        <span>Currently in use / borrowed</span>
                                                    </span>
                                                ) : availableStock > 0 ? (
                                                    <span style={{ color: "#166534", fontWeight: 600 }}>
                                                        Available in Inventory: <strong>{availableStock}</strong> / Total: {selectedCatalogItem.initial_stock || availableStock} {selectedCatalogItem.unit || "pcs"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#DC2626", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                        <AlertCircleIcon size={12} color="#DC2626" />
                                                        <span>Out of stock (0 available)</span>
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setExtraItemForm({ item_id: "", quantity: 1 });
                                                        setItemSearchQuery("");
                                                    }}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#64748B",
                                                        cursor: "pointer",
                                                        fontSize: 11,
                                                        textDecoration: "underline",
                                                    }}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
