import { useCallback, useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import AcBrandSelect from "../../Components/AcBrandSelect";
import {
    TECHNICIAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

const tabs = ["All", "Approved", "In-Progress", "Completed"];

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

    // Complete Job / Turn Over Payment Modal
    const [completeModal, setCompleteModal] = useState(null);
    const [completing, setCompleting] = useState(false);
    const [reportForm, setReportForm] = useState({
        diagnosis: "",
        work_done: "",
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
            const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
            const isBorrowed = statusLower === "borrowed";
            const isOutOfStock = Number(catalogItem.quantity_on_hand) <= 0;

            if (!catalogItem.is_available || isDamaged || isBorrowed || isOutOfStock) {
                const reason = isDamaged
                    ? "damaged or broken"
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
                const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                const isBorrowed = statusLower === "borrowed";
                const isOutOfStock = Number(catItem.quantity_on_hand) <= 0;
                if (!catItem.is_available || isDamaged || isBorrowed || isOutOfStock) {
                    addToast(`"${catItem.item_name}" is currently unavailable. Please remove it.`, "error");
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
            quantity: Number(it.quantity) || 1,
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

    // Handle Complete Job (Collect Payment & Turn Over to Manager)
    const handleCompleteJob = async () => {
        if (!completeModal || completing) return;
        if (!reportForm.diagnosis.trim() || !reportForm.work_done.trim()) {
            addToast("Please provide diagnosis findings and work performed.", "error");
            return;
        }
        const totalSvcPrice = Number(reportForm.total_service_price);
        if (!Number.isFinite(totalSvcPrice) || totalSvcPrice < 300) {
            addToast("Please enter a valid total service fee (minimum ₱300.00).", "error");
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
                work_done: "",
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
                                        badgeBg: "#DBEAFE",
                                        badgeColor: "#1D4ED8",
                                    },
                                    {
                                        key: "power_tools",
                                        label: "Power Tools",
                                        count: categorizedCatalog.power_tools.length,
                                        selectedCount: groupedSelectedItems.power_tools.length,
                                        badgeBg: "#EDE9FE",
                                        badgeColor: "#6D28D9",
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
                                    const isDamaged = ["lost/damaged", "damaged", "lost", "broken"].includes(statusLower);
                                    const isBorrowed = statusLower === "borrowed";
                                    const isOutOfStock = Number(item.quantity_on_hand) <= 0;
                                    const isUnavailable = !item.is_available || isDamaged || isBorrowed || isOutOfStock;
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
                                                            <span style={{ color: "#DC2626", fontWeight: 600 }}>
                                                                {isDamaged ? "Damaged" : isBorrowed ? "In Use" : "Out of Stock"}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "#059669", fontWeight: 600 }}>
                                                                Avail: {item.quantity_on_hand} {item.unit || "pcs"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && !isUnavailable && !isPowerTool && (
                                                <div
                                                    style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={item.quantity_on_hand || 99}
                                                        value={qty}
                                                        className="input-field"
                                                        style={{ width: 58, padding: "3px 6px", fontSize: 12, textAlign: "center" }}
                                                        onChange={(e) => updateItemQuantity(item.item_id, e.target.value, item.quantity_on_hand)}
                                                    />
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
                                    { key: "hand_tools", label: "Hand Tools", color: "#1D4ED8", bg: "#EFF6FF" },
                                    { key: "power_tools", label: "Power Tools", color: "#6D28D9", bg: "#F5F3FF" },
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
                                                            padding: "6px 10px",
                                                            background: group.bg,
                                                            borderRadius: 7,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        <div style={{ minWidth: 0 }}>
                                                            <span style={{ fontWeight: 600, color: "#1E2F5F" }}>{it.item_name}</span>
                                                            <span style={{ fontSize: 11, color: "#64748B", marginLeft: 6 }}>
                                                                × {it.quantity} {it.unit}
                                                            </span>
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
                            { key: "hand_tools", label: "Hand Tools", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
                            { key: "power_tools", label: "Power Tools", color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
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
                            : bookings.filter((b) => ["Partially Completed", "Completed"].includes(b.booking_status)).length;

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
                            const isOcularJob = Boolean(
                                job.is_ocular_inspection ||
                                    Number(job.service_id) === 4 ||
                                    String(job.service || "").toLowerCase().includes("ocular")
                            );

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
                                                        .map((p) => `${p.name} (${p.personnel_role === "admin_assistant" ? "Admin Asst" : "Tech"})`)
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
                                                        setCompleteModal(job);
                                                        setReportForm({
                                                            diagnosis: prevTurnover.diagnosis || prevReport.diagnosis || "",
                                                            work_done: prevTurnover.work_done || prevReport.work_done || "",
                                                            parts_replaced: prevTurnover.parts_replaced || prevReport.parts_replaced || "",
                                                            ac_brand: prevTurnover.ac_brand || prevReport.ac_brand || job.ac_unit_order?.brand || "",
                                                            ac_type: prevTurnover.ac_type || prevReport.ac_type || "Split",
                                                            unit_serial_number: prevReport.unit_serial_number || "",
                                                            total_service_price: String(
                                                                prevTurnover.total_service_price ||
                                                                    job.service_base_price ||
                                                                    job.total_price ||
                                                                    job.base_price ||
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
                                                            proof_image_preview: prevTurnover.proof_image_url || "",
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
                            { key: "hand_tool", label: "Hand Tools", color: "#1D4ED8", bg: "#EFF6FF", isTool: true },
                            { key: "power_tool", label: "Power Tools", color: "#6D28D9", bg: "#F5F3FF", isTool: true },
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
                                                                    item.status === "damaged" ? "#FEE2E2" : "#E5E7EB",
                                                                color:
                                                                    item.status === "assigned" ? "#1E40AF" :
                                                                    item.status === "returned" ? "#065F46" :
                                                                    item.status === "damaged" ? "#991B1B" : "#1F2937",
                                                            }}
                                                        >
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
                                                                        }}
                                                                    >
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                                                        Consumed
                                                    </span>
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
                                            Total Service Fee (₱) *
                                        </label>
                                        <input
                                            type="number"
                                            min="300"
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
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#4B5563" }}>
                                        <span>Total Service Price:</span>
                                        <strong>₱{Number(reportForm.total_service_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#2563EB" }}>
                                        <span>Less Reservation Fee:</span>
                                        <strong>- ₱300.00</strong>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#15803D", fontSize: 13, fontWeight: 700, borderTop: "1px dashed #BBF7D0", paddingTop: 6, marginTop: 2 }}>
                                        <span>Net Balance to Turn Over:</span>
                                        <span>
                                            ₱{(
                                                Math.max(0, Number(reportForm.total_service_price || 0) - 300) +
                                                (completeModal.ac_unit_order ? Number(completeModal.ac_unit_order.remaining_unit_balance || 0) + Math.max(0, Number(reportForm.delivery_fee || 0)) : 0)
                                            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({reportForm.payment_method})
                                        </span>
                                    </div>
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
                                <textarea
                                    className="input-field"
                                    rows={2}
                                    placeholder="Steps taken during service..."
                                    value={reportForm.work_done}
                                    onChange={(e) => setReportForm({ ...reportForm, work_done: e.target.value })}
                                />
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
                                        <option value="Split">Split Type</option>
                                        <option value="Window">Window Type</option>
                                        <option value="Cassette">Cassette Type</option>
                                        <option value="Floor Mounted">Floor Mounted</option>
                                        <option value="Ceiling Suspended">Ceiling Suspended</option>
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
                                            src={viewReportModal.payment_turnover.proof_image_url}
                                            alt="Proof of Service"
                                            style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, border: "1px solid #E2E8F0", objectFit: "cover" }}
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
        </div>
    );
}
