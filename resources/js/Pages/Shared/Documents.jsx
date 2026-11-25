import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../Components/Modal";
import companyLogo from "../../../imports/cooling_tower_airconditioning_services_logo-1.jpg";
import {
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDate,
    toInputDate,
} from "../../utils/superAdmin";

// ── Icons ────────────────────────────────────────────────────────────────────
const QuotationIcon = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);

const StatementIcon = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="12" y2="16" />
        <path d="M15 16h2" />
    </svg>
);

const EyeIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EditIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const DownloadIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const PrintIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
    </svg>
);

const TrashIcon = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PlusIcon = ({ size = 15, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const SearchIcon = ({ size = 15, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

// ── Constants & Helpers ──────────────────────────────────────────────────────
const DOC_TYPE_QUOTATION = "quotation";
const DOC_TYPE_STATEMENT = "statement_of_account";

const DEFAULT_COMPANY_INFO = {
    name: "Cooling Tower Airconditioning Services",
    address_line1: "Door #5, Aposol Building, Mayor Jaldon St., Canelar, Zamboanga City",
    address_line2: "Zamboanga Del Sur, 7000, Philippines",
    email: "ctair.zamboanga@yahoo.com",
    phone: "+63 9178777670",
    email_phone: "ctair.zamboanga@yahoo.com/ +63 9178777670",
    tin: "444-000-762-000",
    bpi_account: "Cooling Tower Airconditioning Services 9330-0112-78",
    bpi_account_name: "Cooling Tower Airconditioning Services",
    bpi_account_number: "9330011278",
    gcash: "0917-877-7670",
};

const DEFAULT_QUOTATION_TERMS = {
    inclusions:
        "General Cleaning using Pressurized Power Wash & Cleaning Chemical when necessary.\nApplying/Putting grease oil on motors & other moving parts.\nSupervision, testing & observation of unit's condition and parameters.",
    exclusions:
        "Repair or replace of defective parts found during General Cleaning Service.\nA separate quotation will be submitted for any defect found during testing & unit evaluation.",
    workmanship: "30 days.",
    payment_terms: "Upon Completion",
};

function formatNumber2(val) {
    const num = Number(val);
    const safe = Number.isFinite(num) ? num : 0;
    return new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(safe);
}

function formatPeso2(val) {
    return `₱${formatNumber2(val)}`;
}

function formatShortDocDate(dateStr) {
    if (!dateStr) return "—";
    const parts = String(dateStr).slice(0, 10).split("-");
    if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        const dt = new Date(y, m - 1, d);
        if (!Number.isNaN(dt.getTime())) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dd = String(d).padStart(2, "0");
            const yy = String(y).slice(-2);
            return `${dd}-${months[m - 1]}-${yy}`;
        }
    }
    return formatDate(dateStr);
}

function splitCleanLines(text) {
    if (!text) return [];
    return String(text)
        .split(/\r\n|\r|\n/)
        .map((line) => line.replace(/^[:\s]+/, "").trim())
        .filter(Boolean);
}

function createEmptyItemRow(docType) {
    return {
        uid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: "",
        quantity: "1",
        unit_price: "",
        discount: "",
        tax_rate: docType === DOC_TYPE_QUOTATION ? "12" : "",
    };
}

function computeFormFinancials(docType, items, taxMode = "inclusive") {
    let subtotal = 0;
    let discountTotal = 0;
    let vatableAmount = 0;
    let taxTotal = 0;
    let highestTaxRate = 0;

    const computedItems = (items || []).map((item, idx) => {
        const qtyRaw = parseFloat(item.quantity);
        const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 0;

        const priceRaw = parseFloat(item.unit_price);
        const unitPrice = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : 0;

        const grossLine = Math.round(qty * unitPrice * 100) / 100;

        const discRaw = item.discount === "" || item.discount === null || item.discount === undefined ? 0 : parseFloat(item.discount);
        const discount = Number.isFinite(discRaw) && discRaw > 0 ? Math.min(Math.round(discRaw * 100) / 100, grossLine) : 0;

        const taxRaw = item.tax_rate === "" || item.tax_rate === null || item.tax_rate === undefined ? 0 : parseFloat(item.tax_rate);
        const taxRate = Number.isFinite(taxRaw) && taxRaw > 0 ? Math.min(100, Math.round(taxRaw * 100) / 100) : 0;

        const netLineAmount = Math.max(0, Math.round((grossLine - discount) * 100) / 100);

        subtotal = Math.round((subtotal + netLineAmount) * 100) / 100;
        discountTotal = Math.round((discountTotal + discount) * 100) / 100;

        if (taxRate > 0) {
            highestTaxRate = Math.max(highestTaxRate, taxRate);
            if (taxMode === "exclusive") {
                const lineVatable = netLineAmount;
                const lineTax = Math.round(netLineAmount * (taxRate / 100) * 100) / 100;
                vatableAmount = Math.round((vatableAmount + lineVatable) * 100) / 100;
                taxTotal = Math.round((taxTotal + lineTax) * 100) / 100;
            } else {
                const lineVatable = Math.round((netLineAmount / (1 + taxRate / 100)) * 100) / 100;
                const lineTax = Math.round((netLineAmount - lineVatable) * 100) / 100;
                vatableAmount = Math.round((vatableAmount + lineVatable) * 100) / 100;
                taxTotal = Math.round((taxTotal + lineTax) * 100) / 100;
            }
        }

        return {
            ...item,
            item_number: idx + 1,
            computed_qty: qty,
            computed_unit_price: unitPrice,
            computed_discount: discount,
            computed_tax_rate: taxRate,
            amount: netLineAmount,
        };
    });

    const grandTotal =
        taxMode === "exclusive"
            ? Math.round((subtotal + taxTotal) * 100) / 100
            : subtotal;

    const effectiveTaxRate =
        highestTaxRate > 0
            ? highestTaxRate
            : docType === DOC_TYPE_QUOTATION
            ? 12
            : 0;

    return {
        items: computedItems,
        subtotal,
        discountTotal,
        vatableAmount,
        taxTotal,
        grandTotal,
        effectiveTaxRate,
    };
}

// ── Document A4 Visual Preview Component ─────────────────────────────────────
function DocumentPaperPreview({ form, financials }) {
    const isStatement = form.document_type === DOC_TYPE_STATEMENT;
    const company = {
        ...DEFAULT_COMPANY_INFO,
        ...(form.company || {}),
    };

    const inclusionLines = splitCleanLines(form.inclusions);
    const exclusionLines = splitCleanLines(form.exclusions);
    const workmanshipLines = splitCleanLines(form.workmanship);
    const paymentTermsLines = splitCleanLines(form.payment_terms);

    return (
        <div
            style={{
                background: "#FFFFFF",
                color: "#000000",
                fontFamily: '"Times New Roman", Times, Georgia, serif',
                fontSize: 12,
                lineHeight: 1.4,
                padding: "36px 42px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                maxWidth: 820,
                margin: "0 auto",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                }}
            >
                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        letterSpacing: 0.5,
                        margin: 0,
                        textTransform: "uppercase",
                        fontFamily: '"Times New Roman", Times, Georgia, serif',
                        color: "#000",
                    }}
                >
                    {isStatement ? "STATEMENT OF ACCOUNT" : "QUOTATION"}
                </h1>
                <div style={{ paddingRight: 18 }}>
                    <img
                        src={companyLogo}
                        alt="Cooling Tower Logo"
                        style={{
                            width: 68,
                            height: 68,
                            objectFit: "contain",
                        }}
                    />
                </div>
            </div>

            {/* Client & Company Block */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1.08fr 0.92fr",
                    gap: 20,
                    marginBottom: 18,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: isStatement ? "bold" : "normal",
                            marginBottom: 4,
                        }}
                    >
                        {isStatement ? "Bill to:" : "To:"}
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            marginBottom: 2,
                        }}
                    >
                        {form.client_name || "CLIENT / COMPANY NAME"}
                    </div>
                    {form.attention_to && (
                        <div
                            style={{
                                fontSize: 11.5,
                                textTransform: "uppercase",
                                marginBottom: 2,
                            }}
                        >
                            {form.attention_to}
                        </div>
                    )}
                    {form.client_address && (
                        <div
                            style={{
                                fontSize: 11.5,
                                whiteSpace: "pre-line",
                                textTransform: isStatement ? "uppercase" : "none",
                            }}
                        >
                            {form.client_address}
                        </div>
                    )}
                </div>

                <div>
                    {!isStatement && (
                        <div style={{ fontSize: 11, marginBottom: 3 }}>From:</div>
                    )}
                    <div
                        style={{
                            fontSize: 13.5,
                            fontWeight: "bold",
                            marginTop: isStatement ? 14 : 0,
                            marginBottom: 2,
                        }}
                    >
                        {company.name}
                    </div>
                    <div style={{ fontSize: 11 }}>{company.address_line1}</div>
                    <div style={{ fontSize: 11 }}>{company.address_line2}</div>
                    {isStatement ? (
                        <>
                            <div style={{ fontSize: 11, textDecoration: "underline" }}>
                                {company.email}
                            </div>
                            <div style={{ fontSize: 11 }}>{company.phone}</div>
                            <div style={{ fontSize: 11 }}>
                                BPI account name: {company.bpi_account_name}
                            </div>
                            <div style={{ fontSize: 11 }}>
                                BPI account no.: {company.bpi_account_number}
                            </div>
                            <div style={{ fontSize: 11 }}>Gcash: {company.gcash}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 11 }}>{company.email_phone}</div>
                            <div style={{ fontSize: 11 }}>
                                <strong>TIN:</strong> {company.tin}
                            </div>
                            <div style={{ fontSize: 11 }}>
                                <strong>BPI ACCOUNT</strong> - {company.bpi_account}
                            </div>
                            <div style={{ fontSize: 11 }}>
                                <strong>Gcash</strong> - {company.gcash}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Subject for Quotation */}
            {!isStatement && form.subject && (
                <div
                    style={{
                        fontSize: 12.5,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        margin: "14px 0",
                    }}
                >
                    {form.subject}
                </div>
            )}

            {/* Meta Info Table */}
            {isStatement ? (
                <table
                    style={{
                        width: "65%",
                        borderCollapse: "collapse",
                        marginBottom: 18,
                    }}
                >
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", fontSize: 11.5, paddingBottom: 4, width: "52%" }}>
                                Amount due
                            </th>
                            <th style={{ textAlign: "left", fontSize: 11.5, paddingBottom: 4, width: "24%" }}>
                                Due date
                            </th>
                            <th style={{ textAlign: "left", fontSize: 11.5, paddingBottom: 4, width: "24%" }}>
                                Issue date
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ fontWeight: "bold", fontSize: 12 }}>
                                {formatPeso2(financials.grandTotal)}
                            </td>
                            <td style={{ fontWeight: "bold", fontSize: 11.5 }}>
                                {formatShortDocDate(form.due_date)}
                            </td>
                            <td style={{ fontWeight: "bold", fontSize: 11.5 }}>
                                {formatShortDocDate(form.issue_date)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            ) : (
                <table
                    style={{
                        width: "65%",
                        borderCollapse: "collapse",
                        marginBottom: 16,
                    }}
                >
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", fontSize: 11.5, paddingBottom: 4, width: "42%" }}>
                                Quote number
                            </th>
                            <th style={{ textAlign: "left", fontSize: 11.5, paddingBottom: 4, width: "29%" }}>
                                Date
                            </th>
                            <th style={{ textAlign: "left", fontSize: 11.5, paddingBottom: 4, width: "29%" }}>
                                Expiry
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ fontSize: 11.5 }}>
                                {form.document_number || "QU-01"}
                            </td>
                            <td style={{ fontSize: 11.5 }}>
                                {formatShortDocDate(form.issue_date)}
                            </td>
                            <td style={{ fontSize: 11.5 }}>
                                {formatShortDocDate(form.expiry_date)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}

            {/* Itemized Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr
                        style={{
                            borderTop: "2.2px solid #000",
                            borderBottom: "1px solid #000",
                        }}
                    >
                        <th style={{ padding: "6px", textAlign: "center", width: "8%", fontSize: 11 }}>
                            Item no.
                        </th>
                        <th style={{ padding: "6px", textAlign: "center", width: "44%", fontSize: 11 }}>
                            Item/Work Description
                        </th>
                        <th style={{ padding: "6px", textAlign: "right", width: "10%", fontSize: 11 }}>
                            Quantity
                        </th>
                        <th style={{ padding: "6px", textAlign: "right", width: "12%", fontSize: 11 }}>
                            Unit Price
                        </th>
                        <th style={{ padding: "6px", textAlign: "right", width: "10%", fontSize: 11 }}>
                            Discount
                        </th>
                        <th style={{ padding: "6px", textAlign: "center", width: "7%", fontSize: 11 }}>
                            Tax
                        </th>
                        <th style={{ padding: "6px", textAlign: "right", width: "9%", fontSize: 11 }}>
                            Amount
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {financials.items.map((item, idx) => {
                        const isLast = idx === financials.items.length - 1;
                        return (
                            <tr
                                key={item.uid || idx}
                                style={{
                                    borderBottom: isLast
                                        ? isStatement
                                            ? "1.4px solid #000"
                                            : "2.2px solid #000"
                                        : "0.8px solid #333",
                                }}
                            >
                                <td style={{ padding: "10px 6px", textAlign: "center", fontSize: 11.5 }}>
                                    {idx + 1}
                                </td>
                                <td
                                    style={{
                                        padding: "10px 6px",
                                        textAlign: "center",
                                        whiteSpace: "pre-line",
                                        fontSize: 11.5,
                                    }}
                                >
                                    {item.description || "—"}
                                </td>
                                <td style={{ padding: "10px 6px", textAlign: "right", fontSize: 11.5 }}>
                                    {formatNumber2(item.computed_qty)}
                                </td>
                                <td style={{ padding: "10px 6px", textAlign: "right", fontSize: 11.5 }}>
                                    {formatNumber2(item.computed_unit_price)}
                                </td>
                                <td style={{ padding: "10px 6px", textAlign: "right", fontSize: 11.5 }}>
                                    {item.computed_discount > 0
                                        ? formatNumber2(item.computed_discount)
                                        : ""}
                                </td>
                                <td style={{ padding: "10px 6px", textAlign: "center", fontSize: 11.5 }}>
                                    {item.computed_tax_rate > 0
                                        ? `${item.computed_tax_rate}%`
                                        : ""}
                                </td>
                                <td style={{ padding: "10px 6px", textAlign: "right", fontSize: 11.5 }}>
                                    {formatNumber2(item.amount)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Financial Summary */}
            {isStatement ? (
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: 32,
                    }}
                >
                    <tbody>
                        <tr>
                            <td style={{ width: "64%" }} />
                            <td
                                style={{
                                    width: "18%",
                                    padding: "6px",
                                    fontSize: 11.5,
                                    borderBottom:
                                        financials.taxTotal > 0 && form.tax_mode === "exclusive"
                                            ? "none"
                                            : "1.8px solid #000",
                                }}
                            >
                                Sub-total
                            </td>
                            <td
                                style={{
                                    width: "18%",
                                    padding: "6px",
                                    textAlign: "right",
                                    fontSize: 11.5,
                                    borderBottom:
                                        financials.taxTotal > 0 && form.tax_mode === "exclusive"
                                            ? "none"
                                            : "1.8px solid #000",
                                }}
                            >
                                {formatNumber2(financials.subtotal)}
                            </td>
                        </tr>
                        {financials.taxTotal > 0 && form.tax_mode === "exclusive" && (
                            <tr>
                                <td />
                                <td
                                    style={{
                                        padding: "6px",
                                        fontSize: 11.5,
                                        borderBottom: "1.8px solid #000",
                                    }}
                                >
                                    Tax ({financials.effectiveTaxRate}%)
                                </td>
                                <td
                                    style={{
                                        padding: "6px",
                                        textAlign: "right",
                                        fontSize: 11.5,
                                        borderBottom: "1.8px solid #000",
                                    }}
                                >
                                    {formatNumber2(financials.taxTotal)}
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td />
                            <td
                                style={{
                                    padding: "7px 6px",
                                    fontWeight: "bold",
                                    fontSize: 12.5,
                                }}
                            >
                                Amount Due
                            </td>
                            <td
                                style={{
                                    padding: "7px 6px",
                                    textAlign: "right",
                                    fontWeight: "bold",
                                    fontSize: 12.5,
                                }}
                            >
                                {formatNumber2(financials.grandTotal)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            ) : (
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: 18,
                    }}
                >
                    <tbody>
                        <tr>
                            <td style={{ width: "52%" }} />
                            <td
                                style={{
                                    width: "12%",
                                    padding: "5px 6px",
                                    textAlign: "center",
                                    borderBottom: "1px solid #000",
                                    fontSize: 11.5,
                                }}
                            >
                                {financials.discountTotal > 0
                                    ? formatNumber2(financials.discountTotal)
                                    : "-"}
                            </td>
                            <td
                                style={{
                                    width: "20%",
                                    padding: "5px 6px",
                                    textAlign: "right",
                                    borderBottom: "1px solid #000",
                                    fontSize: 11.5,
                                }}
                            >
                                Sub-total
                            </td>
                            <td
                                style={{
                                    width: "16%",
                                    padding: "5px 6px",
                                    textAlign: "right",
                                    borderBottom: "1px solid #000",
                                    fontSize: 11.5,
                                }}
                            >
                                {formatNumber2(financials.subtotal)}
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td />
                            <td style={{ padding: "5px 6px", textAlign: "right", fontSize: 11.5 }}>
                                Vatable
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right", fontSize: 11.5 }}>
                                {formatNumber2(financials.vatableAmount)}
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td style={{ borderBottom: "1.8px solid #000" }} />
                            <td
                                style={{
                                    padding: "5px 6px",
                                    textAlign: "right",
                                    borderBottom: "1.8px solid #000",
                                    fontSize: 11.5,
                                }}
                            >
                                {financials.effectiveTaxRate}% Vat
                            </td>
                            <td
                                style={{
                                    padding: "5px 6px",
                                    textAlign: "right",
                                    borderBottom: "1.8px solid #000",
                                    fontSize: 11.5,
                                }}
                            >
                                {formatNumber2(financials.taxTotal)}
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td />
                            <td
                                style={{
                                    padding: "7px 6px",
                                    textAlign: "right",
                                    fontWeight: "bold",
                                    fontSize: 12.5,
                                }}
                            >
                                Grand Total
                            </td>
                            <td
                                style={{
                                    padding: "7px 6px",
                                    textAlign: "right",
                                    fontWeight: "bold",
                                    fontSize: 12.5,
                                }}
                            >
                                {formatNumber2(financials.grandTotal)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}

            {/* Additional Terms for Quotation */}
            {!isStatement && (
                <div style={{ marginTop: 12, fontSize: 11.5 }}>
                    {inclusionLines.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div
                                style={{
                                    fontWeight: "bold",
                                    textDecoration: "underline",
                                    marginBottom: 2,
                                }}
                            >
                                INCLUSIONS
                            </div>
                            {inclusionLines.map((line, i) => (
                                <div key={i} style={{ marginLeft: 56 }}>
                                    : {line}
                                </div>
                            ))}
                        </div>
                    )}

                    {exclusionLines.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div
                                style={{
                                    fontWeight: "bold",
                                    textDecoration: "underline",
                                    marginBottom: 2,
                                }}
                            >
                                EXCLUSIONS
                            </div>
                            {exclusionLines.map((line, i) => (
                                <div key={i} style={{ marginLeft: 56 }}>
                                    : {line}
                                </div>
                            ))}
                        </div>
                    )}

                    {workmanshipLines.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div
                                style={{
                                    fontWeight: "bold",
                                    textDecoration: "underline",
                                    marginBottom: 2,
                                }}
                            >
                                WORKSMANSHIP
                            </div>
                            {workmanshipLines.map((line, i) => (
                                <div key={i} style={{ marginLeft: 56 }}>
                                    : {line}
                                </div>
                            ))}
                        </div>
                    )}

                    {paymentTermsLines.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div
                                style={{
                                    fontWeight: "bold",
                                    textDecoration: "underline",
                                    marginBottom: 2,
                                }}
                            >
                                PAYMENT TERMS
                            </div>
                            {paymentTermsLines.map((line, i) => (
                                <div key={i} style={{ marginLeft: 56 }}>
                                    : {line}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ margin: "18px 0 26px 36px" }}>
                        Thank you for giving us the opportunity to quote. If you find this acceptable please sign the space provided below.
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                    marginTop: 28,
                    fontSize: 11.5,
                }}
            >
                <div>
                    <div>
                        Prepare by:{" "}
                        <span style={{ fontWeight: "bold", textDecoration: "underline" }}>
                            {form.prepared_by_name || "Jeffrey D. Julian"}
                        </span>
                    </div>
                    <div style={{ fontSize: 10.5, paddingLeft: 48 }}>
                        {form.prepared_by_title || "Admin Assistant"}
                    </div>
                    <div style={{ fontSize: 10.5 }}>{company.name}</div>
                </div>

                <div>
                    <div>
                        Approved by:{" "}
                        <span style={{ fontWeight: "bold", textDecoration: "underline" }}>
                            {form.approved_by_name || "Georgita K. apostol"}
                        </span>
                    </div>
                    <div style={{ fontSize: 10.5, paddingLeft: 52 }}>
                        {form.approved_by_title || "Store Manager/Owner"}
                    </div>
                    <div style={{ fontSize: 10.5, paddingLeft: 12 }}>{company.name}</div>
                </div>

                <div>
                    <div style={{ display: "inline-flex", alignItems: "flex-end" }}>
                        <span style={{ whiteSpace: "nowrap" }}>Received by:&nbsp;</span>
                        <div style={{ display: "inline-block", textAlign: "center" }}>
                            <span
                                style={{
                                    display: "block",
                                    borderBottom: "1px solid #000",
                                    minWidth: 160,
                                    textAlign: "center",
                                    padding: "0 6px 1px",
                                }}
                            >
                                {form.received_by_name ? (
                                    <strong>
                                        {form.received_by_name}
                                        {form.received_date
                                            ? ` / ${formatShortDocDate(form.received_date)}`
                                            : ""}
                                    </strong>
                                ) : (
                                    "\u00A0"
                                )}
                            </span>
                            <div style={{ fontSize: 10, marginTop: 3, textAlign: "center", color: "#333" }}>
                                Signature over Printed Name/Date
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Documents Component ─────────────────────────────────────────────────
function Documents({ addToast }) {
    const [docs, setDocs] = useState([]);
    const [nextNumbers, setNextNumbers] = useState({
        [DOC_TYPE_QUOTATION]: "QU-01",
        [DOC_TYPE_STATEMENT]: "SOA-01",
    });
    const [loading, setLoading] = useState(true);

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    // View mode: "dashboard" | "form" | "view"
    const [viewMode, setViewMode] = useState("dashboard");
    const [editingId, setEditingId] = useState(null);
    const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [saving, setSaving] = useState(false);

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const todayStr = useMemo(() => toInputDate(new Date()), []);
    const defaultExpiryStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return toInputDate(d);
    }, []);

    const [form, setForm] = useState({
        document_type: DOC_TYPE_QUOTATION,
        document_number: "QU-01",
        client_name: "",
        client_address: "",
        attention_to: "",
        subject: "",
        issue_date: todayStr,
        due_date: defaultExpiryStr,
        expiry_date: defaultExpiryStr,
        tax_mode: "inclusive",
        inclusions: DEFAULT_QUOTATION_TERMS.inclusions,
        exclusions: DEFAULT_QUOTATION_TERMS.exclusions,
        workmanship: DEFAULT_QUOTATION_TERMS.workmanship,
        payment_terms: DEFAULT_QUOTATION_TERMS.payment_terms,
        prepared_by_name: "Jeffrey D. Julian",
        prepared_by_title: "Admin Assistant",
        approved_by_name: "Georgita K. apostol",
        approved_by_title: "Store Manager/Owner",
        received_by_name: "",
        received_date: "",
        notes: "",
        company: { ...DEFAULT_COMPANY_INFO },
        items: [createEmptyItemRow(DOC_TYPE_QUOTATION)],
    });

    const [showCompanySettings, setShowCompanySettings] = useState(false);

    const fetchDocuments = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    SUPER_ADMIN_ENDPOINTS.documents,
                );
                setDocs(Array.isArray(data?.data) ? data.data : []);
                if (data?.next_numbers) {
                    setNextNumbers((prev) => ({
                        ...prev,
                        ...data.next_numbers,
                    }));
                }
            } catch (error) {
                addToast(
                    extractErrorMessage(error, "Unable to load documents."),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Filtered documents for table
    const filteredDocs = useMemo(() => {
        return docs.filter((doc) => {
            if (typeFilter !== "all" && doc.document_type !== typeFilter) {
                return false;
            }
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase().trim();
                const matchNumber = (doc.document_number || "").toLowerCase().includes(q);
                const matchClient = (doc.client_name || "").toLowerCase().includes(q);
                const matchType = (doc.document_type_label || "").toLowerCase().includes(q);
                const matchCreator = (doc.created_by_name || "").toLowerCase().includes(q);
                const matchSubject = (doc.subject || "").toLowerCase().includes(q);
                return matchNumber || matchClient || matchType || matchCreator || matchSubject;
            }
            return true;
        });
    }, [docs, typeFilter, searchQuery]);

    // Real-time financial calculation
    const financials = useMemo(
        () => computeFormFinancials(form.document_type, form.items, form.tax_mode),
        [form.document_type, form.items, form.tax_mode],
    );

    // Start creating a new Quotation or Statement of Account
    const handleStartCreate = async (docType) => {
        let suggestedNum = nextNumbers[docType] || (docType === DOC_TYPE_STATEMENT ? "SOA-01" : "QU-01");
        try {
            const { data } = await window.axios.get(
                SUPER_ADMIN_ENDPOINTS.nextDocumentNumber(docType),
            );
            if (data?.document_number) {
                suggestedNum = data.document_number;
            }
        } catch {
            // fallback to cached next number
        }

        setEditingId(null);
        setShowCompanySettings(false);
        setForm({
            document_type: docType,
            document_number: suggestedNum,
            client_name: "",
            client_address: "",
            attention_to: "",
            subject: "",
            issue_date: todayStr,
            due_date: defaultExpiryStr,
            expiry_date: defaultExpiryStr,
            tax_mode: "inclusive",
            inclusions: docType === DOC_TYPE_QUOTATION ? DEFAULT_QUOTATION_TERMS.inclusions : "",
            exclusions: docType === DOC_TYPE_QUOTATION ? DEFAULT_QUOTATION_TERMS.exclusions : "",
            workmanship: docType === DOC_TYPE_QUOTATION ? DEFAULT_QUOTATION_TERMS.workmanship : "",
            payment_terms: docType === DOC_TYPE_QUOTATION ? DEFAULT_QUOTATION_TERMS.payment_terms : "",
            prepared_by_name: "Jeffrey D. Julian",
            prepared_by_title: "Admin Assistant",
            approved_by_name: "Georgita K. apostol",
            approved_by_title: "Store Manager/Owner",
            received_by_name: "",
            received_date: "",
            notes: "",
            company: { ...DEFAULT_COMPANY_INFO },
            items: [createEmptyItemRow(docType)],
        });
        setViewMode("form");
    };

    // Start editing an existing document
    const handleStartEdit = (doc) => {
        const docType = doc.document_type || DOC_TYPE_QUOTATION;
        const savedCompany = doc.additional_details?.company || {};
        const savedTaxMode = doc.additional_details?.tax_mode || "inclusive";

        const mappedItems =
            Array.isArray(doc.items) && doc.items.length > 0
                ? doc.items.map((it, idx) => ({
                      uid: `saved-${it.id || idx}-${Date.now()}`,
                      description: it.description ?? "",
                      quantity: String(it.quantity ?? 1),
                      unit_price: String(it.unit_price ?? 0),
                      discount:
                          Number(it.discount) > 0 ? String(it.discount) : "",
                      tax_rate:
                          Number(it.tax_rate) > 0 ? String(it.tax_rate) : "",
                  }))
                : [createEmptyItemRow(docType)];

        setEditingId(doc.doc_id);
        setShowCompanySettings(false);
        setForm({
            document_type: docType,
            document_number: doc.document_number || "",
            client_name: doc.client_name || "",
            client_address: doc.client_address || "",
            attention_to: doc.attention_to || "",
            subject: doc.subject || "",
            issue_date: toInputDate(doc.issue_date) || todayStr,
            due_date: toInputDate(doc.due_date) || "",
            expiry_date: toInputDate(doc.expiry_date) || "",
            tax_mode: savedTaxMode,
            inclusions: doc.inclusions ?? "",
            exclusions: doc.exclusions ?? "",
            workmanship: doc.workmanship ?? "",
            payment_terms: doc.payment_terms ?? "",
            prepared_by_name: doc.prepared_by_name || "Jeffrey D. Julian",
            prepared_by_title: doc.prepared_by_title || "Admin Assistant",
            approved_by_name: doc.approved_by_name || "Georgita K. apostol",
            approved_by_title: doc.approved_by_title || "Store Manager/Owner",
            received_by_name: doc.received_by_name || "",
            received_date: toInputDate(doc.received_date) || "",
            notes: doc.notes || "",
            company: {
                ...DEFAULT_COMPANY_INFO,
                ...savedCompany,
            },
            items: mappedItems,
        });
        setViewMode("form");
    };

    // View saved document preview
    const handleViewDocument = (doc) => {
        setViewingDoc(doc);
        setViewMode("view");
    };

    // Dynamic Item Row Handlers
    const handleAddItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, createEmptyItemRow(prev.document_type)],
        }));
    };

    const handleRemoveItem = (uid) => {
        setForm((prev) => {
            if (prev.items.length <= 1) {
                addToast("A document must contain at least one item row.", "error");
                return prev;
            }
            return {
                ...prev,
                items: prev.items.filter((item) => item.uid !== uid),
            };
        });
    };

    const handleItemChange = (uid, field, value) => {
        let cleanVal = value;
        if (["quantity", "unit_price", "discount", "tax_rate"].includes(field)) {
            // Strip out non-numeric characters except decimal point
            cleanVal = value.replace(/[^0-9.]/g, "");
            const parts = cleanVal.split(".");
            if (parts.length > 2) {
                cleanVal = parts[0] + "." + parts.slice(1).join("");
            }
        }
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
                item.uid === uid ? { ...item, [field]: cleanVal } : item,
            ),
        }));
    };

    const handleItemBlur = (uid, field) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
                if (item.uid !== uid) return item;
                const raw = String(item[field] ?? "").trim();
                if (raw === "") return item;
                const num = parseFloat(raw);
                if (!Number.isFinite(num)) {
                    return { ...item, [field]: "" };
                }
                if (field === "quantity" || field === "unit_price") {
                    return { ...item, [field]: num.toFixed(2) };
                }
                if (field === "discount") {
                    return { ...item, [field]: num > 0 ? num.toFixed(2) : "" };
                }
                if (field === "tax_rate") {
                    return { ...item, [field]: num > 0 ? String(Math.round(num * 100) / 100) : "" };
                }
                return item;
            }),
        }));
    };

    // Validate before previewing or saving
    const validateForm = () => {
        if (!form.client_name.trim()) {
            addToast("Please enter the Client / Company Name.", "error");
            return false;
        }
        if (!form.issue_date) {
            addToast("Please select the Date / Issue Date.", "error");
            return false;
        }
        if (!Array.isArray(form.items) || form.items.length === 0) {
            addToast("Please add at least one item or service row.", "error");
            return false;
        }

        for (let i = 0; i < form.items.length; i++) {
            const it = form.items[i];
            if (!String(it.description || "").trim()) {
                addToast(`Item #${i + 1}: Please enter an Item / Work Description.`, "error");
                return false;
            }
            const qty = parseFloat(it.quantity);
            if (!Number.isFinite(qty) || qty <= 0) {
                addToast(`Item #${i + 1}: Quantity must be greater than zero.`, "error");
                return false;
            }
            const price = parseFloat(it.unit_price);
            if (!Number.isFinite(price) || price < 0) {
                addToast(`Item #${i + 1}: Please enter a valid Unit Price (0 or more).`, "error");
                return false;
            }
        }
        return true;
    };

    // Save Document (Create or Update)
    const handleSaveDocument = async () => {
        if (saving) return;
        if (!validateForm()) return;

        setSaving(true);

        const payload = {
            document_type: form.document_type,
            document_number: form.document_number.trim() || null,
            client_name: form.client_name.trim(),
            client_address: form.client_address.trim() || null,
            attention_to: form.attention_to.trim() || null,
            subject: form.subject.trim() || null,
            issue_date: form.issue_date,
            due_date: form.due_date || null,
            expiry_date: form.expiry_date || null,
            tax_mode: form.tax_mode,
            inclusions: form.inclusions.trim() || null,
            exclusions: form.exclusions.trim() || null,
            workmanship: form.workmanship.trim() || null,
            payment_terms: form.payment_terms.trim() || null,
            prepared_by_name: form.prepared_by_name.trim() || "Jeffrey D. Julian",
            prepared_by_title: form.prepared_by_title.trim() || "Admin Assistant",
            approved_by_name: form.approved_by_name.trim() || "Georgita K. apostol",
            approved_by_title: form.approved_by_title.trim() || "Store Manager/Owner",
            received_by_name: form.received_by_name.trim() || null,
            received_date: form.received_date || null,
            notes: form.notes.trim() || null,
            additional_details: {
                company: form.company,
                tax_mode: form.tax_mode,
            },
            items: form.items.map((item) => ({
                description: String(item.description || "").trim(),
                quantity: parseFloat(item.quantity) || 1,
                unit_price: parseFloat(item.unit_price) || 0,
                discount:
                    item.discount === "" || item.discount === null
                        ? 0
                        : parseFloat(item.discount) || 0,
                tax_rate:
                    item.tax_rate === "" || item.tax_rate === null
                        ? 0
                        : parseFloat(item.tax_rate) || 0,
            })),
        };

        try {
            if (editingId) {
                const { data } = await window.axios.put(
                    SUPER_ADMIN_ENDPOINTS.updateDocument(editingId),
                    payload,
                );
                addToast(data?.message || "Document updated successfully.");
            } else {
                const { data } = await window.axios.post(
                    SUPER_ADMIN_ENDPOINTS.documents,
                    payload,
                );
                addToast(data?.message || "Document created and saved successfully.");
            }

            setShowLivePreviewModal(false);
            setViewMode("dashboard");
            setEditingId(null);
            await fetchDocuments(false);
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to save the document."),
                "error",
            );
        } finally {
            setSaving(false);
        }
    };

    // Delete Document
    const handleDeleteDocument = async () => {
        if (deleting || !deleteTarget) return;

        setDeleting(true);
        try {
            const { data } = await window.axios.delete(
                SUPER_ADMIN_ENDPOINTS.deleteDocument(deleteTarget.doc_id),
            );
            addToast(data?.message || "Document deleted successfully.");
            setDeleteTarget(null);
            if (viewingDoc?.doc_id === deleteTarget.doc_id) {
                setViewingDoc(null);
                setViewMode("dashboard");
            }
            await fetchDocuments(false);
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to delete the document."),
                "error",
            );
        } finally {
            setDeleting(false);
        }
    };

    // Download PDF or Print
    const handleDownloadPdf = (docId) => {
        window.open(SUPER_ADMIN_ENDPOINTS.downloadDocumentPdf(docId), "_blank");
    };

    const handlePrintDocument = (docId) => {
        window.open(SUPER_ADMIN_ENDPOINTS.printDocument(docId), "_blank");
    };

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW MODE: VIEW SAVED DOCUMENT
    // ══════════════════════════════════════════════════════════════════════════
    if (viewMode === "view" && viewingDoc) {
        const viewingForm = {
            document_type: viewingDoc.document_type,
            document_number: viewingDoc.document_number,
            client_name: viewingDoc.client_name,
            client_address: viewingDoc.client_address,
            attention_to: viewingDoc.attention_to,
            subject: viewingDoc.subject,
            issue_date: viewingDoc.issue_date,
            due_date: viewingDoc.due_date,
            expiry_date: viewingDoc.expiry_date,
            tax_mode: viewingDoc.additional_details?.tax_mode || "inclusive",
            inclusions: viewingDoc.inclusions,
            exclusions: viewingDoc.exclusions,
            workmanship: viewingDoc.workmanship,
            payment_terms: viewingDoc.payment_terms,
            prepared_by_name: viewingDoc.prepared_by_name,
            prepared_by_title: viewingDoc.prepared_by_title,
            approved_by_name: viewingDoc.approved_by_name,
            approved_by_title: viewingDoc.approved_by_title,
            received_by_name: viewingDoc.received_by_name,
            received_date: viewingDoc.received_date,
            company: {
                ...DEFAULT_COMPANY_INFO,
                ...(viewingDoc.additional_details?.company || {}),
            },
            items: viewingDoc.items || [],
        };

        const viewingFinancials = computeFormFinancials(
            viewingForm.document_type,
            viewingForm.items,
            viewingForm.tax_mode,
        );

        return (
            <div style={{ animation: "fadeInUp 0.25s ease" }}>
                <div className="page-header">
                    <div>
                        <button
                            onClick={() => {
                                setViewingDoc(null);
                                setViewMode("dashboard");
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#3F7DFF",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 6,
                                fontFamily: "inherit",
                                padding: 0,
                            }}
                        >
                            ← Back to Documents / Forms
                        </button>
                        <h1 className="page-title font-display">
                            {viewingDoc.document_type_label} — {viewingDoc.document_number}
                        </h1>
                        <p className="page-subtitle">
                            Client: {viewingDoc.client_name} · Issue Date: {formatDate(viewingDoc.issue_date)}
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            className="btn-secondary"
                            onClick={() => handleStartEdit(viewingDoc)}
                        >
                            <EditIcon size={14} />
                            <span>Edit Document</span>
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => handlePrintDocument(viewingDoc.doc_id)}
                        >
                            <PrintIcon size={14} />
                            <span>Print</span>
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => handleDownloadPdf(viewingDoc.doc_id)}
                        >
                            <DownloadIcon size={14} />
                            <span>Download PDF</span>
                        </button>
                    </div>
                </div>

                <div style={{ paddingBottom: 40 }}>
                    <DocumentPaperPreview
                        form={viewingForm}
                        financials={viewingFinancials}
                    />
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW MODE: CREATE / EDIT DOCUMENT FORM
    // ══════════════════════════════════════════════════════════════════════════
    if (viewMode === "form") {
        const isStatement = form.document_type === DOC_TYPE_STATEMENT;
        const formTitle = editingId
            ? isStatement
                ? `Edit Statement of Account (${form.document_number})`
                : `Edit Quotation Form (${form.document_number})`
            : isStatement
            ? "Create New Statement of Account"
            : "Create New Quotation Form";

        return (
            <div style={{ animation: "fadeInUp 0.25s ease", paddingBottom: 48 }}>
                <div className="page-header">
                    <div>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setViewMode("dashboard");
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#3F7DFF",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 6,
                                fontFamily: "inherit",
                                padding: 0,
                            }}
                        >
                            ← Back to Documents / Forms
                        </button>
                        <h1 className="page-title font-display">{formTitle}</h1>
                        <p className="page-subtitle">
                            All fields, item descriptions, quantities, prices, discounts, and tax rates are fully editable.
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowCompanySettings((s) => !s)}
                        >
                            {showCompanySettings ? "Hide Company Header Info" : "Edit Company Header Info"}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                if (validateForm()) {
                                    setShowLivePreviewModal(true);
                                }
                            }}
                        >
                            <EyeIcon size={14} />
                            <span>Preview Document</span>
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={saving}
                            onClick={handleSaveDocument}
                        >
                            {saving
                                ? "Saving..."
                                : editingId
                                ? "Save Changes"
                                : isStatement
                                ? "Save Statement of Account"
                                : "Save Quotation"}
                        </button>
                    </div>
                </div>

                {/* Collapsible Company Header Details */}
                {showCompanySettings && (
                    <div
                        className="card"
                        style={{
                            padding: 22,
                            marginBottom: 20,
                            border: "1px solid #BFDBFE",
                            background: "#F8FAFC",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 14,
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                }}
                            >
                                Company Header & Payment Information
                            </h3>
                            <span style={{ fontSize: 12, color: "#64748B" }}>
                                Pre-filled with Cooling Tower Airconditioning Services details (editable)
                            </span>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: 14,
                            }}
                        >
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                    Company Name
                                </label>
                                <input
                                    className="input-field"
                                    value={form.company.name}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            company: { ...p.company, name: e.target.value },
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                    Address Line 1
                                </label>
                                <input
                                    className="input-field"
                                    value={form.company.address_line1}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            company: { ...p.company, address_line1: e.target.value },
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                    Address Line 2
                                </label>
                                <input
                                    className="input-field"
                                    value={form.company.address_line2}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            company: { ...p.company, address_line2: e.target.value },
                                        }))
                                    }
                                />
                            </div>
                            {isStatement ? (
                                <>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            Email Address
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.email}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, email: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            Contact Number
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.phone}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, phone: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            BPI Account Name
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.bpi_account_name}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, bpi_account_name: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            BPI Account Number
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.bpi_account_number}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, bpi_account_number: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            Email / Contact Number
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.email_phone}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, email_phone: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            TIN
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.tin}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, tin: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                            BPI Account Info
                                        </label>
                                        <input
                                            className="input-field"
                                            value={form.company.bpi_account}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    company: { ...p.company, bpi_account: e.target.value },
                                                }))
                                            }
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 5 }}>
                                    GCash Number
                                </label>
                                <input
                                    className="input-field"
                                    value={form.company.gcash}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            company: { ...p.company, gcash: e.target.value },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Client & Document Information */}
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <h3
                        style={{
                            margin: "0 0 16px 0",
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            borderBottom: "1px solid #F1F5F9",
                            paddingBottom: 10,
                        }}
                    >
                        {isStatement
                            ? "1. Client (Bill To) & Statement Information"
                            : "1. Client & Quotation Information"}
                    </h3>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 16,
                        }}
                    >
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                {isStatement ? "Statement Number *" : "Quotation Number *"}
                            </label>
                            <input
                                className="input-field"
                                placeholder={isStatement ? "e.g. SOA-01" : "e.g. QU-00"}
                                value={form.document_number}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, document_number: e.target.value }))
                                }
                            />
                        </div>

                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                {isStatement ? "Bill To — Client / Company Name *" : "Client / Company Name *"}
                            </label>
                            <input
                                className="input-field"
                                placeholder={isStatement ? "e.g. ASTORIA REGENCY HOTEL" : "e.g. 2GO"}
                                value={form.client_name}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, client_name: e.target.value }))
                                }
                            />
                        </div>

                        {isStatement && (
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Attention To
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. ATTENTION MARK"
                                    value={form.attention_to}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, attention_to: e.target.value }))
                                    }
                                />
                            </div>
                        )}

                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Client Address
                            </label>
                            <input
                                className="input-field"
                                placeholder={
                                    isStatement
                                        ? "e.g. PASONANCA, ZAMBOANGA CITY"
                                        : "e.g. CAGAYAN DE ORO CITY"
                                }
                                value={form.client_address}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, client_address: e.target.value }))
                                }
                            />
                        </div>

                        {!isStatement && (
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Quotation Title / Subject Heading (Optional)
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. QUOTATION FOR GENERAL CLEANING AIRCON UNITS"
                                    value={form.subject}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, subject: e.target.value }))
                                    }
                                />
                            </div>
                        )}

                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                {isStatement ? "Issue Date *" : "Quotation Date *"}
                            </label>
                            <input
                                type="date"
                                className="input-field"
                                value={form.issue_date}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, issue_date: e.target.value }))
                                }
                            />
                        </div>

                        {isStatement ? (
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={form.due_date}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, due_date: e.target.value }))
                                    }
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={form.expiry_date}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, expiry_date: e.target.value }))
                                    }
                                />
                            </div>
                        )}

                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Tax Calculation Treatment
                            </label>
                            <select
                                className="input-field"
                                value={form.tax_mode}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, tax_mode: e.target.value }))
                                }
                            >
                                <option value="inclusive">
                                    VAT Inclusive (Matches Client PDF: Vatable = Subtotal ÷ 1.12)
                                </option>
                                <option value="exclusive">
                                    VAT Exclusive (Add Tax on top of Subtotal)
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Dynamic Itemized Services / Materials Table */}
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 12,
                            marginBottom: 16,
                            borderBottom: "1px solid #F1F5F9",
                            paddingBottom: 12,
                        }}
                    >
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                }}
                            >
                                2. Itemized Services & Materials Table
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                                Add unlimited items. Discount and Tax are optional (leave blank or 0 if not applicable).
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleAddItem}
                        >
                            <PlusIcon size={15} />
                            <span>Add Item Row</span>
                        </button>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                                    <th style={{ padding: "10px 8px", textAlign: "center", width: 64, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Item No.
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Item / Work Description *
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "right", width: 110, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Quantity *
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "right", width: 140, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Unit Price (₱) *
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "right", width: 130, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Discount (₱)
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "right", width: 105, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Tax (%)
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "right", width: 140, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Amount (₱)
                                    </th>
                                    <th style={{ padding: "10px 8px", textAlign: "center", width: 64, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {financials.items.map((item, idx) => (
                                    <tr
                                        key={item.uid}
                                        style={{
                                            borderBottom: "1px solid #F1F5F9",
                                            verticalAlign: "top",
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                textAlign: "center",
                                                fontWeight: 700,
                                                color: "#1E2F5F",
                                                fontSize: 13,
                                            }}
                                        >
                                            {idx + 1}
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            <textarea
                                                rows={2}
                                                className="input-field"
                                                style={{ resize: "vertical", minHeight: 42 }}
                                                placeholder="Enter custom service, work, labor, installation, repair, or material description..."
                                                value={item.description}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.uid,
                                                        "description",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="input-field"
                                                style={{ textAlign: "right" }}
                                                placeholder="1.00"
                                                value={item.quantity}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.uid,
                                                        "quantity",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={() => handleItemBlur(item.uid, "quantity")}
                                            />
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="input-field"
                                                style={{ textAlign: "right" }}
                                                placeholder="0.00"
                                                value={item.unit_price}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.uid,
                                                        "unit_price",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={() => handleItemBlur(item.uid, "unit_price")}
                                            />
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="input-field"
                                                style={{ textAlign: "right" }}
                                                placeholder="0.00 (Optional)"
                                                value={item.discount}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.uid,
                                                        "discount",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={() => handleItemBlur(item.uid, "discount")}
                                            />
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="input-field"
                                                style={{ textAlign: "right" }}
                                                placeholder="0%"
                                                value={item.tax_rate}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.uid,
                                                        "tax_rate",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={() => handleItemBlur(item.uid, "tax_rate")}
                                            />
                                        </td>
                                        <td
                                            style={{
                                                padding: "14px 8px",
                                                textAlign: "right",
                                                fontWeight: 700,
                                                fontSize: 13.5,
                                                color: "#1E2F5F",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {formatPeso2(item.amount)}
                                        </td>
                                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                                            <button
                                                type="button"
                                                title="Remove item row"
                                                onClick={() => handleRemoveItem(item.uid)}
                                                style={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 8,
                                                    border: "1px solid #FECACA",
                                                    background: "#FEF2F2",
                                                    color: "#DC2626",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    cursor:
                                                        form.items.length <= 1
                                                            ? "not-allowed"
                                                            : "pointer",
                                                    opacity: form.items.length <= 1 ? 0.45 : 1,
                                                }}
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div
                        style={{
                            marginTop: 14,
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: 20,
                        }}
                    >
                        {/* Financial Summary Box */}
                        <div
                            style={{
                                minWidth: 320,
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                padding: "16px 20px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 8,
                                    fontSize: 13,
                                    color: "#475569",
                                }}
                            >
                                <span>Sub-total:</span>
                                <strong style={{ color: "#1E2F5F" }}>
                                    {formatPeso2(financials.subtotal)}
                                </strong>
                            </div>

                            {financials.discountTotal > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                        fontSize: 12.5,
                                        color: "#64748B",
                                    }}
                                >
                                    <span>Total Discounts Applied:</span>
                                    <span>- {formatPeso2(financials.discountTotal)}</span>
                                </div>
                            )}

                            {!isStatement && (
                                <>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                            fontSize: 13,
                                            color: "#475569",
                                        }}
                                    >
                                        <span>Vatable Amount:</span>
                                        <span>{formatPeso2(financials.vatableAmount)}</span>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 10,
                                            fontSize: 13,
                                            color: "#475569",
                                        }}
                                    >
                                        <span>VAT ({financials.effectiveTaxRate}%):</span>
                                        <span>{formatPeso2(financials.taxTotal)}</span>
                                    </div>
                                </>
                            )}

                            {isStatement && financials.taxTotal > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: 10,
                                        fontSize: 13,
                                        color: "#475569",
                                    }}
                                >
                                    <span>
                                        Tax ({financials.effectiveTaxRate}%{" "}
                                        {form.tax_mode === "inclusive" ? "Included" : "Added"}):
                                    </span>
                                    <span>{formatPeso2(financials.taxTotal)}</span>
                                </div>
                            )}

                            <div
                                style={{
                                    borderTop: "2px solid #CBD5E1",
                                    paddingTop: 10,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: "#1E2F5F",
                                }}
                            >
                                <span>{isStatement ? "Amount Due:" : "Grand Total:"}</span>
                                <span style={{ color: "#3F7DFF", fontSize: 17 }}>
                                    {formatPeso2(financials.grandTotal)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Sections for Quotation OR Notes for Statement */}
                {!isStatement ? (
                    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                        <h3
                            style={{
                                margin: "0 0 16px 0",
                                fontSize: 15,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                borderBottom: "1px solid #F1F5F9",
                                paddingBottom: 10,
                            }}
                        >
                            3. Additional Quotation Sections (Inclusions, Exclusions, Workmanship, Payment Terms)
                        </h3>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                                gap: 16,
                            }}
                        >
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Inclusions (One item per line)
                                </label>
                                <textarea
                                    rows={4}
                                    className="input-field"
                                    value={form.inclusions}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, inclusions: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Exclusions (One item per line)
                                </label>
                                <textarea
                                    rows={4}
                                    className="input-field"
                                    value={form.exclusions}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, exclusions: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Workmanship Warranty
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. 30 days."
                                    value={form.workmanship}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, workmanship: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                    Payment Terms
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Upon Completion"
                                    value={form.payment_terms}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, payment_terms: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Signature Section */}
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3
                        style={{
                            margin: "0 0 16px 0",
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#1E2F5F",
                            borderBottom: "1px solid #F1F5F9",
                            paddingBottom: 10,
                        }}
                    >
                        {isStatement ? "3. Signature Section" : "4. Signature Section"}
                    </h3>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 16,
                        }}
                    >
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Prepared By (Name)
                            </label>
                            <input
                                className="input-field"
                                value={form.prepared_by_name}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, prepared_by_name: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Prepared By (Role / Title)
                            </label>
                            <input
                                className="input-field"
                                value={form.prepared_by_title}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, prepared_by_title: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Approved By (Name)
                            </label>
                            <input
                                className="input-field"
                                value={form.approved_by_name}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, approved_by_name: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Approved By (Role / Title)
                            </label>
                            <input
                                className="input-field"
                                value={form.approved_by_title}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, approved_by_title: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Received By (Optional Printed Name)
                            </label>
                            <input
                                className="input-field"
                                placeholder="Leave blank for physical signature line"
                                value={form.received_by_name}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, received_by_name: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="section-label" style={{ display: "block", marginBottom: 6 }}>
                                Received Date (Optional)
                            </label>
                            <input
                                type="date"
                                className="input-field"
                                value={form.received_date}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, received_date: e.target.value }))
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Live Document Preview Section at bottom of form */}
                <div className="card" style={{ padding: 24 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 12,
                            marginBottom: 18,
                        }}
                    >
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#1E2F5F",
                                }}
                            >
                                Live Document Preview (A4 Format)
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                                Review the exact layout below before saving and generating the final PDF.
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    setEditingId(null);
                                    setViewMode("dashboard");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={saving}
                                onClick={handleSaveDocument}
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId
                                    ? "Save Changes"
                                    : "Save & Generate Document"}
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            background: "#F1F5F9",
                            padding: "24px 16px",
                            borderRadius: 12,
                            overflowX: "auto",
                        }}
                    >
                        <DocumentPaperPreview
                            form={form}
                            financials={financials}
                        />
                    </div>
                </div>

                {/* Full-Screen Preview Confirmation Modal */}
                {showLivePreviewModal && (
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(15, 23, 42, 0.65)",
                            zIndex: 60,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 20,
                        }}
                        onClick={() => !saving && setShowLivePreviewModal(false)}
                    >
                        <div
                            style={{
                                background: "#F8FAFC",
                                borderRadius: 16,
                                maxWidth: 920,
                                width: "100%",
                                maxHeight: "92vh",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    padding: "16px 24px",
                                    background: "#0E1A33",
                                    color: "#FFFFFF",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                        Document Preview —{" "}
                                        {isStatement ? "Statement of Account" : "Quotation Form"}
                                    </h3>
                                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94A3B8" }}>
                                        Verify all details before saving to the database.
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowLivePreviewModal(false)}
                                    >
                                        Back to Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        disabled={saving}
                                        onClick={handleSaveDocument}
                                    >
                                        {saving ? "Saving..." : "Confirm & Save Document"}
                                    </button>
                                </div>
                            </div>
                            <div
                                style={{
                                    padding: 24,
                                    overflowY: "auto",
                                    flex: 1,
                                }}
                            >
                                <DocumentPaperPreview
                                    form={form}
                                    financials={financials}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW MODE: DOCUMENTS / FORMS DASHBOARD
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {/* Top Heading */}
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Documents / Forms
                    </h1>
                    <p className="page-subtitle">
                        Create, manage, preview, print, and download official Quotation Forms and Statements of Account
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchDocuments()}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Two Document Template Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 20,
                    marginBottom: 28,
                }}
            >
                {/* CARD 1: QUOTATION FORM */}
                <div
                    className="card"
                    style={{
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        borderTop: "4px solid #3F7DFF",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 14,
                                    background: "linear-gradient(135deg, rgba(63,125,255,0.14), rgba(30,47,95,0.08))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <QuotationIcon size={26} color="#3F7DFF" />
                            </div>
                            <div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#3F7DFF",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Official Template
                                </span>
                                <h2
                                    style={{
                                        margin: "2px 0 0",
                                        fontSize: 17,
                                        fontWeight: 800,
                                        color: "#1E2F5F",
                                    }}
                                >
                                    QUOTATION FORM
                                </h2>
                            </div>
                        </div>

                        <p
                            style={{
                                fontSize: 13,
                                color: "#64748B",
                                lineHeight: 1.55,
                                margin: "0 0 20px 0",
                            }}
                        >
                            Generate customized service and aircon unit quotations complete with itemized descriptions, quantities, unit prices, discounts, configurable VAT breakdown, inclusions, exclusions, workmanship warranty, and payment terms.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: 14,
                            borderTop: "1px solid #F1F5F9",
                        }}
                    >
                        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                            Next No.: <strong style={{ color: "#1E2F5F" }}>{nextNumbers[DOC_TYPE_QUOTATION]}</strong>
                        </span>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleStartCreate(DOC_TYPE_QUOTATION)}
                        >
                            <PlusIcon size={15} />
                            <span>Create New Quotation</span>
                        </button>
                    </div>
                </div>

                {/* CARD 2: STATEMENT OF ACCOUNT */}
                <div
                    className="card"
                    style={{
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        borderTop: "4px solid #1E2F5F",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 14,
                                    background: "linear-gradient(135deg, rgba(30,47,95,0.14), rgba(63,125,255,0.10))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <StatementIcon size={26} color="#1E2F5F" />
                            </div>
                            <div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#1E2F5F",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Official Template
                                </span>
                                <h2
                                    style={{
                                        margin: "2px 0 0",
                                        fontSize: 17,
                                        fontWeight: 800,
                                        color: "#1E2F5F",
                                    }}
                                >
                                    STATEMENT OF ACCOUNT
                                </h2>
                            </div>
                        </div>

                        <p
                            style={{
                                fontSize: 13,
                                color: "#64748B",
                                lineHeight: 1.55,
                                margin: "0 0 20px 0",
                            }}
                        >
                            Prepare formal billing statements for clients with Bill To &amp; Attention To details, issue and due dates, unlimited custom labor/consumable/service items, optional discounts and taxes, and automatic Amount Due computation.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: 14,
                            borderTop: "1px solid #F1F5F9",
                        }}
                    >
                        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                            Next No.: <strong style={{ color: "#1E2F5F" }}>{nextNumbers[DOC_TYPE_STATEMENT]}</strong>
                        </span>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleStartCreate(DOC_TYPE_STATEMENT)}
                        >
                            <PlusIcon size={15} />
                            <span>Create New Statement</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Generated Documents Section */}
            <div className="card" style={{ padding: 22 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 14,
                        marginBottom: 18,
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1E2F5F",
                            }}
                        >
                            Generated Documents
                        </h2>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                            {filteredDocs.length} of {docs.length} saved documents shown
                        </p>
                    </div>

                    {/* Search & Document Type Filtering */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <div style={{ position: "relative", minWidth: 240 }}>
                            <span
                                style={{
                                    position: "absolute",
                                    left: 11,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#94A3B8",
                                    display: "flex",
                                }}
                            >
                                <SearchIcon size={15} />
                            </span>
                            <input
                                className="input-field"
                                style={{ paddingLeft: 34 }}
                                placeholder="Search document no., client name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="tab-bar">
                            {[
                                { id: "all", label: "All Types" },
                                { id: DOC_TYPE_QUOTATION, label: "Quotation Form" },
                                { id: DOC_TYPE_STATEMENT, label: "Statement of Account" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={`tab-item ${typeFilter === tab.id ? "active" : ""}`}
                                    onClick={() => setTypeFilter(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div
                        style={{
                            padding: 28,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                            textAlign: "center",
                        }}
                    >
                        Loading generated documents...
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div
                        style={{
                            padding: 36,
                            borderRadius: 12,
                            background: "#F8FAFC",
                            border: "1px dashed #CBD5E1",
                            color: "#64748B",
                            textAlign: "center",
                        }}
                    >
                        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#1E2F5F" }}>
                            No generated documents found
                        </p>
                        <p style={{ margin: 0, fontSize: 12.5 }}>
                            {docs.length === 0
                                ? 'Click "Create New Quotation" or "Create New Statement" above to generate your first document.'
                                : "Try adjusting your search query or document type filter."}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "Document Number",
                                        "Document Type",
                                        "Client Name",
                                        "Issue Date",
                                        "Amount",
                                        "Created By",
                                        "Actions",
                                    ].map((heading) => {
                                        const isAction = heading === "Actions";
                                        const isAmount = heading === "Amount";
                                        return (
                                            <th
                                                key={heading}
                                                className={isAction ? "sticky-action-col" : ""}
                                                style={{
                                                    padding: "11px 12px",
                                                    textAlign: isAction || isAmount ? "right" : "left",
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: "0.05em",
                                                    textTransform: "uppercase",
                                                    color: "#6B7280",
                                                    whiteSpace: "nowrap",
                                                    borderBottom: "1px solid #EAECF0",
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocs.map((doc) => {
                                    const isSOA = doc.document_type === DOC_TYPE_STATEMENT;
                                    return (
                                        <tr
                                            key={doc.doc_id}
                                            style={{ borderTop: "1px solid #F1F5F9" }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background =
                                                    "rgba(63,125,255,0.04)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: "12px",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#3F7DFF",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {doc.document_number}
                                            </td>
                                            <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        padding: "4px 10px",
                                                        borderRadius: 999,
                                                        fontSize: 11.5,
                                                        fontWeight: 600,
                                                        background: isSOA
                                                            ? "rgba(30, 47, 95, 0.1)"
                                                            : "rgba(63, 125, 255, 0.12)",
                                                        color: isSOA ? "#1E2F5F" : "#1D4ED8",
                                                    }}
                                                >
                                                    {doc.document_type_label}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px",
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: "#1E2F5F",
                                                }}
                                            >
                                                <div>{doc.client_name}</div>
                                                {doc.client_address && (
                                                    <div
                                                        style={{
                                                            fontSize: 11.5,
                                                            color: "#64748B",
                                                            fontWeight: 400,
                                                        }}
                                                    >
                                                        {doc.client_address}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px",
                                                    fontSize: 12.5,
                                                    color: "#475569",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatDate(doc.issue_date)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#1E2F5F",
                                                    textAlign: "right",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatPeso2(doc.grand_total)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px",
                                                    fontSize: 12.5,
                                                    color: "#475569",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {doc.created_by_name || "Super Admin"}
                                            </td>
                                            <td
                                                className="sticky-action-col"
                                                style={{
                                                    padding: "10px 12px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        flexWrap: "nowrap",
                                                        justifyContent: "flex-end",
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11.5,
                                                        }}
                                                        title="View Document"
                                                        onClick={() => handleViewDocument(doc)}
                                                    >
                                                        <EyeIcon size={13} />
                                                        <span>View</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11.5,
                                                        }}
                                                        title="Edit Document"
                                                        onClick={() => handleStartEdit(doc)}
                                                    >
                                                        <EditIcon size={13} />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11.5,
                                                        }}
                                                        title="Download PDF"
                                                        onClick={() => handleDownloadPdf(doc.doc_id)}
                                                    >
                                                        <DownloadIcon size={13} />
                                                        <span>Download PDF</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11.5,
                                                        }}
                                                        title="Print Document"
                                                        onClick={() => handlePrintDocument(doc.doc_id)}
                                                    >
                                                        <PrintIcon size={13} />
                                                        <span>Print</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-danger"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 11.5,
                                                        }}
                                                        title="Delete Document"
                                                        onClick={() => setDeleteTarget(doc)}
                                                    >
                                                        <TrashIcon size={13} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                open={!!deleteTarget}
                title="Delete Document?"
                message={`Are you sure you want to permanently delete ${deleteTarget?.document_type_label || "document"} "${deleteTarget?.document_number}" for ${deleteTarget?.client_name}? This action cannot be undone.`}
                confirmLabel={deleting ? "Deleting..." : "Yes, Delete"}
                confirmDisabled={deleting}
                variant="danger"
                onConfirm={handleDeleteDocument}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />
        </div>
    );
}

export default Documents;
