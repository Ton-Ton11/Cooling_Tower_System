import { useCallback, useEffect, useMemo, useState, useRef, Fragment } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    AC_STATUS_OPTIONS,
    AC_TYPE_OPTIONS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatCurrency,
    formatDate,
    normalizeAcUnit,
    normalizeSparePart,
    toInputDate,
} from "../../utils/superAdmin";

// Constants
const PART_NAMES = ['Capacitor 35+5 MFD', 'Contactor 25A', 'Fan Motor 1/5HP', 'Thermistor Sensor', 'PCB Control Board', 'Expansion Valve', 'Drain Pan', 'Filter Drier', 'Relay Switch', 'Overload Protector'];
const UNIT_OPTIONS = ['pc', 'set', 'unit', 'pair', 'box', 'roll', 'm'];
const BRAND_OPTIONS = ['Daikin', 'Carrier', 'Mitsubishi', 'Panasonic', 'LG', 'Midea', 'Samsung', 'Haier', 'Toshiba'];

let partIdCounter = 10;
let soldIdCounter = 100;

// Helper functions
function nowStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addMonths(dateStr, months) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysUntil(dateStr) {
    const now = new Date(); now.setHours(0,0,0,0);
    const target = new Date(dateStr); target.setHours(0,0,0,0);
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function warrantyStatus(expiryDate) {
    const days = daysUntil(expiryDate);
    if (days < 0) return { label: 'Expired', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
    if (days <= 60) return { label: 'Expiring Soon', color: '#D97706', bg: 'rgba(217,119,6,0.1)' };
    return { label: 'Active', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' };
}

function forecastStatus(dueDate) {
    const days = daysUntil(dueDate);
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, color: '#EF4444' };
    if (days <= 30) return { label: `Due in ${days}d`, color: '#D97706' };
    return { label: dueDate, color: '#6B7280' };
}

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

// Create empty form
const createEmptyForm = () => ({
    brand: "",
    model: "",
    serial_number: "",
    horsepower: "",
    ac_type: "Split",
    refrigerant_type: "R32",
    supplier: "",
    purchase_price: "",
    selling_price: "",
    purchase_date: toInputDate(new Date()),
    warranty_period: "12",
    status: "Available",
});

// Create empty spare part form
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

// Create empty sell form
const createEmptySellForm = (warrantyPeriod = 12) => ({
    customer_name: '',
    customer_contact: '',
    customer_address: '',
    payment_method: 'Cash',
    ocular_status: 'Completed',
    warranty_period: warrantyPeriod,
});

function AcUnits({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [units, setUnits] = useState([]);
    const [parts, setParts] = useState([]);
    const [subTab, setSubTab] = useState("all");
    const [loading, setLoading] = useState(true);
    const [editorMode, setEditorMode] = useState(null);
    const [editingUnit, setEditingUnit] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    
    // Sold units state
    const [soldUnits, setSoldUnits] = useState([]);
    const [expandedSold, setExpandedSold] = useState(null);
    
    // Sell modal state
    const [sellModal, setSellModal] = useState(null);
    const [confirmSell, setConfirmSell] = useState(false);
    const [sellForm, setSellForm] = useState(createEmptySellForm());
    
    // Spare Parts state
    const [addPartModal, setAddPartModal] = useState(false);
    const [confirmAddPart, setConfirmAddPart] = useState(false);
    const [partForm, setPartForm] = useState(createEmptyPartForm());
    const [partQtyAction, setPartQtyAction] = useState(null);
    const [partQtyValue, setPartQtyValue] = useState('');
    const [confirmPartQty, setConfirmPartQty] = useState(false);
    
    // Arrival date editing
    const [editingArrival, setEditingArrival] = useState(null);
    const [arrivalInput, setArrivalInput] = useState('');
    
    // Edit/Delete targets
    const [editUnitTarget, setEditUnitTarget] = useState(null);
    const [editUnitForm, setEditUnitForm] = useState(createEmptyForm());
    const [confirmEditUnit, setConfirmEditUnit] = useState(false);
    const [deleteUnitTarget, setDeleteUnitTarget] = useState(null);
    
    const [editPartTarget, setEditPartTarget] = useState(null);
    const [editPartForm, setEditPartForm] = useState(createEmptyPartForm());
    const [confirmEditPart, setConfirmEditPart] = useState(false);
    const [deletePartTarget, setDeletePartTarget] = useState(null);

    // Fetch units
    const fetchUnits = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(ep.acUnits);
            setUnits((Array.isArray(data?.data) ? data.data : []).map(normalizeAcUnit));
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load AC units."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Fetch spare parts
    const fetchParts = useCallback(async () => {
        try {
            const { data } = await window.axios.get(ep.spareParts ?? SUPER_ADMIN_ENDPOINTS.spareParts);
            setParts((Array.isArray(data?.data) ? data.data : []).map(normalizeSparePart));
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load spare parts."), "error");
        }
    }, [addToast]);

    useEffect(() => {
        fetchUnits();
        fetchParts();
    }, [fetchUnits, fetchParts]);

    // Computed values
    const orderBaseUnits = useMemo(() => units.filter(unit => unit.status === "Order Base"), [units]);
    const displayUnits = subTab === "order" ? orderBaseUnits : units.filter(u => u.status !== 'Sold');
    const allSold = soldUnits;
    const lowParts = useMemo(() => parts.filter(p => p.quantity_on_hand <= p.reorder_level), [parts]);

    // Open modals
    const openCreateModal = () => {
        setEditingUnit(null);
        setForm(createEmptyForm());
        setEditorMode("create");
    };

    const openEditModal = (unit) => {
        setEditingUnit(unit);
        setForm({
            brand: unit.brand ?? "",
            model: unit.model ?? "",
            serial_number: unit.serial_number ?? "",
            horsepower: String(unit.horsepower ?? ""),
            ac_type: unit.ac_type ?? "Split",
            refrigerant_type: unit.refrigerant_type ?? "",
            supplier: unit.supplier ?? "",
            purchase_price: String(unit.purchase_price ?? ""),
            selling_price: unit.selling_price === null || unit.selling_price === undefined ? "" : String(unit.selling_price),
            purchase_date: toInputDate(unit.purchase_date),
            warranty_period: String(unit.warranty_period ?? ""),
            status: unit.status ?? "Available",
        });
        setEditorMode("edit");
    };

    const closeEditor = () => {
        if (saving) return;
        setEditorMode(null);
        setEditingUnit(null);
        setForm(createEmptyForm());
    };

    // Save AC Unit
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);

        const payload = {
            brand: form.brand.trim(),
            model: form.model.trim(),
            serial_number: form.serial_number.trim(),
            horsepower: Number(form.horsepower),
            ac_type: form.ac_type,
            refrigerant_type: form.refrigerant_type.trim() || null,
            supplier: form.supplier.trim() || null,
            purchase_price: Number(form.purchase_price),
            selling_price: form.selling_price === "" ? null : Number(form.selling_price),
            purchase_date: form.purchase_date,
            warranty_period: Number(form.warranty_period),
            status: form.status,
        };

        try {
            const response = editorMode === "edit" && editingUnit
                ? await window.axios.patch(ep.updateAcUnit(editingUnit.ac_unit_id), payload)
                : await window.axios.post(ep.acUnits, payload);

            addToast(response?.data?.message || (editorMode === "edit" ? "AC unit updated successfully." : "AC unit created successfully."));
            setEditorMode(null);
            setEditingUnit(null);
            setForm(createEmptyForm());
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, editorMode === "edit" ? "Unable to update the AC unit." : "Unable to create the AC unit."), "error");
        } finally {
            setSaving(false);
        }
    };

    // Delete AC Unit
    const handleDelete = async () => {
        if (deleting || !deleteTarget) return;
        setDeleting(true);
        try {
            const { data } = await window.axios.delete(ep.deleteAcUnit(deleteTarget.ac_unit_id));
            addToast(data?.message || "AC unit deleted successfully.");
            setDeleteTarget(null);
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete the AC unit."), "error");
        } finally {
            setDeleting(false);
        }
    };

    // ─── SELL FUNCTIONALITY ───
    const handleSell = async () => {
        if (!sellModal) return;
        const today = todayStr();
        const newSoldUnit = {
            sold_id: ++soldIdCounter,
            ac_unit_id: sellModal.ac_unit_id,
            brand: sellModal.brand,
            model: sellModal.model,
            serial_number: sellModal.serial_number,
            horsepower: sellModal.horsepower,
            ac_type: sellModal.ac_type,
            selling_price: sellModal.selling_price,
            warranty_period: sellForm.warranty_period,
            customer_name: sellForm.customer_name,
            customer_contact: sellForm.customer_contact,
            customer_address: sellForm.customer_address,
            sold_at: nowStr(),
            payment_method: sellForm.payment_method,
            ocular_status: sellForm.ocular_status,
            warranty_start: today,
            warranty_expiry: addMonths(today, sellForm.warranty_period),
            next_maintenance_due: addMonths(today, 6),
            next_cleaning_due: addMonths(today, 3),
            next_checkup_due: addMonths(today, 12),
            forecast_active: true,
        };
        
        try {
            // Update unit status to Sold in the database
            await window.axios.patch(ep.updateAcUnit(sellModal.ac_unit_id), {
                status: 'Sold'
            });
            
            setUnits(prev => prev.map(u => u.ac_unit_id === sellModal.ac_unit_id ? { ...u, status: 'Sold' } : u));
            setSoldUnits(prev => [newSoldUnit, ...prev]);
            addToast(`${sellModal.brand} ${sellModal.model} sold to ${sellForm.customer_name}. Recorded in Sales & Records.`);
            setSellModal(null);
            setConfirmSell(false);
            setSellForm(createEmptySellForm());
            await fetchUnits(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to process sale."), "error");
        }
    };

    // ─── SPARE PARTS FUNCTIONALITY ───
    const handleAddPart = async () => {
        const brands = partForm.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
        const qty = parseInt(partForm.qty) || 0;
        const reorder = parseInt(partForm.reorder_level) || 0;
        const capital = parseFloat(partForm.capital) || 0;
        const sellingPrice = parseFloat(partForm.selling_price) || 0;

        const payload = {
            item_name: partForm.part_name.trim(),
            part_name: partForm.part_name.trim(),
            item_type: 'Spare Part',
            inventory_mode: 'spare_part',
            compatible_brands: brands,
            quantity_on_hand: qty,
            initial_stock: qty,
            reorder_level: reorder,
            unit: partForm.unit.trim() || 'pc',
            capital: capital,
            selling_price: sellingPrice,
            profit: Math.max(0, sellingPrice - capital),
            supplier_name: partForm.supplier ? partForm.supplier.trim() : null,
            supplier: partForm.supplier ? partForm.supplier.trim() : null,
            status: qty === 0 ? 'Out of Stock' : (qty <= reorder ? 'Low Stock' : 'Available'),
        };

        try {
            const response = await window.axios.post(ep.spareParts ?? SUPER_ADMIN_ENDPOINTS.spareParts, payload);
            addToast(response?.data?.message || `Spare part "${partForm.part_name}" added to inventory.`);
            setAddPartModal(false);
            setConfirmAddPart(false);
            setPartForm(createEmptyPartForm());
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to add spare part."), "error");
        }
    };

    const handlePartQtyUpdate = async () => {
        if (!partQtyAction) return;
        const amt = parseInt(partQtyValue) || 0;
        if (amt <= 0) {
            addToast("Please enter a valid quantity greater than zero.", "error");
            return;
        }

        const currentQty = partQtyAction.part.quantity_on_hand || 0;
        const newQty = Math.max(0, currentQty + (partQtyAction.mode === 'add' ? amt : -amt));
        const itemId = partQtyAction.part.part_id || partQtyAction.part.item_id;

        try {
            const updatePartFn = ep.updateSparePart ?? SUPER_ADMIN_ENDPOINTS.updateSparePart;
            await window.axios.patch(updatePartFn(itemId), {
                quantity_on_hand: newQty,
                status: newQty === 0 ? 'Out of Stock' : (newQty <= partQtyAction.part.reorder_level ? 'Low Stock' : 'Available'),
            });
            addToast(`Spare parts updated: ${partQtyAction.part.part_name} ${partQtyAction.mode === 'add' ? '+' : '-'}${amt}.`);
            setPartQtyAction(null);
            setPartQtyValue('');
            setConfirmPartQty(false);
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update spare part quantity."), "error");
        }
    };

    const handleEditPart = async () => {
        if (!editPartTarget) return;
        const brands = editPartForm.compatible_brands.split(',').map(b => b.trim()).filter(Boolean);
        const reorder = parseInt(editPartForm.reorder_level) || 0;
        const capital = parseFloat(editPartForm.capital) || 0;
        const sellingPrice = parseFloat(editPartForm.selling_price) || 0;
        const itemId = editPartTarget.part_id || editPartTarget.item_id;

        const payload = {
            item_name: editPartForm.part_name.trim(),
            part_name: editPartForm.part_name.trim(),
            compatible_brands: brands,
            reorder_level: reorder,
            unit: editPartForm.unit.trim(),
            capital: capital,
            selling_price: sellingPrice,
            profit: Math.max(0, sellingPrice - capital),
            supplier_name: editPartForm.supplier ? editPartForm.supplier.trim() : null,
            supplier: editPartForm.supplier ? editPartForm.supplier.trim() : null,
        };

        try {
            const updatePartFn = ep.updateSparePart ?? SUPER_ADMIN_ENDPOINTS.updateSparePart;
            await window.axios.patch(updatePartFn(itemId), payload);
            addToast(`Spare part "${editPartForm.part_name}" updated.`);
            setEditPartTarget(null);
            setConfirmEditPart(false);
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to update spare part."), "error");
        }
    };

    const handleDeletePart = async () => {
        if (!deletePartTarget) return;
        const itemId = deletePartTarget.part_id || deletePartTarget.item_id;

        try {
            const deletePartFn = ep.deleteSparePart ?? SUPER_ADMIN_ENDPOINTS.deleteSparePart;
            await window.axios.delete(deletePartFn(itemId));
            addToast(`"${deletePartTarget.part_name}" deleted from spare parts inventory.`, 'warning');
            setDeletePartTarget(null);
            await fetchParts();
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to delete spare part."), "error");
        }
    };

    const handleSetArrival = (unitId) => {
        if (!arrivalInput) return;
        setUnits(prev => prev.map(u => u.ac_unit_id === unitId ? { ...u, expected_arrival: arrivalInput } : u));
        addToast('Arrival date updated.');
        setEditingArrival(null);
        setArrivalInput('');
    };

    const markOcularComplete = (soldId) => {
        setSoldUnits(prev => prev.map(s => s.sold_id === soldId ? { ...s, ocular_status: 'Completed', ocular_completed_at: nowStr() } : s));
        addToast('Ocular inspection marked as completed.');
    };

    // ─── RENDER HELPERS ───
    const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', whiteSpace: 'nowrap', borderBottom: '1px solid #EAECF0' };
    const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' };

    return (
        <div style={{ animation: 'fadeInUp 0.25s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">AC Units Inventory</h1>
                    <p className="page-subtitle">
                        {units.filter(u => u.status !== 'Sold').length} units tracked · {units.filter(u => u.status === 'Available').length} available · {allSold.length} sold
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={() => { fetchUnits(); fetchParts(); }}>Refresh</button>
                    {subTab === 'spareparts' ? (
                        <button className="btn-primary" onClick={() => setAddPartModal(true)}>+ Add Spare Part</button>
                    ) : (
                        <button className="btn-primary" onClick={openCreateModal}>+ Add AC Unit</button>
                    )}
                </div>
            </div>

            <div className="tab-bar" style={{ marginBottom: 20, display: 'inline-flex' }}>
                <button className={`tab-item ${subTab === 'all' ? 'active' : ''}`} onClick={() => setSubTab('all')}>
                    All Units ({units.filter(u => u.status !== 'Sold').length})
                </button>
                <button className={`tab-item ${subTab === 'order' ? 'active' : ''}`} onClick={() => setSubTab('order')}>
                    Order Base ({orderBaseUnits.length})
                </button>
                <button className={`tab-item ${subTab === 'spareparts' ? 'active' : ''}`} onClick={() => setSubTab('spareparts')}>
                    Spare Parts ({parts.length})
                    {lowParts.length > 0 && <span style={{ marginLeft: 6, background: '#EF4444', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{lowParts.length}</span>}
                </button>
                <button className={`tab-item ${subTab === 'sold' ? 'active' : ''}`} onClick={() => setSubTab('sold')}>
                    Sold Units ({allSold.length})
                </button>
            </div>

            {/* ─── ALL / ORDER BASE TABLE ─── */}
            {(subTab === 'all' || subTab === 'order') && (
                <div className="card" style={{ padding: 20 }}>
                    {loading ? (
                        <div style={{ padding: 24, borderRadius: 12, background: '#F9FAFB', color: '#6B7280' }}>
                            Loading AC units...
                        </div>
                    ) : displayUnits.length === 0 ? (
                        <div style={{ padding: 24, borderRadius: 12, background: '#F9FAFB', color: '#6B7280' }}>
                            No AC units are available in this view.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                                <thead>
                                    <tr style={{ background: '#F5F7FA' }}>
                                        {['Unit ID', 'Brand', 'Model', 'Serial No.', 'Type', 'HP', 'Refrigerant', 'Purchase Price', 'Selling Price', 'Warranty', 'Status', ...(subTab === 'order' ? ['Arrival Tracker'] : []), 'Actions'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayUnits.map(u => (
                                        <tr key={u.ac_unit_id}
                                            style={{ borderTop: '1px solid #F5F7FA' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#3F7DFF' }}>#AC{String(u.ac_unit_id).padStart(3, '0')}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600, color: '#1E2F5F' }}>{u.brand}</td>
                                            <td style={{ ...tdStyle, fontSize: 12 }}>{u.model}</td>
                                            <td style={{ ...tdStyle, fontSize: 11, color: '#9CA3AF' }}>{u.serial_number}</td>
                                            <td style={{ ...tdStyle, fontSize: 12, color: '#6B7280' }}>{u.ac_type}</td>
                                            <td style={{ ...tdStyle, fontSize: 12 }}>{u.horsepower}HP</td>
                                            <td style={{ ...tdStyle, fontSize: 12, color: '#6B7280' }}>{u.refrigerant_type}</td>
                                            <td style={{ ...tdStyle, fontSize: 12 }}>₱{u.purchase_price.toLocaleString()}</td>
                                            <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#16A34A' }}>₱{u.selling_price.toLocaleString()}</td>
                                            <td style={{ ...tdStyle, fontSize: 12, color: '#6B7280' }}>{u.warranty_period}mo</td>
                                            <td style={{ padding: '10px 12px' }}><StatusBadge status={u.status} /></td>

                                            {/* Arrival tracker column — order base only */}
                                            {subTab === 'order' && (
                                                <td style={{ padding: '10px 12px', minWidth: 180 }}>
                                                    {editingArrival === u.ac_unit_id ? (
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            <input type="date" className="input-field" style={{ padding: '4px 8px', fontSize: 12, width: 140 }}
                                                                value={arrivalInput} onChange={e => setArrivalInput(e.target.value)} />
                                                            <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleSetArrival(u.ac_unit_id)}>Save</button>
                                                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => { setEditingArrival(null); setArrivalInput('') }}>✕</button>
                                                        </div>
                                                    ) : u.expected_arrival ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            {(() => {
                                                                const days = daysUntil(u.expected_arrival);
                                                                const color = days < 0 ? '#EF4444' : days <= 7 ? '#D97706' : '#16A34A';
                                                                const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`;
                                                                return (
                                                                    <>
                                                                        <div>
                                                                            <p style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{u.expected_arrival}</p>
                                                                            <p style={{ fontSize: 11, fontWeight: 600, color }}>{label}</p>
                                                                        </div>
                                                                        <button onClick={() => { setEditingArrival(u.ac_unit_id); setArrivalInput(u.expected_arrival || '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#3F7DFF' }}>Edit</button>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: 11 }}
                                                            onClick={() => { setEditingArrival(u.ac_unit_id); setArrivalInput('') }}>
                                                            Set Arrival Date
                                                        </button>
                                                    )}
                                                </td>
                                            )}

                                            {/* Actions */}
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                    {u.status === 'Available' && (
                                                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11, background: 'linear-gradient(135deg,#16A34A,#15803D)' }}
                                                            onClick={() => { setSellModal(u); setSellForm(createEmptySellForm(u.warranty_period)); }}>
                                                            Sell
                                                        </button>
                                                    )}
                                                    <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }}
                                                        onClick={() => openEditModal(u)}>✏️ Edit</button>
                                                    {u.status !== 'Sold' && (
                                                        <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}
                                                            onClick={() => setDeleteTarget(u)}>🗑 Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── SPARE PARTS ─── */}
            {subTab === 'spareparts' && (
                <>
                    {lowParts.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(245,138,7,0.08)', border: '1px solid rgba(245,138,7,0.25)' }}>
                            <span style={{ fontSize: 18 }}>⚠️</span>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>Low Stock Alert</p>
                                <p style={{ fontSize: 12, color: '#6B7280' }}>{lowParts.map(p => p.part_name).join(' · ')} — at or below reorder level</p>
                            </div>
                        </div>
                    )}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
                                <thead>
                                    <tr style={{ background: '#F5F7FA' }}>
                                        {['Part ID', 'Part Name', 'Compatible Brands', 'Qty', 'Reorder', 'Unit', 'Capital', 'Selling Price', 'Supplier', 'Added At', 'Last Updated', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parts.map(p => {
                                        const statusColor = p.status === 'Out of Stock' ? '#EF4444' : p.status === 'Low Stock' ? '#D97706' : '#16A34A';
                                        return (
                                            <tr key={p.part_id}
                                                style={{ borderTop: '1px solid #F5F7FA' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#3F7DFF' }}>#SP{String(p.part_id).padStart(3,'0')}</td>
                                                <td style={{ ...tdStyle, fontWeight: 500, color: '#1E2F5F' }}>{p.part_name}</td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: '#6B7280', maxWidth: 160 }}>
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {p.compatible_brands.map(b => (
                                                            <span key={b} style={{ background: 'rgba(63,125,255,0.08)', color: '#3F7DFF', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{b}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: 14, fontWeight: 600, color: statusColor }}>{p.quantity_on_hand}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: '#9CA3AF' }}>{p.reorder_level}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: '#6B7280' }}>{p.unit}</td>
                                                <td style={{ ...tdStyle, fontSize: 12 }}>₱{p.capital.toLocaleString()}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: '#16A34A' }}>₱{p.selling_price.toLocaleString()}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: '#6B7280' }}>{p.supplier}</td>
                                                <td style={{ ...tdStyle, fontSize: 11, color: '#9CA3AF' }}>{p.added_at}</td>
                                                <td style={{ ...tdStyle, fontSize: 11, color: '#9CA3AF' }}>{p.last_updated}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${statusColor}15`, color: statusColor }}>{p.status}</span>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                        <button className="btn-primary" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => { setPartQtyAction({ part: p, mode: 'add' }); setPartQtyValue('') }}>+ Add</button>
                                                        <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => { setPartQtyAction({ part: p, mode: 'reduce' }); setPartQtyValue('') }}>− Use</button>
                                                        <button className="btn-secondary" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => { setEditPartTarget(p); setEditPartForm({ part_name: p.part_name, compatible_brands: p.compatible_brands.join(', '), reorder_level: String(p.reorder_level), unit: p.unit, capital: String(p.capital), selling_price: String(p.selling_price), supplier: p.supplier }) }}>✏️ Edit</button>
                                                        <button className="btn-danger" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => setDeletePartTarget(p)}>🗑 Delete</button>
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

            {/* ─── SOLD UNITS ─── */}
            {subTab === 'sold' && (
                <div className="card" style={{ padding: 20 }}>
                    {allSold.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '32px 0' }}>No sold units yet. Sell an available unit to see it here.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                                <thead>
                                    <tr style={{ background: '#F5F7FA' }}>
                                        {['Unit', 'Serial No.', 'Customer', 'Sold At', 'Price', 'Payment', 'Warranty', 'Ocular', 'Forecast'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allSold.map(s => {
                                        const wStatus = warrantyStatus(s.warranty_expiry);
                                        const isExpanded = expandedSold === s.sold_id;
                                        const currentOcular = s.ocular_status;
                                        const ocularColor = currentOcular === 'Completed' ? '#16A34A' : '#6B7280';
                                        const mFc = forecastStatus(s.next_maintenance_due);
                                        const cFc = forecastStatus(s.next_cleaning_due);
                                        const chFc = forecastStatus(s.next_checkup_due);
                                        return (
                                            <Fragment key={s.sold_id}>
                                                <tr
                                                    style={{ borderTop: '1px solid #F5F7FA', cursor: 'pointer' }}
                                                    onClick={() => setExpandedSold(isExpanded ? null : s.sold_id)}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(63,125,255,0.04)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(63,125,255,0.02)' : 'transparent'}
                                                >
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E2F5F' }}>{s.brand} {s.model}</p>
                                                        <p style={{ fontSize: 11, color: '#9CA3AF' }}>{s.horsepower}HP {s.ac_type}</p>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 11, color: '#9CA3AF' }}>{s.serial_number}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1E2F5F' }}>{s.customer_name}</p>
                                                        <p style={{ fontSize: 11, color: '#9CA3AF' }}>{s.customer_contact}</p>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 11, color: '#9CA3AF' }}>{s.sold_at}</td>
                                                    <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: '#16A34A' }}>₱{s.selling_price.toLocaleString()}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.payment_method === 'GCash' ? 'rgba(63,125,255,0.1)' : 'rgba(22,163,74,0.1)', color: s.payment_method === 'GCash' ? '#3F7DFF' : '#16A34A' }}>
                                                            {s.payment_method}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: wStatus.bg, color: wStatus.color }}>{wStatus.label}</span>
                                                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Exp: {s.warranty_expiry}</p>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${ocularColor}18`, color: ocularColor }}>{currentOcular}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        {s.forecast_active ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <p style={{ fontSize: 10, color: mFc.color }}><span style={{ color: '#9CA3AF' }}>Maint: </span>{mFc.label}</p>
                                                                <p style={{ fontSize: 10, color: cFc.color }}><span style={{ color: '#9CA3AF' }}>Clean: </span>{cFc.label}</p>
                                                                <p style={{ fontSize: 10, color: chFc.color }}><span style={{ color: '#9CA3AF' }}>Check: </span>{chFc.label}</p>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Inactive</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded detail row */}
                                                {isExpanded && (
                                                    <tr style={{ background: 'rgba(63,125,255,0.02)', borderTop: '1px solid #EEF2FF' }}>
                                                        <td colSpan={9} style={{ padding: '0 12px 20px 12px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, paddingTop: 16 }}>
                                                                {/* Customer Details */}
                                                                <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                                                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: 10 }}>Customer Details</p>
                                                                    {[
                                                                        { label: 'Name', value: s.customer_name },
                                                                        { label: 'Contact', value: s.customer_contact },
                                                                        { label: 'Address', value: s.customer_address },
                                                                        { label: 'Sold At', value: s.sold_at },
                                                                        { label: 'Payment', value: s.payment_method },
                                                                    ].map(row => (
                                                                        <div key={row.label} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                                                            <p style={{ fontSize: 11, color: '#9CA3AF', minWidth: 60 }}>{row.label}</p>
                                                                            <p style={{ fontSize: 12, color: '#1E2F5F', fontWeight: 500 }}>{row.value}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Warranty Tracking */}
                                                                <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                                                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: 10 }}>Warranty Tracking</p>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: wStatus.bg, color: wStatus.color }}>{wStatus.label}</span>
                                                                    </div>
                                                                    {[
                                                                        { label: 'Period', value: `${s.warranty_period} months` },
                                                                        { label: 'Start', value: s.warranty_start },
                                                                        { label: 'Expiry', value: s.warranty_expiry },
                                                                        { label: 'Days Left', value: (() => { const d = daysUntil(s.warranty_expiry); return d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d} days`; })() },
                                                                    ].map(row => (
                                                                        <div key={row.label} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                                                            <p style={{ fontSize: 11, color: '#9CA3AF', minWidth: 60 }}>{row.label}</p>
                                                                            <p style={{ fontSize: 12, color: '#1E2F5F', fontWeight: 500 }}>{row.value}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Service Forecasting */}
                                                                <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                                                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: 10 }}>
                                                                        Service Forecasting
                                                                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: s.forecast_active ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.1)', color: s.forecast_active ? '#16A34A' : '#9CA3AF' }}>
                                                                            {s.forecast_active ? '● Active' : 'Inactive'}
                                                                        </span>
                                                                    </p>
                                                                    {[
                                                                        { label: 'Maintenance', subtitle: 'every 6 months', fc: mFc },
                                                                        { label: 'Cleaning', subtitle: 'every 3 months', fc: cFc },
                                                                        { label: 'Check-up', subtitle: 'every 12 months', fc: chFc },
                                                                    ].map(row => (
                                                                        <div key={row.label} style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: '#fff', border: '1px solid #E5E7EB' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                                <div>
                                                                                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1E2F5F' }}>{row.label}</p>
                                                                                    <p style={{ fontSize: 10, color: '#9CA3AF' }}>{row.subtitle}</p>
                                                                                </div>
                                                                                <p style={{ fontSize: 11, fontWeight: 600, color: row.fc.color }}>{row.fc.label}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── MODALS ─── */}

            {/* Add/Edit AC Unit Modal */}
            <Modal
                open={!!editorMode}
                title={editorMode === "edit" ? "Edit AC Unit" : "Add New AC Unit"}
                message={editorMode === "edit" ? "Update the saved AC unit details below." : "Enter the inventory and pricing details for the new AC unit."}
                confirmLabel={saving ? "Saving..." : "Save Unit"}
                confirmDisabled={saving}
                maxWidth={760}
                onConfirm={handleSave}
                onCancel={closeEditor}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
                    {[
                        { label: 'Brand', key: 'brand', placeholder: 'e.g. Daikin' },
                        { label: 'Model', key: 'model', placeholder: 'e.g. FTKC25UVM' },
                        { label: 'Serial Number', key: 'serial_number', placeholder: 'e.g. DK-2026-0009' },
                        { label: 'Horsepower', key: 'horsepower', placeholder: 'e.g. 1.5', type: 'number', min: '0.5', step: '0.1' },
                        { label: 'Refrigerant Type', key: 'refrigerant_type', placeholder: 'R32 / R410A' },
                        { label: 'Supplier', key: 'supplier', placeholder: 'Supplier name' },
                        { label: 'Purchase Price', key: 'purchase_price', placeholder: '0.00', type: 'number', min: '0', step: '0.01' },
                        { label: 'Selling Price', key: 'selling_price', placeholder: '0.00', type: 'number', min: '0', step: '0.01' },
                        { label: 'Purchase Date', key: 'purchase_date', type: 'date' },
                        { label: 'Warranty Period (months)', key: 'warranty_period', type: 'number', min: '0', step: '1' },
                    ].map(field => (
                        <div key={field.key}>
                            <p className="section-label" style={{ marginBottom: 6 }}>{field.label}</p>
                            <input
                                type={field.type || 'text'}
                                min={field.min}
                                step={field.step}
                                className="input-field"
                                placeholder={field.placeholder}
                                value={form[field.key]}
                                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            />
                        </div>
                    ))}
                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>AC Type</p>
                        <select className="input-field" value={form.ac_type} onChange={e => setForm(prev => ({ ...prev, ac_type: e.target.value }))}>
                            {AC_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <p className="section-label" style={{ marginBottom: 6 }}>Status</p>
                        <select className="input-field" value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                            {AC_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                open={!!deleteTarget}
                title="Delete AC Unit?"
                message={`Remove ${deleteTarget?.brand || ''} ${deleteTarget?.model || ''} from inventory? This action cannot be undone.`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />

            {/* ─── SELL MODAL ─── */}
            {sellModal && !confirmSell && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setSellModal(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#16A34A,#15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F' }}>Sell AC Unit</h3>
                                <p style={{ fontSize: 12, color: '#6B7280' }}>{sellModal.brand} {sellModal.model} · ₱{sellModal.selling_price.toLocaleString()}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <p className="section-label" style={{ marginBottom: 6 }}>Customer Name</p>
                                <input className="input-field" placeholder="Full name" value={sellForm.customer_name} onChange={e => setSellForm(p => ({ ...p, customer_name: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 6 }}>Contact Number</p>
                                <input className="input-field" placeholder="09XXXXXXXXX" value={sellForm.customer_contact} onChange={e => setSellForm(p => ({ ...p, customer_contact: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 6 }}>Address</p>
                                <input className="input-field" placeholder="Full address" value={sellForm.customer_address} onChange={e => setSellForm(p => ({ ...p, customer_address: e.target.value }))} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <p className="section-label" style={{ marginBottom: 6 }}>Payment Method</p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['Cash', 'GCash'].map(m => (
                                            <button key={m} onClick={() => setSellForm(p => ({ ...p, payment_method: m }))} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: sellForm.payment_method === m ? 'linear-gradient(135deg,#3F7DFF,#1E2F5F)' : '#F5F7FA', color: sellForm.payment_method === m ? '#fff' : '#6B7280' }}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="section-label" style={{ marginBottom: 6 }}>Warranty (months)</p>
                                    <input type="number" className="input-field" value={sellForm.warranty_period} onChange={e => setSellForm(p => ({ ...p, warranty_period: parseInt(e.target.value) || 12 }))} />
                                </div>
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 6 }}>Ocular Inspection</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[
                                        { v: 'Completed', label: '✓ Completed', color: '#16A34A' },
                                        { v: 'Waived', label: '⚠ Waived (Client signed waiver)', color: '#6B7280' },
                                    ].map(opt => (
                                        <button key={opt.v} onClick={() => setSellForm(p => ({ ...p, ocular_status: opt.v }))} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: sellForm.ocular_status === opt.v ? `2px solid ${opt.color}` : '1px solid #E5E7EB', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: sellForm.ocular_status === opt.v ? `${opt.color}12` : '#F9FAFB', color: sellForm.ocular_status === opt.v ? opt.color : '#9CA3AF' }}>{opt.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn-secondary" onClick={() => setSellModal(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)' }}
                                disabled={!sellForm.customer_name}
                                onClick={() => setConfirmSell(true)}>
                                Confirm Sale →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={confirmSell}
                title="Confirm AC Unit Sale?"
                message={`Sell ${sellModal?.brand} ${sellModal?.model} to ${sellForm.customer_name} for ₱${sellModal?.selling_price.toLocaleString()} via ${sellForm.payment_method}?`}
                confirmLabel="Yes, Record Sale"
                onConfirm={handleSell}
                onCancel={() => setConfirmSell(false)}
            />

            {/* ─── ADD SPARE PART MODAL ─── */}
            {addPartModal && !confirmAddPart && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setAddPartModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: 520, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', marginBottom: 20 }}>Add New Spare Part</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p className="section-label" style={{ marginBottom: 5 }}>Part Name</p>
                                <Combobox value={partForm.part_name} onChange={v => setPartForm(p => ({ ...p, part_name: v }))} options={PART_NAMES} placeholder="e.g. Capacitor 35+5 MFD" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p className="section-label" style={{ marginBottom: 5 }}>Compatible Brands (comma-separated)</p>
                                <Combobox value={partForm.compatible_brands} onChange={v => setPartForm(p => ({ ...p, compatible_brands: v }))} options={BRAND_OPTIONS} placeholder="e.g. Daikin, Carrier" />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Quantity</p>
                                <input type="number" className="input-field" placeholder="e.g. 5" value={partForm.qty} onChange={e => setPartForm(p => ({ ...p, qty: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                                <input type="number" className="input-field" placeholder="e.g. 2" value={partForm.reorder_level} onChange={e => setPartForm(p => ({ ...p, reorder_level: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                                <Combobox value={partForm.unit} onChange={v => setPartForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. pc" />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Supplier</p>
                                <input className="input-field" placeholder="Supplier name" value={partForm.supplier} onChange={e => setPartForm(p => ({ ...p, supplier: e.target.value }))} />
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
                            <button className="btn-primary" onClick={() => setConfirmAddPart(true)}>Add Part →</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={confirmAddPart}
                title="Add Spare Part?"
                message={`Add "${partForm.part_name}" (${partForm.qty} ${partForm.unit}) to spare parts inventory?`}
                confirmLabel="Yes, Add Part"
                onConfirm={handleAddPart}
                onCancel={() => setConfirmAddPart(false)}
            />

            {/* ─── SPARE PART QTY MODAL ─── */}
            {partQtyAction && !confirmPartQty && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPartQtyAction(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: '28px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', marginBottom: 16 }}>
                            {partQtyAction.mode === 'add' ? 'Add Stock' : 'Use Stock'} — {partQtyAction.part.part_name}
                        </h2>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                            {partQtyAction.mode === 'add' ? 'Quantity to Add' : 'Quantity Used'} (current: {partQtyAction.part.quantity_on_hand} {partQtyAction.part.unit})
                        </p>
                        <input type="number" min="1" className="input-field" placeholder="Enter quantity" value={partQtyValue} onChange={e => setPartQtyValue(e.target.value)} style={{ marginBottom: 20 }} />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setPartQtyAction(null)}>Cancel</button>
                            <button className="btn-primary" onClick={() => setConfirmPartQty(true)}>Continue</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={confirmPartQty}
                title="Confirm Spare Parts Update?"
                message={`This will ${partQtyAction?.mode === 'add' ? 'add' : 'use'} ${partQtyValue || 0} ${partQtyAction?.part.unit} of ${partQtyAction?.part.part_name}.`}
                confirmLabel="Yes, Update"
                onConfirm={handlePartQtyUpdate}
                onCancel={() => setConfirmPartQty(false)}
            />

            {/* ─── EDIT SPARE PART MODAL ─── */}
            {editPartTarget && !confirmEditPart && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditPartTarget(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: 520, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E2F5F', marginBottom: 20 }}>Edit Spare Part</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p className="section-label" style={{ marginBottom: 5 }}>Part Name</p>
                                <Combobox value={editPartForm.part_name} onChange={v => setEditPartForm(p => ({ ...p, part_name: v }))} options={PART_NAMES} placeholder="e.g. Capacitor 35+5 MFD" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p className="section-label" style={{ marginBottom: 5 }}>Compatible Brands (comma-separated)</p>
                                <Combobox value={editPartForm.compatible_brands} onChange={v => setEditPartForm(p => ({ ...p, compatible_brands: v }))} options={BRAND_OPTIONS} placeholder="e.g. Daikin, Carrier" />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Reorder Level</p>
                                <input type="number" className="input-field" placeholder="e.g. 2" value={editPartForm.reorder_level} onChange={e => setEditPartForm(p => ({ ...p, reorder_level: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Unit</p>
                                <Combobox value={editPartForm.unit} onChange={v => setEditPartForm(p => ({ ...p, unit: v }))} options={UNIT_OPTIONS} placeholder="e.g. pc" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p className="section-label" style={{ marginBottom: 5 }}>Supplier</p>
                                <input className="input-field" placeholder="Supplier name" value={editPartForm.supplier} onChange={e => setEditPartForm(p => ({ ...p, supplier: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Capital (₱)</p>
                                <input type="number" className="input-field" placeholder="0.00" value={editPartForm.capital} onChange={e => setEditPartForm(p => ({ ...p, capital: e.target.value }))} />
                            </div>
                            <div>
                                <p className="section-label" style={{ marginBottom: 5 }}>Selling Price (₱)</p>
                                <input type="number" className="input-field" placeholder="0.00" value={editPartForm.selling_price} onChange={e => setEditPartForm(p => ({ ...p, selling_price: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setEditPartTarget(null)}>Cancel</button>
                            <button className="btn-primary" onClick={() => setConfirmEditPart(true)}>Save Changes →</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={confirmEditPart}
                title="Update Spare Part?"
                message={`Save changes to "${editPartForm.part_name}"?`}
                confirmLabel="Yes, Save"
                onConfirm={handleEditPart}
                onCancel={() => setConfirmEditPart(false)}
            />

            {/* ─── DELETE MODALS ─── */}
            <Modal
                open={!!deleteUnitTarget}
                title="Delete AC Unit?"
                message={`Delete ${deleteUnitTarget?.brand} ${deleteUnitTarget?.model} (${deleteUnitTarget?.serial_number}) from inventory? This cannot be undone.`}
                confirmLabel="Yes, Delete"
                variant="danger"
                onConfirm={() => {
                    setUnits(prev => prev.filter(u => u.ac_unit_id !== deleteUnitTarget.ac_unit_id));
                    addToast(`${deleteUnitTarget.brand} ${deleteUnitTarget.model} deleted.`, 'warning');
                    setDeleteUnitTarget(null);
                }}
                onCancel={() => setDeleteUnitTarget(null)}
            />

            <Modal
                open={!!deletePartTarget}
                title="Delete Spare Part?"
                message={`Delete "${deletePartTarget?.part_name}" from spare parts inventory? This cannot be undone.`}
                confirmLabel="Yes, Delete"
                variant="danger"
                onConfirm={handleDeletePart}
                onCancel={() => setDeletePartTarget(null)}
            />
        </div>
    );
}

export default AcUnits;