import assert from "node:assert/strict";
import { test } from "node:test";

import { canPublishReviews, contentMarkdown, draftFromReview, editChanges, saveActions } from "./reviewDraft.js";

const review = {
  id: "r1",
  title: "Night shots",
  contentMarkdown: "Good at night.\r\n\r\n*Photo 1: Shot on Apple iPhone 16*",
  smartphoneId: "p1",
  smartphoneIds: ["p1", "p2"],
  phones: [{ id: "p1", modelName: "iPhone 16" }, { id: "p2", modelName: "Pixel 9" }],
  media: [
    { id: "m1", type: "photo", url: "https://x/m1.jpg", thumbUrl: "https://x/m1-w480.webp" },
    { id: "m2", type: "photo", url: "https://x/m2.jpg", thumbUrl: null },
  ],
};

test("a stored review opens with its text, phones and captioned photos", () => {
  const draft = draftFromReview(review);
  assert.equal(draft.body, "Good at night.");
  assert.deepEqual(draft.phones.map((phone) => phone.id), ["p1", "p2"]);
  assert.deepEqual(draft.photos.map((photo) => [photo.id, photo.caption, photo.previewUrl]), [
    ["m1", "Shot on Apple iPhone 16", "https://x/m1-w480.webp"],
    ["m2", null, "https://x/m2.jpg"],
  ]);
});

test("an untouched edit changes nothing", () => {
  assert.deepEqual(editChanges(review, draftFromReview(review)), {});
});

test("only the changed fields are sent", () => {
  const draft = draftFromReview(review);
  const edited = { ...draft, title: " Night shots, again ", body: `${draft.body}\n\nAnd by day.` };
  assert.deepEqual(editChanges(review, edited), {
    title: "Night shots, again",
    contentMarkdown: "Good at night.\n\nAnd by day.\n\n*Photo 1: Shot on Apple iPhone 16*",
  });
});

test("reordered photos and phones go as whole lists; captions follow their photos", () => {
  const draft = draftFromReview(review);
  const added = { key: "new", upload: { objectKey: "abc.jpg" }, caption: "Shot on Google Pixel 9" };
  const edited = { ...draft, phones: [...draft.phones].reverse(), photos: [draft.photos[1], added, draft.photos[0]] };

  assert.deepEqual(editChanges(review, edited), {
    contentMarkdown: "Good at night.\n\n*Photo 1: Source unknown*\n\n*Photo 2: Shot on Google Pixel 9*\n\n*Photo 3: Shot on Apple iPhone 16*",
    smartphoneIds: ["p2", "p1"],
    mediaItems: [{ id: "m2" }, { objectKey: "abc.jpg", type: "photo" }, { id: "m1" }],
  });
});

test("no photos, no captions", () => {
  assert.equal(contentMarkdown("  Text  ", []), "Text");
});

test("save buttons follow the backend's status rules", () => {
  const labels = (status, canPublish) => saveActions(status, canPublish).map((action) => [action.label, action.status ?? null]);

  assert.deepEqual(labels(null, false), [["Submit for verification", null]]);
  assert.deepEqual(labels(null, true), [["Publish review", null]]);
  assert.deepEqual(labels("draft", false), [["Save draft", null], ["Submit for verification", "pending"]]);
  assert.deepEqual(labels("draft", true), [["Save draft", null], ["Publish", "published"]]);
  assert.deepEqual(labels("pending", false), [["Save changes", null]]);
  assert.deepEqual(labels("hidden", true), [["Save changes", null], ["Save and ask to publish again", "pending"]]);
  assert.deepEqual(labels("published", false), [["Save changes", null]]);
});

test("reviewers and staff publish their own reviews", () => {
  assert.equal(canPublishReviews("user"), false);
  assert.equal(canPublishReviews("reviewer"), true);
  assert.equal(canPublishReviews("admin"), true);
  assert.equal(canPublishReviews(undefined), false);
});
