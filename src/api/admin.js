import { apiFetch } from "./client";

export function getPendingReviews() {
  return apiFetch("/api/reviews/pending");
}

// Admin only.
export function getHiddenReviews() {
  return apiFetch("/api/reviews/hidden");
}

export function getAdminUsers() {
  return apiFetch("/api/admin/users");
}

// { photos: [...], videos: [...] } with signed, one-hour URLs.
export function getPendingMedia() {
  return apiFetch("/api/admin/media/pending");
}

// kind: "photos" | "videos"; status: "verified" | "deleted" (deleted removes the file).
export function reviewMedia(kind, id, status) {
  return apiFetch(`/api/admin/media/${kind}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Each camera comes with `phone` (brand/model summary), `samples` and `videoModes`.
export function getPendingCameras() {
  return apiFetch("/api/cameras/pending");
}

export function reviewCamera(id, status) {
  return apiFetch(`/api/cameras/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getPhones() {
  return apiFetch("/api/smartphones");
}

export function getAdminStats() {
  return apiFetch("/api/admin/stats");
}

export function getAdminDashboard() {
  return apiFetch("/api/admin/dashboard");
}

// Admin only.
export function getAdminBans() {
  return apiFetch("/api/admin/bans");
}

export function getPromotionOffers() {
  return apiFetch("/api/admin/promotions");
}
