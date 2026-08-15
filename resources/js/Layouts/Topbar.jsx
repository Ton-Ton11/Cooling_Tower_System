const Icon = ({ d, size = 18 }) => (
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
    <path d={d} />
  </svg>
);

const ic = {
  chevron_left: "M15 18l-6-6 6-6",
  chevron_right: "M9 18l6-6-6-6",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
};

function Topbar({ collapsed, isMobile = false, onToggleSidebar }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #F0F2F5",
        padding: isMobile ? "0 12px" : "0 20px",
        minHeight: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        zIndex: 9,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <button
        onClick={onToggleSidebar}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F5F7FA";
          e.currentTarget.style.color = "#1E2F5F";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#9CA3AF";
        }}
      >
        <Icon d={isMobile ? ic.menu : (collapsed ? ic.chevron_right : ic.chevron_left)} size={16} />
      </button>

      {!isMobile && (
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF",
              display: "flex",
              pointerEvents: "none",
            }}
          >
            <Icon d={ic.search} size={14} />
          </span>
          <input
            type="text"
            placeholder="Search bookings, staff, clients..."
            style={{
              width: "100%",
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              background: "#F5F7FA",
              border: "1px solid #EAECF0",
              borderRadius: 10,
              fontSize: 13,
              color: "#374151",
              outline: "none",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3F7DFF")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#EAECF0")}
          />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, marginLeft: "auto" }}>
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#F5F7FA",
              border: "1px solid #EAECF0",
              borderRadius: 10,
              padding: "6px 12px",
              fontSize: 12,
              color: "#6B7280",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <Icon d={ic.calendar} size={13} />
            {dateStr}
          </div>
        )}

        {!isMobile && (
          <button
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F5F7FA";
              e.currentTarget.style.color = "#1E2F5F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#9CA3AF";
            }}
          >
            <Icon d={ic.settings} size={16} />
          </button>
        )}

        <button
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9CA3AF",
            position: "relative",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F5F7FA";
            e.currentTarget.style.color = "#1E2F5F";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#9CA3AF";
          }}
        >
          <Icon d={ic.bell} size={16} />
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 8,
              height: 8,
              background: "#F58A07",
              borderRadius: "50%",
              border: "2px solid #fff",
            }}
          />
        </button>

        {!isMobile && <div style={{ width: 1, height: 28, background: "#F0F2F5", margin: "0 4px" }} />}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg,#3F7DFF,#1E2F5F)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            SA
          </div>
          {!isMobile && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#1E2F5F", lineHeight: 1.2, margin: 0 }}>Super Admin</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.3, margin: 0 }}>Administrator</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
