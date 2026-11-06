import { useState } from "react";
import RoleShell from "../../Layouts/RoleShell";
import CustomerOverview from "./Overview";
import BookingWizard from "./BookingWizard";
import MyBookings from "./MyBookings";
import ServiceHistory from "./ServiceHistory";
import WarrantyTracking from "./WarrantyTracking";
import Complaints from "./Complaints";
import OcularInspectionPage from "./OcularInspectionPage";
import ReschedulePage from "./ReschedulePage";
import Announcements from "../Shared/Announcements";
import { CUSTOMER_ENDPOINTS } from "../../utils/superAdmin";

const ic = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    book: "M12 4v16m8-8H4",
    bookings: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    history: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    warranty: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    complaints: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ic.dashboard },
    { id: "book", label: "Book a Service", icon: ic.book },
    { id: "bookings", label: "My Bookings", icon: ic.bookings },
    { id: "service_history", label: "Service History", icon: ic.history },
    { id: "warranty", label: "AC Unit Warranty Tracking", icon: ic.warranty },
    { id: "complaints", label: "Support & Complaints", icon: ic.complaints },
    { id: "announcements", label: "Announcements", icon: ic.announcements },
];

export default function CustomerDashboard() {
    const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);
    const [bookingInitialStep, setBookingInitialStep] = useState(1);
    const [bookingInitialUnits, setBookingInitialUnits] = useState(null);
    const [bookingInitialServiceDetails, setBookingInitialServiceDetails] = useState(null);
    const [ocularBooking, setOcularBooking] = useState(null);
    const [ocularSelectedRec, setOcularSelectedRec] = useState(null);
    const [rescheduleBooking, setRescheduleBooking] = useState(null);

    const handleRescheduleBooking = (booking, onNavigate) => {
        if (booking) {
            setRescheduleBooking(booking);
        }
        if (onNavigate) {
            onNavigate("reschedule", {
                bookingId: booking?.booking_id || null,
            });
        }
    };

    const handleViewOcularResults = (booking, onNavigate) => {
        if (booking) {
            setOcularBooking(booking);
            setOcularSelectedRec(null);
        }
        if (onNavigate) {
            onNavigate("ocular_results", {
                bookingId: booking?.booking_id || null,
                step: "results",
            });
        }
    };

    const handleBookAgain = (booking, onNavigate) => {
        const sName = (booking?.service_name || booking?.service || "").toLowerCase();
        const isCleaning = sName.includes("cleaning");

        setSelectedServiceForBooking(booking?.service_id || (isCleaning ? 3 : null));

        if (Array.isArray(booking?.units_data) && booking.units_data.length > 0) {
            setBookingInitialUnits(booking.units_data);
        } else {
            setBookingInitialUnits(null);
        }

        if (booking?.service_details && typeof booking.service_details === "object") {
            setBookingInitialServiceDetails(booking.service_details);
        } else {
            setBookingInitialServiceDetails(null);
        }

        // Direct instantly to Step 3: Preferred Schedule for completed cleaning service!
        setBookingInitialStep(isCleaning ? 3 : 1);

        if (onNavigate) {
            onNavigate("book");
        }
    };

    const handleScheduleOrderInstallation = (order, onNavigate) => {
        if (!order) return;
        const acTypeMap = {
            Window: "Window Type",
            "Window Type": "Window Type",
            "Floor Standing": "Floor-Mounted",
            "Floor Mounted": "Floor-Mounted",
            Cassette: "Ceiling Cassette",
        };
        const mappedUnitType = acTypeMap[order.ac_type] || "Wall-Mounted Split Type";
        const hpLabel = order.horsepower ? `${Number(order.horsepower)} HP` : "1.5 HP";

        setSelectedServiceForBooking(1); // Installation
        setBookingInitialUnits([
            {
                unit_type: mappedUnitType,
                motor_type: order.motor_type === "Non-Inverter" ? "Non-Inverter" : "Inverter",
                brand: order.brand || "Carrier",
                model_number: order.model || "",
                capacity_type: "hp",
                capacity: hpLabel,
                quantity: order.quantity || 1,
                unit_notes: `Purchased Unit Order #${order.order_id}`,
            },
        ]);
        setBookingInitialServiceDetails({
            ac_unit_order_id: order.order_id,
            ocular_booking_id: order.ocular_booking_id || null,
            unit_available: "Yes",
            company_supplied_unit: true,
        });
        setBookingInitialStep(3);

        if (onNavigate) {
            onNavigate("book");
        }
    };

    const buildPageComponents = ({
        addToast,
        handleDataChanged,
        dashboardData,
        dashboardLoading,
        onNavigate,
        refreshDashboardData,
        currentUser,
        navMeta,
        navNonce,
    }) => ({
        dashboard: (
            <CustomerOverview
                onNavigate={onNavigate}
                dashboardData={dashboardData}
                isLoading={dashboardLoading}
                onSelectServiceToBook={(serviceId) => {
                    setSelectedServiceForBooking(serviceId);
                    setBookingInitialStep(1);
                    setBookingInitialUnits(null);
                    setBookingInitialServiceDetails(null);
                }}
            />
        ),
        book: (
            <BookingWizard
                key={`wizard-${selectedServiceForBooking || "default"}-${bookingInitialStep}`}
                dashboardData={dashboardData}
                addToast={addToast}
                initialServiceId={selectedServiceForBooking}
                initialStep={bookingInitialStep}
                initialUnits={bookingInitialUnits}
                initialServiceDetails={bookingInitialServiceDetails}
                onBookingCreated={(newBookingId) => {
                    handleDataChanged();
                    setBookingInitialStep(1);
                    setBookingInitialUnits(null);
                    setBookingInitialServiceDetails(null);
                    setSelectedServiceForBooking(null);
                    onNavigate("bookings");
                }}
            />
        ),
        bookings: (
            <MyBookings
                key={`customer-bookings-${navNonce || 0}`}
                addToast={addToast}
                onNavigate={onNavigate}
                onSelectServiceToBook={(serviceId) => {
                    setSelectedServiceForBooking(serviceId);
                    setBookingInitialStep(1);
                    setBookingInitialUnits(null);
                    setBookingInitialServiceDetails(null);
                }}
                onBookAgain={(booking) => handleBookAgain(booking, onNavigate)}
                onViewOcularResults={(booking) => handleViewOcularResults(booking, onNavigate)}
                onRescheduleBooking={(booking) => handleRescheduleBooking(booking, onNavigate)}
                onScheduleOrderInstallation={(order) => handleScheduleOrderInstallation(order, onNavigate)}
                navMeta={navMeta}
                defaultTab="All"
            />
        ),
        reschedule: (
            <ReschedulePage
                key={`customer-reschedule-${rescheduleBooking?.booking_id || navMeta?.bookingId || 0}`}
                initialBooking={rescheduleBooking}
                navMeta={navMeta}
                currentUser={currentUser}
                addToast={addToast}
                onNavigate={onNavigate}
                onSuccess={() => {
                    handleDataChanged();
                }}
                onDataChanged={handleDataChanged}
            />
        ),
        ocular_results: (
            <OcularInspectionPage
                mode="results"
                initialBooking={ocularBooking}
                initialSelectedRec={ocularSelectedRec}
                navMeta={navMeta}
                currentUser={currentUser}
                addToast={addToast}
                onNavigate={onNavigate}
                onBookingSync={(updatedBooking) => setOcularBooking(updatedBooking)}
                onSelectUnitForPayment={(booking, rec) => {
                    setOcularBooking(booking);
                    setOcularSelectedRec(rec);
                    onNavigate("ocular_payment", {
                        bookingId: booking?.booking_id || null,
                        recommendationId: rec?.recommendation_id || null,
                        step: "payment",
                    });
                }}
                onScheduleOrderInstallation={(order) => handleScheduleOrderInstallation(order, onNavigate)}
                onDataChanged={handleDataChanged}
            />
        ),
        ocular_payment: (
            <OcularInspectionPage
                mode="payment"
                initialBooking={ocularBooking}
                initialSelectedRec={ocularSelectedRec}
                navMeta={navMeta}
                currentUser={currentUser}
                addToast={addToast}
                onNavigate={onNavigate}
                onBookingSync={(updatedBooking) => setOcularBooking(updatedBooking)}
                onSelectUnitForPayment={(booking, rec) => {
                    setOcularBooking(booking);
                    setOcularSelectedRec(rec);
                }}
                onScheduleOrderInstallation={(order) => handleScheduleOrderInstallation(order, onNavigate)}
                onDataChanged={handleDataChanged}
            />
        ),
        service_history: (
            <ServiceHistory
                addToast={addToast}
                onNavigate={onNavigate}
                onSelectServiceToBook={(serviceId) => {
                    setSelectedServiceForBooking(serviceId);
                    setBookingInitialStep(1);
                    setBookingInitialUnits(null);
                    setBookingInitialServiceDetails(null);
                }}
                onBookAgain={(booking) => handleBookAgain(booking, onNavigate)}
                onViewOcularResults={(booking) => handleViewOcularResults(booking, onNavigate)}
            />
        ),
        warranty: (
            <WarrantyTracking
                addToast={addToast}
                onNavigate={onNavigate}
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