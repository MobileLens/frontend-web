// The catalogue's filter, the same as in the mobile apps (iOS: Models/PhoneFilter.swift): required
// lenses, per-lens options, "any rear lens", "all rear lenses" and the front camera, sent to
// POST /api/smartphones/search. Focal lengths and apertures are 35 mm equivalents.

export const OPTIONAL_LENSES = ["ultrawide", "tele", "macro"];

export const LENS_LABELS = { wide: "Wide", ultrawide: "Ultra-wide", tele: "Telephoto", macro: "Macro" };

export const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "brand", label: "Brand" },
  { value: "trending", label: "Most viewed" },
  { value: "new", label: "Newest" },
];

export const STABILISATION_OPTIONS = [
  { value: "optical", label: "Optical" },
  { value: "sensor_shift", label: "Sensor-shift" },
];

const VIDEO_WIDTH_LABELS = { 854: "480p", 1280: "720p", 1920: "1080p", 3840: "4K", 7680: "8K" };
const VIDEO_WIDTHS = [854, 1280, 1920, 3840, 7680];
const VIDEO_FPS = [30, 60, 120, 240, 480, 960, 1920];

const steps = (from, through, by) => {
  const values = [];
  for (let value = from; value <= through; value += by) values.push(value);
  return values;
};

const FOCAL_GRID = [...steps(1, 100, 1), ...steps(105, 500, 5)];
const APERTURE_STOPS = [4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
const APERTURE_GRID = [2.8, 3.2, 3.5, ...APERTURE_STOPS, 25, 29, 32, 36, 40, 45, 51, 57, 64];
const SENSOR_FORMATS = [3.4, 3.2, 3, 2.8, 2.76, 2.55, 2.5, 2.4, 2, 1.95, 1.76, 1.7, 1.56, 1.5, 1.43, 1.4, 1.33, 1.31, 1.3, 1.28, 1.14, 1.12, 1];
const SENSOR_GRID = [...SENSOR_FORMATS, 3.6, 4, 4.4, 5].sort((a, b) => a - b);
const RESOLUTION_PRESETS = [12, 48, 50, 108, 200];
const RESOLUTION_GRID = [2, 5, 8, ...RESOLUTION_PRESETS];

const FALLBACK_FOCALS = {
  wide: steps(20, 40, 1),
  ultrawide: steps(10, 24, 1),
  tele: [...steps(24, 100, 1), ...steps(105, 300, 5)],
  macro: [...steps(12, 100, 1), ...steps(105, 150, 5)],
  front: steps(10, 40, 1),
};

// One value picked as both ends means that value, give or take these.
const FOCAL_TOLERANCE = 0.5;
const APERTURE_STOP_FACTOR = 2 ** (1 / 12);
const SENSOR_TOLERANCE = 0.004;

export const EMPTY_FILTER = {
  brands: [],
  allPhones: false, // the catalogue shows verified phones unless asked for all
  releaseFrom: "",
  releaseTo: "",
  lenses: [], // lenses the phone must have besides the wide one
  lens: {}, // options per lens: { wide: { focalMin, ... }, ... }
  anyZoom: false,
  anyVariable: false,
  anyVideo: {},
  allVideo: {},
  front: {},
  twoFront: false,
};

function isEmptyValue(value) {
  if (value === null || value === undefined || value === "" || value === false) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every(isEmptyValue);
  return false;
}

function prune(value) {
  if (Array.isArray(value) || typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => !isEmptyValue(item)).map(([key, item]) => [key, prune(item)]),
  );
}

// The `f` URL parameter <-> a filter. Only what differs from the default goes in the URL.
export function encodeFilter(filter) {
  const pruned = prune(filter);
  return Object.keys(pruned).length > 0 ? JSON.stringify(pruned) : "";
}

export function decodeFilter(text) {
  if (!text) return EMPTY_FILTER;

  try {
    return { ...EMPTY_FILTER, ...JSON.parse(text) };
  } catch {
    return EMPTY_FILTER;
  }
}

// A catalogue link with these filters set, e.g. browseUrl({ brands: [id] }).
export function browseUrl(filter) {
  return `/browse?f=${encodeURIComponent(encodeFilter({ ...EMPTY_FILTER, ...filter }))}`;
}

function cameraBody({ type, facing, constraint: c }) {
  const body = { facing };
  if (type) body.type = type;

  if (c.focalMin != null && c.focalMin === c.focalMax) {
    body.eqFocalMin = Math.max(c.focalMin - FOCAL_TOLERANCE, 0);
    body.eqFocalMax = c.focalMin + FOCAL_TOLERANCE;
  } else {
    if (c.focalMin != null) body.eqFocalMin = c.focalMin;
    if (c.focalMax != null) body.eqFocalMax = c.focalMax;
  }

  if (c.apertureMin != null && c.apertureMin === c.apertureMax) {
    body.eqApertureMin = c.apertureMin / APERTURE_STOP_FACTOR;
    body.eqApertureMax = c.apertureMin * APERTURE_STOP_FACTOR;
  } else {
    if (c.apertureMin != null) body.eqApertureMin = c.apertureMin;
    if (c.apertureMax != null) body.eqApertureMax = c.apertureMax;
  }

  // The smallest sensor has the largest denominator.
  if (c.sensorFrom != null && c.sensorFrom === c.sensorTo) {
    body.sensorDenominatorMin = c.sensorFrom - SENSOR_TOLERANCE;
    body.sensorDenominatorMax = c.sensorFrom + SENSOR_TOLERANCE;
  } else {
    if (c.sensorTo != null) body.sensorDenominatorMin = c.sensorTo;
    if (c.sensorFrom != null) body.sensorDenominatorMax = c.sensorFrom;
  }

  if (c.resolutionMin != null) body.resolutionMin = c.resolutionMin;
  if (c.ois?.length) body.ois = c.ois;
  if (c.variable) body.variableAperture = true;
  if (c.zoom) body.opticalZoom = true;
  if (c.video?.width != null) body.videoMinWidth = c.video.width;
  if (c.video?.fps != null) body.videoMinFps = c.video.fps;

  return body;
}

// The cameras the phone must have: the wide lens when it has options, every required lens (even
// without options: "has this lens"), then one entry per "any rear lens" option and the front camera.
function cameraConditions(filter) {
  const conditions = [];
  const wide = filter.lens.wide || {};

  if (!isEmptyValue(wide)) conditions.push({ type: "wide", facing: "back", constraint: wide });
  for (const lens of OPTIONAL_LENSES) {
    if (filter.lenses.includes(lens)) conditions.push({ type: lens, facing: "back", constraint: filter.lens[lens] || {} });
  }
  if (filter.anyZoom) conditions.push({ facing: "back", constraint: { zoom: true } });
  if (filter.anyVariable) conditions.push({ facing: "back", constraint: { variable: true } });
  if (!isEmptyValue(filter.anyVideo)) conditions.push({ facing: "back", constraint: { video: filter.anyVideo } });
  if (!isEmptyValue(filter.front)) conditions.push({ facing: "front", constraint: filter.front });

  return conditions;
}

export function searchBody(filter, { q = "", sort = "name", page = 1, limit = 24 } = {}) {
  const body = { sort, page, limit };
  const cameras = cameraConditions(filter).map(cameraBody);

  if (q) body.q = q;
  if (filter.brands.length > 0) body.brandIds = filter.brands;
  if (!filter.allPhones) body.verified = true;
  if (filter.releaseFrom) body.releaseFrom = filter.releaseFrom;
  if (filter.releaseTo) body.releaseTo = filter.releaseTo;
  if (cameras.length > 0) body.cameras = cameras;
  if (filter.twoFront) body.frontCameraCountMin = 2;

  if (!isEmptyValue(filter.allVideo)) {
    body.allBackCamerasVideo = {};
    if (filter.allVideo.width != null) body.allBackCamerasVideo.minWidth = filter.allVideo.width;
    if (filter.allVideo.fps != null) body.allBackCamerasVideo.minFps = filter.allVideo.fps;
  }

  return body;
}

// What the dropdowns offer: the catalogue's range for the lens type, rounded outward to the grid,
// plus any value selected outside it.

function outward(grid, low, high) {
  if (low == null || high == null) return null;
  const start = [...grid].reverse().find((value) => value <= low) ?? grid[0];
  const end = grid.find((value) => value >= Math.max(high, low)) ?? grid[grid.length - 1];
  return grid.filter((value) => value >= start && value <= end);
}

function keeping(values, selected) {
  const missing = selected.filter((value) => value != null && !values.includes(value));
  return missing.length > 0 ? [...values, ...missing].sort((a, b) => a - b) : values;
}

export function videoValues(maxFpsByWidth) {
  const known = Object.entries(maxFpsByWidth || {}).filter(([, fps]) => fps != null);
  const byWidth = known.length > 0 ? Object.fromEntries(known) : null;

  return {
    widths: byWidth ? Object.keys(byWidth).map(Number).sort((a, b) => a - b) : VIDEO_WIDTHS,
    // Frame rates for the chosen resolution (no choice: the overall maximum).
    frameRates(width) {
      if (!byWidth) return VIDEO_FPS;
      const limit = width != null ? byWidth[width] : Math.max(...Object.values(byWidth));
      return limit == null ? [] : VIDEO_FPS.filter((fps) => fps <= limit);
    },
  };
}

function facetFor(kind, facets) {
  const facet = kind === "front" ? facets?.front : facets?.types?.[kind];
  return facet && facet.count > 0 ? facet : null;
}

export function lensValues(kind, facets, constraint = {}) {
  const facet = facetFor(kind, facets);

  return {
    focals: keeping(outward(FOCAL_GRID, facet?.eqFocalMin, facet?.eqFocalMax) ?? FALLBACK_FOCALS[kind], [constraint.focalMin, constraint.focalMax]),
    apertures: keeping(outward(APERTURE_GRID, facet?.eqApertureMin, facet?.eqApertureMax) ?? APERTURE_STOPS, [constraint.apertureMin, constraint.apertureMax]),
    // from the smallest sensor to the largest
    sensors: keeping(outward(SENSOR_GRID, facet?.sensorDenominatorMin, facet?.sensorDenominatorMax) ?? SENSOR_FORMATS, [constraint.sensorFrom, constraint.sensorTo]).slice().sort((a, b) => b - a),
    resolutions: keeping(outward(RESOLUTION_GRID, facet?.resolutionMpMin, facet?.resolutionMpMax) ?? RESOLUTION_PRESETS, [constraint.resolutionMin]),
    video: videoValues(facet?.videoMaxFpsByWidth),
  };
}

// Video on any rear lens: per resolution the highest frame rate over every rear type.
export function anyLensVideoValues(facets) {
  const merged = {};

  for (const facet of Object.values(facets?.types || {})) {
    if (facet.count === 0) continue;
    for (const [width, fps] of Object.entries(facet.videoMaxFpsByWidth || {})) {
      if (fps != null) merged[width] = Math.max(merged[width] ?? 0, fps);
    }
  }

  return videoValues(merged);
}

// Video on every rear lens: per resolution the smaller of the wide and ultra-wide maxima.
export function everyLensVideoValues(facets) {
  const merged = {};

  for (const kind of ["wide", "ultrawide"]) {
    const facet = facetFor(kind, facets);
    for (const [width, fps] of Object.entries(facet?.videoMaxFpsByWidth || {})) {
      if (fps != null) merged[width] = Math.min(merged[width] ?? Infinity, fps);
    }
  }

  return videoValues(merged);
}

// A range never turns around: moving one end past the other brings the other along.
export function withMin(constraint, minKey, maxKey, value) {
  const next = { ...constraint, [minKey]: value };
  if (value != null && next[maxKey] != null && value > next[maxKey]) next[maxKey] = value;
  return next;
}

export function withMax(constraint, minKey, maxKey, value) {
  const next = { ...constraint, [maxKey]: value };
  if (value != null && next[minKey] != null && value < next[minKey]) next[minKey] = value;
  return next;
}

// Sensor "From" is the smallest sensor, so its denominator is the larger one.
export function withSensorFrom(constraint, value) {
  const next = { ...constraint, sensorFrom: value };
  if (value != null && next.sensorTo != null && value < next.sensorTo) next.sensorTo = value;
  return next;
}

export function withSensorTo(constraint, value) {
  const next = { ...constraint, sensorTo: value };
  if (value != null && next.sensorFrom != null && value > next.sensorFrom) next.sensorFrom = value;
  return next;
}

// A lower frame rate is kept only if the chosen resolution can reach it.
export function withVideoWidth(requirement, width, values) {
  const next = { ...requirement, width };
  const highest = values.frameRates(width).at(-1);
  if (next.fps != null && highest != null && next.fps > highest) next.fps = highest;
  return next;
}

// Labels

export const focalLabel = (value) => `${value} mm`;
export const apertureLabel = (value) => `f/${value.toFixed(1)}`;
export const sensorLabel = (value) => (value === 1 ? '1"' : `1/${value}"`);
export const resolutionLabel = (value) => `${value} MP`;
export const videoWidthLabel = (value) => VIDEO_WIDTH_LABELS[value] || `${value} px`;

function bounds(min, max, format, { below = "≤ ", above = "≥ " } = {}) {
  if (min != null && max != null) return min === max ? format(min) : `${format(min)}–${format(max)}`;
  if (min != null) return `${above}${format(min)}`;
  if (max != null) return `${below}${format(max)}`;
  return null;
}

function videoSummary(video = {}) {
  if (video.width != null && video.fps != null) return `${videoWidthLabel(video.width)} · ${video.fps} fps`;
  if (video.width != null) return videoWidthLabel(video.width);
  if (video.fps != null) return `≥ ${video.fps} fps`;
  return null;
}

function constraintSummary(c = {}) {
  return [
    bounds(c.focalMin, c.focalMax, focalLabel),
    bounds(c.apertureMin, c.apertureMax, apertureLabel, { below: "up to ", above: "from " }),
    bounds(c.sensorFrom, c.sensorTo, sensorLabel),
    c.resolutionMin != null && `≥ ${resolutionLabel(c.resolutionMin)}`,
    c.ois?.length && STABILISATION_OPTIONS.filter((option) => c.ois.includes(option.value)).map((option) => option.label).join("/"),
    videoSummary(c.video),
    c.variable && "variable aperture",
    c.zoom && "optical zoom",
  ].filter(Boolean).join(", ");
}

/**
 * The active filters as removable chips: [{ key, label, remove(filter) -> filter }].
 * The count of chips is the number on the mobile "Filters" button.
 */
export function filterChips(filter, brandNames) {
  const chips = [];
  const add = (key, label, remove) => chips.push({ key, label, remove });

  for (const id of filter.brands) {
    add(`brand-${id}`, brandNames.get(id) || "Brand", (f) => ({ ...f, brands: f.brands.filter((item) => item !== id) }));
  }
  if (filter.allPhones) add("all", "Unverified included", (f) => ({ ...f, allPhones: false }));
  if (filter.releaseFrom) add("from", `Released from ${filter.releaseFrom}`, (f) => ({ ...f, releaseFrom: "" }));
  if (filter.releaseTo) add("to", `Released until ${filter.releaseTo}`, (f) => ({ ...f, releaseTo: "" }));

  const withoutLens = (f, lens) => {
    const rest = { ...f.lens };
    delete rest[lens];
    return { ...f, lens: rest };
  };

  for (const lens of ["wide", ...OPTIONAL_LENSES]) {
    const required = filter.lenses.includes(lens);
    const summary = constraintSummary(filter.lens[lens]);

    if (required || (lens === "wide" && summary)) {
      add(
        `lens-${lens}`,
        `${LENS_LABELS[lens]}${summary ? `: ${summary}` : " lens"}`,
        (f) => ({ ...withoutLens(f, lens), lenses: f.lenses.filter((item) => item !== lens) }),
      );
    }
  }

  if (filter.anyZoom) add("anyZoom", "Optical zoom", (f) => ({ ...f, anyZoom: false }));
  if (filter.anyVariable) add("anyVariable", "Variable aperture", (f) => ({ ...f, anyVariable: false }));
  if (videoSummary(filter.anyVideo)) add("anyVideo", `Video: ${videoSummary(filter.anyVideo)}`, (f) => ({ ...f, anyVideo: {} }));
  if (videoSummary(filter.allVideo)) add("allVideo", `Every rear lens: ${videoSummary(filter.allVideo)}`, (f) => ({ ...f, allVideo: {} }));
  if (constraintSummary(filter.front)) add("front", `Front: ${constraintSummary(filter.front)}`, (f) => ({ ...f, front: {} }));
  if (filter.twoFront) add("twoFront", "Two or more front cameras", (f) => ({ ...f, twoFront: false }));

  return chips;
}
