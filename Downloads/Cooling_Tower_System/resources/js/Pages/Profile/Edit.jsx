import { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import UserProfileSettings from "../Shared/UserProfileSettings";
import Toast from "../../Components/Toast";
import companyLogo from "../../../imports/cooling_tower_airconditioning_services_logo-1.jpg";

export default function Edit({ initialData }) {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = "info") => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3800);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="min-h-screen bg-[#F6F9FC] font-sans text-slate-800 antialiased">
            <Head title="My Profile & Settings" />

            {/* Minimalist Top Header */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img
                            src={companyLogo}
                            alt="Cooling Tower Logo"
                            className="h-10 w-10 rounded-xl border border-slate-200 object-cover shadow-sm"
                        />
                        <div>
                            <p className="font-display text-sm font-bold tracking-tight text-[#0E1A33]">
                                Cooling Tower
                            </p>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">
                                Airconditioning Services
                            </p>
                        </div>
                    </div>

                    <Link
                        href={route("dashboard")}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#0E1A33] shadow-sm transition hover:border-sky-200 hover:bg-sky-50/50 hover:text-sky-700"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <UserProfileSettings addToast={addToast} initialData={initialData} />
            </main>

            <Toast toasts={toasts} onDismiss={removeToast} />
        </div>
    );
}
