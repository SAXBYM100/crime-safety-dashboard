import React from "react";
import StaticPage from "./StaticPage";

export default function Privacy() {
  return (
    <StaticPage title="Privacy Policy" description="How this site handles data and analytics.">
      <p>
        This site uses publicly available UK Police data. No personal data is intentionally collected.
      </p>
      <p>
        We cache API responses in your browser (localStorage) to reduce repeated requests.
      </p>
    </StaticPage>
  );
}
