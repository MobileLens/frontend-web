import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import { getSmartphoneById } from "../../api/smartphones";
import {
  addPhoneToCompare,
  isPhoneInCompare,
  removePhoneFromCompare,
} from "../../api/compare";
import "./PhoneSpecifications.css";

function PhoneSpecifications() {
  const { phoneId } = useParams();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isInCompare, setIsInCompare] = useState(false);
  const [compareMessage, setCompareMessage] = useState("");

  useEffect(() => {
    setIsInCompare(isPhoneInCompare(phoneId));
  }, [phoneId]);

  useEffect(() => {
    async function loadPhone() {
      setLoading(true);
      setError("");

      try {
        const data = await getSmartphoneById(phoneId);
        const phoneData = data.data || data;
        setPhone(phoneData);
      } catch (err) {
        console.error(err);
        setError("Could not load phone information.");
      } finally {
        setLoading(false);
      }
    }

    loadPhone();
  }, [phoneId]);

  function handleAddToCompare() {
    if (!phone) return;

    const result = addPhoneToCompare(phone);

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

    setIsInCompare(true);
    setCompareMessage("Phone added to comparison.");
  }

  function handleRemoveFromCompare() {
    removePhoneFromCompare(phoneId);
    setIsInCompare(false);
    setCompareMessage("Phone removed from comparison.");
  }

  if (loading) {
    return <main className="phone-details-page"><p className="status-message">Loading phone specifications...</p></main>;
  }

  if (error) {
    return <main className="phone-details-page"><p className="status-message" style={{ color: "var(--danger)" }}>{error}</p></main>;
  }

  if (!phone) {
    return <main className="phone-details-page"><p className="status-message">Phone not found.</p></main>;
  }

  return (
    <main className="phone-details-page">
      <button type="button" onClick={() => navigate("/")} className="phone-back-btn">
        ← Back to Home
      </button>

      {/* GŁÓWNA KARTA PRODUKTU */}
      <div className="phone-header-card">
        <div className="phone-image-wrapper">
          {phone.imageUrl ? (
            <img src={phone.imageUrl} alt={phone.modelName} />
          ) : (
            <svg viewBox="0 0 36 64" width="48" height="64" style={{ opacity: 0.3 }}>
              <rect x="1" y="1" width="34" height="62" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </div>

        <div className="phone-info-content">
          <span className="meta-label">{phone.brandName || "Brand"}</span>
          <h1 className="phone-title">{phone.modelName}</h1>

          <div className="phone-actions">
            <Link to={`/phone/${phone.id}/reviews`} className="btn btn-outline">
              Review Thread
            </Link>

            {isInCompare ? (
              <button type="button" onClick={handleRemoveFromCompare} className="btn btn-danger-outline">
                Remove from Compare
              </button>
            ) : (
              <button type="button" onClick={handleAddToCompare} className="btn btn-primary">
                Add to Compare
              </button>
            )}
          </div>

          {compareMessage && <p className="compare-alert">{compareMessage}</p>}
        </div>
      </div>

      {/* INFORMACJE OGÓLNE */}
      <section className="phone-section">
        <h2 className="phone-section-title">Phone Information</h2>
        <div className="meta-grid">
          <div className="meta-item"><span className="meta-label">Model</span><span className="meta-value">{phone.modelName || "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Release Date</span><span className="meta-value">{phone.releaseDate || "—"}</span></div>
          <div className="meta-item"><span className="meta-label">View Count</span><span className="meta-value">{phone.viewCount ?? "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Phone ID</span><span className="meta-value">{phone.id || "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Brand ID</span><span className="meta-value">{phone.brandId || "—"}</span></div>
          <div className="meta-item"><span className="meta-label">Created At</span><span className="meta-value">{phone.createdAt ? new Date(phone.createdAt).toLocaleDateString() : "—"}</span></div>
        </div>
      </section>

      {/* APARATY */}
      <section className="phone-section">
        <h2 className="phone-section-title">Cameras</h2>

        {phone.cameras && phone.cameras.length > 0 ? (
          <div className="cameras-stack">
            {phone.cameras.map((camera, idx) => (
              <div key={camera.id || idx} className="camera-card">
                <div className="camera-card-header">
                  <h3 className="camera-title">{camera.type ? camera.type.toUpperCase() : "Camera"}</h3>
                  <span className="camera-badge">{camera.facing || "Module"}</span>
                </div>

                <div className="camera-specs-grid">
                  <div className="meta-item"><span className="meta-label">Resolution</span><span className="meta-value">{camera.resolutionMp ? `${camera.resolutionMp} MP` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Active Resolution</span><span className="meta-value">{camera.activeResolutionMp ? `${camera.activeResolutionMp} MP` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Focal Length</span><span className="meta-value">{camera.focalLengthMm ? `${camera.focalLengthMm} mm` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Aperture</span><span className="meta-value">{camera.aperture ? `f/${camera.aperture}` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Crop Factor</span><span className="meta-value">{camera.cropFactor || "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Pixel Pitch</span><span className="meta-value">{camera.pixelPitchUm ? `${camera.pixelPitchUm} μm` : "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">AF Zones</span><span className="meta-value">{camera.afZones || "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">OIS</span><span className="meta-value">{camera.ois || "—"}</span></div>
                  <div className="meta-item"><span className="meta-label">Status</span><span className="meta-value">{camera.status || "—"}</span></div>
                </div>

                {camera.videoModes && camera.videoModes.length > 0 && (
                  <div className="video-modes-container">
                    <div className="video-modes-title">Video Modes</div>
                    <div className="video-modes-list">
                      {camera.videoModes.map((mode, index) => (
                        <span key={index} className="video-mode-badge">
                          {typeof mode === "object" ? JSON.stringify(mode) : mode}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>No camera information available.</p>
        )}
      </section>
    </main>
  );
}

export default PhoneSpecifications;