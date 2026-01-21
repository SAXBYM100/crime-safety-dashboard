import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";

const CITIES = [
  { slug: "london", name: "London" },
  { slug: "manchester", name: "Manchester" },
  { slug: "bristol", name: "Bristol" },
];

export default function CityIndex() {
  useEffect(() => {
    setMeta(
      "City Hubs - Crime & Safety Dashboard",
      "City hubs summarize reporting patterns, livability factors, and links to area reports."
    );
  }, []);

  return (
    <div className="contentWrap">
      <div className="contentHero">
        <div className="heroIntro">
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
        <img
          className="heroVisual"
          src={`${process.env.PUBLIC_URL}/visuals/city-banner.svg`}
          alt="Abstract city illustration"
        />
      </div>

      <div className="contentGrid">
        {CITIES.map((city) => (
          <div key={city.slug} className="contentCard">
            <h3>{city.name}</h3>
            <p>
              Reporting patterns, transport context, and practical next steps for comparing neighborhoods.
            </p>
            <Link to={`/city/${city.slug}`}>Open {city.name} hub</Link>
            <Link to={`/pro/city/${city.slug}`}>Read {city.name} intelligence brief</Link>
          </div>
        ))}
      </div>

      <AdSlot slot="1950000001" contentReady />
    </div>
  );
}
