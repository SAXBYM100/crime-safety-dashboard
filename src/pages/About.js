import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";

export default function About() {
  useEffect(() => {
    setMeta(
      "About Crime & Safety Dashboard",
      "Learn about the mission, data sources, and limitations behind the Crime & Safety Dashboard."
    );
  }, []);

  return (
    <div className="contentWrap">
      <h1>About Crime &amp; Safety Dashboard</h1>
      <p>
        Crime &amp; Safety Dashboard is a public-interest project that helps people understand UK crime data without
        alarmism. The site combines official data with clear explanations so visitors can read the numbers in context,
        compare trends responsibly, and find next steps that improve everyday safety. We believe data should support
        informed choices, not replace local knowledge or personal judgment.
      </p>
      <p>
        The dashboard focuses on transparency. We show data as it is published and highlight the limitations that come
        with monthly reporting. We do not score neighborhoods, rank postcodes, or label places as safe or unsafe. The
        goal is to provide a neutral reference point that can be combined with other sources like local council
        updates, community groups, and on-the-ground observations.
      </p>

      <AdSlot slot="1100000001" contentReady />

      <h2>Data sources</h2>
      <p>
        Crime data is sourced from the UK Police API (data.police.uk), which aggregates incident-level records
        published by police forces across the UK. Geocoding is provided by Postcodes.io for postcodes and OpenStreetMap
        Nominatim for place searches. Each source has its own update cadence, coverage, and constraints, which we
        summarize within the product and in our guides.
      </p>
      <p>
        We treat data sources with respect and do not attempt to bypass rate limits or usage policies. If a provider is
        unavailable, the dashboard will surface an error message rather than guessing. This protects both the integrity
        of the data and the reliability of your search results.
      </p>

      <h2>How we think about safety</h2>
      <p>
        Safety is multi-dimensional. Crime data is one input among many, alongside lighting, transport options, local
        amenities, community activity, and personal routines. Our guides emphasize practical behaviors and planning,
        especially for night travel and for people relocating to a new area. We aim to support informed, calm decision
        making by pairing data with real-world context.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The dashboard provides information and context. It is not legal advice, and it does not provide guarantees
        about safety outcomes. Data can be incomplete or delayed, and we encourage readers to use multiple sources when
        making decisions. If you notice an issue or have feedback, please reach out via the contact page.
      </p>

      <p>
        Want to dive in? Visit the <Link to="/app">dashboard</Link> or read the <Link to="/guides">guides</Link>.
      </p>
    </div>
  );
}
