import React from "react";

function Badge({ level }) {
  const text = level ? level[0].toUpperCase() + level.slice(1) : "Moderate";
  return (
    <span className={`decisionBrief__badge decisionBrief__badge--${level || "moderate"}`}>
      {text}
    </span>
  );
}

function formatMonth(value) {
  if (!value) return "Latest";
  return value;
}

function formatPct(value) {
  if (value == null) return "---";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default function LocationDecisionBrief({
  brief,
  loading,
  error,
  onViewMap,
  onExportPdf,
  mapAvailable,
}) {
  const headerTitle = brief?.location?.name
    ? `Location Decision Brief - ${brief.location.name}`
    : "Location Decision Brief";
  const snapshotText = `Snapshot: ${formatMonth(
    brief?.snapshot?.monthYYYYMM
  )} | Generated: ${
    brief?.snapshot?.generatedAtISO
      ? new Date(brief.snapshot.generatedAtISO).toLocaleDateString()
      : "Today"
  }`;
  const isLoading = Boolean(loading);

  const factors = brief?.factors?.length
    ? brief.factors
    : [
        "Insufficient data for top factors.",
        "Insufficient data for top factors.",
        "Insufficient data for top factors.",
      ];

  return (
    <section className="decisionBrief">
      <header className="decisionBrief__header">
        {isLoading ? (
          <div className="decisionBrief__skeletonHeader">
            <div className="skeleton skeletonLine decisionBrief__skeletonTitle" />
            <div className="skeleton skeletonLine decisionBrief__skeletonMeta" />
          </div>
        ) : (
          <div>
            <h2 className="decisionBrief__title">{headerTitle}</h2>
            <p className="decisionBrief__meta">{snapshotText}</p>
          </div>
        )}
        {isLoading ? (
          <div className="skeleton skeletonLine decisionBrief__skeletonBadge" />
        ) : (
          <Badge level={brief?.suitability?.living?.level} />
        )}
      </header>

      {error && <div className="decisionBrief__notice">Data unavailable</div>}

      <div className="decisionBrief__section">
        <h3>How This Area Performs For</h3>
        {isLoading ? (
          <div className="decisionBrief__rows">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div className="decisionBrief__row" key={`suitability-${idx}`}>
                <div className="skeleton skeletonLine decisionBrief__skeletonRow" />
                <div className="skeleton skeletonLine decisionBrief__skeletonRow" />
              </div>
            ))}
          </div>
        ) : (
          <div className="decisionBrief__rows">
            <div className="decisionBrief__row">
              <div className="decisionBrief__rowTitle">Living Here</div>
              <div className="decisionBrief__rowMeta">
                <Badge level={brief?.suitability?.living?.level} />
                <span>
                  {brief?.suitability?.living?.summary ||
                    "Insufficient history for confident classification."}
                </span>
              </div>
            </div>
            <div className="decisionBrief__row">
              <div className="decisionBrief__rowTitle">Operating a Business</div>
              <div className="decisionBrief__rowMeta">
                <Badge level={brief?.suitability?.operating?.level} />
                <span>
                  {brief?.suitability?.operating?.summary ||
                    "Insufficient history for confident classification."}
                </span>
              </div>
            </div>
            <div className="decisionBrief__row">
              <div className="decisionBrief__rowTitle">Investing</div>
              <div className="decisionBrief__rowMeta">
                <Badge level={brief?.suitability?.investing?.level} />
                <span>
                  {brief?.suitability?.investing?.summary ||
                    "Insufficient history for confident classification."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="decisionBrief__section decisionBrief__split">
        <div>
          <h3>Top Factors Influencing Risk</h3>
          {isLoading ? (
            <div>
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  className="skeleton skeletonLine decisionBrief__skeletonRow"
                  key={`factor-${idx}`}
                />
              ))}
            </div>
          ) : (
            <ul className="decisionBrief__list">
              {factors.slice(0, 3).map((item, idx) => (
                <li key={`${item}-${idx}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3>Risk Pressure</h3>
          {isLoading ? (
            <div className="skeleton skeletonCard decisionBrief__skeletonGauge" />
          ) : brief?.riskPressure?.gauge ? (
            <>
              <div className="decisionBrief__gauge">
                <span>Low</span>
                <div className="decisionBrief__gaugeLine">
                  {brief.riskPressure.gauge.areaPos01 != null && (
                    <span
                      className="decisionBrief__gaugeMarker decisionBrief__gaugeMarker--area"
                      style={{ left: `${brief.riskPressure.gauge.areaPos01 * 100}%` }}
                    />
                  )}
                  {brief.riskPressure.gauge.ukPos01 != null && (
                    <span
                      className="decisionBrief__gaugeMarker decisionBrief__gaugeMarker--uk"
                      style={{ left: `${brief.riskPressure.gauge.ukPos01 * 100}%` }}
                    />
                  )}
                </div>
                <span>High</span>
              </div>
              <div className="decisionBrief__gaugeMeta">
                <div>
                  <span>Area</span>
                  <strong>
                    {brief.riskPressure.areaValue != null
                      ? `${brief.riskPressure.areaValue}`
                      : "Unavailable"}
                  </strong>
                </div>
                <div>
                  <span>UK average</span>
                  <strong>
                    {brief.riskPressure.ukAvgValue != null
                      ? `${brief.riskPressure.ukAvgValue}`
                      : "Unavailable"}
                  </strong>
                </div>
                <div>
                  <span>Region average</span>
                  <strong>
                    {brief.riskPressure.regionAvgValue != null
                      ? `${brief.riskPressure.regionAvgValue}`
                      : "Unavailable"}
                  </strong>
                </div>
              </div>
              <p className="decisionBrief__note">{brief.riskPressure.unitLabel}</p>
            </>
          ) : (
            <p className="decisionBrief__note">Insufficient history for pressure gauge</p>
          )}
        </div>
      </div>

      <div className="decisionBrief__section">
        <h3>Category Shifts (vs previous month)</h3>
        <div className="decisionBrief__bars">
          {isLoading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div className="decisionBrief__barRow" key={`bar-skel-${idx}`}>
                  <div className="skeleton skeletonLine decisionBrief__skeletonRow" />
                  <div className="skeleton skeletonLine decisionBrief__skeletonRow" />
                  <div className="skeleton skeletonLine decisionBrief__skeletonDelta" />
                </div>
              ))
            : (brief?.categoryShifts || []).map((item) => {
                const directionClass =
                  item.direction === "up"
                    ? "shiftUp"
                    : item.direction === "down"
                    ? "shiftDown"
                    : "shiftFlat";
                const width = item.widthPct != null ? `${item.widthPct}%` : "10%";
                return (
                  <div className="decisionBrief__barRow" key={item.label}>
                    <div className="decisionBrief__barLabel">{item.label}</div>
                    <div className="decisionBrief__barTrack">
                      <div className="decisionBrief__barFill" style={{ width }} />
                    </div>
                    <div className={`decisionBrief__barDelta ${directionClass}`}>
                      {formatPct(item.deltaPct)}
                    </div>
                  </div>
                );
              })}
          {!isLoading && !brief?.categoryShifts?.length && (
            <div className="decisionBrief__barRow">
              <div className="decisionBrief__barLabel">No category shift data</div>
              <div className="decisionBrief__barTrack">
                <div className="decisionBrief__barFill" style={{ width: "10%" }} />
              </div>
              <div className="decisionBrief__barDelta shiftFlat">---</div>
            </div>
          )}
        </div>
      </div>

      <div className="decisionBrief__actions">
        <button
          type="button"
          className="primaryButton"
          onClick={onViewMap}
          disabled={!mapAvailable || isLoading}
        >
          View Map
        </button>
        <button
          type="button"
          className="ghostButton"
          onClick={onExportPdf}
          disabled={isLoading}
        >
          Export Client PDF
        </button>
      </div>
    </section>
  );
}
