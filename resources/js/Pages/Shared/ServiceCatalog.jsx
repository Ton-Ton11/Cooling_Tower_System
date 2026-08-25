import { useEffect, useMemo, useState, useCallback } from "react";
import { SUPER_ADMIN_ENDPOINTS, extractErrorMessage, formatCurrency } from "../../utils/superAdmin";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";

const ICON_PRESETS = [
    { label: "Wall-Mounted Split", path: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { label: "Window Box", path: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" },
    { label: "Ceiling Cassette", path: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" },
    { label: "Floor Standing Tower", path: "M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" },
    { label: "Ceiling Suspended", path: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" },
    { label: "Ventilation / Fan", path: "M12 4v16m8-8H4m15.364 6.364l-14.728-14.728m0 14.728L19.364 5.636" },
    { label: "Industrial Cooler", path: "M13 10V3L4 14h7v7l9-11h-7z" },
];

export default function ServiceCatalog({ addToast, onDataChanged, endpoints = SUPER_ADMIN_ENDPOINTS }) {
    const [activeTab, setActiveTab] = useState("services"); // 'services' | 'unit_types' | 'brands'
    const [loading, setLoading] = useState(true);
    const [catalogData, setCatalogData] = useState({
        services: [],
        unit_types: [],
        brands: [],
        stats: {},
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'

    // Modals
    const [serviceModal, setServiceModal] = useState({ open: false, mode: "create", data: null });
    const [unitTypeModal, setUnitTypeModal] = useState({ open: false, mode: "create", data: null });
    const [brandModal, setBrandModal] = useState({ open: false, mode: "create", data: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, type: "", id: null, title: "" });
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [serviceForm, setServiceForm] = useState({
        service_name: "",
        category: "Cleaning",
        base_price: "",
        description: "",
        display_order: 0,
        is_active: true,
    });

    const [unitTypeForm, setUnitTypeForm] = useState({
        name: "",
        code: "",
        icon: ICON_PRESETS[0].path,
        description: "",
        display_order: 0,
        is_active: true,
    });

    const [brandForm, setBrandForm] = useState({
        name: "",
        country_of_origin: "",
        description: "",
        display_order: 0,
        is_active: true,
    });

    const fetchCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await window.axios.get(endpoints.catalog);
            setCatalogData(data);
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to load service catalog."), "error");
        } finally {
            setLoading(false);
        }
    }, [endpoints, addToast]);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filteredServices = useMemo(() => {
        return (catalogData.services || []).filter((s) => {
            const matchesSearch =
                s.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.category || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                statusFilter === "all" ? true : statusFilter === "active" ? s.is_active : !s.is_active;
            return matchesSearch && matchesStatus;
        });
    }, [catalogData.services, searchQuery, statusFilter]);

    const filteredUnitTypes = useMemo(() => {
        return (catalogData.unit_types || []).filter((u) => {
            const matchesSearch =
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                statusFilter === "all" ? true : statusFilter === "active" ? u.is_active : !u.is_active;
            return matchesSearch && matchesStatus;
        });
    }, [catalogData.unit_types, searchQuery, statusFilter]);

    const filteredBrands = useMemo(() => {
        return (catalogData.brands || []).filter((b) => {
            const matchesSearch =
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.country_of_origin || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                statusFilter === "all" ? true : statusFilter === "active" ? b.is_active : !b.is_active;
            return matchesSearch && matchesStatus;
        });
    }, [catalogData.brands, searchQuery, statusFilter]);

    // ── Service Actions ───────────────────────────────────────────────────────
    const openServiceModal = (mode = "create", service = null) => {
        if (mode === "edit" && service) {
            setServiceForm({
                service_name: service.service_name,
                category: service.category || "Cleaning",
                base_price: service.base_price,
                description: service.description || "",
                display_order: service.display_order ?? 0,
                is_active: Boolean(service.is_active),
            });
            setServiceModal({ open: true, mode: "edit", data: service });
        } else {
            setServiceForm({
                service_name: "",
                category: "Cleaning",
                base_price: "",
                description: "",
                display_order: (catalogData.services?.length || 0) + 1,
                is_active: true,
            });
            setServiceModal({ open: true, mode: "create", data: null });
        }
    };

    const handleSaveService = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (serviceModal.mode === "create") {
                const { data } = await window.axios.post(endpoints.storeService, serviceForm);
                addToast(data.message || "Service added successfully!", "success");
            } else {
                const { data } = await window.axios.patch(
                    endpoints.updateService(serviceModal.data.service_id),
                    serviceForm
                );
                addToast(data.message || "Service updated successfully!", "success");
            }
            setServiceModal({ open: false, mode: "create", data: null });
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to save service."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleService = async (serviceId) => {
        try {
            const { data } = await window.axios.patch(endpoints.toggleService(serviceId));
            addToast(data.message, "success");
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to toggle service status."), "error");
        }
    };

    // ── Unit Type Actions ─────────────────────────────────────────────────────
    const openUnitTypeModal = (mode = "create", unitType = null) => {
        if (mode === "edit" && unitType) {
            setUnitTypeForm({
                name: unitType.name,
                code: unitType.code,
                icon: unitType.icon || ICON_PRESETS[0].path,
                description: unitType.description || "",
                display_order: unitType.display_order ?? 0,
                is_active: Boolean(unitType.is_active),
            });
            setUnitTypeModal({ open: true, mode: "edit", data: unitType });
        } else {
            setUnitTypeForm({
                name: "",
                code: "",
                icon: ICON_PRESETS[0].path,
                description: "",
                display_order: (catalogData.unit_types?.length || 0) + 1,
                is_active: true,
            });
            setUnitTypeModal({ open: true, mode: "create", data: null });
        }
    };

    const handleSaveUnitType = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (unitTypeModal.mode === "create") {
                const { data } = await window.axios.post(endpoints.storeUnitType, unitTypeForm);
                addToast(data.message || "AC Unit Type created successfully!", "success");
            } else {
                const { data } = await window.axios.patch(
                    endpoints.updateUnitType(unitTypeModal.data.id),
                    unitTypeForm
                );
                addToast(data.message || "AC Unit Type updated successfully!", "success");
            }
            setUnitTypeModal({ open: false, mode: "create", data: null });
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to save AC unit type."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleUnitType = async (id) => {
        try {
            const { data } = await window.axios.patch(endpoints.toggleUnitType(id));
            addToast(data.message, "success");
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to toggle unit type status."), "error");
        }
    };

    // ── Brand Actions ─────────────────────────────────────────────────────────
    const openBrandModal = (mode = "create", brand = null) => {
        if (mode === "edit" && brand) {
            setBrandForm({
                name: brand.name,
                country_of_origin: brand.country_of_origin || "",
                description: brand.description || "",
                display_order: brand.display_order ?? 0,
                is_active: Boolean(brand.is_active),
            });
            setBrandModal({ open: true, mode: "edit", data: brand });
        } else {
            setBrandForm({
                name: "",
                country_of_origin: "",
                description: "",
                display_order: (catalogData.brands?.length || 0) + 1,
                is_active: true,
            });
            setBrandModal({ open: true, mode: "create", data: null });
        }
    };

    const handleSaveBrand = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (brandModal.mode === "create") {
                const { data } = await window.axios.post(endpoints.storeBrand, brandForm);
                addToast(data.message || "AC Brand added successfully!", "success");
            } else {
                const { data } = await window.axios.patch(
                    endpoints.updateBrand(brandModal.data.id),
                    brandForm
                );
                addToast(data.message || "AC Brand updated successfully!", "success");
            }
            setBrandModal({ open: false, mode: "create", data: null });
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to save brand."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleBrand = async (id) => {
        try {
            const { data } = await window.axios.patch(endpoints.toggleBrand(id));
            addToast(data.message, "success");
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to toggle brand status."), "error");
        }
    };

    // ── Deletion Handler ──────────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        setSubmitting(true);
        try {
            if (deleteModal.type === "service") {
                const { data } = await window.axios.delete(endpoints.deleteService(deleteModal.id));
                addToast(data.message, data.deactivated ? "warning" : "success");
            } else if (deleteModal.type === "unit_type") {
                const { data } = await window.axios.delete(endpoints.deleteUnitType(deleteModal.id));
                addToast(data.message, "success");
            } else if (deleteModal.type === "brand") {
                const { data } = await window.axios.delete(endpoints.deleteBrand(deleteModal.id));
                addToast(data.message, "success");
            }
            setDeleteModal({ open: false, type: "", id: null, title: "" });
            fetchCatalog();
            if (onDataChanged) onDataChanged();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to delete item."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
                        Dynamic Catalog System
                    </span>
                    <h1 className="text-2xl font-extrabold text-gray-900">Services, Pricing & Unit Catalog</h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Control customer-facing services, base prices, AC unit types, and compatible brands in real-time.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchCatalog}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>

                    {activeTab === "services" && (
                        <button
                            onClick={() => openServiceModal("create")}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Service
                        </button>
                    )}

                    {activeTab === "unit_types" && (
                        <button
                            onClick={() => openUnitTypeModal("create")}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Unit Type
                        </button>
                    )}

                    {activeTab === "brands" && (
                        <button
                            onClick={() => openBrandModal("create")}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add AC Brand
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Services</span>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">{catalogData.stats?.total_services ?? 0}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">{catalogData.stats?.active_services ?? 0} active</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Active Services</span>
                    <p className="text-xl font-extrabold text-blue-600 mt-1">{catalogData.stats?.active_services ?? 0}</p>
                    <span className="text-[10px] text-gray-400 font-medium">Visible to clients</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Unit Types</span>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">{catalogData.stats?.total_unit_types ?? 0}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">{catalogData.stats?.active_unit_types ?? 0} active</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Active Unit Types</span>
                    <p className="text-xl font-extrabold text-indigo-600 mt-1">{catalogData.stats?.active_unit_types ?? 0}</p>
                    <span className="text-[10px] text-gray-400 font-medium">In Booking Wizard</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">AC Brands</span>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">{catalogData.stats?.total_brands ?? 0}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">{catalogData.stats?.active_brands ?? 0} active</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Active Brands</span>
                    <p className="text-xl font-extrabold text-emerald-600 mt-1">{catalogData.stats?.active_brands ?? 0}</p>
                    <span className="text-[10px] text-gray-400 font-medium">In Brand Select</span>
                </div>
            </div>

            {/* Navigation Tabs & Search Toolbar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setActiveTab("services"); setSearchQuery(""); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === "services"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Services & Pricing ({catalogData.services?.length || 0})
                        </button>
                        <button
                            onClick={() => { setActiveTab("unit_types"); setSearchQuery(""); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === "unit_types"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            AC Unit Types ({catalogData.unit_types?.length || 0})
                        </button>
                        <button
                            onClick={() => { setActiveTab("brands"); setSearchQuery(""); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === "brands"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            AC Brands ({catalogData.brands?.length || 0})
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={`Search ${activeTab.replace("_", " ")}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-60 pl-8 pr-3.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>

                {/* ── TAB 1: SERVICES & PRICING ── */}
                {activeTab === "services" && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-12 text-center text-xs text-gray-400">Loading services catalog...</div>
                        ) : filteredServices.length === 0 ? (
                            <div className="py-12 text-center text-xs text-gray-400">
                                No services found matching your filters.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredServices.map((service) => (
                                    <div
                                        key={service.service_id}
                                        className={`p-5 rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between ${
                                            service.is_active
                                                ? "border-gray-200/90 shadow-sm hover:border-blue-300 hover:shadow-md"
                                                : "border-gray-200 bg-gray-50/70 opacity-75"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                                        {service.category || "Service"}
                                                    </span>
                                                    <h3 className="text-base font-extrabold text-gray-900 mt-2">{service.service_name}</h3>
                                                </div>

                                                <span
                                                    onClick={() => handleToggleService(service.service_id)}
                                                    title="Click to toggle status"
                                                    className={`cursor-pointer px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                                        service.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {service.is_active ? "● Active" : "○ Inactive"}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-600 mt-2.5 line-clamp-3 leading-relaxed">
                                                {service.description || "No description provided."}
                                            </p>
                                        </div>

                                        <div className="mt-5 pt-3.5 border-t border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Base Price</span>
                                                <span className="text-lg font-black text-blue-700">
                                                    {formatCurrency(service.base_price)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-dashed border-gray-100">
                                                <span>Bookings: <strong>{service.bookings_count ?? 0}</strong></span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openServiceModal("edit", service)}
                                                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-bold transition text-xs"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({
                                                            open: true,
                                                            type: "service",
                                                            id: service.service_id,
                                                            title: service.service_name,
                                                        })}
                                                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold transition text-xs"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: AC UNIT TYPES ── */}
                {activeTab === "unit_types" && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-12 text-center text-xs text-gray-400">Loading unit types...</div>
                        ) : filteredUnitTypes.length === 0 ? (
                            <div className="py-12 text-center text-xs text-gray-400">
                                No unit types found matching your filters.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredUnitTypes.map((unit) => (
                                    <div
                                        key={unit.id}
                                        className={`p-5 rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between ${
                                            unit.is_active
                                                ? "border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md"
                                                : "border-gray-200 bg-gray-50/70 opacity-75"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={unit.icon || ICON_PRESETS[0].path} />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900">{unit.name}</h3>
                                                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Code: {unit.code}</span>
                                                    </div>
                                                </div>

                                                <span
                                                    onClick={() => handleToggleUnitType(unit.id)}
                                                    title="Click to toggle status"
                                                    className={`cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                                                        unit.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {unit.is_active ? "● Active" : "○ Inactive"}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                                                {unit.description || "No description provided."}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                            <span className="text-[11px] text-gray-400 font-semibold">Order: #{unit.display_order ?? 0}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openUnitTypeModal("edit", unit)}
                                                    className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-bold transition text-xs"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({
                                                        open: true,
                                                        type: "unit_type",
                                                        id: unit.id,
                                                        title: unit.name,
                                                    })}
                                                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold transition text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 3: AC BRANDS ── */}
                {activeTab === "brands" && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-12 text-center text-xs text-gray-400">Loading AC brands...</div>
                        ) : filteredBrands.length === 0 ? (
                            <div className="py-12 text-center text-xs text-gray-400">
                                No brands found matching your filters.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                {filteredBrands.map((brand) => (
                                    <div
                                        key={brand.id}
                                        className={`p-4 rounded-xl border transition-all duration-200 bg-white flex flex-col justify-between ${
                                            brand.is_active
                                                ? "border-gray-200 shadow-sm hover:border-blue-300"
                                                : "border-gray-200 bg-gray-50/70 opacity-75"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-sm font-bold text-gray-900">{brand.name}</h4>
                                                <span
                                                    onClick={() => handleToggleBrand(brand.id)}
                                                    title="Click to toggle status"
                                                    className={`cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                                                        brand.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {brand.is_active ? "● Active" : "○ Inactive"}
                                                </span>
                                            </div>

                                            {brand.country_of_origin && (
                                                <span className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5 block">
                                                    Origin: {brand.country_of_origin}
                                                </span>
                                            )}

                                            {brand.description && (
                                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                                                    {brand.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                                            <span className="text-[10px] text-gray-400">Order: #{brand.display_order ?? 0}</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openBrandModal("edit", brand)}
                                                    className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-bold transition text-[11px]"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({
                                                        open: true,
                                                        type: "brand",
                                                        id: brand.id,
                                                        title: brand.name,
                                                    })}
                                                    className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 font-bold transition text-[11px]"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── MODAL: SERVICE ADD/EDIT ── */}
            {serviceModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {serviceModal.mode === "create" ? "Add New Service Package" : "Edit Service Package"}
                            </h3>
                            <button
                                onClick={() => setServiceModal({ open: false, mode: "create", data: null })}
                                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveService} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Service Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Chemical Deep Cleaning & Hydro Wash"
                                    value={serviceForm.service_name}
                                    onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Base Starting Rate (₱) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="e.g. 1800.00"
                                        value={serviceForm.base_price}
                                        onChange={(e) => setServiceForm({ ...serviceForm, base_price: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={serviceForm.category}
                                        onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    >
                                        <option value="Cleaning">Cleaning & Wash</option>
                                        <option value="Maintenance">Maintenance & Tuning</option>
                                        <option value="Repair">Repair & Troubleshooting</option>
                                        <option value="Installation">Installation & Relocation</option>
                                        <option value="Inspection">Diagnostic & Inspection</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Description / Package Inclusions
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe the steps, included labor, chemical foaming, and checks..."
                                    value={serviceForm.description}
                                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={serviceForm.is_active}
                                        onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    Active & Visible in Customer Portal
                                </label>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Order:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={serviceForm.display_order}
                                        onChange={(e) => setServiceForm({ ...serviceForm, display_order: Number(e.target.value) })}
                                        className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setServiceModal({ open: false, mode: "create", data: null })}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                                >
                                    {submitting ? "Saving..." : serviceModal.mode === "create" ? "Create Service" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: UNIT TYPE ADD/EDIT ── */}
            {unitTypeModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {unitTypeModal.mode === "create" ? "Add AC Unit Type" : "Edit AC Unit Type"}
                            </h3>
                            <button
                                onClick={() => setUnitTypeModal({ open: false, mode: "create", data: null })}
                                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveUnitType} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Display Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Split-Type (Wall Mounted)"
                                    value={unitTypeForm.name}
                                    onChange={(e) => setUnitTypeForm({ ...unitTypeForm, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Type Code (Unique Identifier) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Split, Window, Cassette, Portable"
                                    value={unitTypeForm.code}
                                    onChange={(e) => setUnitTypeForm({ ...unitTypeForm, code: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>

                            {/* Icon Presets Picker */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Choose Visual Icon
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {ICON_PRESETS.map((preset, idx) => {
                                        const isSel = unitTypeForm.icon === preset.path;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setUnitTypeForm({ ...unitTypeForm, icon: preset.path })}
                                                className={`p-2.5 rounded-xl border-2 cursor-pointer flex flex-col items-center justify-center gap-1 transition ${
                                                    isSel
                                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                                        : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                                                }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={preset.path} />
                                                </svg>
                                                <span className="text-[9px] text-center font-medium leading-tight truncate w-full">{preset.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief details about where this AC type is typically used..."
                                    value={unitTypeForm.description}
                                    onChange={(e) => setUnitTypeForm({ ...unitTypeForm, description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={unitTypeForm.is_active}
                                        onChange={(e) => setUnitTypeForm({ ...unitTypeForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    Active Status
                                </label>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Order:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={unitTypeForm.display_order}
                                        onChange={(e) => setUnitTypeForm({ ...unitTypeForm, display_order: Number(e.target.value) })}
                                        className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setUnitTypeModal({ open: false, mode: "create", data: null })}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                                >
                                    {submitting ? "Saving..." : unitTypeModal.mode === "create" ? "Create Unit Type" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: BRAND ADD/EDIT ── */}
            {brandModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {brandModal.mode === "create" ? "Add New AC Brand" : "Edit AC Brand"}
                            </h3>
                            <button
                                onClick={() => setBrandModal({ open: false, mode: "create", data: null })}
                                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveBrand} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Brand Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Carrier, Daikin, Panasonic"
                                    value={brandForm.name}
                                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Country of Origin (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Japan, USA, Philippines, South Korea"
                                    value={brandForm.country_of_origin}
                                    onChange={(e) => setBrandForm({ ...brandForm, country_of_origin: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Description / Notes
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Manufacturer notes, known compatible models..."
                                    value={brandForm.description}
                                    onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={brandForm.is_active}
                                        onChange={(e) => setBrandForm({ ...brandForm, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    Active in Dropdown Lists
                                </label>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Order:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={brandForm.display_order}
                                        onChange={(e) => setBrandForm({ ...brandForm, display_order: Number(e.target.value) })}
                                        className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBrandModal({ open: false, mode: "create", data: null })}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                                >
                                    {submitting ? "Saving..." : brandModal.mode === "create" ? "Create Brand" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: DELETE CONFIRMATION ── */}
            <Modal
                open={deleteModal.open}
                title={`Delete ${deleteModal.type === "service" ? "Service" : deleteModal.type === "unit_type" ? "Unit Type" : "Brand"}`}
                message={`Are you sure you want to delete "${deleteModal.title}"? If it has linked historical bookings or inventory, it will be safely deactivated instead.`}
                confirmLabel={submitting ? "Deleting..." : "Yes, Delete"}
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal({ open: false, type: "", id: null, title: "" })}
            />
        </div>
    );
}
