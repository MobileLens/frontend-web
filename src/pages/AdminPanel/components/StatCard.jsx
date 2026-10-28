export default function StatCard({ title, value, hint, tone = "default" }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value">{value ?? "—"}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}
