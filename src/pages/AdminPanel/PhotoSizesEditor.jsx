import { useId, useState } from "react";
import Icon from "../../components/Icon/Icon";
import {
  addPhotoSize,
  formatMp,
  maxPhotoSize,
  parseMp,
  removePhotoSize,
  singleSizeWarning,
  suggestedPhotoSizes,
} from "../../utils/photoResolutions";

// The single-size warning with its three ways out; also shown on pending submissions without the buttons.
export function SingleSizeWarning({ warning, resolutionMp, children }) {
  if (!warning) return null;

  return (
    <div className="photo-sizes-warning" role="status">
      <p>
        <strong>Only {formatMp(warning.size)} MP?</strong> With this list the apps and the website say
        “only {formatMp(warning.size)} MP photos” for a {formatMp(resolutionMp)} MP sensor.
        {warning.likelyMigrated && (
          <> It is the old default binned readout, likely copied over when the list was introduced.</>
        )}
        {" "}Confirm it is the camera app's only photo size, add the full-resolution mode, or mark the sizes as unknown.
      </p>
      {children}
    </div>
  );
}

/**
 * photoResolutionsMp as removable chips. `sizes` is the normalised list ([] = unknown);
 * onChange(nextSizes). resolutionMp is the sensor's value from the form (null while not filled in).
 */
export default function PhotoSizesEditor({ sizes, resolutionMp, activeResolutionMp, onChange }) {
  const labelId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  // The moderator said the single size is right; forgotten as soon as the list changes.
  const [confirmed, setConfirmed] = useState(null);

  function change(next) {
    setError("");
    setConfirmed(null);
    onChange(next);
  }

  function add(size) {
    const result = addPhotoSize(sizes, size, resolutionMp);
    if (result.error) {
      setError(result.error);
      return false;
    }
    change(result.sizes);
    return true;
  }

  function addDraft() {
    const size = parseMp(draft);
    if (size === null) {
      setError("Enter a number of megapixels, e.g. 50 or 12,6.");
      return;
    }
    if (add(size)) setDraft("");
  }

  const suggestions = suggestedPhotoSizes(resolutionMp, sizes);
  const warning = singleSizeWarning(sizes, resolutionMp, activeResolutionMp);
  const showWarning = warning && confirmed !== warning.size;
  // The other suggestions are a quarter of the sensor or less.
  const fullSensor = suggestions.find((size) => size >= resolutionMp * 0.98);

  return (
    <div className="ui-field photo-sizes">
      <span className="ui-label" id={labelId}>Photo sizes (MP)</span>
      <span className="admin-hint">
        Every photo size the stock camera app offers, not only the default binned one. Leave empty when unknown.
      </span>

      <p className="admin-meta">
        Sensor: {resolutionMp > 0 ? `${formatMp(resolutionMp)} MP` : "fill in the resolution"}
        {activeResolutionMp > 0 && <> · activeResolutionMp (read-only, for old clients): {formatMp(activeResolutionMp)} MP</>}
      </p>

      <ul className="photo-sizes-chips" aria-labelledby={labelId}>
        {sizes.length === 0 && <li className="photo-sizes-unknown">Unknown</li>}
        {sizes.map((size) => {
          const tooLarge = resolutionMp > 0 && size > maxPhotoSize(resolutionMp);
          return (
            <li key={size} className={`photo-size-chip ${tooLarge ? "is-invalid" : ""}`}>
              {formatMp(size)} MP
              {tooLarge && <span className="visually-hidden"> (larger than the sensor)</span>}
              <button type="button" aria-label={`Remove ${formatMp(size)} MP`} onClick={() => change(removePhotoSize(sizes, size))}>
                <Icon name="close" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="photo-sizes-actions">
        {suggestions.map((size) => (
          <button key={size} type="button" className="ui-btn ui-btn-small" onClick={() => add(size)}>
            <Icon name="plus" /> {formatMp(size)} MP{size === fullSensor ? " (full sensor)" : ""}
          </button>
        ))}

        <input
          className="ui-input photo-sizes-input"
          inputMode="decimal"
          aria-label="Other photo size in MP"
          placeholder="Other, e.g. 24"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
        />
        <button type="button" className="ui-btn ui-btn-small" onClick={addDraft} disabled={!draft.trim()}>
          <Icon name="plus" /> Add
        </button>

        {sizes.length > 0 && (
          <button type="button" className="ui-btn ui-btn-small" onClick={() => change([])}>
            <Icon name="trash" /> Mark as unknown
          </button>
        )}
      </div>

      {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}

      {showWarning && (
        <SingleSizeWarning warning={warning} resolutionMp={resolutionMp}>
          <div className="ui-actions">
            <button type="button" className="ui-btn ui-btn-small" onClick={() => setConfirmed(warning.size)}>
              <Icon name="check" /> It's the only size
            </button>
            {fullSensor && (
              <button type="button" className="ui-btn ui-btn-small ui-btn-primary" onClick={() => add(fullSensor)}>
                <Icon name="plus" /> Add {formatMp(fullSensor)} MP
              </button>
            )}
            <button type="button" className="ui-btn ui-btn-small" onClick={() => change([])}>
              <Icon name="trash" /> Mark as unknown
            </button>
          </div>
        </SingleSizeWarning>
      )}
    </div>
  );
}
