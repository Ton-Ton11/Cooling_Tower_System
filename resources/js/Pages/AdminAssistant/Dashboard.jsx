import RoleShell from '../../Layouts/RoleShell';
import Overview from './Overview';
import StaffAccounts from '../Shared/StaffAccounts';
import AcUnits from '../Shared/AcUnits';
import MaterialsTools from '../Shared/MaterialsTools';
import SalesRecords from '../Shared/SalesRecords';
import Documents from '../Shared/Documents';
import Announcements from '../Shared/Announcements';
import OcularInspections from './OcularInspections';
import ItemOrders from './ItemOrders';
import { ADMIN_ASSISTANT_ENDPOINTS } from '../../utils/superAdmin';

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    item_orders: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    ocular: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    staff: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    acunits: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
    materials: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    sales: "M18 20V10 M12 20V4 M6 20v-6",
    documents: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "item_orders", label: "Item Orders", icon: ic.item_orders },
    { id: "ocular", label: "Ocular Inspections", icon: ic.ocular },
    { id: "staff", label: "Staff Accounts", icon: ic.staff },
    { id: "acunits", label: "AC Units Inventory", icon: ic.acunits },
    { id: "materials", label: "For Sale Catalog", icon: ic.materials },
    { id: "sales", label: "Sales & Records", icon: ic.sales },
    { id: "documents", label: "Documents / Forms", icon: ic.documents },
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
        ocular: (
            <OcularInspections
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
            />
        ),
        item_orders: (
            <ItemOrders
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
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
        materials: (
            <MaterialsTools
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
                currentUser={currentUser}
            />
        ),
        sales: (
            <SalesRecords
                addToast={addToast}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
            />
        ),
        documents: (
            <Documents
                addToast={addToast}
                endpoints={ADMIN_ASSISTANT_ENDPOINTS}
                currentUser={currentUser}
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
