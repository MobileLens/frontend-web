// Reads the camera's Make and Model from a photo's EXIF, for the automatic review caption
// ("Shot on Apple iPhone 16"). JPEG (APP1), PNG (eXIf) and WebP (EXIF chunk); HEIC and AVIF are
// not read, so they get "Source unknown", as a photo with no camera data does.

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TYPE_ASCII = 2;

function ascii(view, start, length) {
  let text = "";
  for (let index = 0; index < length && start + index < view.byteLength; index += 1) {
    const code = view.getUint8(start + index);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text.trim() || null;
}

// Make and Model from the first directory (IFD0) of TIFF data starting at `start`.
function readTiff(view, start) {
  if (start + 8 > view.byteLength) return null;

  const order = view.getUint16(start);
  if (order !== 0x4949 && order !== 0x4d4d) return null;
  const little = order === 0x4949;
  if (view.getUint16(start + 2, little) !== 42) return null;

  const ifd = start + view.getUint32(start + 4, little);
  if (ifd + 2 > view.byteLength) return null;

  const result = { make: null, model: null };
  const count = view.getUint16(ifd, little);

  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > view.byteLength) break;

    const tag = view.getUint16(entry, little);
    if ((tag !== TAG_MAKE && tag !== TAG_MODEL) || view.getUint16(entry + 2, little) !== TYPE_ASCII) continue;

    const length = view.getUint32(entry + 4, little);
    const at = length <= 4 ? entry + 8 : start + view.getUint32(entry + 8, little);
    const value = ascii(view, at, length);
    if (tag === TAG_MAKE) result.make = value;
    else result.model = value;
  }

  return result.make || result.model ? result : null;
}

// EXIF data may start with "Exif\0\0" before the TIFF header.
function readExifPayload(view, start) {
  const hasPrefix = start + 6 <= view.byteLength && ascii(view, start, 4) === "Exif";
  return readTiff(view, hasPrefix ? start + 6 : start);
}

function readJpeg(view) {
  let offset = 2;

  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    // Start of scan: the image data follows, no more metadata.
    if (marker === 0xda || marker === 0xd9) return null;

    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && ascii(view, offset + 4, 4) === "Exif") {
      const found = readTiff(view, offset + 10);
      if (found) return found;
    }
    offset += 2 + length;
  }

  return null;
}

function readPng(view) {
  let offset = 8;

  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset);
    const type = ascii(view, offset + 4, 4);
    if (type === "eXIf") return readExifPayload(view, offset + 8);
    if (type === "IDAT" || type === "IEND") return null;
    offset += 12 + length;
  }

  return null;
}

function readWebp(view) {
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const type = ascii(view, offset, 4);
    const length = view.getUint32(offset + 4, true);
    if (type === "EXIF") return readExifPayload(view, offset + 8);
    offset += 8 + length + (length % 2);
  }

  return null;
}

// { make, model } or null, from the first bytes of the file (or all of it).
export function readCameraFromExif(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 12) return null;

  try {
    if (view.getUint16(0) === 0xffd8) return readJpeg(view);
    if (view.getUint32(0) === 0x89504e47) return readPng(view);
    if (ascii(view, 0, 4) === "RIFF" && ascii(view, 8, 4) === "WEBP") return readWebp(view);
  } catch {
    // A damaged file: no caption data rather than an error.
  }

  return null;
}
