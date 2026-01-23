import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { setMeta } from "../seo";
import TrendChart from "../components/TrendChart";
import { computeSafetyScore, summarizeTrend, getTopCategories } from "../analytics/safetyScore";
import { getCategoryDeltas, getTopDrivers, trendTakeaway } from "../analytics/trendAnalysis";
import MapAnalyticsPanel from "../components/MapAnalyticsPanel";
import CrimeTable from "../components/CrimeTable";
import SafetyGauge from "../components/SafetyGauge";
import { getAreaProfile, getSourcesSummary } from "../data";
import { pickPrimaryName, toTitleCase } from "../utils/text";

export default function PlacePage() {
  const params = useParams();
  const navigate = useNavigate();

  // Decode and de-slugify (supports old style /place/plymouth and /place/Plymouth)
  const placeName = useMemo(() => {
    const raw = decodeURIComponent(params.placeName || "");
    return raw.replace(/-/g, " ").trim();
  }, [params.placeName]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState("");
  const [trendError, setTrendError] = useState("");
  const [crimesError, setCrimesError] = useState("");
  const [resolved, setResolved] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [latestCrimes, setLatestCrimes] = useState([]);
  const [trend, setTrend] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourcesSummary, setSourcesSummary] = useState({ lastUpdated: null, sourcesText: "" });
  const [ambiguousCandidates, setAmbiguousCandidates] = useState([]);
  const requestRef = useRef(0);

  useEffect(() => {
    setMeta(
      `${placeName} Crime Rate & Statistics (Updated Monthly) | Crime & Safety`,
      `Explore recent crime statistics in ${placeName}, including offence types, locations, outcomes, and a 12-month crime trend based on official UK police data.`
    );
  }, [placeName]);

  function chooseCandidate(candidate) {
    if (!candidate) return;
    const slug = candidate.canonicalSlug || encodeURIComponent(candidate.query || candidate.displayName || "");
    if (!slug) return;
    navigate(`/place/${slug}`);
  }

  useEffect(() => {
    async function run() {
      const requestSeq = ++requestRef.current;
      setStatus("loading");
      setError("");
      setTrendError("");
      setCrimesError("");
      setResolved(null);
      setDisplayName("");
      setLatestCrimes([]);
      setTrend(null);
      setAmbiguousCandidates([]);
      setStatusLine("Resolving location...");

      try {
        const nextProfile = await getAreaProfile(
          { kind: "place", value: placeName },
          { onStatus: setStatusLine }
        );
        if (requestSeq !== requestRef.current) return;
        if (nextProfile.geo?.lat != null && nextProfile.geo?.lon != null) {
          setResolved({ lat: nextProfile.geo.lat, lng: nextProfile.geo.lon });
        }
        const primaryName = pickPrimaryName(nextProfile.displayName || nextProfile.canonicalName);
        setDisplayName(toTitleCase(primaryName));
        setLatestCrimes(nextProfile.safety.latestCrimes || []);
        setTrend(nextProfile.safety.trend || null);
        setCrimesError(nextProfile.safety.errors?.crimes || "");
        setTrendError(nextProfile.safety.errors?.trend || "");
        setSourcesSummary(getSourcesSummary(nextProfile));
        setStatus("ready");
        setStatusLine("");
      } catch (e) {
        if (requestSeq !== requestRef.current) return;
        if (e?.code === "AMBIGUOUS" && Array.isArray(e.candidates)) {
          setAmbiguousCandidates(e.candidates);
          setError(e.message || "Multiple matches found. Please choose the intended place.");
        } else {
          setError(String(e?.message || e));
        }
        setDisplayName("");
        setStatus("error");
        setStatusLine("");
      }
    }

    run();
  }, [placeName]);

  return (
    <div className="App">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <h1>{displayName ? `${displayName} Crime Statistics` : "Location report"}</h1>

        {status === "loading" && (
          <>
            {statusLine && <p className="statusLine">{statusLine}</p>}
            <div className="skeletonGrid">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div className="skeleton skeletonCard" key={`card-${idx}`} />
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="skeleton skeletonLine" style={{ width: "40%" }} />
              <div className="skeleton skeletonLine" style={{ width: "100%", height: 160, borderRadius: 12 }} />
            </div>
            <div style={{ marginTop: 22 }}>
              <div className="skeleton skeletonLine" style={{ width: "35%" }} />
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
                      <tr key={`row-${idx}`}>
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
            </div>
          </>
        )}
        {status === "error" && (
          <div>
            <p style={{ color: "crimson" }}>
              {error || "Something went wrong loading this report."}
            </p>
            {ambiguousCandidates.length > 0 && (
              <div className="impactGrid impactGrid--drivers">
                {ambiguousCandidates.map((candidate) => (
                  <button
                    key={`${candidate.displayName}-${candidate.lat}-${candidate.lon}`}
                    type="button"
                    className="impactCard"
                    onClick={() => chooseCandidate(candidate)}
                  >
                    <div className="summaryLabel">Did you mean</div>
                    <div className="summaryValue">{candidate.displayName}</div>
                    <div className="impactMeta">{candidate.adminArea || "UK"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "ready" && (
          <>
            {resolved && (
              <p style={{ opacity: 0.75 }}>
                Resolved to: <b>{resolved.lat.toFixed(6)}</b>, <b>{resolved.lng.toFixed(6)}</b>
              </p>
            )}
            {sourcesSummary.sourcesText && (
              <p className="sourceLine">
                Last updated: {sourcesSummary.lastUpdated ? new Date(sourcesSummary.lastUpdated).toLocaleDateString() : "Pending"} • Sources:{" "}
                {sourcesSummary.sourcesText}
              </p>
            )}
            <div style={{ marginBottom: 16 }}>
              <Link to={`/report?kind=place&q=${encodeURIComponent(placeName)}`} className="primaryButton">
                Download Area Report
              </Link>
            </div>

            {(() => {
              const safety = computeSafetyScore(latestCrimes, trend?.rows || []);
              const trendSummary = summarizeTrend(trend?.rows || []);
              const topCats = getTopCategories(latestCrimes, 3);
              const deltas = getCategoryDeltas(trend?.rows || []);
              const deltaMap = new Map(deltas.map((d) => [d.category, d.delta]));
              const drivers = getTopDrivers(trend?.rows || [], 3);
              return (
                <>
                  <div className="summaryBar">
                    <div className="summaryCard">
                      <div className="scoreCardRow">
                        <div>
                          <div className="summaryLabel">Composite Safety Index</div>
                          <div className="summaryValue">
                            {safety.score !== null ? safety.score : "—"}
                          </div>
                          <div className="summaryMeta">out of 100</div>
                          <div className="summaryMeta">{safety.label}</div>
                        </div>
                        <SafetyGauge score={safety.score} label={safety.label} />
                      </div>
                    </div>
                    <div className="summaryCard">
                      <div className="summaryLabel">Trend</div>
                      <div className="summaryValue">{trendSummary.direction}</div>
                      <div className="summaryMeta">
                        {trendSummary.changePct !== null
                          ? `${trendSummary.changePct > 0 ? "+" : ""}${trendSummary.changePct.toFixed(
                              1
                            )}% (last 3 vs prior 3)`
                          : "Not enough data yet"}
                      </div>
                    </div>
                    <div className="summaryCard">
                      <div className="summaryLabel">Benchmarks</div>
                      <div className="summaryValue">City compare</div>
                      <div className="summaryMeta">Coming soon</div>
                    </div>
                    <div className="summaryCard">
                      <div className="summaryLabel">Risk</div>
                      <div className="summaryValue">
                        <span className="summaryBadge">Flood risk</span>
                      </div>
                      <div className="summaryMeta">Data integration in progress</div>
                    </div>
                    <div className="summaryCard">
                      <div className="summaryLabel">Property</div>
                      <div className="summaryValue">Avg price</div>
                      <div className="summaryMeta">Pending Land Registry data</div>
                    </div>
                  </div>

                  <details className="summaryExplain">
                    <summary>How we calculate the safety score</summary>
                    <p>
                      We apply category weights (e.g. violent crime &gt; theft &gt; anti-social behaviour),
                      then adjust for recent trend direction and volatility. Higher weighted incident volume,
                      rising trends, and spiky months reduce the score. This is a transparent indicator, not a
                      definitive safety rating.
                    </p>
                  </details>

                  {topCats.length > 0 && (
                    <div className="impactGrid">
                      {topCats.map((cat) => {
                        const delta = deltaMap.get(cat.category) || 0;
                        return (
                          <button
                            type="button"
                            className="impactCard"
                            key={cat.category}
                            onClick={() => setCategoryFilter(cat.category)}
                          >
                            <div className="summaryLabel">Category impact</div>
                            <div className="summaryValue">{cat.category.replace(/-/g, " ")}</div>
                            <div className="impactMeta">
                              {cat.share}% share •{" "}
                              {delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} MoM`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {drivers.length > 0 && (
                    <div className="summaryExplain">
                      Drivers of change:{" "}
                      {drivers.map((d) => (
                        <span key={d.category} style={{ marginRight: 8 }}>
                          {d.category.replace(/-/g, " ")} ({d.delta > 0 ? "+" : ""}
                          {d.delta})
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* SEO copy + user trust */}
            <p style={{ maxWidth: 760, lineHeight: 1.6, opacity: 0.9 }}>
              This page provides an overview of recent crime activity in <b>{placeName}</b>, using official
              street-level data published by UK police forces. The report includes reported incidents by
              category, location, and outcome, along with a 12-month trend to highlight changes over time.
            </p>

            <p style={{ maxWidth: 760, lineHeight: 1.6, opacity: 0.9 }}>
              Crime data is updated monthly and may vary depending on reporting delays. Months with no recorded
              incidents are shown as zero to maintain continuity in the trend analysis.
            </p>

            <div style={{ marginTop: 16 }}>
              <h2>12-month trend</h2>
              {trendError && <p className="error">{trendError}</p>}
              {trend ? <TrendChart rows={trend.rows} /> : !trendError && <p>No trend data.</p>}
              {trend && (
                <p className="note">
                  {trendTakeaway(summarizeTrend(trend.rows), getTopDrivers(trend.rows, 2))}
                </p>
              )}
            </div>

            <MapAnalyticsPanel
              crimes={latestCrimes}
              center={resolved ? { lat: resolved.lat, lon: resolved.lng } : null}
              selectedCategory={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />

            <div style={{ marginTop: 22 }}>
              <h2>Latest crimes</h2>
              <p style={{ opacity: 0.75 }}>
                Use the filters to compare categories and focus on specific streets or outcomes.
              </p>

              {crimesError && <p className="error">{crimesError}</p>}
              {latestCrimes.length > 0 ? (
                <CrimeTable
                  crimes={latestCrimes}
                  selectedCategory={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                />
              ) : (
                !crimesError && <p>No crimes returned for the latest available month.</p>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
