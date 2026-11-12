import { useState } from "react";
import Icon from "../../components/Icon/Icon";
import PhotoViewer from "../../components/PhotoViewer/PhotoViewer";
import { openInViewer } from "../../components/PhotoViewer/openInViewer";
import { getPendingMedia, reviewMedia, updateMediaMetadata } from "../../api/admin";
import { round } from "../../utils/format";
import { EmptyNote, Field, LoadState, Section } from "./adminUi";
import { errorText, formatDateTime, useAdminData } from "./adminUtils";

const PHOTO_FIELDS = [
  { key: "widthPx", label: "Width (px)", integer: true, required: true },
  { key: "heightPx", label: "Height (px)", integer: true, required: true },
  { key: "exifFocalLength", label: "Focal length (mm)" },
  { key: "exifAperture", label: "Aperture (f/)" },
  { key: "exifIso", label: "ISO" },
  { key: "exifShutterSpeed", label: "Shutter (s)" },
  { key: "exifDigitalZoom", label: "Digital zoom (×)" },
];

const VIDEO_FIELDS = [
  { key: "widthPx", label: "Width (px)", integer: true, required: true },
  { key: "heightPx", label: "Height (px)", integer: true, required: true },
  { key: "fps", label: "Frame rate (fps)", required: true },
];

async function loadPendingMedia() {
  const { photos, videos } = await getPendingMedia();

  return [
    ...photos.map((item) => ({ ...item, kind: "photos" })),
    ...videos.map((item) => ({ ...item, kind: "videos" })),
  ].sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
}

function photoSummary(item) {
  return [
    item.exifFocalLength && `${round(item.exifFocalLength)} mm`,
    item.exifAperture && `f/${round(item.exifAperture)}`,
    item.exifShutterSpeed && (item.exifShutterSpeed < 1 ? `1/${Math.round(1 / item.exifShutterSpeed)} s` : `${round(item.exifShutterSpeed)} s`),
    item.exifIso && `ISO ${item.exifIso}`,
    item.exifDigitalZoom > 1 && `${round(item.exifDigitalZoom)}× digital`,
  ].filter(Boolean).join(" · ");
}

function MetadataForm({ item, onSaved, onCancel }) {
  const fields = item.kind === "photos" ? PHOTO_FIELDS : VIDEO_FIELDS;
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map(({ key }) => [key, item[key] ?? ""]))
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const changes = {};

    for (const { key, label, integer, required } of fields) {
      const raw = String(values[key]).trim();

      if (raw === "") {
        if (required) {
          setError(`${label} is required.`);
          return;
        }
        if (item[key] !== null && item[key] !== undefined) changes[key] = null;
        continue;
      }

      const number = Number(raw.replace(",", "."));
      if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
        setError(`${label} must be a positive ${integer ? "whole " : ""}number.`);
        return;
      }
      if (number !== item[key]) changes[key] = number;
    }

    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateMediaMetadata(item.kind, item.id, changes);
      onSaved(changes);
    } catch (err) {
      setError(errorText(err, "Could not save the details."));
      setSaving(false);
    }
  }

  return (
    <form className="ui-form media-form" onSubmit={handleSubmit}>
      {fields.map(({ key, label }) => (
        <Field key={key} label={label}>
          <input
            className="ui-input"
            inputMode="decimal"
            value={values[key]}
            onChange={(event) => setValues((prev) => ({ ...prev, [key]: event.target.value }))}
          />
        </Field>
      ))}

      {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}

      <div className="ui-actions">
        <button type="submit" className="ui-btn ui-btn-small ui-btn-primary" disabled={saving}>
          <Icon name="save" /> {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="ui-btn ui-btn-small" onClick={onCancel} disabled={saving}>
          <Icon name="close" /> Cancel
        </button>
      </div>
    </form>
  );
}

export default function MediaTab({ notify }) {
  const { data: media, loading, error, setData } = useAdminData(loadPendingMedia);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  // The viewer shows the photos only; videos play in their own tab.
  const photos = (media || []).filter((item) => item.kind === "photos");

  async function decide(item, status) {
    if (status === "deleted" && !window.confirm("Delete this file permanently?")) return;
    setBusyId(item.id);

    try {
      await reviewMedia(item.kind, item.id, status);
      setData((rows) => rows.filter((row) => row.id !== item.id));
      notify(status === "verified" ? "Published." : "Deleted.");
    } catch (err) {
      if (err.code === "MEDIA_ALREADY_DELETED") {
        setData((rows) => rows.filter((row) => row.id !== item.id));
      }
      notify(errorText(err, "Could not update the file."), "error");
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(item, changes) {
    setData((rows) => rows.map((row) => (row.id === item.id ? { ...row, ...changes } : row)));
    setEditingId(null);
    notify("Details saved.");
  }

  return (
    <Section title="Waiting for verification" count={media?.length}>
      {viewerIndex !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} initialIndex={Math.min(viewerIndex, photos.length - 1)} onClose={() => setViewerIndex(null)} />
      )}

      <p className="admin-hint admin-section-intro">
        Verified files become public in the phone's gallery. Deleting removes the file for good.
        Preview links expire after an hour; reload the tab if they stop working.
      </p>

      <LoadState loading={loading} error={error} errorMessage="Could not load pending media." />
      {media?.length === 0 && <EmptyNote>No photos or videos are waiting.</EmptyNote>}

      <div className="image-manager-grid">
        {media?.map((item) => (
          <div key={item.id} className="image-card">
            <a
              className="image-preview"
              href={item.url}
              target="_blank"
              rel="noreferrer"
              onClick={item.kind === "photos" ? (event) => openInViewer(event, () => setViewerIndex(photos.indexOf(item))) : undefined}
            >
              {item.kind === "photos" ? (
                <img src={item.thumbUrl || item.url} alt="Pending sample photo" loading="lazy" />
              ) : (
                <video src={item.url} muted preload="metadata" />
              )}
            </a>

            <div className="image-card-footer">
              <div className="image-card-title">
                {item.kind === "photos" ? "Photo" : `Video · ${round(item.fps)} fps`} · {item.widthPx}×{item.heightPx}
              </div>
              {item.kind === "photos" && photoSummary(item) && (
                <div className="admin-meta">{photoSummary(item)}</div>
              )}
              <div className="admin-meta">Uploaded {formatDateTime(item.uploadDate)}</div>

              {editingId === item.id ? (
                <MetadataForm
                  item={item}
                  onSaved={(changes) => handleSaved(item, changes)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="ui-actions">
                  <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={busyId === item.id} onClick={() => decide(item, "verified")}>
                    <Icon name="check" /> Verify
                  </button>
                  <button type="button" className="ui-btn ui-btn-small" disabled={busyId === item.id} onClick={() => setEditingId(item.id)}>
                    <Icon name="edit" /> Edit
                  </button>
                  <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={busyId === item.id} onClick={() => decide(item, "deleted")}>
                    <Icon name="trash" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
