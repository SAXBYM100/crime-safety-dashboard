const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { fetchTrend } = require("./_utils/trendsCore");

function sendPayload(res, payload) {
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json(payload);
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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is supported." } });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`trends-batch:${ip}`, 12, 60 * 1000);
  if (!limit.allowed) {
    const body = await readBody(req);
    const points = Array.isArray(body?.points) ? body.points : [];
    const results = {};
    points.forEach((p) => {
      if (p?.key) {
        results[p.key] = { ok: false, code: "RATE_LIMITED", trend: "unknown", rows: [] };
      }
    });
    return sendPayload(res, { results, partial: true });
  }

  const body = await readBody(req);
  const points = Array.isArray(body?.points) ? body.points : [];
  if (!points.length) {
    return res.status(400).json({ error: { code: "INVALID_POINTS", message: "points is required." } });
  }

  const results = {};
  let partial = false;

  await Promise.all(points.map(async (point) => {
    const key = String(point?.key || "").trim();
    const lat = Number(point?.lat);
    const lon = Number(point?.lon);
    if (!key || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      results[key || `invalid-${Math.random().toString(36).slice(2, 7)}`] = {
        ok: false,
        code: "INVALID_POINT",
        trend: "unknown",
        rows: [],
      };
      partial = true;
      return;
    }
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      results[key] = { ok: false, code: "OUT_OF_RANGE", trend: "unknown", rows: [] };
      partial = true;
      return;
    }

    const data = await fetchTrend(lat, lon);
    if (!data.ok) partial = true;
    results[key] = data;
  }));

  return sendPayload(res, { results, partial });
};
