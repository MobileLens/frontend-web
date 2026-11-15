// The automatic caption under a review photo, as in the iOS app (Models/PhotoCaption.swift): where
// the photo came from, read from its EXIF Make and Model ("Shot on Apple iPhone 16"), or "Source
// unknown". The captions are stored at the end of the review's Markdown, one italic paragraph per
// photo, so every platform shows them without another field:
//
//   The text of the review.
//
//   *Photo 1: Shot on Apple iPhone 16*
//
//   *Photo 2: Source unknown*
//
// Photo numbers follow the order of the review's media. The captions are stored text, not
// interface text.

export const UNKNOWN_SOURCE = "Source unknown";

const SPECIAL = "\\*_`[]";

function escaped(text) {
  return [...text].map((character) => (SPECIAL.includes(character) ? `\\${character}` : character)).join("");
}

function unescaped(text) {
  let result = "";
  let isEscaped = false;

  for (const character of text) {
    if (character === "\\" && !isEscaped) {
      isEscaped = true;
    } else {
      result += character;
      isEscaped = false;
    }
  }

  return result;
}

// "SAMSUNG" and "NIKON CORPORATION" are written in capitals; short makes ("LG", "HP") stay.
function normalizedMake(make) {
  const trimmed = make?.trim();
  if (!trimmed) return null;

  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /\p{L}/u.test(trimmed)) {
    return trimmed.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
  }

  return trimmed;
}

// "Apple iPhone 16" from Make "Apple" and Model "iPhone 16". The make isn't repeated when the model
// starts with it ("Canon" + "Canon EOS R5").
export function cameraName(make, model) {
  const makeName = normalizedMake(make);
  const modelName = model?.trim() || null;

  if (makeName && modelName) {
    const firstWord = makeName.split(" ")[0];
    return modelName.toLowerCase().startsWith(firstWord.toLowerCase()) ? modelName : `${makeName} ${modelName}`;
  }

  return modelName || makeName || null;
}

// "Shot on Apple iPhone 16", or "Source unknown" when the photo names no camera.
export function captionText(metadata) {
  const name = cameraName(metadata?.make, metadata?.model);
  return name ? `Shot on ${name}` : UNKNOWN_SOURCE;
}

// The block that goes after the review's text; empty for no captions, otherwise it starts with a
// blank line so it can be appended as it is.
export function captionBlock(captions) {
  return captions.map((caption, index) => `\n\n*Photo ${index + 1}: ${escaped(caption)}*`).join("");
}

// "*Photo 2: Shot on Apple iPhone 16*" -> { number: 2, text: "Shot on Apple iPhone 16" }
function parseCaption(paragraph) {
  const match = /^\*Photo (\d+): (.+)\*$/s.exec(paragraph);
  return match ? { number: Number(match[1]), text: unescaped(match[2]) } : null;
}

// The review's Markdown without its caption block, and the captions by photo number (from 1).
export function splitCaptions(markdown) {
  const paragraphs = (markdown || "").replace(/\r\n/g, "\n").split("\n\n");
  const captions = new Map();

  while (paragraphs.length > 0) {
    const caption = parseCaption(paragraphs[paragraphs.length - 1].trim());
    if (!caption) break;
    captions.set(caption.number, caption.text);
    paragraphs.pop();
  }

  if (captions.size === 0) return { body: markdown || "", captions };
  return { body: paragraphs.join("\n\n"), captions };
}

// An excerpt up to where the captions begin (it may end half way through them, without the italic
// marks).
export function withoutCaptions(text) {
  if (!text) return text;

  const starts = ["Photo 1: Shot on", `Photo 1: ${UNKNOWN_SOURCE}`]
    .map((start) => text.indexOf(start))
    .filter((index) => index >= 0);
  if (starts.length === 0) return text;

  let cut = Math.min(...starts);
  if (cut > 0 && text[cut - 1] === "*") cut -= 1;
  return text.slice(0, cut).trim();
}

// The captions for media in this order: trailing photos without one need none, one in the middle
// becomes "Source unknown".
export function captionsInOrder(items) {
  const captions = items.map((item) => item.caption || null);
  while (captions.length > 0 && captions[captions.length - 1] === null) captions.pop();
  return captions.map((caption) => caption ?? UNKNOWN_SOURCE);
}
