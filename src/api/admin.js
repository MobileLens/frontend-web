import { apiFetch } from "./client";

function toQuery(params) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

// Dashboard & stats

export function getAdminStats() {
  return apiFetch("/api/admin/stats");
}

export function getAdminDashboard() {
  return apiFetch("/api/admin/dashboard");
}

// Reviews

export function getPendingReviews() {
  return apiFetch("/api/reviews/pending");
}

export function getHiddenReviews() {
  return apiFetch("/api/reviews/hidden");
}

export function getReviewDetail(id) {
  return apiFetch(`/api/reviews/${encodeURIComponent(id)}`);
}

export function setReviewStatus(id, status) {
  return apiFetch(`/api/reviews/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteReview(id) {
  return apiFetch(`/api/reviews/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Users, bans & promotions

export function getAdminUsers() {
  return apiFetch("/api/admin/users");
}

export function getAdminBans(limit = 100) {
  return apiFetch(`/api/admin/bans${toQuery({ limit })}`);
}

export function getPromotionOffers() {
  return apiFetch("/api/admin/promotions");
}

export function cancelPromotion(id) {
  return apiFetch(`/api/admin/promotions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function setUserRole(id, role) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function banUser(id, { reason, expiresAt = null }) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/ban`, {
    method: "POST",
    body: JSON.stringify({ reason, expiresAt }),
  });
}

export function unbanUser(id) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/ban`, {
    method: "DELETE",
  });
}

export function deleteUser(id) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Cameras

export function getPendingCameras() {
  return apiFetch("/api/cameras/pending");
}

export function reviewCamera(id, status) {
  return apiFetch(`/api/cameras/${encodeURIComponent(id)}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateCamera(id, patch) {
  return apiFetch(`/api/cameras/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// Smartphones & brands

export function getSmartphonesPage({ q, page = 1, limit = 20 } = {}) {
  return apiFetch(`/api/smartphones${toQuery({ q, page, limit, sort: "name" })}`);
}

export function updateSmartphone(id, patch) {
  return apiFetch(`/api/smartphones/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export { getBrands } from "./smartphones";

export function uploadDeviceImage(file) {
  const body = new FormData();
  body.append("file", file);

  return apiFetch("/api/upload/device-image/upload", {
    method: "POST",
    body,
  });
}

// Media

export function getPendingMedia() {
  return apiFetch("/api/admin/media/pending");
}

// kind: "photos" | "videos", status: "verified" | "deleted"
export function setMediaStatus(kind, id, status) {
  return apiFetch(`/api/admin/media/${kind}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
