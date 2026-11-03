import { apiFetch } from "./client";

// The backend caps catalogue pages at 50 phones.
const MAX_PAGE_SIZE = 50;

export async function searchSmartphones(query, limit = MAX_PAGE_SIZE) {
  const data = await apiFetch(
    `/api/smartphones?q=${encodeURIComponent(query)}&limit=${limit}`
  );

  return data.data;
}

// fresh: skip the short browser cache (e.g. right after an edit).
export async function getSmartphoneById(id, { fresh = false } = {}) {
  return apiFetch(`/api/smartphones/${encodeURIComponent(id)}`, fresh ? { cache: "no-cache" } : {});
}

// sort: "name" (default) | "brand" | "trending" | "new"
export async function getSmartphones({ sort = "name", limit = MAX_PAGE_SIZE, page = 1 } = {}) {
  const params = new URLSearchParams({
    sort,
    limit: String(Math.min(limit, MAX_PAGE_SIZE)),
    page: String(page),
  });
  const data = await apiFetch(`/api/smartphones?${params}`);

  return data.data;
}

// Query parameters accepted by GET /api/smartphones (all optional).
export const CATALOGUE_PARAMS = [
  "q", "sort", "brand_id", "verified", "release_from", "release_to",
  "camera_type", "facing", "ois", "eq_focal_min", "eq_focal_max", "eq_aperture_min", "eq_aperture_max",
  "resolution_min", "sensor_den_min", "sensor_den_max", "variable_aperture", "optical_zoom",
  "video_min_width", "video_min_fps", "page",
];

// Catalogue page: { data, page, limit, total, sort }. `params` is a URLSearchParams or plain object;
// unknown and empty keys are dropped. Camera filters must all be met by one approved camera.
export async function getCatalogue(params, limit = 24, { fresh = false } = {}) {
  const source = params instanceof URLSearchParams ? Object.fromEntries(params) : params;
  const query = new URLSearchParams();

  for (const key of CATALOGUE_PARAMS) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      query.set(key, source[key]);
    }
  }
  query.set("limit", String(Math.min(limit, MAX_PAGE_SIZE)));

  return apiFetch(`/api/smartphones?${query}`, fresh ? { cache: "no-cache" } : {});
}

// Value ranges present in the catalogue, per back camera type (`types`) and for front cameras (`front`).
export async function getCatalogueFacets() {
  return apiFetch("/api/smartphones/facets");
}

// Verified sample photos: { data, page, limit, total }; each photo has thumbUrl/mediumUrl/url and exif* fields.
export async function getSmartphonePhotos(id, page = 1, limit = 12) {
  return apiFetch(
    `/api/smartphones/${encodeURIComponent(id)}/photos?page=${page}&limit=${limit}`
  );
}

// Full details (cameras with video modes) for 2-4 phones, in the order given.
export async function compareSmartphones(ids) {
  return apiFetch(
    `/api/smartphones/compare?ids=${ids.map(encodeURIComponent).join(",")}`
  );
}

// Counts a view; the backend ignores repeats from the same client for 30 minutes.
export async function recordSmartphoneView(id) {
  return apiFetch(`/api/smartphones/${encodeURIComponent(id)}/view`, {
    method: "POST",
  });
}

// Moderator only. Accepts modelName, imageUrl, releaseDate, brandId, buildModels.
// Saving also marks the phone as verified.
export async function updateSmartphone(id, changes) {
  return apiFetch(`/api/smartphones/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// Moderators add verified phones (with an image). If the brand + model or a model code is already
// in the catalogue, the existing phone comes back with `existing: true` instead.
export async function createSmartphone({ brandId, modelName, releaseDate, buildModels, imageUrl }) {
  return apiFetch("/api/smartphones", {
    method: "POST",
    body: JSON.stringify({ brandId, modelName, releaseDate, buildModels, imageUrl }),
  });
}

// Moderator only. Moves cameras, media, reviews, favourites and model codes of `sourceId`
// into `targetId`, then deletes the source. Returns { moved, smartphone }.
export async function mergeSmartphones(targetId, sourceId) {
  return apiFetch(`/api/smartphones/${encodeURIComponent(targetId)}/merge`, {
    method: "POST",
    body: JSON.stringify({ sourceId }),
  });
}

// Admin only. Deletes the phone with its cameras, photos and videos.
export async function deleteSmartphone(id) {
  return apiFetch(`/api/smartphones/${encodeURIComponent(id)}`, { method: "DELETE" });
}
