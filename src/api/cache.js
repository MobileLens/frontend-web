import { AUTH_EVENT } from "../utils/auth";

// In-memory cache of read requests, so going back to a page is instant and hovering a link can
// load its data ahead. Any write through apiFetch empties it (see client.js).
const TTL_MS = 60 * 1000;
const entries = new Map();

export function peekCache(key) {
  const entry = entries.get(key);
  return entry && "value" in entry && Date.now() - entry.at < TTL_MS ? entry.value : undefined;
}

// Concurrent calls for one key share a request. `fresh` skips a stored value (and a request in flight).
export function cached(key, load, { fresh = false } = {}) {
  if (!fresh) {
    const value = peekCache(key);
    if (value !== undefined) return Promise.resolve(value);

    const pending = entries.get(key)?.promise;
    if (pending) return pending;
  }

  const promise = load().then(
    (value) => {
      entries.set(key, { value, at: Date.now() });
      return value;
    },
    (error) => {
      entries.delete(key);
      throw error;
    },
  );
  entries.set(key, { promise });

  return promise;
}

export function invalidateCache(key) {
  entries.delete(key);
}

export function clearCache() {
  entries.clear();
}

// Favourites belong to the signed-in user.
window.addEventListener(AUTH_EVENT, clearCache);
