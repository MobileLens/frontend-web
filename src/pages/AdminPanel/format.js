export function formatDate(value, withTime = false) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function shortId(id) {
  return id ? `${String(id).slice(0, 8)}…` : "—";
}

export function phoneLabel(phone) {
  if (!phone) return "Unknown phone";
  return [phone.brandName, phone.modelName || phone.name].filter(Boolean).join(" ");
}

export function formatNumber(value, unit = "", digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  const factor = 10 ** digits;
  return `${Math.round(Number(value) * factor) / factor}${unit}`;
}

export function errorText(error, fallback = "Something went wrong.") {
  if (!error) return "";
  return error.message || fallback;
}

export const ROLES = ["user", "reviewer", "moderator", "admin"];

export function banState(ban) {
  if (ban.active) return "active";
  if (ban.revokedAt) return "revoked";
  return "expired";
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}
