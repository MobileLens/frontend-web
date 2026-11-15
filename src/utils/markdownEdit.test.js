import assert from "node:assert/strict";
import { test } from "node:test";

import { toggleInline, toggleLinePrefix } from "./markdownEdit.js";

test("bold and italic wrap the selection, without its spaces", () => {
  assert.deepEqual(toggleInline("a good phone", 2, 7, "**", "bold"), { text: "a **good** phone", start: 4, end: 8 });
  assert.deepEqual(toggleInline("a good phone", 1, 7, "*", "italic"), { text: "a *good* phone", start: 3, end: 7 });
});

test("with nothing selected the placeholder is inserted and selected", () => {
  assert.deepEqual(toggleInline("ab", 1, 1, "**", "bold text"), { text: "a**bold text**b", start: 3, end: 12 });
});

test("pressed again, the marks come off", () => {
  assert.deepEqual(toggleInline("a **good** phone", 4, 8, "**", "bold"), { text: "a good phone", start: 2, end: 6 });
  assert.deepEqual(toggleInline("a *good* phone", 3, 7, "*", "italic"), { text: "a good phone", start: 2, end: 6 });
});

test("italic inside a bold mark adds its own", () => {
  assert.equal(toggleInline("**good**", 2, 6, "*", "italic").text, "***good***");
});

test("headings and lists go on every selected line", () => {
  assert.deepEqual(toggleLinePrefix("one\ntwo\nthree", 5, 9, "- "), { text: "one\n- two\n- three", start: 4, end: 17 });
  assert.equal(toggleLinePrefix("one\ntwo", 0, 0, "## ").text, "## one\ntwo");
  assert.equal(toggleLinePrefix("one\ntwo\n", 0, 4, "- ").text, "- one\ntwo\n");
});

test("pressed again, they come off; a heading becomes a list item", () => {
  assert.equal(toggleLinePrefix("- one\n- two", 0, 11, "- ").text, "one\ntwo");
  assert.equal(toggleLinePrefix("## Night", 3, 3, "- ").text, "- Night");
  assert.equal(toggleLinePrefix("- Night", 3, 3, "## ").text, "## Night");
});
