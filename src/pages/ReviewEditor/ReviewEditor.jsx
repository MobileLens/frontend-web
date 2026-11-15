import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_MEDIA_MAX,
  REVIEW_PHONES_MAX,
  REVIEW_TITLE_MAX,
  createReview,
  getReviewById,
  updateReview,
  uploadReviewMedia,
} from "../../api/reviews";
import { getSmartphoneById } from "../../api/smartphones";
import Icon from "../../components/Icon/Icon";
import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import PhoneSearch, { PhoneThumb } from "../../components/PhoneSearch/PhoneSearch";
import { useAuth } from "../../context/useAuth";
import { readCameraFromExif } from "../../utils/exif";
import { toggleInline, toggleLinePrefix } from "../../utils/markdownEdit";
import { captionText } from "../../utils/reviewCaptions";
import {
  canPublishReviews,
  contentMarkdown,
  draftFromReview,
  editChanges,
  mediaItems,
  saveActions,
  saveNote,
} from "./reviewDraft";
import "../../styles/reviews.css";
import "./ReviewEditor.css";

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Waiting for verification",
  published: "Published",
  hidden: "Hidden by an administrator",
};

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif"];
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;
const ACCEPT = [...PHOTO_TYPES, ".heic", ".heif"].join(",");
// EXIF sits at the start of JPEG and PNG files; WebP keeps it after the image, so it's read whole.
const EXIF_HEAD_BYTES = 1024 * 1024;

const TOOLS = [
  { id: "bold", label: "Bold", shortcut: "b", text: "B", apply: (text, start, end) => toggleInline(text, start, end, "**", "bold text") },
  { id: "italic", label: "Italic", shortcut: "i", text: "I", apply: (text, start, end) => toggleInline(text, start, end, "*", "italic text") },
  { id: "heading", label: "Heading", text: "H", apply: (text, start, end) => toggleLinePrefix(text, start, end, "## ") },
  { id: "list", label: "Bulleted list", icon: "list", apply: (text, start, end) => toggleLinePrefix(text, start, end, "- ") },
];

const UPLOAD_ERRORS = {
  FILE_TOO_LARGE: "The file is larger than 60 MB.",
  UNSUPPORTED_MEDIA_TYPE: "This file type isn't accepted (JPEG, PNG, WebP, GIF, HEIC or AVIF).",
};

const SAVE_ERRORS = {
  UPLOAD_NOT_FOUND: "One of the photos is missing on the server. Try saving again.",
  SMARTPHONE_NOT_FOUND: "One of the phones is no longer in the catalogue. Remove it and try again.",
  STATUS_NOT_ALLOWED: "You can't set this status for the review.",
  USER_BANNED: "Your account is banned, so you can't write reviews.",
};

const isPhoto = (file) => PHOTO_TYPES.includes(file.type) || PHOTO_EXTENSIONS.test(file.name);
const phoneName = (phone) => [phone.brandName, phone.modelName].filter(Boolean).join(" ");

let nextPhotoKey = 0;

async function photoFromFile(file) {
  let camera = null;

  try {
    const isWebp = file.type === "image/webp" || /\.webp$/i.test(file.name);
    camera = readCameraFromExif(await (isWebp ? file : file.slice(0, EXIF_HEAD_BYTES)).arrayBuffer());
  } catch (err) {
    console.error("Could not read the photo's EXIF:", err);
  }

  nextPhotoKey += 1;
  return {
    key: `new-${nextPhotoKey}`,
    type: "photo",
    file,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    caption: captionText(camera),
  };
}

function savedNotice(status, previousStatus, canPublish) {
  if (previousStatus === null) {
    return status === "published"
      ? "Your review is published."
      : "Thanks! Your review was sent to a moderator. Until it's published, only you can see it (My reviews).";
  }
  if (status === "published") return previousStatus === "published" ? "Your changes are published." : "Your review is published.";
  if (status === "pending") {
    return previousStatus === "published" && !canPublish
      ? "Your changes were sent to a moderator. The review is shown again once it's published."
      : "Your review is waiting for a moderator.";
  }
  if (status === "draft") return "Draft saved.";
  return "Changes saved. The review stays hidden.";
}

// A photo on the list: the picture (or its file name, for a format the browser can't show), its
// number and caption, and buttons to move or remove it.
function PhotoTile({ photo, index, count, disabled, onMove, onRemove }) {
  const [failed, setFailed] = useState(false);

  return (
    <li className={`editor-photo ${photo.error ? "is-invalid" : ""}`}>
      <div className="editor-photo-picture">
        {photo.type === "video" ? (
          <span className="editor-photo-fallback"><Icon name="video" /> Video</span>
        ) : failed || !photo.previewUrl ? (
          <span className="editor-photo-fallback"><Icon name="image" /> {photo.name || "Photo"}</span>
        ) : (
          <img src={photo.previewUrl} alt="" onError={() => setFailed(true)} />
        )}
        <span className="editor-photo-number">{index + 1}</span>
      </div>

      <p className="editor-photo-caption">{photo.caption || (photo.type === "video" ? "Video" : "No caption")}</p>
      {photo.error && <p className="editor-photo-error" role="alert">{photo.error}</p>}

      <div className="editor-photo-actions">
        <button type="button" className="ui-btn ui-btn-small" disabled={disabled || index === 0} onClick={() => onMove(index, -1)} aria-label={`Move photo ${index + 1} earlier`}>
          <Icon name="arrowLeft" />
        </button>
        <button type="button" className="ui-btn ui-btn-small" disabled={disabled || index === count - 1} onClick={() => onMove(index, 1)} aria-label={`Move photo ${index + 1} later`}>
          <Icon name="arrowRight" />
        </button>
        <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={disabled} onClick={() => onRemove(photo)} aria-label={`Remove photo ${index + 1}`}>
          <Icon name="trash" />
        </button>
      </div>
    </li>
  );
}

/**
 * Writing a review (/review/new, ?phone= for the phone it's about) and editing one
 * (/review/:reviewId/edit): the phones, a title, the text in Markdown (bold, italic, headings and
 * lists, as in the mobile editors) and photos. Each photo gets the automatic caption the mobile
 * apps write ("Shot on Apple iPhone 16" from its EXIF, or "Source unknown"). Saving uploads the
 * new photos first, then creates or updates the review.
 */
export default function ReviewEditor() {
  const { reviewId } = useParams();
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get("phone");
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.id;
  const canPublish = canPublishReviews(currentUser?.role);

  const [stored, setStored] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [photoProblems, setPhotoProblems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrls = useRef(new Set());

  useEffect(() => {
    if (!userId) return undefined;
    let ignore = false;

    async function load() {
      setLoadError("");

      try {
        if (reviewId) {
          const review = await getReviewById(reviewId);
          if (ignore) return;
          if (review.authorId !== userId) {
            setLoadError("Only the author can edit this review.");
            return;
          }
          setStored(review);
          setDraft(draftFromReview(review));
        } else {
          const phone = phoneParam ? await getSmartphoneById(phoneParam).catch(() => null) : null;
          if (ignore) return;
          setStored(null);
          setDraft({ title: "", body: "", phones: phone ? [phone] : [], photos: [] });
        }
        setDirty(false);
      } catch (err) {
        console.error(err);
        if (!ignore) setLoadError(err.status === 404 ? "Review not found." : "Could not load the review.");
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reviewId, phoneParam, userId]);

  // The previews of picked files are freed when the editor closes.
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  // Closing the tab or reloading with unsaved text asks first.
  useEffect(() => {
    if (!dirty) return undefined;

    function warn(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (authLoading || (userId && !draft && !loadError)) {
    return <PageSkeleton />;
  }

  if (!currentUser) {
    return (
      <main className="page">
        <div className="page-narrow">
          <section className="ui-card editor-login">
            <h1 className="ui-card-title">Write a review</h1>
            <p className="ui-card-text">Log in to write reviews of phones and their cameras.</p>
            <div className="ui-actions">
              <Link to="/login" state={{ from: location.pathname + location.search }} className="ui-btn ui-btn-primary">
                <Icon name="login" /> Log in
              </Link>
              <Link to="/register" className="ui-btn"><Icon name="user" /> Register</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loadError) {
    return <p className="page-status page-status-error">{loadError}</p>;
  }

  const status = stored?.status ?? null;
  const phoneIds = draft.phones.map((phone) => phone.id);
  const backTo = stored ? `/review/${stored.id}` : phoneParam ? `/phone/${phoneParam}/reviews` : "/reviews/mine";

  function change(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function changePhotos(update) {
    setDraft((current) => ({ ...current, photos: update(current.photos) }));
    setDirty(true);
  }

  function addPhone(phone) {
    if (phoneIds.includes(phone.id) || phoneIds.length >= REVIEW_PHONES_MAX) return;
    change({ phones: [...draft.phones, phone] });
  }

  function removePhone(id) {
    change({ phones: draft.phones.filter((phone) => phone.id !== id) });
  }

  function makeMain(id) {
    const phone = draft.phones.find((item) => item.id === id);
    change({ phones: [phone, ...draft.phones.filter((item) => item.id !== id)] });
  }

  function applyTool(tool) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = tool.apply(draft.body, textarea.selectionStart, textarea.selectionEnd);
    change({ body: result.text });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.start, result.end);
    });
  }

  function handleTextKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const tool = TOOLS.find((item) => item.shortcut === event.key.toLowerCase());
    if (!tool) return;
    event.preventDefault();
    applyTool(tool);
  }

  async function addFiles(fileList) {
    const problems = [];
    const accepted = [];
    let room = REVIEW_MEDIA_MAX - draft.photos.length;

    for (const file of fileList) {
      if (!isPhoto(file)) {
        problems.push(`${file.name}: not a photo (JPEG, PNG, WebP, GIF, HEIC or AVIF).`);
      } else if (file.size > REVIEW_IMAGE_MAX_BYTES) {
        problems.push(`${file.name}: larger than 60 MB.`);
      } else if (room <= 0) {
        problems.push(`${file.name}: a review takes at most ${REVIEW_MEDIA_MAX} photos.`);
      } else {
        accepted.push(file);
        room -= 1;
      }
    }

    setPhotoProblems(problems);
    if (accepted.length === 0) return;

    const photos = await Promise.all(accepted.map(photoFromFile));
    for (const photo of photos) previewUrls.current.add(photo.previewUrl);
    changePhotos((current) => [...current, ...photos]);
  }

  function movePhoto(index, step) {
    changePhotos((current) => {
      const next = [...current];
      [next[index], next[index + step]] = [next[index + step], next[index]];
      return next;
    });
  }

  function removePhoto(photo) {
    if (photo.file) {
      URL.revokeObjectURL(photo.previewUrl);
      previewUrls.current.delete(photo.previewUrl);
    }
    changePhotos((current) => current.filter((item) => item.key !== photo.key));
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!saving) addFiles([...event.dataTransfer.files]);
  }

  function handleCancel(event) {
    if (dirty && !window.confirm("Leave without saving? Your changes will be lost.")) {
      event.preventDefault();
    }
  }

  async function save(action) {
    setError("");

    const title = draft.title.trim();
    if (draft.phones.length === 0) return setError("Choose the phone the review is about.");
    if (!title) return setError("Give the review a title.");
    if (!draft.body.trim()) return setError("Write the text of the review.");

    setSaving(true);

    try {
      // New photos go up one by one; one that's already up isn't sent again on a retry.
      let photos = draft.photos;
      const waiting = photos.filter((photo) => !photo.id && !photo.upload);

      for (const [index, photo] of waiting.entries()) {
        setProgress(`Uploading photo ${index + 1} of ${waiting.length}…`);
        let patch;

        try {
          patch = { upload: await uploadReviewMedia(photo.file), error: null };
        } catch (err) {
          patch = { error: UPLOAD_ERRORS[err.code] || err.message || "Could not upload the photo." };
        }

        photos = photos.map((item) => (item.key === photo.key ? { ...item, ...patch } : item));
        setDraft((current) => ({
          ...current,
          photos: current.photos.map((item) => (item.key === photo.key ? { ...item, ...patch } : item)),
        }));
        if (patch.error) {
          throw new Error(`Photo ${draft.photos.indexOf(photo) + 1} (${photo.name}) could not be uploaded: ${patch.error} Remove it or try again.`);
        }
      }

      setProgress("Saving the review…");
      let savedId;
      let savedStatus;

      if (!stored) {
        const created = await createReview({
          smartphoneIds: phoneIds,
          title,
          contentMarkdown: contentMarkdown(draft.body, photos),
          mediaItems: mediaItems(photos),
        });
        savedId = created.id;
        savedStatus = created.status;
      } else {
        const changes = editChanges(stored, { ...draft, photos });
        if (action.status && action.status !== stored.status) changes.status = action.status;

        if (Object.keys(changes).length === 0) {
          setDirty(false);
          navigate(`/review/${stored.id}`, { state: { notice: "Nothing to save: the review is as it was." } });
          return;
        }

        const result = await updateReview(stored.id, changes);
        savedId = stored.id;
        savedStatus = result.status;
      }

      setDirty(false);
      navigate(`/review/${savedId}`, { replace: !stored, state: { notice: savedNotice(savedStatus, status, canPublish) } });
    } catch (err) {
      console.error(err);
      // A photo the server lost is uploaded again on the next try.
      if (err.code === "UPLOAD_NOT_FOUND") {
        setDraft((current) => ({ ...current, photos: current.photos.map((item) => ({ ...item, upload: undefined })) }));
      }
      setError(SAVE_ERRORS[err.code] || err.message || "Could not save the review.");
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  const actions = saveActions(status, canPublish);
  const note = saveNote(status, canPublish);

  return (
    <main className="page">
      <div className="page-narrow">
        <Link to={backTo} className="text-link review-back" onClick={handleCancel}>
          <Icon name="arrowLeft" /> {stored ? "Back to the review" : "Back"}
        </Link>

        <header className="page-header editor-header">
          <h1 className="page-title">{stored ? "Edit review" : "Write a review"}</h1>
          {status && <span className="ui-badge">{STATUS_LABELS[status]}</span>}
        </header>

        <form className="editor" onSubmit={(event) => event.preventDefault()} aria-busy={saving}>
          <section className="ui-card editor-section" aria-labelledby="editor-phones">
            <h2 id="editor-phones" className="ui-card-title">Phones</h2>
            <p className="ui-card-text">
              The phone the review is about comes first. Add up to {REVIEW_PHONES_MAX - 1} more to compare it with.
            </p>

            {draft.phones.length > 0 && (
              <ol className="editor-phones">
                {draft.phones.map((phone, index) => (
                  <li key={phone.id} className="editor-phone">
                    <PhoneThumb phone={phone} />
                    <span className="editor-phone-name">
                      <span className="ui-label">{index === 0 ? "Main phone" : "Compared with"}</span>
                      <strong>{phoneName(phone)}</strong>
                    </span>
                    {index > 0 && (
                      <button type="button" className="ui-btn ui-btn-small" disabled={saving} onClick={() => makeMain(phone.id)}>
                        <Icon name="arrowUp" /> Make main
                      </button>
                    )}
                    <button
                      type="button"
                      className="ui-btn ui-btn-small"
                      disabled={saving}
                      onClick={() => removePhone(phone.id)}
                      aria-label={`Remove ${phoneName(phone)}`}
                    >
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {draft.phones.length < REVIEW_PHONES_MAX && (
              <PhoneSearch
                excludeIds={phoneIds}
                onPick={addPhone}
                placeholder={draft.phones.length === 0 ? "Which phone is it about? Type a model name…" : "Compare with: type a model name…"}
                label={draft.phones.length === 0 ? "Search for the phone the review is about" : "Search for a phone to compare with"}
              />
            )}
          </section>

          <section className="ui-card editor-section" aria-labelledby="editor-text">
            <h2 id="editor-text" className="ui-card-title">Review</h2>

            <label className="ui-field">
              <span className="ui-label">Title</span>
              <input
                className="ui-input"
                value={draft.title}
                maxLength={REVIEW_TITLE_MAX}
                disabled={saving}
                onChange={(event) => change({ title: event.target.value })}
              />
            </label>

            <div className="ui-field">
              <div className="editor-text-bar">
                <span className="ui-label" id="editor-body-label">Text</span>
                <div className="editor-tabs" role="group" aria-label="Editor view">
                  <button type="button" className={`lens-tab ${!preview ? "is-active" : ""}`} aria-pressed={!preview} onClick={() => setPreview(false)}>
                    <span className="lens-tab-name">Write</span>
                  </button>
                  <button type="button" className={`lens-tab ${preview ? "is-active" : ""}`} aria-pressed={preview} onClick={() => setPreview(true)}>
                    <span className="lens-tab-name">Preview</span>
                  </button>
                </div>
              </div>

              {preview ? (
                <div className="editor-preview review-body">
                  {draft.body.trim() ? <Markdown>{draft.body}</Markdown> : <p className="page-subtitle">Nothing to preview yet.</p>}
                </div>
              ) : (
                <>
                  <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
                    {TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        className={`editor-tool editor-tool-${tool.id}`}
                        title={tool.shortcut ? `${tool.label} (Ctrl+${tool.shortcut.toUpperCase()})` : tool.label}
                        aria-label={tool.label}
                        disabled={saving}
                        onClick={() => applyTool(tool)}
                      >
                        {tool.icon ? <Icon name={tool.icon} /> : tool.text}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="ui-input editor-textarea"
                    rows={14}
                    aria-labelledby="editor-body-label"
                    placeholder="How does the camera do by day, at night, in portraits, with zoom…?"
                    value={draft.body}
                    disabled={saving}
                    onChange={(event) => change({ body: event.target.value })}
                    onKeyDown={handleTextKeyDown}
                  />
                  <p className="editor-hint">
                    **bold**, *italic*, ## heading, - list item. Leave an empty line between paragraphs.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="ui-card editor-section" aria-labelledby="editor-photos">
            <h2 id="editor-photos" className="ui-card-title">
              Photos <span className="review-count">{draft.photos.length} / {REVIEW_MEDIA_MAX}</span>
            </h2>
            <p className="ui-card-text">
              Photos are uploaded in full resolution. Each gets a caption with the camera it was taken with, read from the
              file (location and serial numbers are removed on the server). Photos from other phones or cameras are fine
              for comparisons.
            </p>

            <div
              className={`editor-dropzone ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Icon name="image" className="editor-dropzone-icon" />
              <span>Drop photos here or</span>
              <button
                type="button"
                className="ui-btn ui-btn-small"
                disabled={saving || draft.photos.length >= REVIEW_MEDIA_MAX}
                onClick={() => fileInputRef.current.click()}
              >
                <Icon name="plus" /> Choose photos
              </button>
              <span className="editor-hint">JPEG, PNG, WebP, GIF, HEIC or AVIF, up to 60 MB each</span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(event) => {
                  addFiles([...event.target.files]);
                  event.target.value = "";
                }}
              />
            </div>

            {photoProblems.length > 0 && (
              <ul className="ui-alert ui-alert-error editor-problems" role="alert">
                {photoProblems.map((problem) => <li key={problem}>{problem}</li>)}
              </ul>
            )}

            {draft.photos.length > 0 && (
              <ol className="editor-photos">
                {draft.photos.map((photo, index) => (
                  <PhotoTile
                    key={photo.key}
                    photo={photo}
                    index={index}
                    count={draft.photos.length}
                    disabled={saving}
                    onMove={movePhoto}
                    onRemove={removePhoto}
                  />
                ))}
              </ol>
            )}
          </section>

          <div className="editor-footer">
            {note && <p className="editor-note">{note}</p>}
            {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}
            {progress && <p className="ui-alert ui-alert-success" role="status">{progress}</p>}

            <div className="ui-actions editor-buttons">
              <Link to={backTo} className="ui-btn" onClick={handleCancel}>Cancel</Link>
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={`ui-btn ${action.primary ? "ui-btn-primary" : ""}`}
                  disabled={saving}
                  onClick={() => save(action)}
                >
                  <Icon name={action.primary ? "check" : "save"} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
