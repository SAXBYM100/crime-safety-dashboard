import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import { setMeta } from "../seo";
import { classifyQueryType, geocodeLocation } from "../services/existing";
import MapAnalyticsPanel from "../components/MapAnalyticsPanel";
import CrimeTable from "../components/CrimeTable";
import { getAreaProfile, getSourcesSummary } from "../data";

export default function HomeRoute() {
  const navigate = useNavigate();
  const locationState = useLocation();

  const [location, setLocation] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM optional
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(null);
  const [statusLine, setStatusLine] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourcesSummary, setSourcesSummary] = useState({ lastUpdated: null, sourcesText: "" });
  const [subtitle, setSubtitle] = useState("");
  const [ambiguousCandidates, setAmbiguousCandidates] = useState([]);
  const [canonicalSlug, setCanonicalSlug] = useState("");

  // simple throttle for geocoding calls (helps avoid rapid repeat clicks)
  const lastGeoMs = useRef(0);
  const lastQueryRef = useRef("");
  const lastMonthRef = useRef("");

  const canPreview = useMemo(() => Boolean((location || "").trim()), [location]);
  useEffect(() => {
    setMeta(
      "AreaIQ - Location Intelligence Console",
      "Generate professional safety and risk briefings for any UK postcode, city, or coordinate."
    );
  }, []);

  async function fetchCrimes(nextLocation = location, nextDate = date) {
    setError("");
    setResolved(null);
    setLoading(true);
    setData([]);
    setStatusLine("Resolving location...");
    setCategoryFilter("all");
    setAmbiguousCandidates([]);

    const d = String(nextDate || "").trim();
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

      const raw = String(nextLocation || "").trim();
      const kind = classifyQueryType(raw).kind;
      if (kind === "empty") {
        setError("Enter a location to search.");
        setLoading(false);
        return;
      }
      const queryKind = kind === "latlng" ? "latlng" : kind === "postcode" ? "postcode" : "place";
      const profile = await getAreaProfile(
        { kind: queryKind, value: raw },
        { dateYYYYMM: d, onStatus: setStatusLine }
      );
      if (profile.geo?.lat != null && profile.geo?.lon != null) {
        setResolved({ lat: profile.geo.lat, lng: profile.geo.lon, source: profile.query.kind });
      }
      if (profile.canonicalSlug) {
        setCanonicalSlug(profile.canonicalSlug);
      }
      setData(Array.isArray(profile.safety.latestCrimes) ? profile.safety.latestCrimes : []);
      setSourcesSummary(getSourcesSummary(profile));
      const label = profile.canonicalName || raw;
      const monthLabel = d ? d : "Latest";
      setSubtitle(`Safety insights for ${label} | ${monthLabel} | Official UK Police data`);
      if (profile.safety.errors?.crimes) {
        setError(profile.safety.errors.crimes);
      }
    } catch (e) {
      if (e?.code === "AMBIGUOUS" && Array.isArray(e.candidates)) {
        setAmbiguousCandidates(e.candidates);
        setError(e.message || "Multiple matches found. Please choose the intended place.");
      } else {
        setError(e.message || "Something went wrong.");
      }
    } finally {
      setStatusLine("");
      setLoading(false);
    }
  }

  async function openDedicatedPage() {
    setError("");
    const raw = (location || "").trim();
    if (!raw) return;

    const k = classifyQueryType(raw).kind; // recompute from trimmed input

    if (k === "postcode") {
      navigate(`/postcode/${encodeURIComponent(raw.toUpperCase())}`);
      return;
    }

    if (k === "place") {
      try {
        const geo = await geocodeLocation(raw);
        const slug = geo.canonicalSlug || encodeURIComponent(raw);
        navigate(`/place/${slug}`);
      } catch (e) {
        if (e?.code === "AMBIGUOUS" && Array.isArray(e.candidates)) {
          setAmbiguousCandidates(e.candidates);
          setError(e.message || "Multiple matches found. Please choose the intended place.");
        } else {
          setError(e.message || "Unable to resolve that place.");
        }
      }
      return;
    }

    setError("Dedicated pages currently support postcodes and place names (not lat,lng). Use a postcode or place name.");
  }

  const reportLink = useMemo(() => {
    const raw = (location || "").trim();
    if (!raw) return "";
    const kind = classifyQueryType(raw).kind;
    const queryKind = kind === "latlng" ? "latlng" : kind === "postcode" ? "postcode" : "place";
    return `/report?kind=${encodeURIComponent(queryKind)}&q=${encodeURIComponent(raw)}`;
  }, [location]);

  function applyCandidate(candidate) {
    if (!candidate) return;
    const nextQuery = candidate.query || candidate.displayName || "";
    if (!nextQuery) return;
    setLocation(nextQuery);
    fetchCrimes(nextQuery, date);
  }

  useEffect(() => {
    const params = new URLSearchParams(locationState.search || "");
    const q = (params.get("q") || "").trim();
    const m = (params.get("month") || "").trim();
    if (!q) return;
    if (q === lastQueryRef.current && m === lastMonthRef.current) return;
    setLocation(q);
    if (m) setDate(m);
    lastQueryRef.current = q;
    lastMonthRef.current = m;
    fetchCrimes(q, m || date);
  }, [locationState.search, date]);

  return (
    <div className="contentWrap pageShell appShell">
      <section className="consoleHeaderCard">
        <img
          className="heroImg"
          src={`${process.env.PUBLIC_URL}/brand/area-iq-mark.svg`}
          alt="Area IQ logo"
        />
        <div>
          <h1>AreaIQ - Location Intelligence Console</h1>
          <p className="sub">
            Generate professional safety and risk briefings for any UK postcode, city, or coordinate.
          </p>
        </div>
      </section>

      <section className="consoleCard">
        <div className="consoleCardHeader">
          <h2>Build an intelligence brief</h2>
          <p>{subtitle || "Enter a postcode, place, or lat,lng to generate a safety snapshot."}</p>
        </div>

        <div className="briefForm">
          <div className="briefField">
            <input
              type="text"
              placeholder="Location (GL50 1AA, Plymouth, or 51.8994,-2.0783)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="briefField briefField--month">
            <input
              type="text"
              placeholder="Month optional (YYYY-MM)"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="briefActions">
            <button onClick={fetchCrimes} disabled={loading} className="primaryButton">
              {loading ? "Loading..." : "Search"}
            </button>
          </div>
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

        {ambiguousCandidates.length > 0 && (
          <div className="hint">
            <p>Did you mean:</p>
            <div className="briefActions">
              {ambiguousCandidates.map((candidate) => (
                <button
                  key={`${candidate.displayName}-${candidate.lat}-${candidate.lon}`}
                  type="button"
                  className="ghostButton"
                  onClick={() => applyCandidate(candidate)}
                >
                  {candidate.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="outputTypeRow">
          <span className="outputLabel">Output type</span>
          <div className="outputOptions">
            <button
              type="button"
              className={`outputOption ${canPreview ? "outputOption--active" : "outputOption--muted"}`}
              onClick={fetchCrimes}
              disabled={loading || !canPreview}
            >
              Quick Brief (Free)
            </button>
            <button
              type="button"
              className={`outputOption ${canPreview ? "outputOption--active outputOption--action" : "outputOption--muted"}`}
              onClick={openDedicatedPage}
              disabled={loading || !canPreview}
            >
              View Intelligence Report
            </button>
            <button type="button" className="outputOption outputOption--disabled outputOption--muted">
              Full Intelligence Report <span className="outputBadge">Pro</span>
            </button>
          </div>
        </div>
      </section>

      {resolved && reportLink && !loading && !error && (
        <div style={{ marginBottom: 16 }}>
          <Link to={reportLink} className="primaryButton">
            Download Area Report
          </Link>
        </div>
      )}
      {!resolved && (
        <p className="hint">
          Explore client-ready briefs in the <Link to="/pro">Pro section</Link>.
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

      <details className="methodologyPanel">
        <summary>Methodology &amp; Data Sources</summary>
        <div className="methodologyBody">
          {sourcesSummary.sourcesText && (
            <p className="sourceLine">
              Last updated:{" "}
              {sourcesSummary.lastUpdated ? new Date(sourcesSummary.lastUpdated).toLocaleDateString() : "Pending"}{" "}
              | Sources: {sourcesSummary.sourcesText}
            </p>
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
      </details>

      <div className="proFooterCta">
        <span>Need client-ready or investor-grade safety reports? Upgrade to</span>
        <Link to="/pro">AreaIQ Pro</Link>
      </div>
    </div>
  );
}

