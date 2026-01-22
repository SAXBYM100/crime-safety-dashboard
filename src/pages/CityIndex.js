import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";
import cities from "../data/cities.json";
import { fetchCitySummary } from "../services/cityIntelligence";

const CITY_LIST = Object.entries(cities).map(([slug, data]) => ({ slug, ...data }));
const CITY_HERO_MAP = {
  london: "/images/cities/London.jpg",
  manchester: "/images/cities/manchester.jpg",
  birmingham: "/images/cities/birmingham.jpg",
};
const DEFAULT_HERO = "/images/cities/drone.jpg";

export default function CityIndex() {
  const [summaries, setSummaries] = useState({});
  const [ukAverage, setUkAverage] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMeta(
      "City Hubs - Crime & Safety Dashboard",
      "City hubs summarize reporting patterns, livability factors, and links to area reports."
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setStatus("loading");
      try {
        const summaryList = await Promise.all(
          CITY_LIST.map(async (city) => ({ slug: city.slug, summary: await fetchCitySummary(city) }))
        );
        if (!mounted) return;
        const map = summaryList.reduce((acc, item) => {
          acc[item.slug] = item.summary;
          return acc;
        }, {});
        const rates = summaryList
          .map((item) => item.summary.ratePer1000)
          .filter((value) => Number.isFinite(value));
        const nextUkAverage =
          rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
        setSummaries(map);
        setUkAverage(nextUkAverage);
        setStatus("ready");
      } catch (err) {
        if (!mounted) return;
        setStatus("error");
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const ukAverageLabel = useMemo(() => {
    if (!Number.isFinite(ukAverage)) return "—";
    return ukAverage.toFixed(1);
  }, [ukAverage]);

  const heroImage = DEFAULT_HERO;

  return (
    <div className="contentWrap">
      <div className="cityHero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="cityHero__content heroIntro">
          <h1>City hubs</h1>
          <p>
            City hubs aggregate context, guides, and decision-friendly summaries for major UK cities. Start here for a
            high-level overview, then drill down into postcode-level reports.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">City overview</span>
            <span className="heroBadge">Linked area reports</span>
          </div>
        </div>
      </div>

      <div className="contentGrid">
        {CITY_LIST.map((city) => (
          <div key={city.slug} className="contentCard">
            <h3>{city.name}</h3>
            <p>
              Reporting patterns, transport context, and practical next steps for comparing neighborhoods.
            </p>
            <Link to={`/app?q=${encodeURIComponent(city.name)}`}>Explore on dashboard</Link>
            <Link to={`/city/${city.slug}`}>Open {city.name} hub</Link>
            <Link to={`/pro/city/${city.slug}`}>Read {city.name} intelligence brief</Link>
          </div>
        ))}
      </div>

      <div className="summaryBar">
        {CITY_LIST.map((city) => {
          const summary = summaries[city.slug];
          return (
            <div key={`summary-${city.slug}`} className="summaryCard">
              <div className="summaryLabel">{city.name}</div>
              <div className="summaryValue">
                {summary?.ratePer1000 != null ? summary.ratePer1000.toFixed(1) : "—"}
              </div>
              <div className="summaryMeta">
                UK avg: {ukAverageLabel} • Top category:{" "}
                {summary?.topCategory ? summary.topCategory.replace(/-/g, " ") : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {status === "error" && <p className="error">City summaries are temporarily unavailable.</p>}

      <div className="contentCard">
        <h3>Area pages</h3>
        <p>Browse neighbourhood profiles, ward context, and linked dashboard views.</p>
        <Link to="/areas">Open area pages</Link>
      </div>

      <AdSlot slot="1950000001" contentReady />
    </div>
  );
}
