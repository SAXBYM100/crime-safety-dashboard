import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { normalizePostcodeParam } from "../utils/slug";
import { setMeta } from "../seo";
import TrendChart from "../components/TrendChart";
import { computeSafetyScore, summarizeTrend, getTopCategories } from "../analytics/safetyScore";
import { getCategoryDeltas, getTopDrivers, trendTakeaway } from "../analytics/trendAnalysis";
import MapAnalyticsPanel from "../components/MapAnalyticsPanel";
import CrimeTable from "../components/CrimeTable";
import SafetyGauge from "../components/SafetyGauge";
import { getAreaProfile, getSourcesSummary } from "../data";
import { pickPrimaryName, toTitleCase } from "../utils/text";

export default function PostcodePage() {
  const params = useParams();
  const postcode = useMemo(() => normalizePostcodeParam(params.postcode), [params.postcode]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState("");
  const [trendError, setTrendError] = useState("");
  const [crimesError, setCrimesError] = useState("");
  const [resolved, setResolved] = useState(null); // {lat,lng}
  const [displayName, setDisplayName] = useState("");
  const [latestCrimes, setLatestCrimes] = useState([]);
  const [trend, setTrend] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourcesSummary, setSourcesSummary] = useState({ lastUpdated: null, sourcesText: "" });

  useEffect(() => {
    setMeta(
      `Crime stats for ${postcode} | Crime & Safety Dashboard`,
      `View recent crimes and 12-month trend analytics for ${postcode} in the UK.`
    );
  }, [postcode]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setStatus("loading");
      setError("");
      setTrendError("");
      setCrimesError("");
      setResolved(null);
      setDisplayName("");
      setLatestCrimes([]);
      setTrend(null);
      setStatusLine("Resolving location...");

      try {
        const nextProfile = await getAreaProfile(
          { kind: "postcode", value: postcode },
          { onStatus: setStatusLine }
        );
        if (!mounted) return;
        if (nextProfile.geo?.lat != null && nextProfile.geo?.lon != null) {
          setResolved({ lat: nextProfile.geo.lat, lng: nextProfile.geo.lon });
        }
        const preferredName = nextProfile.adminArea || nextProfile.displayName || nextProfile.canonicalName;
        const primaryName = pickPrimaryName(preferredName);
        setDisplayName(toTitleCase(primaryName));
        setLatestCrimes(nextProfile.safety.latestCrimes || []);
        setTrend(nextProfile.safety.trend || null);
        setCrimesError(nextProfile.safety.errors?.crimes || "");
        setTrendError(nextProfile.safety.errors?.trend || "");
        setSourcesSummary(getSourcesSummary(nextProfile));
        setStatus("ready");
        setStatusLine("");
      } catch (e) {
        if (!mounted) return;
        setError(String(e?.message || e));
        setDisplayName("");
        setStatus("error");
        setStatusLine("");
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [postcode]);

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
        {status === "error" && <p style={{ color: "crimson" }}>{error}</p>}

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
              <Link to={`/report?kind=postcode&q=${encodeURIComponent(postcode)}`} className="primaryButton">
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
              <h2>Latest crimes (sample)</h2>
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
                !crimesError && <p>No crimes returned for this month.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
