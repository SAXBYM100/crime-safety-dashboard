import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { setMeta } from "../seo";
import TrendChart from "../components/TrendChart";
import cities from "../data/cities.json";
import { fetchCityIntelligence, fetchUkAverageRate } from "../services/cityIntelligence";

const CITY_LIST = Object.entries(cities).map(([slug, data]) => ({ slug, ...data }));
const CITY_HERO_MAP = {
  london: "/images/cities/London.jpg",
  manchester: "/images/cities/manchester.jpg",
  birmingham: "/images/cities/birmingham.jpg",
};
const DEFAULT_HERO = "/images/cities/drone.jpg";

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function formatCategory(value) {
  if (!value || value === "unknown") return "—";
  return String(value).replace(/-/g, " ");
}

export default function CityPage() {
  const { citySlug } = useParams();
  const city = useMemo(() => (citySlug ? cities[citySlug] : null), [citySlug]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [intel, setIntel] = useState(null);
  const [ukAvgRate, setUkAvgRate] = useState(null);

  useEffect(() => {
    if (!city) {
      setMeta("City not found | Area IQ", "Explore UK city hubs and safety context.");
      return;
    }
    setMeta(
      `${city.name} Crime Rate & Safety Intelligence`,
      `Explore verified crime data, safest areas, trends, and neighbourhood safety insights for ${city.name}, powered by official UK Police data.`
    );
  }, [city]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!city) return;
      setStatus("loading");
      setError("");
      try {
        const [nextIntel, nextUkAvg] = await Promise.all([
          fetchCityIntelligence({ ...city, slug: citySlug }),
          fetchUkAverageRate(CITY_LIST),
        ]);
        if (!mounted) return;
        setIntel(nextIntel);
        setUkAvgRate(nextUkAvg);
        setStatus("ready");
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Unable to load city intelligence.");
        setStatus("error");
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [city, citySlug]);

  if (!city) {
    return (
      <div className="contentWrap">
        <h1>City not found</h1>
        <p>We do not have a city hub for that location yet.</p>
        <Link to="/city" className="primaryButton">Back to city hubs</Link>
      </div>
    );
  }

  const months = intel?.trend?.months || [];
  const lastMonthLabel = months[months.length - 1] || "";
  const monthLabelText =
    lastMonthLabel && lastMonthLabel.toLowerCase() !== "latest"
      ? `month ${lastMonthLabel}`
      : "the latest available month";
  const comparison =
    Number.isFinite(ukAvgRate) && Number.isFinite(intel?.ratePer1000)
      ? intel.ratePer1000 > ukAvgRate
        ? "above"
        : intel.ratePer1000 < ukAvgRate
        ? "below"
        : "in line with"
      : "comparable to";

  const safestWard = intel?.safestAreas?.[0];
  const highestWard = intel?.highestAreas?.[0];
  const heroImage = CITY_HERO_MAP[citySlug?.toLowerCase()] || DEFAULT_HERO;
  const hasTotals = Number.isFinite(intel?.totalCrimes);
  const hasRate = Number.isFinite(intel?.ratePer1000);
  const hasYoy = Number.isFinite(intel?.yoyChange);
  const trendOk = intel?.ok !== false;

  return (
    <div className="contentWrap">
      <div className="cityHero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="cityHero__content heroIntro">
          <h1>{city.name} Safety & Crime Intelligence</h1>
          <p>
            Verified neighbourhood-level crime data, trends, and local safety context - powered by official UK Police
            data.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">Official police data</span>
            <span className="heroBadge">City-level intelligence</span>
          </div>
          <div className="proActions" style={{ marginTop: "16px" }}>
            <Link className="primaryButton" to={`/app?q=${encodeURIComponent(city.name)}`}>
              Explore {city.name} on Dashboard
            </Link>
            <Link className="ghostButton" to={`/report?kind=place&q=${encodeURIComponent(city.name)}`}>
              Download {city.name} Safety Report (PDF)
            </Link>
          </div>
        </div>
      </div>

      {status === "error" && <p className="error">{error}</p>}

      {status !== "error" && (
        <>
          {intel?.ok === false && (
            <p className="error">Data is temporarily unavailable for this location. Showing limited results.</p>
          )}
          <section className="summaryBar">
            <div className="summaryCard">
              <div className="summaryLabel">Crime rate per 1,000</div>
              <div className="summaryValue">{formatNumber(intel?.ratePer1000, 1)}</div>
              {!hasRate && <div className="summaryMeta">Data unavailable</div>}
            </div>
            <div className="summaryCard">
              <div className="summaryLabel">UK national average</div>
              <div className="summaryValue">{formatNumber(ukAvgRate, 1)}</div>
              {!Number.isFinite(ukAvgRate) && <div className="summaryMeta">Data unavailable</div>}
            </div>
            <div className="summaryCard">
              <div className="summaryLabel">Year-over-year trend</div>
              <div className="summaryValue">{formatPercent(intel?.yoyChange)}</div>
              {!hasYoy && <div className="summaryMeta">Data unavailable</div>}
            </div>
            <div className="summaryCard">
              <div className="summaryLabel">Most common category</div>
              <div className="summaryValue">{formatCategory(intel?.topCategory)}</div>
              {!intel?.topCategory && <div className="summaryMeta">Data unavailable</div>}
            </div>
            <div className="summaryCard">
              <div className="summaryLabel">Lowest reporting street label</div>
              <div className="summaryValue">{safestWard?.name || "Unavailable"}</div>
              {!safestWard?.name && <div className="summaryMeta">Data unavailable</div>}
            </div>
            <div className="summaryCard">
              <div className="summaryLabel">Highest reporting street label</div>
              <div className="summaryValue">{highestWard?.name || "Unavailable"}</div>
              {!highestWard?.name && <div className="summaryMeta">Data unavailable</div>}
            </div>
          </section>

          <section className="summaryExplain">
            {hasTotals && hasRate ? (
              <>
                {city.name} recorded {formatNumber(intel?.totalCrimes)} offences in {monthLabelText}.
                {hasYoy
                  ? ` This represents a ${formatPercent(intel?.yoyChange)} change compared to the prior year.`
                  : " Year-over-year change is not available yet."}{" "}
                When adjusted for population, the crime rate stands at {formatNumber(intel?.ratePer1000, 1)} per 1,000
                residents, which is {comparison} the national average.
              </>
            ) : (
              <>
                Latest available month data is currently unavailable for {city.name}. Use the dashboard to explore nearby areas and recent reports while the feed updates.
              </>
            )}
          </section>

          <section className="sectionDivider" />

          <section>
            <h2>Neighbourhood intelligence</h2>
            <div className="impactGrid">
              {(intel?.safestAreas || []).map((area) => (
                <div className="impactCard" key={`safe-${area.name}`}>
                  <strong>{area.name}</strong>
                  <div className="impactMeta">
                    Rate per 1,000: {formatNumber(area.ratePer1000, 2)} - Top category:{" "}
                    {formatCategory(area.topCategory)}
                  </div>
                  {area.center && (
                    <Link to={`/app?q=${encodeURIComponent(`${area.center.lat},${area.center.lng}`)}`}>
                      View on Dashboard
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className="impactGrid">
              {(intel?.highestAreas || []).map((area) => (
                <div className="impactCard" key={`high-${area.name}`}>
                  <strong>{area.name}</strong>
                  <div className="impactMeta">
                    Rate per 1,000: {formatNumber(area.ratePer1000, 2)} - Top category:{" "}
                    {formatCategory(area.topCategory)}
                  </div>
                  {area.center && (
                    <Link to={`/app?q=${encodeURIComponent(`${area.center.lat},${area.center.lng}`)}`}>
                      View on Dashboard
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="sectionDivider" />

          <section>
            <h2>Trends</h2>
            {!trendOk && <p className="error">Trend data is temporarily unavailable.</p>}
            {trendOk ? (
              intel?.trend?.rows?.length ? <TrendChart rows={intel.trend.rows} /> : <p>No trend data.</p>
            ) : null}
            <ul className="bulletList" style={{ marginTop: "12px" }}>
              <li>
                <strong>Declining:</strong>{" "}
                {(intel?.momentum?.declining || []).length
                  ? intel.momentum.declining.join(", ")
                  : "No clear declines yet"}
              </li>
              <li>
                <strong>Rising:</strong>{" "}
                {(intel?.momentum?.rising || []).length ? intel.momentum.rising.join(", ") : "No clear rises yet"}
              </li>
            </ul>
          </section>

          <section className="sectionDivider" />

          <section className="contentGrid">
            <div className="contentCard">
              <h3>Guidance for movers</h3>
              <p>
                Compare several nearby wards before deciding. Look for stable category mixes and pair the data with a
                daytime visit.
              </p>
            </div>
            <div className="contentCard">
              <h3>Guidance for visitors</h3>
              <p>
                Focus on transit corridors and evening patterns. Use the dashboard to check hotspots near your routes.
              </p>
            </div>
            <div className="contentCard">
              <h3>Guidance for students</h3>
              <p>
                Compare areas near campuses and accommodation clusters. Short-list a few wards and validate on the map.
              </p>
            </div>
            <div className="contentCard">
              <h3>Guidance for investors</h3>
              <p>
                Combine crime trends with housing demand signals. Look for improving trends and stable incident mixes.
              </p>
            </div>
          </section>

          <section className="reportCard">
            <h2>{city.name} Safety Report (PDF)</h2>
            <ul className="reportList">
              <li>Street-level breakdowns</li>
              <li>Ward rankings</li>
              <li>Trend analysis</li>
              <li>Decision-ready insights</li>
            </ul>
            <Link className="primaryButton" to={`/report?kind=place&q=${encodeURIComponent(city.name)}`}>
              Download Report
            </Link>
          </section>

          <div className="proActions" style={{ marginTop: "18px" }}>
            <Link className="ghostButton" to="/city">Back to City Guides</Link>
            <Link className="ghostButton" to="/areas">Area Reports (Generated via Search)</Link>
          </div>
        </>
      )}
    </div>
  );
}



