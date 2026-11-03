const TOKEN_KEY = "authToken";

// Fired in this tab when the token changes (the "storage" event only reaches other tabs).
export const AUTH_EVENT = "auth-change";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function isLoggedIn() {
  return Boolean(getToken());
}
