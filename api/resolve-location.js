const { randomUUID } = require("crypto");
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

function extractUKPostcode(text) {
  const match = String(text || "").match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  return match ? match[1] : "";
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

function sendError(res, status, requestId, inputNormalized, type, code, message, sources = []) {
  res.status(status).json({
    requestId,
    inputNormalized,
    type,
    displayName: "",
    canonicalSlug: "",
    lat: null,
    lng: null,
    confidence: 0,
    sources,
    errors: [message],
    error: { code, message },
  });
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

function normalizeInput(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
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
    return sendError(res, 405, randomUUID(), "", "place", "METHOD_NOT_ALLOWED", "Only GET is supported.");
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`resolve-location:${ip}`, 40, 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.resetMs / 1000)));
    return sendError(res, 429, randomUUID(), "", "place", "RATE_LIMITED", "Too many requests. Please try again soon.");
  }

  const requestId = randomUUID();
  const rawQuery = req.query.q;
  if (typeof rawQuery !== "string") {
    return sendError(res, 400, requestId, "", "place", "INVALID_QUERY", "Query parameter q must be a string.");
  }

  const q = rawQuery.trim();
  if (!q) {
    return sendError(res, 400, requestId, "", "place", "MISSING_QUERY", "Provide a location query.");
  }

  try {
    const inputNormalized = normalizeInput(q);
    const cacheKey = `resolve:${inputNormalized.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log("[resolve-location]", {
        requestId,
        rawQuery: q,
        inputNormalized,
        detectedType: cached.type,
        outcome: "success",
        provider: cached.sources?.[0] || "cache",
        cache: "hit",
      });
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
      return res.json({ requestId, ...cached });
    }

    if (isLikelyLatLngPair(q)) {
      try {
        const [a, b] = q.split(",").map((s) => s.trim());
        const lat = parseCoordinateToken(a, "lat");
        const lon = parseCoordinateToken(b, "lon");
        const payload = {
          inputNormalized,
          type: "latlng",
          displayName: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          canonicalSlug: slugify(`${lat}-${lon}`),
          lat,
          lng: lon,
          confidence: 1,
          sources: ["manual"],
        };
        setCache(cacheKey, payload, CACHE_TTL_MS);
        console.log("[resolve-location]", {
          requestId,
          rawQuery: q,
          inputNormalized,
          detectedType: "latlng",
          outcome: "success",
          provider: "manual",
        });
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
        return res.json({ requestId, ...payload });
      } catch (err) {
        console.log("[resolve-location]", {
          requestId,
          rawQuery: q,
          inputNormalized,
          detectedType: "latlng",
          outcome: "fail",
          provider: "manual",
          error: err.message,
        });
        return sendError(
          res,
          400,
          requestId,
          inputNormalized,
          "latlng",
          "INVALID_COORDS",
          err.message || "Invalid coordinates.",
          ["manual"]
        );
      }
    }

    const extractedPostcode = extractUKPostcode(q);
    if (extractedPostcode) {
      const encoded = encodeURIComponent(extractedPostcode);
      const url = `https://api.postcodes.io/postcodes/${encoded}`;
      const json = await fetchJsonOrThrow(url);
      if (!json || json.status !== 200 || !json.result) {
        console.log("[resolve-location]", {
          requestId,
          rawQuery: q,
          inputNormalized,
          detectedType: "postcode",
          outcome: "fail",
          provider: "postcodes.io",
          error: "Postcode not found.",
        });
        return sendError(
          res,
          404,
          requestId,
          inputNormalized,
          "postcode",
          "NOT_FOUND",
          "Postcode not found.",
          ["postcodes.io"]
        );
      }
      const payload = {
        inputNormalized,
        type: "postcode",
        displayName: json.result.postcode,
        adminArea: json.result.admin_district || json.result.region || "UK",
        canonicalSlug: slugify(`${json.result.postcode}-${json.result.admin_district || json.result.region || "uk"}`),
        lat: json.result.latitude,
        lng: json.result.longitude,
        confidence: 0.98,
        sources: ["postcodes.io"],
        postcode: json.result.postcode,
        district: json.result.admin_district,
        region: json.result.region,
      };
      setCache(cacheKey, payload, CACHE_TTL_MS);
      console.log("[resolve-location]", {
        requestId,
        rawQuery: q,
        inputNormalized,
        detectedType: "postcode",
        outcome: "success",
        provider: "postcodes.io",
      });
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
      return res.json({ requestId, ...payload });
    }

    const encoded = encodeURIComponent(q);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&namedetails=1&countrycodes=gb&viewbox=-8.6,60.9,1.8,49.8&bounded=1&q=${encoded}`;
    const results = await fetchJsonOrThrow(url, {
      "User-Agent": "crime-safety-dashboard/1.0 (https://crime-safety-dashboard.vercel.app)",
    });

    if (!Array.isArray(results) || results.length === 0) {
      console.log("[resolve-location]", {
        requestId,
        rawQuery: q,
        inputNormalized,
        detectedType: "place",
        outcome: "fail",
        provider: "nominatim",
        error: "No matching place found.",
      });
      return sendError(
        res,
        404,
        requestId,
        inputNormalized,
        "place",
        "NOT_FOUND",
        "No matching place found.",
        ["nominatim"]
      );
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
          inputNormalized,
          type: "place",
          displayName: topValid.displayName || topValid.name || q,
          canonicalSlug: topValid.canonicalSlug,
          lat: topValid.lat,
          lng: topValid.lon,
          confidence: Math.min(1, Math.max(0.2, topValid.score || 0)),
          sources: ["nominatim"],
          adminArea: topValid.adminArea,
        };
        setCache(cacheKey, payload, CACHE_TTL_MS);
        console.log("[resolve-location]", {
          requestId,
          rawQuery: q,
          inputNormalized,
          detectedType: "place",
          outcome: "success",
          provider: "nominatim",
        });
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
        return res.json({ requestId, ...payload });
      }
      const message =
        suggestions.length > 0
          ? "Multiple UK locations match this query. Please choose the intended place."
          : "No matching UK places found. Try a postcode for fastest results.";
      console.log("[resolve-location]", {
        requestId,
        rawQuery: q,
        inputNormalized,
        detectedType: "place",
        outcome: "ambiguous",
        provider: "nominatim",
      });
      const payload = {
        inputNormalized,
        type: "place",
        displayName: "",
        canonicalSlug: "",
        lat: null,
        lng: null,
        confidence: 0,
        sources: ["nominatim"],
        errors: [message],
        ambiguous: true,
        message,
        candidates: suggestions.map((item) => ({
          displayName: formatSuggestionDisplayName(item),
          adminArea: item.adminArea,
          lat: item.lat,
          lon: item.lon,
          canonicalSlug: item.canonicalSlug,
          query: item.query,
        })),
      };
      return res.json({ requestId, ...payload });
    }

    const payload = {
      inputNormalized,
      type: "place",
      displayName: top.displayName || top.name || q,
      canonicalSlug: top.canonicalSlug,
      lat: top.lat,
      lng: top.lon,
      confidence: Math.min(1, Math.max(0.2, top.score || 0)),
      sources: ["nominatim"],
      adminArea: top.adminArea,
    };
    setCache(cacheKey, payload, CACHE_TTL_MS);
    console.log("[resolve-location]", {
      requestId,
      rawQuery: q,
      inputNormalized,
      detectedType: "place",
      outcome: "success",
      provider: "nominatim",
    });
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
    return res.json({ requestId, ...payload });
  } catch (err) {
    const status = err.status || 500;
    logDevError("resolve-location", err, { query: q, status, requestId });
    console.log("[resolve-location]", {
      requestId,
      rawQuery: q,
      inputNormalized: normalizeInput(q),
      detectedType: "place",
      outcome: "fail",
      provider: "nominatim",
      error: err.message,
    });
    return sendError(
      res,
      status,
      requestId,
      normalizeInput(q),
      "place",
      "GEOCODE_FAILED",
      err.message || "Geocoding failed.",
      ["nominatim"]
    );
  }
};
