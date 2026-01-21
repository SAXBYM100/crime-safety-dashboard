import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../seo";
import AdSlot from "../components/AdSlot";
import ResponsiveImage from "../components/ResponsiveImage";

export default function GuidesIndex() {
  useEffect(() => {
    setMeta(
      "Safety Guides - Crime & Safety Dashboard",
      "Guides on understanding UK crime data, staying safe at night, and moving to a new area."
    );
  }, []);

  return (
    <div className="contentWrap">
      <div className="contentHero">
        <div className="heroIntro">
          <h1>Safety Guides</h1>
          <p>
            These guides explain how to interpret UK crime data and how to translate information into practical safety
            choices. Each guide is written to be actionable, not alarming, and to help you use the dashboard responsibly.
          </p>
          <div className="heroBadgeRow">
            <span className="heroBadge">Plain-English guidance</span>
            <span className="heroBadge">Decision-ready tips</span>
          </div>
        </div>
        <ResponsiveImage
          className="heroVisual"
          src={`${process.env.PUBLIC_URL}/images/hero/uk-map.jpeg`}
          alt="UK map image showing national coverage"
          aspectRatio="4/3"
        />
      </div>

      <div className="contentGrid">
        <div className="contentCard">
          <h3>How UK crime data works</h3>
          <p>Understand reporting cycles, categories, and the right way to compare areas.</p>
          <Link to="/guides/how-uk-crime-data-works">Read the guide</Link>
        </div>
        <div className="contentCard">
          <h3>Staying safe at night</h3>
          <p>Practical habits for evening travel, commuting, and social events.</p>
          <Link to="/guides/staying-safe-at-night">Read the guide</Link>
        </div>
        <div className="contentCard">
          <h3>Moving to a new area</h3>
          <p>How to combine data with local context when researching a neighborhood.</p>
          <Link to="/guides/moving-to-a-new-area">Read the guide</Link>
        </div>
      </div>

      <AdSlot slot="1500000001" contentReady />
    </div>
  );
}
