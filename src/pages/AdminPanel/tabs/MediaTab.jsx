import { useState } from "react";
import { getPendingCameras, getPendingMedia, setMediaStatus } from "../../../api/admin";
import { getSmartphoneById } from "../../../api/smartphones";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { asArray, formatDate, phoneLabel, shortId } from "../format";
import Icon from "../components/Icon";

// Media URLs are absolute (production media host / signed private links), so they're used
// directly in <img>/<video>/<a>. Never fetch() them or set crossOrigin: the media host sends
// no CORS headers. Signed links expire after 1 hour — hence the Refresh button.
async function loadMedia() {
  const [media, pendingCameras] = await Promise.all([
    getPendingMedia(),
    getPendingCameras().catch(() => []),
  ]);

  const cameras = asArray(pendingCameras);
  const phoneIds = [...new Set(cameras.map((cam) => cam.smartphoneId))];
  const phones = await Promise.all(phoneIds.map((id) => getSmartphoneById(id).catch(() => null)));
  const phoneById = Object.fromEntries(phoneIds.map((id, index) => [id, phones[index]]));

  const cameraLabels = Object.fromEntries(
    cameras.map((cam) => [
      cam.id,
      `${phoneById[cam.smartphoneId] ? phoneLabel(phoneById[cam.smartphoneId]) : "Unknown phone"} · ${cam.type} (${cam.facing})`,
    ])
  );

  return {
    photos: asArray(media?.photos),
    videos: asArray(media?.videos),
    cameraLabels,
  };
}

function exifSummary(photo) {
  const parts = [];
  if (photo.exifFocalLength) parts.push(`${photo.exifFocalLength} mm`);
  if (photo.exifAperture) parts.push(`f/${photo.exifAperture}`);
  if (photo.exifIso) parts.push(`ISO ${photo.exifIso}`);
  if (photo.exifShutterSpeed) {
    parts.push(photo.exifShutterSpeed < 1 ? `1/${Math.round(1 / photo.exifShutterSpeed)} s` : `${photo.exifShutterSpeed} s`);
  }
  return parts.join(" · ") || "No EXIF data";
}

function MediaCard({ item, kind, cameraLabel, busy, error, onAction }) {
  return (
    <div className="media-card">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="media-preview"
        title="Open in a new tab"
      >
        {kind === "photos" ? (
          <img src={item.url} alt={`Sample photo ${shortId(item.id)}`} loading="lazy" />
        ) : (
          <video src={item.url} preload="metadata" muted playsInline />
        )}
        <span className="media-open-hint">
          <Icon name="external" size={14} /> Open
        </span>
      </a>

      <div className="media-card-body">
        <div className="media-card-title">{cameraLabel || `Camera ${shortId(item.cameraId)}`}</div>
        <div className="media-card-meta">
          {kind === "photos" ? exifSummary(item) : item.fps ? `${item.fps} fps` : "Video"}
        </div>
        <div className="media-card-meta">
          {item.widthPx && item.heightPx ? `${item.widthPx}×${item.heightPx} · ` : ""}
          {formatDate(item.uploadDate, true)}
        </div>

        {error && <p className="admin-inline-error" role="alert">{error}</p>}

        <div className="media-card-actions">
          <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => onAction(kind, item, "verified")}>
            Approve
          </button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onAction(kind, item, "deleted")}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaTab({ onChanged }) {
  const { data, loading, error, reload, setData } = useAsyncData(loadMedia);
  const [kind, setKind] = useState("photos");
  const [busyId, setBusyId] = useState(null);
  const [cardErrors, setCardErrors] = useState({});

  async function handleAction(mediaKind, item, status) {
    if (status === "deleted" && !window.confirm("Reject this file? It will be permanently deleted.")) {
      return;
    }

    setBusyId(item.id);
    setCardErrors((prev) => ({ ...prev, [item.id]: "" }));

    try {
      await setMediaStatus(mediaKind, item.id, status);
      setData((prev) => ({ ...prev, [mediaKind]: prev[mediaKind].filter((m) => m.id !== item.id) }));
      onChanged();
    } catch (err) {
      setCardErrors((prev) => ({ ...prev, [item.id]: err.message }));
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.[kind] || [];

  return (
    <section className="admin-section">
      <div className="admin-section-title">
        <div className="segmented" role="tablist">
          {["photos", "videos"].map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={kind === option}
              className={`segmented-btn ${kind === option ? "active" : ""}`}
              onClick={() => setKind(option)}
            >
              {option === "photos" ? "Photos" : "Videos"}
              <span className="admin-badge">{data?.[option]?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm btn-inline" onClick={reload} disabled={loading}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      <p className="list-meta">Pending samples waiting for verification. Click a preview to open the full file in a new tab.</p>

      {error && <div className="admin-error" role="alert">Could not load media: {error.message}</div>}
      {loading && !data && <p className="admin-empty">Loading media…</p>}
      {data && items.length === 0 && <p className="admin-empty">No pending {kind}.</p>}

      <div className="media-grid">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            kind={kind}
            cameraLabel={data.cameraLabels[item.cameraId]}
            busy={busyId === item.id}
            error={cardErrors[item.id]}
            onAction={handleAction}
          />
        ))}
      </div>
    </section>
  );
}
