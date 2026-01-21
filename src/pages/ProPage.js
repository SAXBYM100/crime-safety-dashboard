import React, { useEffect, useState } from "react";
import { setMeta } from "../seo";
import { PRO_PLAN } from "../config/pro";
import { setProAccess, hasProAccess } from "../utils/proAccess";

export default function ProPage() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMeta(
      "Area IQ Pro | Location intelligence reports",
      "Unlock unlimited PDF reports and professional insights for property teams."
    );
    setEnabled(hasProAccess());
  }, []);

  return (
    <div className="contentWrap">
      <h1>{PRO_PLAN.name}</h1>
      <p>
        Built for property teams, sourcers, and landlords who need credible, shareable area intelligence. Pro unlocks
        unlimited PDF reports and priority data refreshes.
      </p>

      <div className="proCard">
        <div>
          <h2>{PRO_PLAN.priceMonthly}</h2>
          <p className="proMuted">Cancel anytime. B2B-lite access.</p>
          <ul className="bulletList">
            {PRO_PLAN.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
        <div className="proActions">
          <button type="button" className="primaryButton">
            Request Pro access
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => {
              const next = !enabled;
              setProAccess(next);
              setEnabled(next);
            }}
          >
            {enabled ? "Disable Pro (dev)" : "Enable Pro (dev)"}
          </button>
        </div>
      </div>

      <p className="proMuted">
        The Pro checkout flow is being finalized. This page is a placeholder and can be swapped for Stripe when ready.
      </p>
    </div>
  );
}
