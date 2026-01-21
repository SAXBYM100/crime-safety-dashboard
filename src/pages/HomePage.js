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

      <div className="contentWrap homeMain">
                <h2>Purpose</h2>
        <p>
          Area IQ helps you understand UK crime data with context, not headlines. We turn public police records into
          clear, comparable signals so you can make informed decisions about where to live, rent, invest, or travel
          — without hype or hidden scoring.
        </p>
        <p>
          For full transparency, explore our{' '}
          <Link to="/guides/how-uk-crime-data-works">methodology</Link> and{' '}
          <Link to="/about">data sources</Link>.
        </p>

        <h2>Why Area IQ</h2>
        <ul className="bulletList">
          <li>12-month crime trends, not single-month snapshots — see how areas change over time.</li>
          <li>Explainable signals — no black-box safety scores or hidden weighting.</li>
          <li>Designed for real decisions — home buyers, renters, families, and travelers.</li>
        </ul>

        <div className="ctaGrid">
          <div
            className="ctaCard ctaCardImage"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/visuals/cta-dashboard.jpg)` }}
          >
            <h3 className="ctaTitle">
              <Icon icon={mapPin} />
              Launch the dashboard
            </h3>
            <p>
              Search by postcode, place name, or coordinates and get a focused snapshot of incidents and category trends.
            </p>
            <Link className="primaryButton" to="/app">
              Open the dashboard
            </Link>
          </div>
          <div
            className="ctaCard ctaCardImage"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/visuals/cta-guides.jpg)` }}
          >
            <h3 className="ctaTitle">
              <Icon icon={bookOpen} />
              Read the guides
            </h3>
            <p>
              Learn how UK crime data is collected, which categories matter, and how to compare areas responsibly.
            </p>
            <Link className="primaryButton" to="/guides">
              Explore the guides
            </Link>
          </div>
          <div
            className="ctaCard ctaCardImage"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/visuals/cta-city.jpg)` }}
          >
            <h3 className="ctaTitle">
              <Icon icon={building2} />
              Browse city hubs
            </h3>
            <p>
              City pages combine reporting context, livability signals, and links to postcode-level reports.
            </p>
            <Link className="primaryButton" to="/city">
              View city hubs
            </Link>
          </div>
        </div>

        <div className="sectionDivider" />

        <h2>What the tool does</h2>
        <p>
          The dashboard lets you enter a UK postcode, a town or city name, or a latitude and longitude pair. It then
          pulls the latest available crime records near that location and summarizes them by category and month. The
          results are intentionally direct: you can see what types of offences are most common, where they were reported,
          and how the pattern has shifted across the last year. The tool does not rank neighborhoods or label them as
          safe or unsafe. Instead, it provides a transparent view of what has been reported so you can make your own
          judgment.
        </p>
        <p>
          The dashboard is best used as a starting point. If you are researching a place to live, the data can tell you
          which categories show up most often, whether reports are clustered around transport corridors, and whether
          recent months look stable or volatile. If you are planning a trip, the data can help you identify which times
          of year tend to see higher reporting levels in certain categories. These are context signals, not absolute
          answers, and they work best alongside local knowledge and practical safety habits.
        </p>

        <AdSlot slot="1000000001" contentReady />

        <h2>How UK crime data works</h2>
        <p>
          Official UK crime data is published by police forces and aggregated on data.police.uk. The data is released
          monthly and grouped into categories such as anti-social behaviour, vehicle crime, burglary, and violence and
          sexual offences. Each record is an incident that has been reported and recorded by a police force, with a
          location that is intentionally generalized to protect privacy. That means the pin on a map is a best
          approximation, not an exact address.
        </p>
        <p>
          Because the data is published monthly, you should expect a delay. A crime that happens in late March might not
          appear in the data until May. Outcomes can take even longer. Some categories are influenced by reporting
          patterns, such as seasonal spikes in anti-social behaviour during school holidays. This is why the dashboard
          emphasizes a 12-month trend rather than a single month snapshot.
        </p>

        <h2>How to use the dashboard</h2>
        <p>
          Start with a precise query. A full postcode will return the most consistent results because the geocoding is
          unambiguous. If you search by town or city, the dashboard will choose a central coordinate for that place,
          which can be useful for a high-level overview but less precise for neighborhood research. For the best results,
          use a specific postcode and then explore how categories change across the last year.
        </p>
        <p>
          When reviewing the table, focus on patterns rather than individual rows. An outcome of "under investigation"
          does not necessarily mean the case was unresolved, and some outcomes are updated after the initial record is
          published. The trend chart is a good way to see whether reports are growing, declining, or stable. If you want
          more detail, open the dedicated report pages and compare a few nearby postcodes rather than relying on a single
          point.
        </p>

        <h2>Understanding categories and limitations</h2>
        <p>
          Categories are broad by design. For example, "violent crime" includes a range of incidents from minor assaults
          to more serious offences. "Other theft" can include shoplifting, bicycle theft, and theft from the person.
          Treat the categories as directional signals rather than precise risk scores. The presence of a category does
          not mean that every street is affected equally or that the situation is deteriorating.
        </p>
        <p>
          There are also reporting limitations. Not every crime is reported, and reporting rates vary by location and by
          the type of offence. Some police forces publish more complete data than others, and that can affect comparisons
          across regions. The dashboard does not adjust the data or apply weighting. That transparency is intentional:
          you are seeing the data as it is published, without hidden assumptions.
        </p>

        <AdSlot slot="1000000002" contentReady />

        <h2>Safety resources and next steps</h2>
        <p>
          Data is only one input to personal safety. If you are moving to a new area, consider visiting at different
          times of day, checking local council updates, and speaking with residents. For night-time safety, plan routes
          in advance, use well-lit main roads, and keep your phone charged. For travelers, review local transport
          guidance and emergency contact numbers ahead of time. The dashboard is meant to complement these practical
          steps, not replace them.
        </p>
        <p>
          If you want deeper guidance, explore the guides below. Each guide pairs data interpretation with practical
          advice that can be applied immediately. You can also jump straight into the dashboard if you already have a
          location in mind.
        </p>

        <ul className="pillList">
          <li>
            <Link to="/guides/how-uk-crime-data-works">How UK crime data works</Link>
          </li>
          <li>
            <Link to="/guides/staying-safe-at-night">Staying safe at night</Link>
          </li>
          <li>
            <Link to="/guides/moving-to-a-new-area">Moving to a new area</Link>
          </li>
          <li>
            <Link to="/areas/london">London area page</Link>
          </li>
          <li>
            <Link to="/city/london">London city hub</Link>
          </li>
          <li>
            <Link to="/areas/manchester">Manchester area page</Link>
          </li>
        </ul>
      </div>
    </>
  );
}

