import { useEffect, useMemo, useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage, formatDateTime } from "../../utils/superAdmin";
import { resolveScheduleSlots, formatTime24To12 } from "../../utils/bookingSchedule";

// Fallback primary services if catalog fetch is delayed
const DEFAULT_PRIMARY_SERVICES = [
    {
        service_id: 14,
        service_name: "Installation",
        category: "Installation",
        description: "For new air-conditioning unit installation, replacement, or relocation.",
        icon: "installation",
    },
    {
        service_id: 15,
        service_name: "Repair / Check-up",
        category: "Repair",
        description: "For air-conditioning problems, troubleshooting, inspection, diagnosis, and repair requests.",
        icon: "repair",
    },
    {
        service_id: 16,
        service_name: "Cleaning / Preventive Maintenance",
        category: "Maintenance",
        description: "For regular cleaning, deep cleaning, and preventive maintenance of your air-conditioning unit.",
        icon: "cleaning",
    },
];

// Fallback 9 visual aircon unit types
const DEFAULT_UNIT_TYPES = [
    {
        id: 1,
        code: "Wall-Mounted Split Type",
        label: "Wall-Mounted Split Type",
        description: "Common residential and small commercial split-type unit.",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
        id: 2,
        code: "Window Type",
        label: "Window Type",
        description: "Self-contained air-conditioning unit installed in a window or wall opening.",
        icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z",
    },
    {
        id: 3,
        code: "Floor-Mounted",
        label: "Floor-Mounted",
        description: "Floor-standing air-conditioning unit.",
        icon: "M9 3v18m6-18v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
    },
    {
        id: 4,
        code: "Ceiling Cassette",
        label: "Ceiling Cassette",
        description: "Ceiling-mounted cassette type air-conditioning unit.",
        icon: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z",
    },
    {
        id: 5,
        code: "Ceiling Suspended",
        label: "Ceiling Suspended",
        description: "Ceiling-suspended air-conditioning unit.",
        icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8",
    },
    {
        id: 6,
        code: "Ducted / Concealed",
        label: "Ducted / Concealed",
        description: "Air-conditioning system with concealed indoor unit and ductwork.",
        icon: "M3 7h18M3 12h18M3 17h18",
    },
    {
        id: 7,
        code: "Central / Package Unit",
        label: "Central / Package Unit",
        description: "Larger centralized or packaged air-conditioning system.",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    },
    {
        id: 8,
        code: "VRF / VRV System",
        label: "VRF / VRV System",
        description: "Multi-unit air-conditioning system commonly used in commercial buildings.",
        icon: "M4 4h7v7H4V4zm9 0h7v7h-7V4zm0 9h7v7h-7v-7zm-9 0h7v7H4v-7z",
    },
    {
        id: 9,
        code: "Other / Not Sure",
        label: "Other / Not Sure",
        description: "I’m not sure what type of unit I have.",
        icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
];

const DEFAULT_BRANDS = [
    "Samsung", "LG", "Panasonic", "Carrier", "Daikin",
    "Mitsubishi", "Condura", "Kolin", "Fujitsu", "Other"
];

const HP_OPTIONS = [
    "0.5 HP", "0.75 HP", "1.0 HP", "1.5 HP", "2.0 HP",
    "2.5 HP", "3.0 HP", "4.0 HP", "5.0 HP", "Not Sure"
];

const COMMERCIAL_CAPACITIES = [
    "1.0 TR", "1.5 TR", "2.0 TR", "2.5 TR", "3.0 TR",
    "4.0 TR", "5.0 TR", "10.0+ TR", "BTU Capacity", "Not Sure"
];



const REPAIR_PROBLEMS = [
    "Not Cooling",
    "Weak Cooling",
    "Water Leaking",
    "Ice Forming",
    "Unusual Noise",
    "Bad Smell",
    "Unit Not Turning On",
    "Remote / Control Problem",
    "Electrical Issue",
    "Error Code",
    "Other",
];

const CLEANING_TYPES = [
    "Basic Cleaning",
    "Deep Cleaning",
    "Chemical Cleaning",
    "Preventive Maintenance",
    "Not Sure — Let Technician Assess",
];

const CLEANING_INTERVALS = [
    "Less than 3 months ago",
    "3–6 months ago",
    "6–12 months ago",
    "More than 1 year ago",
    "Not Sure",
];

export default function BookingWizard({ dashboardData, addToast, onBookingCreated, initialServiceId = null }) {
    const [step, setStep] = useState(1);
    const [services, setServices] = useState([]);
    const [unitTypes, setUnitTypes] = useState(DEFAULT_UNIT_TYPES);
    const [brands, setBrands] = useState(DEFAULT_BRANDS);
    const [policyData, setPolicyData] = useState(null);
    const [scheduleConfig, setScheduleConfig] = useState(null);
    const [loadingCatalog, setLoadingCatalog] = useState(true);

    // Step 1: Selected Service Category
    const [selectedServiceId, setSelectedServiceId] = useState(null);

    // Step 2: Multi-Unit Management
    const [units, setUnits] = useState([
        {
            id: 1,
            unit_type: "Wall-Mounted Split Type",
            brand: "Carrier",
            other_brand: "",
            model_number: "",
            capacity_type: "hp", // "hp" or "commercial"
            capacity: "1.5 HP",
            quantity: 1,
            issue: "",
            unit_notes: "",
            not_sure_description: "",
            photo: null,
            photo_preview: null,
        },
    ]);
    const [editingUnitIndex, setEditingUnitIndex] = useState(0);
    const [showUnitFormModal, setShowUnitFormModal] = useState(false);

    const totalUnitsCount = useMemo(() => {
        return units.reduce((sum, u) => sum + (parseInt(u.quantity, 10) || 1), 0);
    }, [units]);

    // Current unit form buffer for editing/adding
    const [activeUnitForm, setActiveUnitForm] = useState({
        unit_type: "Wall-Mounted Split Type",
        brand: "Carrier",
        other_brand: "",
        model_number: "",
        capacity_type: "hp",
        capacity: "1.5 HP",
        quantity: 1,
        issue: "",
        unit_notes: "",
        not_sure_description: "",
        photo: null,
        photo_preview: null,
    });

    // Step 2: Service-Specific Questions
    // Installation Specifics
    const [installDetails, setInstallDetails] = useState({
        install_type: "New Installation",
        unit_available: "Yes",
        location_type: "Residential",
        floor_level: "1st Floor / Ground",
        electrical_available: "Yes",
        piping_available: "Yes",
        drain_line_available: "Yes",
        install_notes: "",
        area_photo: null,
        area_photo_preview: null,
    });

    // Repair Specifics
    const [repairDetails, setRepairDetails] = useState({
        problems: ["Not Cooling"],
        description: "",
        error_code: "",
        media_file: null,
        media_preview: null,
    });

    // Cleaning Specifics
    const [cleaningDetails, setCleaningDetails] = useState({
        service_type: "Deep Cleaning",
        last_cleaned: "3–6 months ago",
        notes: "",
    });

    // Location & Contact
    const [serviceAddress, setServiceAddress] = useState(dashboardData?.user?.address || "");
    const [contactNumber, setContactNumber] = useState(dashboardData?.user?.contact_number || "");
    const [generalNotes, setGeneralNotes] = useState("");

    // Step 3: Scheduling
    const tomorrow = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    }, []);

    const [scheduledDate, setScheduledDate] = useState(tomorrow);
    const [scheduledTime, setScheduledTime] = useState("08:00");
    const [enableAlternativeSchedule, setEnableAlternativeSchedule] = useState(false);
    const [altDate, setAltDate] = useState("");
    const [altTime, setAltTime] = useState("08:30");

    // Dynamic 30-minute interval slots & rate classification from config
    const scheduleSlotsData = useMemo(() => {
        return resolveScheduleSlots(scheduleConfig);
    }, [scheduleConfig]);

    const activeRateInfo = useMemo(() => {
        return scheduleSlotsData.classifyTime(scheduledTime);
    }, [scheduleSlotsData, scheduledTime]);

    // Step 4: Appointment Reservation Fee & GCash Payment
    const BOOKING_FEE = 300.00;
    const [refNumber, setRefNumber] = useState("");
    const [senderName, setSenderName] = useState(dashboardData?.user?.full_name || "");
    const [senderNumber, setSenderNumber] = useState(dashboardData?.user?.contact_number || "");
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [servicePaymentMethod, setServicePaymentMethod] = useState("Cash");
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const [copied, setCopied] = useState(false);

    // Step 5: Final Acknowledgement
    const [finalAcknowledged, setFinalAcknowledged] = useState(false);

    // Submission & Confirmation state
    const [submitting, setSubmitting] = useState(false);
    const [submittedBooking, setSubmittedBooking] = useState(null);

    const gcashAccount = policyData?.gcash_account || "0917-123-4567";
    const gcashName = policyData?.gcash_name || "Cooling Tower Airconditioning Services";

    // Load Catalog Data
    useEffect(() => {
        window.axios.get(CUSTOMER_ENDPOINTS.catalog)
            .then(({ data }) => {
                const sList = data?.services && data.services.length > 0 ? data.services : DEFAULT_PRIMARY_SERVICES;
                setServices(sList);
                if (data?.unit_types?.length) {
                    setUnitTypes(data.unit_types);
                }
                if (data?.brands?.length) {
                    setBrands(data.brands);
                }
                if (data?.policy) {
                    setPolicyData(data.policy);
                }
                if (data?.schedule_config) {
                    setScheduleConfig(data.schedule_config);
                }

                // Default initial service selection
                if (initialServiceId) {
                    const match = sList.find(s => Number(s.service_id) === Number(initialServiceId));
                    setSelectedServiceId(match ? match.service_id : sList[0]?.service_id);
                } else if (!selectedServiceId && sList.length > 0) {
                    setSelectedServiceId(sList[0].service_id);
                }
            })
            .catch(() => {
                setServices(DEFAULT_PRIMARY_SERVICES);
                setSelectedServiceId(DEFAULT_PRIMARY_SERVICES[0].service_id);
            })
            .finally(() => setLoadingCatalog(false));
    }, [initialServiceId]);

    // Active Service
    const currentService = useMemo(() => {
        return services.find(s => Number(s.service_id) === Number(selectedServiceId)) || services[0] || DEFAULT_PRIMARY_SERVICES[0];
    }, [services, selectedServiceId]);

    const serviceCategory = useMemo(() => {
        const name = (currentService?.service_name || "").toLowerCase();
        if (name.includes("install")) return "installation";
        if (name.includes("repair") || name.includes("check")) return "repair";
        return "cleaning";
    }, [currentService]);

    const handleCopyGCash = () => {
        navigator.clipboard.writeText("09171234567");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Unit Management handlers
    const openAddUnitModal = () => {
        setActiveUnitForm({
            unit_type: "Wall-Mounted Split Type",
            brand: "Carrier",
            other_brand: "",
            model_number: "",
            capacity_type: "hp",
            capacity: "1.5 HP",
            quantity: 1,
            issue: "",
            unit_notes: "",
            not_sure_description: "",
            photo: null,
            photo_preview: null,
        });
        setEditingUnitIndex(-1); // -1 signifies adding new unit
        setShowUnitFormModal(true);
    };

    const openEditUnitModal = (index) => {
        setActiveUnitForm({ ...units[index] });
        setEditingUnitIndex(index);
        setShowUnitFormModal(true);
    };

    const handleSaveUnit = () => {
        if (!activeUnitForm.unit_type) {
            addToast("Please choose the unit type.", "error");
            return;
        }
        if (activeUnitForm.brand === "Other" && !activeUnitForm.other_brand.trim()) {
            addToast("Please specify the aircon brand.", "error");
            return;
        }

        if (editingUnitIndex >= 0) {
            const updated = [...units];
            updated[editingUnitIndex] = { ...activeUnitForm, id: units[editingUnitIndex].id };
            setUnits(updated);
            addToast(`Unit ${editingUnitIndex + 1} updated!`, "success");
        } else {
            setUnits([...units, { ...activeUnitForm, id: Date.now() }]);
            addToast(`Unit ${units.length + 1} added!`, "success");
        }
        setShowUnitFormModal(false);
    };

    const handleRemoveUnit = (index) => {
        if (units.length <= 1) {
            addToast("Your booking must have at least one aircon unit.", "error");
            return;
        }
        const updated = units.filter((_, i) => i !== index);
        setUnits(updated);
        addToast(`Unit ${index + 1} removed.`, "info");
    };

    // Repair problems toggle
    const handleToggleProblem = (p) => {
        setRepairDetails(prev => {
            const exists = prev.problems.includes(p);
            const updated = exists ? prev.problems.filter(item => item !== p) : [...prev.problems, p];
            return { ...prev, problems: updated };
        });
    };

    // Step Validation
    const canProceedStep1 = Boolean(selectedServiceId);
    const canProceedStep2 = Boolean(
        units.length > 0 &&
        serviceAddress.trim().length >= 5 &&
        contactNumber.trim().length >= 7
    );
    const canProceedStep3 = Boolean(scheduledDate && scheduledTime);
    const canProceedStep4 = Boolean(
        refNumber.trim().length >= 5 &&
        policyAccepted &&
        servicePaymentMethod
    );
    const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3 && canProceedStep4 && finalAcknowledged;

    const handleNext = () => {
        if (step === 1 && !canProceedStep1) {
            addToast("Please choose one of the three service categories to proceed.", "error");
            return;
        }
        if (step === 2) {
            if (units.length === 0) {
                addToast("Please add at least one aircon unit to your request.", "error");
                return;
            }
            if (!serviceAddress.trim()) {
                addToast("Please enter your complete service address.", "error");
                return;
            }
            if (!contactNumber.trim()) {
                addToast("Please enter your contact number.", "error");
                return;
            }
        }
        if (step === 3 && !canProceedStep3) {
            addToast("Please select your preferred service date and arrival window.", "error");
            return;
        }
        if (step === 4) {
            if (!refNumber.trim() || refNumber.trim().length < 5) {
                addToast("Please enter your 13-digit GCash reference number.", "error");
                return;
            }
            if (!policyAccepted) {
                addToast("Please acknowledge the appointment reservation fee policy.", "error");
                return;
            }
        }
        setStep(s => Math.min(s + 1, 5));
    };

    const handleBack = () => {
        setStep(s => Math.max(s - 1, 1));
    };

    const handleSubmitBooking = async () => {
        if (!canSubmit) {
            addToast("Please complete all required fields and accept the confirmation checkbox.", "error");
            return;
        }

        setSubmitting(true);
        const selectedSlot = scheduleSlotsData.findSlot(scheduledTime);
        const preferredArrivalLabel = selectedSlot?.label || formatTime24To12(scheduledTime);
        const isDifferential = Boolean(selectedSlot?.is_differential);
        const rateTypeLabel = isDifferential ? "Differential Rate" : "Regular Rate";

        // Store exact timestamp
        const timePart = scheduledTime.length === 5 ? `${scheduledTime}:00` : "08:00:00";
        const combinedDateTime = `${scheduledDate} ${timePart}`;

        const altSlot = scheduleSlotsData.findSlot(altTime);
        const altArrivalLabel = altSlot?.label || formatTime24To12(altTime);
        const altDateTimeStr = enableAlternativeSchedule && altDate
            ? `${altDate} at ${altArrivalLabel}${altSlot ? ` (${altSlot.is_differential ? 'Differential Rate' : 'Regular Rate'})` : ''}`
            : null;

        // Compile service-specific questionnaire
        let serviceQuestions = {};
        if (serviceCategory === "installation") {
            serviceQuestions = { ...installDetails, category: "Installation" };
        } else if (serviceCategory === "repair") {
            serviceQuestions = { ...repairDetails, category: "Repair / Check-up" };
        } else {
            serviceQuestions = { ...cleaningDetails, category: "Cleaning / Preventive Maintenance" };
        }

        // Attach exact arrival time & rate metadata to service questions
        serviceQuestions.preferred_arrival_time = preferredArrivalLabel;
        serviceQuestions.preferred_arrival_time_raw = scheduledTime;
        serviceQuestions.rate_type = rateTypeLabel;
        serviceQuestions.is_differential = isDifferential;

        // Clean units array for JSON payload
        const cleanUnits = units.map(u => ({
            unit_type: u.unit_type,
            brand: u.brand === "Other" ? u.other_brand : u.brand,
            other_brand: u.other_brand || null,
            model_number: u.model_number || null,
            capacity_type: u.capacity_type,
            capacity: u.capacity,
            quantity: u.quantity || 1,
            issue: u.issue || null,
            unit_notes: u.unit_notes || null,
            not_sure_description: u.not_sure_description || null,
        }));

        const formData = new FormData();
        formData.append("service_id", selectedServiceId);
        formData.append("scheduled_date", combinedDateTime);
        formData.append("preferred_arrival_time", preferredArrivalLabel);
        formData.append("rate_type", rateTypeLabel);
        formData.append("is_differential", isDifferential ? "1" : "0");
        if (altDateTimeStr) {
            formData.append("alternative_schedule", altDateTimeStr);
        }
        formData.append("service_payment_method", servicePaymentMethod);
        formData.append("booking_fee", BOOKING_FEE);
        formData.append("reference_number", refNumber.trim());
        if (senderName.trim()) formData.append("sender_name", senderName.trim());
        if (senderNumber.trim()) formData.append("sender_number", senderNumber.trim());
        formData.append("service_address", serviceAddress.trim());
        formData.append("contact_number", contactNumber.trim());
        if (generalNotes.trim()) formData.append("notes", generalNotes.trim());
        if (receiptFile) formData.append("receipt_image", receiptFile);
        formData.append("policy_acknowledged", "1");

        // Send structured unit & service details
        formData.append("units", JSON.stringify(cleanUnits));
        formData.append("service_details", JSON.stringify(serviceQuestions));

        // Fallbacks for backward compatibility
        formData.append("aircon_brand", cleanUnits[0]?.brand || "Carrier");
        formData.append("aircon_type", cleanUnits[0]?.unit_type || "Wall-Mounted Split Type");
        const totalUnitQuantity = cleanUnits.reduce((sum, u) => sum + (parseInt(u.quantity, 10) || 1), 0);
        formData.append("unit_quantity", totalUnitQuantity);

        try {
            const { data } = await window.axios.post(CUSTOMER_ENDPOINTS.storeBooking, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            addToast(data.message || "Service request submitted successfully!", "success");
            setSubmittedBooking({
                booking_id: data.booking_id,
                service_name: currentService.service_name,
                scheduled_date: `${scheduledDate} at ${preferredArrivalLabel}`,
                preferred_arrival_time: preferredArrivalLabel,
                rate_type: rateTypeLabel,
                is_differential: isDifferential,
                units_count: totalUnitQuantity,
                units: cleanUnits,
                ref_number: refNumber.trim(),
                booking_fee: BOOKING_FEE,
            });

            if (onBookingCreated) {
                onBookingCreated(data.booking_id);
            }
        } catch (error) {
            addToast(extractErrorMessage(error, "Failed to submit service request. Please review your inputs."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { num: 1, label: "Select Service" },
        { num: 2, label: "Unit & Service Details" },
        { num: 3, label: "Preferred Schedule" },
        { num: 4, label: "Reservation Fee" },
        { num: 5, label: "Review & Confirm" },
    ];

    // ── POST-SUBMISSION CONFIRMATION VIEW ────────────────────────────────────
    if (submittedBooking) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100 text-center space-y-6">
                    {/* Success Icon */}
                    <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-100 shadow-inner">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                            Booking Reference #{submittedBooking.booking_id}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                            Service Request Submitted
                        </h1>
                        <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
                            Thank you! Your service request has been received. Our team will review your unit details, assess your requirements, and issue an official quotation for your review before the service proceeds.
                        </p>
                    </div>

                    {/* Request Summary Box */}
                    <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 text-left space-y-4 max-w-xl mx-auto text-xs">
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                            <div>
                                <span className="font-semibold text-gray-400 uppercase text-[10px]">Service Requested</span>
                                <p className="font-bold text-gray-900 text-sm mt-0.5">{submittedBooking.service_name}</p>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-400 uppercase text-[10px]">Aircon Units Count</span>
                                <p className="font-bold text-gray-900 text-sm mt-0.5">{submittedBooking.units_count} Unit(s)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                            <div>
                                <span className="font-semibold text-gray-400 uppercase text-[10px]">Preferred Schedule</span>
                                <p className="font-bold text-gray-800 mt-0.5">{submittedBooking.scheduled_date}</p>
                                {submittedBooking.rate_type && (
                                    <p className={`text-[11px] font-bold mt-1 flex items-center gap-1.5 ${
                                        submittedBooking.is_differential ? "text-amber-800" : "text-emerald-700"
                                    }`}>
                                        {submittedBooking.is_differential ? (
                                            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                        <span>{submittedBooking.rate_type}</span>
                                    </p>
                                )}
                            </div>
                            <div>
                                <span className="font-semibold text-gray-400 uppercase text-[10px]">Reservation Fee Status</span>
                                <p className="font-bold text-emerald-700 mt-0.5">₱300.00 Paid (Ref: {submittedBooking.ref_number})</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div>
                                <span className="font-semibold text-gray-400 uppercase text-[10px]">Quotation Status</span>
                                <p className="font-bold text-amber-600 mt-0.5 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                    Pending Assessment & Preparation
                                </p>
                            </div>
                            <span className="text-[11px] text-gray-500 italic">No initial service prices charged</span>
                        </div>
                    </div>

                    {/* Operational Lifecycle Pipeline */}
                    <div className="border-t border-gray-100 pt-6 max-w-xl mx-auto space-y-3">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider text-left">
                            Service Workflow & Next Steps:
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left text-[11px]">
                            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                                <span className="font-extrabold block text-blue-700">1. Request</span>
                                <span>Submitted</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                                <span className="font-extrabold block text-amber-700">2. Assessment</span>
                                <span>In Review</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600">
                                <span className="font-bold block">3. Quotation</span>
                                <span>Customer Agrees</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600">
                                <span className="font-bold block">4. Service & SOA</span>
                                <span>Execution</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1E2F5F] hover:bg-[#253970] text-white text-xs font-bold shadow-md transition"
                        >
                            View in My Bookings
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSubmittedBooking(null);
                                setStep(1);
                            }}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition"
                        >
                            Submit Another Request
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#1E2F5F] via-[#243B73] to-[#162347] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider mb-3">
                        Official Service Request
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Book an Air-Conditioning Service
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                        Submit your service requirements, customize aircon units, set your preferred schedule, and secure priority technician dispatch with an appointment reservation fee.
                    </p>
                </div>
                {/* Decorative glow */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
            </div>

            {/* Crucial Notice: Service Request & Official Quotation Workflow */}
            <div className="bg-blue-50/90 border border-blue-200/90 rounded-2xl p-4 sm:p-4.5 flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-xs text-blue-950 leading-relaxed">
                    <span className="font-extrabold uppercase tracking-wide text-blue-900 block text-[11px] mb-0.5">
                        Important Notice: Service Request & Assessment Model
                    </span>
                    <span>
                        Your booking is a <strong>service request</strong> and appointment reservation. Final charges will be based on the actual service requirements, physical assessment, parts, materials, and labor. An <strong>official quotation</strong> will be provided for your review and approval before the service proceeds.
                    </span>
                </div>
            </div>

            {/* 5-Step Stepper Bar */}
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
                {/* ══════════════════════════════════════════════════════════════════
                    STEP 1: SELECT SERVICE (3 CORE CATEGORIES ONLY, NO PRICES)
                ══════════════════════════════════════════════════════════════════ */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Step 1 of 5</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-0.5">What service do you need?</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Choose one of our three primary air-conditioning service categories. Pricing and required materials will be determined through an official quotation.
                            </p>
                        </div>

                        {loadingCatalog ? (
                            <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Loading services...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {services.map((srv) => {
                                    const isSelected = Number(selectedServiceId) === Number(srv.service_id);
                                    const sName = srv.service_name;
                                    const isInstall = sName.toLowerCase().includes("install");
                                    const isRepair = sName.toLowerCase().includes("repair") || sName.toLowerCase().includes("check");

                                    return (
                                        <div
                                            key={srv.service_id}
                                            onClick={() => setSelectedServiceId(srv.service_id)}
                                            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between group ${
                                                isSelected
                                                    ? "border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/10 scale-[1.01]"
                                                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50/60"
                                            }`}
                                        >
                                            <div>
                                                {/* Header & Icon */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition ${
                                                        isSelected ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-blue-50 text-blue-700"
                                                    }`}>
                                                        {isInstall ? (
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                            </svg>
                                                        ) : isRepair ? (
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition ${
                                                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                                                    }`}>
                                                        {isSelected && (
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>

                                                <h3 className="text-base font-extrabold text-gray-900 mt-4 leading-snug">{srv.service_name}</h3>
                                                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{srv.description}</p>
                                            </div>

                                            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                                <span className="font-semibold text-gray-400">Pricing Model</span>
                                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                                    Official Quotation
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    STEP 2: UNIT & SERVICE DETAILS (MULTI-UNIT & DYNAMIC FORM)
                ══════════════════════════════════════════════════════════════════ */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Step 2 of 5</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-0.5">Aircon Units & Service Requirements</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Add all aircon units requiring service and complete the service-specific questionnaire.
                            </p>
                        </div>

                        {/* Selected Service Brief Banner */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                    <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </span>
                                <div>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Requested Service Category</span>
                                    <h4 className="text-sm font-extrabold text-gray-900">{currentService?.service_name}</h4>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-3 py-1 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold transition"
                            >
                                Change
                            </button>
                        </div>

                        {/* SECTION A: MULTIPLE AIRCON UNITS LIST */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900">Configured Aircon Units ({totalUnitsCount} {totalUnitsCount === 1 ? "Unit" : "Units"})</h3>
                                    <p className="text-xs text-gray-500">Each unit includes its brand, type, horsepower, and specific issue.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={openAddUnitModal}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                                >
                                    <span>+</span>
                                    <span>Add Another Unit</span>
                                </button>
                            </div>

                            {/* Units Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {units.map((u, index) => {
                                    const qty = parseInt(u.quantity, 10) || 1;
                                    return (
                                        <div
                                            key={u.id || index}
                                            className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 hover:border-blue-300 transition space-y-3 relative group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center">
                                                        #{index + 1}
                                                    </span>
                                                    <div>
                                                        <h4 className="text-xs font-extrabold text-gray-900">{u.unit_type}</h4>
                                                        <span className="text-[11px] text-gray-500">
                                                            Brand: <strong>{u.brand === "Other" ? u.other_brand || "Custom" : u.brand}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {qty > 1 && (
                                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] border border-blue-200">
                                                            Qty: {qty}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditUnitModal(index)}
                                                        className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-bold transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    {units.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveUnit(index)}
                                                            className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/60">
                                            <div>
                                                <span className="text-[10px] text-gray-400 block font-semibold">Capacity</span>
                                                <span className="font-bold text-gray-800">{u.capacity}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400 block font-semibold">Model No.</span>
                                                <span className="text-gray-700 font-mono text-[11px]">{u.model_number || "Not specified"}</span>
                                            </div>
                                        </div>

                                        {u.issue && (
                                            <div className="text-[11px] bg-white p-2 rounded-xl border border-gray-100">
                                                <span className="font-semibold text-gray-500">Issue / Request:</span>{" "}
                                                <span className="text-gray-800">{u.issue}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            </div>
                        </div>

                        {/* SECTION B: DYNAMIC SERVICE-SPECIFIC QUESTIONNAIRE */}
                        <div className="bg-gray-50/60 rounded-2xl p-5 sm:p-6 border border-gray-200/80 space-y-5">
                            <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                                        {serviceCategory === "installation" && "Installation Requirements & Site Assessment"}
                                        {serviceCategory === "repair" && "Repair Diagnosis & Symptoms"}
                                        {serviceCategory === "cleaning" && "Cleaning & Maintenance History"}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Please provide additional details to help our team prepare the official quotation.</p>
                                </div>
                            </div>

                            {/* 1. INSTALLATION QUESTIONS */}
                            {serviceCategory === "installation" && (
                                <div className="space-y-4 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Installation Type</label>
                                            <select
                                                value={installDetails.install_type}
                                                onChange={(e) => setInstallDetails({ ...installDetails, install_type: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="New Installation">New Installation</option>
                                                <option value="Replacement">Replacement of Old Unit</option>
                                                <option value="Relocation">Relocation to New Site</option>
                                                <option value="Not Sure">Not Sure — Technician Assess</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Is the AC unit already available?</label>
                                            <select
                                                value={installDetails.unit_available}
                                                onChange={(e) => setInstallDetails({ ...installDetails, unit_available: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="Yes">Yes (Unit already purchased/on-site)</option>
                                                <option value="No">No (Need Cooling Tower to supply unit)</option>
                                                <option value="Not Sure">Not Sure</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Property / Location Type</label>
                                            <select
                                                value={installDetails.location_type}
                                                onChange={(e) => setInstallDetails({ ...installDetails, location_type: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="Residential">Residential (House / Apartment)</option>
                                                <option value="Commercial">Commercial (Office / Building)</option>
                                                <option value="Office">Office Unit</option>
                                                <option value="Store">Retail Store / Restaurant</option>
                                                <option value="Other">Other Property Type</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Floor Level</label>
                                            <input
                                                type="text"
                                                value={installDetails.floor_level}
                                                onChange={(e) => setInstallDetails({ ...installDetails, floor_level: e.target.value })}
                                                placeholder="e.g. Ground Floor, 2nd Floor, 14th Floor Penthouse"
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>

                                    {/* Utilities Availability */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Electrical Connection?</label>
                                            <select
                                                value={installDetails.electrical_available}
                                                onChange={(e) => setInstallDetails({ ...installDetails, electrical_available: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                                            >
                                                <option value="Yes">Yes (Power line ready)</option>
                                                <option value="No">No (Need electrical circuit breaker)</option>
                                                <option value="Not Sure">Not Sure</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Existing Piping?</label>
                                            <select
                                                value={installDetails.piping_available}
                                                onChange={(e) => setInstallDetails({ ...installDetails, piping_available: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                                            >
                                                <option value="Yes">Yes (Copper pipe installed)</option>
                                                <option value="No">No (Supply new piping)</option>
                                                <option value="Not Sure">Not Sure</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Existing Drain Line?</label>
                                            <select
                                                value={installDetails.drain_line_available}
                                                onChange={(e) => setInstallDetails({ ...installDetails, drain_line_available: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                                            >
                                                <option value="Yes">Yes (Drain pipe available)</option>
                                                <option value="No">No (Need drain piping)</option>
                                                <option value="Not Sure">Not Sure</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Installation Site Notes</label>
                                        <input
                                            type="text"
                                            value={installDetails.install_notes}
                                            onChange={(e) => setInstallDetails({ ...installDetails, install_notes: e.target.value })}
                                            placeholder="e.g. Requires ladder, high ceiling, bracket mounting required"
                                            className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. REPAIR QUESTIONS */}
                            {serviceCategory === "repair" && (
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-2">
                                            What problem are you experiencing? <span className="text-gray-400 font-normal">(Select all that apply)</span>
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {REPAIR_PROBLEMS.map((prob) => {
                                                const isSel = repairDetails.problems.includes(prob);
                                                return (
                                                    <div
                                                        key={prob}
                                                        onClick={() => handleToggleProblem(prob)}
                                                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                                                            isSel ? "border-blue-600 bg-blue-50/80 text-blue-900 font-bold" : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                            isSel ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                                                        }`}>
                                                            {isSel && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                        </div>
                                                        <span className="text-xs">{prob}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">
                                                Please describe the problem in detail <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={repairDetails.description}
                                                onChange={(e) => setRepairDetails({ ...repairDetails, description: e.target.value })}
                                                placeholder="e.g. Unit blows warm air only, starts making rattling noise after 10 minutes..."
                                                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl resize-none font-medium focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">Error Code Shown (If Any)</label>
                                            <input
                                                type="text"
                                                value={repairDetails.error_code}
                                                onChange={(e) => setRepairDetails({ ...repairDetails, error_code: e.target.value })}
                                                placeholder="e.g. E1, E4, F3, CH-05 or blinking timer light"
                                                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                                            />
                                            <p className="text-[11px] text-gray-400 mt-1">If the remote or unit display shows an error code, please indicate it here.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. CLEANING QUESTIONS */}
                            {serviceCategory === "cleaning" && (
                                <div className="space-y-4 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">
                                                What type of cleaning/maintenance do you need?
                                            </label>
                                            <select
                                                value={cleaningDetails.service_type}
                                                onChange={(e) => setCleaningDetails({ ...cleaningDetails, service_type: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-medium"
                                            >
                                                {CLEANING_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                            </select>
                                            <p className="text-[11px] text-gray-400 mt-1">Final cleaning scope is verified upon technical assessment.</p>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-gray-700 mb-1">
                                                When was the unit last cleaned?
                                            </label>
                                            <select
                                                value={cleaningDetails.last_cleaned}
                                                onChange={(e) => setCleaningDetails({ ...cleaningDetails, last_cleaned: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-medium"
                                            >
                                                {CLEANING_INTERVALS.map(ci => <option key={ci} value={ci}>{ci}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Additional Cleaning Notes (Optional)</label>
                                        <input
                                            type="text"
                                            value={cleaningDetails.notes}
                                            onChange={(e) => setCleaningDetails({ ...cleaningDetails, notes: e.target.value })}
                                            placeholder="e.g. Unit has water dripping, heavy foul odor, or mold accumulation"
                                            className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION C: LOCATION & CONTACT DETAILS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
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
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
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

                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    General Notes / Landmarks (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={generalNotes}
                                    onChange={(e) => setGeneralNotes(e.target.value)}
                                    placeholder="e.g. Near town plaza, blue gate, call upon arrival"
                                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    STEP 3: PREFERRED SCHEDULE
                ══════════════════════════════════════════════════════════════════ */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Step 3 of 5</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-0.5">Preferred Schedule</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Choose your preferred date and arrival window. Your selected schedule is subject to availability and confirmation by our team.
                            </p>
                        </div>

                        {/* Availability Notice */}
                        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Schedule Availability & Confirmation</h4>
                                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                    Our technicians operate on guaranteed reservation windows. Your requested slot is reviewed by dispatch and confirmed upon quotation acceptance.
                                </p>
                            </div>
                        </div>

                        {/* Preferred Date & Time Selection */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Preferred Service Date <span className="text-red-500">*</span>
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

                            {/* Preferred Arrival Time with 30-min Intervals & Rate Identification */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Preferred Arrival Time <span className="text-red-500">*</span>
                                    </label>
                                    <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                                        <span>Selected:</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                                            activeRateInfo.isDifferential
                                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                                : "bg-blue-100 text-blue-900 border border-blue-200"
                                        }`}>
                                            {activeRateInfo.label || scheduledTime} ({activeRateInfo.rateName})
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* 1. Regular Hours Section */}
                                    <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-200">
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" />
                                                <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                    {scheduleSlotsData.regularConfig?.title || "Regular Hours"}
                                                </h5>
                                            </div>
                                            <span className="text-[11px] text-gray-500 font-medium">
                                                {scheduleSlotsData.regularConfig?.subtitle || "Standard Business Hours (08:00 AM – 05:00 PM)"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                            {scheduleSlotsData.regularSlots.map((slot) => {
                                                const isSel = scheduledTime === slot.id;
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        type="button"
                                                        onClick={() => setScheduledTime(slot.id)}
                                                        className={`p-2.5 rounded-xl border transition text-left flex flex-col justify-between ${
                                                            isSel
                                                                ? "border-blue-600 bg-blue-50 text-blue-950 shadow-sm ring-2 ring-blue-500/20 font-bold"
                                                                : "border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50/80 text-gray-800"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="text-xs font-bold tracking-tight">{slot.label}</span>
                                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                                isSel ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                                                            }`}>
                                                                {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-1">
                                                            {isSel && (
                                                                <svg className="w-2.5 h-2.5 text-blue-600 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                </svg>
                                                            )}
                                                            <span className={`text-[10px] font-semibold ${isSel ? "text-blue-700 font-bold" : "text-gray-400"}`}>
                                                                Regular
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Differential Hours Section (Kadlawon / Early Morning) */}
                                    <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200/80">
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />
                                                <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                                    {scheduleSlotsData.differentialConfig?.title || "Differential Hours"}
                                                </h5>
                                            </div>
                                            <span className="text-[11px] text-amber-900/80 font-medium">
                                                {scheduleSlotsData.differentialConfig?.subtitle || "Early Morning (Kadlawon / 12:00 AM – 05:00 AM)"}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                            {scheduleSlotsData.differentialSlots.map((slot) => {
                                                const isSel = scheduledTime === slot.id;
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        type="button"
                                                        onClick={() => setScheduledTime(slot.id)}
                                                        className={`p-2.5 rounded-xl border transition text-left flex flex-col justify-between ${
                                                            isSel
                                                                ? "border-amber-500 bg-amber-100/90 text-amber-950 shadow-sm ring-2 ring-amber-400/30 font-bold"
                                                                : "border-amber-200/80 hover:border-amber-300 bg-white hover:bg-amber-50/50 text-gray-800"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="text-xs font-bold tracking-tight">{slot.label}</span>
                                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                                isSel ? "bg-amber-600 border-amber-600 text-white" : "border-amber-300"
                                                            }`}>
                                                                {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 flex items-center">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                                                                isSel
                                                                    ? "bg-amber-200 text-amber-900"
                                                                    : "bg-amber-100/80 text-amber-800"
                                                            }`}>
                                                                {isSel && (
                                                                    <svg className="w-2.5 h-2.5 text-amber-900 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                    </svg>
                                                                )}
                                                                Differential
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. Dynamic Rate Classification Status Banner */}
                                    {activeRateInfo.isDifferential ? (
                                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950 flex items-start gap-3 transition">
                                            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
                                                <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
                                                        {activeRateInfo.noticeTitle || "Differential Rate Applies"}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 text-amber-900">
                                                        {activeRateInfo.label || scheduledTime} • Differential
                                                    </span>
                                                </div>
                                                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                                    {activeRateInfo.noticeMessage || "An additional differential charge will be included in your quotation."}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 flex items-start gap-3 transition">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-700">
                                                <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                                                        {activeRateInfo.noticeTitle || "Regular Rate"}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                                        {activeRateInfo.label || scheduledTime} • Regular
                                                    </span>
                                                </div>
                                                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                                    {activeRateInfo.noticeMessage || "Standard service rate applies."}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Optional Alternative Schedule */}
                        <div className="border-t border-gray-100 pt-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enableAlt"
                                    checked={enableAlternativeSchedule}
                                    onChange={(e) => setEnableAlternativeSchedule(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="enableAlt" className="text-xs font-bold text-gray-700 cursor-pointer">
                                    Provide an Alternative Date / Schedule in case your first choice is fully booked
                                </label>
                            </div>

                            {enableAlternativeSchedule && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Alternative Date</label>
                                        <input
                                            type="date"
                                            min={tomorrow}
                                            value={altDate}
                                            onChange={(e) => setAltDate(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Alternative Arrival Time</label>
                                        <select
                                            value={altTime}
                                            onChange={(e) => setAltTime(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm"
                                        >
                                            <optgroup label="Regular Hours">
                                                {scheduleSlotsData.regularSlots.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label} (Regular Rate)</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Differential Hours (Early Morning)">
                                                {scheduleSlotsData.differentialSlots.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label} (Differential Rate)</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    STEP 4: APPOINTMENT RESERVATION FEE
                ══════════════════════════════════════════════════════════════════ */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Step 4 of 5</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-0.5">Appointment Reservation Fee</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                An appointment reservation fee is required to secure your requested service schedule.
                            </p>
                        </div>

                        {/* Distinction & Clarity Notice */}
                        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                                        Schedule Security Fee
                                    </span>
                                    <h3 className="text-2xl font-extrabold mt-1 text-white">₱{BOOKING_FEE.toFixed(2)}</h3>
                                    <p className="text-xs text-blue-200/90 mt-0.5">
                                        Your reservation fee is separate from the final service quotation.
                                    </p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center gap-3 self-start sm:self-auto">
                                    <div>
                                        <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">GCash Express Send No.</p>
                                        <p className="text-base font-bold font-mono tracking-wider text-white mt-0.5">{gcashAccount}</p>
                                        <p className="text-[10px] text-blue-300 font-medium">{gcashName}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyGCash}
                                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition shrink-0"
                                    >
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-blue-100/90 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                                <strong>Important Distinction:</strong> Please note that the appointment reservation fee is not the final service charge. Your final service charges will be provided through an official quotation based on the service requirements.
                            </p>
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
                                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Sender Contact Number</label>
                                    <input
                                        type="text"
                                        placeholder="09XX XXX XXXX"
                                        value={senderNumber}
                                        onChange={(e) => setSenderNumber(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Upload Receipt Screenshot (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0] || null;
                                        setReceiptFile(file);
                                        if (file) {
                                            setReceiptPreview(URL.createObjectURL(file));
                                        } else {
                                            setReceiptPreview(null);
                                        }
                                    }}
                                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {receiptPreview && (
                                    <div className="mt-2 w-28 h-28 rounded-xl overflow-hidden border border-gray-200">
                                        <img src={receiptPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preferred Service Payment Method */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Preferred Payment Method for Final Service Balance (Paid upon service completion) <span className="text-red-500">*</span>
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
                                        <p className="text-xs text-gray-500">Pay cash directly to technician upon completion.</p>
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
                                        <p className="text-xs text-gray-500">Pay quotation balance via GCash upon completion.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Configurable Cancellation & Rescheduling Policy Card */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                                <svg className="w-4 h-4 text-amber-700 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Cancellation, Rescheduling & No-Show Policy</span>
                            </div>
                            <p className="text-xs text-amber-900/90 leading-relaxed">
                                Important: The appointment reservation fee is subject to the company's cancellation, rescheduling, and no-show policy:
                            </p>
                            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                                <li>Customer cancels at least 24 hours prior → Eligible for rescheduling or refund.</li>
                                <li>Customer reschedules within allowed window → Reservation fee transfers to the new appointment.</li>
                                <li>Late cancellation (less than 24 hours) or customer no-show → Reservation fee may be forfeited to cover scheduling and dispatch allocation.</li>
                                <li>If service proceeds → Reservation fee is credited toward the official quotation bill.</li>
                            </ul>

                            <div className="pt-2 border-t border-amber-200/80">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={policyAccepted}
                                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-semibold text-gray-800">
                                        I understand that the appointment reservation fee is subject to the company's cancellation and rescheduling policy. <span className="text-red-500">*</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    STEP 5: REVIEW & CONFIRM
                ══════════════════════════════════════════════════════════════════ */}
                {step === 5 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Step 5 of 5</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-0.5">Review & Confirm Service Request</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Review your service request details before submitting. Your official quotation will be generated after review.
                            </p>
                        </div>

                        {/* Summary Details */}
                        <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-200 space-y-5">
                            {/* Service Header */}
                            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected Service</span>
                                    <h3 className="text-base font-extrabold text-gray-900">{currentService?.service_name}</h3>
                                    <p className="text-xs text-gray-500">{currentService?.description}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full uppercase">
                                        Quotation on Review
                                    </span>
                                </div>
                            </div>

                            {/* Units List */}
                            <div className="space-y-2 border-b border-gray-200 pb-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Aircon Units Included ({totalUnitsCount} {totalUnitsCount === 1 ? "Unit" : "Units"})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {units.map((u, i) => {
                                        const qty = parseInt(u.quantity, 10) || 1;
                                        return (
                                            <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-extrabold text-blue-900">Unit #{i + 1}: {u.unit_type}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {qty > 1 && (
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                                                Qty: {qty}
                                                            </span>
                                                        )}
                                                        <span className="font-semibold text-gray-500">{u.capacity}</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-600">
                                                    Brand: <strong>{u.brand === "Other" ? u.other_brand : u.brand}</strong>
                                                    {u.model_number ? ` • Model: ${u.model_number}` : ""}
                                                    {qty > 1 ? ` • ${qty} units` : ""}
                                                </p>
                                                {u.issue && (
                                                    <p className="text-gray-700 italic text-[11px] pt-0.5">
                                                        Issue: {u.issue}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Schedule & Location */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-b border-gray-200 pb-4">
                                <div>
                                    <span className="font-semibold text-gray-400 uppercase text-[10px]">Preferred Schedule</span>
                                    <p className="font-bold text-gray-800 mt-0.5">{scheduledDate} at {activeRateInfo.label || scheduledTime}</p>
                                    <div className="mt-1">
                                        {activeRateInfo.isDifferential ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                <svg className="w-3 h-3 text-amber-700 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>Differential Rate Applies</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <svg className="w-3 h-3 text-emerald-700 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                                <span>Regular Rate</span>
                                            </span>
                                        )}
                                    </div>
                                    {enableAlternativeSchedule && altDate && (
                                        <p className="text-[11px] text-gray-500 mt-1">Alt: {altDate} at {scheduleSlotsData.findSlot(altTime)?.label || altTime}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-400 uppercase text-[10px]">Service Address</span>
                                    <p className="font-bold text-gray-800 mt-0.5">{serviceAddress}</p>
                                    <p className="text-[11px] text-gray-500">{contactNumber}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-400 uppercase text-[10px]">Reservation Fee</span>
                                    <p className="font-extrabold text-emerald-700 mt-0.5">₱{BOOKING_FEE.toFixed(2)} (Paid)</p>
                                    <p className="text-[11px] font-mono text-gray-500">Ref: {refNumber}</p>
                                </div>
                            </div>

                            {/* Service Price Distinction Callout */}
                            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                                <strong>Appointment Reservation Fee Only:</strong> The ₱{BOOKING_FEE.toFixed(2)} reservation fee secures your requested appointment schedule. Final service charges will be provided through an official quotation based on your technical assessment.
                            </div>
                        </div>

                        {/* Customer Mandatory Acknowledgement */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={finalAcknowledged}
                                    onChange={(e) => setFinalAcknowledged(e.target.checked)}
                                    className="mt-0.5 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700 leading-relaxed font-medium">
                                    I understand that this booking is a <strong>service request and appointment reservation</strong>. I understand that the final service charges will be based on the company's assessment and official quotation. I also understand that the appointment reservation fee is subject to the company's cancellation and rescheduling policy. <span className="text-red-500">*</span>
                                </span>
                            </label>
                        </div>
                    </div>
                )}

                {/* ── FOOTER NAVIGATION ────────────────────────────────────────── */}
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
                            disabled={submitting || !canSubmit}
                            className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-extrabold shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Submitting Service Request...
                                </>
                            ) : (
                                <>
                                    Submit Service Request
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: ADD / EDIT AIRCON UNIT
            ══════════════════════════════════════════════════════════════════ */}
            {showUnitFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                            <div>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aircon Unit Specifications</span>
                                <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
                                    {editingUnitIndex >= 0 ? `Edit Unit #${editingUnitIndex + 1}` : `Add Another Aircon Unit`}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowUnitFormModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 1. Aircon Unit Type Selection (Visual Cards) */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Aircon Unit Type <span className="text-red-500">*</span>
                            </label>
                            <p className="text-[11px] text-gray-500">What type of air-conditioning unit do you need service for?</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                {unitTypes.map((t) => {
                                    const isSel = activeUnitForm.unit_type === t.code || activeUnitForm.unit_type === t.name;
                                    return (
                                        <div
                                            key={t.code || t.name}
                                            onClick={() => setActiveUnitForm({ ...activeUnitForm, unit_type: t.code || t.name })}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                                isSel ? "border-blue-600 bg-blue-50/60 shadow-sm" : "border-gray-200 hover:border-blue-200 bg-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSel ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon || DEFAULT_UNIT_TYPES[0].icon} />
                                                    </svg>
                                                </div>
                                                <span className="text-xs font-bold leading-tight">{t.label || t.name}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-2 line-clamp-2">{t.description}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {activeUnitForm.unit_type === "Other / Not Sure" && (
                                <div className="mt-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                                    <label className="block text-xs font-semibold text-blue-900">
                                        Describe your air-conditioning unit or where it is installed:
                                    </label>
                                    <input
                                        type="text"
                                        value={activeUnitForm.not_sure_description}
                                        onChange={(e) => setActiveUnitForm({ ...activeUnitForm, not_sure_description: e.target.value })}
                                        placeholder="e.g. Mounted high on living room wall with outdoor unit on balcony"
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 2. Brand & Model */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Brand <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={activeUnitForm.brand}
                                    onChange={(e) => setActiveUnitForm({ ...activeUnitForm, brand: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white font-medium"
                                >
                                    {brands.map(b => (
                                        <option key={b.name || b} value={b.name || b}>
                                            {b.name || b}
                                        </option>
                                    ))}
                                </select>
                                {activeUnitForm.brand === "Other" && (
                                    <input
                                        type="text"
                                        placeholder="Type brand name..."
                                        value={activeUnitForm.other_brand}
                                        onChange={(e) => setActiveUnitForm({ ...activeUnitForm, other_brand: e.target.value })}
                                        className="mt-2 w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Model Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. FP-53CAS010-303"
                                    value={activeUnitForm.model_number}
                                    onChange={(e) => setActiveUnitForm({ ...activeUnitForm, model_number: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white font-mono"
                                />
                            </div>
                        </div>

                        {/* 3. Horsepower / Capacity & Quantity */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="font-bold text-gray-700 uppercase tracking-wider">
                                        Horsepower / Capacity <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setActiveUnitForm({
                                            ...activeUnitForm,
                                            capacity_type: activeUnitForm.capacity_type === "hp" ? "commercial" : "hp",
                                            capacity: activeUnitForm.capacity_type === "hp" ? "2.0 TR" : "1.5 HP",
                                        })}
                                        className="text-[11px] text-blue-600 font-bold hover:underline"
                                    >
                                        {activeUnitForm.capacity_type === "hp" ? "Switch to TR / BTU" : "Switch to HP"}
                                    </button>
                                </div>
                                <select
                                    value={activeUnitForm.capacity}
                                    onChange={(e) => setActiveUnitForm({ ...activeUnitForm, capacity: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white font-medium"
                                >
                                    {activeUnitForm.capacity_type === "hp"
                                        ? HP_OPTIONS.map(hp => <option key={hp} value={hp}>{hp}</option>)
                                        : COMMERCIAL_CAPACITIES.map(tr => <option key={tr} value={tr}>{tr}</option>)
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Quantity of This Exact Unit
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveUnitForm({ ...activeUnitForm, quantity: Math.max(1, activeUnitForm.quantity - 1) })}
                                        className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 text-lg flex items-center justify-center"
                                    >
                                        −
                                    </button>
                                    <span className="w-10 text-center text-sm font-bold text-gray-800">{activeUnitForm.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveUnitForm({ ...activeUnitForm, quantity: Math.min(20, activeUnitForm.quantity + 1) })}
                                        className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 text-lg flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                    <span className="text-xs text-gray-500">unit(s)</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Unit Specific Problem / Request */}
                        <div className="space-y-2 text-xs">
                            <label className="block font-bold text-gray-700 uppercase tracking-wider">
                                Problem / Service Request for this Unit
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Not cooling, leaking water from front vent, noisy motor"
                                value={activeUnitForm.issue}
                                onChange={(e) => setActiveUnitForm({ ...activeUnitForm, issue: e.target.value })}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white"
                            />
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowUnitFormModal(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveUnit}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                            >
                                {editingUnitIndex >= 0 ? "Save Unit Details" : "Add to Service Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
