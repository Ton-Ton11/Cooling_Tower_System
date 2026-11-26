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
    const heightM = isFeet
        ? (Number.isFinite(height) && height > 0 ? height : 8.86) * 0.3048
        : Number.isFinite(height) && height > 0
        ? height
        : 2.7;

    let btu = Math.max(1, lengthM * widthM) * 600 * Math.max(1, heightM / 2.7);
    const cat = String(
        room?.room_category_choice === "Others"
            ? room?.room_category_custom || ""
            : room?.room_category_choice || room?.room_category || ""
    ).toLowerCase();
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
        customer_note: "",
        customer_attachment: null,
        customer_attachment_preview: "",
    });
    const [roomFormError, setRoomFormError] = useState("");
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

    // Direct AC Unit Picker State (based on Technician's ocular result)
    const [pickerRoomId, setPickerRoomId] = useState("");
    const [pickerFilter, setPickerFilter] = useState("all"); // "all" | "matched" | "on_hand" | "order_base"
    const [pickerSearch, setPickerSearch] = useState("");
    const [quickChoosingUnitId, setQuickChoosingUnitId] = useState(null);

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

    useEffect(() => {
        if (!selectedInspection) {
            setPickerRoomId("");
            return;
        }
        const firstRoomId = selectedInspection.rooms?.[0]?.room_id;
        setPickerRoomId((prev) => {
            if (prev && selectedInspection.rooms?.some((r) => String(r.room_id) === String(prev))) {
                return prev;
            }
            return firstRoomId ? String(firstRoomId) : "";
        });
    }, [selectedInspection?.booking_id, selectedInspection?.rooms?.length]);

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
            ).map((item) => ({
                ...item,
                category: item.category_group || item.category || (String(item.tool_subtype || "").toLowerCase() === "power" ? "power_tool" : "hand_tool"),
                stock_quantity: Number(item.quantity_on_hand ?? item.stock_quantity ?? 0),
            }));
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
            const isPowerTool = (tool.category || tool.category_group || "") === "power_tool" || String(tool.tool_subtype || "").toLowerCase() === "power";
            return [
                ...prev,
                {
                    item_id: tool.item_id,
                    tool_name: tool.item_name,
                    category: isPowerTool ? "power_tool" : (tool.category || "hand_tool"),
                    item_type: "Tool",
                    quantity: 1,
                    max_stock: isPowerTool ? 1 : (Number(tool.stock_quantity ?? tool.quantity_on_hand) || 1),
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
            customer_note: selectedInspection?.admin_customer_note || "",
            customer_attachment: null,
            customer_attachment_preview: formatStorageUrl(
                selectedInspection?.admin_customer_attachment_url || ""
            ),
        });
        setRoomFormError("");
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
            customer_note: selectedInspection?.admin_customer_note || "",
            customer_attachment: null,
            customer_attachment_preview: formatStorageUrl(
                selectedInspection?.admin_customer_attachment_url || ""
            ),
        });
        setRoomFormError("");
        setRoomModalOpen(true);
    };

    const handleSaveRoom = async (e) => {
        e.preventDefault();
        if (!selectedInspection) return;
        const formEl = e.currentTarget;
        if (formEl && !formEl.checkValidity()) {
            formEl.reportValidity();
            setRoomFormError(
                "Please fill in valid dimensions and occupancy fields."
            );
            return;
        }
        const finalCategory =
            roomForm.room_category_choice === "Others"
                ? roomForm.room_category_custom.trim()
                : roomForm.room_category_choice;

        if (!finalCategory) {
            setRoomFormError("Please specify the Room Type.");
            addToast?.("Please specify the Room Category.", "error");
            return;
        }
        setRoomFormError("");
        setRoomSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("room_name", roomForm.room_name.trim() || finalCategory);
            fd.append("unit_of_measurement", roomForm.unit_of_measurement);
            fd.append("room_length", String(parseFloat(roomForm.room_length)));
            fd.append("room_width", String(parseFloat(roomForm.room_width)));
            fd.append("ceiling_height", String(parseFloat(roomForm.ceiling_height)));
            fd.append("room_category", finalCategory);
            fd.append("sun_exposure_level", roomForm.sun_exposure_level);
            fd.append("maximum_occupancy", String(parseInt(roomForm.maximum_occupancy, 10) || 1));
            fd.append("window_size_glazing", roomForm.window_size_glazing);
            fd.append(
                "heat_generating_equipment",
                String(parseInt(roomForm.heat_generating_equipment, 10) || 0)
            );
            fd.append("customer_note", (roomForm.customer_note || "").trim());
            if (roomForm.customer_attachment) {
                fd.append("customer_attachment", roomForm.customer_attachment);
            }

            if (editingRoom) {
                fd.append("_method", "PATCH");
                await window.axios.post(
                    ep.updateOcularRoom(
                        selectedInspection.booking_id,
                        editingRoom.room_id
                    ),
                    fd
                );
                addToast?.("Room dimensions & thermal load updated.", "success");
            } else {
                await window.axios.post(
                    ep.storeOcularRoom(selectedInspection.booking_id),
                    fd
                );
                addToast?.("Inspected room added.", "success");
            }
            setRoomModalOpen(false);
            await fetchOcularInspections();
            onDataChanged?.();
        } catch (err) {
            const msg = extractErrorMessage(err, "Failed to save room capacity data.");
            setRoomFormError(msg);
            addToast?.(msg, "error");
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
                fd.append("model", recForm.model_recommendation.trim());
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

    const handleQuickChooseAcUnit = async (unit) => {
        if (!selectedInspection || isSelectedPending || quickChoosingUnitId) return;
        const resolvedRoomId = pickerRoomId
            ? Number(pickerRoomId)
            : selectedInspection.rooms?.[0]?.room_id || null;

        setQuickChoosingUnitId(unit.ac_unit_id);
        try {
            const payload = {
                ac_unit_id: unit.ac_unit_id,
                room_id: resolvedRoomId,
                recommended_capacity: unit.horsepower || 1.5,
                recommended_ac_type: unit.ac_type || "Wall-Mounted Split",
                motor_type_recommendation: unit.motor_type || "Inverter",
                brand_recommendation: unit.brand,
                model: unit.model || "",
                unit_price: unit.selling_price || 0,
            };
            await window.axios.post(
                ep.storeOcularRecommendation(selectedInspection.booking_id),
                payload
            );
            addToast?.(
                `Selected ${unit.brand} ${unit.model || ""} (${unit.horsepower} HP) for customer.`,
                "success"
            );
            await fetchOcularInspections();
            onDataChanged?.();
        } catch (err) {
            addToast?.(
                extractErrorMessage(err, "Failed to select AC unit."),
                "error"
            );
        } finally {
            setQuickChoosingUnitId(null);
        }
    };

    // ── Filtered Inspections ────────────────────────────────────────
    const normalizedSearch = normalizeSearchQuery(search);
    const filteredInspections = inspections.filter((b) => {
        if (filterTab === "assigned" && !b.is_assigned_to_me) return false;
        if (filterTab === "tech_submitted" && b.inspection_status !== "Technician Submitted")
            return false;
        if (
            filterTab === "pending" &&
            !["Pending Inspection", "Pending", "In-Progress"].includes(b.inspection_status)
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
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                            selectedInspection.inspection_status === "Submitted"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : selectedInspection.inspection_status === "Technician Submitted"
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : "bg-sky-50 text-sky-700 border-sky-200"
                                        }`}
                                    >
                                        {selectedInspection.inspection_status === "Technician Submitted"
                                            ? "Tech Result Ready"
                                            : `Status: ${selectedInspection.inspection_status}`}
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
                                                                ? "bg-[#F4F7FB] text-[#10213F] border-[#E2E8F0]"
                                                                : "bg-[#EAF2FF] text-[#2563EB] border-[#C7DDFD]"
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
                                        ? "Re-Submit to Customer"
                                        : "Submit to Customer"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Technician Ocular Inspection Result Banner */}
                    {selectedInspection.technician_ocular_result && (() => {
                        const techRes = selectedInspection.technician_ocular_result;
                        const stages = Array.isArray(techRes.stages_submitted) ? techRes.stages_submitted : [];
                        return (
                            <div className="card p-5 border-l-4 border-l-blue-600 bg-blue-50/30 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold text-gray-900">
                                            Technician Inspection Result
                                        </h3>
                                        {stages.map((st) => (
                                            <span
                                                key={st}
                                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                    st === "after"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-blue-100 text-blue-800"
                                                }`}
                                            >
                                                {st === "before" ? "Before Task" : "After Task"}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        Submitted by{" "}
                                        <strong className="text-gray-800">
                                            {techRes.submitted_by_name || "Technician"}
                                        </strong>
                                    </span>
                                </div>

                                {(techRes.technician_notes || techRes.before_notes || techRes.after_notes) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                        {techRes.before_notes && (
                                            <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                                                <span className="block text-[10px] font-bold uppercase text-gray-400">
                                                    Before Task Note
                                                </span>
                                                <p className="text-gray-700 mt-0.5">{techRes.before_notes}</p>
                                            </div>
                                        )}
                                        {techRes.after_notes && (
                                            <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                                                <span className="block text-[10px] font-bold uppercase text-gray-400">
                                                    After Task Note
                                                </span>
                                                <p className="text-gray-700 mt-0.5">{techRes.after_notes}</p>
                                            </div>
                                        )}
                                        {techRes.technician_notes && (
                                            <div className="bg-white rounded-lg p-2.5 border border-blue-200">
                                                <span className="block text-[10px] font-bold uppercase text-blue-600">
                                                    Tech Remarks
                                                </span>
                                                <p className="text-gray-800 mt-0.5">{techRes.technician_notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(techRes.before_photo_url || techRes.after_photo_url) && (
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        {techRes.before_photo_url && (
                                            <a
                                                href={formatStorageUrl(techRes.before_photo_url)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 hover:border-blue-400 transition"
                                            >
                                                <img
                                                    src={formatStorageUrl(techRes.before_photo_url)}
                                                    alt="Before ocular inspection"
                                                    className="w-12 h-12 rounded object-cover"
                                                />
                                                <span className="text-[11px] font-semibold text-gray-700 pr-2">
                                                    Before Photo
                                                </span>
                                            </a>
                                        )}
                                        {techRes.after_photo_url && (
                                            <a
                                                href={formatStorageUrl(techRes.after_photo_url)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 hover:border-blue-400 transition"
                                            >
                                                <img
                                                    src={formatStorageUrl(techRes.after_photo_url)}
                                                    alt="After ocular inspection"
                                                    className="w-12 h-12 rounded object-cover"
                                                />
                                                <span className="text-[11px] font-semibold text-gray-700 pr-2">
                                                    After Photo
                                                </span>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

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
                        {(selectedInspection.admin_customer_note ||
                            selectedInspection.admin_customer_attachment_url) && (
                            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 text-xs space-y-1.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                    Note for Customer
                                </span>
                                {selectedInspection.admin_customer_note && (
                                    <p className="text-gray-800 whitespace-pre-line">
                                        {selectedInspection.admin_customer_note}
                                    </p>
                                )}
                                {selectedInspection.admin_customer_attachment_url && (
                                    /\.(pdf|docx?)($|\?)/i.test(
                                        selectedInspection.admin_customer_attachment_url
                                    ) ? (
                                        <a
                                            href={formatStorageUrl(
                                                selectedInspection.admin_customer_attachment_url
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-blue-700 font-semibold underline"
                                        >
                                            View Attached File
                                        </a>
                                    ) : (
                                        <a
                                            href={formatStorageUrl(
                                                selectedInspection.admin_customer_attachment_url
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-block"
                                        >
                                            <img
                                                src={formatStorageUrl(
                                                    selectedInspection.admin_customer_attachment_url
                                                )}
                                                alt="Customer note attachment"
                                                className="max-h-24 rounded-lg border border-blue-200 object-cover"
                                            />
                                        </a>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Choose AC Unit for Customer (Direct Selection + Summary) */}
                    <div className="card p-5 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Choose AC Unit for Customer ({selectedInspection.recommendations?.length || 0} Selected)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Pick matching On-Hand or Order-Base AC units based on the room capacity result, then submit to the customer.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={isSelectedPending}
                                onClick={() => openAddRecommendationModal(null)}
                                className="btn-secondary btn-sm self-start disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Custom Unit / Upload Photo
                            </button>
                        </div>

                        {selectedInspection.recommendations?.length > 0 && (
                            <div className="space-y-2.5">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                                    Selected for Customer ({selectedInspection.recommendations.length})
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedInspection.recommendations.map(
                                    (rec) => {
                                        const linkedRoom =
                                            selectedInspection.rooms?.find(
                                                (r) =>
                                                    r.room_id === rec.room_id
                                            );
                                        const recInvStatus = rec.inventory_status || (rec.unit_status === "Available" ? "On-Hand" : "Order-Base");
                                        const isOnHand = recInvStatus === "On-Hand" || rec.unit_status === "Available";
                                        const recModel = rec.model || rec.model_recommendation || "";
                                        return (
                                            <div
                                                key={rec.recommendation_id}
                                                className="rounded-xl border border-blue-200 bg-white overflow-hidden flex flex-col justify-between shadow-2xs"
                                            >
                                                <div>
                                                    {/* Unit Picture */}
                                                    <div className="h-36 bg-gray-100 border-b border-gray-200 flex items-center justify-center overflow-hidden relative">
                                                        {rec.unit_image_url ? (
                                                            <img
                                                                src={formatStorageUrl(
                                                                    rec.unit_image_url
                                                                )}
                                                                alt={`${rec.brand_recommendation} ${recModel || "AC Unit"}`}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="text-center p-4 text-gray-400">
                                                                <Ic
                                                                    name="image"
                                                                    className="w-7 h-7 mx-auto mb-1 opacity-50"
                                                                />
                                                                <span className="text-xs">
                                                                    No unit image
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span
                                                            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                                isOnHand
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}
                                                        >
                                                            {isOnHand ? "On-Hand" : "Order-Base"}
                                                        </span>
                                                        {rec.status ===
                                                            "Selected" && (
                                                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                                                                Customer
                                                                Selected
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="p-3.5 space-y-2">
                                                        {linkedRoom && (
                                                            <span className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[11px] font-semibold">
                                                                For:{" "}
                                                                {linkedRoom.room_name ||
                                                                    linkedRoom.room_category} (Est. {linkedRoom.estimated_hp} HP)
                                                            </span>
                                                        )}
                                                        <div>
                                                            <h4 className="text-sm font-bold text-gray-900">
                                                                {rec.brand_recommendation}
                                                                {recModel ? ` — ${recModel}` : ""}
                                                            </h4>
                                                            <p className="text-xs font-semibold text-blue-600 mt-0.5">
                                                                {rec.unit_price
                                                                    ? `₱${Number(
                                                                          rec.unit_price
                                                                      ).toLocaleString()}`
                                                                    : rec.price_range_label || "Price on request"}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100 text-[11px]">
                                                            <div className="bg-gray-50 p-1.5 rounded">
                                                                <span className="text-gray-400 block">
                                                                    Capacity
                                                                </span>
                                                                <span className="font-bold text-gray-800">
                                                                    {rec.recommended_capacity} HP
                                                                </span>
                                                            </div>
                                                            <div className="bg-gray-50 p-1.5 rounded">
                                                                <span className="text-gray-400 block">
                                                                    AC Type
                                                                </span>
                                                                <span className="font-bold text-gray-800 truncate block">
                                                                    {rec.recommended_ac_type}
                                                                </span>
                                                            </div>
                                                            <div className="bg-gray-50 p-1.5 rounded">
                                                                <span className="text-gray-400 block">
                                                                    Motor
                                                                </span>
                                                                <span className="font-bold text-gray-800">
                                                                    {rec.motor_type_recommendation}
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

                                                <div className="px-3.5 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditRecommendationModal(
                                                                rec
                                                            )
                                                        }
                                                        className="text-xs font-medium text-gray-700 hover:text-gray-900"
                                                    >
                                                        Edit / Note
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
                            </div>
                        )}

                        {/* Direct AC Unit Catalog Picker */}
                        {!isSelectedPending && (() => {
                            const rooms = selectedInspection.rooms || [];
                            const targetRoom = rooms.find((r) => String(r.room_id) === String(pickerRoomId)) || rooms[0] || null;
                            const targetHp = targetRoom?.estimated_hp ? Number(targetRoom.estimated_hp) : null;
                            const pSearch = normalizeSearchQuery(pickerSearch);

                            const filteredUnits = inventoryUnits
                                .filter((u) => {
                                    if (pickerFilter === "on_hand" && u.status === "Order Base") return false;
                                    if (pickerFilter === "order_base" && u.status !== "Order Base") return false;
                                    if (pickerFilter === "matched" && targetHp !== null && Math.abs(Number(u.horsepower) - targetHp) > 0.5) {
                                        return false;
                                    }
                                    if (!pSearch) return true;
                                    return matchesSearchQuery(pSearch, u.brand, u.model, `${u.horsepower} hp`, u.ac_type, u.motor_type);
                                })
                                .sort((a, b) => {
                                    if (targetHp !== null) {
                                        const diffA = Math.abs(Number(a.horsepower) - targetHp);
                                        const diffB = Math.abs(Number(b.horsepower) - targetHp);
                                        if (Math.abs(diffA - diffB) > 0.01) return diffA - diffB;
                                    }
                                    return Number(b.status !== "Order Base") - Number(a.status !== "Order Base");
                                });

                            return (
                                <div className="pt-4 border-t border-gray-100 space-y-3.5">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {rooms.length > 0 && (
                                                <select
                                                    aria-label="Target room for AC unit selection"
                                                    value={pickerRoomId}
                                                    onChange={(e) => setPickerRoomId(e.target.value)}
                                                    className="input-field py-1.5 px-2.5 text-xs w-auto bg-white font-semibold"
                                                >
                                                    <option value="">All Rooms</option>
                                                    {rooms.map((r, i) => (
                                                        <option key={r.room_id} value={String(r.room_id)}>
                                                            {r.room_name || `Room ${i + 1}`} (Est. {r.estimated_hp} HP)
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            <div className="flex flex-wrap items-center gap-1">
                                                {[
                                                    { id: "all", label: "All Units" },
                                                    ...(targetHp !== null ? [{ id: "matched", label: `Best Match (${targetHp} HP)` }] : []),
                                                    { id: "on_hand", label: "On-Hand" },
                                                    { id: "order_base", label: "Order-Base" },
                                                ].map((f) => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => setPickerFilter(f.id)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                                            pickerFilter === f.id
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full lg:w-56">
                                            <SearchInput
                                                value={pickerSearch}
                                                onChange={setPickerSearch}
                                                placeholder="Search brand, model, HP..."
                                            />
                                        </div>
                                    </div>

                                    {filteredUnits.length === 0 ? (
                                        <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-xs text-gray-500">
                                            No AC units match your filter.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                                            {filteredUnits.map((unit) => {
                                                const isBestMatch = targetHp !== null && Math.abs(Number(unit.horsepower) - targetHp) <= 0.5;
                                                const alreadyChosen = (selectedInspection.recommendations || []).find(
                                                    (rec) =>
                                                        Number(rec.ac_unit_id) === Number(unit.ac_unit_id) &&
                                                        (!pickerRoomId || !rec.room_id || String(rec.room_id) === String(pickerRoomId))
                                                );
                                                const isOrderBase = unit.status === "Order Base";
                                                const isPicking = quickChoosingUnitId === unit.ac_unit_id;

                                                return (
                                                    <div
                                                        key={unit.ac_unit_id}
                                                        className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition ${
                                                            alreadyChosen
                                                                ? "border-blue-500 bg-blue-50/40"
                                                                : isBestMatch
                                                                ? "border-emerald-200 bg-white hover:border-blue-400"
                                                                : "border-gray-200 bg-white hover:border-blue-300"
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                {unit.image_url ? (
                                                                    <img
                                                                        src={formatStorageUrl(unit.image_url)}
                                                                        alt={`${unit.brand} ${unit.model || ""}`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Ic name="image" className="w-5 h-5 text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1 flex-wrap mb-0.5">
                                                                    <span
                                                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                                            isOrderBase
                                                                                ? "bg-amber-100 text-amber-800"
                                                                                : "bg-emerald-100 text-emerald-800"
                                                                        }`}
                                                                    >
                                                                        {isOrderBase ? "Order-Base" : "On-Hand"}
                                                                    </span>
                                                                    {isBestMatch && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                                                            Best Match
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                                    {unit.brand} {unit.model || ""}
                                                                </p>
                                                                <p className="text-[11px] text-gray-600">
                                                                    {unit.horsepower} HP · {unit.ac_type} · {unit.motor_type}
                                                                </p>
                                                                <p className="text-xs font-extrabold text-blue-700 mt-0.5">
                                                                    ₱{Number(unit.selling_price || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                                            {alreadyChosen ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteRecTarget(alreadyChosen)}
                                                                    className="w-full py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-bold transition cursor-pointer"
                                                                >
                                                                    Chosen ✓ (Remove)
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPicking}
                                                                    onClick={() => handleQuickChooseAcUnit(unit)}
                                                                    className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                                                                >
                                                                    {isPicking ? "Selecting..." : "Choose Unit"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {!isSelectedPending && selectedInspection.rooms?.length > 0 && selectedInspection.recommendations?.length > 0 && (
                            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <span className="text-xs text-gray-600">
                                    <strong>{selectedInspection.rooms.length}</strong> room(s) ·{" "}
                                    <strong>{selectedInspection.recommendations.length}</strong> AC unit(s) ready
                                </span>
                                <button
                                    type="button"
                                    disabled={submittingToCustomer}
                                    onClick={handleSubmitToCustomer}
                                    className="btn-primary btn-sm self-start sm:self-auto"
                                >
                                    {submittingToCustomer
                                        ? "Submitting..."
                                        : selectedInspection.inspection_status === "Submitted"
                                        ? "Re-Submit to Customer"
                                        : "Submit to Customer"}
                                </button>
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
                                { id: "tech_submitted", label: `Tech Result Ready (${inspections.filter((i) => i.inspection_status === "Technician Submitted").length})` },
                                { id: "assigned", label: "Assigned to Me" },
                                { id: "pending", label: "Pending" },
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
                                                                                    ? "bg-[#F4F7FB] text-[#10213F] border-[#E2E8F0]"
                                                                                    : "bg-[#EAF2FF] text-[#2563EB] border-[#C7DDFD]"
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
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                b.inspection_status === "Technician Submitted"
                                                                    ? "bg-blue-100 text-blue-800"
                                                                    : b.inspection_status === "Submitted"
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-gray-100 text-gray-600"
                                                            }`}
                                                        >
                                                            {b.inspection_status === "Technician Submitted"
                                                                ? "Tech Result Ready"
                                                                : b.inspection_status}
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
                                                            {b.inspection_status === "Technician Submitted"
                                                                ? "Choose Unit & Submit"
                                                                : "Manage Inspection"}
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
                onClose={() => !roomSubmitting && setRoomModalOpen(false)}
                title={
                    editingRoom
                        ? "Edit Ocular Inspection Result"
                        : "Input Ocular Inspection Result"
                }
                subtitle={
                    selectedInspection
                        ? `Booking #${selectedInspection.booking_id} · ${selectedInspection.client_name || "Customer"}`
                        : undefined
                }
                maxWidth="xl"
            >
                {(() => {
                    const est = computeOcularRoomEstimate(roomForm);
                    return (
                        <form
                            className="ct-user-form"
                            onSubmit={handleSaveRoom}
                            noValidate
                            style={{ display: "flex", flexDirection: "column", gap: 14 }}
                        >
                            {roomFormError && (
                                <div
                                    role="alert"
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        background: "#FEF2F2",
                                        border: "1px solid #FECACA",
                                        color: "#991B1B",
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    {roomFormError}
                                </div>
                            )}

                            <div
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
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2F5F" }}>
                                        {editingRoom
                                            ? roomForm.room_name || "Inspected Room"
                                            : `Room #${(selectedInspection?.rooms?.length || 0) + 1}`}
                                    </span>
                                    {est && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: 6,
                                                background: "#ECFDF5",
                                                border: "1px solid #A7F3D0",
                                                color: "#065F46",
                                            }}
                                        >
                                            Est. {est.hp} HP · {est.btu.toLocaleString()} BTU/hr
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: 8 }}>
                                    <div>
                                        <label
                                            htmlFor="ocular-room-name"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Room Name
                                        </label>
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
                                            placeholder="e.g. Living Area"
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-room-category"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Type <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                        </label>
                                        <select
                                            id="ocular-room-category"
                                            required
                                            value={roomForm.room_category_choice}
                                            onChange={(e) =>
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    room_category_choice: e.target.value,
                                                }))
                                            }
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        >
                                            {ROOM_CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-room-unit"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Unit
                                        </label>
                                        <select
                                            id="ocular-room-unit"
                                            value={roomForm.unit_of_measurement}
                                            onChange={(e) =>
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    unit_of_measurement: e.target.value,
                                                }))
                                            }
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        >
                                            <option value="Meters">Meters</option>
                                            <option value="Feet">Feet</option>
                                        </select>
                                    </div>
                                </div>

                                {roomForm.room_category_choice === "Others" && (
                                    <div>
                                        <label
                                            htmlFor="ocular-room-category-custom"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Custom Room Type <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                        </label>
                                        <input
                                            id="ocular-room-category-custom"
                                            type="text"
                                            required
                                            value={roomForm.room_category_custom}
                                            onChange={(e) =>
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    room_category_custom: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter custom room type..."
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                    <div>
                                        <label
                                            htmlFor="ocular-room-length"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Length ({roomForm.unit_of_measurement}) <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                        </label>
                                        <input
                                            id="ocular-room-length"
                                            type="number"
                                            step="0.01"
                                            min="0.5"
                                            required
                                            value={roomForm.room_length}
                                            onChange={(e) => {
                                                setRoomFormError("");
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    room_length: e.target.value,
                                                }));
                                            }}
                                            placeholder="e.g. 4.5"
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-room-width"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Width ({roomForm.unit_of_measurement}) <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                        </label>
                                        <input
                                            id="ocular-room-width"
                                            type="number"
                                            step="0.01"
                                            min="0.5"
                                            required
                                            value={roomForm.room_width}
                                            onChange={(e) => {
                                                setRoomFormError("");
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    room_width: e.target.value,
                                                }));
                                            }}
                                            placeholder="e.g. 3.5"
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-ceiling-height"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Height ({roomForm.unit_of_measurement}) <span aria-hidden="true" style={{ color: "#DC2626" }}>*</span>
                                        </label>
                                        <input
                                            id="ocular-ceiling-height"
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            required
                                            value={roomForm.ceiling_height}
                                            onChange={(e) => {
                                                setRoomFormError("");
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    ceiling_height: e.target.value,
                                                }));
                                            }}
                                            placeholder="2.7"
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 90px", gap: 8 }}>
                                    <div>
                                        <label
                                            htmlFor="ocular-sun-exposure"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Sun Exposure
                                        </label>
                                        <select
                                            id="ocular-sun-exposure"
                                            value={roomForm.sun_exposure_level}
                                            onChange={(e) =>
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    sun_exposure_level: e.target.value,
                                                }))
                                            }
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        >
                                            {SUN_EXPOSURE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-window-size"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Window Size
                                        </label>
                                        <select
                                            id="ocular-window-size"
                                            value={roomForm.window_size_glazing}
                                            onChange={(e) =>
                                                setRoomForm((p) => ({
                                                    ...p,
                                                    window_size_glazing: e.target.value,
                                                }))
                                            }
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        >
                                            {WINDOW_GLAZING_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-max-occupancy"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Pax
                                        </label>
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
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="ocular-heat-equipment"
                                            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                        >
                                            Appliances
                                        </label>
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
                                            className="input-field"
                                            style={{ fontSize: 12, padding: "6px 8px" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Single "Note" field for customer (similar to Technician modal's "Task Note") */}
                            <div>
                                <label
                                    htmlFor="ocular-admin-customer-note"
                                    style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 3 }}
                                >
                                    Note
                                </label>
                                <input
                                    id="ocular-admin-customer-note"
                                    type="text"
                                    value={roomForm.customer_note}
                                    onChange={(e) =>
                                        setRoomForm((p) => ({
                                            ...p,
                                            customer_note: e.target.value,
                                        }))
                                    }
                                    placeholder="Leave a note for the customer..."
                                    className="input-field"
                                    style={{ fontSize: 12, padding: "7px 10px" }}
                                />
                                <input
                                    type="file"
                                    aria-label="Customer note attachment"
                                    accept="image/jpeg,image/png,image/jpg,image/webp,.pdf,.doc,.docx"
                                    style={{ marginTop: 6, fontSize: 11, width: "100%" }}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        setRoomForm((p) => ({
                                            ...p,
                                            customer_attachment: f,
                                            customer_attachment_preview: !f
                                                ? ""
                                                : f.type?.startsWith("image/")
                                                ? URL.createObjectURL(f)
                                                : `file:${f.name}`,
                                        }));
                                    }}
                                />
                                {roomForm.customer_attachment_preview && (
                                    roomForm.customer_attachment_preview.startsWith("file:") ? (
                                        <div style={{ marginTop: 6, fontSize: 11, color: "#334155", fontWeight: 600 }}>
                                            Attached file: {roomForm.customer_attachment_preview.slice(5)}
                                        </div>
                                    ) : /\.(pdf|docx?)($|\?)/i.test(roomForm.customer_attachment_preview) ? (
                                        <a
                                            href={roomForm.customer_attachment_preview}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: "#1D4ED8", fontWeight: 600, textDecoration: "underline" }}
                                        >
                                            View Attached File
                                        </a>
                                    ) : (
                                        <img
                                            src={roomForm.customer_attachment_preview}
                                            alt="Note attachment preview"
                                            style={{ marginTop: 6, maxHeight: 90, borderRadius: 8, border: "1px solid #E2E8F0", objectFit: "cover" }}
                                        />
                                    )
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    disabled={roomSubmitting}
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
                    );
                })()}
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
                                    const isPowerTool = (tool.category || tool.category_group || "") === "power_tool" || String(tool.tool_subtype || "").toLowerCase() === "power";
                                    const isUnavailable = tool.is_available === false || Number(tool.stock_quantity ?? tool.quantity_on_hand ?? 0) <= 0;
                                    return (
                                        <div
                                            key={tool.item_id}
                                            className={`p-2.5 flex items-center justify-between text-xs ${
                                                selected
                                                    ? "bg-blue-50/60"
                                                    : isUnavailable
                                                    ? "bg-gray-50/70 opacity-60"
                                                    : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <label className={`flex items-center gap-2.5 flex-1 ${isUnavailable && !selected ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={isUnavailable && !selected}
                                                    checked={Boolean(selected)}
                                                    onChange={() =>
                                                        toggleCatalogTool(tool)
                                                    }
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="font-medium text-gray-900">
                                                    {tool.item_name}
                                                </span>
                                                {tool.serial_number && (
                                                    <span className="text-[11px] font-mono text-gray-500">
                                                        (S/N: {tool.serial_number})
                                                    </span>
                                                )}
                                                <span className={`text-[11px] ${isUnavailable ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                                                    {isPowerTool
                                                        ? `(${isUnavailable ? (tool.unavailable_reason || "In Use") : "Available"})`
                                                        : `(Avail: ${tool.stock_quantity})`}
                                                </span>
                                            </label>
                                            {selected && (
                                                isPowerTool ? (
                                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                        1 unit
                                                    </span>
                                                ) : (
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
                                                )
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
