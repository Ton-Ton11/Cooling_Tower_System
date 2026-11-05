import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
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
const TrashIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

function QtyStepper({
    item,
    checklistStatus,
    isUpdating,
    onUpdateQty,
    availableOnHand,
}) {
    const currentQty = Number(
        item.quantity_approved ?? item.quantity_requested ?? 1,
    );
    const [localQty, setLocalQty] = useState(currentQty);

    useEffect(() => {
        setLocalQty(currentQty);
    }, [currentQty]);

    if (checklistStatus !== "Pending") {
        return (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F" }}>
                {currentQty} {item.unit || "pcs"}
            </span>
        );
    }

    const maxStockReached = availableOnHand !== undefined && availableOnHand <= 0;

    const commitChange = (val) => {
        let num = parseInt(val, 10);
        if (isNaN(num) || num < 1) num = 1;
        if (num === currentQty) {
            setLocalQty(currentQty);
            return;
        }
        onUpdateQty(item, num);
    };

    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <button
                type="button"
                disabled={isUpdating || currentQty <= 1}
                onClick={() => onUpdateQty(item, currentQty - 1)}
                title={
                    currentQty <= 1
                        ? "Minimum quantity is 1"
                        : "Reduce quantity"
                }
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background:
                        currentQty <= 1 || isUpdating ? "#F8FAFC" : "#FFFFFF",
                    color:
                        currentQty <= 1 || isUpdating ? "#94A3B8" : "#1E293B",
                    cursor:
                        currentQty <= 1 || isUpdating
                            ? "not-allowed"
                            : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: 0,
                    transition: "all 0.15s ease",
                }}
            >
                −
            </button>
            <input
                type="number"
                min={1}
                value={localQty}
                disabled={isUpdating}
                onChange={(e) => setLocalQty(e.target.value)}
                onBlur={(e) => commitChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        commitChange(e.target.value);
                        e.target.blur();
                    }
                }}
                style={{
                    width: 40,
                    height: 22,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    color: "#1E2F5F",
                    border: "1px solid #CBD5E1",
                    borderRadius: 4,
                    padding: "0 2px",
                }}
            />
            <button
                type="button"
                disabled={isUpdating || maxStockReached}
                onClick={() => onUpdateQty(item, currentQty + 1)}
                title={
                    maxStockReached
                        ? "No additional stock available in inventory"
                        : "Add quantity"
                }
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background:
                        maxStockReached || isUpdating ? "#F8FAFC" : "#FFFFFF",
                    color:
                        maxStockReached || isUpdating ? "#94A3B8" : "#1E293B",
                    cursor:
                        maxStockReached || isUpdating
                            ? "not-allowed"
                            : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: 0,
                    transition: "all 0.15s ease",
                }}
            >
                +
            </button>
            <span style={{ fontSize: 11, color: "#64748B", marginLeft: 3 }}>
                {item.unit || "pcs"}
            </span>
        </div>
    );
}

export default function Checklists({ addToast, onDataChanged, endpoints, currentUser, isToolsMan: propIsToolsMan }) {
    const ep = endpoints || SUPER_ADMIN_ENDPOINTS;
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
    const roleId = Number(authUser?.role_id ?? 0);
    const isToolsMan = Boolean(propIsToolsMan || roleId === 4 || ep === TOOLS_MAN_ENDPOINTS);

    const visibleTabs = useMemo(() => {
        return isToolsMan
            ? ["All", "Pending", "Approved", "Completed"]
            : tabs;
    }, [isToolsMan]);

    const userId = authUser?.user_id || authUser?.id || null;
    const userStorageKey = useMemo(() => {
        return userId ? `checklists_recent_u${userId}` : 'checklists_recent_guest';
    }, [userId]);

    const [tab, setTab] = useState("All");

    useEffect(() => {
        if (isToolsMan && tab === "History") {
            setTab("All");
        }
    }, [isToolsMan, tab]);
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
        setRemoveModeByCategory({});
        setSelectedRemoveIds([]);
        setManagingChecklist(cl);
    };

    // Selected checklist for the management modal
    const [managingChecklist, setManagingChecklist] = useState(null);
    const [approving, setApproving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const [updatingQtyItemId, setUpdatingQtyItemId] = useState(null);

    // Reduction / Removal mode state per category group ('hand_tool', 'power_tool', 'material')
    const [removeModeByCategory, setRemoveModeByCategory] = useState({});
    const [selectedRemoveIds, setSelectedRemoveIds] = useState([]);
    const [confirmRemoveModalOpen, setConfirmRemoveModalOpen] = useState(false);
    const [removingItems, setRemovingItems] = useState(false);

    const toggleRemoveMode = (categoryKey) => {
        setRemoveModeByCategory((prev) => {
            const nextState = !prev[categoryKey];
            // Clear selections when toggled
            return {
                ...prev,
                [categoryKey]: nextState,
            };
        });
        setSelectedRemoveIds([]);
    };

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

    // Modal state for adding a new item belonging to a specific category (Hand Tools, Power Tools, Materials)
    const [addCategoryModal, setAddCategoryModal] = useState({
        open: false,
        categoryKey: "", // "hand_tool" | "power_tool" | "material"
        categoryLabel: "", // "Hand Tools" | "Power Tools" | "Materials"
        searchQuery: "",
        selectedItemId: "",
        quantity: 1,
    });
    const [submittingCategoryItem, setSubmittingCategoryItem] = useState(false);

    // Filter catalog items to only the active category for the add modal
    const categoryCatalog = useMemo(() => {
        if (!addCategoryModal.open || !addCategoryModal.categoryKey) return [];
        return workerInventoryCatalog.filter((item) => {
            const itemType = (item.item_type || "").toLowerCase();
            const toolSubtype = (item.tool_subtype || "").toLowerCase();

            if (addCategoryModal.categoryKey === "hand_tool") {
                return itemType === "tool" && toolSubtype !== "power";
            }
            if (addCategoryModal.categoryKey === "power_tool") {
                return itemType === "tool" && toolSubtype === "power";
            }
            if (addCategoryModal.categoryKey === "material") {
                return itemType !== "tool";
            }
            return false;
        });
    }, [workerInventoryCatalog, addCategoryModal.open, addCategoryModal.categoryKey]);

    // Filter category catalog by modal search query
    const filteredCategoryCatalog = useMemo(() => {
        const q = (addCategoryModal.searchQuery || "").trim().toLowerCase();
        if (!q) return categoryCatalog;
        return categoryCatalog.filter((item) => {
            const name = (item.item_name || "").toLowerCase();
            const sn = (item.serial_number || "").toLowerCase();
            const subCat = (item.sub_category || "").toLowerCase();
            return name.includes(q) || sn.includes(q) || subCat.includes(q);
        });
    }, [categoryCatalog, addCategoryModal.searchQuery]);

    // Selected item in the category add modal
    const selectedCategoryItem = useMemo(() => {
        if (!addCategoryModal.selectedItemId) return null;
        return workerInventoryCatalog.find(
            (i) => Number(i.item_id) === Number(addCategoryModal.selectedItemId),
        );
    }, [workerInventoryCatalog, addCategoryModal.selectedItemId]);

    const categoryItemAvailableStock = selectedCategoryItem
        ? Math.max(0, Number(selectedCategoryItem.quantity_on_hand) || 0)
        : 0;

    const fetchChecklists = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);
            try {
                const { data } = await window.axios.get(
                    ep.checklists,
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
        [addToast, ep],
    );

    const fetchCatalog = useCallback(async () => {
        try {
            const catalogUrl = ep.inventoryEnhanced || ep.inventory;
            const { data } = await window.axios.get(catalogUrl);
            setCatalog(Array.isArray(data?.data) ? data.data : []);
        } catch {
            // non-blocking
        }
    }, [ep]);

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
            const url = ep.approveChecklist(checklistId);
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
            const url = ep.updateToolStatus(
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

    // Handle Updating Item Quantity directly in table (Add or Reduce)
    const handleUpdateItemQty = async (targetItem, newQty) => {
        if (!managingChecklist || managingChecklist.status !== "Pending" || updatingQtyItemId) return;

        const currentQty = Number(
            targetItem.quantity_approved ?? targetItem.quantity_requested ?? 1,
        );
        if (newQty < 1 || newQty === currentQty) return;

        const delta = newQty - currentQty;
        const inv = workerInventoryCatalog.find(
            (i) => Number(i.item_id) === Number(targetItem.item_id),
        );

        if (delta > 0 && inv) {
            const onHand = Math.max(0, Number(inv.quantity_on_hand) || 0);
            if (delta > onHand) {
                addToast(
                    `Cannot add ${delta} more unit(s) of "${targetItem.item_name}". Only ${onHand} available in inventory.`,
                    "error",
                );
                return;
            }
        }

        setUpdatingQtyItemId(targetItem.id);

        const prevItems = managingChecklist.items;
        const updatedItems = (managingChecklist.items || []).map((i) =>
            i.id === targetItem.id
                ? { ...i, quantity_approved: newQty }
                : i,
        );
        setManagingChecklist((prev) => ({ ...prev, items: updatedItems }));

        try {
            const payload = updatedItems.map((i) => ({
                item_id: i.item_id,
                quantity_approved:
                    i.quantity_approved ?? i.quantity_requested ?? 1,
                status: i.status,
                notes: i.notes,
            }));

            const url = ep.updateChecklistItems(managingChecklist.checklist_id);
            const { data } = await window.axios.patch(url, { items: payload });

            addToast(data?.message || "Quantity updated successfully.");
            if (data?.data) {
                setManagingChecklist(data.data);
            }
            await fetchCatalog();
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            setManagingChecklist((prev) => ({ ...prev, items: prevItems }));
            addToast(
                extractErrorMessage(error, "Unable to update item quantity."),
                "error",
            );
        } finally {
            setUpdatingQtyItemId(null);
        }
    };

    // Handle Adding an Item from Category Add Modal
    const handleAddCategoryItemSubmit = async () => {
        if (!managingChecklist || managingChecklist.status !== "Pending" || !selectedCategoryItem || submittingCategoryItem) return;

        const statusLower = (selectedCategoryItem.status || "").toLowerCase();
        const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
        const isBorrowed = statusLower === "borrowed";

        if (isDamaged) {
            addToast(
                `"${selectedCategoryItem.item_name}" is damaged / lost and cannot be added to a checklist.`,
                "error",
            );
            return;
        }

        if (isBorrowed) {
            addToast(
                `"${selectedCategoryItem.item_name}" is currently in use / borrowed.`,
                "error",
            );
            return;
        }

        if (categoryItemAvailableStock <= 0) {
            addToast(
                `"${selectedCategoryItem.item_name}" is currently out of stock in inventory.`,
                "error",
            );
            return;
        }

        const qty = parseInt(addCategoryModal.quantity, 10);
        if (isNaN(qty) || qty < 1) {
            addToast("Please enter a valid quantity of at least 1.", "error");
            return;
        }

        if (qty > categoryItemAvailableStock) {
            addToast(
                `Cannot add ${qty} units of "${selectedCategoryItem.item_name}". Only ${categoryItemAvailableStock} available in inventory.`,
                "error",
            );
            return;
        }

        setSubmittingCategoryItem(true);
        try {
            const existingItems = Array.isArray(managingChecklist.items)
                ? managingChecklist.items.map((i) => ({
                      item_id: i.item_id,
                      quantity_approved: i.quantity_approved ?? i.quantity_requested ?? 1,
                      status: i.status,
                      notes: i.notes,
                  }))
                : [];

            const newItemId = Number(addCategoryModal.selectedItemId);
            const matchIndex = existingItems.findIndex(
                (i) => Number(i.item_id) === newItemId,
            );

            const isTool = (selectedCategoryItem.item_type || "").toLowerCase() === "tool";

            if (matchIndex >= 0) {
                const newTotal = existingItems[matchIndex].quantity_approved + qty;
                if (newTotal > categoryItemAvailableStock) {
                    addToast(
                        `Checklist already has ${existingItems[matchIndex].quantity_approved} allocated. Total (${newTotal}) would exceed available stock (${categoryItemAvailableStock}).`,
                        "error",
                    );
                    setSubmittingCategoryItem(false);
                    return;
                }
                existingItems[matchIndex].quantity_approved = newTotal;
            } else {
                const adderRole = authUser?.role_id === 1 ? "Super Admin" : "Tools Man";
                existingItems.push({
                    item_id: newItemId,
                    quantity_approved: qty,
                    status: isTool ? "assigned" : "consumed",
                    notes: `Added by ${adderRole}`,
                });
            }

            const url = ep.updateChecklistItems(
                managingChecklist.checklist_id,
            );
            const { data } = await window.axios.patch(url, {
                items: existingItems,
            });

            addToast(data?.message || `${addCategoryModal.categoryLabel} item added to checklist successfully.`);
            setAddCategoryModal({
                open: false,
                categoryKey: "",
                categoryLabel: "",
                searchQuery: "",
                selectedItemId: "",
                quantity: 1,
            });
            if (data?.data) {
                setManagingChecklist(data.data);
            }
            await fetchCatalog();
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to add item to checklist."),
                "error",
            );
        } finally {
            setSubmittingCategoryItem(false);
        }
    };

    // Handle Confirm Remove Selected Items from Checklist
    const handleConfirmRemoveSelected = async () => {
        if (!managingChecklist || selectedRemoveIds.length === 0 || removingItems) return;

        setRemovingItems(true);
        try {
            const url = ep.removeChecklistItems
                ? ep.removeChecklistItems(managingChecklist.checklist_id)
                : `/super-admin/checklists/${managingChecklist.checklist_id}/items`;

            const { data } = await window.axios.delete(url, {
                data: {
                    item_ids: selectedRemoveIds,
                },
            });

            addToast(data?.message || `${selectedRemoveIds.length} item(s) removed from checklist.`);
            setSelectedRemoveIds([]);
            setConfirmRemoveModalOpen(false);
            if (data?.data) {
                setManagingChecklist(data.data);
            }
            await fetchCatalog();
            await fetchChecklists(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to remove selected items from checklist."),
                "error",
            );
        } finally {
            setRemovingItems(false);
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
            const url = ep.completeChecklist(checklistId);
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
                    {visibleTabs.map((t) => {
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
            {!isToolsMan && tab === "History" && (
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
                                    ].map((heading) => {
                                        const isAction = heading === "Action";
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
                                                    ...(isAction ? { position: "sticky", right: 0, zIndex: 10, background: "#F8FAFC" } : {}),
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        );
                                    })}
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
                                                className="sticky-action-col"
                                                style={{
                                                    padding: "12px 14px",
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
                                                        alignItems: "center",
                                                        justifyContent: "flex-end",
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
                message={`Booking #${managingChecklist?.booking_id}`}
                confirmLabel="Close"
                cancelLabel={false}
                maxWidth={820}
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
                        {/* Booking Details Card */}
                        <div
                            style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                borderRadius: 10,
                                padding: "12px 16px",
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                                gap: 10,
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                                    Customer
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F", marginTop: 2 }}>
                                    {managingChecklist.client_name || managingChecklist.booking?.client_name || "Customer"}
                                </div>
                                {(managingChecklist.client_contact || managingChecklist.booking?.client_contact) && (
                                    <div style={{ fontSize: 11, color: "#64748B" }}>
                                        {managingChecklist.client_contact || managingChecklist.booking?.client_contact}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                                    Service & Schedule
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F", marginTop: 2 }}>
                                    {managingChecklist.service_name || managingChecklist.booking?.service_name || "Service"}
                                </div>
                                {(managingChecklist.scheduled_date || managingChecklist.booking?.scheduled_date) && (
                                    <div style={{ fontSize: 11, color: "#64748B" }}>
                                        {formatDateTime(managingChecklist.scheduled_date || managingChecklist.booking?.scheduled_date)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                                    Address
                                </div>
                                <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
                                    {managingChecklist.client_address || managingChecklist.booking?.client_address || "—"}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                                    Team & Booking Status
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F", marginTop: 2 }}>
                                    {managingChecklist.team_name || managingChecklist.technician_name || "Assigned Team"}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                    <StatusBadge
                                        status={
                                            managingChecklist.booking_status ||
                                            managingChecklist.booking?.booking_status ||
                                            (managingChecklist.status === "Approved" ? "In-Progress" : "Approved")
                                        }
                                    />
                                    {managingChecklist.technician_name && (
                                        <span style={{ fontSize: 10, color: "#64748B" }}>
                                            By {managingChecklist.technician_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

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
                                        Checklist: {managingChecklist.status}
                                    </span>
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
                                        ? "Approving issues the requested items and updates booking status to In-Progress."
                                        : managingChecklist.status ===
                                            "Approved"
                                          ? "Booking is In-Progress. Mark all tools as returned, damaged, or lost before completing."
                                          : "Checklist completed."}
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
                                        : "Approve Checklist"}
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
                                        : "Complete Checklist"}
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
                                        still assigned. Update status to{" "}
                                        <strong>returned</strong>,{" "}
                                        <strong>damaged</strong>, or{" "}
                                        <strong>lost</strong> to complete.
                                    </span>
                                </div>
                            )}

                        {/* Requested Items Grouped by Hand Tools, Power Tools, Materials */}
                        {(() => {
                            const allItems = Array.isArray(managingChecklist.items)
                                ? managingChecklist.items
                                : [];
                            const getCat = (it) => {
                                if (it.category_group) return it.category_group;
                                const t = (it.item_type || "").toLowerCase();
                                if (t !== "tool") return "material";
                                return (it.tool_subtype || "").toLowerCase() === "power"
                                    ? "power_tool"
                                    : "hand_tool";
                            };
                            const groups = [
                                {
                                    key: "hand_tool",
                                    label: "Hand Tools",
                                    badgeBg: "#DBEAFE",
                                    badgeColor: "#1D4ED8",
                                    items: allItems.filter((i) => getCat(i) === "hand_tool"),
                                },
                                {
                                    key: "power_tool",
                                    label: "Power Tools",
                                    badgeBg: "#EDE9FE",
                                    badgeColor: "#6D28D9",
                                    items: allItems.filter((i) => getCat(i) === "power_tool"),
                                },
                                {
                                    key: "material",
                                    label: "Materials",
                                    badgeBg: "#FEF3C7",
                                    badgeColor: "#B45309",
                                    items: allItems.filter((i) => getCat(i) === "material"),
                                },
                            ];

                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {groups.map((grp) => (
                                        <div
                                            key={grp.key}
                                            style={{
                                                border: "1px solid #E2E8F0",
                                                borderRadius: 10,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    padding: "8px 12px",
                                                    background: "#F8FAFC",
                                                    borderBottom: "1px solid #E2E8F0",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F" }}>
                                                    {grp.label}
                                                </span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: "2px 8px",
                                                            borderRadius: 999,
                                                            background: grp.badgeBg,
                                                            color: grp.badgeColor,
                                                        }}
                                                    >
                                                        {grp.items.length}
                                                    </span>
                                                    {managingChecklist.status === "Pending" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setAddCategoryModal({
                                                                        open: true,
                                                                        categoryKey: grp.key,
                                                                        categoryLabel: grp.label,
                                                                        searchQuery: "",
                                                                        selectedItemId: "",
                                                                        quantity: 1,
                                                                    })
                                                                }
                                                                title={`Add new ${grp.label.toLowerCase()}`}
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: "50%",
                                                                    background: "#FFFFFF",
                                                                    color: grp.badgeColor,
                                                                    border: `1.5px solid ${grp.badgeColor}`,
                                                                    fontSize: 14,
                                                                    fontWeight: "bold",
                                                                    lineHeight: 1,
                                                                    cursor: "pointer",
                                                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                                                    transition: "all 0.15s ease",
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = grp.badgeBg;
                                                                    e.currentTarget.style.transform = "scale(1.1)";
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = "#FFFFFF";
                                                                    e.currentTarget.style.transform = "scale(1)";
                                                                }}
                                                            >
                                                                +
                                                            </button>

                                                            {grp.items.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleRemoveMode(grp.key)}
                                                                    title={
                                                                        removeModeByCategory[grp.key]
                                                                            ? `Cancel removing ${grp.label.toLowerCase()}`
                                                                            : `Reduce or remove ${grp.label.toLowerCase()} from checklist`
                                                                    }
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        width: 22,
                                                                        height: 22,
                                                                        borderRadius: "50%",
                                                                        background: removeModeByCategory[grp.key]
                                                                            ? "#DC2626"
                                                                            : "#FFFFFF",
                                                                        color: removeModeByCategory[grp.key]
                                                                            ? "#FFFFFF"
                                                                            : "#EF4444",
                                                                        border: "1.5px solid #EF4444",
                                                                        fontSize: 14,
                                                                        fontWeight: "bold",
                                                                        lineHeight: 1,
                                                                        cursor: "pointer",
                                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                                                        transition: "all 0.15s ease",
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!removeModeByCategory[grp.key]) {
                                                                            e.currentTarget.style.background = "#FEE2E2";
                                                                        }
                                                                        e.currentTarget.style.transform = "scale(1.1)";
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!removeModeByCategory[grp.key]) {
                                                                            e.currentTarget.style.background = "#FFFFFF";
                                                                        }
                                                                        e.currentTarget.style.transform = "scale(1)";
                                                                    }}
                                                                >
                                                                    -
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {grp.items.length === 0 ? (
                                                <div style={{ padding: "10px 12px", fontSize: 12, color: "#94A3B8" }}>
                                                    None requested
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    {/* In reduction/removal mode, display top action toolbar */}
                                                    {removeModeByCategory[grp.key] && (
                                                        <div
                                                            style={{
                                                                padding: "8px 12px",
                                                                background: "#FEF2F2",
                                                                borderBottom: "1px solid #FECACA",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between",
                                                                flexWrap: "wrap",
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <label
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 6,
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    color: "#991B1B",
                                                                    cursor: "pointer",
                                                                    userSelect: "none",
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        grp.items.length > 0 &&
                                                                        grp.items.every((it) =>
                                                                            selectedRemoveIds.includes(it.id),
                                                                        )
                                                                    }
                                                                    onChange={(e) => {
                                                                        const grpItemIds = grp.items.map((it) => it.id);
                                                                        if (e.target.checked) {
                                                                            setSelectedRemoveIds((prev) =>
                                                                                Array.from(new Set([...prev, ...grpItemIds])),
                                                                        );
                                                                        } else {
                                                                            setSelectedRemoveIds((prev) =>
                                                                                prev.filter((id) => !grpItemIds.includes(id)),
                                                                        );
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        accentColor: "#DC2626",
                                                                        width: 15,
                                                                        height: 15,
                                                                    }}
                                                                />
                                                                <span>Select All {grp.label}</span>
                                                            </label>

                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const grpItemIds = grp.items.map((it) => it.id);
                                                                        setSelectedRemoveIds((prev) =>
                                                                            prev.filter((id) => !grpItemIds.includes(id)),
                                                                        );
                                                                        toggleRemoveMode(grp.key);
                                                                    }}
                                                                    style={{
                                                                        fontSize: 11,
                                                                        padding: "4px 10px",
                                                                        borderRadius: 6,
                                                                        background: "#FFFFFF",
                                                                        border: "1px solid #E2E8F0",
                                                                        color: "#475569",
                                                                        fontWeight: 600,
                                                                        cursor: "pointer",
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        selectedRemoveIds.filter((id) =>
                                                                            grp.items.some((it) => it.id === id),
                                                                        ).length === 0
                                                                    }
                                                                    onClick={() => setConfirmRemoveModalOpen(true)}
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: 5,
                                                                        fontSize: 11,
                                                                        padding: "4px 12px",
                                                                        borderRadius: 6,
                                                                        background:
                                                                            selectedRemoveIds.filter((id) =>
                                                                                grp.items.some((it) => it.id === id),
                                                                            ).length === 0
                                                                                ? "#FCA5A5"
                                                                                : "#DC2626",
                                                                        color: "#FFFFFF",
                                                                        border: "none",
                                                                        fontWeight: 700,
                                                                        cursor:
                                                                            selectedRemoveIds.filter((id) =>
                                                                                grp.items.some((it) => it.id === id),
                                                                            ).length === 0
                                                                                ? "not-allowed"
                                                                                : "pointer",
                                                                        boxShadow: "0 1px 3px rgba(220,38,38,0.25)",
                                                                    }}
                                                                >
                                                                    <TrashIcon size={12} color="#FFFFFF" />
                                                                    <span>
                                                                        Remove (
                                                                        {
                                                                            selectedRemoveIds.filter((id) =>
                                                                                grp.items.some((it) => it.id === id),
                                                                            ).length
                                                                        }
                                                                        )
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                        <thead>
                                                            <tr style={{ background: "#FFFFFF", borderBottom: "1px solid #F1F5F9" }}>
                                                                {removeModeByCategory[grp.key] && (
                                                                    <th
                                                                        style={{
                                                                            padding: "7px 8px 7px 12px",
                                                                            width: 36,
                                                                            textAlign: "center",
                                                                        }}
                                                                    >
                                                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#991B1B" }}>
                                                                            ✓
                                                                        </span>
                                                                    </th>
                                                                )}
                                                                {["Item", "Qty", "Status", "Action"].map((h) => (
                                                                    <th
                                                                        key={h}
                                                                        style={{
                                                                            padding: "7px 12px",
                                                                            textAlign: "left",
                                                                            fontSize: 10,
                                                                            fontWeight: 700,
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
                                                            {grp.items.map((item) => {
                                                                const isTool =
                                                                    (item.item_type || "").toLowerCase() === "tool";
                                                                const isUpdating = updatingStatusId === item.id;
                                                                const isSelectedForRemove = selectedRemoveIds.includes(item.id);

                                                                return (
                                                                    <tr
                                                                        key={item.id}
                                                                        style={{
                                                                            borderTop: "1px solid #F1F5F9",
                                                                            background: isSelectedForRemove ? "#FEF2F2" : "transparent",
                                                                            transition: "background-color 0.15s ease",
                                                                        }}
                                                                    >
                                                                        {removeModeByCategory[grp.key] && (
                                                                            <td
                                                                                style={{
                                                                                    padding: "8px 8px 8px 12px",
                                                                                    textAlign: "center",
                                                                                    width: 36,
                                                                                }}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelectedForRemove}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.checked) {
                                                                                            setSelectedRemoveIds((prev) => [...prev, item.id]);
                                                                                        } else {
                                                                                            setSelectedRemoveIds((prev) =>
                                                                                                prev.filter((id) => id !== item.id),
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        cursor: "pointer",
                                                                                        accentColor: "#DC2626",
                                                                                        width: 15,
                                                                                        height: 15,
                                                                                    }}
                                                                                />
                                                                            </td>
                                                                        )}
                                                                        <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#1E2F5F" }}>
                                                                            {item.item_name}
                                                                            {item.serial_number && (
                                                                                <div style={{ fontSize: 10, color: "#9CA3AF" }}>
                                                                                    S/N: {item.serial_number}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: "6px 12px" }}>
                                                                            {(() => {
                                                                                const inv = workerInventoryCatalog.find(
                                                                                    (c) => Number(c.item_id) === Number(item.item_id),
                                                                                );
                                                                                const availableOnHand = inv
                                                                                    ? Math.max(0, Number(inv.quantity_on_hand) || 0)
                                                                                    : undefined;
                                                                                return (
                                                                                    <QtyStepper
                                                                                        item={item}
                                                                                        checklistStatus={managingChecklist.status}
                                                                                        isUpdating={updatingQtyItemId === item.id}
                                                                                        onUpdateQty={handleUpdateItemQty}
                                                                                        availableOnHand={availableOnHand}
                                                                                    />
                                                                                );
                                                                            })()}
                                                                        </td>
                                                                        <td style={{ padding: "8px 12px" }}>
                                                                            {isTool ? (
                                                                                <span
                                                                                    style={{
                                                                                        fontSize: 11,
                                                                                        fontWeight: 700,
                                                                                        padding: "2px 8px",
                                                                                        borderRadius: 6,
                                                                                        textTransform: "capitalize",
                                                                                        background:
                                                                                            item.status === "assigned"
                                                                                                ? "#DBEAFE"
                                                                                                : item.status === "returned"
                                                                                                ? "#D1FAE5"
                                                                                                : item.status === "damaged"
                                                                                                ? "#FEE2E2"
                                                                                                : item.status === "lost"
                                                                                                ? "#4B5563"
                                                                                                : "#F3F4F6",
                                                                                        color:
                                                                                            item.status === "assigned"
                                                                                                ? "#1E40AF"
                                                                                                : item.status === "returned"
                                                                                                ? "#065F46"
                                                                                                : item.status === "damaged"
                                                                                                ? "#991B1B"
                                                                                                : item.status === "lost"
                                                                                                ? "#FFFFFF"
                                                                                                : "#374151",
                                                                                    }}
                                                                                >
                                                                                    {item.status === "assigned"
                                                                                        ? "Assigned"
                                                                                        : item.status}
                                                                                </span>
                                                                            ) : (
                                                                                <span
                                                                                    style={{
                                                                                        fontSize: 11,
                                                                                        color: "#64748B",
                                                                                        background: "#F1F5F9",
                                                                                        padding: "2px 8px",
                                                                                        borderRadius: 6,
                                                                                        fontWeight: 600,
                                                                                    }}
                                                                                >
                                                                                    Material
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: "8px 12px" }}>
                                                                            {isTool ? (
                                                                                <select
                                                                                    className="input-field"
                                                                                    style={{
                                                                                        fontSize: 11,
                                                                                        padding: "4px 8px",
                                                                                        maxWidth: 130,
                                                                                    }}
                                                                                    value={item.status}
                                                                                    disabled={
                                                                                        isUpdating ||
                                                                                        managingChecklist.status === "Completed"
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        handleStatusChange(
                                                                                            managingChecklist.checklist_id,
                                                                                            item.id,
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <option value="assigned">Assigned</option>
                                                                                    <option value="returned">Returned</option>
                                                                                    <option value="damaged">Damaged</option>
                                                                                    <option value="lost">Lost</option>
                                                                                </select>
                                                                            ) : (
                                                                                <span style={{ color: "#94A3B8", fontSize: 11 }}>—</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </Modal>

            {/* Add Category Item Modal (Hand Tools, Power Tools, Materials) */}
            <Modal
                open={addCategoryModal.open}
                title={`Add ${addCategoryModal.categoryLabel} to Checklist`}
                message={`Select a ${addCategoryModal.categoryLabel.toLowerCase()} from worker inventory to add to Checklist #${managingChecklist?.checklist_id}`}
                confirmLabel={submittingCategoryItem ? "Adding..." : "+ Add to Checklist"}
                cancelLabel="Cancel"
                confirmDisabled={
                    !selectedCategoryItem ||
                    categoryItemAvailableStock <= 0 ||
                    submittingCategoryItem ||
                    !addCategoryModal.quantity ||
                    Number(addCategoryModal.quantity) < 1 ||
                    Number(addCategoryModal.quantity) > categoryItemAvailableStock ||
                    ["lost/damaged", "damaged", "lost", "broken"].includes(
                        (selectedCategoryItem?.status || "").toLowerCase(),
                    ) ||
                    (selectedCategoryItem?.status || "").toLowerCase() === "borrowed"
                }
                maxWidth={540}
                onConfirm={handleAddCategoryItemSubmit}
                onCancel={() =>
                    setAddCategoryModal((prev) => ({
                        ...prev,
                        open: false,
                        selectedItemId: "",
                        searchQuery: "",
                        quantity: 1,
                    }))
                }
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Search Input for Category */}
                    <div style={{ position: "relative" }}>
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
                            <SearchIcon size={14} />
                        </span>
                        <input
                            type="text"
                            className="input-field"
                            placeholder={`Search ${addCategoryModal.categoryLabel.toLowerCase()}...`}
                            value={addCategoryModal.searchQuery}
                            onChange={(e) =>
                                setAddCategoryModal((prev) => ({
                                    ...prev,
                                    searchQuery: e.target.value,
                                }))
                            }
                            style={{
                                paddingLeft: 32,
                                paddingRight: addCategoryModal.searchQuery ? 28 : 10,
                                fontSize: 13,
                                paddingTop: 8,
                                paddingBottom: 8,
                                width: "100%",
                            }}
                        />
                        {addCategoryModal.searchQuery && (
                            <button
                                type="button"
                                onClick={() =>
                                    setAddCategoryModal((prev) => ({
                                        ...prev,
                                        searchQuery: "",
                                    }))
                                }
                                style={{
                                    position: "absolute",
                                    right: 8,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    color: "#9CA3AF",
                                    cursor: "pointer",
                                    fontSize: 14,
                                }}
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {/* Item Selector Dropdown */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#475569",
                                marginBottom: 4,
                                textTransform: "uppercase",
                            }}
                        >
                            Select Item ({filteredCategoryCatalog.length} available)
                        </label>
                        <select
                            className="input-field"
                            style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
                            value={addCategoryModal.selectedItemId}
                            onChange={(e) => {
                                const val = e.target.value;
                                const found = categoryCatalog.find(
                                    (i) => Number(i.item_id) === Number(val),
                                );
                                const stock = found
                                    ? Math.max(0, Number(found.quantity_on_hand) || 0)
                                    : 0;
                                setAddCategoryModal((prev) => ({
                                    ...prev,
                                    selectedItemId: val,
                                    quantity: stock > 0 ? 1 : 0,
                                }));
                            }}
                        >
                            <option value="">
                                {filteredCategoryCatalog.length === 0
                                    ? `No items found matching "${addCategoryModal.searchQuery}"`
                                    : `-- Choose ${addCategoryModal.categoryLabel.slice(0, -1)} --`}
                            </option>
                            {filteredCategoryCatalog.map((catItem) => {
                                const statusLower = (catItem.status || "").toLowerCase();
                                const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                const isBorrowed = statusLower === "borrowed";
                                const isOutOfStock = Number(catItem.quantity_on_hand) <= 0;
                                const isArchived = Boolean(catItem.is_archived);
                                const isUnavailable =
                                    isArchived || isDamaged || isBorrowed || isOutOfStock;
                                const statusText = isDamaged
                                    ? "DAMAGED / BROKEN"
                                    : isBorrowed
                                    ? "CURRENTLY IN USE"
                                    : isOutOfStock
                                    ? "OUT OF STOCK"
                                    : `Stock: ${catItem.quantity_on_hand} ${catItem.unit || "pcs"}`;

                                return (
                                    <option
                                        key={catItem.item_id}
                                        value={catItem.item_id}
                                        disabled={isUnavailable}
                                    >
                                        {catItem.item_name}
                                        {catItem.serial_number
                                            ? ` (S/N: ${catItem.serial_number})`
                                            : ""}{" "}
                                        — {statusText}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Selected Item Stock & Details Preview */}
                    {selectedCategoryItem && (() => {
                        const selStatusLower = (selectedCategoryItem.status || "").toLowerCase();
                        const selIsDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(selStatusLower);
                        const selIsBorrowed = selStatusLower === "borrowed";

                        return (
                            <div
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    background:
                                        selIsDamaged || categoryItemAvailableStock <= 0
                                            ? "#FEF2F2"
                                            : selIsBorrowed
                                            ? "#EFF6FF"
                                            : "#F0FDF4",
                                    border: `1px solid ${
                                        selIsDamaged || categoryItemAvailableStock <= 0
                                            ? "#FECACA"
                                            : selIsBorrowed
                                            ? "#BFDBFE"
                                            : "#BBF7D0"
                                    }`,
                                    fontSize: 12,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: "#1E293B" }}>
                                        {selectedCategoryItem.item_name}
                                    </span>
                                    {selectedCategoryItem.serial_number && (
                                        <span style={{ color: "#64748B", fontSize: 11 }}>
                                            S/N: {selectedCategoryItem.serial_number}
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        marginTop: 4,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <span style={{ color: "#64748B" }}>
                                        {selectedCategoryItem.sub_category ||
                                            selectedCategoryItem.item_type}
                                    </span>
                                    {selIsDamaged ? (
                                        <span style={{ color: "#DC2626", fontWeight: 700 }}>
                                            Damaged / Lost in Inventory
                                        </span>
                                    ) : selIsBorrowed ? (
                                        <span style={{ color: "#1E40AF", fontWeight: 700 }}>
                                            Currently in use / borrowed
                                        </span>
                                    ) : categoryItemAvailableStock > 0 ? (
                                        <span style={{ color: "#166534", fontWeight: 600 }}>
                                            Available Stock:{" "}
                                            <strong>{categoryItemAvailableStock}</strong>{" "}
                                            {selectedCategoryItem.unit || "pcs"}
                                        </span>
                                    ) : (
                                        <span style={{ color: "#DC2626", fontWeight: 700 }}>
                                            Out of stock (0 available)
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Quantity Input */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#475569",
                                marginBottom: 4,
                                textTransform: "uppercase",
                            }}
                        >
                            Quantity to Add{" "}
                            {selectedCategoryItem
                                ? `(Max: ${categoryItemAvailableStock} ${selectedCategoryItem.unit || "pcs"})`
                                : ""}
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                type="number"
                                min={categoryItemAvailableStock > 0 ? 1 : 0}
                                max={categoryItemAvailableStock}
                                value={addCategoryModal.quantity}
                                disabled={
                                    !selectedCategoryItem ||
                                    categoryItemAvailableStock <= 0 ||
                                    submittingCategoryItem
                                }
                                className="input-field"
                                placeholder="Qty"
                                style={{
                                    width: 100,
                                    fontSize: 13,
                                    textAlign: "center",
                                    padding: "8px 12px",
                                    borderColor:
                                        Number(addCategoryModal.quantity) >
                                        categoryItemAvailableStock
                                            ? "#EF4444"
                                            : undefined,
                                }}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "") {
                                        setAddCategoryModal((prev) => ({
                                            ...prev,
                                            quantity: "",
                                        }));
                                        return;
                                    }
                                    let num = parseInt(val, 10);
                                    if (isNaN(num)) num = 1;
                                    if (num < 1 && categoryItemAvailableStock > 0) num = 1;
                                    if (num > categoryItemAvailableStock)
                                        num = categoryItemAvailableStock;
                                    setAddCategoryModal((prev) => ({
                                        ...prev,
                                        quantity: num,
                                    }));
                                }}
                            />
                            <span
                                style={{
                                    fontSize: 13,
                                    color: "#64748B",
                                    fontWeight: 600,
                                }}
                            >
                                {selectedCategoryItem?.unit || "pcs"}
                            </span>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Remove Confirmation Modal */}
            <Modal
                open={confirmRemoveModalOpen}
                title="Confirm Item Removal"
                message={`Are you sure you want to remove the ${selectedRemoveIds.length} selected item(s) from Checklist #${managingChecklist?.checklist_id}?`}
                confirmLabel={removingItems ? "Removing..." : "Confirm"}
                cancelLabel="Cancel"
                variant="danger"
                confirmDisabled={removingItems || selectedRemoveIds.length === 0}
                maxWidth={440}
                onConfirm={handleConfirmRemoveSelected}
                onCancel={() => setConfirmRemoveModalOpen(false)}
            />
        </div>
    );
}
