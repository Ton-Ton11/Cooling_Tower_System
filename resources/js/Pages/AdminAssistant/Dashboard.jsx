import RoleShell from '../../Layouts/RoleShell';
import Overview from './Overview';
import StaffAccounts from '../Shared/StaffAccounts';
import AcUnits from '../Shared/AcUnits';
import SalesRecords from '../Shared/SalesRecords';
import Announcements from '../Shared/Announcements';
import { ADMIN_ASSISTANT_ENDPOINTS } from '../../utils/superAdmin';

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    staff: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    acunits: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    sales: "M18 20V10 M12 20V4 M6 20v-6",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "staff", label: "Staff Accounts", icon: ic.staff },
    { id: "acunits", label: "AC Units Inventory", icon: ic.acunits },
    { id: "sales", label: "Sales & Records", icon: ic.sales },
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
        staff: (
            <StaffAccounts
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
            />
        ),
        acunits: (
            <AcUnits
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
            />
        ),
        sales: (
            <SalesRecords
                addToast={addToast}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
            />
        ),
        announcements: (
            <Announcements
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
            />
        ),
    });

    return (
        <RoleShell
            navItems={navItems}
            buildPageComponents={buildPageComponents}
            dashboardEndpoint={ADMIN_ASSISTANT_ENDPOINTS.dashboard}
            defaultPage="dashboard"
        />
    );
}
