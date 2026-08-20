import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';

// TODO: Link role-specific pages here once moved into resources/js/Pages/AdminAssistant/
// (AcUnits, Bookings, MaterialsTools, SalesRecords, StaffAccounts, Documents,
// Announcements, ActivityLogs).
export default function Dashboard() {
    const { auth } = usePage().props;
    const roleName = auth?.role_name ?? 'Admin Assistant';

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Admin Assistant Dashboard
                </h2>
            }
        >
            <Head title="Admin Assistant Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <p className="mb-2 text-lg font-semibold">Welcome to the admin assistant dashboard.</p>
                            <p className="text-sm text-gray-600">Signed in as {roleName}.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
