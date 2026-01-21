import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { setMeta } from "../../seo";

const CITY_CONTENT = {
  london: {
    name: "London",
    summary:
      "London combines dense commercial corridors with quieter residential pockets. Reporting volumes are highest near transit hubs, tourism zones, and the night-time economy.",
  },
  manchester: {
    name: "Manchester",
    summary:
      "Manchester shows strong center-city clustering tied to venues, retail, and transport. Comparing nearby postcodes helps separate city-core patterns from residential areas.",
  },
  bristol: {
    name: "Bristol",
    summary:
      "Bristol blends historic districts with growing commercial corridors. Trends can shift with student calendars and events, so 12-month context is essential.",
  },
};

export default function ProCityLanding() {
  const { citySlug } = useParams();
  const key = String(citySlug || "").toLowerCase();
  const city = CITY_CONTENT[key];

  useEffect(() => {
    if (city) {
      setMeta(
        `${city.name} area intelligence brief | Area IQ`,
        `Professional city intelligence brief for ${city.name} with context, trends, and links to reports.`
      );
    } else {
      setMeta("City brief not found | Area IQ", "Explore city intelligence briefs for UK locations.");
    }
  }, [city]);

  if (!city) {
    return (
      <div className="contentWrap">
        <h1>City brief not found</h1>
        <p>
          We do not have a brief for that city yet. Visit the <Link to="/city">city hubs</Link> or open the{" "}
          <Link to="/app">dashboard</Link> to search a postcode.
        </p>
      </div>
    );
  }

  return (
    <div className="contentWrap">
      <div className="contentHero">
        <div className="heroIntro">
          <h1>{city.name} area intelligence brief</h1>
          <p>{city.summary}</p>
          <div className="heroBadgeRow">
            <span className="heroBadge">Professional summary</span>
            <span className="heroBadge">Client-ready context</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link className="primaryButton" to={`/report?kind=place&q=${encodeURIComponent(city.name)}`}>
              Generate report
            </Link>
          </div>
        </div>
        <img
          className="heroVisual"
          src={`${process.env.PUBLIC_URL}/visuals/city-banner.svg`}
          alt="Abstract city illustration"
        />
      </div>

      <h2>What this brief includes</h2>
      <ul className="bulletList">
        <li>12-month trend context and recent shifts by category.</li>
        <li>Short, client-ready summary for property decisions.</li>
        <li>Links to postcode-level reports for deeper validation.</li>
      </ul>

      <h2>Recommended next steps</h2>
      <p>
        Open the city hub for more context, then run a few postcode reports in key neighborhoods to validate the trend
        direction. Use the dashboard to compare local areas before sharing the PDF with clients.
      </p>

      <div className="contentGrid">
        <div className="contentCard">
          <h3>Explore the city hub</h3>
          <p>See reporting patterns and livability context for {city.name}.</p>
          <Link to={`/city/${citySlug}`}>Open {city.name} hub</Link>
        </div>
        <div className="contentCard">
          <h3>Run a postcode report</h3>
          <p>Generate a client-ready PDF for a specific postcode.</p>
          <Link to="/app">Open the dashboard</Link>
        </div>
        <div className="contentCard">
          <h3>Upgrade to Pro</h3>
          <p>Unlock unlimited reports and shareable insights.</p>
          <Link to="/pro">View Pro plan</Link>
        </div>
      </div>
    </div>
  );
}
