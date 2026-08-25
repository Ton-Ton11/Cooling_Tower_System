import StatCard from "../../Components/StatCard";
import StatusBadge from "../../Components/StatusBadge";
import { formatCurrency, formatDateTime } from "../../utils/superAdmin";

const icons = {
    pending: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    active: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    completed: "M5 13l4 4L19 7",
    service: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    announcements: "M3 11l19-9-9 19-2-8-8-2z",
};

export default function CustomerOverview({ onNavigate, dashboardData, isLoading, onSelectServiceToBook }) {
    const stats = dashboardData?.stats ?? {};
    const recentBookings = dashboardData?.recent_bookings ?? [];
    const services = dashboardData?.services ?? [];
    const announcements = dashboardData?.announcements ?? [];
    const user = dashboardData?.user ?? {};

    const statCards = [
        {
            label: "Pending Bookings",
            value: stats.pending_bookings ?? 0,
            sub: "Awaiting admin confirmation",
            icon: icons.pending,
            accent: "#F58A07",
        },
        {
            label: "Active Services",
            value: stats.active_bookings ?? 0,
            sub: "Approved / Technician assigned",
            icon: icons.active,
            accent: "#3F7DFF",
        },
        {
            label: "Completed Services",
            value: stats.completed_bookings ?? 0,
            sub: "Finished cooling jobs",
            icon: icons.completed,
            accent: "#10B981",
        },
        {
            label: "Announcements",
            value: stats.announcements ?? 0,
            sub: "System & maintenance updates",
            icon: icons.announcements,
            accent: "#8B5CF6",
        },
    ];

    return (
        <div className="space-y-7">
            {/* Hero Welcome Banner */}
            <div className="bg-gradient-to-r from-[#1E2F5F] via-[#223970] to-[#162347] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Customer Portal Active</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Welcome back, {user.given_name || "Valued Customer"}!
                        </h1>
                        <p className="mt-2 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                            Need fast, certified airconditioning maintenance, cleaning, or repair? Book a technician with guaranteed schedule confirmation.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => onNavigate("book")}
                            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-900/40 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Book a Service Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, idx) => (
                    <StatCard
                        key={idx}
                        label={card.label}
                        value={card.value}
                        sub={card.sub}
                        icon={card.icon}
                        accent={card.accent}
                    />
                ))}
            </div>

            {/* Recent Bookings & Announcements Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Bookings (2 Cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Recent Service Bookings</h2>
                            <p className="text-xs text-gray-500">Your latest service appointments and requests.</p>
                        </div>
                        <button
                            onClick={() => onNavigate("bookings")}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                        >
                            View All &rarr;
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="py-8 text-center text-gray-400 text-xs">Loading bookings...</div>
                    ) : recentBookings.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-xs">
                            <p>No bookings requested yet.</p>
                            <button
                                onClick={() => onNavigate("book")}
                                className="mt-3 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                            >
                                Schedule Your First Service
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentBookings.map((b) => (
                                <div
                                    key={b.booking_id}
                                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm hover:border-blue-200 transition flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 font-extrabold text-xs">
                                            #{b.booking_id}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900">{b.service_name}</h4>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Schedule: {formatDateTime(b.scheduled_date)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={b.booking_status} />
                                        <button
                                            onClick={() => onNavigate("bookings")}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-100 transition"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Company Announcements (1 Col) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Announcements</h2>
                            <p className="text-xs text-gray-500">Official company updates.</p>
                        </div>
                    </div>

                    {announcements.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-xs">
                            No announcements at the moment.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {announcements.map((a) => (
                                <div key={a.id} className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
                                    <h4 className="text-xs font-bold text-blue-900">{a.title}</h4>
                                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{a.message}</p>
                                    <span className="text-[10px] text-gray-400 block pt-1">{formatDateTime(a.created_at)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Available Services Showcase Grid */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Our Airconditioning Services</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Explore our professional services and book online in minutes.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((srv) => (
                        <div
                            key={srv.service_id}
                            className="p-5 rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icons.service} /></svg>
                                    </span>
                                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                                        {formatCurrency(srv.base_price)}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mt-3">{srv.service_name}</h3>
                                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">{srv.description}</p>
                            </div>

                            <button
                                onClick={() => {
                                    if (onSelectServiceToBook) onSelectServiceToBook(srv.service_id);
                                    onNavigate("book");
                                }}
                                className="mt-4 w-full py-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                                Book This Service
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
