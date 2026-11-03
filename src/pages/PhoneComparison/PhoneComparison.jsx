import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { compareSmartphones, searchSmartphones } from "../../api/smartphones";
import {
  addPhoneToCompare,
  clearComparePhones,
  getComparePhones,
  removePhoneFromCompare,
} from "../../api/compare";
import { PhoneImage } from "../../components/PhoneCard/PhoneCard";
import {
  bestVideoMode,
  cameraSlots,
  compareSlots,
  formatAperture,
  formatEquivalentFocal,
  slotLabel,
} from "../../utils/camera";
import { OIS_LABELS, formatReleaseDate, formatVideoMode } from "../../utils/format";
import "./PhoneComparison.css";

const MAX_PHONES = 4;
const SEARCH_DELAY_MS = 250;

const GENERAL_ROWS = [
  { label: "Release date", value: (phone) => (phone.releaseDate ? formatReleaseDate(phone.releaseDate) : null) },
  { label: "Views", value: (phone) => phone.viewCount.toLocaleString("en-US") },
  { label: "Cameras", value: (phone) => String(phone.cameras.length), score: (phone) => phone.cameras.length },
  { label: "Data verified", value: (phone) => (phone.verified ? "Yes" : "No") },
  { label: "Model codes", value: (phone) => (phone.buildModels.length ? phone.buildModels.join(", ") : null) },
];

// `score` marks the best value in a row; higher wins unless `lowerIsBetter`.
const CAMERA_ROWS = [
  {
    label: "Resolution",
    value: (camera) => `${camera.resolutionMp} MP`,
    score: (camera) => camera.resolutionMp,
  },
  {
    label: "Sensor",
    value: (camera) => [camera.sensorFormat && `${camera.sensorFormat}″`, camera.sensorModel].filter(Boolean).join(" · ") || null,
    score: (camera) => camera.sensorDenominator,
    lowerIsBetter: true,
  },
  {
    label: "Pixel pitch",
    value: (camera) => (camera.pixelPitchUm ? `${camera.pixelPitchUm} μm` : null),
    score: (camera) => camera.pixelPitchUm,
  },
  {
    label: "Aperture",
    value: formatAperture,
    score: (camera) => camera.aperture,
    lowerIsBetter: true,
  },
  { label: "Focal length (equiv.)", value: formatEquivalentFocal },
  { label: "Stabilisation", value: (camera) => OIS_LABELS[camera.ois] || null },
  {
    label: "Best video",
    value: (camera) => {
      const mode = bestVideoMode(camera);
      return mode ? formatVideoMode(mode) : null;
    },
  },
];

function bestIndexes(values, lowerIsBetter) {
  const scored = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (scored.length < 2) return new Set();

  const best = lowerIsBetter ? Math.min(...scored) : Math.max(...scored);
  if (scored.every((value) => value === best)) return new Set();

  return new Set(values.flatMap((value, index) => (value === best ? [index] : [])));
}

function AddPhoneSearch({ selectedIds, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return undefined;

    let ignore = false;
    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const phones = await searchSmartphones(trimmed, 8);

        if (!ignore) {
          setResults(phones);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) {
          setSearching(false);
        }
      }
    }, SEARCH_DELAY_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  function handleAdd(phone) {
    onAdd(phone);
    setQuery("");
    setResults([]);
  }

  const visibleResults = query.trim() ? results.filter((phone) => !selectedIds.includes(phone.id)) : [];

  return (
    <div className="compare-add">
      <input
        type="search"
        className="ui-input"
        placeholder="Add a phone: type a model name…"
        aria-label="Search for a phone to add"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim() && (
        <ul className="compare-add-results">
          {searching && visibleResults.length === 0 && <li className="compare-add-empty">Searching…</li>}
          {!searching && visibleResults.length === 0 && <li className="compare-add-empty">No phones found.</li>}
          {visibleResults.map((phone) => (
            <li key={phone.id}>
              <button type="button" className="compare-add-option" onClick={() => handleAdd(phone)}>
                <span className="compare-add-thumb"><PhoneImage phone={phone} /></span>
                <span>
                  {phone.brandName && <span className="phone-brand">{phone.brandName} </span>}
                  <strong>{phone.modelName}</strong>
                </span>
                <span className="compare-add-plus" aria-hidden="true">+</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Compare() {
  const [selected, setSelected] = useState(getComparePhones);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ids = selected.map((phone) => phone.id);
  const idsKey = ids.join(",");

  useEffect(() => {
    const phoneIds = idsKey ? idsKey.split(",") : [];
    if (phoneIds.length < 2) return undefined;

    let ignore = false;

    async function loadDetails() {
      setLoading(true);
      setError("");

      try {
        const data = await compareSmartphones(phoneIds);

        if (!ignore) {
          setDetails(data);
        }
      } catch (err) {
        console.error(err);

        if (!ignore) {
          setError("Could not load comparison data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      ignore = true;
    };
  }, [idsKey]);

  function handleAdd(phone) {
    const result = addPhoneToCompare({
      id: phone.id,
      modelName: phone.modelName,
      brandName: phone.brandName,
      imageUrl: phone.imageThumbUrl || phone.imageUrl,
    });
    setSelected(result.phones);
  }

  function handleRemove(phoneId) {
    setSelected(removePhoneFromCompare(phoneId));
    setDetails((prev) => prev.filter((phone) => phone.id !== phoneId));
  }

  function handleClear() {
    clearComparePhones();
    setSelected([]);
    setDetails([]);
  }

  // Phones deleted from the catalogue are skipped by the API.
  const phones = ids.length >= 2 ? details.filter((phone) => ids.includes(phone.id)) : [];
  const slotsByPhone = phones.map((phone) => cameraSlots(phone.cameras));
  const slots = [...new Set(slotsByPhone.flatMap((slots) => Object.keys(slots)))].sort(compareSlots);

  return (
    <main className="page">
      <div className="page-inner">
        <header className="page-header">
          <h1 className="page-title">Compare phones</h1>
          <span className="page-subtitle">
            {selected.length} of {MAX_PHONES} selected
            {selected.length > 0 && (
              <> · <button type="button" className="compare-clear" onClick={handleClear}>Clear</button></>
            )}
          </span>
        </header>

        {selected.length < MAX_PHONES && <AddPhoneSearch selectedIds={ids} onAdd={handleAdd} />}

        {selected.length < 2 && (
          <div className="compare-empty">
            {selected.length === 1 && (
              <div className="compare-chip">
                <span className="compare-add-thumb"><PhoneImage phone={selected[0]} /></span>
                <Link to={`/phone/${selected[0].id}`} className="compare-chip-name">
                  {selected[0].brandName} {selected[0].modelName}
                </Link>
                <button
                  type="button"
                  className="compare-remove"
                  aria-label={`Remove ${selected[0].modelName}`}
                  onClick={() => handleRemove(selected[0].id)}
                >
                  ×
                </button>
              </div>
            )}
            <p className="page-status">
              Add at least 2 phones to compare them — search above, or use “Add to compare” on a phone's page
              in the <Link to="/browse" className="text-link">catalogue</Link>.
            </p>
          </div>
        )}

        {selected.length >= 2 && loading && phones.length === 0 && (
          <p className="page-status">Loading comparison…</p>
        )}

        {error && <p className="page-status page-status-error">{error}</p>}

        {phones.length >= 2 && (
          <div className="compare-table-wrap">
            <table className="compare-table" style={{ "--compare-cols": phones.length }}>
              <thead>
                <tr>
                  <th scope="col" className="compare-corner" />
                  {phones.map((phone) => (
                    <th key={phone.id} scope="col" className="compare-phone">
                      <button
                        type="button"
                        className="compare-remove"
                        aria-label={`Remove ${phone.modelName} from comparison`}
                        onClick={() => handleRemove(phone.id)}
                      >
                        ×
                      </button>
                      <Link to={`/phone/${phone.id}`} className="compare-phone-link">
                        <span className="compare-phone-image"><PhoneImage phone={phone} /></span>
                        {phone.brandName && <span className="phone-brand">{phone.brandName}</span>}
                        <span className="compare-phone-model">{phone.modelName}</span>
                      </Link>
                      <Link to={`/phone/${phone.id}/reviews`} className="text-link compare-reviews">
                        Reviews
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr className="compare-group">
                  <th colSpan={phones.length + 1} scope="colgroup">General</th>
                </tr>
                {GENERAL_ROWS.map((row) => {
                  const best = row.score ? bestIndexes(phones.map(row.score)) : new Set();

                  return (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {phones.map((phone, index) => (
                        <td key={phone.id} className={best.has(index) ? "compare-best" : ""}>
                          {row.value(phone) ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {slots.map((slot) => (
                  <Fragment key={slot}>
                    <tr className="compare-group">
                      <th colSpan={phones.length + 1} scope="colgroup">{slotLabel(slot)}</th>
                    </tr>
                    {CAMERA_ROWS.map((row) => {
                      const cameras = slotsByPhone.map((slots) => slots[slot]);
                      const best = row.score
                        ? bestIndexes(cameras.map((camera) => (camera ? row.score(camera) : null)), row.lowerIsBetter)
                        : new Set();

                      return (
                        <tr key={row.label}>
                          <th scope="row">{row.label}</th>
                          {cameras.map((camera, index) => (
                            <td
                              key={phones[index].id}
                              className={`${best.has(index) ? "compare-best" : ""} ${camera ? "" : "compare-missing"}`}
                            >
                              {camera ? row.value(camera) ?? "—" : "Not present"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {phones.length >= 2 && (
          <p className="compare-legend">
            <span className="compare-best-swatch" aria-hidden="true" /> Best value in the row. Focal lengths are
            full-frame equivalents; a lower f-number and sensor fraction (1/x″) are better.
          </p>
        )}
      </div>
    </main>
  );
}

export default Compare;
