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

// Admins can set any status; a moderator can only publish a pending review or return it to
// its author ("draft"). Returns { ok, status, review }.
export async function setReviewStatus(reviewId, status) {
  return apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Author or admin. Removes the review's media, comments and likes too.
export async function deleteReview(reviewId) {
  return apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}`, { method: "DELETE" });
}

// Published reviews only. Returns { liked, likeCount }.
export async function likeReview(reviewId) {
  return apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}/like`, { method: "POST", keepCache: true });
}

export async function unlikeReview(reviewId) {
  return apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}/like`, { method: "DELETE", keepCache: true });
}

// Oldest first: { data, page, limit, total }.
export async function getReviewComments(reviewId, page = 1, limit = 50) {
  return apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}/comments?page=${page}&limit=${limit}`);
}

// Up to 2000 characters. Returns the comment with authorName.
export async function addComment(reviewId, content) {
  return apiFetch(`/api/reviews/${encodeURIComponent(reviewId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
    keepCache: true,
  });
}

// Comment author or admin.
export async function deleteComment(commentId) {
  return apiFetch(`/api/reviews/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}
