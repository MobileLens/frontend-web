import { apiFetch } from "./client";

// [{ id, name, logoUrl }], alphabetical. fresh: skip the five-minute browser cache (after an edit).
export function getBrands({ fresh = false } = {}) {
  return apiFetch("/api/brands", fresh ? { cache: "no-cache" } : {});
}

// Moderator only.
export function createBrand({ name, logoUrl }) {
  return apiFetch("/api/brands", {
    method: "POST",
    body: JSON.stringify({ name, logoUrl: logoUrl || undefined }),
  });
}

// Moderator only. Accepts name and logoUrl.
export function updateBrand(id, changes) {
  return apiFetch(`/api/brands/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// Admin only. Fails while any phone still belongs to the brand.
export function deleteBrand(id) {
  return apiFetch(`/api/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
}
