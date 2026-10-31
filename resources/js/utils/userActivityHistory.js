/**
 * userActivityHistory.js
 * Manages persistent user activity history across navigation and interactions in the interface.
 */

const PAGE_DETAILS = {
    dashboard: {
        title: "Dashboard Overview",
        description: "Main operational summary & overview dashboard",
        icon: "dashboard",
    },
    checklists: {
        title: "Checklists & Dispatches",
        description: "Review tool dispatches, custody & checklist status",
        icon: "checklists",
    },
    materials: {
        title: "Materials & Inventory",
        description: "Browse tools inventory, stock balances & supplies",
        icon: "materials",
    },
    bookings: {
        title: "Service Bookings & Jobs",
        description: "Customer service appointments & work orders",
        icon: "bookings",
    },
    book: {
        title: "Book a Service",
        description: "Airconditioning service request wizard",
        icon: "book",
    },
    service_history: {
        title: "Service History",
        description: "Completed airconditioning service records",
        icon: "history",
    },
    warranty: {
        title: "AC Unit Warranty Tracking",
        description: "Warranty coverage and customer AC unit monitoring",
        icon: "warranty",
    },
    complaints: {
        title: "Support & Complaints",
        description: "Customer assistance inquiries and complaint records",
        icon: "complaints",
    },
    catalog: {
        title: "Services & Catalog",
        description: "Airconditioning service packages and catalog directory",
        icon: "catalog",
    },
    teams: {
        title: "Technician Teams",
        description: "Team management, head technicians & assignments",
        icon: "teams",
    },
    certificates: {
        title: "Certificate Monitoring",
        description: "Technician training & accreditation monitoring",
        icon: "certificates",
    },
    staff: {
        title: "Staff Accounts",
        description: "Staff user profiles, roles & permissions",
        icon: "staff",
    },
    acunits: {
        title: "AC Units Inventory",
        description: "Customer and warehouse cooling equipment inventory",
        icon: "acunits",
    },
    sales: {
        title: "Sales & Records",
        description: "Sales transactions, payment tracking & invoices",
        icon: "sales",
    },
    documents: {
        title: "Documents & Forms",
        description: "Service documentation and printable report forms",
        icon: "documents",
    },
    announcements: {
        title: "Announcements",
        description: "Company bulletins, notices & important updates",
        icon: "announcements",
    },
    logs: {
        title: "Activity Logs",
        description: "System security audit and operation logs",
        icon: "logs",
    },
    performance: {
        title: "Performance Reports",
        description: "Technician efficiency metrics and task reviews",
        icon: "performance",
    },
    tools: {
        title: "My Tools & Checklists",
        description: "Field technician issued equipment & task checklists",
        icon: "tools",
    },
    profile: {
        title: "My Profile Settings",
        description: "User profile information and security settings",
        icon: "profile",
    },
};

export function getUserActivityStorageKey(userId) {
    return userId ? `user_activity_history_u${userId}` : "user_activity_history_guest";
}

export function getUserActivityHistory(userId) {
    if (typeof window === "undefined") return [];
    try {
        const key = getUserActivityStorageKey(userId);
        const stored = localStorage.getItem(key);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function recordUserActivity(userId, activity) {
    if (typeof window === "undefined") return;
    if (!activity || !activity.pageId || activity.pageId === "history") return;

    try {
        const pageId = String(activity.pageId).trim();
        const fallback = PAGE_DETAILS[pageId] || {};
        const title = activity.title || fallback.title || pageId.charAt(0).toUpperCase() + pageId.slice(1);
        const description = activity.description || fallback.description || "Recently accessed in your interface";
        const icon = activity.icon || fallback.icon || pageId;

        const key = getUserActivityStorageKey(userId);
        const current = getUserActivityHistory(userId);

        // Remove any existing entry for this pageId to bring it to top
        const filtered = current.filter((item) => item.pageId !== pageId);

        const newEntry = {
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            pageId,
            title,
            description,
            icon,
            timestamp: new Date().toISOString(),
        };

        const updated = [newEntry, ...filtered].slice(0, 40);
        localStorage.setItem(key, JSON.stringify(updated));

        window.dispatchEvent(
            new CustomEvent("user-activity-history-updated", {
                detail: { userId, history: updated },
            })
        );
    } catch (err) {
        console.error("Error recording user activity:", err);
    }
}

export function removeUserActivity(userId, activityId) {
    if (typeof window === "undefined") return [];
    try {
        const key = getUserActivityStorageKey(userId);
        const current = getUserActivityHistory(userId);
        const updated = current.filter((item) => item.id !== activityId);
        localStorage.setItem(key, JSON.stringify(updated));

        window.dispatchEvent(
            new CustomEvent("user-activity-history-updated", {
                detail: { userId, history: updated },
            })
        );
        return updated;
    } catch {
        return [];
    }
}

export function clearUserActivityHistory(userId) {
    if (typeof window === "undefined") return;
    try {
        const key = getUserActivityStorageKey(userId);
        localStorage.removeItem(key);

        window.dispatchEvent(
            new CustomEvent("user-activity-history-updated", {
                detail: { userId, history: [] },
            })
        );
    } catch (err) {
        console.error("Error clearing user activity history:", err);
    }
}

export function formatTimeAgo(isoDate) {
    if (!isoDate) return "Recently";
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "Recently";

    const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffInSeconds < 45) {
        return "Just now";
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return "Yesterday";
    }
    if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    }
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

