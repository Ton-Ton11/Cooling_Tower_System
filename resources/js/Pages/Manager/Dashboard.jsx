import RoleShell from '../../Layouts/RoleShell';
import Overview from './Overview';
import Bookings from '../Shared/Bookings';
import Announcements from '../Shared/Announcements';
import Performance from '../Shared/Performance';
import { MANAGER_ENDPOINTS } from '../../utils/superAdmin';

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
    performance: "M22 12h-4l-3 9L9 3l-3 9H2",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "bookings", label: "Bookings", icon: ic.bookings },
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
