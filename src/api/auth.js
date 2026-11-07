import { apiFetch } from "./client";
import { removeToken } from "../utils/auth";

// Where the backend sends the browser after a link from an e-mail. It has to be a full URL, or the
// backend treats it as a path on its own domain. Only the deployed site is a trusted origin, so the
// dev server leaves it out and the backend's default applies.
export function siteUrl(path) {
  return import.meta.env.DEV ? undefined : new URL(path, window.location.origin).href;
}

// Returns { token, user }. token is null when the backend requires e-mail verification.
export async function registerUser({
  name,
  username,
  email,
  password,
}) {
  return apiFetch("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name,
      username,
      email,
      password,
      callbackURL: siteUrl("/login?verified=1"),
    }),
  });
}

// Returns { token, user }.
export async function loginUser({
  email,
  password,
}) {
  return apiFetch("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

// Sends a reset link when the account exists; the answer doesn't say whether it does.
export async function requestPasswordReset(email) {
  return apiFetch("/api/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email, redirectTo: siteUrl("/reset-password") }),
  });
}

// token comes from the reset link: the backend adds ?token=... (or ?error=...) to redirectTo.
export async function resetPassword(token, newPassword) {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

// Invalidates the session on the server (and its cookie); the local token is dropped either way.
export async function logoutUser() {
  try {
    await apiFetch("/api/auth/sign-out", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } finally {
    removeToken();
  }
}
