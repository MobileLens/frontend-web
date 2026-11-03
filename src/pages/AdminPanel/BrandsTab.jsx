import { useCallback, useState } from "react";
import { createBrand, deleteBrand, getBrands, updateBrand } from "../../api/brands";
import { getCatalogue } from "../../api/smartphones";
import { EmptyNote, Field, LoadState, Section } from "./adminUi";
import { errorText, useAdminData } from "./adminUtils";

function BrandForm({ brand, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(brand?.name || "");
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter a brand name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit({ name: name.trim(), logoUrl: logoUrl.trim() });
    } catch (err) {
      setError(errorText(err, "Could not save the brand."));
      setSaving(false);
    }
  }

  return (
    <form className="ui-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <Field label="Name">
          <input className="ui-input" value={name} maxLength={128} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Logo URL" hint="Optional, an https:// image.">
          <input className="ui-input" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
        </Field>
      </div>

      {error && <p className="ui-alert ui-alert-error" role="alert">{error}</p>}

      <div className="ui-actions">
        <button type="submit" className="ui-btn ui-btn-small ui-btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ui-btn ui-btn-small" onClick={onCancel} disabled={saving}>Cancel</button>
        )}
      </div>
    </form>
  );
}

export default function BrandsTab({ isAdmin, notify }) {
  const loadBrands = useCallback(() => getBrands({ fresh: true }), []);
  const { data: brands, loading, error, reload } = useAdminData(loadBrands);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("");

  async function handleCreate(values) {
    await createBrand(values);
    setAdding(false);
    notify(`Added ${values.name}.`);
    reload();
  }

  async function handleUpdate(brand, values) {
    const changes = { name: values.name };
    // Only send the logo when it changed: the API returns it as a public URL, not as stored.
    if (values.logoUrl !== (brand.logoUrl || "")) changes.logoUrl = values.logoUrl || null;

    await updateBrand(brand.id, changes);
    setEditingId(null);
    notify(`Saved ${values.name}.`);
    reload();
  }

  async function handleDelete(brand) {
    try {
      // The database refuses to delete a brand that still has phones.
      const { total } = await getCatalogue({ brand_id: brand.id }, 1, { fresh: true });

      if (total > 0) {
        notify(`${brand.name} still has ${total} ${total === 1 ? "phone" : "phones"}. Move or delete them first.`, "error");
        return;
      }

      if (!window.confirm(`Delete the brand ${brand.name}?`)) return;

      await deleteBrand(brand.id);
      notify(`Deleted ${brand.name}.`);
      reload();
    } catch (err) {
      notify(errorText(err, "Could not delete the brand."), "error");
    }
  }

  const query = filter.trim().toLowerCase();
  const visible = (brands || []).filter((brand) => brand.name.toLowerCase().includes(query));

  return (
    <Section
      title="All brands"
      count={brands?.length}
      actions={!adding && (
        <button type="button" className="ui-btn ui-btn-small ui-btn-primary" onClick={() => setAdding(true)}>
          Add brand
        </button>
      )}
    >
      {adding && (
        <div className="admin-panel-box">
          <BrandForm submitLabel="Add brand" onSubmit={handleCreate} onCancel={() => setAdding(false)} />
        </div>
      )}

      <input
        className="ui-input admin-filter"
        type="search"
        placeholder="Filter brands…"
        aria-label="Filter brands"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      <LoadState loading={loading} error={error} errorMessage="Could not load brands." />
      {brands && visible.length === 0 && <EmptyNote>No brands match.</EmptyNote>}

      <ul className="admin-list">
        {visible.map((brand) => (
          <li key={brand.id} className="admin-list-item">
            {editingId === brand.id ? (
              <div className="admin-list-main">
                <BrandForm
                  brand={brand}
                  submitLabel="Save"
                  onSubmit={(values) => handleUpdate(brand, values)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                <div className="admin-list-main admin-brand">
                  {brand.logoUrl ? (
                    <img className="admin-brand-logo" src={brand.logoUrl} alt="" />
                  ) : (
                    <span className="admin-brand-logo" aria-hidden="true" />
                  )}
                  <span className="admin-list-title">{brand.name}</span>
                </div>
                <div className="ui-actions admin-list-actions">
                  <button type="button" className="ui-btn ui-btn-small" onClick={() => setEditingId(brand.id)}>Edit</button>
                  {isAdmin && (
                    <button type="button" className="ui-btn ui-btn-small ui-btn-danger" onClick={() => handleDelete(brand)}>
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
