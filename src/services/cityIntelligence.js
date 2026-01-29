import { fetchAreaReport, fetchAreaReportBatch } from "./existing";
import { fetchLast12MonthsCountsByCategory, fetchTrendsBatch } from "../api/trends";

const CLIENT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const summaryInflight = new Map();
const intelInflight = new Map();

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch (err) {
    return false;
  }
}

function readClientCache(key) {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Number.isFinite(parsed.storedAt)) return null;
    if (Date.now() - parsed.storedAt > CLIENT_CACHE_TTL_MS) return null;
    return parsed.value || null;
  } catch (err) {
    return null;
  }
}

function writeClientCache(key, value) {
  if (!canUseStorage()) return;
  try {
    const payload = JSON.stringify({ storedAt: Date.now(), value });
    window.localStorage.setItem(key, payload);
  } catch (err) {
    // ignore storage errors
  }
}

function summaryCacheKey(slug) {
  return `city-summary:${slug}`;
}

function intelCacheKey(slug) {
  return `city-intel:${slug}`;
}

function toMonthString(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(date, delta) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d;
}

function getLastFullMonth() {
  const now = new Date();
  return addMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1);
}

function sumTotals(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.reduce((acc, row) => acc + (row.total || 0), 0);
}

function computeCategoryTotals(rows = []) {
  const totals = {};
  rows.forEach((row) => {
    const byCategory = row.byCategory || {};
    Object.keys(byCategory).forEach((cat) => {
      totals[cat] = (totals[cat] || 0) + (byCategory[cat] || 0);
    });
  });
  return totals;
}

function computeCategoryTotalsFromCrimes(crimes = []) {
  const totals = {};
  crimes.forEach((crime) => {
    const category = crime?.category || "unknown";
    totals[category] = (totals[category] || 0) + 1;
  });
  return totals;
}

function getTopCategoriesFromTotals(totals, limit = 5) {
  return Object.entries(totals)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function formatCategory(cat) {
  return String(cat || "").replace(/-/g, " ");
}

function groupCrimesByArea(crimes = []) {
  const groups = new Map();
  crimes.forEach((crime) => {
    const name = crime?.location?.name || "Unknown";
    const lat = Number(crime?.location?.lat);
    const lon = Number(crime?.location?.lon);
    if (!groups.has(name)) {
      groups.set(name, { name, count: 0, latSum: 0, lonSum: 0, points: 0, categories: {} });
    }
    const group = groups.get(name);
    group.count += 1;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      group.latSum += lat;
      group.lonSum += lon;
      group.points += 1;
    }
    const cat = crime?.category || "unknown";
    group.categories[cat] = (group.categories[cat] || 0) + 1;
  });
  return Array.from(groups.values()).map((group) => {
    const topCategory = Object.entries(group.categories)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
    const center =
      group.points > 0
        ? { lat: group.latSum / group.points, lng: group.lonSum / group.points }
        : null;
    return { ...group, topCategory, center };
  });
}

function buildMomentumSummary(rows = []) {
  if (!rows.length) return { rising: [], declining: [] };
  const categories = new Set();
  rows.forEach((row) => Object.keys(row.byCategory || {}).forEach((cat) => categories.add(cat)));

  const series = Array.from(categories).map((cat) => {
    const counts = rows.map((row) => row.byCategory?.[cat] || 0);
    const recent = counts.slice(-3).reduce((a, b) => a + b, 0);
    const prior = counts.slice(-6, -3).reduce((a, b) => a + b, 0);
    return { category: cat, delta: recent - prior };
  });

  const rising = series.filter((s) => s.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const declining = series.filter((s) => s.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);

  return {
    rising: rising.map((s) => formatCategory(s.category)),
    declining: declining.map((s) => formatCategory(s.category)),
  };
}

function buildSummaryFromTrend(city, trend) {
  const rows = Array.isArray(trend?.rows) ? trend.rows : [];
  if (!rows.length) {
    return {
      ok: false,
      errorCode: trend?.code || "NO_DATA",
      trend: trend || { ok: false, code: "NO_DATA", trend: "unknown", rows: [] },
      totalCrimes: null,
      ratePer1000: null,
      topCategory: null,
      servedFromCache: Boolean(trend?.servedFromCache),
      cacheAgeSeconds: trend?.cacheAgeSeconds,
    };
  }
  const totalCrimes = sumTotals(rows);
  const ratePer1000 = Number.isFinite(totalCrimes) && city.population ? (totalCrimes / city.population) * 1000 : null;
  const categoryTotals = computeCategoryTotals(rows);
  let topCategory = getTopCategoriesFromTotals(categoryTotals, 1)[0]?.category || null;
  if (topCategory === "unknown") topCategory = null;
  return {
    ok: trend?.ok !== false,
    errorCode: trend?.ok === false ? trend?.code || "UPSTREAM_ERROR" : null,
    trend,
    totalCrimes,
    ratePer1000,
    topCategory,
    servedFromCache: Boolean(trend?.servedFromCache),
    cacheAgeSeconds: trend?.cacheAgeSeconds,
  };
}

export async function fetchCitySummary(city) {
  let trend = null;
  try {
    trend = await fetchLast12MonthsCountsByCategory(city.lat, city.lng);
  } catch (err) {
    trend = { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] };
  }

  let totalCrimes = sumTotals(trend?.rows || []);
  let ratePer1000 = Number.isFinite(totalCrimes) && city.population ? (totalCrimes / city.population) * 1000 : null;
  let categoryTotals = computeCategoryTotals(trend?.rows || []);
  let topCategory = getTopCategoriesFromTotals(categoryTotals, 1)[0]?.category || null;
  if (topCategory === "unknown") topCategory = null;

  if (!trend?.rows?.length) {
    try {
      const lastMonthKey = toMonthString(getLastFullMonth());
      const report = await fetchAreaReport({
        lat: city.lat,
        lng: city.lng,
        radius: 1000,
        from: lastMonthKey,
        to: lastMonthKey,
      });
      const hasCrimesArray = Array.isArray(report?.crimes);
      const crimes = hasCrimesArray ? report.crimes : [];
      if (hasCrimesArray) {
        totalCrimes = crimes.length;
        ratePer1000 = city.population ? (totalCrimes / city.population) * 1000 : null;
        categoryTotals = computeCategoryTotalsFromCrimes(crimes);
        topCategory = getTopCategoriesFromTotals(categoryTotals, 1)[0]?.category || null;
        if (topCategory === "unknown") topCategory = null;
      }
    } catch (err) {
      return {
        ok: false,
        errorCode: trend?.code || "UPSTREAM_ERROR",
        trend: trend || { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] },
        totalCrimes: null,
        ratePer1000: null,
        topCategory: null,
      };
    }
  }

  return {
    ok: trend?.ok !== false,
    errorCode: trend?.ok === false ? trend?.code || "UPSTREAM_ERROR" : null,
    trend,
    totalCrimes,
    ratePer1000,
    topCategory,
  };
}

export async function fetchCitySummariesBatch(cities = []) {
  const points = cities
    .filter((city) => Number.isFinite(city.lat) && Number.isFinite(city.lng))
    .map((city) => ({ key: city.slug, lat: city.lat, lon: city.lng }));
  const inflightKey = JSON.stringify(points);
  if (summaryInflight.has(inflightKey)) return summaryInflight.get(inflightKey);

  const promise = (async () => {
    let batch = null;
    try {
      batch = await fetchTrendsBatch(points);
    } catch (err) {
      batch = null;
    }

    const results = {};
    cities.forEach((city) => {
      const trend = batch?.results?.[city.slug] || null;
      const rateLimited =
        trend?.code?.toString().startsWith("RATE_LIMITED") || Boolean(batch?.rateLimited);
      const cached = readClientCache(summaryCacheKey(city.slug));

      let summary = trend
        ? buildSummaryFromTrend(city, trend)
        : buildSummaryFromTrend(city, { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] });

      if ((summary?.ok === false && rateLimited && cached) || (!trend && cached)) {
        summary = { ...cached, servedFromCache: true };
      }

      if (summary && summary.ok !== false) {
        writeClientCache(summaryCacheKey(city.slug), summary);
      }

      results[city.slug] = summary;
    });

    return results;
  })();

  summaryInflight.set(inflightKey, promise);
  promise.finally(() => summaryInflight.delete(inflightKey));
  return promise;
}

export async function fetchUkAverageRate(cities) {
  const summaries = await fetchCitySummariesBatch(cities);
  const rates = Object.values(summaries)
    .map((summary) => summary?.ratePer1000)
    .filter((n) => Number.isFinite(n));
  if (!rates.length) return null;
  const sum = rates.reduce((a, b) => a + b, 0);
  return sum / rates.length;
}

export async function fetchCityIntelligence(city) {
  const key = intelCacheKey(city.slug || city.name || "city");
  const cached = readClientCache(key);
  if (intelInflight.has(key)) return intelInflight.get(key);

  const promise = (async () => {
    let trend = null;
    let ok = true;
    let errorCode = null;
    try {
      trend = await fetchLast12MonthsCountsByCategory(city.lat, city.lng);
    } catch (err) {
      trend = { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] };
    }
    if (trend?.ok === false) {
      ok = false;
      errorCode = trend?.code || "UPSTREAM_ERROR";
    }
    if (!Array.isArray(trend?.rows) || trend.rows.length === 0) {
      ok = false;
      errorCode = errorCode || "NO_DATA";
    }

    const trendRateLimited = String(trend?.code || "").startsWith("RATE_LIMITED");
    if (trendRateLimited && cached) {
      return { ...cached, servedFromCache: true };
    }

    const totalCrimes = sumTotals(trend?.rows || []);
    const ratePer1000 = Number.isFinite(totalCrimes) && city.population ? (totalCrimes / city.population) * 1000 : null;
    const categoryTotals = computeCategoryTotals(trend?.rows || []);
    let topCategory = getTopCategoriesFromTotals(categoryTotals, 1)[0]?.category || null;
    if (topCategory === "unknown") topCategory = null;
    const momentum = buildMomentumSummary(trend?.rows || []);

    const lastMonth = getLastFullMonth();
    const lastMonthKey = toMonthString(lastMonth);
    const prevYearKey = toMonthString(addMonths(lastMonth, -12));

    let latestReport = null;
    let lastMonthReport = null;
    let prevYearReport = null;

    const items = [
      { key: "latest", lat: city.lat, lon: city.lng, radius: 1000 },
      { key: "lastMonth", lat: city.lat, lon: city.lng, radius: 1000, from: lastMonthKey, to: lastMonthKey },
      { key: "prevYear", lat: city.lat, lon: city.lng, radius: 1000, from: prevYearKey, to: prevYearKey },
    ];

    let reportBatch = null;
    try {
      reportBatch = await fetchAreaReportBatch(items);
    } catch (err) {
      reportBatch = null;
    }

    const batchRateLimited =
      reportBatch?.code?.toString().startsWith("RATE_LIMITED") ||
      Object.values(reportBatch?.results || {}).some((r) => r?.code?.toString().startsWith("RATE_LIMITED"));

    if (batchRateLimited && cached) {
      return { ...cached, servedFromCache: true };
    }

    if (reportBatch?.ok === false) {
      ok = false;
      errorCode = errorCode || reportBatch.code || "UPSTREAM_ERROR";
    }

    if (reportBatch?.results) {
      latestReport = reportBatch.results.latest || null;
      lastMonthReport = reportBatch.results.lastMonth || null;
      prevYearReport = reportBatch.results.prevYear || null;
    }

    const latestCrimes = Array.isArray(latestReport?.crimes) ? latestReport.crimes : [];
    const lastMonthTotal = Array.isArray(lastMonthReport?.crimes) ? lastMonthReport.crimes.length : null;
    const prevYearTotal = Array.isArray(prevYearReport?.crimes) ? prevYearReport.crimes.length : null;
    const yoyChange =
      Number.isFinite(lastMonthTotal) && Number.isFinite(prevYearTotal) && prevYearTotal > 0
        ? ((lastMonthTotal - prevYearTotal) / prevYearTotal) * 100
        : null;

    const areas = groupCrimesByArea(latestCrimes).map((area) => ({
      name: area.name,
      count: area.count,
      ratePer1000: city.population ? (area.count / city.population) * 1000 : null,
      topCategory: area.topCategory,
      center: area.center,
    }));

    const safestAreas = areas
      .slice()
      .sort((a, b) => a.count - b.count)
      .filter((a) => a.count > 0)
      .slice(0, 3);
    const highestAreas = areas
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const result = {
      ok,
      errorCode,
      trend,
      totalCrimes,
      ratePer1000,
      yoyChange,
      topCategory,
      safestAreas,
      highestAreas,
      momentum,
      lastMonthKey,
    };

    if (result.ok !== false && (Array.isArray(result.trend?.rows) || latestCrimes.length > 0)) {
      writeClientCache(key, result);
    }

    return result;
  })();

  intelInflight.set(key, promise);
  promise.finally(() => intelInflight.delete(key));
  return promise;
}
