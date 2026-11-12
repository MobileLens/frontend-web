import { useState } from "react";
import Icon from "../../components/Icon/Icon";
import { CAMERA_TYPE_LABELS, OIS_LABELS } from "../../utils/format";
import { parseMp } from "../../utils/photoResolutions";
import PhotoSizesEditor from "./PhotoSizesEditor";
import { Field } from "./adminUi";
import {
  OPTIONAL_NUMBERS,
  REQUIRED_NUMBERS,
  TEXT_FIELDS,
  cameraToForm,
  emptyCameraForm,
  formToCamera,
} from "./cameraSpec";

const FACING_LABELS = { back: "Back", front: "Front", other: "Other" };

/**
 * Full camera spec editor with video modes. `camera` prefills the form (omit it for a new camera).
 * onSubmit(spec) may throw; its message is shown under the form.
 */
export default function CameraForm({ camera, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => (camera ? cameraToForm(camera) : emptyCameraForm()));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setMode(index, key, value) {
    setForm((prev) => ({
      ...prev,
      videoModes: prev.videoModes.map((mode, i) => (i === index ? { ...mode, [key]: value } : mode)),
    }));
  }

  function addMode() {
    setForm((prev) => ({
      ...prev,
      videoModes: [...prev.videoModes, { widthPx: "", heightPx: "", fpsMax: "", note: "" }],
    }));
  }

  function removeMode(index) {
    setForm((prev) => ({ ...prev, videoModes: prev.videoModes.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const { spec, error: formError } = formToCamera(form);

    if (formError) {
      setError(formError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit(spec);
    } catch (err) {
      setError(err.message || "Could not save the camera.");
      setSaving(false);
    }
  }

  const numberInput = (key, hint) => (
    <input
      className="ui-input"
      inputMode="decimal"
      value={form[key]}
      placeholder={hint}
      onChange={(event) => set(key, event.target.value)}
    />
  );

  return (
    <form className="ui-form camera-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <Field label="Type">
          <select className="ui-select" value={form.type} onChange={(event) => set("type", event.target.value)}>
            {Object.entries(CAMERA_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        <Field label="Facing">
          <select className="ui-select" value={form.facing} onChange={(event) => set("facing", event.target.value)}>
            {Object.entries(FACING_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        <Field label="Stabilisation">
          <select className="ui-select" value={form.ois} onChange={(event) => set("ois", event.target.value)}>
            <option value="">Unknown</option>
            {Object.entries(OIS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        {REQUIRED_NUMBERS.map(({ key, label, hint }) => (
          <Field key={key} label={label}>{numberInput(key, hint)}</Field>
        ))}

        {OPTIONAL_NUMBERS.map(({ key, label, hint }) => (
          <Field key={key} label={label}>{numberInput(key, hint)}</Field>
        ))}

        {TEXT_FIELDS.map(({ key, label, hint }) => (
          <Field key={key} label={label}>
            <input
              className="ui-input"
              value={form[key]}
              placeholder={hint}
              onChange={(event) => set(key, event.target.value)}
            />
          </Field>
        ))}
      </div>

      <PhotoSizesEditor
        sizes={form.photoResolutionsMp}
        resolutionMp={parseMp(form.resolutionMp)}
        activeResolutionMp={camera?.activeResolutionMp}
        onChange={(sizes) => set("photoResolutionsMp", sizes)}
      />

      <div className="admin-form-grid">
        <div className="ui-field">
          <label className="ui-check">
            <input
              type="checkbox"
              checked={form.variableAperture}
              onChange={(event) => set("variableAperture", event.target.checked)}
            />
            Variable aperture
          </label>
          {form.variableAperture && numberInput("apertureNarrow", "Narrowest f/, e.g. 4.0")}
        </div>

        <div className="ui-field">
          <label className="ui-check">
            <input
              type="checkbox"
              checked={form.opticalZoom}
              onChange={(event) => set("opticalZoom", event.target.checked)}
            />
            Optical zoom
          </label>
          {form.opticalZoom && numberInput("focalLengthMaxMm", "Longest focal length (mm)")}
        </div>
      </div>

      <Field label="Note" hint="Shown under the spec table, max 500 characters.">
        <textarea
          className="ui-input"
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={(event) => set("note", event.target.value)}
        />
      </Field>

      <div className="ui-field">
        <span className="ui-label">Video modes</span>
        {form.videoModes.length === 0 && <span className="admin-hint">No video modes.</span>}

        {form.videoModes.map((mode, index) => (
          <div key={index} className="video-mode-row">
            <input
              className="ui-input"
              inputMode="numeric"
              aria-label={`Mode ${index + 1} width`}
              placeholder="Width px"
              value={mode.widthPx}
              onChange={(event) => setMode(index, "widthPx", event.target.value)}
            />
            <span aria-hidden="true">×</span>
            <input
              className="ui-input"
              inputMode="numeric"
              aria-label={`Mode ${index + 1} height`}
              placeholder="Height px"
              value={mode.heightPx}
              onChange={(event) => setMode(index, "heightPx", event.target.value)}
            />
            <input
              className="ui-input"
              inputMode="decimal"
              aria-label={`Mode ${index + 1} max fps`}
              placeholder="Max fps"
              value={mode.fpsMax}
              onChange={(event) => setMode(index, "fpsMax", event.target.value)}
            />
            <input
              className="ui-input"
              aria-label={`Mode ${index + 1} note`}
              placeholder="Note (optional)"
              maxLength={128}
              value={mode.note}
              onChange={(event) => setMode(index, "note", event.target.value)}
            />
            <button type="button" className="ui-btn ui-btn-small" onClick={() => removeMode(index)}>
              <Icon name="trash" /> Remove
            </button>
          </div>
        ))}

        <div>
          <button type="button" className="ui-btn ui-btn-small" onClick={addMode} disabled={form.videoModes.length >= 30}>
            <Icon name="plus" /> Add video mode
          </button>
        </div>
      </div>

      {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}

      <div className="ui-actions">
        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
          <Icon name="save" /> {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ui-btn" onClick={onCancel} disabled={saving}>
            <Icon name="close" /> Cancel
          </button>
        )}
      </div>
    </form>
  );
}
