import React, { useMemo } from "react";

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function SafetyGauge({ score, label, compact = false }) {
  const clamped = clampScore(score);
  const angle = clamped === null ? -90 : -90 + (clamped / 100) * 180;
  const ariaLabel = clamped === null
    ? "Composite safety index unavailable"
    : `Composite safety index ${clamped} out of 100, ${label || ""}`.trim();

  const segments = useMemo(
    () => [
      { from: -90, to: -45, color: "#dc2626" },
      { from: -45, to: 0, color: "#f59e0b" },
      { from: 0, to: 45, color: "#0f766e" },
      { from: 45, to: 90, color: "#16a34a" },
    ],
    []
  );

  return (
    <div className={`scoreCardGauge ${compact ? "scoreCardGauge--compact" : ""}`}>
      <svg viewBox="0 0 200 120" role="img" aria-label={ariaLabel}>
        <g fill="none" strokeLinecap="round">
          {segments.map((seg) => (
            <path
              key={`${seg.from}-${seg.to}`}
              d={arcPath(100, 100, 70, seg.from, seg.to)}
              stroke={seg.color}
              strokeWidth={compact ? 10 : 14}
            />
          ))}
        </g>
        {clamped !== null && (
          <g>
            <line
              x1="100"
              y1="100"
              x2={polarToCartesian(100, 100, 58, angle).x}
              y2={polarToCartesian(100, 100, 58, angle).y}
              stroke="#0f172a"
              strokeWidth="3"
            />
            <circle cx="100" cy="100" r="4" fill="#0f172a" />
          </g>
        )}
      </svg>
    </div>
  );
}
