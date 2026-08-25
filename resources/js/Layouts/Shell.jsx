import { router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../Components/Modal";
import Toast from "../Components/Toast";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Overview from "../Pages/SuperAdmin/Overview";
import Bookings from "../Pages/Shared/Bookings";
import StaffAccounts from "../Pages/Shared/StaffAccounts";
import MaterialsTools from "../Pages/Shared/MaterialsTools";
import AcUnits from "../Pages/Shared/AcUnits";
import SalesRecords from "../Pages/Shared/SalesRecords";
import Documents from "../Pages/Shared/Documents";
import Announcements from "../Pages/Shared/Announcements";
import ActivityLogs from "../Pages/Shared/ActivityLogs";
import Performance from "../Pages/Shared/Performance";
import ServiceCatalog from "../Pages/Shared/ServiceCatalog";
import {
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
} from "../utils/superAdmin";

let toastIdCounter = 1;

function Shell() {
    const [activePage, setActivePage] = useState("dashboard");
    const [collapsed, setCollapsed] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setMobileSidebarOpen(false);
            }
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
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const refreshDashboardData = useCallback(
        async (showLoader = true, notifyOnError = true) => {
            if (showLoader) {
                setDashboardLoading(true);
            }

            try {
                const { data } = await window.axios.get(
                    SUPER_ADMIN_ENDPOINTS.dashboard,
                );
                setDashboardData(data);
            } catch (error) {
                if (notifyOnError) {
                    addToast(
                        extractErrorMessage(
                            error,
                            "Unable to load the dashboard overview.",
                        ),
                        "error",
                    );
                }
            } finally {
                setDashboardLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        refreshDashboardData(true);
    }, [refreshDashboardData]);

    const onNavigate = useCallback(
        (page) => {
            setActivePage(page);

            if (isMobile) {
                setMobileSidebarOpen(false);
            }
        },
        [isMobile],
    );

    const handleDataChanged = useCallback(() => {
        refreshDashboardData(false, false);
    }, [refreshDashboardData]);

    const handleLogout = useCallback(() => {
        setShowLogout(false);
        router.post(
            "/logout",
            {},
            {
                preserveScroll: true,
                onError: () =>
                    addToast("Unable to log out right now.", "error"),
            },
        );
    }, [addToast]);

    const sidebarBadges = useMemo(
        () => ({
            bookings: dashboardData?.stats?.pending_bookings ?? 0,
            announcements: dashboardData?.stats?.announcements ?? 0,
        }),
        [dashboardData],
    );

    const pageComponents = {
        dashboard: (
            <Overview
                addToast={addToast}
                onNavigate={onNavigate}
                dashboardData={dashboardData}
                isLoading={dashboardLoading}
                onRefresh={() => refreshDashboardData(true)}
            />
        ),
        bookings: (
            <Bookings addToast={addToast} onDataChanged={handleDataChanged} />
        ),
        catalog: (
            <ServiceCatalog
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={SUPER_ADMIN_ENDPOINTS}
            />
        ),
        staff: (
            <StaffAccounts
                addToast={addToast}
                onDataChanged={handleDataChanged}
            />
        ),
        materials: (
            <MaterialsTools
                addToast={addToast}
                onDataChanged={handleDataChanged}
            />
        ),
        acunits: (
            <AcUnits addToast={addToast} onDataChanged={handleDataChanged} />
        ),
        sales: <SalesRecords addToast={addToast} />,
        documents: <Documents addToast={addToast} />,
        announcements: (
            <Announcements
                addToast={addToast}
                onDataChanged={handleDataChanged}
            />
        ),
        logs: <ActivityLogs addToast={addToast} />,
        performance: <Performance addToast={addToast} />,
    };

    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <Sidebar
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
                <div
                    onClick={() => setMobileSidebarOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.45)",
                        zIndex: 19,
                    }}
                />
            )}

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <Topbar
                    collapsed={collapsed}
                    isMobile={isMobile}
                    onToggleSidebar={() => {
                        if (isMobile) {
                            setMobileSidebarOpen((open) => !open);
                            return;
                        }

                        setCollapsed((current) => !current);
                    }}
                />
                <main
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: isMobile ? 12 : 24,
                        background: "#F5F7FA",
                    }}
                >
                    {pageComponents[activePage]}
                </main>
            </div>

            <Modal
                open={showLogout}
                title="Confirm Logout"
                message="Are you sure you want to log out of the Super Admin dashboard?"
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

export default Shell;
