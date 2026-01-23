import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { setMeta } from "../seo";
import { getAreaProfile, getSourcesSummary } from "../data";
import { computeSafetyScore, summarizeTrend, getTopCategories } from "../analytics/safetyScore";
import { getTopDrivers } from "../analytics/trendAnalysis";
import { hasProAccess } from "../utils/proAccess";
import ProGate from "../components/ProGate";

export default function ReportPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawQuery = (params.get("q") || "").trim();
  const rawKind = (params.get("kind") || "").trim();

  const queryInfo = useMemo(() => {
    if (!rawQuery) return null;
    if (rawKind) return { kind: rawKind, value: rawQuery };
    return { kind: "auto", value: rawQuery };
  }, [rawQuery, rawKind]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [sourcesSummary, setSourcesSummary] = useState({ lastUpdated: null, sourcesText: "" });
  const [isPro, setIsPro] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    setMeta(
      "Area Intelligence Report | Area IQ",
      "Download a concise Area IQ report with safety trends and source references."
    );
    setIsPro(hasProAccess());
  }, []);

  useEffect(() => {
    async function run() {
      if (!queryInfo) return;
      const requestSeq = ++requestRef.current;
      setStatus("loading");
      setError("");
      setProfile(null);
      try {
        const nextProfile = await getAreaProfile(queryInfo);
        if (requestSeq !== requestRef.current) return;
        setProfile(nextProfile);
        setSourcesSummary(getSourcesSummary(nextProfile));
        setStatus("ready");
      } catch (err) {
        if (requestSeq !== requestRef.current) return;
        setError(err?.message || "Unable to generate report.");
        setStatus("error");
      }
    }
    run();
  }, [queryInfo]);

  if (!queryInfo) {
    return (
      <div className="contentWrap reportPage">
        <h1>Report not available</h1>
        <p>Please return to the dashboard and generate a report from a valid postcode or place.</p>
        <Link to="/app" className="primaryButton">Back to dashboard</Link>
      </div>
    );
  }

  const safety = profile ? computeSafetyScore(profile.safety.latestCrimes, profile.safety.trend?.rows || []) : null;
  const trendSummary = profile ? summarizeTrend(profile.safety.trend?.rows || []) : null;
  const topCats = profile ? getTopCategories(profile.safety.latestCrimes || [], 3) : [];
  const drivers = profile ? getTopDrivers(profile.safety.trend?.rows || [], 2) : [];

  return (
    <div className="contentWrap reportPage">
      <div className="reportActions">
        <button type="button" className="primaryButton" onClick={() => window.print()} disabled={!isPro}>
          Download Area Report (PDF)
        </button>
        <Link to="/app" className="reportLink">Back to dashboard</Link>
      </div>
      {!isPro && <ProGate />}

      <section className="reportCard">
        <header className="reportHeader">
          <div>
            <p className="reportKicker">Area IQ • Area Intelligence Report</p>
            <h1>{profile?.canonicalName || rawQuery}</h1>
            <p className="reportMeta">
              Generated {new Date().toLocaleDateString()}
              {sourcesSummary.lastUpdated
                ? ` • Data updated ${new Date(sourcesSummary.lastUpdated).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <img
            className="reportLogo"
            src={`${process.env.PUBLIC_URL}/brand/area-iq-mark.svg`}
            alt="Area IQ logo"
          />
        </header>

        <div className="reportHero">
          <img
            src={`${process.env.PUBLIC_URL}/visuals/hero-grid.svg`}
            alt="Map grid illustration"
            loading="lazy"
            decoding="async"
          />
        </div>

        {status === "loading" && <p className="statusLine">Generating report...</p>}
        {status === "error" && <p className="error">{error}</p>}

        {status === "ready" && profile && (
          <div className="reportGrid">
            <div className="reportSection">
              <h2>Safety snapshot</h2>
              <p className="reportValue">
                Score: {safety?.score ?? "—"} ({safety?.label || "Pending"})
              </p>
              <p>
                Trend: {trendSummary?.direction || "Unavailable"}{" "}
                {trendSummary?.changePct != null
                  ? `(${trendSummary.changePct > 0 ? "+" : ""}${trendSummary.changePct.toFixed(1)}%)`
                  : ""}
              </p>
              {drivers.length > 0 && (
                <p className="reportMuted">
                  Drivers: {drivers.map((d) => d.category.replace(/-/g, " ")).join(", ")}
                </p>
              )}
            </div>

            <div className="reportSection">
              <h2>Category mix</h2>
              {topCats.length > 0 ? (
                <ul className="reportList">
                  {topCats.map((cat) => (
                    <li key={cat.category}>
                      {cat.category.replace(/-/g, " ")} • {cat.share}%
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="reportMuted">No recent category data available.</p>
              )}
            </div>

            <div className="reportSection">
              <h2>Housing snapshot</h2>
              <p className="reportMuted">{profile.housing?.summary || "Land Registry data pending."}</p>
            </div>

            <div className="reportSection">
              <h2>Transport & livability</h2>
              <p className="reportMuted">{profile.transport?.summary || "Transport signals pending."}</p>
            </div>

            <div className="reportSection">
              <h2>Demographics</h2>
              <p className="reportMuted">{profile.demographics?.summary || "ONS data pending."}</p>
            </div>

            <div className="reportSection">
              <h2>Sources</h2>
              <p className="reportMuted">{sourcesSummary.sourcesText || "Sources pending."}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
