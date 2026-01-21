import React, { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { setMeta } from "../../seo";
import AdSlot from "../../components/AdSlot";
import PageHeaderImage from "../../components/media/PageHeaderImage";

const AREA_CONTENT = {
  london: {
    name: "London",
    overview:
      "London is a large, diverse city with varied reporting patterns across boroughs. Central areas tend to show higher volumes due to tourism, retail, and nightlife, while outer boroughs often show more residential patterns. Use the dashboard with specific postcodes to avoid averaging out neighborhood differences.",
    context:
      "Transport hubs, major shopping areas, and entertainment districts often produce more reports, especially for theft and anti-social behaviour. This does not automatically mean those places are unsafe, but it does mean you should plan routes with awareness, especially late at night. The size of the city also means that one postcode can include multiple distinct streets with different dynamics.",
    tips:
      "If you are moving within London, compare several nearby postcodes around your target area and note whether the category mix is stable or changing. For visitors, use the dashboard to identify the areas around stations you will use and plan your walk to well-lit main routes.",
  },
  manchester: {
    name: "Manchester",
    overview:
      "Manchester blends a compact city center with rapidly changing neighborhoods. Crime reporting patterns often reflect the concentration of nightlife in the center and the strong transport connections that bring people in for work and events.",
    context:
      "You may see higher reports for public-order and theft categories near central nightlife corridors. Residential areas can show more stable category mixes, but short distances can still produce meaningful differences. Comparing multiple postcodes is the best way to interpret the data.",
    tips:
      "When evaluating a potential move, check postcodes around the specific streets you will use for commuting and errands. Pair the data with a daytime and evening visit to get a sense of foot traffic, lighting, and local amenities.",
  },
  bristol: {
    name: "Bristol",
    overview:
      "Bristol has a mix of historic neighborhoods, student areas, and growing commercial corridors. Reporting patterns can vary between the harborside, central areas, and suburban zones.",
    context:
      "Some categories can show seasonal changes tied to events and student calendars. This is a good example of why the 12-month trend is more useful than a single month snapshot. The dashboard helps you see whether a spike is part of a larger pattern or a temporary increase.",
    tips:
      "If you are new to Bristol, start with the dashboard on a postcode near your target neighborhood, then compare adjacent postcodes to see if the category mix changes. This helps you separate neighborhood-specific issues from city-wide patterns.",
  },
};

function getArea(slug) {
  const key = String(slug || "").toLowerCase();
  return AREA_CONTENT[key] || null;
}

export default function AreaPage() {
  const { areaSlug } = useParams();
  const area = useMemo(() => getArea(areaSlug), [areaSlug]);

  useEffect(() => {
    if (area) {
      setMeta(
        `${area.name} crime data guide | Crime & Safety Dashboard`,
        `Contextual guide to ${area.name} crime data, reporting patterns, and how to use the dashboard for local research.`
      );
    } else {
      setMeta("Area not found | Crime & Safety Dashboard", "Explore UK city pages and safety context.");
    }
  }, [area]);

  if (!area) {
    return (
      <div className="contentWrap">
        <h1>Area not found</h1>
        <p>
          We do not have a guide for that area yet. Please visit the <Link to="/areas">area index</Link> or open the{" "}
          <Link to="/app">dashboard</Link> to search by postcode.
        </p>
      </div>
    );
  }

  return (
    <div className="contentWrap">
      <PageHeaderImage
        src="/images/areas/street.jpg"
        alt="UK residential street scene"
        title={`${area.name} safety + property guide`}
        subtitle={area.overview}
        variant="area"
      />

      <div className="heroBadgeRow">
        <span className="heroBadge">Data-led context</span>
        <span className="heroBadge">Neighborhood insights</span>
        <span className="heroBadge">Updated monthly</span>
      </div>

      <div className="iconGrid">
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/safety.svg`} alt="Safety icon" />
          <h3>Safety signals</h3>
          <p>Understand how reported incidents cluster across hubs, corridors, and residential zones.</p>
        </div>
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/property.svg`} alt="Property icon" />
          <h3>Property context</h3>
          <p>Track how reported activity aligns with property demand and livability factors.</p>
        </div>
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/risk.svg`} alt="Risk icon" />
          <h3>Risk indicators</h3>
          <p>Flood and environmental signals are added alongside crime data as sources expand.</p>
        </div>
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/livability.svg`} alt="Livability icon" />
          <h3>Livability</h3>
          <p>Compare parks, schools, and local amenities when choosing between neighborhoods.</p>
        </div>
      </div>

      <p>{area.context}</p>
      <p>
        The dashboard is most useful when you get specific. Instead of treating a city as one data point, search a few
        postcodes around where you live, work, or plan to visit. This helps you avoid averages that hide local
        differences. It also helps you see which categories are consistently reported nearby and which ones appear
        mostly around transport hubs or entertainment areas.
      </p>

      <AdSlot slot="2000000001" contentReady />

      <h2>Local reporting patterns</h2>
      <p>{area.context}</p>
      <p>
        For most cities, the highest reporting volumes tend to follow foot traffic. Busy corridors, shopping streets,
        and night-time economy zones will naturally appear higher in public data. This is a reflection of density and
        activity, not a simple indicator of risk. The right question is not "Is this city safe?" but "Which specific
        areas match my routine, and how can I plan around what is reported there?"
      </p>

      <h2>How to use the dashboard in {area.name}</h2>
      <p>{area.tips}</p>
      <p>
        When comparing postcodes, focus on trend direction and category mix. A stable pattern over the last year may be
        more reassuring than a low number in a single month. If you see a category that directly affects your routine,
        such as theft near a station you use, translate that into a practical plan: adjust your route, travel earlier,
        or choose better-lit paths.
      </p>

      <AdSlot slot="2000000002" contentReady />

      <h2>Safety resources and local context</h2>
      <p>
        Official data is only one part of local safety. You can complement it with council updates, local transport
        guidance, and community groups. Many cities publish neighborhood watch resources, local policing updates, and
        guidance for residents. If you are moving, try visiting at different times and speaking with local businesses
        about how the area feels day to day.
      </p>
      <p>
        If you are visiting, plan your night routes in advance, keep your phone charged, and use main roads with active
        foot traffic. For more guidance, read the{" "}
        <Link to="/guides/staying-safe-at-night">staying safe at night guide</Link>.
      </p>

      <h2>Explore with the dashboard</h2>
      <p>
        Ready to explore? Open the <Link to="/app">crime dashboard</Link> and search a postcode in {area.name}. You can
        then compare neighboring postcodes or use the <Link to="/guides/how-uk-crime-data-works">crime data guide</Link>{" "}
        to interpret the results carefully.
      </p>
      <p>
        Prefer a higher-level view? Visit the <Link to={`/city/${areaSlug}`}>{area.name} city hub</Link> for a summary
        of reporting patterns and livability context.
      </p>
    </div>
  );
}
