import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import StatusBadge from "../../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
    buildAnnualRevenue,
    extractErrorMessage,
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

const StarRating = ({ rating = 5 }) => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
            <svg
                key={star}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill={star <= rating ? "#F59E0B" : "none"}
                stroke={star <= rating ? "#F59E0B" : "#D1D5DB"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ))}
    </div>
);

const RECORD_TYPE_META = {
    service: {
        label: "HVAC Service",
        bg: "#EFF6FF",
        color: "#1D4ED8",
        border: "#BFDBFE",
    },
    for_sale_item: {
        label: "Sold Tool / Material",
        bg: "#FEF3C7",
        color: "#B45309",
        border: "#FDE68A",
    },
    ac_unit: {
        label: "Sold AC Unit",
        bg: "#DCFCE7",
        color: "#15803D",
        border: "#BBF7D0",
    },
    spare_part: {
        label: "Sold Spare Part",
        bg: "#F3E8FF",
        color: "#7E22CE",
        border: "#E9D5FF",
    },
};

const getCategoryBadgeStyle = (category = "") => {
    const cat = String(category).toLowerCase();
    if (cat.includes("repair")) {
        return { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
    }
    if (cat.includes("install")) {
        return { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" };
    }
    if (cat.includes("clean") || cat.includes("maint")) {
        return { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" };
    }
    if (cat.includes("unit") || cat.includes("ac")) {
        return { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" };
    }
    if (cat.includes("part")) {
        return { bg: "#FAF5FF", color: "#7E22CE", border: "#E9D5FF" };
    }
    if (cat.includes("tool") || cat.includes("material")) {
        return { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" };
    }
    return { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" };
};

function SalesRecords({ addToast, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [period, setPeriod] = useState("Monthly");
    const [chartMode, setChartMode] = useState("overview"); // 'overview' | 'by_category'
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [inventorySales, setInventorySales] = useState([]);
    const [summary, setSummary] = useState({
        total_revenue: 0,
        total_profit: 0,
        paid_bookings: 0,
        gcash_revenue: 0,
        cash_revenue: 0,
        other_digital_revenue: 0,
        service_revenue: 0,
        tools_materials_revenue: 0,
        ac_units_revenue: 0,
        spare_parts_revenue: 0,
        sold_tools_count: 0,
        sold_ac_units_count: 0,
        sold_spare_parts_count: 0,
    });
    const [weeklyRevenue, setWeeklyRevenue] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);

    // Category Tabs & Filters
    const [activeCategoryTab, setActiveCategoryTab] = useState("all"); // 'all' | 'service' | 'tools_materials' | 'ac_units'
    const [acSubFilter, setAcSubFilter] = useState("all"); // 'all' | 'ac_unit' | 'spare_part'
    const [searchQuery, setSearchQuery] = useState("");
    const [methodFilter, setMethodFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedRecord, setSelectedRecord] = useState(null);

    const fetchSalesRecords = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(ep.salesRecords);
                setRecords(Array.isArray(data?.data) ? data.data : []);
                setInventorySales(
                    Array.isArray(data?.inventory_sales)
                        ? data.inventory_sales
                        : [],
                );
                setSummary({
                    total_revenue: Number(data?.summary?.total_revenue ?? 0),
                    total_profit: Number(data?.summary?.total_profit ?? 0),
                    paid_bookings: Number(data?.summary?.paid_bookings ?? 0),
                    gcash_revenue: Number(data?.summary?.gcash_revenue ?? 0),
                    cash_revenue: Number(data?.summary?.cash_revenue ?? 0),
                    other_digital_revenue: Number(
                        data?.summary?.other_digital_revenue ?? 0,
                    ),
                    service_revenue: Number(
                        data?.summary?.service_revenue ?? 0,
                    ),
                    tools_materials_revenue: Number(
                        data?.summary?.tools_materials_revenue ?? 0,
                    ),
                    ac_units_revenue: Number(
                        data?.summary?.ac_units_revenue ?? 0,
                    ),
                    spare_parts_revenue: Number(
                        data?.summary?.spare_parts_revenue ?? 0,
                    ),
                    sold_tools_count: Number(
                        data?.summary?.sold_tools_count ?? 0,
                    ),
                    sold_ac_units_count: Number(
                        data?.summary?.sold_ac_units_count ?? 0,
                    ),
                    sold_spare_parts_count: Number(
                        data?.summary?.sold_spare_parts_count ?? 0,
                    ),
                });
                setWeeklyRevenue(
                    Array.isArray(data?.weekly_revenue)
                        ? data.weekly_revenue
                        : [],
                );
                setMonthlyRevenue(
                    Array.isArray(data?.monthly_revenue)
                        ? data.monthly_revenue
                        : [],
                );
            } catch (error) {
                addToast(
                    extractErrorMessage(
                        error,
                        "Unable to load sales records.",
                    ),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast, ep.salesRecords],
    );

    useEffect(() => {
        fetchSalesRecords();
    }, [fetchSalesRecords]);

    const chartData = useMemo(() => {
        if (period === "Weekly") {
            return weeklyRevenue.map((row) => ({
                key: row.day,
                revenue: Number(row.revenue ?? 0),
                profit: Number(row.profit ?? 0),
                service_revenue: Number(row.service_revenue ?? 0),
                tools_revenue: Number(row.tools_revenue ?? 0),
                ac_revenue: Number(row.ac_revenue ?? 0),
                bookings: Number(row.bookings ?? 0),
                label: row.date,
            }));
        }

        if (period === "Annually") {
            return buildAnnualRevenue(monthlyRevenue).map((row) => ({
                key: row.year,
                revenue: Number(row.revenue ?? 0),
                profit: Number(row.profit ?? 0),
                service_revenue: Number(row.service_revenue ?? 0),
                tools_revenue: Number(row.tools_revenue ?? 0),
                ac_revenue: Number(row.ac_revenue ?? 0),
                bookings: Number(row.bookings ?? 0),
            }));
        }

        return monthlyRevenue.map((row) => ({
            key: row.month,
            revenue: Number(row.revenue ?? 0),
            profit: Number(row.profit ?? 0),
            service_revenue: Number(row.service_revenue ?? 0),
            tools_revenue: Number(row.tools_revenue ?? 0),
            ac_revenue: Number(row.ac_revenue ?? 0),
            bookings: Number(row.bookings ?? 0),
            label: row.year_month,
        }));
    }, [monthlyRevenue, period, weeklyRevenue]);

    const chartTotal = chartData.reduce(
        (sum, row) => sum + Number(row.revenue ?? 0),
        0,
    );
    const chartProfitTotal = chartData.reduce(
        (sum, row) => sum + Number(row.profit ?? 0),
        0,
    );

    // Source breakdown for Donut chart & bars
    const sourceBreakdown = useMemo(() => {
        const services = Number(summary.service_revenue || 0);
        const acAndParts =
            Number(summary.ac_units_revenue || 0) +
            Number(summary.spare_parts_revenue || 0);
        const toolsMaterials = Number(summary.tools_materials_revenue || 0);
        const total = Math.max(services + acAndParts + toolsMaterials, 1);

        return [
            {
                name: "HVAC Services",
                value: services,
                pct: Math.round((services / total) * 100),
                color: "#3F7DFF",
                countLabel: `${records.filter((r) => (r.record_type || "service") === "service" && r.payment_status === "Paid").length} paid jobs`,
            },
            {
                name: "AC Units & Parts",
                value: acAndParts,
                pct: Math.round((acAndParts / total) * 100),
                color: "#16A34A",
                countLabel: `${summary.sold_ac_units_count} units · ${summary.sold_spare_parts_count} parts`,
            },
            {
                name: "Tools & Materials",
                value: toolsMaterials,
                pct: Math.round((toolsMaterials / total) * 100),
                color: "#F59E0B",
                countLabel: `${summary.sold_tools_count} sold items`,
            },
        ];
    }, [records, summary]);

    // Counts per category tab
    const tabCounts = useMemo(() => {
        const serviceCount = records.filter(
            (r) => (r.record_type || "service") === "service",
        ).length;
        const toolsCount = records.filter(
            (r) => r.record_type === "for_sale_item",
        ).length;
        const acCount = records.filter(
            (r) =>
                r.record_type === "ac_unit" || r.record_type === "spare_part",
        ).length;
        return {
            all: records.length,
            service: serviceCount,
            tools_materials: toolsCount,
            ac_units: acCount,
        };
    }, [records]);

    // Filtered records for the active tab
    const filteredRecords = useMemo(() => {
        return records.filter((rec) => {
            const type = rec.record_type || "service";

            // Category tab filter
            if (activeCategoryTab === "service" && type !== "service") {
                return false;
            }
            if (
                activeCategoryTab === "tools_materials" &&
                type !== "for_sale_item"
            ) {
                return false;
            }
            if (activeCategoryTab === "ac_units") {
                if (type !== "ac_unit" && type !== "spare_part") {
                    return false;
                }
                if (acSubFilter !== "all" && type !== acSubFilter) {
                    return false;
                }
            }

            // Payment method filter
            if (
                methodFilter !== "All" &&
                (rec.payment_method || "Cash") !== methodFilter
            ) {
                return false;
            }

            // Status filter
            if (
                statusFilter !== "All" &&
                (rec.payment_status || "Pending") !== statusFilter
            ) {
                return false;
            }

            // Search query
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const haystack = [
                    rec.booking_id,
                    rec.client_name,
                    rec.customer_contact,
                    rec.service,
                    rec.service_category,
                    rec.sale_category,
                    rec.managed_by,
                    rec.managed_by_name,
                    rec.managed_by_role,
                    rec.parts_replaced,
                    rec.item_name,
                    rec.brand,
                    rec.model,
                    rec.serial_number,
                    rec.sub_category,
                    rec.payment_method,
                    rec.recorded_by,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!haystack.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [
        records,
        activeCategoryTab,
        acSubFilter,
        methodFilter,
        statusFilter,
        searchQuery,
    ]);

    // Sub-summary for currently filtered records
    const filteredTotals = useMemo(() => {
        const paidRows = filteredRecords.filter(
            (r) => r.payment_status === "Paid",
        );
        return {
            count: filteredRecords.length,
            paidCount: paidRows.length,
            revenue: paidRows.reduce(
                (acc, r) => acc + Number(r.amount_paid || 0),
                0,
            ),
            profit: paidRows.reduce(
                (acc, r) => acc + Number(r.profit || 0),
                0,
            ),
            totalQty: paidRows.reduce(
                (acc, r) => acc + Number(r.quantity || 1),
                0,
            ),
        };
    }, [filteredRecords]);

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Sales & Records
                    </h1>
                    <p className="page-subtitle">
                        Unified financial & transaction records across HVAC
                        Services, Sold Tools & Materials, and Sold AC Units &
                        Spare Parts
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchSalesRecords()}
                    >
                        ↻ Refresh Records
                    </button>
                </div>
            </div>

            {/* ── TOP SUMMARY KPI CARDS ── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                    gap: 14,
                    marginBottom: 22,
                }}
            >
                {[
                    {
                        label: "Total Gross Revenue",
                        value: formatCurrency(summary.total_revenue),
                        sub: `${summary.paid_bookings} completed transactions`,
                        color: "#16A34A",
                        bg: "#F0FDF4",
                        border: "#BBF7D0",
                    },
                    {
                        label: "Estimated Net Profit",
                        value: formatCurrency(summary.total_profit),
                        sub:
                            summary.total_revenue > 0
                                ? `${Math.round((summary.total_profit / summary.total_revenue) * 100)}% overall margin`
                                : "Inventory & service profit",
                        color: "#0D9488",
                        bg: "#F0FDFA",
                        border: "#99F6E4",
                    },
                    {
                        label: "HVAC Service Revenue",
                        value: formatCurrency(summary.service_revenue),
                        sub: `${tabCounts.service} service booking records`,
                        color: "#2563EB",
                        bg: "#EFF6FF",
                        border: "#BFDBFE",
                    },
                    {
                        label: "Sold AC Units & Parts",
                        value: formatCurrency(
                            Number(summary.ac_units_revenue || 0) +
                                Number(summary.spare_parts_revenue || 0),
                        ),
                        sub: `${summary.sold_ac_units_count} AC units · ${summary.sold_spare_parts_count} spare parts`,
                        color: "#7C3AED",
                        bg: "#F5F3FF",
                        border: "#DDD6FE",
                    },
                    {
                        label: "Sold Tools & Materials",
                        value: formatCurrency(summary.tools_materials_revenue),
                        sub: `${summary.sold_tools_count} For Sale items sold`,
                        color: "#D97706",
                        bg: "#FFFBEB",
                        border: "#FDE68A",
                    },
                    {
                        label: "Cash vs. Digital",
                        value: formatCurrency(summary.cash_revenue),
                        sub: `Digital (GCash/Bank/Card): ${formatCurrency(Number(summary.gcash_revenue || 0) + Number(summary.other_digital_revenue || 0))}`,
                        color: "#1E2F5F",
                        bg: "#F8FAFC",
                        border: "#E2E8F0",
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="card"
                        style={{
                            padding: "16px 18px",
                            borderLeft: `4px solid ${card.color}`,
                        }}
                    >
                        <p
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "#64748B",
                                marginBottom: 6,
                            }}
                        >
                            {card.label}
                        </p>
                        <p
                            style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: card.color,
                                margin: 0,
                            }}
                        >
                            {card.value}
                        </p>
                        <p
                            style={{
                                fontSize: 11,
                                color: "#64748B",
                                margin: "4px 0 0",
                            }}
                        >
                            {card.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── CHARTS & REVENUE BREAKDOWN SECTION ── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                    gap: 18,
                    marginBottom: 24,
                }}
            >
                {/* Main Revenue & Profit Over Time Chart */}
                <div
                    className="card"
                    style={{ padding: 22, gridColumn: "span 2" }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 18,
                            gap: 12,
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <p className="section-label">
                                Revenue & Profit Performance ({period})
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: 16,
                                    marginTop: 4,
                                    flexWrap: "wrap",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: "#1E2F5F",
                                    }}
                                >
                                    {formatCurrency(chartTotal)}
                                </span>
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#16A34A",
                                    }}
                                >
                                    Net Profit:{" "}
                                    {formatCurrency(chartProfitTotal)}
                                </span>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <div
                                style={{
                                    display: "inline-flex",
                                    background: "#F1F5F9",
                                    padding: 3,
                                    borderRadius: 8,
                                }}
                            >
                                {[
                                    { id: "overview", label: "Revenue & Profit" },
                                    { id: "by_category", label: "By Source" },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setChartMode(mode.id)}
                                        style={{
                                            padding: "5px 10px",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            borderRadius: 6,
                                            border: "none",
                                            cursor: "pointer",
                                            background:
                                                chartMode === mode.id
                                                    ? "#FFFFFF"
                                                    : "transparent",
                                            color:
                                                chartMode === mode.id
                                                    ? "#1E2F5F"
                                                    : "#64748B",
                                            boxShadow:
                                                chartMode === mode.id
                                                    ? "0 1px 2px rgba(0,0,0,0.06)"
                                                    : "none",
                                        }}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>

                            <div className="tab-bar">
                                {["Weekly", "Monthly", "Annually"].map(
                                    (currentPeriod) => (
                                        <button
                                            key={currentPeriod}
                                            className={`tab-item ${period === currentPeriod ? "active" : ""}`}
                                            onClick={() =>
                                                setPeriod(currentPeriod)
                                            }
                                        >
                                            {currentPeriod}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div
                            style={{
                                padding: 24,
                                borderRadius: 12,
                                background: "#F9FAFB",
                                color: "#6B7280",
                            }}
                        >
                            Loading sales metrics...
                        </div>
                    ) : chartMode === "by_category" ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart
                                data={chartData}
                                margin={{
                                    top: 6,
                                    right: 10,
                                    left: -10,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#F0F2F5"
                                />
                                <XAxis
                                    dataKey="key"
                                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) =>
                                        `₱${Math.round(Number(value) / 1000)}k`
                                    }
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        formatCurrency(value),
                                        name,
                                    ]}
                                    contentStyle={{
                                        background: "#fff",
                                        border: "1px solid #E5E7EB",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{
                                        fontSize: 11,
                                        paddingTop: 8,
                                    }}
                                />
                                <Bar
                                    dataKey="service_revenue"
                                    name="HVAC Services"
                                    stackId="a"
                                    fill="#3F7DFF"
                                    radius={[0, 0, 0, 0]}
                                />
                                <Bar
                                    dataKey="ac_revenue"
                                    name="AC Units & Spare Parts"
                                    stackId="a"
                                    fill="#16A34A"
                                    radius={[0, 0, 0, 0]}
                                />
                                <Bar
                                    dataKey="tools_revenue"
                                    name="Tools & Materials"
                                    stackId="a"
                                    fill="#F59E0B"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart
                                data={chartData}
                                margin={{
                                    top: 6,
                                    right: 10,
                                    left: -10,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="salesAreaGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#3F7DFF"
                                            stopOpacity={0.28}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#3F7DFF"
                                            stopOpacity={0.02}
                                        />
                                    </linearGradient>
                                    <linearGradient
                                        id="profitAreaGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#16A34A"
                                            stopOpacity={0.28}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#16A34A"
                                            stopOpacity={0.02}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#F0F2F5"
                                />
                                <XAxis
                                    dataKey="key"
                                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) =>
                                        `₱${Math.round(Number(value) / 1000)}k`
                                    }
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        formatCurrency(value),
                                        name === "revenue"
                                            ? "Gross Revenue"
                                            : "Net Profit",
                                    ]}
                                    labelFormatter={(label, payload) =>
                                        payload?.[0]?.payload?.label
                                            ? `${label} · ${payload[0].payload.label}`
                                            : label
                                    }
                                    contentStyle={{
                                        background: "#fff",
                                        border: "1px solid #E5E7EB",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{
                                        fontSize: 11,
                                        paddingTop: 8,
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Gross Revenue"
                                    stroke="#3F7DFF"
                                    strokeWidth={2.5}
                                    fill="url(#salesAreaGradient)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    name="Estimated Net Profit"
                                    stroke="#16A34A"
                                    strokeWidth={2}
                                    fill="url(#profitAreaGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Revenue Breakdown by Inventory & Service Source */}
                <div className="card" style={{ padding: 22 }}>
                    <p className="section-label" style={{ marginBottom: 4 }}>
                        Revenue by Business Stream
                    </p>
                    <p
                        style={{
                            fontSize: 12,
                            color: "#64748B",
                            marginBottom: 14,
                        }}
                    >
                        Distribution across services & inventory sales
                    </p>

                    <div style={{ height: 150, marginBottom: 12 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceBreakdown}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={66}
                                    paddingAngle={3}
                                >
                                    {sourceBreakdown.map((entry) => (
                                        <Cell
                                            key={entry.name}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        {sourceBreakdown.map((item) => (
                            <div
                                key={item.name}
                                style={{
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "#F8FAFC",
                                    border: "1px solid #E2E8F0",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 4,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 999,
                                                background: item.color,
                                                display: "inline-block",
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: "#0F172A",
                                            }}
                                        >
                                            {item.name}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            color: item.color,
                                        }}
                                    >
                                        {formatCurrency(item.value)} ({item.pct}
                                        %)
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748B",
                                        paddingLeft: 16,
                                    }}
                                >
                                    {item.countLabel}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── ORGANIZED SALES & RECORDS SECTION ── */}
            <div className="card" style={{ padding: 20 }}>
                {/* Organized Category Tabs */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                        borderBottom: "1px solid #E2E8F0",
                        paddingBottom: 14,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        {[
                            {
                                id: "all",
                                label: "All Sales & Records",
                                count: tabCounts.all,
                                color: "#1E2F5F",
                            },
                            {
                                id: "service",
                                label: "HVAC Service Bookings",
                                count: tabCounts.service,
                                color: "#2563EB",
                            },
                            {
                                id: "tools_materials",
                                label: "Sold Tools & Materials",
                                count: tabCounts.tools_materials,
                                color: "#D97706",
                            },
                            {
                                id: "ac_units",
                                label: "Sold AC Units & Spare Parts",
                                count: tabCounts.ac_units,
                                color: "#16A34A",
                            },
                        ].map((tab) => {
                            const isActive = activeCategoryTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveCategoryTab(tab.id)}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: 10,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        border: isActive
                                            ? `1.5px solid ${tab.color}`
                                            : "1px solid #E2E8F0",
                                        background: isActive
                                            ? tab.color
                                            : "#F8FAFC",
                                        color: isActive ? "#FFFFFF" : "#475569",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        style={{
                                            padding: "2px 7px",
                                            borderRadius: 999,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            background: isActive
                                                ? "rgba(255,255,255,0.22)"
                                                : "#E2E8F0",
                                            color: isActive
                                                ? "#FFFFFF"
                                                : "#334155",
                                        }}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Sub-filter when viewing Sold AC Units & Spare Parts */}
                    {activeCategoryTab === "ac_units" && (
                        <div
                            style={{
                                display: "inline-flex",
                                background: "#F1F5F9",
                                padding: 3,
                                borderRadius: 8,
                                gap: 4,
                            }}
                        >
                            {[
                                { id: "all", label: "All AC & Parts" },
                                { id: "ac_unit", label: "AC Units Only" },
                                { id: "spare_part", label: "Spare Parts Only" },
                            ].map((sub) => (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setAcSubFilter(sub.id)}
                                    style={{
                                        padding: "5px 10px",
                                        borderRadius: 6,
                                        border: "none",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        background:
                                            acSubFilter === sub.id
                                                ? "#FFFFFF"
                                                : "transparent",
                                        color:
                                            acSubFilter === sub.id
                                                ? "#15803D"
                                                : "#64748B",
                                    }}
                                >
                                    {sub.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search & Filters Bar + Active View Summary Banner */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            flex: 1,
                        }}
                    >
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Search ID, customer, item, brand, serial, sub-category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ maxWidth: 320, fontSize: 12 }}
                        />
                        <select
                            className="input-field"
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                            style={{ width: 160, fontSize: 12 }}
                        >
                            <option value="All">All Payment Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="GCash">GCash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Credit Card">Credit Card</option>
                        </select>
                        <select
                            className="input-field"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: 140, fontSize: 12 }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                        </select>
                        {(searchQuery ||
                            methodFilter !== "All" ||
                            statusFilter !== "All") && (
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: 12, padding: "6px 12px" }}
                                onClick={() => {
                                    setSearchQuery("");
                                    setMethodFilter("All");
                                    setStatusFilter("All");
                                }}
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Active Category Mini-Summary */}
                    <div
                        style={{
                            display: "flex",
                            gap: 14,
                            alignItems: "center",
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 12,
                        }}
                    >
                        <span>
                            Showing{" "}
                            <strong style={{ color: "#0F172A" }}>
                                {filteredTotals.count}
                            </strong>{" "}
                            records
                        </span>
                        <span style={{ color: "#CBD5E1" }}>|</span>
                        <span>
                            Revenue:{" "}
                            <strong style={{ color: "#16A34A" }}>
                                {formatCurrency(filteredTotals.revenue)}
                            </strong>
                        </span>
                        {activeCategoryTab !== "service" && (
                            <>
                                <span style={{ color: "#CBD5E1" }}>|</span>
                                <span>
                                    Est. Profit:{" "}
                                    <strong style={{ color: "#0D9488" }}>
                                        {formatCurrency(filteredTotals.profit)}
                                    </strong>
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Records Table */}
                {loading ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        Loading sales and inventory records...
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div
                        style={{
                            padding: 32,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                            textAlign: "center",
                        }}
                    >
                        No matching sales records found for this category or
                        filter.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {(activeCategoryTab === "service"
                                        ? [
                                              "Record ID",
                                              "Category",
                                              "Customer",
                                              "Service",
                                              "Booking Fee",
                                              "Base Price",
                                              "Spare Parts",
                                              "Total Paid",
                                              "Profit",
                                              "Payment Method",
                                              "Managed By",
                                              "Date",
                                              "Action",
                                          ]
                                        : activeCategoryTab === "tools_materials"
                                          ? [
                                                "Record ID",
                                                "Category",
                                                "Customer",
                                                "Sold Tool / Material Details",
                                                "Sub-Category / Brand",
                                                "Qty",
                                                "Unit Price / Capital",
                                                "Total Paid",
                                                "Profit",
                                                "Payment Method",
                                                "Sold / Managed By",
                                                "Date",
                                                "Action",
                                            ]
                                          : activeCategoryTab === "ac_units"
                                            ? [
                                                  "Record ID",
                                                  "Category",
                                                  "Customer",
                                                  "Sold AC Unit / Spare Part Details",
                                                  "Sub-Category / Brand",
                                                  "Qty",
                                                  "Unit Price / Capital",
                                                  "Total Paid",
                                                  "Profit",
                                                  "Payment Method",
                                                  "Sold / Managed By",
                                                  "Date",
                                                  "Action",
                                              ]
                                            : [
                                                  "Record ID",
                                                  "Category",
                                                  "Customer",
                                                  "Service / Item",
                                                  "Booking Fee",
                                                  "Base / Unit Price",
                                                  "Spare Parts",
                                                  "Total Paid",
                                                  "Profit",
                                                  "Payment Method",
                                                  "Managed By",
                                                  "Date",
                                                  "Action",
                                              ]
                                    ).map((heading) => {
                                        const isAction = heading === "Action";
                                        return (
                                            <th
                                                key={heading}
                                                className={isAction ? "sticky-action-col" : ""}
                                                style={{
                                                    padding: "10px 12px",
                                                    textAlign: isAction ? "right" : "left",
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: "0.04em",
                                                    textTransform: "uppercase",
                                                    color: "#64748B",
                                                    whiteSpace: "nowrap",
                                                    borderBottom: "1px solid #EAECF0",
                                                    ...(isAction
                                                        ? {
                                                              position: "sticky",
                                                              right: 0,
                                                              zIndex: 10,
                                                              background: "#F5F7FA",
                                                          }
                                                        : {}),
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record) => {
                                    const typeKey =
                                        record.record_type || "service";
                                    const isService =
                                        typeKey === "service" ||
                                        record.sale_type === "service";
                                    const meta =
                                        RECORD_TYPE_META[typeKey] ||
                                        RECORD_TYPE_META.service;
                                    const isPhysicalTab =
                                        activeCategoryTab === "tools_materials" ||
                                        activeCategoryTab === "ac_units";

                                    return (
                                        <tr
                                            key={`${record.booking_id}-${record.sale_id || "b"}`}
                                            style={{
                                                borderTop: "1px solid #F1F5F9",
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
                                                    fontWeight: 700,
                                                    color: "#3F7DFF",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                #{record.booking_id || record.sale_id}
                                            </td>

                                            {/* Category */}
                                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                                                {isService ? (
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            padding: "3px 9px",
                                                            borderRadius: 999,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            ...getCategoryBadgeStyle(record.service_category || "Service"),
                                                            border: `1px solid ${getCategoryBadgeStyle(record.service_category || "Service").border}`,
                                                        }}
                                                    >
                                                        {record.service_category || "Service"}
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            padding: "3px 9px",
                                                            borderRadius: 999,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: meta.bg,
                                                            color: meta.color,
                                                            border: `1px solid ${meta.border}`,
                                                        }}
                                                    >
                                                        {record.sale_category || meta.label}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Customer */}
                                            <td style={{ padding: "10px 12px", fontSize: 13, color: "#1E2F5F" }}>
                                                <div style={{ fontWeight: 600 }}>
                                                    {record.client_name || "Walk-in Customer"}
                                                </div>
                                                {record.customer_contact && (
                                                    <div style={{ fontSize: 11, color: "#64748B" }}>
                                                        {record.customer_contact}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Item/Service Columns depending on Tab & Type */}
                                            {isPhysicalTab ? (
                                                /* Dedicated Physical Inventory Columns */
                                                <>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#334155", maxWidth: 250 }}>
                                                        <div style={{ fontWeight: 600, color: "#0F172A" }}>
                                                            {record.item_name || record.service}
                                                        </div>
                                                        {record.serial_number && (
                                                            <div style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
                                                                SN: {record.serial_number}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#475569" }}>
                                                        <div>{record.sub_category || "General"}</div>
                                                        {record.brand && (
                                                            <div style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>
                                                                {record.brand}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                                                        {record.quantity || 1} {record.unit || "pc"}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                                                        <div>{formatCurrency(record.unit_price || record.amount_paid || 0)}</div>
                                                        {Number(record.capital) > 0 && (
                                                            <div style={{ fontSize: 10, color: "#94A3B8" }}>
                                                                Cap: {formatCurrency(record.capital)}
                                                            </div>
                                                        )}
                                                    </td>
                                                </>
                                            ) : isService ? (
                                                /* Polished Service Columns */
                                                <>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#334155", maxWidth: 220 }}>
                                                        <div style={{ fontWeight: 600, color: "#0F172A" }}>
                                                            {record.service || record.item_name}
                                                        </div>
                                                        {record.rating && (
                                                            <div style={{ marginTop: 3 }}>
                                                                <StarRating rating={record.rating} />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                                                        {record.booking_fee !== null && record.booking_fee !== undefined
                                                            ? formatCurrency(record.booking_fee)
                                                            : formatCurrency(300)}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                                                        {Number(record.base_price) > 0
                                                            ? formatCurrency(record.base_price)
                                                            : "—"}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, whiteSpace: "nowrap" }}>
                                                        {Number(record.spare_parts_price) > 0 ? (
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: "#D97706" }}>
                                                                    {formatCurrency(record.spare_parts_price)}
                                                                </div>
                                                                {Array.isArray(record.consumed_spare_parts) && record.consumed_spare_parts.length > 0 ? (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: "#92400E",
                                                                            background: "#FEF3C7",
                                                                            border: "1px solid #FDE68A",
                                                                            padding: "1px 6px",
                                                                            borderRadius: 4,
                                                                            display: "inline-block",
                                                                            marginTop: 2,
                                                                            maxWidth: 160,
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                            whiteSpace: "nowrap",
                                                                        }}
                                                                        title={record.consumed_spare_parts.map(p => `${p.item_name} (${p.quantity}x ${formatCurrency(p.price)})`).join(", ")}
                                                                    >
                                                                        {record.consumed_spare_parts.length} part{record.consumed_spare_parts.length > 1 ? "s" : ""}: {record.consumed_spare_parts[0].item_name}
                                                                    </div>
                                                                ) : record.parts_replaced ? (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: "#92400E",
                                                                            background: "#FEF3C7",
                                                                            border: "1px solid #FDE68A",
                                                                            padding: "1px 6px",
                                                                            borderRadius: 4,
                                                                            display: "inline-block",
                                                                            marginTop: 2,
                                                                            maxWidth: 160,
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                            whiteSpace: "nowrap",
                                                                        }}
                                                                        title={record.parts_replaced}
                                                                    >
                                                                        {record.parts_replaced}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: "#94A3B8" }}>—</span>
                                                        )}
                                                    </td>
                                                </>
                                            ) : (
                                                /* Inventory Item Row in 'All' Tab */
                                                <>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#334155", maxWidth: 220 }}>
                                                        <div style={{ fontWeight: 600, color: "#0F172A" }}>
                                                            {record.item_name || record.service}
                                                        </div>
                                                        {record.serial_number && (
                                                            <div style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
                                                                SN: {record.serial_number}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                                                        —
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                                                        <div>{formatCurrency(record.unit_price || record.amount_paid || 0)}</div>
                                                        <div style={{ fontSize: 10, color: "#64748B" }}>
                                                            Qty: {record.quantity || 1} {record.unit || "pcs"}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                                                        —
                                                    </td>
                                                </>
                                            )}

                                            {/* Total Paid */}
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color:
                                                        record.payment_status === "Paid"
                                                            ? "#16A34A"
                                                            : "#9CA3AF",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {record.payment_status === "Paid" ? (
                                                    <div>
                                                        <div>
                                                            {formatCurrency(
                                                                record.amount_paid || record.total_cost || 0,
                                                            )}
                                                        </div>
                                                        {Number(record.amount_turned_over) > 0 && (
                                                            <div
                                                                style={{
                                                                    fontSize: 10,
                                                                    fontWeight: 700,
                                                                    color: "#065F46",
                                                                    background: "#ECFDF5",
                                                                    border: "1px solid #A7F3D0",
                                                                    padding: "1px 6px",
                                                                    borderRadius: 4,
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 3,
                                                                    marginTop: 3,
                                                                }}
                                                                title={`Turned over: ${formatCurrency(record.amount_turned_over)}${record.turnover_verified ? " (Verified by Manager)" : ""}`}
                                                            >
                                                                <span>Turnover: {formatCurrency(record.amount_turned_over)}</span>
                                                                {record.turnover_verified && <span style={{ color: "#16A34A" }}>✓</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "#94A3B8" }}>
                                                        {Number(record.total_cost) > 0 ? formatCurrency(record.total_cost) : "—"}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Profit */}
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    color:
                                                        Number(record.profit) > 0
                                                            ? "#0D9488"
                                                            : "#94A3B8",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {record.payment_status === "Paid"
                                                    ? formatCurrency(record.profit || 0)
                                                    : "—"}
                                            </td>

                                            {/* Payment Method */}
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: "#334155",
                                                        marginBottom: 2,
                                                    }}
                                                >
                                                    {record.payment_method || "—"}
                                                </div>
                                                <StatusBadge
                                                    status={record.payment_status}
                                                />
                                            </td>

                                            {/* Managed By */}
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: "#1E2F5F",
                                                    }}
                                                >
                                                    {record.managed_by_name || record.managed_by || record.sold_by_name || "Manager"}
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        padding: "1px 6px",
                                                        borderRadius: 4,
                                                        background: (record.managed_by_role || "").toLowerCase().includes("super")
                                                            ? "#FEF2F2"
                                                            : "#EFF6FF",
                                                        color: (record.managed_by_role || "").toLowerCase().includes("super")
                                                            ? "#DC2626"
                                                            : "#2563EB",
                                                        border: `1px solid ${(record.managed_by_role || "").toLowerCase().includes("super") ? "#FECACA" : "#BFDBFE"}`,
                                                        display: "inline-block",
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {record.managed_by_role || "Manager"}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    color: "#64748B",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatDateTime(
                                                    record.payment_date || record.created_at,
                                                )}
                                            </td>

                                            {/* Action */}
                                            <td
                                                className="sticky-action-col"
                                                style={{
                                                    padding: "10px 12px",
                                                    whiteSpace: "nowrap",
                                                    position: "sticky",
                                                    right: 0,
                                                    zIndex: 5,
                                                    background: "#FFFFFF",
                                                    textAlign: "right",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: "4px 10px",
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() =>
                                                        setSelectedRecord(record)
                                                    }
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── TRANSACTION / SALE RECEIPT DETAIL MODAL ── */}
            {selectedRecord && (
                <div
                    onClick={() => setSelectedRecord(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.55)",
                        backdropFilter: "blur(3px)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#FFFFFF",
                            borderRadius: 16,
                            maxWidth: 640,
                            maxHeight: "90vh",
                            overflowY: "auto",
                            width: "100%",
                            padding: 24,
                            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
                            border: "1px solid #E2E8F0",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 16,
                            }}
                        >
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            padding: "3px 10px",
                                            borderRadius: 999,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background: (
                                                RECORD_TYPE_META[
                                                    selectedRecord.record_type ||
                                                        "service"
                                                ] || RECORD_TYPE_META.service
                                            ).bg,
                                            color: (
                                                RECORD_TYPE_META[
                                                    selectedRecord.record_type ||
                                                        "service"
                                                ] || RECORD_TYPE_META.service
                                            ).color,
                                        }}
                                    >
                                        {
                                            (
                                                RECORD_TYPE_META[
                                                    selectedRecord.record_type ||
                                                        "service"
                                                ] || RECORD_TYPE_META.service
                                            ).label
                                        }
                                    </span>
                                    {selectedRecord.service_category && (
                                        <span
                                            style={{
                                                display: "inline-block",
                                                padding: "3px 10px",
                                                borderRadius: 999,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                ...getCategoryBadgeStyle(selectedRecord.service_category),
                                            }}
                                        >
                                            {selectedRecord.service_category}
                                        </span>
                                    )}
                                </div>
                                <h3
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 800,
                                        color: "#0F172A",
                                        margin: 0,
                                    }}
                                >
                                    Transaction Record #{selectedRecord.booking_id}
                                </h3>
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "#64748B",
                                        margin: "2px 0 0",
                                    }}
                                >
                                    {formatDateTime(
                                        selectedRecord.payment_date ||
                                            selectedRecord.created_at,
                                    )}
                                </p>
                            </div>
                            <StatusBadge
                                status={selectedRecord.payment_status}
                            />
                        </div>

                        <div
                            style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                borderRadius: 12,
                                padding: 16,
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                                marginBottom: 18,
                                fontSize: 13,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748B",
                                        fontWeight: 600,
                                    }}
                                >
                                    Customer / Client
                                </div>
                                <div
                                    style={{
                                        fontWeight: 700,
                                        color: "#0F172A",
                                    }}
                                >
                                    {selectedRecord.client_name ||
                                        "Walk-in Customer"}
                                </div>
                                {selectedRecord.customer_contact && (
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: "#475569",
                                        }}
                                    >
                                        {selectedRecord.customer_contact}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748B",
                                        fontWeight: 600,
                                    }}
                                >
                                    Payment Method
                                </div>
                                <div
                                    style={{
                                        fontWeight: 700,
                                        color: "#0F172A",
                                    }}
                                >
                                    {selectedRecord.payment_method || "Cash"}
                                </div>
                                {selectedRecord.recorded_by && (
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#64748B",
                                        }}
                                    >
                                        Recorded by: {selectedRecord.recorded_by}
                                    </div>
                                )}
                            </div>

                            {/* Managed By */}
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748B",
                                        fontWeight: 600,
                                    }}
                                >
                                    Managed By
                                </div>
                                <div
                                    style={{
                                        fontWeight: 700,
                                        color: "#0F172A",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        marginTop: 2,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <span>
                                        {selectedRecord.managed_by_name ||
                                            selectedRecord.managed_by ||
                                            "Super Admin"}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: "1px 6px",
                                            borderRadius: 999,
                                            background: (
                                                selectedRecord.managed_by_role || ""
                                            )
                                                .toLowerCase()
                                                .includes("super")
                                                ? "#F5F3FF"
                                                : "#EFF6FF",
                                            color: (
                                                selectedRecord.managed_by_role || ""
                                            )
                                                .toLowerCase()
                                                .includes("super")
                                                ? "#7C3AED"
                                                : "#2563EB",
                                            border: `1px solid ${
                                                (
                                                    selectedRecord.managed_by_role || ""
                                                )
                                                    .toLowerCase()
                                                    .includes("super")
                                                    ? "#DDD6FE"
                                                    : "#BFDBFE"
                                            }`,
                                        }}
                                    >
                                        {selectedRecord.managed_by_role || "Manager"}
                                    </span>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748B",
                                        fontWeight: 600,
                                    }}
                                >
                                    Category
                                </div>
                                <div style={{ marginTop: 2 }}>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            padding: "2px 8px",
                                            borderRadius: 999,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            ...getCategoryBadgeStyle(
                                                selectedRecord.service_category ||
                                                    selectedRecord.category ||
                                                    "Service",
                                            ),
                                        }}
                                    >
                                        {selectedRecord.service_category ||
                                            selectedRecord.category ||
                                            "Service"}
                                    </span>
                                </div>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748B",
                                        fontWeight: 600,
                                    }}
                                >
                                    Service / Item Description
                                </div>
                                <div
                                    style={{
                                        fontWeight: 700,
                                        color: "#1E2F5F",
                                    }}
                                >
                                    {selectedRecord.service}
                                </div>
                            </div>
                            {selectedRecord.sub_category && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#64748B",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Sub-Category
                                    </div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: "#334155",
                                        }}
                                    >
                                        {selectedRecord.sub_category}
                                    </div>
                                </div>
                            )}
                            {selectedRecord.brand && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#64748B",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Brand / Model
                                    </div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: "#334155",
                                        }}
                                    >
                                        {selectedRecord.brand}{" "}
                                        {selectedRecord.model || ""}
                                    </div>
                                </div>
                            )}
                            {selectedRecord.serial_number && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#64748B",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Serial Number
                                    </div>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontFamily: "monospace",
                                            color: "#0F172A",
                                        }}
                                    >
                                        {selectedRecord.serial_number}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Financial Overview Cards */}
                        {selectedRecord.record_type === "service" || !selectedRecord.record_type ? (
                            /* Service Financial Breakdown: Booking Fee, Base Price, Spare Parts, Total Paid, Est. Profit */
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                                    gap: 8,
                                    marginBottom: 16,
                                }}
                            >
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                    }}
                                >
                                    <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>
                                        Booking Fee
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 2 }}>
                                        {formatCurrency(selectedRecord.booking_fee || 0)}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                    }}
                                >
                                    <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>
                                        Base Price
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
                                        {formatCurrency(selectedRecord.base_price || 0)}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        background: Number(selectedRecord.spare_parts_price) > 0 ? "#FFFBEB" : "#F8FAFC",
                                        border: `1px solid ${Number(selectedRecord.spare_parts_price) > 0 ? "#FDE68A" : "#E2E8F0"}`,
                                    }}
                                >
                                    <div style={{ fontSize: 10, color: Number(selectedRecord.spare_parts_price) > 0 ? "#92400E" : "#64748B", fontWeight: 600 }}>
                                        Spare Parts {selectedRecord.is_repair ? "(Repair)" : ""}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: Number(selectedRecord.spare_parts_price) > 0 ? "#D97706" : "#64748B", marginTop: 2 }}>
                                        {formatCurrency(selectedRecord.spare_parts_price || 0)}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        background: "#F0FDF4",
                                        border: "1px solid #BBF7D0",
                                    }}
                                >
                                    <div style={{ fontSize: 10, color: "#15803D", fontWeight: 600 }}>
                                        Total Paid
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: "#16A34A", marginTop: 2 }}>
                                        {formatCurrency(selectedRecord.amount_paid || 0)}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        background: "#F0FDFA",
                                        border: "1px solid #99F6E4",
                                    }}
                                >
                                    <div style={{ fontSize: 10, color: "#0F766E", fontWeight: 600 }}>
                                        Est. Profit
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0D9488", marginTop: 2 }}>
                                        {formatCurrency(selectedRecord.profit || 0)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Inventory Sales Financial Breakdown */
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: 10,
                                    marginBottom: 18,
                                }}
                            >
                                <div
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#64748B",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Quantity & Unit Price
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: "#0F172A",
                                            marginTop: 2,
                                        }}
                                    >
                                        {selectedRecord.quantity || 1}{" "}
                                        {selectedRecord.unit || "pc"} ×{" "}
                                        {formatCurrency(
                                            selectedRecord.unit_price ||
                                                selectedRecord.amount_paid ||
                                                0,
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        background: "#F0FDF4",
                                        border: "1px solid #BBF7D0",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#15803D",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Total Amount Paid
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 800,
                                            color: "#16A34A",
                                            marginTop: 2,
                                        }}
                                    >
                                        {formatCurrency(
                                            selectedRecord.amount_paid || 0,
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        background: "#F0FDFA",
                                        border: "1px solid #99F6E4",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#0F766E",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Est. Net Profit
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 800,
                                            color: "#0D9488",
                                            marginTop: 2,
                                        }}
                                    >
                                        {formatCurrency(selectedRecord.profit || 0)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dedicated Consumed Spare Parts Section (for Repair or whenever parts are used) */}
                        {(selectedRecord.is_repair ||
                            (Array.isArray(selectedRecord.consumed_spare_parts) &&
                                selectedRecord.consumed_spare_parts.length > 0) ||
                            Number(selectedRecord.spare_parts_price) > 0 ||
                            selectedRecord.parts_replaced) && (
                            <div
                                style={{
                                    background: "#FFFBEB",
                                    border: "1px solid #FDE68A",
                                    borderRadius: 10,
                                    padding: "12px 14px",
                                    marginBottom: 16,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: "#92400E",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.03em",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span>⚙️</span> Consumed Spare Parts Used in Repair
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            color: "#B45309",
                                        }}
                                    >
                                        Total Added Cost:{" "}
                                        {formatCurrency(
                                            selectedRecord.spare_parts_price || 0,
                                        )}
                                    </span>
                                </div>

                                {Array.isArray(selectedRecord.consumed_spare_parts) &&
                                selectedRecord.consumed_spare_parts.length > 0 ? (
                                    <div style={{ overflowX: "auto" }}>
                                        <table
                                            style={{
                                                width: "100%",
                                                fontSize: 12,
                                                borderCollapse: "collapse",
                                            }}
                                        >
                                            <thead>
                                                <tr
                                                    style={{
                                                        borderBottom: "1px solid #FDE68A",
                                                        color: "#78350F",
                                                        textAlign: "left",
                                                    }}
                                                >
                                                    <th style={{ padding: "4px 6px" }}>Part Name / SKU</th>
                                                    <th style={{ padding: "4px 6px", textAlign: "center" }}>Qty</th>
                                                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Unit Price</th>
                                                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedRecord.consumed_spare_parts.map((part, pIdx) => (
                                                    <tr
                                                        key={part.item_id || pIdx}
                                                        style={{
                                                            borderBottom: "1px solid #FEF3C7",
                                                            color: "#1F2937",
                                                        }}
                                                    >
                                                        <td style={{ padding: "6px" }}>
                                                            <div style={{ fontWeight: 600 }}>{part.item_name}</div>
                                                            {part.sku && (
                                                                <div style={{ fontSize: 10, color: "#92400E" }}>
                                                                    SKU: {part.sku}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: "6px", textAlign: "center", fontWeight: 600 }}>
                                                            {part.quantity_used} {part.unit || "pc"}
                                                        </td>
                                                        <td style={{ padding: "6px", textAlign: "right" }}>
                                                            {formatCurrency(part.unit_price)}
                                                        </td>
                                                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "#92400E" }}>
                                                            {formatCurrency(part.total_price)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 11, color: "#78350F", fontStyle: "italic" }}>
                                        Spare parts billed: {formatCurrency(selectedRecord.spare_parts_price || 0)}
                                    </div>
                                )}

                                {selectedRecord.parts_replaced && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            paddingTop: 8,
                                            borderTop: "1px dashed #FDE68A",
                                            fontSize: 11,
                                            color: "#78350F",
                                        }}
                                    >
                                        <strong>Technician Notes / Parts Replaced:</strong>{" "}
                                        {selectedRecord.parts_replaced}
                                    </div>
                                )}

                                <div
                                    style={{
                                        marginTop: 6,
                                        fontSize: 10,
                                        color: "#92400E",
                                        fontStyle: "italic",
                                    }}
                                >
                                    * The cost of consumed spare parts used for this repair is automatically included in the total paid amount.
                                </div>
                            </div>
                        )}

                        {/* Payment & Turnover Breakdown */}
                        {(Number(selectedRecord.amount_turned_over) > 0 ||
                            selectedRecord.turnover_verified ||
                            Number(selectedRecord.down_payment_credited) > 0 ||
                            (Array.isArray(selectedRecord.payments) &&
                                selectedRecord.payments.length > 0)) && (
                            <div
                                style={{
                                    background: "#F8FAFC",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: 10,
                                    padding: "12px 14px",
                                    marginBottom: 16,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 10,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: "#1E2F5F",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.03em",
                                        }}
                                    >
                                        Payment & Turnover Breakdown
                                    </span>
                                    {selectedRecord.turnover_verified && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: "#065F46",
                                                background: "#ECFDF5",
                                                border: "1px solid #A7F3D0",
                                                padding: "2px 8px",
                                                borderRadius: 999,
                                            }}
                                        >
                                            ✓ Turnover Verified by Manager
                                        </span>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit, minmax(130px, 1fr))",
                                        gap: 8,
                                        fontSize: 12,
                                        marginBottom:
                                            Array.isArray(selectedRecord.payments) &&
                                            selectedRecord.payments.length > 0
                                                ? 10
                                                : 0,
                                    }}
                                >
                                    {Number(selectedRecord.down_payment_credited) > 0 && (
                                        <div
                                            style={{
                                                padding: "8px 10px",
                                                background: "#fff",
                                                borderRadius: 6,
                                                border: "1px solid #E2E8F0",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    color: "#64748B",
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Reservation Down Payment
                                            </div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    color: "#1E293B",
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatCurrency(
                                                    selectedRecord.down_payment_credited,
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {Number(selectedRecord.amount_turned_over) > 0 && (
                                        <div
                                            style={{
                                                padding: "8px 10px",
                                                background: "#ECFDF5",
                                                borderRadius: 6,
                                                border: "1px solid #A7F3D0",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    color: "#065F46",
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Turned Over Amount
                                            </div>
                                            <div
                                                style={{
                                                    fontWeight: 800,
                                                    color: "#065F46",
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatCurrency(
                                                    selectedRecord.amount_turned_over,
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedRecord.requested_by_name && (
                                        <div
                                            style={{
                                                padding: "8px 10px",
                                                background: "#fff",
                                                borderRadius: 6,
                                                border: "1px solid #E2E8F0",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    color: "#64748B",
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Service Requested By
                                            </div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    color: "#1E293B",
                                                    marginTop: 2,
                                                }}
                                            >
                                                {selectedRecord.requested_by_name}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {Array.isArray(selectedRecord.payments) &&
                                    selectedRecord.payments.length > 0 && (
                                        <div
                                            style={{
                                                borderTop: "1px dashed #CBD5E1",
                                                paddingTop: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "#64748B",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                Recorded Payment Transactions (
                                                {selectedRecord.payments.length})
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 4,
                                                }}
                                            >
                                                {selectedRecord.payments.map((p, idx) => (
                                                    <div
                                                        key={p.payment_id || idx}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            fontSize: 12,
                                                            background: "#fff",
                                                            padding: "6px 8px",
                                                            borderRadius: 6,
                                                            border: "1px solid #F1F5F9",
                                                        }}
                                                    >
                                                        <div>
                                                            <span
                                                                style={{
                                                                    fontWeight: 600,
                                                                    color: "#334155",
                                                                }}
                                                            >
                                                                {p.payment_type || "Payment"}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    color: "#64748B",
                                                                    marginLeft: 6,
                                                                    fontSize: 11,
                                                                }}
                                                            >
                                                                ({p.payment_method}
                                                                {p.reference_number
                                                                    ? ` · Ref: ${p.reference_number}`
                                                                    : ""}
                                                                )
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontWeight: 700,
                                                                color:
                                                                    p.payment_status === "Paid"
                                                                        ? "#16A34A"
                                                                        : "#64748B",
                                                            }}
                                                        >
                                                            {formatCurrency(p.amount_paid)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}

                        {selectedRecord.notes && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#475569",
                                    background: "#FFFBEB",
                                    border: "1px solid #FDE68A",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    marginBottom: 16,
                                }}
                            >
                                <strong>Notes:</strong> {selectedRecord.notes}
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => setSelectedRecord(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalesRecords;
