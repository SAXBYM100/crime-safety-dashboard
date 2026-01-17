import React, { useEffect } from "react";
import { setMeta } from "../seo";

export default function StaticPage({ title, description, children }) {
  useEffect(() => setMeta(title, description), [title, description]);

  return (
    <div className="App">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <h1>{title}</h1>
        <p style={{ opacity: 0.8 }}>{description}</p>
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  );
}
