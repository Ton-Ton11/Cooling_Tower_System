import RoleShell from '../../Layouts/RoleShell';
import Overview from './Overview';
import Bookings from '../Shared/Bookings';
import ServiceCatalog from '../Shared/ServiceCatalog';
import Announcements from '../Shared/Announcements';
import Performance from '../Shared/Performance';
import { MANAGER_ENDPOINTS } from '../../utils/superAdmin';

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    catalog: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    performance: "M22 12h-4l-3 9L9 3l-3 9H2",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "bookings", label: "Bookings", icon: ic.bookings },
    { id: "catalog", label: "Services & Catalog", icon: ic.catalog },
    { id: "performance", label: "Performance", icon: ic.performance },
    { id: "announcements", label: "Announcements", icon: ic.announcements },
];

export default function Dashboard() {
    const buildPageComponents = ({ addToast, handleDataChanged, dashboardData, dashboardLoading, onNavigate, refreshDashboardData }) => ({
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
            <Bookings
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={MANAGER_ENDPOINTS}
            />
        ),
        catalog: (
            <ServiceCatalog
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={MANAGER_ENDPOINTS}
            />
        ),
        performance: (
            <Performance
                addToast={addToast}
                endpoints={MANAGER_ENDPOINTS}
            />
        ),
        announcements: (
            <Announcements
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={MANAGER_ENDPOINTS}
            />
        ),
    });

    return (
        <RoleShell
            navItems={navItems}
            buildPageComponents={buildPageComponents}
            dashboardEndpoint={MANAGER_ENDPOINTS.dashboard}
            defaultPage="dashboard"
        />
    );
}
