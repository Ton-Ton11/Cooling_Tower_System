import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    AC_STATUS_OPTIONS,
    AC_TYPE_OPTIONS,
    SPARE_PART_STATUS_OPTIONS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    normalizeAcUnit,
    normalizeSparePart,
    toInputDate,
} from "../../utils/superAdmin";

// Constants
const PART_NAMES = [
    'Capacitor 35+5 MFD', 'Contactor 25A', 'Fan Motor 1/5HP', 'Thermistor Sensor',
    'PCB Control Board', 'Expansion Valve', 'Drain Pan', 'Filter Drier', 'Relay Switch', 'Overload Protector'
];
const UNIT_OPTIONS = ['pc', 'set', 'unit', 'pair', 'box', 'roll', 'm'];
const REFRIGERANT_OPTIONS = ['R32', 'R410A', 'R134a', 'R22', 'R290', 'R407C'];

const DEFAULT_SPARE_PART_CATEGORIES = [
    'Capacitors', 'Contactors & Relays', 'Fan Motors', 'PCBs & Controls',
    'Valves & Coils', 'Sensors & Thermistors', 'Filters & Driers', 'Hardware & Accessories'
];

// Helper functions
function toDateStr(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Combobox Component
function Combobox({ value, onChange, options, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const filtered = (options || []).filter(o => o.toLowerCase().includes((value || '').toLowerCase()));

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <input
                className="input-field"
                value={value}
                placeholder={placeholder}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
            />
            {open && filtered.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxHeight: 140, overflowY: 'auto', marginTop: 2
                }}>
                    {filtered.map(o => (
                        <div
                            key={o}
                            onMouseDown={() => { onChange(o); setOpen(false); }}
                            style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: '#1E2F5F' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{o}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// SearchBar Component
function SearchBar({ value, onChange, placeholder }) {
    return (
        <div style={{ position: 'relative', width: 240 }}>
            <input
                className="input-field"
                style={{ fontSize: 12 }}
                placeholder={placeholder || 'Search...'}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

// Form templates
const createEmptyForm = (defaultBrand = '', defaultType = '') => ({
    brand: defaultBrand,
    model: "",
    serial_number: "",
    horsepower: "",
    ac_type: defaultType || "Split",
    refrigerant_type: "R32",
    supplier: "",
    purchase_price: "",
    selling_price: "",
    purchase_date: toInputDate(new Date()),
    warranty_period: "12",
    status: "Available",
});

const createEmptyPartForm = (defaultBrand = '', defaultCategory = '') => ({
    part_name: '',
    compatible_brands: defaultBrand || 'Universal',
    sub_category: defaultCategory || 'Capacitors',
    unit: 'pc',
    initial_stock: '10',
    quantity_on_hand: '10',
    reorder_level: '2',
    capital: '',
    selling_price: '',
    supplier_name: '',
    status: 'Available / On Hand',
});

const createEmptySellForm = (warrantyPeriod = 12) => ({
    customer_name: '',
    customer_contact: '',
    customer_address: '',
    payment_method: 'Cash',
    warranty_period: warrantyPeriod,
});

const createEmptyPartSellForm = (part = null) => ({
    part_id: part?.part_id || part?.item_id || null,
    part_name: part?.part_name || part?.item_name || '',
    compatible_brands: Array.isArray(part?.compatible_brands) ? part.compatible_brands.join(', ') : (part?.compatible_brands || 'Universal'),
    unit: part?.unit || 'pc',
    quantity_on_hand: part?.quantity_on_hand || 1,
    quantity_to_sell: 1,
    selling_price: part?.selling_price || part?.capital || 0,
    customer_name: '',
    customer_contact: '',
    payment_method: 'Cash',
});

function AcUnits({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;

    // Core data
    const [units, setUnits] = useState([]);
    const [brands, setBrands] = useState([]);
    const [unitTypes, setUnitTypes] = useState([]);
    const [parts, setParts] = useState([]);
    const [sparePartFolders, setSparePartFolders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Main View Navigation: 'brands' (in stock AC units), 'order', 'sold', 'defects', 'spareparts'
    const [mainTab, setMainTab] = useState("brands");
    const [selectedBrand, setSelectedBrand] = useState(null); // Brand string or null (grid view)
    const [selectedCategory, setSelectedCategory] = useState("all"); // Category string or 'all'

    // Spare Parts Sub-Tab: 'in_stock', 'order', 'sold', 'defects', 'warranty_reserved'
    const [partSubTab, setPartSubTab] = useState("in_stock");
    const [selectedPartBrand, setSelectedPartBrand] = useState(null);
    const [selectedPartCategory, setSelectedPartCategory] = useState("all");

    // Searches
    const [brandCardSearch, setBrandCardSearch] = useState('');
    const [unitTableSearch, setUnitTableSearch] = useState('');
    const [partCardSearch, setPartCardSearch] = useState('');
    const [partTableSearch, setPartTableSearch] = useState('');

    // Brand Card CRUD states (ONLY available in mainTab === 'brands' or partSubTab === 'in_stock')
    const [addBrandModal, setAddBrandModal] = useState(false);
    const [brandForm, setBrandForm] = useState({ name: '', country_of_origin: '', description: '' });
    const [editBrandTarget, setEditBrandTarget] = useState(null);
    const [editBrandForm, setEditBrandForm] = useState({ name: '', country_of_origin: '', description: '' });
    const [deleteBrandTarget, setDeleteBrandTarget] = useState(null);
    const [savingBrand, setSavingBrand] = useState(false);
    const [deletingBrand, setDeletingBrand] = useState(false);

    // Category / Unit Type CRUD states (for AC Units)
    const [addCategoryModal, setAddCategoryModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '' });
    const [manageCategoriesModal, setManageCategoriesModal] = useState(false);
    const [editCategoryTarget, setEditCategoryTarget] = useState(null);
    const [editCategoryForm, setEditCategoryForm] = useState({ name: '', code: '', description: '' });
    const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
    const [savingCategory, setSavingCategory] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState(false);

    // Category / Folder CRUD states (for Spare Parts)
    const [addPartCategoryModal, setAddPartCategoryModal] = useState(false);
    const [partCategoryForm, setPartCategoryForm] = useState({ name: '', description: '' });
    const [managePartCategoriesModal, setManagePartCategoriesModal] = useState(false);
    const [editPartCategoryTarget, setEditPartCategoryTarget] = useState(null);
    const [editPartCategoryForm, setEditPartCategoryForm] = useState({ name: '', description: '' });
    const [deletePartCategoryTarget, setDeletePartCategoryTarget] = useState(null);
    const [savingPartCategory, setSavingPartCategory] = useState(false);
    const [deletingPartCategory, setDeletingPartCategory] = useState(false);

    // AC Unit CRUD states
    const [addUnitModal, setAddUnitModal] = useState(false);
    const [unitForm, setUnitForm] = useState(createEmptyForm());
    const [confirmAddUnit, setConfirmAddUnit] = useState(false);
    const [editUnitTarget, setEditUnitTarget] = useState(null);
    const [editUnitForm, setEditUnitForm] = useState(createEmptyForm());
    const [confirmEditUnit, setConfirmEditUnit] = useState(false);
    const [deleteUnitTarget, setDeleteUnitTarget] = useState(null);
    const [deletingUnit, setDeletingUnit] = useState(false);

    // AC Unit Sold action states
    const [soldModal, setSoldModal] = useState(null);
    const [soldForm, setSoldForm] = useState(createEmptySellForm());
    const [confirmMarkSold, setConfirmMarkSold] = useState(false);
    const [processingSold, setProcessingSold] = useState(false);

    // Order base arrival tracker
    const [editingArrival, setEditingArrival] = useState(null);
    const [arrivalInput, setArrivalInput] = useState('');

    // ── Spare Parts CRUD & Sold states ──
    const [addPartModal, setAddPartModal] = useState(false);
    const [partForm, setPartForm] = useState(createEmptyPartForm());
    const [confirmAddPart, setConfirmAddPart] = useState(false);
    const [savingPart, setSavingPart] = useState(false);

    const [editPartTarget, setEditPartTarget] = useState(null);
    const [editPartForm, setEditPartForm] = useState(createEmptyPartForm());
    const [confirmEditPart, setConfirmEditPart] = useState(false);
    const [savingEditPart, setSavingEditPart] = useState(false);

    const [deletePartTarget, setDeletePartTarget] = useState(null);
    const [deletingPart, setDeletingPart] = useState(false);

    const [partSoldModal, setPartSoldModal] = useState(null);
    const [partSoldForm, setPartSoldForm] = useState(createEmptyPartSellForm());
    const [confirmPartSold, setConfirmPartSold] = useState(false);
    const [processingPartSold, setProcessingPartSold] = useState(false);

    // ── Fetch Catalog Data (Brands & Unit Types) ──
    const fetchCatalog = useCallback(async () => {
        try {
            const catalogUrl = ep.catalog || '/super-admin/catalog';
            const { data } = await window.axios.get(catalogUrl);
            setBrands(Array.isArray(data?.brands) ? data.brands : []);
            setUnitTypes(Array.isArray(data?.unit_types) ? data.unit_types : []);
        } catch (error) {
            console.error("Unable to load catalog metadata", error);
        }
    }, [ep.catalog]);

    // ── Fetch AC Units ──
    const fetchUnits = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(ep.acUnits);
            setUnits((Array.isArray(data?.data) ? data.data : []).map(normalizeAcUnit));
            await fetchCatalog();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load AC units."), "error");
        } finally {
            setLoading(false);
        }
    }, [ep.acUnits, addToast, fetchCatalog]);

    // ── Fetch Spare Parts & Folders ──
    const fetchParts = useCallback(async () => {
        try {
            const { data } = await window.axios.get(ep.spareParts ?? SUPER_ADMIN_ENDPOINTS.spareParts);
            setParts((Array.isArray(data?.data) ? data.data : []).map(normalizeSparePart));

            // Fetch spare parts categories / folders
            const foldersUrl = ep.inventoryFolders ?? SUPER_ADMIN_ENDPOINTS.inventoryFolders;
            const res = await window.axios.get(foldersUrl, { params: { field_type: 'spare_parts' } });
            const folderList = Array.isArray(res.data?.data) ? res.data.data : [];
            setSparePartFolders(folderList);
        } catch (error) {
            console.error("Unable to load spare parts", error);
        }
    }, [ep.spareParts, ep.inventoryFolders]);

    useEffect(() => {
        fetchUnits();
        fetchParts();
    }, [fetchUnits, fetchParts]);

    // Available Brand List for AC Units
    const allBrandCards = useMemo(() => {
        const brandMap = new Map();
        brands.forEach(b => {
            brandMap.set(b.name.toLowerCase(), {
                id: b.id,
                name: b.name,
                country_of_origin: b.country_of_origin,
                description: b.description,
                is_catalog: true,
            });
        });
        units.forEach(u => {
            if (u.brand && !brandMap.has(u.brand.toLowerCase())) {
                brandMap.set(u.brand.toLowerCase(), {
                    id: null,
                    name: u.brand,
                    country_of_origin: null,
                    description: null,
                    is_catalog: false,
                });
            }
        });
        return Array.from(brandMap.values());
    }, [brands, units]);

    // Available Brands for Spare Parts
    const allPartBrandCards = useMemo(() => {
        const brandMap = new Map();
        // Include catalog brands
        brands.forEach(b => {
            brandMap.set(b.name.toLowerCase(), {
                id: b.id,
                name: b.name,
                country_of_origin: b.country_of_origin,
                description: b.description,
                is_catalog: true,
            });
        });
        // Include 'Universal' brand card
        if (!brandMap.has('universal')) {
            brandMap.set('universal', {
                id: null,
                name: 'Universal',
                country_of_origin: 'Multi-Brand',
                description: 'Universal & cross-brand compatible spare parts',
                is_catalog: false,
            });
        }
        // Include brands mentioned in parts
        parts.forEach(p => {
            const partBrands = Array.isArray(p.compatible_brands) ? p.compatible_brands : [p.compatible_brands];
            partBrands.forEach(b => {
                if (b && !brandMap.has(b.toLowerCase())) {
                    brandMap.set(b.toLowerCase(), {
                        id: null,
                        name: b,
                        country_of_origin: null,
                        description: null,
                        is_catalog: false,
                    });
                }
            });
        });
        return Array.from(brandMap.values());
    }, [brands, parts]);

    // Available Categories for AC Units
    const allCategories = useMemo(() => {
        if (unitTypes.length > 0) return unitTypes;
        return AC_TYPE_OPTIONS.map((t, idx) => ({ id: idx + 1, name: t, code: t, description: `${t} airconditioners` }));
    }, [unitTypes]);

    // Available Categories for Spare Parts
    const allPartCategories = useMemo(() => {
        if (sparePartFolders.length > 0) return sparePartFolders;
        return DEFAULT_SPARE_PART_CATEGORIES.map((cat, idx) => ({
            id: idx + 1,
            name: cat,
            description: `${cat} components`,
        }));
    }, [sparePartFolders]);

    // ── Context-filtered AC units depending on current mainTab ──
    const currentTabUnits = useMemo(() => {
        if (mainTab === 'order') return units.filter(u => u.status === 'Order Base');
        if (mainTab === 'sold') return units.filter(u => u.status === 'Sold');
        if (mainTab === 'defects') return units.filter(u => u.status === 'Defect');
        return units.filter(u => u.status !== 'Sold');
    }, [units, mainTab]);

    // AC Unit Tab counts
    const inStockUnits = useMemo(() => units.filter(u => u.status !== 'Sold'), [units]);
    const availableUnits = useMemo(() => units.filter(u => u.status === 'Available'), [units]);
    const orderBaseUnits = useMemo(() => units.filter(u => u.status === 'Order Base'), [units]);
    const soldUnits = useMemo(() => units.filter(u => u.status === 'Sold'), [units]);
    const defectUnits = useMemo(() => units.filter(u => u.status === 'Defect'), [units]);

    // ── Context-filtered Spare Parts depending on partSubTab ──
    const currentPartSubTabItems = useMemo(() => {
        if (partSubTab === 'order') return parts.filter(p => p.status === 'Order Base');
        if (partSubTab === 'sold') return parts.filter(p => p.status === 'Sold');
        if (partSubTab === 'defects') return parts.filter(p => p.status === 'Defect');
        if (partSubTab === 'warranty_reserved') return parts.filter(p => p.status === 'Warranty Reserved');
        // 'in_stock': Available, Available / On Hand, Low Stock, etc.
        return parts.filter(p => p.status !== 'Sold');
    }, [parts, partSubTab]);

    // Spare Parts counts
    const inStockParts = useMemo(() => parts.filter(p => p.status !== 'Sold'), [parts]);
    const orderBaseParts = useMemo(() => parts.filter(p => p.status === 'Order Base'), [parts]);
    const soldParts = useMemo(() => parts.filter(p => p.status === 'Sold'), [parts]);
    const defectParts = useMemo(() => parts.filter(p => p.status === 'Defect'), [parts]);
    const warrantyReservedParts = useMemo(() => parts.filter(p => p.status === 'Warranty Reserved'), [parts]);
    const lowParts = useMemo(() => parts.filter(p => p.quantity_on_hand <= p.reorder_level && p.status !== 'Sold'), [parts]);

    // Filtered Brand Cards for AC Units
    const filteredBrandCards = useMemo(() => {
        const q = brandCardSearch.toLowerCase().trim();
        return allBrandCards.filter(b => {
            const matchesSearch = !q || b.name.toLowerCase().includes(q) ||
                (b.country_of_origin || '').toLowerCase().includes(q) ||
                (b.description || '').toLowerCase().includes(q);
            return matchesSearch;
        });
    }, [allBrandCards, brandCardSearch]);

    // Filtered Brand Cards for Spare Parts
    const filteredPartBrandCards = useMemo(() => {
        const q = partCardSearch.toLowerCase().trim();
        return allPartBrandCards.filter(b => {
            const matchesSearch = !q || b.name.toLowerCase().includes(q) ||
                (b.country_of_origin || '').toLowerCase().includes(q) ||
                (b.description || '').toLowerCase().includes(q);
            return matchesSearch;
        });
    }, [allPartBrandCards, partCardSearch]);

    // AC units under selected brand in active tab
    const activeBrandUnits = useMemo(() => {
        if (!selectedBrand) return currentTabUnits;
        return currentTabUnits.filter(u => (u.brand || '').toLowerCase() === selectedBrand.toLowerCase());
    }, [currentTabUnits, selectedBrand]);

    // Filtered AC units by category and search
    const filteredBrandUnits = useMemo(() => {
        return activeBrandUnits.filter(u => {
            if (selectedCategory !== 'all') {
                const matchName = (u.ac_type || '').toLowerCase() === selectedCategory.toLowerCase();
                const matchedTypeObj = allCategories.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
                const matchCode = matchedTypeObj && matchedTypeObj.code && (u.ac_type || '').toLowerCase() === matchedTypeObj.code.toLowerCase();
                if (!matchName && !matchCode) return false;
            }
            if (unitTableSearch.trim()) {
                const q = unitTableSearch.toLowerCase();
                const matches = (u.model || '').toLowerCase().includes(q) ||
                    (u.serial_number || '').toLowerCase().includes(q) ||
                    (u.supplier || '').toLowerCase().includes(q) ||
                    (u.ac_type || '').toLowerCase().includes(q) ||
                    (u.status || '').toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [activeBrandUnits, selectedCategory, unitTableSearch, allCategories]);

    // Spare parts under selected brand in active sub-tab
    const activeBrandParts = useMemo(() => {
        if (!selectedPartBrand) return currentPartSubTabItems;
        return currentPartSubTabItems.filter(p => {
            const bList = Array.isArray(p.compatible_brands) ? p.compatible_brands : [p.compatible_brands];
            if (selectedPartBrand.toLowerCase() === 'universal') {
                return bList.some(b => (b || '').toLowerCase().includes('universal')) || bList.length === 0;
            }
            return bList.some(b => (b || '').toLowerCase().includes(selectedPartBrand.toLowerCase()));
        });
    }, [currentPartSubTabItems, selectedPartBrand]);

    // Filtered spare parts by category and search
    const filteredBrandParts = useMemo(() => {
        const activeCategoryObj = allPartCategories.find(c => c.name.toLowerCase() === selectedPartCategory.toLowerCase());
        return activeBrandParts.filter(p => {
            if (selectedPartCategory !== 'all') {
                const pCat = p.sub_category || p.category || '';
                const matchesCat = pCat.toLowerCase() === selectedPartCategory.toLowerCase() ||
                    (activeCategoryObj && p.folder_id === activeCategoryObj.id);
                if (!matchesCat) {
                    // Check if part name or category matches
                    const matchesName = (p.part_name || p.item_name || '').toLowerCase().includes(selectedPartCategory.toLowerCase());
                    if (!matchesName) return false;
                }
            }
            if (partTableSearch.trim()) {
                const q = partTableSearch.toLowerCase();
                const matches = (p.part_name || p.item_name || '').toLowerCase().includes(q) ||
                    (Array.isArray(p.compatible_brands) ? p.compatible_brands.join(' ') : (p.compatible_brands || '')).toLowerCase().includes(q) ||
                    (p.sub_category || p.category || '').toLowerCase().includes(q) ||
                    (p.supplier || p.supplier_name || '').toLowerCase().includes(q) ||
                    (p.status || '').toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [activeBrandParts, selectedPartCategory, allPartCategories, partTableSearch]);

    // Tab change handlers
    const handleTabChange = (tabKey) => {
        setMainTab(tabKey);
        setSelectedBrand(null);
        setSelectedCategory('all');
        setBrandCardSearch('');
        setUnitTableSearch('');
    };

    const handlePartSubTabChange = (subKey) => {
        setPartSubTab(subKey);
        setSelectedPartBrand(null);
        setSelectedPartCategory('all');
        setPartCardSearch('');
        setPartTableSearch('');
    };

    // ══════════════════════════════════════════════════════════════════
    // BRAND CARD CRUD HANDLERS (Only in mainTab === 'brands' or partSubTab === 'in_stock')
    // ══════════════════════════════════════════════════════════════════
    const handleCreateBrand = async (e) => {
        e?.preventDefault();
        if (!brandForm.name.trim()) {
            addToast("Please enter a brand name.", "error");
            return;
        }
        setSavingBrand(true);
        try {
            const storeBrandUrl = ep.storeBrand || '/super-admin/catalog/brands';
            await window.axios.post(storeBrandUrl, {
                name: brandForm.name.trim(),
                country_of_origin: brandForm.country_of_origin?.trim() || null,
                description: brandForm.description?.trim() || null,
            });
            addToast(`Brand "${brandForm.name.trim()}" created successfully!`);
            setAddBrandModal(false);
            setBrandForm({ name: '', country_of_origin: '', description: '' });
            await fetchCatalog();
            if (mainTab === 'spareparts') {
                setSelectedPartBrand(brandForm.name.trim());
                setSelectedPartCategory('all');
            } else {
                setSelectedBrand(brandForm.name.trim());
                setSelectedCategory('all');
            }
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to create brand."), "error");
        } finally {
            setSavingBrand(false);
        }
    };

    const handleUpdateBrand = async (e) => {
        e?.preventDefault();
        if (!editBrandTarget || !editBrandForm.name.trim()) return;
        setSavingBrand(true);
        try {
            if (editBrandTarget.id) {
                const updateUrl = ep.updateBrand ? ep.updateBrand(editBrandTarget.id) : `/super-admin/catalog/brands/${editBrandTarget.id}`;
                await window.axios.patch(updateUrl, {
                    name: editBrandForm.name.trim(),
                    country_of_origin: editBrandForm.country_of_origin?.trim() || null,
                    description: editBrandForm.description?.trim() || null,
                });
            }
            addToast(`Brand "${editBrandForm.name.trim()}" updated.`);
            if (selectedBrand === editBrandTarget.name) {
                setSelectedBrand(editBrandForm.name.trim());
            }
            if (selectedPartBrand === editBrandTarget.name) {
                setSelectedPartBrand(editBrandForm.name.trim());
            }
            setEditBrandTarget(null);
            await fetchCatalog();
            await fetchUnits(false);
            await fetchParts();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update brand."), "error");
        } finally {
            setSavingBrand(false);
        }
    };

    const handleDeleteBrand = async () => {
        if (!deleteBrandTarget) return;
        setDeletingBrand(true);
        try {
            if (deleteBrandTarget.id) {
                const deleteUrl = ep.deleteBrand ? ep.deleteBrand(deleteBrandTarget.id) : `/super-admin/catalog/brands/${deleteBrandTarget.id}`;
                await window.axios.delete(deleteUrl);
            }
            addToast(`Brand "${deleteBrandTarget.name}" deleted.`);
            if (selectedBrand === deleteBrandTarget.name) {
                setSelectedBrand(null);
            }
            if (selectedPartBrand === deleteBrandTarget.name) {
                setSelectedPartBrand(null);
            }
            setDeleteBrandTarget(null);
            await fetchCatalog();
            await fetchUnits(false);
            await fetchParts();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete brand."), "error");
        } finally {
            setDeletingBrand(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // AC CATEGORY / UNIT TYPE CRUD HANDLERS
    // ══════════════════════════════════════════════════════════════════
    const handleCreateCategory = async (e) => {
        e?.preventDefault();
        if (!categoryForm.name.trim()) {
            addToast("Please enter a category name.", "error");
            return;
        }
        setSavingCategory(true);
        try {
            const storeCategoryUrl = ep.storeUnitType || '/super-admin/catalog/unit-types';
            await window.axios.post(storeCategoryUrl, {
                name: categoryForm.name.trim(),
                code: categoryForm.code?.trim() || categoryForm.name.trim(),
                description: categoryForm.description?.trim() || null,
            });
            addToast(`Category "${categoryForm.name.trim()}" created successfully!`);
            setAddCategoryModal(false);
            setCategoryForm({ name: '', code: '', description: '' });
            await fetchCatalog();
            setSelectedCategory(categoryForm.name.trim());
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to create category."), "error");
        } finally {
            setSavingCategory(false);
        }
    };

    const handleUpdateCategory = async (e) => {
        e?.preventDefault();
        if (!editCategoryTarget || !editCategoryForm.name.trim()) return;
        setSavingCategory(true);
        try {
            const updateUrl = ep.updateUnitType ? ep.updateUnitType(editCategoryTarget.id) : `/super-admin/catalog/unit-types/${editCategoryTarget.id}`;
            await window.axios.patch(updateUrl, {
                name: editCategoryForm.name.trim(),
                code: editCategoryForm.code?.trim() || editCategoryForm.name.trim(),
                description: editCategoryForm.description?.trim() || null,
            });
            addToast(`Category updated to "${editCategoryForm.name.trim()}".`);
            if (selectedCategory === editCategoryTarget.name || selectedCategory === editCategoryTarget.code) {
                setSelectedCategory(editCategoryForm.name.trim());
            }
            setEditCategoryTarget(null);
            await fetchCatalog();
            await fetchUnits(false);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update category."), "error");
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!deleteCategoryTarget) return;
        setDeletingCategory(true);
        try {
            const deleteUrl = ep.deleteUnitType ? ep.deleteUnitType(deleteCategoryTarget.id) : `/super-admin/catalog/unit-types/${deleteCategoryTarget.id}`;
            await window.axios.delete(deleteUrl);
            addToast(`Category "${deleteCategoryTarget.name}" deleted.`);
            if (selectedCategory === deleteCategoryTarget.name || selectedCategory === deleteCategoryTarget.code) {
                setSelectedCategory('all');
            }
            setDeleteCategoryTarget(null);
            await fetchCatalog();
            await fetchUnits(false);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete category."), "error");
        } finally {
            setDeletingCategory(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // SPARE PARTS CATEGORY / FOLDER CRUD HANDLERS
    // ══════════════════════════════════════════════════════════════════
    const handleCreatePartCategory = async (e) => {
        e?.preventDefault();
        if (!partCategoryForm.name.trim()) {
            addToast("Please enter a category name.", "error");
            return;
        }
        setSavingPartCategory(true);
        try {
            const storeUrl = ep.storeInventoryFolder ?? SUPER_ADMIN_ENDPOINTS.storeInventoryFolder;
            await window.axios.post(storeUrl, {
                field_type: 'spare_parts',
                name: partCategoryForm.name.trim(),
                description: partCategoryForm.description?.trim() || null,
            });
            addToast(`Spare part category "${partCategoryForm.name.trim()}" created.`);
            setAddPartCategoryModal(false);
            setPartCategoryForm({ name: '', description: '' });
            await fetchParts();
            setSelectedPartCategory(partCategoryForm.name.trim());
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to create category."), "error");
        } finally {
            setSavingPartCategory(false);
        }
    };

    const handleUpdatePartCategory = async (e) => {
        e?.preventDefault();
        if (!editPartCategoryTarget || !editPartCategoryForm.name.trim()) return;
        setSavingPartCategory(true);
        try {
            const updateUrl = ep.updateInventoryFolder ? ep.updateInventoryFolder(editPartCategoryTarget.id) : `/super-admin/inventory/folders/${editPartCategoryTarget.id}`;
            await window.axios.patch(updateUrl, {
                name: editPartCategoryForm.name.trim(),
                description: editPartCategoryForm.description?.trim() || null,
            });
            addToast(`Category updated to "${editPartCategoryForm.name.trim()}".`);
            if (selectedPartCategory === editPartCategoryTarget.name) {
                setSelectedPartCategory(editPartCategoryForm.name.trim());
            }
            setEditPartCategoryTarget(null);
            await fetchParts();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update category."), "error");
        } finally {
            setSavingPartCategory(false);
        }
    };

    const handleDeletePartCategory = async () => {
        if (!deletePartCategoryTarget) return;
        setDeletingPartCategory(true);
        try {
            const deleteUrl = ep.deleteInventoryFolder ? ep.deleteInventoryFolder(deletePartCategoryTarget.id) : `/super-admin/inventory/folders/${deletePartCategoryTarget.id}`;
            await window.axios.delete(deleteUrl);
            addToast(`Category "${deletePartCategoryTarget.name}" deleted.`);
            if (selectedPartCategory === deletePartCategoryTarget.name) {
                setSelectedPartCategory('all');
            }
            setDeletePartCategoryTarget(null);
            await fetchParts();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete category."), "error");
        } finally {
            setDeletingPartCategory(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // AC UNIT CRUD HANDLERS
    // ══════════════════════════════════════════════════════════════════
    const handleOpenAddUnit = (prefillBrand = null, prefillCategory = null) => {
        const targetBrand = prefillBrand || selectedBrand || (allBrandCards[0]?.name || 'Carrier');
        const targetCategory = prefillCategory || (selectedCategory !== 'all' ? selectedCategory : (allCategories[0]?.name || 'Split'));
        const defaultStatus = mainTab === 'order' ? 'Order Base' : mainTab === 'defects' ? 'Defect' : 'Available';
        const newForm = createEmptyForm(targetBrand, targetCategory);
        newForm.status = defaultStatus;
        setUnitForm(newForm);
        setAddUnitModal(true);
    };

    const handleAddUnit = async () => {
        try {
            const payload = {
                brand: unitForm.brand.trim(),
                model: unitForm.model.trim(),
                serial_number: unitForm.serial_number.trim(),
                horsepower: parseFloat(unitForm.horsepower) || 1.0,
                ac_type: unitForm.ac_type.trim(),
                refrigerant_type: unitForm.refrigerant_type?.trim() || 'R32',
                supplier: unitForm.supplier ? unitForm.supplier.trim() : null,
                purchase_price: parseFloat(unitForm.purchase_price) || 0,
                selling_price: unitForm.selling_price ? parseFloat(unitForm.selling_price) : null,
                purchase_date: unitForm.purchase_date,
                warranty_period: parseInt(unitForm.warranty_period) || 12,
                status: unitForm.status || 'Available',
            };
            await window.axios.post(ep.acUnits, payload);
            addToast(`AC unit "${unitForm.brand} ${unitForm.model}" added successfully.`);
            setAddUnitModal(false);
            setConfirmAddUnit(false);
            setUnitForm(createEmptyForm());
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add AC unit."), "error");
        }
    };

    const handleEditUnit = async () => {
        if (!editUnitTarget) return;
        try {
            const payload = {
                brand: editUnitForm.brand.trim(),
                model: editUnitForm.model.trim(),
                serial_number: editUnitForm.serial_number.trim(),
                horsepower: parseFloat(editUnitForm.horsepower) || 1.0,
                ac_type: editUnitForm.ac_type.trim(),
                refrigerant_type: editUnitForm.refrigerant_type?.trim() || 'R32',
                supplier: editUnitForm.supplier ? editUnitForm.supplier.trim() : null,
                purchase_price: parseFloat(editUnitForm.purchase_price) || 0,
                selling_price: editUnitForm.selling_price ? parseFloat(editUnitForm.selling_price) : null,
                purchase_date: editUnitForm.purchase_date,
                warranty_period: parseInt(editUnitForm.warranty_period) || 12,
                status: editUnitForm.status || 'Available',
            };
            await window.axios.patch(ep.updateAcUnit(editUnitTarget.ac_unit_id), payload);
            addToast(`AC unit "${editUnitForm.brand} ${editUnitForm.model}" updated.`);
            setEditUnitTarget(null);
            setConfirmEditUnit(false);
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update AC unit."), "error");
        }
    };

    const handleDeleteUnit = async () => {
        if (!deleteUnitTarget || deletingUnit) return;
        setDeletingUnit(true);
        try {
            await window.axios.delete(ep.deleteAcUnit(deleteUnitTarget.ac_unit_id));
            addToast(`AC unit "${deleteUnitTarget.brand} ${deleteUnitTarget.model}" (${deleteUnitTarget.serial_number}) removed.`);
            setDeleteUnitTarget(null);
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete AC unit."), "error");
        } finally {
            setDeletingUnit(false);
        }
    };

    // ── AC Unit Sold Handler ──
    const handleMarkAsSold = async () => {
        if (!soldModal || processingSold) return;
        setProcessingSold(true);
        try {
            await window.axios.patch(ep.updateAcUnit(soldModal.ac_unit_id), {
                status: 'Sold',
            });
            addToast(`AC unit ${soldModal.brand} ${soldModal.model} (${soldModal.serial_number}) status changed to Sold.`);
            setSoldModal(null);
            setConfirmMarkSold(false);
            setSoldForm(createEmptySellForm());
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to mark AC unit as Sold."), "error");
        } finally {
            setProcessingSold(false);
        }
    };

    const handleSetArrival = (unitId) => {
        if (!arrivalInput) return;
        setUnits(prev => prev.map(u => u.ac_unit_id === unitId ? { ...u, expected_arrival: arrivalInput } : u));
        addToast('Arrival date updated.');
        setEditingArrival(null);
        setArrivalInput('');
    };

    // ══════════════════════════════════════════════════════════════════
    // SPARE PARTS CRUD & SOLD HANDLERS
    // ══════════════════════════════════════════════════════════════════
    const handleOpenAddPart = (prefillBrand = null, prefillCategory = null) => {
        const targetBrand = prefillBrand || selectedPartBrand || (allPartBrandCards[0]?.name || 'Universal');
        const targetCategory = prefillCategory || (selectedPartCategory !== 'all' ? selectedPartCategory : (allPartCategories[0]?.name || 'Capacitors'));
        const defaultStatus = partSubTab === 'order' ? 'Order Base' : partSubTab === 'defects' ? 'Defect' : partSubTab === 'warranty_reserved' ? 'Warranty Reserved' : 'Available / On Hand';
        const newForm = createEmptyPartForm(targetBrand, targetCategory);
        newForm.status = defaultStatus;
        setPartForm(newForm);
        setAddPartModal(true);
    };

    const handleAddPart = async () => {
        if (!partForm.part_name.trim()) {
            addToast("Please enter a part name.", "error");
            return;
        }
        setSavingPart(true);
        try {
            const brandsList = partForm.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
            const qty = parseInt(partForm.quantity_on_hand) || 0;
            const initStock = parseInt(partForm.initial_stock) || qty;
            const reorder = parseInt(partForm.reorder_level) || 2;
            const capital = parseFloat(partForm.capital) || 0;
            const sellingPrice = parseFloat(partForm.selling_price) || 0;

            const subCatName = partForm.sub_category?.trim() || 'Capacitors';
            const catObj = allPartCategories.find(c => c.name.toLowerCase() === subCatName.toLowerCase());

            const payload = {
                item_name: partForm.part_name.trim(),
                item_type: 'Spare Part',
                inventory_mode: 'spare_part',
                compatible_brands: brandsList,
                sub_category: subCatName,
                folder_id: catObj?.id || null,
                unit: partForm.unit?.trim() || 'pc',
                initial_stock: initStock,
                quantity_on_hand: qty,
                reorder_level: reorder,
                capital: capital,
                selling_price: sellingPrice,
                profit: Math.max(0, sellingPrice - capital),
                supplier_name: partForm.supplier_name?.trim() || null,
                status: partForm.status || (qty === 0 ? 'Out of Stock' : (qty <= reorder ? 'Low Stock' : 'Available / On Hand')),
            };

            const storeUrl = ep.spareParts ?? SUPER_ADMIN_ENDPOINTS.spareParts;
            await window.axios.post(storeUrl, payload);
            addToast(`Spare part "${partForm.part_name}" added successfully.`);
            setAddPartModal(false);
            setConfirmAddPart(false);
            setPartForm(createEmptyPartForm());
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add spare part."), "error");
        } finally {
            setSavingPart(false);
        }
    };

    const handleEditPart = async () => {
        if (!editPartTarget) return;
        setSavingEditPart(true);
        try {
            const brandsList = editPartForm.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
            const qty = parseInt(editPartForm.quantity_on_hand) || 0;
            const initStock = parseInt(editPartForm.initial_stock) || qty;
            const reorder = parseInt(editPartForm.reorder_level) || 2;
            const capital = parseFloat(editPartForm.capital) || 0;
            const sellingPrice = parseFloat(editPartForm.selling_price) || 0;
            const subCatName = editPartForm.sub_category?.trim() || 'Capacitors';
            const catObj = allPartCategories.find(c => c.name.toLowerCase() === subCatName.toLowerCase());

            const payload = {
                item_name: editPartForm.part_name.trim(),
                compatible_brands: brandsList,
                sub_category: subCatName,
                folder_id: catObj?.id || null,
                unit: editPartForm.unit?.trim() || 'pc',
                initial_stock: initStock,
                quantity_on_hand: qty,
                reorder_level: reorder,
                capital: capital,
                selling_price: sellingPrice,
                profit: Math.max(0, sellingPrice - capital),
                supplier_name: editPartForm.supplier_name?.trim() || null,
                status: editPartForm.status || (qty === 0 ? 'Out of Stock' : (qty <= reorder ? 'Low Stock' : 'Available / On Hand')),
            };

            const itemId = editPartTarget.part_id || editPartTarget.item_id;
            const updateUrl = ep.updateSparePart ? ep.updateSparePart(itemId) : `/super-admin/spare-parts/${itemId}`;
            await window.axios.patch(updateUrl, payload);
            addToast(`Spare part "${editPartForm.part_name}" updated successfully.`);
            setEditPartTarget(null);
            setConfirmEditPart(false);
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update spare part."), "error");
        } finally {
            setSavingEditPart(false);
        }
    };

    const handleDeletePart = async () => {
        if (!deletePartTarget || deletingPart) return;
        setDeletingPart(true);
        try {
            const itemId = deletePartTarget.part_id || deletePartTarget.item_id;
            const deleteUrl = ep.deleteSparePart ? ep.deleteSparePart(itemId) : `/super-admin/spare-parts/${itemId}`;
            await window.axios.delete(deleteUrl);
            addToast(`Spare part "${deletePartTarget.part_name || deletePartTarget.item_name}" deleted.`);
            setDeletePartTarget(null);
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete spare part."), "error");
        } finally {
            setDeletingPart(false);
        }
    };

    // ── Spare Part Sold Handler ──
    const handlePartSoldConfirm = async () => {
        if (!partSoldModal || processingPartSold) return;
        const sellQty = parseInt(partSoldForm.quantity_to_sell) || 1;
        if (sellQty <= 0) {
            addToast("Please enter a valid quantity to sell.", "error");
            return;
        }
        if (sellQty > partSoldModal.quantity_on_hand) {
            addToast(`Cannot sell ${sellQty}. Only ${partSoldModal.quantity_on_hand} available in stock.`, "error");
            return;
        }

        setProcessingPartSold(true);
        try {
            const itemId = partSoldModal.part_id || partSoldModal.item_id;
            const newQty = Math.max(0, partSoldModal.quantity_on_hand - sellQty);
            const newStatus = newQty === 0 ? 'Sold' : (newQty <= partSoldModal.reorder_level ? 'Low Stock' : 'Available / On Hand');

            const updateUrl = ep.updateSparePart ? ep.updateSparePart(itemId) : `/super-admin/spare-parts/${itemId}`;
            await window.axios.patch(updateUrl, {
                quantity_on_hand: newQty,
                status: newStatus,
            });

            addToast(`Sold ${sellQty} ${partSoldModal.unit} of "${partSoldModal.part_name || partSoldModal.item_name}".`);
            setPartSoldModal(null);
            setConfirmPartSold(false);
            setPartSoldForm(createEmptyPartSellForm());
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to process spare part sale."), "error");
        } finally {
            setProcessingPartSold(false);
        }
    };

    // ── Render Modal Wrapper ──
    const renderModalWrapper = (isOpen, onClose, children) => {
        if (!isOpen) return null;
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '28px', maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.20)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    {children}
                </div>
            </div>
        );
    };

    const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' };
    const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap' };

    // Header label helper based on active tab
    const getTabTitle = () => {
        if (mainTab === 'order') return 'Order Base AC Units';
        if (mainTab === 'sold') return 'Sold AC Units';
        if (mainTab === 'defects') return 'Defective AC Units';
        if (mainTab === 'spareparts') return 'AC Spare Parts & Components';
        return 'AC Units Inventory';
    };

    const getTabSubtitle = () => {
        if (mainTab === 'order') return `${orderBaseUnits.length} units ordered awaiting supplier delivery`;
        if (mainTab === 'sold') return `${soldUnits.length} AC units sold to customers`;
        if (mainTab === 'defects') return `${defectUnits.length} defective units flagged for inspection or return`;
        if (mainTab === 'spareparts') {
            return `Organized in clickable Brands & Categories · ${inStockParts.length} in stock · ${orderBaseParts.length} order base · ${soldParts.length} sold · ${defectParts.length} defect · ${warrantyReservedParts.length} warranty reserved`;
        }
        return `Organized in clickable Brands & Categories · ${inStockUnits.length} in stock · ${availableUnits.length} available · ${soldUnits.length} sold · ${defectUnits.length} defect`;
    };

    if (loading) {
        return (
            <div style={{ padding: 32, borderRadius: 12, background: '#F8FAFC', color: '#64748B', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Loading AC Units & Spare Parts...</p>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeInUp 0.25s ease' }}>
            {/* Top Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title font-display">{getTabTitle()}</h1>
                    <p className="page-subtitle">{getTabSubtitle()}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={() => { fetchUnits(); fetchParts(); }}>Refresh</button>

                    {/* ONLY the main "Brands" tab (or Spare Parts In Stock tab) allows adding new Brand Cards */}
                    {mainTab === 'brands' && !selectedBrand && (
                        <button className="btn-primary" onClick={() => { setBrandForm({ name: '', country_of_origin: '', description: '' }); setAddBrandModal(true); }}>
                            + Add Brand
                        </button>
                    )}
                    {mainTab === 'spareparts' && partSubTab === 'in_stock' && !selectedPartBrand && (
                        <button className="btn-primary" onClick={() => { setBrandForm({ name: '', country_of_origin: '', description: '' }); setAddBrandModal(true); }}>
                            + Add Brand
                        </button>
                    )}

                    {/* Add AC Unit button inside drill-down */}
                    {mainTab !== 'spareparts' && selectedBrand && (
                        <button className="btn-primary" onClick={() => handleOpenAddUnit(selectedBrand, selectedCategory !== 'all' ? selectedCategory : null)}>
                            + Add AC Unit
                        </button>
                    )}

                    {/* Add Spare Part button inside drill-down */}
                    {mainTab === 'spareparts' && selectedPartBrand && (
                        <button className="btn-primary" onClick={() => handleOpenAddPart(selectedPartBrand, selectedPartCategory !== 'all' ? selectedPartCategory : null)}>
                            + Add Spare Part
                        </button>
                    )}
                </div>
            </div>

            {/* Main Tabs */}
            <div className="tab-bar" style={{ marginBottom: 20, display: 'inline-flex', background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
                <button className={`tab-item ${mainTab === 'brands' ? 'active' : ''}`} onClick={() => handleTabChange('brands')}>
                    Brands ({allBrandCards.length})
                </button>
                <button className={`tab-item ${mainTab === 'order' ? 'active' : ''}`} onClick={() => handleTabChange('order')}>
                    Order Base ({orderBaseUnits.length})
                </button>
                <button className={`tab-item ${mainTab === 'sold' ? 'active' : ''}`} onClick={() => handleTabChange('sold')}>
                    Sold Units ({soldUnits.length})
                </button>
                <button className={`tab-item ${mainTab === 'defects' ? 'active' : ''}`} onClick={() => handleTabChange('defects')}>
                    Defects ({defectUnits.length})
                </button>
                <button className={`tab-item ${mainTab === 'spareparts' ? 'active' : ''}`} onClick={() => handleTabChange('spareparts')}>
                    Spare Parts ({parts.length})
                    {lowParts.length > 0 && <span style={{ marginLeft: 6, background: '#EF4444', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{lowParts.length}</span>}
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SHARED BRAND CARDS & CATEGORIES ARCHITECTURE: AC UNITS
                (Applies to Brands, Order Base, Sold Units, and Defects)
               ══════════════════════════════════════════════════════════════ */}
            {mainTab !== 'spareparts' && (
                <div>
                    {/* ──────────────────────────────────────────────────────────
                        A. TOP LEVEL: CLICKABLE BRAND CARDS GRID (AC UNITS)
                       ────────────────────────────────────────────────────────── */}
                    {!selectedBrand ? (
                        <div>
                            {/* Search & Top Action Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                        Select an AC Brand
                                    </p>
                                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                        Click on any brand to view and manage {mainTab === 'order' ? 'order base units' : mainTab === 'sold' ? 'sold units' : mainTab === 'defects' ? 'defective units' : 'categories & in-stock inventory'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <SearchBar value={brandCardSearch} onChange={setBrandCardSearch} placeholder="Search brand..." />
                                    {/* Only Brands tab can add new brand cards */}
                                    {mainTab === 'brands' && (
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', fontWeight: 600 }}
                                            onClick={() => { setBrandForm({ name: '', country_of_origin: '', description: '' }); setAddBrandModal(true); }}>
                                            + New Brand
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Cards Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                {filteredBrandCards.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', padding: 36, textAlign: 'center', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', color: '#64748B' }}>
                                        No Brand found.
                                        {mainTab === 'brands' && (
                                            <div style={{ marginTop: 10 }}>
                                                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => setAddBrandModal(true)}>+ Add First Brand</button>
                                            </div>
                                        )}
                                    </div>
                                ) : filteredBrandCards.map(brand => {
                                    const bUnits = currentTabUnits.filter(u => (u.brand || '').toLowerCase() === brand.name.toLowerCase());
                                    const count = bUnits.length;
                                    const avail = bUnits.filter(u => u.status === 'Available').length;

                                    // Category breakdown
                                    const typeCounts = {};
                                    bUnits.forEach(u => {
                                        const t = u.ac_type || 'Split';
                                        typeCounts[t] = (typeCounts[t] || 0) + 1;
                                    });

                                    return (
                                        <div
                                            key={brand.name}
                                            onClick={() => {
                                                setSelectedBrand(brand.name);
                                                setSelectedCategory('all');
                                            }}
                                            style={{
                                                background: '#fff',
                                                borderRadius: 14,
                                                padding: '20px',
                                                border: '1px solid #E2E8F0',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(59,130,246,0.12)';
                                                e.currentTarget.style.borderColor = '#93C5FD';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                                e.currentTarget.style.borderColor = '#E2E8F0';
                                            }}>
                                            <div>
                                                {/* Top Row: Brand Name & Action Buttons */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <div>
                                                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                                            {brand.name}
                                                        </h3>
                                                        {brand.country_of_origin && (
                                                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                                                                {brand.country_of_origin}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Edit / Delete Brand only visible in main Brands tab */}
                                                    {mainTab === 'brands' && (
                                                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                            <button
                                                                className="btn-secondary"
                                                                style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6 }}
                                                                title="Edit Brand"
                                                                onClick={() => {
                                                                    setEditBrandTarget(brand);
                                                                    setEditBrandForm({
                                                                        name: brand.name,
                                                                        country_of_origin: brand.country_of_origin || '',
                                                                        description: brand.description || '',
                                                                    });
                                                                }}>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn-danger"
                                                                style={{ padding: '3px 7px', fontSize: 11, borderRadius: 6 }}
                                                                title="Delete Brand"
                                                                onClick={() => setDeleteBrandTarget(brand)}>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 14px', lineHeight: 1.4, minHeight: 32 }}>
                                                    {brand.description || 'Air conditioning units and cooling systems.'}
                                                </p>
                                            </div>

                                            {/* Bottom Stats & Category Pills */}
                                            <div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                                                    {Object.entries(typeCounts).slice(0, 3).map(([type, c]) => (
                                                        <span key={type} style={{
                                                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                                                            background: '#F1F5F9', color: '#475569',
                                                        }}>
                                                            {type}: {c}
                                                        </span>
                                                    ))}
                                                    {Object.keys(typeCounts).length > 3 && (
                                                        <span style={{ fontSize: 10, color: '#94A3B8', alignSelf: 'center' }}>
                                                            +{Object.keys(typeCounts).length - 3} more
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
                                                        {count} {mainTab === 'order' ? 'Orders' : mainTab === 'sold' ? 'Sold' : mainTab === 'defects' ? 'Defects' : 'Units'}
                                                    </span>
                                                    {mainTab === 'brands' && (
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: avail > 0 ? '#16A34A' : '#94A3B8' }}>
                                                            {avail} Available
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* ──────────────────────────────────────────────────────────
                            B. INSIDE BRAND CARD: DYNAMIC CATEGORIES & AC UNITS TABLE
                           ────────────────────────────────────────────────────────── */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Brand Header Banner with Back Button */}
                            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <button
                                        className="btn-secondary"
                                        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => setSelectedBrand(null)}>
                                        ← Back
                                    </button>
                                    <div>
                                        <h2 style={{ fontSize: 19, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                            {selectedBrand} {mainTab === 'order' ? '— Order Base' : mainTab === 'sold' ? '— Sold Units' : mainTab === 'defects' ? '— Defective Units' : ''}
                                        </h2>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            {activeBrandUnits.length} total units matching view
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn-secondary"
                                        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => setManageCategoriesModal(true)}>
                                        Manage Categories
                                    </button>
                                    <button
                                        className="btn-primary"
                                        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => {
                                            setCategoryForm({ name: '', code: '', description: '' });
                                            setAddCategoryModal(true);
                                        }}>
                                        + New Category
                                    </button>
                                </div>
                            </div>

                            {/* Category Types Pill Selector Bar */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                                        {selectedBrand} Categories
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {allCategories.length} categories configured
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        style={{
                                            padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                            borderColor: selectedCategory === 'all' ? '#3B82F6' : '#CBD5E1',
                                            background: selectedCategory === 'all' ? '#EFF6FF' : '#fff',
                                            color: selectedCategory === 'all' ? '#1D4ED8' : '#334155',
                                            boxShadow: selectedCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.15)' : 'none',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        All Types ({activeBrandUnits.length})
                                    </button>
                                    {allCategories.map(cat => {
                                        const count = activeBrandUnits.filter(u => {
                                            const matchName = (u.ac_type || '').toLowerCase() === cat.name.toLowerCase();
                                            const matchCode = cat.code && (u.ac_type || '').toLowerCase() === cat.code.toLowerCase();
                                            return matchName || matchCode;
                                        }).length;
                                        const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase() || (cat.code && selectedCategory.toLowerCase() === cat.code.toLowerCase());
                                        return (
                                            <button
                                                key={cat.id || cat.name}
                                                onClick={() => setSelectedCategory(cat.name)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                                    borderColor: isSelected ? '#3B82F6' : '#E2E8F0',
                                                    background: isSelected ? '#3B82F6' : '#fff',
                                                    color: isSelected ? '#fff' : '#334155',
                                                    boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.25)' : 'none',
                                                    transition: 'all 0.15s ease',
                                                }}>
                                                {cat.name} <span style={{ opacity: 0.85, fontSize: 11, marginLeft: 4 }}>({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AC Units Table Card */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                                {selectedCategory === 'all' ? `All ${selectedBrand} Units` : `${selectedBrand} — ${selectedCategory}`}
                                            </p>
                                            {selectedCategory !== 'all' && (
                                                <button
                                                    onClick={() => setSelectedCategory('all')}
                                                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                                    View All Types
                                                </button>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            Showing {filteredBrandUnits.length} units
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <SearchBar value={unitTableSearch} onChange={setUnitTableSearch} placeholder={`Search ${selectedBrand} models...`} />
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                                            onClick={() => handleOpenAddUnit(selectedBrand, selectedCategory !== 'all' ? selectedCategory : null)}>
                                            + Add AC Unit {selectedCategory !== 'all' ? `to ${selectedCategory}` : ''}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                {['Unit ID', 'Model', 'Serial No.', 'Category / Type', 'HP', 'Refrigerant', 'Purchase Price', 'Selling Price', 'Warranty', ...(mainTab === 'order' ? ['Arrival Tracker'] : []), 'Status', 'Actions'].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredBrandUnits.length === 0 ? (
                                                <tr>
                                                    <td colSpan={12} style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                                        No AC units found for {selectedBrand} {selectedCategory !== 'all' ? `in "${selectedCategory}"` : ''}.
                                                        <div style={{ marginTop: 10 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ fontSize: 12, padding: '5px 12px' }}
                                                                onClick={() => handleOpenAddUnit(selectedBrand, selectedCategory !== 'all' ? selectedCategory : null)}>
                                                                + Add AC Unit Here
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredBrandUnits.map(u => (
                                                <tr
                                                    key={u.ac_unit_id}
                                                    style={{ borderTop: '1px solid #F1F5F9' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#2563EB' }}>#AC{String(u.ac_unit_id).padStart(3, '0')}</td>
                                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0F172A' }}>{u.model}</td>
                                                    <td style={{ ...tdStyle, fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>{u.serial_number}</td>
                                                    <td style={{ ...tdStyle }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                                            background: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE',
                                                        }}>
                                                            {u.ac_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 12 }}>{u.horsepower} HP</td>
                                                    <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{u.refrigerant_type}</td>
                                                    <td style={{ ...tdStyle, fontSize: 12 }}>₱{u.purchase_price.toLocaleString()}</td>
                                                    <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#16A34A' }}>₱{u.selling_price ? u.selling_price.toLocaleString() : '—'}</td>
                                                    <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{u.warranty_period} mo</td>

                                                    {/* Arrival tracker column (when on Order Base view) */}
                                                    {mainTab === 'order' && (
                                                        <td style={{ padding: '10px 12px', minWidth: 160 }}>
                                                            {editingArrival === u.ac_unit_id ? (
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    <input type="date" className="input-field" style={{ padding: '4px 8px', fontSize: 12, width: 135 }}
                                                                        value={arrivalInput} onChange={e => setArrivalInput(e.target.value)} />
                                                                    <button className="btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleSetArrival(u.ac_unit_id)}>Save</button>
                                                                    <button className="btn-secondary" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => { setEditingArrival(null); setArrivalInput(''); }}>✕</button>
                                                                </div>
                                                            ) : u.expected_arrival ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{u.expected_arrival}</span>
                                                                    <button onClick={() => { setEditingArrival(u.ac_unit_id); setArrivalInput(u.expected_arrival || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#2563EB' }}>Edit</button>
                                                                </div>
                                                            ) : (
                                                                <button className="btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }}
                                                                    onClick={() => { setEditingArrival(u.ac_unit_id); setArrivalInput(''); }}>
                                                                    Set Date
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}

                                                    <td style={{ padding: '10px 12px' }}>
                                                        <StatusBadge status={u.status} />
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                            {u.status === 'Available' && (
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ padding: '4px 10px', fontSize: 11, background: '#16A34A' }}
                                                                    onClick={() => {
                                                                        setSoldModal(u);
                                                                        setSoldForm(createEmptySellForm(u.warranty_period));
                                                                    }}>
                                                                    Sold
                                                                </button>
                                                            )}
                                                            <button
                                                                className="btn-secondary"
                                                                style={{ padding: '4px 9px', fontSize: 11 }}
                                                                onClick={() => {
                                                                    setEditUnitTarget(u);
                                                                    setEditUnitForm({
                                                                        brand: u.brand ?? "",
                                                                        model: u.model ?? "",
                                                                        serial_number: u.serial_number ?? "",
                                                                        horsepower: String(u.horsepower ?? ""),
                                                                        ac_type: u.ac_type ?? "Split",
                                                                        refrigerant_type: u.refrigerant_type ?? "R32",
                                                                        supplier: u.supplier ?? "",
                                                                        purchase_price: String(u.purchase_price ?? ""),
                                                                        selling_price: u.selling_price ? String(u.selling_price) : "",
                                                                        purchase_date: toInputDate(u.purchase_date),
                                                                        warranty_period: String(u.warranty_period ?? "12"),
                                                                        status: u.status === 'Installed' ? 'Sold' : (u.status ?? "Available"),
                                                                    });
                                                                }}>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn-danger"
                                                                style={{ padding: '4px 9px', fontSize: 11 }}
                                                                onClick={() => setDeleteUnitTarget(u)}>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SHARED BRAND CARDS & CATEGORIES ARCHITECTURE: SPARE PARTS
                (Applies to In Stock, Order Base, Sold, Defects, Warranty Reserved)
               ══════════════════════════════════════════════════════════════ */}
            {mainTab === 'spareparts' && (
                <div>
                    {/* Spare Parts Sub-tab filter bar */}
                    <div className="tab-bar" style={{ marginBottom: 18, display: 'inline-flex', background: '#F8FAFC', padding: 4, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                        <button className={`tab-item ${partSubTab === 'in_stock' ? 'active' : ''}`} onClick={() => handlePartSubTabChange('in_stock')}>
                            In Stock ({inStockParts.length})
                        </button>
                        <button className={`tab-item ${partSubTab === 'order' ? 'active' : ''}`} onClick={() => handlePartSubTabChange('order')}>
                            Order Base ({orderBaseParts.length})
                        </button>
                        <button className={`tab-item ${partSubTab === 'sold' ? 'active' : ''}`} onClick={() => handlePartSubTabChange('sold')}>
                            Sold Parts ({soldParts.length})
                        </button>
                        <button className={`tab-item ${partSubTab === 'defects' ? 'active' : ''}`} onClick={() => handlePartSubTabChange('defects')}>
                            Defects ({defectParts.length})
                        </button>
                        <button className={`tab-item ${partSubTab === 'warranty_reserved' ? 'active' : ''}`} onClick={() => handlePartSubTabChange('warranty_reserved')}>
                            Warranty Reserved ({warrantyReservedParts.length})
                        </button>
                    </div>

                    {/* ──────────────────────────────────────────────────────────
                        A. TOP LEVEL: CLICKABLE BRAND CARDS GRID (SPARE PARTS)
                       ────────────────────────────────────────────────────────── */}
                    {!selectedPartBrand ? (
                        <div>
                            {/* Search & Top Action Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                        Select Compatible AC Brand
                                    </p>
                                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                        Click on any brand to view and manage spare parts {partSubTab === 'order' ? 'on order' : partSubTab === 'sold' ? 'sold' : partSubTab === 'defects' ? 'defects' : partSubTab === 'warranty_reserved' ? 'warranty reserved' : 'in stock'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <SearchBar value={partCardSearch} onChange={setPartCardSearch} placeholder="Search brand..." />
                                    {/* Only in_stock tab allows adding new brand card */}
                                    {partSubTab === 'in_stock' && (
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', fontWeight: 600 }}
                                            onClick={() => { setBrandForm({ name: '', country_of_origin: '', description: '' }); setAddBrandModal(true); }}>
                                            + New Brand
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Cards Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                {filteredPartBrandCards.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', padding: 36, textAlign: 'center', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', color: '#64748B' }}>
                                        No Brand found.
                                        {partSubTab === 'in_stock' && (
                                            <div style={{ marginTop: 10 }}>
                                                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => setAddBrandModal(true)}>+ Add First Brand</button>
                                            </div>
                                        )}
                                    </div>
                                ) : filteredPartBrandCards.map(brand => {
                                    const bParts = currentPartSubTabItems.filter(p => {
                                        const bList = Array.isArray(p.compatible_brands) ? p.compatible_brands : [p.compatible_brands];
                                        if (brand.name.toLowerCase() === 'universal') {
                                            return bList.some(b => (b || '').toLowerCase().includes('universal')) || bList.length === 0;
                                        }
                                        return bList.some(b => (b || '').toLowerCase().includes(brand.name.toLowerCase()));
                                    });
                                    const count = bParts.length;
                                    const totalQty = bParts.reduce((sum, p) => sum + (p.quantity_on_hand || 0), 0);

                                    // Category breakdown
                                    const catCounts = {};
                                    bParts.forEach(p => {
                                        const c = p.sub_category || p.category || 'General';
                                        catCounts[c] = (catCounts[c] || 0) + (p.quantity_on_hand || 1);
                                    });

                                    return (
                                        <div
                                            key={brand.name}
                                            onClick={() => {
                                                setSelectedPartBrand(brand.name);
                                                setSelectedPartCategory('all');
                                            }}
                                            style={{
                                                background: '#fff',
                                                borderRadius: 14,
                                                padding: '20px',
                                                border: '1px solid #E2E8F0',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(59,130,246,0.12)';
                                                e.currentTarget.style.borderColor = '#93C5FD';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                                e.currentTarget.style.borderColor = '#E2E8F0';
                                            }}>
                                            <div>
                                                {/* Top Row: Brand Name & Action Buttons */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <div>
                                                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                                            {brand.name}
                                                        </h3>
                                                        {brand.country_of_origin && (
                                                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                                                                {brand.country_of_origin}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Edit / Delete Brand only visible in in_stock subtab and if it is not Universal */}
                                                    {partSubTab === 'in_stock' && brand.name.toLowerCase() !== 'universal' && (
                                                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                            <button
                                                                className="btn-secondary"
                                                                style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6 }}
                                                                title="Edit Brand"
                                                                onClick={() => {
                                                                    setEditBrandTarget(brand);
                                                                    setEditBrandForm({
                                                                        name: brand.name,
                                                                        country_of_origin: brand.country_of_origin || '',
                                                                        description: brand.description || '',
                                                                    });
                                                                }}>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn-danger"
                                                                style={{ padding: '3px 7px', fontSize: 11, borderRadius: 6 }}
                                                                title="Delete Brand"
                                                                onClick={() => setDeleteBrandTarget(brand)}>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 14px', lineHeight: 1.4, minHeight: 32 }}>
                                                    {brand.description || 'Spare parts and components for cooling systems.'}
                                                </p>
                                            </div>

                                            {/* Bottom Stats & Category Pills */}
                                            <div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                                                    {Object.entries(catCounts).slice(0, 3).map(([cat, c]) => (
                                                        <span key={cat} style={{
                                                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                                                            background: '#F1F5F9', color: '#475569',
                                                        }}>
                                                            {cat}: {c}
                                                        </span>
                                                    ))}
                                                    {Object.keys(catCounts).length > 3 && (
                                                        <span style={{ fontSize: 10, color: '#94A3B8', alignSelf: 'center' }}>
                                                            +{Object.keys(catCounts).length - 3} more
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
                                                        {count} Items ({totalQty} Qty)
                                                    </span>
                                                    {partSubTab === 'in_stock' && (
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: totalQty > 0 ? '#16A34A' : '#94A3B8' }}>
                                                            {totalQty > 0 ? `${totalQty} in stock` : 'Out of Stock'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* ──────────────────────────────────────────────────────────
                            B. INSIDE BRAND CARD: DYNAMIC CATEGORIES & SPARE PARTS TABLE
                           ────────────────────────────────────────────────────────── */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Brand Header Banner with Back Button */}
                            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <button
                                        className="btn-secondary"
                                        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => setSelectedPartBrand(null)}>
                                        ← Back
                                    </button>
                                    <div>
                                        <h2 style={{ fontSize: 19, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                            {selectedPartBrand} Spare Parts {partSubTab === 'order' ? '— Order Base' : partSubTab === 'sold' ? '— Sold' : partSubTab === 'defects' ? '— Defects' : partSubTab === 'warranty_reserved' ? '— Warranty Reserved' : ''}
                                        </h2>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            {activeBrandParts.length} distinct spare part items ({activeBrandParts.reduce((s, p) => s + (p.quantity_on_hand || 0), 0)} total quantity)
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn-secondary"
                                        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => setManagePartCategoriesModal(true)}>
                                        Manage Categories
                                    </button>
                                    <button
                                        className="btn-primary"
                                        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                        onClick={() => {
                                            setPartCategoryForm({ name: '', description: '' });
                                            setAddPartCategoryModal(true);
                                        }}>
                                        + New Category
                                    </button>
                                </div>
                            </div>

                            {/* Category Types Pill Selector Bar */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                                        {selectedPartBrand} Spare Part Categories
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {allPartCategories.length} categories configured
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <button
                                        onClick={() => setSelectedPartCategory('all')}
                                        style={{
                                            padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                            borderColor: selectedPartCategory === 'all' ? '#3B82F6' : '#CBD5E1',
                                            background: selectedPartCategory === 'all' ? '#EFF6FF' : '#fff',
                                            color: selectedPartCategory === 'all' ? '#1D4ED8' : '#334155',
                                            boxShadow: selectedPartCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.15)' : 'none',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        All Categories ({activeBrandParts.length})
                                    </button>
                                    {allPartCategories.map(cat => {
                                        const count = activeBrandParts.filter(p => {
                                            const pCat = p.sub_category || p.category || '';
                                            return pCat.toLowerCase() === cat.name.toLowerCase() || (p.part_name || p.item_name || '').toLowerCase().includes(cat.name.toLowerCase());
                                        }).length;
                                        const isSelected = selectedPartCategory.toLowerCase() === cat.name.toLowerCase();
                                        return (
                                            <button
                                                key={cat.id || cat.name}
                                                onClick={() => setSelectedPartCategory(cat.name)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                                    borderColor: isSelected ? '#3B82F6' : '#E2E8F0',
                                                    background: isSelected ? '#3B82F6' : '#fff',
                                                    color: isSelected ? '#fff' : '#334155',
                                                    boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.25)' : 'none',
                                                    transition: 'all 0.15s ease',
                                                }}>
                                                {cat.name} <span style={{ opacity: 0.85, fontSize: 11, marginLeft: 4 }}>({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Spare Parts Table Card */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                                {selectedPartCategory === 'all' ? `All ${selectedPartBrand} Spare Parts` : `${selectedPartBrand} — ${selectedPartCategory}`}
                                            </p>
                                            {selectedPartCategory !== 'all' && (
                                                <button
                                                    onClick={() => setSelectedPartCategory('all')}
                                                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                                    View All Categories
                                                </button>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            Showing {filteredBrandParts.length} spare part items
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <SearchBar value={partTableSearch} onChange={setPartTableSearch} placeholder={`Search ${selectedPartBrand} parts...`} />
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                                            onClick={() => handleOpenAddPart(selectedPartBrand, selectedPartCategory !== 'all' ? selectedPartCategory : null)}>
                                            + Add Spare Part {selectedPartCategory !== 'all' ? `to ${selectedPartCategory}` : ''}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                {['Part ID', 'Part Name', 'Compatible Brands', 'Category', 'Unit', 'Initial', 'Qty on Hand', 'Reorder', 'Capital', 'Selling Price', 'Supplier', 'Status', 'Actions'].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredBrandParts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={13} style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                                        No spare parts found for {selectedPartBrand} {selectedPartCategory !== 'all' ? `in "${selectedPartCategory}"` : ''}.
                                                        <div style={{ marginTop: 10 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ fontSize: 12, padding: '5px 12px' }}
                                                                onClick={() => handleOpenAddPart(selectedPartBrand, selectedPartCategory !== 'all' ? selectedPartCategory : null)}>
                                                                + Add Spare Part Here
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredBrandParts.map(p => {
                                                const brandsStr = Array.isArray(p.compatible_brands) ? p.compatible_brands.join(', ') : (p.compatible_brands || 'Universal');
                                                const itemId = p.part_id || p.item_id;
                                                const canSell = (p.quantity_on_hand || 0) > 0 && p.status !== 'Sold';

                                                return (
                                                    <tr
                                                        key={itemId}
                                                        style={{ borderTop: '1px solid #F1F5F9' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#2563EB' }}>#{itemId}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 600, color: '#0F172A' }}>{p.part_name || p.item_name}</td>
                                                        <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{brandsStr}</td>
                                                        <td style={{ ...tdStyle }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                                                background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0',
                                                            }}>
                                                                {p.sub_category || p.category || 'General'}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...tdStyle, fontSize: 12 }}>{p.unit || 'pc'}</td>
                                                        <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{p.initial_stock ?? p.quantity_on_hand}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: p.quantity_on_hand <= p.reorder_level ? '#EF4444' : '#0F172A' }}>
                                                            {p.quantity_on_hand}
                                                        </td>
                                                        <td style={{ ...tdStyle, fontSize: 12, color: '#94A3B8' }}>{p.reorder_level}</td>
                                                        <td style={{ ...tdStyle, fontSize: 12 }}>₱{(p.capital || 0).toLocaleString()}</td>
                                                        <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#16A34A' }}>₱{(p.selling_price || 0).toLocaleString()}</td>
                                                        <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{p.supplier_name || p.supplier || '—'}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <StatusBadge status={p.status} />
                                                        </td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                                {canSell && (
                                                                    <button
                                                                        className="btn-primary"
                                                                        style={{ padding: '4px 10px', fontSize: 11, background: '#16A34A' }}
                                                                        onClick={() => {
                                                                            setPartSoldModal(p);
                                                                            setPartSoldForm(createEmptyPartSellForm(p));
                                                                        }}>
                                                                        Sold
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="btn-secondary"
                                                                    style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => {
                                                                        setEditPartTarget(p);
                                                                        setEditPartForm({
                                                                            part_name: p.part_name || p.item_name || '',
                                                                            compatible_brands: brandsStr,
                                                                            sub_category: p.sub_category || p.category || 'Capacitors',
                                                                            unit: p.unit || 'pc',
                                                                            initial_stock: String(p.initial_stock ?? p.quantity_on_hand),
                                                                            quantity_on_hand: String(p.quantity_on_hand),
                                                                            reorder_level: String(p.reorder_level),
                                                                            capital: String(p.capital || 0),
                                                                            selling_price: String(p.selling_price || 0),
                                                                            supplier_name: p.supplier_name || p.supplier || '',
                                                                            status: p.status || 'Available / On Hand',
                                                                        });
                                                                    }}>
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn-danger"
                                                                    style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => setDeletePartTarget(p)}>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                MODALS: BRAND, AC UNITS, SPARE PARTS, CATEGORIES, SOLD
               ══════════════════════════════════════════════════════════════ */}

            {/* Create Brand Modal (Only accessible from mainTab === 'brands' or partSubTab === 'in_stock') */}
            {addBrandModal && renderModalWrapper(true, () => setAddBrandModal(false), (
                <form onSubmit={handleCreateBrand}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Create AC Brand Card</h2>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Add a new brand card to group categories, AC units, and spare parts</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Card Name (AC Brand) *</label>
                            <input
                                className="input-field"
                                autoFocus
                                required
                                placeholder="e.g. Daikin, Carrier, Panasonic"
                                value={brandForm.name}
                                onChange={e => setBrandForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Country of Origin (Optional)</label>
                            <input
                                className="input-field"
                                placeholder="e.g. Japan, USA, South Korea"
                                value={brandForm.country_of_origin}
                                onChange={e => setBrandForm(p => ({ ...p, country_of_origin: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Description (Optional)</label>
                            <textarea
                                className="input-field"
                                style={{ height: 75, resize: 'none' }}
                                placeholder="Brief summary of this brand's cooling products..."
                                value={brandForm.description}
                                onChange={e => setBrandForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setAddBrandModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={savingBrand}>
                            {savingBrand ? 'Creating...' : 'Create Brand Card'}
                        </button>
                    </div>
                </form>
            ))}

            {/* Edit Brand Modal */}
            {editBrandTarget && renderModalWrapper(true, () => setEditBrandTarget(null), (
                <form onSubmit={handleUpdateBrand}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Edit Brand: {editBrandTarget.name}</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Brand Name *</label>
                            <input
                                className="input-field"
                                required
                                value={editBrandForm.name}
                                onChange={e => setEditBrandForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Country of Origin</label>
                            <input
                                className="input-field"
                                value={editBrandForm.country_of_origin}
                                onChange={e => setEditBrandForm(p => ({ ...p, country_of_origin: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Description</label>
                            <textarea
                                className="input-field"
                                style={{ height: 75, resize: 'none' }}
                                value={editBrandForm.description}
                                onChange={e => setEditBrandForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setEditBrandTarget(null)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={savingBrand}>Save Changes</button>
                    </div>
                </form>
            ))}

            {/* Delete Brand Modal */}
            <Modal
                open={!!deleteBrandTarget}
                title="Delete Brand?"
                message={`Are you sure you want to delete "${deleteBrandTarget?.name}"? Any AC units and spare parts under this brand will remain safely recorded.`}
                confirmLabel={deletingBrand ? "Deleting..." : "Yes, Delete Brand"}
                confirmDisabled={deletingBrand}
                variant="danger"
                onConfirm={handleDeleteBrand}
                onCancel={() => !deletingBrand && setDeleteBrandTarget(null)}
            />

            {/* ── AC CATEGORY MODALS ── */}
            {addCategoryModal && renderModalWrapper(true, () => setAddCategoryModal(false), (
                <form onSubmit={handleCreateCategory}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Create AC Category Type</h2>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>e.g. Window Type, Split Type, Floor Mounted Tower, Ceiling Cassette</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Category Name *</label>
                            <input
                                className="input-field"
                                autoFocus
                                required
                                placeholder="e.g. Floor Mounted Tower"
                                value={categoryForm.name}
                                onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Category Code / Short Form</label>
                            <input
                                className="input-field"
                                placeholder="e.g. Floor Mounted"
                                value={categoryForm.code}
                                onChange={e => setCategoryForm(p => ({ ...p, code: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Description (Optional)</label>
                            <textarea
                                className="input-field"
                                style={{ height: 75, resize: 'none' }}
                                placeholder="Details about this AC category type..."
                                value={categoryForm.description}
                                onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setAddCategoryModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={savingCategory}>
                            {savingCategory ? 'Creating...' : 'Create Category'}
                        </button>
                    </div>
                </form>
            ))}

            {manageCategoriesModal && renderModalWrapper(true, () => { setManageCategoriesModal(false); setEditCategoryTarget(null); }, (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Manage AC Categories</h2>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Configure dynamic AC category types</p>
                        </div>
                        <button className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setAddCategoryModal(true)}>
                            + New Category
                        </button>
                    </div>

                    {editCategoryTarget ? (
                        <form onSubmit={handleUpdateCategory} style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Edit Category: {editCategoryTarget.name}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                                <input className="input-field" required value={editCategoryForm.name} onChange={e => setEditCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                                <input className="input-field" value={editCategoryForm.code} onChange={e => setEditCategoryForm(p => ({ ...p, code: e.target.value }))} placeholder="Short Code" />
                                <textarea className="input-field" style={{ height: 60, resize: 'none' }} value={editCategoryForm.description} onChange={e => setEditCategoryForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditCategoryTarget(null)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '4px 12px' }} disabled={savingCategory}>Save Changes</button>
                            </div>
                        </form>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                        {allCategories.map(cat => {
                            const count = units.filter(u => (u.ac_type || '').toLowerCase() === cat.name.toLowerCase() || (cat.code && (u.ac_type || '').toLowerCase() === cat.code.toLowerCase())).length;
                            return (
                                <div key={cat.id || cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{cat.name}</p>
                                        <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{cat.description || 'No description'} · <strong style={{ color: '#2563EB' }}>{count} units in inventory</strong></p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                            onClick={() => {
                                                setEditCategoryTarget(cat);
                                                setEditCategoryForm({ name: cat.name, code: cat.code || '', description: cat.description || '' });
                                            }}>
                                            Edit
                                        </button>
                                        <button
                                            className="btn-danger"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                            onClick={() => setDeleteCategoryTarget(cat)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setManageCategoriesModal(false)}>Close</button>
                    </div>
                </div>
            ))}

            <Modal
                open={!!deleteCategoryTarget}
                title="Delete AC Category?"
                message={`Are you sure you want to delete "${deleteCategoryTarget?.name}"? Units currently under this category will remain safe in inventory records.`}
                confirmLabel={deletingCategory ? "Deleting..." : "Yes, Delete Category"}
                confirmDisabled={deletingCategory}
                variant="danger"
                onConfirm={handleDeleteCategory}
                onCancel={() => !deletingCategory && setDeleteCategoryTarget(null)}
            />

            {/* ── SPARE PARTS CATEGORY MODALS ── */}
            {addPartCategoryModal && renderModalWrapper(true, () => setAddPartCategoryModal(false), (
                <form onSubmit={handleCreatePartCategory}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Create Spare Part Category</h2>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>e.g. Capacitors, Contactors, Fan Motors, PCBs, Expansion Valves</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Category Name *</label>
                            <input
                                className="input-field"
                                autoFocus
                                required
                                placeholder="e.g. Expansion Valves & Coils"
                                value={partCategoryForm.name}
                                onChange={e => setPartCategoryForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Description (Optional)</label>
                            <textarea
                                className="input-field"
                                style={{ height: 75, resize: 'none' }}
                                placeholder="Details about this spare part category..."
                                value={partCategoryForm.description}
                                onChange={e => setPartCategoryForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setAddPartCategoryModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={savingPartCategory}>
                            {savingPartCategory ? 'Creating...' : 'Create Category'}
                        </button>
                    </div>
                </form>
            ))}

            {managePartCategoriesModal && renderModalWrapper(true, () => { setManagePartCategoriesModal(false); setEditPartCategoryTarget(null); }, (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Manage Spare Part Categories</h2>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Configure dynamic categories for spare parts</p>
                        </div>
                        <button className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setAddPartCategoryModal(true)}>
                            + New Category
                        </button>
                    </div>

                    {editPartCategoryTarget ? (
                        <form onSubmit={handleUpdatePartCategory} style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Edit Category: {editPartCategoryTarget.name}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                                <input className="input-field" required value={editPartCategoryForm.name} onChange={e => setEditPartCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                                <textarea className="input-field" style={{ height: 60, resize: 'none' }} value={editPartCategoryForm.description} onChange={e => setEditPartCategoryForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditPartCategoryTarget(null)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '4px 12px' }} disabled={savingPartCategory}>Save Changes</button>
                            </div>
                        </form>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                        {allPartCategories.map(cat => {
                            const count = parts.filter(p => (p.sub_category || p.category || '').toLowerCase() === cat.name.toLowerCase() || (p.part_name || p.item_name || '').toLowerCase().includes(cat.name.toLowerCase())).length;
                            return (
                                <div key={cat.id || cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{cat.name}</p>
                                        <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{cat.description || 'No description'} · <strong style={{ color: '#2563EB' }}>{count} parts recorded</strong></p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                            onClick={() => {
                                                setEditPartCategoryTarget(cat);
                                                setEditPartCategoryForm({ name: cat.name, description: cat.description || '' });
                                            }}>
                                            Edit
                                        </button>
                                        <button
                                            className="btn-danger"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                            onClick={() => setDeletePartCategoryTarget(cat)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setManagePartCategoriesModal(false)}>Close</button>
                    </div>
                </div>
            ))}

            <Modal
                open={!!deletePartCategoryTarget}
                title="Delete Spare Part Category?"
                message={`Are you sure you want to delete "${deletePartCategoryTarget?.name}"? Spare parts currently under this category will remain safe in inventory records.`}
                confirmLabel={deletingPartCategory ? "Deleting..." : "Yes, Delete Category"}
                confirmDisabled={deletingPartCategory}
                variant="danger"
                onConfirm={handleDeletePartCategory}
                onCancel={() => !deletingPartCategory && setDeletePartCategoryTarget(null)}
            />

            {/* ── AC UNIT MODALS ── */}
            {addUnitModal && !confirmAddUnit && renderModalWrapper(true, () => setAddUnitModal(false), (
                <>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Add AC Unit to Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>AC Brand *</p>
                            <select
                                className="input-field"
                                value={unitForm.brand}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        setAddBrandModal(true);
                                    } else {
                                        setUnitForm(p => ({ ...p, brand: e.target.value }));
                                    }
                                }}>
                                {allBrandCards.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                                {mainTab === 'brands' && <option value="__new__">+ Create New Brand...</option>}
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Category / Unit Type *</p>
                            <select
                                className="input-field"
                                value={unitForm.ac_type}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        setAddCategoryModal(true);
                                    } else {
                                        setUnitForm(p => ({ ...p, ac_type: e.target.value }));
                                    }
                                }}>
                                {allCategories.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                                <option value="__new__">+ Create New Category...</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Model Name *</p>
                            <input className="input-field" required placeholder="e.g. FTKF25AV1P Inverter Split Type" value={unitForm.model} onChange={e => setUnitForm(p => ({ ...p, model: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Serial Number *</p>
                            <input className="input-field" required placeholder="e.g. SN-DK-2026-991" value={unitForm.serial_number} onChange={e => setUnitForm(p => ({ ...p, serial_number: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Horsepower (HP) *</p>
                            <input type="number" step="0.5" className="input-field" required placeholder="e.g. 1.0, 1.5, 2.0" value={unitForm.horsepower} onChange={e => setUnitForm(p => ({ ...p, horsepower: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Refrigerant Type</p>
                            <Combobox value={unitForm.refrigerant_type} onChange={v => setUnitForm(p => ({ ...p, refrigerant_type: v }))} options={REFRIGERANT_OPTIONS} placeholder="e.g. R32, R410A" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Supplier Name</p>
                            <input className="input-field" placeholder="e.g. PhilAir Trading Corp" value={unitForm.supplier} onChange={e => setUnitForm(p => ({ ...p, supplier: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Purchase Price (₱) *</p>
                            <input type="number" className="input-field" required placeholder="0.00" value={unitForm.purchase_price} onChange={e => setUnitForm(p => ({ ...p, purchase_price: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱)</p>
                            <input type="number" className="input-field" placeholder="0.00" value={unitForm.selling_price} onChange={e => setUnitForm(p => ({ ...p, selling_price: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Purchase Date *</p>
                            <input type="date" className="input-field" required value={unitForm.purchase_date} onChange={e => setUnitForm(p => ({ ...p, purchase_date: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Warranty (Months) *</p>
                            <input type="number" className="input-field" required value={unitForm.warranty_period} onChange={e => setUnitForm(p => ({ ...p, warranty_period: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Status *</p>
                            <select className="input-field" value={unitForm.status} onChange={e => setUnitForm(p => ({ ...p, status: e.target.value }))}>
                                {AC_STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddUnitModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddUnit(true)}>Add AC Unit →</button>
                    </div>
                </>
            ))}
            <Modal
                open={confirmAddUnit}
                title="Confirm Add AC Unit?"
                message={`Add "${unitForm.brand} ${unitForm.model}" (${unitForm.serial_number}) to ${unitForm.ac_type} inventory?`}
                confirmLabel="Yes, Add Unit"
                onConfirm={handleAddUnit}
                onCancel={() => setConfirmAddUnit(false)}
            />

            {/* Edit AC Unit Modal */}
            {editUnitTarget && !confirmEditUnit && renderModalWrapper(true, () => setEditUnitTarget(null), (
                <>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Edit AC Unit</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>AC Brand *</p>
                            <select className="input-field" value={editUnitForm.brand} onChange={e => setEditUnitForm(p => ({ ...p, brand: e.target.value }))}>
                                {allBrandCards.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Category / Unit Type *</p>
                            <select className="input-field" value={editUnitForm.ac_type} onChange={e => setEditUnitForm(p => ({ ...p, ac_type: e.target.value }))}>
                                {allCategories.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Model Name *</p>
                            <input className="input-field" required value={editUnitForm.model} onChange={e => setEditUnitForm(p => ({ ...p, model: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Serial Number *</p>
                            <input className="input-field" required value={editUnitForm.serial_number} onChange={e => setEditUnitForm(p => ({ ...p, serial_number: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Horsepower (HP) *</p>
                            <input type="number" step="0.5" className="input-field" required value={editUnitForm.horsepower} onChange={e => setEditUnitForm(p => ({ ...p, horsepower: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Refrigerant Type</p>
                            <Combobox value={editUnitForm.refrigerant_type} onChange={v => setEditUnitForm(p => ({ ...p, refrigerant_type: v }))} options={REFRIGERANT_OPTIONS} placeholder="e.g. R32" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Supplier Name</p>
                            <input className="input-field" value={editUnitForm.supplier} onChange={e => setEditUnitForm(p => ({ ...p, supplier: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Purchase Price (₱) *</p>
                            <input type="number" className="input-field" required value={editUnitForm.purchase_price} onChange={e => setEditUnitForm(p => ({ ...p, purchase_price: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱)</p>
                            <input type="number" className="input-field" value={editUnitForm.selling_price} onChange={e => setEditUnitForm(p => ({ ...p, selling_price: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Purchase Date *</p>
                            <input type="date" className="input-field" required value={editUnitForm.purchase_date} onChange={e => setEditUnitForm(p => ({ ...p, purchase_date: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Warranty (Months) *</p>
                            <input type="number" className="input-field" required value={editUnitForm.warranty_period} onChange={e => setEditUnitForm(p => ({ ...p, warranty_period: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Status *</p>
                            <select className="input-field" value={editUnitForm.status} onChange={e => setEditUnitForm(p => ({ ...p, status: e.target.value }))}>
                                {AC_STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setEditUnitTarget(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmEditUnit(true)}>Save Changes →</button>
                    </div>
                </>
            ))}
            <Modal
                open={confirmEditUnit}
                title="Save Changes?"
                message={`Update "${editUnitForm.brand} ${editUnitForm.model}" in inventory?`}
                confirmLabel="Yes, Save"
                onConfirm={handleEditUnit}
                onCancel={() => setConfirmEditUnit(false)}
            />

            <Modal
                open={!!deleteUnitTarget}
                title="Delete AC Unit?"
                message={`Remove "${deleteUnitTarget?.brand} ${deleteUnitTarget?.model}" (${deleteUnitTarget?.serial_number}) from inventory records?`}
                confirmLabel={deletingUnit ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deletingUnit}
                variant="danger"
                onConfirm={handleDeleteUnit}
                onCancel={() => !deletingUnit && setDeleteUnitTarget(null)}
            />

            {/* AC Unit Sold Modal */}
            {soldModal && !confirmMarkSold && renderModalWrapper(true, () => setSoldModal(null), (
                <>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#16A34A', margin: '0 0 6px' }}>Mark AC Unit as Sold</h2>
                    <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>
                        <strong style={{ color: '#0F172A' }}>{soldModal.brand} {soldModal.model}</strong> · Serial: <span style={{ fontFamily: 'monospace' }}>{soldModal.serial_number}</span> · ₱{(soldModal.selling_price || 0).toLocaleString()}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Customer Name (Optional)</p>
                            <input className="input-field" placeholder="e.g. Juan Dela Cruz" value={soldForm.customer_name} onChange={e => setSoldForm(p => ({ ...p, customer_name: e.target.value }))} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Contact Number</p>
                                <input className="input-field" placeholder="e.g. 0917-123-4567" value={soldForm.customer_contact} onChange={e => setSoldForm(p => ({ ...p, customer_contact: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Payment Method</p>
                                <select className="input-field" value={soldForm.payment_method} onChange={e => setSoldForm(p => ({ ...p, payment_method: e.target.value }))}>
                                    <option value="Cash">Cash</option>
                                    <option value="GCash">GCash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setSoldModal(null)}>Cancel</button>
                        <button className="btn-primary" style={{ background: '#16A34A' }} onClick={() => setConfirmMarkSold(true)}>
                            Mark as Sold →
                        </button>
                    </div>
                </>
            ))}
            <Modal
                open={confirmMarkSold}
                title="Confirm Sold Status?"
                message={`Mark "${soldModal?.brand} ${soldModal?.model}" as Sold? The status will immediately change to "Sold".`}
                confirmLabel={processingSold ? "Updating..." : "Yes, Mark as Sold"}
                confirmDisabled={processingSold}
                onConfirm={handleMarkAsSold}
                onCancel={() => !processingSold && setConfirmMarkSold(false)}
            />

            {/* ══════════════════════════════════════════════════════════════
                SPARE PART MODALS: ADD, EDIT, DELETE, SOLD
               ══════════════════════════════════════════════════════════════ */}

            {/* Add Spare Part Modal */}
            {addPartModal && !confirmAddPart && renderModalWrapper(true, () => setAddPartModal(false), (
                <form onSubmit={(e) => { e.preventDefault(); setConfirmAddPart(true); }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Add Spare Part to Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Part Name *</p>
                            <Combobox
                                value={partForm.part_name}
                                onChange={v => setPartForm(p => ({ ...p, part_name: v }))}
                                options={PART_NAMES}
                                placeholder="e.g. Capacitor 35+5 MFD, Fan Motor 1/5HP"
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Compatible Brands *</p>
                            <input
                                className="input-field"
                                required
                                placeholder="e.g. Carrier, Daikin, Universal"
                                value={partForm.compatible_brands}
                                onChange={e => setPartForm(p => ({ ...p, compatible_brands: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Category / Sub-category *</p>
                            <select
                                className="input-field"
                                value={partForm.sub_category}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        setAddPartCategoryModal(true);
                                    } else {
                                        setPartForm(p => ({ ...p, sub_category: e.target.value }));
                                    }
                                }}>
                                {allPartCategories.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                                <option value="__new__">+ Create New Category...</option>
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit *</p>
                            <Combobox value={partForm.unit} onChange={v => setPartForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. pc, set, unit" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Initial Stock *</p>
                            <input
                                type="number"
                                className="input-field"
                                required
                                placeholder="e.g. 10"
                                value={partForm.initial_stock}
                                onChange={e => setPartForm(p => ({ ...p, initial_stock: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Quantity on Hand *</p>
                            <input
                                type="number"
                                className="input-field"
                                required
                                placeholder="e.g. 10"
                                value={partForm.quantity_on_hand}
                                onChange={e => setPartForm(p => ({ ...p, quantity_on_hand: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level *</p>
                            <input
                                type="number"
                                className="input-field"
                                required
                                placeholder="e.g. 2"
                                value={partForm.reorder_level}
                                onChange={e => setPartForm(p => ({ ...p, reorder_level: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Capital (₱)</p>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="0.00"
                                value={partForm.capital}
                                onChange={e => setPartForm(p => ({ ...p, capital: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱)</p>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="0.00"
                                value={partForm.selling_price}
                                onChange={e => setPartForm(p => ({ ...p, selling_price: e.target.value }))}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Supplier Name (Optional)</p>
                            <input
                                className="input-field"
                                placeholder="e.g. HVAC Parts Supply Corp"
                                value={partForm.supplier_name}
                                onChange={e => setPartForm(p => ({ ...p, supplier_name: e.target.value }))}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Status *</p>
                            <select
                                className="input-field"
                                value={partForm.status}
                                onChange={e => setPartForm(p => ({ ...p, status: e.target.value }))}>
                                {SPARE_PART_STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setAddPartModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">Add Spare Part →</button>
                    </div>
                </form>
            ))}
            <Modal
                open={confirmAddPart}
                title="Confirm Add Spare Part?"
                message={`Add "${partForm.part_name}" (${partForm.quantity_on_hand} ${partForm.unit}) under ${partForm.compatible_brands} to inventory?`}
                confirmLabel={savingPart ? "Adding..." : "Yes, Add Part"}
                confirmDisabled={savingPart}
                onConfirm={handleAddPart}
                onCancel={() => !savingPart && setConfirmAddPart(false)}
            />

            {/* Edit Spare Part Modal */}
            {editPartTarget && !confirmEditPart && renderModalWrapper(true, () => setEditPartTarget(null), (
                <form onSubmit={(e) => { e.preventDefault(); setConfirmEditPart(true); }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Edit Spare Part</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Part Name *</p>
                            <input
                                className="input-field"
                                required
                                value={editPartForm.part_name}
                                onChange={e => setEditPartForm(p => ({ ...p, part_name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Compatible Brands *</p>
                            <input
                                className="input-field"
                                required
                                value={editPartForm.compatible_brands}
                                onChange={e => setEditPartForm(p => ({ ...p, compatible_brands: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Category / Sub-category *</p>
                            <select
                                className="input-field"
                                value={editPartForm.sub_category}
                                onChange={e => setEditPartForm(p => ({ ...p, sub_category: e.target.value }))}>
                                {allPartCategories.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit *</p>
                            <Combobox value={editPartForm.unit} onChange={v => setEditPartForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. pc" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Initial Stock</p>
                            <input
                                type="number"
                                className="input-field"
                                value={editPartForm.initial_stock}
                                onChange={e => setEditPartForm(p => ({ ...p, initial_stock: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Quantity on Hand *</p>
                            <input
                                type="number"
                                className="input-field"
                                required
                                value={editPartForm.quantity_on_hand}
                                onChange={e => setEditPartForm(p => ({ ...p, quantity_on_hand: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level *</p>
                            <input
                                type="number"
                                className="input-field"
                                required
                                value={editPartForm.reorder_level}
                                onChange={e => setEditPartForm(p => ({ ...p, reorder_level: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Capital (₱)</p>
                            <input
                                type="number"
                                className="input-field"
                                value={editPartForm.capital}
                                onChange={e => setEditPartForm(p => ({ ...p, capital: e.target.value }))}
                            />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱)</p>
                            <input
                                type="number"
                                className="input-field"
                                value={editPartForm.selling_price}
                                onChange={e => setEditPartForm(p => ({ ...p, selling_price: e.target.value }))}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Supplier Name</p>
                            <input
                                className="input-field"
                                value={editPartForm.supplier_name}
                                onChange={e => setEditPartForm(p => ({ ...p, supplier_name: e.target.value }))}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Status *</p>
                            <select
                                className="input-field"
                                value={editPartForm.status}
                                onChange={e => setEditPartForm(p => ({ ...p, status: e.target.value }))}>
                                {SPARE_PART_STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setEditPartTarget(null)}>Cancel</button>
                        <button type="submit" className="btn-primary">Save Changes →</button>
                    </div>
                </form>
            ))}
            <Modal
                open={confirmEditPart}
                title="Save Changes?"
                message={`Update "${editPartForm.part_name}" in spare parts inventory?`}
                confirmLabel={savingEditPart ? "Saving..." : "Yes, Save"}
                confirmDisabled={savingEditPart}
                onConfirm={handleEditPart}
                onCancel={() => !savingEditPart && setConfirmEditPart(false)}
            />

            {/* Delete Spare Part Modal */}
            <Modal
                open={!!deletePartTarget}
                title="Delete Spare Part?"
                message={`Remove "${deletePartTarget?.part_name || deletePartTarget?.item_name}" from spare parts inventory records?`}
                confirmLabel={deletingPart ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deletingPart}
                variant="danger"
                onConfirm={handleDeletePart}
                onCancel={() => !deletingPart && setDeletePartTarget(null)}
            />

            {/* Spare Part Sold Modal */}
            {partSoldModal && !confirmPartSold && renderModalWrapper(true, () => setPartSoldModal(null), (
                <>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#16A34A', margin: '0 0 6px' }}>Sell Spare Part</h2>
                    <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>
                        <strong style={{ color: '#0F172A' }}>{partSoldModal.part_name || partSoldModal.item_name}</strong> · Compatible: {Array.isArray(partSoldModal.compatible_brands) ? partSoldModal.compatible_brands.join(', ') : partSoldModal.compatible_brands} · Available: <strong style={{ color: '#2563EB' }}>{partSoldModal.quantity_on_hand} {partSoldModal.unit}</strong>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Quantity to Sell *</p>
                                <input
                                    type="number"
                                    min="1"
                                    max={partSoldModal.quantity_on_hand}
                                    className="input-field"
                                    required
                                    value={partSoldForm.quantity_to_sell}
                                    onChange={e => setPartSoldForm(p => ({ ...p, quantity_to_sell: e.target.value }))}
                                />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱ each)</p>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={partSoldForm.selling_price}
                                    onChange={e => setPartSoldForm(p => ({ ...p, selling_price: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Customer Name (Optional)</p>
                            <input
                                className="input-field"
                                placeholder="e.g. Juan Dela Cruz"
                                value={partSoldForm.customer_name}
                                onChange={e => setPartSoldForm(p => ({ ...p, customer_name: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Contact Number</p>
                                <input
                                    className="input-field"
                                    placeholder="e.g. 0917-123-4567"
                                    value={partSoldForm.customer_contact}
                                    onChange={e => setPartSoldForm(p => ({ ...p, customer_contact: e.target.value }))}
                                />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Payment Method</p>
                                <select
                                    className="input-field"
                                    value={partSoldForm.payment_method}
                                    onChange={e => setPartSoldForm(p => ({ ...p, payment_method: e.target.value }))}>
                                    <option value="Cash">Cash</option>
                                    <option value="GCash">GCash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setPartSoldModal(null)}>Cancel</button>
                        <button
                            className="btn-primary"
                            style={{ background: '#16A34A' }}
                            onClick={() => setConfirmPartSold(true)}>
                            Complete Sale →
                        </button>
                    </div>
                </>
            ))}
            <Modal
                open={confirmPartSold}
                title="Confirm Spare Part Sale?"
                message={`Sell ${partSoldForm.quantity_to_sell} ${partSoldModal?.unit} of "${partSoldModal?.part_name || partSoldModal?.item_name}" for ₱${((parseFloat(partSoldForm.selling_price) || 0) * (parseInt(partSoldForm.quantity_to_sell) || 1)).toLocaleString()}? Stock on hand will be updated.`}
                confirmLabel={processingPartSold ? "Processing..." : "Yes, Complete Sale"}
                confirmDisabled={processingPartSold}
                onConfirm={handlePartSoldConfirm}
                onCancel={() => !processingPartSold && setConfirmPartSold(false)}
            />
        </div>
    );
}

export default AcUnits;