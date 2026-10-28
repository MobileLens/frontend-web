import { useCallback, useState } from "react";
import { getBrands, updateCamera, updateSmartphone, uploadDeviceImage } from "../../../api/admin";
import { getSmartphoneById } from "../../../api/smartphones";
import { useAsyncData } from "../useAsyncData";
import { asArray, phoneLabel } from "../format";
import Modal from "../components/Modal";

// Mirrors the backend's validateCameraSpec (backend-api/api/src/lib/cameraSpec.ts).
const LENS_FIELDS = [
  { key: "type", label: "Type", kind: "select", options: ["wide", "ultrawide", "tele", "macro", "other"] },
  { key: "facing", label: "Facing", kind: "select", options: ["back", "front", "other"] },
  { key: "resolutionMp", label: "Resolution (MP)", kind: "number", min: 0.1, max: 500 },
  { key: "activeResolutionMp", label: "Active resolution (MP)", kind: "number", min: 0.1, max: 500 },
  { key: "focalLengthMm", label: "Focal length (mm)", kind: "number", min: 0.5, max: 100 },
  { key: "cropFactor", label: "Crop factor", kind: "number", min: 1, max: 20 },
  { key: "aperture", label: "Aperture (f/)", kind: "number", min: 0.5, max: 32 },
  { key: "pixelPitchUm", label: "Pixel pitch (µm)", kind: "number", min: 0.1, max: 10 },
  { key: "sensorFormat", label: "Sensor format", kind: "text", placeholder: "1/1.28" },
  { key: "afZones", label: "AF zones", kind: "number", min: 0, max: 100000, step: 1 },
  { key: "ois", label: "Stabilization", kind: "select", options: ["none", "optical", "sensor_shift"] },
  { key: "aspectRatio", label: "Aspect ratio", kind: "text", placeholder: "4:3" },
  { key: "photoWidthPx", label: "Photo width (px)", kind: "number", min: 1, max: 30000, step: 1 },
  { key: "photoHeightPx", label: "Photo height (px)", kind: "number", min: 1, max: 30000, step: 1 },
  { key: "variableAperture", label: "Variable aperture", kind: "checkbox" },
  { key: "apertureNarrow", label: "Narrowest aperture (f/)", kind: "number", max: 64, showIf: "variableAperture" },
  { key: "opticalZoom", label: "Optical zoom", kind: "checkbox" },
  { key: "focalLengthMaxMm", label: "Max focal length (mm)", kind: "number", max: 1000, showIf: "opticalZoom" },
  { key: "note", label: "Note", kind: "textarea", maxLength: 500 },
];

const PHONE_FIELDS = ["modelName", "brandId", "releaseDate", "imageUrl"];

function toFormValue(field, value) {
  if (field.kind === "checkbox") return Boolean(value);
  if (value === null || value === undefined) return "";
  // The DB stores float32-ish values (12.1999998); show and diff them rounded.
  if (field.kind === "number") return String(Math.round(Number(value) * 1e4) / 1e4);
  return String(value);
}

function toApiValue(field, value) {
  if (field.kind === "checkbox") return Boolean(value);
  if (value === "" || value === null || value === undefined) return null;
  if (field.kind === "number") return Number(value);
  return String(value).trim();
}

function lensToForm(cam) {
  return Object.fromEntries(LENS_FIELDS.map((field) => [field.key, toFormValue(field, cam[field.key])]));
}

function lensDiff(original, form) {
  const patch = {};
  LENS_FIELDS.forEach((field) => {
    const before = toApiValue(field, original[field.key]);
    const after = toApiValue(field, form[field.key]);
    if (before !== after) patch[field.key] = after;
  });
  return patch;
}

async function loadEditorData(phoneId) {
  const [phone, brands] = await Promise.all([getSmartphoneById(phoneId), getBrands().catch(() => [])]);
  return { phone: phone.data && !phone.id ? phone.data : phone, brands: asArray(brands) };
}

function FieldError({ error, field }) {
  if (!error || error.field !== field) return null;
  return <span className="field-error">{error.message}</span>;
}

function LensEditor({ cam, index, form, onChange, error }) {
  return (
    <details className="lens-editor" open={index === 0}>
      <summary className="lens-editor-summary">
        <span>
          Lens {index + 1}: {form.type || "camera"} · {form.facing || "—"}
        </span>
        {error && <span className="field-error">Has errors</span>}
      </summary>

      <div className="form-grid">
        {LENS_FIELDS.filter((field) => !field.showIf || form[field.showIf]).map((field) => {
          const id = `lens-${cam.id}-${field.key}`;

          if (field.kind === "checkbox") {
            return (
              <label key={field.key} className="form-check" htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={form[field.key]}
                  onChange={(event) => onChange(cam.id, field.key, event.target.checked)}
                />
                {field.label}
              </label>
            );
          }

          return (
            <div key={field.key} className={`form-field ${field.kind === "textarea" ? "form-field-wide" : ""}`}>
              <label htmlFor={id} className="form-label">{field.label}</label>
              {field.kind === "select" ? (
                <select
                  id={id}
                  className="editor-input"
                  value={form[field.key]}
                  onChange={(event) => onChange(cam.id, field.key, event.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option.replace("_", " ")}</option>
                  ))}
                </select>
              ) : field.kind === "textarea" ? (
                <textarea
                  id={id}
                  className="editor-input"
                  rows={2}
                  maxLength={field.maxLength}
                  value={form[field.key]}
                  onChange={(event) => onChange(cam.id, field.key, event.target.value)}
                />
              ) : (
                <input
                  id={id}
                  type={field.kind}
                  className="editor-input"
                  min={field.min}
                  max={field.max}
                  step={field.step || "any"}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(event) => onChange(cam.id, field.key, event.target.value)}
                />
              )}
              <FieldError error={error} field={field.key} />
            </div>
          );
        })}
      </div>

      {error && !LENS_FIELDS.some((field) => field.key === error.field) && (
        <p className="admin-inline-error">{error.message}</p>
      )}

      {cam.videoModes?.length > 0 && (
        <div className="video-modes">
          <span className="form-label">Video modes (read-only)</span>
          <ul>
            {cam.videoModes.map((mode) => (
              <li key={mode.id}>
                {mode.widthPx}×{mode.heightPx} @ {mode.fpsMax} fps{mode.note ? ` — ${mode.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}

function EditorForm({ phone, brands, onClose, onSaved }) {
  const cameras = phone.cameras || [];

  const [original, setOriginal] = useState(() => ({
    phone: Object.fromEntries(PHONE_FIELDS.map((key) => [key, phone[key] ?? ""])),
    lenses: Object.fromEntries(cameras.map((cam) => [cam.id, lensToForm(cam)])),
  }));
  const [phoneForm, setPhoneForm] = useState(original.phone);
  const [lensForms, setLensForms] = useState(original.lenses);
  const [imagePreview, setImagePreview] = useState(phone.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ phone: null, lenses: {}, general: "" });

  const phonePatch = Object.fromEntries(
    PHONE_FIELDS.filter((key) => (phoneForm[key] ?? "") !== (original.phone[key] ?? "")).map((key) => [
      key,
      phoneForm[key] === "" ? null : phoneForm[key],
    ])
  );
  const lensPatches = cameras
    .map((cam) => ({ id: cam.id, patch: lensDiff(original.lenses[cam.id], lensForms[cam.id]) }))
    .filter((item) => Object.keys(item.patch).length > 0);
  const hasChanges = Object.keys(phonePatch).length > 0 || lensPatches.length > 0;

  function handlePhoneChange(event) {
    const { name, value } = event.target;
    setPhoneForm((prev) => ({ ...prev, [name]: value }));
    if (name === "imageUrl") setImagePreview(value);
  }

  const handleLensChange = useCallback((camId, key, value) => {
    setLensForms((prev) => ({ ...prev, [camId]: { ...prev[camId], [key]: value } }));
  }, []);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadDeviceImage(file);
      setPhoneForm((prev) => ({ ...prev, imageUrl: result.storageUrl }));
      setImagePreview(result.url);
    } catch (err) {
      setErrors((prev) => ({ ...prev, phone: { field: "imageUrl", message: err.message } }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    const nextErrors = { phone: null, lenses: {}, general: "" };
    const nextOriginal = { phone: { ...original.phone }, lenses: { ...original.lenses } };

    if (Object.keys(phonePatch).length > 0) {
      try {
        await updateSmartphone(phone.id, phonePatch);
        nextOriginal.phone = { ...phoneForm };
      } catch (err) {
        nextErrors.phone = { field: err.field, message: err.message };
      }
    }

    // Sequential so a failure on one lens doesn't hide the others' results.
    for (const { id, patch } of lensPatches) {
      try {
        await updateCamera(id, patch);
        nextOriginal.lenses[id] = { ...lensForms[id] };
      } catch (err) {
        nextErrors.lenses[id] = { field: err.field, message: err.message };
      }
    }

    setSaving(false);
    setOriginal(nextOriginal);

    if (nextErrors.phone || Object.keys(nextErrors.lenses).length > 0) {
      nextErrors.general = "Some changes could not be saved. Fix the highlighted fields and save again.";
      setErrors(nextErrors);
      onSaved({ keepOpen: true });
      return;
    }

    onSaved({ keepOpen: false });
    onClose();
  }

  return (
    <form id="phone-editor-form" onSubmit={handleSave} className="editor-form">
      {errors.general && <div className="admin-error" role="alert">{errors.general}</div>}

      <fieldset className="editor-fieldset">
        <legend>Phone</legend>
        <div className="phone-editor-top">
          <div className="phone-editor-image">
            {imagePreview ? <img src={imagePreview} alt="" /> : <span>No image</span>}
            <label className="btn btn-outline btn-sm">
              {uploading ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" hidden onChange={handleUpload} disabled={uploading} />
            </label>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label htmlFor="phone-modelName" className="form-label">Model name</label>
              <input id="phone-modelName" name="modelName" className="editor-input" value={phoneForm.modelName} onChange={handlePhoneChange} required />
              <FieldError error={errors.phone} field="modelName" />
            </div>
            <div className="form-field">
              <label htmlFor="phone-brandId" className="form-label">Brand</label>
              <select id="phone-brandId" name="brandId" className="editor-input" value={phoneForm.brandId} onChange={handlePhoneChange}>
                {!brands.some((brand) => brand.id === phoneForm.brandId) && (
                  <option value={phoneForm.brandId}>{phone.brandName || "Current brand"}</option>
                )}
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <FieldError error={errors.phone} field="brandId" />
            </div>
            <div className="form-field">
              <label htmlFor="phone-releaseDate" className="form-label">Release date</label>
              <input id="phone-releaseDate" name="releaseDate" className="editor-input" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" value={phoneForm.releaseDate} onChange={handlePhoneChange} />
              <FieldError error={errors.phone} field="releaseDate" />
            </div>
            <div className="form-field">
              <label htmlFor="phone-imageUrl" className="form-label">Image URL</label>
              <input id="phone-imageUrl" name="imageUrl" className="editor-input" value={phoneForm.imageUrl} onChange={handlePhoneChange} />
              <FieldError error={errors.phone} field="imageUrl" />
            </div>
          </div>
        </div>
        {errors.phone && !PHONE_FIELDS.includes(errors.phone.field) && (
          <p className="admin-inline-error">{errors.phone.message}</p>
        )}
      </fieldset>

      <fieldset className="editor-fieldset">
        <legend>Lenses ({cameras.length})</legend>
        {cameras.length === 0 ? (
          <p className="admin-empty">This phone has no approved lenses yet.</p>
        ) : (
          cameras.map((cam, index) => (
            <LensEditor
              key={cam.id}
              cam={cam}
              index={index}
              form={lensForms[cam.id]}
              onChange={handleLensChange}
              error={errors.lenses[cam.id]}
            />
          ))
        )}
      </fieldset>

      <div className="editor-form-footer">
        <p className="editor-note">Saving phone details also marks the phone as verified.</p>
        <div className="editor-form-actions">
          <button type="button" className="btn btn-outline btn-fixed" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-fixed" disabled={!hasChanges || saving || uploading}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function PhoneEditorModal({ phoneId, onClose, onSaved }) {
  const loader = useCallback(() => loadEditorData(phoneId), [phoneId]);
  const { data, error, loading } = useAsyncData(loader);

  return (
    <Modal
      title={data ? `Edit ${phoneLabel(data.phone)}` : "Edit phone"}
      subtitle={data ? `ID ${data.phone.id}` : undefined}
      onClose={onClose}
      size="lg"
    >
      {loading && !data && <p className="admin-empty">Loading phone…</p>}
      {error && <div className="admin-error" role="alert">Could not load phone: {error.message}</div>}
      {data && <EditorForm phone={data.phone} brands={data.brands} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}
