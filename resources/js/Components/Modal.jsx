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
    maxWidth = 440,
    closeable = true,
    showFooter,
    padding = "24px",
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

    const confirmBg =
        variant === "danger"
            ? "#DC2626"
            : variant === "warning"
            ? "#D97706"
            : "#2563EB";
    const confirmHoverBg =
        variant === "danger"
            ? "#B91C1C"
            : variant === "warning"
            ? "#B45309"
            : "#1D4ED8";

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
                background: "rgba(16, 33, 63, 0.48)",
                backdropFilter: "blur(2px)",
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
                    background: "#FFFFFF",
                    borderRadius: 12,
                    padding,
                    maxWidth: resolvedMaxWidth,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 12px 32px rgba(16, 33, 63, 0.14)",
                    border: "1px solid #E2E8F0",
                    animation: "fadeIn 0.15s ease",
                }}
            >
                {title && (
                    <h2
                        style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: "#172B4D",
                            margin: "0 0 8px",
                            lineHeight: 1.35,
                        }}
                    >
                        {title}
                    </h2>
                )}

                {message && (
                    <p
                        style={{
                            fontSize: 13.5,
                            color: "#64748B",
                            lineHeight: 1.6,
                            margin: children
                                ? "0 0 18px"
                                : showActionButtons
                                ? "0 0 22px"
                                : "0",
                        }}
                    >
                        {message}
                    </p>
                )}

                {children && (
                    <div style={{ marginBottom: showActionButtons ? 22 : 0 }}>
                        {children}
                    </div>
                )}

                {showActionButtons && (
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            justifyContent: "flex-end",
                            paddingTop: 14,
                            borderTop: "1px solid #E2E8F0",
                        }}
                    >
                        {Boolean(cancelLabel) && (
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={cancelDisabled}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 8,
                                    border: "1px solid #E2E8F0",
                                    background: "#FFFFFF",
                                    color: "#172B4D",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: cancelDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    fontFamily: "inherit",
                                    opacity: cancelDisabled ? 0.6 : 1,
                                    transition: "background-color 0.15s ease",
                                }}
                                onMouseEnter={(e) =>
                                    !cancelDisabled &&
                                    (e.currentTarget.style.background = "#F8FAFC")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#FFFFFF")
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
                                    borderRadius: 8,
                                    border: "1px solid transparent",
                                    background: confirmBg,
                                    color: "#FFFFFF",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: confirmDisabled
                                        ? "not-allowed"
                                        : "pointer",
                                    fontFamily: "inherit",
                                    opacity: confirmDisabled ? 0.6 : 1,
                                    transition: "background-color 0.15s ease",
                                }}
                                onMouseEnter={(e) =>
                                    !confirmDisabled &&
                                    (e.currentTarget.style.background = confirmHoverBg)
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = confirmBg)
                                }
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
