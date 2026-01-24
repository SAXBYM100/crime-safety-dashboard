import { computeSafetyScore } from "../analytics/safetyScore";
import { getAreaProfile } from "../data";
import { createJournalArticle } from "./journalStore";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function toMonthLabel(value) {
  return value || "Latest";
}

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function pctChange(current, previous) {
  if (!Number.isFinite(previous) || previous <= 0 || !Number.isFinite(current)) return null;
  return ((current - previous) / previous) * 100;
}

function buildSignals({ currentTotal, prevTotal, topCategory, topShare, trendRows, safetyScore }) {
  const signals = [];
  if (Number.isFinite(safetyScore)) {
    signals.push({
      type: "crime",
      label: "Composite safety index",
      value: `${Math.round(safetyScore)}`,
      trend: "flat",
      source: "Area IQ model",
    });
  }
  if (currentTotal != null) {
    signals.push({
      type: "crime",
      label: "Incidents this month",
      value: `${currentTotal}`,
      trend: prevTotal != null && currentTotal > prevTotal ? "up" : prevTotal != null && currentTotal < prevTotal ? "down" : "flat",
      source: "UK Police API",
    });
  }
  const deltaPct = pctChange(currentTotal, prevTotal);
  if (deltaPct != null) {
    signals.push({
      type: "crime",
      label: "Change vs previous month",
      value: `${deltaPct.toFixed(1)}%`,
      trend: deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat",
      source: "UK Police API",
    });
  }
  if (topCategory && topShare != null) {
    signals.push({
      type: "crime",
      label: "Top category share",
      value: `${topShare.toFixed(1)}%`,
      trend: "flat",
      source: "UK Police API",
    });
  }
  if (trendRows.length > 0) {
    signals.push({
      type: "crime",
      label: "Trend coverage (months)",
      value: `${trendRows.length}`,
      trend: "flat",
      source: "UK Police API",
    });
  }
  if (trendRows.length >= 3) {
    const last3 = trendRows.slice(-3).map((row) => row.total || 0);
    const avg = sum(last3) / last3.length;
    signals.push({
      type: "crime",
      label: "3-month average incidents",
      value: `${Math.round(avg)}`,
      trend: "flat",
      source: "UK Police API",
    });
  }
  return signals.slice(0, 6);
}

function buildInsights({ deltaPct, topCategory, topShare, trendRows }) {
  const insights = [];
  if (deltaPct != null) {
    insights.push(
      `Monthly incidents shifted ${deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat"} by ${Math.abs(deltaPct).toFixed(1)}%.`
    );
  } else {
    insights.push("Monthly change was not available due to missing prior data.");
  }
  if (topCategory && topShare != null) {
    insights.push(`${topCategory} accounted for ${topShare.toFixed(1)}% of incidents.`);
  } else {
    insights.push("Category mix was not available for this period.");
  }
  if (trendRows.length >= 3) {
    insights.push("Recent three-month totals provide the most stable signal for short-term change.");
  } else {
    insights.push("Longer trend history is needed to confirm sustained direction.");
  }
  return insights.slice(0, 5);
}

function buildArticlePayload(profile, options = {}) {
  const generatedAt = new Date();
  const generatedAtIso = generatedAt.toISOString();

  const latestCrimes = profile.safety?.latestCrimes || [];
  const trendRows = profile.safety?.trend?.rows || [];
  const safetyScore = computeSafetyScore(latestCrimes, trendRows).score;

  const lastTrend = trendRows[trendRows.length - 1];
  const prevTrend = trendRows[trendRows.length - 2];

  const month = options.monthYYYYMM || lastTrend?.month || "";
  const currentTotal =
    latestCrimes.length > 0 ? latestCrimes.length : lastTrend?.total ?? null;
  const prevTotal = prevTrend?.total ?? null;

  const categoryCounts = {};
  latestCrimes.forEach((crime) => {
    const cat = crime?.category || "unknown";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const [topCategoryKey] =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || [];

  const topCategory = topCategoryKey ? topCategoryKey.replace(/-/g, " ") : "";

  const topShare =
    currentTotal != null && topCategoryKey
      ? (categoryCounts[topCategoryKey] / currentTotal) * 100
      : null;

  const deltaPct = pctChange(currentTotal, prevTotal);

  const locationName =
    profile.displayName || profile.canonicalName || options.fallbackName || "UK";
  const canonicalSlug = profile.canonicalSlug || slugify(locationName);

  const headline = `Crime trends shift in ${locationName} - ${toMonthLabel(month)}`;
  const teaser = `A fresh safety snapshot for ${locationName}, including category mix and month-on-month movement.`;

  const answerSummary =
    currentTotal != null && deltaPct != null
      ? `${locationName} recorded ${currentTotal} incidents in ${toMonthLabel(
          month
        )}, a ${Math.abs(deltaPct).toFixed(1)}% ${
          deltaPct > 0 ? "increase" : "decrease"
        } vs the prior month. ${
          topCategory && topShare != null
            ? `${topCategory} was the largest share at ${topShare.toFixed(1)}%.`
            : "Category share data was limited."
        }`
      : `${locationName} has limited month-on-month data for ${toMonthLabel(
          month
        )}. The latest snapshot focuses on available incident totals and category mix.`;

  const executiveSummary =
    currentTotal != null
      ? `Incident totals for ${locationName} are ${currentTotal} for ${toMonthLabel(
          month
        )}, with the strongest activity in ${topCategory || "key categories"}.`
      : `Incident totals for ${locationName} were not available for ${toMonthLabel(
          month
        )}.`;

  const signals = buildSignals({
    currentTotal,
    prevTotal,
    topCategory,
    topShare,
    trendRows,
    safetyScore,
  });

  const insights = buildInsights({ deltaPct, topCategory, topShare, trendRows });

  return {
    slug: slugify(`${locationName}-${month || "latest"}`),

    // Store as ISO strings for easy Firestore sorting + JSON-LD
    publishDate: generatedAtIso,
    generatedAt: generatedAtIso,

    status: options.status || "draft",
    headline,
    teaser,

    // Keep tags stable; location is already carried by locationRef + headline
    tags: ["Crime Trends", "Monthly Snapshot", "UK"],

    seoTitle: headline,
    seoDescription: teaser,

    locationRef: canonicalSlug || "uk",
    dataMonth: month || "",

    executiveSummary,
    answerSummary,
    definitions: [
      "Safety index = composite score derived from reported incident volume and category mix.",
      "Trend direction = change in total incidents compared with the previous month.",
    ],
    signals,
    insights,
    methodology:
      "Compiled from UK Police recorded crime data and summarized by month and category for the selected location. Totals reflect reported incidents available for the chosen period.",
    sources: ["UK Police API", "OpenStreetMap Nominatim"],

    // Canonical deep link into your report experience
    ctaLink: `/place/${encodeURIComponent(canonicalSlug)}`,
  };
}

export async function generateJournalDraftForLocation(locationName, options = {}) {
  const monthParam = /^\d{4}-\d{2}$/.test(options.monthYYYYMM || "") ? options.monthYYYYMM : "";
  const profile = await getAreaProfile({ kind: "place", value: locationName }, { dateYYYYMM: monthParam });
  const payload = buildArticlePayload(profile, { ...options, fallbackName: locationName });
  const id = await createJournalArticle(payload);
  return { id, payload };
}

export async function generateJournalDrafts(locations = [], options = {}) {
  const results = [];
  for (const locationName of locations) {
    try {
      const result = await generateJournalDraftForLocation(locationName, options);
      results.push({ locationName, status: "ok", id: result.id, payload: result.payload });
    } catch (error) {
      results.push({ locationName, status: "error", error: error?.message || String(error) });
    }
  }
  return results;
}
