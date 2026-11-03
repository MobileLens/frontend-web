import { apiFetch } from "./client";

// [{ id, name, logoUrl }], alphabetical.
export function getBrands() {
  return apiFetch("/api/brands");
}
