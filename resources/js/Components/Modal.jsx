function Modal({
    open,
    title,
    message,
    children,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    confirmDisabled = false,
    cancelDisabled = false,
    maxWidth = 420,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1e3,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
        >
            {" "}
            <div
                style={{
                    background: "#fff",
                    borderRadius: 20,
                    padding: "28px 28px 24px",
                    maxWidth,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    animation: "fadeIn 0.18s ease",
                }}
            >
                {" "}
                <h2
                    style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#1E2F5F",
                        margin: "0 0 8px",
                    }}
                >
                    {title}
                </h2>{" "}
                {message && (
                    <p
                        style={{
                            fontSize: 13,
                            color: "#6B7280",
                            lineHeight: 1.6,
                            margin: children ? "0 0 18px" : "0 0 24px",
                        }}
                    >
                        {message}
                    </p>
                )}{" "}
                {children && <div style={{ marginBottom: 24 }}>{children}</div>}{" "}
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "flex-end",
                    }}
                >
                    {" "}
                    <button
                        onClick={onCancel}
                        disabled={cancelDisabled}
                        style={{
                            padding: "9px 18px",
                            borderRadius: 10,
                            border: "1px solid #E5E7EB",
                            background: "#fff",
                            color: "#6B7280",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: cancelDisabled ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                            opacity: cancelDisabled ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) =>
                            !cancelDisabled &&
                            (e.currentTarget.style.background = "#F9FAFB")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "#fff")
                        }
                    >
                        {" "}
                        {cancelLabel}{" "}
                    </button>{" "}
                    <button
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                        style={{
                            padding: "9px 18px",
                            borderRadius: 10,
                            border: "none",
                            background:
                                variant === "danger"
                                    ? "linear-gradient(135deg,#EF4444,#DC2626)"
                                    : "linear-gradient(135deg,#3F7DFF,#1E2F5F)",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: confirmDisabled ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                            boxShadow: "0 4px 12px rgba(63,125,255,0.3)",
                            opacity: confirmDisabled ? 0.6 : 1,
                        }}
                    >
                        {" "}
                        {confirmLabel}{" "}
                    </button>{" "}
                </div>{" "}
            </div>{" "}
        </div>
    );
}
export { Modal as default };
