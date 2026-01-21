import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";
import "../App.css";
import { Icon } from "@iconify/react";
import search from "@iconify/icons-lucide/search";
import shieldCheck from "@iconify/icons-lucide/shield-check";
import scale from "@iconify/icons-lucide/scale";
import calendarCheck from "@iconify/icons-lucide/calendar-check";
import lineChart from "@iconify/icons-lucide/line-chart";
import mapPin from "@iconify/icons-lucide/map-pin";
import bookOpen from "@iconify/icons-lucide/book-open";
import building2 from "@iconify/icons-lucide/building-2";
import HeroTypeHeadline from "../components/HeroTypeHeadline";
import ResponsiveImage from "../components/ResponsiveImage";

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = useMemo(
    () => ["SW1A 1AA", "Manchester", "Bristol", "51.5072, -0.1276"],
    []
  );

  useEffect(() => {
    setMeta(
      "Crime & Safety Dashboard - UK crime context, guides, and area insights",
      "Understand UK crime data, learn how to use the dashboard, and read practical safety guides for cities and towns."
    );
  }, []);

  useEffect(() => {
    if (focused || query.trim()) return undefined;
    const id = setInterval(() => {
      setPlaceholderIndex((idx) => (idx + 1) % placeholders.length);
    }, 2000);
    return () => clearInterval(id);
  }, [focused, query, placeholders.length]);

  function submitSearch(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    setSubmitting(true);
    navigate(`/app?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <>
      <section className="homeHero">
        <img
          className="homeHeroBg"
          src={`${process.env.PUBLIC_URL}/visuals/home-hero.jpg`}
          alt="Abstract UK cityscape texture"
          loading="eager"
          fetchpriority="high"
        />
        <div className="homeHeroOverlay" />
        <div className="homeHeroContent">
          <div className="heroTextWrap">
            <HeroTypeHeadline
              prefix="Clear, data-driven insights for"
              typed="smarter decisions"
            />
          </div>

          <form
            className="homeSearch"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
          >
            <label className="srOnly" htmlFor="home-search">
              Search by postcode or town
            </label>
            <div className="homeSearchShell" role="search">
              <span aria-hidden="true" className="homeSearchIcon">
                <Icon icon={search} />
              </span>
              <input
                id="home-search"
                type="text"
                placeholder={placeholders[placeholderIndex]}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                aria-label="Search by postcode or town"
              />
              <button type="submit" className="homeSearchButton" disabled={submitting}>
                {submitting ? "Loading..." : "Search areas"}
              </button>
            </div>
          </form>

          <div className="homeChips">
            {["London", "Manchester", "Bristol", "Leeds"].map((chip) => (
              <button
                type="button"
                key={chip}
                className="chipButton"
                onClick={() => submitSearch(chip)}
                disabled={submitting}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="heroBadgeRow">
            <span className="heroBadge">
              <Icon icon={shieldCheck} />
              Official UK Police data
            </span>
            <span className="heroBadge">
              <Icon icon={scale} />
              Transparent methodology
            </span>
            <span className="heroBadge">
              <Icon icon={calendarCheck} />
              Monthly area updates
            </span>
            <span className="heroBadge">
              <Icon icon={lineChart} />
              Independent, data-driven insights
            </span>
          </div>
        </div>
      </section>

      <section className="homeSupporting">
        <div className="homeSupportingInner">
          <ResponsiveImage
            src={`${process.env.PUBLIC_URL}/images/hero/uk-map.jpeg`}
            alt="UK map overview showing the national context"
            aspectRatio="21/9"
          />
        </div>
      </section>

      <div className="contentWrap homeMain">
        <h2>Purpose</h2>
        <p>
          Area IQ helps you understand UK crime data with context, not headlines. We turn public police records into
          clear, comparable signals so you can make informed decisions about where to live, rent, invest, or travel
          - without hype or hidden scoring.
        </p>
        <p>
          For full transparency, explore our{" "}
          <Link to="/guides/how-uk-crime-data-works">methodology</Link> and{" "}
          <Link to="/about">data sources</Link>.
        </p>

        <h2>Why Area IQ</h2>
        <ul className="bulletList">
          <li>12-month crime trends, not single-month snapshots - see how areas change over time.</li>
          <li>Explainable signals - no black-box safety scores or hidden weighting.</li>
          <li>Designed for real decisions - home buyers, renters, families, and travelers.</li>
        </ul>

        <div className="ctaGrid">
          <div
            className="ctaCard ctaCardImage"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/visuals/cta-dashboard.jpg)` }}
          >
            <h3 className="ctaTitle">
              <Icon icon={mapPin} />
              Start Exploring
            </h3>
            <p>
              Search by UK postcode, place name, or coordinates to view recent incidents, category trends, and reporting
              patterns in a specific area.
            </p>
            <Link className="primaryButton" to="/app">
              Open Area IQ
            </Link>
          </div>
          <div
            className="ctaCard ctaCardImage"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/visuals/cta-guides.jpg)` }}
          >
            <h3 className="ctaTitle">
              <Icon icon={bookOpen} />
              Understanding the Signals
            </h3>
            <p>
              Learn how UK police crime data is collected, how categories are defined, and how to compare neighborhoods
              responsibly.
            </p>
            <Link className="primaryButton" to="/guides">
              View the guides
            </Link>
          </div>
          <div
            className="ctaCard ctaCardImage"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/visuals/cta-city.jpg)` }}
          >
            <h3 className="ctaTitle">
              <Icon icon={building2} />
              City Intelligence
            </h3>
            <p>
              Explore UK city crime reports that combine regional context, livability signals, and direct links to
              postcode-level data.
            </p>
            <Link className="primaryButton" to="/city">
              Browse cities
            </Link>
          </div>
        </div>

        <div className="sectionDivider" />

        <h2>How It Works</h2>
        <p>
          Enter a UK postcode, town, city, or latitude and longitude. Area IQ pulls the latest available crime records
          near that location and summarizes them by offence category and month.
        </p>
        <p>You can quickly see:</p>
        <ul className="bulletList">
          <li>Which types of crime are most commonly reported.</li>
          <li>Where incidents tend to cluster.</li>
          <li>How patterns have changed over the last 12 months.</li>
        </ul>
        <p>
          Area IQ does not rank neighborhoods or label places as "safe" or "unsafe." Instead, it provides transparent
          access to reported police data, so you can make your own judgment based on clear, comparable information.
        </p>
        <p>
          If you are researching a place to live, use the dashboard to identify consistent trends, transport-area
          clusters, and stability over time. If you are planning a visit, look for seasonal patterns in reporting levels
          across different categories.
        </p>
        <p>
          These are context signals, not predictions - and work best alongside local knowledge and practical safety
          planning.
        </p>

        <AdSlot slot="1000000001" contentReady />

        <h2>Where the Data Comes From</h2>
        <p>
          Official UK crime statistics are published by individual police forces and aggregated on data.police.uk. Data
          is released monthly and grouped into categories such as:
        </p>
        <ul className="bulletList">
          <li>Anti-social behaviour</li>
          <li>Vehicle crime</li>
          <li>Burglary</li>
          <li>Violence and sexual offences</li>
        </ul>
        <p>
          Each record represents a reported incident with a generalized map location. Pins show an approximate area
          rather than an exact address to protect privacy.
        </p>
        <p>
          Because updates are monthly, delays are normal. An incident reported in late March may not appear in
          published data until May. Some case outcomes are updated later as investigations progress.
        </p>
        <p>
          Certain categories show seasonal reporting patterns - for example, higher anti-social behaviour reports
          during school holidays. This is why Area IQ emphasizes 12-month area trends instead of single-month views.
        </p>

        <h2>Using the Dashboard</h2>
        <p>
          For the most accurate results, search using a full UK postcode. This provides a precise location and more
          consistent comparisons. Town and city searches use a central reference point, which is useful for regional
          overviews but less precise for street-level analysis.
        </p>
        <p>When reviewing results:</p>
        <ul className="bulletList">
          <li>Focus on patterns, not individual records.</li>
          <li>Use the trend chart to spot increases, decreases, or stability.</li>
          <li>Compare nearby postcodes rather than relying on a single location.</li>
        </ul>
        <p>
          Outcome statuses such as "under investigation" may change over time as records are updated.
        </p>

        <h2>Limits &amp; Context</h2>
        <p>Crime categories are broad by design. For example:</p>
        <ul className="bulletList">
          <li>Violence and sexual offences includes incidents ranging from minor assaults to serious crimes.</li>
          <li>Other theft can include shoplifting, bicycle theft, and theft from the person.</li>
        </ul>
        <p>
          Treat these as directional indicators, not risk scores. The presence of a category does not mean every street
          is affected equally.
        </p>
        <p>
          Not all crime is reported, and reporting rates vary by location and offence type. Some police forces publish
          more complete data than others. Area IQ does not modify or weight the source data - what you see reflects the
          official records, without added assumptions.
        </p>

        <AdSlot slot="1000000002" contentReady />
      </div>
    </>
  );
}

