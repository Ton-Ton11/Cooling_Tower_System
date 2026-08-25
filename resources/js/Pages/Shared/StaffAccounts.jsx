import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    ROLE_COLORS,
    STAFF_ROLE_OPTIONS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDate,
    getInitials,
    toInputDate,
} from "../../utils/superAdmin";

const createEmptyForm = (roleId = "") => ({
    role_id: roleId ? String(roleId) : "",
    given_name: "",
    middle_name: "",
    last_name: "",
    birthdate: "",
    sex: "Male",
    address: "",
    contact_number: "",
    email: "",
    password: "",
    password_confirmation: "",
    certificate_expiry: "",
    specialty_ids: [],
});

export default function StaffAccounts({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;

    // State
    const [staff, setStaff] = useState([]);
    const [rolesData, setRolesData] = useState([]);
    const [metaSpecialties, setMetaSpecialties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all"); // 'all' or role_id (string/number)
    const [viewMode, setViewMode] = useState("active"); // 'active' | 'deactivated' | 'add' | 'edit'

    // Modals
    const [deactivateTarget, setDeactivateTarget] = useState(null);
    const [reactivateTarget, setReactivateTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Role Category Modals
    const [showNewRoleModal, setShowNewRoleModal] = useState(false);
    const [showManageRolesModal, setShowManageRolesModal] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState({ role_name: "", description: "" });
    const [roleEditTarget, setRoleEditTarget] = useState(null);
    const [roleDeleteTarget, setRoleDeleteTarget] = useState(null);
    const [roleSaving, setRoleSaving] = useState(false);

    // Check if current user is Admin Assistant (ep path contains admin-assistant)
    const isAdminAssistant = useMemo(() => {
        return typeof ep.staff === "string" && ep.staff.includes("admin-assistant");
    }, [ep.staff]);

    // Fetch dynamic roles
    const fetchRoles = useCallback(async () => {
        try {
            if (ep.roles) {
                const { data } = await window.axios.get(ep.roles);
                if (Array.isArray(data?.roles)) {
                    setRolesData(data.roles);
                }
            }
        } catch (error) {
            console.error("Failed to load dynamic roles", error);
        }
    }, [ep.roles]);

    // Fetch staff accounts
    const fetchStaff = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);

            try {
                const [staffRes] = await Promise.all([
                    window.axios.get(ep.staff, { params: { include_deactivated: true } }),
                    fetchRoles(),
                ]);

                const resData = staffRes?.data;
                setStaff(Array.isArray(resData?.data) ? resData.data : []);

                if (Array.isArray(resData?.meta?.specialties)) {
                    setMetaSpecialties(resData.meta.specialties);
                }

                // If roles meta is also present
                if (Array.isArray(resData?.meta?.roles) && resData.meta.roles.length > 0) {
                    setRolesData((prev) => (prev.length > 0 ? prev : resData.meta.roles));
                }
            } catch (error) {
                addToast(extractErrorMessage(error, "Unable to load staff accounts."), "error");
            } finally {
                setLoading(false);
            }
        },
        [ep.staff, fetchRoles, addToast]
    );

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    // Available role options for dropdowns (filter out Customer 6, and Super Admin 1 if Admin Assistant)
    const roleOptions = useMemo(() => {
        let list = rolesData.length > 0 ? rolesData : STAFF_ROLE_OPTIONS;
        // Never allow Customer role (6)
        list = list.filter((r) => Number(r.role_id) !== 6);
        // Admin Assistant cannot assign Super Admin role (1)
        if (isAdminAssistant) {
            list = list.filter((r) => Number(r.role_id) !== 1);
        }
        return list;
    }, [rolesData, isAdminAssistant]);

    // Active vs Deactivated staff
    const activeStaff = useMemo(
        () => staff.filter((u) => u.status !== "Deactivated" && u.status !== "Archived"),
        [staff]
    );

    const deactivatedStaff = useMemo(
        () => staff.filter((u) => u.status === "Deactivated" || u.status === "Archived"),
        [staff]
    );

    const currentBaseList = viewMode === "deactivated" ? deactivatedStaff : activeStaff;

    // Filtered by Search and Role Category
    const filteredStaff = useMemo(() => {
        return currentBaseList.filter((user) => {
            // Category filter
            if (selectedCategory !== "all" && Number(user.role_id) !== Number(selectedCategory)) {
                return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchName = user.full_name?.toLowerCase().includes(query);
                const matchEmail = user.email?.toLowerCase().includes(query);
                const matchPhone = user.contact_number?.toLowerCase().includes(query);
                const matchRole = user.role?.toLowerCase().includes(query);
                return matchName || matchEmail || matchPhone || matchRole;
            }

            return true;
        });
    }, [currentBaseList, selectedCategory, searchQuery]);

    // Category Counts map
    const categoryCounts = useMemo(() => {
        const counts = { all: activeStaff.length };
        rolesData.forEach((role) => {
            counts[role.role_id] = activeStaff.filter((u) => Number(u.role_id) === Number(role.role_id)).length;
        });
        return counts;
    }, [activeStaff, rolesData]);

    const isFormMode = viewMode === "add" || viewMode === "edit";
    const isTechnician = Number(form.role_id) === 5;

    // Handlers: Open Add Form (with optional category pre-selection)
    const openAddForm = (preselectedRoleId = null) => {
        let defaultRoleId = preselectedRoleId;
        if (!defaultRoleId || defaultRoleId === "all") {
            // Default to technician (5) or first available non-super-admin role
            defaultRoleId = roleOptions.find((r) => Number(r.role_id) === 5)?.role_id || roleOptions[0]?.role_id || 5;
        }

        setEditTarget(null);
        setForm(createEmptyForm(defaultRoleId));
        setViewMode("add");
    };

    const openEditForm = (user) => {
        // Guard: Admin Assistant cannot edit Super Admin
        if (isAdminAssistant && Number(user.role_id) === 1) {
            addToast("Admin Assistants cannot edit Super Admin accounts.", "error");
            return;
        }

        setEditTarget(user);
        setForm({
            role_id: String(user.role_id ?? ""),
            given_name: user.given_name ?? "",
            middle_name: user.middle_name ?? "",
            last_name: user.last_name ?? "",
            birthdate: toInputDate(user.birthdate),
            sex: user.sex ?? "Male",
            address: user.address ?? "",
            contact_number: user.contact_number ?? "",
            email: user.email ?? "",
            password: "",
            password_confirmation: "",
            certificate_expiry: toInputDate(user.certificate_expiry),
            specialty_ids: (user.specialties ?? []).map((s) => String(s.specialty_id)),
        });
        setViewMode("edit");
    };

    const toggleSpecialty = (specialtyId) => {
        const key = String(specialtyId);
        setForm((prev) => ({
            ...prev,
            specialty_ids: prev.specialty_ids.includes(key)
                ? prev.specialty_ids.filter((v) => v !== key)
                : [...prev.specialty_ids, key],
        }));
    };

    // Submit Staff Form
    const handleSubmitStaff = async () => {
        if (submitting) return;

        if (!form.role_id) {
            addToast("Please select a valid role category.", "error");
            return;
        }

        if (!editTarget && !form.password.trim()) {
            addToast("A password is required for new staff accounts.", "error");
            return;
        }

        setSubmitting(true);

        const payload = {
            role_id: Number(form.role_id),
            given_name: form.given_name.trim(),
            middle_name: form.middle_name.trim() || null,
            last_name: form.last_name.trim(),
            birthdate: form.birthdate,
            sex: form.sex,
            address: form.address.trim(),
            contact_number: form.contact_number.trim(),
            email: form.email.trim(),
            certificate_expiry: isTechnician ? form.certificate_expiry || null : null,
            specialty_ids: isTechnician ? form.specialty_ids.map((v) => Number(v)) : [],
        };

        if (form.password.trim()) {
            payload.password = form.password;
            payload.password_confirmation = form.password_confirmation;
        }

        try {
            const response = editTarget
                ? await window.axios.patch(ep.updateStaff(editTarget.user_id), payload)
                : await window.axios.post(ep.staff, payload);

            addToast(
                response?.data?.message ||
                    (editTarget ? "Staff account updated successfully." : "Staff account created successfully.")
            );
            setConfirmSubmit(false);
            setEditTarget(null);
            setForm(createEmptyForm());
            setViewMode("active");
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    editTarget ? "Unable to update the staff account." : "Unable to create the staff account."
                ),
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Deactivate & Reactivate Handlers
    const handleDeactivate = async () => {
        if (!deactivateTarget) return;

        if (Number(deactivateTarget.role_id) === 1) {
            addToast("Super Admin accounts cannot be deactivated.", "error");
            setDeactivateTarget(null);
            return;
        }

        try {
            const url = ep.deactivateStaff
                ? ep.deactivateStaff(deactivateTarget.user_id)
                : ep.archiveStaff(deactivateTarget.user_id);

            const { data } = await window.axios.patch(url);
            addToast(data?.message || "Staff account deactivated successfully.");
            setDeactivateTarget(null);
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to deactivate the account."), "error");
        }
    };

    const handleReactivate = async () => {
        if (!reactivateTarget) return;

        try {
            const url = ep.reactivateStaff
                ? ep.reactivateStaff(reactivateTarget.user_id)
                : ep.restoreStaff(reactivateTarget.user_id);

            const { data } = await window.axios.patch(url);
            addToast(data?.message || "Staff account reactivated successfully.");
            setReactivateTarget(null);
            setViewMode("active");
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to reactivate the account."), "error");
        }
    };

    // Role Category CRUD Handlers
    const handleSaveRoleCategory = async (e) => {
        e?.preventDefault();
        if (!newRoleForm.role_name.trim()) {
            addToast("Role Category Name is required.", "error");
            return;
        }

        setRoleSaving(true);
        try {
            if (roleEditTarget) {
                // Update
                const url = ep.updateRole(roleEditTarget.role_id);
                const { data } = await window.axios.patch(url, newRoleForm);
                addToast(data?.message || "Role category updated successfully.");
            } else {
                // Create
                const url = ep.storeRole;
                const { data } = await window.axios.post(url, newRoleForm);
                addToast(data?.message || "Role category created successfully.");
            }

            setShowNewRoleModal(false);
            setRoleEditTarget(null);
            setNewRoleForm({ role_name: "", description: "" });
            await fetchRoles();
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to save role category."), "error");
        } finally {
            setRoleSaving(false);
        }
    };

    const handleDeleteRoleCategory = async () => {
        if (!roleDeleteTarget) return;

        setRoleSaving(true);
        try {
            const url = ep.deleteRole(roleDeleteTarget.role_id);
            const { data } = await window.axios.delete(url);
            addToast(data?.message || "Role category deleted successfully.");
            setRoleDeleteTarget(null);
            if (selectedCategory === String(roleDeleteTarget.role_id)) {
                setSelectedCategory("all");
            }
            await fetchRoles();
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to delete role category."), "error");
        } finally {
            setRoleSaving(false);
        }
    };

    // ── Form View (Add / Edit Staff) ──────────────────────────────────────────
    if (isFormMode) {
        const title = viewMode === "edit" ? "Edit Staff Account" : "Register Staff Account";
        const subtitle =
            viewMode === "edit"
                ? `Update credentials and details for ${editTarget?.full_name || "this employee"}.`
                : "Fill out the required information to create a new staff account in the system.";

        const selectedRoleObj = roleOptions.find((r) => Number(r.role_id) === Number(form.role_id));

        return (
            <div style={{ animation: "fadeInUp 0.25s ease" }}>
                <div className="page-header">
                    <div>
                        <button
                            onClick={() => {
                                setViewMode("active");
                                setEditTarget(null);
                                setForm(createEmptyForm());
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#3F7DFF",
                                cursor: "pointer",
                                fontSize: 13,
                                marginBottom: 6,
                                fontFamily: "inherit",
                                fontWeight: 600,
                            }}
                        >
                            ← Back to Staff Directory
                        </button>
                        <h1 className="page-title font-display">{title}</h1>
                        <p className="page-subtitle">{subtitle}</p>
                    </div>
                </div>

                <div className="card" style={{ padding: 28, maxWidth: 860 }}>
                    {/* Role Category Banner */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "rgba(63,125,255,0.06)",
                            border: "1px solid rgba(63,125,255,0.18)",
                            marginBottom: 20,
                        }}
                    >
                        <div>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#3F7DFF", letterSpacing: "0.05em" }}>
                                Assigned Role Category
                            </span>
                            <h4 style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#1E2F5F" }}>
                                {selectedRoleObj ? selectedRoleObj.role || selectedRoleObj.role_name : "Select a Role"}
                            </h4>
                            {selectedRoleObj?.description && (
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
                                    {selectedRoleObj.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                            gap: 16,
                        }}
                    >
                        {[
                            { label: "First Name", key: "given_name", placeholder: "e.g. Maria", required: true },
                            { label: "Middle Name", key: "middle_name", placeholder: "Optional" },
                            { label: "Last Name", key: "last_name", placeholder: "e.g. Santos", required: true },
                            { label: "Birthdate", key: "birthdate", type: "date", required: true },
                            { label: "Email Address", key: "email", placeholder: "name@coolingtower.com", type: "email", required: true },
                            { label: "Contact Number", key: "contact_number", placeholder: "09XXXXXXXXX", required: true },
                        ].map((field) => (
                            <div key={field.key}>
                                <p className="section-label" style={{ marginBottom: 6 }}>
                                    {field.label} {field.required && <span style={{ color: "#EF4444" }}>*</span>}
                                </p>
                                <input
                                    type={field.type || "text"}
                                    className="input-field"
                                    placeholder={field.placeholder}
                                    value={form[field.key]}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            [field.key]: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        ))}

                        <div>
                            <p className="section-label" style={{ marginBottom: 6 }}>Sex <span style={{ color: "#EF4444" }}>*</span></p>
                            <select
                                className="input-field"
                                value={form.sex}
                                onChange={(event) => setForm((prev) => ({ ...prev, sex: event.target.value }))}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        <div>
                            <p className="section-label" style={{ marginBottom: 6 }}>
                                Role Category <span style={{ color: "#EF4444" }}>*</span>
                            </p>
                            <select
                                className="input-field"
                                value={form.role_id}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        role_id: event.target.value,
                                        certificate_expiry: Number(event.target.value) === 5 ? prev.certificate_expiry : "",
                                        specialty_ids: Number(event.target.value) === 5 ? prev.specialty_ids : [],
                                    }))
                                }
                            >
                                <option value="">-- Choose Role Category --</option>
                                {roleOptions.map((role) => (
                                    <option key={role.role_id} value={role.role_id}>
                                        {role.role || role.role_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                            <p className="section-label" style={{ marginBottom: 6 }}>Address <span style={{ color: "#EF4444" }}>*</span></p>
                            <textarea
                                className="input-field"
                                style={{ minHeight: 80, resize: "vertical" }}
                                placeholder="Full residential / work address"
                                value={form.address}
                                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                            />
                        </div>

                        <div>
                            <p className="section-label" style={{ marginBottom: 6 }}>
                                Password {viewMode === "add" && <span style={{ color: "#EF4444" }}>*</span>}
                            </p>
                            <input
                                type="password"
                                className="input-field"
                                placeholder={viewMode === "edit" ? "Leave blank to keep current password" : "Min. 8 characters"}
                                value={form.password}
                                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            />
                        </div>

                        <div>
                            <p className="section-label" style={{ marginBottom: 6 }}>
                                Confirm Password {viewMode === "add" && <span style={{ color: "#EF4444" }}>*</span>}
                            </p>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="Repeat password"
                                value={form.password_confirmation}
                                onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                            />
                        </div>

                        {isTechnician && (
                            <>
                                <div>
                                    <p className="section-label" style={{ marginBottom: 6 }}>
                                        Certificate Expiry <span style={{ color: "#EF4444" }}>*</span>
                                    </p>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={form.certificate_expiry}
                                        onChange={(event) => setForm((prev) => ({ ...prev, certificate_expiry: event.target.value }))}
                                    />
                                </div>

                                <div style={{ gridColumn: "1 / -1" }}>
                                    <p className="section-label" style={{ marginBottom: 8 }}>
                                        Technician Specialties
                                    </p>
                                    {metaSpecialties.length === 0 ? (
                                        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#F9FAFB", border: "1px solid #E5E7EB", fontSize: 13, color: "#6B7280" }}>
                                            No specialty options configured yet.
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                            {metaSpecialties.map((specialty) => {
                                                const checked = form.specialty_ids.includes(String(specialty.specialty_id));
                                                return (
                                                    <label
                                                        key={specialty.specialty_id}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            padding: "8px 14px",
                                                            borderRadius: 999,
                                                            border: `1px solid ${checked ? "#3F7DFF" : "#E5E7EB"}`,
                                                            background: checked ? "rgba(63,125,255,0.08)" : "#fff",
                                                            cursor: "pointer",
                                                            fontSize: 12,
                                                            color: checked ? "#1E2F5F" : "#6B7280",
                                                            fontWeight: 600,
                                                            transition: "all 0.15s ease",
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleSpecialty(specialty.specialty_id)}
                                                        />
                                                        {specialty.specialty_name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                        <button className="btn-primary" onClick={() => setConfirmSubmit(true)}>
                            {viewMode === "edit" ? "Save Changes" : "Register Account"}
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setViewMode("active");
                                setEditTarget(null);
                                setForm(createEmptyForm());
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                <Modal
                    open={confirmSubmit}
                    title={viewMode === "edit" ? "Save Staff Changes?" : "Create Staff Account?"}
                    message={
                        viewMode === "edit"
                            ? `Apply updates for ${editTarget?.full_name || `${form.given_name} ${form.last_name}`.trim()}?`
                            : `Register account in role category "${selectedRoleObj?.role || selectedRoleObj?.role_name || "Staff"}" for ${`${form.given_name} ${form.last_name}`.trim()}?`
                    }
                    confirmLabel={submitting ? "Saving..." : "Confirm"}
                    confirmDisabled={submitting}
                    onConfirm={handleSubmitStaff}
                    onCancel={() => !submitting && setConfirmSubmit(false)}
                />
            </div>
        );
    }

    // ── Main Categorized Directory View ───────────────────────────────────────
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {/* Header */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                    <h1 className="page-title font-display">Staff & Role Management</h1>
                    <p className="page-subtitle">
                        {viewMode === "deactivated"
                            ? `${deactivatedStaff.length} deactivated staff accounts`
                            : `${activeStaff.length} active staff accounts across ${rolesData.length || roleOptions.length} role categories`}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            setRoleEditTarget(null);
                            setNewRoleForm({ role_name: "", description: "" });
                            setShowNewRoleModal(true);
                        }}
                    >
                        ⚡ + New Role Category
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowManageRolesModal(true)}
                    >
                        ⚙️ Manage Roles
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setViewMode(viewMode === "deactivated" ? "active" : "deactivated")}
                    >
                        {viewMode === "deactivated" ? "← Active Staff" : "🗃 View Deactivated"}
                    </button>
                    {viewMode === "active" && (
                        <button className="btn-primary" onClick={() => openAddForm(selectedCategory)}>
                            + Add Account
                        </button>
                    )}
                </div>
            </div>

            {/* Role Categories Pill Bar / Tabs */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    overflowX: "auto",
                    paddingBottom: 8,
                    marginBottom: 16,
                }}
            >
                <button
                    onClick={() => setSelectedCategory("all")}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        border: selectedCategory === "all" ? "2px solid #3F7DFF" : "1px solid #E5E7EB",
                        background: selectedCategory === "all" ? "rgba(63,125,255,0.1)" : "#fff",
                        color: selectedCategory === "all" ? "#1E2F5F" : "#6B7280",
                        fontWeight: selectedCategory === "all" ? 700 : 500,
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s ease",
                    }}
                >
                    <span>All Roles</span>
                    <span
                        style={{
                            padding: "2px 7px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background: selectedCategory === "all" ? "#3F7DFF" : "#F3F4F6",
                            color: selectedCategory === "all" ? "#fff" : "#6B7280",
                        }}
                    >
                        {categoryCounts.all || 0}
                    </span>
                </button>

                {rolesData.map((r) => {
                    const isSelected = selectedCategory === String(r.role_id);
                    const count = categoryCounts[r.role_id] || 0;
                    const roleColor = ROLE_COLORS[r.role_name || r.role] || "#6366F1";

                    return (
                        <button
                            key={r.role_id}
                            onClick={() => setSelectedCategory(String(r.role_id))}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 12,
                                border: isSelected ? `2px solid ${roleColor}` : "1px solid #E5E7EB",
                                background: isSelected ? `${roleColor}14` : "#fff",
                                color: isSelected ? "#1E2F5F" : "#6B7280",
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: 13,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                transition: "all 0.15s ease",
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: roleColor,
                                }}
                            />
                            <span>{r.role_name || r.role}</span>
                            <span
                                style={{
                                    padding: "2px 7px",
                                    borderRadius: 10,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: isSelected ? roleColor : "#F3F4F6",
                                    color: isSelected ? "#fff" : "#6B7280",
                                }}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Selected Category Header Banner (Quick Action to add in this category) */}
            {selectedCategory !== "all" && viewMode === "active" && (
                (() => {
                    const currentRole = rolesData.find((r) => String(r.role_id) === String(selectedCategory));
                    if (!currentRole) return null;
                    const roleColor = ROLE_COLORS[currentRole.role_name || currentRole.role] || "#3F7DFF";

                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "14px 20px",
                                borderRadius: 14,
                                background: `${roleColor}0A`,
                                border: `1px solid ${roleColor}30`,
                                marginBottom: 16,
                            }}
                        >
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>
                                        Category: {currentRole.role_name || currentRole.role}
                                    </h3>
                                    {currentRole.is_system && (
                                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "#E5E7EB", color: "#4B5563", fontWeight: 700 }}>
                                            Core System Role
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>
                                    {currentRole.description || "Employees assigned to this operational role category."}
                                </p>
                            </div>
                            <button
                                className="btn-primary"
                                style={{ background: roleColor, padding: "6px 14px", fontSize: 12 }}
                                onClick={() => openAddForm(currentRole.role_id)}
                            >
                                + Add {currentRole.role_name || currentRole.role} Account
                            </button>
                        </div>
                    );
                })()
            )}

            {/* Search & Filter Bar */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ flex: 1, minWidth: 260 }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="🔍 Search staff by name, email, phone, or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: "9px 14px", fontSize: 13 }}
                    />
                </div>
                {searchQuery && (
                    <button
                        className="btn-secondary"
                        onClick={() => setSearchQuery("")}
                        style={{ padding: "8px 12px", fontSize: 12 }}
                    >
                        Clear Search
                    </button>
                )}
            </div>

            {/* Staff Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
                        Loading staff directory and dynamic roles...
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {["ID", "Employee Name", "Role Category", "Email", "Contact", "Status", "Joined", "Actions"].map((heading) => (
                                        <th
                                            key={heading}
                                            style={{
                                                padding: "12px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: "0.05em",
                                                textTransform: "uppercase",
                                                color: "#64748B",
                                                borderBottom: "1px solid #E2E8F0",
                                            }}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                                            {searchQuery || selectedCategory !== "all"
                                                ? "No staff accounts found matching your filters."
                                                : viewMode === "deactivated"
                                                ? "No deactivated staff accounts."
                                                : "No active staff accounts registered yet."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStaff.map((user) => {
                                        const roleColor = ROLE_COLORS[user.role] || "#6366F1";
                                        const isSuperAdminUser = Number(user.role_id) === 1;

                                        // Permission flags
                                        const canEditThisUser = !isAdminAssistant || !isSuperAdminUser;
                                        const canDeactivateThisUser = !isSuperAdminUser;

                                        return (
                                            <tr
                                                key={user.user_id}
                                                style={{ borderTop: "1px solid #F1F5F9", transition: "background 0.1s ease" }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>
                                                    #U{String(user.user_id).padStart(3, "0")}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <div
                                                            style={{
                                                                width: 34,
                                                                height: 34,
                                                                borderRadius: "50%",
                                                                background: `${roleColor}22`,
                                                                border: `1px solid ${roleColor}44`,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: 12,
                                                                color: roleColor,
                                                                fontWeight: 700,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {getInitials(user.full_name)}
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: 13, color: "#1E293B", fontWeight: 600, margin: 0 }}>
                                                                {user.full_name}
                                                            </p>
                                                            <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>
                                                                {user.sex} · {formatDate(user.birthdate)}
                                                            </p>
                                                            {user.role === "Technician" &&
                                                                (user.certificate_expiry || user.specialties?.length > 0) && (
                                                                    <p style={{ fontSize: 11, color: "#64748B", margin: "2px 0 0" }}>
                                                                        {user.certificate_expiry
                                                                            ? `Cert expires ${formatDate(user.certificate_expiry)}`
                                                                            : "No certificate expiry"}
                                                                        {user.specialties?.length > 0
                                                                            ? ` · ${user.specialties.map((s) => s.specialty_name).join(", ")}`
                                                                            : ""}
                                                                    </p>
                                                                )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "3px 10px",
                                                            borderRadius: 20,
                                                            background: `${roleColor}15`,
                                                            color: roleColor,
                                                            border: `1px solid ${roleColor}30`,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>
                                                    {user.email}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>
                                                    {user.contact_number}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <StatusBadge status={user.status} />
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: "#94A3B8" }}>
                                                    {formatDate(user.created_at)}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                                        {viewMode === "active" ? (
                                                            <>
                                                                {canEditThisUser ? (
                                                                    <button
                                                                        className="btn-secondary"
                                                                        style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600 }}
                                                                        onClick={() => openEditForm(user)}
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "#94A3B8",
                                                                            fontStyle: "italic",
                                                                            padding: "4px 6px",
                                                                        }}
                                                                        title="Admin Assistant cannot edit Super Admin accounts."
                                                                    >
                                                                        Protected
                                                                    </span>
                                                                )}

                                                                {canDeactivateThisUser ? (
                                                                    <button
                                                                        className="btn-danger"
                                                                        style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600 }}
                                                                        onClick={() => setDeactivateTarget(user)}
                                                                    >
                                                                        Deactivate
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 10,
                                                                            padding: "2px 8px",
                                                                            borderRadius: 6,
                                                                            background: "#F1F5F9",
                                                                            color: "#64748B",
                                                                            fontWeight: 700,
                                                                        }}
                                                                        title="Super Admin accounts cannot be deactivated."
                                                                    >
                                                                        Cannot Deactivate
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600 }}
                                                                onClick={() => setReactivateTarget(user)}
                                                            >
                                                                ↩ Reactivate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal: Create / Edit Role Category ──────────────────────────── */}
            <Modal
                open={showNewRoleModal}
                title={roleEditTarget ? "Edit Role Category" : "Create New Role Category"}
                confirmLabel={roleSaving ? "Saving..." : roleEditTarget ? "Update Category" : "Create Category"}
                confirmDisabled={roleSaving || !newRoleForm.role_name.trim()}
                onConfirm={handleSaveRoleCategory}
                onCancel={() => {
                    if (!roleSaving) {
                        setShowNewRoleModal(false);
                        setRoleEditTarget(null);
                    }
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                        Creating a role category allows you to group staff and dynamically assign this role to new users in the system.
                    </p>
                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>
                            Role Category Name <span style={{ color: "#EF4444" }}>*</span>
                        </label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Operations Supervisor, HVAC Inspector..."
                            value={newRoleForm.role_name}
                            onChange={(e) => setNewRoleForm((prev) => ({ ...prev, role_name: e.target.value }))}
                            disabled={roleEditTarget?.is_system}
                        />
                        {roleEditTarget?.is_system && (
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94A3B8" }}>
                                Core system role names cannot be renamed.
                            </p>
                        )}
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>
                            Description (Optional)
                        </label>
                        <textarea
                            className="input-field"
                            style={{ minHeight: 70, resize: "vertical" }}
                            placeholder="Briefly describe the responsibilities and scope of this role..."
                            value={newRoleForm.description}
                            onChange={(e) => setNewRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                </div>
            </Modal>

            {/* ── Modal: Manage Role Categories ──────────────────────────────── */}
            <Modal
                open={showManageRolesModal}
                title="Manage Role Categories"
                confirmLabel="Done"
                onConfirm={() => setShowManageRolesModal(false)}
                onCancel={() => setShowManageRolesModal(false)}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                        Overview of active role categories and employee distribution.
                    </p>
                    <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        {rolesData.map((role) => {
                            const isCore = role.is_system || [1, 2, 3, 4, 5, 6].includes(Number(role.role_id));
                            const count = categoryCounts[role.role_id] || 0;
                            const isSuperAdminRole = Number(role.role_id) === 1;

                            return (
                                <div
                                    key={role.role_id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #E2E8F0",
                                        background: "#F8FAFC",
                                    }}
                                >
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                                                {role.role_name || role.role}
                                            </span>
                                            {isCore && (
                                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#E2E8F0", color: "#475569", fontWeight: 700 }}>
                                                    Core System
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>
                                            {count} active account(s) · {role.description || "No description set."}
                                        </p>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {(!isAdminAssistant || !isSuperAdminRole) && (
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: "4px 8px", fontSize: 11 }}
                                                onClick={() => {
                                                    setRoleEditTarget(role);
                                                    setNewRoleForm({
                                                        role_name: role.role_name || role.role,
                                                        description: role.description || "",
                                                    });
                                                    setShowManageRolesModal(false);
                                                    setShowNewRoleModal(true);
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}
                                        {!isCore && (
                                            <button
                                                className="btn-danger"
                                                style={{ padding: "4px 8px", fontSize: 11 }}
                                                onClick={() => {
                                                    setRoleDeleteTarget(role);
                                                    setShowManageRolesModal(false);
                                                }}
                                            >
                                                🗑 Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* ── Modal: Delete Role Category Confirmation ────────────────────── */}
            <Modal
                open={!!roleDeleteTarget}
                title="Delete Role Category?"
                message={`Are you sure you want to delete the role category "${roleDeleteTarget?.role_name || roleDeleteTarget?.role}"? This action cannot be undone.`}
                confirmLabel={roleSaving ? "Deleting..." : "Yes, Delete Category"}
                confirmDisabled={roleSaving}
                variant="danger"
                onConfirm={handleDeleteRoleCategory}
                onCancel={() => !roleSaving && setRoleDeleteTarget(null)}
            />

            {/* ── Modal: Deactivate Staff Account ─────────────────────────────── */}
            <Modal
                open={!!deactivateTarget}
                title="Deactivate Staff Account?"
                message={`This will deactivate the account for ${deactivateTarget?.full_name || "this employee"}. They will no longer be able to log in or access the system.`}
                confirmLabel="Yes, Deactivate"
                variant="danger"
                onConfirm={handleDeactivate}
                onCancel={() => setDeactivateTarget(null)}
            />

            {/* ── Modal: Reactivate Staff Account ─────────────────────────────── */}
            <Modal
                open={!!reactivateTarget}
                title="Reactivate Staff Account?"
                message={`This will restore active access for ${reactivateTarget?.full_name || "this employee"}. They will be able to log in to the system again.`}
                confirmLabel="Yes, Reactivate"
                onConfirm={handleReactivate}
                onCancel={() => setReactivateTarget(null)}
            />
        </div>
    );
}
