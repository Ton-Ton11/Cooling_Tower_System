import RoleShell from '../../Layouts/RoleShell';
import Overview from './Overview';
import Checklists from './Checklists';
import MaterialsTools from '../Shared/MaterialsTools';
import Announcements from '../Shared/Announcements';
import { TOOLS_MAN_ENDPOINTS } from '../../utils/superAdmin';

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    checklists: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    materials: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "checklists", label: "Checklists & Dispatches", icon: ic.checklists },
    { id: "materials", label: "Materials & Tools", icon: ic.materials },
    { id: "announcements", label: "Announcements", icon: ic.announcements },
];

export default function Dashboard() {
    const buildPageComponents = ({ addToast, handleDataChanged, dashboardData, dashboardLoading, onNavigate, refreshDashboardData, currentUser }) => ({
        dashboard: (
            <Overview
                addToast={addToast}
                onNavigate={onNavigate}
                dashboardData={dashboardData}
                isLoading={dashboardLoading}
                onRefresh={() => refreshDashboardData(true)}
            />
        ),
        checklists: (
            <Checklists
                addToast={addToast}
                onDataChanged={handleDataChanged}
            />
        ),
        materials: (
            <MaterialsTools
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={TOOLS_MAN_ENDPOINTS}
                currentUser={currentUser}
            />
        ),
        announcements: (
            <Announcements
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={TOOLS_MAN_ENDPOINTS}
            />
        ),
    });

    return (
        <RoleShell
            navItems={navItems}
            buildPageComponents={buildPageComponents}
            dashboardEndpoint={TOOLS_MAN_ENDPOINTS.dashboard}
            defaultPage="dashboard"
        />
    );
}
