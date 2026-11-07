import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdminDashboard, getPendingCounts } from "../../api/admin";
import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import { useAuth } from "../../context/useAuth";
import BrandsTab from "./BrandsTab";
import CamerasTab from "./CamerasTab";
import MediaTab from "./MediaTab";
import OverviewTab from "./OverviewTab";
import PhonesTab from "./PhonesTab";
import ReviewsTab from "./ReviewsTab";
import UsersTab from "./UsersTab";
import { LoadState } from "./adminUi";
import { ROLE_LABELS, useAdminData } from "./adminUtils";
import "./AdminPanel.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews", badge: (stats) => stats.pendingReviews },
  { id: "cameras", label: "Camera submissions", badge: (stats) => stats.pendingSubmissions },
  { id: "media", label: "Photos & videos", badge: (stats) => (stats.pendingPhotos ?? 0) + (stats.pendingVideos ?? 0) },
  { id: "phones", label: "Phones", badge: (stats) => stats.unverifiedPhones },
  { id: "brands", label: "Brands" },
  { id: "users", label: "Users & bans" },
];

const NOTICE_MS = 5000;

function AccessDenied({ loggedIn }) {
  return (
    <div className="forbidden-wrapper">
      <h1 className="forbidden-title">No access</h1>
      <p className="forbidden-text">
        The admin panel is for moderators and administrators.
      </p>
      <Link to={loggedIn ? "/" : "/login"} className="ui-btn ui-btn-primary">
        {loggedIn ? "Back to home" : "Sign in"}
      </Link>
    </div>
  );
}

export default function AdminPanel() {
  const { currentUser, loading: authLoading, isStaff, isAdmin } = useAuth();

  if (authLoading) {
    return <PageSkeleton />;
  }

  if (!isStaff) {
    return <AccessDenied loggedIn={Boolean(currentUser)} />;
  }

  return <StaffPanel currentUser={currentUser} isAdmin={isAdmin} />;
}

function StaffPanel({ currentUser, isAdmin }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((tab) => tab.id === searchParams.get("tab")) ? searchParams.get("tab") : "overview";

  const dashboard = useAdminData(getAdminDashboard);
  const pendingCounts = useAdminData(getPendingCounts);
  const [notice, setNotice] = useState(null);

  const notify = useCallback((text, type = "success") => {
    setNotice({ text, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function openTab(id) {
    setSearchParams(id === "overview" ? {} : { tab: id });
    window.scrollTo(0, 0);
  }

  // Stats and badges follow whatever a tab just changed.
  const reloadDashboard = dashboard.reload;
  const reloadCounts = pendingCounts.reload;
  const refreshDashboard = useCallback(() => {
    reloadDashboard();
    reloadCounts();
  }, [reloadDashboard, reloadCounts]);

  if (dashboard.error?.status === 401 || dashboard.error?.status === 403) {
    return <AccessDenied loggedIn />;
  }

  const stats = { ...dashboard.data?.stats, ...pendingCounts.data };
  const tabProps = { isAdmin, notify, onChanged: refreshDashboard };

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar" aria-label="Admin panel">
        <div className="admin-sidebar-title">
          {ROLE_LABELS[currentUser.role]} panel
        </div>
        {TABS.map((tab) => {
          const badge = tab.badge?.(stats);

          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-sidebar-btn ${activeTab === tab.id ? "active" : ""}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => openTab(tab.id)}
            >
              <span>{tab.label}</span>
              {badge > 0 && <span className="admin-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <main className="admin-main">
        <h1 className="admin-header">{TABS.find((tab) => tab.id === activeTab).label}</h1>

        {activeTab === "overview" && (
          <>
            <LoadState loading={dashboard.loading} error={dashboard.error} errorMessage="Could not load the dashboard." />
            <OverviewTab dashboard={dashboard.data} stats={stats} isAdmin={isAdmin} onOpenTab={openTab} />
          </>
        )}
        {activeTab === "reviews" && <ReviewsTab {...tabProps} />}
        {activeTab === "cameras" && <CamerasTab {...tabProps} />}
        {activeTab === "media" && <MediaTab {...tabProps} />}
        {activeTab === "phones" && <PhonesTab {...tabProps} />}
        {activeTab === "brands" && <BrandsTab {...tabProps} />}
        {activeTab === "users" && <UsersTab {...tabProps} currentUser={currentUser} />}
      </main>

      {notice && (
        <div
          key={notice.id}
          className={`admin-toast ui-alert ${notice.type === "error" ? "ui-alert-error" : "ui-alert-success"}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button type="button" className="admin-toast-close" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      )}
    </div>
  );
}
