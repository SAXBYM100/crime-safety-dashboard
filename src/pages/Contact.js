import React, { useEffect } from "react";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";

export default function Contact() {
  useEffect(() => {
    setMeta("Contact Crime & Safety Dashboard", "Get in touch with the Crime & Safety Dashboard team.");
  }, []);

  return (
    <div className="contentWrap">
      <h1>Contact</h1>
      <p>
        We welcome feedback, corrections, and ideas for new guides or data sources. If you notice an issue in a guide,
        see a broken link, or have suggestions for additional safety resources, please reach out.
      </p>
      <p>
        Email: <a href="mailto:hello@crime-safety-dashboard.example">hello@crime-safety-dashboard.example</a>
      </p>
      <p>
        To help us respond quickly, include the page URL and a short description of the issue. We do not provide
        emergency services, and we cannot assist with real-time safety situations. If you need immediate help, please
        contact local authorities.
      </p>

      <AdSlot slot="1400000001" contentReady />
    </div>
  );
}
