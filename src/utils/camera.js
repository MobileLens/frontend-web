import { CAMERA_TYPE_LABELS, equivalentFocal } from "./format";

// How spec values read everywhere, the same as the iOS app (Models/ValueFormatter.swift):
// 35 mm equivalents: focal length whole ("26 mm"), aperture one decimal ("f/9.2").
// Actual values: focal length up to two decimals ("4.3 mm", "9 mm"); aperture and pixel pitch two
// decimals without a trailing zero but at least one ("f/1.78", "f/2.0", "1.4 µm").
// Ranges have one prefix and unit ("24–240 mm", "f/1.5–2.4").

const FACING_ORDER = { back: 0, front: 1, other: 2 };
const TYPE_ORDER = { wide: 0, ultrawide: 1, tele: 2, macro: 3, other: 4 };

const FULL_FRAME_DIAGONAL_MM = 43.27;

function twoDecimalsTrimmed(value) {
  const text = value.toFixed(2);
  return text.endsWith("0") ? text.slice(0, -1) : text;
}

function upToTwoDecimals(value) {
  return String(Number(value.toFixed(2)));
}

function range(low, high, format) {
  const first = format(low);
  if (high === null || high === undefined) return first;
  const second = format(high);
  return first === second ? first : `${first}–${second}`;
}

// Back cameras first, then by full-frame equivalent focal length (ultra-wide, wide, tele...).
export function sortCameras(cameras) {
  return [...cameras].sort((a, b) =>
    (FACING_ORDER[a.facing] - FACING_ORDER[b.facing]) ||
    ((equivalentFocal(a) ?? 0) - (equivalentFocal(b) ?? 0))
  );
}

// Actual aperture: "f/1.8" or "f/1.5–2.4".
export function formatAperture(camera) {
  if (!camera.aperture) return "—";
  return `f/${range(camera.aperture, camera.variableAperture ? camera.apertureNarrow : null, twoDecimalsTrimmed)}`;
}

// Actual focal length: "4.3 mm" or "6.9–19.2 mm".
export function formatFocalLength(camera) {
  if (!camera.focalLengthMm) return "—";
  return `${range(camera.focalLengthMm, camera.opticalZoom ? camera.focalLengthMaxMm : null, upToTwoDecimals)} mm`;
}

// "24 mm" or "70–200 mm" for zoom lenses, full-frame equivalent.
export function formatEquivalentFocal(camera) {
  if (!equivalentFocal(camera)) return "—";
  const longest = camera.opticalZoom && camera.focalLengthMaxMm ? camera.focalLengthMaxMm * camera.cropFactor : null;
  return `${range(camera.focalLengthMm * camera.cropFactor, longest, (value) => value.toFixed(0))} mm`;
}

// The f-number times the crop factor: unlike the actual f-number, it says which camera gathers more light.
export function equivalentAperture(camera) {
  return camera.aperture && camera.cropFactor ? camera.aperture * camera.cropFactor : null;
}

export function formatEquivalentAperture(camera) {
  const widest = equivalentAperture(camera);
  if (!widest) return "—";
  const narrowest = camera.variableAperture && camera.apertureNarrow ? camera.apertureNarrow * camera.cropFactor : null;
  return `f/${range(widest, narrowest, (value) => value.toFixed(1))}`;
}

export function formatPixelPitch(camera) {
  return camera.pixelPitchUm ? `${twoDecimalsTrimmed(camera.pixelPitchUm)} µm` : "—";
}

export function formatMegapixels(value) {
  return value ? `${upToTwoDecimals(value)} MP` : "—";
}

// "Yes" or "No" only for a known zone count; unknown stays unknown, never "No".
export function formatAutofocus(camera) {
  if (camera.afZones === null || camera.afZones === undefined) return "—";
  return camera.afZones > 0 ? "Yes" : "No";
}

function rawAspectRatio(camera) {
  if (camera.photoWidthPx > 0 && camera.photoHeightPx > 0) {
    return Math.max(camera.photoWidthPx, camera.photoHeightPx) / Math.min(camera.photoWidthPx, camera.photoHeightPx);
  }

  const sides = (camera.aspectRatio || "").split(":").map(Number);
  if (sides.length !== 2 || !sides.every((side) => side > 0)) return null;
  return Math.max(...sides) / Math.min(...sides);
}

// The photo's pixels when they are the sensor's (within 5 %); a smaller photo is a binned output.
function sensorPixels(camera) {
  if (!(camera.photoWidthPx > 0 && camera.photoHeightPx > 0 && camera.resolutionMp > 0)) return null;
  const photoMp = (camera.photoWidthPx * camera.photoHeightPx) / 1_000_000;
  if (Math.abs(photoMp - camera.resolutionMp) / camera.resolutionMp > 0.05) return null;

  return {
    width: Math.max(camera.photoWidthPx, camera.photoHeightPx),
    height: Math.min(camera.photoWidthPx, camera.photoHeightPx),
  };
}

export function formatSensorPixels(camera) {
  const pixels = sensorPixels(camera);
  return pixels ? `${pixels.width} × ${pixels.height} px` : null;
}

// The sensor's size in millimetres, the same way as the iOS app (CameraSpecification.swift):
// a. with the pixel pitch: pixels × pitch (the photo's pixels, else derived from the megapixels and the raw ratio);
// b. otherwise from the crop factor: diagonal 43.27 / crop split by the raw ratio;
// c. otherwise null.
function sensorSizeMm(camera) {
  const ratio = rawAspectRatio(camera);
  const pitchMm = camera.pixelPitchUm / 1000;

  if (camera.pixelPitchUm > 0) {
    const pixels = sensorPixels(camera);
    if (pixels) return { width: pixels.width * pitchMm, height: pixels.height * pitchMm };

    if (ratio && camera.resolutionMp > 0) {
      const width = Math.sqrt(camera.resolutionMp * 1_000_000 * ratio);
      return { width: width * pitchMm, height: (width / ratio) * pitchMm };
    }
  }

  if (camera.cropFactor > 0 && ratio) {
    const height = FULL_FRAME_DIAGONAL_MM / camera.cropFactor / Math.sqrt(1 + ratio * ratio);
    return { width: height * ratio, height };
  }

  return null;
}

// "≈5.65 × 4.23 mm"
export function formatSensorDimensions(camera) {
  const size = sensorSizeMm(camera);
  return size ? `≈${size.width.toFixed(2)} × ${size.height.toFixed(2)} mm` : null;
}

// The stored format as it is (1/1.28", 1"), otherwise an estimate marked with "≈". The estimate uses
// the same size as the millimetre line, so the two agree. The "inch" of sensor names is the old
// vidicon tube convention, not 25.4 mm: 16 mm of diagonal per inch from 1/2" up, 18 mm for smaller
// sensors (the 16 mm rule alone shows a 7.06 mm sensor as 1/2.27" instead of 1/2.55").
export function formatSensorSize(camera) {
  const exact = camera.sensorFormat?.trim().replace(/["″”]+$/, "");
  if (exact) return `${exact}"`;

  const size = sensorSizeMm(camera);
  const diagonal = size ? Math.hypot(size.width, size.height) : camera.cropFactor > 0 ? FULL_FRAME_DIAGONAL_MM / camera.cropFactor : null;
  if (!diagonal) return "—";

  const denominator = (diagonal < 8 ? 18 : 16) / diagonal;
  return denominator < 1.05
    ? `≈${Number((1 / denominator).toFixed(1))}"`
    : `≈1/${upToTwoDecimals(denominator)}"`;
}

const STANDARD_RATIOS = [["4:3", 4 / 3], ["3:2", 3 / 2], ["16:9", 16 / 9], ["1:1", 1]];

// The stored value or the photo's shape, snapped to a standard ratio when close (1.35:1 reads 4:3).
export function formatAspectRatio(camera) {
  const ratio = rawAspectRatio(camera);
  if (!ratio) return camera.aspectRatio?.trim() || "—";

  const match = STANDARD_RATIOS.find(([, value]) => Math.abs(ratio - value) / value < 0.02);
  return match ? match[0] : `${ratio.toFixed(2)}:1`;
}

// Longer side of the frame -> the name people know. Other sizes are left out of the summary.
const VIDEO_LABELS = [
  { label: "480p", min: 640, max: 854 },
  { label: "720p", min: 1280, max: 1280 },
  { label: "1080p", min: 1920, max: 1920 },
  { label: "1440p", min: 2560, max: 2560 },
  { label: "2.7K", min: 2688, max: 2720 },
  { label: "4K", min: 3840, max: 4096 },
  { label: "5.3K", min: 5280, max: 5344 },
  { label: "5.7K", min: 5728, max: 5792 },
  { label: "6K", min: 6016, max: 6144 },
  { label: "8K", min: 7680, max: 8192 },
];

function videoAspect(mode) {
  const short = Math.min(mode.widthPx, mode.heightPx);
  return short > 0 ? Math.max(mode.widthPx, mode.heightPx) / short : null;
}

function isOpenGate(mode) {
  const ratio = videoAspect(mode);
  return (ratio !== null && ratio <= 1.55) || /open gate/i.test(mode.note || "");
}

/**
 * The Video lines, as in the mobile apps: from the highest resolution down, a resolution is listed
 * only if it adds a higher frame rate ("4K up to 60 fps", "1080p up to 240 fps"), then the best open
 * gate mode. Returns [{ text, note }].
 */
export function videoSummary(modes) {
  const best = new Map();

  for (const mode of modes || []) {
    const ratio = videoAspect(mode);
    if (isOpenGate(mode) || ratio === null || ratio < 1.7 || ratio > 1.92) continue;

    const side = Math.max(mode.widthPx, mode.heightPx);
    const index = VIDEO_LABELS.findIndex(({ min, max }) => side >= min && side <= max);
    if (index === -1) continue;

    const fps = Math.round(mode.fpsMax);
    const note = mode.note?.trim() || null;
    const current = best.get(index);

    // Of two modes with the same top rate, the one with a note explains it.
    if (!current || fps > current.fps || (fps === current.fps && !current.note && note)) {
      best.set(index, { fps, note });
    }
  }

  let highestShown = 0;
  const entries = [];

  for (const [index, { fps, note }] of [...best].sort((a, b) => b[0] - a[0])) {
    if (fps <= highestShown) continue;
    highestShown = fps;
    entries.push({ text: `${VIDEO_LABELS[index].label} up to ${fps} fps`, note });
  }

  const pixels = (mode) => mode.widthPx * mode.heightPx;
  const openGate = (modes || []).filter(isOpenGate).reduce(
    (top, mode) => (!top || pixels(mode) > pixels(top) || (pixels(mode) === pixels(top) && mode.fpsMax > top.fpsMax) ? mode : top),
    null,
  );

  if (openGate) {
    const note = openGate.note?.trim();
    entries.push({
      text: `Open gate ${openGate.widthPx}×${openGate.heightPx} up to ${Math.round(openGate.fpsMax)} fps`,
      note: note && !/^open gate$/i.test(note) ? note : null,
    });
  }

  return entries;
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
