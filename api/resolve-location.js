const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getCache, setCache } = require("./_utils/cache");
const { fetchWithRetry, logDevError } = require("../lib/serverHttp");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isLikelyLatLngPair(text) {
  const raw = String(text || "").trim();
  const parts = raw.split(",");
  if (parts.length !== 2) return false;
  const [a, b] = parts.map((p) => p.trim());
  if (!/\d/.test(a) || !/\d/.test(b)) return false;
  if (/[A-DF-PR-TV-Z]/i.test(raw)) return false;
  return true;
}

function isLikelyUKPostcode(text) {
  return /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test((text || "").trim());
}

function validateRange(value, kind) {
  if (kind === "lat" && (value < -90 || value > 90)) throw new Error("Latitude must be between -90 and 90.");
  if (kind === "lon" && (value < -180 || value > 180)) throw new Error("Longitude must be between -180 and 180.");
}

function parseCoordinateToken(token, kind) {
  const raw = (token || "").trim();
  if (!raw) throw new Error("Missing coordinate.");

  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  if (Number.isFinite(n)) {
    validateRange(n, kind);
    return n;
  }

  const upper = raw.toUpperCase();
  const hemiMatch = upper.match(/\b([NSEW])\b/) || upper.match(/([NSEW])\s*$/);
  const hemi = hemiMatch ? hemiMatch[1] : null;

  const cleaned = upper
    .replace(/[NSEW]/g, " ")
    .replace(/[^\d.\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length < 1 || parts.length > 3) {
    throw new Error("Use decimal (51.8994) or tokens (51 53 58 N).");
  }

  const deg = Number(parts[0]);
  const min = parts.length >= 2 ? Number(parts[1]) : 0;
  const sec = parts.length === 3 ? Number(parts[2]) : 0;

  if (![deg, min, sec].every(Number.isFinite)) throw new Error("Invalid coordinate numbers.");
  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) throw new Error("Minutes/seconds must be 0-59.");

  let sign = deg < 0 ? -1 : 1;
  if (hemi) sign = hemi === "S" || hemi === "W" ? -1 : 1;

  const value = sign * (Math.abs(deg) + min / 60 + sec / 3600);
  validateRange(value, kind);
  return value;
}

async function fetchJsonOrThrow(url, headers = {}) {
  const res = await fetchWithRetry(
    url,
    { headers: { Accept: "application/json", ...headers } },
    { timeoutMs: 5000, retries: 1, retryDelayMs: 250 }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `Request failed (HTTP ${res.status} ${res.statusText}).`;
    if (res.status === 400) msg += " Your input may be malformed.";
    if (res.status === 429) msg += " Rate limit hit. Try again shortly.";
    if (res.status === 503) msg += " Service busy. Try again soon.";
    if (body) msg += ` Details: ${body.slice(0, 160)}`;
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    const error = new Error("Failed to parse JSON response.");
    error.status = res.status;
    throw error;
  }
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
  const limit = rateLimit(`resolve-location:${ip}`, 40, 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.resetMs / 1000)));
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please try again soon.");
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    return sendError(res, 400, "MISSING_QUERY", "Provide a location query.");
  }

  try {
    const cacheKey = `resolve:${q.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
      return res.json(cached);
    }

    if (isLikelyLatLngPair(q)) {
      const [a, b] = q.split(",").map((s) => s.trim());
      const lat = parseCoordinateToken(a, "lat");
      const lon = parseCoordinateToken(b, "lon");
      const payload = { lat, lon, source: "manual" };
      setCache(cacheKey, payload, CACHE_TTL_MS);
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
      return res.json(payload);
    }

    if (isLikelyUKPostcode(q)) {
      const encoded = encodeURIComponent(q);
      const url = `https://api.postcodes.io/postcodes/${encoded}`;
      const json = await fetchJsonOrThrow(url);
      if (!json || json.status !== 200 || !json.result) {
        return sendError(res, 404, "NOT_FOUND", "Postcode not found.");
      }
      const payload = {
        lat: json.result.latitude,
        lon: json.result.longitude,
        source: "postcode",
        postcode: json.result.postcode,
        district: json.result.admin_district,
        region: json.result.region,
      };
      setCache(cacheKey, payload, CACHE_TTL_MS);
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
      return res.json(payload);
    }

    const encoded = encodeURIComponent(q);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encoded}`;
    const results = await fetchJsonOrThrow(url, {
      "User-Agent": "crime-safety-dashboard/1.0 (https://crime-safety-dashboard.vercel.app)",
    });

    if (!Array.isArray(results) || results.length === 0) {
      return sendError(res, 404, "NOT_FOUND", "No matching place found.");
    }
    const first = results[0];
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return sendError(res, 500, "BAD_GEOCODE", "Geocoder returned an invalid coordinate.");
    }
    const payload = { lat, lon, source: "place", name: first.display_name || q };
    setCache(cacheKey, payload, CACHE_TTL_MS);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
    return res.json(payload);
  } catch (err) {
    const status = err.status || 500;
    logDevError("resolve-location", err, { query: q, status });
    return sendError(res, status, "GEOCODE_FAILED", err.message || "Geocoding failed.");
  }
};
