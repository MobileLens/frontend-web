import { apiFetch } from "./client";

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