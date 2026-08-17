import logo from "../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

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
    close: "M18 6L6 18 M6 6l12 12",
    dashboard:
        "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    bookings:
        "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    staff:
        "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    materials:
        "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    acunits: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    sales: "M18 20V10 M12 20V4 M6 20v-6",
    documents:
        "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    logs: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "bookings", label: "Bookings", icon: ic.bookings },
    { id: "staff", label: "Staff Accounts", icon: ic.staff },
    { id: "materials", label: "Materials & Tools", icon: ic.materials },
    { id: "acunits", label: "AC Units Inventory", icon: ic.acunits },
    { id: "sales", label: "Sales & Records", icon: ic.sales },
    { id: "documents", label: "Documents / Forms", icon: ic.documents },
    { id: "announcements", label: "Announcements", icon: ic.announcements },
    { id: "logs", label: "Activity Logs", icon: ic.logs },
];

function Sidebar({
    activePage,
    onNavigate,
    collapsed,
    onLogout,
    badges = {},
    isMobile = false,
    mobileOpen = false,
    onMobileClose = () => {},
}) {
    const sidebarStyle = isMobile
        ? {
              width: 264,
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              background:
                  "linear-gradient(180deg,#1E2F5F 0%,#162347 60%,#0E1932 100%)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
              zIndex: 20,
              transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s ease",
          }
        : {
              width: collapsed ? 68 : 240,
              minHeight: "100vh",
              background:
                  "linear-gradient(180deg,#1E2F5F 0%,#162347 60%,#0E1932 100%)",
              display: "flex",
              flexDirection: "column",
              transition: "width 0.25s ease",
              overflow: "hidden",
              flexShrink: 0,
              zIndex: 10,
          };

    return (
        <aside style={sidebarStyle}>
            <div
                style={{
                    padding: collapsed && !isMobile ? "16px 14px" : "16px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    minHeight: 68,
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        overflow: "hidden",
                    }}
                >
                    <img
                        src={logo}
                        alt="Cooling Tower Logo"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            objectFit: "cover",
                            flexShrink: 0,
                            boxShadow: "0 0 0 2px rgba(255,255,255,0.18)",
                        }}
                    />
                    {(!collapsed || isMobile) && (
                        <div style={{ overflow: "hidden" }}>
                            <p
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#fff",
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.2,
                                    margin: 0,
                                }}
                            >
                                Cooling Tower
                            </p>
                            <p
                                style={{
                                    fontSize: 10,
                                    color: "#59B7FF",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.3,
                                    margin: 0,
                                }}
                            >
                                Airconditioning Services
                            </p>
                        </div>
                    )}
                </div>

                {isMobile && (
                    <button
                        onClick={onMobileClose}
                        style={{
                            width: 32,
                            height: 32,
                            border: "none",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.12)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        <Icon d={ic.close} size={16} />
                    </button>
                )}
            </div>

            <nav
                style={{
                    flex: 1,
                    padding: "10px 8px",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {navItems.map((item) => {
                    const isActive = activePage === item.id;
                    const badgeCount = Number(badges[item.id] ?? 0);
                    const hasBadge =
                        Number.isFinite(badgeCount) && badgeCount > 0;
                    const badgeLabel = badgeCount > 99 ? "99+" : badgeCount;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            title={collapsed && !isMobile ? item.label : undefined}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: collapsed && !isMobile ? 0 : 10,
                                width: "100%",
                                padding:
                                    collapsed && !isMobile
                                        ? "10px 0"
                                        : "9px 12px",
                                justifyContent:
                                    collapsed && !isMobile
                                        ? "center"
                                        : "flex-start",
                                borderRadius: 12,
                                border: "none",
                                background: isActive
                                    ? "rgba(63,125,255,0.25)"
                                    : "transparent",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                marginBottom: 2,
                                position: "relative",
                                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color =
                                        "rgba(255,255,255,0.8)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color =
                                        "rgba(255,255,255,0.5)";
                                }
                            }}
                        >
                            {isActive && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: 3,
                                        height: 22,
                                        borderRadius: "0 4px 4px 0",
                                        background: "#59B7FF",
                                    }}
                                />
                            )}
                            <span style={{ flexShrink: 0, display: "flex" }}>
                                <Icon d={item.icon} size={18} />
                            </span>
                            {(!collapsed || isMobile) && (
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: isActive ? 600 : 500,
                                        flex: 1,
                                        textAlign: "left",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {item.label}
                                </span>
                            )}
                            {(!collapsed || isMobile) && hasBadge ? (
                                <span
                                    style={{
                                        flexShrink: 0,
                                        background: "#F58A07",
                                        color: "#fff",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        minWidth: 20,
                                        height: 20,
                                        padding: "0 6px",
                                        borderRadius: 999,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {badgeLabel}
                                </span>
                            ) : collapsed && hasBadge ? (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: 6,
                                        right: 6,
                                        width: 8,
                                        height: 8,
                                        background: "#F58A07",
                                        borderRadius: "50%",
                                    }}
                                />
                            ) : null}
                        </button>
                    );
                })}
            </nav>

            <div
                style={{
                    padding: "10px 8px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onLogout}
                    title={collapsed && !isMobile ? "Logout" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: collapsed && !isMobile ? 0 : 10,
                        width: "100%",
                        padding:
                            collapsed && !isMobile ? "10px 0" : "9px 12px",
                        justifyContent:
                            collapsed && !isMobile ? "center" : "flex-start",
                        borderRadius: 12,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        color: "rgba(239,68,68,0.6)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                        e.currentTarget.style.color = "#EF4444";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(239,68,68,0.6)";
                    }}
                >
                    <span style={{ flexShrink: 0, display: "flex" }}>
                        <Icon d={ic.logout} size={18} />
                    </span>
                    {(!collapsed || isMobile) && (
                        <span
                            style={{
                                fontSize: 13,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Logout
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
