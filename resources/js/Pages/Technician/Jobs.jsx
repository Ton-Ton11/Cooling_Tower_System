import { useCallback, useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import AcBrandSelect from "../../Components/AcBrandSelect";
import GcashPaymentCard from "../../Components/GcashPaymentCard";
import {
    TECHNICIAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
    formatStorageUrl,
} from "../../utils/superAdmin";

const tabs = ["All", "Approved", "In-Progress", "Completed", "Cancelled"];

const WORK_PERFORMED_SERVICES = [
    "Installation",
    "Repair / Check-up",
    "Cleaning / Preventive Maintenance",
    "Ocular Inspection",
];

const OCULAR_ROOM_CATEGORIES = [
    "Bedroom",
    "Living Room",
    "Kitchen",
    "Office",
    "Server Room",
    "Dining Room",
    "Conference Room",
    "Commercial Space",
    "Others",
];

const OCULAR_SUN_LEVELS = ["Heavy/West", "Moderate", "Shaded"];
const OCULAR_WINDOW_SIZES = ["Small", "Medium", "Large Glass Facade"];

const createDefaultOcularRoom = (index = 1) => ({
    room_id: null,
    room_name: `Room ${index}`,
    unit_of_measurement: "Meters",
    room_length: "",
    room_width: "",
    ceiling_height: "2.7",
    room_category: "Bedroom",
    sun_exposure_level: "Moderate",
    maximum_occupancy: "2",
    window_size_glazing: "Medium",
    heat_generating_equipment: "0",
});

const computeOcularRoomEstimate = (room) => {
    const length = parseFloat(room?.room_length);
    const width = parseFloat(room?.room_width);
    const height = parseFloat(room?.ceiling_height || "2.7");
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
        return null;
    }
    const isFeet = (room?.unit_of_measurement || "Meters") === "Feet";
    const lengthM = isFeet ? length * 0.3048 : length;
    const widthM = isFeet ? width * 0.3048 : width;
    const heightM = isFeet ? (Number.isFinite(height) && height > 0 ? height : 8.86) * 0.3048 : (Number.isFinite(height) && height > 0 ? height : 2.7);

    let btu = Math.max(1, lengthM * widthM) * 600 * Math.max(1, heightM / 2.7);
    const cat = String(room?.room_category || "").toLowerCase();
    if (cat.includes("server")) btu *= 1.35;
    else if (cat.includes("kitchen")) btu += 4000;
    else if (cat.includes("office") || cat.includes("commercial")) btu *= 1.12;

    if (room?.sun_exposure_level === "Heavy/West") btu *= 1.12;
    else if (room?.sun_exposure_level === "Shaded") btu *= 0.92;

    if (room?.window_size_glazing === "Large Glass Facade") btu *= 1.15;
    else if (room?.window_size_glazing === "Small") btu *= 0.96;

    const occ = Math.max(1, parseInt(room?.maximum_occupancy, 10) || 1);
    if (occ > 2) btu += (occ - 2) * 600;

    const eq = Math.max(0, parseInt(room?.heat_generating_equipment, 10) || 0);
    if (eq > 0) btu += eq <= 30 ? eq * 350 : eq * 3.412;

    const rawHp = Math.max(0.5, btu / 9000);
    const standards = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
    let hp = Math.round(rawHp * 2) / 2;
    for (const s of standards) {
        if (rawHp <= s + 0.05) {
            hp = s;
            break;
        }
    }

    return {
        btu: Math.round(btu),
        hp,
    };
};

const COMPLETE_AC_TYPES = [
    { value: "Split", label: "Split Type (Wall-Mounted)" },
    { value: "Window", label: "Window Type" },
    { value: "Cassette", label: "Ceiling Cassette" },
    { value: "Floor Mounted", label: "Floor Mounted / Standing Tower" },
    { value: "Ceiling Suspended", label: "Ceiling Suspended" },
    { value: "Ducted / Concealed", label: "Ducted / Concealed Ceiling" },
    { value: "Central / Package Unit", label: "Central / Package Unit" },
    { value: "VRF / VRV System", label: "VRF / VRV Multi-Split System" },
    { value: "Multi-Split", label: "Multi-Split System" },
    { value: "Portable AC", label: "Portable Air Conditioner" },
    { value: "Other", label: "Other / Not Listed" },
];

const normalizeAcType = (rawType) => {
    if (!rawType) return "Split";
    const str = String(rawType).trim();
    const lower = str.toLowerCase();
    if (lower.includes("multi-split") || lower.includes("multisplit")) return "Multi-Split";
    if (lower.includes("split")) return "Split";
    if (lower.includes("window")) return "Window";
    if (lower.includes("cassette")) return "Cassette";
    if (lower.includes("floor")) return "Floor Mounted";
    if (lower.includes("suspended")) return "Ceiling Suspended";
    if (lower.includes("duct") || lower.includes("conceal")) return "Ducted / Concealed";
    if (lower.includes("central") || lower.includes("package")) return "Central / Package Unit";
    if (lower.includes("vrf") || lower.includes("vrv")) return "VRF / VRV System";
    if (lower.includes("portable")) return "Portable AC";
    if (lower.includes("other") || lower.includes("sure")) return "Other";
    return str;
};

const Icon = ({ d, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const UsersIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);
const UserIcon = ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const MapPinIcon = ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const PhoneIcon = ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
);
const CalendarIcon = ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const ClipboardListIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="15" y2="16" />
    </svg>
);
const StarIcon = ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const ic = {
    check: "M20 6L9 17l-5-5",
    tools: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    fileText: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6",
};

const getItemCategoryGroup = (item) => {
    if (item?.category_group) return item.category_group;
    const isTool = (item?.item_type || "").toLowerCase() === "tool";
    if (!isTool) return "material";
    return (item?.tool_subtype || "").toLowerCase().includes("power")
        ? "power_tool"
        : "hand_tool";
};

export default function TechnicianJobs({ addToast, onDataChanged }) {
    const currentUserId = usePage()?.props?.auth?.user?.user_id;
    const [tab, setTab] = useState("All");
    const [bookings, setBookings] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);

    // Checklist Builder State
    const [builderOpen, setBuilderOpen] = useState(false);
    const [builderBooking, setBuilderBooking] = useState(null);
    const [editingChecklist, setEditingChecklist] = useState(null);
    const [checklistNotes, setChecklistNotes] = useState("");
    const [selectedItemsMap, setSelectedItemsMap] = useState({});
    const [catalogSearch, setCatalogSearch] = useState("");
    const [activeCategoryTab, setActiveCategoryTab] = useState("hand_tools"); // 'hand_tools' | 'power_tools' | 'materials'

    // Review Modal State (Pop-up before submitting)
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [savingChecklist, setSavingChecklist] = useState(false);

    // View Checklist Modal State
    const [viewChecklistModal, setViewChecklistModal] = useState(null);
    const [updatingToolItemId, setUpdatingToolItemId] = useState(null);
    const [returningMaterialId, setReturningMaterialId] = useState(null);
    const [materialReturnQtys, setMaterialReturnQtys] = useState({});

    // Failed Booking Modal State
    const [failedModal, setFailedModal] = useState(null);
    const [failedReason, setFailedReason] = useState("");
    const [reportingFailed, setReportingFailed] = useState(false);

    // Complete Job / Turn Over Payment Modal
    const [completeModal, setCompleteModal] = useState(null);
    const [completing, setCompleting] = useState(false);
    const [reportForm, setReportForm] = useState({
        diagnosis: "",
        work_done: "Installation",
        parts_replaced: "",
        ac_brand: "",
        ac_type: "Split",
        unit_serial_number: "",
        payment_method: "Cash",
        total_service_price: "",
        delivery_fee: "",
        reference_number: "",
        proof_image: null,
        proof_image_preview: "",
    });

    const [viewReportModal, setViewReportModal] = useState(null);

    // Ocular Inspection Result Submission Modal
    const [ocularModalJob, setOcularModalJob] = useState(null);
    const [ocularReadOnly, setOcularReadOnly] = useState(false);
    const [ocularSubmitting, setOcularSubmitting] = useState(false);
    const [ocularStage, setOcularStage] = useState("before"); // "before" | "after"
    const [ocularRooms, setOcularRooms] = useState([createDefaultOcularRoom(1)]);
    const [ocularTechNotes, setOcularTechNotes] = useState("");
    const [ocularBeforeNotes, setOcularBeforeNotes] = useState("");
    const [ocularAfterNotes, setOcularAfterNotes] = useState("");
    const [ocularBeforePhoto, setOcularBeforePhoto] = useState(null);
    const [ocularBeforePreview, setOcularBeforePreview] = useState("");
    const [ocularAfterPhoto, setOcularAfterPhoto] = useState(null);
    const [ocularAfterPreview, setOcularAfterPreview] = useState("");
    const [ocularFormError, setOcularFormError] = useState("");

    const fetchBookings = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.bookings);
            setBookings(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load assigned jobs."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const fetchCatalog = useCallback(async () => {
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.availableCatalog);
            setCatalog(Array.isArray(data?.data) ? data.data : []);
        } catch {
            // non-blocking
        }
    }, []);

    useEffect(() => {
        fetchBookings();
        fetchCatalog();
    }, [fetchBookings, fetchCatalog]);

    const filtered = useMemo(() => {
        if (tab === "All") return bookings;
        if (tab === "Approved") return bookings.filter((b) => ["Approved", "Dispatched"].includes(b.booking_status));
        if (tab === "In-Progress") return bookings.filter((b) => b.booking_status === "In-Progress");
        if (tab === "Completed") return bookings.filter((b) => ["Partially Completed", "Completed"].includes(b.booking_status));
        if (tab === "Cancelled") return bookings.filter((b) => b.booking_status === "Cancelled");
        return bookings;
    }, [bookings, tab]);

    // Categorize worker inventory items into Hand Tools, Power Tools, and Materials
    const categorizedCatalog = useMemo(() => {
        const search = catalogSearch.trim().toLowerCase();
        const matchesQuery = (item) =>
            !search ||
            (item.item_name || "").toLowerCase().includes(search) ||
            (item.sub_category || "").toLowerCase().includes(search) ||
            (item.serial_number || "").toLowerCase().includes(search);

        const handTools = catalog.filter(
            (item) => getItemCategoryGroup(item) === "hand_tool" && matchesQuery(item)
        );
        const powerTools = catalog.filter(
            (item) => getItemCategoryGroup(item) === "power_tool" && matchesQuery(item)
        );
        const materials = catalog.filter(
            (item) => getItemCategoryGroup(item) === "material" && matchesQuery(item)
        );

        return {
            hand_tools: handTools,
            power_tools: powerTools,
            materials: materials,
        };
    }, [catalog, catalogSearch]);

    const selectedFullItems = useMemo(() => {
        return Object.keys(selectedItemsMap)
            .filter((id) => selectedItemsMap[id]?.selected)
            .map((id) => {
                const catItem = catalog.find((c) => Number(c.item_id) === Number(id));
                const group = getItemCategoryGroup(catItem || {});
                return {
                    item_id: Number(id),
                    item_name: catItem?.item_name || `Item #${id}`,
                    item_type: catItem?.item_type || "Tool",
                    tool_subtype: catItem?.tool_subtype || "",
                    category_group: group,
                    serial_number: catItem?.serial_number || "",
                    unit: catItem?.unit || "pcs",
                    quantity_on_hand: catItem?.quantity_on_hand ?? null,
                    quantity: selectedItemsMap[id]?.quantity || 1,
                };
            });
    }, [selectedItemsMap, catalog]);

    const groupedSelectedItems = useMemo(() => {
        return {
            hand_tools: selectedFullItems.filter((i) => i.category_group === "hand_tool"),
            power_tools: selectedFullItems.filter((i) => i.category_group === "power_tool"),
            materials: selectedFullItems.filter((i) => i.category_group === "material"),
        };
    }, [selectedFullItems]);

    // Open Checklist Builder for a Job
    const openCreateChecklist = (job) => {
        if (String(job?.booking_status || "").trim().toLowerCase() === "pending") {
            addToast("Tools checklist cannot be created while booking status is pending approval.", "error");
            return;
        }

        const latestChecklist =
            (Array.isArray(job.checklists) && job.checklists.length > 0
                ? job.checklists[0]
                : job.checklist) || null;

        if (latestChecklist) {
            addToast("A checklist has already been created for this job by your team.", "error");
            return;
        }

        setBuilderBooking(job);
        setEditingChecklist(null);
        setChecklistNotes("");
        setSelectedItemsMap({});
        setCatalogSearch("");
        setActiveCategoryTab("hand_tools");
        setReviewModalOpen(false);
        setBuilderOpen(true);
    };

    const openEditChecklist = (job, checklist) => {
        if (checklist.status !== "Pending") {
            addToast("Approved checklists are locked.", "error");
            return;
        }
        setBuilderBooking(job);
        setEditingChecklist(checklist);
        setChecklistNotes(checklist.notes || "");
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
        setCatalogSearch("");
        setActiveCategoryTab("hand_tools");
        setReviewModalOpen(false);
        setBuilderOpen(true);
    };

    const toggleItemSelection = (itemOrId) => {
        const itemId = typeof itemOrId === "object" && itemOrId !== null ? itemOrId.item_id : itemOrId;
        const catalogItem =
            typeof itemOrId === "object" && itemOrId !== null
                ? itemOrId
                : catalog.find((c) => Number(c.item_id) === Number(itemId));

        if (catalogItem) {
            const statusLower = (catalogItem.status || "").toLowerCase();
            const isLost = statusLower === "lost";
            const isDamaged = ["damaged", "broken"].includes(statusLower);
            const isLostDamaged = statusLower === "lost/damaged";
            const isBorrowed = statusLower === "borrowed";
            const isOutOfStock = Number(catalogItem.quantity_on_hand) <= 0;

            if (!catalogItem.is_available || isLost || isDamaged || isLostDamaged || isBorrowed || isOutOfStock) {
                const reason = isLost
                    ? "marked as lost"
                    : isDamaged
                    ? "damaged or broken"
                    : isLostDamaged
                    ? "lost or damaged"
                    : isBorrowed
                    ? "in use / borrowed"
                    : "out of stock";
                addToast(`"${catalogItem.item_name}" is ${reason}.`, "error");
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
        if (qty === "" || qty === null || qty === undefined) {
            setSelectedItemsMap((prev) => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    quantity: "",
                },
            }));
            return;
        }
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

    const decrementItemQuantity = (itemId) => {
        setSelectedItemsMap((prev) => {
            const current = prev[itemId];
            if (!current) return prev;
            const currentQty = parseInt(current.quantity, 10) || 1;
            const newQty = Math.max(1, currentQty - 1);
            return {
                ...prev,
                [itemId]: {
                    ...current,
                    quantity: newQty,
                },
            };
        });
    };

    const incrementItemQuantity = (itemId, maxStock) => {
        setSelectedItemsMap((prev) => {
            const current = prev[itemId];
            if (!current) return prev;
            const currentQty = parseInt(current.quantity, 10) || 1;
            const max = maxStock ? parseInt(maxStock, 10) : 999;
            const newQty = Math.min(max, currentQty + 1);
            return {
                ...prev,
                [itemId]: {
                    ...current,
                    quantity: newQty,
                },
            };
        });
    };

    // Step 1: Validate & Open Review Modal
    const handleOpenReviewModal = () => {
        if (!builderBooking?.booking_id) {
            addToast("No job selected.", "error");
            return;
        }
        if (selectedFullItems.length === 0) {
            addToast("Please select at least one tool or material.", "error");
            return;
        }

        for (const it of selectedFullItems) {
            const catItem = catalog.find((c) => Number(c.item_id) === Number(it.item_id));
            if (catItem) {
                const statusLower = (catItem.status || "").toLowerCase();
                const isLost = statusLower === "lost";
                const isDamaged = ["damaged", "broken"].includes(statusLower);
                const isLostDamaged = statusLower === "lost/damaged";
                const isBorrowed = statusLower === "borrowed";
                const isOutOfStock = Number(catItem.quantity_on_hand) <= 0;
                if (!catItem.is_available || isLost || isDamaged || isLostDamaged || isBorrowed || isOutOfStock) {
                    const reason = isLost
                        ? "marked as lost"
                        : isDamaged
                        ? "damaged or broken"
                        : isLostDamaged
                        ? "lost or damaged"
                        : isBorrowed
                        ? "currently in use"
                        : "currently unavailable";
                    addToast(`Cannot submit checklist: "${catItem.item_name}" is ${reason}. Please remove it.`, "error");
                    return;
                }
            }
        }

        setReviewModalOpen(true);
    };

    // Step 2: Confirm Submit from Review Modal
    const handleConfirmSubmitChecklist = async () => {
        if (!builderBooking?.booking_id || savingChecklist) return;

        const itemsPayload = selectedFullItems.map((it) => ({
            item_id: Number(it.item_id),
            quantity: Math.max(1, Number(it.quantity) || 1),
            notes: selectedItemsMap[it.item_id]?.notes || null,
        }));

        setSavingChecklist(true);
        try {
            if (editingChecklist) {
                const url = TECHNICIAN_ENDPOINTS.updateChecklist(editingChecklist.checklist_id);
                const { data } = await window.axios.patch(url, {
                    notes: checklistNotes,
                    items: itemsPayload,
                });
                addToast(data?.message || "Checklist updated.");
            } else {
                const url = TECHNICIAN_ENDPOINTS.storeChecklist;
                const { data } = await window.axios.post(url, {
                    booking_id: Number(builderBooking.booking_id),
                    notes: checklistNotes,
                    items: itemsPayload,
                });
                addToast(data?.message || "Checklist submitted to Tools Man.");
            }

            setReviewModalOpen(false);
            setBuilderOpen(false);
            setBuilderBooking(null);
            setEditingChecklist(null);
            await fetchBookings(false);
            await fetchCatalog();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to submit checklist."), "error");
        } finally {
            setSavingChecklist(false);
        }
    };

    // Handle Tool Return Status Update from View Checklist Modal
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
                    ? "Tool marked as returned."
                    : `Tool marked as ${newStatus}.`
            );
            await fetchBookings(false);
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
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update tool status."), "error");
        } finally {
            setUpdatingToolItemId(null);
        }
    };

    const handleReturnMaterialQty = async (checklistId, item, newQty) => {
        if (returningMaterialId) return;
        const maxQty = Number(item.quantity_approved ?? item.quantity_requested ?? 1);
        const qty = Math.max(0, Math.min(maxQty, parseInt(newQty, 10) || 0));
        setReturningMaterialId(item.id);
        try {
            const { data } = await window.axios.post(
                TECHNICIAN_ENDPOINTS.returnChecklistMaterial(checklistId, item.id),
                { quantity_returned: qty }
            );
            addToast(data?.message || `Updated returned quantity for ${item.item_name}.`);
            if (data?.data) {
                setViewChecklistModal((prev) =>
                    prev && prev.checklist_id === checklistId
                        ? { ...prev, ...data.data, client_name: prev.client_name, service_name: prev.service_name }
                        : prev
                );
            }
            await fetchBookings(false);
            await fetchCatalog();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to return material quantity."), "error");
        } finally {
            setReturningMaterialId(null);
        }
    };

    const handleReportFailedBooking = async () => {
        if (!failedModal || reportingFailed) return;
        if (failedReason.trim().length < 5) {
            addToast("Please enter the reason for the failed booking (at least 5 characters).", "error");
            return;
        }
        setReportingFailed(true);
        try {
            const { data } = await window.axios.post(
                TECHNICIAN_ENDPOINTS.reportFailedBooking(failedModal.booking_id),
                { reason: failedReason.trim() }
            );
            addToast(data?.message || "Failed booking report submitted for Manager review.");
            setFailedModal(null);
            setFailedReason("");
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to submit failed booking report."), "error");
        } finally {
            setReportingFailed(false);
        }
    };

    const openOcularResultModal = (job, readOnly = false) => {
        if (!job) return;
        const existingResult = job.technician_ocular_result || {};
        const latestChecklist =
            (Array.isArray(job.checklists) && job.checklists.length > 0 ? job.checklists[0] : job.checklist) || null;
        const defaultStage =
            job.booking_status === "In-Progress" ||
            latestChecklist?.status === "Completed" ||
            existingResult.last_submitted_stage === "before"
                ? "after"
                : "before";

        const existingRooms = Array.isArray(job.ocular_rooms) && job.ocular_rooms.length > 0
            ? job.ocular_rooms.map((rm, idx) => ({
                  room_id: rm.room_id || null,
                  room_name: rm.room_name || `Room ${idx + 1}`,
                  unit_of_measurement: rm.unit_of_measurement || "Meters",
                  room_length: String(rm.room_length ?? ""),
                  room_width: String(rm.room_width ?? ""),
                  ceiling_height: String(rm.ceiling_height ?? "2.7"),
                  room_category: rm.room_category || "Bedroom",
                  sun_exposure_level: rm.sun_exposure_level || "Moderate",
                  maximum_occupancy: String(rm.maximum_occupancy ?? "2"),
                  window_size_glazing: rm.window_size_glazing || "Medium",
                  heat_generating_equipment: String(rm.heat_generating_equipment ?? "0"),
              }))
            : [createDefaultOcularRoom(1)];

        setOcularModalJob(job);
        setOcularReadOnly(readOnly);
        setOcularStage(defaultStage);
        setOcularRooms(existingRooms);
        setOcularTechNotes(existingResult.technician_notes || "");
        const existingTaskNote = existingResult.after_notes || existingResult.before_notes || "";
        const existingTaskAttachmentUrl = formatStorageUrl(existingResult.after_photo_url || existingResult.before_photo_url || "");
        setOcularBeforeNotes(existingTaskNote);
        setOcularAfterNotes("");
        setOcularBeforePhoto(null);
        setOcularBeforePreview(existingTaskAttachmentUrl);
        setOcularAfterPhoto(null);
        setOcularAfterPreview("");
        setOcularFormError("");
    };

    const handleSubmitOcularResult = async (e) => {
        e.preventDefault();
        if (!ocularModalJob || ocularSubmitting || ocularReadOnly) return;
        setOcularFormError("");

        const formEl = e.currentTarget;
        if (typeof formEl.checkValidity === "function" && !formEl.checkValidity()) {
            const firstInvalid = formEl.querySelector(":invalid");
            if (firstInvalid && typeof firstInvalid.focus === "function") {
                firstInvalid.focus();
            }
            setOcularFormError("Please complete the highlighted required room measurements.");
            return;
        }

        if (!Array.isArray(ocularRooms) || ocularRooms.length === 0) {
            setOcularFormError("Please add at least one inspected room.");
            return;
        }

        const sanitizedRooms = ocularRooms.map((rm, idx) => ({
            room_id: rm.room_id || null,
            room_name: (rm.room_name || "").trim() || `Room ${idx + 1}`,
            unit_of_measurement: rm.unit_of_measurement || "Meters",
            room_length: parseFloat(rm.room_length),
            room_width: parseFloat(rm.room_width),
            ceiling_height: parseFloat(rm.ceiling_height) || 2.7,
            room_category: (rm.room_category || "").trim() || "Bedroom",
            sun_exposure_level: rm.sun_exposure_level || "Moderate",
            maximum_occupancy: Math.max(1, parseInt(rm.maximum_occupancy, 10) || 1),
            window_size_glazing: rm.window_size_glazing || "Medium",
            heat_generating_equipment: Math.max(0, parseInt(rm.heat_generating_equipment, 10) || 0),
        }));

        setOcularSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("submission_stage", ocularStage);
            fd.append("rooms", JSON.stringify(sanitizedRooms));
            if (ocularTechNotes.trim()) fd.append("technician_notes", ocularTechNotes.trim());
            if (ocularBeforeNotes.trim()) {
                fd.append(ocularStage === "after" ? "after_notes" : "before_notes", ocularBeforeNotes.trim());
            }
            if (ocularBeforePhoto) {
                fd.append(ocularStage === "after" ? "after_photo" : "before_photo", ocularBeforePhoto);
            }

            const { data } = await window.axios.post(
                TECHNICIAN_ENDPOINTS.submitOcularResult(ocularModalJob.booking_id),
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            addToast(data?.message || "Ocular inspection result sent to Admin Assistant.");
            setOcularModalJob(null);
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            const msg = extractErrorMessage(error, "Unable to submit ocular inspection result.");
            setOcularFormError(msg);
            addToast(msg, "error");
        } finally {
            setOcularSubmitting(false);
        }
    };

    // Handle Complete Job (Collect Payment & Turn Over to Manager)
    const handleCompleteJob = async () => {
        if (!completeModal || completing) return;
        if (!reportForm.diagnosis.trim() || !reportForm.work_done.trim()) {
            addToast("Please provide diagnosis findings and work performed.", "error");
            return;
        }
        const totalSvcPrice = Number(reportForm.total_service_price);
        const isFeeWaived = Boolean(
            completeModal?.service_details?.booking_fee_waived ||
            completeModal?.item_order ||
            Number(completeModal?.payment_turnover?.reservation_down_payment) === 0
        );
        const reservationDownPayment = isFeeWaived
            ? 0
            : Number(completeModal?.payment_turnover?.reservation_down_payment ?? (completeModal?.service?.booking_fee ?? 50));
        if (!Number.isFinite(totalSvcPrice) || totalSvcPrice < reservationDownPayment) {
            addToast(`Please enter a valid total service fee (minimum ₱${reservationDownPayment.toFixed(2)}).`, "error");
            return;
        }
        if (reportForm.payment_method === "GCash") {
            const cleanRef = (reportForm.reference_number || "").trim();
            if (!/^\d{1,13}$/.test(cleanRef)) {
                addToast("Please enter a valid numeric GCash reference number (maximum 13 digits).", "error");
                return;
            }
        }
        if (!reportForm.proof_image && !reportForm.proof_image_preview) {
            addToast("Please upload a picture for proof.", "error");
            return;
        }
        setCompleting(true);
        try {
            const fd = new FormData();
            fd.append("diagnosis", reportForm.diagnosis.trim());
            fd.append("work_done", reportForm.work_done.trim());
            if (reportForm.parts_replaced?.trim()) fd.append("parts_replaced", reportForm.parts_replaced.trim());
            if (reportForm.ac_brand?.trim()) fd.append("ac_brand", reportForm.ac_brand.trim());
            if (reportForm.ac_type) fd.append("ac_type", reportForm.ac_type);
            if (reportForm.unit_serial_number?.trim()) fd.append("unit_serial_number", reportForm.unit_serial_number.trim());
            fd.append("payment_method", reportForm.payment_method);
            fd.append("total_service_price", String(totalSvcPrice));
            if (completeModal.ac_unit_order) {
                fd.append("delivery_fee", String(Math.max(0, Number(reportForm.delivery_fee || 0))));
            }
            if ((reportForm.payment_method === "GCash" || reportForm.payment_method === "Bank Transfer") && reportForm.reference_number?.trim()) {
                fd.append("reference_number", reportForm.reference_number.trim());
            }
            if (reportForm.proof_image) {
                fd.append("proof_image", reportForm.proof_image);
            }

            const { data } = await window.axios.post(
                TECHNICIAN_ENDPOINTS.completeJob(completeModal.booking_id),
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            addToast(data?.message || "Service report and payment turnover submitted to Manager!");
            setCompleteModal(null);
            setReportForm({
                diagnosis: "",
                work_done: "Installation",
                parts_replaced: "",
                ac_brand: "",
                ac_type: "Split",
                unit_serial_number: "",
                payment_method: "Cash",
                total_service_price: "",
                delivery_fee: "",
                reference_number: "",
                proof_image: null,
                proof_image_preview: "",
            });
            await fetchBookings(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to submit service report and payment turnover."), "error");
        } finally {
            setCompleting(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // CHECKLIST BUILDER VIEW (Integrated inside My Jobs and Checklist)
    // ══════════════════════════════════════════════════════════════════
    if (builderOpen && builderBooking) {
        const isBuilderOcular = Boolean(
            builderBooking.is_ocular_inspection ||
                Number(builderBooking.service_id) === 4 ||
                String(builderBooking.service || "").toLowerCase().includes("ocular")
        );
        const activeCategoryItems = categorizedCatalog[activeCategoryTab] || [];

        return (
            <div style={{ animation: "fadeInUp 0.25s ease" }}>
                <div className="page-header" style={{ marginBottom: 16 }}>
                    <div>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ marginBottom: 8, padding: "5px 12px", fontSize: 12 }}
                            onClick={() => !savingChecklist && setBuilderOpen(false)}
                        >
                            ← Back to My Jobs and Checklist
                        </button>
                        <h1 className="page-title font-display" style={{ margin: 0 }}>
                            {editingChecklist ? `Edit Checklist #${editingChecklist.checklist_id}` : "Create Checklist"}
                        </h1>
                        <p className="page-subtitle" style={{ marginTop: 2 }}>
                            Booking #{builderBooking.booking_id} · {builderBooking.client_name} — {builderBooking.service}
                            {isBuilderOcular && " (Tools Only — Materials Excluded)"}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={savingChecklist}
                            onClick={() => setBuilderOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={savingChecklist || selectedFullItems.length === 0}
                            onClick={handleOpenReviewModal}
                        >
                            Review Checklist ({selectedFullItems.length})
                        </button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 310px", gap: 18, alignItems: "start" }}>
                    {/* Left: Categorized Items (Hand Tools, Power Tools, Materials) */}
                    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                            <div style={{ display: "flex", gap: 6, background: "#F1F5F9", padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
                                {[
                                    {
                                        key: "hand_tools",
                                        label: "Hand Tools",
                                        count: categorizedCatalog.hand_tools.length,
                                        selectedCount: groupedSelectedItems.hand_tools.length,
                                        badgeBg: "#EAF2FF",
                                        badgeColor: "#2563EB",
                                    },
                                    {
                                        key: "power_tools",
                                        label: "Power Tools",
                                        count: categorizedCatalog.power_tools.length,
                                        selectedCount: groupedSelectedItems.power_tools.length,
                                        badgeBg: "#EAF2FF",
                                        badgeColor: "#10213F",
                                    },
                                    ...(!isBuilderOcular
                                        ? [
                                              {
                                                  key: "materials",
                                                  label: "Materials",
                                                  count: categorizedCatalog.materials.length,
                                                  selectedCount: groupedSelectedItems.materials.length,
                                                  badgeBg: "#FEF3C7",
                                                  badgeColor: "#B45309",
                                              },
                                          ]
                                        : []),
                                ].map((cat) => {
                                    const isActive = activeCategoryTab === cat.key;
                                    return (
                                        <button
                                            key={cat.key}
                                            type="button"
                                            onClick={() => setActiveCategoryTab(cat.key)}
                                            style={{
                                                padding: "8px 14px",
                                                borderRadius: 8,
                                                border: isActive ? "1px solid #3B82F6" : "1px solid transparent",
                                                background: isActive ? "#FFFFFF" : "transparent",
                                                color: isActive ? "#1E2F5F" : "#64748B",
                                                fontWeight: 700,
                                                fontSize: 12,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                boxShadow: isActive ? "0 1px 4px rgba(15,23,42,0.06)" : "none",
                                            }}
                                        >
                                            <span>{cat.label}</span>
                                            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 9999, background: cat.badgeBg, color: cat.badgeColor }}>
                                                {cat.selectedCount > 0 ? `${cat.selectedCount} / ${cat.count}` : cat.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <input
                                type="text"
                                placeholder="Search item..."
                                className="input-field"
                                style={{ maxWidth: 230, padding: "7px 12px", fontSize: 12 }}
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                            />
                        </div>

                        {activeCategoryItems.length === 0 ? (
                            <div style={{ padding: 32, textAlign: "center", background: "#F8FAFC", borderRadius: 10, color: "#94A3B8", fontSize: 13 }}>
                                No items found in this category.
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                                {activeCategoryItems.map((item) => {
                                    const entry = selectedItemsMap[item.item_id];
                                    const isSelected = !!entry?.selected;
                                    const qty = entry?.quantity || 1;

                                    const statusLower = (item.status || "").toLowerCase();
                                    const isLost = statusLower === "lost";
                                    const isDamaged = ["damaged", "broken"].includes(statusLower);
                                    const isLostDamaged = statusLower === "lost/damaged";
                                    const isBorrowed = statusLower === "borrowed";
                                    const isOutOfStock = Number(item.quantity_on_hand) <= 0;
                                    const isUnavailable = !item.is_available || isLost || isDamaged || isLostDamaged || isBorrowed || isOutOfStock;
                                    const isPowerTool = getItemCategoryGroup(item) === "power_tool";

                                    return (
                                        <div
                                            key={item.item_id}
                                            onClick={() => !isUnavailable && toggleItemSelection(item)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                background: isUnavailable ? "#F8FAFC" : isSelected ? "#EFF6FF" : "#FFFFFF",
                                                border: `1px solid ${isUnavailable ? "#E2E8F0" : isSelected ? "#3B82F6" : "#E5E7EB"}`,
                                                gap: 10,
                                                cursor: isUnavailable ? "not-allowed" : "pointer",
                                                opacity: isUnavailable ? 0.6 : 1,
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected && !isUnavailable}
                                                    disabled={isUnavailable}
                                                    onChange={() => {}}
                                                    style={{ width: 15, height: 15, cursor: isUnavailable ? "not-allowed" : "pointer", flexShrink: 0 }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: "#1E2F5F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {item.item_name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                        {item.serial_number && <span>S/N: {item.serial_number}</span>}
                                                        {isUnavailable ? (
                                                            <span style={{ color: isLost ? "#D97706" : "#DC2626", fontWeight: 600 }}>
                                                                {isLost
                                                                    ? "Lost"
                                                                    : isDamaged
                                                                    ? "Damaged"
                                                                    : isLostDamaged
                                                                    ? "Lost / Damaged"
                                                                    : isBorrowed || isPowerTool
                                                                    ? "In Use"
                                                                    : "Out of Stock"}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "#059669", fontWeight: 600 }}>
                                                                {isPowerTool
                                                                    ? "Available"
                                                                    : `Avail: ${item.quantity_on_hand} ${item.unit || "pcs"}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && !isUnavailable && isPowerTool && (
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", background: "#DBEAFE", padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                                                    1 {item.unit || "unit"}
                                                </span>
                                            )}

                                            {isSelected && !isUnavailable && !isPowerTool && (
                                                <div
                                                    style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => decrementItemQuantity(item.item_id)}
                                                        disabled={Number(qty) <= 1}
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 6,
                                                            border: "1px solid #CBD5E1",
                                                            background: Number(qty) <= 1 ? "#F1F5F9" : "#FFFFFF",
                                                            color: Number(qty) <= 1 ? "#94A3B8" : "#1E2F5F",
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            cursor: Number(qty) <= 1 ? "not-allowed" : "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        title="Reduce quantity"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={item.quantity_on_hand || 99}
                                                        value={qty}
                                                        className="input-field"
                                                        style={{ width: 44, padding: "2px 4px", fontSize: 12, textAlign: "center" }}
                                                        onChange={(e) => updateItemQuantity(item.item_id, e.target.value, item.quantity_on_hand)}
                                                        onBlur={() => {
                                                            if (!qty || Number(qty) < 1) updateItemQuantity(item.item_id, 1, item.quantity_on_hand);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => incrementItemQuantity(item.item_id, item.quantity_on_hand)}
                                                        disabled={item.quantity_on_hand && Number(qty) >= Number(item.quantity_on_hand)}
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 6,
                                                            border: "1px solid #CBD5E1",
                                                            background: item.quantity_on_hand && Number(qty) >= Number(item.quantity_on_hand) ? "#F1F5F9" : "#FFFFFF",
                                                            color: item.quantity_on_hand && Number(qty) >= Number(item.quantity_on_hand) ? "#94A3B8" : "#1E2F5F",
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            cursor: item.quantity_on_hand && Number(qty) >= Number(item.quantity_on_hand) ? "not-allowed" : "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: 0,
                                                        }}
                                                        title="Increase quantity"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Selected Items Summary by Category */}
                    <div className="card" style={{ padding: 18, position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1E2F5F" }}>
                                Selected Items ({selectedFullItems.length})
                            </h3>
                            {selectedFullItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedItemsMap({})}
                                    style={{ background: "none", border: "none", fontSize: 11, color: "#DC2626", cursor: "pointer", fontWeight: 600 }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {selectedFullItems.length === 0 ? (
                            <div style={{ padding: "18px 12px", textAlign: "center", background: "#F8FAFC", borderRadius: 8, color: "#94A3B8", fontSize: 12 }}>
                                {isBuilderOcular
                                    ? "Select Hand Tools or Power Tools from the list (Materials excluded for Ocular Inspection)."
                                    : "Select Hand Tools, Power Tools, or Materials from the list."}
                            </div>
                        ) : (
                            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                                {[
                                    { key: "hand_tools", label: "Hand Tools", color: "#2563EB", bg: "#EAF2FF" },
                                    { key: "power_tools", label: "Power Tools", color: "#10213F", bg: "#F4F7FB" },
                                    ...(!isBuilderOcular
                                        ? [{ key: "materials", label: "Materials", color: "#B45309", bg: "#FFFBEB" }]
                                        : []),
                                ].map((group) => {
                                    const list = groupedSelectedItems[group.key] || [];
                                    if (list.length === 0) return null;
                                    return (
                                        <div key={group.key}>
                                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: group.color, marginBottom: 4 }}>
                                                {group.label} ({list.length})
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                {list.map((it) => (
                                                    <div
                                                        key={it.item_id}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            padding: "6px 8px",
                                                            background: group.bg,
                                                            borderRadius: 8,
                                                            fontSize: 12,
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontWeight: 600, color: "#1E2F5F", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {it.item_name}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: "#64748B" }}>
                                                                {it.category_group === "power_tool"
                                                                    ? (it.serial_number ? `S/N: ${it.serial_number}` : "Individual Unit")
                                                                    : `Avail: ${it.quantity_on_hand} ${it.unit || "pcs"}`}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                                                            {it.category_group === "power_tool" ? (
                                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", background: "#DBEAFE", padding: "2px 7px", borderRadius: 5 }}>
                                                                    1 {it.unit || "unit"}
                                                                </span>
                                                            ) : (
                                                                <>
                                                            <button
                                                                type="button"
                                                                onClick={() => decrementItemQuantity(it.item_id)}
                                                                disabled={Number(it.quantity) <= 1}
                                                                style={{
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: 5,
                                                                    border: "1px solid #CBD5E1",
                                                                    background: Number(it.quantity) <= 1 ? "#F1F5F9" : "#FFFFFF",
                                                                    color: Number(it.quantity) <= 1 ? "#94A3B8" : "#1E2F5F",
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    cursor: Number(it.quantity) <= 1 ? "not-allowed" : "pointer",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    padding: 0,
                                                                }}
                                                                title="Reduce quantity"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={it.quantity_on_hand || 99}
                                                                value={it.quantity}
                                                                style={{ width: 38, padding: "2px 2px", fontSize: 11, textAlign: "center", border: "1px solid #CBD5E1", borderRadius: 5, background: "#fff" }}
                                                                onChange={(e) => updateItemQuantity(it.item_id, e.target.value, it.quantity_on_hand)}
                                                                onBlur={() => {
                                                                    if (!it.quantity || Number(it.quantity) < 1) updateItemQuantity(it.item_id, 1, it.quantity_on_hand);
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => incrementItemQuantity(it.item_id, it.quantity_on_hand)}
                                                                disabled={it.quantity_on_hand && Number(it.quantity) >= Number(it.quantity_on_hand)}
                                                                style={{
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: 5,
                                                                    border: "1px solid #CBD5E1",
                                                                    background: it.quantity_on_hand && Number(it.quantity) >= Number(it.quantity_on_hand) ? "#F1F5F9" : "#FFFFFF",
                                                                    color: it.quantity_on_hand && Number(it.quantity) >= Number(it.quantity_on_hand) ? "#94A3B8" : "#1E2F5F",
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    cursor: it.quantity_on_hand && Number(it.quantity) >= Number(it.quantity_on_hand) ? "not-allowed" : "pointer",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    padding: 0,
                                                                }}
                                                                title="Increase quantity"
                                                            >
                                                                +
                                                            </button>
                                                                </>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleItemSelection(it.item_id)}
                                                                style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 13, fontWeight: 700, marginLeft: 2, padding: "2px 4px" }}
                                                                title="Remove item"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div>
                            <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                className="input-field"
                                rows={2}
                                placeholder="Optional notes for Tools Man..."
                                value={checklistNotes}
                                onChange={(e) => setChecklistNotes(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            className="btn-primary"
                            style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}
                            disabled={savingChecklist || selectedFullItems.length === 0}
                            onClick={handleOpenReviewModal}
                        >
                            Review Checklist
                        </button>
                    </div>
                </div>

                {/* ── REVIEW MODAL (Submit or Cancel) ── */}
                <Modal
                    open={reviewModalOpen}
                    title="Review Checklist"
                    message={`Booking #${builderBooking.booking_id} · ${builderBooking.client_name} (${builderBooking.service})`}
                    confirmLabel={savingChecklist ? "Submitting..." : "Submit"}
                    cancelLabel="Cancel"
                    maxWidth={560}
                    onConfirm={handleConfirmSubmitChecklist}
                    onCancel={() => !savingChecklist && setReviewModalOpen(false)}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                            { key: "hand_tools", label: "Hand Tools", color: "#2563EB", bg: "#EAF2FF", border: "#C7DDFD" },
                            { key: "power_tools", label: "Power Tools", color: "#10213F", bg: "#F4F7FB", border: "#E2E8F0" },
                            ...(!isBuilderOcular
                                ? [{ key: "materials", label: "Materials", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" }]
                                : []),
                        ].map((sec) => {
                            const items = groupedSelectedItems[sec.key] || [];
                            return (
                                <div
                                    key={sec.key}
                                    style={{
                                        border: `1px solid ${sec.border}`,
                                        background: sec.bg,
                                        borderRadius: 10,
                                        padding: "10px 12px",
                                    }}
                                >
                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: sec.color, marginBottom: 6 }}>
                                        {sec.label} ({items.length})
                                    </div>
                                    {items.length === 0 ? (
                                        <div style={{ fontSize: 12, color: "#94A3B8" }}>None selected</div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            {items.map((it) => (
                                                <div
                                                    key={it.item_id}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        background: "#FFFFFF",
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600, color: "#1E2F5F" }}>
                                                        {it.item_name}
                                                        {it.serial_number ? ` (S/N: ${it.serial_number})` : ""}
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: sec.color }}>
                                                        {it.quantity} {it.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {checklistNotes.trim() && (
                            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#475569" }}>
                                <strong>Note:</strong> {checklistNotes}
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // MAIN VIEW: MY JOBS AND CHECKLIST
    // ══════════════════════════════════════════════════════════════════
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">My Jobs and Checklist</h1>
                    <p className="page-subtitle">
                        Manage assigned jobs, request tools &amp; materials checklists, and submit service reports.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn-secondary" onClick={() => { fetchBookings(); fetchCatalog(); }}>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="tab-bar" style={{ marginBottom: 20, display: "inline-flex" }}>
                {tabs.map((t) => {
                    const count =
                        t === "All"
                            ? bookings.length
                            : t === "Approved"
                            ? bookings.filter((b) => ["Approved", "Dispatched"].includes(b.booking_status)).length
                            : t === "In-Progress"
                            ? bookings.filter((b) => b.booking_status === "In-Progress").length
                            : t === "Completed"
                            ? bookings.filter((b) => ["Partially Completed", "Completed"].includes(b.booking_status)).length
                            : bookings.filter((b) => b.booking_status === "Cancelled").length;

                    return (
                        <button
                            key={t}
                            className={`tab-item ${tab === t ? "active" : ""}`}
                            onClick={() => setTab(t)}
                        >
                            {t}
                            <span style={{ marginLeft: 6, fontSize: 10, color: tab === t ? "#3F7DFF" : "#9CA3AF" }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Jobs List */}
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
                        Loading assigned jobs...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                        No service bookings match the selected status.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {filtered.map((job) => {
                            const isAssigned = ["Approved", "Dispatched"].includes(job.booking_status);
                            const isInProgress = job.booking_status === "In-Progress";
                            const isCompleted = ["Partially Completed", "Completed"].includes(job.booking_status);
                            const isTurnoverInvalid = Boolean(
                                job.payment_turnover?.status === "Invalid" || job.payment_turnover?.is_invalid
                            );
                            const hasPaymentTurnedOver = Boolean(
                                job.payment_turnover?.status &&
                                    !isTurnoverInvalid &&
                                    (String(job.payment_turnover.status).toLowerCase().includes("turned over") ||
                                        String(job.payment_turnover.status).toLowerCase().includes("verified"))
                            );
                            const latestChecklist =
                                (Array.isArray(job.checklists) && job.checklists.length > 0
                                    ? job.checklists[0]
                                    : job.checklist) || null;
                            const isChecklistCompleted = latestChecklist?.status === "Completed";
                            const isChecklistApprovedOrCompleted = ["Approved", "Completed"].includes(latestChecklist?.status);
                            const isOcularJob = Boolean(
                                job.is_ocular_inspection ||
                                    Number(job.service_id) === 4 ||
                                    String(job.service || "").toLowerCase().includes("ocular")
                            );
                            const failedBooking = job.failed_booking || job.service_details?.failed_booking || null;
                            const failedStatus = failedBooking?.status || null;
                            const isFailedPending = failedStatus === "Pending Manager Review";
                            const isFailedInvalid = failedStatus === "Invalid";
                            const isFailedValid = failedStatus === "Valid" || job.booking_status === "Cancelled";

                            const clItems = Array.isArray(latestChecklist?.items) ? latestChecklist.items : [];
                            const handToolsCount = clItems.filter((i) => getItemCategoryGroup(i) === "hand_tool").length;
                            const powerToolsCount = clItems.filter((i) => getItemCategoryGroup(i) === "power_tool").length;
                            const materialsCount = clItems.filter((i) => getItemCategoryGroup(i) === "material").length;

                            return (
                                <div
                                    key={job.booking_id}
                                    style={{
                                        border: "1px solid #E5E7EB",
                                        borderRadius: 14,
                                        padding: 20,
                                        background: "#fff",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 14,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>
                                                    #{job.booking_id} · {job.client_name}
                                                </span>
                                                <StatusBadge status={job.booking_status} />
                                                {!isOcularJob && job.quotation_status && (
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            padding: "2px 8px",
                                                            borderRadius: 6,
                                                            border: "1px solid",
                                                            background: String(job.quotation_status).startsWith("Signed by ") || job.quotation_status === "Accepted"
                                                                ? "#F0FDF4"
                                                                : ["Declined", "Customer Refused to Sign"].includes(job.quotation_status)
                                                                ? "#FEF2F2"
                                                                : "#FFFBEB",
                                                            color: String(job.quotation_status).startsWith("Signed by ") || job.quotation_status === "Accepted"
                                                                ? "#15803D"
                                                                : ["Declined", "Customer Refused to Sign"].includes(job.quotation_status)
                                                                ? "#DC2626"
                                                                : "#B45309",
                                                            borderColor: String(job.quotation_status).startsWith("Signed by ") || job.quotation_status === "Accepted"
                                                                ? "#BBF7D0"
                                                                : ["Declined", "Customer Refused to Sign"].includes(job.quotation_status)
                                                                ? "#FECACA"
                                                                : "#FDE68A",
                                                        }}
                                                    >
                                                        Quotation: {job.quotation_status}
                                                    </span>
                                                )}
                                                {job.rating && (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                                                        <StarIcon size={12} color="#D97706" />
                                                        <span>{job.rating}.0</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4B5563" }}>
                                                <strong>Service:</strong> {job.service}
                                                {isOcularJob && (
                                                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 8px", borderRadius: 6 }}>
                                                        FREE Ocular Inspection
                                                    </span>
                                                )}
                                            </p>
                                            {isOcularJob && Array.isArray(job.ocular_personnel) && job.ocular_personnel.length > 0 && (
                                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569" }}>
                                                    <strong>Ocular Personnel:</strong>{" "}
                                                    {job.ocular_personnel
                                                        .map((p) => {
                                                            const isAdmin =
                                                                Number(p.role_id) === 3 ||
                                                                p.personnel_role === "admin_assistant" ||
                                                                String(p.role_name || p.role || "")
                                                                    .toLowerCase()
                                                                    .includes("admin");
                                                            const displayName = p.name || p.full_name || "Staff";
                                                            return `${displayName} (${isAdmin ? "Admin Asst" : "Tech"})`;
                                                        })
                                                        .join(", ")}
                                                </p>
                                            )}
                                            {job.ac_unit_order && (
                                                <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1E3A8A" }}>
                                                    <strong>Purchased AC Unit Order #{job.ac_unit_order.order_id}:</strong>{" "}
                                                    {job.ac_unit_order.brand} {job.ac_unit_order.model} ({job.ac_unit_order.horsepower} HP) ·{" "}
                                                    Remaining Unit Balance:{" "}
                                                    <strong>₱{Number(job.ac_unit_order.remaining_unit_balance || 0).toLocaleString()}</strong> ·{" "}
                                                    Delivery Fee:{" "}
                                                    <strong>₱{Number(job.ac_unit_order.delivery_fee ?? 500).toLocaleString()}</strong>
                                                </div>
                                            )}
                                            {Array.isArray(job.units_data) && job.units_data.length > 0 && (
                                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                                                    <strong>Unit:</strong>{" "}
                                                    {job.units_data.map((u, idx) => (
                                                        <span key={idx}>
                                                            {idx > 0 ? " | " : ""}
                                                            {u.brand ? `${u.brand} ` : ""}{u.unit_type || "AC"}{u.motor_type ? ` · ${u.motor_type}` : ""}{u.capacity ? ` · ${u.capacity}` : ""}
                                                        </span>
                                                    ))}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                            {isAssigned && !latestChecklist && (
                                                <button
                                                    className="btn-primary"
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        fontSize: 12,
                                                        padding: "8px 14px",
                                                        background: "#2563EB",
                                                        fontWeight: 600,
                                                    }}
                                                    onClick={() => openCreateChecklist(job)}
                                                >
                                                    <Icon d={ic.tools} size={14} /> Create Checklist
                                                </button>
                                            )}

                                            {latestChecklist && (
                                                <>
                                                    {latestChecklist.status === "Pending" && (
                                                        <button
                                                            className="btn-secondary"
                                                            style={{
                                                                fontSize: 12,
                                                                padding: "7px 12px",
                                                                borderColor: "#2563EB",
                                                                color: "#1D4ED8",
                                                                fontWeight: 600,
                                                            }}
                                                            onClick={() => openEditChecklist(job, latestChecklist)}
                                                        >
                                                            Edit Checklist
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-secondary"
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                            fontSize: 12,
                                                            padding: "7px 12px",
                                                            fontWeight: 600,
                                                        }}
                                                        onClick={() =>
                                                            setViewChecklistModal({
                                                                ...latestChecklist,
                                                                client_name: job.client_name,
                                                                service_name: job.service,
                                                            })
                                                        }
                                                    >
                                                        <ClipboardListIcon size={13} color="#1E2F5F" />
                                                        <span>View Checklist</span>
                                                    </button>
                                                </>
                                            )}

                                            {isOcularJob && job.booking_status !== "Pending" && job.booking_status !== "Cancelled" && (
                                                job.inspection_status === "Submitted" ? (
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", borderColor: "#BBF7D0", background: "#F0FDF4", color: "#15803D", fontWeight: 700 }}
                                                        onClick={() => openOcularResultModal(job, true)}
                                                    >
                                                        <Icon d={ic.fileText} size={14} /> View Ocular Result
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        disabled={!isChecklistApprovedOrCompleted}
                                                        title={
                                                            !isChecklistApprovedOrCompleted
                                                                ? "Tools & materials checklist must be approved first."
                                                                : job.technician_ocular_result
                                                                ? "Update Ocular Result"
                                                                : "Submit Ocular Result"
                                                        }
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                            fontSize: 12,
                                                            padding: "8px 14px",
                                                            background: !isChecklistApprovedOrCompleted
                                                                ? "#E5E7EB"
                                                                : job.technician_ocular_result
                                                                ? "#0F766E"
                                                                : "#1D4ED8",
                                                            color: !isChecklistApprovedOrCompleted ? "#9CA3AF" : "#FFFFFF",
                                                            cursor: isChecklistApprovedOrCompleted ? "pointer" : "not-allowed",
                                                            opacity: isChecklistApprovedOrCompleted ? 1 : 0.75,
                                                            fontWeight: 700,
                                                        }}
                                                        onClick={() => {
                                                            if (!isChecklistApprovedOrCompleted) return;
                                                            openOcularResultModal(job, false);
                                                        }}
                                                    >
                                                        <Icon d={ic.check} size={14} />
                                                        {job.technician_ocular_result ? "Update Ocular Result" : "Submit Ocular Result"}
                                                    </button>
                                                )
                                            )}

                                            {isInProgress && !isOcularJob && !hasPaymentTurnedOver && !isFailedValid && (
                                                <button
                                                    type="button"
                                                    disabled={!isChecklistCompleted || isFailedPending}
                                                    title={
                                                        isFailedPending
                                                            ? "Failed booking report submitted and awaiting Manager review."
                                                            : !isChecklistCompleted
                                                            ? "Return tools and unused materials and wait for the Tools Man to complete the checklist first."
                                                            : "Customer did not sign the quotation in person — report failed booking"
                                                    }
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        fontSize: 12,
                                                        padding: "8px 14px",
                                                        borderRadius: 10,
                                                        fontWeight: 700,
                                                        border: "1px solid #FECACA",
                                                        background: isFailedPending || !isChecklistCompleted ? "#F3F4F6" : "#FEF2F2",
                                                        color: isFailedPending || !isChecklistCompleted ? "#9CA3AF" : "#DC2626",
                                                        cursor: isChecklistCompleted && !isFailedPending ? "pointer" : "not-allowed",
                                                        opacity: isChecklistCompleted && !isFailedPending ? 1 : 0.7,
                                                    }}
                                                    onClick={() => {
                                                        if (!isChecklistCompleted) {
                                                            addToast(
                                                                "Please return all tools and unused materials and have the Tools Man complete the checklist first.",
                                                                "error"
                                                            );
                                                            return;
                                                        }
                                                        if (isFailedPending) return;
                                                        setFailedModal(job);
                                                        setFailedReason(isFailedInvalid ? (failedBooking?.reason || "") : "");
                                                    }}
                                                >
                                                    {isFailedPending ? "Failed Booking Pending Review" : "Failed Booking"}
                                                </button>
                                            )}

                                            {isInProgress && !isOcularJob && !hasPaymentTurnedOver && (
                                                <button
                                                    className="btn-primary"
                                                    disabled={!isChecklistCompleted}
                                                    title={
                                                        !isChecklistCompleted
                                                            ? "Turn Over Payment is disabled until the Tools Man completes and clears the checklist."
                                                            : isTurnoverInvalid
                                                            ? "Edit & Resubmit Turnover Payment to Manager"
                                                            : "Collect Payment & Turn Over to Manager"
                                                    }
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        fontSize: 12,
                                                        padding: "8px 14px",
                                                        background: !isChecklistCompleted
                                                            ? "#9CA3AF"
                                                            : isTurnoverInvalid
                                                            ? "#DC2626"
                                                            : "#16A34A",
                                                        cursor: isChecklistCompleted ? "pointer" : "not-allowed",
                                                        opacity: isChecklistCompleted ? 1 : 0.65,
                                                    }}
                                                    onClick={() => {
                                                        if (!isChecklistCompleted) {
                                                            addToast(
                                                                "Cannot turn over payment: The checklist must be completed by the Tools Man first.",
                                                                "error",
                                                            );
                                                            return;
                                                        }
                                                        const prevTurnover = job.payment_turnover || {};
                                                        const prevReport = job.service_report || {};
                                                        const bookingService = job.service_name || job.service?.service_name || "Installation";
                                                        const rawWorkDone = prevTurnover.work_done || prevReport.work_done || bookingService;
                                                        const matchedWorkDone = WORK_PERFORMED_SERVICES.find(
                                                            (s) => s.toLowerCase() === (rawWorkDone || "").trim().toLowerCase()
                                                        ) || (WORK_PERFORMED_SERVICES.find(
                                                            (s) => (rawWorkDone || "").toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes((rawWorkDone || "").toLowerCase())
                                                        )) || rawWorkDone || "Installation";

                                                        const rawAcType = prevTurnover.ac_type || prevReport.ac_type || job.ac_unit_order?.unit_type || job.units_data?.[0]?.unit_type || "Split";
                                                        const matchedAcType = normalizeAcType(rawAcType);

                                                        setCompleteModal(job);
                                                        setReportForm({
                                                            diagnosis: prevTurnover.diagnosis || prevReport.diagnosis || "None",
                                                            work_done: matchedWorkDone,
                                                            parts_replaced: prevTurnover.parts_replaced || prevReport.parts_replaced || (job.item_order ? `${job.item_order.quantity}x ${job.item_order.item_name}` : ""),
                                                            ac_brand: prevTurnover.ac_brand || prevReport.ac_brand || job.ac_unit_order?.brand || job.units_data?.[0]?.brand || "",
                                                            ac_type: matchedAcType,
                                                            unit_serial_number: prevReport.unit_serial_number || "",
                                                            total_service_price: String(
                                                                prevTurnover.installation_fee ??
                                                                    prevTurnover.total_service_price ??
                                                                    job.service_base_price ??
                                                                    job.total_price ??
                                                                    job.base_price ??
                                                                    1500
                                                            ),
                                                            delivery_fee: String(
                                                                prevTurnover.delivery_fee ??
                                                                    job.ac_unit_order?.delivery_fee ??
                                                                    (job.ac_unit_order ? 500 : 0)
                                                            ),
                                                            payment_method: prevTurnover.payment_method || "Cash",
                                                            reference_number: prevTurnover.reference_number || "",
                                                            proof_image: null,
                                                            proof_image_preview: formatStorageUrl(prevTurnover.proof_image_url || ""),
                                                        });
                                                    }}
                                                >
                                                    <Icon d={ic.check} size={14} />{" "}
                                                    {isTurnoverInvalid ? "Edit & Resubmit Turnover" : "Turn Over Payment"}
                                                </button>
                                            )}

                                            {isInProgress && hasPaymentTurnedOver && isChecklistCompleted && (
                                                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                                                    Awaiting Manager completion
                                                </span>
                                            )}

                                            {(isCompleted || hasPaymentTurnedOver) && job.service_report && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px" }}
                                                    onClick={() => setViewReportModal(job)}
                                                >
                                                    <Icon d={ic.fileText} size={14} /> Service Report
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location & Time details */}
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                            gap: 12,
                                            padding: "10px 14px",
                                            background: "#F8FAFC",
                                            borderRadius: 10,
                                            fontSize: 12,
                                            color: "#4B5563",
                                        }}
                                    >
                                        <div>
                                            <span style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <MapPinIcon size={12} color="#9CA3AF" />
                                                <span>Address:</span>
                                            </span>
                                            <p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1E2F5F" }}>
                                                {job.client_address || "Contact customer"}
                                            </p>
                                        </div>
                                        <div>
                                            <span style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <PhoneIcon size={12} color="#9CA3AF" />
                                                <span>Contact:</span>
                                            </span>
                                            <p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1E2F5F" }}>
                                                {job.client_contact_number || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <span style={{ color: "#9CA3AF", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <CalendarIcon size={12} color="#9CA3AF" />
                                                <span>Schedule:</span>
                                            </span>
                                            <p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1E2F5F" }}>
                                                {formatDateTime(job.scheduled_date)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Assigned Team & Checklist Status Row */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                                        {(job.lead_technician_name || job.assistant_technician_name) && (
                                            <div
                                                style={{
                                                    background: "#F8FAFC",
                                                    border: "1px solid #E2E8F0",
                                                    borderRadius: 10,
                                                    padding: "10px 12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                }}
                                            >
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <UsersIcon size={15} color="#1D4ED8" />
                                                </div>
                                                <div style={{ fontSize: 12, color: "#1E2F5F" }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#64748B" }}>
                                                        Assigned Team
                                                    </div>
                                                    <div style={{ fontWeight: 600, marginTop: 1 }}>
                                                        {job.lead_technician_name}
                                                        {job.lead_technician_id === currentUserId ? " (You)" : ""}
                                                        {job.assistant_technician_name
                                                            ? ` & ${job.assistant_technician_name}${job.assistant_technician_id === currentUserId ? " (You)" : ""}`
                                                            : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {latestChecklist && (
                                            <div
                                                style={{
                                                    background: latestChecklist.status === "Pending" ? "#FFFBEB" : "#EFF6FF",
                                                    border: `1px solid ${latestChecklist.status === "Pending" ? "#FDE68A" : "#BFDBFE"}`,
                                                    borderRadius: 10,
                                                    padding: "10px 12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 10,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F" }}>
                                                            Checklist #{latestChecklist.checklist_id}
                                                        </span>
                                                        <StatusBadge status={latestChecklist.status} />
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                                                        {latestChecklist.technician_name ? `By ${latestChecklist.technician_name} · ` : ""}
                                                        {handToolsCount} Hand · {powerToolsCount} Power · {materialsCount} Material
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: latestChecklist.status === "Pending" ? "#B45309" : "#1D4ED8" }}>
                                                    {latestChecklist.status === "Pending"
                                                        ? "Awaiting Tools Man"
                                                        : latestChecklist.status === "Approved"
                                                        ? "Tools Issued"
                                                        : "Completed"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {isOcularJob && (Array.isArray(job.ocular_rooms) && job.ocular_rooms.length > 0 || job.technician_ocular_result) && (
                                        <div
                                            style={{
                                                padding: "10px 14px",
                                                background: job.inspection_status === "Submitted" ? "#F0FDF4" : "#EFF6FF",
                                                border: `1px solid ${job.inspection_status === "Submitted" ? "#BBF7D0" : "#BFDBFE"}`,
                                                borderRadius: 10,
                                                fontSize: 12,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 6,
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                    <strong style={{ color: job.inspection_status === "Submitted" ? "#166534" : "#1E3A8A" }}>
                                                        Ocular Result
                                                    </strong>
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            padding: "2px 8px",
                                                            borderRadius: 999,
                                                            background: "#FFFFFF",
                                                            border: "1px solid #CBD5E1",
                                                            color: job.inspection_status === "Submitted" ? "#15803D" : "#1D4ED8",
                                                        }}
                                                    >
                                                        {job.inspection_status === "Submitted"
                                                            ? "Sent to Customer"
                                                            : "Sent to Admin Asst"}
                                                    </span>
                                                    {Array.isArray(job.technician_ocular_result?.stages_submitted) &&
                                                        job.technician_ocular_result.stages_submitted.map((st) => (
                                                            <span
                                                                key={st}
                                                                style={{
                                                                    fontSize: 10,
                                                                    fontWeight: 700,
                                                                    padding: "2px 7px",
                                                                    borderRadius: 6,
                                                                    background: st === "after" ? "#DCFCE7" : "#DBEAFE",
                                                                    color: st === "after" ? "#166534" : "#1E40AF",
                                                                }}
                                                            >
                                                                {st === "before" ? "Before Task" : "After Task"}
                                                            </span>
                                                        ))}
                                                </div>
                                                <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
                                                    {(job.ocular_rooms || []).length} Room(s)
                                                </span>
                                            </div>

                                            {Array.isArray(job.ocular_rooms) && job.ocular_rooms.length > 0 && (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                    {job.ocular_rooms.map((rm, idx) => (
                                                        <span
                                                            key={rm.room_id || idx}
                                                            style={{
                                                                fontSize: 11,
                                                                padding: "3px 8px",
                                                                borderRadius: 6,
                                                                background: "#FFFFFF",
                                                                border: "1px solid #E2E8F0",
                                                                color: "#1E293B",
                                                            }}
                                                        >
                                                            <strong>{rm.room_name || rm.room_category}</strong> ({rm.room_length}×{rm.room_width} {rm.unit_of_measurement}) · Est.{" "}
                                                            <strong style={{ color: "#059669" }}>{rm.estimated_hp} HP</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isTurnoverInvalid && (
                                        <div
                                            style={{
                                                padding: "10px 14px",
                                                background: "#FEF2F2",
                                                border: "1px solid #FECACA",
                                                borderRadius: 10,
                                                fontSize: 12,
                                                color: "#991B1B",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 12,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <div>
                                                <strong style={{ display: "block", color: "#DC2626" }}>
                                                    Turnover Marked Invalid by Manager
                                                </strong>
                                                <span>
                                                    Reason: {job.payment_turnover?.invalid_reason || "Please review and update your turnover details."}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {isFailedPending && (
                                        <div
                                            style={{
                                                padding: "10px 14px",
                                                background: "#FFFBEB",
                                                border: "1px solid #FDE68A",
                                                borderRadius: 10,
                                                fontSize: 12,
                                                color: "#92400E",
                                            }}
                                        >
                                            <strong style={{ display: "block", color: "#B45309" }}>
                                                Failed Booking Report — Awaiting Manager Review
                                            </strong>
                                            <span>
                                                Submitted reason: {failedBooking?.reason}
                                            </span>
                                        </div>
                                    )}

                                    {isFailedInvalid && (
                                        <div
                                            style={{
                                                padding: "10px 14px",
                                                background: "#FEF2F2",
                                                border: "1px solid #FECACA",
                                                borderRadius: 10,
                                                fontSize: 12,
                                                color: "#991B1B",
                                            }}
                                        >
                                            <strong style={{ display: "block", color: "#DC2626" }}>
                                                Notice: Invalid Failed Booking Report
                                            </strong>
                                            <span>
                                                Manager marked your failed booking report as Invalid: {failedBooking?.invalid_reason || "Please review and either follow up on customer signature & payment turnover or submit an updated failed booking reason."}
                                            </span>
                                        </div>
                                    )}

                                    {isFailedValid && (
                                        <div
                                            style={{
                                                padding: "10px 14px",
                                                background: "#F8FAFC",
                                                border: "1px solid #E2E8F0",
                                                borderRadius: 10,
                                                fontSize: 12,
                                                color: "#475569",
                                            }}
                                        >
                                            <strong style={{ display: "block", color: "#991B1B" }}>
                                                Booking Cancelled — Customer Did Not Sign Quotation
                                            </strong>
                                            <span>
                                                {job.cancellation_reason || failedBooking?.reason || "Approved by Manager. Reservation booking fee retained."}
                                            </span>
                                        </div>
                                    )}

                                    {job.feedback && (
                                        <div style={{ padding: "10px 14px", background: "#FEF3C7", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
                                            <strong>Customer Feedback{job.rating ? ` (${job.rating}/5 ★)` : ""}:</strong> &ldquo;{job.feedback}&rdquo;
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── VIEW CHECKLIST MODAL (Organized by Hand Tools, Power Tools, Materials) ── */}
            <Modal
                open={!!viewChecklistModal}
                title={`Checklist #${viewChecklistModal?.checklist_id}`}
                message={`Booking #${viewChecklistModal?.booking_id} · ${viewChecklistModal?.client_name || "Customer"} (${viewChecklistModal?.service_name || "Service"})`}
                confirmLabel="Close"
                cancelLabel={false}
                maxWidth={680}
                onConfirm={() => setViewChecklistModal(null)}
                onCancel={() => setViewChecklistModal(null)}
            >
                {viewChecklistModal && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                padding: "10px 14px",
                                borderRadius: 8,
                                fontSize: 12,
                                flexWrap: "wrap",
                                gap: 8,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span>Status:</span>
                                <StatusBadge status={viewChecklistModal.status} />
                            </div>
                            {viewChecklistModal.technician_name && (
                                <div>
                                    <span>Submitted by: </span>
                                    <strong style={{ color: "#1E2F5F" }}>{viewChecklistModal.technician_name}</strong>
                                </div>
                            )}
                        </div>

                        {[
                            { key: "hand_tool", label: "Hand Tools", color: "#2563EB", bg: "#EAF2FF", isTool: true },
                            { key: "power_tool", label: "Power Tools", color: "#10213F", bg: "#F4F7FB", isTool: true },
                            { key: "material", label: "Materials", color: "#B45309", bg: "#FFFBEB", isTool: false },
                        ].map((sec) => {
                            const items = (viewChecklistModal.items || []).filter(
                                (i) => getItemCategoryGroup(i) === sec.key
                            );
                            if (items.length === 0) return null;
                            return (
                                <div key={sec.key} style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                                    <div style={{ background: sec.bg, padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: sec.color }}>
                                        {sec.label} ({items.length})
                                    </div>
                                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "8px 10px",
                                                    background: "#F8FAFC",
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    flexWrap: "wrap",
                                                    gap: 8,
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, color: "#1E2F5F" }}>
                                                        {item.item_name}
                                                        {item.serial_number ? ` · S/N: ${item.serial_number}` : ""}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#64748B" }}>
                                                        Qty: {item.quantity_approved || item.quantity_requested} {item.unit || "pcs"}
                                                    </div>
                                                </div>

                                                {sec.isTool ? (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                        <span
                                                            style={{
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                padding: "2px 8px",
                                                                borderRadius: 6,
                                                                textTransform: "capitalize",
                                                                background:
                                                                    item.status === "assigned" ? "#DBEAFE" :
                                                                    item.status === "returned" ? "#D1FAE5" :
                                                                    item.status === "damaged" ? "#FEE2E2" :
                                                                    item.status === "lost" ? "#FEF3C7" : "#E5E7EB",
                                                                color:
                                                                    item.status === "assigned" ? "#1E40AF" :
                                                                    item.status === "returned" ? "#065F46" :
                                                                    item.status === "damaged" ? "#991B1B" :
                                                                    item.status === "lost" ? "#92400E" : "#1F2937",
                                                            }}
                                                        >
                                                            {item.status === "assigned" ? "In Use" : item.status === "damaged" ? "Damaged" : item.status === "lost" ? "Lost" : item.status === "returned" ? "Returned" : item.status}
                                                        </span>
                                                        {viewChecklistModal.status === "Approved" && (
                                                            <div style={{ display: "inline-flex", gap: 4 }}>
                                                                {[
                                                                    { key: "returned", label: "Returned", bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
                                                                    { key: "damaged", label: "Damaged", bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
                                                                    { key: "lost", label: "Lost", bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
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
                                                                        }}
                                                                    >
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                        {(() => {
                                                            const approvedQty = Number(item.quantity_approved || item.quantity_requested || 1);
                                                            const returnedQty = Number(item.quantity_returned || 0);
                                                            const usedQty = Math.max(0, approvedQty - returnedQty);
                                                            const draftVal = materialReturnQtys[item.id] !== undefined ? materialReturnQtys[item.id] : returnedQty;
                                                            return (
                                                                <>
                                                                    <span style={{ fontSize: 11, color: returnedQty > 0 ? "#15803D" : "#64748B", fontWeight: 600 }}>
                                                                        {returnedQty > 0
                                                                            ? `${returnedQty} returned · ${usedQty} used`
                                                                            : `${usedQty} consumed`}
                                                                    </span>
                                                                    {viewChecklistModal.status === "Approved" && (
                                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                max={approvedQty}
                                                                                value={draftVal}
                                                                                disabled={returningMaterialId === item.id}
                                                                                onChange={(e) =>
                                                                                    setMaterialReturnQtys((prev) => ({
                                                                                        ...prev,
                                                                                        [item.id]: Math.max(0, Math.min(approvedQty, parseInt(e.target.value || "0", 10) || 0)),
                                                                                    }))
                                                                                }
                                                                                style={{
                                                                                    width: 52,
                                                                                    padding: "3px 6px",
                                                                                    fontSize: 11,
                                                                                    fontWeight: 700,
                                                                                    borderRadius: 6,
                                                                                    border: "1px solid #CBD5E1",
                                                                                    textAlign: "center",
                                                                                }}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                disabled={returningMaterialId === item.id}
                                                                                onClick={() => handleReturnMaterialQty(viewChecklistModal.checklist_id, item, draftVal)}
                                                                                style={{
                                                                                    fontSize: 10,
                                                                                    fontWeight: 700,
                                                                                    padding: "4px 8px",
                                                                                    borderRadius: 6,
                                                                                    border: "1px solid #86EFAC",
                                                                                    background: "#F0FDF4",
                                                                                    color: "#15803D",
                                                                                    cursor: returningMaterialId === item.id ? "not-allowed" : "pointer",
                                                                                }}
                                                                            >
                                                                                {returningMaterialId === item.id ? "Saving..." : "Return Qty"}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {viewChecklistModal.notes && (
                            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "8px 12px", borderRadius: 8, fontSize: 12, color: "#475569" }}>
                                <strong>Note:</strong> {viewChecklistModal.notes}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal: Report Failed Booking (Customer Did Not Sign Quotation) */}
            {failedModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #F0F2F5", paddingBottom: 10 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#991B1B" }}>
                                    Report Failed Booking
                                </h3>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
                                    Booking #{failedModal.booking_id} · {failedModal.service} ({failedModal.client_name})
                                </p>
                            </div>
                            <button onClick={() => !reportingFailed && setFailedModal(null)} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#9CA3AF" }}>✕</button>
                        </div>

                        <p style={{ fontSize: 12, color: "#475569", margin: "0 0 12px" }}>
                            Tools and materials are verified returned. Please explain why the customer failed or refused to sign the quotation so the Manager can review and verify.
                        </p>

                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                                Reason for Failed Booking *
                            </label>
                            <textarea
                                className="input-field"
                                rows={3}
                                placeholder="e.g. Customer did not sign the quotation in person due to disagreement on service scope / price."
                                value={failedReason}
                                onChange={(e) => setFailedReason(e.target.value)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={reportingFailed}
                                onClick={() => setFailedModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={reportingFailed || failedReason.trim().length < 5}
                                onClick={handleReportFailedBooking}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: reportingFailed || failedReason.trim().length < 5 ? "#FCA5A5" : "#DC2626",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: reportingFailed || failedReason.trim().length < 5 ? "not-allowed" : "pointer",
                                }}
                            >
                                {reportingFailed ? "Submitting..." : "Submit Failed Booking"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Collect Payment, Submit Service Report & Turn Over to Manager */}
            {completeModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #F0F2F5", paddingBottom: 12 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1E2F5F" }}>
                                    Turn Over Payment &amp; Service Report
                                </h3>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
                                    Booking #{completeModal.booking_id} · {completeModal.service} for {completeModal.client_name}
                                </p>
                            </div>
                            <button onClick={() => setCompleteModal(null)} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#9CA3AF" }}>✕</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {(completeModal.payment_turnover?.status === "Invalid" || completeModal.payment_turnover?.is_invalid) && (
                                <div
                                    style={{
                                        background: "#FEF2F2",
                                        border: "1px solid #FECACA",
                                        borderRadius: 10,
                                        padding: "10px 12px",
                                        fontSize: 12,
                                        color: "#991B1B",
                                    }}
                                >
                                    <strong style={{ color: "#DC2626" }}>Invalid Reason from Manager:</strong>{" "}
                                    {completeModal.payment_turnover?.invalid_reason || "Please review and update your inputs."}
                                </div>
                            )}

                            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: completeModal.ac_unit_order ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 4 }}>
                                            {completeModal.item_order ? "Repair / Service Fee (₱) *" : "Total Service Fee (₱) *"}
                                        </label>
                                        <input
                                            type="number"
                                            min={
                                                completeModal.service_details?.booking_fee_waived || completeModal.item_order
                                                    ? 0
                                                    : Number(completeModal.payment_turnover?.reservation_down_payment ?? (completeModal.service?.booking_fee ?? 50))
                                            }
                                            step="0.01"
                                            className="input-field"
                                            value={reportForm.total_service_price}
                                            onChange={(e) => setReportForm({ ...reportForm, total_service_price: e.target.value })}
                                        />
                                    </div>
                                    {completeModal.ac_unit_order && (
                                        <div>
                                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 4 }}>
                                                Delivery Fee (₱)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="input-field"
                                                value={reportForm.delivery_fee}
                                                onChange={(e) => setReportForm({ ...reportForm, delivery_fee: e.target.value })}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 4 }}>
                                            Payment Method *
                                        </label>
                                        <select
                                            className="input-field"
                                            value={reportForm.payment_method}
                                            onChange={(e) => setReportForm({ ...reportForm, payment_method: e.target.value })}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="GCash">GCash</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>

                                {reportForm.payment_method === "GCash" && (
                                    <GcashPaymentCard variant="light" compact />
                                )}

                                {(reportForm.payment_method === "GCash" || reportForm.payment_method === "Bank Transfer") && (
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 4 }}>
                                            {reportForm.payment_method} Reference Number (Max 13 Digits) *
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={13}
                                            className="input-field"
                                            placeholder={`Enter ${reportForm.payment_method} reference number`}
                                            value={reportForm.reference_number}
                                            onChange={(e) => setReportForm({ ...reportForm, reference_number: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                                        />
                                    </div>
                                )}

                                <div style={{ background: "#FFFFFF", border: "1px solid #DCFCE7", borderRadius: 8, padding: "10px 12px", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                                    {completeModal.ac_unit_order && (
                                        <>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#1E3A8A" }}>
                                                <span>AC Unit Remaining Balance ({completeModal.ac_unit_order.brand} {completeModal.ac_unit_order.model}):</span>
                                                <strong>₱{Number(completeModal.ac_unit_order.remaining_unit_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#4B5563" }}>
                                                <span>Delivery Fee:</span>
                                                <strong>₱{Math.max(0, Number(reportForm.delivery_fee || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                            </div>
                                        </>
                                    )}
                                    {(completeModal.item_order || Number(completeModal.service_details?.spare_part_remaining_balance || 0) > 0) && (() => {
                                        const spRem = Number(
                                            completeModal.item_order?.remaining_balance ??
                                            completeModal.service_details?.spare_part_remaining_balance ??
                                            0
                                        );
                                        const spPaid = Number(
                                            completeModal.item_order?.amount_paid ??
                                            completeModal.service_details?.spare_part_paid_amount ??
                                            0
                                        );
                                        const spLabel = completeModal.item_order
                                            ? `${completeModal.item_order.quantity}x ${completeModal.item_order.item_name}`
                                            : (completeModal.service_details?.spare_part_name || "Spare Part");
                                        return (
                                            <div style={{ borderBottom: "1px dashed #DCFCE7", paddingBottom: 6, marginBottom: 2 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#1E3A8A" }}>
                                                    <span>Delivered &amp; Replaced Part ({spLabel}) Remaining Balance:</span>
                                                    <strong>₱{spRem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                </div>
                                                {spPaid > 0 && (
                                                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                                                        Customer already paid ₱{spPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} down payment via GCash
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#4B5563" }}>
                                        <span>{completeModal.item_order ? "Repair / Service Fee:" : "Total Service Price:"}</span>
                                        <strong>₱{Number(reportForm.total_service_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    {(() => {
                                        const isFeeWaived = Boolean(
                                            completeModal.service_details?.booking_fee_waived ||
                                            completeModal.item_order ||
                                            Number(completeModal.payment_turnover?.reservation_down_payment) === 0
                                        );
                                        const downPaymentAmt = isFeeWaived
                                            ? 0
                                            : Number(completeModal.payment_turnover?.reservation_down_payment ?? (completeModal.service?.booking_fee ?? 50));
                                        const sparePartRemAmt = Number(
                                            completeModal.item_order?.remaining_balance ??
                                            completeModal.service_details?.spare_part_remaining_balance ??
                                            0
                                        );
                                        return (
                                            <>
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#2563EB" }}>
                                                    <span>Less Reservation Fee:</span>
                                                    <strong>{isFeeWaived ? "₱0.00 (Waived)" : `- ₱${downPaymentAmt.toFixed(2)}`}</strong>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#15803D", fontSize: 13, fontWeight: 700, borderTop: "1px dashed #BBF7D0", paddingTop: 6, marginTop: 2 }}>
                                                    <span>Net Balance to Turn Over:</span>
                                                    <span>
                                                        ₱{(
                                                            Math.max(0, Number(reportForm.total_service_price || 0) - downPaymentAmt) +
                                                            (completeModal.ac_unit_order ? Number(completeModal.ac_unit_order.remaining_unit_balance || 0) + Math.max(0, Number(reportForm.delivery_fee || 0)) : 0) +
                                                            sparePartRemAmt
                                                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({reportForm.payment_method})
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                    Diagnosis &amp; Findings *
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={2}
                                    placeholder="Describe unit condition and findings..."
                                    value={reportForm.diagnosis}
                                    onChange={(e) => setReportForm({ ...reportForm, diagnosis: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                    Work Performed *
                                </label>
                                <select
                                    className="input-field"
                                    value={reportForm.work_done}
                                    onChange={(e) => setReportForm({ ...reportForm, work_done: e.target.value })}
                                >
                                    {WORK_PERFORMED_SERVICES.map((svc) => (
                                        <option key={svc} value={svc}>
                                            {svc}
                                        </option>
                                    ))}
                                    {!WORK_PERFORMED_SERVICES.includes(reportForm.work_done) && reportForm.work_done && (
                                        <option value={reportForm.work_done}>{reportForm.work_done}</option>
                                    )}
                                </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                        AC Brand
                                    </label>
                                    <AcBrandSelect
                                        mode="select"
                                        value={reportForm.ac_brand}
                                        onChange={(val) => setReportForm((prev) => ({ ...prev, ac_brand: val }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                        AC Type
                                    </label>
                                    <select
                                        className="input-field"
                                        value={reportForm.ac_type}
                                        onChange={(e) => setReportForm({ ...reportForm, ac_type: e.target.value })}
                                    >
                                        {COMPLETE_AC_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                        {!COMPLETE_AC_TYPES.some((t) => t.value === reportForm.ac_type) && reportForm.ac_type && (
                                            <option value={reportForm.ac_type}>{reportForm.ac_type}</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                    Parts Replaced (if any)
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Capacitor, Contactor Relay"
                                    value={reportForm.parts_replaced}
                                    onChange={(e) => setReportForm({ ...reportForm, parts_replaced: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                    Upload Proof Picture *
                                </label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                    className="input-field"
                                    style={{ padding: "8px 10px", fontSize: 12 }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        if (file) {
                                            setReportForm({
                                                ...reportForm,
                                                proof_image: file,
                                                proof_image_preview: URL.createObjectURL(file),
                                            });
                                        }
                                    }}
                                />
                                {reportForm.proof_image_preview && (
                                    <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
                                        <img
                                            src={reportForm.proof_image_preview}
                                            alt="Turnover Proof Preview"
                                            style={{
                                                maxHeight: 150,
                                                maxWidth: "100%",
                                                borderRadius: 10,
                                                border: "1px solid #E2E8F0",
                                                objectFit: "cover",
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, borderTop: "1px solid #F0F2F5", paddingTop: 14 }}>
                            <button className="btn-secondary" onClick={() => setCompleteModal(null)} disabled={completing}>
                                Cancel
                            </button>
                            <button className="btn-primary" style={{ background: "#16A34A" }} onClick={handleCompleteJob} disabled={completing}>
                                {completing ? "Submitting..." : "Submit Turnover"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: View Service Report */}
            {viewReportModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #F0F2F5", paddingBottom: 12 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1E2F5F" }}>
                                    Service Report #{viewReportModal.service_report?.report_id}
                                </h3>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
                                    Booking #{viewReportModal.booking_id} · {formatDateTime(viewReportModal.service_report?.job_completed_at)}
                                </p>
                            </div>
                            <button onClick={() => setViewReportModal(null)} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#9CA3AF" }}>✕</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
                            {viewReportModal.payment_turnover && (
                                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 12, fontSize: 12 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, color: "#166534" }}>
                                        <div>Total Fee: <strong>₱{Number(viewReportModal.payment_turnover.total_service_price || 0).toFixed(2)}</strong></div>
                                        <div>Method: <strong>{viewReportModal.payment_turnover.payment_method || "Cash"}</strong></div>
                                        {Number(viewReportModal.payment_turnover.spare_part_remaining_balance || 0) > 0 && (
                                            <div>Spare Part Balance: <strong>₱{Number(viewReportModal.payment_turnover.spare_part_remaining_balance).toFixed(2)}</strong></div>
                                        )}
                                        <div>Net Turned Over: <strong>₱{Number(viewReportModal.payment_turnover.net_collected || 0).toFixed(2)}</strong></div>
                                        {viewReportModal.payment_turnover.reference_number && (
                                            <div>Ref No.: <strong>{viewReportModal.payment_turnover.reference_number}</strong></div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div>
                                <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Diagnosis &amp; Findings:</span>
                                <p style={{ margin: "3px 0 0", color: "#1E2F5F", background: "#F8FAFC", padding: 10, borderRadius: 8 }}>
                                    {viewReportModal.service_report?.diagnosis || "—"}
                                </p>
                            </div>
                            <div>
                                <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Work Performed:</span>
                                <p style={{ margin: "3px 0 0", color: "#1E2F5F", background: "#F8FAFC", padding: 10, borderRadius: 8 }}>
                                    {viewReportModal.service_report?.work_done || "—"}
                                </p>
                            </div>
                            {(viewReportModal.service_report?.ac_brand || viewReportModal.service_report?.ac_type) && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <div>
                                        <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>AC Brand:</span>
                                        <p style={{ margin: "3px 0 0", color: "#1E2F5F", fontWeight: 600 }}>
                                            {viewReportModal.service_report?.ac_brand || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>AC Type:</span>
                                        <p style={{ margin: "3px 0 0", color: "#1E2F5F", fontWeight: 600 }}>
                                            {viewReportModal.service_report?.ac_type || "—"}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {viewReportModal.service_report?.parts_replaced && (
                                <div>
                                    <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Parts Replaced:</span>
                                    <p style={{ margin: "3px 0 0", color: "#1E2F5F" }}>
                                        {viewReportModal.service_report.parts_replaced}
                                    </p>
                                </div>
                            )}
                            {viewReportModal.payment_turnover?.proof_image_url && (
                                <div>
                                    <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Proof Picture:</span>
                                    <div style={{ marginTop: 6 }}>
                                        <img
                                            src={formatStorageUrl(viewReportModal.payment_turnover.proof_image_url)}
                                            alt="Proof of Service"
                                            style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, border: "1px solid #E2E8F0", objectFit: "cover" }}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                            <button className="btn-secondary" onClick={() => setViewReportModal(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Submit / View Ocular Inspection Result (Before & After Task) */}
            {ocularModalJob && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1E2F5F" }}>
                                    {ocularReadOnly ? "Ocular Inspection Result" : "Submit Ocular Inspection Result"}
                                </h3>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                                    Booking #{ocularModalJob.booking_id} · {ocularModalJob.client_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label="Close modal"
                                onClick={() => !ocularSubmitting && setOcularModalJob(null)}
                                style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#94A3B8" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form className="ct-user-form" onSubmit={handleSubmitOcularResult} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {ocularFormError && (
                                <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 12, fontWeight: 600 }}>
                                    {ocularFormError}
                                </div>
                            )}

                            {/* Rooms List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F" }}>
                                        Inspected Rooms ({ocularRooms.length})
                                    </span>
                                    {!ocularReadOnly && (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ padding: "5px 10px", fontSize: 11 }}
                                            onClick={() => setOcularRooms((prev) => [...prev, createDefaultOcularRoom(prev.length + 1)])}
                                        >
                                            + Add Room
                                        </button>
                                    )}
                                </div>

                                {ocularRooms.map((room, idx) => {
                                    const est = computeOcularRoomEstimate(room);
                                    return (
                                        <div
                                            key={`tech-room-${idx}`}
                                            style={{
                                                border: "1px solid #E2E8F0",
                                                borderRadius: 12,
                                                padding: 12,
                                                background: "#F8FAFC",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 10,
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F" }}>
                                                    Room #{idx + 1}
                                                </span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    {est && (
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46" }}>
                                                            Est. {est.hp} HP · {est.btu.toLocaleString()} BTU/hr
                                                        </span>
                                                    )}
                                                    {!ocularReadOnly && ocularRooms.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOcularRooms((prev) => prev.filter((_, i) => i !== idx))}
                                                            style={{ border: "none", background: "transparent", color: "#DC2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: 8 }}>
                                                <div>
                                                    <label htmlFor={`tech-room-name-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Room Name
                                                    </label>
                                                    <input
                                                        id={`tech-room-name-${idx}`}
                                                        type="text"
                                                        disabled={ocularReadOnly}
                                                        value={room.room_name}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, room_name: ev.target.value } : r))
                                                            )
                                                        }
                                                        placeholder="e.g. Living Area"
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-cat-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Type <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                                    </label>
                                                    <select
                                                        id={`tech-room-cat-${idx}`}
                                                        disabled={ocularReadOnly}
                                                        required
                                                        value={room.room_category}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, room_category: ev.target.value } : r))
                                                            )
                                                        }
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    >
                                                        {OCULAR_ROOM_CATEGORIES.map((cat) => (
                                                            <option key={cat} value={cat}>
                                                                {cat}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-unit-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Unit
                                                    </label>
                                                    <select
                                                        id={`tech-room-unit-${idx}`}
                                                        disabled={ocularReadOnly}
                                                        value={room.unit_of_measurement}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, unit_of_measurement: ev.target.value } : r))
                                                            )
                                                        }
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    >
                                                        <option value="Meters">Meters</option>
                                                        <option value="Feet">Feet</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                                <div>
                                                    <label htmlFor={`tech-room-len-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Length ({room.unit_of_measurement}) <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                                    </label>
                                                    <input
                                                        id={`tech-room-len-${idx}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="0.5"
                                                        required
                                                        disabled={ocularReadOnly}
                                                        value={room.room_length}
                                                        onChange={(ev) => {
                                                            setOcularFormError("");
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, room_length: ev.target.value } : r))
                                                            );
                                                        }}
                                                        placeholder="e.g. 4.5"
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-wid-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Width ({room.unit_of_measurement}) <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                                    </label>
                                                    <input
                                                        id={`tech-room-wid-${idx}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="0.5"
                                                        required
                                                        disabled={ocularReadOnly}
                                                        value={room.room_width}
                                                        onChange={(ev) => {
                                                            setOcularFormError("");
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, room_width: ev.target.value } : r))
                                                            );
                                                        }}
                                                        placeholder="e.g. 3.5"
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-hei-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Height ({room.unit_of_measurement}) <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                                    </label>
                                                    <input
                                                        id={`tech-room-hei-${idx}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="1"
                                                        required
                                                        disabled={ocularReadOnly}
                                                        value={room.ceiling_height}
                                                        onChange={(ev) => {
                                                            setOcularFormError("");
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, ceiling_height: ev.target.value } : r))
                                                            );
                                                        }}
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 90px", gap: 8 }}>
                                                <div>
                                                    <label htmlFor={`tech-room-sun-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Sun Exposure
                                                    </label>
                                                    <select
                                                        id={`tech-room-sun-${idx}`}
                                                        disabled={ocularReadOnly}
                                                        value={room.sun_exposure_level}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, sun_exposure_level: ev.target.value } : r))
                                                            )
                                                        }
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    >
                                                        {OCULAR_SUN_LEVELS.map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-win-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Window Size
                                                    </label>
                                                    <select
                                                        id={`tech-room-win-${idx}`}
                                                        disabled={ocularReadOnly}
                                                        value={room.window_size_glazing}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, window_size_glazing: ev.target.value } : r))
                                                            )
                                                        }
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    >
                                                        {OCULAR_WINDOW_SIZES.map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-occ-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Pax
                                                    </label>
                                                    <input
                                                        id={`tech-room-occ-${idx}`}
                                                        type="number"
                                                        min="1"
                                                        required
                                                        disabled={ocularReadOnly}
                                                        value={room.maximum_occupancy}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, maximum_occupancy: ev.target.value } : r))
                                                            )
                                                        }
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`tech-room-heat-${idx}`} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                                        Appliances
                                                    </label>
                                                    <input
                                                        id={`tech-room-heat-${idx}`}
                                                        type="number"
                                                        min="0"
                                                        required
                                                        disabled={ocularReadOnly}
                                                        value={room.heat_generating_equipment}
                                                        onChange={(ev) =>
                                                            setOcularRooms((prev) =>
                                                                prev.map((r, i) => (i === idx ? { ...r, heat_generating_equipment: ev.target.value } : r))
                                                            )
                                                        }
                                                        className="input-field"
                                                        style={{ fontSize: 12, padding: "6px 8px" }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Task Note & Attachment */}
                            <div>
                                <label htmlFor="ocular-task-notes" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                    Task Note
                                </label>
                                <input
                                    id="ocular-task-notes"
                                    type="text"
                                    disabled={ocularReadOnly}
                                    value={ocularBeforeNotes}
                                    onChange={(ev) => setOcularBeforeNotes(ev.target.value)}
                                    placeholder="Site observation or inspection note..."
                                    className="input-field"
                                    style={{ fontSize: 12, padding: "7px 10px" }}
                                />
                                {!ocularReadOnly && (
                                    <input
                                        type="file"
                                        aria-label="Task note attachment"
                                        accept="image/jpeg,image/png,image/jpg,image/webp,.pdf,.doc,.docx"
                                        style={{ marginTop: 6, fontSize: 11, width: "100%" }}
                                        onChange={(ev) => {
                                            const f = ev.target.files?.[0] || null;
                                            setOcularBeforePhoto(f);
                                            if (!f) {
                                                setOcularBeforePreview("");
                                                return;
                                            }
                                            setOcularBeforePreview(
                                                f.type?.startsWith("image/") ? URL.createObjectURL(f) : `file:${f.name}`
                                            );
                                        }}
                                    />
                                )}
                                {ocularBeforePreview && (
                                    ocularBeforePreview.startsWith("file:") ? (
                                        <div style={{ marginTop: 6, fontSize: 11, color: "#334155", fontWeight: 600 }}>
                                            Attached file: {ocularBeforePreview.slice(5)}
                                        </div>
                                    ) : /\.(pdf|docx?)($|\?)/i.test(ocularBeforePreview) ? (
                                        <a
                                            href={ocularBeforePreview}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: "#1D4ED8", fontWeight: 600, textDecoration: "underline" }}
                                        >
                                            View Attached File
                                        </a>
                                    ) : (
                                        <img
                                            src={ocularBeforePreview}
                                            alt="Task note attachment preview"
                                            style={{ marginTop: 6, maxHeight: 90, borderRadius: 8, border: "1px solid #E2E8F0", objectFit: "cover" }}
                                        />
                                    )
                                )}
                            </div>

                            <div>
                                <label htmlFor="ocular-tech-notes" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                    Recommendations / Notes for Admin Assistant (Optional)
                                </label>
                                <textarea
                                    id="ocular-tech-notes"
                                    rows={2}
                                    disabled={ocularReadOnly}
                                    value={ocularTechNotes}
                                    onChange={(ev) => setOcularTechNotes(ev.target.value)}
                                    placeholder="e.g. Suggest 1.5 HP Inverter split unit; breaker is ready..."
                                    className="input-field"
                                    style={{ fontSize: 12 }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    disabled={ocularSubmitting}
                                    onClick={() => setOcularModalJob(null)}
                                >
                                    {ocularReadOnly ? "Close" : "Cancel"}
                                </button>
                                {!ocularReadOnly && (
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={ocularSubmitting}
                                        style={{ background: "#2563EB" }}
                                    >
                                        {ocularSubmitting
                                            ? "Submitting..."
                                            : ocularModalJob.technician_ocular_result
                                            ? "Update & Send to Admin Asst"
                                            : "Submit to Admin Asst"}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
