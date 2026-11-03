const releaseDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Release dates come as YYYY, YYYY-MM or YYYY-MM-DD; only full dates are reformatted.
export function formatReleaseDate(releaseDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return releaseDate;
  }

  return releaseDateFormat.format(new Date(releaseDate));
}

export function formatViews(viewCount) {
  return `${viewCount.toLocaleString("en-US")} ${viewCount === 1 ? "view" : "views"}`;
}

export function round(value, digits = 1) {
  return Math.round(value * 10 ** digits) / 10 ** digits;
}

export function formatVideoMode(mode) {
  return `${mode.widthPx}×${mode.heightPx} @ ${round(mode.fpsMax, 2)} fps`;
}

// Full-frame equivalent focal length, rounded to whole millimetres.
export function equivalentFocal(camera, focal = camera.focalLengthMm) {
  return focal && camera.cropFactor ? Math.round(focal * camera.cropFactor) : null;
}

export const OIS_LABELS = {
  none: "None",
  optical: "Optical",
  sensor_shift: "Sensor-shift",
};

export const CAMERA_TYPE_LABELS = {
  wide: "Wide (main)",
  ultrawide: "Ultra-wide",
  tele: "Telephoto",
  macro: "Macro",
  other: "Other",
};
