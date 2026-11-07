import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";

import {
  getSmartphoneById,
  getSmartphonePhotos,
  peekSmartphone,
  recordSmartphoneView,
} from "../../api/smartphones";
import {
  addPhoneToCompare,
  removePhoneFromCompare,
} from "../../api/compare";
import { addFavorite, getFavorites, removeFavorite } from "../../api/favorites";
import CameraSpecs from "../../components/CameraSpecs/CameraSpecs";
import Icon from "../../components/Icon/Icon";
import { isLoggedIn } from "../../utils/auth";
import { formatEquivalentFocal, sortCameras } from "../../utils/camera";
import {
  CAMERA_TYPE_LABELS,
  formatReleaseDate,
  round,
} from "../../utils/format";
import { useCompareList } from "../../utils/useCompareList";
import "./PhoneSpecifications.css";

const PHOTOS_PER_PAGE = 12;

const LENS_NAMES = { wide: "Wide", ultrawide: "Ultra-wide", tele: "Telephoto", macro: "Macro", other: "Other" };

function formatShutter(seconds) {
  if (!seconds) return null;
  return seconds >= 1 ? `${round(seconds, 1)} s` : `1/${Math.round(1 / seconds)} s`;
}

function photoCaption(photo) {
  return [
    photo.exifAperture && `f/${round(photo.exifAperture, 2)}`,
    formatShutter(photo.exifShutterSpeed),
    photo.exifIso && `ISO ${photo.exifIso}`,
    photo.exifDigitalZoom > 1 && `${round(photo.exifDigitalZoom, 1)}× digital`,
  ].filter(Boolean).join(" · ");
}

function cameraLabel(camera) {
  const type = CAMERA_TYPE_LABELS[camera.type] || "Camera";
  return camera.facing === "front" ? `Front · ${type}` : type;
}

function lensTabName(camera) {
  const name = LENS_NAMES[camera.type] || "Camera";
  if (camera.facing === "front") return camera.type === "wide" ? "Front" : `Front ${name}`;
  return name;
}

function SamplePhotos({ phoneId }) {
  const [photos, setPhotos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getSmartphonePhotos(phoneId, page, PHOTOS_PER_PAGE).then(
      (data) => {
        if (ignore) return;
        setPhotos((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setTotal(data.total);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        if (ignore) return;
        setError("Could not load sample photos.");
        setLoading(false);
      },
    );

    return () => {
      ignore = true;
    };
  }, [phoneId, page]);

  function showMore() {
    setLoading(true);
    setPage((current) => current + 1);
  }

  return (
    <section className="phone-section">
      <h2 className="phone-section-title">
        Sample Photos {total > 0 && <span className="section-count">{total}</span>}
      </h2>

      {error && <p className="section-empty section-error">{error}</p>}

      {!error && !loading && photos.length === 0 && (
        <p className="section-empty">No verified sample photos yet.</p>
      )}

      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((photo) => {
            const caption = photoCaption(photo);

            return (
              <li key={photo.id}>
                <a href={photo.url} target="_blank" rel="noreferrer" className="photo-tile">
                  <img src={photo.thumbUrl || photo.url} alt="" loading="lazy" decoding="async" />
                </a>
                <div className="photo-meta">
                  <span className="photo-camera">
                    {cameraLabel({ type: photo.cameraType, facing: photo.facing })}
                  </span>
                  {caption && <span>{caption}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {loading && photos.length === 0 && (
        <ul className="photo-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}><span className="photo-tile skeleton-area" /></li>
          ))}
        </ul>
      )}

      {photos.length < total && (
        <button type="button" className="ui-btn ui-btn-small photo-more" disabled={loading} onClick={showMore}>
          <Icon name="camera" /> {loading ? "Loading…" : "Show more photos"}
        </button>
      )}
    </section>
  );
}

function FavoriteButton({ phoneId }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;

    getFavorites().then(
      (favorites) => {
        if (!ignore) setIsFavorite(favorites.some((item) => item.smartphoneId === phoneId));
      },
      (err) => console.error(err),
    );

    return () => {
      ignore = true;
    };
  }, [phoneId]);

  async function toggle() {
    setBusy(true);
    setError(false);

    try {
      if (isFavorite) {
        await removeFavorite(phoneId);
      } else {
        await addFavorite(phoneId);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`ui-btn ${isFavorite ? "ui-btn-active" : ""}`}
      aria-pressed={isFavorite}
      title={error ? "Could not update favorites. Try again." : undefined}
    >
      <Icon name="heart" />
      {error ? "Try again" : isFavorite ? "In favorites" : "Add to favorites"}
    </button>
  );
}

// A row of tabs so any lens is one click away, however many the phone has.
function LensBrowser({ cameras }) {
  // Opens on the main lens, wherever it falls in the row.
  const [selectedId, setSelectedId] = useState(
    () => (cameras.find((camera) => camera.facing === "back" && camera.type === "wide") || cameras[0])?.id
  );
  const selected = cameras.find((camera) => camera.id === selectedId) || cameras[0];

  if (!selected) {
    return <p className="section-empty">No camera information available.</p>;
  }

  return (
    <>
      {cameras.length > 1 && (
        <div className="lens-tabs" role="group" aria-label="Lens">
          {cameras.map((camera) => (
            <button
              key={camera.id}
              type="button"
              className={`lens-tab ${camera.id === selected.id ? "is-active" : ""}`}
              aria-pressed={camera.id === selected.id}
              onClick={() => setSelectedId(camera.id)}
            >
              <span className="lens-tab-name">{lensTabName(camera)}</span>
              <span className="lens-tab-focal">{formatEquivalentFocal(camera)}</span>
            </button>
          ))}
        </div>
      )}

      <CameraSpecs key={selected.id} camera={selected} />
    </>
  );
}

function SpecsSkeleton() {
  return (
    <section className="phone-section" aria-hidden="true">
      <span className="skeleton skeleton-line-short" />
      <div className="phone-skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="skeleton phone-skeleton-tile" />
        ))}
      </div>
    </section>
  );
}

function PhoneImageLarge({ phone }) {
  const src = phone.imageMediumUrl || phone.imageUrl;

  return (
    <div className="phone-image-wrapper">
      {src ? (
        <img src={src} alt={phone.modelName} decoding="async" />
      ) : (
        <svg viewBox="0 0 36 64" width="48" height="64" style={{ opacity: 0.3 }} aria-hidden="true">
          <rect x="1" y="1" width="34" height="62" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}

function PhoneDetails({ phoneId }) {
  const location = useLocation();
  const loggedIn = isLoggedIn();

  // Details already loaded (back navigation, hover), otherwise what the previous list knew.
  const [phone, setPhone] = useState(() => peekSmartphone(phoneId) ?? null);
  const [error, setError] = useState("");
  const preview = location.state?.preview?.id === phoneId ? location.state.preview : null;

  const inCompare = useCompareList().some((item) => item.id === phoneId);
  const [compareMessage, setCompareMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    getSmartphoneById(phoneId).then(
      (data) => {
        if (!ignore) setPhone(data);
      },
      (err) => {
        console.error(err);
        if (!ignore) setError(err.status === 404 ? "Phone not found." : "Could not load phone information.");
      },
    );

    return () => {
      ignore = true;
    };
  }, [phoneId]);

  useEffect(() => {
    recordSmartphoneView(phoneId).catch((err) => console.error(err));
  }, [phoneId]);

  const shown = phone || preview;

  function handleAddToCompare() {
    const result = addPhoneToCompare({
      id: phoneId,
      modelName: shown.modelName,
      brandName: shown.brandName,
      imageUrl: shown.imageUrl,
      imageThumbUrl: shown.imageThumbUrl,
    });

    setCompareMessage(
      result.reason === "limit" ? "You already have 4 phones in comparison. Remove one first." : ""
    );
  }

  function handleRemoveFromCompare() {
    removePhoneFromCompare(phoneId);
    setCompareMessage("");
  }

  if (error) {
    return (
      <main className="phone-details-page">
        <p className="status-message page-status-error">{error}</p>
        <p className="status-message"><Link to="/browse" className="text-link">Back to catalogue</Link></p>
      </main>
    );
  }

  return (
    <main className="phone-details-page">
      <Link to="/browse" className="phone-back-btn">
        <Icon name="arrowLeft" /> Back to catalogue
      </Link>

      {shown ? (
        <div className="phone-header-card">
          <PhoneImageLarge phone={shown} />

          <div className="phone-info-content">
            <span className="meta-label">{shown.brandName || "Brand"}</span>
            <h1 className="phone-title">{shown.modelName}</h1>

            <p className="phone-subline">
              {shown.releaseDate && <>Released {formatReleaseDate(shown.releaseDate)} · </>}
              {typeof shown.viewCount === "number" && (
                <>{shown.viewCount.toLocaleString("en-US")} {shown.viewCount === 1 ? "view" : "views"} · </>
              )}
              <span className={`ui-badge ${shown.verified ? "" : "phone-badge-muted"}`}>
                {shown.verified ? "Verified" : "Not verified"}
              </span>
            </p>

            {phone?.buildModels?.length > 0 && (
              <p className="phone-subline phone-codes">Model codes: {phone.buildModels.join(", ")}</p>
            )}

            <div className="phone-actions">
              {loggedIn ? (
                <FavoriteButton phoneId={phoneId} />
              ) : (
                <Link to="/login" className="ui-btn" title="Log in to save favorites">
                  <Icon name="heart" /> Log in to save
                </Link>
              )}

              {inCompare ? (
                <>
                  <Link to="/compare" className="ui-btn ui-btn-primary"><Icon name="compare" /> Open comparison</Link>
                  <button type="button" onClick={handleRemoveFromCompare} className="ui-btn ui-btn-danger">
                    <Icon name="close" /> Remove from compare
                  </button>
                </>
              ) : (
                <button type="button" onClick={handleAddToCompare} className="ui-btn ui-btn-primary">
                  <Icon name="plus" /> Add to compare
                </button>
              )}

              <Link to={`/phone/${phoneId}/reviews`} className="ui-btn">
                <Icon name="comment" /> Reviews
              </Link>
            </div>

            {compareMessage && <p className="compare-alert">{compareMessage}</p>}
          </div>
        </div>
      ) : (
        <div className="phone-header-card" aria-hidden="true">
          <span className="phone-image-wrapper skeleton-area" />
          <div className="phone-info-content">
            <span className="skeleton skeleton-line-short" />
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-line" />
          </div>
        </div>
      )}

      {phone ? (
        <section className="phone-section" aria-labelledby="phone-camera-specs">
          <h2 id="phone-camera-specs" className="phone-section-title">Camera specs</h2>
          <LensBrowser cameras={sortCameras(phone.cameras || [])} />
        </section>
      ) : (
        <SpecsSkeleton />
      )}

      <SamplePhotos phoneId={phoneId} />
    </main>
  );
}

// A new phone starts with a clean page state.
function PhoneSpecifications() {
  const { phoneId } = useParams();
  return <PhoneDetails key={phoneId} phoneId={phoneId} />;
}

export default PhoneSpecifications;
