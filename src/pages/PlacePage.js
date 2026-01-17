import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { normalizePlaceParam } from "../utils/slug";
import { setMeta } from "../seo";
import TrendChart from "../components/TrendChart";
import { fetchLast12MonthsCountsByCategory } from "../api/trends";
import { geocodePlaceName, fetchCrimesForLocation } from "../services/existing";

export default function PlacePage() {
  const params = useParams();
  const placeName = useMemo(() => normalizePlaceParam(params.placeName), [params.placeName]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(null);
  const [latestCrimes, setLatestCrimes] = useState([]);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    setMeta(
      `Crime stats for ${placeName} | Crime & Safety Dashboard`,
      `View recent crimes and 12-month trend analytics for ${placeName} in the UK.`
    );
  }, [placeName]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setStatus("loading");
      setError("");

      try {
        const geo = await geocodePlaceName(placeName);
        if (!mounted) return;
        setResolved({ lat: geo.lat, lng: geo.lng });

        const crimes = await fetchCrimesForLocation(geo.lat, geo.lng, "");
        if (!mounted) return;
        setLatestCrimes(Array.isArray(crimes) ? crimes : []);

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
        <h1>Crime stats: {placeName}</h1>

        {status === "loading" && <p>Loading…</p>}
        {status === "error" && <p style={{ color: "crimson" }}>{error}</p>}

        {status === "ready" && (
          <>
            {resolved && (
              <p style={{ opacity: 0.75 }}>
                Resolved to: <b>{resolved.lat.toFixed(6)}</b>, <b>{resolved.lng.toFixed(6)}</b>
              </p>
            )}

            <div style={{ marginTop: 16 }}>
              <h2>12-month trend</h2>
              {trend ? <TrendChart rows={trend.rows} /> : <p>No trend data.</p>}
            </div>

            <div style={{ marginTop: 22 }}>
              <h2>Latest crimes (sample)</h2>
              <p style={{ opacity: 0.75 }}>Showing first 100 rows for the current month.</p>

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
                          <td>{crime.location?.street?.name || "Unknown"}</td>
                          <td>{crime.month || "Unknown"}</td>
                          <td>{crime.outcome_status?.category || "None recorded"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No crimes returned for this month.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
