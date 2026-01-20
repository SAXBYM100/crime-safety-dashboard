import React, { useEffect } from "react";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";

export default function Terms() {
  useEffect(() => {
    setMeta("Terms of Use - Crime & Safety Dashboard", "Terms and disclaimers for using the Crime & Safety Dashboard.");
  }, []);

  return (
    <div className="contentWrap">
      <h1>Terms of Use</h1>
      <p>
        By using Crime &amp; Safety Dashboard, you agree to the terms below. The site provides public information and
        educational context. It does not provide legal, financial, or safety guarantees. Use the dashboard as one
        input among many when making personal decisions.
      </p>

      <h2>No warranties</h2>
      <p>
        We do not warrant that the data is complete, accurate, or up to date. Data is published by third-party sources,
        and delays or errors can occur. We provide the information "as is" without warranties of any kind.
      </p>

      <AdSlot slot="1300000001" contentReady />

      <h2>Use of data</h2>
      <p>
        You may use the site for personal research and informational purposes. You may not scrape or bulk download
        data in a way that violates provider terms or rate limits. We reserve the right to restrict access if automated
        usage threatens stability.
      </p>

      <h2>Not legal advice</h2>
      <p>
        The content is not legal advice, and you should not rely on it as the sole basis for decisions related to
        safety, housing, or business. If you need legal guidance, consult a qualified professional.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms over time. Continued use of the site means you accept the updated terms. If you have
        questions, please contact us.
      </p>
    </div>
  );
}
