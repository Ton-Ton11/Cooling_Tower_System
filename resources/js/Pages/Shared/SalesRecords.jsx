import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import StatusBadge from "../../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
    buildAnnualRevenue,
    extractErrorMessage,
    formatCurrency,
    formatDateTime,
} from "../../utils/superAdmin";

function SalesRecords({ addToast, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [period, setPeriod] = useState("Monthly");
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({
        total_revenue: 0,
        paid_bookings: 0,
        gcash_revenue: 0,
        cash_revenue: 0,
    });
    const [weeklyRevenue, setWeeklyRevenue] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);

    const fetchSalesRecords = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    ep.salesRecords,
                );
                setRecords(Array.isArray(data?.data) ? data.data : []);
                setSummary({
                    total_revenue: Number(data?.summary?.total_revenue ?? 0),
                    paid_bookings: Number(data?.summary?.paid_bookings ?? 0),
                    gcash_revenue: Number(data?.summary?.gcash_revenue ?? 0),
                    cash_revenue: Number(data?.summary?.cash_revenue ?? 0),
                });
                setWeeklyRevenue(
                    Array.isArray(data?.weekly_revenue) ? data.weekly_revenue : [],
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
        [addToast],
    );

    useEffect(() => {
        fetchSalesRecords();
    }, [fetchSalesRecords]);

    const chartData = useMemo(() => {
        if (period === "Weekly") {
            return weeklyRevenue.map((row) => ({
                key: row.day,
                revenue: Number(row.revenue ?? 0),
                bookings: Number(row.bookings ?? 0),
                label: row.date,
            }));
        }

        if (period === "Annually") {
            return buildAnnualRevenue(monthlyRevenue).map((row) => ({
                key: row.year,
                revenue: Number(row.revenue ?? 0),
                bookings: Number(row.bookings ?? 0),
            }));
        }

        return monthlyRevenue.map((row) => ({
            key: row.month,
            revenue: Number(row.revenue ?? 0),
            bookings: Number(row.bookings ?? 0),
            label: row.year_month,
        }));
    }, [monthlyRevenue, period, weeklyRevenue]);

    const chartTotal = chartData.reduce(
        (sum, row) => sum + Number(row.revenue ?? 0),
        0,
    );

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Sales & Records
                    </h1>
                    <p className="page-subtitle">
                        {records.length} payment records · {summary.paid_bookings}{" "}
                        paid bookings
                    </p>
                </div>
                <button
                    className="btn-secondary"
                    onClick={() => fetchSalesRecords()}
                >
                    Refresh Records
                </button>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                {[
                    {
                        label: "Total Revenue",
                        value: formatCurrency(summary.total_revenue),
                        color: "#16A34A",
                    },
                    {
                        label: "Paid Bookings",
                        value: summary.paid_bookings,
                        color: "#3F7DFF",
                    },
                    {
                        label: "GCash Revenue",
                        value: formatCurrency(summary.gcash_revenue),
                        color: "#8B5CF6",
                    },
                    {
                        label: "Cash Revenue",
                        value: formatCurrency(summary.cash_revenue),
                        color: "#F58A07",
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="card"
                        style={{ padding: "16px 20px" }}
                    >
                        <p
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "#6B7280",
                                marginBottom: 8,
                            }}
                        >
                            {card.label}
                        </p>
                        <p
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: card.color,
                                margin: 0,
                            }}
                        >
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 20,
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <p className="section-label">Revenue Over Time</p>
                        <p
                            style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: "#1E2F5F",
                                margin: "4px 0 0",
                            }}
                        >
                            {formatCurrency(chartTotal)}
                        </p>
                    </div>
                    <div className="tab-bar">
                        {["Weekly", "Monthly", "Annually"].map((currentPeriod) => (
                            <button
                                key={currentPeriod}
                                className={`tab-item ${period === currentPeriod ? "active" : ""}`}
                                onClick={() => setPeriod(currentPeriod)}
                            >
                                {currentPeriod}
                            </button>
                        ))}
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
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        {period === "Weekly" ? (
                            <BarChart
                                data={chartData}
                                margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
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
                                        name === "revenue"
                                            ? formatCurrency(value)
                                            : value,
                                        name === "revenue"
                                            ? "Revenue"
                                            : "Paid Bookings",
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
                                    }}
                                />
                                <Bar
                                    dataKey="revenue"
                                    fill="#3F7DFF"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        ) : (
                            <AreaChart
                                data={chartData}
                                margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
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
                                            stopColor="#F58A07"
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#F58A07"
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
                                        name === "revenue"
                                            ? formatCurrency(value)
                                            : value,
                                        name === "revenue"
                                            ? "Revenue"
                                            : "Paid Bookings",
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
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#F58A07"
                                    strokeWidth={2}
                                    fill="url(#salesAreaGradient)"
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>

            <div className="card" style={{ padding: 20 }}>
                <p className="section-label" style={{ marginBottom: 14 }}>
                    Payment Records
                </p>

                {loading ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        Loading payment records...
                    </div>
                ) : records.length === 0 ? (
                    <div
                        style={{
                            padding: 24,
                            borderRadius: 12,
                            background: "#F9FAFB",
                            color: "#6B7280",
                        }}
                    >
                        No sales records are available yet.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                            <thead>
                                <tr style={{ background: "#F5F7FA" }}>
                                    {[
                                        "Booking ID",
                                        "Client",
                                        "Service",
                                        "Amount Paid",
                                        "Method",
                                        "Status",
                                        "Date",
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
                                {records.map((record) => (
                                    <tr
                                        key={record.booking_id}
                                        style={{ borderTop: "1px solid #F5F7FA" }}
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
                                                fontWeight: 600,
                                                color: "#3F7DFF",
                                            }}
                                        >
                                            #{record.booking_id}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                color: "#1E2F5F",
                                            }}
                                        >
                                            {record.client_name}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                                maxWidth: 220,
                                            }}
                                        >
                                            <div>{record.service}</div>
                                            {record.rating && (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#F58A07",
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    {"★".repeat(record.rating)}
                                                    {"☆".repeat(
                                                        Math.max(
                                                            0,
                                                            5 - record.rating,
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color:
                                                    record.payment_status === "Paid"
                                                        ? "#16A34A"
                                                        : "#9CA3AF",
                                            }}
                                        >
                                            {record.payment_status === "Paid"
                                                ? formatCurrency(
                                                      record.amount_paid || 0,
                                                  )
                                                : "—"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#6B7280",
                                            }}
                                        >
                                            {record.payment_method || "—"}
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <StatusBadge
                                                status={record.payment_status}
                                            />
                                        </td>
                                        <td
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {formatDateTime(
                                                record.payment_date ||
                                                    record.created_at,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SalesRecords;
