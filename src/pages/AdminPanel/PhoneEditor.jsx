import { useCallback, useState } from "react";
import Icon from "../../components/Icon/Icon";
import { Link } from "react-router-dom";
import { reviewCamera } from "../../api/admin";
import { createCamera, deleteCamera, updateCamera } from "../../api/cameras";
import { deleteSmartphone, getCatalogue, getSmartphoneById, mergeSmartphones, updateSmartphone } from "../../api/smartphones";
import { formatVideoMode, round } from "../../utils/format";
import { formatAperture, formatEquivalentFocal, slotLabel, cameraSlots } from "../../utils/camera";
import CameraForm from "./CameraForm";
import PhoneDetailsForm from "./PhoneDetailsForm";
import { EmptyNote, LoadState, Section } from "./adminUi";
import { errorText, phoneName, useAdminData } from "./adminUtils";

function cameraSummary(camera) {
  return [
    camera.resolutionMp && `${round(camera.resolutionMp)} MP`,
    formatEquivalentFocal(camera) !== "—" && `${formatEquivalentFocal(camera)} eq.`,
    formatAperture(camera) !== "—" && formatAperture(camera),
    camera.sensorFormat && `${camera.sensorFormat}"`,
    camera.videoModes?.length > 0 && `${camera.videoModes.length} video ${camera.videoModes.length === 1 ? "mode" : "modes"}`,
  ].filter(Boolean).join(" · ");
}

function MergeBox({ phone, onMerged, notify }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;

    try {
      const { data } = await getCatalogue({ q: query.trim() }, 10, { fresh: true });
      setResults(data.filter((item) => item.id !== phone.id));
    } catch (err) {
      notify(errorText(err, "Search failed."), "error");
    }
  }

  async function merge(source) {
    const message =
      `Merge “${phoneName(source)}” into “${phoneName(phone)}”?\n\n` +
      "Its cameras, photos, videos, reviews, favourites and model codes move here, and the duplicate is deleted. This cannot be undone.";
    if (!window.confirm(message)) return;

    setBusy(true);

    try {
      await mergeSmartphones(phone.id, source.id);
      setResults(null);
      setQuery("");
      onMerged(source);
    } catch (err) {
      notify(errorText(err, "Could not merge the phones."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="admin-search" onSubmit={search}>
        <input
          className="ui-input"
          type="search"
          placeholder="Find the duplicate…"
          aria-label="Find the duplicate phone"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="ui-btn"><Icon name="search" /> Search</button>
      </form>

      {results?.length === 0 && <EmptyNote>No other phones match.</EmptyNote>}

      {results?.length > 0 && (
        <ul className="admin-list">
          {results.map((item) => (
            <li key={item.id} className="admin-list-item">
              <div className="admin-list-main">
                <span className="admin-list-title">{phoneName(item)}</span>
                <div className="admin-meta">{item.verified ? "Verified" : "Not verified"}{item.releaseDate && ` · ${item.releaseDate}`}</div>
              </div>
              <div className="ui-actions admin-list-actions">
                <button type="button" className="ui-btn ui-btn-small" disabled={busy} onClick={() => merge(item)}>
                  <Icon name="merge" /> Merge into this phone
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PhoneEditor({ phoneId, isAdmin, notify, onClose, onChanged }) {
  const loadPhone = useCallback(() => getSmartphoneById(phoneId, { fresh: true }), [phoneId]);
  const { data: phone, loading, error, reload } = useAdminData(loadPhone);

  const [formVersion, setFormVersion] = useState(0);
  const [editingCameraId, setEditingCameraId] = useState(null);
  const [addingCamera, setAddingCamera] = useState(false);

  function changed() {
    reload();
    onChanged();
  }

  async function saveDetails(values) {
    await updateSmartphone(phone.id, values);
    setFormVersion((version) => version + 1);
    notify(phone.verified ? "Phone saved." : "Phone saved and verified.");
    changed();
  }

  async function saveCamera(camera, spec) {
    await updateCamera(camera.id, spec);
    setEditingCameraId(null);
    notify("Camera saved.");
    changed();
  }

  // Cameras are created as submissions; approve it straight away.
  async function addCamera(spec) {
    const created = await createCamera(phone.id, spec);
    await reviewCamera(created.id, "approved");
    setAddingCamera(false);
    notify("Camera added.");
    changed();
  }

  async function removeCamera(camera, label) {
    if (!window.confirm(`Delete the ${label} camera with all its sample photos and videos?`)) return;

    try {
      const result = await deleteCamera(camera.id);
      notify(`Camera deleted (${result.deletedPhotos} photos, ${result.deletedVideos} videos removed).`);
      changed();
    } catch (err) {
      notify(errorText(err, "Could not delete the camera."), "error");
    }
  }

  async function removePhone() {
    const name = phoneName(phone);
    if (!window.confirm(`Delete ${name} with all its cameras, photos and videos? Reviews only about this phone are deleted too. This cannot be undone.`)) return;

    try {
      await deleteSmartphone(phone.id);
      notify(`Deleted ${name}.`);
      onChanged();
      onClose();
    } catch (err) {
      notify(errorText(err, "Could not delete the phone."), "error");
    }
  }

  function handleMerged(source) {
    notify(`Merged ${phoneName(source)} into ${phoneName(phone)}.`);
    changed();
  }

  const back = (
    <button type="button" className="ui-btn ui-btn-small" onClick={onClose}><Icon name="arrowLeft" /> All phones</button>
  );

  if (!phone) {
    return (
      <Section title="Phone" actions={back}>
        <LoadState loading={loading} error={error} errorMessage="Could not load the phone." />
      </Section>
    );
  }

  const slots = Object.entries(cameraSlots(phone.cameras));

  return (
    <>
      <Section
        title={phoneName(phone)}
        actions={
          <>
            <Link className="ui-btn ui-btn-small" to={`/phone/${phone.id}`}><Icon name="eye" /> View page</Link>
            {back}
          </>
        }
      >
        <p className="admin-meta admin-section-intro">
          {phone.verified ? (
            <span className="ui-badge">Verified</span>
          ) : (
            <span className="ui-badge admin-badge-warning">Not verified – saving verifies it</span>
          )}
          {" "}{phone.viewCount ?? 0} views · ID {phone.id}
        </p>

        <PhoneDetailsForm
          key={formVersion}
          phone={phone}
          submitLabel={phone.verified ? "Save" : "Save & verify"}
          onSubmit={saveDetails}
        />
      </Section>

      <Section
        title="Cameras"
        count={phone.cameras.length}
        actions={!addingCamera && (
          <button type="button" className="ui-btn ui-btn-small ui-btn-primary" onClick={() => setAddingCamera(true)}>
            <Icon name="plus" /> Add camera
          </button>
        )}
      >
        {addingCamera && (
          <div className="admin-panel-box">
            <CameraForm submitLabel="Add camera" onSubmit={addCamera} onCancel={() => setAddingCamera(false)} />
          </div>
        )}

        {slots.length === 0 && !addingCamera && <EmptyNote>No approved cameras yet.</EmptyNote>}

        <ul className="admin-list">
          {slots.map(([slot, camera]) => (
            <li key={camera.id} className="admin-list-item">
              {editingCameraId === camera.id ? (
                <div className="admin-list-main">
                  <h3 className="admin-camera-card-title">{slotLabel(slot)}</h3>
                  <CameraForm
                    camera={camera}
                    submitLabel="Save camera"
                    onSubmit={(spec) => saveCamera(camera, spec)}
                    onCancel={() => setEditingCameraId(null)}
                  />
                </div>
              ) : (
                <>
                  <div className="admin-list-main">
                    <span className="admin-list-title">{slotLabel(slot)}</span>
                    <div className="admin-meta">{cameraSummary(camera)}</div>
                    {camera.videoModes?.length > 0 && (
                      <div className="admin-meta">{camera.videoModes.map(formatVideoMode).join(", ")}</div>
                    )}
                  </div>
                  <div className="ui-actions admin-list-actions">
                    <button type="button" className="ui-btn ui-btn-small" onClick={() => setEditingCameraId(camera.id)}><Icon name="edit" /> Edit</button>
                    <button type="button" className="ui-btn ui-btn-small ui-btn-danger" onClick={() => removeCamera(camera, slotLabel(slot))}>
                      <Icon name="trash" /> Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Merge a duplicate">
        <p className="admin-hint admin-section-intro">
          Found the same phone twice? Search for the duplicate and merge it into this one.
        </p>
        <MergeBox phone={phone} notify={notify} onMerged={handleMerged} />
      </Section>

      {isAdmin && (
        <Section title="Delete phone">
          <p className="admin-hint admin-section-intro">
            Removes the phone with its cameras, photos and videos. Comparison reviews stay; reviews only about this phone are deleted.
          </p>
          <button type="button" className="ui-btn ui-btn-danger" onClick={removePhone}><Icon name="trash" /> Delete {phoneName(phone)}</button>
        </Section>
      )}
    </>
  );
}
