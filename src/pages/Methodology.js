import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import { DEFAULT_SOURCES } from "../data";

export default function Methodology() {
  useEffect(() => {
    setMeta(
      "Methodology | Area IQ",
      "Learn how Area IQ calculates trends, uses official data sources, and updates reports."
    );
  }, []);

  return (
    <div className="contentWrap">
      <h1>Methodology</h1>
      <p>
        Area IQ is designed to make official UK crime data usable without alarmism. We surface raw, published records
        and translate them into trend signals that help you compare locations responsibly.
      </p>
      <p>
        The dashboard does not label places as safe or unsafe. Instead, it highlights changes over time and category
        mix so you can pair the data with local context.
      </p>

      <h2>How trends are calculated</h2>
      <p>
        We aggregate reported incidents by month and category, then compute 12-month trend signals. Recent months are
        weighted more heavily to capture direction, and we flag volatility when reporting spikes appear. This provides
        a transparent signal, not a definitive score.
      </p>

      <h2>Update frequency</h2>
      <p>
        Most sources update monthly. Reporting delays are common, so the most recent month may be incomplete. Area IQ
        shows rolling 12-month context to reduce overreaction to a single month.
      </p>

      <h2>Data sources</h2>
      <p>Primary sources used today include:</p>
      <ul className="bulletList">
        {DEFAULT_SOURCES.map((source) => (
          <li key={source.name}>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
            ) : (
              source.name
            )}
          </li>
        ))}
      </ul>

      <p>
        For a full list of references, visit the <Link to="/data-sources">data sources</Link> page.
      </p>
    </div>
  );
}
