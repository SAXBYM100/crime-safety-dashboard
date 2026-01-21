import React, { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { setMeta } from "../../seo";
import AdSlot from "../../components/AdSlot";
import PageHeaderImage from "../../components/media/PageHeaderImage";

const CITY_CONTENT = {
  london: {
    name: "London",
    overview:
      "London combines dense commercial corridors with quiet residential pockets. Reporting volumes are higher in central areas with tourism, nightlife, and transport interchanges.",
    neighborhoods:
      "Compare postcodes around commute routes and transit hubs. West End, City core, and South Bank will look different from outer boroughs even within a short distance.",
    livability:
      "Livability signals often follow green space access, school catchments, and transit coverage. Pair crime trends with travel time and local amenity coverage.",
  },
  manchester: {
    name: "Manchester",
    overview:
      "Manchester has a compact core with major nightlife and retail zones, surrounded by fast-changing neighborhoods. Reporting often clusters near transport and event venues.",
    neighborhoods:
      "Compare a few nearby postcodes to separate city-center effects from residential patterns. This helps avoid averaging that hides local variation.",
    livability:
      "Look at school access, parks, and commuting times alongside category mix to align data with daily routines.",
  },
  bristol: {
    name: "Bristol",
    overview:
      "Bristol blends historic districts, student neighborhoods, and commercial growth corridors. Reporting patterns can shift with seasonal events and university calendars.",
    neighborhoods:
      "Use the dashboard to compare postcodes across the harborside, city center, and residential zones to understand category mix changes.",
    livability:
      "Check green space access and commute corridors when comparing areas; they often influence foot traffic and reported incidents.",
  },
};

const CITY_IMAGES = {
  manchester: {
    src: "/images/cities/manchester.jpg",
    alt: "Aerial view of Manchester city centre skyline",
  },
  birmingham: {
    src: "/images/cities/birmingham.jpg",
    alt: "Birmingham city centre skyline and surrounding districts",
  },
};

const CITY_FALLBACK = {
  src: "/images/hero/uk-map.jpg",
  alt: "UK map overview for city context",
};

function getCity(slug) {
  const key = String(slug || "").toLowerCase();
  return CITY_CONTENT[key] || null;
}

export default function CityPage() {
  const { citySlug } = useParams();
  const city = useMemo(() => getCity(citySlug), [citySlug]);
  const imageKey = String(citySlug || "").toLowerCase();
  const heroImage = CITY_IMAGES[imageKey] || CITY_FALLBACK;

  useEffect(() => {
    if (city) {
      setMeta(
        `${city.name} safety + property hub | Crime & Safety Dashboard`,
        `City hub for ${city.name} with reporting patterns, livability context, and links to area reports.`
      );
    } else {
      setMeta("City not found | Crime & Safety Dashboard", "Explore UK city hubs and safety context.");
    }
  }, [city]);

  if (!city) {
    return (
      <div className="contentWrap">
        <h1>City not found</h1>
        <p>
          We do not have a hub for that city yet. Visit the <Link to="/city">city index</Link> or open the{" "}
          <Link to="/app">dashboard</Link> to search a specific postcode.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeaderImage
        src={heroImage.src}
        alt={heroImage.alt}
        title={`${city.name} city hub`}
        subtitle={city.overview}
        variant="city"
        className="pageHeaderFull"
      />
      <div className="contentWrap">
        <div className="heroBadgeRow">
          <span className="heroBadge">City-level context</span>
          <span className="heroBadge">Decision-ready notes</span>
          <span className="heroBadge">Linked area pages</span>
        </div>

      <div className="iconGrid">
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/safety.svg`} alt="Safety icon" />
          <h3>Reporting patterns</h3>
          <p>{city.neighborhoods}</p>
        </div>
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/livability.svg`} alt="Livability icon" />
          <h3>Livability context</h3>
          <p>{city.livability}</p>
        </div>
        <div className="iconCard">
          <img src={`${process.env.PUBLIC_URL}/visuals/icons/property.svg`} alt="Property icon" />
          <h3>Property lens</h3>
          <p>Compare crime trends with commute times, amenities, and housing demand signals.</p>
        </div>
      </div>

      <AdSlot slot="1960000001" contentReady />

      <h2>Explore area reports</h2>
      <p>
        Dive deeper into specific neighborhoods using the area pages, then use the dashboard to compare postcodes that
        match your commute or daily routes.
      </p>
      <div className="contentGrid">
        <div className="contentCard">
          <h3>{city.name} area guide</h3>
          <p>Reporting patterns and practical tips for {city.name} neighborhoods.</p>
          <Link to={`/areas/${citySlug}`}>Open {city.name} area guide</Link>
        </div>
        <div className="contentCard">
          <h3>Run a postcode report</h3>
          <p>Use the dashboard to compare multiple postcodes within {city.name}.</p>
          <Link to="/app">Open the dashboard</Link>
        </div>
      </div>
      </div>
    </>
  );
}
