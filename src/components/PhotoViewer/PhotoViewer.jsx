import { useEffect, useRef, useState } from "react";
import { photoCameraLabel } from "../../utils/format";
import { shotDetails } from "../../utils/shotDetails";
import Icon from "../Icon/Icon";
import "./PhotoViewer.css";

const SWIPE_PX = 50;

// The browser picks the 1280 px copy or the original, for the size the photo is shown at.
function sources(photo) {
  const ratio = photo.widthPx > 0 && photo.heightPx > 0 ? photo.widthPx / photo.heightPx : 4 / 3;
  const srcSet = [
    photo.mediumUrl && `${photo.mediumUrl} 1280w`,
    photo.widthPx > 0 && `${photo.url} ${photo.widthPx}w`,
  ].filter(Boolean).join(", ");

  return {
    src: photo.url,
    srcSet: srcSet || undefined,
    sizes: srcSet ? `min(100vw, calc((100vh - 12rem) * ${ratio.toFixed(3)}))` : undefined,
  };
}

function Frame({ photo, label }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="photo-viewer-frame">
      {/* The tile's copy is already loaded: it stands in until the large one is in. */}
      {photo.thumbUrl && !loaded && <img className="photo-viewer-placeholder" src={photo.thumbUrl} alt="" aria-hidden="true" />}
      {failed ? (
        <p className="photo-viewer-failed">This photo could not be loaded.</p>
      ) : (
        <img
          {...sources(photo)}
          alt={label}
          className={loaded ? "is-loaded" : ""}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function Stat({ value, caption }) {
  if (!value) return null;
  return (
    <div className="photo-viewer-stat">
      <strong>{value}</strong>
      <span>{caption}</span>
    </div>
  );
}

/**
 * Full-screen photo viewer on a neutral grey (#777777), whatever the theme: see --photo-viewer-bg
 * in styles/theme.css. Arrows, ← → keys or a swipe move between photos, Esc closes.
 *
 * photos: the gallery's loaded photos; total: how many there are in all (more are asked for with
 * onLoadMore when the last loaded one is shown); cameras: shotCameras() of the phone(s), for the
 * 35 mm equivalent and the zoom from the main camera.
 */
export default function PhotoViewer({ photos, initialIndex, total, onLoadMore, loadingMore, cameras, onClose }) {
  const dialogRef = useRef(null);
  const swipeStart = useRef(null);
  const [index, setIndex] = useState(initialIndex);

  const count = Math.max(total || 0, photos.length);
  const photo = photos[Math.min(index, photos.length - 1)];
  const canGoBack = index > 0;
  const canGoOn = index < photos.length - 1;
  const waitingForMore = index === photos.length - 1 && photos.length < count;

  // No close() on unmount: that would fire onClose (twice-run effects in development close it at
  // once), and taking the dialog out of the page ends the modal state anyway.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  // The last loaded photo is shown: fetch the next page so the arrow keeps going.
  useEffect(() => {
    if (waitingForMore && !loadingMore && onLoadMore) onLoadMore();
  }, [waitingForMore, loadingMore, onLoadMore]);

  // Neighbours load in the background, so moving on is instant.
  useEffect(() => {
    for (const neighbour of [photos[index - 1], photos[index + 1]]) {
      if (neighbour) new Image().src = neighbour.mediumUrl || neighbour.url;
    }
  }, [photos, index]);

  if (!photo) return null;

  const go = (step) => setIndex((current) => Math.min(Math.max(current + step, 0), photos.length - 1));
  const camera = cameras?.get(photo.cameraId);
  const details = shotDetails(photo, camera);
  const cameraLabel = photo.cameraType ? photoCameraLabel(photo) : null;
  const position = `Photo ${index + 1} of ${count}`;

  function handleKeyDown(event) {
    if (event.key === "ArrowLeft" && canGoBack) go(-1);
    if (event.key === "ArrowRight" && canGoOn) go(1);
  }

  function handlePointerDown(event) {
    if (event.pointerType !== "mouse") swipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(event.clientY - start.y)) return;
    if (dx < 0 && canGoOn) go(1);
    if (dx > 0 && canGoBack) go(-1);
  }

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label={cameraLabel ? `${position}, ${cameraLabel}` : position}
      onClose={onClose}
      onKeyDown={handleKeyDown}
    >
      <header className="photo-viewer-bar">
        <button type="button" className="photo-viewer-btn" onClick={() => dialogRef.current.close()} aria-label="Close" autoFocus>
          <Icon name="close" />
        </button>
        <p className="photo-viewer-title">
          <span>{index + 1} / {count}</span>
          {cameraLabel && <span className="photo-viewer-camera">{cameraLabel}</span>}
        </p>
        <a className="photo-viewer-btn photo-viewer-original" href={photo.url} target="_blank" rel="noreferrer">
          <Icon name="download" /> <span>Original</span>
        </a>
      </header>

      <div className="photo-viewer-stage" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <button type="button" className="photo-viewer-btn photo-viewer-nav" onClick={() => go(-1)} disabled={!canGoBack} aria-label="Previous photo">
          <Icon name="arrowLeft" />
        </button>

        <Frame key={photo.id} photo={photo} label={cameraLabel ? `${position}, ${cameraLabel}` : position} />

        <button
          type="button"
          className="photo-viewer-btn photo-viewer-nav"
          onClick={() => go(1)}
          disabled={!canGoOn}
          aria-label={waitingForMore ? "Loading more photos" : "Next photo"}
        >
          <Icon name="arrowRight" />
        </button>
      </div>

      <footer className="photo-viewer-details">
        {details && (
          <>
            {(details.zoom || details.equivalent) && (
              <div className="photo-viewer-frame-row">
                {details.zoom && (
                  <span className="photo-viewer-zoom" title="Zoom from the main camera">{details.zoom}</span>
                )}
                {details.equivalent && (
                  <div className="photo-viewer-equivalent">
                    <strong>{details.equivalent}</strong>
                    <span>{["35 mm equiv.", details.digitalZoom].filter(Boolean).join(" · ")}</span>
                  </div>
                )}
              </div>
            )}
            <div className="photo-viewer-stats">
              <Stat value={details.aperture} caption="Aperture" />
              <Stat value={details.shutter} caption="Shutter" />
              <Stat value={details.iso} caption="ISO" />
              <Stat value={details.focalLength} caption="Focal length" />
            </div>
          </>
        )}
      </footer>
    </dialog>
  );
}
