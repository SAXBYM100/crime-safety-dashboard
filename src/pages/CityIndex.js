import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";
import cities from "../data/cities.json";
import { fetchCitySummariesBatch } from "../services/cityIntelligence";
import { loadImageManifest } from "../journal/loadImageManifest";

const CITY_LIST = Object.entries(cities).map(([slug, data]) => ({ slug, ...data }));
const DEFAULT_HERO = "/images/cities/drone.jpg";

function hashSeed(value) {
  let hash = 0;
  const str = String(value || "");
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFromList(list, seed) {
  if (!list.length) return "";
  const idx = seed % list.length;
  return list[idx];
}

function buildManifestMap(items = []) {
  const map = {};
  items.forEach((item) => {
    const path = String(item?.filePath || "");
    if (!path.startsWith("/image-bank/")) return;
    const match = path.match(/\/image-bank\/cities\/([^/]+)\//);
    if (!match) return;
    const slug = match[1];
    if (!map[slug]) map[slug] = [];
    map[slug].push(path);
  });
  Object.keys(map).forEach((slug) => {
    map[slug].sort();
  });
  return map;
}

function pickCityHero(slug, manifestMap, themeImages, genericImages) {
  const list = manifestMap[slug] || [];
  const seed = hashSeed(slug);
  const fromCity = pickFromList(list, seed);
  if (fromCity) return fromCity;
  const fromTheme = pickFromList(themeImages, seed);
  if (fromTheme) return fromTheme;
  const fromGeneric = pickFromList(genericImages, seed);
  return fromGeneric || DEFAULT_HERO;
}

export default function CityIndex() {
  const [summaries, setSummaries] = useState({});
  const [ukAverage, setUkAverage] = useState(null);
  const [status, setStatus] = useState("idle");
  const [cityImages, setCityImages] = useState({});

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
        const [batchSummaries, manifest] = await Promise.all([
          fetchCitySummariesBatch(CITY_LIST),
          loadImageManifest(),
        ]);
        if (!mounted) return;
        const rates = Object.values(batchSummaries)
          .map((item) => item.ratePer1000)
          .filter((value) => Number.isFinite(value));
        const nextUkAverage =
          rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
        const manifestMap = buildManifestMap(manifest);
        const generic = manifest
          .map((item) => String(item?.filePath || ""))
          .filter((path) => path.startsWith("/image-bank/generic-uk/"))
          .sort();
        const themes = manifest
          .map((item) => String(item?.filePath || ""))
          .filter((path) => path.startsWith("/image-bank/themes/"))
          .sort();
        const imageMap = CITY_LIST.reduce((acc, city) => {
          const picked = pickCityHero(city.slug, manifestMap, themes, generic);
          acc[city.slug] = picked;
          if (
            process.env.NODE_ENV !== "production" &&
            (manifestMap[city.slug] || []).length > 0 &&
            picked &&
            !picked.startsWith(`/image-bank/cities/${city.slug}/`)
          ) {
            console.warn(`[CityIndex] Generic image used for ${city.slug} despite city folder images.`);
          }
          return acc;
        }, {});
        setSummaries(batchSummaries);
        setCityImages(imageMap);
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
    manchester: "Inner-ring movement, student districts, and night economy cues for faster decisions.",
    bristol: "Neighbourhood dynamics for commuter flows, harbour districts, and local risk signals.",
    london: "Borough-level intelligence with pressure points, volatility, and demand cues.",
    leeds: "City centre movement, student corridors, and commuter risk signals in one view.",
    liverpool: "Waterfront districts, visitor flows, and local safety signals for quick decisions.",
    sheffield: "Neighbourhood mix, commuter patterns, and district-level risk context.",
    glasgow: "Central corridors, nightlife zones, and local safety pressure points.",
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
              src={cityImages[city.slug] || DEFAULT_HERO}
              alt={`${city.name} skyline`}
              loading="lazy"
            />
            <div className="cityTile__shade" aria-hidden="true" />
            <div className="cityTile__overlay">
              <h3>{city.name}</h3>
              <p>
                {city.description ||
                  citySummaries[city.slug] ||
                  "Neighbourhood risk context and comparative signals for quick decisions."}
              </p>
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
                {Number.isFinite(summary?.ratePer1000) ? summary.ratePer1000.toFixed(1) : "—"}
              </div>
              <div className="summaryMeta">Crimes per 1,000 residents</div>
              <div className="summaryMeta">
                UK avg: {ukAverageLabel} • Top category:{" "}
                {summary?.topCategory && summary.topCategory !== "unknown"
                  ? summary.topCategory.replace(/-/g, " ")
                  : "—"}
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







