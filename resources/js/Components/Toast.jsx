import { useEffect } from "react";

const cfg = {
    success: {
        bg: "#F0FDF4",
        border: "#BBF7D0",
        borderLeft: "#16A34A",
        text: "#15803D",
        icon: "\u2713",
    },
    error: {
        bg: "#FEF2F2",
        border: "#FECACA",
        borderLeft: "#DC2626",
        text: "#B91C1C",
        icon: "\u2715",
    },
    warning: {
        bg: "#FFFBEB",
        border: "#FDE68A",
        borderLeft: "#D97706",
        text: "#B45309",
        icon: "!",
    },
    info: {
        bg: "#EFF6FF",
        border: "#BFDBFE",
        borderLeft: "#2563EB",
        text: "#1D4ED8",
        icon: "i",
    },
};

function ToastItem({ toast, onDismiss }) {
    const c = cfg[toast.variant] || cfg.info;

    useEffect(() => {
        const t = setTimeout(() => onDismiss(toast.id), 3800);
        return () => clearTimeout(t);
    }, [toast.id, onDismiss]);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#FFFFFF",
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.borderLeft}`,
                borderRadius: 12,
                padding: "12px 16px",
                boxShadow: "0 10px 25px -5px rgba(16, 29, 56, 0.12), 0 4px 10px -2px rgba(16, 29, 56, 0.05)",
                minWidth: 300,
                maxWidth: 420,
                animation: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
        >
            <span
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: c.borderLeft,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11.5,
                    fontWeight: 700,
                }}
            >
                {c.icon}
            </span>
            <p
                style={{
                    flex: 1,
                    fontSize: 13,
                    color: "#111827",
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.45,
                }}
            >
                {toast.message}
            </p>
            <button
                onClick={() => onDismiss(toast.id)}
                style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    fontSize: 16,
                    padding: "2px",
                    lineHeight: 1,
                    flexShrink: 0,
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111827")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
            >
                ×
            </button>
        </div>
    );
}

function Toast({ toasts, onDismiss }) {
    if (!toasts || toasts.length === 0) return null;
    return (
        <div
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
