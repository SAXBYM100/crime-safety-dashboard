const { getCache, setCache } = require("./_utils/cache");
const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getAreaReport } = require("../lib/providerRegistry");

const CACHE_TTL_MS = 5 * 60 * 1000;

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sendError(res, status, code, message, details) {
  res.status(status).json({ error: { code, message, details } });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`area-report:${ip}`, 60, 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.resetMs / 1000)));
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please try again soon.");
  }

  const lat = parseNumber(req.query.lat);
  const lon = parseNumber(req.query.lon);
  const radius = parseNumber(req.query.radius) || 1000;
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";
  const name = typeof req.query.name === "string" ? req.query.name : "";

  if (lat === null || lon === null) {
    return sendError(res, 400, "INVALID_COORDS", "lat and lon must be valid numbers.");
  }

  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return sendError(res, 400, "OUT_OF_RANGE", "lat must be between -90 and 90, lon between -180 and 180.");
  }

  const cacheKey = `area:${lat.toFixed(5)}:${lon.toFixed(5)}:${radius}:${from}:${to}:${name}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.json(cached);
  }

  try {
    const report = await getAreaReport({ lat, lon, radius, from, to, name });
    setCache(cacheKey, report, CACHE_TTL_MS);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.json(report);
  } catch (err) {
    return sendError(res, 502, "PROVIDER_ERROR", err.message || "Provider failed.", err.details || []);
  }
};
