import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { browseSmartphones, getBrands, getSmartphoneById } from "../../api/smartphones";
import {
  addPhoneToCompare,
  getComparePhones,
  removePhoneFromCompare,
} from "../../api/compare";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatReleaseDate, formatViews } from "../../utils/phoneFormat";
import PhoneImage from "../../components/PhoneImage/PhoneImage";
import "./PhoneBrowse.css";

const PAGE_SIZE = 20;
const MAX_COMPARE = 4;
const FIRST_YEAR = 2010;

// URL keys mirror the backend's GET /api/smartphones query params.
const FILTER_KEYS = [
  "q",
  "brand_id",
  "release_from",
  "release_to",
  "verified",
  "camera_type",
  "facing",
  "ois",
  "resolution_min",
  "eq_focal_min",
  "eq_focal_max",
  "eq_aperture_max",
  "variable_aperture",
  "optical_zoom",
];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "trending", label: "Trending" },
  { value: "new", label: "Newest" },
];

const LENS_TYPES = [
  { value: "wide", label: "Wide" },
  { value: "ultrawide", label: "Ultrawide" },
  { value: "tele", label: "Telephoto" },
  { value: "macro", label: "Macro" },
  { value: "other", label: "Other" },
];

const FACINGS = [
  { value: "back", label: "Rear" },
  { value: "front", label: "Front" },
  { value: "other", label: "Other" },
];

const OIS_OPTIONS = [
  { value: "optical", label: "Optical (lens)" },
  { value: "sensor_shift", label: "Sensor-shift" },
  { value: "none", label: "None" },
];

// No "verified" param in the URL means verified phones only; these opt in to the rest.
const VERIFICATION_OPTIONS = [
  { value: "all", label: "All phones" },
  { value: "false", label: "Unverified only" },
];

const YEARS = Array.from(
  { length: new Date().getFullYear() - FIRST_YEAR + 1 },
  (_, index) => String(new Date().getFullYear() - index)
);

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function readFilters(searchParams) {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || ""]));
}

function toApiParams(searchParams) {
  const filters = readFilters(searchParams);

  return {
    ...filters,
    // The backend compares release dates as strings, so "2023" would exclude
    // "2023-10-04"; send the last day of the year instead.
    release_to: filters.release_to ? `${filters.release_to}-12-31` : "",
    // Unverified phones are hidden unless the Verified filter asks for them.
    verified: filters.verified === "all" ? "" : filters.verified || "true",
    sort: searchParams.get("sort") || "name",
    page: searchParams.get("page") || 1,
    limit: PAGE_SIZE,
  };
}

function activeChips(filters, brands) {
  const chips = [];
  const add = (key, label) => filters[key] && chips.push({ key, label });

  add("q", `“${filters.q}”`);
  add("brand_id", brands.find((brand) => brand.id === filters.brand_id)?.name || "Brand");
  add("release_from", `From ${filters.release_from}`);
  add("release_to", `Until ${filters.release_to}`);
  add("verified", filters.verified === "false" ? "Unverified only" : "Including unverified");
  add("camera_type", `${optionLabel(LENS_TYPES, filters.camera_type)} lens`);
  add("facing", `${optionLabel(FACINGS, filters.facing)} camera`);
  add("ois", `Stabilization: ${optionLabel(OIS_OPTIONS, filters.ois)}`);
  add("resolution_min", `≥ ${filters.resolution_min} MP`);
  add("eq_focal_min", `Focal ≥ ${filters.eq_focal_min} mm`);
  add("eq_focal_max", `Focal ≤ ${filters.eq_focal_max} mm`);
  add("eq_aperture_max", `Aperture ≤ f/${filters.eq_aperture_max} eq.`);
  add("variable_aperture", "Variable aperture");
  add("optical_zoom", "Optical zoom");

  return chips;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function cameraSummary(cameras) {
  if (!cameras?.length) return null;

  const rear = cameras.filter((cam) => cam.facing === "back");
  const front = cameras.filter((cam) => cam.facing === "front");
  const main = rear.find((cam) => cam.type === "wide") || rear[0] || cameras[0];
  const types = LENS_TYPES.filter((type) => type.value !== "other" && rear.some((cam) => cam.type === type.value));

  return {
    rearCount: rear.length,
    frontCount: front.length,
    main,
    mainEquivalent: main.focalLengthMm && main.cropFactor ? Math.round(main.focalLengthMm * main.cropFactor) : null,
    types,
    hasOis: cameras.some((cam) => cam.ois && cam.ois !== "none"),
    hasZoom: cameras.some((cam) => cam.opticalZoom),
  };
}

// Keeps a local draft while typing and commits to the URL after a pause or on Enter.
function DebouncedInput({ name, value, onCommit, delay = 400, ...rest }) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  // Pick up external changes (chip removed, reset, back button).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return undefined;

    const timer = setTimeout(() => onCommit(name, draft.trim()), delay);
    return () => clearTimeout(timer);
  }, [draft, value, name, onCommit, delay]);

  return (
    <input
      {...rest}
      name={name}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(name, draft.trim());
        }
      }}
    />
  );
}

function SelectFilter({ label, name, value, options, onChange, placeholder = "Any" }) {
  return (
    <label className="catalogue-field">
      <span className="catalogue-label">{label}</span>
      <select
        className="catalogue-input"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberFilter({ label, name, value, onCommit, ...rest }) {
  return (
    <label className="catalogue-field">
      <span className="catalogue-label">{label}</span>
      <DebouncedInput
        type="number"
        inputMode="decimal"
        className="catalogue-input"
        name={name}
        value={value}
        onCommit={onCommit}
        {...rest}
      />
    </label>
  );
}

function CheckFilter({ label, name, value, onChange }) {
  return (
    <label className="catalogue-check">
      <input
        type="checkbox"
        checked={value === "true"}
        onChange={(event) => onChange(name, event.target.checked ? "true" : "")}
      />
      {label}
    </label>
  );
}

function CameraSummary({ summary, loading }) {
  if (loading) {
    return (
      <div className="catalogue-camera" aria-hidden="true">
        <span className="catalogue-skeleton" />
        <span className="catalogue-skeleton catalogue-skeleton-short" />
      </div>
    );
  }

  if (!summary) {
    return <div className="catalogue-camera catalogue-camera-empty">No camera data</div>;
  }

  const { main } = summary;

  return (
    <div className="catalogue-camera">
      <div className="catalogue-camera-main">
        {main.resolutionMp ? `${round(main.resolutionMp)} MP` : "—"}
        {main.aperture ? ` · f/${round(main.aperture, 2)}` : ""}
        {summary.mainEquivalent ? ` · ${summary.mainEquivalent} mm` : ""}
      </div>
      <div className="catalogue-camera-meta">
        {summary.rearCount} rear{summary.frontCount ? ` · ${summary.frontCount} front` : ""}
      </div>
      <div className="catalogue-tags">
        {summary.types.map((type) => (
          <span key={type.value} className="catalogue-tag">{type.label}</span>
        ))}
        {summary.hasOis && <span className="catalogue-tag catalogue-tag-accent">OIS</span>}
        {summary.hasZoom && <span className="catalogue-tag catalogue-tag-accent">Zoom</span>}
      </div>
    </div>
  );
}

function PhoneListRow({ phone, details, detailsLoading, inCompare, onToggleCompare }) {
  const summary = cameraSummary(details?.cameras);

  return (
    <li className="catalogue-row">
      <span className="catalogue-thumb">
        <PhoneImage phone={phone} />
      </span>

      <div className="catalogue-info">
        {phone.brandName && <span className="catalogue-brand">{phone.brandName}</span>}
        <Link to={`/phone/${phone.id}`} className="catalogue-model">
          {phone.modelName}
        </Link>
        <span className="catalogue-meta">
          {phone.releaseDate ? formatReleaseDate(phone.releaseDate) : "Release date unknown"}
          {" · "}
          {formatViews(phone.viewCount || 0)}
          {!phone.verified && <span className="catalogue-unverified">Unverified</span>}
        </span>
      </div>

      <CameraSummary summary={summary} loading={!details && detailsLoading} />

      <button
        type="button"
        className={`catalogue-compare-btn ${inCompare ? "is-active" : ""}`}
        aria-pressed={inCompare}
        onClick={() => onToggleCompare(phone)}
      >
        {inCompare ? "✓ Comparing" : "+ Compare"}
      </button>
    </li>
  );
}

function RowsSkeleton() {
  return (
    <ul className="catalogue-list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="catalogue-row">
          <span className="catalogue-thumb" />
          <div className="catalogue-info">
            <span className="catalogue-skeleton catalogue-skeleton-short" />
            <span className="catalogue-skeleton" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PhoneBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareIds, setCompareIds] = useState(() => getComparePhones().map((phone) => phone.id));
  const [compareNotice, setCompareNotice] = useState("");

  const filters = readFilters(searchParams);
  const sort = searchParams.get("sort") || "name";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Any filter change goes back to page 1; page changes keep the filters.
  const setParam = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      });
    },
    [setSearchParams]
  );

  function goToPage(nextPage) {
    setParam("page", nextPage > 1 ? String(nextPage) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setSearchParams(sort !== "name" ? { sort } : {});
  }

  const paramsKey = searchParams.toString();
  const listLoader = useCallback(
    () => browseSmartphones(toApiParams(new URLSearchParams(paramsKey))),
    [paramsKey]
  );
  const list = useAsyncData(listLoader);

  // Second pass: camera details for the visible phones (GET /:id doesn't count as a view).
  const ids = (list.data?.data || []).map((phone) => phone.id).join(",");
  const detailsLoader = useCallback(async () => {
    if (!ids) return {};
    const idList = ids.split(",");
    const results = await Promise.all(idList.map((id) => getSmartphoneById(id).catch(() => null)));
    return Object.fromEntries(idList.map((id, index) => [id, results[index]]));
  }, [ids]);
  const details = useAsyncData(detailsLoader);

  const brandsState = useAsyncData(getBrands);
  const brands = Array.isArray(brandsState.data) ? brandsState.data : [];

  function handleToggleCompare(phone) {
    if (compareIds.includes(phone.id)) {
      setCompareIds(removePhoneFromCompare(phone.id).map((item) => item.id));
      setCompareNotice("");
      return;
    }

    const result = addPhoneToCompare(phone);
    setCompareIds(result.phones.map((item) => item.id));
    setCompareNotice(
      result.success || result.reason !== "limit"
        ? ""
        : `You can compare up to ${MAX_COMPARE} phones. Remove one first.`
    );
  }

  const phones = list.data?.data || [];
  const total = list.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chips = activeChips(filters, brands);
  const showSkeleton = list.loading && !list.data;

  return (
    <main className="catalogue">
      <header className="catalogue-header">
        <h1 className="catalogue-title">Phone catalogue</h1>
        <Link to="/compare" className="catalogue-compare-link">
          Compare ({compareIds.length}/{MAX_COMPARE}) →
        </Link>
      </header>

      <div className="catalogue-layout">
        <button
          type="button"
          className="catalogue-filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="catalogue-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filters{chips.length ? ` (${chips.length})` : ""}
          <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
        </button>

        <aside
          id="catalogue-filters"
          className={`catalogue-filters ${filtersOpen ? "is-open" : ""}`}
          aria-label="Filters"
        >
          <div className="catalogue-filters-group">
            <label className="catalogue-field">
              <span className="catalogue-label">Search</span>
              <DebouncedInput
                type="search"
                className="catalogue-input"
                placeholder="Model or brand"
                name="q"
                value={filters.q}
                onCommit={setParam}
              />
            </label>

            <SelectFilter
              label="Brand"
              name="brand_id"
              value={filters.brand_id}
              options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
              onChange={setParam}
              placeholder="All brands"
            />

            <div className="catalogue-field-pair">
              <SelectFilter
                label="Released from"
                name="release_from"
                value={filters.release_from}
                options={YEARS.map((year) => ({ value: year, label: year }))}
                onChange={setParam}
              />
              <SelectFilter
                label="Until"
                name="release_to"
                value={filters.release_to}
                options={YEARS.map((year) => ({ value: year, label: year }))}
                onChange={setParam}
              />
            </div>

            <SelectFilter
              label="Verified"
              name="verified"
              value={filters.verified}
              options={VERIFICATION_OPTIONS}
              onChange={setParam}
              placeholder="Verified only"
            />
          </div>

          <div className="catalogue-filters-group">
            <h2 className="catalogue-filters-heading">Camera</h2>
            <p className="catalogue-hint">A single lens has to match all camera filters.</p>

            <SelectFilter label="Lens type" name="camera_type" value={filters.camera_type} options={LENS_TYPES} onChange={setParam} />
            <SelectFilter label="Facing" name="facing" value={filters.facing} options={FACINGS} onChange={setParam} />
            <SelectFilter label="Stabilization" name="ois" value={filters.ois} options={OIS_OPTIONS} onChange={setParam} />

            <NumberFilter
              label="Min. resolution (MP)"
              name="resolution_min"
              value={filters.resolution_min}
              onCommit={setParam}
              min="0"
              step="any"
              placeholder="e.g. 48"
            />

            <div className="catalogue-field-pair">
              <NumberFilter
                label="Focal min (mm eq.)"
                name="eq_focal_min"
                value={filters.eq_focal_min}
                onCommit={setParam}
                min="0"
                step="any"
                placeholder="13"
              />
              <NumberFilter
                label="Focal max (mm eq.)"
                name="eq_focal_max"
                value={filters.eq_focal_max}
                onCommit={setParam}
                min="0"
                step="any"
                placeholder="120"
              />
            </div>

            <NumberFilter
              label="Max. aperture (f/ eq.)"
              name="eq_aperture_max"
              value={filters.eq_aperture_max}
              onCommit={setParam}
              min="0"
              step="any"
              placeholder="e.g. 8"
            />

            <CheckFilter label="Variable aperture" name="variable_aperture" value={filters.variable_aperture} onChange={setParam} />
            <CheckFilter label="Optical zoom" name="optical_zoom" value={filters.optical_zoom} onChange={setParam} />
          </div>

          <button type="button" className="catalogue-reset" onClick={resetFilters} disabled={!chips.length}>
            Reset all filters
          </button>
        </aside>

        <section className="catalogue-results" aria-busy={list.loading}>
          <div className="catalogue-toolbar">
            <span className="catalogue-count">
              {showSkeleton ? "Loading…" : `${total} ${total === 1 ? "phone" : "phones"}`}
            </span>
            <label className="catalogue-sort">
              <span>Sort by</span>
              <select
                className="catalogue-input"
                value={sort}
                onChange={(event) => setParam("sort", event.target.value === "name" ? "" : event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <ul className="catalogue-chips" aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    className="catalogue-chip"
                    onClick={() => setParam(chip.key, "")}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {compareNotice && (
            <p className="catalogue-notice" role="status">
              {compareNotice} <Link to="/compare">Open comparison</Link>
            </p>
          )}

          {list.error && (
            <div className="catalogue-error" role="alert">
              Could not load phones: {list.error.message}
              <button type="button" className="catalogue-text-btn" onClick={list.reload}>
                Retry
              </button>
            </div>
          )}

          {showSkeleton && <RowsSkeleton />}

          {!showSkeleton && !list.error && phones.length === 0 && (
            <div className="catalogue-empty">
              <p>No phones match these filters.</p>
              {chips.length > 0 && (
                <button type="button" className="catalogue-text-btn" onClick={resetFilters}>
                  Reset filters
                </button>
              )}
            </div>
          )}

          {phones.length > 0 && (
            <ul className={`catalogue-list ${list.loading ? "is-loading" : ""}`}>
              {phones.map((phone) => (
                <PhoneListRow
                  key={phone.id}
                  phone={phone}
                  details={details.data?.[phone.id]}
                  detailsLoading={details.loading}
                  inCompare={compareIds.includes(phone.id)}
                  onToggleCompare={handleToggleCompare}
                />
              ))}
            </ul>
          )}

          {pageCount > 1 && (
            <nav className="catalogue-pagination" aria-label="Pages">
              <button
                type="button"
                className="catalogue-page-btn"
                disabled={page <= 1 || list.loading}
                onClick={() => goToPage(page - 1)}
              >
                ← Prev
              </button>
              <span>Page {page} of {pageCount}</span>
              <button
                type="button"
                className="catalogue-page-btn"
                disabled={page >= pageCount || list.loading}
                onClick={() => goToPage(page + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}

export default PhoneBrowse;
