import { useEffect, useReducer, useState } from "react";
import { useParams, Link } from "react-router-dom";

import {
  getSmartphoneById,
  getSmartphonePhotos,
  recordSmartphoneView,
} from "../../api/smartphones";
import {
  addPhoneToCompare,
  isPhoneInCompare,
  removePhoneFromCompare,
} from "../../api/compare";
import { addFavorite, getFavorites, removeFavorite } from "../../api/favorites";
import { isLoggedIn } from "../../utils/auth";
import { formatAperture, formatEquivalentFocal, sortCameras } from "../../utils/camera";
import {
  CAMERA_TYPE_LABELS,
  OIS_LABELS,
  formatReleaseDate,
  formatVideoMode,
  round,
} from "../../utils/format";
import "./PhoneSpecifications.css";

const PHOTOS_PER_PAGE = 12;

function formatFocalLength(camera) {
  if (!camera.focalLengthMm) return "—";

  const real = camera.opticalZoom && camera.focalLengthMaxMm
    ? `${camera.focalLengthMm}–${camera.focalLengthMaxMm} mm`
    : `${camera.focalLengthMm} mm`;
  const equiv = formatEquivalentFocal(camera);

  return equiv === "—" ? real : `${real} (≈${equiv} equiv.)`;
}

function formatShutter(seconds) {
  if (!seconds) return null;
  return seconds >= 1 ? `${round(seconds, 1)} s` : `1/${Math.round(1 / seconds)} s`;
}

function photoCaption(photo) {
  return [
    photo.exifAperture && `f/${round(photo.exifAperture, 1)}`,
    formatShutter(photo.exifShutterSpeed),
    photo.exifIso && `ISO ${photo.exifIso}`,
    photo.exifDigitalZoom > 1 && `${round(photo.exifDigitalZoom, 1)}× digital`,
  ].filter(Boolean).join(" · ");
}

function cameraLabel(camera) {
  const type = CAMERA_TYPE_LABELS[camera.type] || "Camera";
  return camera.facing === "front" ? `Front · ${type}` : type;
}

function SamplePhotos({ phoneId }) {
  const [photos, setPhotos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadPhotos() {
      setLoading(true);

      try {
        const data = await getSmartphonePhotos(phoneId, page, PHOTOS_PER_PAGE);

        if (!ignore) {
          setPhotos((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
          setTotal(data.total);
        }
      } catch (err) {
        console.error(err);

        if (!ignore) {
          setError("Could not load sample photos.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPhotos();

    return () => {
      ignore = true;
    };
  }, [phoneId, page]);

  return (
    <section className="phone-section">
      <h2 className="phone-section-title">
        Sample Photos {total > 0 && <span className="section-count">{total}</span>}
      </h2>

      {error && <p className="section-empty" style={{ color: "var(--danger, #dc2626)" }}>{error}</p>}

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
                  <img src={photo.thumbUrl || photo.url} alt="" loading="lazy" />
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

      {loading && <p className="section-empty">Loading photos…</p>}

      {!loading && photos.length < total && (
        <button type="button" className="ui-btn ui-btn-small photo-more" onClick={() => setPage((p) => p + 1)}>
          Show more photos
        </button>
      )}
    </section>
  );
}

function PhoneSpecifications() {
  const { phoneId } = useParams();
  const loggedIn = isLoggedIn();

  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The comparison list lives in localStorage; re-render after changing it.
  const [, compareChanged] = useReducer((count) => count + 1, 0);
  const isInCompare = isPhoneInCompare(phoneId);
  const [compareMessage, setCompareMessage] = useState("");

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadPhone() {
      setLoading(true);
      setError("");

      try {
        const data = await getSmartphoneById(phoneId);

        if (!ignore) {
          setPhone(data);
        }
      } catch (err) {
        console.error(err);

        if (!ignore) {
          setPhone(null);
          setError(err.status === 404 ? "Phone not found." : "Could not load phone information.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPhone();

    return () => {
      ignore = true;
    };
  }, [phoneId]);

  useEffect(() => {
    recordSmartphoneView(phoneId).catch((err) => console.error(err));
  }, [phoneId]);

  useEffect(() => {
    if (!loggedIn) return undefined;
    let ignore = false;

    async function loadFavoriteState() {
      try {
        const favorites = await getFavorites();

        if (!ignore) {
          setIsFavorite(favorites.some((item) => item.smartphoneId === phoneId));
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadFavoriteState();

    return () => {
      ignore = true;
    };
  }, [phoneId, loggedIn]);

  async function handleToggleFavorite() {
    setFavoriteBusy(true);
    setFavoriteMessage("");

    try {
      if (isFavorite) {
        await removeFavorite(phoneId);
        setIsFavorite(false);
      } else {
        await addFavorite(phoneId);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error(err);
      setFavoriteMessage("Could not update favourites.");
    } finally {
      setFavoriteBusy(false);
    }
  }

  function handleAddToCompare() {
    if (!phone) return;

    const result = addPhoneToCompare({
      id: phone.id,
      modelName: phone.modelName,
      brandName: phone.brandName,
      imageUrl: phone.imageThumbUrl || phone.imageUrl,
    });

    if (!result.success) {
      if (result.reason === "limit") {
        setCompareMessage(
          "Could not add this phone. You already have 4 phones in comparison. Please remove a phone first."
        );
      } else if (result.reason === "already-added") {
        setCompareMessage("This phone is already in comparison.");
      }
      return;
    }

    compareChanged();
    setCompareMessage("Phone added to comparison.");
  }

  function handleRemoveFromCompare() {
    removePhoneFromCompare(phoneId);
    compareChanged();
    setCompareMessage("Phone removed from comparison.");
  }

  if (loading) {
    return <main className="phone-details-page"><p className="status-message">Loading phone specifications...</p></main>;
  }

  if (error || !phone) {
    return (
      <main className="phone-details-page">
        <p className="status-message" style={{ color: "var(--danger, #dc2626)" }}>{error || "Phone not found."}</p>
        <p className="status-message"><Link to="/browse" className="text-link">Back to catalogue</Link></p>
      </main>
    );
  }

  const cameras = sortCameras(phone.cameras || []);

  return (
    <main className="phone-details-page">
      <Link to="/browse" className="phone-back-btn">
        ← Back to catalogue
      </Link>

      {/* GŁÓWNA KARTA PRODUKTU */}
      <div className="phone-header-card">
        <div className="phone-image-wrapper">
          {phone.imageUrl ? (
            <img src={phone.imageMediumUrl || phone.imageUrl} alt={phone.modelName} />
          ) : (
            <svg viewBox="0 0 36 64" width="48" height="64" style={{ opacity: 0.3 }}>
              <rect x="1" y="1" width="34" height="62" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </div>

        <div className="phone-info-content">
          <span className="meta-label">{phone.brandName || "Brand"}</span>
          <h1 className="phone-title">{phone.modelName}</h1>
          <p className="phone-subline">
            {phone.releaseDate && <>Released {formatReleaseDate(phone.releaseDate)} · </>}
            {phone.viewCount.toLocaleString("en-US")} {phone.viewCount === 1 ? "view" : "views"}
            {phone.verified
              ? <> · <span className="ui-badge">Verified</span></>
              : <> · <span className="ui-badge phone-badge-muted">Not verified</span></>}
          </p>

          <div className="phone-actions">
            {loggedIn ? (
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriteBusy}
                className={`ui-btn ${isFavorite ? "ui-btn-active" : ""}`}
                aria-pressed={isFavorite}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6.3a3.4 3.4 0 0 1 6 2.1c0 4.5-6 8.1-6 8.1z" />
                </svg>
                {isFavorite ? "In favorites" : "Add to favorites"}
              </button>
            ) : (
              <Link to="/login" className="ui-btn" title="Log in to save favourites">
                Log in to save
              </Link>
            )}

            {isInCompare ? (
              <>
                <Link to="/compare" className="ui-btn ui-btn-primary">Open comparison</Link>
                <button type="button" onClick={handleRemoveFromCompare} className="ui-btn ui-btn-danger">
                  Remove from compare
                </button>
              </>
            ) : (
              <button type="button" onClick={handleAddToCompare} className="ui-btn ui-btn-primary">
                Add to compare
              </button>
            )}

            <Link to={`/phone/${phone.id}/reviews`} className="ui-btn">
              Reviews
            </Link>
          </div>

          {(compareMessage || favoriteMessage) && (
            <p className="compare-alert">{favoriteMessage || compareMessage}</p>
          )}
        </div>
      </div>

      {/* INFORMACJE OGÓLNE */}
      <section className="phone-section">
        <h2 className="phone-section-title">Phone Information</h2>
        <div className="meta-grid">
          <div className="meta-item"><span className="meta-label">Brand</span><span className="meta-value">{phone.brandName || "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Model</span><span className="meta-value">{phone.modelName || "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Release Date</span><span className="meta-value">{phone.releaseDate ? formatReleaseDate(phone.releaseDate) : "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Views</span><span className="meta-value">{phone.viewCount.toLocaleString("en-US")}</span></div>
          <div className="meta-item"><span className="meta-label">Model Codes</span><span className="meta-value">{phone.buildModels?.length ? phone.buildModels.join(", ") : "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Cameras</span><span className="meta-value">{cameras.length || "—"}</span></div>
        </div>
      </section>

      {/* APARATY */}
      <section className="phone-section">
        <h2 className="phone-section-title">Cameras</h2>

        {cameras.length > 0 ? (
          <div className="cameras-stack">
            {cameras.map((camera) => (
              <div key={camera.id} className="camera-card">
                <div className="camera-card-header">
                  <h3 className="camera-title">{CAMERA_TYPE_LABELS[camera.type] || "Camera"}</h3>
                  <span className="camera-badge">{camera.facing === "front" ? "Front" : camera.facing === "back" ? "Back" : "Other"}</span>
                </div>

                <div className="camera-specs-grid">
                  <div className="meta-item"><span className="meta-label">Resolution</span><span className="meta-value">{camera.resolutionMp ? `${camera.resolutionMp} MP` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Active Resolution</span><span className="meta-value">{camera.activeResolutionMp ? `${camera.activeResolutionMp} MP` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Focal Length</span><span className="meta-value">{formatFocalLength(camera)}</span></div>
                  <div className="meta-item"><span className="meta-label">Aperture</span><span className="meta-value">{formatAperture(camera)}</span></div>
                  <div className="meta-item"><span className="meta-label">Crop Factor</span><span className="meta-value">{camera.cropFactor || "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Pixel Pitch</span><span className="meta-value">{camera.pixelPitchUm ? `${camera.pixelPitchUm} μm` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Sensor Size</span><span className="meta-value">{camera.sensorFormat ? `${camera.sensorFormat}″` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Sensor Model</span><span className="meta-value">{camera.sensorModel || "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Photo Size</span><span className="meta-value">{camera.photoWidthPx && camera.photoHeightPx ? `${camera.photoWidthPx}×${camera.photoHeightPx}` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Aspect Ratio</span><span className="meta-value">{camera.aspectRatio || "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">AF Zones</span><span className="meta-value">{camera.afZones ?? "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">OIS</span><span className="meta-value">{OIS_LABELS[camera.ois] || "—"}</span></div>
                </div>

                {camera.note && <p className="camera-note">{camera.note}</p>}

                {camera.videoModes && camera.videoModes.length > 0 && (
                  <div className="video-modes-container">
                    <div className="video-modes-title">Video Modes</div>
                    <div className="video-modes-list">
                      {camera.videoModes.map((mode) => (
                        <span key={mode.id} className="video-mode-badge">
                          {formatVideoMode(mode)}{mode.note ? ` (${mode.note})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="section-empty">No camera information available.</p>
        )}
      </section>

      <SamplePhotos key={phone.id} phoneId={phone.id} />
    </main>
  );
}

export default PhoneSpecifications;
