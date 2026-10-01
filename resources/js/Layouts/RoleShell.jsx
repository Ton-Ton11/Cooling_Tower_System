/**
 * RoleShell.jsx
 * Generic SPA shell for non-super-admin roles.
 * Accepts a navItems array and a pageComponents map so each role
 * can be configured without duplicating layout logic.
 */
import { router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../Components/Modal";
import Toast from "../Components/Toast";
import Topbar from "./Topbar";
import { extractErrorMessage } from "../utils/superAdmin";
import logo from "../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

let toastIdCounter = 1;

// ── Shared icon renderer ─────────────────────────────────────────────────────
const Icon = ({ d, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const logoutIcon = "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9";
const menuIcon   = "M3 6h18 M3 12h18 M3 18h18";
const closeIcon  = "M18 6L6 18 M6 6l12 12";
const chevL      = "M15 18l-6-6 6-6";
const chevR      = "M9 18l6-6-6-6";
const calendarPlusIcon = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm7-7v6m-3-3h6";
const chatSupportIcon = "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";

// ── Role-aware Sidebar (inline, not shared with SuperAdmin Sidebar) ───────────
function RoleSidebar({ navItems, activePage, onNavigate, collapsed, onLogout, badges = {}, isMobile, mobileOpen, onMobileClose }) {
    const sidebarStyle = isMobile
        ? { width: 264, height: "100vh", position: "fixed", top: 0, left: 0, background: "#0E1A33", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, zIndex: 20, transform: mobileOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease" }
        : { width: collapsed ? 72 : 248, minHeight: "100vh", background: "#0E1A33", display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden", flexShrink: 0, zIndex: 10 };

    return (
        <aside style={sidebarStyle}>
            {/* Logo Brand Container */}
            <div style={{ padding: collapsed && !isMobile ? "18px 14px" : "18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: 74, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, overflow: "hidden" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, flexShrink: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
                        <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
                    </div>
                    {(!collapsed || isMobile) && (
                        <div style={{ overflow: "hidden" }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>Cooling Tower</p>
                            <p style={{ fontSize: 10, color: "#38BDF8", fontWeight: 600, whiteSpace: "nowrap", lineHeight: 1.3, margin: "2px 0 0" }}>Airconditioning Services</p>
                        </div>
                    )}
                </div>
                {isMobile && (
                    <button onClick={onMobileClose} style={{ width: 32, height: 32, border: "none", borderRadius: 10, background: "rgba(255,255,255,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Icon d={closeIcon} size={16} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto", overflowX: "hidden" }}>
                {navItems.map((item) => {
                    const isActive    = activePage === item.id;
                    const badgeCount  = Number(badges[item.id] ?? 0);
                    const hasBadge    = Number.isFinite(badgeCount) && badgeCount > 0;
                    const badgeLabel  = badgeCount > 99 ? "99+" : badgeCount;

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
                                padding: collapsed && !isMobile ? "11px 0" : "11px 14px",
                                justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                                borderRadius: 14,
                                border: "none",
                                background: isActive ? "#FFFFFF" : "transparent",
                                cursor: "pointer",
                                transition: "all 0.18s ease",
                                marginBottom: 4,
                                position: "relative",
                                color: isActive ? "#0E1A33" : "rgba(255,255,255,0.72)",
                                boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color = "#FFFFFF";
                                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color = "rgba(255,255,255,0.72)";
                                    e.currentTarget.style.background = "transparent";
                                }
                            }}
                        >
                            <span style={{ flexShrink: 0, display: "flex", color: isActive ? "#1D4ED8" : "inherit" }}>
                                <Icon d={item.icon} size={19} />
                            </span>
                            {(!collapsed || isMobile) && (
                                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>
                                    {item.label}
                                </span>
                            )}
                            {(!collapsed || isMobile) && hasBadge ? (
                                <span style={{ flexShrink: 0, background: isActive ? "#EF4444" : "#F58A07", color: "#fff", fontSize: 10, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {badgeLabel}
                                </span>
                            ) : collapsed && hasBadge ? (
                                <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: "#F58A07", borderRadius: "50%" }} />
                            ) : null}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Utilities (Shortcuts & Help) */}
            {(!collapsed || isMobile) && (
                <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 2 }}>
                    <button
                        onClick={() => onNavigate("book")}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 14px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "transparent"; }}
                    >
                        <span style={{ flexShrink: 0, display: "flex", color: "#60A5FA" }}><Icon d={calendarPlusIcon} size={15} /></span>
                        <span>Quick Book Service</span>
                    </button>
                    <button
                        onClick={() => onNavigate("complaints")}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 14px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "transparent"; }}
                    >
                        <span style={{ flexShrink: 0, display: "flex", color: "#94A3B8" }}><Icon d={chatSupportIcon} size={15} /></span>
                        <span>Help & Support</span>
                    </button>
                </div>
            )}

            {/* Logout */}
            <div style={{ padding: "10px 10px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                <button
                    onClick={onLogout}
                    title={collapsed && !isMobile ? "Logout" : undefined}
                    style={{ display: "flex", alignItems: "center", gap: collapsed && !isMobile ? 0 : 10, width: "100%", padding: collapsed && !isMobile ? "10px 0" : "9px 14px", justifyContent: collapsed && !isMobile ? "center" : "flex-start", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", transition: "all 0.15s", color: "rgba(239,68,68,0.7)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#EF4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,0.7)"; }}
                >
                    <span style={{ flexShrink: 0, display: "flex" }}><Icon d={logoutIcon} size={18} /></span>
                    {(!collapsed || isMobile) && <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Logout</span>}
                </button>
            </div>
        </aside>
    );
}

// ── Main Shell ───────────────────────────────────────────────────────────────
function RoleShell({ navItems, buildPageComponents, dashboardEndpoint, defaultPage = "dashboard" }) {
    const pageProps = usePage()?.props || {};
    const currentUser = pageProps.auth?.user || null;
    const [activePage, setActivePage]           = useState(defaultPage);
    const [collapsed, setCollapsed]             = useState(false);
    const [showLogout, setShowLogout]           = useState(false);
    const [toasts, setToasts]                   = useState([]);
    const [isMobile, setIsMobile]               = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [dashboardData, setDashboardData]     = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setMobileSidebarOpen(false);
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const addToast = useCallback((message, variant = "success") => {
        const id = toastIdCounter++;
        setToasts((prev) => [...prev, { id, message, variant }]);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const refreshDashboardData = useCallback(async (showLoader = true, notifyOnError = true) => {
        if (!dashboardEndpoint) { setDashboardLoading(false); return; }
        if (showLoader) setDashboardLoading(true);
        try {
            const { data } = await window.axios.get(dashboardEndpoint);
            setDashboardData(data);
        } catch (error) {
            if (notifyOnError) addToast(extractErrorMessage(error, "Unable to load dashboard overview."), "error");
        } finally {
            setDashboardLoading(false);
        }
    }, [addToast, dashboardEndpoint]);

    useEffect(() => { refreshDashboardData(true); }, [refreshDashboardData]);

    const onNavigate = useCallback((page) => {
        setActivePage(page);
        if (isMobile) setMobileSidebarOpen(false);
    }, [isMobile]);

    const handleDataChanged = useCallback(() => { refreshDashboardData(false, false); }, [refreshDashboardData]);

    const handleLogout = useCallback(() => {
        setShowLogout(false);
        router.post("/logout", {}, { preserveScroll: true, onError: () => addToast("Unable to log out right now.", "error") });
    }, [addToast]);

    const sidebarBadges = useMemo(() => ({
        bookings:      dashboardData?.stats?.pending_bookings ?? 0,
        announcements: dashboardData?.stats?.announcements ?? 0,
    }), [dashboardData]);

    const pageComponents = useMemo(
        () => buildPageComponents({ addToast, handleDataChanged, dashboardData, dashboardLoading, onNavigate, refreshDashboardData, currentUser }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [addToast, handleDataChanged, dashboardData, dashboardLoading, onNavigate, refreshDashboardData, currentUser],
    );

    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
            <RoleSidebar
                navItems={navItems}
                activePage={activePage}
                onNavigate={onNavigate}
                collapsed={isMobile ? false : collapsed}
                onLogout={() => setShowLogout(true)}
                badges={sidebarBadges}
                isMobile={isMobile}
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {isMobile && mobileSidebarOpen && (
                <div onClick={() => setMobileSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 19 }} />
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Topbar
                    collapsed={collapsed}
                    isMobile={isMobile}
                    onToggleSidebar={() => {
                        if (isMobile) { setMobileSidebarOpen((o) => !o); return; }
                        setCollapsed((c) => !c);
                    }}
                />
                <main style={{ flex: 1, overflow: "auto", padding: isMobile ? 12 : 24, background: "#F5F7FA" }}>
                    {pageComponents[activePage]}
                </main>
            </div>

            <Modal
                open={showLogout}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                confirmLabel="Yes, Logout"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleLogout}
                onCancel={() => setShowLogout(false)}
            />

            <Toast toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}

export default RoleShell;
