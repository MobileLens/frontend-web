import { useCallback, useState } from "react";
import { createSmartphone, getCatalogue } from "../../api/smartphones";
import PhoneDetailsForm from "./PhoneDetailsForm";
import PhoneEditor from "./PhoneEditor";
import { EmptyNote, LoadState, Pager, Section } from "./adminUi";
import { phoneName, useAdminData } from "./adminUtils";

const PAGE_SIZE = 20;

export default function PhonesTab({ isAdmin, notify, onChanged }) {
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState({ q: "", unverified: false, page: 1 });
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);

  const loadPhones = useCallback(
    () => getCatalogue(
      { q: filters.q, verified: filters.unverified ? "false" : "", page: filters.page, sort: "name" },
      PAGE_SIZE,
      { fresh: true },
    ),
    [filters],
  );
  const { data, loading, error, reload } = useAdminData(loadPhones);

  function changed() {
    reload();
    onChanged();
  }

  async function handleCreate(values) {
    const phone = await createSmartphone(values);
    setAdding(false);
    notify(phone.existing ? "That phone is already in the catalogue; opened it instead." : `Added ${values.modelName}.`);
    changed();
    setSelectedId(phone.id);
  }

  if (selectedId) {
    return (
      <PhoneEditor
        phoneId={selectedId}
        isAdmin={isAdmin}
        notify={notify}
        onChanged={changed}
        onClose={() => setSelectedId(null)}
      />
    );
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <>
      {adding && (
        <Section title="Add a phone">
          <PhoneDetailsForm submitLabel="Add phone" onSubmit={handleCreate} onCancel={() => setAdding(false)} />
        </Section>
      )}

      <Section
        title="Catalogue"
        count={data?.total}
        actions={!adding && (
          <button type="button" className="ui-btn ui-btn-small ui-btn-primary" onClick={() => setAdding(true)}>
            Add phone
          </button>
        )}
      >
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters((prev) => ({ ...prev, q: draft.trim(), page: 1 }));
          }}
        >
          <input
            className="ui-input"
            type="search"
            placeholder="Model, brand or model code…"
            aria-label="Search phones"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="ui-btn">Search</button>
        </form>

        <label className="ui-check admin-filter">
          <input
            type="checkbox"
            checked={filters.unverified}
            onChange={(event) => setFilters((prev) => ({ ...prev, unverified: event.target.checked, page: 1 }))}
          />
          Only phones waiting for verification
        </label>

        <LoadState loading={loading} error={error} errorMessage="Could not load phones." />
        {data?.data.length === 0 && <EmptyNote>No phones match.</EmptyNote>}

        <ul className="admin-list">
          {data?.data.map((phone) => (
            <li key={phone.id} className="admin-list-item">
              <div className="admin-list-main admin-phone-row">
                {phone.imageThumbUrl || phone.imageUrl ? (
                  <img className="admin-phone-thumb" src={phone.imageThumbUrl || phone.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className="admin-phone-thumb" aria-hidden="true" />
                )}
                <div>
                  <span className="admin-list-title">{phoneName(phone)}</span>
                  <div className="admin-meta">
                    {phone.verified ? "Verified" : <span className="admin-warning">Not verified</span>}
                    {phone.releaseDate && ` · ${phone.releaseDate}`}
                  </div>
                </div>
              </div>
              <div className="ui-actions admin-list-actions">
                <button type="button" className="ui-btn ui-btn-small" onClick={() => setSelectedId(phone.id)}>Edit</button>
              </div>
            </li>
          ))}
        </ul>

        <Pager
          page={filters.page}
          totalPages={totalPages}
          onChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </Section>
    </>
  );
}
