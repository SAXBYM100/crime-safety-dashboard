import { fetchAreaReport } from "./existing";
import { fetchLast12MonthsCountsByCategory } from "../api/trends";

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

export async function fetchCitySummary(city) {
  const trend = await fetchLast12MonthsCountsByCategory(city.lat, city.lng);
  const totalCrimes = sumTotals(trend.rows);
  const ratePer1000 = city.population ? (totalCrimes / city.population) * 1000 : null;
  const categoryTotals = computeCategoryTotals(trend.rows);
  const topCategory = getTopCategoriesFromTotals(categoryTotals, 1)[0]?.category || "unknown";
  return {
    trend,
    totalCrimes,
    ratePer1000,
    topCategory,
  };
}

export async function fetchUkAverageRate(cities) {
  const results = await Promise.allSettled(cities.map((city) => fetchCitySummary(city)));
  const rates = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value.ratePer1000)
    .filter((n) => Number.isFinite(n));
  if (!rates.length) return null;
  const sum = rates.reduce((a, b) => a + b, 0);
  return sum / rates.length;
}

export async function fetchCityIntelligence(city) {
  const trend = await fetchLast12MonthsCountsByCategory(city.lat, city.lng);
  const totalCrimes = sumTotals(trend.rows);
  const ratePer1000 = city.population ? (totalCrimes / city.population) * 1000 : null;
  const categoryTotals = computeCategoryTotals(trend.rows);
  const topCategory = getTopCategoriesFromTotals(categoryTotals, 1)[0]?.category || "unknown";
  const momentum = buildMomentumSummary(trend.rows);

  const lastMonth = getLastFullMonth();
  const lastMonthKey = toMonthString(lastMonth);
  const prevYearKey = toMonthString(addMonths(lastMonth, -12));

  const [latestReport, lastMonthReport, prevYearReport] = await Promise.all([
    fetchAreaReport({ lat: city.lat, lng: city.lng, radius: 1000 }),
    fetchAreaReport({ lat: city.lat, lng: city.lng, radius: 1000, from: lastMonthKey, to: lastMonthKey }),
    fetchAreaReport({ lat: city.lat, lng: city.lng, radius: 1000, from: prevYearKey, to: prevYearKey }),
  ]);

  const latestCrimes = Array.isArray(latestReport?.crimes) ? latestReport.crimes : [];
  const lastMonthTotal = Array.isArray(lastMonthReport?.crimes) ? lastMonthReport.crimes.length : 0;
  const prevYearTotal = Array.isArray(prevYearReport?.crimes) ? prevYearReport.crimes.length : 0;
  const yoyChange =
    prevYearTotal > 0 ? ((lastMonthTotal - prevYearTotal) / prevYearTotal) * 100 : null;

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

  return {
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
}
