import React, { useEffect } from "react";

const MAX_WIDTH_MAP = {
    sm: 384,
    md: 448,
    lg: 512,
    xl: 576,
    "2xl": 672,
};

function Modal({
    open,
    show,
    title,
    message,
    children,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    confirmDisabled = false,
    cancelDisabled = false,
    maxWidth = 420,
    closeable = true,
    showFooter,
    padding = "28px 28px 24px",
    className = "",
    onConfirm,
    onCancel,
    onClose,
}) {
    const isOpen = Boolean(open ?? show);

    const handleClose = () => {
        if (closeable) {
            (onCancel || onClose)?.();
        }
    };

    useEffect(() => {
        if (!isOpen || !closeable) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                handleClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, closeable]);

    if (!isOpen) return null;

    const resolvedMaxWidth = MAX_WIDTH_MAP[maxWidth] ?? maxWidth;
    const showActionButtons =
        showFooter !== undefined ? showFooter : Boolean(onConfirm);

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget && closeable) {
                    handleClose();
                }
            }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                overflowY: "auto",
            }}
        >
            <div
                className={className}
                style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding,
                    maxWidth: resolvedMaxWidth,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 20px 48px -8px rgba(16, 29, 56, 0.22), 0 4px 12px -2px rgba(16, 29, 56, 0.08)",
                    border: "1px solid #E5E7EB",
                    animation: "fadeIn 0.18s ease",
                }}
            >
                {title && (
                    <h2
                        style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: "#111827",
                            letterSpacing: "-0.015em",
                            margin: "0 0 8px",
                        }}
                    >
                        {title}
                    </h2>
                )}

                {message && (
                    <p
                        style={{
                            fontSize: 13,
                            color: "#64748B",
                            lineHeight: 1.6,
                            margin: children
                                ? "0 0 18px"
                                : showActionButtons
                                ? "0 0 24px"
                                : "0",
                        }}
                    >
                        {message}
                    </p>
                )}

                {children && (
                    <div style={{ marginBottom: showActionButtons ? 24 : 0 }}>
                        {children}
                    </div>
                )}

                {showActionButtons && (
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            justifyContent: "flex-end",
                        }}
                    >
                        {Boolean(cancelLabel) && (
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={cancelDisabled}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "1px solid #D1D5DB",
                                    background: "#fff",
                                    color: "#374151",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: cancelDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    fontFamily: "inherit",
                                    opacity: cancelDisabled ? 0.6 : 1,
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) =>
                                    !cancelDisabled &&
                                    (e.currentTarget.style.background = "#F9FAFB")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#fff")
                                }
                            >
                                {cancelLabel}
                            </button>
                        )}
                        {Boolean(confirmLabel) && (
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={confirmDisabled}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: "none",
                                    background:
                                        variant === "danger"
                                            ? "#DC2626"
                                            : variant === "warning"
                                            ? "#D97706"
                                            : "#2563EB",
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: confirmDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    fontFamily: "inherit",
                                    boxShadow:
                                        variant === "danger"
                                            ? "0 2px 6px rgba(220,38,38,0.25)"
                                            : variant === "warning"
                                            ? "0 2px 6px rgba(217,119,6,0.25)"
                                            : "0 2px 6px rgba(37,99,235,0.25)",
                                    opacity: confirmDisabled ? 0.6 : 1,
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!confirmDisabled) {
                                        e.currentTarget.style.background =
                                            variant === "danger"
                                                ? "#B91C1C"
                                                : variant === "warning"
                                                ? "#B45309"
                                                : "#1D4ED8";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!confirmDisabled) {
                                        e.currentTarget.style.background =
                                            variant === "danger"
                                                ? "#DC2626"
                                                : variant === "warning"
                                                ? "#D97706"
                                                : "#2563EB";
                                    }
                                }}
                            >
                                {confirmLabel}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export { Modal as default };
