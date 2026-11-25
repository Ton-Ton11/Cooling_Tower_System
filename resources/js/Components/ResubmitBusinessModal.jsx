import { useState, useEffect } from "react";
import { 
    X, 
    Building2, 
    Briefcase, 
    Phone, 
    FileText, 
    Upload, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    FileCheck 
} from "lucide-react";
import GeospatialAddressAutocomplete from "./GeospatialAddressAutocomplete";
import InputError from "./InputError";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../utils/superAdmin";

/**
 * Format TIN cleanly into XXX-XXX-XXX-XXX or standard format
 */
function formatTinValue(val) {
    const raw = String(val || "").replace(/[^0-9]/g, "").slice(0, 12);
    if (!raw) return "";
    const parts = raw.match(/.{1,3}/g);
    return parts ? parts.join("-") : raw;
}

export default function ResubmitBusinessModal({ 
    isOpen, 
    onClose, 
    user, 
    onSuccess, 
    addToast 
}) {
    if (!isOpen || !user) return null;

    const remainingAttempts = typeof user.remaining_daily_attempts === "number" 
        ? user.remaining_daily_attempts 
        : 3;
    const canResubmit = remainingAttempts > 0;
    const currentAttemptNumber = Math.min(3, 4 - remainingAttempts);

    const [formData, setFormData] = useState({
        company_name: user.company_name || "",
        representative_role: user.representative_role || "",
        tin: user.tin || "",
        contact_number: user.contact_number || "",
        address: user.address || "",
    });

    const [permitFile, setPermitFile] = useState(null);
    const [permitFileName, setPermitFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [geocodeVerification, setGeocodeVerification] = useState(null);

    // Sync initial user details whenever modal opens or user updates
    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                company_name: user.company_name || "",
                representative_role: user.representative_role || "",
                tin: user.tin || "",
                contact_number: user.contact_number || "",
                address: user.address || "",
            });
            setPermitFile(null);
            setPermitFileName("");
            setErrors({});
            setGeneralError("");
        }
    }, [isOpen, user]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleTinChange = (e) => {
        const formatted = formatTinValue(e.target.value);
        handleInputChange("tin", formatted);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({
                ...prev,
                business_permit: "The selected document exceeds the 5MB size limit.",
            }));
            return;
        }

        const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
        if (!validTypes.includes(file.type)) {
            setErrors((prev) => ({
                ...prev,
                business_permit: "Only PDF, JPG, and PNG files are accepted.",
            }));
            return;
        }

        setPermitFile(file);
        setPermitFileName(file.name);
        if (errors.business_permit) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGeneralError("");
        setErrors({});

        if (!canResubmit) {
            setGeneralError("You have reached the maximum limit of 3 verification attempts for today. Please try again tomorrow.");
            return;
        }

        // Basic client validations
        const newErrors = {};
        if (!formData.company_name.trim()) {
            newErrors.company_name = "Company Name is required.";
        }
        if (!formData.representative_role.trim()) {
            newErrors.representative_role = "Job Title / Role is required.";
        }
        if (!formData.tin.trim()) {
            newErrors.tin = "Tax Identification Number (TIN) is required.";
        } else {
            const rawDigits = formData.tin.replace(/[^0-9]/g, "");
            if (rawDigits.length !== 9 && rawDigits.length !== 12) {
                newErrors.tin = "TIN must contain 9 or 12 digits (e.g. 000-123-456-000).";
            }
        }
        if (!formData.contact_number.trim()) {
            newErrors.contact_number = "Contact Number is required.";
        }
        if (!formData.address.trim()) {
            newErrors.address = "Main Operating Address is required.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const payload = new FormData();
            payload.append("company_name", formData.company_name.trim());
            payload.append("representative_role", formData.representative_role.trim());
            payload.append("tin", formData.tin.trim());
            payload.append("contact_number", formData.contact_number.trim());
            payload.append("address", formData.address.trim());

            if (permitFile) {
                payload.append("business_permit", permitFile);
            }

            const endpoint = CUSTOMER_ENDPOINTS.resubmitBusinessVerification;
            const response = await window.axios.post(endpoint, payload, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const resData = response.data;
            if (addToast) {
                addToast(resData.message || "Business verification re-submitted successfully.", "success");
            }

            if (onSuccess) {
                onSuccess(resData.user || null);
            }
            onClose();
        } catch (err) {
            const validationErrors = err?.response?.data?.errors;
            if (validationErrors && typeof validationErrors === "object") {
                const mappedErrors = {};
                for (const [key, msgList] of Object.entries(validationErrors)) {
                    mappedErrors[key] = Array.isArray(msgList) ? msgList[0] : msgList;
                }
                setErrors(mappedErrors);
            }
            const fallbackMsg = extractErrorMessage(err, "Failed to re-submit verification details. Please check your inputs.");
            setGeneralError(fallbackMsg);
            if (addToast) {
                addToast(fallbackMsg, "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200/90 overflow-hidden flex flex-col my-6 max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#14224A] text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-lg font-bold tracking-tight">Re-submit Business Details</h3>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    canResubmit 
                                        ? "bg-blue-500/20 text-blue-200 border-blue-400/30" 
                                        : "bg-red-500/20 text-red-200 border-red-400/30"
                                }`}>
                                    Attempt {currentAttemptNumber} of 3 Today
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Update your company credentials for administrator review & approval.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
                    {/* Previous Rejection Callout */}
                    {user.verification_rejection_reason && (
                        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/90 text-red-950 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <span className="font-bold text-red-900 block text-[11px] uppercase tracking-wider">
                                    Previous Rejection Reason
                                </span>
                                <p className="text-red-800 leading-relaxed">
                                    {user.verification_rejection_reason}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Daily Quota Counter Banner */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                            <div>
                                <span className="font-bold text-slate-800 block text-[11px]">Daily Re-verification Quota</span>
                                <span className="text-slate-500 text-[11px]">
                                    {canResubmit 
                                        ? `You have ${remainingAttempts} of 3 attempts remaining for today.`
                                        : "You have used all 3 attempts for today. The quota resets tomorrow at midnight."}
                                </span>
                            </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                            canResubmit ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                        }`}>
                            {remainingAttempts}/3 Left
                        </span>
                    </div>

                    {/* General Error Notice */}
                    {generalError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Form Fields Grid */}
                    <div className="space-y-4">
                        {/* 1. Registered Company Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block" htmlFor="re_company_name">
                                Registered Company / Business Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="re_company_name"
                                    type="text"
                                    value={formData.company_name}
                                    onChange={(e) => handleInputChange("company_name", e.target.value)}
                                    placeholder="Enter Company Name"
                                    disabled={!canResubmit || loading}
                                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                />
                            </div>
                            <InputError message={errors.company_name} className="text-xs" />
                        </div>

                        {/* 2. TIN & Representative Role */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block" htmlFor="re_tin">
                                    Tax Identification Number (TIN) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="re_tin"
                                        type="text"
                                        maxLength={16}
                                        value={formData.tin}
                                        onChange={handleTinChange}
                                        placeholder="Enter Tax Identification Number"
                                        disabled={!canResubmit || loading}
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 block">Must be unique to your verified registered business.</span>
                                <InputError message={errors.tin} className="text-xs" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block" htmlFor="re_role">
                                    Authorized Job Title / Role <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="re_role"
                                        type="text"
                                        value={formData.representative_role}
                                        onChange={(e) => handleInputChange("representative_role", e.target.value)}
                                        placeholder="Enter Job Title / Role"
                                        disabled={!canResubmit || loading}
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <InputError message={errors.representative_role} className="text-xs" />
                            </div>
                        </div>

                        {/* 3. Direct Contact Number */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block" htmlFor="re_contact">
                                Direct Contact / Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="re_contact"
                                    type="tel"
                                    maxLength={20}
                                    value={formData.contact_number}
                                    onChange={(e) => handleInputChange("contact_number", e.target.value)}
                                    placeholder="Enter Contact Number"
                                    disabled={!canResubmit || loading}
                                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                />
                            </div>
                            <InputError message={errors.contact_number} className="text-xs" />
                        </div>

                        {/* 4. Main Operating Address (Geospatial Autocomplete) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                                Main Business Operating Address <span className="text-red-500">*</span>
                            </label>
                            <GeospatialAddressAutocomplete
                                id="re_address"
                                value={formData.address}
                                allowOutsideSave={true}
                                placeholder="Search building, street, or barangay (e.g. Gov. Camins Ave, Baliwasan)..."
                                onChange={(val) => handleInputChange("address", val)}
                                onGeocodeResult={(res) => setGeocodeVerification(res)}
                                error={errors.address}
                            />
                            <InputError message={errors.address} className="text-xs" />
                        </div>

                        {/* 5. Business Permit / Proof Document Upload */}
                        <div className="space-y-2 pt-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                                DTI / SEC Registration or Mayor's Permit <span className="text-slate-400 font-normal lowercase">(optional replacement)</span>
                            </label>

                            {/* Existing Permit Callout if available */}
                            {user.business_permit_url && (
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="text-slate-700 font-medium truncate max-w-xs">
                                            Current document on file
                                        </span>
                                    </div>
                                    <a
                                        href={user.business_permit_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline shrink-0"
                                    >
                                        View Current ↗
                                    </a>
                                </div>
                            )}

                            {/* Upload Dropzone */}
                            <label className={`block border-2 border-dashed rounded-2xl p-4 text-center transition cursor-pointer ${
                                permitFile 
                                    ? "border-emerald-300 bg-emerald-50/50" 
                                    : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                            }`}>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    disabled={!canResubmit || loading}
                                    className="hidden"
                                />
                                <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                                    <Upload className={`w-5 h-5 ${permitFile ? "text-emerald-600" : "text-blue-500"}`} />
                                    {permitFile ? (
                                        <div className="space-y-0.5">
                                            <span className="font-bold text-emerald-900 block text-xs">{permitFileName}</span>
                                            <span className="text-[11px] text-emerald-700">Ready for replacement upload (Click to change)</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            <span className="font-semibold text-slate-700 block text-xs">
                                                Click to upload replacement permit
                                            </span>
                                            <span className="text-[11px] text-slate-400">PDF, JPG, or PNG (Max 5MB)</span>
                                        </div>
                                    )}
                                </div>
                            </label>
                            <InputError message={errors.business_permit} className="text-xs" />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canResubmit || loading}
                            className="px-5 py-2.5 rounded-xl bg-[#14224A] hover:bg-[#1E2F5F] text-white font-bold text-xs shadow-sm hover:shadow transition flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    <span>Submitting Review...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Re-submit for Verification</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
