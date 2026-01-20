// Client-side data access helpers that call the serverless /api routes.

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
  if (kind === "lng" && (value < -180 || value > 180)) throw new Error("Longitude must be between -180 and 180.");
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

async function fetchJsonOrThrow(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `Request failed (HTTP ${res.status} ${res.statusText}).`;
    if (res.status === 400) msg += " Your input may be malformed.";
    if (res.status === 429) msg += " Rate limit hit. Wait a moment and try again.";
    if (res.status === 503) msg += " Service busy. Try again soon.";
    if (body) msg += ` Details: ${body.slice(0, 160)}`;
    throw new Error(msg);
  }
  return res.json();
}

export async function geocodeLocation(query) {
  const q = (query || "").trim();
  if (!q) throw new Error("Enter a location (postcode, place name, or lat,lng).");

  if (isLikelyLatLngPair(q)) {
    const [a, b] = q.split(",").map((s) => s.trim());
    const lat = parseCoordinateToken(a, "lat");
    const lng = parseCoordinateToken(b, "lng");
    return { lat, lng, source: "manual" };
  }

  const url = `/api/resolve-location?q=${encodeURIComponent(q)}`;
  const json = await fetchJsonOrThrow(url);
  if (!json || typeof json.lat !== "number" || typeof json.lon !== "number") {
    throw new Error("Location lookup failed. Try a different query.");
  }
  return { lat: json.lat, lng: json.lon, source: json.source || "lookup", name: json.name };
}

export async function geocodePostcode(postcode) {
  return geocodeLocation(postcode);
}

export async function geocodePlaceName(placeName) {
  return geocodeLocation(placeName);
}

export async function fetchAreaReport({ lat, lng, radius = 1000, from = "", to = "", name = "" }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    radius: String(radius),
  });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (name) params.set("name", name);

  const url = `/api/area-report?${params.toString()}`;
  return fetchJsonOrThrow(url);
}

export async function fetchCrimesForLocation(lat, lng, dateYYYYMM = "") {
  const report = await fetchAreaReport({
    lat,
    lng,
    radius: 1000,
    from: dateYYYYMM,
    to: dateYYYYMM,
  });
  return Array.isArray(report?.crimes) ? report.crimes : [];
}

export function classifyQueryType(input) {
  const q = String(input || "").trim();
  if (!q) return { kind: "empty" };
  if (isLikelyLatLngPair(q)) return { kind: "latlng" };
  if (isLikelyUKPostcode(q)) return { kind: "postcode" };
  return { kind: "place" };
}
