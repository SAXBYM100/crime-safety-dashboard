
function isLikelyLatLngPair(text) {
  return /^\s*.+\s*,\s*.+\s*$/.test(text);
}

function isLikelyUKPostcode(text) {
  return /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test((text || "").trim());
}

function validateRange(value, kind) {
  if (kind === "lat" && (value < -90 || value > 90)) throw new Error("Latitude must be between -90 and 90.");
  if (kind === "lng" && (value < -180 || value > 180)) throw new Error("Longitude must be between -180 and 180.");
}

// Parse either decimal or tokenised DMS (e.g. "51 53 58 N" or "-2.0783" or "2 04 42 W")
function parseCoordinateToken(token, kind) {
  const raw = (token || "").trim();
  if (!raw) throw new Error("Missing coordinate.");

  // Decimal first
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  if (Number.isFinite(n)) {
    validateRange(n, kind);
    return n;
  }

  // Tokenised DMS: deg [min] [sec] [N/S/E/W]
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
  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) throw new Error("Minutes/seconds must be 0–59.");

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
    if (res.status === 429) msg += " Rate limit hit — wait 10–30 seconds and try again.";
    if (res.status === 503) msg += " Service busy / too many results — try a different month or location.";
    if (body) msg += ` Details: ${body.slice(0, 160)}`;
    throw new Error(msg);
  }
  return res.json();
}

export async function geocodeLocation(query) {
  const q = (query || "").trim();
  if (!q) throw new Error("Enter a location (postcode, place name, or lat,lng).");

  // 1) Lat/Lng pair: "a,b"
  if (isLikelyLatLngPair(q)) {
    const [a, b] = q.split(",").map((s) => s.trim());
    const lat = parseCoordinateToken(a, "lat");
    const lng = parseCoordinateToken(b, "lng");
    return { lat, lng, source: "manual" };
  }

  // 2) Postcode -> Postcodes.io
  if (isLikelyUKPostcode(q)) {
    const encoded = encodeURIComponent(q);
    const url = `https://api.postcodes.io/postcodes/${encoded}`;
    const json = await fetchJsonOrThrow(url);
    if (!json || json.status !== 200 || !json.result) {
      throw new Error("Postcode not found. Try a full UK postcode like GL50 1AA.");
    }
    return { lat: json.result.latitude, lng: json.result.longitude, source: "postcode" };
  }

  // 3) Place name -> Nominatim
  const encoded = encodeURIComponent(q);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encoded}`;
  const results = await fetchJsonOrThrow(url);

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No matching place found. Try adding a town/city, or use a postcode.");
  }
  const first = results[0];
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Geocoder returned an invalid coordinate.");
  return { lat, lng, source: "place" };
}

export async function geocodePostcode(postcode) {
  const encoded = encodeURIComponent(postcode);
  const url = `https://api.postcodes.io/postcodes/${encoded}`;
  const json = await fetchJsonOrThrow(url);
  if (!json || json.status !== 200 || !json.result) throw new Error("Postcode not found.");
  return { lat: json.result.latitude, lng: json.result.longitude, source: "postcode" };
}

export async function geocodePlaceName(placeName) {
  const encoded = encodeURIComponent(placeName);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encoded}`;
  const results = await fetchJsonOrThrow(url);
  if (!Array.isArray(results) || results.length === 0) throw new Error("No matching place found.");
  const first = results[0];
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Geocoder returned an invalid coordinate.");
  return { lat, lng, source: "place" };
}

// ✅ Updated: Police API 404 often means “no data”, so return []
export async function fetchCrimesForLocation(lat, lng, dateYYYYMM = "") {
  const url = new URL("https://data.police.uk/api/crimes-street/all-crime");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  if (dateYYYYMM) url.searchParams.set("date", dateYYYYMM);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });

  if (res.status === 404) return [];

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `Police API ${res.status}`;
    if (body) msg += `: ${body.slice(0, 160)}`;
    throw new Error(msg);
  }

  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

export function classifyQueryType(input) {
  const q = String(input || "").trim();
  if (!q) return { kind: "empty" };
  if (isLikelyLatLngPair(q)) return { kind: "latlng" };
  if (isLikelyUKPostcode(q)) return { kind: "postcode" };
  return { kind: "place" };
}
