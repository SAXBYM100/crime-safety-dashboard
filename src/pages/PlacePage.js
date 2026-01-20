import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { setMeta } from "../seo";
import TrendChart from "../components/TrendChart";
import { fetchLast12MonthsCountsByCategory } from "../api/trends";
import { geocodeLocation, fetchCrimesForLocation } from "../services/existing";

export default function PlacePage() {
  const params = useParams();

  // Decode and de-slugify (supports old style /place/plymouth and /place/Plymouth)
  const placeName = useMemo(() => {
    const raw = decodeURIComponent(params.placeName || "");
    return raw.replace(/-/g, " ").trim();
  }, [params.placeName]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(null);
  const [latestCrimes, setLatestCrimes] = useState([]);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    setMeta(
      `${placeName} Crime Rate & Statistics (Updated Monthly) | Crime & Safety`,
      `Explore recent crime statistics in ${placeName}, including offence types, locations, outcomes, and a 12-month crime trend based on official UK police data.`
    );
  }, [placeName]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setStatus("loading");
      setError("");
      setResolved(null);
      setLatestCrimes([]);
      setTrend(null);

      try {
        const geo = await geocodeLocation(placeName);
        if (!mounted) return;
        setResolved({ lat: geo.lat, lng: geo.lng });

        // Latest crimes (no date -> latest available; your service already handles 404 as [])
        const crimes = await fetchCrimesForLocation(geo.lat, geo.lng);
        if (!mounted) return;
        setLatestCrimes(Array.isArray(crimes) ? crimes : []);

        // Trend chart (your trends.js now tolerates missing months)
        const t = await fetchLast12MonthsCountsByCategory(geo.lat, geo.lng);
        if (!mounted) return;
        setTrend(t);

        setStatus("ready");
      } catch (e) {
        if (!mounted) return;
        setError(String(e?.message || e));
        setStatus("error");
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [placeName]);

  return (
    <div className="App">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <h1>{placeName} crime statistics</h1>

        {status === "loading" && <p>Loading...</p>}
        {status === "error" && (
          <p style={{ color: "crimson" }}>
            {error || "Something went wrong loading this report."}
          </p>
        )}

        {status === "ready" && (
          <>
            {resolved && (
              <p style={{ opacity: 0.75 }}>
                Resolved to: <b>{resolved.lat.toFixed(6)}</b>, <b>{resolved.lng.toFixed(6)}</b>
              </p>
            )}

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
              {trend ? <TrendChart rows={trend.rows} /> : <p>No trend data.</p>}
            </div>

            <div style={{ marginTop: 22 }}>
              <h2>Latest crimes</h2>
              <p style={{ opacity: 0.75 }}>Showing first 100 records for the latest available month.</p>

              {latestCrimes.length > 0 ? (
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
                      {latestCrimes.slice(0, 100).map((crime) => (
                        <tr key={crime.id}>
                          <td>{crime.category}</td>
                          <td>{crime.location?.name || "Unknown"}</td>
                          <td>{crime.date || "Unknown"}</td>
                          <td>{crime.outcome || "None recorded"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No crimes returned for the latest available month.</p>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}

