import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { getPendingCameras, reviewCamera } from "../../api/admin";
import { getSmartphoneById, updateSmartphone } from "../../api/smartphones";
import Icon from "../../components/Icon/Icon";
import { CAMERA_TYPE_LABELS, OIS_LABELS, formatVideoMode, round } from "../../utils/format";
import {
  formatAperture,
  formatEquivalentAperture,
  formatEquivalentFocal,
  formatFocalLength,
  formatPixelPitch,
  formatSensorSize,
} from "../../utils/camera";
import { formatPhotoSizes, singleSizeWarning } from "../../utils/photoResolutions";
import CameraForm from "./CameraForm";
import { SingleSizeWarning } from "./PhotoSizesEditor";
import PhoneDetailsForm from "./PhoneDetailsForm";
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

// The submissions of one phone, in the order they arrived; phones keep the order of their oldest one.
function groupByPhone(cameras) {
  const groups = new Map();

  for (const camera of cameras || []) {
    if (!groups.has(camera.smartphoneId)) {
      groups.set(camera.smartphoneId, { id: camera.smartphoneId, phone: camera.phone, cameras: [] });
    }
    groups.get(camera.smartphoneId).cameras.push(camera);
  }

  return [...groups.values()];
}

// Brand, model, date, codes and image of the phone, corrected before its cameras go public.
function PhoneEditBox({ phoneId, notify, onSaved, onCancel }) {
  const load = useCallback(() => getSmartphoneById(phoneId, { fresh: true }), [phoneId]);
  const { data: phone, loading, error } = useAdminData(load);

  async function save(values) {
    await updateSmartphone(phoneId, values);
    notify(phone.verified ? "Phone saved." : "Phone saved and verified.");
    onSaved();
  }

  return (
    <div className="admin-submission-form">
      <LoadState loading={loading} error={error} errorMessage="Could not load the phone." />
      {phone && (
        <PhoneDetailsForm
          phone={phone}
          submitLabel={phone.verified ? "Save phone" : "Save & verify phone"}
          onSubmit={save}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

function PhoneGroup({ group, notify, onDropped, onPhoneChanged, decide }) {
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  async function quickDecide(camera, status) {
    setBusy(true);

    try {
      await decide(camera, status);
    } catch (err) {
      notify(errorText(err, "Could not review the submission."), "error");
    } finally {
      setBusy(false);
    }
  }

  // One at a time: the backend refuses a camera that duplicates one approved a moment ago.
  async function approveAll() {
    setBusy(true);
    let approved = 0;
    const failures = [];

    for (const camera of group.cameras) {
      try {
        await reviewCamera(camera.id, "approved");
        onDropped(camera.id);
        approved += 1;
      } catch (err) {
        if (err.code === "ALREADY_REVIEWED") {
          onDropped(camera.id);
        } else {
          failures.push(`${CAMERA_TYPE_LABELS[camera.type] || "Camera"}: ${errorText(err, "could not be approved")}`);
        }
      }
    }

    setBusy(false);

    if (failures.length > 0) {
      notify(`Approved ${approved} of ${group.cameras.length}. ${failures.join(" ")}`, "error");
    } else {
      notify(`Approved ${approved} ${approved === 1 ? "camera" : "cameras"} of ${phoneName(group.phone)}.`);
    }
  }

  return (
    <article className="admin-submission-group">
      <header className="admin-submission-head">
        <div className="admin-submission-phone">
          {group.phone?.imageThumbUrl || group.phone?.imageUrl ? (
            <img className="admin-phone-thumb" src={group.phone.imageThumbUrl || group.phone.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="admin-phone-thumb" aria-hidden="true" />
          )}
          <div>
            <h3 className="admin-submission-title">
              <Link to={`/phone/${group.id}`}>{phoneName(group.phone)}</Link>
            </h3>
            <span className="admin-meta">
              {group.cameras.length} {group.cameras.length === 1 ? "camera" : "cameras"} waiting
            </span>
          </div>
        </div>

        <div className="ui-actions">
          <button type="button" className="ui-btn ui-btn-small" disabled={busy} onClick={() => setEditingPhone((open) => !open)}>
            <Icon name="edit" /> {editingPhone ? "Close phone details" : "Edit phone"}
          </button>
          <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={busy} onClick={approveAll}>
            <Icon name="check" /> {busy ? "Working…" : `Approve all (${group.cameras.length})`}
          </button>
        </div>
      </header>

      {editingPhone && (
        <PhoneEditBox
          phoneId={group.id}
          notify={notify}
          onCancel={() => setEditingPhone(false)}
          onSaved={() => {
            setEditingPhone(false);
            onPhoneChanged();
          }}
        />
      )}

      <div className="admin-cameras-grid">
        {group.cameras.map((camera) => {
          const samples = sampleSummary(camera.samples);

          if (editingId === camera.id) {
            return (
              <div key={camera.id} className="admin-camera-card admin-camera-card-wide">
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
                <div className="admin-camera-card-header">
                  <h4 className="admin-camera-card-title">{CAMERA_TYPE_LABELS[camera.type] || "Camera"}</h4>
                  <span className="admin-camera-badge-facing">{camera.facing}</span>
                </div>
                <p className="admin-meta">Submitted {formatDateTime(camera.submittedAt)}</p>

                <div className="admin-camera-specs-grid">
                  <Spec label="Sensor resolution">{camera.resolutionMp && `${round(camera.resolutionMp)} MP`}</Spec>
                  <Spec label="Photo sizes">{formatPhotoSizes(camera)}</Spec>
                  <Spec label="Sensor">
                    {[formatSensorSize(camera) !== "—" && formatSensorSize(camera), camera.sensorModel].filter(Boolean).join(" · ")}
                  </Spec>
                  <Spec label="Pixel pitch">{formatPixelPitch(camera)}</Spec>
                  <Spec label="Focal length">
                    {camera.focalLengthMm && `${formatEquivalentFocal(camera)} eq. (${formatFocalLength(camera)})`}
                  </Spec>
                  <Spec label="Aperture">
                    {camera.aperture && `${formatEquivalentAperture(camera)} eq. (${formatAperture(camera)})`}
                  </Spec>
                  <Spec label="Stabilisation">{OIS_LABELS[camera.ois]}</Spec>
                  <Spec label="Crop factor">{camera.cropFactor && round(camera.cropFactor, 2)}</Spec>
                  <Spec label="Video">
                    {camera.videoModes?.length ? camera.videoModes.map(formatVideoMode).join(", ") : null}
                  </Spec>
                </div>

                {samples && (
                  <p className={`admin-meta ${camera.samples.satisfied ? "" : "admin-warning"}`}>{samples}</p>
                )}

                <SingleSizeWarning
                  warning={singleSizeWarning(camera.photoResolutionsMp || [], camera.resolutionMp, camera.activeResolutionMp)}
                  resolutionMp={camera.resolutionMp}
                />
              </div>

              <div className="ui-actions">
                <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={busy} onClick={() => quickDecide(camera, "approved")}>
                  <Icon name="check" /> Approve
                </button>
                <button type="button" className="ui-btn ui-btn-small" disabled={busy} onClick={() => setEditingId(camera.id)}>
                  <Icon name="edit" /> Edit &amp; approve
                </button>
                <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={busy} onClick={() => quickDecide(camera, "rejected")}>
                  <Icon name="close" /> Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function CamerasTab({ notify, onChanged }) {
  const { data: cameras, loading, error, setData, reload } = useAdminData(getPendingCameras);

  function drop(id) {
    setData((rows) => rows?.filter((row) => row.id !== id));
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

  function phoneChanged() {
    reload();
    onChanged();
  }

  const groups = groupByPhone(cameras);

  return (
    <Section title="Waiting for review" count={cameras?.length}>
      <p className="admin-hint admin-section-intro">
        Sample photos are informational: a camera can be approved without them, e.g. from the
        manufacturer's spec sheet. Use “Edit &amp; approve” to fix a camera, “Edit phone” to fix the phone itself.
      </p>

      <LoadState loading={loading} error={error} errorMessage="Could not load camera submissions." />
      {cameras?.length === 0 && <EmptyNote>No camera submissions are waiting.</EmptyNote>}

      {groups.map((group) => (
        <PhoneGroup
          key={group.id}
          group={group}
          notify={notify}
          decide={decide}
          onDropped={drop}
          onPhoneChanged={phoneChanged}
        />
      ))}
    </Section>
  );
}
