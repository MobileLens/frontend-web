import { useState } from "react";
import { banUser, cancelPromotion, deleteUser, setUserRole, unbanUser } from "../../../api/admin";
import { banState, formatDate, ROLES } from "../format";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";

const BAN_DURATIONS = [
  { value: "permanent", label: "Permanent" },
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "custom", label: "Until date…" },
];

const ERROR_MESSAGES = {
  CANNOT_BAN: "This user can't be banned (admins, deleted accounts and yourself are protected).",
  ALREADY_BANNED: "This user already has an active ban.",
  NOT_ELIGIBLE: "This user can't be promoted (deleted or banned).",
  PROMOTION_PENDING: "A promotion offer is already waiting for this user's answer.",
  FORBIDDEN_ROLE_CHANGE: "Only admins can make this role change.",
};

function errorMessage(err) {
  return ERROR_MESSAGES[err.code] || err.message;
}

export default function UserModal({ user, bans, promotion, isAdmin, onClose, onChanged }) {
  const activeBan = bans.find((ban) => ban.active);

  const [role, setRole] = useState(user.role);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("7");
  const [banUntil, setBanUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function run(action, successText) {
    setBusy(true);
    setMessage(null);

    try {
      const result = await action();
      setMessage({ type: "success", text: typeof successText === "function" ? successText(result) : successText });
      onChanged();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleRoleChange(event) {
    event.preventDefault();
    run(
      () => setUserRole(user.id, role),
      (result) =>
        result?.status === "pending"
          ? "Promotion offer sent. The user becomes a reviewer once they accept it."
          : `Role changed from ${result?.previousRole ?? user.role} to ${result?.newRole ?? role}.`
    );
  }

  async function handleBan(event) {
    event.preventDefault();

    let expiresAt = null;
    if (banDuration === "custom") {
      if (!banUntil) {
        setMessage({ type: "error", text: "Pick the date the ban ends." });
        return;
      }
      expiresAt = new Date(banUntil).toISOString();
    } else if (banDuration !== "permanent") {
      expiresAt = new Date(Date.now() + Number(banDuration) * 24 * 60 * 60 * 1000).toISOString();
    }

    const ok = await run(() => banUser(user.id, { reason: banReason.trim(), expiresAt }), "User banned. Their sessions were signed out.");
    if (ok) setBanReason("");
  }

  function handleUnban() {
    if (!window.confirm(`Lift the ban for ${user.name}?`)) return;
    run(() => unbanUser(user.id), "Ban lifted.");
  }

  function handleCancelPromotion() {
    run(() => cancelPromotion(promotion.id), "Promotion offer cancelled.");
  }

  async function handleDelete() {
    const confirmation = user.username || user.email;
    const typed = window.prompt(
      `This anonymizes the account and permanently deletes all of their reviews, media and comments.\n\nType "${confirmation}" to confirm.`
    );
    if (typed !== confirmation) {
      if (typed !== null) setMessage({ type: "error", text: "Confirmation didn't match; nothing was deleted." });
      return;
    }

    setBusy(true);
    try {
      await deleteUser(user.id);
      onChanged();
      onClose();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
      setBusy(false);
    }
  }

  // Moderators may only offer user -> reviewer; everything else is admin-only.
  const roleOptions = isAdmin ? ROLES : user.role === "user" ? ["user", "reviewer"] : [user.role];
  const canBan = isAdmin && !user.isDeleted && user.role !== "admin";

  return (
    <Modal
      title={user.name || "User"}
      subtitle={user.username ? `@${user.username}` : undefined}
      onClose={onClose}
      size="md"
    >
      {message && (
        <div className={message.type === "error" ? "admin-error" : "admin-success"} role="status">
          {message.text}
        </div>
      )}

      <dl className="detail-list">
        <div><dt>E-mail</dt><dd>{user.email || "—"}</dd></div>
        <div><dt>Role</dt><dd><StatusBadge status={user.role} /></dd></div>
        <div>
          <dt>Status</dt>
          <dd>
            {user.isDeleted ? <StatusBadge status="deleted" /> : activeBan ? <StatusBadge status="banned" /> : <StatusBadge status="active" tone="success" />}
          </dd>
        </div>
        <div><dt>Joined</dt><dd>{formatDate(user.createdAt, true)}</dd></div>
        <div><dt>User ID</dt><dd className="cell-mono">{user.id}</dd></div>
      </dl>

      {user.isDeleted ? (
        <p className="editor-note">This account has been deleted. No further actions are available.</p>
      ) : (
        <>
          <section className="modal-section">
            <h4 className="detail-heading">Role</h4>
            <form className="inline-form" onSubmit={handleRoleChange}>
              <select className="editor-input" value={role} onChange={(event) => setRole(event.target.value)} disabled={busy || roleOptions.length < 2}>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-fixed" disabled={busy || role === user.role}>
                Apply
              </button>
            </form>
            {user.role === "user" && role === "reviewer" && (
              <p className="editor-note">Promoting to reviewer sends an offer that the user has to accept.</p>
            )}
            {promotion && (
              <div className="promotion-row">
                <span>
                  Pending reviewer offer since {formatDate(promotion.createdAt)}
                </span>
                <button type="button" className="btn btn-outline btn-sm btn-fixed" onClick={handleCancelPromotion} disabled={busy}>
                  Cancel offer
                </button>
              </div>
            )}
          </section>

          {isAdmin && (
            <section className="modal-section">
              <h4 className="detail-heading">Ban</h4>
              {activeBan ? (
                <div className="ban-active">
                  <p>
                    <strong>Banned</strong> {formatDate(activeBan.createdAt, true)}
                    {activeBan.expiresAt ? `, until ${formatDate(activeBan.expiresAt, true)}` : ", permanently"}.
                  </p>
                  <p className="ban-reason">{activeBan.reason}</p>
                  <button type="button" className="btn btn-success btn-fixed" onClick={handleUnban} disabled={busy}>
                    Lift ban
                  </button>
                </div>
              ) : canBan ? (
                <form className="ban-form" onSubmit={handleBan}>
                  <textarea
                    className="editor-input"
                    rows={2}
                    maxLength={500}
                    placeholder="Reason (shown to the user)"
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    required
                  />
                  <div className="inline-form">
                    <select className="editor-input" value={banDuration} onChange={(event) => setBanDuration(event.target.value)}>
                      {BAN_DURATIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {banDuration === "custom" && (
                      <input
                        type="datetime-local"
                        className="editor-input"
                        value={banUntil}
                        onChange={(event) => setBanUntil(event.target.value)}
                        aria-label="Ban ends"
                      />
                    )}
                    <button type="submit" className="btn btn-danger btn-fixed" disabled={busy || !banReason.trim()}>
                      Ban user
                    </button>
                  </div>
                </form>
              ) : (
                <p className="editor-note">Admins can't be banned.</p>
              )}

              {bans.length > 0 && (
                <ul className="ban-history">
                  {bans.map((ban) => (
                    <li key={ban.id}>
                      <StatusBadge status={banState(ban)} />
                      <span>{formatDate(ban.createdAt)}</span>
                      <span className="cell-clamp">{ban.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {isAdmin && (
            <section className="modal-section modal-section-danger">
              <h4 className="detail-heading">Danger zone</h4>
              <div className="promotion-row">
                <span>Delete the account and all of its reviews, media and comments.</span>
                <button type="button" className="btn btn-danger btn-fixed" onClick={handleDelete} disabled={busy}>
                  Delete account
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </Modal>
  );
}
