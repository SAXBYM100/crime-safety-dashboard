const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getCacheEntry } = require("./_utils/cache");
const { fetchTrend, getTrendCacheKey } = require("./_utils/trendsCore");

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

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." } });
  }

  const ip = getClientIp(req);
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: { code: "INVALID_COORDS", message: "lat and lon must be valid numbers." } });
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: { code: "OUT_OF_RANGE", message: "lat must be between -90 and 90, lon between -180 and 180." } });
  }

  const cacheKey = getTrendCacheKey(lat, lon);
  const cachedEntry = getCacheEntry(cacheKey);
  if (cachedEntry) {
    return sendPayload(
      res,
      {
        ok: true,
        ...cachedEntry.value,
        servedFromCache: true,
        cacheAgeSeconds: Math.max(0, Math.floor((Date.now() - cachedEntry.storedAt) / 1000)),
      },
      200
    );
  }

  const limit = rateLimit(`trends:${ip}`, 40, 60 * 1000);
  if (!limit.allowed) {
    const retryAfterSeconds = Number.isFinite(limit.resetMs)
      ? Math.max(1, Math.ceil(limit.resetMs / 1000))
      : 60;
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return sendPayload(
      res,
      { ok: false, code: "RATE_LIMITED_LOCAL", trend: "unknown", rows: [], retryAfterSeconds },
      429,
      true
    );
  }

  const data = await fetchTrend(lat, lon);
  return sendPayload(res, data);
};
