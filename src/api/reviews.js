import { apiFetch } from "./client";

export const REVIEW_TITLE_MAX = 256;
export const REVIEW_MEDIA_MAX = 30; // the backend's limit for one review
export const REVIEW_PHONES_MAX = 5; // the main phone and up to 4 compared with it
export const REVIEW_IMAGE_MAX_BYTES = 60 * 1024 * 1024;

const encode = encodeURIComponent;

// Published reviews mentioning the phone (comparison reviews included).
// summary=1 returns an excerpt instead of the full Markdown and media.
// comparison: "only" (comparison reviews) or "exclude" (reviews of this phone alone).
export async function getReviewsBySmartphoneId(smartphoneId, { comparison } = {}) {
  const filter = comparison ? `&comparison=${encode(comparison)}` : "";
  const data = await apiFetch(`/api/reviews?smartphone_id=${encode(smartphoneId)}&summary=1${filter}`);

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

// The signed-in user's own reviews, every status, the last edited first: { data, page, limit, total }.
export async function getMyReviews(page = 1, limit = 20) {
  return apiFetch(`/api/reviews/mine?summary=1&page=${page}&limit=${limit}`);
}

// One photo for a review (JPEG, PNG, WebP, GIF, HEIC or AVIF, up to 60 MB), kept private until the
// review is published: { objectKey, url, thumbUrl, mediumUrl, widthPx, heightPx, type }.
export async function uploadReviewMedia(file) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/api/upload/review-media/upload", { method: "POST", body: form, keepCache: true });
}

// { smartphoneIds (main phone first), title, contentMarkdown, mediaItems: [{ objectKey, type }] }.
// A regular user's review waits for a moderator ("pending"); a reviewer's is published at once.
export async function createReview(review) {
  return apiFetch("/api/reviews", { method: "POST", body: JSON.stringify(review) });
}

// Author: any of title, contentMarkdown, smartphoneIds, mediaItems (the whole new list: { id } for
// a photo the review has, { objectKey, type } for a new upload) and status. A regular user's edit
// of a published review sends it back to verification. Returns { ok, status, review }.
export async function updateReview(reviewId, changes) {
  return apiFetch(`/api/reviews/${encode(reviewId)}`, { method: "PATCH", body: JSON.stringify(changes) });
}

// Admins can set any status; a moderator can only publish a pending review or return it to
// its author ("draft"). The author moves it between "draft" and "pending" ("published" too for a
// reviewer); a review hidden by an administrator can be sent again ("pending"). Returns
// { ok, status, review }.
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
