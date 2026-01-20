import React, { useEffect } from "react";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";

export default function PrivacyPolicy() {
  useEffect(() => {
    setMeta(
      "Privacy Policy - Crime & Safety Dashboard",
      "Read how Crime & Safety Dashboard handles analytics, advertising cookies, and data usage."
    );
  }, []);

  return (
    <div className="contentWrap">
      <h1>Privacy Policy</h1>
      <p>
        This Privacy Policy explains how Crime &amp; Safety Dashboard handles information. The site is designed to be
        informative and does not require user accounts. We do not sell personal data. We collect only the minimum data
        required to operate the site, understand aggregate usage, and support advertising on publisher pages.
      </p>

      <h2>Analytics</h2>
      <p>
        We may use analytics tools to understand how visitors use the site. These tools collect information such as the
        pages visited, approximate location (based on IP), device type, and basic interaction events. This information
        is used to improve the content and the performance of the dashboard. We do not use analytics to identify
        individual visitors.
      </p>

      <AdSlot slot="1200000001" contentReady />

      <h2>Advertising and cookies</h2>
      <p>
        Publisher pages may include Google AdSense ads. Google and its partners may use cookies to serve ads based on a
        user's prior visits to this and other websites. You can learn more about how Google uses data and how to opt
        out by visiting Google's Ads Settings and the Network Advertising Initiative opt-out page.
      </p>
      <p>
        We do not show ads on the dashboard or tool screens. Ads are restricted to content-rich pages such as the
        homepage, guides, and area summaries so that advertising appears only alongside substantive publisher content.
      </p>

      <h2>Data sources and requests</h2>
      <p>
        Search inputs such as postcodes, place names, or coordinates are used only to fetch relevant public data from
        our providers. We do not store search queries with personal identifiers. If you contact us directly, we will
        only use your message to respond to your request.
      </p>

      <h2>Contact</h2>
      <p>If you have questions about this policy, please use the contact page.</p>
    </div>
  );
}
