const Icon = ({ d, size = 16 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {" "}
        <path d={d} />{" "}
    </svg>
);
const trendUp = "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6";
const trendDown = "M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6";
function StatCard({ label, value, sub, icon, accent, trend, trendVal }) {
    return (
        <div
            style={{
                background: "#fff",
                borderRadius: 18,
                padding: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.06)",
                position: "relative",
                overflow: "hidden",
                transition: "box-shadow 0.2s",
            }}
        >
            {" "}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 90,
                    height: 90,
                    borderRadius: "0 0 0 100%",
                    background: accent,
                    opacity: 0.06,
                }}
            />{" "}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 10,
                }}
            >
                {" "}
                <div
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${accent}1A`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: accent,
                        flexShrink: 0,
                    }}
                >
                    {" "}
                    <Icon d={icon} size={17} />{" "}
                </div>{" "}
                {trend && trendVal && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: 8,
                            background: trend === "up" ? "#F0FDF4" : "#FEF2F2",
                            color: trend === "up" ? "#16A34A" : "#DC2626",
                        }}
                    >
                        {" "}
                        <Icon
                            d={trend === "up" ? trendUp : trendDown}
                            size={10}
                        />{" "}
                        {trendVal}{" "}
                    </div>
                )}{" "}
            </div>{" "}
            <p
                style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1E2F5F",
                    lineHeight: 1.1,
                    margin: 0,
                }}
            >
                {value}
            </p>{" "}
            <p
                style={{
                    fontSize: 12,
                    color: "#6B7280",
                    fontWeight: 500,
                    marginTop: 3,
                    marginBottom: 0,
                }}
            >
                {label}
            </p>{" "}
            {sub && (
                <p
                    style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        marginTop: 2,
                        marginBottom: 0,
                    }}
                >
                    {sub}
                </p>
            )}{" "}
        </div>
    );
}
export { StatCard as default };
