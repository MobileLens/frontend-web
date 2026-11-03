import { Fragment, useState } from "react";
import {
  banUser,
  cancelPromotionOffer,
  changeUserRole,
  deleteUser,
  getAdminBans,
  getAdminUsers,
  getPromotionOffers,
  getRoleLog,
  unbanUser,
} from "../../api/admin";
import { DataTable, EmptyNote, Field, LoadState, Pager, Section } from "./adminUi";
import { ROLES, ROLE_LABELS, errorText, formatDate, formatDateTime, useAdminData } from "./adminUtils";

const PAGE_SIZE = 25;
const DAY_MS = 24 * 60 * 60 * 1000;
const none = () => Promise.resolve([]);

const BAN_DURATIONS = [
  ["1", "1 day"],
  ["7", "7 days"],
  ["30", "30 days"],
  ["permanent", "Permanent"],
  ["custom", "Until a date…"],
];

const PROMOTION_STATUS = {
  pending: "Waiting for answer",
  accepted: "Accepted",
  rejected: "Declined",
  cancelled: "Cancelled",
};

function banStatus(ban) {
  if (ban.active) return "Active";
  if (ban.revokedAt) return `Lifted ${formatDate(ban.revokedAt)}`;
  return "Expired";
}

function BanForm({ user, onBanned, onCancel }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7");
  const [until, setUntil] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!reason.trim()) {
      setError("Give a reason; the user will see it.");
      return;
    }

    let expiresAt = null;

    if (duration === "custom") {
      // End of the chosen day, local time.
      const end = until ? new Date(`${until}T23:59:59`) : null;
      if (!end || end <= new Date()) {
        setError("Choose a date in the future.");
        return;
      }
      expiresAt = end.toISOString();
    } else if (duration !== "permanent") {
      expiresAt = new Date(Date.now() + Number(duration) * DAY_MS).toISOString();
    }

    setSaving(true);
    setError("");

    try {
      await banUser(user.id, { reason: reason.trim(), expiresAt });
      onBanned();
    } catch (err) {
      setError(errorText(err, "Could not ban the user."));
      setSaving(false);
    }
  }

  return (
    <form className="ui-form admin-panel-box" onSubmit={handleSubmit}>
      <p className="admin-hint">
        Banning signs {user.name} out on all devices and cancels any pending reviewer offer.
      </p>
      <div className="admin-form-grid">
        <Field label="Reason" hint="Max 500 characters.">
          <textarea className="ui-input" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <Field label="Duration">
          <select className="ui-select" value={duration} onChange={(event) => setDuration(event.target.value)}>
            {BAN_DURATIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {duration === "custom" && (
            <input className="ui-input" type="date" aria-label="Ban ends on" value={until} onChange={(event) => setUntil(event.target.value)} />
          )}
        </Field>
      </div>

      {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}

      <div className="ui-actions">
        <button type="submit" className="ui-btn ui-btn-small ui-btn-danger" disabled={saving}>
          {saving ? "Banning…" : `Ban ${user.name}`}
        </button>
        <button type="button" className="ui-btn ui-btn-small" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

export default function UsersTab({ currentUser, isAdmin, notify, onChanged }) {
  const users = useAdminData(getAdminUsers);
  const bans = useAdminData(isAdmin ? getAdminBans : none);
  const promotions = useAdminData(getPromotionOffers);
  const roleLog = useAdminData(isAdmin ? getRoleLog : none);

  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [banningId, setBanningId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const names = new Map((users.data || []).map((user) => [user.id, user.username ? `${user.name} (@${user.username})` : user.name]));
  const nameOf = (id) => (id ? names.get(id) || "Unknown user" : "—");

  const activeBans = new Map((bans.data || []).filter((ban) => ban.active).map((ban) => [ban.userId, ban]));
  const pendingOffers = new Map(
    (promotions.data || []).filter((offer) => offer.status === "pending").map((offer) => [offer.userId, offer])
  );

  function refreshAll() {
    users.reload();
    bans.reload();
    promotions.reload();
    roleLog.reload();
    onChanged();
  }

  async function run(userId, action, successText, failText) {
    setBusyId(userId);

    try {
      const result = await action();
      notify(typeof successText === "function" ? successText(result) : successText);
      refreshAll();
    } catch (err) {
      notify(errorText(err, failText), "error");
    } finally {
      setBusyId(null);
    }
  }

  function setRole(user, role) {
    if (role === user.role) return;

    const promotion = user.role === "user" && role === "reviewer";
    const question = promotion
      ? `Offer ${user.name} the reviewer role? They have to accept it.`
      : `Change ${user.name} from ${ROLE_LABELS[user.role]} to ${ROLE_LABELS[role]}?`;
    if (!window.confirm(question)) return;

    run(
      user.id,
      () => changeUserRole(user.id, role),
      (result) => (result?.status === "pending" ? `Sent ${user.name} a reviewer offer.` : `${user.name} is now ${ROLE_LABELS[role]}.`),
      "Could not change the role.",
    );
  }

  function unban(user) {
    if (!window.confirm(`Lift the ban on ${user.name}?`)) return;
    run(user.id, () => unbanUser(user.id), `Lifted the ban on ${user.name}.`, "Could not lift the ban.");
  }

  function remove(user) {
    if (!window.confirm(`Delete ${user.name}'s account? Their profile is anonymised and their reviews are deleted. This cannot be undone.`)) return;
    run(user.id, () => deleteUser(user.id), `Deleted ${user.name}'s account.`, "Could not delete the account.");
  }

  function cancelOffer(offer) {
    if (!window.confirm(`Withdraw the reviewer offer for ${offer.userName}?`)) return;
    run(offer.userId, () => cancelPromotionOffer(offer.id), "Offer withdrawn.", "Could not withdraw the offer.");
  }

  const query = filter.trim().toLowerCase();
  const visible = (users.data || [])
    .filter((user) => showDeleted || !user.isDeleted)
    .filter((user) => !roleFilter || user.role === roleFilter)
    .filter((user) => !query || [user.name, user.username, user.email].some((value) => value?.toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function userActions(user) {
    if (user.isDeleted) return null;

    const self = user.id === currentUser?.id;
    const banned = activeBans.has(user.id);
    const busy = busyId === user.id;

    if (!isAdmin) {
      // Moderators can only offer the reviewer role.
      if (user.role !== "user" || banned || pendingOffers.has(user.id)) return null;
      return (
        <button type="button" className="ui-btn ui-btn-small" disabled={busy} onClick={() => setRole(user, "reviewer")}>
          Offer reviewer role
        </button>
      );
    }

    if (self) return <span className="admin-hint">You</span>;

    return (
      <>
        <select
          className="ui-select admin-role-select"
          aria-label={`Role of ${user.name}`}
          value={user.role}
          disabled={busy}
          onChange={(event) => setRole(user, event.target.value)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
        {banned ? (
          <button type="button" className="ui-btn ui-btn-small" disabled={busy} onClick={() => unban(user)}>Unban</button>
        ) : (
          user.role !== "admin" && (
            <button type="button" className="ui-btn ui-btn-small" disabled={busy} onClick={() => setBanningId(user.id)}>Ban</button>
          )
        )}
        <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={busy} onClick={() => remove(user)}>Delete</button>
      </>
    );
  }

  function userStatus(user) {
    if (user.isDeleted) return "Deleted";
    const ban = activeBans.get(user.id);
    if (ban) return <span className="admin-danger-text">Banned {ban.expiresAt ? `until ${formatDate(ban.expiresAt)}` : "permanently"}</span>;
    if (pendingOffers.has(user.id)) return "Reviewer offer sent";
    return "Active";
  }

  return (
    <>
      <Section title="Accounts" count={users.data ? visible.length : undefined}>
        <div className="admin-toolbar">
          <input
            className="ui-input"
            type="search"
            placeholder="Name, username or e-mail…"
            aria-label="Filter users"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="ui-select"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>
          <label className="ui-check">
            <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />
            Show deleted
          </label>
        </div>

        {!isAdmin && (
          <p className="admin-hint admin-section-intro">
            Moderators can offer users the reviewer role. Other role changes, bans and deletions are for admins.
          </p>
        )}

        <LoadState loading={users.loading} error={users.error} errorMessage="Could not load users." />
        {users.data && visible.length === 0 && <EmptyNote>No users match.</EmptyNote>}

        {pageRows.length > 0 && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((user) => (
                  <Fragment key={user.id}>
                    <tr className={user.isDeleted ? "admin-row-muted" : ""}>
                      <td>
                        <div className="admin-list-title">{user.name}</div>
                        <div className="admin-meta">
                          {user.username && `@${user.username} · `}{user.email}
                        </div>
                      </td>
                      <td>{ROLE_LABELS[user.role] || user.role}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{userStatus(user)}</td>
                      <td><div className="ui-actions admin-table-actions">{userActions(user)}</div></td>
                    </tr>
                    {banningId === user.id && (
                      <tr>
                        <td colSpan={5}>
                          <BanForm
                            user={user}
                            onCancel={() => setBanningId(null)}
                            onBanned={() => {
                              setBanningId(null);
                              notify(`Banned ${user.name}.`);
                              refreshAll();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pager page={currentPage} totalPages={totalPages} onChange={setPage} />
      </Section>

      <Section title="Reviewer offers">
        <LoadState loading={promotions.loading} error={promotions.error} errorMessage="Could not load offers." />
        {promotions.data && (
          <DataTable
            rows={promotions.data}
            emptyMessage="No offers yet."
            columns={[
              { key: "userName", label: "User" },
              { key: "offeredBy", label: "Offered by", render: (row) => nameOf(row.offeredBy) },
              { key: "createdAt", label: "Sent", render: (row) => formatDateTime(row.createdAt) },
              {
                key: "status",
                label: "Status",
                render: (row) => PROMOTION_STATUS[row.status] + (row.respondedAt ? ` (${formatDate(row.respondedAt)})` : ""),
              },
              {
                key: "actions",
                label: "",
                render: (row) =>
                  row.status === "pending" && (isAdmin || row.offeredBy === currentUser?.id) && (
                    <button type="button" className="ui-btn ui-btn-small" disabled={busyId === row.userId} onClick={() => cancelOffer(row)}>
                      Withdraw
                    </button>
                  ),
              },
            ]}
          />
        )}
      </Section>

      {isAdmin && (
        <>
          <Section title="Bans">
            <LoadState loading={bans.loading} error={bans.error} errorMessage="Could not load bans." />
            {bans.data && (
              <DataTable
                rows={bans.data}
                emptyMessage="No bans yet."
                columns={[
                  { key: "userName", label: "User" },
                  { key: "reason", label: "Reason" },
                  { key: "bannedBy", label: "By", render: (row) => nameOf(row.bannedBy) },
                  { key: "createdAt", label: "Banned", render: (row) => formatDateTime(row.createdAt) },
                  { key: "expiresAt", label: "Ends", render: (row) => (row.expiresAt ? formatDateTime(row.expiresAt) : "Never") },
                  { key: "status", label: "Status", render: banStatus },
                  {
                    key: "actions",
                    label: "",
                    render: (row) =>
                      row.active && (
                        <button
                          type="button"
                          className="ui-btn ui-btn-small"
                          disabled={busyId === row.userId}
                          onClick={() => unban({ id: row.userId, name: row.userName })}
                        >
                          Unban
                        </button>
                      ),
                  },
                ]}
              />
            )}
          </Section>

          <Section title="Role changes">
            <LoadState loading={roleLog.loading} error={roleLog.error} errorMessage="Could not load the role log." />
            {roleLog.data && (
              <DataTable
                rows={[...roleLog.data].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))}
                emptyMessage="No role changes yet."
                columns={[
                  { key: "targetId", label: "User", render: (row) => nameOf(row.targetId) },
                  {
                    key: "change",
                    label: "Change",
                    render: (row) => `${ROLE_LABELS[row.previousRole] || row.previousRole} → ${ROLE_LABELS[row.newRole] || row.newRole}`,
                  },
                  { key: "changedBy", label: "By", render: (row) => nameOf(row.changedBy) },
                  { key: "changedAt", label: "When", render: (row) => formatDateTime(row.changedAt) },
                ]}
              />
            )}
          </Section>
        </>
      )}
    </>
  );
}
