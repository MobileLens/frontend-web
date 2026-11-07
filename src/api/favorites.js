import { cached, invalidateCache } from "./cache";
import { apiFetch } from "./client";

// Newest first: [{ smartphoneId, addedAt, modelName, brandName, imageUrl, imageThumbUrl, releaseDate, verified }].
export function getFavorites() {
  return cached("favorites", () => apiFetch("/api/favorites"));
}

export async function addFavorite(smartphoneId) {
  const result = await apiFetch(`/api/favorites/${encodeURIComponent(smartphoneId)}`, {
    method: "POST",
    keepCache: true,
  });
  invalidateCache("favorites");
  return result;
}

export async function removeFavorite(smartphoneId) {
  const result = await apiFetch(`/api/favorites/${encodeURIComponent(smartphoneId)}`, {
    method: "DELETE",
    keepCache: true,
  });
  invalidateCache("favorites");
  return result;
}
