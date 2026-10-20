import React, { useEffect, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import {
    Camera,
    Trash2,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    User as UserIcon,
    Sparkles,
} from "lucide-react";
import { getInitials } from "../../utils/superAdmin";
import logo from "../../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

export default function UserProfileSettings({ addToast, initialPayload = null }) {
    const { auth = {} } = usePage().props;
    const authUser = auth.user || {};

    const [loading, setLoading] = useState(!initialPayload);
    const [savingProfile, setSavingProfile] = useState(false);
    const [removingPhoto, setRemovingPhoto] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const [profileData, setProfileData] = useState(() => ({
        user: initialPayload?.user || {
            user_id: authUser.user_id,
            role_id: authUser.role_id,
            is_head_technician: Number(authUser.role_id) === 7,
            given_name: authUser.given_name || "",
            middle_name: authUser.middle_name || "",
            last_name: authUser.last_name || "",
            name: authUser.name || "",
            email: authUser.email || "",
            contact_number: authUser.contact_number || "",
            address: authUser.address || "",
            birthdate: authUser.birthdate ? String(authUser.birthdate).slice(0, 10) : "",
            sex: authUser.sex || "Male",
            is_active: authUser.is_active ?? true,
            profile_photo_url: authUser.profile_photo_url || null,
            created_at: "",
        },
        role_meta: initialPayload?.role_meta || {
            role_label: auth.isHeadTechnician
                ? "Head Technician"
                : auth.role_name || "User",
            department: "Cooling Tower Operations",
            description: "Manage your personal profile, contact details, and account security settings.",
            badge_tone: "blue",
        },
        highlights: initialPayload?.highlights || [],
    }));

    const [form, setForm] = useState({
        given_name: profileData.user.given_name || "",
        middle_name: profileData.user.middle_name || "",
        last_name: profileData.user.last_name || "",
        birthdate: profileData.user.birthdate ? String(profileData.user.birthdate).slice(0, 10) : "",
        sex: profileData.user.sex || "Male",
        contact_number: profileData.user.contact_number || "",
        address: profileData.user.address || "",
        email: profileData.user.email || "",
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [showPasswords, setShowPasswords] = useState(false);

    const fileInputRef = useRef(null);

    const notify = (msg, type = "success") => {
        if (addToast) {
            addToast(msg, type);
        }
    };

    const syncFromPayload = (payload) => {
        if (!payload?.user) return;
        setProfileData({
            user: payload.user,
            role_meta: payload.role_meta || profileData.role_meta,
            highlights: payload.highlights || [],
        });
        setForm({
            given_name: payload.user.given_name || "",
            middle_name: payload.user.middle_name || "",
            last_name: payload.user.last_name || "",
            birthdate: payload.user.birthdate ? String(payload.user.birthdate).slice(0, 10) : "",
            sex: payload.user.sex || "Male",
            contact_number: payload.user.contact_number || "",
            address: payload.user.address || "",
            email: payload.user.email || "",
        });
        window.dispatchEvent(new CustomEvent("profile-updated", { detail: payload.user }));
    };

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const { data } = await window.axios.get("/profile/data");
            syncFromPayload(data);
        } catch {
            // Keep fallback auth user state if offline
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialPayload) {
            fetchProfileData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            notify("Please choose an image smaller than 4 MB.", "error");
            return;
        }

        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPhotoPreview(objectUrl);
    };

    const handlePhotoUpload = async () => {
        if (!selectedFile) return;
        setSavingProfile(true);

        try {
            const fd = new FormData();
            fd.append("profile_photo", selectedFile);

            const { data } = await window.axios.post("/profile/photo", fd, {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "multipart/form-data",
                },
            });

            syncFromPayload(data);
            setSelectedFile(null);
            setPhotoPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            notify(data.message || "Profile picture updated!", "success");
        } catch (err) {
            notify(
                err?.response?.data?.message || "Could not upload profile picture.",
                "error",
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        if (e) e.preventDefault();
        setFormErrors({});
        setSavingProfile(true);

        try {
            const fd = new FormData();
            fd.append("given_name", form.given_name || "");
            fd.append("middle_name", form.middle_name || "");
            fd.append("last_name", form.last_name || "");
            if (form.birthdate) fd.append("birthdate", form.birthdate);
            if (form.sex) fd.append("sex", form.sex);
            fd.append("contact_number", form.contact_number || "");
            fd.append("address", form.address || "");
            fd.append("email", form.email || "");

            if (selectedFile) {
                fd.append("profile_photo", selectedFile);
            }

            const { data } = await window.axios.post("/profile/update", fd, {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "multipart/form-data",
                },
            });

            syncFromPayload(data);
            setSelectedFile(null);
            setPhotoPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            notify(data.message || "Profile and photo saved successfully!", "success");
        } catch (err) {
            const validationErrors = err?.response?.data?.errors || {};
            setFormErrors(validationErrors);
            notify(
                err?.response?.data?.message || "Could not update profile. Please check your inputs.",
                "error",
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (selectedFile) {
            setSelectedFile(null);
            setPhotoPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (!profileData.user.profile_photo_url) return;

        try {
            setRemovingPhoto(true);
            const { data } = await window.axios.delete("/profile/photo", {
                headers: { Accept: "application/json" },
            });
            syncFromPayload(data);
            notify(data.message || "Profile picture removed.", "success");
        } catch (err) {
            notify(err?.response?.data?.message || "Unable to remove profile picture.", "error");
        } finally {
            setRemovingPhoto(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordErrors({});
        setSavingPassword(true);

        try {
            const { data } = await window.axios.put("/profile/password", passwordForm, {
                headers: { Accept: "application/json" },
            });
            setPasswordForm({
                current_password: "",
                password: "",
                password_confirmation: "",
            });
            notify(data.message || "Password updated successfully.", "success");
        } catch (err) {
            const validationErrors = err?.response?.data?.errors || {};
            setPasswordErrors(validationErrors);
            notify(
                err?.response?.data?.message || "Unable to update password. Please verify your current password.",
                "error",
            );
        } finally {
            setSavingPassword(false);
        }
    };

    const displayUser = profileData.user || {};
    const roleMeta = profileData.role_meta || {};
    const fullName =
        displayUser.name ||
        [form.given_name, form.middle_name, form.last_name].filter(Boolean).join(" ") ||
        "User";
    const initials = getInitials(fullName);
    const activeAvatarUrl = photoPreview || displayUser.profile_photo_url || null;

    const inputBaseClass =
        "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm font-sans";
    const iconInputClass =
        "w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm font-sans";

    return (
        <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-900">
            {/* Minimalist Page Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0E1A33] via-[#14224A] to-[#1D3B7A] p-6 sm:p-8 text-white shadow-xl border border-white/10">
                <div className="pointer-events-none absolute -top-20 right-10 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-sky-400/30 text-sky-200 text-xs font-semibold">
                            <span className="size-2 rounded-full bg-orange-400" />
                            <span>{roleMeta.department || "Account Profile & Preferences"}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
                            My Profile & Account Settings
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl">
                            {roleMeta.description}
                        </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5 rounded-2xl shrink-0">
                        <div className="size-9 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                            <img src={logo} alt="Cooling Tower" className="w-full h-full object-contain rounded-full" />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold font-display text-white leading-none">
                                Cooling Tower
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300 mt-0.5">
                                {roleMeta.role_label}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main 2-Column Layout: Left Profile Display Card + Right Settings Forms */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ──────────────────────────────────────────────────────────────
                    LEFT COLUMN (4 COLS): PROFILE DISPLAY & PHOTO ATTACHMENT
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-[#14224A]/5 overflow-hidden">
                        {/* Top Navy Accent Strip */}
                        <div className="h-24 bg-gradient-to-r from-[#0E1A33] via-[#14224A] to-[#2563EB] relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.22),transparent_60%)]" />
                        </div>

                        <div className="px-6 pb-6 -mt-12 relative">
                            {/* Profile Picture Avatar + Upload Trigger */}
                            <div className="flex flex-col items-center text-center">
                                <div className="relative group">
                                    <div className="size-24 sm:size-28 rounded-full bg-white p-1.5 shadow-lg shadow-[#14224A]/15 ring-2 ring-sky-400/40 overflow-hidden flex items-center justify-center">
                                        {activeAvatarUrl ? (
                                            <img
                                                src={activeAvatarUrl}
                                                alt={fullName}
                                                onError={() => {
                                                    setPhotoPreview(null);
                                                    setProfileData((prev) => ({
                                                        ...prev,
                                                        user: { ...prev.user, profile_photo_url: null },
                                                    }));
                                                }}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white font-display font-extrabold text-2xl flex items-center justify-center">
                                                {initials}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Attach or change profile picture"
                                        className="absolute bottom-0 right-0 size-9 rounded-full bg-gradient-to-r from-[#14224A] to-[#2563EB] text-white shadow-md border-2 border-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <Camera className="size-4" />
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/jpg"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>

                                {/* Name & Role Badge */}
                                <h2 className="mt-3.5 text-xl font-extrabold font-display text-[#14224A]">
                                    {fullName}
                                </h2>

                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-sky-800 text-xs font-bold">
                                    <span className="size-1.5 rounded-full bg-orange-500" />
                                    <span>{roleMeta.role_label}</span>
                                </div>

                                {/* Profile Photo Attachment Actions */}
                                <div className="mt-4 flex items-center justify-center gap-2 flex-wrap w-full">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-[#14224A] hover:text-blue-700 border border-slate-200/80 text-xs font-semibold transition flex items-center gap-1.5"
                                    >
                                        <Camera className="size-3.5 text-blue-600" />
                                        <span>{activeAvatarUrl ? "Change Photo" : "Attach Profile Pic"}</span>
                                    </button>

                                    {selectedFile && (
                                        <button
                                            type="button"
                                            disabled={savingProfile}
                                            onClick={handlePhotoUpload}
                                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#14224A] to-[#2563EB] text-white text-xs font-semibold shadow-sm hover:brightness-110 transition"
                                        >
                                            {savingProfile ? "Uploading..." : "Save Photo"}
                                        </button>
                                    )}

                                    {(activeAvatarUrl || selectedFile) && (
                                        <button
                                            type="button"
                                            disabled={removingPhoto}
                                            onClick={handleRemovePhoto}
                                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 text-xs font-semibold transition flex items-center gap-1"
                                        >
                                            <Trash2 className="size-3.5" />
                                            <span>{selectedFile ? "Cancel" : "Remove"}</span>
                                        </button>
                                    )}
                                </div>

                                <p className="mt-2 text-[11px] text-slate-400">
                                    Supports JPG, PNG, or WEBP (Max 4 MB)
                                </p>
                            </div>

                            {/* Contact & Identity Summary */}
                            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 text-xs">
                                <div className="flex items-start gap-3">
                                    <div className="size-8 rounded-xl bg-slate-100 text-[#14224A] flex items-center justify-center shrink-0">
                                        <Mail className="size-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-semibold text-slate-400 block">
                                            Email Address
                                        </span>
                                        <span className="font-semibold text-slate-800 break-all">
                                            {displayUser.email || "Not set"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="size-8 rounded-xl bg-slate-100 text-[#14224A] flex items-center justify-center shrink-0">
                                        <Phone className="size-4 text-sky-600" />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-semibold text-slate-400 block">
                                            Contact Number
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                            {displayUser.contact_number || "Not provided"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="size-8 rounded-xl bg-slate-100 text-[#14224A] flex items-center justify-center shrink-0">
                                        <MapPin className="size-4 text-orange-500" />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-semibold text-slate-400 block">
                                            Registered Address
                                        </span>
                                        <span className="font-semibold text-slate-800 leading-snug block">
                                            {displayUser.address || "No address on file"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="size-8 rounded-xl bg-slate-100 text-[#14224A] flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-semibold text-slate-400 block">
                                            Account Status
                                        </span>
                                        <span className="font-semibold text-emerald-700">
                                            Active & Verified ({displayUser.sex || "Standard"})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Role-Specific Highlights */}
                            {profileData.highlights?.length > 0 && (
                                <div className="mt-6 pt-5 border-t border-slate-100">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                        <Sparkles className="size-3.5 text-orange-500" />
                                        <span>Role Activity Snapshot</span>
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        {profileData.highlights.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70"
                                            >
                                                <div className="text-base font-extrabold font-display text-[#14224A]">
                                                    {item.value}
                                                </div>
                                                <div className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5">
                                                    {item.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    RIGHT COLUMN (8 COLS): PROFILE SETTINGS & PASSWORD SECURITY
                ────────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-8 space-y-6">
                    {/* CARD 1: PERSONAL INFORMATION & CONTACT SETTINGS */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-[#14224A]/5">
                        <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/70 px-3 py-1 rounded-full mb-2">
                                    <UserIcon className="size-3.5 text-blue-600" />
                                    <span>Profile Details</span>
                                </div>
                                <h3 className="text-xl font-extrabold font-display text-[#14224A]">
                                    Personal & Contact Information
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Keep your name, contact number, and service address up to date.
                                </p>
                            </div>
                            {loading && (
                                <span className="text-xs font-semibold text-blue-600">
                                    Syncing profile...
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_given_name">
                                        Given Name
                                    </label>
                                    <input
                                        id="prof_given_name"
                                        type="text"
                                        required
                                        value={form.given_name}
                                        onChange={(e) => setForm({ ...form, given_name: e.target.value })}
                                        placeholder="First Name"
                                        className={inputBaseClass}
                                    />
                                    {formErrors.given_name && (
                                        <p className="text-xs text-red-600">{formErrors.given_name[0]}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_middle_name">
                                        Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        id="prof_middle_name"
                                        type="text"
                                        value={form.middle_name}
                                        onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                                        placeholder="Middle Name"
                                        className={inputBaseClass}
                                    />
                                    {formErrors.middle_name && (
                                        <p className="text-xs text-red-600">{formErrors.middle_name[0]}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_last_name">
                                        Last Name
                                    </label>
                                    <input
                                        id="prof_last_name"
                                        type="text"
                                        required
                                        value={form.last_name}
                                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                        placeholder="Last Name"
                                        className={inputBaseClass}
                                    />
                                    {formErrors.last_name && (
                                        <p className="text-xs text-red-600">{formErrors.last_name[0]}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_email">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="prof_email"
                                            type="email"
                                            required
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="name@example.com"
                                            className={iconInputClass}
                                        />
                                    </div>
                                    {formErrors.email && (
                                        <p className="text-xs text-red-600">{formErrors.email[0]}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_contact">
                                        Contact Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="prof_contact"
                                            type="tel"
                                            value={form.contact_number}
                                            onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                                            placeholder="+63 917 000 0000"
                                            className={iconInputClass}
                                        />
                                    </div>
                                    {formErrors.contact_number && (
                                        <p className="text-xs text-red-600">{formErrors.contact_number[0]}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_birthdate">
                                        Birthdate
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="prof_birthdate"
                                            type="date"
                                            value={form.birthdate}
                                            onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                                            className={iconInputClass}
                                        />
                                    </div>
                                    {formErrors.birthdate && (
                                        <p className="text-xs text-red-600">{formErrors.birthdate[0]}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="prof_sex">
                                        Sex
                                    </label>
                                    <select
                                        id="prof_sex"
                                        value={form.sex}
                                        onChange={(e) => setForm({ ...form, sex: e.target.value })}
                                        className={inputBaseClass}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                    {formErrors.sex && (
                                        <p className="text-xs text-red-600">{formErrors.sex[0]}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700" htmlFor="prof_address">
                                    Address
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-3 size-4 text-slate-400 pointer-events-none" />
                                    <textarea
                                        id="prof_address"
                                        rows={2}
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        placeholder="Enter your complete address"
                                        className={`${iconInputClass} resize-none`}
                                    />
                                </div>
                                {formErrors.address && (
                                    <p className="text-xs text-red-600">{formErrors.address[0]}</p>
                                )}
                            </div>

                            <div className="pt-3 flex items-center justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white text-sm font-semibold shadow-lg shadow-blue-900/20 hover:brightness-110 transition-all disabled:opacity-60"
                                >
                                    {savingProfile ? "Saving Changes..." : "Save Profile Changes"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* CARD 2: PASSWORD & ACCOUNT SECURITY */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-[#14224A]/5">
                        <div className="mb-6 pb-4 border-b border-slate-100">
                            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200/70 px-3 py-1 rounded-full mb-2">
                                <ShieldCheck className="size-3.5 text-orange-500" />
                                <span>Password & Security</span>
                            </div>
                            <h3 className="text-xl font-extrabold font-display text-[#14224A]">
                                Update Account Password
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Use a strong password with at least 8 characters to keep your {roleMeta.role_label} account secure.
                            </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700" htmlFor="curr_password">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="curr_password"
                                        type={showPasswords ? "text" : "password"}
                                        required
                                        value={passwordForm.current_password}
                                        onChange={(e) =>
                                            setPasswordForm({ ...passwordForm, current_password: e.target.value })
                                        }
                                        placeholder="Enter current password"
                                        className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14224A]"
                                        tabIndex={-1}
                                    >
                                        {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {passwordErrors.current_password && (
                                    <p className="text-xs text-red-600">{passwordErrors.current_password[0]}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="new_password">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="new_password"
                                            type={showPasswords ? "text" : "password"}
                                            required
                                            value={passwordForm.password}
                                            onChange={(e) =>
                                                setPasswordForm({ ...passwordForm, password: e.target.value })
                                            }
                                            placeholder="New password"
                                            className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                                        />
                                    </div>
                                    {passwordErrors.password && (
                                        <p className="text-xs text-red-600">{passwordErrors.password[0]}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700" htmlFor="conf_password">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="conf_password"
                                            type={showPasswords ? "text" : "password"}
                                            required
                                            value={passwordForm.password_confirmation}
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    password_confirmation: e.target.value,
                                                })
                                            }
                                            placeholder="Confirm new password"
                                            className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                                        />
                                    </div>
                                    {passwordErrors.password_confirmation && (
                                        <p className="text-xs text-red-600">
                                            {passwordErrors.password_confirmation[0]}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 flex items-center justify-end">
                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#14224A] via-[#1D3B7A] to-[#2563EB] text-white text-sm font-semibold shadow-lg shadow-blue-900/20 hover:brightness-110 transition-all disabled:opacity-60"
                                >
                                    {savingPassword ? "Updating Password..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
