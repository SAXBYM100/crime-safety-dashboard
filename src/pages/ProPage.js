import React, { useEffect } from "react";
import { setMeta } from "../seo";

export default function ProPage() {
  useEffect(() => {
    setMeta(
      "Area IQ Pro - Professional Access",
      "Professional location intelligence for property, risk, investment, consulting, and relocation teams."
    );
  }, []);

  return (
    <div className="contentWrap pageShell">
      <section className="sectionBlock">
        <h1>Area IQ Pro - Professional Access</h1>
        <p className="sub">
          Professional-grade location intelligence for teams that need fast, defensible decisions.
        </p>
      </section>

      <section className="contentCard sectionBlock">
        <h2>Who it's for</h2>
        <ul className="bulletList">
          <li>Property and development teams</li>
          <li>Risk and compliance reviews</li>
          <li>Investment and consulting analysis</li>
          <li>Relocation and corporate mobility</li>
        </ul>
      </section>

      <section className="proCompareGrid">
        <div className="proCompareCard">
          <h3>Free</h3>
          <ul className="bulletList">
            <li>Search and snapshot views</li>
            <li>Basic area context</li>
            <li>Limited exports</li>
          </ul>
        </div>
        <div className="proCompareCard proCompareCard--featured">
          <h3>Pro</h3>
          <ul className="bulletList">
            <li>Branded PDF exports</li>
            <li>Multi-area comparison</li>
            <li>Historical trends</li>
            <li>Shareable client links</li>
          </ul>
        </div>
      </section>

      <section className="contentCard sectionBlock">
        <h2>Request access</h2>
        <p className="proMuted">Early access is rolling out to professional teams first.</p>
        <div className="proCapture">
          <input type="email" placeholder="Work email" aria-label="Work email" />
          <button type="button" className="primaryButton">
            Request Access
          </button>
        </div>
      </section>
    </div>
  );
}

