import { useCallback, useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    LineChart,
    Line,
} from "recharts";
import { SUPER_ADMIN_ENDPOINTS, extractErrorMessage } from "../../utils/superAdmin";

const Icon = ({ d, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const ic = {
    trophy:  "M8.21 13.89L7 23l5-3 5 3-1.21-9.12 M18.63 8A8 8 0 015.37 8 M5 12V4h14v8",
    bar:     "M18 20V10 M12 20V4 M6 20v-6",
    refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
};

const PERIODS = ["Weekly", "Monthly", "Yearly"];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 14px", fontSize: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#1E2F5F" }}>{label}</p>
            {payload.map((entry) => (
                <p key={entry.dataKey} style={{ margin: "2px 0", color: entry.color }}>
                    {entry.name}: <strong>{entry.value}</strong>
                </p>
            ))}
        </div>
    );
};

function Performance({ addToast, endpoints }) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("Monthly");
    const [data, setData] = useState({ technicians: [], weekly: [], monthly: [], yearly: [] });

    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data: res } = await window.axios.get(ep.performance);
            setData(res);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load performance data."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast, ep.performance]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const chartData =
        period === "Weekly"
            ? (data.weekly ?? []).map((d) => ({ label: d.day, completed: d.completed }))
            : period === "Monthly"
            ? (data.monthly ?? []).map((d) => ({ label: d.month, completed: d.completed }))
            : (data.yearly ?? []).map((d) => ({ label: String(d.year), completed: d.completed }));

    const totalCompleted = chartData.reduce((s, d) => s + d.completed, 0);

    const skeletonRow = {
        height: 16, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
        backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
    };

    return (
        <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", color: "#1E293B" }}>
            <style>{`
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
            `}</style>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E2F5F" }}>Technician Performance</h1>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>Completed bookings by technician — weekly, monthly, and yearly</p>
                </div>
                <button
                    onClick={() => fetchData(false)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" }}
                >
                    <Icon d={ic.refresh} size={14} /> Refresh
                </button>
            </div>

            {/* Period Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        style={{
                            padding: "7px 18px", borderRadius: 10, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                            background: period === p ? "#1E2F5F" : "#fff",
                            color: period === p ? "#fff" : "#6B7280",
                            borderColor: period === p ? "#1E2F5F" : "#E5E7EB",
                        }}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Summary Card */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 24 }}>
                {[
                    { label: `${period} Completions`, value: totalCompleted, icon: ic.bar, color: "#3F7DFF" },
                    { label: "Top Technician", value: data.technicians?.[0]?.full_name ?? "—", icon: ic.trophy, color: "#F59E0B" },
                    { label: "Total Technicians", value: data.technicians?.length ?? 0, icon: ic.user, color: "#10B981" },
                ].map((card) => (
                    <div key={card.label} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #F0F2F5", display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: card.color, flexShrink: 0 }}>
                            <Icon d={card.icon} size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{card.label}</p>
                            <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 700, color: "#1E2F5F" }}>{loading ? "—" : card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #F0F2F5", marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>
                    {period} Completed Bookings
                </h3>
                {loading ? (
                    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 14 }}>Loading chart data…</div>
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

            {/* Leaderboard */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F2F5", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #F0F2F5" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1E2F5F" }}>Technician Leaderboard</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>All-time completed bookings ranking</p>
                </div>
                {loading ? (
                    <div style={{ padding: 24 }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{ ...skeletonRow, marginBottom: 12, width: `${85 - i * 10}%` }} />
                        ))}
                    </div>
                ) : data.technicians.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>No completed bookings recorded yet.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {["Rank", "Technician", "Completed Bookings", "Revenue Generated"].map((h) => (
                                        <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.technicians.map((tech, idx) => (
                                    <tr key={tech.user_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                        <td style={{ padding: "12px 20px" }}>
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                width: 28, height: 28, borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                background: idx === 0 ? "#FEF3C7" : idx === 1 ? "#F3F4F6" : idx === 2 ? "#FEE2E2" : "#F8FAFC",
                                                color: idx === 0 ? "#D97706" : idx === 1 ? "#6B7280" : idx === 2 ? "#DC2626" : "#9CA3AF",
                                            }}>#{idx + 1}</span>
                                        </td>
                                        <td style={{ padding: "12px 20px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#3F7DFF,#1E2F5F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                                                    {tech.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>{tech.full_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 20px" }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#3F7DFF" }}>
                                                {tech.total_completed}
                                                <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>jobs</span>
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600, color: "#10B981" }}>
                                            ₱{Number(tech.total_revenue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
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

export default Performance;
