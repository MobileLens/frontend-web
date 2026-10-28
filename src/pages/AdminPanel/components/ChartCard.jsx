export default function ChartCard({ title, children, empty, emptyMessage = "No data yet." }) {
  return (
    <div className="chart-card">
      <h4 className="chart-card-title">{title}</h4>
      <div className="chart-card-body">
        {empty ? <p className="admin-empty chart-empty">{emptyMessage}</p> : children}
      </div>
    </div>
  );
}
