import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { compareSmartphones, searchSmartphones } from "../../api/smartphones";
import {
  MAX_COMPARE_PHONES,
  addPhoneToCompare,
  clearComparePhones,
  removePhoneFromCompare,
} from "../../api/compare";
import { VideoLines } from "../../components/CameraSpecs/CameraSpecs";
import Icon from "../../components/Icon/Icon";
import { PhoneImage } from "../../components/PhoneCard/PhoneCard";
import {
  cameraSlots,
  compareSlots,
  equivalentAperture,
  formatAperture,
  formatAutofocus,
  formatEquivalentAperture,
  formatEquivalentFocal,
  formatBinnedPitch,
  formatFocalLength,
  formatMegapixels,
  formatPixelPitch,
  formatSensorSize,
  largestPhotoMp,
  slotLabel,
} from "../../utils/camera";
import { OIS_LABELS, formatReleaseDate, round } from "../../utils/format";
import { photoSizesSummary } from "../../utils/photoResolutions";
import { useCompareList } from "../../utils/useCompareList";
import CompareGallery from "./CompareGallery";
import "./PhoneComparison.css";

const SEARCH_DELAY_MS = 250;

const GENERAL_ROWS = [
  { label: "Release date", value: (phone) => (phone.releaseDate ? formatReleaseDate(phone.releaseDate) : null) },
  { label: "Views", value: (phone) => phone.viewCount.toLocaleString("en-US") },
  { label: "Cameras", value: (phone) => String(phone.cameras.length), score: (phone) => phone.cameras.length },
  { label: "Data verified", value: (phone) => (phone.verified ? "Yes" : "No") },
  { label: "Model codes", value: (phone) => (phone.buildModels.length ? phone.buildModels.join(", ") : null) },
];

// `score` marks the best value in a row; higher wins unless `lowerIsBetter`. Scores are rounded
// like the values on screen, so two cameras that read the same tie.
//
// The winner on light is the 35 mm equivalent aperture: a lower actual f-number can still mean less
// light when the sensor is smaller. Likewise the winner on resolution is the largest photo the
// camera app takes, not the sensor's pixel count (a 50 MP sensor may only output 12.5 MP); with
// unknown photo sizes the sensor counts.
const CAMERA_ROWS = [
  { label: "Focal length (35 mm equiv.)", value: formatEquivalentFocal },
  { label: "Focal length (actual)", value: formatFocalLength },
  {
    label: "Aperture (35 mm equiv.)",
    value: formatEquivalentAperture,
    score: (camera) => {
      const aperture = equivalentAperture(camera);
      return aperture ? round(aperture, 1) : null;
    },
    lowerIsBetter: true,
  },
  { label: "Aperture (actual)", value: formatAperture },
  {
    label: "Resolution",
    value: (camera) => {
      const photos = photoSizesSummary(camera);
      return (
        <>
          {formatMegapixels(camera.resolutionMp)}
          {photos && <span className="compare-cell-note">{photos}</span>}
        </>
      );
    },
    score: largestPhotoMp,
  },
  {
    label: "Sensor size",
    value: (camera) => [formatSensorSize(camera), camera.sensorModel].filter(Boolean).join(" · "),
    score: (camera) => camera.sensorDenominator ?? camera.sensorDenominatorApprox,
    lowerIsBetter: true,
  },
  {
    label: "Pixel pitch",
    value: (camera) => {
      const binned = formatBinnedPitch(camera);
      return (
        <>
          {formatPixelPitch(camera)}
          {binned && <span className="compare-cell-note">{binned}</span>}
        </>
      );
    },
    score: (camera) => (camera.pixelPitchUm ? round(camera.pixelPitchUm, 2) : null),
  },
  { label: "Stabilisation", value: (camera) => OIS_LABELS[camera.ois] || null },
  { label: "Autofocus", value: formatAutofocus },
  { label: "Video", value: (camera) => <VideoLines modes={camera.videoModes} /> },
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
                <span className="compare-add-plus" aria-hidden="true"><Icon name="plus" /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Compare() {
  const selected = useCompareList();
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
    addPhoneToCompare({
      id: phone.id,
      modelName: phone.modelName,
      brandName: phone.brandName,
      imageUrl: phone.imageUrl,
      imageThumbUrl: phone.imageThumbUrl,
    });
  }

  function handleRemove(phoneId) {
    removePhoneFromCompare(phoneId);
    setDetails((prev) => prev.filter((phone) => phone.id !== phoneId));
  }

  function handleClear() {
    clearComparePhones();
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
            {selected.length} of {MAX_COMPARE_PHONES} selected
            {selected.length > 0 && (
              <> · <button type="button" className="compare-clear" onClick={handleClear}>Clear</button></>
            )}
          </span>
        </header>

        {selected.length < MAX_COMPARE_PHONES && <AddPhoneSearch selectedIds={ids} onAdd={handleAdd} />}

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
                  <Icon name="close" />
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
          <div className="skeleton compare-skeleton" aria-hidden="true" />
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
                        <Icon name="close" />
                      </button>
                      <Link to={`/phone/${phone.id}`} className="compare-phone-link">
                        <span className="compare-phone-image"><PhoneImage phone={phone} /></span>
                        {phone.brandName && <span className="phone-brand">{phone.brandName}</span>}
                        <span className="compare-phone-model">{phone.modelName}</span>
                      </Link>
                      <Link to={`/phone/${phone.id}/reviews`} className="text-link compare-reviews">
                        <Icon name="comment" /> Reviews
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
            <span className="compare-best-swatch" aria-hidden="true" /> Best value in the row. The 35 mm equivalent
            aperture decides which camera gathers more light; the actual f-number alone doesn't.
          </p>
        )}

        {phones.length >= 2 && <CompareGallery phones={phones} slots={slots} slotsByPhone={slotsByPhone} />}
      </div>
    </main>
  );
}

export default Compare;
