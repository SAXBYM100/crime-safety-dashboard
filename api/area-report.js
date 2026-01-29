// api/area-report.js
const { getCache, setCache } = require("./_utils/cache");
const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getAreaReport } = require("../lib/providerRegistry");
const { logDevError, sendError } = require("../lib/serverHttp");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  try {
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `area-report:${ip}`, limit: 30, windowMs: 60_000 });
    if (!rl.ok) {
      res.setHeader("Retry-After", Math.ceil((rl.resetAt - Date.now()) / 1000));
      return sendError(res, 429, "RATE_LIMITED", "Too many requests.");
    }

    const lat = Number(req.query?.lat);
    const lon = Number(req.query?.lon);
    const from = String(req.query?.from || "");
    const to = String(req.query?.to || "");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return sendError(res, 400, "INVALID_INPUT", "lat/lon required.");
    }

    const cacheKey = `area-report:${lat.toFixed(5)}:${lon.toFixed(5)}:${from}:${to}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const report = await getAreaReport({ lat, lon, from, to });
    setCache(cacheKey, report, 10 * 60 * 1000);

    return res.json(report);
  } catch (err) {
    logDevError("area-report", err, { query: req.query });
    return sendError(res, 502, "PROVIDER_ERROR", err?.message || "Provider failed.", err?.details || []);
  }
};
