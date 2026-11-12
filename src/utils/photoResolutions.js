// photoResolutionsMp: the photo sizes the stock camera app offers, largest first; [] = unknown.
// The same rules as the backend (lib/cameraSpec.ts) and the mobile apps (MOBILELENS_API_FOR_FRONTEND.md,
// section 17). No imports, so `node --test` can run the tests without a bundler.

export const PHOTO_SIZE_MIN = 0.1;
export const PHOTO_SIZE_MAX = 500;
export const PHOTO_SIZES_MAX_COUNT = 8;

// Two sizes this close are one setting (49.9 and 50 MP); a photo may also be this much over the sensor.
const SAME_SIZE = 0.02;
// resolutionMp / photoMp this close to n² means n×n binning.
const BINNING_TOLERANCE = 0.03;

export function roundMp(value) {
  return Math.round(value * 10) / 10;
}

// "12,6" or "12.6" -> 12.6; anything else -> null.
export function parseMp(text) {
  const trimmed = String(text ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function sameSize(a, b) {
  return Math.abs(a - b) <= Math.max(a, b) * SAME_SIZE;
}

export function maxPhotoSize(resolutionMp) {
  return resolutionMp * (1 + SAME_SIZE);
}

// "50.4", "12.6", "8"
export function formatMp(value) {
  return String(Number(value.toFixed(2)));
}

// Rounded to 0.1 MP, largest first, sizes within 2 % merged into the larger one.
export function normalizePhotoSizes(sizes) {
  const sorted = (sizes || [])
    .filter((size) => Number.isFinite(size))
    .map(roundMp)
    .sort((a, b) => b - a);

  const kept = [];
  for (const size of sorted) {
    if (!kept.some((other) => sameSize(other, size))) kept.push(size);
  }
  return kept;
}

// Why one size can't be saved, or "". resolutionMp may be unknown while the form is half filled.
export function photoSizeProblem(size, resolutionMp) {
  if (!Number.isFinite(size) || size < PHOTO_SIZE_MIN || size > PHOTO_SIZE_MAX) {
    return `Photo sizes must be between ${PHOTO_SIZE_MIN} and ${PHOTO_SIZE_MAX} MP.`;
  }
  if (resolutionMp > 0 && size > maxPhotoSize(resolutionMp)) {
    return `${formatMp(size)} MP is larger than the sensor (${formatMp(resolutionMp)} MP).`;
  }
  return "";
}

// The first problem of the whole list, or "".
export function photoSizesProblem(sizes, resolutionMp) {
  for (const size of sizes) {
    const problem = photoSizeProblem(size, resolutionMp);
    if (problem) return problem;
  }
  if (normalizePhotoSizes(sizes).length > PHOTO_SIZES_MAX_COUNT) {
    return `A camera can have at most ${PHOTO_SIZES_MAX_COUNT} photo sizes.`;
  }
  return "";
}

// { sizes } with the size added, or { error } leaving the list as it was.
export function addPhotoSize(sizes, size, resolutionMp) {
  const problem = photoSizeProblem(size, resolutionMp);
  if (problem) return { sizes, error: problem };

  const next = normalizePhotoSizes([...sizes, size]);
  if (next.length > PHOTO_SIZES_MAX_COUNT) {
    return { sizes, error: `A camera can have at most ${PHOTO_SIZES_MAX_COUNT} photo sizes.` };
  }
  return { sizes: next };
}

export function removePhotoSize(sizes, size) {
  return sizes.filter((other) => other !== size);
}

// One-click additions: the full sensor and the usual 2×2, 3×3 and 4×4 binned sizes (8 MP and up),
// leaving out what the list already has.
export function suggestedPhotoSizes(resolutionMp, sizes) {
  if (!(resolutionMp > 0)) return [];

  const candidates = [resolutionMp, resolutionMp / 4, resolutionMp / 9, resolutionMp / 16]
    .map(roundMp)
    .filter((size, index) => index === 0 || size >= 8);

  return normalizePhotoSizes(candidates).filter((size) => !sizes.some((other) => sameSize(other, size)));
}

function binningFactor(resolutionMp, size) {
  if (!(resolutionMp > 0 && size > 0) || size >= resolutionMp) return null;
  const ratio = resolutionMp / size;
  const n = Math.round(Math.sqrt(ratio));
  return n >= 2 && Math.abs(ratio - n * n) / (n * n) <= BINNING_TOLERANCE ? n : null;
}

/**
 * A single size clearly below the sensor makes every client say "only 12.6 MP photos". True for some
 * phones (Pixel 8), wrong for cameras saved before the list existed: they got just the old default
 * readout (Xiaomi 12: [12.6] on 50.4 MP, its camera app also shoots 50 MP).
 * Returns null or { size, likelyMigrated }: likelyMigrated when it is also the old activeResolutionMp
 * and an n×n binning of the sensor, the shape of the migrated data.
 */
export function singleSizeWarning(sizes, resolutionMp, activeResolutionMp) {
  if (sizes.length !== 1 || !(resolutionMp > 0)) return null;

  const [size] = sizes;
  if (size >= resolutionMp * (1 - SAME_SIZE)) return null;

  const isOldActive = activeResolutionMp > 0 && sameSize(activeResolutionMp, size);
  return { size, likelyMigrated: isOldActive && binningFactor(resolutionMp, size) !== null };
}

/**
 * The line under the sensor resolution:
 *  2+ sizes -> "50.4 · 12.6 MP photos"; one size below the sensor -> "only 12.5 MP photos";
 *  unknown or one size equal to the sensor -> null. Never falls back to activeResolutionMp.
 */
export function photoSizesSummary(camera) {
  const sizes = camera.photoResolutionsMp || [];

  if (sizes.length >= 2) return `${sizes.map(formatMp).join(" · ")} MP photos`;
  if (sizes.length === 1 && camera.resolutionMp > 0 && sizes[0] < camera.resolutionMp * (1 - SAME_SIZE)) {
    return `only ${formatMp(sizes[0])} MP photos`;
  }
  return null;
}

// The bare list for moderators: "50.4 · 12.6 MP" or "Unknown".
export function formatPhotoSizes(camera) {
  const sizes = camera.photoResolutionsMp || [];
  return sizes.length ? `${sizes.map(formatMp).join(" · ")} MP` : "Unknown";
}

// The largest pixel after n×n binning among the photo sizes: { pitchUm, mp } or null.
export function binnedPixelPitch(camera) {
  if (!(camera.pixelPitchUm > 0)) return null;

  let best = null;
  for (const size of camera.photoResolutionsMp || []) {
    const n = binningFactor(camera.resolutionMp, size);
    if (!n) continue;

    const pitchUm = Math.round(camera.pixelPitchUm * n * 100) / 100;
    if (!best || pitchUm > best.pitchUm) best = { pitchUm, mp: size };
  }
  return best;
}
