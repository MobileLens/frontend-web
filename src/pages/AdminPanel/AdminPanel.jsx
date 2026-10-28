import { useCallback, useState } from "react";
import { getAdminDashboard, getPendingMedia } from "../../api/admin";
import { useAsyncData } from "./useAsyncData";
import Icon from "./components/Icon";
import OverviewTab from "./tabs/OverviewTab";
import CameraSubmissionsTab from "./tabs/CameraSubmissionsTab";
import PhoneEditorTab from "./tabs/PhoneEditorTab";
import MediaTab from "./tabs/MediaTab";
import ReviewsTab from "./tabs/ReviewsTab";
import UsersTab from "./tabs/UsersTab";
import "./AdminPanel.css";

const TABS = [
  { id: "overview", label: "Overview & Stats", icon: "overview", component: OverviewTab },
  { id: "cameras", label: "Camera Submissions", icon: "camera", component: CameraSubmissionsTab, badge: "cameras" },
  { id: "editor", label: "Phone & Camera Editor", icon: "editor", component: PhoneEditorTab },
  { id: "images", label: "Image & Sample Manager", icon: "images", component: MediaTab, badge: "media" },
  { id: "reviews", label: "Review Moderation", icon: "reviews", component: ReviewsTab, badge: "reviews" },
  { id: "users", label: "Users & Bans", icon: "users", component: UsersTab },
];

async function loadShell() {
  const [dashboard, media] = await Promise.all([
    getAdminDashboard(),
    getPendingMedia().catch(() => null),
  ]);

  return { dashboard, media };
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const shell = useAsyncData(loadShell);
  const refreshCounts = shell.reload;

  const handleChanged = useCallback(() => refreshCounts(), [refreshCounts]);

  const status = shell.error?.status;
  if (status === 401 || status === 403) {
    return (
      <div className="forbidden-wrapper">
        <h2 className="forbidden-title">Access denied</h2>
        <p className="forbidden-text">
          {status === 401
            ? "Log in with a moderator or admin account to use the admin panel."
            : "You do not have permission to access the admin panel."}
        </p>
        <a href={status === 401 ? "/login" : "/"} className="btn btn-primary forbidden-link">
          {status === 401 ? "Log in" : "Return to Home"}
        </a>
      </div>
    );
  }

  const dashboard = shell.data?.dashboard;
  const stats = dashboard?.stats;
  // recentBans is null for moderators and an array for admins.
  const isAdmin = Array.isArray(dashboard?.recentBans);
  const media = shell.data?.media;

  const counts = {
    cameras: stats?.pendingSubmissions,
    reviews: stats?.pendingReviews,
    media: media ? (media.photos?.length || 0) + (media.videos?.length || 0) : undefined,
  };

  const ActiveComponent = TABS.find((tab) => tab.id === activeTab).component;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav className="admin-sidebar-nav" aria-label="Admin sections">
          {TABS.map((tab) => {
            const count = tab.badge ? counts[tab.badge] : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                className={`admin-sidebar-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <Icon name={tab.icon} />
                <span className="admin-sidebar-label">{tab.label}</span>
                {count > 0 && <span className="admin-badge">{count}</span>}
              </button>
            );
          })}
        </nav>

        {dashboard && (
          <div className="admin-sidebar-role">
            Signed in as <strong>{isAdmin ? "admin" : "moderator"}</strong>
          </div>
        )}
      </aside>

      <main className="admin-main">
        <h1 className="admin-header">{TABS.find((tab) => tab.id === activeTab).label}</h1>

        {shell.loading && !dashboard && <div className="admin-loading">Loading panel data…</div>}
        {shell.error && !dashboard && (
          <div className="admin-error" role="alert">
            Could not load the admin panel: {shell.error.message}
          </div>
        )}

        {dashboard && (
          <ActiveComponent
            key={activeTab}
            isAdmin={isAdmin}
            stats={stats}
            dashboard={dashboard}
            counts={counts}
            onChanged={handleChanged}
          />
        )}
      </main>
    </div>
  );
}
