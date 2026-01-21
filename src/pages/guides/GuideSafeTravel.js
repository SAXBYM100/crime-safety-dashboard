import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../../seo";
import AdSlot from "../../components/AdSlot";

export default function GuideSafeTravel() {
  useEffect(() => {
    setMeta(
      "Staying safe at night - Crime & Safety Dashboard",
      "Practical guidance for night travel, commuting, and social plans using UK crime data responsibly."
    );
  }, []);

  return (
    <div className="contentWrap">
      <div className="guideHero">
        <div>
          <h1>Staying safe at night</h1>
          <p>
            Night-time travel can feel uncertain, especially in unfamiliar areas. Crime data can help you understand common
            patterns, but the most valuable safety improvements come from practical habits. This guide combines data
            interpretation with realistic steps you can take before and during a night out, a late commute, or a visit to a
            new city.
          </p>
          <p>
            The goal is not to avoid every risk, but to reduce avoidable ones. Small adjustments, such as choosing well-lit
            routes or sharing your journey, can make a big difference. The dashboard is a supporting tool that helps you
            identify where certain categories are concentrated so you can plan calmly and confidently.
          </p>
        </div>
        <img src={`${process.env.PUBLIC_URL}/visuals/guide-abstract.svg`} alt="Abstract guide illustration" />
      </div>

      <h2>Use data for context, not fear</h2>
      <p>
        When you open the dashboard for an area, focus on trends rather than isolated incidents. A single month spike
        in theft does not necessarily mean a sudden danger. Look for patterns across several months and consider the
        type of area you are visiting. A central nightlife district will naturally show more public-order and theft
        reports than a residential street a mile away.
      </p>
      <p>
        If a category is consistently high in a place you plan to visit, treat it as a prompt to plan ahead. For
        example, a higher level of theft reports might encourage you to keep valuables out of sight or choose a bag
        that closes securely. This is a balanced response to the data, not an overreaction.
      </p>

      <AdSlot slot="1700000001" contentReady />

      <h2>Plan your route</h2>
      <p>
        Before you leave, map your route and identify well-lit streets, main roads, and transport hubs. If you are
        walking, choose routes with active storefronts and visible foot traffic rather than quieter side streets. If you
        are using public transport, check the last train or bus times so you are not caught waiting late at night.
      </p>
      <p>
        If you are visiting an unfamiliar city, consider arriving earlier while it is still light. This gives you a
        chance to orient yourself, locate exits, and identify the safest routes for your return trip. Planning ahead is
        one of the most effective safety steps and does not require any special equipment.
      </p>

      <h2>Travel with intention</h2>
      <p>
        Confidence and awareness matter. Keep your phone charged and accessible, but avoid prolonged distraction while
        walking. If you need to check directions, step aside in a well-lit area rather than walking with your head down.
        Wear comfortable shoes so you can move confidently and avoid areas that feel isolated or poorly lit.
      </p>
      <p>
        If you are traveling with friends, agree on a meeting point and a plan for getting home. If you are alone, let
        someone know your route and expected arrival time. Many people find it helpful to share live location with a
        trusted contact for the duration of the journey.
      </p>

      <AdSlot slot="1700000002" contentReady />

      <h2>Understand common risk areas</h2>
      <p>
        Data often shows higher levels of theft and public-order incidents near transport hubs and nightlife areas.
        These are places with lots of people, which can increase opportunity for pickpocketing or disputes. That does
        not mean you should avoid them, but it does mean you should move with intention, keep valuables secure, and stay
        aware of your surroundings.
      </p>
      <p>
        Pay attention to transitions: the walk from a venue to a transport stop, the last ten minutes of a journey, or
        the moment you step into a quiet street. These are the points where planning and awareness make the biggest
        difference. If a route feels uncomfortable, it is okay to change plans, call a taxi, or wait in a more public
        place.
      </p>

      <h2>Use the dashboard as a planning tool</h2>
      <p>
        The dashboard can help you compare nearby areas and decide which routes feel most comfortable. If you are
        choosing between two stations or deciding where to meet friends, a quick look at the category mix can inform
        your choice. The key is to treat the data as a signal, not a verdict. Safety is not only about numbers; it is
        also about lighting, crowds, and your own comfort level.
      </p>

      <h2>Next steps</h2>
      <p>
        If you want to explore a specific location, open the <Link to="/app">dashboard</Link> and enter a postcode near
        your destination. For a deeper understanding of the data, read the guide on{" "}
        <Link to="/guides/how-uk-crime-data-works">how UK crime data works</Link>. If you are relocating, the{" "}
        <Link to="/guides/moving-to-a-new-area">moving to a new area</Link> guide can help you combine data with local
        context. You can also browse city overviews in the <Link to="/areas">area pages</Link>.
      </p>
    </div>
  );
}
