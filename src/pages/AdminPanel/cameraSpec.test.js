import assert from "node:assert/strict";
import { test } from "node:test";
import { cameraToForm, formToCamera } from "./cameraSpec.js";

const XIAOMI_12 = {
  type: "wide", facing: "back", focalLengthMm: 5.6, aperture: 1.88, cropFactor: 6.1, pixelPitchUm: 1,
  resolutionMp: 50.4, activeResolutionMp: 12.6, photoResolutionsMp: [12.6], videoModes: [],
};

test("the form keeps the saved list and sends it back, never activeResolutionMp", () => {
  const { spec } = formToCamera(cameraToForm(XIAOMI_12));
  assert.deepEqual(spec.photoResolutionsMp, [12.6]);
  assert.equal("activeResolutionMp" in spec, false);
});

test("a fixed list is sent normalised", () => {
  const form = { ...cameraToForm(XIAOMI_12), photoResolutionsMp: [12.6, 50.4, 50] };
  assert.deepEqual(formToCamera(form).spec.photoResolutionsMp, [50.4, 12.6]);
});

test("cleared sizes are sent as [] (unknown)", () => {
  const form = { ...cameraToForm(XIAOMI_12), photoResolutionsMp: [] };
  assert.deepEqual(formToCamera(form).spec.photoResolutionsMp, []);
});

test("a size above a lowered sensor resolution stops the save", () => {
  const form = { ...cameraToForm(XIAOMI_12), resolutionMp: "12", photoResolutionsMp: [50.4, 12.6] };
  assert.match(formToCamera(form).error, /^Photo sizes: .*larger than the sensor/);
});

test("a camera without the field starts as unknown", () => {
  const legacy = { ...XIAOMI_12, photoResolutionsMp: undefined };
  assert.deepEqual(cameraToForm(legacy).photoResolutionsMp, []);
});
