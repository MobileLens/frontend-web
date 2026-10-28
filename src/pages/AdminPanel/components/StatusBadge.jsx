const TONES = {
  pending: "warning",
  draft: "neutral",
  published: "success",
  hidden: "danger",
  approved: "success",
  rejected: "danger",
  verified: "success",
  banned: "danger",
  deleted: "neutral",
  active: "danger",
  expired: "neutral",
  revoked: "neutral",
  admin: "info",
  moderator: "info",
  reviewer: "info",
  user: "neutral",
};

export default function StatusBadge({ status, label, tone }) {
  const resolvedTone = tone || TONES[status] || "neutral";

  return (
    <span className={`status-badge status-badge-${resolvedTone}`}>
      {label || String(status || "—").replace(/_/g, " ")}
    </span>
  );
}
