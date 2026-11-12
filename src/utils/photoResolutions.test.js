import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addPhotoSize,
  binnedPixelPitch,
  normalizePhotoSizes,
  parseMp,
  photoSizesProblem,
  photoSizesSummary,
  removePhotoSize,
  singleSizeWarning,
  suggestedPhotoSizes,
} from "./photoResolutions.js";

// Xiaomi 12 back wide camera as the catalogue returns it after the migration.
const XIAOMI_12 = { resolutionMp: 50.4, activeResolutionMp: 12.6, photoResolutionsMp: [12.6], pixelPitchUm: 1 };

describe("parseMp", () => {
  test("takes a dot or a comma", () => {
    assert.equal(parseMp("12.6"), 12.6);
    assert.equal(parseMp(" 12,6 "), 12.6);
    assert.equal(parseMp("50"), 50);
  });

  test("refuses anything else", () => {
    for (const text of ["", "abc", "-5", "12 MP", "1.2.3"]) assert.equal(parseMp(text), null, text);
  });
});

describe("normalizePhotoSizes", () => {
  test("rounds to 0.1 MP and sorts largest first", () => {
    assert.deepEqual(normalizePhotoSizes([12.04, 48, 24.06]), [48, 24.1, 12]);
  });

  test("merges sizes within 2 % into the larger one", () => {
    assert.deepEqual(normalizePhotoSizes([49.9, 50]), [50]);
    assert.deepEqual(normalizePhotoSizes([12.5, 12.6, 50.4]), [50.4, 12.6]);
    assert.deepEqual(normalizePhotoSizes([50, 48]), [50, 48]); // 4 % apart: two settings
  });

  test("keeps unknown empty", () => {
    assert.deepEqual(normalizePhotoSizes(null), []);
    assert.deepEqual(normalizePhotoSizes([]), []);
  });
});

describe("adding, removing and clearing", () => {
  test("adds the full sensor to the migrated Xiaomi 12 list", () => {
    assert.deepEqual(addPhotoSize([12.6], 50.4, 50.4), { sizes: [50.4, 12.6] });
  });

  test("a near duplicate does not add a second chip", () => {
    assert.deepEqual(addPhotoSize([50.4, 12.6], 50, 50.4).sizes, [50.4, 12.6]);
  });

  test("refuses sizes out of 0.1–500 MP", () => {
    assert.match(addPhotoSize([], 0.05, null).error, /between 0.1 and 500/);
    assert.match(addPhotoSize([], 501, null).error, /between 0.1 and 500/);
    assert.equal(addPhotoSize([], 500, null).error, undefined);
  });

  test("refuses sizes over the sensor + 2 %", () => {
    assert.equal(addPhotoSize([], 51.4, 50.4).error, undefined); // 50.4 × 1.02 = 51.408
    assert.match(addPhotoSize([], 51.5, 50.4).error, /larger than the sensor/);
  });

  test("allows at most 8 sizes and leaves the list untouched", () => {
    const eight = [200, 150, 100, 75, 50, 30, 20, 12];
    const result = addPhotoSize(eight, 8, 200);
    assert.match(result.error, /at most 8/);
    assert.equal(result.sizes, eight);
  });

  test("removes one chip; an empty list means unknown", () => {
    assert.deepEqual(removePhotoSize([50.4, 12.6], 50.4), [12.6]);
    assert.deepEqual(removePhotoSize([12.6], 12.6), []);
  });

  test("checks a whole list against a changed sensor resolution", () => {
    assert.equal(photoSizesProblem([50.4, 12.6], 50.4), "");
    assert.match(photoSizesProblem([50.4, 12.6], 12.6), /larger than the sensor/);
    assert.equal(photoSizesProblem([], 50.4), "");
  });
});

describe("suggestedPhotoSizes", () => {
  test("full sensor plus binned sizes of 8 MP and up", () => {
    assert.deepEqual(suggestedPhotoSizes(200, []), [200, 50, 22.2, 12.5]);
    assert.deepEqual(suggestedPhotoSizes(50.4, []), [50.4, 12.6]); // /9 = 5.6, /16 = 3.2: too small
  });

  test("skips sizes already listed (within 2 %)", () => {
    assert.deepEqual(suggestedPhotoSizes(50.4, [12.6]), [50.4]);
    assert.deepEqual(suggestedPhotoSizes(50.4, [50, 12.5]), []);
  });

  test("nothing without a sensor resolution", () => {
    assert.deepEqual(suggestedPhotoSizes(null, []), []);
  });
});

describe("singleSizeWarning", () => {
  test("warns about Xiaomi 12 and flags it as migrated binned data", () => {
    assert.deepEqual(singleSizeWarning([12.6], 50.4, 12.6), { size: 12.6, likelyMigrated: true });
  });

  test("still warns about Pixel 8, where only 12.5 MP is true", () => {
    assert.equal(singleSizeWarning([12.5], 50, 12.5).size, 12.5);
  });

  test("not migrated-looking when the size is no n×n binning", () => {
    assert.deepEqual(singleSizeWarning([24], 48, 24), { size: 24, likelyMigrated: false });
  });

  test("no warning for full resolution, several sizes or unknown", () => {
    assert.equal(singleSizeWarning([50], 50.4, 50), null);
    assert.equal(singleSizeWarning([50.4, 12.6], 50.4, 50.4), null);
    assert.equal(singleSizeWarning([], 50.4, 50.4), null);
  });
});

describe("photoSizesSummary (line under the sensor resolution)", () => {
  test("[50.4, 12.6] lists every size", () => {
    assert.equal(photoSizesSummary({ resolutionMp: 50.4, photoResolutionsMp: [50.4, 12.6] }), "50.4 · 12.6 MP photos");
  });

  test("[12.6] on 50.4 MP says only", () => {
    assert.equal(photoSizesSummary(XIAOMI_12), "only 12.6 MP photos");
  });

  test("null or [] shows nothing, even with activeResolutionMp", () => {
    assert.equal(photoSizesSummary({ resolutionMp: 50.4, activeResolutionMp: 12.6, photoResolutionsMp: null }), null);
    assert.equal(photoSizesSummary({ resolutionMp: 50.4, activeResolutionMp: 12.6, photoResolutionsMp: [] }), null);
  });

  test("one size equal to the sensor shows nothing", () => {
    assert.equal(photoSizesSummary({ resolutionMp: 48, photoResolutionsMp: [48] }), null);
    assert.equal(photoSizesSummary({ resolutionMp: 50.4, photoResolutionsMp: [50] }), null);
  });
});

describe("binnedPixelPitch (examples from the API doc)", () => {
  test("iPhone 16 main: 48 → 12 MP is 2×2", () => {
    assert.deepEqual(binnedPixelPitch({ resolutionMp: 48, pixelPitchUm: 1, photoResolutionsMp: [48, 24, 12] }), { pitchUm: 2, mp: 12 });
  });

  test("Pixel 8 main: 2.4 µm at 12.5 MP", () => {
    assert.deepEqual(binnedPixelPitch({ resolutionMp: 50, pixelPitchUm: 1.2, photoResolutionsMp: [12.5] }), { pitchUm: 2.4, mp: 12.5 });
  });

  test("S24 Ultra main: 200/12 is 4 % off 16, so 1.2 µm at 50 MP", () => {
    assert.deepEqual(binnedPixelPitch({ resolutionMp: 200, pixelPitchUm: 0.6, photoResolutionsMp: [200, 50, 12] }), { pitchUm: 1.2, mp: 50 });
  });

  test("nothing for a computational mode or unknown sizes", () => {
    assert.equal(binnedPixelPitch({ resolutionMp: 48, pixelPitchUm: 1, photoResolutionsMp: [48, 24] }), null);
    assert.equal(binnedPixelPitch({ resolutionMp: 50, pixelPitchUm: 1.2, photoResolutionsMp: [] }), null);
  });
});
