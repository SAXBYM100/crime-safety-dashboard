import React, { useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Accept location as:
 *  - UK postcode (e.g. GL50 1AA)
 *  - Place name (e.g. Plymouth)
 *  - Lat/Lng pair (e.g. 51.8994,-2.0783)
 *  - Lat/Lng pair in DMS-like tokens (e.g. "51 53 58 N, 2 04 42 W")
 *
 * Geocoding:
 *  - Postcodes.io for postcodes (no key required)
 *  - Nominatim (OpenStreetMap) for place name search (light use)
 *
 * Crime data:
 *  - UK Police Data API: street-level crimes for a point + optional YYYY-MM month
 */

function isLikelyLatLngPair(text) {
  return /^\s*.+\s*,\s*.+\s*$/.test(text);
}

function isLikelyUKPostcode(text) {
  return /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test((text || "").trim());
}

// Parse either decimal or tokenised DMS (e.g. "51 53 58 N" or "-2.0783" or "2 04 42 W")
function parseCoordinateToken(token, kind) {
  const raw = (token || "").trim();
  if (!raw) throw new Error("Missing coordinate.");

  // Decimal first (allow comma as decimal separator when no dot)
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

function validateRange(value, kind) {
  if (kind === "lat" && (value < -90 || value > 90)) throw new Error("Latitude must be between -90 and 90.");
  if (kind === "lng" && (value < -180 || value > 180)) throw new Error("Longitude must be between -180 and 180.");
}

async function fetchJsonOrThrow(url) {
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
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

async function geocodeLocation(query) {
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

export default function App() {
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM optional
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(null);

  // simple throttle for geocoding calls (helps avoid rapid repeat clicks)
  const lastGeoMs = useRef(0);

  const canPreview = useMemo(() => Boolean((location || "").trim()), [location]);

  async function fetchCrimes() {
    setError("");
    setResolved(null);
    setLoading(true);
    setData([]);

    const d = date.trim();
    if (d && !/^\d{4}-\d{2}$/.test(d)) {
      setLoading(false);
      setError('Date must be YYYY-MM (e.g. "2024-01") or left blank.');
      return;
    }

    try {
      // throttle: 1 request per second max for geocoding
      const now = Date.now();
      const wait = Math.max(0, 1000 - (now - lastGeoMs.current));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastGeoMs.current = Date.now();

      const { lat, lng, source } = await geocodeLocation(location);
      setResolved({ lat, lng, source });

      const url = new URL("https://data.police.uk/api/crimes-street/all-crime");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      if (d) url.searchParams.set("date", d);

      const crimes = await fetchJsonOrThrow(url.toString());
      setData(Array.isArray(crimes) ? crimes : []);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <header className="hero">
        <img className="heroImg" src={process.env.PUBLIC_URL + "/hero.svg"} alt="Map pin illustration" />
        <div>
          <h1>Crime &amp; Safety Dashboard</h1>
          <p className="sub">
            Search by <b>postcode</b>, <b>place name</b>, or <b>lat,lng</b> to explore street-level crime data.
          </p>
        </div>
      </header>

      <div className="form">
        <input
          type="text"
          placeholder="Location (PL50 1AA, Plymouth, or 51.8994,-2.0783)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          type="text"
          placeholder="Month optional (YYYY-MM)"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button onClick={fetchCrimes} disabled={loading}>
          {loading ? "Loading..." : "Fetch crimes"}
        </button>
      </div>

      {canPreview && (
        <p className="hint">
          Tip: Postcodes like <code>PL50 1AA</code> resolve fastest. Place names use OpenStreetMap geocoding.
        </p>
      )}

      {resolved && (
        <p className="hint">
          Resolved to: <b>{resolved.lat.toFixed(6)}</b>, <b>{resolved.lng.toFixed(6)}</b> ({resolved.source})
        </p>
      )}

      {error && <div className="error"><b>Error:</b> {error}</div>}

      {data.length > 0 && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Street</th>
                <th>Month</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((crime) => (
                <tr key={crime.id}>
                  <td>{crime.category}</td>
                  <td>{crime.location?.street?.name || "Unknown"}</td>
                  <td>{crime.month || "Unknown"}</td>
                  <td>{crime.outcome_status?.category || "None recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="note footerLinks">
        <b>Sources:</b>{" "}
        <a href="https://data.police.uk/docs/" target="_blank" rel="noreferrer">UK Police API docs</a>{" "}
        · <a href="https://data.police.uk/" target="_blank" rel="noreferrer">data.police.uk</a>{" "}
        · <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer">Open Government Licence v3.0</a>
        <br />
        <b>Geocoding:</b> Postcodes.io (postcode lookup) and OpenStreetMap Nominatim (place search)
      </p>
    </div>
  );
}
