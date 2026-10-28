import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Mid-saturation colors that stay readable on both the light and dark card backgrounds.
const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

const tooltipProps = {
  contentStyle: {
    background: "var(--card-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: "0.85rem",
  },
  itemStyle: { color: "var(--text-primary)" },
  labelStyle: { color: "var(--text-secondary)", fontWeight: 600 },
  cursor: { fill: "var(--spec-bg)" },
};

// data: [{ name, value, color? }]
export function DonutChart({ data, height = 220 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="donut-wrapper">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="85%"
            paddingAngle={data.filter((item) => item.value > 0).length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((item, index) => (
              <Cell key={item.name} fill={item.color || PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipProps} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.8rem" }} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend takes ~36px at the bottom; center the total over the ring only. */}
      <div className="donut-total" style={{ height: height - 36 }}>
        <span className="donut-total-value">{total}</span>
        <span className="donut-total-label">total</span>
      </div>
    </div>
  );
}

// data: [{ label, value }]
export function SimpleBarChart({ data, height = 220, color = PALETTE[0], name = "Count" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
