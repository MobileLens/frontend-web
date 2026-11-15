// The review editor's formatting buttons, on the text of a <textarea> and its selection. The same
// four formats as the mobile editors: **bold**, *italic*, "## " headings and "- " lists.
// Each returns { text, start, end }: the new text and the selection to restore.

// Bold or italic around the selection; pressed again on marked text, the marks come off.
export function toggleInline(text, start, end, marker, placeholder) {
  // Spaces at the ends of the selection stay outside the marks ("** a **" isn't bold).
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;

  const size = marker.length;
  const before = text.slice(start - size, start);
  const after = text.slice(end, end + size);
  // Italic "*" next to a bold "**" is part of the bold mark, not an italic one.
  const isMarked = before === marker && after === marker
    && (size === 2 || (text[start - 2] !== "*" && text[end + 1] !== "*"));

  if (isMarked) {
    return {
      text: text.slice(0, start - size) + text.slice(start, end) + text.slice(end + size),
      start: start - size,
      end: end - size,
    };
  }

  const selected = text.slice(start, end) || placeholder;
  return {
    text: text.slice(0, start) + marker + selected + marker + text.slice(end),
    start: start + size,
    end: start + size + selected.length,
  };
}

const HEADING = /^#{1,6} /;
const BULLET = /^[-*+] /;

// "## " or "- " at the start of every line the selection touches; off again when all have it.
export function toggleLinePrefix(text, start, end, prefix) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  // A selection of whole lines ends after a line break: the next line isn't part of it.
  const last = end > start && text[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = text.indexOf("\n", last);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;

  const lines = text.slice(lineStart, lineEnd).split("\n");
  const allHaveIt = lines.every((line) => line.startsWith(prefix));

  const changed = lines
    .map((line) => {
      if (allHaveIt) return line.slice(prefix.length);
      if (line.startsWith(prefix)) return line;
      // A heading turned into a list item (or the other way) loses its old mark.
      return prefix + line.replace(HEADING, "").replace(BULLET, "");
    })
    .join("\n");

  return {
    text: text.slice(0, lineStart) + changed + text.slice(lineEnd),
    start: lineStart,
    end: lineStart + changed.length,
  };
}
