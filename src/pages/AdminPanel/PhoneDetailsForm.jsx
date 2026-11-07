import { useEffect, useState } from "react";
import Icon from "../../components/Icon/Icon";
import { uploadDeviceImage } from "../../api/admin";
import { getBrands } from "../../api/brands";
import { Field } from "./adminUi";
import { errorText } from "./adminUtils";

const RELEASE_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function parseCodes(text) {
  return text.split(/[,\n]/).map((code) => code.trim()).filter(Boolean);
}

/**
 * Brand, model, release date, model codes and image of a phone (new or existing).
 * onSubmit({ brandId, modelName, releaseDate, buildModels, imageUrl? }) may throw; `imageUrl`
 * is only present when the image changed (a storage URL, or null to remove it).
 */
export default function PhoneDetailsForm({ phone, submitLabel, onSubmit, onCancel }) {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(phone?.brandId || "");
  const [modelName, setModelName] = useState(phone?.modelName || "");
  const [releaseDate, setReleaseDate] = useState(phone?.releaseDate || "");
  const [codes, setCodes] = useState((phone?.buildModels || []).join(", "));
  const [image, setImage] = useState({ preview: phone?.imageThumbUrl || phone?.imageUrl || null, changed: false, value: null });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getBrands().then(
      (data) => {
        if (!ignore) setBrands(data);
      },
      (err) => {
        console.error(err);
        if (!ignore) setError("Could not load brands.");
      },
    );

    return () => {
      ignore = true;
    };
  }, []);

  async function handleImage(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadDeviceImage(file);
      setImage({ preview: uploaded.imageThumbUrl || uploaded.url, changed: true, value: uploaded.storageUrl });
    } catch (err) {
      setError(errorText(err, "Could not upload the image."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!brandId) return setError("Choose a brand.");
    if (!modelName.trim()) return setError("Enter the model name.");
    if (releaseDate.trim() && !RELEASE_DATE.test(releaseDate.trim())) {
      return setError("Release date must be YYYY, YYYY-MM or YYYY-MM-DD.");
    }

    const values = {
      brandId,
      modelName: modelName.trim(),
      releaseDate: releaseDate.trim() || null,
      buildModels: parseCodes(codes),
    };
    if (image.changed) values.imageUrl = image.value;

    setSaving(true);
    setError("");

    try {
      await onSubmit(values);
    } catch (err) {
      setError(errorText(err, "Could not save the phone."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ui-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <Field label="Brand">
          <select className="ui-select" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
            <option value="">Choose…</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Model name">
          <input className="ui-input" value={modelName} maxLength={128} onChange={(event) => setModelName(event.target.value)} />
        </Field>

        <Field label="Release date" hint="YYYY, YYYY-MM or YYYY-MM-DD">
          <input className="ui-input" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
        </Field>

        <Field label="Model codes" hint="Comma-separated, e.g. SM-S928B, SM-S928U (max 20)">
          <input className="ui-input" value={codes} onChange={(event) => setCodes(event.target.value)} />
        </Field>
      </div>

      <div className="ui-field">
        <span className="ui-label">Image</span>
        <div className="admin-image-field">
          {image.preview ? (
            <img className="admin-image-preview" src={image.preview} alt="" />
          ) : (
            <span className="admin-image-preview admin-image-empty">No image</span>
          )}
          <div className="ui-actions">
            <label className="ui-btn ui-btn-small">
              {uploading ? "Uploading…" : image.preview ? "Replace image" : "Upload image"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden disabled={uploading} onChange={handleImage} />
            </label>
            {image.preview && (
              <button type="button" className="ui-btn ui-btn-small" onClick={() => setImage({ preview: null, changed: true, value: null })}>
                <Icon name="trash" /> Remove image
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}

      <div className="ui-actions">
        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || uploading}>
          <Icon name="save" /> {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ui-btn" onClick={onCancel} disabled={saving}><Icon name="close" /> Cancel</button>
        )}
      </div>
    </form>
  );
}
