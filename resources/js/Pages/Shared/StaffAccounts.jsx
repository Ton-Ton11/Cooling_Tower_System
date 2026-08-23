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

const createEmptyForm = (roleId = "5") => ({
    role_id: roleId,
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

function StaffAccounts({ addToast, onDataChanged, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [staff, setStaff] = useState([]);
    const [meta, setMeta] = useState({
        roles: STAFF_ROLE_OPTIONS,
        specialties: [],
    });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("active");
    const [archiveTarget, setArchiveTarget] = useState(null);
    const [restoreTarget, setRestoreTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchStaff = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    ep.staff,
                    {
                        params: { include_archived: true },
                    },
                );

                setStaff(Array.isArray(data?.data) ? data.data : []);
                setMeta({
                    roles:
                        Array.isArray(data?.meta?.roles) &&
                        data.meta.roles.length > 0
                            ? data.meta.roles
                            : STAFF_ROLE_OPTIONS,
                    specialties: Array.isArray(data?.meta?.specialties)
                        ? data.meta.specialties
                        : [],
                });
            } catch (error) {
                addToast(
                    extractErrorMessage(
                        error,
                        "Unable to load staff accounts.",
                    ),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const roleOptions =
        meta.roles?.length > 0 ? meta.roles : STAFF_ROLE_OPTIONS;
    const specialtyOptions = meta.specialties ?? [];
    const activeStaff = useMemo(
        () => staff.filter((user) => user.status !== "Archived"),
        [staff],
    );
    const archivedStaff = useMemo(
        () => staff.filter((user) => user.status === "Archived"),
        [staff],
    );
    const displayList = viewMode === "archived" ? archivedStaff : activeStaff;
    const isFormMode = viewMode === "add" || viewMode === "edit";
    const isTechnician = Number(form.role_id) === 5;

    const openAddForm = () => {
        const defaultRoleId = String(
            roleOptions.find((role) => Number(role.role_id) === 5)?.role_id ??
                roleOptions[0]?.role_id ??
                5,
        );

        setEditTarget(null);
        setForm(createEmptyForm(defaultRoleId));
        setViewMode("add");
    };

    const openEditForm = (user) => {
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
            specialty_ids: (user.specialties ?? []).map((specialty) =>
                String(specialty.specialty_id),
            ),
        });
        setViewMode("edit");
    };

    const toggleSpecialty = (specialtyId) => {
        const key = String(specialtyId);
        setForm((previous) => ({
            ...previous,
            specialty_ids: previous.specialty_ids.includes(key)
                ? previous.specialty_ids.filter((value) => value !== key)
                : [...previous.specialty_ids, key],
        }));
    };

    const handleSubmit = async () => {
        if (submitting) {
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
            certificate_expiry: isTechnician
                ? form.certificate_expiry || null
                : null,
            specialty_ids: isTechnician
                ? form.specialty_ids.map((value) => Number(value))
                : [],
        };

        if (form.password.trim()) {
            payload.password = form.password;
            payload.password_confirmation = form.password_confirmation;
        }

        try {
            const response = editTarget
                ? await window.axios.patch(
                      ep.updateStaff(editTarget.user_id),
                      payload,
                  )
                : await window.axios.post(ep.staff, payload);

            addToast(
                response?.data?.message ||
                    (editTarget
                        ? "Staff account updated successfully."
                        : "Staff account created successfully."),
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
                    editTarget
                        ? "Unable to update the staff account."
                        : "Unable to create the staff account.",
                ),
                "error",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleArchive = async () => {
        if (!archiveTarget) {
            return;
        }

        try {
            const { data } = await window.axios.patch(
                ep.archiveStaff(archiveTarget.user_id),
            );
            addToast(data?.message || "Staff account archived successfully.");
            setArchiveTarget(null);
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to archive the account."),
                "error",
            );
        }
    };

    const handleRestore = async () => {
        if (!restoreTarget) {
            return;
        }

        try {
            const { data } = await window.axios.patch(
                ep.restoreStaff(restoreTarget.user_id),
            );
            addToast(data?.message || "Staff account restored successfully.");
            setRestoreTarget(null);
            setViewMode("active");
            await fetchStaff(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to restore the account."),
                "error",
            );
        }
    };

    if (isFormMode) {
        const title =
            viewMode === "edit" ? "Edit Staff Account" : "Add New Staff Account";
        const subtitle =
            viewMode === "edit"
                ? `Update credentials and employee details for ${editTarget?.full_name || "this staff member"}.`
                : "Fill out the required information to register a new staff account.";

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
                            }}
                        >
                            ← Back to Staff
                        </button>
                        <h1 className="page-title font-display">{title}</h1>
                        <p className="page-subtitle">{subtitle}</p>
                    </div>
                </div>

                <div className="card" style={{ padding: 28, maxWidth: 860 }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                            gap: 16,
                        }}
                    >
                        {[
                            {
                                label: "First Name",
                                key: "given_name",
                                placeholder: "e.g. Maria",
                            },
                            {
                                label: "Middle Name",
                                key: "middle_name",
                                placeholder: "Optional",
                            },
                            {
                                label: "Last Name",
                                key: "last_name",
                                placeholder: "e.g. Santos",
                            },
                            {
                                label: "Birthdate",
                                key: "birthdate",
                                type: "date",
                            },
                            {
                                label: "Email Address",
                                key: "email",
                                placeholder: "name@coolingtower.com",
                                type: "email",
                            },
                            {
                                label: "Contact Number",
                                key: "contact_number",
                                placeholder: "09XXXXXXXXX",
                            },
                        ].map((field) => (
                            <div key={field.key}>
                                <p
                                    className="section-label"
                                    style={{ marginBottom: 6 }}
                                >
                                    {field.label}
                                </p>
                                <input
                                    type={field.type || "text"}
                                    className="input-field"
                                    placeholder={field.placeholder}
                                    value={form[field.key]}
                                    onChange={(event) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            [field.key]: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        ))}

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Sex
                            </p>
                            <select
                                className="input-field"
                                value={form.sex}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        sex: event.target.value,
                                    }))
                                }
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Role
                            </p>
                            <select
                                className="input-field"
                                value={form.role_id}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        role_id: event.target.value,
                                        certificate_expiry:
                                            Number(event.target.value) === 5
                                                ? previous.certificate_expiry
                                                : "",
                                        specialty_ids:
                                            Number(event.target.value) === 5
                                                ? previous.specialty_ids
                                                : [],
                                    }))
                                }
                            >
                                {roleOptions.map((role) => (
                                    <option
                                        key={role.role_id}
                                        value={role.role_id}
                                    >
                                        {role.role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Address
                            </p>
                            <textarea
                                className="input-field"
                                style={{ minHeight: 96, resize: "vertical" }}
                                placeholder="Full address"
                                value={form.address}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        address: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Password
                            </p>
                            <input
                                type="password"
                                className="input-field"
                                placeholder={
                                    viewMode === "edit"
                                        ? "Leave blank to keep current password"
                                        : "Minimum 8 characters"
                                }
                                value={form.password}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        password: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <p
                                className="section-label"
                                style={{ marginBottom: 6 }}
                            >
                                Confirm Password
                            </p>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="Repeat password"
                                value={form.password_confirmation}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        password_confirmation:
                                            event.target.value,
                                    }))
                                }
                            />
                        </div>

                        {isTechnician && (
                            <>
                                <div>
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 6 }}
                                    >
                                        Certificate Expiry
                                    </p>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={form.certificate_expiry}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                certificate_expiry:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div style={{ gridColumn: "1 / -1" }}>
                                    <p
                                        className="section-label"
                                        style={{ marginBottom: 8 }}
                                    >
                                        Technician Specialties
                                    </p>
                                    {specialtyOptions.length === 0 ? (
                                        <div
                                            style={{
                                                padding: "12px 14px",
                                                borderRadius: 10,
                                                background: "#F9FAFB",
                                                border: "1px solid #E5E7EB",
                                                fontSize: 13,
                                                color: "#6B7280",
                                            }}
                                        >
                                            No specialty options are available yet.
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 10,
                                            }}
                                        >
                                            {specialtyOptions.map((specialty) => {
                                                const checked =
                                                    form.specialty_ids.includes(
                                                        String(
                                                            specialty.specialty_id,
                                                        ),
                                                    );

                                                return (
                                                    <label
                                                        key={
                                                            specialty.specialty_id
                                                        }
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            padding: "8px 12px",
                                                            borderRadius: 999,
                                                            border: `1px solid ${
                                                                checked
                                                                    ? "#3F7DFF"
                                                                    : "#E5E7EB"
                                                            }`,
                                                            background: checked
                                                                ? "rgba(63,125,255,0.08)"
                                                                : "#fff",
                                                            cursor: "pointer",
                                                            fontSize: 12,
                                                            color: checked
                                                                ? "#1E2F5F"
                                                                : "#6B7280",
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                toggleSpecialty(
                                                                    specialty.specialty_id,
                                                                )
                                                            }
                                                        />
                                                        {
                                                            specialty.specialty_name
                                                        }
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
                        <button
                            className="btn-primary"
                            onClick={() => setConfirmSubmit(true)}
                        >
                            {viewMode === "edit"
                                ? "Save Changes"
                                : "Register Account"}
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
                    title={
                        viewMode === "edit"
                            ? "Save Staff Changes?"
                            : "Create Staff Account?"
                    }
                    message={
                        viewMode === "edit"
                            ? `Apply updates for ${editTarget?.full_name || `${form.given_name} ${form.last_name}`.trim()}?`
                            : `Register a new ${roleOptions.find((role) => Number(role.role_id) === Number(form.role_id))?.role || "staff"} account for ${`${form.given_name} ${form.last_name}`.trim() || "this employee"}?`
                    }
                    confirmLabel={submitting ? "Saving..." : "Confirm"}
                    confirmDisabled={submitting}
                    onConfirm={handleSubmit}
                    onCancel={() => !submitting && setConfirmSubmit(false)}
                />
            </div>
        );
    }

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Staff Accounts</h1>
                    <p className="page-subtitle">
                        {viewMode === "archived"
                            ? `${archivedStaff.length} archived accounts`
                            : `${activeStaff.length} active staff members`}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                        className="btn-secondary"
                        onClick={() =>
                            setViewMode(
                                viewMode === "archived" ? "active" : "archived",
                            )
                        }
                    >
                        {viewMode === "archived"
                            ? "← Active Staff"
                            : "🗃 View Archived"}
                    </button>
                    <button className="btn-secondary" onClick={() => fetchStaff()}>
                        Refresh
                    </button>
                    {viewMode === "active" && (
                        <button className="btn-primary" onClick={openAddForm}>
                            + Add New Staff
                        </button>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
                {loading ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        Loading staff accounts...
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 860,
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "ID",
                                        "Name",
                                        "Role",
                                        "Email",
                                        "Contact",
                                        "Status",
                                        "Joined",
                                        "Actions",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                letterSpacing: "0.05em",
                                                textTransform: "uppercase",
                                                color: "#6B7280",
                                                whiteSpace: "nowrap",
                                                borderBottom:
                                                    "1px solid #EAECF0",
                                            }}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            style={{
                                                padding: 28,
                                                textAlign: "center",
                                                color: "#9CA3AF",
                                                fontSize: 13,
                                            }}
                                        >
                                            No staff accounts match this view.
                                        </td>
                                    </tr>
                                ) : (
                                    displayList.map((user) => {
                                        const roleColor =
                                            ROLE_COLORS[user.role] || "#8A93A6";

                                        return (
                                            <tr
                                                key={user.user_id}
                                                style={{
                                                    borderTop:
                                                        "1px solid #F5F7FA",
                                                }}
                                                onMouseEnter={(event) => {
                                                    event.currentTarget.style.background =
                                                        "rgba(63,125,255,0.04)";
                                                }}
                                                onMouseLeave={(event) => {
                                                    event.currentTarget.style.background =
                                                        "transparent";
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                        fontSize: 12,
                                                        color: "#9CA3AF",
                                                    }}
                                                >
                                                    #U
                                                    {String(user.user_id).padStart(
                                                        3,
                                                        "0",
                                                    )}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius:
                                                                    "50%",
                                                                background: `${roleColor}22`,
                                                                border: `1px solid ${roleColor}44`,
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                                fontSize: 12,
                                                                color: roleColor,
                                                                fontWeight: 700,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {getInitials(
                                                                user.full_name,
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p
                                                                style={{
                                                                    fontSize: 13,
                                                                    color: "#1E2F5F",
                                                                    fontWeight: 500,
                                                                    margin: 0,
                                                                }}
                                                            >
                                                                {user.full_name}
                                                            </p>
                                                            <p
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#9CA3AF",
                                                                    margin:
                                                                        "2px 0 0",
                                                                }}
                                                            >
                                                                {user.sex} ·{" "}
                                                                {formatDate(
                                                                    user.birthdate,
                                                                )}
                                                            </p>
                                                            {user.role ===
                                                                "Technician" &&
                                                                (user.certificate_expiry ||
                                                                    user
                                                                        .specialties
                                                                        ?.length >
                                                                        0) && (
                                                                    <p
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "#6B7280",
                                                                            margin:
                                                                                "2px 0 0",
                                                                        }}
                                                                    >
                                                                        {user.certificate_expiry
                                                                            ? `Cert expires ${formatDate(user.certificate_expiry)}`
                                                                            : "No certificate expiry set"}
                                                                        {user
                                                                            .specialties
                                                                            ?.length >
                                                                            0
                                                                            ? ` · ${user.specialties.map((specialty) => specialty.specialty_name).join(", ")}`
                                                                            : ""}
                                                                    </p>
                                                                )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "2px 8px",
                                                            borderRadius: 20,
                                                            background: `${roleColor}18`,
                                                            color: roleColor,
                                                            border: `1px solid ${roleColor}30`,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                        fontSize: 12,
                                                        color: "#6B7280",
                                                    }}
                                                >
                                                    {user.email}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                        fontSize: 12,
                                                        color: "#6B7280",
                                                    }}
                                                >
                                                    {user.contact_number}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                    }}
                                                >
                                                    <StatusBadge
                                                        status={user.status}
                                                    />
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                        fontSize: 12,
                                                        color: "#9CA3AF",
                                                    }}
                                                >
                                                    {formatDate(user.created_at)}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "10px 12px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: 6,
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        {viewMode === "active" ? (
                                                            <>
                                                                <button
                                                                    className="btn-secondary"
                                                                    style={{
                                                                        padding:
                                                                            "4px 10px",
                                                                        fontSize: 11,
                                                                    }}
                                                                    onClick={() =>
                                                                        openEditForm(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    ✏️ Edit
                                                                </button>
                                                                <button
                                                                    className="btn-danger"
                                                                    style={{
                                                                        padding:
                                                                            "4px 10px",
                                                                        fontSize: 11,
                                                                    }}
                                                                    onClick={() =>
                                                                        setArchiveTarget(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    🗃 Archive
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                className="btn-primary"
                                                                style={{
                                                                    padding:
                                                                        "4px 10px",
                                                                    fontSize: 11,
                                                                }}
                                                                onClick={() =>
                                                                    setRestoreTarget(
                                                                        user,
                                                                    )
                                                                }
                                                            >
                                                                ↩ Restore
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

            <Modal
                open={!!archiveTarget}
                title="Confirm Archive Action?"
                message={`This will deactivate ${archiveTarget?.full_name || "this account"}. They will no longer be able to access the system.`}
                confirmLabel="Yes, Archive"
                variant="danger"
                onConfirm={handleArchive}
                onCancel={() => setArchiveTarget(null)}
            />

            <Modal
                open={!!restoreTarget}
                title="Restore Staff Account?"
                message={`${restoreTarget?.full_name || "This account"} will be reactivated and can access the system again.`}
                confirmLabel="Yes, Restore"
                onConfirm={handleRestore}
                onCancel={() => setRestoreTarget(null)}
            />
        </div>
    );
}

export default StaffAccounts;
