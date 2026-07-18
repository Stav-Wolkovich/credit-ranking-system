import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { PlaceholderPage, ErrorBanner } from "./components/ui.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import ProcessesPage from "./pages/ProcessesPage.jsx";

const FALLBACK_NAV = [{ id: "report", label: "דוח דירוג פנימי", count: 12 }];

function PageContent({ page, navItems }) {
  switch (page) {
    case "report":
      return <ReportPage />;
    case "processes":
      return <ProcessesPage />;
    default: {
      const item = navItems.find((n) => n.id === page);
      return <PlaceholderPage label={item ? item.label : ""} />;
    }
  }
}

export default function App() {
  const [navItems, setNavItems] = useState(FALLBACK_NAV);
  const [navError, setNavError] = useState(null);
  const [page, setPage] = useState("report");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    api
      .getNav()
      .then(setNavItems)
      .catch((err) => setNavError(err.message));
  }, []);

  return (
    <div dir="rtl" style={{ minHeight: "100vh" }}>
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
        <Sidebar items={navItems} activePage={page} onSelect={setPage} open={sidebarOpen} />
        <div style={{ flex: 1, padding: "22px 28px", minWidth: 0 }}>
          {navError && <ErrorBanner message={`תפריט הצד לא נטען (${navError}) — מוצג תפריט ברירת מחדל`} />}
          <PageContent page={page} navItems={navItems} />
        </div>
      </div>
    </div>
  );
}
