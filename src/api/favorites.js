import { apiFetch } from "./client";

// Newest first: [{ smartphoneId, addedAt, modelName, brandName, imageUrl, imageThumbUrl, releaseDate, verified }].
export function getFavorites() {
  return apiFetch("/api/favorites");
}

export function addFavorite(smartphoneId) {
  return apiFetch(`/api/favorites/${encodeURIComponent(smartphoneId)}`, {
    method: "POST",
  });
}

export function removeFavorite(smartphoneId) {
  return apiFetch(`/api/favorites/${encodeURIComponent(smartphoneId)}`, {
    method: "DELETE",
  });
}
