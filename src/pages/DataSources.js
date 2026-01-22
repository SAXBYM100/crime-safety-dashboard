import React, { useEffect } from "react";
import { setMeta } from "../seo";
import { DEFAULT_SOURCES } from "../data";

export default function DataSources() {
  useEffect(() => {
    setMeta(
      "Data Sources | Area IQ",
      "Reference list of official data sources used in Area IQ reports."
    );
  }, []);

  return (
    <div className="contentWrap">
      <h1>Data sources</h1>
      <p>
        Area IQ aggregates official sources to provide transparent location intelligence. The list below reflects the
        primary sources currently used in the dashboard.
      </p>
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
        Sources are updated on their own schedules. Monthly updates and reporting delays are common, so Area IQ focuses
        on 12-month context rather than single-month snapshots.
      </p>
    </div>
  );
}
