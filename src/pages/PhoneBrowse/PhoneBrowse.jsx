import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBrands } from "../../api/brands";
import { getCatalogue, getCatalogueFacets } from "../../api/smartphones";
import { PhoneCard, PhoneGridSkeleton } from "../../components/PhoneCard/PhoneCard";
import { CAMERA_TYPE_LABELS, OIS_LABELS, formatViews } from "../../utils/format";
import "./PhoneBrowse.css";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "brand", label: "Brand" },
  { value: "trending", label: "Most viewed" },
  { value: "new", label: "Newest" },
];

// Longer side of the video frame; the backend's facets use the same thresholds.
const VIDEO_WIDTHS = [
  { value: "854", label: "480p" },
  { value: "1280", label: "720p" },
  { value: "1920", label: "1080p" },
  { value: "3840", label: "4K" },
  { value: "7680", label: "8K" },
];

// URL keys edited in the filter panel (search and sort live outside it).
const FILTER_KEYS = [
  "brand_id", "verified", "release_from", "release_to",
  "camera_type", "facing", "ois", "eq_focal_min", "eq_focal_max", "eq_aperture_max",
  "resolution_min", "sensor_den_max", "optical_zoom", "variable_aperture",
  "video_min_width", "video_min_fps",
];
const LIST_KEYS = ["brand_id", "ois"];

function readDraft(params) {
  const draft = {};

  for (const key of FILTER_KEYS) {
    const value = params.get(key) || "";
    draft[key] = LIST_KEYS.includes(key) ? value.split(",").filter(Boolean) : value;
  }

  return draft;
}

function rangeHint(min, max, format = (value) => value) {
  if (min === null || min === undefined || max === null || max === undefined) return "";
  return min === max ? String(format(min)) : `${format(min)}–${format(max)}`;
}

function chipLabel(key, value, brandNames) {
  switch (key) {
    case "brand_id": return brandNames.get(value) || "Brand";
    case "verified": return value === "true" ? "Verified only" : "Unverified only";
    case "release_from": return `Released from ${value}`;
    case "release_to": return `Released until ${value}`;
    case "camera_type": return CAMERA_TYPE_LABELS[value] || value;
    case "facing": return value === "front" ? "Front camera" : "Back camera";
    case "ois": return `OIS: ${OIS_LABELS[value] || value}`;
    case "eq_focal_min": return `Focal ≥ ${value} mm`;
    case "eq_focal_max": return `Focal ≤ ${value} mm`;
    case "eq_aperture_max": return `Aperture ≤ f/${value}`;
    case "resolution_min": return `≥ ${value} MP`;
    case "sensor_den_max": return `Sensor ≥ 1/${value}″`;
    case "optical_zoom": return "Optical zoom";
    case "variable_aperture": return "Variable aperture";
    case "video_min_width": return `Video ≥ ${VIDEO_WIDTHS.find((w) => w.value === value)?.label || value}`;
    case "video_min_fps": return `Video ≥ ${value} fps`;
    default: return value;
  }
}

function SearchBar({ initialQuery, onSearch }) {
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form className="catalog-search" role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        className="catalog-search-input"
        placeholder="Search by model, brand or model code, e.g. Pixel 9 or SM-S928B"
        aria-label="Search phones"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit" className="catalog-search-button" aria-label="Search">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.75" />
          <path d="M13 13l4.25 4.25" />
        </svg>
      </button>
    </form>
  );
}

function FilterPanel({ initial, brands, facets, onApply, onReset }) {
  const [draft, setDraft] = useState(initial);
  const [brandQuery, setBrandQuery] = useState("");

  function set(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(key, value) {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onApply(draft);
  }

  // Ranges actually present in the catalogue for the chosen kind of camera.
  const facet = draft.facing === "front"
    ? facets?.front
    : draft.camera_type ? facets?.types?.[draft.camera_type] : null;
  const maxFps = facet && draft.video_min_width
    ? facet.videoMaxFpsByWidth?.[draft.video_min_width]
    : null;

  const visibleBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(brandQuery.trim().toLowerCase())
  );

  return (
    <form className="filter-panel" onSubmit={handleSubmit}>
      <fieldset className="filter-group">
        <legend className="filter-title">Brand</legend>
        {brands.length > 8 && (
          <input
            type="search"
            className="ui-input filter-brand-search"
            placeholder="Find brand"
            aria-label="Find brand"
            value={brandQuery}
            onChange={(event) => setBrandQuery(event.target.value)}
          />
        )}
        <div className="filter-brand-list">
          {visibleBrands.map((brand) => (
            <label key={brand.id} className="ui-check">
              <input
                type="checkbox"
                checked={draft.brand_id.includes(brand.id)}
                onChange={() => toggle("brand_id", brand.id)}
              />
              {brand.name}
            </label>
          ))}
          {visibleBrands.length === 0 && <span className="filter-hint">No brands found.</span>}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-title">Phone</legend>

        <label className="ui-field">
          <span className="ui-label">Data status</span>
          <select className="ui-select" value={draft.verified} onChange={(event) => set("verified", event.target.value)}>
            <option value="">All phones</option>
            <option value="true">Verified by moderators</option>
            <option value="false">Not verified yet</option>
          </select>
        </label>

        <div className="ui-field-row">
          <label className="ui-field">
            <span className="ui-label">Released from</span>
            <input
              type="number"
              className="ui-input"
              placeholder="YYYY"
              min="2000"
              max="2100"
              value={draft.release_from}
              onChange={(event) => set("release_from", event.target.value)}
            />
          </label>
          <label className="ui-field">
            <span className="ui-label">Until</span>
            <input
              type="number"
              className="ui-input"
              placeholder="YYYY"
              min="2000"
              max="2100"
              value={draft.release_to}
              onChange={(event) => set("release_to", event.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-title">Camera</legend>
        <p className="filter-hint">All camera conditions must be met by the same camera.</p>

        <div className="ui-field-row">
          <label className="ui-field">
            <span className="ui-label">Side</span>
            <select className="ui-select" value={draft.facing} onChange={(event) => set("facing", event.target.value)}>
              <option value="">Any</option>
              <option value="back">Back</option>
              <option value="front">Front</option>
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-label">Type</span>
            <select className="ui-select" value={draft.camera_type} onChange={(event) => set("camera_type", event.target.value)}>
              <option value="">Any</option>
              {Object.entries(CAMERA_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="ui-field-row">
          <label className="ui-field">
            <span className="ui-label">Focal from (mm)</span>
            <input
              type="number"
              step="any"
              min="0"
              className="ui-input"
              placeholder={rangeHint(facet?.eqFocalMin, facet?.eqFocalMax, Math.round) || "e.g. 24"}
              value={draft.eq_focal_min}
              onChange={(event) => set("eq_focal_min", event.target.value)}
            />
          </label>
          <label className="ui-field">
            <span className="ui-label">Focal to (mm)</span>
            <input
              type="number"
              step="any"
              min="0"
              className="ui-input"
              placeholder={rangeHint(facet?.eqFocalMin, facet?.eqFocalMax, Math.round) || "e.g. 120"}
              value={draft.eq_focal_max}
              onChange={(event) => set("eq_focal_max", event.target.value)}
            />
          </label>
        </div>
        <p className="filter-hint">Focal lengths are full-frame equivalents.</p>

        <div className="ui-field-row">
          <label className="ui-field">
            <span className="ui-label">Aperture up to f/</span>
            <input
              type="number"
              step="any"
              min="0"
              className="ui-input"
              placeholder={rangeHint(facet?.eqApertureMin, facet?.eqApertureMax) || "e.g. 8"}
              value={draft.eq_aperture_max}
              onChange={(event) => set("eq_aperture_max", event.target.value)}
            />
          </label>
          <label className="ui-field">
            <span className="ui-label">Min. resolution (MP)</span>
            <input
              type="number"
              step="any"
              min="0"
              className="ui-input"
              placeholder={rangeHint(facet?.resolutionMpMin, facet?.resolutionMpMax, Math.round) || "e.g. 50"}
              value={draft.resolution_min}
              onChange={(event) => set("resolution_min", event.target.value)}
            />
          </label>
        </div>

        <label className="ui-field">
          <span className="ui-label">Sensor at least 1/x″</span>
          <input
            type="number"
            step="any"
            min="0"
            className="ui-input"
            placeholder={rangeHint(facet?.sensorDenominatorMin, facet?.sensorDenominatorMax) || "e.g. 1.3 for 1/1.3″"}
            value={draft.sensor_den_max}
            onChange={(event) => set("sensor_den_max", event.target.value)}
          />
        </label>

        <div className="filter-checks">
          <span className="ui-label">Stabilisation</span>
          {Object.entries(OIS_LABELS).map(([value, label]) => (
            <label key={value} className="ui-check">
              <input
                type="checkbox"
                checked={draft.ois.includes(value)}
                onChange={() => toggle("ois", value)}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="filter-checks">
          <label className="ui-check">
            <input
              type="checkbox"
              checked={draft.optical_zoom === "true"}
              onChange={(event) => set("optical_zoom", event.target.checked ? "true" : "")}
            />
            Optical zoom lens
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={draft.variable_aperture === "true"}
              onChange={(event) => set("variable_aperture", event.target.checked ? "true" : "")}
            />
            Variable aperture
          </label>
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-title">Video</legend>
        <div className="ui-field-row">
          <label className="ui-field">
            <span className="ui-label">Resolution</span>
            <select className="ui-select" value={draft.video_min_width} onChange={(event) => set("video_min_width", event.target.value)}>
              <option value="">Any</option>
              {VIDEO_WIDTHS.map((width) => (
                <option key={width.value} value={width.value}>{width.label} or more</option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-label">Min. fps</span>
            <input
              type="number"
              min="1"
              className="ui-input"
              placeholder={maxFps ? `up to ${maxFps}` : "e.g. 60"}
              value={draft.video_min_fps}
              onChange={(event) => set("video_min_fps", event.target.value)}
            />
          </label>
        </div>
        <p className="filter-hint">Resolution and frame rate must be met by one video mode.</p>
      </fieldset>

      <div className="filter-actions">
        <button type="submit" className="ui-btn ui-btn-primary">Apply filters</button>
        <button type="button" className="ui-btn" onClick={onReset}>Reset</button>
      </div>
    </form>
  );
}

function PhoneBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [brands, setBrands] = useState([]);
  const [facets, setFacets] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      const [brandsRes, facetsRes] = await Promise.allSettled([getBrands(), getCatalogueFacets()]);

      if (ignore) return;
      if (brandsRes.status === "fulfilled") setBrands(brandsRes.value);
      if (facetsRes.status === "fulfilled") setFacets(facetsRes.value);
    }

    loadOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadPhones() {
      setLoading(true);
      setError("");

      try {
        const data = await getCatalogue(new URLSearchParams(paramsKey), PAGE_SIZE);

        if (!ignore) {
          setResult(data);
        }
      } catch (err) {
        console.error(err);

        if (!ignore) {
          // 400 INVALID_FILTER explains which value is wrong
          setError(err.status === 400 ? err.message : "Could not load phones.");
          setResult(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPhones();

    return () => {
      ignore = true;
    };
  }, [paramsKey]);

  function updateParams(changes, { keepPage = false } = {}) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(changes)) {
      const normalized = Array.isArray(value) ? value.join(",") : value;

      if (normalized === "" || normalized === null || normalized === undefined) {
        next.delete(key);
      } else {
        next.set(key, normalized);
      }
    }

    if (!keepPage) {
      next.delete("page");
    }

    setSearchParams(next);
  }

  function handleApplyFilters(draft) {
    updateParams(draft);
    setFiltersOpen(false);
  }

  function handleResetFilters() {
    updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, ""])));
  }

  function removeChip(key, value) {
    if (LIST_KEYS.includes(key)) {
      const remaining = (searchParams.get(key) || "").split(",").filter((item) => item && item !== value);
      updateParams({ [key]: remaining });
    } else {
      updateParams({ [key]: "" });
    }
  }

  function goToPage(page) {
    updateParams({ page: page > 1 ? String(page) : "" }, { keepPage: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const query = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "name";
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));

  const chips = FILTER_KEYS.flatMap((key) => {
    const value = searchParams.get(key);
    if (!value) return [];
    const values = LIST_KEYS.includes(key) ? value.split(",").filter(Boolean) : [value];
    return values.map((item) => ({ key, value: item, label: chipLabel(key, item, brandNames) }));
  });

  const total = result?.total ?? 0;
  const page = result?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / (result?.limit || PAGE_SIZE)));
  const phones = result?.data ?? [];

  return (
    <main className="page">
      <div className="page-inner">
        <header className="page-header">
          <h1 className="page-title">Catalogue</h1>
          {result && (
            <span className="page-subtitle">
              {total.toLocaleString("en-US")} {total === 1 ? "phone" : "phones"}
              {query && <> matching “{query}”</>}
            </span>
          )}
        </header>

        <SearchBar
          key={query}
          initialQuery={query}
          onSearch={(value) => updateParams({ q: value })}
        />

        <div className="catalog-layout">
          <aside className={`catalog-filters ${filtersOpen ? "is-open" : ""}`} aria-label="Filters">
            <FilterPanel
              key={FILTER_KEYS.map((key) => searchParams.get(key) || "").join("|")}
              initial={readDraft(searchParams)}
              brands={brands}
              facets={facets}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
          </aside>

          <section className="catalog-results" aria-busy={loading}>
            <div className="catalog-toolbar">
              <button
                type="button"
                className="ui-btn ui-btn-small catalog-filters-toggle"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {filtersOpen ? "Hide filters" : `Filters${chips.length ? ` (${chips.length})` : ""}`}
              </button>

              <label className="catalog-sort">
                <span className="ui-label">Sort by</span>
                <select
                  className="ui-select"
                  value={sort}
                  onChange={(event) => updateParams({ sort: event.target.value === "name" ? "" : event.target.value })}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <ul className="catalog-chips" aria-label="Active filters">
                {chips.map((chip) => (
                  <li key={`${chip.key}-${chip.value}`}>
                    <button
                      type="button"
                      className="catalog-chip"
                      onClick={() => removeChip(chip.key, chip.value)}
                      aria-label={`Remove filter: ${chip.label}`}
                    >
                      {chip.label}
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" className="catalog-chip-clear" onClick={handleResetFilters}>
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            {loading && <PhoneGridSkeleton count={6} className="phone-grid phone-grid-3" />}

            {!loading && error && <p className="page-status page-status-error">{error}</p>}

            {!loading && !error && phones.length === 0 && (
              <p className="page-status">No phones match these criteria.</p>
            )}

            {!loading && phones.length > 0 && (
              <ul className="phone-grid phone-grid-3">
                {phones.map((phone) => (
                  <li key={phone.id}>
                    <PhoneCard
                      phone={phone}
                      meta={[
                        formatViews(phone.viewCount),
                        phone.releaseDate?.slice(0, 4),
                      ].filter(Boolean).join(" · ")}
                    />
                  </li>
                ))}
              </ul>
            )}

            {!loading && totalPages > 1 && (
              <nav className="catalog-pagination" aria-label="Pages">
                <button
                  type="button"
                  className="ui-btn ui-btn-small"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  ← Previous
                </button>
                <span className="catalog-page-info">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="ui-btn ui-btn-small"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next →
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default PhoneBrowse;
