const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getCacheEntry, setCache, getOrSetInflight } = require("./_utils/cache");
const { getAreaReport } = require("../lib/providerRegistry");

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const EDGE_TTL_SECONDS = 21600;
const STALE_SECONDS = 86400;

function setCacheHeaders(res, isShort = false) {
  if (isShort) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
    return;
  }
  res.setHeader("Cache-Control", `public, s-maxage=${EDGE_TTL_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`);
}

function sendPayload(res, payload, status = 200, isShortCache = false) {
  setCacheHeaders(res, isShortCache);
  res.status(status).json(payload);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function normalizeItems(body) {
  const raw = Array.isArray(body?.items) ? body.items : Array.isArray(body?.points) ? body.points : [];
  return raw.map((item) => ({
    key: String(item?.citySlug || item?.key || item?.slug || "").trim(),
    lat: Number(item?.lat),
    lon: Number(item?.lon ?? item?.lng),
    from: String(item?.from || ""),
    to: String(item?.to || ""),
    radius: Number(item?.radius || 1000),
    name: String(item?.name || ""),
  }));
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

function cacheKeyFor(item) {
  return `area-report:${item.lat.toFixed(5)}:${item.lon.toFixed(5)}:${item.from}:${item.to}:${item.radius}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is supported." } });
  }

  const body = await readBody(req);
  const items = normalizeItems(body);
  if (!items.length) {
    return res.status(400).json({ error: { code: "INVALID_ITEMS", message: "items is required." } });
  }

  const results = {};
  let partial = false;

  const unique = new Map();
  items.forEach((item) => {
    const key = item.key || "";
    if (!key || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) {
      results[key || `invalid-${Math.random().toString(36).slice(2, 7)}`] = {
        ok: false,
        code: "INVALID_POINT",
        message: "Invalid lat/lon.",
      };
      partial = true;
      return;
    }
    if (Math.abs(item.lat) > 90 || Math.abs(item.lon) > 180) {
      results[key] = { ok: false, code: "OUT_OF_RANGE", message: "Coordinates out of range." };
      partial = true;
      return;
    }
    unique.set(key, item);
  });

  let rateLimited = false;
  let retryAfterSeconds = 60;
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `area-report-batch:${ip}`, limit: 12, windowMs: 60_000 });
  if (!rl.ok) {
    rateLimited = true;
    retryAfterSeconds = Number.isFinite(rl.resetMs) ? Math.max(1, Math.ceil(rl.resetMs / 1000)) : 60;
  }

  for (const item of unique.values()) {
    const cacheKey = cacheKeyFor(item);
    const cachedEntry = getCacheEntry(cacheKey);
    if (cachedEntry) {
      results[item.key] = {
        ...cachedEntry.value,
        servedFromCache: true,
        cacheAgeSeconds: Math.max(0, Math.floor((Date.now() - cachedEntry.storedAt) / 1000)),
      };
    }
  }

  if (rateLimited) {
    let missing = false;
    for (const item of unique.values()) {
      if (!results[item.key]) {
        results[item.key] = {
          ok: false,
          code: "RATE_LIMITED_LOCAL",
          message: "Too many requests.",
          retryAfterSeconds,
        };
        partial = true;
        missing = true;
      }
    }
    if (missing) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return sendPayload(res, { results, partial }, 429, true);
    }
    return sendPayload(res, { results, partial });
  }

  const remaining = Array.from(unique.values()).filter((item) => !results[item.key]);
  await mapWithConcurrency(remaining, 2, async (item) => {
    const cacheKey = cacheKeyFor(item);
    try {
      const report = await getOrSetInflight(cacheKey, async () => {
        const data = await getAreaReport({
          lat: item.lat,
          lon: item.lon,
          radius: item.radius,
          from: item.from,
          to: item.to,
          name: item.name,
        });
        setCache(cacheKey, data, CACHE_TTL_MS);
        return data;
      });
      results[item.key] = report;
    } catch (err) {
      partial = true;
      results[item.key] = {
        ok: false,
        code: err?.status === 429 ? "RATE_LIMITED_UPSTREAM" : "UPSTREAM_ERROR",
        message: err?.message || "Provider failed.",
      };
    }
  });

  return sendPayload(res, { results, partial });
};
