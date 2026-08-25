import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    INVENTORY_TYPE_OPTIONS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDate,
    normalizeInventoryItem,
} from "../../utils/superAdmin";

// Constants
const WORKER_MATERIAL_NAMES = [
    'Refrigerant R32 (1kg)', 'Refrigerant R410A (1kg)', 'Copper Pipe 1/4"', 'Copper Pipe 3/8"',
    'Insulation Tape', 'Electrical Cable 2.0mm', 'AC Coil Cleaner (spray)',
    'Flux Paste', 'Brazing Rod', 'PVC Drain Hose', 'Filter Mesh', 'Condenser Fins',
];
const SALE_ITEM_NAMES = [
    'AC Coil Cleaner (spray)', 'Insulation Tape', 'Refrigerant R32 (1kg)', 'Refrigerant R410A (1kg)',
    'Pipe Flaring Tool', 'Digital Clamp Meter', 'Manifold Gauge Set', 'Vacuum Pump',
    'Torque Wrench Set', 'Drill Machine',
];
const POWER_TOOL_NAMES = [
    'Manifold Gauge Set', 'Vacuum Pump', 'Digital Clamp Meter', 'Cordless Drill',
    'Refrigerant Recovery Machine', 'High-Pressure Washer', 'Cable Tester', 'Level Meter',
];
const HAND_TOOL_NAMES = [
    'Pipe Flaring Tool Set', 'Torque Wrench Set', 'Screwdriver Set', 'Hex Key Set',
    'Pliers Set', 'Wire Stripper Set', 'Tape Measure', 'Utility Knife Set',
];
const UNIT_OPTIONS = ['can', 'roll', 'm', 'pc', 'set', 'unit', 'L', 'kg', 'box', 'pair', 'spool', 'cylinder', 'gallon', 'pcs'];

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
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxHeight: 160, overflowY: 'auto', marginTop: 2,
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
        <div style={{ position: 'relative', width: 220 }}>
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

function MaterialsTools({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [items, setItems] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Main Tabs
    const [mainTab, setMainTab] = useState('worker');
    const [workerSubTab, setWorkerSubTab] = useState('materials');
    
    // Active Sub-category Selection per Field ('all' or sub-category name)
    const [selectedMaterialCategory, setSelectedMaterialCategory] = useState('all');
    const [selectedPowerCategory, setSelectedPowerCategory] = useState('all');
    const [selectedHandCategory, setSelectedHandCategory] = useState('all');
    const [selectedSaleCategory, setSelectedSaleCategory] = useState('all');

    // Search states
    const [materialSearch, setMaterialSearch] = useState('');
    const [powerSearch, setPowerSearch] = useState('');
    const [handSearch, setHandSearch] = useState('');
    const [saleSearch, setSaleSearch] = useState('');
    
    // Sub-category CRUD modals
    const [createCategoryModal, setCreateCategoryModal] = useState(false);
    const [manageCategoriesModal, setManageCategoriesModal] = useState(false);
    const [categoryFieldType, setCategoryFieldType] = useState('materials');
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [savingCategory, setSavingCategory] = useState(false);
    const [editCategoryTarget, setEditCategoryTarget] = useState(null);
    const [editCategoryForm, setEditCategoryForm] = useState({ name: '', description: '' });
    const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
    const [deletingCategory, setDeletingCategory] = useState(false);

    // Worker material qty
    const [qtyAction, setQtyAction] = useState(null);
    const [qtyValue, setQtyValue] = useState("");
    const [updatingQty, setUpdatingQty] = useState(false);
    const [confirmQty, setConfirmQty] = useState(false);
    
    // Power tool actions
    const [borrowTarget, setBorrowTarget] = useState(null);
    const [returnTarget, setReturnTarget] = useState(null);
    const [damagedModal, setDamagedModal] = useState(null);
    const [damageReport, setDamageReport] = useState('');
    
    // Sell modal
    const [sellTarget, setSellTarget] = useState(null);
    const [sellQty, setSellQty] = useState('1');
    const [sellMethod, setSellMethod] = useState('Cash');
    const [confirmSell, setConfirmSell] = useState(false);
    
    // Delete states
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    
    // Add modals
    const [addWorkerMaterialModal, setAddWorkerMaterialModal] = useState(false);
    const [addPowerToolModal, setAddPowerToolModal] = useState(false);
    const [addHandToolModal, setAddHandToolModal] = useState(false);
    const [addSaleModal, setAddSaleModal] = useState(false);
    
    // Edit/Delete targets
    const [editWMTarget, setEditWMTarget] = useState(null);
    const [editPTTarget, setEditPTTarget] = useState(null);
    const [editHTTarget, setEditHTTarget] = useState(null);
    const [editSaleTarget, setEditSaleTarget] = useState(null);
    
    const [confirmEditWM, setConfirmEditWM] = useState(false);
    const [confirmEditPT, setConfirmEditPT] = useState(false);
    const [confirmEditHT, setConfirmEditHT] = useState(false);
    const [confirmEditSale, setConfirmEditSale] = useState(false);
    const [confirmAddWM, setConfirmAddWM] = useState(false);
    const [confirmAddPT, setConfirmAddPT] = useState(false);
    const [confirmAddHT, setConfirmAddHT] = useState(false);
    const [confirmAddSale, setConfirmAddSale] = useState(false);
    
    // Form states with sub_category / folder_id
    const [wmForm, setWmForm] = useState({ item_name: '', unit: '', initial_stock: '', reorder_level: '', sub_category: '', folder_id: null });
    const [ptForm, setPtForm] = useState({ item_name: '', serial_number: '', unit: 'unit', sub_category: '', folder_id: null });
    const [htAddForm, setHtAddForm] = useState({ item_name: '', unit: '', quantity: '', reorder_level: '', sub_category: '', folder_id: null });
    const [saleForm, setSaleForm] = useState({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '', capital: '', profit: '', supplier_name: '', sub_category: '', folder_id: null });
    
    const [editWMForm, setEditWMForm] = useState({ item_name: '', unit: '', initial_stock: '', reorder_level: '', sub_category: '', folder_id: null });
    const [editPTForm, setEditPTForm] = useState({ item_name: '', serial_number: '', unit: '', status: 'Available', sub_category: '', folder_id: null });
    const [editHTForm, setEditHTForm] = useState({ item_name: '', unit: '', quantity_on_hand: '', reorder_level: '', sub_category: '', folder_id: null });
    const [editSaleForm, setEditSaleForm] = useState({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '', capital: '', profit: '', supplier_name: '', sub_category: '', folder_id: null });

    // Fetch Sub-categories (Folders)
    const fetchFolders = useCallback(async () => {
        try {
            const folderUrl = ep.inventoryFolders || '/super-admin/inventory/folders';
            const { data } = await window.axios.get(folderUrl);
            setFolders(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            console.error("Unable to load inventory sub-categories", error);
        }
    }, [ep.inventoryFolders]);

    // Fetch Items
    const fetchItems = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(ep.inventory);
            setItems((Array.isArray(data?.data) ? data.data : []).map(normalizeInventoryItem));
            await fetchFolders();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load inventory items."), "error");
        } finally {
            setLoading(false);
        }
    }, [ep.inventory, addToast, fetchFolders]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Grouped Sub-categories by Field Type
    const materialCategories = useMemo(() => folders.filter(f => f.field_type === 'materials'), [folders]);
    const powerCategories = useMemo(() => folders.filter(f => f.field_type === 'power_tools'), [folders]);
    const handCategories = useMemo(() => folders.filter(f => f.field_type === 'hand_tools'), [folders]);
    const saleCategories = useMemo(() => folders.filter(f => f.field_type === 'sale_items'), [folders]);

    // Filtered items by category & sub-category
    const workerMaterials = useMemo(() => items.filter(i => i.inventory_mode === 'worker' && i.item_type !== 'Tool'), [items]);
    const powerTools = useMemo(() => items.filter(i => i.inventory_mode === 'worker' && i.item_type === 'Tool' && i.tool_subtype === 'power'), [items]);
    const handTools = useMemo(() => items.filter(i => i.inventory_mode === 'worker' && i.item_type === 'Tool' && i.tool_subtype === 'hand'), [items]);
    const saleItems = useMemo(() => items.filter(i => i.inventory_mode === 'sale'), [items]);
    
    const lowStockWorker = useMemo(() => workerMaterials.filter(i => i.quantity_on_hand <= i.reorder_level), [workerMaterials]);
    const lowStockSale = useMemo(() => saleItems.filter(i => i.quantity_on_hand <= i.reorder_level), [saleItems]);

    // Active field's filtered items taking into account selected sub-category
    const filteredMaterials = useMemo(() => {
        return workerMaterials.filter(i => {
            const matchesSearch = i.item_name.toLowerCase().includes(materialSearch.toLowerCase()) || (i.sub_category || '').toLowerCase().includes(materialSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (selectedMaterialCategory === 'all') return true;
            return i.sub_category === selectedMaterialCategory || i.folder_id === selectedMaterialCategory;
        });
    }, [workerMaterials, materialSearch, selectedMaterialCategory]);
    
    const filteredPower = useMemo(() => {
        return powerTools.filter(i => {
            const matchesSearch = i.item_name.toLowerCase().includes(powerSearch.toLowerCase()) ||
                (i.serial_number || '').toLowerCase().includes(powerSearch.toLowerCase()) ||
                (i.sub_category || '').toLowerCase().includes(powerSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (selectedPowerCategory === 'all') return true;
            return i.sub_category === selectedPowerCategory || i.folder_id === selectedPowerCategory;
        });
    }, [powerTools, powerSearch, selectedPowerCategory]);
    
    const filteredHand = useMemo(() => {
        return handTools.filter(i => {
            const matchesSearch = i.item_name.toLowerCase().includes(handSearch.toLowerCase()) || (i.sub_category || '').toLowerCase().includes(handSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (selectedHandCategory === 'all') return true;
            return i.sub_category === selectedHandCategory || i.folder_id === selectedHandCategory;
        });
    }, [handTools, handSearch, selectedHandCategory]);
    
    const filteredSale = useMemo(() => {
        return saleItems.filter(i => {
            const matchesSearch = i.item_name.toLowerCase().includes(saleSearch.toLowerCase()) ||
                (i.supplier_name || '').toLowerCase().includes(saleSearch.toLowerCase()) ||
                (i.sub_category || '').toLowerCase().includes(saleSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (selectedSaleCategory === 'all') return true;
            return i.sub_category === selectedSaleCategory || i.folder_id === selectedSaleCategory;
        });
    }, [saleItems, saleSearch, selectedSaleCategory]);

    const statusBadgeColor = (status) => {
        if (status === 'Available') return { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' };
        if (status === 'Borrowed') return { bg: 'rgba(63,125,255,0.1)', color: '#3F7DFF' };
        return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' };
    };

    // Sub-category CRUD Handlers
    const handleOpenCreateCategory = (fieldType) => {
        setCategoryFieldType(fieldType);
        setCategoryForm({ name: '', description: '' });
        setCreateCategoryModal(true);
    };

    const handleCreateCategory = async (e) => {
        e?.preventDefault();
        if (!categoryForm.name.trim()) {
            addToast("Please enter a sub-category name.", "error");
            return;
        }
        setSavingCategory(true);
        try {
            const storeCategoryUrl = ep.storeInventoryFolder || '/super-admin/inventory/folders';
            await window.axios.post(storeCategoryUrl, {
                field_type: categoryFieldType,
                name: categoryForm.name.trim(),
                description: categoryForm.description?.trim() || null,
            });
            addToast(`Sub-category "${categoryForm.name.trim()}" created successfully!`);
            setCreateCategoryModal(false);
            setCategoryForm({ name: '', description: '' });
            await fetchFolders();
            // Automatically switch to the newly created sub-category
            if (categoryFieldType === 'materials') setSelectedMaterialCategory(categoryForm.name.trim());
            if (categoryFieldType === 'power_tools') setSelectedPowerCategory(categoryForm.name.trim());
            if (categoryFieldType === 'hand_tools') setSelectedHandCategory(categoryForm.name.trim());
            if (categoryFieldType === 'sale_items') setSelectedSaleCategory(categoryForm.name.trim());
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to create sub-category."), "error");
        } finally {
            setSavingCategory(false);
        }
    };

    const handleUpdateCategory = async (e) => {
        e?.preventDefault();
        if (!editCategoryTarget || !editCategoryForm.name.trim()) return;
        setSavingCategory(true);
        try {
            const updateUrl = ep.updateInventoryFolder ? ep.updateInventoryFolder(editCategoryTarget.id) : `/super-admin/inventory/folders/${editCategoryTarget.id}`;
            await window.axios.patch(updateUrl, {
                name: editCategoryForm.name.trim(),
                description: editCategoryForm.description?.trim() || null,
            });
            addToast(`Sub-category updated to "${editCategoryForm.name.trim()}".`);
            setEditCategoryTarget(null);
            await fetchFolders();
            await fetchItems(false);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update sub-category."), "error");
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!deleteCategoryTarget) return;
        setDeletingCategory(true);
        try {
            const deleteUrl = ep.deleteInventoryFolder ? ep.deleteInventoryFolder(deleteCategoryTarget.id) : `/super-admin/inventory/folders/${deleteCategoryTarget.id}`;
            await window.axios.delete(deleteUrl);
            addToast(`Sub-category "${deleteCategoryTarget.name}" deleted.`);
            setDeleteCategoryTarget(null);
            // Reset active filter if we were inside that deleted sub-category
            if (selectedMaterialCategory === deleteCategoryTarget.name) setSelectedMaterialCategory('all');
            if (selectedPowerCategory === deleteCategoryTarget.name) setSelectedPowerCategory('all');
            if (selectedHandCategory === deleteCategoryTarget.name) setSelectedHandCategory('all');
            if (selectedSaleCategory === deleteCategoryTarget.name) setSelectedSaleCategory('all');
            await fetchFolders();
            await fetchItems(false);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete sub-category."), "error");
        } finally {
            setDeletingCategory(false);
        }
    };

    // Open Add Item modal with current active sub-category pre-filled
    const handleOpenAddMaterial = (prefilledCategory = null) => {
        const catName = prefilledCategory || (selectedMaterialCategory !== 'all' ? selectedMaterialCategory : (materialCategories[0]?.name || 'General Materials'));
        const catObj = materialCategories.find(f => f.name === catName);
        setWmForm({ item_name: '', unit: '', initial_stock: '', reorder_level: '5', sub_category: catName, folder_id: catObj?.id || null });
        setAddWorkerMaterialModal(true);
    };

    const handleOpenAddPowerTool = (prefilledCategory = null) => {
        const catName = prefilledCategory || (selectedPowerCategory !== 'all' ? selectedPowerCategory : (powerCategories[0]?.name || 'General Power Tools'));
        const catObj = powerCategories.find(f => f.name === catName);
        setPtForm({ item_name: '', serial_number: '', unit: 'unit', sub_category: catName, folder_id: catObj?.id || null });
        setAddPowerToolModal(true);
    };

    const handleOpenAddHandTool = (prefilledCategory = null) => {
        const catName = prefilledCategory || (selectedHandCategory !== 'all' ? selectedHandCategory : (handCategories[0]?.name || 'General Hand Tools'));
        const catObj = handCategories.find(f => f.name === catName);
        setHtAddForm({ item_name: '', unit: '', quantity: '', reorder_level: '2', sub_category: catName, folder_id: catObj?.id || null });
        setAddHandToolModal(true);
    };

    const handleOpenAddSaleItem = (prefilledCategory = null) => {
        const catName = prefilledCategory || (selectedSaleCategory !== 'all' ? selectedSaleCategory : (saleCategories[0]?.name || 'General For-Sale Items'));
        const catObj = saleCategories.find(f => f.name === catName);
        setSaleForm({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '3', capital: '', profit: '', supplier_name: '', sub_category: catName, folder_id: catObj?.id || null });
        setAddSaleModal(true);
    };

    // Item Quantity Update
    const handleQtyUpdate = async () => {
        if (updatingQty || !qtyAction) return;
        const amount = Number(qtyValue);
        if (!Number.isFinite(amount) || amount <= 0) {
            addToast("Enter a valid quantity greater than zero.", "error");
            return;
        }

        setUpdatingQty(true);
        try {
            const nextQuantity = qtyAction.mode === "add"
                ? qtyAction.item.quantity_on_hand + amount
                : Math.max(0, qtyAction.item.quantity_on_hand - amount);

            await window.axios.patch(ep.updateInventory(qtyAction.item.item_id), {
                quantity_on_hand: nextQuantity,
            });

            addToast(`Stock updated: ${qtyAction.item.item_name} ${qtyAction.mode === 'add' ? '+' : '-'}${amount} ${qtyAction.item.unit}.`);
            setQtyAction(null);
            setQtyValue('');
            setConfirmQty(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update the item quantity."), "error");
        } finally {
            setUpdatingQty(false);
        }
    };

    const handleBorrow = async () => {
        if (!borrowTarget) return;
        try {
            await window.axios.patch(ep.updateInventory(borrowTarget.item_id), {
                status: 'Borrowed',
            });
            addToast(`${borrowTarget.item_name} (${borrowTarget.serial_number}) has been checked out.`);
            setBorrowTarget(null);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to borrow tool."), "error");
        }
    };

    const handleReturn = async () => {
        if (!returnTarget) return;
        try {
            await window.axios.patch(ep.updateInventory(returnTarget.item_id), {
                status: 'Available',
            });
            addToast(`${returnTarget.item_name} (${returnTarget.serial_number}) has been returned and is available.`);
            setReturnTarget(null);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to return tool."), "error");
        }
    };

    const handleDamageReport = async () => {
        if (!damagedModal) return;
        try {
            await window.axios.patch(ep.updateInventory(damagedModal.item_id), {
                status: 'Lost/Damaged',
            });
            addToast(`Damaged/lost tool "${damagedModal.item_name}" (${damagedModal.serial_number}) has been logged.`, 'warning');
            setDamagedModal(null);
            setDamageReport('');
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to report damage."), "error");
        }
    };

    const handleSell = async () => {
        if (!sellTarget) return;
        const qty = parseInt(sellQty) || 1;
        try {
            const newQty = Math.max(0, sellTarget.quantity_on_hand - qty);
            await window.axios.patch(ep.updateInventory(sellTarget.item_id), {
                quantity_on_hand: newQty,
            });
            addToast(`Sold ${qty}x ${sellTarget.item_name} for ₱${(((sellTarget.capital || 0) + (sellTarget.profit || 0)) * qty).toLocaleString()} (${sellMethod}).`);
            setSellTarget(null);
            setConfirmSell(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to process sale."), "error");
        }
    };

    const handleAddWorkerMaterial = async () => {
        try {
            const catObj = materialCategories.find(f => f.name === wmForm.sub_category);
            const payload = {
                item_name: wmForm.item_name,
                item_type: 'Material',
                inventory_mode: 'worker',
                sub_category: wmForm.sub_category || 'General Materials',
                folder_id: catObj?.id || null,
                quantity_on_hand: parseInt(wmForm.initial_stock) || 0,
                initial_stock: parseInt(wmForm.initial_stock) || 0,
                reorder_level: parseInt(wmForm.reorder_level) || 0,
                unit: wmForm.unit,
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`Material "${wmForm.item_name}" added to [${wmForm.sub_category || 'Materials'}].`);
            setAddWorkerMaterialModal(false);
            setConfirmAddWM(false);
            setWmForm({ item_name: '', unit: '', initial_stock: '', reorder_level: '', sub_category: '', folder_id: null });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add material."), "error");
        }
    };

    const handleAddPowerTool = async () => {
        try {
            const catObj = powerCategories.find(f => f.name === ptForm.sub_category);
            const payload = {
                item_name: ptForm.item_name,
                item_type: 'Tool',
                tool_subtype: 'power',
                inventory_mode: 'worker',
                sub_category: ptForm.sub_category || 'General Power Tools',
                folder_id: catObj?.id || null,
                serial_number: ptForm.serial_number,
                quantity_on_hand: 1,
                initial_stock: 1,
                reorder_level: 1,
                unit: ptForm.unit,
                status: 'Available',
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`Power tool "${ptForm.item_name}" (${ptForm.serial_number}) added to [${ptForm.sub_category || 'Power Tools'}].`);
            setAddPowerToolModal(false);
            setConfirmAddPT(false);
            setPtForm({ item_name: '', serial_number: '', unit: 'unit', sub_category: '', folder_id: null });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add power tool."), "error");
        }
    };

    const handleAddHandTool = async () => {
        try {
            const catObj = handCategories.find(f => f.name === htAddForm.sub_category);
            const payload = {
                item_name: htAddForm.item_name,
                item_type: 'Tool',
                tool_subtype: 'hand',
                inventory_mode: 'worker',
                sub_category: htAddForm.sub_category || 'General Hand Tools',
                folder_id: catObj?.id || null,
                quantity_on_hand: parseInt(htAddForm.quantity) || 0,
                initial_stock: parseInt(htAddForm.quantity) || 0,
                reorder_level: parseInt(htAddForm.reorder_level) || 0,
                unit: htAddForm.unit,
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`Hand tool "${htAddForm.item_name}" added to [${htAddForm.sub_category || 'Hand Tools'}].`);
            setAddHandToolModal(false);
            setConfirmAddHT(false);
            setHtAddForm({ item_name: '', unit: '', quantity: '', reorder_level: '', sub_category: '', folder_id: null });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add hand tool."), "error");
        }
    };

    const handleAddSaleItem = async () => {
        try {
            const catObj = saleCategories.find(f => f.name === saleForm.sub_category);
            const payload = {
                item_name: saleForm.item_name,
                item_type: saleForm.item_type,
                inventory_mode: 'sale',
                sub_category: saleForm.sub_category || 'General For-Sale Items',
                folder_id: catObj?.id || null,
                quantity_on_hand: parseInt(saleForm.quantity_on_hand) || 0,
                initial_stock: parseInt(saleForm.quantity_on_hand) || 0,
                reorder_level: parseInt(saleForm.reorder_level) || 0,
                unit: saleForm.unit,
                capital: parseFloat(saleForm.capital) || 0,
                profit: parseFloat(saleForm.profit) || 0,
                supplier_name: saleForm.supplier_name,
                status: 'Available',
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`"${saleForm.item_name}" added to [${saleForm.sub_category || 'For Sale'}].`);
            setAddSaleModal(false);
            setConfirmAddSale(false);
            setSaleForm({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '', capital: '', profit: '', supplier_name: '', sub_category: '', folder_id: null });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add sale item."), "error");
        }
    };

    const handleEditWM = async () => {
        if (!editWMTarget) return;
        try {
            const catObj = materialCategories.find(f => f.name === editWMForm.sub_category);
            await window.axios.patch(ep.updateInventory(editWMTarget.item_id), {
                item_name: editWMForm.item_name,
                unit: editWMForm.unit,
                sub_category: editWMForm.sub_category,
                folder_id: catObj?.id || editWMTarget.folder_id,
                initial_stock: parseInt(editWMForm.initial_stock) || editWMTarget.initial_stock,
                reorder_level: parseInt(editWMForm.reorder_level) || 0,
            });
            addToast(`Material "${editWMForm.item_name}" updated.`);
            setEditWMTarget(null);
            setConfirmEditWM(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update material."), "error");
        }
    };

    const handleEditPT = async () => {
        if (!editPTTarget) return;
        try {
            const catObj = powerCategories.find(f => f.name === editPTForm.sub_category);
            await window.axios.patch(ep.updateInventory(editPTTarget.item_id), {
                item_name: editPTForm.item_name,
                serial_number: editPTForm.serial_number,
                unit: editPTForm.unit,
                status: editPTForm.status,
                sub_category: editPTForm.sub_category,
                folder_id: catObj?.id || editPTTarget.folder_id,
            });
            addToast(`Power tool "${editPTForm.item_name}" (${editPTForm.serial_number}) updated.`);
            setEditPTTarget(null);
            setConfirmEditPT(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update power tool."), "error");
        }
    };

    const handleEditHT = async () => {
        if (!editHTTarget) return;
        try {
            const catObj = handCategories.find(f => f.name === editHTForm.sub_category);
            await window.axios.patch(ep.updateInventory(editHTTarget.item_id), {
                item_name: editHTForm.item_name,
                unit: editHTForm.unit,
                sub_category: editHTForm.sub_category,
                folder_id: catObj?.id || editHTTarget.folder_id,
                quantity_on_hand: parseInt(editHTForm.quantity_on_hand) || editHTTarget.quantity_on_hand,
                reorder_level: parseInt(editHTForm.reorder_level) || 0,
            });
            addToast(`Hand tool "${editHTForm.item_name}" updated.`);
            setEditHTTarget(null);
            setConfirmEditHT(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update hand tool."), "error");
        }
    };

    const handleEditSale = async () => {
        if (!editSaleTarget) return;
        try {
            const catObj = saleCategories.find(f => f.name === editSaleForm.sub_category);
            await window.axios.patch(ep.updateInventory(editSaleTarget.item_id), {
                item_name: editSaleForm.item_name,
                item_type: editSaleForm.item_type,
                unit: editSaleForm.unit,
                sub_category: editSaleForm.sub_category,
                folder_id: catObj?.id || editSaleTarget.folder_id,
                quantity_on_hand: parseInt(editSaleForm.quantity_on_hand) || 0,
                reorder_level: parseInt(editSaleForm.reorder_level) || 0,
                capital: parseFloat(editSaleForm.capital) || 0,
                profit: parseFloat(editSaleForm.profit) || 0,
                supplier_name: editSaleForm.supplier_name,
            });
            addToast(`Sale item "${editSaleForm.item_name}" updated.`);
            setEditSaleTarget(null);
            setConfirmEditSale(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update sale item."), "error");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        try {
            await window.axios.delete(ep.deleteInventory(deleteTarget.item_id));
            addToast(`"${deleteTarget.item_name}" removed from inventory.`);
            setDeleteTarget(null);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete item."), "error");
        } finally {
            setDeleting(false);
        }
    };

    // Modal render helpers
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

    // Active sub-category information helpers
    const activeMaterialCategoryObj = materialCategories.find(f => f.name === selectedMaterialCategory);
    const activePowerCategoryObj = powerCategories.find(f => f.name === selectedPowerCategory);
    const activeHandCategoryObj = handCategories.find(f => f.name === selectedHandCategory);
    const activeSaleCategoryObj = saleCategories.find(f => f.name === selectedSaleCategory);

    if (loading) {
        return (
            <div style={{ padding: 32, borderRadius: 12, background: '#F8FAFC', color: '#64748B', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Loading inventory items & sub-categories...</p>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeInUp 0.25s ease' }}>
            {/* Top Page Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title font-display">Materials & Tools Inventory</h1>
                    <p className="page-subtitle">
                        Organized in dynamic sub-categories · {items.length} items tracked · {lowStockWorker.length + lowStockSale.length} low stock alerts
                    </p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="tab-bar" style={{ marginBottom: 20, display: 'inline-flex', background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
                <button className={`tab-item ${mainTab === 'worker' ? 'active' : ''}`} onClick={() => setMainTab('worker')}>
                    Workers' Inventory ({workerMaterials.length + powerTools.length + handTools.length})
                </button>
                <button className={`tab-item ${mainTab === 'sale' ? 'active' : ''}`} onClick={() => setMainTab('sale')}>
                    For Sale ({saleItems.length})
                </button>
            </div>

            {/* ─── WORKERS' INVENTORY ─── */}
            {mainTab === 'worker' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Worker Field Sub-Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'inline-flex', gap: 6, background: '#F1F5F9', borderRadius: 10, padding: 4 }}>
                            {[
                                { key: 'materials', label: 'Materials', count: workerMaterials.length, fieldType: 'materials' },
                                { key: 'power', label: 'Power Tools', count: powerTools.length, fieldType: 'power_tools' },
                                { key: 'hand', label: 'Hand Tools & Hardware', count: handTools.length, fieldType: 'hand_tools' },
                            ].map(t => (
                                <button key={t.key} onClick={() => setWorkerSubTab(t.key)}
                                    style={{
                                        padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                        fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                                        background: workerSubTab === t.key ? '#fff' : 'transparent',
                                        color: workerSubTab === t.key ? '#0F172A' : '#64748B',
                                        boxShadow: workerSubTab === t.key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                        transition: 'all 0.15s ease',
                                    }}>
                                    {t.label} <span style={{ fontSize: 11, color: workerSubTab === t.key ? '#3B82F6' : '#94A3B8', marginLeft: 4 }}>({t.count})</span>
                                </button>
                            ))}
                        </div>

                        {/* Top Action Buttons for the Active Field */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn-secondary"
                                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                onClick={() => {
                                    const fieldType = workerSubTab === 'materials' ? 'materials' : workerSubTab === 'power' ? 'power_tools' : 'hand_tools';
                                    setCategoryFieldType(fieldType);
                                    setManageCategoriesModal(true);
                                }}>
                                Manage Sub-categories
                            </button>
                            <button
                                className="btn-primary"
                                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                onClick={() => {
                                    const fieldType = workerSubTab === 'materials' ? 'materials' : workerSubTab === 'power' ? 'power_tools' : 'hand_tools';
                                    handleOpenCreateCategory(fieldType);
                                }}>
                                + New Sub-category
                            </button>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════
                        1. MATERIALS SUB-TAB WITH SUB-CATEGORIES
                       ══════════════════════════════════════════════════════════════ */}
                    {workerSubTab === 'materials' && (
                        <>
                            {lowStockWorker.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,138,7,0.08)', border: '1px solid rgba(245,138,7,0.25)' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#D97706', margin: 0 }}>Low Stock Alert</p>
                                        <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{lowStockWorker.map(i => i.item_name).join(' · ')} — below reorder level</p>
                                    </div>
                                </div>
                            )}

                            {/* Sub-category Pill Selector Bar */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                                        Materials Sub-categories
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {materialCategories.length} sub-categories configured
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <button
                                        onClick={() => setSelectedMaterialCategory('all')}
                                        style={{
                                            padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                            borderColor: selectedMaterialCategory === 'all' ? '#3B82F6' : '#CBD5E1',
                                            background: selectedMaterialCategory === 'all' ? '#EFF6FF' : '#fff',
                                            color: selectedMaterialCategory === 'all' ? '#1D4ED8' : '#334155',
                                            boxShadow: selectedMaterialCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.15)' : 'none',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        All Materials ({workerMaterials.length})
                                    </button>
                                    {materialCategories.map(cat => {
                                        const count = workerMaterials.filter(i => i.sub_category === cat.name || i.folder_id === cat.id).length;
                                        const isSelected = selectedMaterialCategory === cat.name;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedMaterialCategory(cat.name)}
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

                            {/* Main Card */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                                {selectedMaterialCategory === 'all' ? 'All Materials' : selectedMaterialCategory}
                                            </p>
                                            {selectedMaterialCategory !== 'all' && (
                                                <button
                                                    onClick={() => setSelectedMaterialCategory('all')}
                                                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                                    View All
                                                </button>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            {selectedMaterialCategory === 'all'
                                                ? 'Consumables used by technicians in the field'
                                                : (activeMaterialCategoryObj?.description || `Materials assigned under "${selectedMaterialCategory}"`)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <SearchBar value={materialSearch} onChange={setMaterialSearch} placeholder="Search materials or sub-category..." />
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                                            onClick={() => handleOpenAddMaterial(selectedMaterialCategory !== 'all' ? selectedMaterialCategory : null)}>
                                            + Add Material {selectedMaterialCategory !== 'all' ? `to ${selectedMaterialCategory}` : ''}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                {['ID', 'Item Name', 'Sub-category', 'Stock (Available/Total)', 'Reorder Level', 'Unit', 'Last Updated', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMaterials.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                                        No materials found {selectedMaterialCategory !== 'all' ? `in "${selectedMaterialCategory}"` : ''}.
                                                        <div style={{ marginTop: 10 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ fontSize: 12, padding: '5px 12px' }}
                                                                onClick={() => handleOpenAddMaterial(selectedMaterialCategory !== 'all' ? selectedMaterialCategory : null)}>
                                                                + Add Material Here
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredMaterials.map(item => {
                                                const isLow = item.quantity_on_hand <= item.reorder_level;
                                                const ratio = `${item.quantity_on_hand}/${item.initial_stock}`;
                                                const pct = item.initial_stock > 0 ? item.quantity_on_hand / item.initial_stock : 0;
                                                const stockColor = item.quantity_on_hand === 0 ? '#EF4444' : isLow ? '#D97706' : '#16A34A';
                                                return (
                                                    <tr key={item.item_id} style={{ borderTop: '1px solid #F1F5F9' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>#{item.item_id}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.item_name}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                                                background: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE',
                                                            }}>
                                                                {item.sub_category || 'General Materials'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, minWidth: 60 }}>
                                                                    <div style={{ height: '100%', borderRadius: 3, background: stockColor, width: `${Math.min(100, pct * 100)}%` }} />
                                                                </div>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: stockColor, whiteSpace: 'nowrap' }}>{ratio} left</span>
                                                                {isLow && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: 'rgba(245,138,7,0.12)', padding: '1px 6px', borderRadius: 4 }}>LOW</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>{item.reorder_level}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{item.unit}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                                <button className="btn-primary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => { setQtyAction({ item, mode: 'add' }); setQtyValue(''); }}>+ Add</button>
                                                                <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => { setQtyAction({ item, mode: 'reduce' }); setQtyValue(''); }}>− Use</button>
                                                                <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => {
                                                                        setEditWMTarget(item);
                                                                        setEditWMForm({
                                                                            item_name: item.item_name,
                                                                            unit: item.unit,
                                                                            sub_category: item.sub_category || 'General Materials',
                                                                            folder_id: item.folder_id,
                                                                            initial_stock: String(item.initial_stock),
                                                                            reorder_level: String(item.reorder_level),
                                                                        });
                                                                    }}>Edit</button>
                                                                <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => setDeleteTarget(item)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ══════════════════════════════════════════════════════════════
                        2. POWER TOOLS SUB-TAB WITH SUB-CATEGORIES
                       ══════════════════════════════════════════════════════════════ */}
                    {workerSubTab === 'power' && (
                        <>
                            {/* Sub-category Pill Selector Bar */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                                        Power Tools Sub-categories
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {powerCategories.length} sub-categories configured
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <button
                                        onClick={() => setSelectedPowerCategory('all')}
                                        style={{
                                            padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                            borderColor: selectedPowerCategory === 'all' ? '#3B82F6' : '#CBD5E1',
                                            background: selectedPowerCategory === 'all' ? '#EFF6FF' : '#fff',
                                            color: selectedPowerCategory === 'all' ? '#1D4ED8' : '#334155',
                                            boxShadow: selectedPowerCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.15)' : 'none',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        All Power Tools ({powerTools.length})
                                    </button>
                                    {powerCategories.map(cat => {
                                        const count = powerTools.filter(i => i.sub_category === cat.name || i.folder_id === cat.id).length;
                                        const isSelected = selectedPowerCategory === cat.name;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedPowerCategory(cat.name)}
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

                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                                {selectedPowerCategory === 'all' ? 'All Power Tools' : selectedPowerCategory}
                                            </p>
                                            {selectedPowerCategory !== 'all' && (
                                                <button
                                                    onClick={() => setSelectedPowerCategory('all')}
                                                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                                    View All
                                                </button>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            {selectedPowerCategory === 'all'
                                                ? 'Serial-number tracked equipment — Borrow & Return system'
                                                : (activePowerCategoryObj?.description || `Power tools under "${selectedPowerCategory}"`)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <SearchBar value={powerSearch} onChange={setPowerSearch} placeholder="Search power tools, serial or sub-category..." />
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                                            onClick={() => handleOpenAddPowerTool(selectedPowerCategory !== 'all' ? selectedPowerCategory : null)}>
                                            + Add Power Tool {selectedPowerCategory !== 'all' ? `to ${selectedPowerCategory}` : ''}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                {['Serial No.', 'Tool Name', 'Sub-category', 'Unit', 'Status', 'Last Updated', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPower.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                                        No power tools match your filter {selectedPowerCategory !== 'all' ? `in "${selectedPowerCategory}"` : ''}.
                                                        <div style={{ marginTop: 10 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ fontSize: 12, padding: '5px 12px' }}
                                                                onClick={() => handleOpenAddPowerTool(selectedPowerCategory !== 'all' ? selectedPowerCategory : null)}>
                                                                + Add Power Tool Here
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredPower.map(item => {
                                                const sc = statusBadgeColor(item.status);
                                                return (
                                                    <tr key={item.item_id} style={{ borderTop: '1px solid #F1F5F9' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>{item.serial_number}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.item_name}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                                                background: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE',
                                                            }}>
                                                                {item.sub_category || 'General Power Tools'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{item.unit}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{item.status || 'Available'}</span>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                                {item.status === 'Available' && (
                                                                    <button className="btn-primary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                        onClick={() => setBorrowTarget(item)}>Borrow</button>
                                                                )}
                                                                {item.status === 'Borrowed' && (
                                                                    <>
                                                                        <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                            onClick={() => setReturnTarget(item)}>Return</button>
                                                                        <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}
                                                                            onClick={() => setDamagedModal(item)}>Report Damage</button>
                                                                    </>
                                                                )}
                                                                <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => {
                                                                        setEditPTTarget(item);
                                                                        setEditPTForm({
                                                                            item_name: item.item_name,
                                                                            serial_number: item.serial_number || '',
                                                                            unit: item.unit,
                                                                            status: item.status || 'Available',
                                                                            sub_category: item.sub_category || 'General Power Tools',
                                                                            folder_id: item.folder_id,
                                                                        });
                                                                    }}>Edit</button>
                                                                <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => setDeleteTarget(item)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ══════════════════════════════════════════════════════════════
                        3. HAND TOOLS SUB-TAB WITH SUB-CATEGORIES
                       ══════════════════════════════════════════════════════════════ */}
                    {workerSubTab === 'hand' && (
                        <>
                            {/* Sub-category Pill Selector Bar */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                                        Hand Tools Sub-categories
                                    </span>
                                    <span style={{ fontSize: 12, color: '#64748B' }}>
                                        {handCategories.length} sub-categories configured
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <button
                                        onClick={() => setSelectedHandCategory('all')}
                                        style={{
                                            padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                            borderColor: selectedHandCategory === 'all' ? '#3B82F6' : '#CBD5E1',
                                            background: selectedHandCategory === 'all' ? '#EFF6FF' : '#fff',
                                            color: selectedHandCategory === 'all' ? '#1D4ED8' : '#334155',
                                            boxShadow: selectedHandCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.15)' : 'none',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        All Hand Tools ({handTools.length})
                                    </button>
                                    {handCategories.map(cat => {
                                        const count = handTools.filter(i => i.sub_category === cat.name || i.folder_id === cat.id).length;
                                        const isSelected = selectedHandCategory === cat.name;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedHandCategory(cat.name)}
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

                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                                {selectedHandCategory === 'all' ? 'All Hand Tools & Hardware' : selectedHandCategory}
                                            </p>
                                            {selectedHandCategory !== 'all' && (
                                                <button
                                                    onClick={() => setSelectedHandCategory('all')}
                                                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                                    View All
                                                </button>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                            {selectedHandCategory === 'all'
                                                ? 'Quantity-tracked shared tools — Borrow reduces stock, Return restores it'
                                                : (activeHandCategoryObj?.description || `Hand tools under "${selectedHandCategory}"`)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <SearchBar value={handSearch} onChange={setHandSearch} placeholder="Search hand tools or sub-category..." />
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                                            onClick={() => handleOpenAddHandTool(selectedHandCategory !== 'all' ? selectedHandCategory : null)}>
                                            + Add Hand Tool {selectedHandCategory !== 'all' ? `to ${selectedHandCategory}` : ''}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                {['ID', 'Tool Name', 'Sub-category', 'Stock (Available/Total)', 'Reorder Level', 'Unit', 'Last Updated', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHand.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                                        No hand tools match your filter {selectedHandCategory !== 'all' ? `in "${selectedHandCategory}"` : ''}.
                                                        <div style={{ marginTop: 10 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ fontSize: 12, padding: '5px 12px' }}
                                                                onClick={() => handleOpenAddHandTool(selectedHandCategory !== 'all' ? selectedHandCategory : null)}>
                                                                + Add Hand Tool Here
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredHand.map(item => {
                                                const available = item.quantity_on_hand;
                                                const pct = item.initial_stock > 0 ? available / item.initial_stock : 0;
                                                const stockColor = available === 0 ? '#EF4444' : available <= item.reorder_level ? '#D97706' : '#16A34A';
                                                return (
                                                    <tr key={item.item_id} style={{ borderTop: '1px solid #F1F5F9' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>#{item.item_id}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.item_name}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                                                background: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE',
                                                            }}>
                                                                {item.sub_category || 'General Hand Tools'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, minWidth: 60 }}>
                                                                    <div style={{ height: '100%', borderRadius: 3, background: stockColor, width: `${Math.min(100, pct * 100)}%` }} />
                                                                </div>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: stockColor, whiteSpace: 'nowrap' }}>{available}/{item.initial_stock} left</span>
                                                                {available === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4 }}>OUT</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>{item.reorder_level}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{item.unit}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ padding: '4px 9px', fontSize: 11, opacity: available === 0 ? 0.4 : 1, cursor: available === 0 ? 'not-allowed' : 'pointer' }}
                                                                    disabled={available === 0}
                                                                    onClick={() => handleHandToolBorrow(item)}>
                                                                    Borrow
                                                                </button>
                                                                <button
                                                                    className="btn-secondary"
                                                                    style={{ padding: '4px 9px', fontSize: 11, opacity: available >= item.initial_stock ? 0.4 : 1, cursor: available >= item.initial_stock ? 'not-allowed' : 'pointer' }}
                                                                    disabled={available >= item.initial_stock}
                                                                    onClick={() => handleHandToolReturn(item)}>
                                                                    Return
                                                                </button>
                                                                <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => {
                                                                        setEditHTTarget(item);
                                                                        setEditHTForm({
                                                                            item_name: item.item_name,
                                                                            unit: item.unit,
                                                                            sub_category: item.sub_category || 'General Hand Tools',
                                                                            folder_id: item.folder_id,
                                                                            quantity_on_hand: String(item.quantity_on_hand),
                                                                            reorder_level: String(item.reorder_level),
                                                                        });
                                                                    }}>Edit</button>
                                                                <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => setDeleteTarget(item)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                4. FOR SALE INVENTORY TAB WITH SUB-CATEGORIES
               ══════════════════════════════════════════════════════════════ */}
            {mainTab === 'sale' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {lowStockSale.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,138,7,0.08)', border: '1px solid rgba(245,138,7,0.25)' }}>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#D97706', margin: 0 }}>Low Stock Alert</p>
                                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{lowStockSale.map(i => i.item_name).join(' · ')} — below reorder level</p>
                            </div>
                        </div>
                    )}

                    {/* Top Action Buttons for For Sale */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>For Sale Sub-categories</p>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{saleCategories.length} sub-categories configured for customer retail and supplies</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn-secondary"
                                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                onClick={() => {
                                    setCategoryFieldType('sale_items');
                                    setManageCategoriesModal(true);
                                }}>
                                Manage Sub-categories
                            </button>
                            <button
                                className="btn-primary"
                                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}
                                onClick={() => {
                                    handleOpenCreateCategory('sale_items');
                                }}>
                                + New Sub-category
                            </button>
                        </div>
                    </div>

                    {/* For Sale Sub-category Pill Selector Bar */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <button
                                onClick={() => setSelectedSaleCategory('all')}
                                style={{
                                    padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                    borderColor: selectedSaleCategory === 'all' ? '#3B82F6' : '#CBD5E1',
                                    background: selectedSaleCategory === 'all' ? '#EFF6FF' : '#fff',
                                    color: selectedSaleCategory === 'all' ? '#1D4ED8' : '#334155',
                                    boxShadow: selectedSaleCategory === 'all' ? '0 2px 6px rgba(59,130,246,0.15)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}>
                                All For Sale ({saleItems.length})
                            </button>
                            {saleCategories.map(cat => {
                                const count = saleItems.filter(i => i.sub_category === cat.name || i.folder_id === cat.id).length;
                                const isSelected = selectedSaleCategory === cat.name;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedSaleCategory(cat.name)}
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

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>
                                        {selectedSaleCategory === 'all' ? 'All For Sale Items' : selectedSaleCategory}
                                    </p>
                                    {selectedSaleCategory !== 'all' && (
                                        <button
                                            onClick={() => setSelectedSaleCategory('all')}
                                            style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                            View All
                                        </button>
                                    )}
                                </div>
                                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                    {selectedSaleCategory === 'all'
                                        ? 'Materials & tools available for direct purchase by clients'
                                        : (activeSaleCategoryObj?.description || `Items assigned under "${selectedSaleCategory}"`)}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <SearchBar value={saleSearch} onChange={setSaleSearch} placeholder="Search sale items or sub-category..." />
                                <button
                                    className="btn-primary"
                                    style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                                    onClick={() => handleOpenAddSaleItem(selectedSaleCategory !== 'all' ? selectedSaleCategory : null)}>
                                    + Add Item {selectedSaleCategory !== 'all' ? `to ${selectedSaleCategory}` : ''}
                                </button>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                                <thead>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        {['ID', 'Item Name', 'Sub-category', 'Type', 'Qty', 'Reorder', 'Unit', 'Capital', 'Profit', 'Total Price', 'Supplier', 'Last Updated', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSale.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                                No items found {selectedSaleCategory !== 'all' ? `in "${selectedSaleCategory}"` : ''}.
                                                <div style={{ marginTop: 10 }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ fontSize: 12, padding: '5px 12px' }}
                                                        onClick={() => handleOpenAddSaleItem(selectedSaleCategory !== 'all' ? selectedSaleCategory : null)}>
                                                        + Add Item Here
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredSale.map(item => {
                                        const totalPrice = (item.capital || 0) + (item.profit || 0);
                                        const isLow = item.quantity_on_hand <= item.reorder_level;
                                        return (
                                            <tr key={item.item_id} style={{ borderTop: '1px solid #F1F5F9' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>#{item.item_id}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{item.item_name}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                                        background: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE',
                                                    }}>
                                                        {item.sub_category || 'General For-Sale Items'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}><StatusBadge status={item.item_type} /></td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: item.quantity_on_hand === 0 ? '#EF4444' : isLow ? '#D97706' : '#16A34A' }}>
                                                        {item.quantity_on_hand}
                                                    </span>
                                                    {isLow && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: 'rgba(245,138,7,0.12)', padding: '1px 5px', borderRadius: 4, marginLeft: 5 }}>LOW</span>}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>{item.reorder_level}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{item.unit}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#334155' }}>₱{(item.capital || 0).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#16A34A' }}>₱{(item.profit || 0).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₱{totalPrice.toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{item.supplier_name || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                        <button className="btn-primary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => { setSellTarget(item); setSellQty('1'); setSellMethod('Cash'); }}
                                                            disabled={item.quantity_on_hand === 0}>
                                                            Sell
                                                        </button>
                                                        <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => {
                                                                setEditSaleTarget(item);
                                                                setEditSaleForm({
                                                                    item_name: item.item_name,
                                                                    item_type: item.item_type || 'Material',
                                                                    unit: item.unit,
                                                                    quantity_on_hand: String(item.quantity_on_hand),
                                                                    reorder_level: String(item.reorder_level),
                                                                    capital: String(item.capital || 0),
                                                                    profit: String(item.profit || 0),
                                                                    supplier_name: item.supplier_name || '',
                                                                    sub_category: item.sub_category || 'General For-Sale Items',
                                                                    folder_id: item.folder_id,
                                                                });
                                                            }}>Edit</button>
                                                        <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => setDeleteTarget(item)}>Delete</button>
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

            {/* Hand Tool Borrow / Return Quick Action Helpers */}
            {(() => {
                const handleHandToolBorrow = async (item) => {
                    if (item.quantity_on_hand <= 0) return;
                    try {
                        await window.axios.patch(ep.updateInventory(item.item_id), {
                            quantity_on_hand: Math.max(0, item.quantity_on_hand - 1),
                        });
                        addToast(`${item.item_name} borrowed. ${item.quantity_on_hand - 1} remaining.`);
                        await fetchItems(false);
                        onDataChanged?.();
                    } catch (error) {
                        addToast(extractErrorMessage(error, "Unable to borrow tool."), "error");
                    }
                };

                const handleHandToolReturn = async (item) => {
                    if (item.quantity_on_hand >= item.initial_stock) return;
                    try {
                        await window.axios.patch(ep.updateInventory(item.item_id), {
                            quantity_on_hand: Math.min(item.initial_stock, item.quantity_on_hand + 1),
                        });
                        addToast(`${item.item_name} returned. ${Math.min(item.initial_stock, item.quantity_on_hand + 1)} now available.`);
                        await fetchItems(false);
                        onDataChanged?.();
                    } catch (error) {
                        addToast(extractErrorMessage(error, "Unable to return tool."), "error");
                    }
                };

                return null;
            })()}

            {/* ══════════════════════════════════════════════════════════════
                SUB-CATEGORY MODALS (CREATE, MANAGE, DELETE)
               ══════════════════════════════════════════════════════════════ */}

            {/* Create Sub-category Modal */}
            {createCategoryModal && renderModalWrapper(true, () => setCreateCategoryModal(false), (
                <form onSubmit={handleCreateCategory}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                            Create New Sub-category
                        </h2>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                            Under {categoryFieldType === 'materials' ? 'Materials' : categoryFieldType === 'power_tools' ? 'Power Tools' : categoryFieldType === 'hand_tools' ? 'Hand Tools' : 'For Sale Items'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Sub-category Name *</label>
                            <input
                                className="input-field"
                                autoFocus
                                required
                                placeholder="e.g. Refrigerants & Gases"
                                value={categoryForm.name}
                                onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Description (Optional)</label>
                            <textarea
                                className="input-field"
                                style={{ height: 75, resize: 'none' }}
                                placeholder="What types of items belong in this sub-category..."
                                value={categoryForm.description}
                                onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setCreateCategoryModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={savingCategory}>
                            {savingCategory ? 'Creating...' : 'Create Sub-category'}
                        </button>
                    </div>
                </form>
            ))}

            {/* Manage Sub-categories Modal */}
            {manageCategoriesModal && renderModalWrapper(true, () => { setManageCategoriesModal(false); setEditCategoryTarget(null); }, (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                Manage Sub-categories
                            </h2>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                {categoryFieldType === 'materials' ? 'Materials' : categoryFieldType === 'power_tools' ? 'Power Tools' : categoryFieldType === 'hand_tools' ? 'Hand Tools' : 'For Sale Items'}
                            </p>
                        </div>
                        <button
                            className="btn-primary"
                            style={{ fontSize: 11, padding: '5px 12px' }}
                            onClick={() => {
                                setCreateCategoryModal(true);
                            }}>
                            + New Sub-category
                        </button>
                    </div>

                    {editCategoryTarget ? (
                        <form onSubmit={handleUpdateCategory} style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Edit Sub-category: {editCategoryTarget.name}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                                <input
                                    className="input-field"
                                    required
                                    value={editCategoryForm.name}
                                    onChange={e => setEditCategoryForm(p => ({ ...p, name: e.target.value }))}
                                />
                                <textarea
                                    className="input-field"
                                    style={{ height: 60, resize: 'none' }}
                                    placeholder="Description"
                                    value={editCategoryForm.description}
                                    onChange={e => setEditCategoryForm(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditCategoryTarget(null)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '4px 12px' }} disabled={savingCategory}>Save Changes</button>
                            </div>
                        </form>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                        {(categoryFieldType === 'materials' ? materialCategories : categoryFieldType === 'power_tools' ? powerCategories : categoryFieldType === 'hand_tools' ? handCategories : saleCategories).map(cat => {
                            const count = items.filter(i => i.sub_category === cat.name || i.folder_id === cat.id).length;
                            return (
                                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{cat.name}</p>
                                        <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{cat.description || 'No description'} · <strong style={{ color: '#2563EB' }}>{count} items</strong></p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                            onClick={() => {
                                                setEditCategoryTarget(cat);
                                                setEditCategoryForm({ name: cat.name, description: cat.description || '' });
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

            {/* Delete Sub-category Modal */}
            <Modal
                open={!!deleteCategoryTarget}
                title="Delete Sub-category?"
                message={`Are you sure you want to delete the sub-category "${deleteCategoryTarget?.name}"? Any items currently in this sub-category will remain safe and be moved to General category.`}
                confirmLabel={deletingCategory ? "Deleting..." : "Yes, Delete Sub-category"}
                confirmDisabled={deletingCategory}
                variant="danger"
                onConfirm={handleDeleteCategory}
                onCancel={() => !deletingCategory && setDeleteCategoryTarget(null)}
            />

            {/* ══════════════════════════════════════════════════════════════
                ITEM MODALS (ADD, EDIT, QTY, BORROW, RETURN, SELL, DELETE)
               ══════════════════════════════════════════════════════════════ */}

            {/* Worker Material Qty Modal */}
            {qtyAction && !confirmQty && renderModalWrapper(true, () => setQtyAction(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', marginBottom: 16 }}>
                        {qtyAction.mode === 'add' ? 'Add Stock' : 'Use Stock'} — {qtyAction.item.item_name}
                    </h2>
                    <p className="section-label" style={{ marginBottom: 6 }}>
                        {qtyAction.mode === 'add' ? 'Quantity to Add' : 'Quantity Used'} (current: {qtyAction.item.quantity_on_hand}/{qtyAction.item.initial_stock} {qtyAction.item.unit})
                    </p>
                    <input type="number" min="1" className="input-field" placeholder="Enter quantity" value={qtyValue} onChange={e => setQtyValue(e.target.value)} style={{ marginBottom: 20 }} />
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setQtyAction(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmQty(true)}>Continue</button>
                    </div>
                </>
            ))}

            <Modal
                open={confirmQty}
                title="Confirm Inventory Update?"
                message={`This will ${qtyAction?.mode === 'add' ? 'add' : 'use'} ${qtyValue || 0} ${qtyAction?.item.unit} of ${qtyAction?.item.item_name}.`}
                confirmLabel="Yes, Update"
                onConfirm={handleQtyUpdate}
                onCancel={() => setConfirmQty(false)}
            />

            {/* Borrow Modal */}
            <Modal
                open={!!borrowTarget}
                title="Borrow Tool?"
                message={`${borrowTarget?.item_name} (${borrowTarget?.serial_number}) will be marked as Borrowed / Checked Out.`}
                confirmLabel="Yes, Borrow"
                onConfirm={handleBorrow}
                onCancel={() => setBorrowTarget(null)}
            />

            {/* Return Modal */}
            <Modal
                open={!!returnTarget}
                title="Return Tool?"
                message={`${returnTarget?.item_name} (${returnTarget?.serial_number}) will be marked as Available.`}
                confirmLabel="Yes, Return"
                onConfirm={handleReturn}
                onCancel={() => setReturnTarget(null)}
            />

            {/* Damage Report Modal */}
            {damagedModal && renderModalWrapper(true, () => { setDamagedModal(null); setDamageReport(''); }, (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#EF4444', marginBottom: 16 }}>Report Damaged / Lost Tool</h2>
                    <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                        Tool: <strong style={{ color: '#EF4444' }}>{damagedModal.item_name}</strong>
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{damagedModal.serial_number}</span>
                    </p>
                    <p className="section-label" style={{ marginBottom: 6 }}>Damage / Loss Description</p>
                    <textarea className="input-field" style={{ height: 80, resize: 'none', marginBottom: 20 }} placeholder="Describe what happened..." value={damageReport} onChange={e => setDamageReport(e.target.value)} />
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => { setDamagedModal(null); setDamageReport(''); }}>Cancel</button>
                        <button className="btn-danger" onClick={handleDamageReport}>Submit Report</button>
                    </div>
                </>
            ))}

            {/* Sell Modal */}
            {sellTarget && !confirmSell && renderModalWrapper(true, () => setSellTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 6px' }}>Sell Item</h2>
                    <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
                        <strong style={{ color: '#1E2F5F' }}>{sellTarget.item_name}</strong> · ₱{((sellTarget.capital || 0) + (sellTarget.profit || 0)).toLocaleString()} per {sellTarget.unit}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Qty to Sell</p>
                            <input type="number" min="1" max={sellTarget.quantity_on_hand} className="input-field" value={sellQty} onChange={e => setSellQty(e.target.value)} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Payment Method</p>
                            <select className="input-field" value={sellMethod} onChange={e => setSellMethod(e.target.value)}>
                                <option value="Cash">Cash</option>
                                <option value="GCash">GCash</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ background: '#F5F7FA', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Total Amount</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#1E2F5F', margin: '2px 0 0' }}>
                            ₱{(((sellTarget.capital || 0) + (sellTarget.profit || 0)) * (parseInt(sellQty) || 1)).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setSellTarget(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmSell(true)}>Confirm Sale →</button>
                    </div>
                </>
            ))}
            <Modal
                open={confirmSell}
                title="Confirm Sale?"
                message={`Sell ${sellQty}x ${sellTarget?.item_name} via ${sellMethod}? This will be recorded in Sales & Records.`}
                confirmLabel="Yes, Record Sale"
                onConfirm={handleSell}
                onCancel={() => setConfirmSell(false)}
            />

            {/* ── Add Worker Material Modal (with Sub-category selection) ── */}
            {addWorkerMaterialModal && !confirmAddWM && renderModalWrapper(true, () => setAddWorkerMaterialModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Add Material to Workers' Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Target Sub-category *</p>
                            <select
                                className="input-field"
                                value={wmForm.sub_category}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        handleOpenCreateCategory('materials');
                                    } else {
                                        const f = materialCategories.find(x => x.name === e.target.value);
                                        setWmForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                    }
                                }}>
                                {materialCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                                <option value="__new__">+ Create New Sub-category...</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Material Name</p>
                            <Combobox value={wmForm.item_name} onChange={v => setWmForm(p => ({ ...p, item_name: v }))} options={WORKER_MATERIAL_NAMES} placeholder="e.g. Copper Pipe 1/4" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={wmForm.unit} onChange={v => setWmForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. roll, m, pc" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Initial Stock (Total)</p>
                            <input type="number" className="input-field" placeholder="e.g. 20" value={wmForm.initial_stock} onChange={e => setWmForm(p => ({ ...p, initial_stock: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Alert Level</p>
                            <input type="number" className="input-field" placeholder="e.g. 5" value={wmForm.reorder_level} onChange={e => setWmForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddWorkerMaterialModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddWM(true)}>Add Material →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmAddWM} title="Add Material?" message={`Add "${wmForm.item_name}" (${wmForm.initial_stock} ${wmForm.unit}) under "${wmForm.sub_category || 'Materials'}"?`} confirmLabel="Yes, Add" onConfirm={handleAddWorkerMaterial} onCancel={() => setConfirmAddWM(false)} />

            {/* ── Add Power Tool Modal (with Sub-category selection) ── */}
            {addPowerToolModal && !confirmAddPT && renderModalWrapper(true, () => setAddPowerToolModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Add Power Tool (1 unit per record)</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Target Sub-category *</p>
                            <select
                                className="input-field"
                                value={ptForm.sub_category}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        handleOpenCreateCategory('power_tools');
                                    } else {
                                        const f = powerCategories.find(x => x.name === e.target.value);
                                        setPtForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                    }
                                }}>
                                {powerCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                                <option value="__new__">+ Create New Sub-category...</option>
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Tool Name</p>
                            <Combobox value={ptForm.item_name} onChange={v => setPtForm(p => ({ ...p, item_name: v }))} options={POWER_TOOL_NAMES} placeholder="e.g. Vacuum Pump" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Serial Number *</p>
                            <input className="input-field" placeholder="e.g. VP-003" value={ptForm.serial_number} onChange={e => setPtForm(p => ({ ...p, serial_number: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={ptForm.unit} onChange={v => setPtForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. unit" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddPowerToolModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddPT(true)}>Add Power Tool →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmAddPT} title="Add Power Tool?" message={`Add "${ptForm.item_name}" (Serial: ${ptForm.serial_number}) under "${ptForm.sub_category || 'Power Tools'}"?`} confirmLabel="Yes, Add" onConfirm={handleAddPowerTool} onCancel={() => setConfirmAddPT(false)} />

            {/* ── Add Hand Tool Modal (with Sub-category selection) ── */}
            {addHandToolModal && !confirmAddHT && renderModalWrapper(true, () => setAddHandToolModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Add Hand Tool to Workers' Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Target Sub-category *</p>
                            <select
                                className="input-field"
                                value={htAddForm.sub_category}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        handleOpenCreateCategory('hand_tools');
                                    } else {
                                        const f = handCategories.find(x => x.name === e.target.value);
                                        setHtAddForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                    }
                                }}>
                                {handCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                                <option value="__new__">+ Create New Sub-category...</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Tool Name</p>
                            <Combobox value={htAddForm.item_name} onChange={v => setHtAddForm(p => ({ ...p, item_name: v }))} options={HAND_TOOL_NAMES} placeholder="e.g. Screwdriver Set" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={htAddForm.unit} onChange={v => setHtAddForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. set, pc" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Quantity</p>
                            <input type="number" className="input-field" placeholder="e.g. 5" value={htAddForm.quantity} onChange={e => setHtAddForm(p => ({ ...p, quantity: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                            <input type="number" className="input-field" placeholder="e.g. 2" value={htAddForm.reorder_level} onChange={e => setHtAddForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddHandToolModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddHT(true)}>Add Hand Tool →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmAddHT} title="Add Hand Tool?" message={`Add "${htAddForm.item_name}" (${htAddForm.quantity} ${htAddForm.unit}) under "${htAddForm.sub_category || 'Hand Tools'}"?`} confirmLabel="Yes, Add" onConfirm={handleAddHandTool} onCancel={() => setConfirmAddHT(false)} />

            {/* ── Add For-Sale Item Modal (with Sub-category selection) ── */}
            {addSaleModal && !confirmAddSale && renderModalWrapper(true, () => setAddSaleModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Add Item to For Sale Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Target Sub-category *</p>
                            <select
                                className="input-field"
                                value={saleForm.sub_category}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        handleOpenCreateCategory('sale_items');
                                    } else {
                                        const f = saleCategories.find(x => x.name === e.target.value);
                                        setSaleForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                    }
                                }}>
                                {saleCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                                <option value="__new__">+ Create New Sub-category...</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Name</p>
                            <Combobox value={saleForm.item_name} onChange={v => setSaleForm(p => ({ ...p, item_name: v }))} options={SALE_ITEM_NAMES} placeholder="e.g. AC Coil Cleaner" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Type</p>
                            <select className="input-field" value={saleForm.item_type} onChange={e => setSaleForm(p => ({ ...p, item_type: e.target.value }))}>
                                <option value="Material">Material</option>
                                <option value="Tool">Tool</option>
                                <option value="Spare Part">Spare Part</option>
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={saleForm.unit} onChange={v => setSaleForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. can, roll, pcs" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Qty on Hand</p>
                            <input type="number" className="input-field" placeholder="e.g. 10" value={saleForm.quantity_on_hand} onChange={e => setSaleForm(p => ({ ...p, quantity_on_hand: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                            <input type="number" className="input-field" placeholder="e.g. 3" value={saleForm.reorder_level} onChange={e => setSaleForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Capital (₱)</p>
                            <input type="number" className="input-field" placeholder="0.00" value={saleForm.capital} onChange={e => setSaleForm(p => ({ ...p, capital: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Profit (₱)</p>
                            <input type="number" className="input-field" placeholder="0.00" value={saleForm.profit} onChange={e => setSaleForm(p => ({ ...p, profit: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Supplier Name</p>
                            <input className="input-field" placeholder="e.g. Daikin Philippines" value={saleForm.supplier_name} onChange={e => setSaleForm(p => ({ ...p, supplier_name: e.target.value }))} />
                        </div>
                    </div>
                    {saleForm.capital && saleForm.profit && (
                        <div style={{ background: '#F5F7FA', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Selling Price (auto)</p>
                            <p style={{ fontSize: 18, fontWeight: 700, color: '#1E2F5F', margin: '2px 0 0' }}>
                                ₱{(parseFloat(saleForm.capital || '0') + parseFloat(saleForm.profit || '0')).toLocaleString()} per {saleForm.unit || 'unit'}
                            </p>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddSaleModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddSale(true)}>Add Item →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmAddSale} title="Add to For Sale Inventory?" message={`Add "${saleForm.item_name}" under "${saleForm.sub_category || 'For Sale'}" (₱${((parseFloat(saleForm.capital||'0') + parseFloat(saleForm.profit||'0'))).toLocaleString()} each)?`} confirmLabel="Yes, Add" onConfirm={handleAddSaleItem} onCancel={() => setConfirmAddSale(false)} />

            {/* ── Edit Worker Material Modal ── */}
            {editWMTarget && !confirmEditWM && renderModalWrapper(true, () => setEditWMTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Edit Material</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Sub-category</p>
                            <select
                                className="input-field"
                                value={editWMForm.sub_category}
                                onChange={e => {
                                    const f = materialCategories.find(x => x.name === e.target.value);
                                    setEditWMForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                }}>
                                {materialCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Name</p>
                            <Combobox value={editWMForm.item_name} onChange={v => setEditWMForm(p => ({ ...p, item_name: v }))} options={WORKER_MATERIAL_NAMES} placeholder="Item name" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={editWMForm.unit} onChange={v => setEditWMForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="Unit" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Initial Stock (Total)</p>
                            <input type="number" className="input-field" value={editWMForm.initial_stock} onChange={e => setEditWMForm(p => ({ ...p, initial_stock: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                            <input type="number" className="input-field" value={editWMForm.reorder_level} onChange={e => setEditWMForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setEditWMTarget(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmEditWM(true)}>Save Changes →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmEditWM} title="Save Changes?" message={`Update "${editWMForm.item_name}" in Workers' Inventory?`} confirmLabel="Yes, Save" onConfirm={handleEditWM} onCancel={() => setConfirmEditWM(false)} />

            {/* ── Edit Power Tool Modal ── */}
            {editPTTarget && !confirmEditPT && renderModalWrapper(true, () => setEditPTTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Edit Power Tool</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Sub-category</p>
                            <select
                                className="input-field"
                                value={editPTForm.sub_category}
                                onChange={e => {
                                    const f = powerCategories.find(x => x.name === e.target.value);
                                    setEditPTForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                }}>
                                {powerCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Tool Name</p>
                            <Combobox value={editPTForm.item_name} onChange={v => setEditPTForm(p => ({ ...p, item_name: v }))} options={POWER_TOOL_NAMES} placeholder="Tool name" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Serial Number</p>
                            <input className="input-field" value={editPTForm.serial_number} onChange={e => setEditPTForm(p => ({ ...p, serial_number: e.target.value }))} placeholder="e.g. VP-001" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                                <Combobox value={editPTForm.unit} onChange={v => setEditPTForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="Unit" />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Status</p>
                                <select className="input-field" value={editPTForm.status} onChange={e => setEditPTForm(p => ({ ...p, status: e.target.value }))}>
                                    <option value="Available">Available</option>
                                    <option value="Borrowed">Borrowed</option>
                                    <option value="Lost/Damaged">Lost/Damaged</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setEditPTTarget(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmEditPT(true)}>Save Changes →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmEditPT} title="Save Changes?" message={`Update "${editPTForm.item_name}" (${editPTForm.serial_number}) in Workers' Inventory?`} confirmLabel="Yes, Save" onConfirm={handleEditPT} onCancel={() => setConfirmEditPT(false)} />

            {/* ── Edit Hand Tool Modal ── */}
            {editHTTarget && !confirmEditHT && renderModalWrapper(true, () => setEditHTTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 16px' }}>Edit Hand Tool</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Sub-category</p>
                            <select
                                className="input-field"
                                value={editHTForm.sub_category}
                                onChange={e => {
                                    const f = handCategories.find(x => x.name === e.target.value);
                                    setEditHTForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                }}>
                                {handCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Tool Name</p>
                            <Combobox value={editHTForm.item_name} onChange={v => setEditHTForm(p => ({ ...p, item_name: v }))} options={HAND_TOOL_NAMES} placeholder="Tool name" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={editHTForm.unit} onChange={v => setEditHTForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="Unit" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Quantity on Hand</p>
                            <input type="number" className="input-field" value={editHTForm.quantity_on_hand} onChange={e => setEditHTForm(p => ({ ...p, quantity_on_hand: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                            <input type="number" className="input-field" value={editHTForm.reorder_level} onChange={e => setEditHTForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setEditHTTarget(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmEditHT(true)}>Save Changes →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmEditHT} title="Save Changes?" message={`Update "${editHTForm.item_name}" in Workers' Inventory?`} confirmLabel="Yes, Save" onConfirm={handleEditHT} onCancel={() => setConfirmEditHT(false)} />

            {/* ── Edit For Sale Item Modal ── */}
            {editSaleTarget && !confirmEditSale && renderModalWrapper(true, () => setEditSaleTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Edit For Sale Item</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Sub-category</p>
                            <select
                                className="input-field"
                                value={editSaleForm.sub_category}
                                onChange={e => {
                                    const f = saleCategories.find(x => x.name === e.target.value);
                                    setEditSaleForm(p => ({ ...p, sub_category: e.target.value, folder_id: f?.id || null }));
                                }}>
                                {saleCategories.map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Name</p>
                            <Combobox value={editSaleForm.item_name} onChange={v => setEditSaleForm(p => ({ ...p, item_name: v }))} options={SALE_ITEM_NAMES} placeholder="Item name" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Type</p>
                            <select className="input-field" value={editSaleForm.item_type} onChange={e => setEditSaleForm(p => ({ ...p, item_type: e.target.value }))}>
                                <option value="Material">Material</option>
                                <option value="Tool">Tool</option>
                                <option value="Spare Part">Spare Part</option>
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={editSaleForm.unit} onChange={v => setEditSaleForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="Unit" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Qty on Hand</p>
                            <input type="number" className="input-field" value={editSaleForm.quantity_on_hand} onChange={e => setEditSaleForm(p => ({ ...p, quantity_on_hand: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                            <input type="number" className="input-field" value={editSaleForm.reorder_level} onChange={e => setEditSaleForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Capital (₱)</p>
                            <input type="number" className="input-field" value={editSaleForm.capital} onChange={e => setEditSaleForm(p => ({ ...p, capital: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Profit (₱)</p>
                            <input type="number" className="input-field" value={editSaleForm.profit} onChange={e => setEditSaleForm(p => ({ ...p, profit: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Supplier Name</p>
                            <input className="input-field" value={editSaleForm.supplier_name} onChange={e => setEditSaleForm(p => ({ ...p, supplier_name: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setEditSaleTarget(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmEditSale(true)}>Save Changes →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmEditSale} title="Save Changes?" message={`Update "${editSaleForm.item_name}" in For Sale Inventory?`} confirmLabel="Yes, Save" onConfirm={handleEditSale} onCancel={() => setConfirmEditSale(false)} />

            {/* ── Delete Modal ── */}
            <Modal
                open={!!deleteTarget}
                title="Delete Inventory Item?"
                message={`Remove "${deleteTarget?.item_name}" from inventory records? This cannot be undone.`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />
        </div>
    );
}

export default MaterialsTools;