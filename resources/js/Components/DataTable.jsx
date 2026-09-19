import { useState } from "react";
import StatusBadge from "./StatusBadge";
const PAGE_SIZE = 8;
function DataTable({
    columns,
    data,
    actions,
    searchable = true,
    searchPlaceholder = "Search...",
    searchKeys,
    emptyMessage = "No records found.",
    rowKey,
}) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(1);
    const [openMenu, setOpenMenu] = useState(null);
    const filtered = data.filter((row) => {
        if (!search) return true;
        const keys = searchKeys || Object.keys(row);
        return keys.some((k) =>
            String(row[k] ?? "")
                .toLowerCase()
                .includes(search.toLowerCase()),
        );
    });
    const sorted = sortKey
        ? [...filtered].sort((a, b) => {
              const av = String(a[sortKey] ?? "");
              const bv = String(b[sortKey] ?? "");
              return sortDir === "asc"
                  ? av.localeCompare(bv)
                  : bv.localeCompare(av);
          })
        : filtered;
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const handleSort = (key) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("asc");
        }
        setPage(1);
    };
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {" "}
            {searchable && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {" "}
                    <div
                        style={{ position: "relative", flex: 1, maxWidth: 320 }}
                    >
                        {" "}
                        <span
                            style={{
                                position: "absolute",
                                left: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#5A6480",
                                fontSize: 14,
                            }}
                        >
                            🔍
                        </span>{" "}
                        <input
                            className="input-field"
                            style={{ paddingLeft: 32 }}
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />{" "}
                    </div>{" "}
                    <span
                        style={{
                            fontSize: 12,
                            color: "#5A6480",
                            fontFamily: "'JetBrains Mono',monospace",
                        }}
                    >
                        {" "}
                        {filtered.length} record
                        {filtered.length !== 1 ? "s" : ""}{" "}
                    </span>{" "}
                </div>
            )}{" "}
            <div
                style={{
                    overflow: "auto",
                    borderRadius: 10,
                    border: "1px solid rgba(111,208,250,0.1)",
                }}
            >
                {" "}
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: 600,
                    }}
                >
                    {" "}
                    <thead>
                        {" "}
                        <tr style={{ background: "rgba(13,21,38,0.6)" }}>
                            {" "}
                            {columns.map((col) => (
                                <th
                                    key={String(col.key)}
                                    onClick={() =>
                                        col.sortable !== false &&
                                        handleSort(String(col.key))
                                    }
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontSize: 11,
                                        fontFamily: "'DM Sans',sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "#5A6480",
                                        whiteSpace: "nowrap",
                                        cursor:
                                            col.sortable !== false
                                                ? "pointer"
                                                : "default",
                                        borderBottom:
                                            "1px solid rgba(111,208,250,0.1)",
                                        userSelect: "none",
                                    }}
                                >
                                    {" "}
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        {" "}
                                        {col.label}{" "}
                                        {sortKey === String(col.key) && (
                                            <span style={{ fontSize: 10 }}>
                                                {sortDir === "asc"
                                                    ? "\u25B2"
                                                    : "\u25BC"}
                                            </span>
                                        )}{" "}
                                    </span>{" "}
                                </th>
                            ))}{" "}
                            {actions && actions.length > 0 && (
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "right",
                                        fontSize: 11,
                                        fontFamily: "'DM Sans',sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "#5A6480",
                                        borderBottom:
                                            "1px solid rgba(111,208,250,0.1)",
                                    }}
                                >
                                    {" "}
                                    Actions{" "}
                                </th>
                            )}{" "}
                        </tr>{" "}
                    </thead>{" "}
                    <tbody>
                        {" "}
                        {paginated.length === 0 ? (
                            <tr>
                                {" "}
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    style={{
                                        padding: "32px 14px",
                                        textAlign: "center",
                                        color: "#5A6480",
                                        fontSize: 13,
                                    }}
                                >
                                    {" "}
                                    {emptyMessage}{" "}
                                </td>{" "}
                            </tr>
                        ) : (
                            paginated.map((row, i) => (
                                <tr
                                    key={String(row[rowKey])}
                                    style={{
                                        borderBottom:
                                            i < paginated.length - 1
                                                ? "1px solid rgba(111,208,250,0.07)"
                                                : "none",
                                        transition: "background 0.1s",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                            "rgba(111,208,250,0.04)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                            "transparent")
                                    }
                                >
                                    {" "}
                                    {columns.map((col) => {
                                        const rawVal = col.render
                                            ? null
                                            : row[col.key];
                                        const strVal =
                                            rawVal !== null && rawVal !== void 0
                                                ? String(rawVal)
                                                : "\u2014";
                                        const isStatus =
                                            typeof rawVal === "string" &&
                                            [
                                                "Pending",
                                                "Approved",
                                                "Dispatched",
                                                "In-Progress",
                                                "Completed",
                                                "Incomplete",
                                                "Cancelled",
                                                "Active",
                                                "Archived",
                                                "Available",
                                                "Reserved",
                                                "Installed",
                                                "Order Base",
                                                "Defect",
                                                "Paid",
                                                "Checked Out",
                                                "Lost/Damaged",
                                                "Draft",
                                                "Finalized",
                                                "Exported",
                                                "Tool",
                                                "Material",
                                                "Spare Part",
                                                "Rescheduled",
                                            ].includes(rawVal);
                                        return (
                                            <td
                                                key={String(col.key)}
                                                style={{
                                                    padding: "10px 14px",
                                                    fontSize: 13,
                                                    color: "#C8D0E0",
                                                    fontFamily: col.mono
                                                        ? "'JetBrains Mono',monospace"
                                                        : "'Inter',sans-serif",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: 240,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {" "}
                                                {col.render ? (
                                                    col.render(row)
                                                ) : isStatus ? (
                                                    <StatusBadge
                                                        status={rawVal}
                                                    />
                                                ) : (
                                                    strVal
                                                )}{" "}
                                            </td>
                                        );
                                    })}{" "}
                                    {actions && actions.length > 0 && (
                                        <td
                                            style={{
                                                padding: "10px 14px",
                                                textAlign: "right",
                                                position: "relative",
                                            }}
                                        >
                                            {" "}
                                            <div
                                                style={{
                                                    position: "relative",
                                                    display: "inline-block",
                                                }}
                                            >
                                                {" "}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenu(
                                                            openMenu ===
                                                                row[rowKey]
                                                                ? null
                                                                : row[rowKey],
                                                        );
                                                    }}
                                                    style={{
                                                        background:
                                                            "rgba(111,208,250,0.08)",
                                                        border: "1px solid rgba(111,208,250,0.15)",
                                                        borderRadius: 6,
                                                        color: "#8A93A6",
                                                        cursor: "pointer",
                                                        padding: "4px 10px",
                                                        fontSize: 16,
                                                        letterSpacing: 2,
                                                    }}
                                                >
                                                    ⋯
                                                </button>{" "}
                                                {openMenu === row[rowKey] && (
                                                    <div
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            right: 0,
                                                            top: "110%",
                                                            zIndex: 100,
                                                            background:
                                                                "#1F2E52",
                                                            border: "1px solid rgba(111,208,250,0.2)",
                                                            borderRadius: 8,
                                                            boxShadow:
                                                                "0 12px 32px rgba(0,0,0,0.4)",
                                                            minWidth: 180,
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {" "}
                                                        {actions.map(
                                                            (action, ai) => (
                                                                <button
                                                                    key={`${action.label}-${ai}`}
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenu(
                                                                            null,
                                                                        );
                                                                        action.onClick(
                                                                            row,
                                                                        );
                                                                    }}
                                                                    style={{
                                                                        display:
                                                                            "block",
                                                                        width: "100%",
                                                                        textAlign:
                                                                            "left",
                                                                        padding:
                                                                            "9px 14px",
                                                                        border: "none",
                                                                        background:
                                                                            "none",
                                                                        fontSize: 13,
                                                                        fontFamily:
                                                                            "'DM Sans',sans-serif",
                                                                        color:
                                                                            action.variant ===
                                                                            "danger"
                                                                                ? "#E74C3C"
                                                                                : action.variant ===
                                                                                    "orange"
                                                                                  ? "#FFB84D"
                                                                                  : "#C8D0E0",
                                                                        cursor: "pointer",
                                                                        transition:
                                                                            "background 0.1s",
                                                                    }}
                                                                    onMouseEnter={(
                                                                        e,
                                                                    ) =>
                                                                        (e.currentTarget.style.background =
                                                                            "rgba(111,208,250,0.06)")
                                                                    }
                                                                    onMouseLeave={(
                                                                        e,
                                                                    ) =>
                                                                        (e.currentTarget.style.background =
                                                                            "none")
                                                                    }
                                                                >
                                                                    {" "}
                                                                    {
                                                                        action.label
                                                                    }{" "}
                                                                </button>
                                                            ),
                                                        )}{" "}
                                                    </div>
                                                )}{" "}
                                            </div>{" "}
                                        </td>
                                    )}{" "}
                                </tr>
                            ))
                        )}{" "}
                    </tbody>{" "}
                </table>{" "}
            </div>{" "}
            {totalPages > 1 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                    }}
                >
                    {" "}
                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: "1px solid rgba(111,208,250,0.2)",
                            background: "transparent",
                            color: page === 1 ? "#3A4560" : "#8A93A6",
                            cursor: page === 1 ? "not-allowed" : "pointer",
                            fontSize: 13,
                        }}
                    >
                        ← Prev
                    </button>{" "}
                    <span
                        style={{
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono',monospace",
                            color: "#5A6480",
                        }}
                    >
                        {" "}
                        {page} / {totalPages}{" "}
                    </span>{" "}
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: "1px solid rgba(111,208,250,0.2)",
                            background: "transparent",
                            color: page === totalPages ? "#3A4560" : "#8A93A6",
                            cursor:
                                page === totalPages ? "not-allowed" : "pointer",
                            fontSize: 13,
                        }}
                    >
                        Next →
                    </button>{" "}
                </div>
            )}{" "}
        </div>
    );
}
export { DataTable as default };
