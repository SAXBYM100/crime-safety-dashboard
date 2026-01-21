import React from "react";
import { rollingAverage } from "../analytics/trendAnalysis";

export default function TrendChart({ rows = [], height = 180 }) {
  if (!rows.length) return null;

  const w = 560;
  const h = height;
  const pad = 22;

  const values = rows.map((r) => r.total || 0);
  const rolling = rollingAverage(values, 3);
  const max = Math.max(1, ...values, ...rolling);
  const min = Math.min(0, ...values, ...rolling);

  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, rows.length - 1);
  const y = (v) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const rollingPoints = rolling.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const latest = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  const mom = prev > 0 ? ((latest - prev) / prev) * 100 : null;
  const maxValue = Math.max(...values);
  const maxIndex = values.findIndex((v) => v === maxValue);

  return (
    <div className="trendChart">
      <div className="trendMeta">
        <span>
          Latest: <b>{latest}</b>
        </span>
        <span>
          MoM:{" "}
          {mom === null ? (
            "—"
          ) : (
            <b className={mom >= 0 ? "trendUp" : "trendDown"}>
              {mom >= 0 ? "+" : ""}
              {mom.toFixed(1)}%
            </b>
          )}
        </span>
      </div>
      <svg width={w} height={h} role="img" aria-label="Crime trend chart">
        <polyline className="trendLine" fill="none" strokeWidth="2.4" points={points} />
        <polyline className="trendRolling" fill="none" strokeWidth="2.4" points={rollingPoints} />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3" className="trendDot" />
        ))}
        {maxIndex >= 0 && (
          <circle cx={x(maxIndex)} cy={y(maxValue)} r="4" className="trendPeak" />
        )}
      </svg>
      <div className="trendLegend">
        <span>
          <i className="legendDot" /> Monthly total
        </span>
        <span>
          <i className="legendLine" /> 3-month rolling average
        </span>
      </div>
    </div>
  );
}
