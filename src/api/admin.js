import { apiFetch } from "./client";

// Moderator and admin endpoints. Lists are read with `cache: "no-cache"` so a change made
// a moment ago is never hidden behind a cached response.
const FRESH = { cache: "no-cache" };

// Stats plus the five newest pending reviews; recentBans and hiddenReviews are null for moderators.
export function getAdminDashboard() {
  return apiFetch("/api/admin/dashboard", FRESH);
}

// Users

// [{ id, name, email, username, role, createdAt, isDeleted }]
export function getAdminUsers() {
  return apiFetch("/api/admin/users", FRESH);
}

// user -> reviewer sends the user an offer to accept (202, { status: "pending" });
// any other change is admin only and takes effect at once.
export function changeUserRole(userId, role) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// Admin only. Anonymises the account and removes the user's reviews.
export function deleteUser(userId) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

// Admin only. expiresAt: ISO date in the future, or null for a permanent ban.
export function banUser(userId, { reason, expiresAt = null }) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
    method: "POST",
    body: JSON.stringify({ reason, expiresAt }),
  });
}

// Admin only. Lifts the user's active ban.
export function unbanUser(userId) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, { method: "DELETE" });
}

// Admin only. Newest first, each with `active`.
export function getAdminBans(limit = 100) {
  return apiFetch(`/api/admin/bans?limit=${limit}`, FRESH);
}

// Reviewer offers, newest first (max 100).
export function getPromotionOffers() {
  return apiFetch("/api/admin/promotions", FRESH);
}

// Only the moderator who made the offer, or an admin.
export function cancelPromotionOffer(offerId) {
  return apiFetch(`/api/admin/promotions/${encodeURIComponent(offerId)}`, { method: "DELETE" });
}

// Admin only. [{ id, targetId, previousRole, newRole, changedAt, changedBy }]
export function getRoleLog() {
  return apiFetch("/api/admin/role-log", FRESH);
}

// Reviews

// Oldest first, as excerpts.
export function getPendingReviews() {
  return apiFetch("/api/reviews/pending?summary=1", FRESH);
}

// Admin only. Newest first, as excerpts.
export function getHiddenReviews() {
  return apiFetch("/api/reviews/hidden?summary=1", FRESH);
}

// Camera submissions

// Each camera comes with `phone` (brand/model summary), `samples` and `videoModes`.
export function getPendingCameras() {
  return apiFetch("/api/cameras/pending", FRESH);
}

// status: "approved" | "rejected". An approval can carry corrected spec fields and a full `videoModes` list.
export function reviewCamera(cameraId, status, corrections = {}) {
  return apiFetch(`/api/cameras/${encodeURIComponent(cameraId)}/review`, {
    method: "PATCH",
    body: JSON.stringify({ ...corrections, status }),
  });
}

// Sample photos and videos

// { photos: [...], videos: [...] } with signed, one-hour URLs.
export function getPendingMedia() {
  return apiFetch("/api/admin/media/pending", FRESH);
}

// kind: "photos" | "videos"; status: "verified" | "deleted" (deleted removes the file).
export function reviewMedia(kind, id, status) {
  return apiFetch(`/api/admin/media/${kind}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Photos: exifFocalLength, exifAperture, exifIso, exifShutterSpeed, exifDigitalZoom, widthPx, heightPx.
// Videos: widthPx, heightPx, fps.
export function updateMediaMetadata(kind, id, changes) {
  return apiFetch(`/api/admin/media/${kind}/${encodeURIComponent(id)}/metadata`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// Returns { storageUrl, url, ... }; pass storageUrl as a phone's imageUrl.
export function uploadDeviceImage(file) {
  const form = new FormData();
  form.append("file", file);

  return apiFetch("/api/upload/device-image/upload", { method: "POST", body: form });
}
