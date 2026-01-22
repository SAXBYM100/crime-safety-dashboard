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
      "City Guides - Crime & Safety Dashboard",
      "Browse city guides with crime context, trends, and practical safety notes."
    );
  }, []);

  const heroImage = DEFAULT_HERO;

  return (
    <div className="contentWrap">
      <div className="cityHero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="cityHero__content heroIntro">
          <h1>City guides</h1>
          <p>
            City guides provide context for major UK cities. Each page combines a summary of reporting patterns with
            practical tips and links back to the dashboard so you can explore specific neighbourhoods.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">City-level context</span>
            <span className="heroBadge">Neighbourhood guidance</span>
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
