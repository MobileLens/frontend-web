import { useCallback, useEffect, useReducer, useState } from "react";

export const ROLES = ["user", "reviewer", "moderator", "admin"];

export const ROLE_LABELS = {
  user: "User",
  reviewer: "Reviewer",
  moderator: "Moderator",
  admin: "Admin",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : "—";
}

export function formatDateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

export function phoneName(phone) {
  return phone ? [phone.brandName, phone.modelName].filter(Boolean).join(" ") : "Unknown phone";
}

// The backend's message when it sent one, otherwise the fallback.
export function errorText(err, fallback) {
  const message = err?.message;
  return message && !message.startsWith("API error") ? message : fallback;
}

/**
 * Loads `load()` on mount and again after reload(). Data stays on screen while reloading.
 * `load` must be stable (a module-level function or useCallback).
 */
export function useAdminData(load) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, reload] = useReducer((count) => count + 1, 0);

  useEffect(() => {
    let ignore = false;

    load().then(
      (data) => {
        if (!ignore) setState({ data, error: null, loading: false });
      },
      (error) => {
        console.error(error);
        if (!ignore) setState((prev) => ({ ...prev, error, loading: false }));
      },
    );

    return () => {
      ignore = true;
    };
  }, [load, version]);

  const setData = useCallback((update) => {
    setState((prev) => ({
      ...prev,
      data: typeof update === "function" ? update(prev.data) : update,
    }));
  }, []);

  return { ...state, reload, setData };
}
