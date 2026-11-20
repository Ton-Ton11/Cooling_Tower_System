import { useState } from "react";
import { usePage } from "@inertiajs/react";
import RoleShell from "../../Layouts/RoleShell";
import StatusBadge from "../../Components/StatusBadge";
import CustomerOverview from "./Overview";
import BookingWizard from "./BookingWizard";
import MyBookings from "./MyBookings";
import ServiceHistory from "./ServiceHistory";
import WarrantyTracking from "./WarrantyTracking";
import Complaints from "./Complaints";
import OcularInspectionPage from "./OcularInspectionPage";
import ReschedulePage from "./ReschedulePage";
import Announcements from "../Shared/Announcements";
import ResubmitBusinessModal from "../../Components/ResubmitBusinessModal";
import { CUSTOMER_ENDPOINTS } from "../../utils/superAdmin";

function BusinessVerificationBanner({ user, onSuccess, addToast }) {
    const [isResubmitOpen, setIsResubmitOpen] = useState(false);

    if (!user || user.account_type !== "business" || user.verification_status === "approved") {
        return null;
    }

    const isRejected = user.verification_status === "rejected";
    const remainingAttempts = typeof user.remaining_daily_attempts === "number"
        ? user.remaining_daily_attempts
        : 3;
    const canResubmit = remainingAttempts > 0;

    return (
        <>
            <div
                className={`max-w-7xl mx-auto mb-5 rounded-2xl border p-4 sm:px-5 sm:py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isRejected
                        ? "bg-red-50/90 border-red-200 text-red-950"
                        : "bg-amber-50/90 border-amber-200/90 text-amber-950"
                }`}
            >
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                            isRejected
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                    </div>
                    <div className="space-y-1 text-xs flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 truncate">
                                {user.company_name || "Business Account"}
                            </span>
                            {user.tin && (
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-600">
                                    TIN: {user.tin}
                                </span>
                            )}
                            <StatusBadge status={isRejected ? "Rejected" : "Pending Verification"} />
                            {isRejected && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    canResubmit
                                        ? "bg-white/90 text-slate-700 border-slate-200"
                                        : "bg-red-100 text-red-800 border-red-200"
                                }`}>
                                    {remainingAttempts} of 3 Daily Attempts Left
                                </span>
                            )}
                        </div>
                        {isRejected ? (
                            <div className="space-y-0.5">
                                <p className="text-red-800 leading-relaxed">
                                    Your business verification request could not be approved.
                                    {user.verification_rejection_reason && (
                                        <> <strong>Reason:</strong> {user.verification_rejection_reason}</>
                                    )}
                                </p>
                                <p className="text-red-700/80 text-[11px]">
                                    You can re-submit your corrected details up to 3 times per day for administrative re-review.
                                </p>
                            </div>
                        ) : (
                            <p className="text-amber-900/90 leading-relaxed">
                                Your <strong>Business / Corporate</strong> account is currently under admin review. You can browse services and explore your dashboard, and booking creation will unlock automatically once your company TIN and details are verified.
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Button for Rejected State */}
                {isRejected && (
                    <div className="shrink-0 flex sm:flex-col sm:items-end gap-1.5 self-end sm:self-center">
                        {canResubmit ? (
                            <button
                                type="button"
                                onClick={() => setIsResubmitOpen(true)}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs hover:shadow transition flex items-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Re-submit Details</span>
                            </button>
                        ) : (
                            <div className="text-right">
                                <span className="inline-block px-3.5 py-1.5 rounded-xl bg-slate-200/90 border border-slate-300 text-slate-500 font-bold text-xs cursor-not-allowed">
                                    Daily Limit Reached (3/3)
                                </span>
                                <span className="block text-[10px] text-red-700 font-semibold mt-0.5">
                                    Resets tomorrow at 12:00 AM
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ResubmitBusinessModal
                isOpen={isResubmitOpen}
                onClose={() => setIsResubmitOpen(false)}
                user={user}
                onSuccess={onSuccess}
                addToast={addToast}
            />
        </>
    );
}

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

    const pageAuthUser = usePage()?.props?.auth?.user || null;

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
    }) => {
        const effectiveUser = dashboardData?.user || currentUser || pageAuthUser;
        const wrapWithBanner = (node) => (
            <>
                <BusinessVerificationBanner
                    user={effectiveUser}
                    onSuccess={() => {
                        handleDataChanged();
                        if (typeof refreshDashboardData === "function") {
                            refreshDashboardData();
                        }
                    }}
                    addToast={addToast}
                />
                {node}
            </>
        );

        return {
        dashboard: wrapWithBanner(
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
        book: wrapWithBanner(
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
    };
    };

    return (
        <RoleShell
            navItems={navItems}
            buildPageComponents={buildPageComponents}
            dashboardEndpoint={CUSTOMER_ENDPOINTS.dashboard}
            defaultPage="dashboard"
        />
    );
}