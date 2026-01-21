const CATEGORY_WEIGHTS = {
  "violent-crime": 1.25,
  robbery: 1.2,
  "public-order": 1.1,
  "possession-of-weapons": 1.2,
  burglary: 1.1,
  "vehicle-crime": 1.05,
  drugs: 1.05,
  "criminal-damage-arson": 1.05,
  "anti-social-behaviour": 0.95,
  "theft-from-the-person": 1.0,
  "other-theft": 0.95,
  shoplifting: 0.9,
  "bicycle-theft": 0.9,
  "other-crime": 0.9,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCategory(cat) {
  return String(cat || "").toLowerCase().trim();
}

export function summarizeTrend(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return { direction: "Unavailable", changePct: null, momChangePct: null, volatility: null };
  }
  const totals = rows.map((r) => Number(r.total || 0));
  const last = totals[totals.length - 1] || 0;
  const prev = totals[totals.length - 2] || 0;
  const momChangePct = prev > 0 ? ((last - prev) / prev) * 100 : null;

  const recent = totals.slice(-3);
  const prior = totals.slice(-6, -3);
  const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const priorAvg = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : 0;
  const changePct = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;

  let direction = "Stable";
  if (changePct !== null) {
    if (changePct <= -6) direction = "Improving";
    if (changePct >= 6) direction = "Worsening";
  }

  const window = totals.slice(-6).filter((n) => Number.isFinite(n));
  let volatility = null;
  if (window.length >= 3) {
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length;
    volatility = mean > 0 ? Math.sqrt(variance) / mean : null;
  }

  return { direction, changePct, momChangePct, volatility };
}

export function computeSafetyScore(crimes = [], trendRows = []) {
  if (!Array.isArray(crimes) || crimes.length === 0) {
    return {
      score: null,
      label: "Unavailable",
      components: null,
    };
  }

  const weightedTotal = crimes.reduce((sum, crime) => {
    const weight = CATEGORY_WEIGHTS[normalizeCategory(crime.category)] || 1.0;
    return sum + weight;
  }, 0);

  const trend = summarizeTrend(trendRows);
  const trendPenalty = trend.changePct !== null ? clamp(trend.changePct / 6, -6, 6) : 0;
  const volatilityPenalty =
    trend.volatility !== null ? clamp(trend.volatility * 20, 0, 10) : 0;

  const volumePenalty = clamp(weightedTotal / 8, 0, 40);
  const raw = 82 - volumePenalty - Math.max(0, trendPenalty) - volatilityPenalty;
  const score = clamp(Math.round(raw), 0, 100);

  let label = "Moderate";
  if (score >= 75) label = "Good";
  else if (score < 55) label = "Caution";

  return {
    score,
    label,
    components: {
      weightedIncidents: Math.round(weightedTotal),
      trendPenalty: Math.round(Math.max(0, trendPenalty)),
      volatilityPenalty: Math.round(volatilityPenalty),
      volumePenalty: Math.round(volumePenalty),
    },
  };
}

export function getTopCategories(crimes = [], count = 3) {
  const tally = new Map();
  crimes.forEach((crime) => {
    const key = normalizeCategory(crime.category) || "unknown";
    tally.set(key, (tally.get(key) || 0) + 1);
  });
  const total = crimes.length || 1;
  return Array.from(tally.entries())
    .map(([category, value]) => ({
      category,
      count: value,
      share: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
}
