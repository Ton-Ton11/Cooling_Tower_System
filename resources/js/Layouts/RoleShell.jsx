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
import CustomerSupportChatWidget from "../Components/CustomerSupportChatWidget";
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
const reportProblemIcon = "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
const chatSupportIcon = "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";

// ── Role-aware Sidebar (inline, corporate dark navy) ─────────────────────────
function RoleSidebar({ navItems, activePage, onNavigate, collapsed, onLogout, badges = {}, isMobile, mobileOpen, onMobileClose, isCustomer = false }) {
    const sidebarStyle = isMobile
        ? { width: 260, height: "100vh", position: "fixed", top: 0, left: 0, background: "#10213F", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, zIndex: 40, transform: mobileOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.22s ease", borderRight: "1px solid rgba(255,255,255,0.08)" }
        : { width: collapsed ? 72 : 252, minHeight: "100vh", background: "#10213F", display: "flex", flexDirection: "column", transition: "width 0.22s ease", overflow: "hidden", flexShrink: 0, zIndex: 10, borderRight: "1px solid rgba(255,255,255,0.08)" };

    const renderUtilityBtn = (id, label, iconPath, isTargetActive) => (
        <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                padding: "9px 12px",
                borderRadius: 10,
                border: "none",
                background: isTargetActive ? "#2563EB" : "transparent",
                color: isTargetActive ? "#FFFFFF" : "rgba(255,255,255,0.75)",
                fontWeight: isTargetActive ? 600 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "background-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
                if (!isTargetActive) {
                    e.currentTarget.style.color = "#FFFFFF";
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }
            }}
            onMouseLeave={(e) => {
                if (!isTargetActive) {
                    e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                    e.currentTarget.style.background = "transparent";
                }
            }}
        >
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, color: isTargetActive ? "#FFFFFF" : "#93C5FD" }}>
                <Icon d={iconPath} size={17} />
            </span>
            <span>{label}</span>
        </button>
    );

    return (
        <aside style={sidebarStyle}>
            {/* Logo Brand Container */}
            <div style={{ padding: collapsed && !isMobile ? "16px 14px" : "16px 18px", display: "flex", alignItems: "center", justifyContent: collapsed && !isMobile ? "center" : "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: 68, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, overflow: "hidden" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, flexShrink: 0 }}>
                        <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 6 }} />
                    </div>
                    {(!collapsed || isMobile) && (
                        <div style={{ overflow: "hidden" }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>Cooling Tower</p>
                            <p style={{ fontSize: 11, color: "#93C5FD", fontWeight: 500, whiteSpace: "nowrap", lineHeight: 1.3, margin: "2px 0 0" }}>Airconditioning Services</p>
                        </div>
                    )}
                </div>
                {isMobile && (
                    <button onClick={onMobileClose} aria-label="Close navigation" style={{ width: 32, height: 32, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Icon d={closeIcon} size={16} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="sidebar-scrollbar" style={{ flex: 1, padding: "12px 10px", overflowY: "auto", overflowX: "hidden" }}>
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
                                gap: collapsed && !isMobile ? 0 : 12,
                                width: "100%",
                                padding: collapsed && !isMobile ? "10px 0" : "10px 12px",
                                justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                                borderRadius: 10,
                                border: "none",
                                background: isActive ? "#2563EB" : "transparent",
                                cursor: "pointer",
                                transition: "background-color 0.15s ease, color 0.15s ease",
                                marginBottom: 4,
                                position: "relative",
                                color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.80)",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color = "#FFFFFF";
                                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color = "rgba(255,255,255,0.80)";
                                    e.currentTarget.style.background = "transparent";
                                }
                            }}
                        >
                            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.78)" }}>
                                <Icon d={item.icon} size={18} />
                            </span>
                            {(!collapsed || isMobile) && (
                                <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500, flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {item.label}
                                </span>
                            )}
                            {(!collapsed || isMobile) && hasBadge ? (
                                <span style={{ flexShrink: 0, background: isActive ? "#FFFFFF" : "#D97706", color: isActive ? "#2563EB" : "#FFFFFF", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {badgeLabel}
                                </span>
                            ) : collapsed && hasBadge ? (
                                <span style={{ position: "absolute", top: 7, right: 10, width: 7, height: 7, background: "#F59E0B", borderRadius: "50%" }} />
                            ) : null}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Utilities (Shortcuts & Help) */}
            {(!collapsed || isMobile) && (
                <div style={{ padding: "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 2 }}>
                    {isCustomer && renderUtilityBtn("book", "Quick Book Service", calendarPlusIcon, false)}
                    {isCustomer && renderUtilityBtn("complaints", "Report Problem", reportProblemIcon, activePage === "complaints")}
                    {renderUtilityBtn(
                        isCustomer ? "help_support" : "complaints",
                        "Help & Support",
                        chatSupportIcon,
                        isCustomer && activePage === "help_support"
                    )}
                </div>
            )}
            {collapsed && !isMobile && isCustomer && (
                <div style={{ padding: "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <button
                        onClick={() => onNavigate("book")}
                        title="Quick Book Service"
                        style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: "transparent", color: "#93C5FD", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                        <Icon d={calendarPlusIcon} size={17} />
                    </button>
                    <button
                        onClick={() => onNavigate("complaints")}
                        title="Report Problem"
                        style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: activePage === "complaints" ? "#2563EB" : "transparent", color: activePage === "complaints" ? "#FFFFFF" : "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                        <Icon d={reportProblemIcon} size={17} />
                    </button>
                    <button
                        onClick={() => onNavigate("help_support")}
                        title="Help & Support"
                        style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: activePage === "help_support" ? "#2563EB" : "transparent", color: activePage === "help_support" ? "#FFFFFF" : "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
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
        reports:       (dashboardData?.stats?.pending_reports ?? 0) + (dashboardData?.stats?.unread_customer_chat ?? 0),
    }), [dashboardData]);

    const isCustomerRole = Number(currentUser?.role_id) === 6;

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
            const fallbackLabel =
                activePage === "complaints"
                    ? "Report Problem"
                    : activePage === "help_support"
                    ? "Help & Support"
                    : pageItem?.label;
            if (fallbackLabel) {
                recordUserActivity(currentUser?.id || currentUser?.user_id, {
                    pageId: activePage,
                    title: fallbackLabel,
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
                isCustomer={isCustomerRole}
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
                <main
                    ref={mainScrollRef}
                    className="role-shell-main"
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: isMobile ? 12 : 24,
                        paddingBottom: isCustomerRole ? (isMobile ? 36 : 42) : (isMobile ? 12 : 24),
                    }}
                >
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

            {isCustomerRole && (
                <CustomerSupportChatWidget
                    addToast={addToast}
                    onNavigate={onNavigate}
                />
            )}
        </div>
    );
}

export default RoleShell;
