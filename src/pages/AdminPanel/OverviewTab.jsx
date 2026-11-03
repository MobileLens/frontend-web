import { Link } from "react-router-dom";
import { DataTable, Section, StatCard } from "./adminUi";
import { formatDateTime } from "./adminUtils";

const STATS = [
  ["visitsLast24h", "Visits (24 h)"],
  ["visitsLastWeek", "Visits (7 days)"],
  ["activeUsers", "Active users (30 days)"],
  ["registrationsLast30Days", "Sign-ups (30 days)"],
  ["publishedReviews", "Published reviews"],
  ["pendingReviews", "Reviews to verify"],
  ["phonesInDatabase", "Phones"],
  ["pendingSubmissions", "Cameras to verify"],
  ["databaseSubmissions", "Camera submissions"],
  ["activeBans", "Active bans"],
  ["totalBans", "All bans"],
];

const reviewColumns = [
  {
    key: "title",
    label: "Review",
    render: (row) => <Link className="text-link" to={`/review/${row.id}`}>{row.title}</Link>,
  },
  { key: "authorName", label: "Author" },
  { key: "updatedAt", label: "Updated", render: (row) => formatDateTime(row.updatedAt) },
];

const banColumns = [
  { key: "userName", label: "User" },
  { key: "reason", label: "Reason" },
  { key: "createdAt", label: "Banned", render: (row) => formatDateTime(row.createdAt) },
  { key: "active", label: "Status", render: (row) => (row.active ? "Active" : "Ended") },
];

export default function OverviewTab({ dashboard, isAdmin, onOpenTab }) {
  if (!dashboard) return null;

  const openButton = (tab, label) => (
    <button type="button" className="ui-btn ui-btn-small" onClick={() => onOpenTab(tab)}>{label}</button>
  );

  return (
    <>
      <Section title="Statistics">
        <div className="stats-grid">
          {STATS.map(([key, title]) => (
            <StatCard key={key} title={title} value={dashboard.stats?.[key]} />
          ))}
        </div>
      </Section>

      <Section title="Reviews waiting for verification" actions={openButton("reviews", "Open queue")}>
        <DataTable
          columns={reviewColumns}
          rows={dashboard.reviewSubmissions}
          emptyMessage="No reviews are waiting."
        />
      </Section>

      {isAdmin && (
        <>
          <Section title="Recent bans" actions={openButton("users", "Manage users")}>
            <DataTable columns={banColumns} rows={dashboard.recentBans} emptyMessage="No bans yet." />
          </Section>

          <Section title="Recently hidden reviews" actions={openButton("reviews", "All hidden reviews")}>
            <DataTable columns={reviewColumns} rows={dashboard.hiddenReviews} emptyMessage="No hidden reviews." />
          </Section>
        </>
      )}
    </>
  );
}
