import { apiFetch } from "./client";

export async function searchSmartphones(query) {
  const data = await apiFetch(
    `/api/smartphones?q=${encodeURIComponent(query)}`
  );

  return data.data;
}

export async function getSmartphoneById(id) {
  return apiFetch(`/api/smartphones/${id}`);
}

export async function getSmartphones(limit = 50) {
  const data = await apiFetch(`/api/smartphones?limit=${limit}`);

  return data.data;
}
