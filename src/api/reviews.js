import { apiFetch } from "./client";

export async function getReviewsBySmartphoneId(smartphoneId) {
  const data = await apiFetch(
    `/api/reviews?smartphone_id=${encodeURIComponent(smartphoneId)}`
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (data.id) {
    return [data];
  }

  return [];
}

export async function getReviewById(reviewId) {
  const data = await apiFetch(
    `/api/reviews/${encodeURIComponent(reviewId)}`
  );

  if (data.data && !data.id) {
    return data.data;
  }

  return data;
}