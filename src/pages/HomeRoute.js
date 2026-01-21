import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { setMeta } from "../seo";
import { classifyQueryType, geocodeLocation, fetchCrimesForLocation } from "../services/existing";
import MapAnalyticsPanel from "../components/MapAnalyticsPanel";
import CrimeTable from "../components/CrimeTable";

export default function HomeRoute() {
  const navigate = useNavigate();

  const [location, setLocation] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM optional
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(null);
  const [statusLine, setStatusLine] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // simple throttle for geocoding calls (helps avoid rapid repeat clicks)
  const lastGeoMs = useRef(0);

  const canPreview = useMemo(() => Boolean((location || "").trim()), [location]);
  useEffect(() => {
    setMeta(
      "Crime & Safety Dashboard - Search tool",
      "Search by UK postcode or place name to view street-level crimes and 12-month trends."
    );
  }, []);

  async function fetchCrimes() {
    setError("");
    setResolved(null);
    setLoading(true);
    setData([]);
    setStatusLine("Resolving location...");
    setCategoryFilter("all");

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

      setStatusLine("Fetching latest crimes...");
      const crimes = await fetchCrimesForLocation(lat, lng, d);
      setData(Array.isArray(crimes) ? crimes : []);
      setStatusLine("Analyzing results...");
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setStatusLine("");
      setLoading(false);
    }
  }

  function openDedicatedPage() {
    setError("");
    const raw = (location || "").trim();
    if (!raw) return;

    const k = classifyQueryType(raw).kind; // recompute from trimmed input

    if (k === "postcode") {
      navigate(`/postcode/${encodeURIComponent(raw.toUpperCase())}`);
      return;
    }

    if (k === "place") {
      navigate(`/place/${encodeURIComponent(raw)}`);
      return;
    }

    setError("Dedicated pages currently support postcodes and place names (not lat,lng). Use a postcode or place name.");
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
          placeholder="Location (GL50 1AA, Plymouth, or 51.8994,-2.0783)"
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
        <button onClick={openDedicatedPage} disabled={loading || !canPreview}>
          See full report
        </button>
      </div>

      {canPreview && (
        <p className="hint">
          Tip: Postcodes like <code>GL50 1AA</code> resolve fastest. Place names use OpenStreetMap geocoding.
        </p>
      )}

      {resolved && (
        <p className="hint">
          Resolved to: <b>{resolved.lat.toFixed(6)}</b>, <b>{resolved.lng.toFixed(6)}</b> ({resolved.source})
        </p>
      )}

      {error && (
        <div className="error">
          <b>Error:</b> {error}
        </div>
      )}

      {loading && (
        <>
          {statusLine && <p className="statusLine">{statusLine}</p>}
          <div className="tableWrap">
            <table className="skeletonTable">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Street</th>
                  <th>Month</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`s-${idx}`}>
                    <td>
                      <div className="skeleton skeletonCell" />
                    </td>
                    <td>
                      <div className="skeleton skeletonCell" />
                    </td>
                    <td>
                      <div className="skeleton skeletonCell" />
                    </td>
                    <td>
                      <div className="skeleton skeletonCell" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.length > 0 && !loading && resolved && (
        <MapAnalyticsPanel
          crimes={data}
          center={{ lat: resolved.lat, lon: resolved.lng }}
          selectedCategory={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {data.length > 0 && !loading && (
        <CrimeTable
          crimes={data}
          selectedCategory={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      <p className="note footerLinks">
        <b>Sources:</b>{" "}
        <a href="https://data.police.uk/docs/" target="_blank" rel="noreferrer">
          UK Police API docs
        </a>{" "}
        {" | "}
        <a href="https://data.police.uk/" target="_blank" rel="noreferrer">
          data.police.uk
        </a>{" "}
        {" | "}
        <a
          href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
          target="_blank"
          rel="noreferrer"
        >
          Open Government Licence v3.0
        </a>
        <br />
        <b>Geocoding:</b> Postcodes.io (postcode lookup) and OpenStreetMap Nominatim (place search)
      </p>
    </div>
  );
}

