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
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    staff: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    materials: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    checklists: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    acunits: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    sales: "M18 20V10 M12 20V4 M6 20v-6",
    documents: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    logs: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
    performance: "M22 12h-4l-3 9L9 3l-3 9H2",
    catalog: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    teams: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    certificates: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    more: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z",
};

const navGroups = [
    {
        title: "Main Menu",
        items: [
            { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
            { id: "bookings", label: "Bookings", icon: ic.bookings },
            { id: "catalog", label: "Services & Catalog", icon: ic.catalog },
            { id: "teams", label: "Technician Teams", icon: ic.teams },
            { id: "certificates", label: "Certificate Monitoring", icon: ic.certificates },
        ],
    },
    {
        title: "Operations & Inventory",
        items: [
            { id: "staff", label: "Staff Accounts", icon: ic.staff },
            { id: "materials", label: "Materials & Tools", icon: ic.materials },
            { id: "checklists", label: "Checklists & Dispatches", icon: ic.checklists },
            { id: "acunits", label: "AC Units Inventory", icon: ic.acunits },
        ],
    },
    {
        title: "Records & Insights",
        items: [
            { id: "sales", label: "Sales & Records", icon: ic.sales },
            { id: "documents", label: "Documents / Forms", icon: ic.documents },
            { id: "announcements", label: "Announcements", icon: ic.announcements },
            { id: "logs", label: "Activity Logs", icon: ic.logs },
            { id: "performance", label: "Performance", icon: ic.performance },
            { id: "history", label: "History", icon: ic.history },
        ],
    },
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
              width: 268,
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              background: "#101D38",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
              zIndex: 50,
              transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: mobileOpen ? "0 20px 40px rgba(0,0,0,0.4)" : "none",
          }
        : {
              width: collapsed ? 76 : 260,
              minHeight: "100vh",
              background: "#101D38",
              display: "flex",
              flexDirection: "column",
              transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              overflow: "hidden",
              flexShrink: 0,
              zIndex: 20,
              borderRight: "1px solid rgba(255, 255, 255, 0.06)",
          };

    return (
        <aside style={sidebarStyle} className={`ct-sidebar ${collapsed && !isMobile ? "is-collapsed" : ""}`}>
            {/* Top Brand / Logo */}
            <div
                style={{
                    padding: collapsed && !isMobile ? "16px 12px" : "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
                    minHeight: 70,
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 3,
                            flexShrink: 0,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                        }}
                    >
                        <img
                            src={logo}
                            alt="Cooling Tower Logo"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                borderRadius: 7,
                            }}
                        />
                    </div>
                    {(!collapsed || isMobile) && (
                        <div style={{ overflow: "hidden" }}>
                            <p
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "#FFFFFF",
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.2,
                                    margin: 0,
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                Cooling Tower
                            </p>
                            <p
                                style={{
                                    fontSize: 11,
                                    color: "#94A3B8",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.3,
                                    margin: "2px 0 0",
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
                            width: 30,
                            height: 30,
                            border: "none",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.08)",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        <Icon d={ic.close} size={15} />
                    </button>
                )}
            </div>

            {/* Navigation Groups */}
            <nav
                className="sidebar-scrollbar"
                style={{
                    flex: 1,
                    padding: collapsed && !isMobile ? "12px 8px" : "16px 12px",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {navGroups.map((group, gIdx) => (
                    <div key={group.title} style={{ marginBottom: gIdx === navGroups.length - 1 ? 0 : 16 }}>
                        {(!collapsed || isMobile) && (
                            <p
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    color: "rgba(148, 163, 184, 0.6)",
                                    margin: "0 0 6px 10px",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {group.title}
                            </p>
                        )}
                        {collapsed && !isMobile && gIdx > 0 && (
                            <div
                                style={{
                                    height: 1,
                                    background: "rgba(255, 255, 255, 0.08)",
                                    margin: "10px 4px",
                                }}
                            />
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {group.items.map((item) => {
                                const isActive = activePage === item.id;
                                const badgeCount = Number(badges[item.id] ?? 0);
                                const hasBadge = Number.isFinite(badgeCount) && badgeCount > 0;
                                const badgeLabel = badgeCount > 99 ? "99+" : badgeCount;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id)}
                                        title={collapsed && !isMobile ? item.label : undefined}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: collapsed && !isMobile ? 0 : 11,
                                            width: "100%",
                                            padding:
                                                collapsed && !isMobile
                                                    ? "10px 0"
                                                    : "9px 12px",
                                            justifyContent:
                                                collapsed && !isMobile
                                                    ? "center"
                                                    : "flex-start",
                                            borderRadius: 10,
                                            border: "none",
                                            background: isActive ? "#2563EB" : "transparent",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            position: "relative",
                                            color: isActive ? "#FFFFFF" : "rgba(226, 232, 240, 0.78)",
                                            boxShadow: isActive
                                                ? "0 4px 12px rgba(37, 99, 235, 0.35)"
                                                : "none",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = "#FFFFFF";
                                                e.currentTarget.style.background =
                                                    "rgba(255, 255, 255, 0.07)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.color =
                                                    "rgba(226, 232, 240, 0.78)";
                                                e.currentTarget.style.background =
                                                    "transparent";
                                            }
                                        }}
                                    >
                                        <span
                                            style={{
                                                flexShrink: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: isActive ? "#FFFFFF" : "inherit",
                                            }}
                                        >
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
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {item.label}
                                            </span>
                                        )}
                                        {(!collapsed || isMobile) && hasBadge ? (
                                            <span
                                                style={{
                                                    flexShrink: 0,
                                                    background: isActive ? "#FFFFFF" : "#F59E0B",
                                                    color: isActive ? "#2563EB" : "#FFFFFF",
                                                    fontSize: 10.5,
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
                                                    background: "#F59E0B",
                                                    borderRadius: "50%",
                                                    boxShadow: "0 0 0 2px #101D38",
                                                }}
                                            />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
