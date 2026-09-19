import { useEffect, useMemo, useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatCurrency } from "../../utils/superAdmin";

// Fallbacks for initial render
const DEFAULT_BRANDS = [
    "Carrier", "Daikin", "Panasonic", "LG", "Mitsubishi", 
    "Samsung", "Midea", "Kolin", "York", "Haier", "AUX", "Everest", "Other Brand"
];

const DEFAULT_TYPES = [
    { value: "Split", label: "Split-Type (Wall Mounted)", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { value: "Window", label: "Window-Type", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" },
    { value: "Cassette", label: "Ceiling Cassette", icon: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" },
    { value: "Floor Mounted", label: "Floor Mounted Tower", icon: "M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" },
    { value: "Ceiling Suspended", label: "Ceiling Suspended", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" },
];

const TIME_SLOTS = [
    { id: "08:00", label: "08:00 AM – 10:00 AM", period: "Morning Slot" },
    { id: "10:00", label: "10:00 AM – 12:00 PM", period: "Late Morning" },
    { id: "13:00", label: "01:00 PM – 03:00 PM", period: "Early Afternoon" },
    { id: "15:00", label: "03:00 PM – 05:00 PM", period: "Late Afternoon" },
];

export default function BookingWizard({ dashboardData, addToast, onBookingCreated, initialServiceId = null }) {
    const [step, setStep] = useState(1);
    const [services, setServices] = useState(dashboardData?.services ?? []);
    const [unitTypes, setUnitTypes] = useState(dashboardData?.unit_types ?? []);
    const [brands, setBrands] = useState(dashboardData?.brands ?? []);
    const [loadingCatalog, setLoadingCatalog] = useState(!dashboardData?.services?.length);

    // Step 1: Service
    const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId || (dashboardData?.services?.[0]?.service_id ?? 1));

    // Step 2: Details & AC Specs
    const [airconBrand, setAirconBrand] = useState(dashboardData?.unit_detail?.aircon_brand || "Carrier");
    const [airconType, setAirconType] = useState(dashboardData?.unit_detail?.aircon_type || "Split");
    const [unitQuantity, setUnitQuantity] = useState(dashboardData?.unit_detail?.unit_quantity || 1);
    const [serviceAddress, setServiceAddress] = useState(dashboardData?.user?.address || "");
    const [contactNumber, setContactNumber] = useState(dashboardData?.user?.contact_number || "");
    const [notes, setNotes] = useState("");

    // Step 3: Schedule
    const tomorrow = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    }, []);

    const [scheduledDate, setScheduledDate] = useState(tomorrow);
    const [scheduledTime, setScheduledTime] = useState("08:00");

    // Step 4: Payment
    const BOOKING_FEE = 300.00;
    const [servicePaymentMethod, setServicePaymentMethod] = useState("Cash");
    const [refNumber, setRefNumber] = useState("");
    const [senderName, setSenderName] = useState(dashboardData?.user?.full_name || "");
    const [senderNumber, setSenderNumber] = useState(dashboardData?.user?.contact_number || "");
    const [receiptFile, setReceiptFile] = useState(null);
    const [copied, setCopied] = useState(false);

    // Submission
    const [submitting, setSubmitting] = useState(false);

    const gcashAccount = "0917-123-4567";
    const gcashName = "Cooling Tower Airconditioning Services";

    useEffect(() => {
        if (!dashboardData?.services?.length || !dashboardData?.unit_types?.length || !dashboardData?.brands?.length) {
            window.axios.get(CUSTOMER_ENDPOINTS.catalog)
                .then(({ data }) => {
                    const sList = data?.services || [];
                    const uList = data?.unit_types || [];
                    const bList = data?.brands || [];

                    setServices(sList);
                    setUnitTypes(uList);
                    setBrands(bList);

                    if (sList.length && !selectedServiceId) {
                        setSelectedServiceId(sList[0].service_id);
                    }
                    if (bList.length && !airconBrand) {
                        setAirconBrand(bList[0].name);
                    }
                    if (uList.length && !airconType) {
                        setAirconType(uList[0].code || uList[0].name);
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingCatalog(false));
        } else {
            setServices(dashboardData.services);
            setUnitTypes(dashboardData.unit_types);
            setBrands(dashboardData.brands);
        }
    }, [dashboardData, selectedServiceId, airconBrand, airconType]);

    // Active Brand & Type List (with fallbacks if empty)
    const availableBrands = useMemo(() => {
        if (brands && brands.length > 0) {
            return brands.map(b => b.name);
        }
        return DEFAULT_BRANDS;
    }, [brands]);

    const availableUnitTypes = useMemo(() => {
        if (unitTypes && unitTypes.length > 0) {
            return unitTypes.map(u => ({
                value: u.code || u.name,
                label: u.name,
                icon: u.icon || DEFAULT_TYPES[0].icon,
                description: u.description,
            }));
        }
        return DEFAULT_TYPES;
    }, [unitTypes]);

    const currentService = useMemo(() => {
        return services.find(s => Number(s.service_id) === Number(selectedServiceId)) || services[0];
    }, [services, selectedServiceId]);

    const handleCopy = () => {
        navigator.clipboard.writeText("09171234567");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Step Validation
    const canProceedStep1 = Boolean(selectedServiceId);
    const canProceedStep2 = Boolean(airconBrand && airconType && unitQuantity >= 1 && serviceAddress.trim());
    const canProceedStep3 = Boolean(scheduledDate && scheduledTime);
    const canProceedStep4 = Boolean(refNumber.trim() && refNumber.trim().length >= 5 && servicePaymentMethod);

    const handleNext = () => {
        if (step === 1 && !canProceedStep1) {
            addToast("Please choose a service to proceed.", "error");
            return;
        }
        if (step === 2 && !canProceedStep2) {
            addToast("Please fill in your AC unit specs and service address.", "error");
            return;
        }
        if (step === 3 && !canProceedStep3) {
            addToast("Please select your preferred service schedule.", "error");
            return;
        }
        if (step === 4 && !canProceedStep4) {
            addToast("Please provide the GCash reference number and select service payment method.", "error");
            return;
        }
        setStep(s => Math.min(s + 1, 5));
    };

    const handleBack = () => {
        setStep(s => Math.max(s - 1, 1));
    };

    const handleSubmitBooking = async () => {
        setSubmitting(true);
        const combinedDateTime = `${scheduledDate} ${scheduledTime}:00`;

        const formData = new FormData();
        formData.append("service_id", selectedServiceId);
        formData.append("aircon_brand", airconBrand);
        formData.append("aircon_type", airconType);
        formData.append("unit_quantity", unitQuantity);
        formData.append("scheduled_date", combinedDateTime);
        formData.append("service_payment_method", servicePaymentMethod);
        formData.append("booking_fee", BOOKING_FEE);
        formData.append("reference_number", refNumber.trim());
        if (senderName.trim()) formData.append("sender_name", senderName.trim());
        if (senderNumber.trim()) formData.append("sender_number", senderNumber.trim());
        if (serviceAddress.trim()) formData.append("service_address", serviceAddress.trim());
        if (notes.trim()) formData.append("notes", notes.trim());
        if (receiptFile) formData.append("receipt_image", receiptFile);

        try {
            const { data } = await window.axios.post(CUSTOMER_ENDPOINTS.storeBooking, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            addToast(data.message || "Booking submitted successfully!", "success");
            if (onBookingCreated) {
                onBookingCreated(data.booking_id);
            }
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to submit booking. Please check your inputs."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { num: 1, label: "Select Service" },
        { num: 2, label: "Unit & Details" },
        { num: 3, label: "Set Schedule" },
        { num: 4, label: "GCash Booking Fee" },
        { num: 5, label: "Review & Confirm" },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#1E2F5F] via-[#243B73] to-[#162347] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider mb-3">
                        Seamless 5-Step Booking
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Book an Airconditioning Service
                    </h1>
                    <p className="mt-2 text-sm text-blue-100/90 leading-relaxed">
                        Select your cooling service, configure unit specifications, pick a convenient schedule, and secure your booking with our GCash confirmation fee.
                    </p>
                </div>
                {/* Decorative glow */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
            </div>

            {/* Stepper Bar */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 w-full z-0" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0"
                        style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    />
                    {steps.map((s) => {
                        const isCompleted = step > s.num;
                        const isCurrent = step === s.num;
                        return (
                            <button
                                key={s.num}
                                onClick={() => {
                                    if (isCompleted) setStep(s.num);
                                }}
                                disabled={!isCompleted}
                                className={`relative z-10 flex flex-col items-center group transition focus:outline-none ${
                                    isCompleted ? "cursor-pointer" : "cursor-default"
                                }`}
                            >
                                <div
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all shadow-sm ${
                                        isCompleted
                                            ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                            : isCurrent
                                            ? "bg-[#1E2F5F] text-white ring-4 ring-indigo-100 scale-110"
                                            : "bg-gray-100 text-gray-400 border border-gray-200"
                                    }`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        s.num
                                    )}
                                </div>
                                <span
                                    className={`hidden sm:block text-xs font-semibold mt-2 whitespace-nowrap ${
                                        isCurrent ? "text-blue-900 font-bold" : isCompleted ? "text-gray-700" : "text-gray-400"
                                    }`}
                                >
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Step Content Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                {/* ── STEP 1: SERVICE SELECTION ── */}
                {step === 1 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-bold text-gray-900">Step 1: Choose Your Required Service</h2>
                            <p className="text-xs text-gray-500 mt-1">Select from our certified airconditioning maintenance, cleaning, repair, and installation packages.</p>
                        </div>

                        {loadingCatalog ? (
                            <div className="py-12 text-center text-gray-400">Loading available services...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {services.map((srv) => {
                                    const isSelected = Number(selectedServiceId) === Number(srv.service_id);
                                    return (
                                        <div
                                            key={srv.service_id}
                                            onClick={() => setSelectedServiceId(srv.service_id)}
                                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                                                isSelected
                                                    ? "border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/10"
                                                    : "border-gray-200/80 hover:border-blue-300 hover:bg-gray-50/60"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-base font-bold text-gray-900 leading-snug">{srv.service_name}</h3>
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition ${
                                                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                                                    }`}>
                                                        {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{srv.description}</p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Starting Rate</span>
                                                <span className="text-base font-extrabold text-blue-700">
                                                    {formatCurrency(srv.base_price)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 2: UNIT & LOCATION DETAILS ── */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-bold text-gray-900">Step 2: Aircon Specifications & Location Details</h2>
                            <p className="text-xs text-gray-500 mt-1">Specify your AC unit brand, mounting type, quantity, and service address.</p>
                        </div>

                        {/* Selected Service Card Brief */}
                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Selected Service</span>
                                <h4 className="text-sm font-bold text-gray-900">{currentService?.service_name}</h4>
                            </div>
                            <span className="text-sm font-extrabold text-blue-700">{formatCurrency(currentService?.base_price)}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* AC Brand */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Aircon Brand <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={airconBrand}
                                    onChange={(e) => setAirconBrand(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                >
                                    {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>

                            {/* Unit Quantity */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Number of Units <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setUnitQuantity(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 text-lg transition flex items-center justify-center"
                                    >
                                        −
                                    </button>
                                    <span className="w-12 text-center text-base font-bold text-gray-800">{unitQuantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setUnitQuantity(q => Math.min(20, q + 1))}
                                        className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 text-lg transition flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                    <span className="text-xs text-gray-500">unit(s)</span>
                                </div>
                            </div>
                        </div>

                        {/* AC Type Selector */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Aircon Unit Type <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {availableUnitTypes.map((t) => {
                                    const isSel = airconType === t.value;
                                    return (
                                        <div
                                            key={t.value}
                                            onClick={() => setAirconType(t.value)}
                                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${
                                                isSel ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold" : "border-gray-200 hover:border-blue-200 text-gray-700"
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSel ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon} /></svg>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold block leading-snug">{t.label}</span>
                                                {t.description && (
                                                    <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{t.description}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Address & Contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Service Address / Unit Location <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={serviceAddress}
                                    onChange={(e) => setServiceAddress(e.target.value)}
                                    placeholder="Enter complete building / house number, street, barangay, city..."
                                    required
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Contact Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    placeholder="09XX XXX XXXX"
                                    required
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition mb-3"
                                />

                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Special Notes / Symptoms (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Water leaking, Not cooling, Noisy fan, Freon check"
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: SCHEDULING (CRUCIAL STEP) ── */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-bold text-gray-900">Step 3: Set Your Availability & Schedule</h2>
                            <p className="text-xs text-gray-500 mt-1">Please select the service date and your preferred time window before proceeding to the booking fee payment.</p>
                        </div>

                        {/* Crucial Notice Alert */}
                        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Mandatory Scheduling Step</h4>
                                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                    Our technicians operate on guaranteed reservation windows. Your requested slot will be assigned to a specialized technician upon manager approval.
                                </p>
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Select Preferred Service Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                min={tomorrow}
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                required
                                className="w-full sm:w-80 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>

                        {/* Time Slot Selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Select Service Arrival Window <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {TIME_SLOTS.map((slot) => {
                                    const isSel = scheduledTime === slot.id;
                                    return (
                                        <div
                                            key={slot.id}
                                            onClick={() => setScheduledTime(slot.id)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                                                isSel
                                                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                                                    : "border-gray-200 hover:border-blue-200 bg-white"
                                            }`}
                                        >
                                            <div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">{slot.period}</span>
                                                <span className="text-sm font-bold text-gray-800">{slot.label}</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                isSel ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                                            }`}>
                                                {isSel && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: PAYMENT SYSTEM ── */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-bold text-gray-900">Step 4: Payment System & Booking Confirmation Fee</h2>
                            <p className="text-xs text-gray-500 mt-1">Submit your GCash booking fee and choose your payment method for the service balance.</p>
                        </div>

                        {/* GCash Booking Fee Card */}
                        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                                        Mandatory Confirmation Fee
                                    </span>
                                    <h3 className="text-xl font-bold mt-1 text-white">GCash Express Send: ₱{BOOKING_FEE.toFixed(2)}</h3>
                                    <p className="text-xs text-blue-200/80 mt-0.5">Deductible from total service price upon final completion.</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center gap-3 self-start sm:self-auto">
                                    <div>
                                        <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">GCash Express Send No.</p>
                                        <p className="text-base font-bold font-mono tracking-wider text-white mt-0.5">{gcashAccount}</p>
                                        <p className="text-[10px] text-blue-300 font-medium">{gcashName}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition shrink-0"
                                    >
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-100/80">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Open your GCash App &gt; Tap "Express Send"</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Send ₱300.00 to {gcashAccount}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Copy the 13-digit Reference No.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Input reference details below</span>
                                </div>
                            </div>
                        </div>

                        {/* GCash Verification Form */}
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Enter GCash Transaction Proof <span className="text-red-500">*</span>
                            </h4>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    GCash Reference Number (13 digits) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1002345678901"
                                    value={refNumber}
                                    onChange={(e) => setRefNumber(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Sender Account Name</label>
                                    <input
                                        type="text"
                                        placeholder="Your GCash account name"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Sender Contact Number</label>
                                    <input
                                        type="text"
                                        placeholder="09XX XXX XXXX"
                                        value={senderNumber}
                                        onChange={(e) => setSenderNumber(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Upload Receipt Screenshot (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Preferred Service Payment Method */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Remaining Service Payment Method (Paid upon completion) <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div
                                    onClick={() => setServicePaymentMethod("Cash")}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center gap-3.5 ${
                                        servicePaymentMethod === "Cash" ? "border-blue-600 bg-blue-50/50 shadow-sm" : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
                                        ₱ Cash
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Cash on Service</p>
                                        <p className="text-xs text-gray-500">Pay cash directly to our technician upon completion.</p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setServicePaymentMethod("GCash")}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center gap-3.5 ${
                                        servicePaymentMethod === "GCash" ? "border-blue-600 bg-blue-50/50 shadow-sm" : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                                        GCash
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">GCash Transfer</p>
                                        <p className="text-xs text-gray-500">Pay remaining balance via GCash upon job sign-off.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 5: REVIEW & CONFIRMATION ── */}
                {step === 5 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-bold text-gray-900">Step 5: Review & Submit Service Request</h2>
                            <p className="text-xs text-gray-500 mt-1">Please review your booking details before submitting. Your request will be recorded with Pending status for technician dispatch.</p>
                        </div>

                        {/* Summary Grid */}
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/80 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                <div>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Service Selected</span>
                                    <h4 className="text-base font-extrabold text-gray-900">{currentService?.service_name}</h4>
                                </div>
                                <span className="text-lg font-extrabold text-blue-700">{formatCurrency(currentService?.base_price)}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Aircon Unit</p>
                                    <p className="font-bold text-gray-800 mt-0.5">{airconBrand} ({airconType})</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Unit Quantity</p>
                                    <p className="font-bold text-gray-800 mt-0.5">{unitQuantity} Unit(s)</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Scheduled Date & Time</p>
                                    <p className="font-bold text-gray-800 mt-0.5">{scheduledDate} at {scheduledTime}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Service Address</p>
                                    <p className="font-bold text-gray-800 mt-0.5">{serviceAddress}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">GCash Fee Ref #</p>
                                    <p className="font-mono font-bold text-blue-700 mt-0.5">{refNumber}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Service Balance Method</p>
                                    <p className="font-bold text-emerald-700 mt-0.5">{servicePaymentMethod}</p>
                                </div>
                            </div>

                            {notes && (
                                <div className="border-t border-gray-200 pt-3 text-xs">
                                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer Notes</p>
                                    <p className="text-gray-700 mt-0.5 italic">{notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Status Notice */}
                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-xs text-blue-900">
                            <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Upon submission, your booking will be marked as <strong>Pending</strong>. Our manager will review the details and assign a certified technician.</span>
                        </div>
                    </div>
                )}

                {/* Footer Navigation Buttons */}
                <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 5 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
                        >
                            Next Step
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmitBooking}
                            disabled={submitting}
                            className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-extrabold shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Submitting Booking...
                                </>
                            ) : (
                                <>
                                    Confirm & Submit Booking
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
