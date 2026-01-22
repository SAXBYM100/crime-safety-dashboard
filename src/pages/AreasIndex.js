import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";
import cities from "../data/cities.json";

const AREAS = Object.entries(cities).map(([slug, data]) => ({ slug, name: data.name }));

const DEFAULT_HERO = "/images/cities/drone.jpg";

export default function AreasIndex() {
  useEffect(() => {
    setMeta(
      "Area Reports (Generated via Search) - Crime & Safety Dashboard",
      "Area reports are generated from dashboard searches and direct links."
    );
  }, []);

  const heroImage = DEFAULT_HERO;

  return (
    <div className="contentWrap">
      <div className="cityHero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="cityHero__content heroIntro">
          <h1>Area Reports (Generated via Search)</h1>
          <p>
            Area reports are generated from dashboard searches and direct links. Use the dashboard to create a report,
            then return here with a saved URL if needed.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">Generated via search</span>
            <span className="heroBadge">Direct link access</span>
          </div>
        </div>
      </div>
      <div className="contentGrid">
        {AREAS.map((area) => (
          <div key={area.slug} className="contentCard">
            <h3>{area.name}</h3>
            <p>
              Local context, common reporting patterns, and guidance for exploring nearby postcodes with the dashboard.
            </p>
            <Link to={`/areas/${area.slug}`}>View {area.name} area guide</Link>
            <div style={{ marginTop: 8 }}>
              <Link to={`/city/${area.slug}`}>Open {area.name} city hub</Link>
            </div>
            <div style={{ marginTop: 8 }}>
              <Link to={`/pro/city/${area.slug}`}>View {area.name} intelligence brief</Link>
            </div>
          </div>
        ))}
      </div>
      <AdSlot slot="1900000001" contentReady />
    </div>
  );
}
