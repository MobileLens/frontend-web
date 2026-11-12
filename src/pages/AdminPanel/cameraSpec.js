// Camera spec <-> form values. Inputs hold strings; the API takes numbers, booleans and nulls.

import { normalizePhotoSizes, photoSizesProblem } from "../../utils/photoResolutions.js";

export const REQUIRED_NUMBERS = [
  { key: "focalLengthMm", label: "Focal length (mm)", hint: "0.5–100" },
  { key: "aperture", label: "Aperture (f/)", hint: "0.5–32" },
  { key: "cropFactor", label: "Crop factor", hint: "1–20" },
  { key: "pixelPitchUm", label: "Pixel pitch (µm)", hint: "0.1–10" },
  { key: "resolutionMp", label: "Sensor resolution (MP)", hint: "0.1–500" },
];

export const OPTIONAL_NUMBERS = [
  { key: "afZones", label: "AF zones", hint: "integer, empty = unknown" },
  { key: "photoWidthPx", label: "Photo width (px)" },
  { key: "photoHeightPx", label: "Photo height (px)" },
];

export const TEXT_FIELDS = [
  { key: "sensorFormat", label: "Sensor format", hint: "e.g. 1/1.28" },
  { key: "sensorModel", label: "Sensor model", hint: "e.g. Sony LYT-900" },
  { key: "aspectRatio", label: "Aspect ratio", hint: "e.g. 4:3" },
];

const asText = (value) => (value === null || value === undefined ? "" : String(value));

export function emptyCameraForm() {
  return cameraToForm({ type: "wide", facing: "back", variableAperture: false, opticalZoom: false });
}

export function cameraToForm(camera) {
  const form = {
    type: camera.type || "wide",
    facing: camera.facing || "back",
    ois: camera.ois || "",
    variableAperture: Boolean(camera.variableAperture),
    apertureNarrow: asText(camera.apertureNarrow),
    opticalZoom: Boolean(camera.opticalZoom),
    focalLengthMaxMm: asText(camera.focalLengthMaxMm),
    note: asText(camera.note),
    // Numbers, not strings: the chip editor keeps the list normalised.
    photoResolutionsMp: normalizePhotoSizes(camera.photoResolutionsMp),
    videoModes: (camera.videoModes || []).map((mode) => ({
      widthPx: asText(mode.widthPx),
      heightPx: asText(mode.heightPx),
      fpsMax: asText(mode.fpsMax),
      note: asText(mode.note),
    })),
  };

  for (const { key } of [...REQUIRED_NUMBERS, ...OPTIONAL_NUMBERS, ...TEXT_FIELDS]) {
    form[key] = asText(camera[key]);
  }

  return form;
}

function toNumber(value) {
  const trimmed = String(value).trim().replace(",", ".");
  if (trimmed === "") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : NaN;
}

// { spec } ready for the API, or { error } describing the first bad field. Ranges are checked by the backend.
export function formToCamera(form) {
  const spec = {
    type: form.type,
    facing: form.facing,
    ois: form.ois || null,
    variableAperture: form.variableAperture,
    opticalZoom: form.opticalZoom,
    apertureNarrow: null,
    focalLengthMaxMm: null,
    note: form.note.trim() || null,
  };

  for (const { key, label } of REQUIRED_NUMBERS) {
    const number = toNumber(form[key]);
    if (number === null || Number.isNaN(number)) return { error: `${label} is required and must be a number.` };
    spec[key] = number;
  }

  for (const { key, label } of OPTIONAL_NUMBERS) {
    const number = toNumber(form[key]);
    if (Number.isNaN(number)) return { error: `${label} must be a number.` };
    spec[key] = number;
  }

  for (const { key } of TEXT_FIELDS) {
    spec[key] = form[key].trim() || null;
  }

  // The full list replaces the saved one; [] marks the sizes as unknown. activeResolutionMp is
  // derived by the backend now and never sent.
  const photoSizes = normalizePhotoSizes(form.photoResolutionsMp);
  const photoProblem = photoSizesProblem(photoSizes, spec.resolutionMp);
  if (photoProblem) return { error: `Photo sizes: ${photoProblem}` };
  spec.photoResolutionsMp = photoSizes;

  if (form.variableAperture) {
    const number = toNumber(form.apertureNarrow);
    if (number === null || Number.isNaN(number)) return { error: "Narrowest aperture is required for a variable aperture." };
    spec.apertureNarrow = number;
  }

  if (form.opticalZoom) {
    const number = toNumber(form.focalLengthMaxMm);
    if (number === null || Number.isNaN(number)) return { error: "Longest focal length is required for an optical zoom." };
    spec.focalLengthMaxMm = number;
  }

  spec.videoModes = [];

  for (const [index, mode] of form.videoModes.entries()) {
    const values = [toNumber(mode.widthPx), toNumber(mode.heightPx), toNumber(mode.fpsMax)];
    if (values.some((value) => value === null || Number.isNaN(value))) {
      return { error: `Video mode ${index + 1} needs a width, height and frame rate.` };
    }

    const [widthPx, heightPx, fpsMax] = values;
    spec.videoModes.push({ widthPx, heightPx, fpsMax, note: mode.note.trim() || null });
  }

  return { spec };
}
