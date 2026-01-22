import React from "react";
import { Link } from "react-router-dom";
import { PRO_PLAN } from "../config/pro";

export default function ProGate({ children }) {
  return (
    <div className="proGate">
      <div>
        <h3>{PRO_PLAN.name}</h3>
        <p className="proGateCopy">
          Downloadable reports are available on the Pro plan. Upgrade to generate unlimited client-ready PDFs.
        </p>
      </div>
      <Link to="/pro" className="primaryButton">
        View Pro plan
      </Link>
      {children}
    </div>
  );
}
