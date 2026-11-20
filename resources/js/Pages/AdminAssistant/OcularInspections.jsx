import { useState, useEffect, useCallback } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    ADMIN_ASSISTANT_ENDPOINTS,
    extractErrorMessage,
    formatStorageUrl,
} from "../../utils/superAdmin";

function normalizeSearchQuery(q) {
    return String(q || "")
        .trim()
        .toLowerCase();
}

function matchesSearchQuery(normalizedQuery, ...fields) {
    if (!normalizedQuery) return true;
    return fields.some((f) =>
        String(f || "")
            .toLowerCase()
            .includes(normalizedQuery)
    );
}

function Ic({ name, className = "w-5 h-5" }) {
    if (name === "image") {
        return (
            <svg
                className={className}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
        );
    }
    return null;
}

function SearchInput({ value, onChange, placeholder = "Search..." }) {
    return (
        <input
            type="search"
            aria-label={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="input-field text-xs py-2 px-3 w-full"
        />
    );
}

function Field({ label, required, children }) {
    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-xs font-semibold text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {children}
        </div>
    );
}

function TableSkeleton({ rows = 4 }) {
    return (
        <div className="p-6 space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="h-10 bg-gray-100 rounded-lg animate-pulse"
                />
            ))}
        </div>
    );
}

function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    danger = false,
}) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            onClose={onClose}
            onConfirm={onConfirm}
            title={title}
            message={message}
            confirmLabel={confirmText}
            cancelLabel="Cancel"
            variant={danger ? "danger" : "default"}
        />
    );
}

const ROOM_CATEGORIES = [
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

const SUN_EXPOSURE_OPTIONS = ["Heavy/West", "Moderate", "Shaded"];
const WINDOW_GLAZING_OPTIONS = ["Small", "Medium", "Large Glass Facade"];
const AC_TYPE_OPTIONS = [
    "Wall-Mounted Split",
    "Window",
    "Floor Standing",
    "Cassette",
];
const MOTOR_TYPE_OPTIONS = ["Inverter", "Non-Inverter", "Both"];

export default function OcularInspections({
    addToast,
    onDataChanged,
    endpoints,
}) {
    const ep = endpoints || ADMIN_ASSISTANT_ENDPOINTS;

    const [inspections, setInspections] = useState([]);
    const [inventoryUnits, setInventoryUnits] = useState([]);
    const [brandPriceRanges, setBrandPriceRanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterTab, setFilterTab] = useState("all");
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    // Room Modal State
    const [roomModalOpen, setRoomModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [roomSubmitting, setRoomSubmitting] = useState(false);
    const [roomForm, setRoomForm] = useState({
        room_name: "",
        unit_of_measurement: "Meters",
        room_length: "",
        room_width: "",
        ceiling_height: "2.7",
        room_category_choice: "Bedroom",
        room_category_custom: "",
        sun_exposure_level: "Moderate",
        maximum_occupancy: "2",
        window_size_glazing: "Medium",
        heat_generating_equipment: "0",
    });
    const [deleteRoomTarget, setDeleteRoomTarget] = useState(null);

    // Recommendation Modal State
    const [recModalOpen, setRecModalOpen] = useState(false);
    const [editingRec, setEditingRec] = useState(null);
    const [recSubmitting, setRecSubmitting] = useState(false);
    const [recForm, setRecForm] = useState({
        room_id: "",
        ac_unit_id: "",
        recommended_capacity: "1.5",
        recommended_ac_type: "Wall-Mounted Split",
        motor_type_recommendation: "Inverter",
        brand_recommendation: "",
        model_recommendation: "",
        unit_status: "Available",
        price_min: "",
        price_max: "",
        unit_price: "",
        notes: "",
        unit_image: null,
        unit_image_preview: null,
    });
    const [deleteRecTarget, setDeleteRecTarget] = useState(null);

    // Submit to Customer State
    const [submittingToCustomer, setSubmittingToCustomer] = useState(false);

    // Tools-Only Checklist Builder State
    const [checklistModalOpen, setChecklistModalOpen] = useState(false);
    const [catalogTools, setCatalogTools] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [checklistItems, setChecklistItems] = useState([]);
    const [checklistNotes, setChecklistNotes] = useState("");
    const [checklistSearch, setChecklistSearch] = useState("");
    const [checklistTab, setChecklistTab] = useState("hand_tool");
    const [checklistSubmitting, setChecklistSubmitting] = useState(false);
    const [updatingToolId, setUpdatingToolId] = useState(null);

    const fetchOcularInspections = useCallback(async () => {
        if (!ep.ocularInspections) return;
        setLoading(true);
        try {
            const { data: json } = await window.axios.get(ep.ocularInspections);
            setInspections(Array.isArray(json.data) ? json.data : []);
            setInventoryUnits(
                Array.isArray(json.inventory_units) ? json.inventory_units : []
            );
            setBrandPriceRanges(
                Array.isArray(json.brand_price_ranges)
                    ? json.brand_price_ranges
                    : []
            );
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to load ocular inspections."),
                "error"
            );
        } finally {
            setLoading(false);
        }
    }, [ep.ocularInspections, addToast]);

    useEffect(() => {
        fetchOcularInspections();
    }, [fetchOcularInspections]);

    const selectedInspection =
        inspections.find((b) => b.booking_id === selectedBookingId) || null;
    const isSelectedPending =
        String(selectedInspection?.booking_status || "").trim().toLowerCase() ===
        "pending";

    // ── Checklist (Tools Only) Handlers ─────────────────────────────
    const openChecklistBuilder = async (booking) => {
        if (
            String(booking?.booking_status || "")
                .trim()
                .toLowerCase() === "pending"
        ) {
            addToast?.(
                "Tools checklist cannot be created while booking status is pending approval.",
                "error"
            );
            return;
        }
        if (!ep.availableCatalog) {
            addToast?.(
                "Checklist catalog is available from Admin Assistant account.",
                "info"
            );
            return;
        }
        setChecklistModalOpen(true);
        setChecklistSearch("");
        setChecklistTab("hand_tool");
        const existing = booking.checklist;
        setChecklistNotes(existing?.notes || "");
        if (existing?.items?.length) {
            setChecklistItems(
                existing.items
                    .filter(
                        (it) =>
                            String(it.item_type || "Tool").toLowerCase() !==
                            "material"
                    )
                    .map((it) => ({
                        item_id: it.item_id,
                        tool_name: it.tool_name || it.item_name || "Tool",
                        category: it.category || it.tool_subtype || "hand_tool",
                        item_type: "Tool",
                        quantity: Number(it.quantity || it.quantity_approved || it.quantity_requested) || 1,
                        max_stock: 99,
                    }))
            );
        } else {
            setChecklistItems([]);
        }

        setCatalogLoading(true);
        try {
            const { data: json } = await window.axios.get(ep.availableCatalog);
            const raw = Array.isArray(json.data) ? json.data : [];
            // Strictly Tools Only — exclude Materials for Ocular Inspection
            const toolsOnly = raw.filter(
                (item) =>
                    String(item.item_type || "").toLowerCase() === "tool" &&
                    String(item.category || "").toLowerCase() !== "materials"
            );
            setCatalogTools(toolsOnly);
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to load tools catalog."),
                "error"
            );
        } finally {
            setCatalogLoading(false);
        }
    };

    const toggleCatalogTool = (tool) => {
        setChecklistItems((prev) => {
            const exists = prev.find((i) => i.item_id === tool.item_id);
            if (exists) {
                return prev.filter((i) => i.item_id !== tool.item_id);
            }
            return [
                ...prev,
                {
                    item_id: tool.item_id,
                    tool_name: tool.item_name,
                    category: tool.category || "hand_tool",
                    item_type: "Tool",
                    quantity: 1,
                    max_stock: Number(tool.stock_quantity) || 1,
                },
            ];
        });
    };

    const updateToolQuantity = (itemId, qty) => {
        setChecklistItems((prev) =>
            prev.map((it) =>
                it.item_id === itemId
                    ? {
                          ...it,
                          quantity: Math.max(
                              1,
                              Math.min(it.max_stock || 99, Number(qty) || 1)
                          ),
                      }
                    : it
            )
        );
    };

    const handleSaveChecklist = async (e) => {
        e.preventDefault();
        if (!selectedInspection) return;
        if (
            String(selectedInspection.booking_status || "")
                .trim()
                .toLowerCase() === "pending"
        ) {
            addToast?.(
                "Tools checklist cannot be created while booking status is pending approval.",
                "error"
            );
            return;
        }
        if (checklistItems.length === 0) {
            addToast?.("Please select at least 1 tool for the checklist.", "error");
            return;
        }
        setChecklistSubmitting(true);
        try {
            const existing = selectedInspection.checklist;
            const payload = {
                booking_id: selectedInspection.booking_id,
                notes: checklistNotes.trim() || null,
                items: checklistItems.map((it) => ({
                    item_id: it.item_id,
                    tool_name: it.tool_name,
                    category: it.category,
                    item_type: "Tool",
                    quantity: it.quantity,
                })),
            };
            if (existing?.checklist_id && existing.status === "Pending") {
                await window.axios.patch(ep.updateChecklist(existing.checklist_id), payload);
                addToast?.("Tools checklist updated.", "success");
            } else {
                await window.axios.post(ep.storeChecklist, payload);
                addToast?.(
                    "Tools checklist submitted to Tools Man for approval.",
                    "success"
                );
            }
            setChecklistModalOpen(false);
            await fetchOcularInspections();
            onDataChanged?.();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to save tools checklist."),
                "error"
            );
        } finally {
            setChecklistSubmitting(false);
        }
    };

    const handleMarkToolReturnStatus = async (
        checklistId,
        checklistItemId,
        toolStatus
    ) => {
        const updateEndpoint =
            ep.updateChecklistItemStatus || ep.updateToolStatus;
        if (!updateEndpoint) return;
        const validId = Number(checklistItemId);
        const validClId = Number(checklistId);
        if (!validId || !validClId) {
            console.warn(
                "Cannot update tool status: invalid checklistId or itemId",
                { checklistId, checklistItemId }
            );
            return;
        }
        setUpdatingToolId(validId);
        try {
            await window.axios.patch(
                updateEndpoint(validClId, validId),
                {
                    status: toolStatus,
                    tool_status: toolStatus,
                }
            );
            addToast?.(`Tool marked as ${toolStatus}.`, "success");
            await fetchOcularInspections();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to update tool status."),
                "error"
            );
        } finally {
            setUpdatingToolId(null);
        }
    };

    // ── Room Capacity Data Handlers ─────────────────────────────────
    const openAddRoomModal = () => {
        setEditingRoom(null);
        const nextIdx = (selectedInspection?.rooms?.length || 0) + 1;
        setRoomForm({
            room_name: `Room ${nextIdx}`,
            unit_of_measurement: "Meters",
            room_length: "",
            room_width: "",
            ceiling_height: "2.7",
            room_category_choice: "Bedroom",
            room_category_custom: "",
            sun_exposure_level: "Moderate",
            maximum_occupancy: "2",
            window_size_glazing: "Medium",
            heat_generating_equipment: "0",
        });
        setRoomModalOpen(true);
    };

    const openEditRoomModal = (room) => {
        setEditingRoom(room);
        const isPredefined = ROOM_CATEGORIES.slice(0, -1).includes(
            room.room_category
        );
        setRoomForm({
            room_name: room.room_name || "",
            unit_of_measurement: room.unit_of_measurement || "Meters",
            room_length: String(room.room_length ?? ""),
            room_width: String(room.room_width ?? ""),
            ceiling_height: String(room.ceiling_height ?? "2.7"),
            room_category_choice: isPredefined ? room.room_category : "Others",
            room_category_custom: isPredefined ? "" : room.room_category || "",
            sun_exposure_level: room.sun_exposure_level || "Moderate",
            maximum_occupancy: String(room.maximum_occupancy ?? "1"),
            window_size_glazing: room.window_size_glazing || "Medium",
            heat_generating_equipment: String(
                room.heat_generating_equipment ?? "0"
            ),
        });
        setRoomModalOpen(true);
    };

    const handleSaveRoom = async (e) => {
        e.preventDefault();
        if (!selectedInspection) return;
        const finalCategory =
            roomForm.room_category_choice === "Others"
                ? roomForm.room_category_custom.trim()
                : roomForm.room_category_choice;

        if (!finalCategory) {
            addToast?.("Please specify the Room Category.", "error");
            return;
        }
        setRoomSubmitting(true);
        try {
            const payload = {
                room_name: roomForm.room_name.trim() || finalCategory,
                unit_of_measurement: roomForm.unit_of_measurement,
                room_length: parseFloat(roomForm.room_length),
                room_width: parseFloat(roomForm.room_width),
                ceiling_height: parseFloat(roomForm.ceiling_height),
                room_category: finalCategory,
                sun_exposure_level: roomForm.sun_exposure_level,
                maximum_occupancy: parseInt(roomForm.maximum_occupancy, 10) || 1,
                window_size_glazing: roomForm.window_size_glazing,
                heat_generating_equipment:
                    parseInt(roomForm.heat_generating_equipment, 10) || 0,
            };

            if (editingRoom) {
                await window.axios.patch(
                    ep.updateOcularRoom(
                        selectedInspection.booking_id,
                        editingRoom.room_id
                    ),
                    payload
                );
                addToast?.("Room dimensions & thermal load updated.", "success");
            } else {
                await window.axios.post(
                    ep.storeOcularRoom(selectedInspection.booking_id),
                    payload
                );
                addToast?.("Inspected room added.", "success");
            }
            setRoomModalOpen(false);
            await fetchOcularInspections();
            onDataChanged?.();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to save room capacity data."),
                "error"
            );
        } finally {
            setRoomSubmitting(false);
        }
    };

    const handleConfirmDeleteRoom = async () => {
        if (!selectedInspection || !deleteRoomTarget) return;
        try {
            await window.axios.delete(
                ep.deleteOcularRoom(
                    selectedInspection.booking_id,
                    deleteRoomTarget.room_id
                )
            );
            addToast?.("Room removed.", "success");
            setDeleteRoomTarget(null);
            await fetchOcularInspections();
        } catch (err) {
            addToast?.(extractErrorMessage(err, "Failed to delete room."), "error");
        }
    };

    // ── Specification Recommendation Handlers ───────────────────────
    const openAddRecommendationModal = (preselectedRoom = null) => {
        setEditingRec(null);
        const firstBrand = brandPriceRanges[0] || null;
        setRecForm({
            room_id: preselectedRoom
                ? String(preselectedRoom.room_id)
                : selectedInspection?.rooms?.[0]?.room_id
                ? String(selectedInspection.rooms[0].room_id)
                : "",
            ac_unit_id: "",
            recommended_capacity: preselectedRoom?.estimated_hp
                ? String(preselectedRoom.estimated_hp)
                : selectedInspection?.rooms?.[0]?.estimated_hp
                ? String(selectedInspection.rooms[0].estimated_hp)
                : "1.5",
            recommended_ac_type: "Wall-Mounted Split",
            motor_type_recommendation: "Inverter",
            brand_recommendation: firstBrand?.brand || "",
            model_recommendation: "",
            unit_status: "Available",
            price_min: firstBrand ? String(firstBrand.min_price) : "",
            price_max: firstBrand ? String(firstBrand.max_price) : "",
            unit_price: firstBrand ? String(firstBrand.min_price) : "",
            notes: "",
            unit_image: null,
            unit_image_preview: null,
        });
        setRecModalOpen(true);
    };

    const openEditRecommendationModal = (rec) => {
        setEditingRec(rec);
        setRecForm({
            room_id: rec.room_id ? String(rec.room_id) : "",
            ac_unit_id: rec.ac_unit_id ? String(rec.ac_unit_id) : "",
            recommended_capacity: String(rec.recommended_capacity ?? "1.5"),
            recommended_ac_type:
                rec.recommended_ac_type || "Wall-Mounted Split",
            motor_type_recommendation:
                rec.motor_type_recommendation || "Inverter",
            brand_recommendation: rec.brand_recommendation || "",
            model_recommendation: rec.model_recommendation || "",
            unit_status: rec.unit_status || "Available",
            price_min: rec.price_min != null ? String(rec.price_min) : "",
            price_max: rec.price_max != null ? String(rec.price_max) : "",
            unit_price: rec.unit_price != null ? String(rec.unit_price) : "",
            notes: rec.notes || "",
            unit_image: null,
            unit_image_preview: rec.unit_image_url || null,
        });
        setRecModalOpen(true);
    };

    const handleSelectInventoryUnit = (acUnitIdStr) => {
        if (!acUnitIdStr) {
            setRecForm((p) => ({ ...p, ac_unit_id: "" }));
            return;
        }
        const unit = inventoryUnits.find(
            (u) => String(u.ac_unit_id) === String(acUnitIdStr)
        );
        if (!unit) return;

        // Normalize AC Type to one of the 4 allowed enum values
        const rawType = String(unit.ac_type || "").toLowerCase();
        let mappedAcType = "Wall-Mounted Split";
        if (rawType.includes("window")) mappedAcType = "Window";
        else if (rawType.includes("floor") || rawType.includes("standing"))
            mappedAcType = "Floor Standing";
        else if (rawType.includes("cassette")) mappedAcType = "Cassette";

        // Normalize Motor Type
        const rawMotor = String(unit.motor_type || "").toLowerCase();
        let mappedMotor = "Inverter";
        if (rawMotor.includes("non")) mappedMotor = "Non-Inverter";
        else if (rawMotor.includes("both")) mappedMotor = "Both";

        // Parse numeric HP from e.g. "1.5 HP" or "1.5"
        const parsedHp =
            parseFloat(String(unit.horsepower || "1.5").replace(/[^\d.]/g, "")) ||
            1.5;

        const brandInfo = brandPriceRanges.find(
            (b) =>
                String(b.brand || "").toLowerCase() ===
                String(unit.brand || "").toLowerCase()
        );

        setRecForm((p) => ({
            ...p,
            ac_unit_id: String(unit.ac_unit_id),
            brand_recommendation: unit.brand || p.brand_recommendation,
            model_recommendation: unit.model || "",
            recommended_capacity: String(parsedHp),
            recommended_ac_type: mappedAcType,
            motor_type_recommendation: mappedMotor,
            unit_status: unit.status || "Available",
            unit_price:
                unit.selling_price != null
                    ? String(unit.selling_price)
                    : p.unit_price,
            price_min: brandInfo
                ? String(brandInfo.min_price)
                : unit.selling_price != null
                ? String(unit.selling_price)
                : p.price_min,
            price_max: brandInfo
                ? String(brandInfo.max_price)
                : unit.selling_price != null
                ? String(unit.selling_price)
                : p.price_max,
            unit_image_preview: unit.image_url || p.unit_image_preview,
        }));
    };

    const handleBrandDropdownChange = (brandName) => {
        const brandInfo = brandPriceRanges.find((b) => b.brand === brandName);
        setRecForm((p) => ({
            ...p,
            brand_recommendation: brandName,
            price_min: brandInfo ? String(brandInfo.min_price) : p.price_min,
            price_max: brandInfo ? String(brandInfo.max_price) : p.price_max,
            unit_price:
                !p.unit_price && brandInfo
                    ? String(brandInfo.min_price)
                    : p.unit_price,
        }));
    };

    const handleSaveRecommendation = async (e) => {
        e.preventDefault();
        if (!selectedInspection) return;
        if (!recForm.brand_recommendation.trim()) {
            addToast?.("Please select or enter a Brand Recommendation.", "error");
            return;
        }
        setRecSubmitting(true);
        try {
            const fd = new FormData();
            if (recForm.room_id) fd.append("room_id", recForm.room_id);
            if (recForm.ac_unit_id) fd.append("ac_unit_id", recForm.ac_unit_id);
            fd.append(
                "recommended_capacity",
                String(parseFloat(recForm.recommended_capacity) || 1.0)
            );
            fd.append("recommended_ac_type", recForm.recommended_ac_type);
            fd.append(
                "motor_type_recommendation",
                recForm.motor_type_recommendation
            );
            fd.append(
                "brand_recommendation",
                recForm.brand_recommendation.trim()
            );
            if (recForm.model_recommendation.trim()) {
                fd.append(
                    "model_recommendation",
                    recForm.model_recommendation.trim()
                );
            }
            fd.append("unit_status", recForm.unit_status || "Available");
            if (recForm.price_min !== "")
                fd.append("price_min", recForm.price_min);
            if (recForm.price_max !== "")
                fd.append("price_max", recForm.price_max);
            if (recForm.unit_price !== "")
                fd.append("unit_price", recForm.unit_price);
            if (recForm.notes.trim()) fd.append("notes", recForm.notes.trim());
            if (recForm.unit_image) fd.append("unit_image", recForm.unit_image);

            const url = editingRec
                ? ep.updateOcularRecommendation(
                      selectedInspection.booking_id,
                      editingRec.recommendation_id
                  )
                : ep.storeOcularRecommendation(selectedInspection.booking_id);

            await window.axios.post(url, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            addToast?.(
                editingRec
                    ? "Specification recommendation updated."
                    : "Specification recommendation added.",
                "success"
            );
            setRecModalOpen(false);
            await fetchOcularInspections();
            onDataChanged?.();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to save recommendation."),
                "error"
            );
        } finally {
            setRecSubmitting(false);
        }
    };

    const handleConfirmDeleteRec = async () => {
        if (!selectedInspection || !deleteRecTarget) return;
        try {
            await window.axios.delete(
                ep.deleteOcularRecommendation(
                    selectedInspection.booking_id,
                    deleteRecTarget.recommendation_id
                )
            );
            addToast?.("Recommendation removed.", "success");
            setDeleteRecTarget(null);
            await fetchOcularInspections();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to delete recommendation."),
                "error"
            );
        }
    };

    const handleSubmitToCustomer = async () => {
        if (!selectedInspection) return;
        setSubmittingToCustomer(true);
        try {
            const { data: json } = await window.axios.post(
                ep.submitOcularToCustomer(selectedInspection.booking_id)
            );
            addToast?.(
                json?.message ||
                    "Inspection results & AC unit recommendations submitted to customer!",
                "success"
            );
            await fetchOcularInspections();
            onDataChanged?.();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to submit inspection results."),
                "error"
            );
        } finally {
            setSubmittingToCustomer(false);
        }
    };

    // ── Filtered Inspections ────────────────────────────────────────
    const normalizedSearch = normalizeSearchQuery(search);
    const filteredInspections = inspections.filter((b) => {
        if (filterTab === "assigned" && !b.is_assigned_to_me) return false;
        if (
            filterTab === "pending" &&
            !["Pending", "In-Progress"].includes(b.inspection_status)
        )
            return false;
        if (filterTab === "submitted" && b.inspection_status !== "Submitted")
            return false;
        if (filterTab === "orders" && (!b.orders || b.orders.length === 0))
            return false;

        if (!normalizedSearch) return true;
        return matchesSearchQuery(
            normalizedSearch,
            `#${b.booking_id}`,
            b.client_name,
            b.client_address,
            b.booking_status,
            b.inspection_status
        );
    });

    const filteredCatalogTools = catalogTools.filter((item) => {
        if (String(item.category || "hand_tool") !== checklistTab) return false;
        if (!checklistSearch.trim()) return true;
        return String(item.item_name || "")
            .toLowerCase()
            .includes(checklistSearch.trim().toLowerCase());
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="page-title">
                        Ocular Inspections & Unit Recommendations
                    </h1>
                    <p className="page-subtitle">
                        Manage tools-only checklists, room dimensions & thermal
                        load data, and AC unit specification recommendations for
                        customers.
                    </p>
                </div>
                {selectedInspection && (
                    <button
                        type="button"
                        onClick={() => setSelectedBookingId(null)}
                        className="btn-secondary btn-sm self-start"
                    >
                        ← Back to All Ocular Inspections
                    </button>
                )}
            </div>

            {/* ── Detail / Manage Workspace View ────────────────────────── */}
            {selectedInspection ? (
                <div className="space-y-6">
                    {isSelectedPending && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                            <span>⚠ This ocular inspection booking is pending approval. Measurements and unit recommendations are disabled until the booking is approved.</span>
                        </div>
                    )}
                    {/* Booking Overview Banner */}
                    <div className="card p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-blue-600">
                                        Ocular Inspection #
                                        {selectedInspection.booking_id}
                                    </span>
                                    <StatusBadge
                                        status={
                                            selectedInspection.booking_status
                                        }
                                    />
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                        Report:{" "}
                                        {selectedInspection.inspection_status}
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-gray-900">
                                    {selectedInspection.client_name}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {selectedInspection.client_address ||
                                        "No address specified"}{" "}
                                    •{" "}
                                    {selectedInspection.client_contact_number ||
                                        "No contact"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Scheduled:{" "}
                                    <span className="font-semibold text-gray-800">
                                        {selectedInspection.scheduled_date}
                                    </span>
                                </p>
                                {selectedInspection.ocular_personnel?.length >
                                    0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[11px] font-semibold text-gray-500">
                                            Assigned Personnel (
                                            {
                                                selectedInspection
                                                    .ocular_personnel.length
                                            }
                                            ):
                                        </span>
                                        {selectedInspection.ocular_personnel.map(
                                            (p) => {
                                                const isAdmin =
                                                    p.personnel_role ===
                                                        "admin_assistant" ||
                                                    Number(p.role_id) === 3 ||
                                                    String(
                                                        p.role_name ||
                                                            p.role ||
                                                            ""
                                                    )
                                                        .toLowerCase()
                                                        .includes("admin");
                                                const displayName =
                                                    p.name ||
                                                    p.full_name ||
                                                    "Staff";
                                                return (
                                                    <span
                                                        key={p.user_id}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                                            isAdmin
                                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                                        }`}
                                                    >
                                                        {displayName} (
                                                        {isAdmin
                                                            ? "Admin Asst"
                                                            : "Tech"}
                                                        )
                                                    </span>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Submit Inspection & Recommendations CTA */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                {ep.availableCatalog && (
                                    <button
                                        type="button"
                                        disabled={isSelectedPending}
                                        title={
                                            isSelectedPending
                                                ? "Tools checklist cannot be created while booking is pending approval."
                                                : undefined
                                        }
                                        onClick={() =>
                                            openChecklistBuilder(
                                                selectedInspection
                                            )
                                        }
                                        className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {selectedInspection.checklist
                                            ? `Tools Checklist (${selectedInspection.checklist.status})`
                                            : "+ Create Tools Checklist"}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={
                                        isSelectedPending ||
                                        submittingToCustomer ||
                                        selectedInspection.rooms?.length ===
                                            0 ||
                                        selectedInspection.recommendations
                                            ?.length === 0
                                    }
                                    onClick={handleSubmitToCustomer}
                                    className="btn-primary btn-sm disabled:opacity-50"
                                >
                                    {submittingToCustomer
                                        ? "Submitting..."
                                        : selectedInspection.inspection_status ===
                                          "Submitted"
                                        ? "Re-Submit Updated Report to Customer"
                                        : "Submit Results & Recommendations to Customer"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Tools-Only Checklist Summary */}
                    {selectedInspection.checklist && (
                        <div className="card p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        1. Ocular Inspection Tools Checklist
                                        (Tools Only)
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Materials are excluded for Ocular
                                        Inspection tasks.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge
                                        status={
                                            selectedInspection.checklist.status
                                        }
                                    />
                                    {selectedInspection.checklist.status ===
                                        "Pending" &&
                                        ep.availableCatalog && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openChecklistBuilder(
                                                        selectedInspection
                                                    )
                                                }
                                                className="btn-secondary btn-sm text-xs"
                                            >
                                                Edit Tools
                                            </button>
                                        )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {selectedInspection.checklist.items?.map(
                                    (item, idx) => {
                                        const rawItemId =
                                            item.checklist_item_id ?? item.id;
                                        const itemKey =
                                            rawItemId ?? item.item_id ?? `cl-item-${idx}`;
                                        const currentStatus = (
                                            item.tool_status ||
                                            item.status ||
                                            "assigned"
                                        ).toLowerCase();
                                        const displayName =
                                            item.tool_name ||
                                            item.item_name ||
                                            "Tool";
                                        const displayQty =
                                            item.quantity ??
                                            item.quantity_approved ??
                                            item.quantity_requested ??
                                            1;
                                        const itemCategory = (
                                            item.category ||
                                            item.tool_subtype ||
                                            ""
                                        ).toLowerCase();
                                        const updateEndpoint =
                                            ep.updateChecklistItemStatus ||
                                            ep.updateToolStatus;

                                        return (
                                            <div
                                                key={itemKey}
                                                className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 text-xs"
                                            >
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500">
                                                        Qty: {displayQty} •{" "}
                                                        {itemCategory ===
                                                            "power_tool" ||
                                                        itemCategory === "power"
                                                            ? "Power Tool"
                                                            : "Hand Tool"}
                                                    </p>
                                                </div>
                                                {selectedInspection.checklist
                                                    .status === "Approved" &&
                                                updateEndpoint &&
                                                rawItemId ? (
                                                    <select
                                                        aria-label={`Return status for ${displayName}`}
                                                        value={
                                                            currentStatus ===
                                                            "borrowed"
                                                                ? "assigned"
                                                                : currentStatus
                                                        }
                                                        disabled={
                                                            updatingToolId ===
                                                            rawItemId
                                                        }
                                                        onChange={(e) =>
                                                            handleMarkToolReturnStatus(
                                                                selectedInspection
                                                                    .checklist
                                                                    .checklist_id,
                                                                rawItemId,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="input-field py-1 px-2 text-xs w-28 capitalize"
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
                                                    <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-[11px] font-medium capitalize text-gray-700">
                                                        {currentStatus}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )}

                    {/* Section 2: Room Dimensions & Thermal Load (The Capacity Data) */}
                    <div className="card p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Room Dimensions & Thermal Load (The Capacity
                                    Data)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Add one or multiple rooms inspected to
                                    calculate required cooling capacity (BTU/hr
                                    & HP).
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={isSelectedPending}
                                onClick={openAddRoomModal}
                                className="btn-primary btn-sm self-start disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Add Inspected Room
                            </button>
                        </div>

                        {selectedInspection.rooms?.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                                <p className="text-sm font-medium text-gray-700">
                                    No inspected rooms recorded yet.
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Click "+ Add Inspected Room" to input room
                                    dimensions and thermal load parameters.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedInspection.rooms.map((room, idx) => (
                                    <div
                                        key={room.room_id}
                                        className="p-4 rounded-xl border border-gray-200 bg-white space-y-3 shadow-2xs"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                                        {room.room_name ||
                                                            `Room #${idx + 1}`}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                                                        {room.room_category}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Dimensions:{" "}
                                                    <span className="font-semibold text-gray-800">
                                                        {room.room_length} ×{" "}
                                                        {room.room_width} ×{" "}
                                                        {room.ceiling_height}{" "}
                                                        {
                                                            room.unit_of_measurement
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                                                    Est. {room.estimated_hp} HP
                                                </span>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {(
                                                        room.estimated_btu || 0
                                                    ).toLocaleString()}{" "}
                                                    BTU/hr
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-xs">
                                            <div>
                                                <span className="text-[10px] uppercase text-gray-400 block">
                                                    Sun Exposure
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    {room.sun_exposure_level}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase text-gray-400 block">
                                                    Max Occupancy
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    {room.maximum_occupancy}{" "}
                                                    person(s)
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase text-gray-400 block">
                                                    Window / Glazing
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    {room.window_size_glazing}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase text-gray-400 block">
                                                    Heat Equipment
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    {
                                                        room.heat_generating_equipment
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openAddRecommendationModal(
                                                        room
                                                    )
                                                }
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                            >
                                                + Recommend Unit for This Room
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditRoomModal(room)
                                                    }
                                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteRoomTarget(
                                                            room
                                                        )
                                                    }
                                                    className="text-xs font-medium text-red-600 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Specification Recommendations (On-Hand & Order-Base Units) */}
                    <div className="card p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Specification Recommendations (On-Hand &
                                    Order-Base Units)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Recommend suitable AC capacity, AC type,
                                    motor type, brand with price range, and unit
                                    pictures.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={isSelectedPending}
                                onClick={() => openAddRecommendationModal(null)}
                                className="btn-primary btn-sm self-start disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Add Unit Recommendation
                            </button>
                        </div>

                        {selectedInspection.recommendations?.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                                <p className="text-sm font-medium text-gray-700">
                                    No AC unit recommendations added yet.
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Click "+ Add Unit Recommendation" to select
                                    from On-Hand or Order-Base inventory units
                                    and attach unit pictures.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedInspection.recommendations.map(
                                    (rec) => {
                                        const linkedRoom =
                                            selectedInspection.rooms?.find(
                                                (r) =>
                                                    r.room_id === rec.room_id
                                            );
                                        return (
                                            <div
                                                key={rec.recommendation_id}
                                                className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col justify-between shadow-2xs"
                                            >
                                                <div>
                                                    {/* Unit Picture */}
                                                    <div className="h-40 bg-gray-100 border-b border-gray-200 flex items-center justify-center overflow-hidden relative">
                                                        {rec.unit_image_url ? (
                                                            <img
                                                                src={formatStorageUrl(
                                                                    rec.unit_image_url
                                                                )}
                                                                alt={`${rec.brand_recommendation} ${rec.model_recommendation || "AC Unit"}`}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="text-center p-4 text-gray-400">
                                                                <Ic
                                                                    name="image"
                                                                    className="w-8 h-8 mx-auto mb-1 opacity-50"
                                                                />
                                                                <span className="text-xs">
                                                                    No unit
                                                                    picture
                                                                    uploaded
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span
                                                            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                                rec.unit_status ===
                                                                "Available"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}
                                                        >
                                                            {rec.unit_status ===
                                                            "Available"
                                                                ? "On-Hand"
                                                                : "Order-Base"}
                                                        </span>
                                                        {rec.status ===
                                                            "Selected" && (
                                                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                                                                Customer
                                                                Selected
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="p-4 space-y-2">
                                                        {linkedRoom && (
                                                            <span className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[11px] font-semibold">
                                                                For:{" "}
                                                                {linkedRoom.room_name ||
                                                                    linkedRoom.room_category}
                                                            </span>
                                                        )}
                                                        <div>
                                                            <h4 className="text-sm font-bold text-gray-900">
                                                                {
                                                                    rec.brand_recommendation
                                                                }{" "}
                                                                {rec.model_recommendation
                                                                    ? `— ${rec.model_recommendation}`
                                                                    : ""}
                                                            </h4>
                                                            <p className="text-xs font-semibold text-blue-600 mt-0.5">
                                                                {rec.unit_price
                                                                    ? `₱${Number(
                                                                          rec.unit_price
                                                                      ).toLocaleString()}`
                                                                    : rec.price_min &&
                                                                      rec.price_max
                                                                    ? `₱${Number(
                                                                          rec.price_min
                                                                      ).toLocaleString()} – ₱${Number(
                                                                          rec.price_max
                                                                      ).toLocaleString()}`
                                                                    : "Price on request"}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100 text-[11px]">
                                                            <div className="bg-gray-50 p-1.5 rounded">
                                                                <span className="text-gray-400 block">
                                                                    Capacity
                                                                </span>
                                                                <span className="font-bold text-gray-800">
                                                                    {
                                                                        rec.recommended_capacity
                                                                    }{" "}
                                                                    HP
                                                                </span>
                                                            </div>
                                                            <div className="bg-gray-50 p-1.5 rounded">
                                                                <span className="text-gray-400 block">
                                                                    AC Type
                                                                </span>
                                                                <span className="font-bold text-gray-800 truncate block">
                                                                    {
                                                                        rec.recommended_ac_type
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="bg-gray-50 p-1.5 rounded">
                                                                <span className="text-gray-400 block">
                                                                    Motor
                                                                </span>
                                                                <span className="font-bold text-gray-800">
                                                                    {
                                                                        rec.motor_type_recommendation
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {rec.notes && (
                                                            <p className="text-xs text-gray-600 italic pt-1">
                                                                "{rec.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditRecommendationModal(
                                                                rec
                                                            )
                                                        }
                                                        className="text-xs font-medium text-gray-700 hover:text-gray-900"
                                                    >
                                                        Edit / Picture
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteRecTarget(
                                                                rec
                                                            )
                                                        }
                                                        className="text-xs font-medium text-red-600 hover:text-red-700"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 4: Customer Unit Orders & Confirmed Sales Reflection */}
                    {selectedInspection.orders?.length > 0 && (
                        <div className="card p-5 space-y-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Customer Unit Orders & Sales Reflection
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Tracks customer unit selection, down payment,
                                    fulfillment mode, and Manager's confirmed
                                    purchase receipt.
                                </p>
                            </div>
                            <div className="space-y-2.5">
                                {selectedInspection.orders.map((ord) => (
                                    <div
                                        key={ord.order_id}
                                        className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-blue-600">
                                                    Order #{ord.order_id}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {ord.brand} {ord.model} (
                                                    {ord.horsepower} HP •{" "}
                                                    {ord.ac_type} •{" "}
                                                    {ord.motor_type})
                                                </span>
                                                <StatusBadge
                                                    status={ord.order_status}
                                                />
                                                {ord.order_status ===
                                                    "Completed" && (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        ✓ Sold & Confirmed by
                                                        Manager
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                Unit Price:{" "}
                                                <strong>
                                                    ₱
                                                    {Number(
                                                        ord.unit_price || 0
                                                    ).toLocaleString()}
                                                </strong>{" "}
                                                • Down Payment:{" "}
                                                <strong>
                                                    ₱
                                                    {Number(
                                                        ord.down_payment_amount ||
                                                            0
                                                    ).toLocaleString()}
                                                </strong>{" "}
                                                • Remaining Unit Balance:{" "}
                                                <strong>
                                                    ₱
                                                    {Number(
                                                        ord.remaining_unit_balance ||
                                                            0
                                                    ).toLocaleString()}
                                                </strong>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Payment:{" "}
                                                <span className="font-semibold text-gray-800">
                                                    {ord.payment_method}
                                                </span>{" "}
                                                • Fulfillment:{" "}
                                                <span className="font-semibold text-gray-800 capitalize">
                                                    {String(
                                                        ord.fulfillment_type ||
                                                            ""
                                                    ).replace(/_/g, " & ")}
                                                </span>
                                                {ord.unit_inventory_status && (
                                                    <>
                                                        {" "}
                                                        • Inventory Status:{" "}
                                                        <span className="font-semibold text-emerald-700">
                                                            {
                                                                ord.unit_inventory_status
                                                            }
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        {ord.manager_receipt_url && (
                                            <a
                                                href={ord.manager_receipt_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn-secondary btn-sm text-xs self-start"
                                            >
                                                View Official Receipt
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ── List View ────────────────────────────────────────────── */
                <div className="card">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: "all", label: "All Inspections" },
                                { id: "assigned", label: "Assigned to Me" },
                                { id: "pending", label: "Pending Report" },
                                { id: "submitted", label: "Submitted" },
                                { id: "orders", label: "With Unit Orders" },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setFilterTab(t.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        filterTab === t.id
                                            ? "bg-blue-600 text-white shadow-xs"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-full sm:w-64">
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder="Search client, #ID, status..."
                            />
                        </div>
                    </div>

                    {loading ? (
                        <TableSkeleton rows={5} cols={6} />
                    ) : filteredInspections.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            No ocular inspection bookings found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase text-gray-400">
                                        <th className="py-3 px-4">Booking</th>
                                        <th className="py-3 px-4">Customer</th>
                                        <th className="py-3 px-4">Schedule</th>
                                        <th className="py-3 px-4">
                                            Assigned Personnel
                                        </th>
                                        <th className="py-3 px-4">
                                            Rooms & Specs
                                        </th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {filteredInspections.map((b) => {
                                        const soldOrder = b.orders?.find(
                                            (o) =>
                                                o.order_status === "Completed"
                                        );
                                        return (
                                            <tr
                                                key={b.booking_id}
                                                className="hover:bg-gray-50/70 transition"
                                            >
                                                <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                                    #{b.booking_id}
                                                    <span className="block text-[10px] font-normal text-emerald-700">
                                                        FREE Ocular
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-gray-900">
                                                        {b.client_name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 truncate max-w-xs">
                                                        {b.client_address}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4 text-gray-700">
                                                    {b.scheduled_date}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {b.ocular_personnel
                                                        ?.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {b.ocular_personnel.map(
                                                                (p) => {
                                                                    const isAdmin =
                                                                        p.personnel_role ===
                                                                            "admin_assistant" ||
                                                                        Number(
                                                                            p.role_id
                                                                        ) ===
                                                                            3 ||
                                                                        String(
                                                                            p.role_name ||
                                                                                p.role ||
                                                                                ""
                                                                        )
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                "admin"
                                                                            );
                                                                    const displayName =
                                                                        p.name ||
                                                                        p.full_name ||
                                                                        "Staff";
                                                                    return (
                                                                        <span
                                                                            key={
                                                                                p.user_id
                                                                            }
                                                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                                                                isAdmin
                                                                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                                                            }`}
                                                                        >
                                                                            {displayName}{" "}
                                                                            (
                                                                            {isAdmin
                                                                                ? "Admin Asst"
                                                                                : "Tech"}
                                                                            )
                                                                        </span>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-semibold text-gray-800">
                                                        {b.rooms?.length || 0}{" "}
                                                        Room(s)
                                                    </span>{" "}
                                                    •{" "}
                                                    <span className="font-semibold text-blue-600">
                                                        {b.recommendations
                                                            ?.length || 0}{" "}
                                                        Rec(s)
                                                    </span>
                                                    {b.checklist && (
                                                        <span className="block text-[10px] text-gray-500">
                                                            Tools Checklist:{" "}
                                                            {b.checklist.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <StatusBadge
                                                            status={
                                                                b.booking_status
                                                            }
                                                        />
                                                        <span className="text-[10px] font-medium text-gray-500">
                                                            Report:{" "}
                                                            {
                                                                b.inspection_status
                                                            }
                                                        </span>
                                                        {soldOrder && (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                                ✓ Unit Sold
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {String(b.booking_status || "").trim().toLowerCase() === "pending" ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            title="Ocular inspection cannot be managed while booking status is pending approval."
                                                            className="btn-sm text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 font-semibold cursor-not-allowed select-none shadow-none inline-flex items-center justify-center opacity-70"
                                                        >
                                                            Manage Inspection
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedBookingId(
                                                                    b.booking_id
                                                                )
                                                            }
                                                            className="btn-primary btn-sm text-xs"
                                                        >
                                                            Manage Inspection
                                                        </button>
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
            )}

            {/* ── Modal: Add / Edit Room Dimensions & Thermal Load ──────── */}
            <Modal
                open={roomModalOpen}
                onClose={() => setRoomModalOpen(false)}
                title={
                    editingRoom
                        ? "Edit Room Dimensions & Thermal Load"
                        : "Add Inspected Room (Capacity Data)"
                }
                maxWidth="xl"
            >
                <form onSubmit={handleSaveRoom} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Field label="Room Label (Optional)">
                            <input
                                id="ocular-room-name"
                                type="text"
                                value={roomForm.room_name}
                                onChange={(e) =>
                                    setRoomForm((p) => ({
                                        ...p,
                                        room_name: e.target.value,
                                    }))
                                }
                                placeholder="e.g. Master Bedroom, 2F Office"
                                className="input-field"
                            />
                        </Field>

                        <Field label="Unit of Measurement" required>
                            <div
                                role="radiogroup"
                                aria-label="Unit of Measurement"
                                className="grid grid-cols-2 gap-2"
                            >
                                {["Meters", "Feet"].map((unit) => (
                                    <label
                                        key={unit}
                                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs cursor-pointer transition ${
                                            roomForm.unit_of_measurement ===
                                            unit
                                                ? "bg-blue-600 border-blue-600 text-white font-bold shadow-xs"
                                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="unit_of_measurement"
                                            value={unit}
                                            checked={
                                                roomForm.unit_of_measurement ===
                                                unit
                                            }
                                            onChange={() =>
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    unit_of_measurement: unit,
                                                }))
                                            }
                                            className="sr-only"
                                        />
                                        {unit}
                                    </label>
                                ))}
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <Field
                            label={`Room Length (${roomForm.unit_of_measurement})`}
                            required
                        >
                            <input
                                id="ocular-room-length"
                                type="number"
                                step="0.01"
                                min="0.5"
                                required
                                value={roomForm.room_length}
                                onChange={(e) =>
                                    setRoomForm((p) => ({
                                        ...p,
                                        room_length: e.target.value,
                                    }))
                                }
                                placeholder="e.g. 4.5"
                                className="input-field"
                            />
                        </Field>
                        <Field
                            label={`Room Width (${roomForm.unit_of_measurement})`}
                            required
                        >
                            <input
                                id="ocular-room-width"
                                type="number"
                                step="0.01"
                                min="0.5"
                                required
                                value={roomForm.room_width}
                                onChange={(e) =>
                                    setRoomForm((p) => ({
                                        ...p,
                                        room_width: e.target.value,
                                    }))
                                }
                                placeholder="e.g. 3.5"
                                className="input-field"
                            />
                        </Field>
                        <Field
                            label={`Ceiling Height (${roomForm.unit_of_measurement})`}
                            required
                        >
                            <input
                                id="ocular-ceiling-height"
                                type="number"
                                step="0.01"
                                min="1.0"
                                required
                                value={roomForm.ceiling_height}
                                onChange={(e) =>
                                    setRoomForm((p) => ({
                                        ...p,
                                        ceiling_height: e.target.value,
                                    }))
                                }
                                placeholder="e.g. 2.7"
                                className="input-field"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Field label="Room Category" required>
                            <select
                                id="ocular-room-category"
                                value={roomForm.room_category_choice}
                                onChange={(e) =>
                                    setRoomForm((p) => ({
                                        ...p,
                                        room_category_choice: e.target.value,
                                    }))
                                }
                                className="input-field"
                            >
                                {ROOM_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {roomForm.room_category_choice === "Others" && (
                            <Field label="Specify Room Category" required>
                                <input
                                    id="ocular-room-category-custom"
                                    type="text"
                                    required
                                    value={roomForm.room_category_custom}
                                    onChange={(e) =>
                                        setRoomForm((p) => ({
                                            ...p,
                                            room_category_custom:
                                                e.target.value,
                                        }))
                                    }
                                    placeholder="Enter custom room type..."
                                    className="input-field"
                                />
                            </Field>
                        )}

                        <Field
                            label="Maximum Occupancy (Peak People)"
                            required
                        >
                            <input
                                id="ocular-max-occupancy"
                                type="number"
                                min="1"
                                max="500"
                                required
                                value={roomForm.maximum_occupancy}
                                onChange={(e) =>
                                    setRoomForm((p) => ({
                                        ...p,
                                        maximum_occupancy: e.target.value,
                                    }))
                                }
                                className="input-field"
                            />
                        </Field>
                    </div>

                    <Field label="Sun Exposure Level" required>
                        <div
                            role="radiogroup"
                            aria-label="Sun Exposure Level"
                            className="grid grid-cols-3 gap-2"
                        >
                            {SUN_EXPOSURE_OPTIONS.map((opt) => (
                                <label
                                    key={opt}
                                    className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs cursor-pointer transition ${
                                        roomForm.sun_exposure_level === opt
                                            ? "bg-blue-600 border-blue-600 text-white font-bold shadow-xs"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="sun_exposure_level"
                                        value={opt}
                                        checked={
                                            roomForm.sun_exposure_level === opt
                                        }
                                        onChange={() =>
                                            setRoomForm((p) => ({
                                                ...p,
                                                sun_exposure_level: opt,
                                            }))
                                        }
                                        className="sr-only"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <Field label="Window Size / Glazing" required>
                        <div
                            role="radiogroup"
                            aria-label="Window Size / Glazing"
                            className="grid grid-cols-3 gap-2"
                        >
                            {WINDOW_GLAZING_OPTIONS.map((opt) => (
                                <label
                                    key={opt}
                                    className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs cursor-pointer transition ${
                                        roomForm.window_size_glazing === opt
                                            ? "bg-blue-600 border-blue-600 text-white font-bold shadow-xs"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="window_size_glazing"
                                        value={opt}
                                        checked={
                                            roomForm.window_size_glazing === opt
                                        }
                                        onChange={() =>
                                            setRoomForm((p) => ({
                                                ...p,
                                                window_size_glazing: opt,
                                            }))
                                        }
                                        className="sr-only"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <Field
                        label="Heat-Generating Equipment (Total Wattage or Appliance Count)"
                        required
                    >
                        <input
                            id="ocular-heat-equipment"
                            type="number"
                            min="0"
                            required
                            value={roomForm.heat_generating_equipment}
                            onChange={(e) =>
                                setRoomForm((p) => ({
                                    ...p,
                                    heat_generating_equipment: e.target.value,
                                }))
                            }
                            placeholder="e.g. 500 (Watts) or 3 (computers/ovens)"
                            className="input-field"
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setRoomModalOpen(false)}
                            className="btn-secondary btn-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={roomSubmitting}
                            className="btn-primary btn-sm"
                        >
                            {roomSubmitting
                                ? "Saving..."
                                : editingRoom
                                ? "Update Room Data"
                                : "Save Inspected Room"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Modal: Add / Edit Specification Recommendation ────────── */}
            <Modal
                open={recModalOpen}
                onClose={() => setRecModalOpen(false)}
                title={
                    editingRec
                        ? "Edit Specification Recommendation"
                        : "Add AC Unit Specification Recommendation"
                }
                maxWidth="xl"
            >
                <form
                    onSubmit={handleSaveRecommendation}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Field label="Target Inspected Room (Optional)">
                            <select
                                id="ocular-rec-room"
                                value={recForm.room_id}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        room_id: e.target.value,
                                    }))
                                }
                                className="input-field"
                            >
                                <option value="">General / All Rooms</option>
                                {selectedInspection?.rooms?.map((r, i) => (
                                    <option
                                        key={r.room_id}
                                        value={String(r.room_id)}
                                    >
                                        {r.room_name || `Room #${i + 1}`} (
                                        {r.room_category} • Est.{" "}
                                        {r.estimated_hp} HP)
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Select from Inventory (On-Hand / Order-Base)">
                            <select
                                id="ocular-rec-inventory-unit"
                                value={recForm.ac_unit_id}
                                onChange={(e) =>
                                    handleSelectInventoryUnit(e.target.value)
                                }
                                className="input-field"
                            >
                                <option value="">
                                    -- Choose Inventory Unit (Auto-fill) --
                                </option>
                                {inventoryUnits.map((u) => (
                                    <option
                                        key={u.ac_unit_id}
                                        value={String(u.ac_unit_id)}
                                    >
                                        [{u.status === "Available"
                                            ? "On-Hand"
                                            : "Order-Base"}]{" "}
                                        {u.brand} {u.model} ({u.horsepower} HP •{" "}
                                        ₱
                                        {Number(
                                            u.selling_price || 0
                                        ).toLocaleString()}
                                        )
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Field
                            label="Brand Recommendation (with Price Range)"
                            required
                        >
                            {brandPriceRanges.length > 0 ? (
                                <select
                                    id="ocular-rec-brand"
                                    value={recForm.brand_recommendation}
                                    onChange={(e) =>
                                        handleBrandDropdownChange(
                                            e.target.value
                                        )
                                    }
                                    className="input-field"
                                >
                                    <option value="">
                                        -- Select Brand & Price Range --
                                    </option>
                                    {brandPriceRanges.map((b) => (
                                        <option key={b.brand} value={b.brand}>
                                            {b.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    id="ocular-rec-brand-input"
                                    type="text"
                                    required
                                    value={recForm.brand_recommendation}
                                    onChange={(e) =>
                                        setRecForm((p) => ({
                                            ...p,
                                            brand_recommendation:
                                                e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Daikin, Carrier, Panasonic"
                                    className="input-field"
                                />
                            )}
                        </Field>

                        <Field label="Model / Series Name">
                            <input
                                id="ocular-rec-model"
                                type="text"
                                value={recForm.model_recommendation}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        model_recommendation: e.target.value,
                                    }))
                                }
                                placeholder="e.g. D-Smart Queen Series"
                                className="input-field"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Field label="Recommended Capacity (HP)" required>
                            <input
                                id="ocular-rec-capacity"
                                type="number"
                                step="0.25"
                                min="0.5"
                                max="20"
                                required
                                value={recForm.recommended_capacity}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        recommended_capacity: e.target.value,
                                    }))
                                }
                                placeholder="e.g. 1.0, 1.5, 2.0"
                                className="input-field"
                            />
                        </Field>

                        <Field label="Recommended AC Type" required>
                            <select
                                id="ocular-rec-ac-type"
                                value={recForm.recommended_ac_type}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        recommended_ac_type: e.target.value,
                                    }))
                                }
                                className="input-field"
                            >
                                {AC_TYPE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field label="Motor Type Recommendation" required>
                        <div
                            role="radiogroup"
                            aria-label="Motor Type Recommendation"
                            className="grid grid-cols-3 gap-2"
                        >
                            {MOTOR_TYPE_OPTIONS.map((opt) => (
                                <label
                                    key={opt}
                                    className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs cursor-pointer transition ${
                                        recForm.motor_type_recommendation ===
                                        opt
                                            ? "bg-blue-600 border-blue-600 text-white font-bold shadow-xs"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="motor_type_recommendation"
                                        value={opt}
                                        checked={
                                            recForm.motor_type_recommendation ===
                                            opt
                                        }
                                        onChange={() =>
                                            setRecForm((p) => ({
                                                ...p,
                                                motor_type_recommendation: opt,
                                            }))
                                        }
                                        className="sr-only"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Unit Price (₱)">
                            <input
                                id="ocular-rec-unit-price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={recForm.unit_price}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        unit_price: e.target.value,
                                    }))
                                }
                                placeholder="e.g. 32500"
                                className="input-field"
                            />
                        </Field>
                        <Field label="Min Brand Price (₱)">
                            <input
                                id="ocular-rec-price-min"
                                type="number"
                                step="0.01"
                                min="0"
                                value={recForm.price_min}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        price_min: e.target.value,
                                    }))
                                }
                                className="input-field"
                            />
                        </Field>
                        <Field label="Max Brand Price (₱)">
                            <input
                                id="ocular-rec-price-max"
                                type="number"
                                step="0.01"
                                min="0"
                                value={recForm.price_max}
                                onChange={(e) =>
                                    setRecForm((p) => ({
                                        ...p,
                                        price_max: e.target.value,
                                    }))
                                }
                                className="input-field"
                            />
                        </Field>
                    </div>

                    {/* Unit Picture Upload & Preview */}
                    <Field label="AC Unit Picture (Shown to Customer)">
                        <div className="flex items-center gap-3">
                            {recForm.unit_image_preview && (
                                <img
                                    src={formatStorageUrl(recForm.unit_image_preview)}
                                    alt="Recommended AC unit preview"
                                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                            )}
                            <input
                                id="ocular-rec-unit-image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setRecForm((p) => ({
                                        ...p,
                                        unit_image: file,
                                        unit_image_preview: file
                                            ? URL.createObjectURL(file)
                                            : p.unit_image_preview,
                                    }));
                                }}
                                className="input-field text-xs"
                            />
                        </div>
                    </Field>

                    <Field label="Admin Assistant Notes (Optional)">
                        <textarea
                            id="ocular-rec-notes"
                            rows={2}
                            value={recForm.notes}
                            onChange={(e) =>
                                setRecForm((p) => ({
                                    ...p,
                                    notes: e.target.value,
                                }))
                            }
                            placeholder="Additional remarks for customer (e.g. energy savings, piping distance notes)..."
                            className="input-field"
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setRecModalOpen(false)}
                            className="btn-secondary btn-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={recSubmitting}
                            className="btn-primary btn-sm"
                        >
                            {recSubmitting
                                ? "Saving..."
                                : editingRec
                                ? "Update Recommendation"
                                : "Save Recommendation"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Modal: Create / Edit Tools-Only Checklist ──────────────── */}
            <Modal
                open={checklistModalOpen}
                onClose={() => setChecklistModalOpen(false)}
                title={`Ocular Inspection Tools Checklist — #${selectedInspection?.booking_id || ""}`}
                maxWidth="2xl"
            >
                <form onSubmit={handleSaveChecklist} className="space-y-4">
                    <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800">
                        <strong>Tools Only:</strong> Materials are excluded when
                        creating a checklist for Ocular Inspection tasks.
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            {[
                                { id: "hand_tool", label: "Hand Tools" },
                                { id: "power_tool", label: "Power Tools" },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setChecklistTab(t.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        checklistTab === t.id
                                            ? "bg-blue-600 text-white shadow-xs"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            aria-label="Search tools catalog"
                            value={checklistSearch}
                            onChange={(e) => setChecklistSearch(e.target.value)}
                            placeholder="Search tools..."
                            className="input-field py-1.5 text-xs sm:w-56"
                        />
                    </div>

                    {catalogLoading ? (
                        <div className="p-6 text-center text-xs text-gray-500">
                            Loading available tools...
                        </div>
                    ) : (
                        <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                            {filteredCatalogTools.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">
                                    No matching tools found in this category.
                                </div>
                            ) : (
                                filteredCatalogTools.map((tool) => {
                                    const selected = checklistItems.find(
                                        (i) => i.item_id === tool.item_id
                                    );
                                    return (
                                        <div
                                            key={tool.item_id}
                                            className={`p-2.5 flex items-center justify-between text-xs ${
                                                selected
                                                    ? "bg-blue-50/60"
                                                    : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(selected)}
                                                    onChange={() =>
                                                        toggleCatalogTool(tool)
                                                    }
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="font-medium text-gray-900">
                                                    {tool.item_name}
                                                </span>
                                                <span className="text-[11px] text-gray-400">
                                                    (Avail:{" "}
                                                    {tool.stock_quantity})
                                                </span>
                                            </label>
                                            {selected && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] text-gray-500">
                                                        Qty:
                                                    </span>
                                                    <input
                                                        type="number"
                                                        aria-label={`Quantity for ${tool.item_name}`}
                                                        min="1"
                                                        max={
                                                            tool.stock_quantity ||
                                                            99
                                                        }
                                                        value={
                                                            selected.quantity
                                                        }
                                                        onChange={(e) =>
                                                            updateToolQuantity(
                                                                tool.item_id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="input-field py-1 px-2 w-16 text-xs text-center"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    <Field
                        label={`Selected Tools (${checklistItems.length})`}
                    >
                        {checklistItems.length === 0 ? (
                            <p className="text-xs text-gray-400">
                                No tools selected yet.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {checklistItems.map((it) => (
                                    <span
                                        key={it.item_id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium"
                                    >
                                        {it.tool_name} × {it.quantity}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Field>

                    <Field label="Notes for Tools Man (Optional)">
                        <input
                            id="ocular-checklist-notes"
                            type="text"
                            value={checklistNotes}
                            onChange={(e) => setChecklistNotes(e.target.value)}
                            placeholder="e.g. Laser meter and clamp meter for ocular inspection..."
                            className="input-field"
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setChecklistModalOpen(false)}
                            className="btn-secondary btn-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={checklistSubmitting || isSelectedPending}
                            className="btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {checklistSubmitting
                                ? "Submitting..."
                                : "Submit Tools Checklist"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Room Modal */}
            <ConfirmModal
                open={Boolean(deleteRoomTarget)}
                onClose={() => setDeleteRoomTarget(null)}
                onConfirm={handleConfirmDeleteRoom}
                title="Remove Inspected Room"
                message={`Are you sure you want to remove "${deleteRoomTarget?.room_name || deleteRoomTarget?.room_category}"?`}
                confirmText="Remove Room"
                danger
            />

            {/* Confirm Delete Recommendation Modal */}
            <ConfirmModal
                open={Boolean(deleteRecTarget)}
                onClose={() => setDeleteRecTarget(null)}
                onConfirm={handleConfirmDeleteRec}
                title="Remove Specification Recommendation"
                message={`Are you sure you want to remove the ${deleteRecTarget?.brand_recommendation || ""} recommendation?`}
                confirmText="Remove"
                danger
            />
        </div>
    );
}
