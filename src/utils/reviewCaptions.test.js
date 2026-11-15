import assert from "node:assert/strict";
import { test } from "node:test";

import { readCameraFromExif } from "./exif.js";
import {
  UNKNOWN_SOURCE,
  cameraName,
  captionBlock,
  captionText,
  captionsInOrder,
  splitCaptions,
  withoutCaptions,
} from "./reviewCaptions.js";

test("camera names as in the iOS app", () => {
  assert.equal(cameraName("Apple", "iPhone 16"), "Apple iPhone 16");
  assert.equal(cameraName("Canon", "Canon EOS R5"), "Canon EOS R5");
  assert.equal(cameraName("SAMSUNG", "SM-S928B"), "Samsung SM-S928B");
  assert.equal(cameraName("NIKON CORPORATION", "NIKON Z 8"), "NIKON Z 8");
  assert.equal(cameraName("LG", "G8"), "LG G8");
  assert.equal(cameraName(" Xiaomi ", ""), "Xiaomi");
  assert.equal(cameraName(null, null), null);

  assert.equal(captionText({ make: "Google", model: "Pixel 9" }), "Shot on Google Pixel 9");
  assert.equal(captionText(null), UNKNOWN_SOURCE);
});

test("the caption block goes after the text and splits back off it", () => {
  const markdown = `Great phone.\n\n**Night** shots are fine.${captionBlock(["Shot on Apple iPhone 16", "Shot on Odd_Name [2]"])}`;

  assert.equal(
    markdown,
    "Great phone.\n\n**Night** shots are fine.\n\n*Photo 1: Shot on Apple iPhone 16*\n\n*Photo 2: Shot on Odd\\_Name \\[2\\]*",
  );

  const { body, captions } = splitCaptions(markdown);
  assert.equal(body, "Great phone.\n\n**Night** shots are fine.");
  assert.deepEqual([...captions], [[2, "Shot on Odd_Name [2]"], [1, "Shot on Apple iPhone 16"]]);
});

test("text without captions stays as it is", () => {
  assert.deepEqual(splitCaptions("Just *text*."), { body: "Just *text*.", captions: new Map() });
  assert.equal(splitCaptions("A\r\n\r\n*Photo 1: Source unknown*").body, "A");
  assert.equal(captionBlock([]), "");
});

test("excerpts lose the captions", () => {
  assert.equal(withoutCaptions("A good phone. *Photo 1: Shot on App"), "A good phone.");
  assert.equal(withoutCaptions("A good phone. Photo 1: Source unknown Photo 2"), "A good phone.");
  assert.equal(withoutCaptions("No photos here."), "No photos here.");
});

test("captions follow the photos' order", () => {
  assert.deepEqual(
    captionsInOrder([{ caption: "Shot on A" }, {}, { caption: "Shot on B" }, {}]),
    ["Shot on A", UNKNOWN_SOURCE, "Shot on B"],
  );
  assert.deepEqual(captionsInOrder([{}, {}]), []);
});

// A JPEG with only an APP1 segment: TIFF header, IFD0 with Make (inline, 4 bytes) and Model.
function jpegWithExif(make, model, littleEndian) {
  const tiff = new ArrayBuffer(8 + 2 + 2 * 12 + 4 + 32);
  const view = new DataView(tiff);
  view.setUint16(0, littleEndian ? 0x4949 : 0x4d4d);
  view.setUint16(2, 42, littleEndian);
  view.setUint32(4, 8, littleEndian);
  view.setUint16(8, 2, littleEndian);

  const modelAt = 8 + 2 + 2 * 12 + 4;
  const entries = [[0x010f, make], [0x0110, model]];
  entries.forEach(([tag, text], index) => {
    const entry = 10 + index * 12;
    const bytes = [...text].map((character) => character.charCodeAt(0)).concat(0);
    view.setUint16(entry, tag, littleEndian);
    view.setUint16(entry + 2, 2, littleEndian);
    view.setUint32(entry + 4, bytes.length, littleEndian);
    if (bytes.length <= 4) {
      bytes.forEach((byte, offset) => view.setUint8(entry + 8 + offset, byte));
    } else {
      view.setUint32(entry + 8, modelAt, littleEndian);
      bytes.forEach((byte, offset) => view.setUint8(modelAt + offset, byte));
    }
  });

  const segment = [0x45, 0x78, 0x69, 0x66, 0, 0, ...new Uint8Array(tiff)];
  const length = segment.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...segment, 0xff, 0xda, 0, 2]).buffer;
}

test("EXIF Make and Model are read from a JPEG", () => {
  assert.deepEqual(readCameraFromExif(jpegWithExif("LG", "Nexus 5X", true)), { make: "LG", model: "Nexus 5X" });
  assert.deepEqual(readCameraFromExif(jpegWithExif("ABC", "Pixel 9 Pro", false)), { make: "ABC", model: "Pixel 9 Pro" });
});

test("files without EXIF give nothing", () => {
  assert.equal(readCameraFromExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2, 0, 0, 0, 0, 0, 0]).buffer), null);
  assert.equal(readCameraFromExif(new Uint8Array(20).buffer), null);
  assert.equal(readCameraFromExif(new Uint8Array(3).buffer), null);
});
