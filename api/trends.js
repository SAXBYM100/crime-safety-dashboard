const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { fetchTrend, CACHE_TTL_MS } = require("./_utils/trendsCore");

function sendPayload(res, payload) {
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json(payload);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." } });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`trends:${ip}`, 40, 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.resetMs / 1000)));
    return sendPayload(res, { ok: false, code: "RATE_LIMITED", trend: "unknown", rows: [] });
  }

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: { code: "INVALID_COORDS", message: "lat and lon must be valid numbers." } });
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: { code: "OUT_OF_RANGE", message: "lat must be between -90 and 90, lon between -180 and 180." } });
  }

  const data = await fetchTrend(lat, lon);
  return sendPayload(res, data);
};
