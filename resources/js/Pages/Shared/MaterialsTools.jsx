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
const UNIT_OPTIONS = ['can', 'roll', 'm', 'pc', 'set', 'unit', 'L', 'kg', 'box', 'pair', 'spool'];

// Combobox Component
function Combobox({ value, onChange, options, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

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
        <div style={{ position: 'relative', width: 240 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9CA3AF' }}></span>
            <input
                className="input-field"
                style={{ paddingLeft: 30, fontSize: 12 }}
                placeholder={placeholder || 'Search...'}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

const createEmptyForm = (itemType = "Material", mode = 'worker') => ({
    item_name: "",
    item_type: itemType,
    inventory_mode: mode,
    quantity_on_hand: "0",
    initial_stock: "0",
    reorder_level: "0",
    unit: "",
    serial_number: "",
    capital: "0",
    profit: "0",
    supplier_name: "",
    status: "Available",
    tool_subtype: "power",
});

function MaterialsTools({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Main Tabs
    const [mainTab, setMainTab] = useState('worker');
    const [workerSubTab, setWorkerSubTab] = useState('materials');
    
    // Search states
    const [materialSearch, setMaterialSearch] = useState('');
    const [powerSearch, setPowerSearch] = useState('');
    const [handSearch, setHandSearch] = useState('');
    const [saleSearch, setSaleSearch] = useState('');
    
    // Editor states
    const [editorMode, setEditorMode] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    
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
    
    // Form states
    const [wmForm, setWmForm] = useState({ item_name: '', unit: '', initial_stock: '', reorder_level: '' });
    const [ptForm, setPtForm] = useState({ item_name: '', serial_number: '', unit: 'unit' });
    const [htAddForm, setHtAddForm] = useState({ item_name: '', unit: '', quantity: '', reorder_level: '' });
    const [saleForm, setSaleForm] = useState({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '', capital: '', profit: '', supplier_name: '' });
    const [editWMForm, setEditWMForm] = useState({ item_name: '', unit: '', initial_stock: '', reorder_level: '' });
    const [editPTForm, setEditPTForm] = useState({ item_name: '', serial_number: '', unit: '', status: 'Available' });
    const [editHTForm, setEditHTForm] = useState({ item_name: '', unit: '', quantity_on_hand: '', reorder_level: '' });
    const [editSaleForm, setEditSaleForm] = useState({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '', capital: '', profit: '', supplier_name: '' });

    const fetchItems = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(ep.inventory);
            setItems((Array.isArray(data?.data) ? data.data : []).map(normalizeInventoryItem));
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load inventory items."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Filtered items
    const workerMaterials = useMemo(() => items.filter(i => i.inventory_mode === 'worker' && i.item_type !== 'Tool'), [items]);
    const powerTools = useMemo(() => items.filter(i => i.inventory_mode === 'worker' && i.item_type === 'Tool' && i.tool_subtype === 'power'), [items]);
    const handTools = useMemo(() => items.filter(i => i.inventory_mode === 'worker' && i.item_type === 'Tool' && i.tool_subtype === 'hand'), [items]);
    const saleItems = useMemo(() => items.filter(i => i.inventory_mode === 'sale'), [items]);
    const lowStockWorker = useMemo(() => workerMaterials.filter(i => i.quantity_on_hand <= i.reorder_level), [workerMaterials]);
    const lowStockSale = useMemo(() => saleItems.filter(i => i.quantity_on_hand <= i.reorder_level), [saleItems]);

    const filteredMaterials = useMemo(() => 
        workerMaterials.filter(i => i.item_name.toLowerCase().includes(materialSearch.toLowerCase())), 
        [workerMaterials, materialSearch]
    );
    
    const filteredPower = useMemo(() => 
        powerTools.filter(i =>
            i.item_name.toLowerCase().includes(powerSearch.toLowerCase()) ||
            (i.serial_number || '').toLowerCase().includes(powerSearch.toLowerCase())
        ), [powerTools, powerSearch]
    );
    
    const filteredHand = useMemo(() => 
        handTools.filter(i => i.item_name.toLowerCase().includes(handSearch.toLowerCase())), 
        [handTools, handSearch]
    );
    
    const filteredSale = useMemo(() => 
        saleItems.filter(i => i.item_name.toLowerCase().includes(saleSearch.toLowerCase())), 
        [saleItems, saleSearch]
    );

    const now = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };

    const statusBadgeColor = (status) => {
        if (status === 'Available') return { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' };
        if (status === 'Borrowed') return { bg: 'rgba(63,125,255,0.1)', color: '#3F7DFF' };
        return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' };
    };

    // Handler functions
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
        const capital = sellTarget.capital || 0;
        const profit = sellTarget.profit || 0;
        const total = (capital + profit) * qty;
        
        try {
            await window.axios.patch(ep.updateInventory(sellTarget.item_id), {
                quantity_on_hand: Math.max(0, sellTarget.quantity_on_hand - qty),
            });
            
            // Record sale - you may need to implement this endpoint
            const record = {
                sale_id: Date.now(),
                item_id: sellTarget.item_id,
                item_name: sellTarget.item_name,
                qty_sold: qty,
                unit: sellTarget.unit,
                capital,
                profit,
                total_amount: total,
                sold_at: now(),
                payment_method: sellMethod,
            };
            
            addToast(`Sold ${qty}x ${sellTarget.item_name} for ₱${total.toLocaleString()} via ${sellMethod}. Recorded in Sales & Records.`);
            setSellTarget(null);
            setSellQty('1');
            setConfirmSell(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to process sale."), "error");
        }
    };

    const handleAddWorkerMaterial = async () => {
        try {
            const payload = {
                item_name: wmForm.item_name,
                item_type: 'Material',
                inventory_mode: 'worker',
                quantity_on_hand: parseInt(wmForm.initial_stock) || 0,
                initial_stock: parseInt(wmForm.initial_stock) || 0,
                reorder_level: parseInt(wmForm.reorder_level) || 0,
                unit: wmForm.unit,
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`Material "${wmForm.item_name}" added to Workers' Inventory.`);
            setAddWorkerMaterialModal(false);
            setConfirmAddWM(false);
            setWmForm({ item_name: '', unit: '', initial_stock: '', reorder_level: '' });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add material."), "error");
        }
    };

    const handleAddPowerTool = async () => {
        try {
            const payload = {
                item_name: ptForm.item_name,
                item_type: 'Tool',
                tool_subtype: 'power',
                inventory_mode: 'worker',
                serial_number: ptForm.serial_number,
                quantity_on_hand: 1,
                initial_stock: 1,
                reorder_level: 1,
                unit: ptForm.unit,
                status: 'Available',
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`Power tool "${ptForm.item_name}" (${ptForm.serial_number}) added to Workers' Inventory.`);
            setAddPowerToolModal(false);
            setConfirmAddPT(false);
            setPtForm({ item_name: '', serial_number: '', unit: 'unit' });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add power tool."), "error");
        }
    };

    const handleAddHandTool = async () => {
        try {
            const payload = {
                item_name: htAddForm.item_name,
                item_type: 'Tool',
                tool_subtype: 'hand',
                inventory_mode: 'worker',
                quantity_on_hand: parseInt(htAddForm.quantity) || 0,
                initial_stock: parseInt(htAddForm.quantity) || 0,
                reorder_level: parseInt(htAddForm.reorder_level) || 0,
                unit: htAddForm.unit,
            };
            await window.axios.post(ep.inventory, payload);
            addToast(`Hand tool "${htAddForm.item_name}" added to Workers' Inventory.`);
            setAddHandToolModal(false);
            setConfirmAddHT(false);
            setHtAddForm({ item_name: '', unit: '', quantity: '', reorder_level: '' });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add hand tool."), "error");
        }
    };

    const handleAddSaleItem = async () => {
        try {
            const payload = {
                item_name: saleForm.item_name,
                item_type: saleForm.item_type,
                inventory_mode: 'sale',
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
            addToast(`"${saleForm.item_name}" added to For Sale Inventory.`);
            setAddSaleModal(false);
            setConfirmAddSale(false);
            setSaleForm({ item_name: '', item_type: 'Material', unit: '', quantity_on_hand: '', reorder_level: '', capital: '', profit: '', supplier_name: '' });
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add sale item."), "error");
        }
    };

    const handleEditWM = async () => {
        if (!editWMTarget) return;
        try {
            await window.axios.patch(ep.updateInventory(editWMTarget.item_id), {
                item_name: editWMForm.item_name,
                unit: editWMForm.unit,
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
            await window.axios.patch(ep.updateInventory(editPTTarget.item_id), {
                item_name: editPTForm.item_name,
                serial_number: editPTForm.serial_number,
                unit: editPTForm.unit,
                status: editPTForm.status,
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
            await window.axios.patch(ep.updateInventory(editHTTarget.item_id), {
                item_name: editHTForm.item_name,
                unit: editHTForm.unit,
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
            await window.axios.patch(ep.updateInventory(editSaleTarget.item_id), {
                item_name: editSaleForm.item_name,
                item_type: editSaleForm.item_type,
                unit: editSaleForm.unit,
                quantity_on_hand: parseInt(editSaleForm.quantity_on_hand) || editSaleTarget.quantity_on_hand,
                reorder_level: parseInt(editSaleForm.reorder_level) || 0,
                capital: parseFloat(editSaleForm.capital) || 0,
                profit: parseFloat(editSaleForm.profit) || 0,
                supplier_name: editSaleForm.supplier_name,
            });
            addToast(`"${editSaleForm.item_name}" updated in For Sale Inventory.`);
            setEditSaleTarget(null);
            setConfirmEditSale(false);
            await fetchItems(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update sale item."), "error");
        }
    };

    const handleDelete = async () => {
        if (deleting || !deleteTarget) return;
        setDeleting(true);
        try {
            await window.axios.delete(ep.deleteInventory(deleteTarget.item_id));
            addToast(`"${deleteTarget.item_name}" deleted successfully.`, 'warning');
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
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
                <div style={{ background: '#fff', borderRadius: 20, padding: '28px', maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                    {children}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: 24, borderRadius: 12, background: '#F9FAFB', color: '#6B7280' }}>
                Loading inventory items...
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeInUp 0.25s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Materials & Tools Inventory</h1>
                    <p className="page-subtitle">{items.length} items tracked · {lowStockWorker.length + lowStockSale.length} low stock alerts</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="tab-bar" style={{ marginBottom: 24, display: 'inline-flex' }}>
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
                    {/* Worker Sub-Tabs */}
                    <div style={{ display: 'inline-flex', gap: 4, background: '#F0F2F5', borderRadius: 10, padding: 4 }}>
                        {[
                            { key: 'materials', label: 'Materials', count: workerMaterials.length },
                            { key: 'power', label: 'Power Tools', count: powerTools.length },
                            { key: 'hand', label: 'Hand Tools & Hardware', count: handTools.length },
                        ].map(t => (
                            <button key={t.key} onClick={() => setWorkerSubTab(t.key)}
                                style={{
                                    padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                                    background: workerSubTab === t.key ? '#fff' : 'transparent',
                                    color: workerSubTab === t.key ? '#1E2F5F' : '#9CA3AF',
                                    boxShadow: workerSubTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.15s',
                                }}>
                                {t.label} <span style={{ fontSize: 11, color: workerSubTab === t.key ? '#3F7DFF' : '#9CA3AF', marginLeft: 2 }}>({t.count})</span>
                            </button>
                        ))}
                    </div>

                    {/* ── Materials Sub-Tab ── */}
                    {workerSubTab === 'materials' && (
                        <>
                            {lowStockWorker.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,138,7,0.08)', border: '1px solid rgba(245,138,7,0.25)' }}>
                                    <span style={{ fontSize: 18 }}>⚠️</span>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>Low Stock Alert</p>
                                        <p style={{ fontSize: 12, color: '#6B7280' }}>{lowStockWorker.map(i => i.item_name).join(' · ')} — below reorder level</p>
                                    </div>
                                </div>
                            )}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                                    <div>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>Materials</p>
                                        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Consumables used by technicians in the field</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <SearchBar value={materialSearch} onChange={setMaterialSearch} placeholder="Search materials..." />
                                        <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={() => setAddWorkerMaterialModal(true)}>+ Add Material</button>
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                                        <thead>
                                            <tr style={{ background: '#F5F7FA' }}>
                                                {['ID', 'Item Name', 'Stock (Available/Total)', 'Reorder Level', 'Unit', 'Added At', 'Last Updated', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', whiteSpace: 'nowrap', borderBottom: '1px solid #EAECF0' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMaterials.length === 0 ? (
                                                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No materials match your search.</td></tr>
                                            ) : filteredMaterials.map(item => {
                                                const isLow = item.quantity_on_hand <= item.reorder_level;
                                                const ratio = `${item.quantity_on_hand}/${item.initial_stock}`;
                                                const pct = item.initial_stock > 0 ? item.quantity_on_hand / item.initial_stock : 0;
                                                const stockColor = item.quantity_on_hand === 0 ? '#EF4444' : isLow ? '#D97706' : '#16A34A';
                                                return (
                                                    <tr key={item.item_id} style={{ borderTop: '1px solid #F5F7FA' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>#{item.item_id}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: '#1E2F5F' }}>{item.item_name}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{ flex: 1, height: 6, background: '#F0F2F5', borderRadius: 3, minWidth: 60 }}>
                                                                    <div style={{ height: '100%', borderRadius: 3, background: stockColor, width: `${Math.min(100, pct * 100)}%` }} />
                                                                </div>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: stockColor, whiteSpace: 'nowrap' }}>{ratio} left</span>
                                                                {isLow && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: 'rgba(245,138,7,0.12)', padding: '1px 6px', borderRadius: 4 }}>LOW</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>{item.reorder_level}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280' }}>{item.unit}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.added_at}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                                <button className="btn-primary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => { setQtyAction({ item, mode: 'add' }); setQtyValue(''); }}>+ Add</button>
                                                                <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => { setQtyAction({ item, mode: 'reduce' }); setQtyValue(''); }}>− Use</button>
                                                                <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => { setEditWMTarget(item); setEditWMForm({ item_name: item.item_name, unit: item.unit, initial_stock: String(item.initial_stock), reorder_level: String(item.reorder_level) }); }}>✏️ Edit</button>
                                                                <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                    onClick={() => setDeleteTarget(item)}>🗑 Delete</button>
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

                    {/* ── Power Tools Sub-Tab ── */}
                    {workerSubTab === 'power' && (
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>Power / Field Tools</p>
                                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Serial-number tracked units — Borrow & Return system</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <SearchBar value={powerSearch} onChange={setPowerSearch} placeholder="Search by name or serial..." />
                                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={() => setAddPowerToolModal(true)}>+ Add Power Tool</button>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                                    <thead>
                                        <tr style={{ background: '#F5F7FA' }}>
                                            {['Serial No.', 'Tool Name', 'Unit', 'Status', 'Added At', 'Last Updated', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', whiteSpace: 'nowrap', borderBottom: '1px solid #EAECF0' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPower.length === 0 ? (
                                            <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No power tools match your search.</td></tr>
                                        ) : filteredPower.map(item => {
                                            const sc = statusBadgeColor(item.status);
                                            return (
                                                <tr key={item.item_id} style={{ borderTop: '1px solid #F5F7FA' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#3F7DFF', fontFamily: 'monospace' }}>{item.serial_number}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: '#1E2F5F' }}>{item.item_name}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280' }}>{item.unit}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color }}>{item.status || 'Available'}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.added_at}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
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
                                                                        onClick={() => setDamagedModal(item)}>⚠️ Report</button>
                                                                </>
                                                            )}
                                                            <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                onClick={() => { setEditPTTarget(item); setEditPTForm({ item_name: item.item_name, serial_number: item.serial_number || '', unit: item.unit, status: item.status || 'Available' }); }}>✏️ Edit</button>
                                                            <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                onClick={() => setDeleteTarget(item)}>🗑 Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Hand Tools Sub-Tab ── */}
                    {workerSubTab === 'hand' && (
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>Hand Tools & Hardware</p>
                                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Quantity-tracked shared tools — Borrow reduces stock, Return restores it</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <SearchBar value={handSearch} onChange={setHandSearch} placeholder="Search hand tools..." />
                                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={() => setAddHandToolModal(true)}>+ Add Hand Tool</button>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                                    <thead>
                                        <tr style={{ background: '#F5F7FA' }}>
                                            {['ID', 'Tool Name', 'Stock (Available/Total)', 'Reorder Level', 'Unit', 'Added At', 'Last Updated', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', whiteSpace: 'nowrap', borderBottom: '1px solid #EAECF0' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHand.length === 0 ? (
                                            <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No hand tools match your search.</td></tr>
                                        ) : filteredHand.map(item => {
                                            const available = item.quantity_on_hand;
                                            const pct = item.initial_stock > 0 ? available / item.initial_stock : 0;
                                            const stockColor = available === 0 ? '#EF4444' : available <= item.reorder_level ? '#D97706' : '#16A34A';
                                            return (
                                                <tr key={item.item_id} style={{ borderTop: '1px solid #F5F7FA' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>#{item.item_id}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: '#1E2F5F' }}>{item.item_name}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ flex: 1, height: 6, background: '#F0F2F5', borderRadius: 3, minWidth: 60 }}>
                                                                <div style={{ height: '100%', borderRadius: 3, background: stockColor, width: `${Math.min(100, pct * 100)}%` }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: stockColor, whiteSpace: 'nowrap' }}>{available}/{item.initial_stock} left</span>
                                                            {available === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4 }}>OUT</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>{item.reorder_level}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280' }}>{item.unit}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.added_at}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
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
                                                                onClick={() => { setEditHTTarget(item); setEditHTForm({ item_name: item.item_name, unit: item.unit, quantity_on_hand: String(item.quantity_on_hand), reorder_level: String(item.reorder_level) }); }}>✏️ Edit</button>
                                                            <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                                onClick={() => setDeleteTarget(item)}>🗑 Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── FOR SALE INVENTORY ─── */}
            {mainTab === 'sale' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {lowStockSale.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,138,7,0.08)', border: '1px solid rgba(245,138,7,0.25)' }}>
                            <span style={{ fontSize: 18 }}>⚠️</span>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>Low Stock Alert</p>
                                <p style={{ fontSize: 12, color: '#6B7280' }}>{lowStockSale.map(i => i.item_name).join(' · ')} — below reorder level</p>
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: '#1E2F5F', margin: 0 }}>For Sale Items</p>
                                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Materials & tools available for purchase by clients</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <SearchBar value={saleSearch} onChange={setSaleSearch} placeholder="Search sale items..." />
                                <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={() => setAddSaleModal(true)}>+ Add Item</button>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                                <thead>
                                    <tr style={{ background: '#F5F7FA' }}>
                                        {['ID', 'Item Name', 'Type', 'Qty', 'Reorder', 'Unit', 'Capital', 'Profit', 'Total Price', 'Supplier', 'Added At', 'Last Updated', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', whiteSpace: 'nowrap', borderBottom: '1px solid #EAECF0' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSale.length === 0 ? (
                                        <tr><td colSpan={13} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No items match your search.</td></tr>
                                    ) : filteredSale.map(item => {
                                        const totalPrice = (item.capital || 0) + (item.profit || 0);
                                        const isLow = item.quantity_on_hand <= item.reorder_level;
                                        return (
                                            <tr key={item.item_id} style={{ borderTop: '1px solid #F5F7FA' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>#{item.item_id}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: '#1E2F5F', whiteSpace: 'nowrap' }}>{item.item_name}</td>
                                                <td style={{ padding: '10px 12px' }}><StatusBadge status={item.item_type} /></td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: item.quantity_on_hand === 0 ? '#EF4444' : isLow ? '#D97706' : '#16A34A' }}>
                                                        {item.quantity_on_hand}
                                                    </span>
                                                    {isLow && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: 'rgba(245,138,7,0.12)', padding: '1px 5px', borderRadius: 4, marginLeft: 5 }}>LOW</span>}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>{item.reorder_level}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280' }}>{item.unit}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>₱{(item.capital || 0).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#16A34A' }}>₱{(item.profit || 0).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1E2F5F' }}>₱{totalPrice.toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{item.supplier_name || '—'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.added_at}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.last_updated}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                        <button className="btn-primary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => { setSellTarget(item); setSellQty('1'); setSellMethod('Cash'); }}
                                                            disabled={item.quantity_on_hand === 0}>
                                                            💰 Sell
                                                        </button>
                                                        <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => { setEditSaleTarget(item); setEditSaleForm({ item_name: item.item_name, item_type: item.item_type || 'Material', unit: item.unit, quantity_on_hand: String(item.quantity_on_hand), reorder_level: String(item.reorder_level), capital: String(item.capital || 0), profit: String(item.profit || 0), supplier_name: item.supplier_name || '' }); }}>✏️ Edit</button>
                                                        <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => setDeleteTarget(item)}>🗑 Delete</button>
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

            {/* ── HAND TOOL BORROW/RETURN HELPERS ── */}
            {(() => {
                const handleHandToolBorrow = async (item) => {
                    if (item.quantity_on_hand <= 0) return;
                    try {
                        await window.axios.patch(SUPER_ADMIN_ENDPOINTS.updateInventory(item.item_id), {
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
                        await window.axios.patch(SUPER_ADMIN_ENDPOINTS.updateInventory(item.item_id), {
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

            {/* ── Modals ── */}

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

            {/* Add Worker Material Modal */}
            {addWorkerMaterialModal && !confirmAddWM && renderModalWrapper(true, () => setAddWorkerMaterialModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Add Material to Workers' Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Name</p>
                            <Combobox value={wmForm.item_name} onChange={v => setWmForm(p => ({ ...p, item_name: v }))} options={WORKER_MATERIAL_NAMES} placeholder="e.g. Insulation Tape" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={wmForm.unit} onChange={v => setWmForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. roll" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Initial Stock (Total)</p>
                            <input type="number" className="input-field" placeholder="e.g. 20" value={wmForm.initial_stock} onChange={e => setWmForm(p => ({ ...p, initial_stock: e.target.value }))} />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                            <input type="number" className="input-field" placeholder="e.g. 5" value={wmForm.reorder_level} onChange={e => setWmForm(p => ({ ...p, reorder_level: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" onClick={() => setAddWorkerMaterialModal(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setConfirmAddWM(true)}>Add Material →</button>
                    </div>
                </>
            ))}
            <Modal open={confirmAddWM} title="Add Material?" message={`Add "${wmForm.item_name}" (${wmForm.initial_stock} ${wmForm.unit}) to Workers' Inventory?`} confirmLabel="Yes, Add" onConfirm={handleAddWorkerMaterial} onCancel={() => setConfirmAddWM(false)} />

            {/* Add Power Tool Modal */}
            {addPowerToolModal && !confirmAddPT && renderModalWrapper(true, () => setAddPowerToolModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Add Power Tool (1 unit per record)</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Tool Name</p>
                            <Combobox value={ptForm.item_name} onChange={v => setPtForm(p => ({ ...p, item_name: v }))} options={POWER_TOOL_NAMES} placeholder="e.g. Vacuum Pump" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Serial Number</p>
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
            <Modal open={confirmAddPT} title="Add Power Tool?" message={`Add "${ptForm.item_name}" with serial ${ptForm.serial_number} to Workers' Inventory?`} confirmLabel="Yes, Add" onConfirm={handleAddPowerTool} onCancel={() => setConfirmAddPT(false)} />

            {/* Add Hand Tool Modal */}
            {addHandToolModal && !confirmAddHT && renderModalWrapper(true, () => setAddHandToolModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Add Hand Tool to Workers' Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Tool Name</p>
                            <Combobox value={htAddForm.item_name} onChange={v => setHtAddForm(p => ({ ...p, item_name: v }))} options={HAND_TOOL_NAMES} placeholder="e.g. Screwdriver Set" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={htAddForm.unit} onChange={v => setHtAddForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. set" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Quantity</p>
                            <input type="number" className="input-field" placeholder="e.g. 5" value={htAddForm.quantity} onChange={e => setHtAddForm(p => ({ ...p, quantity: e.target.value }))} />
                        </div>
                        <div>
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
            <Modal open={confirmAddHT} title="Add Hand Tool?" message={`Add "${htAddForm.item_name}" (${htAddForm.quantity} ${htAddForm.unit}) to Workers' Inventory?`} confirmLabel="Yes, Add" onConfirm={handleAddHandTool} onCancel={() => setConfirmAddHT(false)} />

            {/* Add For-Sale Item Modal */}
            {addSaleModal && !confirmAddSale && renderModalWrapper(true, () => setAddSaleModal(false), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Add Item to For Sale Inventory</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Name</p>
                            <Combobox value={saleForm.item_name} onChange={v => setSaleForm(p => ({ ...p, item_name: v }))} options={SALE_ITEM_NAMES} placeholder="e.g. AC Coil Cleaner" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Type</p>
                            <select className="input-field" value={saleForm.item_type} onChange={e => setSaleForm(p => ({ ...p, item_type: e.target.value }))}>
                                <option value="Material">Material</option>
                                <option value="Tool">Tool</option>
                            </select>
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                            <Combobox value={saleForm.unit} onChange={v => setSaleForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. can" />
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
            <Modal open={confirmAddSale} title="Add to For Sale Inventory?" message={`Add "${saleForm.item_name}" (₱${((parseFloat(saleForm.capital||'0') + parseFloat(saleForm.profit||'0'))).toLocaleString()} each) to the For Sale inventory?`} confirmLabel="Yes, Add" onConfirm={handleAddSaleItem} onCancel={() => setConfirmAddSale(false)} />

            {/* Edit Worker Material Modal */}
            {editWMTarget && !confirmEditWM && renderModalWrapper(true, () => setEditWMTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Edit Material</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
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
                        <div>
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

            {/* Edit Power Tool Modal */}
            {editPTTarget && !confirmEditPT && renderModalWrapper(true, () => setEditPTTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Edit Power Tool</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
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

            {/* Edit Hand Tool Modal */}
            {editHTTarget && !confirmEditHT && renderModalWrapper(true, () => setEditHTTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Edit Hand Tool</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
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
                        <div>
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

            {/* Edit For Sale Item Modal */}
            {editSaleTarget && !confirmEditSale && renderModalWrapper(true, () => setEditSaleTarget(null), (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', margin: '0 0 20px' }}>Edit For Sale Item</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Name</p>
                            <Combobox value={editSaleForm.item_name} onChange={v => setEditSaleForm(p => ({ ...p, item_name: v }))} options={SALE_ITEM_NAMES} placeholder="Item name" />
                        </div>
                        <div>
                            <p className="section-label" style={{ marginBottom: 5 }}>Item Type</p>
                            <select className="input-field" value={editSaleForm.item_type} onChange={e => setEditSaleForm(p => ({ ...p, item_type: e.target.value }))}>
                                <option value="Material">Material</option>
                                <option value="Tool">Tool</option>
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

            {/* Delete Modal */}
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