import { apiFetch } from "./client";

// Creates a pending submission (even for moderators); approve it with reviewCamera.
export function createCamera(smartphoneId, spec) {
  return apiFetch("/api/cameras", {
    method: "POST",
    body: JSON.stringify({ ...spec, smartphoneId }),
  });
}

// Moderator only. Accepts camera spec fields and an optional full videoModes list.
export function updateCamera(id, changes) {
  return apiFetch(`/api/cameras/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// Moderator only. Also deletes the camera's sample photos and videos.
export function deleteCamera(id) {
  return apiFetch(`/api/cameras/${encodeURIComponent(id)}`, { method: "DELETE" });
}
