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

// Catalogue listing with server-side filters; returns { data, page, limit, total, sort }.
// Empty/undefined params are dropped so the backend doesn't reject them.
export async function browseSmartphones(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  return apiFetch(`/api/smartphones?${search.toString()}`);
}

export async function getBrands() {
  return apiFetch("/api/brands");
}
