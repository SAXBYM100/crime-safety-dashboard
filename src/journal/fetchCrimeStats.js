import { computeSafetyScore } from "../analytics/safetyScore";
import { getAreaProfile } from "../data";

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export async function fetchCrimeStats(location, options = {}) {
  if (!location?.name) {
    throw new Error("fetchCrimeStats requires a location with name");
  }

  const monthParam = /^\d{4}-\d{2}$/.test(options.monthYYYYMM || "")
    ? options.monthYYYYMM
    : "";
  const profile = await getAreaProfile({ kind: "place", value: location.canonicalName || location.name }, { dateYYYYMM: monthParam });
  if (!profile) {
    throw new Error(`Unable to load crime profile for ${location.name}`);
  }

  const latestCrimes = profile.safety?.latestCrimes || [];
  const trendRows = profile.safety?.trend?.rows || [];
  const safetyScore = computeSafetyScore(latestCrimes, trendRows).score ?? null;

  const lastTrend = trendRows[trendRows.length - 1];
  const prevTrend = trendRows[trendRows.length - 2];

  const monthLabel = options.monthYYYYMM || lastTrend?.month || "Latest";
  const currentTotal = latestCrimes.length > 0 ? latestCrimes.length : lastTrend?.total ?? null;
  const prevTotal = prevTrend?.total ?? null;

  const categoryCounts = {};
  latestCrimes.forEach((crime) => {
    const cat = crime?.category || "unknown";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const [topCategoryKey] = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || [];
  const topCategory = topCategoryKey ? topCategoryKey.replace(/-/g, " ") : null;
  const topShare = currentTotal != null && topCategoryKey
    ? (categoryCounts[topCategoryKey] / currentTotal) * 100
    : null;

  const trendCoverageMonths = trendRows.length || 0;
  let threeMonthAverage = null;
  if (trendRows.length >= 3) {
    const last3 = trendRows.slice(-3).map((row) => row.total || 0);
    threeMonthAverage = sum(last3) / last3.length;
  }

  return {
    monthLabel: monthLabel || "Latest",
    currentTotal,
    prevTotal,
    trendRows,
    topCategory,
    topShare,
    safetyScore,
    trendCoverageMonths,
    threeMonthAverage,
    canonicalSlug: profile.canonicalSlug || slugify(location.canonicalSlug || location.name),
  };
}
