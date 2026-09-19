import { useCallback, useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { TECHNICIAN_ENDPOINTS, extractErrorMessage, formatDateTime } from "../../utils/superAdmin";

const Icon = ({ d, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const ic = {
    trophy: "M8.21 13.89L7 23l5-3 5 3-1.21-9.12 M18.63 8A8 8 0 015.37 8 M5 12V4h14v8",
    bar: "M18 20V10 M12 20V4 M6 20v-6",
    refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

const PERIODS = ["Weekly", "Monthly", "Yearly"];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 14px", fontSize: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#1E2F5F" }}>{label}</p>
            {payload.map((entry) => (
                <p key={entry.dataKey} style={{ margin: "2px 0", color: entry.color }}>
                    Completed Jobs: <strong>{entry.value}</strong>
                </p>
            ))}
        </div>
    );
};

export default function TechnicianPerformance({ addToast }) {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("Monthly");
    const [data, setData] = useState({
        technicians: [],
        weekly: [],
        monthly: [],
        yearly: [],
        reviews: [],
        avg_rating: 5.0,
    });

    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data: res } = await window.axios.get(TECHNICIAN_ENDPOINTS.performance);
            setData(res);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load performance data."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const chartData =
        period === "Weekly"
            ? (data.weekly ?? []).map((d) => ({ label: d.day, completed: d.completed }))
            : period === "Monthly"
            ? (data.monthly ?? []).map((d) => ({ label: d.month, completed: d.completed }))
            : (data.yearly ?? []).map((d) => ({ label: String(d.year), completed: d.completed }));

    const totalCompleted = chartData.reduce((s, d) => s + d.completed, 0);

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E2F5F" }}>My Performance & Reviews</h1>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
                        Weekly, monthly, and yearly completed service jobs and customer ratings
                    </p>
                </div>
                <button
                    onClick={() => fetchData(false)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: "1px solid #E5E7EB",
                        background: "#fff",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#374151",
                        cursor: "pointer",
                    }}
                >
                    <Icon d={ic.refresh} size={14} /> Refresh
                </button>
            </div>

            {/* Period Selection */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        style={{
                            padding: "7px 18px",
                            borderRadius: 10,
                            border: "1px solid",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            background: period === p ? "#1E2F5F" : "#fff",
                            color: period === p ? "#fff" : "#6B7280",
                            borderColor: period === p ? "#1E2F5F" : "#E5E7EB",
                        }}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #F0F2F5", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(63,125,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3F7DFF", flexShrink: 0 }}>
                        <Icon d={ic.bar} size={20} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{period} Completions</p>
                        <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 700, color: "#1E2F5F" }}>{loading ? "—" : totalCompleted}</p>
                    </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #F0F2F5", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F59E0B", flexShrink: 0 }}>
                        <Icon d={ic.star} size={20} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Customer Rating</p>
                        <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 700, color: "#1E2F5F" }}>{loading ? "—" : `${data.avg_rating} / 5.0`}</p>
                    </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #F0F2F5", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981", flexShrink: 0 }}>
                        <Icon d={ic.trophy} size={20} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Total Reviews</p>
                        <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 700, color: "#1E2F5F" }}>{loading ? "—" : data.reviews?.length ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #F0F2F5", marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>
                    {period} Completed Service Jobs
                </h3>
                {loading ? (
                    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 14 }}>
                        Loading chart...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 0, right: 16, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="completed" name="Completed" fill="#3F7DFF" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Customer Reviews & Feedback */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F2F5", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #F0F2F5" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>Customer Reviews & Ratings</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>Direct feedback from clients on your completed bookings</p>
                </div>
                {loading ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Loading reviews...</div>
                ) : !data.reviews || data.reviews.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                        No customer ratings or reviews recorded yet.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        {data.reviews.map((rev) => (
                            <div
                                key={rev.feedback_id}
                                style={{
                                    padding: "16px 24px",
                                    borderBottom: "1px solid #F0F2F5",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1E2F5F" }}>
                                            {rev.client_name}
                                        </span>
                                        <span style={{ marginLeft: 8, fontSize: 12, color: "#6B7280" }}>
                                            · {rev.service} (Job #{rev.booking_id})
                                        </span>
                                    </div>
                                    <span style={{ display: "inline-flex", gap: 2, color: "#F59E0B", fontSize: 14 }}>
                                        {"★".repeat(rev.rating)}
                                        {"☆".repeat(Math.max(0, 5 - rev.rating))}
                                    </span>
                                </div>
                                {rev.feedback && (
                                    <p style={{ margin: 0, fontSize: 13, color: "#374151", fontStyle: "italic" }}>
                                        "{rev.feedback}"
                                    </p>
                                )}
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                                    {formatDateTime(rev.submitted_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
