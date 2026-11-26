import { useEffect } from "react";

const cfg = {
    success: {
        bg: "#FFFFFF",
        border: "#E2E8F0",
        accent: "#16A34A",
        badgeBg: "#F0FDF4",
        badgeText: "#15803D",
        icon: "\u2713",
    },
    error: {
        bg: "#FFFFFF",
        border: "#E2E8F0",
        accent: "#DC2626",
        badgeBg: "#FEF2F2",
        badgeText: "#DC2626",
        icon: "\u2715",
    },
    warning: {
        bg: "#FFFFFF",
        border: "#E2E8F0",
        accent: "#D97706",
        badgeBg: "#FFFBEB",
        badgeText: "#B45309",
        icon: "!",
    },
    info: {
        bg: "#FFFFFF",
        border: "#E2E8F0",
        accent: "#2563EB",
        badgeBg: "#EAF2FF",
        badgeText: "#2563EB",
        icon: "i",
    },
};

function ToastItem({ toast, onDismiss }) {
    const c = cfg[toast.variant] || cfg.info;
    useEffect(() => {
        const t = setTimeout(() => onDismiss(toast.id), 3500);
        return () => clearTimeout(t);
    }, [toast.id, onDismiss]);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.accent}`,
                borderRadius: 10,
                padding: "12px 14px",
                boxShadow: "0 6px 20px rgba(16, 33, 63, 0.10)",
                minWidth: 280,
                maxWidth: 380,
                animation: "slideInRight 0.2s ease",
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: c.badgeBg,
                    color: c.badgeText,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                }}
            >
                {c.icon}
            </span>
            <p
                style={{
                    flex: 1,
                    fontSize: 13,
                    color: "#172B4D",
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.4,
                }}
            >
                {toast.message}
            </p>
            <button
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#64748B",
                    fontSize: 17,
                    padding: "0 2px",
                    lineHeight: 1,
                    flexShrink: 0,
                    fontFamily: "inherit",
                }}
            >
                ×
            </button>
        </div>
    );
}

function Toast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;
    return (
        <div
            role="region"
            aria-label="Notifications"
            aria-live="polite"
            style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 2000,
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

export { Toast as default };
