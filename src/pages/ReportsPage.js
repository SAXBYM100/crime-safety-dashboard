import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";

export default function ReportsPage() {
  useEffect(() => {
    setMeta(
      "AreaIQ Reports - Client-Ready Location Intelligence",
      "Generate branded PDF briefings, multi-area comparisons, and shareable intelligence reports for UK locations."
    );
  }, []);

  return (
    <div className="contentWrap pageShell">
      <section className="sectionBlock">
        <h1>AreaIQ Reports - Client-Ready Location Intelligence</h1>
        <p className="sub">
          Shareable briefings and export-ready intelligence for property, risk, and relocation teams.
        </p>
      </section>

      <section className="contentCard sectionBlock">
        <h2>What you can deliver</h2>
        <ul className="bulletList">
          <li>Branded PDF exports</li>
          <li>Multi-area comparison</li>
          <li>Historical trends</li>
          <li>Shareable links</li>
          <li>Saved projects</li>
        </ul>
        <Link className="primaryButton" to="/pro">
          Request Pro Access
        </Link>
      </section>
    </div>
  );
}
