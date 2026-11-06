/**
 * RoleShell.jsx
 * Generic SPA shell for non-super-admin roles.
 * Accepts a navItems array and a pageComponents map so each role
 * can be configured without duplicating layout logic.
 */
import { router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "../Components/Modal";
import Toast from "../Components/Toast";
import Topbar from "./Topbar";
import UserProfileSettings from "../Pages/Shared/UserProfileSettings";
import UserHistory from "../Pages/Shared/UserHistory";
import { recordUserActivity } from "../utils/userActivityHistory";
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
const profileIcon = "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z";
const historyIcon = "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
const calendarPlusIcon = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm7-7v6m-3-3h6";
const chatSupportIcon = "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";

// ── Role-aware Sidebar (inline, not shared with SuperAdmin Sidebar) ───────────
function RoleSidebar({ navItems, activePage, onNavigate, collapsed, onLogout, badges = {}, isMobile, mobileOpen, onMobileClose }) {
    const sidebarStyle = isMobile
        ? { width: 268, height: "100vh", position: "fixed", top: 0, left: 0, background: "#101D38", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, zIndex: 50, transform: mobileOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: mobileOpen ? "0 20px 40px rgba(0,0,0,0.4)" : "none" }
        : { width: collapsed ? 76 : 260, minHeight: "100vh", background: "#101D38", display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden", flexShrink: 0, zIndex: 20, borderRight: "1px solid rgba(255, 255, 255, 0.06)" };

    return (
        <aside style={sidebarStyle} className={`ct-sidebar ${collapsed && !isMobile ? "is-collapsed" : ""}`}>
            {/* Logo Brand Container */}
            <div style={{ padding: collapsed && !isMobile ? "16px 12px" : "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.07)", minHeight: 70, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 3, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                        <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 7 }} />
                    </div>
                    {(!collapsed || isMobile) && (
                        <div style={{ overflow: "hidden" }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>Cooling Tower</p>
                            <p style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, whiteSpace: "nowrap", lineHeight: 1.3, margin: "2px 0 0" }}>Airconditioning Services</p>
                        </div>
                    )}
                </div>
                {isMobile && (
                    <button onClick={onMobileClose} style={{ width: 30, height: 30, border: "none", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Icon d={closeIcon} size={15} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="sidebar-scrollbar" style={{ flex: 1, padding: collapsed && !isMobile ? "12px 8px" : "16px 12px", overflowY: "auto", overflowX: "hidden" }}>
                {(!collapsed || isMobile) && (
                    <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(148, 163, 184, 0.6)", margin: "0 0 8px 10px", whiteSpace: "nowrap" }}>
                        Navigation
                    </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {navItems.map((item) => {
                        const isActive =
                            activePage === item.id ||
                            (item.id === "bookings" &&
                                (activePage === "ocular_results" ||
                                    activePage === "ocular_payment" ||
                                    activePage === "reschedule"));
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
                                    padding: collapsed && !isMobile ? "10px 0" : "9px 12px",
                                    justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                                    borderRadius: 10,
                                    border: "none",
                                    background: isActive ? "#2563EB" : "transparent",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    position: "relative",
                                    color: isActive ? "#FFFFFF" : "rgba(226, 232, 240, 0.78)",
                                    boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = "#FFFFFF";
                                        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = "rgba(226, 232, 240, 0.78)";
                                        e.currentTarget.style.background = "transparent";
                                    }
                                }}
                            >
                                <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? "#FFFFFF" : "inherit" }}>
                                    <Icon d={item.icon} size={18} />
                                </span>
                                {(!collapsed || isMobile) && (
                                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {item.label}
                                    </span>
                                )}
                                {(!collapsed || isMobile) && hasBadge ? (
                                    <span style={{ flexShrink: 0, background: isActive ? "#FFFFFF" : "#F59E0B", color: isActive ? "#2563EB" : "#FFFFFF", fontSize: 10.5, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {badgeLabel}
                                    </span>
                                ) : collapsed && hasBadge ? (
                                    <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: "#F59E0B", borderRadius: "50%", boxShadow: "0 0 0 2px #101D38" }} />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Utilities (Shortcuts & Help) */}
            {(!collapsed || isMobile) ? (
                <div style={{ padding: "10px 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
                    <button
                        onClick={() => onNavigate("book")}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(226,232,240,0.72)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(226,232,240,0.72)"; e.currentTarget.style.background = "transparent"; }}
                    >
                        <span style={{ flexShrink: 0, display: "flex", color: "#60A5FA" }}><Icon d={calendarPlusIcon} size={16} /></span>
                        <span>Quick Book Service</span>
                    </button>
                    <button
                        onClick={() => onNavigate("complaints")}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(226,232,240,0.72)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(226,232,240,0.72)"; e.currentTarget.style.background = "transparent"; }}
                    >
                        <span style={{ flexShrink: 0, display: "flex", color: "#94A3B8" }}><Icon d={chatSupportIcon} size={16} /></span>
                        <span>Help & Support</span>
                    </button>
                </div>
            ) : (
                <div style={{ padding: "10px 8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", flexShrink: 0 }}>
                    <button
                        onClick={() => onNavigate("book")}
                        title="Quick Book Service"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 8, border: "none", background: "transparent", color: "#60A5FA", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <Icon d={calendarPlusIcon} size={17} />
                    </button>
                    <button
                        onClick={() => onNavigate("complaints")}
                        title="Help & Support"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 8, border: "none", background: "transparent", color: "#94A3B8", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <Icon d={chatSupportIcon} size={17} />
                    </button>
                </div>
            )}
        </aside>
    );
}

// ── Main Shell ───────────────────────────────────────────────────────────────
function RoleShell({ navItems, buildPageComponents, dashboardEndpoint, defaultPage = "dashboard" }) {
    const pageProps = usePage()?.props || {};
    const currentUser = pageProps.auth?.user || null;
    const sessionPageKey = useMemo(() => {
        const uid = currentUser?.id || currentUser?.user_id || "guest";
        const path = typeof window !== "undefined" ? window.location.pathname : "";
        return `ct_active_page_u${uid}_${path}`;
    }, [currentUser]);
    const [activePage, setActivePage] = useState(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = sessionStorage.getItem(sessionPageKey);
                if (saved) return saved;
            } catch {
                // ignore storage access errors
            }
        }
        return defaultPage;
    });
    const [navMeta, setNavMeta]                 = useState(null);
    const [navNonce, setNavNonce]               = useState(0);
    const [collapsed, setCollapsed]             = useState(false);
    const [showLogout, setShowLogout]           = useState(false);
    const [toasts, setToasts]                   = useState([]);
    const [isMobile, setIsMobile]               = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [dashboardData, setDashboardData]     = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const mainScrollRef                         = useRef(null);

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
        setToasts((prev) => {
            // Deduplicate: replace identical recent message or append if unique
            const filtered = prev.filter(
                (t) => !(t.message === message && t.variant === variant),
            );
            return [...filtered, { id, message, variant }];
        });
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

    const onNavigate = useCallback((page, meta = null) => {
        setNavMeta(meta || null);
        setActivePage(page);
        setNavNonce((n) => n + 1);
        if (typeof window !== "undefined") {
            try {
                sessionStorage.setItem(sessionPageKey, page);
            } catch {
                // ignore storage access errors
            }
        }
        if (isMobile) setMobileSidebarOpen(false);
    }, [isMobile, sessionPageKey]);

    const handleDataChanged = useCallback(() => { refreshDashboardData(false, false); }, [refreshDashboardData]);

    const handleLogout = useCallback(() => {
        setShowLogout(false);
        if (typeof window !== "undefined") {
            try {
                sessionStorage.removeItem(sessionPageKey);
            } catch {
                // ignore storage access errors
            }
        }
        router.post("/logout", {}, { preserveScroll: true, onError: () => addToast("Unable to log out right now.", "error") });
    }, [addToast, sessionPageKey]);

    const sidebarBadges = useMemo(() => ({
        bookings:      dashboardData?.stats?.pending_bookings ?? 0,
        announcements: dashboardData?.stats?.announcements ?? 0,
    }), [dashboardData]);

    const effectiveNavItems = useMemo(() => {
        let items = [...navItems];
        if (!items.some((item) => item.id === "history")) {
            items.push({ id: "history", label: "History", icon: historyIcon });
        }
        if (!items.some((item) => item.id === "profile")) {
            items.push({ id: "profile", label: "My Profile", icon: profileIcon });
        }
        return items;
    }, [navItems]);

    const pageComponents = useMemo(
        () => ({
            ...buildPageComponents({
                addToast,
                handleDataChanged,
                dashboardData,
                dashboardLoading,
                onNavigate,
                refreshDashboardData,
                currentUser,
                navMeta,
                navNonce,
            }),
            history: (
                <UserHistory
                    onNavigate={onNavigate}
                    currentUser={currentUser}
                    addToast={addToast}
                />
            ),
            profile: <UserProfileSettings addToast={addToast} />,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [addToast, handleDataChanged, dashboardData, dashboardLoading, onNavigate, refreshDashboardData, currentUser, navMeta, navNonce],
    );

    useEffect(() => {
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        if (activePage && activePage !== "history") {
            const pageItem = effectiveNavItems.find((n) => n.id === activePage);
            if (pageItem) {
                recordUserActivity(currentUser?.id || currentUser?.user_id, {
                    pageId: activePage,
                    title: pageItem.label,
                    icon: activePage,
                });
            }
        }
    }, [activePage, effectiveNavItems, currentUser]);

    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
            <RoleSidebar
                navItems={effectiveNavItems}
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
                    onNavigate={onNavigate}
                    addToast={addToast}
                    onLogout={() => setShowLogout(true)}
                    onToggleSidebar={() => {
                        if (isMobile) { setMobileSidebarOpen((o) => !o); return; }
                        setCollapsed((c) => !c);
                    }}
                />
                <main ref={mainScrollRef} className="role-shell-main" style={{ flex: 1, overflow: "auto", padding: isMobile ? 12 : 24 }}>
                    {pageComponents[activePage] ?? pageComponents[defaultPage]}
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
