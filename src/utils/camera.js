import { CAMERA_TYPE_LABELS, equivalentFocal } from "./format";

const FACING_ORDER = { back: 0, front: 1, other: 2 };
const TYPE_ORDER = { wide: 0, ultrawide: 1, tele: 2, macro: 3, other: 4 };

// Back cameras first, then by full-frame equivalent focal length (ultra-wide, wide, tele...).
export function sortCameras(cameras) {
  return [...cameras].sort((a, b) =>
    (FACING_ORDER[a.facing] - FACING_ORDER[b.facing]) ||
    ((equivalentFocal(a) ?? 0) - (equivalentFocal(b) ?? 0))
  );
}

export function formatAperture(camera) {
  if (!camera.aperture) return "—";
  return camera.variableAperture && camera.apertureNarrow
    ? `f/${camera.aperture}–f/${camera.apertureNarrow}`
    : `f/${camera.aperture}`;
}

// "24 mm" or "70–200 mm" for zoom lenses, full-frame equivalent.
export function formatEquivalentFocal(camera) {
  const min = equivalentFocal(camera);
  if (!min) return "—";
  return camera.opticalZoom && camera.focalLengthMaxMm
    ? `${min}–${equivalentFocal(camera, camera.focalLengthMaxMm)} mm`
    : `${min} mm`;
}

// Mode with the largest frame, then the highest frame rate.
export function bestVideoMode(camera) {
  const modes = camera.videoModes || [];
  if (modes.length === 0) return null;

  return [...modes].sort((a, b) =>
    (Math.max(b.widthPx, b.heightPx) - Math.max(a.widthPx, a.heightPx)) || (b.fpsMax - a.fpsMax)
  )[0];
}

/**
 * Matches cameras of different phones by role: { "back-wide": camera, "back-tele": camera,
 * "back-tele-2": camera, "front-wide": camera, ... }.
 */
export function cameraSlots(cameras) {
  const counts = {};
  const slots = {};

  for (const camera of sortCameras(cameras || [])) {
    const base = `${camera.facing}-${camera.type}`;
    counts[base] = (counts[base] || 0) + 1;
    slots[counts[base] > 1 ? `${base}-${counts[base]}` : base] = camera;
  }

  return slots;
}

function parseSlot(slot) {
  const [facing, type, index = "1"] = slot.split("-");
  return { facing, type, index: Number(index) };
}

export function compareSlots(a, b) {
  const x = parseSlot(a);
  const y = parseSlot(b);
  return (FACING_ORDER[x.facing] - FACING_ORDER[y.facing]) ||
    (TYPE_ORDER[x.type] - TYPE_ORDER[y.type]) ||
    (x.index - y.index);
}

export function slotLabel(slot) {
  const { facing, type, index } = parseSlot(slot);
  const typeLabel = CAMERA_TYPE_LABELS[type] || "Camera";
  const numbered = index > 1 ? `${typeLabel} ${index}` : typeLabel;

  if (facing === "front") return type === "wide" ? "Front camera" : `Front · ${numbered}`;
  if (facing === "other") return `Other · ${numbered}`;
  return numbered;
}
