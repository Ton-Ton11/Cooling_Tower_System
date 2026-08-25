import { useCallback, useEffect, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import { TECHNICIAN_ENDPOINTS, extractErrorMessage, formatDateTime } from "../../utils/superAdmin";

export default function TechnicianTools({ addToast }) {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTools = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data } = await window.axios.get(TECHNICIAN_ENDPOINTS.myTools);
            setTools(Array.isArray(data?.data) ? data.data : []);
        } catch (error) {
            addToast(extractErrorMessage(error, "Unable to load checked-out tools."), "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchTools();
    }, [fetchTools]);

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">My Tools & Equipment</h1>
                    <p className="page-subtitle">
                        Power tools, gauges, and equipment currently issued to your custody
                    </p>
                </div>
                <div>
                    <button className="btn-secondary" onClick={() => fetchTools()}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
                        Loading issued tools...
                    </div>
                ) : tools.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                        No tools currently checked out under your account. Request tools from the Tools Man.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    {["Tool Name", "Serial Number", "Subtype", "Checkout Date", "Return Date", "Status"].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#9CA3AF",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                borderBottom: "1px solid #EAECF0",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tools.map((t) => (
                                    <tr key={t.checkout_id} style={{ borderTop: "1px solid #F0F2F5" }}>
                                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1E2F5F" }}>
                                            {t.item_name}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                            {t.serial_number || "—"}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                                            {t.tool_subtype ? `${t.tool_subtype} tool` : "Tool"}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#9CA3AF" }}>
                                            {formatDateTime(t.checkout_date)}
                                        </td>
                                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#9CA3AF" }}>
                                            {t.return_date ? formatDateTime(t.return_date) : "Active in custody"}
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <StatusBadge status={t.status === "Checked Out" ? "Borrowed" : t.status === "Returned" ? "Available" : "Defect"} />
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
