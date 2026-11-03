import { getToken, removeToken } from "../utils/auth";

export async function apiFetch(endpoint, options = {}) {
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

  const response = await fetch(endpoint, {
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

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
