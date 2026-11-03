import { useState } from "react";
import { Link } from "react-router-dom";
import { getPendingCameras, reviewCamera } from "../../api/admin";
import { CAMERA_TYPE_LABELS, OIS_LABELS, formatVideoMode, round } from "../../utils/format";
import { formatAperture, formatEquivalentFocal } from "../../utils/camera";
import CameraForm from "./CameraForm";
import { EmptyNote, LoadState, Section } from "./adminUi";
import { errorText, formatDateTime, phoneName, useAdminData } from "./adminUtils";

function Spec({ label, children }) {
  return (
    <div className="admin-spec-item">
      <span className="admin-spec-label">{label}</span>
      <span className="admin-spec-value">{children || "—"}</span>
    </div>
  );
}

function sampleSummary(samples) {
  if (!samples || !(samples.needsApertureSamples || samples.needsZoomSamples)) return null;
  if (samples.satisfied) return "Sample coverage complete";

  return "Samples: " + [
    samples.needsApertureSamples && `apertures ${samples.apertureValues}/${samples.required}`,
    samples.needsZoomSamples && `focal lengths ${samples.focalLengthValues}/${samples.required}`,
  ].filter(Boolean).join(", ");
}

export default function CamerasTab({ notify, onChanged }) {
  const { data: cameras, loading, error, setData } = useAdminData(getPendingCameras);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function drop(id) {
    setData((rows) => rows?.filter((row) => row.id !== id));
    setEditingId((current) => (current === id ? null : current));
    onChanged();
  }

  // Throws on failure so the edit form can show the message.
  async function decide(camera, status, corrections) {
    try {
      await reviewCamera(camera.id, status, corrections);
      drop(camera.id);
      notify(status === "approved" ? "Camera approved." : "Camera rejected.");
    } catch (err) {
      if (err.code === "ALREADY_REVIEWED") {
        drop(camera.id);
        notify("Someone else has already reviewed this submission.", "error");
        return;
      }
      throw err;
    }
  }

  async function quickDecide(camera, status) {
    setBusyId(camera.id);

    try {
      await decide(camera, status);
    } catch (err) {
      notify(errorText(err, "Could not review the submission."), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Section title="Waiting for review" count={cameras?.length}>
      <p className="admin-hint admin-section-intro">
        Sample photos are informational: a camera can be approved without them, e.g. from the
        manufacturer's spec sheet. Use “Edit &amp; approve” to fix values before approving.
      </p>

      <LoadState loading={loading} error={error} errorMessage="Could not load camera submissions." />
      {cameras?.length === 0 && <EmptyNote>No camera submissions are waiting.</EmptyNote>}

      <div className="admin-cameras-grid">
        {cameras?.map((camera) => {
          const samples = sampleSummary(camera.samples);

          if (editingId === camera.id) {
            return (
              <div key={camera.id} className="admin-camera-card admin-camera-card-wide">
                <h3 className="admin-camera-card-phone">{phoneName(camera.phone)}</h3>
                <CameraForm
                  camera={camera}
                  submitLabel="Approve with these values"
                  onSubmit={(spec) => decide(camera, "approved", spec)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            );
          }

          return (
            <div key={camera.id} className="admin-camera-card">
              <div>
                <Link className="admin-camera-card-phone" to={`/phone/${camera.smartphoneId}`}>
                  {phoneName(camera.phone)}
                </Link>
                <div className="admin-camera-card-header">
                  <h3 className="admin-camera-card-title">{CAMERA_TYPE_LABELS[camera.type] || "Camera"}</h3>
                  <span className="admin-camera-badge-facing">{camera.facing}</span>
                </div>
                <p className="admin-meta">Submitted {formatDateTime(camera.submittedAt)}</p>

                <div className="admin-camera-specs-grid">
                  <Spec label="Resolution">{camera.resolutionMp && `${round(camera.resolutionMp)} MP`}</Spec>
                  <Spec label="Sensor">
                    {[camera.sensorFormat && `${camera.sensorFormat}"`, camera.sensorModel].filter(Boolean).join(" · ")}
                  </Spec>
                  <Spec label="Focal length">
                    {camera.focalLengthMm && `${round(camera.focalLengthMm)} mm (${formatEquivalentFocal(camera)} eq.)`}
                  </Spec>
                  <Spec label="Aperture">{formatAperture(camera)}</Spec>
                  <Spec label="Stabilisation">{OIS_LABELS[camera.ois]}</Spec>
                  <Spec label="Crop factor">{camera.cropFactor && round(camera.cropFactor, 2)}</Spec>
                  <Spec label="Video">
                    {camera.videoModes?.length ? camera.videoModes.map(formatVideoMode).join(", ") : null}
                  </Spec>
                </div>

                {samples && (
                  <p className={`admin-meta ${camera.samples.satisfied ? "" : "admin-warning"}`}>{samples}</p>
                )}
              </div>

              <div className="ui-actions">
                <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={busyId === camera.id} onClick={() => quickDecide(camera, "approved")}>
                  Approve
                </button>
                <button type="button" className="ui-btn ui-btn-small" disabled={busyId === camera.id} onClick={() => setEditingId(camera.id)}>
                  Edit &amp; approve
                </button>
                <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={busyId === camera.id} onClick={() => quickDecide(camera, "rejected")}>
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
