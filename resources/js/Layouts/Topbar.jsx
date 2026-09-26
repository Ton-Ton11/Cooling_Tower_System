import { usePage } from "@inertiajs/react";
import { getInitials } from "../utils/superAdmin";

const Icon = ({ d, size = 18 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={d} />
    </svg>
);

const ic = {
    chevron_left: "M15 18l-6-6 6-6",
    chevron_right: "M9 18l6-6-6-6",
    menu: "M3 6h18 M3 12h18 M3 18h18",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    calendar:
        "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    settings:
        "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
};

function Topbar({ collapsed, isMobile = false, onToggleSidebar }) {
    const { auth = {} } = usePage().props;
    const user = auth.user || {};
    const displayName =
        user.name ||
        [user.given_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(" ") ||
        user.email ||
        "Super Admin";
    const roleLabel = auth.role_name || "Administrator";
    const initials = getInitials(displayName);
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <header
            style={{
                background: "#fff",
                borderBottom: "1px solid #F0F2F5",
                padding: isMobile ? "0 12px" : "0 20px",
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
                zIndex: 9,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
        >
            <button
                onClick={onToggleSidebar}
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748B",
                    flexShrink: 0,
                    transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F1F5F9";
                    e.currentTarget.style.color = "#0F172A";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#64748B";
                }}
            >
                <Icon
                    d={isMobile ? ic.menu : collapsed ? ic.chevron_right : ic.chevron_left}
                    size={16}
                />
            </button>

            {!isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#0E1A33", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                        Cooling Tower System
                    </span>
                </div>
            )}

            {!isMobile && (
                <div style={{ position: "relative", flex: 1, maxWidth: 380, margin: "0 auto" }}>
                    <span
                        style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#64748B",
                            display: "flex",
                            pointerEvents: "none",
                        }}
                    >
                        <Icon d={ic.search} size={15} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search services, bookings..."
                        style={{
                            width: "100%",
                            paddingLeft: 38,
                            paddingRight: 32,
                            paddingTop: 8,
                            paddingBottom: 8,
                            background: "#F1F5F9",
                            border: "1px solid #E2E8F0",
                            borderRadius: 999,
                            fontSize: 13,
                            color: "#1E293B",
                            outline: "none",
                            fontFamily: "inherit",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#2563EB";
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#E2E8F0";
                            e.currentTarget.style.background = "#F1F5F9";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                    <span
                        style={{
                            position: "absolute",
                            right: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#94A3B8",
                            pointerEvents: "none",
                            fontSize: 10,
                        }}
                    >
                        ▼
                    </span>
                </div>
            )}

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? 8 : 12,
                    marginLeft: "auto",
                }}
            >
                {/* Messages Counter Badge */}
                <div style={{ position: "relative" }}>
                    <button
                        title="Messages"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748B",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                    </button>
                    <span
                        style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            background: "#0284C7",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 17,
                            height: 17,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                            border: "2px solid #fff",
                        }}
                    >
                        3
                    </span>
                </div>

                {/* Notifications Bell with Badge */}
                <div style={{ position: "relative" }}>
                    <button
                        title="Notifications"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748B",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        <Icon d={ic.bell} size={17} />
                    </button>
                    <span
                        style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            background: "#0EA5E9",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 17,
                            height: 17,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                            border: "2px solid #fff",
                        }}
                    >
                        9
                    </span>
                </div>

                {!isMobile && (
                    <button
                        title="Calendar"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748B",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        <Icon d={ic.calendar} size={17} />
                    </button>
                )}

                <div
                    style={{
                        width: 1,
                        height: 24,
                        background: "#E2E8F0",
                        margin: "0 4px",
                    }}
                />

                {/* User Profile Avatar with Online Ring */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {!isMobile && (
                        <div style={{ textAlign: "right" }}>
                            <p
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#0E1A33",
                                    lineHeight: 1.2,
                                    margin: 0,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {displayName}
                            </p>
                            <p
                                style={{
                                    fontSize: 11,
                                    color: "#64748B",
                                    lineHeight: 1.2,
                                    margin: "2px 0 0",
                                }}
                            >
                                {roleLabel}
                            </p>
                        </div>
                    )}
                    <div style={{ position: "relative" }}>
                        <div
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg,#2563EB,#0E1A33)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 800,
                                flexShrink: 0,
                                boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                            }}
                        >
                            {initials}
                        </div>
                        <span
                            style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                background: "#10B981",
                                borderRadius: "50%",
                                border: "2px solid #fff",
                            }}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Topbar;
