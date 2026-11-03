import { apiFetch } from "./client";
import { removeToken } from "../utils/auth";

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
