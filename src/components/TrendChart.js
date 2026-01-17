import React from "react";

// Lightweight SVG line chart for totals (12 points).
export default function TrendChart({ rows = [], height = 120 }) {
  if (!rows.length) return null;

  const w = 520;
  const h = height;
  const pad = 18;

  const values = rows.map((r) => r.total || 0);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);

  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, rows.length - 1);
  const y = (v) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const latest = rows[rows.length - 1]?.total ?? 0;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        Last 12 months (total). Latest: <b>{latest}</b>
      </div>
      <svg width={w} height={h} role="img" aria-label="Crime trend chart">
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points} />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}
