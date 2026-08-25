import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    AC_STATUS_OPTIONS,
    AC_TYPE_OPTIONS,
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

// Helper functions
function toDateStr(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateStr) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
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

const createEmptyPartForm = () => ({
    part_name: '',
    compatible_brands: '',
    qty: '',
    reorder_level: '',
    unit: '',
    capital: '',
    selling_price: '',
    supplier: ''
});

const createEmptySellForm = (warrantyPeriod = 12) => ({
    customer_name: '',
    customer_contact: '',
    customer_address: '',
    payment_method: 'Cash',
    warranty_period: warrantyPeriod,
});

function AcUnits({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;

    // Core data
    const [units, setUnits] = useState([]);
    const [brands, setBrands] = useState([]);
    const [unitTypes, setUnitTypes] = useState([]);
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Main View Navigation: 'brands' (in stock), 'order', 'sold', 'defects', 'spareparts'
    const [mainTab, setMainTab] = useState("brands");
    const [selectedBrand, setSelectedBrand] = useState(null); // Brand string or null (grid view)
    const [selectedCategory, setSelectedCategory] = useState("all"); // Category string or 'all'

    // Searches
    const [brandCardSearch, setBrandCardSearch] = useState('');
    const [unitTableSearch, setUnitTableSearch] = useState('');

    // Brand Card CRUD states (ONLY available in mainTab === 'brands')
    const [addBrandModal, setAddBrandModal] = useState(false);
    const [brandForm, setBrandForm] = useState({ name: '', country_of_origin: '', description: '' });
    const [editBrandTarget, setEditBrandTarget] = useState(null);
    const [editBrandForm, setEditBrandForm] = useState({ name: '', country_of_origin: '', description: '' });
    const [deleteBrandTarget, setDeleteBrandTarget] = useState(null);
    const [savingBrand, setSavingBrand] = useState(false);
    const [deletingBrand, setDeletingBrand] = useState(false);

    // Category / Unit Type CRUD states
    const [addCategoryModal, setAddCategoryModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '' });
    const [manageCategoriesModal, setManageCategoriesModal] = useState(false);
    const [editCategoryTarget, setEditCategoryTarget] = useState(null);
    const [editCategoryForm, setEditCategoryForm] = useState({ name: '', code: '', description: '' });
    const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
    const [savingCategory, setSavingCategory] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState(false);

    // AC Unit CRUD states
    const [addUnitModal, setAddUnitModal] = useState(false);
    const [unitForm, setUnitForm] = useState(createEmptyForm());
    const [confirmAddUnit, setConfirmAddUnit] = useState(false);
    const [editUnitTarget, setEditUnitTarget] = useState(null);
    const [editUnitForm, setEditUnitForm] = useState(createEmptyForm());
    const [confirmEditUnit, setConfirmEditUnit] = useState(false);
    const [deleteUnitTarget, setDeleteUnitTarget] = useState(null);
    const [deletingUnit, setDeletingUnit] = useState(false);

    // Sold action states
    const [soldModal, setSoldModal] = useState(null);
    const [soldForm, setSoldForm] = useState(createEmptySellForm());
    const [confirmMarkSold, setConfirmMarkSold] = useState(false);
    const [processingSold, setProcessingSold] = useState(false);

    // Order base arrival tracker
    const [editingArrival, setEditingArrival] = useState(null);
    const [arrivalInput, setArrivalInput] = useState('');

    // Spare parts state
    const [addPartModal, setAddPartModal] = useState(false);
    const [confirmAddPart, setConfirmAddPart] = useState(false);
    const [partForm, setPartForm] = useState(createEmptyPartForm());
    const [editPartTarget, setEditPartTarget] = useState(null);
    const [editPartForm, setEditPartForm] = useState(createEmptyPartForm());
    const [confirmEditPart, setConfirmEditPart] = useState(false);
    const [deletePartTarget, setDeletePartTarget] = useState(null);

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

    // ── Fetch Spare Parts ──
    const fetchParts = useCallback(async () => {
        try {
            const { data } = await window.axios.get(ep.spareParts ?? SUPER_ADMIN_ENDPOINTS.spareParts);
            setParts((Array.isArray(data?.data) ? data.data : []).map(normalizeSparePart));
        } catch (error) {
            console.error("Unable to load spare parts", error);
        }
    }, [ep.spareParts]);

    useEffect(() => {
        fetchUnits();
        fetchParts();
    }, [fetchUnits, fetchParts]);

    // Available Brand List (merging catalog brands with any distinct brands in ac_units_inventory)
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

    // Available Categories / Unit Types
    const allCategories = useMemo(() => {
        if (unitTypes.length > 0) return unitTypes;
        return AC_TYPE_OPTIONS.map((t, idx) => ({ id: idx + 1, name: t, code: t, description: `${t} airconditioners` }));
    }, [unitTypes]);

    // ── Context-filtered units depending on current mainTab ──
    const currentTabUnits = useMemo(() => {
        if (mainTab === 'order') return units.filter(u => u.status === 'Order Base');
        if (mainTab === 'sold') return units.filter(u => u.status === 'Sold');
        if (mainTab === 'defects') return units.filter(u => u.status === 'Defect');
        // mainTab === 'brands' (active inventory: Available or Reserved)
        return units.filter(u => u.status !== 'Sold');
    }, [units, mainTab]);

    // Tab counts
    const inStockUnits = useMemo(() => units.filter(u => u.status !== 'Sold'), [units]);
    const availableUnits = useMemo(() => units.filter(u => u.status === 'Available'), [units]);
    const orderBaseUnits = useMemo(() => units.filter(u => u.status === 'Order Base'), [units]);
    const soldUnits = useMemo(() => units.filter(u => u.status === 'Sold'), [units]);
    const defectUnits = useMemo(() => units.filter(u => u.status === 'Defect'), [units]);
    const lowParts = useMemo(() => parts.filter(p => p.quantity_on_hand <= p.reorder_level), [parts]);

    // Filtered brand cards by search & whether they have matching items for non-brands tabs
    const filteredBrandCards = useMemo(() => {
        const q = brandCardSearch.toLowerCase().trim();
        return allBrandCards.filter(b => {
            const matchesSearch = !q || b.name.toLowerCase().includes(q) ||
                (b.country_of_origin || '').toLowerCase().includes(q) ||
                (b.description || '').toLowerCase().includes(q);
            if (!matchesSearch) return false;
            return true;
        });
    }, [allBrandCards, brandCardSearch]);

    // Units under currently selected brand in the active tab context
    const activeBrandUnits = useMemo(() => {
        if (!selectedBrand) return currentTabUnits;
        return currentTabUnits.filter(u => (u.brand || '').toLowerCase() === selectedBrand.toLowerCase());
    }, [currentTabUnits, selectedBrand]);

    // Filtered units by active category and table search
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

    // Tab change handler
    const handleTabChange = (tabKey) => {
        setMainTab(tabKey);
        setSelectedBrand(null);
        setSelectedCategory('all');
        setBrandCardSearch('');
        setUnitTableSearch('');
    };

    // ══════════════════════════════════════════════════════════════════
    // BRAND CARD CRUD HANDLERS (Only in mainTab === 'brands')
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
            setSelectedBrand(brandForm.name.trim());
            setSelectedCategory('all');
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
            setEditBrandTarget(null);
            await fetchCatalog();
            await fetchUnits(false);
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
            setDeleteBrandTarget(null);
            await fetchCatalog();
            await fetchUnits(false);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete brand."), "error");
        } finally {
            setDeletingBrand(false);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // CATEGORY / UNIT TYPE CRUD HANDLERS
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

    // ── Sold Button Handler ──
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
        if (mainTab === 'spareparts') return `${parts.length} parts tracked · ${lowParts.length} low stock alerts`;
        return `Organized in clickable Brands & Categories · ${inStockUnits.length} in stock · ${availableUnits.length} available · ${soldUnits.length} sold · ${defectUnits.length} defect`;
    };

    if (loading) {
        return (
            <div style={{ padding: 32, borderRadius: 12, background: '#F8FAFC', color: '#64748B', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Loading AC Units...</p>
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
                    <button className="btn-secondary" onClick={() => fetchUnits()}>Refresh</button>
                    {/* ONLY the main "Brands" tab allows adding new Brand Cards */}
                    {mainTab === 'brands' && !selectedBrand && (
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
                    {mainTab === 'spareparts' && (
                        <button className="btn-primary" onClick={() => setAddPartModal(true)}>
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
                SHARED BRAND CARDS & CATEGORIES ARCHITECTURE
                (Applies to Brands, Order Base, Sold Units, and Defects)
               ══════════════════════════════════════════════════════════════ */}
            {mainTab !== 'spareparts' && (
                <div>
                    {/* ──────────────────────────────────────────────────────────
                        A. TOP LEVEL: CLICKABLE BRAND CARDS GRID
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
                            B. INSIDE BRAND CARD: DYNAMIC CATEGORIES & UNITS LIST
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
                5. SPARE PARTS TAB
               ══════════════════════════════════════════════════════════════ */}
            {mainTab === 'spareparts' && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>AC Spare Parts & Components</h2>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Motors, PCBs, capacitors, contactors, and replacement parts</p>
                        </div>
                        <button className="btn-primary" onClick={() => setAddPartModal(true)}>+ Add Spare Part</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC' }}>
                                    {['Part ID', 'Part Name', 'Compatible Brands', 'Qty', 'Reorder', 'Unit', 'Capital', 'Selling Price', 'Supplier', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {parts.map(p => (
                                    <tr key={p.part_id || p.item_id} style={{ borderTop: '1px solid #F1F5F9' }}>
                                        <td style={{ ...tdStyle, fontSize: 12, color: '#2563EB', fontWeight: 600 }}>#{p.part_id || p.item_id}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600 }}>{p.part_name || p.item_name}</td>
                                        <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{Array.isArray(p.compatible_brands) ? p.compatible_brands.join(', ') : (p.compatible_brands || 'Universal')}</td>
                                        <td style={{ ...tdStyle, fontWeight: 700 }}>{p.quantity_on_hand}</td>
                                        <td style={{ ...tdStyle, color: '#94A3B8' }}>{p.reorder_level}</td>
                                        <td style={{ ...tdStyle }}>{p.unit}</td>
                                        <td style={{ ...tdStyle }}>₱{(p.capital || 0).toLocaleString()}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600, color: '#16A34A' }}>₱{(p.selling_price || 0).toLocaleString()}</td>
                                        <td style={{ ...tdStyle }}>{p.supplier_name || p.supplier || '—'}</td>
                                        <td style={{ padding: '10px 12px' }}><StatusBadge status={p.status} /></td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}
                                                    onClick={() => {
                                                        setEditPartTarget(p);
                                                        setEditPartForm({
                                                            part_name: p.part_name || p.item_name,
                                                            compatible_brands: Array.isArray(p.compatible_brands) ? p.compatible_brands.join(', ') : (p.compatible_brands || ''),
                                                            qty: String(p.quantity_on_hand),
                                                            reorder_level: String(p.reorder_level),
                                                            unit: p.unit,
                                                            capital: String(p.capital || 0),
                                                            selling_price: String(p.selling_price || 0),
                                                            supplier: p.supplier_name || p.supplier || '',
                                                        });
                                                    }}>
                                                    Edit
                                                </button>
                                                <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}
                                                    onClick={() => setDeletePartTarget(p)}>
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
            )}

            {/* ══════════════════════════════════════════════════════════════
                MODALS: BRAND, CATEGORIES, AC UNITS, SOLD, SPARE PARTS
               ══════════════════════════════════════════════════════════════ */}

            {/* Create Brand Modal (Only accessible from mainTab === 'brands') */}
            {addBrandModal && renderModalWrapper(true, () => setAddBrandModal(false), (
                <form onSubmit={handleCreateBrand}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>Create AC Brand Card</h2>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Add a new brand card to group AC unit categories and inventory</p>
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
                message={`Are you sure you want to delete "${deleteBrandTarget?.name}"? Any AC units under this brand will remain safely recorded.`}
                confirmLabel={deletingBrand ? "Deleting..." : "Yes, Delete Brand"}
                confirmDisabled={deletingBrand}
                variant="danger"
                onConfirm={handleDeleteBrand}
                onCancel={() => !deletingBrand && setDeleteBrandTarget(null)}
            />

            {/* Create Category Modal */}
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

            {/* Manage Categories Modal */}
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

            {/* Delete Category Modal */}
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

            {/* ── Add AC Unit Modal ── */}
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

            {/* ── Edit AC Unit Modal ── */}
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

            {/* ── Delete AC Unit Modal ── */}
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

            {/* ── Mark as Sold Modal ── */}
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

            {/* Spare Parts Modals (Add, Delete) */}
            {addPartModal && !confirmAddPart && renderModalWrapper(true, () => setAddPartModal(false), (
                <>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Add Spare Part</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Part Name</p>
                            <Combobox value={partForm.part_name} onChange={v => setPartForm(p => ({ ...p, part_name: v }))} options={PART_NAMES} placeholder="e.g. Capacitor 35+5 MFD" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Compatible Brands</p>
                            <input className="input-field" placeholder="e.g. Carrier, Daikin, Panasonic" value={partForm.compatible_brands} onChange={e => setPartForm(p => ({ ...p, compatible_brands: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={partForm.unit} onChange={v => setPartForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. pc" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Initial Quantity</p>
                            <input type="number" className="input-field" placeholder="e.g. 10" value={partForm.qty} onChange={e => setPartForm(p => ({ ...p, qty: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Capital (₱)</p>
                            <input type="number" className="input-field" placeholder="0.00" value={partForm.capital} onChange={e => setPartForm(p => ({ ...p, capital: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱)</p>
                            <input type="number" className="input-field" placeholder="0.00" value={partForm.selling_price} onChange={e => setPartForm(p => ({ ...p, selling_price: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddPartModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddPart(true)}>Add Spare Part →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmAddPart} title="Add Spare Part?" message={`Add "${partForm.part_name}" to spare parts inventory?`} confirmLabel="Yes, Add" onConfirm={async () => {
                const brandsList = partForm.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
                const qty = parseInt(partForm.qty) || 0;
                const capital = parseFloat(partForm.capital) || 0;
                const sellingPrice = parseFloat(partForm.selling_price) || 0;
                try {
                    await window.axios.post(ep.spareParts ?? SUPER_ADMIN_ENDPOINTS.spareParts, {
                        item_name: partForm.part_name.trim(),
                        item_type: 'Spare Part',
                        inventory_mode: 'spare_part',
                        compatible_brands: brandsList,
                        quantity_on_hand: qty,
                        initial_stock: qty,
                        reorder_level: 2,
                        unit: partForm.unit.trim() || 'pc',
                        capital,
                        selling_price: sellingPrice,
                        profit: Math.max(0, sellingPrice - capital),
                        status: qty === 0 ? 'Out of Stock' : 'Available',
                    });
                    addToast(`Spare part "${partForm.part_name}" added.`);
                    setAddPartModal(false);
                    setConfirmAddPart(false);
                    setPartForm(createEmptyPartForm());
                    await fetchParts();
                } catch (error) {
                    addToast(extractErrorMessage(error, "Unable to add spare part."), "error");
                }
            }} onCancel={() => setConfirmAddPart(false)} />
        </div>
    );
}

export default AcUnits;