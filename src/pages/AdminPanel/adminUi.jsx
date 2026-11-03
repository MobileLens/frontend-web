// Building blocks shared by the admin panel tabs.

export function Section({ title, count, actions, children }) {
  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2 className="admin-section-title">
          {title}
          {count !== undefined && <span className="admin-badge">{count}</span>}
        </h2>
        {actions && <div className="ui-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyNote({ children }) {
  return <p className="admin-empty">{children}</p>;
}

export function LoadState({ loading, error, errorMessage }) {
  if (error) return <p className="ui-alert ui-alert-error" role="alert">{errorMessage}</p>;
  if (loading) return <p className="admin-empty">Loading…</p>;
  return null;
}

export function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3 className="stat-title">{title}</h3>
      <p className="stat-value">{value ?? "—"}</p>
    </div>
  );
}

// columns: [{ key, label, render?(row) }]
export function DataTable({ columns, rows, emptyMessage, rowKey = (row) => row.id }) {
  if (!rows || rows.length === 0) {
    return <EmptyNote>{emptyMessage}</EmptyNote>;
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pager">
      <button type="button" className="ui-btn ui-btn-small" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" className="ui-btn ui-btn-small" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="ui-field">
      <span className="ui-label">{label}</span>
      {children}
      {hint && <span className="admin-hint">{hint}</span>}
    </label>
  );
}
