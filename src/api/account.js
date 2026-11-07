import { siteUrl } from "./auth";
import { apiFetch } from "./client";

// better-auth: { session, user } for a valid token, null otherwise. user carries `role` and `username`.
export function getSession() {
  return apiFetch("/api/auth/get-session");
}

// The site shows one username; the backend's required `name` (shown on reviews) keeps the same value.
export function updateUsername(username) {
  return apiFetch("/api/auth/update-user", {
    method: "POST",
    body: JSON.stringify({ name: username, username }),
  });
}

// An unverified address changes at once; a verified one only after the link sent to it is opened.
export function changeEmail(newEmail) {
  return apiFetch("/api/auth/change-email", {
    method: "POST",
    body: JSON.stringify({ newEmail, callbackURL: siteUrl("/account") }),
  });
}

// Signing out other devices issues a new session token (returned as `token`).
export function changePassword({ currentPassword, newPassword }) {
  return apiFetch("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
  });
}

// Pending offer to become a reviewer, or null.
export function getPromotionOffer() {
  return apiFetch("/api/account/promotion");
}

// decision: "accept" | "reject"
export function answerPromotionOffer(id, decision) {
  return apiFetch(`/api/account/promotion/${encodeURIComponent(id)}/${decision}`, {
    method: "POST",
  });
}

// All personal data as JSON (GDPR export).
export function exportAccountData() {
  return apiFetch("/api/account/export");
}

// Anonymises the account and signs out all its sessions.
export function deleteAccount() {
  return apiFetch("/api/account", { method: "DELETE" });
}
