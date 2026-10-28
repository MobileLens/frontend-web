import { useCallback, useState } from "react";
import { getPendingCameras, reviewCamera } from "../../../api/admin";
import { getSmartphoneById } from "../../../api/smartphones";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { asArray, formatDate, formatNumber, phoneLabel, shortId } from "../format";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";

const OIS_LABELS = { none: "None", optical: "Optical", sensor_shift: "Sensor-shift" };

async function loadGroups() {
  const cameras = asArray(await getPendingCameras());
  const phoneIds = [...new Set(cameras.map((cam) => cam.smartphoneId))];

  // One request per phone, not per lens.
  const phones = await Promise.all(
    phoneIds.map((id) => getSmartphoneById(id).catch(() => null))
  );

  return phoneIds.map((id, index) => ({
    phoneId: id,
    phone: phones[index],
    cameras: cameras.filter((cam) => cam.smartphoneId === id),
  }));
}

function Spec({ label, value }) {
  return (
    <div className="spec-item">
      <span className="spec-label">{label}</span>
      <span className="spec-value">{value}</span>
    </div>
  );
}

function LensCard({ cam, busy, error, onReview }) {
  const equivalent = cam.focalLengthMm && cam.cropFactor ? Math.round(cam.focalLengthMm * cam.cropFactor) : null;

  return (
    <div className="camera-card">
      <div className="camera-card-header">
        <h4 className="camera-card-title">{cam.type ? cam.type.toUpperCase() : "Camera"}</h4>
        <span className="camera-badge-facing">{cam.facing || "—"}</span>
      </div>

      <div className="camera-specs-grid">
        <Spec
          label="Resolution"
          value={`${formatNumber(cam.resolutionMp, " MP")}${cam.activeResolutionMp && cam.activeResolutionMp !== cam.resolutionMp ? ` (${formatNumber(cam.activeResolutionMp, " MP")} active)` : ""}`}
        />
        <Spec
          label="Focal length"
          value={`${formatNumber(cam.focalLengthMm, " mm")}${cam.opticalZoom && cam.focalLengthMaxMm ? `–${formatNumber(cam.focalLengthMaxMm, " mm")}` : ""}${equivalent ? ` (≈${equivalent} mm eq.)` : ""}`}
        />
        <Spec
          label="Aperture"
          value={cam.aperture ? `f/${formatNumber(cam.aperture, "", 2)}${cam.variableAperture && cam.apertureNarrow ? `–f/${formatNumber(cam.apertureNarrow, "", 2)}` : ""}` : "—"}
        />
        <Spec label="Sensor" value={cam.sensorFormat ? `${cam.sensorFormat}"` : "—"} />
        <Spec label="Pixel pitch" value={formatNumber(cam.pixelPitchUm, " µm", 2)} />
        <Spec label="Crop factor" value={formatNumber(cam.cropFactor, "×", 2)} />
        <Spec label="OIS" value={OIS_LABELS[cam.ois] || cam.ois || "—"} />
        <Spec label="AF zones" value={cam.afZones ?? "—"} />
      </div>

      {cam.samples && (cam.variableAperture || cam.opticalZoom) && (
        <p className={`camera-samples ${cam.samples.satisfied ? "ok" : "missing"}`}>
          <strong>Sample photos:</strong>{" "}
          {cam.samples.satisfied
            ? "requirements met"
            : `needs ${cam.samples.required} distinct ${cam.samples.needsApertureSamples ? "apertures" : "focal lengths"}`}
        </p>
      )}

      {cam.note && <p className="camera-note">{cam.note}</p>}
      <p className="camera-meta">Submitted {formatDate(cam.submittedAt, true)}</p>

      {error && <p className="admin-inline-error" role="alert">{error}</p>}

      <div className="camera-actions">
        <button type="button" disabled={busy} onClick={() => onReview(cam, "approved")} className="btn btn-success">
          Approve
        </button>
        <button type="button" disabled={busy} onClick={() => onReview(cam, "rejected")} className="btn btn-danger">
          Reject
        </button>
      </div>
    </div>
  );
}

export default function CameraSubmissionsTab({ onChanged }) {
  const { data: groups, loading, error, reload, setData } = useAsyncData(loadGroups);
  const [expanded, setExpanded] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [cardErrors, setCardErrors] = useState({});

  const toggle = useCallback((phoneId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phoneId)) next.delete(phoneId);
      else next.add(phoneId);
      return next;
    });
  }, []);

  async function handleReview(cam, status) {
    setBusyId(cam.id);
    setCardErrors((prev) => ({ ...prev, [cam.id]: "" }));

    try {
      await reviewCamera(cam.id, status);
      setData((prev) =>
        prev
          .map((group) => ({ ...group, cameras: group.cameras.filter((c) => c.id !== cam.id) }))
          .filter((group) => group.cameras.length > 0)
      );
      onChanged();
    } catch (err) {
      const message =
        err.code === "INSUFFICIENT_SAMPLES"
          ? "Not enough sample photos with distinct EXIF values to approve this lens yet."
          : err.message;
      setCardErrors((prev) => ({ ...prev, [cam.id]: message }));
    } finally {
      setBusyId(null);
    }
  }

  const totalLenses = (groups || []).reduce((sum, group) => sum + group.cameras.length, 0);

  return (
    <section className="admin-section">
      <div className="admin-section-title">
        <span>
          Pending lenses <span className="admin-badge">{totalLenses}</span>
        </span>
        <button type="button" className="btn btn-outline btn-sm btn-inline" onClick={reload} disabled={loading}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {error && <div className="admin-error" role="alert">Could not load submissions: {error.message}</div>}
      {loading && !groups && <p className="admin-empty">Loading submissions…</p>}
      {groups && groups.length === 0 && <p className="admin-empty">No pending camera submissions.</p>}

      {groups && groups.length > 0 && (
        <ul className="accordion">
          {groups.map((group) => {
            const isOpen = expanded.has(group.phoneId);

            return (
              <li key={group.phoneId} className={`accordion-item ${isOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="accordion-header"
                  onClick={() => toggle(group.phoneId)}
                  aria-expanded={isOpen}
                >
                  <Icon name="chevron" size={16} className="accordion-chevron" />
                  {group.phone?.imageUrl ? (
                    <img src={group.phone.imageUrl} alt="" className="accordion-thumb" loading="lazy" />
                  ) : (
                    <span className="accordion-thumb accordion-thumb-empty" />
                  )}
                  <span className="accordion-title">
                    {group.phone ? phoneLabel(group.phone) : `Phone ${shortId(group.phoneId)}`}
                  </span>
                  <StatusBadge
                    status="pending"
                    label={`${group.cameras.length} pending ${group.cameras.length === 1 ? "lens" : "lenses"}`}
                  />
                </button>

                {isOpen && (
                  <div className="accordion-body">
                    <div className="cameras-grid">
                      {group.cameras.map((cam) => (
                        <LensCard
                          key={cam.id}
                          cam={cam}
                          busy={busyId === cam.id}
                          error={cardErrors[cam.id]}
                          onReview={handleReview}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
