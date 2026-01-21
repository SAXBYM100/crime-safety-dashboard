function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function rollingAverage(values, window = 3) {
  if (!Array.isArray(values) || values.length === 0) return [];
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1);
    const slice = values.slice(start, idx + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / slice.length;
  });
}

export function getCategoryDeltas(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const latest = rows[rows.length - 1]?.byCategory || {};
  const prev = rows[rows.length - 2]?.byCategory || {};
  const keys = new Set([...Object.keys(latest), ...Object.keys(prev)]);
  return Array.from(keys).map((key) => ({
    category: key,
    delta: (latest[key] || 0) - (prev[key] || 0),
    latest: latest[key] || 0,
    prev: prev[key] || 0,
  }));
}

export function getTopDrivers(rows = [], count = 3) {
  const deltas = getCategoryDeltas(rows);
  return deltas
    .filter((d) => d.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, count);
}

export function trendTakeaway(summary, topDrivers) {
  if (!summary || summary.direction === "Unavailable") {
    return "Trend insight is limited until more data is available.";
  }
  if (!Array.isArray(topDrivers) || topDrivers.length === 0) {
    return `Overall trend: ${summary.direction}. Category shifts are modest month to month.`;
  }
  const lead = topDrivers[0];
  const verb = lead.delta > 0 ? "increase" : "decline";
  return `Overall trend: ${summary.direction}. Recent ${verb} driven by ${lead.category.replace(
    /-/g,
    " "
  )}.`;
}

export function normalizePct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return clamp(value, -99, 99);
}
