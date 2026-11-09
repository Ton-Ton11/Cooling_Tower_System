import React, { useState, useEffect, useMemo, useRef } from "react";

export const DEFAULT_AC_BRANDS = [
    "Carrier",
    "Daikin",
    "Panasonic",
    "LG",
    "Mitsubishi",
    "Samsung",
    "Midea",
    "Kolin",
    "York",
    "Haier",
    "AUX",
    "Everest",
    "Mitsubishi Heavy Ind.",
];

let globalBrandsCache = null;
let globalBrandsPromise = null;

export const fetchActiveBrands = async () => {
    if (globalBrandsCache) return globalBrandsCache;
    if (globalBrandsPromise) return globalBrandsPromise;

    globalBrandsPromise = (async () => {
        try {
            if (typeof window !== "undefined" && window.axios) {
                const res = await window.axios.get("/catalog/brands-list");
                const list = res?.data?.brands || [];
                const names = list
                    .map((b) => (typeof b === "string" ? b : b?.name))
                    .filter(Boolean);
                if (names.length > 0) {
                    globalBrandsCache = names;
                    return names;
                }
            }
        } catch {
            // fallback gracefully
        }
        return DEFAULT_AC_BRANDS;
    })();

    return globalBrandsPromise;
};

/**
 * AcBrandSelect
 *
 * Props:
 * - mode: 'inventory' | 'select' (default: 'select')
 *   - 'inventory': includes '+ Create New Brand...' option. When selected, no modal appears;
 *     instead, turns directly into an inline input to type the new brand. After typing, adds it
 *     to dropdown list and selects it.
 *   - 'select': includes 'Others' option. When selected, asks user to type the brand that is not
 *     in the dropdown list.
 * - value: currently selected brand string
 * - onChange: (brandValue, isOther) => void
 * - brands: optional custom brand array (strings or objects with name)
 * - onCreateBrand: async (brandName) => void (used in inventory mode to persist to backend)
 * - onBrandAdded: (brandName) => void (callback when new brand is added)
 * - onDraftChange: (draftName) => void (notifies parent when user is typing inline)
 * - label: optional label string (e.g. "AC Brand *")
 * - placeholder: string (default "Select AC Brand")
 * - required: boolean
 * - disabled: boolean
 * - className: optional class for select/container
 * - inputClassName: optional class for text inputs
 * - selectStyle: style object
 */
export default function AcBrandSelect({
    mode = "select",
    value = "",
    onChange,
    brands = null,
    onCreateBrand,
    onBrandAdded,
    onDraftChange,
    label,
    placeholder = "Select AC Brand",
    required = false,
    disabled = false,
    className = "",
    inputClassName = "",
    selectStyle = {},
}) {
    const [fetchedBrands, setFetchedBrands] = useState(() => globalBrandsCache || []);
    const [localAddedBrands, setLocalAddedBrands] = useState([]);

    // Inventory inline creation states
    const [isCreatingInline, setIsCreatingInline] = useState(false);
    const [newBrandInput, setNewBrandInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // 'select' mode "Others" state
    const [customOtherText, setCustomOtherText] = useState("");
    const inlineInputRef = useRef(null);

    // Fetch brands if not provided
    useEffect(() => {
        if (!brands || brands.length === 0) {
            fetchActiveBrands().then((list) => {
                if (Array.isArray(list) && list.length > 0) {
                    setFetchedBrands(list);
                }
            });
        }
    }, [brands]);

    // Build unified, deduplicated list of brands
    const normalizedBrands = useMemo(() => {
        const source = brands && brands.length > 0 ? brands : (fetchedBrands.length > 0 ? fetchedBrands : DEFAULT_AC_BRANDS);
        const set = new Set();
        const list = [];

        const addBrand = (item) => {
            if (!item) return;
            const name = (typeof item === "string" ? item : item?.name || item?.brand || "").trim();
            if (!name) return;
            const lower = name.toLowerCase();
            // Filter out generic placeholders from standard choice list
            if (lower === "other" || lower === "others" || lower === "other brand") return;
            if (!set.has(lower)) {
                set.add(lower);
                list.push(name);
            }
        };

        source.forEach(addBrand);
        localAddedBrands.forEach(addBrand);

        return list.length > 0 ? list : DEFAULT_AC_BRANDS;
    }, [brands, fetchedBrands, localAddedBrands]);

    // Focus input when inline creation activates
    useEffect(() => {
        if (isCreatingInline && inlineInputRef.current) {
            inlineInputRef.current.focus();
        }
    }, [isCreatingInline]);

    // Handle initial custom value for 'select' mode
    useEffect(() => {
        if (mode === "select" && value) {
            const isKnown = normalizedBrands.some((b) => b.toLowerCase() === value.toLowerCase());
            if (!isKnown && value !== "Others" && value !== "Other") {
                setCustomOtherText(value);
            }
        }
    }, [value, normalizedBrands, mode]);

    // Determine current dropdown choice in 'select' mode
    const currentSelectChoice = useMemo(() => {
        if (!value) return "";
        const isKnown = normalizedBrands.some((b) => b.toLowerCase() === value.toLowerCase());
        if (isKnown) {
            const found = normalizedBrands.find((b) => b.toLowerCase() === value.toLowerCase());
            return found || value;
        }
        return "Others";
    }, [value, normalizedBrands]);

    // ── Inventory mode: Add new brand inline ──
    const handleConfirmNewBrand = async () => {
        const trimmed = newBrandInput.trim();
        if (!trimmed) return;

        // If it already matches an existing brand
        const existing = normalizedBrands.find((b) => b.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            onChange?.(existing, false);
            onDraftChange?.("");
            setIsCreatingInline(false);
            setNewBrandInput("");
            return;
        }

        setIsSaving(true);
        try {
            if (onCreateBrand) {
                await onCreateBrand(trimmed);
            }
        } catch (err) {
            console.warn("Unable to persist brand via API, adding locally:", err);
        } finally {
            setIsSaving(false);
        }

        // Add to local brand list
        setLocalAddedBrands((prev) => [...prev, trimmed]);
        onChange?.(trimmed, false);
        onBrandAdded?.(trimmed);
        onDraftChange?.("");
        setIsCreatingInline(false);
        setNewBrandInput("");
    };

    const handleCancelNewBrand = () => {
        setIsCreatingInline(false);
        setNewBrandInput("");
        onDraftChange?.("");
    };

    return (
        <div style={{ width: "100%" }}>
            {label && (
                <p className="section-label" style={{ marginBottom: 5, fontSize: 12, fontWeight: 600, color: "#374151" }}>
                    {label}
                </p>
            )}

            {mode === "inventory" ? (
                // ════════════════════════════════════════════════════════════
                // INVENTORY MODE: Direct inline brand creation (no modal!)
                // ════════════════════════════════════════════════════════════
                isCreatingInline ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                            ref={inlineInputRef}
                            type="text"
                            className={`input-field ${inputClassName}`.trim()}
                            placeholder="Type new brand name..."
                            value={newBrandInput}
                            onChange={(e) => {
                                setNewBrandInput(e.target.value);
                                onDraftChange?.(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleConfirmNewBrand();
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    handleCancelNewBrand();
                                }
                            }}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="button"
                            className="btn-primary"
                            style={{
                                padding: "8px 14px",
                                fontSize: 12,
                                fontWeight: 700,
                                borderRadius: 10,
                                whiteSpace: "nowrap",
                                height: 40,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                            onClick={handleConfirmNewBrand}
                            disabled={isSaving || !newBrandInput.trim()}
                        >
                            {isSaving ? "Adding..." : "+ Add"}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{
                                padding: "8px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                borderRadius: 10,
                                height: 40,
                                border: "1px solid #CBD5E1",
                                background: "#F1F5F9",
                                color: "#475569",
                                cursor: "pointer",
                            }}
                            onClick={handleCancelNewBrand}
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <select
                        className={`input-field ${className}`.trim()}
                        value={value || ""}
                        required={required}
                        disabled={disabled}
                        style={{ width: "100%", ...selectStyle }}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__new__") {
                                setIsCreatingInline(true);
                                setNewBrandInput("");
                            } else {
                                onChange?.(val, false);
                            }
                        }}
                    >
                        {!value && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {normalizedBrands.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                        <option value="__new__" style={{ fontWeight: 700, color: "#2563EB" }}>
                            + Create New Brand...
                        </option>
                    </select>
                )
            ) : (
                // ════════════════════════════════════════════════════════════
                // SELECT MODE: For all other input fields (with 'Others')
                // ════════════════════════════════════════════════════════════
                <div>
                    <select
                        className={`input-field ${className}`.trim()}
                        value={currentSelectChoice}
                        required={required && currentSelectChoice !== "Others"}
                        disabled={disabled}
                        style={{ width: "100%", ...selectStyle }}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Others") {
                                onChange?.(customOtherText.trim() || "Others", true);
                            } else {
                                setCustomOtherText("");
                                onChange?.(val, false);
                            }
                        }}
                    >
                        {!value && currentSelectChoice !== "Others" && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {normalizedBrands.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                        <option value="Others">Others</option>
                    </select>

                    {currentSelectChoice === "Others" && (
                        <div style={{ marginTop: 6 }}>
                            <input
                                type="text"
                                autoFocus
                                required={required}
                                className={`input-field ${inputClassName}`.trim()}
                                placeholder="Type brand name..."
                                value={customOtherText}
                                onChange={(e) => {
                                    const text = e.target.value;
                                    setCustomOtherText(text);
                                    onChange?.(text.trim() || "Others", true);
                                }}
                                style={{ width: "100%", fontSize: 13 }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

