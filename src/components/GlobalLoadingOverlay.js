import React from "react";
import { useLoading } from "../context/LoadingContext";

export default function GlobalLoadingOverlay() {
  const { isLoading, loadingLabel } = useLoading();
  if (!isLoading) return null;

  return (
    <div className="loadingOverlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loadingCard">
        <span className="loadingSpinner" aria-hidden="true" />
        <span className="loadingLabel">{loadingLabel}</span>
      </div>
    </div>
  );
}
