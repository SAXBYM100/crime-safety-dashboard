import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";
import "../App.css";

export default function HomePage() {
  useEffect(() => {
    setMeta(
      "Crime & Safety Dashboard - UK crime context, guides, and area insights",
      "Understand UK crime data, learn how to use the dashboard, and read practical safety guides for cities and towns."
    );
  }, []);

  return (
    <div className="contentWrap">
      <h1>Crime &amp; Safety Dashboard</h1>
      <p>
        Crime data in the UK can feel abstract: a national headline here, a local rumor there, and a few maps that
        do not explain what the numbers actually mean. The Crime &amp; Safety Dashboard is built to bridge that gap
        by pairing official data with plain language guidance. It is a tool, but it is also a publisher site that
        explains how crime reporting works, how to interpret trends responsibly, and how to apply the information in
        everyday decisions like commuting, renting, or choosing a night out.
      </p>
      <p>
        This site uses official, publicly available data to provide a grounded view of what has been reported in a
        given area. It is not a prediction engine and it is not a verdict on a neighborhood. Crime data is imperfect:
        some incidents are not reported, outcomes can take months to appear, and boundaries are defined by police
        forces rather than lived experience. By surfacing the data alongside context, the goal is to help you read the
        numbers with confidence instead of fear.
      </p>

      <div className="contentGrid">
        <div className="contentCard">
          <h3>Launch the dashboard</h3>
          <p>
            Search by postcode, place name, or coordinates and get a focused snapshot of recent incidents and category
            trends. Start with a specific location to keep the data meaningful.
          </p>
          <Link className="ctaButton" to="/app">
            Open the crime dashboard
          </Link>
        </div>
        <div className="contentCard">
          <h3>Read the guides</h3>
          <p>
            Learn how UK crime data is collected, which categories matter for your situation, and how to compare areas
            without overreacting to a single month of results.
          </p>
          <Link className="ctaButton" to="/guides">
            Explore the guides
          </Link>
        </div>
        <div className="contentCard">
          <h3>Browse city pages</h3>
          <p>
            Area pages compile background context, typical reporting patterns, and local safety resources so you can
            combine data with practical next steps.
          </p>
          <Link className="ctaButton" to="/areas">
            View area summaries
          </Link>
        </div>
      </div>

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
          <Link to="/areas/manchester">Manchester area page</Link>
        </li>
      </ul>
    </div>
  );
}
