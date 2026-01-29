// api/area-report.js
const { getCacheEntry, setCache, getOrSetInflight } = require("./_utils/cache");
const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getAreaReport } = require("../lib/providerRegistry");
const { logDevError, sendError } = require("../lib/serverHttp");

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

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  try {
    const lat = Number(req.query?.lat);
    const lon = Number(req.query?.lon);
    const from = String(req.query?.from || "");
    const to = String(req.query?.to || "");
    const radius = Number(req.query?.radius || 1000);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return sendError(res, 400, "INVALID_INPUT", "lat/lon required.");
    }

    const cacheKey = `area-report:${lat.toFixed(5)}:${lon.toFixed(5)}:${from}:${to}:${radius}`;
    const cachedEntry = getCacheEntry(cacheKey);
    if (cachedEntry) {
      setCacheHeaders(res);
      return res.json({
        ...cachedEntry.value,
        servedFromCache: true,
        cacheAgeSeconds: Math.max(0, Math.floor((Date.now() - cachedEntry.storedAt) / 1000)),
      });
    }

    const ip = getClientIp(req);
    const rl = rateLimit({ key: `area-report:${ip}`, limit: 30, windowMs: 60_000 });
    if (!rl.ok) {
      const retryAfterSeconds = Number.isFinite(rl.resetMs) ? Math.max(1, Math.ceil(rl.resetMs / 1000)) : 60;
      res.setHeader("Retry-After", String(retryAfterSeconds));
      setCacheHeaders(res, true);
      return res.status(429).json({
        ok: false,
        code: "RATE_LIMITED_LOCAL",
        message: "Too many requests.",
        retryAfterSeconds,
      });
    }

    const report = await getOrSetInflight(cacheKey, async () => {
      const data = await getAreaReport({ lat, lon, radius, from, to });
      setCache(cacheKey, data, CACHE_TTL_MS);
      return data;
    });

    setCacheHeaders(res);
    return res.json(report);
  } catch (err) {
    logDevError("area-report", err, { query: req.query });
    setCacheHeaders(res, true);
    const code = err?.status === 429 ? "RATE_LIMITED_UPSTREAM" : "UPSTREAM_ERROR";
    return sendError(res, 502, code, err?.message || "Provider failed.", err?.details || []);
  }
};
