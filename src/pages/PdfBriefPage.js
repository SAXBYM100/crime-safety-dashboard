import React from "react";
import { Link, useParams } from "react-router-dom";
import TrendChart from "../components/TrendChart";
import SafetyGauge from "../components/SafetyGauge";
import { useLocationReport } from "../hooks/useLocationReport";
import { toTitleCase } from "../utils/text";
import "../styles/PdfBrief.css";

function formatCategory(cat) {
  return String(cat || "").replace(/-/g, " ");
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function buildTrendMetric(summary) {
  if (!summary) return "Unavailable";
  if (summary.changePct === null) return summary.direction || "Unavailable";
  return `${summary.direction} (${summary.changePct > 0 ? "+" : ""}${summary.changePct.toFixed(1)}%)`;
}

function buildExecutiveSentence(report) {
  const band = report.safety?.label || "Unavailable";
  const trend = report.trendSummary?.direction || "Unavailable";
  const drivers = report.topCategories?.slice(0, 2).map((d) => formatCategory(d.category)).join(", ");
  const trendLine =
    report.trendSummary?.changePct != null
      ? `Recent trend is ${trend.toLowerCase()} (${formatPercent(report.trendSummary.changePct)} vs prior period).`
      : `Recent trend is ${trend.toLowerCase()}.`;
  return `Overall risk sits in the ${band.toLowerCase()} band. Primary drivers include ${drivers || "key categories"}. ${trendLine}`;
}

export default function PdfBriefPage({ kind }) {
  const params = useParams();
  const query = kind === "postcode" ? params.postcode : params.placeName;
  const { status, error, report } = useLocationReport({ kind, query });

  const backPath = kind === "postcode" ? `/postcode/${params.postcode}` : `/place/${params.placeName}`;

  if (status === "loading") {
    return (
      <div className="pdfBrief">
        <div className="pdfPage">
          <p>Loading report…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="pdfBrief">
        <div className="pdfPage">
          <p className="pdfError">Unable to load this brief.</p>
          <p>{error}</p>
          <Link to={backPath} className="pdfLink">Back to report</Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const drivers = report.drivers || [];
  const trendMetric = buildTrendMetric(report.trendSummary);
  const locationLine = report.adminArea
    ? `${report.fullLocation}${/england/i.test(report.adminArea) ? "" : ", England"}`
    : report.displayName;

  return (
    <div className="pdfBrief">
      <div className="pdfToolbar">
        <button type="button" className="btnSecondary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <Link className="btnSecondary" to={backPath}>
          Back to report
        </Link>
      </div>

      <header className="pdfHeader">
        <div className="pdfBrand">AREA IQ</div>
        <div className="pdfHeaderMeta">
          <div>{locationLine}</div>
          <div>Generated {formatDate(report.updatedAt)}</div>
        </div>
      </header>

      <footer className="pdfFooter">
        Area IQ • Confidential client brief • {formatDate(report.updatedAt)}
      </footer>

      <main className="pdfPage">
        <section className="pdfCover">
          <div className="pdfKicker">Location Risk Brief</div>
          <h1>{toTitleCase(report.displayName)}</h1>
          <p className="pdfLocation">{locationLine}</p>
          <div className="pdfMetaGrid">
            <div>
              <div className="pdfMetaLabel">Report ID</div>
              <div className="pdfMetaValue">{report.reportId}</div>
            </div>
            <div>
              <div className="pdfMetaLabel">Model</div>
              <div className="pdfMetaValue">Area IQ Risk Index v1.0</div>
            </div>
            <div>
              <div className="pdfMetaLabel">Sources</div>
              <div className="pdfMetaValue">
                {(report.sources || []).length ? report.sources.join(", ") : "UK Police API"}
              </div>
            </div>
            <div>
              <div className="pdfMetaLabel">Generated</div>
              <div className="pdfMetaValue">{formatDate(report.updatedAt)}</div>
            </div>
          </div>
        </section>

        <section className="pdfSection pageBreak">
          <h2>Executive Summary</h2>
          <div className="pdfSummaryBand">
            Overall Risk Assessment: {report.safety?.label || "Unavailable"} — {report.trendSummary?.direction || "Unavailable"}
          </div>
          <p>{buildExecutiveSentence(report)}</p>
          <p>
            Data coverage: {report.sources?.length ? "Standard" : "Coverage expanding"}.
          </p>
          <div className="pdfSignals">
            <div>
              <div className="pdfSignalLabel">Composite Safety Index</div>
              <div className="pdfSignalValue">
                {report.safety?.score !== null && report.safety?.score !== undefined
                  ? `${report.safety.score}/100`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="pdfSignalLabel">Trend</div>
              <div className="pdfSignalValue">{trendMetric}</div>
            </div>
            <div>
              <div className="pdfSignalLabel">Primary Driver</div>
              <div className="pdfSignalValue">
                {report.topCategories?.[0]?.category
                  ? formatCategory(report.topCategories[0].category)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="pdfSignalLabel">Coverage</div>
              <div className="pdfSignalValue">Standard</div>
            </div>
          </div>
        </section>

        <section className="pdfSection">
          <h2>Risk Index Breakdown</h2>
          <div className="pdfGaugeRow">
            <SafetyGauge score={report.safety?.score} label={report.safety?.label} />
            <div>
              <p className="pdfNote">
                The composite index weights category severity, recent incident volume, and trend stability to
                provide a practical risk signal. Higher values indicate safer conditions over the recent period.
              </p>
            </div>
          </div>
        </section>

        <section className="pdfSection pageBreak">
          <h2>Primary Risk Drivers</h2>
          <table className="pdfTable">
            <thead>
              <tr>
                <th>Category</th>
                <th>Share</th>
                <th>Latest change</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.category}>
                    <td>{formatCategory(driver.category)}</td>
                    <td>{driver.share}%</td>
                    <td>{driver.delta > 0 ? "+" : ""}{driver.delta}</td>
                    <td>{driver.label}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Awaiting additional incident detail.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="pdfSection">
          <h2>Trend Analysis</h2>
          <div className="pdfCaption">Monthly reported incidents (12 months).</div>
          {report.trendRows?.length ? (
            <>
              <TrendChart rows={report.trendRows} />
              <table className="pdfTable pdfTable--compact">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {report.trendRows.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>Trend data is currently limited.</p>
          )}
        </section>

        <section className="pdfSection pageBreak">
          <h2>Environmental & Property</h2>
          <div className="pdfGridTwo">
            <div>
              <h3>Environmental risk</h3>
              <p>Awaiting official release cycle.</p>
            </div>
            <div>
              <h3>Property</h3>
              <p>Coverage expanding with additional market datasets.</p>
            </div>
          </div>
        </section>

        <section className="pdfSection">
          <h2>Methodology & Sources</h2>
          <ul className="pdfList">
            {(report.sources || []).length ? (
              report.sources.map((source) => <li key={source}>{source}</li>)
            ) : (
              <>
                <li>UK Police API</li>
                <li>Postcodes.io</li>
                <li>OpenStreetMap Nominatim</li>
              </>
            )}
          </ul>
          <p className="pdfNote">
            This brief summarizes reported incidents and directional change over recent months. Figures may vary
            based on reporting lags and dataset refresh cycles.
          </p>
          <p className="pdfDisclaimer">
            Disclaimer: This report is informational and does not constitute legal or investment advice.
          </p>
        </section>
      </main>
    </div>
  );
}
