import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBrands } from "../../api/brands";
import { getCatalogueFacets, peekCatalogueSearch, searchCatalogue } from "../../api/smartphones";
import Icon from "../../components/Icon/Icon";
import { PhoneCard, PhoneGridSkeleton } from "../../components/PhoneCard/PhoneCard";
import {
  EMPTY_FILTER,
  LENS_LABELS,
  OPTIONAL_LENSES,
  SORT_OPTIONS,
  STABILISATION_OPTIONS,
  anyLensVideoValues,
  apertureLabel,
  decodeFilter,
  encodeFilter,
  everyLensVideoValues,
  filterChips,
  focalLabel,
  lensValues,
  resolutionLabel,
  searchBody,
  sensorLabel,
  videoWidthLabel,
  withMax,
  withMin,
  withSensorFrom,
  withSensorTo,
  withVideoWidth,
} from "../../utils/catalogueFilter";
import { formatViews } from "../../utils/format";
import "./PhoneBrowse.css";

const PAGE_SIZE = 24;
const COUNT_DELAY_MS = 300;
const FIRST_RELEASE_YEAR = 2010;

const RELEASE_YEARS = Array.from(
  { length: new Date().getFullYear() - FIRST_RELEASE_YEAR + 2 },
  (_, index) => String(new Date().getFullYear() + 1 - index),
);

function toNumber(text) {
  return text === "" ? null : Number(text);
}

function Select({ label, value, options, format = String, anyLabel, onChange }) {
  return (
    <select
      className="ui-select"
      aria-label={label}
      value={value ?? ""}
      onChange={(event) => onChange(toNumber(event.target.value))}
    >
      <option value="">{anyLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>{format(option)}</option>
      ))}
    </select>
  );
}

function Row({ label, children }) {
  return (
    <div className="fp-row">
      <span className="fp-row-label">{label}</span>
      <div className="fp-row-controls">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="fp-toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function Capsule({ selected, onClick, children }) {
  return (
    <button type="button" className={`fp-capsule ${selected ? "is-selected" : ""}`} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}

function VideoRow({ value = {}, values, onChange }) {
  return (
    <Row label="Video">
      <Select
        label="Video resolution"
        anyLabel="Any"
        value={value.width}
        options={values.widths}
        format={videoWidthLabel}
        onChange={(width) => onChange(withVideoWidth(value, width, values))}
      />
      <Select
        label="Video frame rate"
        anyLabel="Any fps"
        value={value.fps}
        options={values.frameRates(value.width)}
        format={(fps) => `${fps} fps`}
        onChange={(fps) => onChange({ ...value, fps })}
      />
    </Row>
  );
}

function FocalRow({ value, values, onChange }) {
  return (
    <Row label="Focal">
      <Select label="Shortest focal length" anyLabel="From" value={value.focalMin} options={values.focals} format={focalLabel}
        onChange={(next) => onChange(withMin(value, "focalMin", "focalMax", next))} />
      <Select label="Longest focal length" anyLabel="To" value={value.focalMax} options={values.focals} format={focalLabel}
        onChange={(next) => onChange(withMax(value, "focalMin", "focalMax", next))} />
    </Row>
  );
}

function ApertureRow({ value, values, onChange }) {
  return (
    <Row label="Aperture">
      <Select label="Brightest aperture" anyLabel="From" value={value.apertureMin} options={values.apertures} format={apertureLabel}
        onChange={(next) => onChange(withMin(value, "apertureMin", "apertureMax", next))} />
      <Select label="Darkest aperture" anyLabel="To" value={value.apertureMax} options={values.apertures} format={apertureLabel}
        onChange={(next) => onChange(withMax(value, "apertureMin", "apertureMax", next))} />
    </Row>
  );
}

function ResolutionRow({ value, values, onChange }) {
  return (
    <Row label="Resolution">
      <Select label="Minimum resolution" anyLabel="Any" value={value.resolutionMin} options={values.resolutions}
        format={(megapixels) => `≥ ${resolutionLabel(megapixels)}`}
        onChange={(resolutionMin) => onChange({ ...value, resolutionMin })} />
    </Row>
  );
}

function LensOptions({ lens, value, values, onChange }) {
  function toggleStabilisation(option) {
    const current = value.ois || [];
    onChange({
      ...value,
      ois: current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    });
  }

  return (
    <>
      <FocalRow value={value} values={values} onChange={onChange} />
      <ApertureRow value={value} values={values} onChange={onChange} />

      <Row label="Sensor">
        <Select label="Smallest sensor" anyLabel="From" value={value.sensorFrom} options={values.sensors} format={sensorLabel}
          onChange={(next) => onChange(withSensorFrom(value, next))} />
        <Select label="Largest sensor" anyLabel="To" value={value.sensorTo} options={values.sensors} format={sensorLabel}
          onChange={(next) => onChange(withSensorTo(value, next))} />
      </Row>

      <ResolutionRow value={value} values={values} onChange={onChange} />

      <Row label="Stabilis.">
        <div className="fp-capsules">
          {STABILISATION_OPTIONS.map((option) => (
            <Capsule key={option.value} selected={(value.ois || []).includes(option.value)} onClick={() => toggleStabilisation(option.value)}>
              {option.label}
            </Capsule>
          ))}
        </div>
      </Row>

      <VideoRow value={value.video} values={values.video} onChange={(video) => onChange({ ...value, video })} />

      {lens === "wide" && (
        <Toggle label="Variable aperture" checked={Boolean(value.variable)} onChange={(variable) => onChange({ ...value, variable })} />
      )}
      {lens === "tele" && (
        <Toggle label="Optical zoom" checked={Boolean(value.zoom)} onChange={(zoom) => onChange({ ...value, zoom })} />
      )}
    </>
  );
}

function Collapsible({ title, active, children }) {
  return (
    <details className="fp-section fp-details" open={active || undefined}>
      <summary>
        {title}
        <Icon name="chevronDown" />
      </summary>
      <div className="fp-section-body">{children}</div>
    </details>
  );
}

// Edits a draft of the filter; nothing changes until "Show N phones". Sort applies at once.
function FilterPanel({ initial, query, sort, brands, onSort, onApply }) {
  const [draft, setDraft] = useState(initial);
  const [selectedLens, setSelectedLens] = useState("wide");
  const [facets, setFacets] = useState({});
  const [count, setCount] = useState(null);

  const verifiedOnly = !draft.allPhones;
  const currentFacets = facets[verifiedOnly];
  const body = useMemo(() => searchBody(draft, { q: query, page: 1, limit: 1 }), [draft, query]);
  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    let ignore = false;

    getCatalogueFacets(verifiedOnly).then(
      (data) => {
        if (!ignore) setFacets((prev) => ({ ...prev, [verifiedOnly]: data }));
      },
      (err) => console.error(err),
    );

    return () => {
      ignore = true;
    };
  }, [verifiedOnly]);

  // The live number on the button, once the draft stops changing.
  useEffect(() => {
    let ignore = false;

    const timer = setTimeout(() => {
      searchCatalogue(JSON.parse(bodyKey)).then(
        (result) => {
          if (!ignore) setCount(result.total);
        },
        () => {
          if (!ignore) setCount(null);
        },
      );
    }, COUNT_DELAY_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [bodyKey]);

  function patch(changes) {
    setDraft((prev) => ({ ...prev, ...changes }));
  }

  function toggleList(key, value) {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }));
  }

  function toggleLens(lens) {
    if (draft.lenses.includes(lens)) {
      const rest = { ...draft.lens };
      delete rest[lens];
      patch({ lenses: draft.lenses.filter((item) => item !== lens), lens: rest });
      if (selectedLens === lens) setSelectedLens("wide");
    } else {
      patch({ lenses: [...draft.lenses, lens] });
      setSelectedLens(lens);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    onApply(draft);
  }

  const lensTabs = ["wide", ...OPTIONAL_LENSES.filter((lens) => draft.lenses.includes(lens))];
  const lens = lensTabs.includes(selectedLens) ? selectedLens : "wide";
  const lensConstraint = draft.lens[lens] || {};
  const hasFilters = encodeFilter(draft) !== "";

  return (
    <form className="filter-panel" onSubmit={handleSubmit}>
      <div className="fp-header">
        <h2 className="fp-title">Filters</h2>
        <button type="button" className="fp-clear" disabled={!hasFilters} onClick={() => setDraft(EMPTY_FILTER)}>
          Clear all
        </button>
      </div>

      <div className="fp-section">
        <Row label="Sort by">
          <select className="ui-select" aria-label="Sort by" value={sort} onChange={(event) => onSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Row>
        <Toggle label="Verified only" checked={verifiedOnly} onChange={(checked) => patch({ allPhones: !checked })} />
      </div>

      {brands.length > 0 && (
        <div className="fp-section">
          <h3 className="fp-section-title">Brands</h3>
          <div className="fp-capsules">
            {brands.map((brand) => (
              <Capsule key={brand.id} selected={draft.brands.includes(brand.id)} onClick={() => toggleList("brands", brand.id)}>
                {brand.name}
              </Capsule>
            ))}
          </div>
        </div>
      )}

      <div className="fp-section">
        <h3 className="fp-section-title">Lenses</h3>
        <div className="fp-capsules">
          {OPTIONAL_LENSES.map((item) => (
            <Capsule key={item} selected={draft.lenses.includes(item)} onClick={() => toggleLens(item)}>
              {LENS_LABELS[item]}
            </Capsule>
          ))}
        </div>
      </div>

      <div className="fp-section">
        <h3 className="fp-section-title">Lens options</h3>
        {lensTabs.length > 1 && (
          <div className="fp-segments">
            {lensTabs.map((item) => (
              <button
                key={item}
                type="button"
                className={item === lens ? "is-active" : ""}
                aria-pressed={item === lens}
                onClick={() => setSelectedLens(item)}
              >
                {LENS_LABELS[item]}
              </button>
            ))}
          </div>
        )}
        <LensOptions
          key={lens}
          lens={lens}
          value={lensConstraint}
          values={lensValues(lens, currentFacets, lensConstraint)}
          onChange={(value) => patch({ lens: { ...draft.lens, [lens]: value } })}
        />
      </div>

      <Collapsible title="Any rear lens" active={draft.anyZoom || draft.anyVariable || draft.anyVideo.width != null || draft.anyVideo.fps != null}>
        <Toggle label="Optical zoom" checked={draft.anyZoom} onChange={(anyZoom) => patch({ anyZoom })} />
        <Toggle label="Variable aperture" checked={draft.anyVariable} onChange={(anyVariable) => patch({ anyVariable })} />
        <VideoRow value={draft.anyVideo} values={anyLensVideoValues(currentFacets)} onChange={(anyVideo) => patch({ anyVideo })} />
      </Collapsible>

      <Collapsible title="Every rear lens" active={draft.allVideo.width != null || draft.allVideo.fps != null}>
        <VideoRow value={draft.allVideo} values={everyLensVideoValues(currentFacets)} onChange={(allVideo) => patch({ allVideo })} />
      </Collapsible>

      <Collapsible title="Front camera" active={draft.twoFront || Object.keys(draft.front).length > 0}>
        <FocalRow value={draft.front} values={lensValues("front", currentFacets, draft.front)} onChange={(front) => patch({ front })} />
        <ApertureRow value={draft.front} values={lensValues("front", currentFacets, draft.front)} onChange={(front) => patch({ front })} />
        <ResolutionRow value={draft.front} values={lensValues("front", currentFacets, draft.front)} onChange={(front) => patch({ front })} />
        <VideoRow
          value={draft.front.video}
          values={lensValues("front", currentFacets, draft.front).video}
          onChange={(video) => patch({ front: { ...draft.front, video } })}
        />
        <Toggle label="Two or more front cameras" checked={draft.twoFront} onChange={(twoFront) => patch({ twoFront })} />
      </Collapsible>

      <Collapsible title="Release date" active={Boolean(draft.releaseFrom || draft.releaseTo)}>
        <Row label="Year">
          <select className="ui-select" aria-label="Released from" value={draft.releaseFrom} onChange={(event) => patch({ releaseFrom: event.target.value })}>
            <option value="">From</option>
            {RELEASE_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select className="ui-select" aria-label="Released until" value={draft.releaseTo} onChange={(event) => patch({ releaseTo: event.target.value })}>
            <option value="">To</option>
            {RELEASE_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </Row>
      </Collapsible>

      <div className="fp-footer">
        <button type="submit" className="ui-btn ui-btn-primary">
          <Icon name="search" />
          {count === null ? "Show results" : `Show ${count.toLocaleString("en-US")} ${count === 1 ? "phone" : "phones"}`}
        </button>
      </div>
    </form>
  );
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
        <Icon name="search" />
      </button>
    </form>
  );
}

function PhoneBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "name";
  const filterText = searchParams.get("f") || "";
  const filter = useMemo(() => decodeFilter(filterText), [filterText]);

  const [brands, setBrands] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const requestedPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const bodyKey = JSON.stringify(searchBody(filter, { q: query, sort, page: requestedPage, limit: PAGE_SIZE }));

  const [state, setState] = useState(() => ({
    result: peekCatalogueSearch(JSON.parse(bodyKey)) ?? null,
    loadedKey: null,
    error: "",
  }));

  useEffect(() => {
    let ignore = false;

    getBrands().then(
      (data) => {
        if (!ignore) setBrands(data);
      },
      (err) => console.error(err),
    );

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    searchCatalogue(JSON.parse(bodyKey)).then(
      (result) => {
        if (!ignore) setState({ result, loadedKey: bodyKey, error: "" });
      },
      (err) => {
        console.error(err);
        // 400 INVALID_FILTER explains which value is wrong
        if (!ignore) setState({ result: null, loadedKey: bodyKey, error: err.status === 400 ? err.message : "Could not load phones." });
      },
    );

    return () => {
      ignore = true;
    };
  }, [bodyKey]);

  function updateParams(changes, { keepPage = false } = {}) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }

    if (!keepPage) next.delete("page");
    setSearchParams(next);
  }

  function applyFilter(nextFilter) {
    updateParams({ f: encodeFilter(nextFilter) });
    setFiltersOpen(false);
  }

  function goToPage(page) {
    updateParams({ page: page > 1 ? String(page) : "" }, { keepPage: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const { result, error } = state;
  // The previous results stay on screen, dimmed, until the new ones arrive.
  const updating = state.loadedKey !== bodyKey && !peekCatalogueSearch(JSON.parse(bodyKey));

  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));
  const chips = filterChips(filter, brandNames);

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

        <SearchBar key={query} initialQuery={query} onSearch={(value) => updateParams({ q: value })} />

        <div className="catalog-toolbar">
          <button
            type="button"
            className="ui-btn ui-btn-small"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Icon name="filter" />
            {filtersOpen ? "Hide filters" : `Filters${chips.length ? ` (${chips.length})` : ""}`}
          </button>
        </div>

        <div className="catalog-layout">
          <aside className={`catalog-filters ${filtersOpen ? "is-open" : ""}`} aria-label="Filters">
            <FilterPanel
              key={filterText}
              initial={filter}
              query={query}
              sort={sort}
              brands={brands}
              onSort={(value) => updateParams({ sort: value === "name" ? "" : value })}
              onApply={applyFilter}
            />
          </aside>

          <section className="catalog-results" aria-busy={updating}>
            {chips.length > 0 && (
              <ul className="catalog-chips" aria-label="Active filters">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type="button"
                      className="catalog-chip"
                      aria-label={`Remove filter: ${chip.label}`}
                      onClick={() => applyFilter(chip.remove(filter))}
                    >
                      {chip.label}
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" className="catalog-chip-clear" onClick={() => applyFilter(EMPTY_FILTER)}>
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            {updating && !result && !error && <PhoneGridSkeleton count={6} className="phone-grid phone-grid-3" />}

            {error && !updating && <p className="page-status page-status-error">{error}</p>}

            {result && !updating && phones.length === 0 && (
              <p className="page-status">No phones match these criteria.</p>
            )}

            {phones.length > 0 && (
              <ul className={`phone-grid phone-grid-3 ${updating ? "is-updating" : ""}`}>
                {phones.map((phone) => (
                  <li key={phone.id}>
                    <PhoneCard
                      phone={phone}
                      meta={[formatViews(phone.viewCount), phone.releaseDate?.slice(0, 4)].filter(Boolean).join(" · ")}
                    />
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && (
              <nav className="catalog-pagination" aria-label="Pages">
                <button type="button" className="ui-btn ui-btn-small" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  <Icon name="arrowLeft" /> Previous
                </button>
                <span className="catalog-page-info">Page {page} of {totalPages}</span>
                <button type="button" className="ui-btn ui-btn-small" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                  Next <Icon name="arrowRight" />
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
