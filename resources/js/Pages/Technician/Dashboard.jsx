import RoleShell from '../../Layouts/RoleShell';
import Overview from './Overview';
import Jobs from './Jobs';
import Tools from './Tools';
import Performance from './Performance';
import Announcements from '../Shared/Announcements';
import { TECHNICIAN_ENDPOINTS } from '../../utils/superAdmin';

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    bookings: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    tools: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    performance: "M22 12h-4l-3 9L9 3l-3 9H2",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "bookings", label: "My Jobs", icon: ic.bookings },
    { id: "tools", label: "My Tools", icon: ic.tools },
    { id: "performance", label: "My Performance", icon: ic.performance },
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
            <Jobs
                addToast={addToast}
                onDataChanged={handleDataChanged}
            />
        ),
        tools: (
            <Tools
                addToast={addToast}
            />
        ),
        performance: (
            <Performance
                addToast={addToast}
            />
        ),
        announcements: (
            <Announcements
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={TECHNICIAN_ENDPOINTS}
                readOnly={true}
            />
        ),
    });

    return (
        <RoleShell
            navItems={navItems}
            buildPageComponents={buildPageComponents}
            dashboardEndpoint={TECHNICIAN_ENDPOINTS.dashboard}
            defaultPage="dashboard"
        />
    );
}
