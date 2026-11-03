import { apiFetch } from "./client";

// Published reviews mentioning the phone (comparison reviews included).
// summary=1 returns an excerpt instead of the full Markdown and media.
export async function getReviewsBySmartphoneId(smartphoneId) {
  const data = await apiFetch(
    `/api/reviews?smartphone_id=${encodeURIComponent(smartphoneId)}&summary=1`
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

// Includes the first page of comments as `comments: { data, page, limit, total }`.
export async function getReviewById(reviewId) {
  return apiFetch(
    `/api/reviews/${encodeURIComponent(reviewId)}?include=comments&comment_limit=50`
  );
}
