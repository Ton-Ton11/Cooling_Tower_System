import { useState } from "react";
import RoleShell from "../../Layouts/RoleShell";
import CustomerOverview from "./Overview";
import BookingWizard from "./BookingWizard";
import MyBookings from "./MyBookings";
import ServiceHistory from "./ServiceHistory";
import Complaints from "./Complaints";
import Announcements from "../Shared/Announcements";
import { CUSTOMER_ENDPOINTS } from "../../utils/superAdmin";

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    book: "M12 4v16m8-8H4",
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    history: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    complaints: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "book", label: "Book a Service", icon: ic.book },
    { id: "bookings", label: "My Bookings", icon: ic.bookings },
    { id: "history", label: "Service History", icon: ic.history },
    { id: "complaints", label: "Support & Complaints", icon: ic.complaints },
    { id: "announcements", label: "Announcements", icon: ic.announcements },
];

export default function CustomerDashboard() {
    const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);

    const buildPageComponents = ({
        addToast,
        handleDataChanged,
        dashboardData,
        dashboardLoading,
        onNavigate,
        refreshDashboardData,
    }) => ({
        dashboard: (
            <CustomerOverview
                onNavigate={onNavigate}
                dashboardData={dashboardData}
                isLoading={dashboardLoading}
                onSelectServiceToBook={(serviceId) => setSelectedServiceForBooking(serviceId)}
            />
        ),
        book: (
            <BookingWizard
                dashboardData={dashboardData}
                addToast={addToast}
                initialServiceId={selectedServiceForBooking}
                onBookingCreated={(newBookingId) => {
                    handleDataChanged();
                    onNavigate("bookings");
                }}
            />
        ),
        bookings: (
            <MyBookings
                addToast={addToast}
                onNavigate={onNavigate}
                defaultTab="Pending"
            />
        ),
        history: (
            <ServiceHistory
                addToast={addToast}
            />
        ),
        complaints: (
            <Complaints
                addToast={addToast}
            />
        ),
        announcements: (
            <Announcements
                addToast={addToast}
                onDataChanged={handleDataChanged}
                endpoints={CUSTOMER_ENDPOINTS}
                readOnly={true}
            />
        ),
    });

    return (
        <RoleShell
            navItems={navItems}
            buildPageComponents={buildPageComponents}
            dashboardEndpoint={CUSTOMER_ENDPOINTS.dashboard}
            defaultPage="dashboard"
        />
    );
}