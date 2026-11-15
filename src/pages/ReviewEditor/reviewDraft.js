// What the review editor sends: the Markdown with the photo captions, the media list and, for an
// edit, only the fields that changed (a regular user's edit of a published review sends it back to
// verification, so an unchanged field must not count as an edit).

import { captionBlock, captionsInOrder, splitCaptions } from "../../utils/reviewCaptions.js";

// Reviewers and above publish their reviews at once; other users' reviews wait for a moderator.
const PUBLISHING_ROLES = ["reviewer", "moderator", "admin"];

export function canPublishReviews(role) {
  return PUBLISHING_ROLES.includes(role);
}

// The editor's photos from a stored review: its media in order, each with its caption.
export function draftFromReview(review) {
  const { body, captions } = splitCaptions(review.contentMarkdown);

  return {
    title: review.title,
    body,
    phones: review.phones?.length ? review.phones : [review.phone].filter(Boolean),
    photos: (review.media || []).map((item, index) => ({
      key: item.id,
      id: item.id,
      type: item.type,
      previewUrl: item.thumbUrl || item.mediumUrl || item.url,
      caption: captions.get(index + 1) || null,
    })),
  };
}

// The text, then one caption paragraph per photo, in the photos' order.
export function contentMarkdown(body, photos) {
  return body.trim() + captionBlock(captionsInOrder(photos));
}

// PATCH / POST mediaItems: a photo the review has by its id, a new upload by its object key.
export function mediaItems(photos) {
  return photos.map((photo) => (photo.id ? { id: photo.id } : { objectKey: photo.upload.objectKey, type: "photo" }));
}

// The PATCH body for an edit: only what differs from the stored review.
export function editChanges(review, draft) {
  const changes = {};
  const title = draft.title.trim();
  if (title !== review.title) changes.title = title;

  // Compared with the stored review read the same way, so spaces at its end or line breaks
  // written by another app don't count as an edit.
  const stored = draftFromReview(review);
  const markdown = contentMarkdown(draft.body, draft.photos);
  if (markdown !== contentMarkdown(stored.body, stored.photos)) changes.contentMarkdown = markdown;

  const phoneIds = draft.phones.map((phone) => phone.id);
  const storedPhoneIds = review.smartphoneIds?.length ? review.smartphoneIds : [review.smartphoneId];
  if (phoneIds.join() !== storedPhoneIds.join()) changes.smartphoneIds = phoneIds;

  const storedMediaIds = (review.media || []).map((item) => item.id);
  const mediaChanged = draft.photos.length !== storedMediaIds.length
    || draft.photos.some((photo, index) => photo.id !== storedMediaIds[index]);
  if (mediaChanged) changes.mediaItems = mediaItems(draft.photos);

  return changes;
}

/**
 * The editor's save buttons for a review in this status (null: a new review). Each is
 * { label, status, primary }; `status` is sent with the changes (undefined keeps the current one).
 * The backend's rules: the author moves a review between draft and pending, a reviewer also
 * publishes, and a review hidden by an administrator can only be sent again for verification.
 */
export function saveActions(status, canPublish) {
  const submit = canPublish
    ? { label: "Publish", status: "published", primary: true }
    : { label: "Submit for verification", status: "pending", primary: true };

  switch (status) {
    case null:
      return [{ ...submit, label: canPublish ? "Publish review" : "Submit for verification", status: undefined }];
    case "draft":
      return [{ label: "Save draft", status: undefined, primary: false }, submit];
    case "pending":
      return canPublish
        ? [{ label: "Save changes", status: undefined, primary: false }, { ...submit, label: "Save and publish" }]
        : [{ label: "Save changes", status: undefined, primary: true }];
    case "hidden":
      return [
        { label: "Save changes", status: undefined, primary: false },
        { label: "Save and ask to publish again", status: "pending", primary: true },
      ];
    default:
      return [{ label: "Save changes", status: undefined, primary: true }];
  }
}

// What saving does to the review, shown above the buttons.
export function saveNote(status, canPublish) {
  if (status === null) {
    return canPublish
      ? "As a reviewer, your review is published at once."
      : "A moderator checks every review before it's published. You can still edit it while it waits.";
  }
  if (status === "published" && !canPublish) {
    return "Saving changes sends the review back to a moderator: it isn't shown to others until it's published again.";
  }
  if (status === "hidden") {
    return "An administrator hid this review. Edit it, then ask for it to be published again.";
  }
  if (status === "draft") {
    return "Drafts are only visible to you.";
  }
  return null;
}
