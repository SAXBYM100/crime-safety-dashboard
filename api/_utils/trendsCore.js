const { getCache, setCache } = require("./cache");
const { fetchJsonWithRetry, logDevError } = require("../../lib/serverHttp");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const inflight = new Map();

function ym(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function last12Months() {
  const out = [];
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 12; i++) {
    out.push(ym(d));
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out.reverse();
}

async function fetchMonth(lat, lon, yyyymm) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${encodeURIComponent(
    lat
  )}&lng=${encodeURIComponent(lon)}&date=${encodeURIComponent(yyyymm)}`;

  try {
    const json = await fetchJsonWithRetry(
      url,
      { headers: { Accept: "application/json" } },
      { timeoutMs: 4500, retries: 1, retryDelayMs: 250 }
    );
    return { ok: true, crimes: Array.isArray(json) ? json : [] };
  } catch (err) {
    if (err?.status === 404 || err?.status === 429 || err?.status === 503) {
      return { ok: false, crimes: [] };
    }
    logDevError("trends.fetch", err, { month: yyyymm, lat, lon });
    return { ok: false, crimes: [] };
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) break;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function buildTrendData(lat, lon) {
  const months = last12Months();
  let errorCount = 0;
  const series = await mapWithConcurrency(months, 4, async (m) => {
    const result = await fetchMonth(lat, lon, m);
    if (!result.ok) errorCount += 1;
    const crimes = result.crimes || [];
    const counts = {};
    for (const c of crimes) {
      const cat = c.category || "unknown";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return { month: m, counts };
  });

  const categorySet = new Set();
  for (const row of series) Object.keys(row.counts).forEach((k) => categorySet.add(k));
  const categories = Array.from(categorySet).sort();

  const rows = series.map((r) => {
    const byCategory = {};
    let total = 0;
    for (const cat of categories) {
      const v = r.counts[cat] || 0;
      byCategory[cat] = v;
      total += v;
    }
    return { month: r.month, total, byCategory };
  });

  const totalCrimes = rows.reduce((acc, row) => acc + row.total, 0);
  if (errorCount === months.length && totalCrimes === 0) {
    return { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] };
  }

  return {
    months,
    categories,
    rows,
  };
}

async function fetchTrend(lat, lon) {
  const cacheKey = `trends:${lat.toFixed(5)}:${lon.toFixed(5)}`;
  const cached = getCache(cacheKey);
  if (cached) return { ok: true, ...cached };

  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const data = await buildTrendData(lat, lon);
      if (data?.ok === false) return data;
      setCache(cacheKey, data, CACHE_TTL_MS);
      return { ok: true, ...data };
    } catch (error) {
      return { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] };
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

module.exports = {
  fetchTrend,
  CACHE_TTL_MS,
};
