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
const getCityHero = (slug) => CITY_HERO_MAP[slug?.toLowerCase()] || DEFAULT_HERO;

export default function CityIndex() {
  const [summaries, setSummaries] = useState({});
  const [ukAverage, setUkAverage] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setMeta(
      "City Intelligence Briefings | Area IQ",
      "High-level safety, risk, and neighbourhood context for property, business, and relocation decisions."
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

  const citySummaries = {
    birmingham: "Commercial corridors, commuter zones, and neighbourhood risk signals in one view.",
    manchester: "Market movement context for inner-ring, university, and growth districts.",
    bristol: "Neighbourhood dynamics for coastal access, commuter patterns, and local risk signals.",
    london: "Borough-level intelligence with pressure points, volatility, and demand cues.",
  };

  return (
    <div className="contentWrap pageShell">
      <div className="cityHero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="cityHero__content heroIntro">
          <h1>City Intelligence Briefings</h1>
          <p>
            High-level safety, risk, and neighbourhood context for property, business, and relocation decisions. Drill
            down into postcode-level intelligence reports.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">City overview</span>
            <span className="heroBadge">Linked area reports</span>
          </div>
          <div className="heroActions">
            <Link className="primaryButton" to="/app">
              Open Intelligence Console
            </Link>
            <Link className="ghostButton" to="/pro">
              Request Pro Access
            </Link>
          </div>
        </div>
      </div>

      <section className="sectionBlock contentCard">
        <h2>Intelligence coverage</h2>
        <ul className="bulletList">
          <li>Risk distribution across neighbourhoods</li>
          <li>Monthly crime movement trends</li>
          <li>Safer postcode clusters</li>
          <li>Local volatility signals</li>
          <li>Data confidence indicators</li>
        </ul>
      </section>

      <div className="cityTilesGrid">
        {CITY_LIST.map((city) => (
          <div key={city.slug} className="cityTile">
            <img
              className="cityTile__image"
              src={getCityHero(city.slug)}
              alt={`${city.name} skyline`}
              loading="lazy"
            />
            <div className="cityTile__shade" aria-hidden="true" />
            <div className="cityTile__overlay">
              <h3>{city.name}</h3>
              <p>{citySummaries[city.slug] || "Neighbourhood risk context and comparative signals for quick decisions."}</p>
              <div className="cityTile__actions">
                <Link className="btnPrimary" to={`/app?q=${encodeURIComponent(city.name)}`}>
                  View Intelligence Report
                </Link>
                <Link className="btnSecondary" to={`/city/${city.slug}`}>
                  Read guide
                </Link>
              </div>
            </div>
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
              <div className="summaryMeta">Crimes per 1,000 residents</div>
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
        <h3>Area reports (generated)</h3>
        <p>Area-level reports are created after searching in the dashboard.</p>
        <Link className="btnSecondary" to="/app">Open Intelligence Console</Link>
      </div>

      <div className="trustStrip">
        Powered by official UK Police data • Open methodology • Monthly updates • Independent analysis
      </div>

      <div className="proFooterCta">
        <span>Need client-ready or investor-grade safety reports? Upgrade to</span>
        <Link to="/pro">Area IQ Pro</Link>
      </div>

      <AdSlot slot="1950000001" contentReady />
    </div>
  );
}




