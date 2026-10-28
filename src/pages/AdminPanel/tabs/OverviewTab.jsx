import { useCallback } from "react";
import { getAdminBans, getAdminUsers, getHiddenReviews, getPromotionOffers } from "../../../api/admin";
import { useAsyncData } from "../useAsyncData";
import { asArray } from "../format";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";
import { DonutChart, SimpleBarChart } from "../components/Charts";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7; // Monday = 0
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function weeklyCounts(items, dateKey, weeks = 12) {
  const firstWeek = startOfWeek(new Date(Date.now() - (weeks - 1) * 7 * DAY_MS));
  const buckets = Array.from({ length: weeks }, (_, index) => {
    const start = new Date(firstWeek.getTime() + index * 7 * DAY_MS);
    return {
      start,
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: 0,
    };
  });

  items.forEach((item) => {
    const time = new Date(item[dateKey]).getTime();
    const index = Math.floor((time - firstWeek.getTime()) / (7 * DAY_MS));
    if (index >= 0 && index < weeks) buckets[index].value += 1;
  });

  return buckets;
}

function monthlyCounts(items, dateKey, months = 6) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return {
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString(undefined, { month: "short" }),
      value: 0,
    };
  });

  items.forEach((item) => {
    const date = new Date(item[dateKey]);
    const bucket = buckets.find((b) => b.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  });

  return buckets;
}

const ROLE_ORDER = ["user", "reviewer", "moderator", "admin"];

export default function OverviewTab({ stats, isAdmin, counts }) {
  const loader = useCallback(async () => {
    const [users, hidden, bans, promotions] = await Promise.all([
      getAdminUsers().catch(() => []),
      isAdmin ? getHiddenReviews().catch(() => []) : Promise.resolve(null),
      isAdmin ? getAdminBans(100).catch(() => []) : Promise.resolve(null),
      getPromotionOffers().catch(() => []),
    ]);

    return {
      users: asArray(users),
      hidden: hidden && asArray(hidden),
      bans: bans && asArray(bans),
      promotions: asArray(promotions),
    };
  }, [isAdmin]);

  const { data, loading } = useAsyncData(loader);

  if (!stats) return null;

  const users = data?.users || [];
  const activeAccounts = users.filter((user) => !user.isDeleted);
  const deletedAccounts = users.length - activeAccounts.length;

  const roleData = ROLE_ORDER.map((role) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1) + "s",
    value: activeAccounts.filter((user) => user.role === role).length,
  })).filter((item) => item.value > 0);

  const registrations = weeklyCounts(activeAccounts, "createdAt");

  const reviewData = [
    { name: "Published", value: stats.publishedReviews || 0, color: "#10b981" },
    { name: "Pending", value: stats.pendingReviews || 0, color: "#f59e0b" },
    ...(data?.hidden ? [{ name: "Hidden", value: data.hidden.length, color: "#ef4444" }] : []),
  ];

  const cameraData = [
    { name: "Pending", value: stats.pendingSubmissions || 0, color: "#f59e0b" },
    {
      name: "Reviewed",
      value: Math.max(0, (stats.databaseSubmissions || 0) - (stats.pendingSubmissions || 0)),
      color: "#3b82f6",
    },
  ];

  const avgDailyVisits = stats.visitsLastWeek ? Math.round(stats.visitsLastWeek / 7) : 0;
  const trafficData = [
    { label: "Avg / day (7d)", value: avgDailyVisits },
    { label: "Last 24h", value: stats.visitsLast24h || 0 },
  ];

  const pendingPromotions = (data?.promotions || []).filter((offer) => offer.status === "pending").length;
  const bansByMonth = data?.bans ? monthlyCounts(data.bans, "createdAt") : null;
  const pendingTotal =
    (stats.pendingReviews || 0) + (stats.pendingSubmissions || 0) + (counts?.media || 0);

  return (
    <>
      <section className="admin-section">
        <h3 className="admin-section-title">Needs attention</h3>
        <div className="stats-grid">
          <StatCard title="Pending reviews" value={stats.pendingReviews} tone={stats.pendingReviews ? "warning" : "default"} />
          <StatCard title="Pending cameras" value={stats.pendingSubmissions} tone={stats.pendingSubmissions ? "warning" : "default"} />
          <StatCard title="Pending media" value={counts?.media} tone={counts?.media ? "warning" : "default"} />
          <StatCard title="Total in queue" value={pendingTotal} />
        </div>
      </section>

      <section className="admin-section">
        <h3 className="admin-section-title">Traffic</h3>
        <div className="overview-split">
          <div className="stats-grid stats-grid-compact">
            <StatCard title="Visits (24h)" value={stats.visitsLast24h} />
            <StatCard title="Visits (7 days)" value={stats.visitsLastWeek} />
            <StatCard title="Active users (30d)" value={stats.activeUsers} hint="Users with a session in the last 30 days" />
          </div>
          <ChartCard title="Today vs. weekly average">
            <SimpleBarChart data={trafficData} name="Visits" height={200} />
          </ChartCard>
        </div>
      </section>

      <section className="admin-section">
        <h3 className="admin-section-title">Community</h3>
        <div className="stats-grid">
          <StatCard title="Accounts" value={loading && !data ? "…" : activeAccounts.length} />
          <StatCard title="New (30 days)" value={stats.registrationsLast30Days} />
          <StatCard title="Deleted accounts" value={loading && !data ? "…" : deletedAccounts} />
          <StatCard title="Pending promotions" value={loading && !data ? "…" : pendingPromotions} />
        </div>
        <div className="charts-grid">
          <ChartCard title="Users by role" empty={!roleData.length}>
            <DonutChart data={roleData} />
          </ChartCard>
          <ChartCard title="Registrations per week (12 weeks)" empty={!activeAccounts.length}>
            <SimpleBarChart data={registrations} name="Registrations" color="#8b5cf6" />
          </ChartCard>
        </div>
      </section>

      <section className="admin-section">
        <h3 className="admin-section-title">Content & catalog</h3>
        <div className="stats-grid">
          <StatCard title="Phones in database" value={stats.phonesInDatabase} />
          <StatCard title="Published reviews" value={stats.publishedReviews} />
          <StatCard title="Camera submissions" value={stats.databaseSubmissions} />
          {data?.hidden && <StatCard title="Hidden reviews" value={data.hidden.length} />}
        </div>
        <div className="charts-grid">
          <ChartCard title="Reviews by status" empty={!reviewData.some((item) => item.value)}>
            <DonutChart data={reviewData} />
          </ChartCard>
          <ChartCard title="Camera submissions" empty={!cameraData.some((item) => item.value)}>
            <DonutChart data={cameraData} />
          </ChartCard>
        </div>
      </section>

      {isAdmin && (
        <section className="admin-section">
          <h3 className="admin-section-title">Moderation</h3>
          <div className="overview-split">
            <div className="stats-grid stats-grid-compact">
              <StatCard title="Active bans" value={stats.activeBans} tone={stats.activeBans ? "danger" : "default"} />
              <StatCard title="Bans all-time" value={stats.totalBans} />
            </div>
            <ChartCard title="Bans per month (6 months)" empty={!bansByMonth}>
              {bansByMonth && <SimpleBarChart data={bansByMonth} name="Bans" color="#ef4444" height={200} />}
            </ChartCard>
          </div>
        </section>
      )}
    </>
  );
}
