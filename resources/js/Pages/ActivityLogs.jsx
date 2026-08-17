import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ACTION_COLORS,
    ROLE_COLORS,
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
    getInitials,
} from "../utils/superAdmin";

function ActivityLogs({ addToast }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterAction, setFilterAction] = useState("All");
    const [filterRole, setFilterRole] = useState("All");
    const [actionTypes, setActionTypes] = useState(["All"]);

    const roleOptions = useMemo(
        () => [
            "All",
            ...Object.keys(ROLE_COLORS).filter((role) => role !== "All Staff"),
        ],
        [],
    );

    const fetchLogs = useCallback(async () => {
        setLoading(true);

        try {
            const params = { limit: 200 };

            if (search.trim()) {
                params.search = search.trim();
            }

            if (filterAction !== "All") {
                params.action_type = filterAction;
            }

            if (filterRole !== "All") {
                params.role = filterRole;
            }

            const { data } = await window.axios.get(
                SUPER_ADMIN_ENDPOINTS.activityLogs,
                { params },
            );
            const rows = Array.isArray(data?.data) ? data.data : [];

            setLogs(rows);
            setActionTypes((previous) => {
                const next = Array.from(
                    new Set([
                        ...previous.filter((value) => value !== "All"),
                        ...rows
                            .map((row) => row.action_type)
                            .filter(Boolean),
                    ]),
                ).sort();

                return ["All", ...next];
            });
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to load activity logs."),
                "error",
            );
        } finally {
            setLoading(false);
        }
    }, [addToast, filterAction, filterRole, search]);

    useEffect(() => {
        const timeout = setTimeout(
            () => {
                fetchLogs();
            },
            search.trim() ? 250 : 0,
        );

        return () => clearTimeout(timeout);
    }, [fetchLogs, search]);

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">Activity Logs</h1>
                    <p className="page-subtitle">
                        Audit trail of recent employee and system actions
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                        style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            background: "#F5F7FA",
                            border: "1px solid #E5E7EB",
                            padding: "5px 12px",
                            borderRadius: 8,
                        }}
                    >
                        {logs.length} matching log
                        {logs.length === 1 ? "" : "s"}
                    </span>
                    <button className="btn-secondary" onClick={fetchLogs}>
                        Refresh
                    </button>
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 20,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                    <span
                        style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#9CA3AF",
                            fontSize: 13,
                        }}
                    >
                        🔍
                    </span>
                    <input
                        className="input-field"
                        style={{ paddingLeft: 32 }}
                        placeholder="Search logs..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    className="input-field"
                    style={{ width: "auto", minWidth: 160 }}
                    value={filterAction}
                    onChange={(event) => setFilterAction(event.target.value)}
                >
                    {actionTypes.map((action) => (
                        <option key={action} value={action}>
                            {action === "All" ? "All Actions" : action}
                        </option>
                    ))}
                </select>

                <select
                    className="input-field"
                    style={{ width: "auto", minWidth: 160 }}
                    value={filterRole}
                    onChange={(event) => setFilterRole(event.target.value)}
                >
                    {roleOptions.map((role) => (
                        <option key={role} value={role}>
                            {role === "All" ? "All Roles" : role}
                        </option>
                    ))}
                </select>
            </div>

            <div className="card" style={{ padding: 20 }}>
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: 820,
                        }}
                    >
                        <thead>
                            <tr style={{ background: "#F5F7FA" }}>
                                {[
                                    "Log ID",
                                    "User",
                                    "Role",
                                    "Action",
                                    "Description",
                                    "Timestamp",
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
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            padding: 32,
                                            textAlign: "center",
                                            color: "#9CA3AF",
                                            fontSize: 13,
                                        }}
                                    >
                                        Loading activity logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            padding: 32,
                                            textAlign: "center",
                                            color: "#9CA3AF",
                                            fontSize: 13,
                                        }}
                                    >
                                        No logs matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const roleColor =
                                        ROLE_COLORS[log.role] || "#8A93A6";
                                    const actionColor =
                                        ACTION_COLORS[log.action_type] ||
                                        "#8A93A6";

                                    return (
                                        <tr
                                            key={log.id}
                                            style={{
                                                borderTop:
                                                    "1px solid #F5F7FA",
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
                                                    fontSize: 11,
                                                    color: "#9CA3AF",
                                                    fontVariantNumeric:
                                                        "tabular-nums",
                                                }}
                                            >
                                                #{String(log.id).padStart(5, "0")}
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: "50%",
                                                            flexShrink: 0,
                                                            background: `${roleColor}18`,
                                                            border: `1px solid ${roleColor}30`,
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            fontSize: 10,
                                                            color: roleColor,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {getInitials(log.user_name)}
                                                    </div>
                                                    <span
                                                        style={{
                                                            fontSize: 13,
                                                            color: "#1E2F5F",
                                                        }}
                                                    >
                                                        {log.user_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        padding: "2px 8px",
                                                        borderRadius: 20,
                                                        background: `${roleColor}18`,
                                                        color: roleColor,
                                                        border: `1px solid ${roleColor}30`,
                                                        fontWeight: 600,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {log.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        background: `${actionColor}18`,
                                                        color: actionColor,
                                                        fontWeight: 600,
                                                        whiteSpace: "nowrap",
                                                        letterSpacing: "0.05em",
                                                    }}
                                                >
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    color: "#6B7280",
                                                    maxWidth: 360,
                                                }}
                                            >
                                                {log.description}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 12px",
                                                    fontSize: 12,
                                                    color: "#9CA3AF",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatDateTime(log.created_at)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ActivityLogs;
