import { useCallback, useMemo, useState } from "react";
import { getAdminBans, getAdminUsers, getPromotionOffers } from "../../../api/admin";
import { useAsyncData } from "../useAsyncData";
import { asArray, banState, formatDate, ROLES } from "../format";
import DataTable from "../components/DataTable";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import UserModal from "./UserModal";

export default function UsersTab({ isAdmin, onChanged }) {
  const loader = useCallback(async () => {
    const [users, bans, promotions] = await Promise.all([
      getAdminUsers(),
      isAdmin ? getAdminBans(100).catch(() => []) : Promise.resolve([]),
      getPromotionOffers().catch(() => []),
    ]);
    return { users: asArray(users), bans: asArray(bans), promotions: asArray(promotions) };
  }, [isAdmin]);

  const { data, loading, error, reload } = useAsyncData(loader);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openUserId, setOpenUserId] = useState(null);

  const bannedIds = useMemo(
    () => new Set((data?.bans || []).filter((ban) => ban.active).map((ban) => ban.userId)),
    [data]
  );

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (data?.users || []).filter((user) => {
      if (roleFilter === "banned") return bannedIds.has(user.id);
      if (roleFilter === "deleted") return user.isDeleted;
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!needle) return true;
      return [user.name, user.username, user.email].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [data, query, roleFilter, bannedIds]);

  const userColumns = [
    {
      key: "name",
      label: "User",
      render: (row) => (
        <div className="cell-stack">
          <span className="cell-strong">{row.name || "—"}</span>
          {row.username && <span className="cell-muted">@{row.username}</span>}
        </div>
      ),
    },
    { key: "email", label: "E-mail" },
    { key: "role", label: "Role", render: (row) => <StatusBadge status={row.role} /> },
    {
      key: "status",
      label: "Status",
      render: (row) =>
        row.isDeleted ? (
          <StatusBadge status="deleted" />
        ) : bannedIds.has(row.id) ? (
          <StatusBadge status="banned" />
        ) : (
          <StatusBadge status="active" label="active" tone="success" />
        ),
    },
    { key: "createdAt", label: "Joined", render: (row) => formatDate(row.createdAt) },
  ];

  const banColumns = [
    { key: "userName", label: "User", render: (row) => <span className="cell-strong">{row.userName || "—"}</span> },
    { key: "reason", label: "Reason", render: (row) => <span className="cell-clamp">{row.reason}</span> },
    { key: "createdAt", label: "Banned", render: (row) => formatDate(row.createdAt) },
    { key: "expiresAt", label: "Expires", render: (row) => (row.expiresAt ? formatDate(row.expiresAt, true) : "Never") },
    { key: "state", label: "Status", render: (row) => <StatusBadge status={banState(row)} /> },
  ];

  const openUser = data?.users.find((user) => user.id === openUserId);
  const handleClose = useCallback(() => setOpenUserId(null), []);

  function handleChanged() {
    reload();
    onChanged();
  }

  return (
    <>
      {error && <div className="admin-error" role="alert">Could not load users: {error.message}</div>}

      <section className="admin-section">
        <div className="admin-section-title">
          <span>
            Users <span className="admin-badge">{data?.users.length ?? 0}</span>
          </span>
          <button type="button" className="btn btn-outline btn-sm btn-inline" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>

        <div className="editor-search-bar">
          <input
            type="search"
            className="editor-input"
            placeholder="Search by name, username or e-mail…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search users"
          />
          <select
            className="editor-input select-fixed"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter users"
          >
            <option value="all">All users</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}s</option>
            ))}
            {isAdmin && <option value="banned">Banned</option>}
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {loading && !data ? (
          <p className="admin-empty">Loading users…</p>
        ) : (
          <DataTable
            columns={userColumns}
            rows={filteredUsers}
            emptyMessage="No users match the filters."
            onRowClick={(row) => setOpenUserId(row.id)}
          />
        )}
      </section>

      {isAdmin && (
        <section className="admin-section">
          <h3 className="admin-section-title">Recent bans</h3>
          <DataTable
            columns={banColumns}
            rows={data?.bans}
            emptyMessage="No bans."
            onRowClick={(row) => setOpenUserId(row.userId)}
          />
        </section>
      )}

      {openUser && (
        <UserModal
          user={openUser}
          bans={data.bans.filter((ban) => ban.userId === openUser.id)}
          promotion={data.promotions.find((offer) => offer.userId === openUser.id && offer.status === "pending")}
          isAdmin={isAdmin}
          onClose={handleClose}
          onChanged={handleChanged}
        />
      )}
    </>
  );
}
