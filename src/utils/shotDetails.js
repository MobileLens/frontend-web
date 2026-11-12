// The settings a sample photo was taken with, as the Android photo viewer shows them
// (phones/model/ShotDetails.kt, phones/ui/LensLabels.kt). No imports, so `node --test` runs it.

// The focal length camera apps call 1× sits about here, so of several wide lenses facing one way
// the one closest to it is taken for 1×.
const TYPICAL_MAIN_FOCAL_LENGTH_35MM = 24;

function upTo(value, digits) {
  return String(Number(value.toFixed(digits)));
}

/**
 * Each camera of a phone by ID: { cropFactor, mainFocal35 }, where mainFocal35 is the 35 mm
 * equivalent of 1×: the wide camera facing the same way (nearest 24 mm when there are several),
 * else the only camera facing that way.
 */
export function shotCameras(cameras) {
  const known = (cameras || []).filter((camera) => camera.focalLengthMm > 0 && camera.cropFactor > 0);
  const focal35 = (camera) => camera.focalLengthMm * camera.cropFactor;
  const mains = {};

  for (const facing of ["back", "front"]) {
    const facingCameras = known.filter((camera) => camera.facing === facing);
    const wides = facingCameras.filter((camera) => camera.type === "wide");
    const main = wides.length
      ? wides.reduce((best, camera) =>
        Math.abs(focal35(camera) - TYPICAL_MAIN_FOCAL_LENGTH_35MM) < Math.abs(focal35(best) - TYPICAL_MAIN_FOCAL_LENGTH_35MM) ? camera : best)
      : facingCameras.length === 1 ? facingCameras[0] : null;
    if (main) mains[facing] = focal35(main);
  }

  return new Map(known.map((camera) => [camera.id, { cropFactor: camera.cropFactor, mainFocal35: mains[camera.facing] ?? null }]));
}

/**
 * { aperture, shutter, iso, focalLength, equivalent, zoom, digitalZoom } as display strings, each
 * null when unknown; null altogether when nothing is known. The aperture and focal length are the
 * lens's real ones; the 35 mm equivalent and the zoom from the main camera count the digital zoom.
 */
export function shotDetails(photo, camera) {
  const positive = (value) => (value > 0 ? value : null);
  const aperture = positive(photo.exifAperture);
  const shutter = positive(photo.exifShutterSpeed);
  const iso = positive(photo.exifIso);
  const focal = positive(photo.exifFocalLength);
  const digitalZoom = photo.exifDigitalZoom >= 1 ? photo.exifDigitalZoom : 1;

  const equivalent = focal && camera?.cropFactor > 0 ? focal * camera.cropFactor * digitalZoom : null;
  const zoom = equivalent && camera.mainFocal35 > 0 ? equivalent / camera.mainFocal35 : null;

  if (!aperture && !shutter && !iso && !focal) return null;

  return {
    aperture: aperture && `f/${upTo(aperture, 2)}`,
    shutter: shutter && (Math.round(1 / shutter) >= 2 ? `1/${Math.round(1 / shutter)} s` : `${upTo(shutter, 1)} s`),
    iso: iso && String(iso),
    focalLength: focal && `${upTo(focal, 2)} mm`,
    equivalent: equivalent && `${Math.round(equivalent)} mm`,
    zoom: zoom && `${upTo(zoom, 1)}×`,
    digitalZoom: digitalZoom >= 1.05 ? `${upTo(digitalZoom, 1)}× digital` : null,
  };
}
