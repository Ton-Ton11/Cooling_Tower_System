import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Modal from "../Components/Modal";
import Toast from "../Components/Toast";
import Dashboard from "../Pages/Dashboard";
import Bookings from "../Pages/Bookings";
import StaffAccounts from "../Pages/StaffAccounts";
import MaterialsTools from "../Pages/MaterialsTools";
import AcUnits from "../Pages/AcUnits";
import SalesRecords from "../Pages/SalesRecords";
import Documents from "../Pages/Documents";
import Announcements from "../Pages/Announcements";
import ActivityLogs from "../Pages/ActivityLogs";

let toastIdCounter = 1;

function Shell() {
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const addToast = (message, variant = "success") => {
    const id = toastIdCounter++;
    setToasts((prev) => [...prev, { id, message, variant }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const onNavigate = (page) => {
    setActivePage(page);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const pageComponents = {
    dashboard: <Dashboard onNavigate={onNavigate} addToast={addToast} />,
    bookings: <Bookings addToast={addToast} />,
    staff: <StaffAccounts addToast={addToast} />,
    materials: <MaterialsTools addToast={addToast} />,
    acunits: <AcUnits addToast={addToast} />,
    sales: <SalesRecords addToast={addToast} />,
    documents: <Documents addToast={addToast} />,
    announcements: <Announcements addToast={addToast} />,
    logs: <ActivityLogs />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={isMobile ? false : collapsed}
        onLogout={() => setShowLogout(true)}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 19,
          }}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar
          collapsed={collapsed}
          isMobile={isMobile}
          onToggleSidebar={() => {
            if (isMobile) {
              setMobileSidebarOpen((open) => !open);
              return;
            }
            setCollapsed((c) => !c);
          }}
        />
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: isMobile ? 12 : 24,
            background: "#F5F7FA",
          }}
        >
          {pageComponents[activePage]}
        </main>
      </div>

      <Modal
        open={showLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of the Super Admin dashboard?"
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setShowLogout(false);
          addToast("You have been logged out.", "warning");
          setTimeout(() => setActivePage("dashboard"), 1200);
        }}
        onCancel={() => setShowLogout(false)}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default Shell;
