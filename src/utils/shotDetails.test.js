import assert from "node:assert/strict";
import { test } from "node:test";
import { shotCameras, shotDetails } from "./shotDetails.js";

// Xiaomi 12 (crop factors as in the catalogue).
const CAMERAS = [
  { id: "wide", type: "wide", facing: "back", focalLengthMm: 5.59, cropFactor: 4.22526 },
  { id: "ultra", type: "ultrawide", facing: "back", focalLengthMm: 2.13, cropFactor: 7.53 },
  { id: "front", type: "wide", facing: "front", focalLengthMm: 3.0, cropFactor: 8.2 },
];

test("1× is the back wide camera; the front camera has its own", () => {
  const cameras = shotCameras(CAMERAS);
  assert.equal(Math.round(cameras.get("ultra").mainFocal35), 24);
  assert.equal(Math.round(cameras.get("front").mainFocal35), 25);
});

test("of two wide cameras, 1× is the one nearest 24 mm", () => {
  const cameras = shotCameras([
    { id: "a", type: "wide", facing: "back", focalLengthMm: 6.9, cropFactor: 3.5 }, // 24 mm
    { id: "b", type: "wide", facing: "back", focalLengthMm: 10, cropFactor: 3.5 }, // 35 mm
  ]);
  assert.equal(Math.round(cameras.get("b").mainFocal35), 24);
});

test("an ultra-wide photo: real values, 35 mm equivalent and 0.7× from the main camera", () => {
  const photo = { exifAperture: 2.4, exifShutterSpeed: 0.125, exifIso: 4800, exifFocalLength: 2.13, exifDigitalZoom: 1 };
  assert.deepEqual(shotDetails(photo, shotCameras(CAMERAS).get("ultra")), {
    aperture: "f/2.4", shutter: "1/8 s", iso: "4800", focalLength: "2.13 mm",
    equivalent: "16 mm", zoom: "0.7×", digitalZoom: null,
  });
});

test("digital zoom counts in the equivalent and the zoom", () => {
  const photo = { exifFocalLength: 5.59, exifDigitalZoom: 2 };
  const details = shotDetails(photo, shotCameras(CAMERAS).get("wide"));
  assert.equal(details.equivalent, "47 mm");
  assert.equal(details.zoom, "2×");
  assert.equal(details.digitalZoom, "2× digital");
});

test("long exposures read in seconds", () => {
  assert.equal(shotDetails({ exifShutterSpeed: 0.7 }).shutter, "0.7 s");
  assert.equal(shotDetails({ exifShutterSpeed: 2 }).shutter, "2 s");
});

test("without the camera only the EXIF values; nothing known -> null", () => {
  assert.deepEqual(shotDetails({ exifFocalLength: 5.59 }), {
    aperture: null, shutter: null, iso: null, focalLength: "5.59 mm", equivalent: null, zoom: null, digitalZoom: null,
  });
  assert.equal(shotDetails({ exifDigitalZoom: 2 }), null);
});
