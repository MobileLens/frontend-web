import { useCallback, useState } from "react";
import { getSmartphonesPage } from "../../../api/admin";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { phoneLabel } from "../format";
import StatusBadge from "../components/StatusBadge";
import PhoneEditorModal from "./PhoneEditorModal";

const PAGE_SIZE = 20;

export default function PhoneEditorTab({ onChanged }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);

  const loader = useCallback(
    () => getSmartphonesPage({ q: search, page, limit: PAGE_SIZE }),
    [search, page]
  );
  const { data, loading, error, reload } = useAsyncData(loader);

  const phones = data?.data || [];
  const total = data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearch(event) {
    event.preventDefault();
    setSearch(query.trim());
    setPage(1);
  }

  function handleClear() {
    setQuery("");
    setSearch("");
    setPage(1);
  }

  const handleClose = useCallback(() => setEditingId(null), []);

  function handleSaved() {
    reload();
    onChanged();
  }

  return (
    <section className="admin-section">
      <form onSubmit={handleSearch} className="editor-search-bar" role="search">
        <input
          type="search"
          className="editor-input"
          placeholder="Search by brand or model (e.g. Galaxy S24)…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search phones"
        />
        <button type="submit" className="btn btn-primary btn-fixed">
          Search
        </button>
        {search && (
          <button type="button" className="btn btn-outline btn-fixed" onClick={handleClear}>
            Clear
          </button>
        )}
      </form>

      <div className="list-meta">
        {loading ? "Loading…" : `${total} ${total === 1 ? "phone" : "phones"}${search ? ` matching “${search}”` : ""}`}
      </div>

      {error && <div className="admin-error" role="alert">Could not load phones: {error.message}</div>}

      {!loading && phones.length === 0 && !error && <p className="admin-empty">No phones found.</p>}

      <ul className={`phone-list ${loading ? "is-loading" : ""}`}>
        {phones.map((phone) => (
          <li key={phone.id} className="admin-phone-row">
            {phone.imageUrl ? (
              <img src={phone.imageUrl} alt="" className="admin-phone-row-thumb" loading="lazy" />
            ) : (
              <span className="admin-phone-row-thumb admin-phone-row-thumb-empty" />
            )}
            <div className="admin-phone-row-info">
              <span className="admin-phone-row-name">{phoneLabel(phone)}</span>
              <span className="admin-phone-row-meta">
                {phone.releaseDate ? `Released ${phone.releaseDate}` : "No release date"}
              </span>
            </div>
            <StatusBadge
              status={phone.verified ? "verified" : "pending"}
              label={phone.verified ? "Verified" : "Unverified"}
            />
            <button type="button" className="btn btn-outline btn-fixed" onClick={() => setEditingId(phone.id)}>
              Edit
            </button>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline btn-fixed"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="pagination-info">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-fixed"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {editingId && <PhoneEditorModal phoneId={editingId} onClose={handleClose} onSaved={handleSaved} />}
    </section>
  );
}
