const { getCache, setCache } = require("./_utils/cache");
const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { fetchJsonWithRetry, logDevError } = require("../lib/serverHttp");

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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
    return Array.isArray(json) ? json : [];
  } catch (err) {
    if (err?.status === 404 || err?.status === 429 || err?.status === 503) return [];
    logDevError("trends.fetch", err, { month: yyyymm, lat, lon });
    return [];
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

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`trends:${ip}`, 40, 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.resetMs / 1000)));
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please try again soon.");
  }

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return sendError(res, 400, "INVALID_COORDS", "lat and lon must be valid numbers.");
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return sendError(res, 400, "OUT_OF_RANGE", "lat must be between -90 and 90, lon between -180 and 180.");
  }

  const cacheKey = `trends:${lat.toFixed(5)}:${lon.toFixed(5)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=43200");
    return res.json(cached);
  }

  const months = last12Months();
  const series = await mapWithConcurrency(months, 4, async (m) => {
    const crimes = await fetchMonth(lat, lon, m);
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

  const data = {
    months,
    categories,
    rows: series.map((r) => {
      const byCategory = {};
      let total = 0;
      for (const cat of categories) {
        const v = r.counts[cat] || 0;
        byCategory[cat] = v;
        total += v;
      }
      return { month: r.month, total, byCategory };
    }),
  };

  setCache(cacheKey, data, CACHE_TTL_MS);
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=43200");
  return res.json(data);
};
