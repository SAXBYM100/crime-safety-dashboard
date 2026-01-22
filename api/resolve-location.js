const { rateLimit, getClientIp } = require("./_utils/rateLimit");
const { getCache, setCache } = require("./_utils/cache");
const { fetchWithRetry, logDevError } = require("../lib/serverHttp");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEV_LOG = process.env.NODE_ENV !== "production";

const SETTLEMENT_TYPES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "suburb",
  "neighbourhood",
  "locality",
]);
const SUGGESTION_TYPES = new Set(["city", "town", "village"]);
const SUGGESTION_ADDRESSTYPES = new Set([
  "city",
  "town",
  "village",
  "county",
  "state_district",
]);

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

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeName(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAdminArea(address = {}) {
  return (
    address.county ||
    address.state ||
    address.region ||
    address.state_district ||
    address.country ||
    "UK"
  );
}

function buildCandidate(item) {
  const address = item.address || {};
  const namedetails = item.namedetails || {};
  const name =
    namedetails.name ||
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.neighbourhood ||
    (item.display_name ? item.display_name.split(",")[0] : "");
  const adminArea = pickAdminArea(address);
  const displayName = name && adminArea ? `${name}, ${adminArea}` : item.display_name || name;
  const canonicalSlug = slugify(`${name}-${adminArea}`);
  const query = displayName || item.display_name || name;
  return {
    name,
    displayName,
    adminArea,
    canonicalSlug,
    lat: Number(item.lat),
    lon: Number(item.lon),
    importance: Number(item.importance || 0),
    type: item.type || "",
    class: item.class || "",
    addresstype: item.addresstype || "",
    query,
  };
}

function isValidSuggestion(candidate) {
  if (!candidate) return false;
  if (SUGGESTION_TYPES.has(candidate.type)) return true;
  if (SUGGESTION_ADDRESSTYPES.has(candidate.addresstype)) return true;
  return candidate.class === "boundary" && candidate.type === "administrative";
}

function formatSuggestionDisplayName(candidate) {
  const primary = candidate.name || candidate.displayName || candidate.query;
  const adminArea = candidate.adminArea || "UK";
  if (!primary) return "";
  const suffix = /england/i.test(adminArea) ? adminArea : `${adminArea}, England`;
  return `${primary}, ${suffix}`;
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
        displayName: json.result.postcode,
        adminArea: json.result.admin_district || json.result.region || "UK",
        canonicalSlug: slugify(`${json.result.postcode}-${json.result.admin_district || json.result.region || "uk"}`),
      };
      setCache(cacheKey, payload, CACHE_TTL_MS);
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
      return res.json(payload);
    }

    const encoded = encodeURIComponent(q);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&namedetails=1&countrycodes=gb&viewbox=-8.6,60.9,1.8,49.8&bounded=1&q=${encoded}`;
    const results = await fetchJsonOrThrow(url, {
      "User-Agent": "crime-safety-dashboard/1.0 (https://crime-safety-dashboard.vercel.app)",
    });

    if (!Array.isArray(results) || results.length === 0) {
      return sendError(res, 404, "NOT_FOUND", "No matching place found.");
    }
    const normalizedQuery = normalizeName(q);
    const candidates = results
      .map(buildCandidate)
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));

    const scored = candidates
      .map((item) => {
        const nameMatch = normalizeName(item.name) === normalizedQuery;
        const settlementBoost = SETTLEMENT_TYPES.has(item.type) ? 0.08 : 0;
        const exactBoost = nameMatch ? 0.2 : 0;
        const importance = Number.isFinite(item.importance) ? item.importance : 0;
        const score = importance + settlementBoost + exactBoost;
        return { ...item, score, nameMatch };
      })
      .sort((a, b) => b.score - a.score);

    if (DEV_LOG) {
      console.log("[resolve-location] query", q, "candidates", scored.slice(0, 3));
    }

    const top = scored[0];
    const second = scored[1];
    const lowConfidence = !top || top.score < 0.2;
    const ambiguous = second && Math.abs(top.score - second.score) < 0.02 && top.name !== second.name;

    if (lowConfidence || ambiguous) {
      const suggestions = scored.filter(isValidSuggestion).slice(0, 3);
      const topValid = scored.find(isValidSuggestion);
      if (!suggestions.length && topValid && topValid.score >= 0.1) {
        const payload = {
          lat: topValid.lat,
          lon: topValid.lon,
          source: "place",
          name: topValid.displayName || topValid.name || q,
          displayName: topValid.displayName || topValid.name || q,
          adminArea: topValid.adminArea,
          canonicalSlug: topValid.canonicalSlug,
        };
        setCache(cacheKey, payload, CACHE_TTL_MS);
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
        return res.json(payload);
      }
      const payload = {
        ambiguous: true,
        message:
          suggestions.length > 0
            ? "Multiple UK locations match this query. Please choose the intended place."
            : "No matching UK places found. Try a postcode for fastest results.",
        candidates: suggestions.map((item) => ({
          displayName: formatSuggestionDisplayName(item),
          adminArea: item.adminArea,
          lat: item.lat,
          lon: item.lon,
          canonicalSlug: item.canonicalSlug,
          query: item.query,
        })),
      };
      return res.json(payload);
    }

    const payload = {
      lat: top.lat,
      lon: top.lon,
      source: "place",
      name: top.displayName || top.name || q,
      displayName: top.displayName || top.name || q,
      adminArea: top.adminArea,
      canonicalSlug: top.canonicalSlug,
    };
    setCache(cacheKey, payload, CACHE_TTL_MS);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
    return res.json(payload);
  } catch (err) {
    const status = err.status || 500;
    logDevError("resolve-location", err, { query: q, status });
    return sendError(res, status, "GEOCODE_FAILED", err.message || "Geocoding failed.");
  }
};
