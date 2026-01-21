import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";

const AREAS = [
  { slug: "london", name: "London" },
  { slug: "manchester", name: "Manchester" },
  { slug: "bristol", name: "Bristol" },
];

export default function AreasIndex() {
  useEffect(() => {
    setMeta(
      "Area Pages - Crime & Safety Dashboard",
      "Browse city and area summaries with crime context, trends, and practical safety notes."
    );
  }, []);

  return (
    <div className="contentWrap">
      <div className="contentHero">
        <div className="heroIntro">
          <h1>Area Pages</h1>
          <p>
            Area pages provide context for major UK cities. Each page combines a summary of reporting patterns with
            practical tips and links back to the dashboard so you can explore specific neighborhoods.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">City-level context</span>
            <span className="heroBadge">Neighborhood guidance</span>
          </div>
        </div>
        <img
          className="heroVisual"
          src={`${process.env.PUBLIC_URL}/visuals/city-banner.svg`}
          alt="Abstract city illustration"
        />
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
          </div>
        ))}
      </div>
      <AdSlot slot="1900000001" contentReady />
    </div>
  );
}
