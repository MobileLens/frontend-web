export default function DataTable({ columns, rows, emptyMessage, onRowClick }) {
  if (!rows || rows.length === 0) {
    return <p className="admin-empty">{emptyMessage}</p>;
  }

  return (
    <div className="admin-table-wrapper">
      <table className={`admin-table ${onRowClick ? "admin-table-clickable" : ""}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => event.key === "Enter" && onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : row[column.key] !== undefined && row[column.key] !== null
                      ? String(row[column.key])
                      : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
