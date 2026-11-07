import { clearCache } from "./cache";
import { getToken, removeToken } from "../utils/auth";

// Empty in dev (Vite proxies /api); set at build time when the app is hosted elsewhere.
const API_URL = import.meta.env.VITE_API_URL ?? "";

// keepCache: a POST that changes nothing shown in the app (a search, a counted view).
export async function apiFetch(endpoint, { keepCache = false, ...options } = {}) {
  const token = getToken();

  const headers = {
    "Accept-Language": "en",
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Expired or revoked session (e.g. after a ban). Only when a token was sent,
    // so a wrong-password 401 on the login form doesn't touch anything.
    if (response.status === 401 && token) {
      removeToken();
    }

    let errorMessage = `API error: ${response.status}`;
    let errorData = null;

    try {
      errorData = await response.json();

      // backend: { error, code, ...extra }; better-auth (/api/auth/*): { message, code }
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // not JSON - keep the generic message
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = errorData?.code;
    error.data = errorData;
    throw error;
  }

  if (options.method && options.method !== "GET" && !keepCache) {
    clearCache();
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
