import { useEffect, useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../../utils/superAdmin";

const DEFAULT_CONTACT_INFO = {
    company_name: "Cooling Tower Airconditioning Service Company",
    mobile_number: "0917 877 7670",
    telephone_number: "062 310-2275",
    facebook_page: "Cooling Tower Airconditioning Services",
    facebook_url: "https://www.facebook.com/share/19w3XmbCza/",
    email: "support@coolingtoweraircon.ph",
    office_hours: "Monday – Saturday, 8:00 AM – 6:00 PM",
};

export default function WarrantyTracking({ addToast, onNavigate }) {
    const [serialInput, setSerialInput] = useState("");
    const [searching, setSearching] = useState(false);
    const [lookupResult, setLookupResult] = useState(null);
    const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);
    const [myUnits, setMyUnits] = useState([]);

    useEffect(() => {
        let mounted = true;
        window.axios
            .get(CUSTOMER_ENDPOINTS.warrantyContext)
            .then((res) => {
                if (!mounted) return;
                if (res.data?.contact_info) {
                    setContactInfo(res.data.contact_info);
                }
                if (Array.isArray(res.data?.my_units)) {
                    setMyUnits(res.data.my_units);
                }
            })
            .catch(() => {});
        return () => {
            mounted = false;
        };
    }, []);

    const handleSearch = async (e, overrideSerial = null) => {
        if (e) e.preventDefault();
        const targetSerial = (overrideSerial !== null ? overrideSerial : serialInput).trim();
        if (!targetSerial) {
            addToast?.("Please enter the Serial Number of your AC unit.", "error");
            return;
        }
        if (overrideSerial !== null) {
            setSerialInput(targetSerial);
        }

        setSearching(true);
        try {
            const response = await window.axios.post(CUSTOMER_ENDPOINTS.trackWarranty, {
                serial_number: targetSerial,
            });
            setLookupResult(response.data);
            if (response.data?.contact_info) {
                setContactInfo(response.data.contact_info);
            }
            if (!response.data?.found) {
                addToast?.(
                    `Alert: Serial Number "${targetSerial}" was not found in our inventory records.`,
                    "error"
                );
            } else if (response.data?.unit?.is_expired) {
                addToast?.(
                    `Notice: The warranty for AC unit "${targetSerial}" has already ended.`,
                    "error"
                );
            } else {
                addToast?.(
                    `Warranty record found for "${targetSerial}" (${response.data.unit.days_left} days remaining).`
                );
            }
        } catch (error) {
            addToast?.(extractErrorMessage(error, "Unable to verify serial number right now."), "error");
        } finally {
            setSearching(false);
        }
    };

    const unit = lookupResult?.found ? lookupResult.unit : null;
    const notFound = lookupResult && !lookupResult.found;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Top Banner & Serial Number Input Card */}
            <div
                className="card"
                style={{
                    padding: 26,
                    background: "linear-gradient(135deg, #0F172A 0%, #1E2F5F 60%, #1D4ED8 100%)",
                    color: "#FFFFFF",
                    borderRadius: 16,
                    border: "none",
                    boxShadow: "0 12px 30px rgba(30, 47, 95, 0.18)",
                }}
            >
                <div style={{ maxWidth: 740 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>
                        <span>🛡️ Official Warranty Verification & Smart Spare Parts Forecast</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "#FFFFFF" }}>
                        AC Unit Warranty Tracking
                    </h2>
                    <p style={{ fontSize: 13.5, color: "#CBD5E1", margin: "0 0 20px", lineHeight: 1.6 }}>
                        Enter the <strong>Serial Number</strong> of the air conditioning unit you purchased from{" "}
                        <strong>Cooling Tower Airconditioning Service Company</strong> to check your warranty start date,
                        expiration date, remaining warranty days, and reserved warranty spare parts coverage.
                    </p>

                    <form onSubmit={(e) => handleSearch(e)} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 320px", position: "relative" }}>
                            <input
                                type="text"
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value)}
                                placeholder="Enter AC Unit Serial Number (e.g., MD-WNF-2026-88219)"
                                style={{
                                    width: "100%",
                                    padding: "13px 16px",
                                    borderRadius: 10,
                                    border: "2px solid rgba(255,255,255,0.25)",
                                    background: "#FFFFFF",
                                    color: "#0F172A",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    fontFamily: "monospace",
                                    outline: "none",
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={searching}
                            style={{
                                padding: "13px 24px",
                                borderRadius: 10,
                                border: "none",
                                background: "#3B82F6",
                                color: "#FFFFFF",
                                fontWeight: 700,
                                fontSize: 13.5,
                                cursor: searching ? "wait" : "pointer",
                                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.35)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {searching ? "Checking Records..." : "🔍 Track Warranty"}
                        </button>
                        {lookupResult && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSerialInput("");
                                    setLookupResult(null);
                                }}
                                style={{
                                    padding: "13px 16px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    background: "rgba(255,255,255,0.1)",
                                    color: "#FFFFFF",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </form>

                    {myUnits.length > 0 && (
                        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>Your Purchased Units:</span>
                            {myUnits.map((u) => (
                                <button
                                    key={u.ac_unit_id}
                                    type="button"
                                    onClick={() => handleSearch(null, u.serial_number)}
                                    style={{
                                        padding: "4px 11px",
                                        borderRadius: 999,
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        background: "rgba(255,255,255,0.12)",
                                        color: "#F8FAFC",
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontFamily: "monospace",
                                    }}
                                >
                                    {u.serial_number} ({u.brand})
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                CASE 1: SERIAL NUMBER NOT FOUND IN INVENTORY RECORDS
               ═══════════════════════════════════════════════════════════════════ */}
            {notFound && (
                <div
                    className="card"
                    style={{
                        padding: 26,
                        border: "2px solid #FCA5A5",
                        background: "#FEF2F2",
                        borderRadius: 14,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        <div
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: 12,
                                background: "#FEE2E2",
                                border: "1px solid #FCA5A5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 24,
                                flexShrink: 0,
                            }}
                        >
                            ⚠️
                        </div>
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <span
                                style={{
                                    display: "inline-block",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    background: "#DC2626",
                                    color: "#FFFFFF",
                                    marginBottom: 8,
                                }}
                            >
                                Unit Not Found in Inventory Records
                            </span>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#991B1B", margin: "0 0 6px" }}>
                                Alert: This AC Unit Serial Number Is Not Recorded in Our Inventory
                            </h3>
                            <p style={{ fontSize: 13.5, color: "#7F1D1D", margin: "0 0 18px", lineHeight: 1.6 }}>
                                We could not find any air conditioning unit with Serial Number{" "}
                                <code
                                    style={{
                                        background: "#FEE2E2",
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        fontWeight: 800,
                                        color: "#991B1B",
                                    }}
                                >
                                    {lookupResult.serial_number}
                                </code>{" "}
                                in the <strong>Cooling Tower Airconditioning Service Company</strong> inventory database.
                                Please double-check the serial number sticker on the side of your indoor/outdoor unit or on
                                your official sales invoice.
                            </p>

                            {/* Contact Us For Any Concern Card */}
                            <div
                                style={{
                                    background: "#FFFFFF",
                                    border: "1px solid #FECACA",
                                    borderRadius: 12,
                                    padding: 20,
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: "#1E2F5F",
                                        margin: "0 0 4px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.03em",
                                    }}
                                >
                                    📞 Contact Us for Any Concern
                                </p>
                                <p style={{ fontSize: 12.5, color: "#64748B", margin: "0 0 16px" }}>
                                    If you purchased your unit from us or need assistance verifying your warranty record,
                                    please reach out to our customer support channels below:
                                </p>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                        gap: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "14px 16px",
                                            borderRadius: 10,
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                        }}
                                    >
                                        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                            📱 Mobile Number
                                        </p>
                                        <a
                                            href={`tel:${String(contactInfo.mobile_number || '09178777670').replace(/[^\d+]/g, '')}`}
                                            style={{
                                                display: "block",
                                                fontSize: 14.5,
                                                fontWeight: 800,
                                                color: "#1E2F5F",
                                                textDecoration: "none",
                                                marginTop: 4,
                                            }}
                                        >
                                            {contactInfo.mobile_number}
                                        </a>
                                        <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>
                                            Available for Calls, SMS & Viber
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            padding: "14px 16px",
                                            borderRadius: 10,
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                        }}
                                    >
                                        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                            ☎️ Telephone Number
                                        </p>
                                        <a
                                            href={`tel:${String(contactInfo.telephone_number || '0623102275').replace(/[^\d+]/g, '')}`}
                                            style={{
                                                display: "block",
                                                fontSize: 14.5,
                                                fontWeight: 800,
                                                color: "#1E2F5F",
                                                textDecoration: "none",
                                                marginTop: 4,
                                            }}
                                        >
                                            {contactInfo.telephone_number}
                                        </a>
                                        <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>
                                            {contactInfo.office_hours}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            padding: "14px 16px",
                                            borderRadius: 10,
                                            background: "#EFF6FF",
                                            border: "1px solid #BFDBFE",
                                        }}
                                    >
                                        <p style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", margin: 0 }}>
                                            🌐 Official Facebook Page
                                        </p>
                                        <a
                                            href={contactInfo.facebook_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "block",
                                                fontSize: 14,
                                                fontWeight: 800,
                                                color: "#2563EB",
                                                textDecoration: "underline",
                                                marginTop: 4,
                                            }}
                                        >
                                            {contactInfo.facebook_page}
                                        </a>
                                        <p style={{ fontSize: 11, color: "#60A5FA", margin: "2px 0 0" }}>
                                            Message us on Facebook Messenger
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                CASE 2: VALID SERIAL NUMBER FOUND IN INVENTORY RECORDS
               ═══════════════════════════════════════════════════════════════════ */}
            {unit && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {/* Expired vs Active Status Alert Banner */}
                    {unit.is_expired ? (
                        <div
                            className="card"
                            style={{
                                padding: 22,
                                background: "#FEF2F2",
                                border: "2px solid #F87171",
                                borderRadius: 14,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 12,
                                            background: "#DC2626",
                                            color: "#FFFFFF",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 22,
                                            fontWeight: 800,
                                        }}
                                    >
                                        ✕
                                    </div>
                                    <div>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                fontSize: 11,
                                                fontWeight: 800,
                                                padding: "2px 10px",
                                                borderRadius: 999,
                                                background: "#DC2626",
                                                color: "#FFFFFF",
                                                textTransform: "uppercase",
                                                marginBottom: 4,
                                            }}
                                        >
                                            Warranty Period Ended
                                        </span>
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#991B1B", margin: 0 }}>
                                            Your AC Unit Warranty Has Ended
                                        </h3>
                                        <p style={{ fontSize: 13, color: "#7F1D1D", margin: "4px 0 0" }}>
                                            The {unit.warranty_period_months}-month warranty coverage for{" "}
                                            <strong>
                                                {unit.brand} {unit.model} (SN: {unit.serial_number})
                                            </strong>{" "}
                                            started on <strong>{unit.warranty_start_formatted}</strong> and officially ended on{" "}
                                            <strong>{unit.warranty_expiry_formatted}</strong> ({Math.abs(unit.days_left)}{" "}
                                            {Math.abs(unit.days_left) === 1 ? "day" : "days"} ago).
                                        </p>
                                    </div>
                                </div>
                                {onNavigate && (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => onNavigate("book")}
                                        style={{ padding: "10px 18px", fontSize: 12.5, fontWeight: 700 }}
                                    >
                                        Book Regular Maintenance / Repair →
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="card"
                            style={{
                                padding: 22,
                                background: unit.warranty_status === "Expiring Soon" ? "#FFFBEB" : "#F0FDF4",
                                border: `2px solid ${unit.warranty_status === "Expiring Soon" ? "#FBBF24" : "#4ADE80"}`,
                                borderRadius: 14,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 12,
                                            background: unit.warranty_status === "Expiring Soon" ? "#D97706" : "#16A34A",
                                            color: "#FFFFFF",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 22,
                                            fontWeight: 800,
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <div>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                fontSize: 11,
                                                fontWeight: 800,
                                                padding: "2px 10px",
                                                borderRadius: 999,
                                                background: unit.warranty_status === "Expiring Soon" ? "#D97706" : "#16A34A",
                                                color: "#FFFFFF",
                                                textTransform: "uppercase",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {unit.warranty_status === "Expiring Soon" ? "Warranty Expiring Soon" : "Active Warranty Coverage"}
                                        </span>
                                        <h3
                                            style={{
                                                fontSize: 18,
                                                fontWeight: 800,
                                                color: unit.warranty_status === "Expiring Soon" ? "#92400E" : "#166534",
                                                margin: 0,
                                            }}
                                        >
                                            {unit.brand} {unit.model} — {unit.time_left_label}
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: 13,
                                                color: unit.warranty_status === "Expiring Soon" ? "#78350F" : "#15803D",
                                                margin: "4px 0 0",
                                            }}
                                        >
                                            Verified in Cooling Tower Airconditioning Service Company records • Serial Number:{" "}
                                            <code style={{ fontWeight: 800 }}>{unit.serial_number}</code>
                                        </p>
                                    </div>
                                </div>
                                {onNavigate && (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => onNavigate("book")}
                                        style={{ padding: "10px 18px", fontSize: 12.5, fontWeight: 700 }}
                                    >
                                        Book Warranty Service →
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Warranty Dates & Countdown Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #2563EB" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                Warranty Start Date
                            </p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: "#1E2F5F", margin: "6px 0 2px" }}>
                                {unit.warranty_start_formatted}
                            </p>
                            <p style={{ fontSize: 11.5, color: "#94A3B8", margin: 0 }}>
                                Date unit warranty was activated
                            </p>
                        </div>

                        <div
                            className="card"
                            style={{
                                padding: "18px 20px",
                                borderLeft: `4px solid ${unit.is_expired ? "#DC2626" : "#7C3AED"}`,
                            }}
                        >
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                Warranty Expiration Date
                            </p>
                            <p
                                style={{
                                    fontSize: 20,
                                    fontWeight: 800,
                                    color: unit.is_expired ? "#DC2626" : "#1E2F5F",
                                    margin: "6px 0 2px",
                                }}
                            >
                                {unit.warranty_expiry_formatted}
                            </p>
                            <p style={{ fontSize: 11.5, color: "#94A3B8", margin: 0 }}>
                                {unit.warranty_period_months} Months Total Coverage Period
                            </p>
                        </div>

                        <div
                            className="card"
                            style={{
                                padding: "18px 20px",
                                borderLeft: `4px solid ${unit.is_expired ? "#DC2626" : unit.days_left <= 30 ? "#D97706" : "#16A34A"}`,
                            }}
                        >
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                Warranty Date / Time Left
                            </p>
                            <p
                                style={{
                                    fontSize: 20,
                                    fontWeight: 800,
                                    color: unit.is_expired ? "#DC2626" : unit.days_left <= 30 ? "#D97706" : "#16A34A",
                                    margin: "6px 0 2px",
                                }}
                            >
                                {unit.is_expired ? "0 Days Left (Ended)" : `${unit.days_left} Days Left`}
                            </p>
                            <p style={{ fontSize: 11.5, color: "#64748B", margin: 0, fontWeight: 600 }}>
                                {unit.time_left_label}
                            </p>
                        </div>
                    </div>

                    {/* Visual Warranty Timeline Bar + Unit Specifications */}
                    <div className="card" style={{ padding: 22 }}>
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                    Warranty Coverage Timeline ({unit.warranty_start_formatted} → {unit.warranty_expiry_formatted})
                                </span>
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: unit.is_expired ? "#DC2626" : "#16A34A",
                                    }}
                                >
                                    {unit.is_expired
                                        ? "Warranty Ended (0% Remaining)"
                                        : `${unit.progress_percent}% of Warranty Remaining`}
                                </span>
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    height: 12,
                                    background: "#E2E8F0",
                                    borderRadius: 999,
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: `${unit.is_expired ? 100 : Math.max(6, unit.progress_percent)}%`,
                                        height: "100%",
                                        background: unit.is_expired
                                            ? "#EF4444"
                                            : unit.days_left <= 30
                                            ? "#F59E0B"
                                            : "linear-gradient(90deg, #16A34A, #22C55E)",
                                        borderRadius: 999,
                                        transition: "width 0.4s ease",
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: 14,
                                paddingTop: 14,
                                borderTop: "1px solid #F1F5F9",
                            }}
                        >
                            <div>
                                <p style={{ fontSize: 11, color: "#64748B", margin: 0, fontWeight: 600 }}>Serial Number</p>
                                <p style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", margin: "2px 0 0", fontFamily: "monospace" }}>
                                    {unit.serial_number}
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: "#64748B", margin: 0, fontWeight: 600 }}>Brand & Model</p>
                                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", margin: "2px 0 0" }}>
                                    {unit.brand} — {unit.model}
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: "#64748B", margin: 0, fontWeight: 600 }}>Unit Type & Capacity</p>
                                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", margin: "2px 0 0" }}>
                                    {unit.ac_type} • {unit.horsepower} HP ({unit.refrigerant_type})
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: "#64748B", margin: 0, fontWeight: 600 }}>Registered Owner</p>
                                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", margin: "2px 0 0" }}>
                                    {unit.customer_name || "Walk-in Customer"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Forecasted & Reserved Warranty Spare Parts Card */}
                    <div className="card" style={{ padding: 22 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 800, color: "#1E2F5F", margin: 0 }}>
                                    🔧 Smart Forecasting: Warranty Reserved Spare Parts
                                </p>
                                <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
                                    {unit.is_expired
                                        ? "Because this AC unit's warranty has ended, any previously reserved spare parts have been released (On-Hand reserves returned to Available stock; Order Base reserves set to Not Reserved)."
                                        : "Our forecasting system automatically reserves compatible spare parts (from On-Hand stock, or Order Base if not currently on-hand) throughout your active warranty period."}
                                </p>
                            </div>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    background: unit.is_expired ? "#F1F5F9" : "#EFF6FF",
                                    color: unit.is_expired ? "#64748B" : "#1D4ED8",
                                }}
                            >
                                {unit.is_expired
                                    ? "Reservations Released (Warranty Ended)"
                                    : `${(unit.reserved_parts || []).length} Spare Part(s) Reserved for Your Unit`}
                            </span>
                        </div>

                        {unit.is_expired ? (
                            <div
                                style={{
                                    padding: "16px 18px",
                                    borderRadius: 10,
                                    background: "#F8FAFC",
                                    border: "1px solid #E2E8F0",
                                    fontSize: 13,
                                    color: "#475569",
                                }}
                            >
                                ✓ <strong>Warranty Reserve Status:</strong> All spare parts previously reserved for{" "}
                                <code>{unit.serial_number}</code> have been released. On-hand reserved spare parts are now{" "}
                                <strong>Available</strong> again in inventory, and Order Base spare parts are{" "}
                                <strong>not reserved anymore</strong>.
                            </div>
                        ) : (unit.reserved_parts || []).length === 0 ? (
                            <div style={{ padding: 16, fontSize: 13, color: "#64748B" }}>
                                Standard warranty spare parts coverage is active for your unit.
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                                {unit.reserved_parts.map((part) => (
                                    <div
                                        key={part.item_id}
                                        style={{
                                            padding: "14px 16px",
                                            borderRadius: 10,
                                            border: "1px solid #E2E8F0",
                                            background: "#F8FAFC",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                            <span
                                                style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    padding: "2px 8px",
                                                    borderRadius: 999,
                                                    background:
                                                        part.reservation_source === "order_base" ? "#FEF3C7" : "#DBEAFE",
                                                    color:
                                                        part.reservation_source === "order_base" ? "#B45309" : "#1D4ED8",
                                                }}
                                            >
                                                {part.source_label}
                                            </span>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>
                                                {part.quantity} pc Reserved
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", margin: 0 }}>
                                            {part.item_name}
                                        </p>
                                        <p style={{ fontSize: 11.5, color: "#64748B", margin: 0 }}>
                                            Category: {part.sub_category} • Held until {unit.warranty_expiry_formatted}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Always visible Contact Us support card at bottom when not already showing notFound */}
            {!notFound && (
                <div className="card" style={{ padding: 22 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#1E2F5F", margin: "0 0 4px" }}>
                        📞 Contact Us for Any Concern
                    </p>
                    <p style={{ fontSize: 12.5, color: "#64748B", margin: "0 0 14px" }}>
                        Have questions about your AC unit warranty coverage, serial number verification, or spare parts replacement?
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                📱 Mobile Number
                            </p>
                            <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1E2F5F", margin: "4px 0 0" }}>
                                {contactInfo.mobile_number}
                            </p>
                        </div>
                        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: 0 }}>
                                ☎️ Telephone Number
                            </p>
                            <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1E2F5F", margin: "4px 0 0" }}>
                                {contactInfo.telephone_number}
                            </p>
                        </div>
                        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", margin: 0 }}>
                                🌐 Facebook Page
                            </p>
                            <a
                                href={contactInfo.facebook_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "#2563EB", marginTop: 4 }}
                            >
                                {contactInfo.facebook_page}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
