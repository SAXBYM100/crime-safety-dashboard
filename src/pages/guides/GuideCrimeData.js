import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "../../seo";
import AdSlot from "../../components/AdSlot";

export default function GuideCrimeData() {
  useEffect(() => {
    setMeta(
      "How UK crime data works - Crime & Safety Dashboard",
      "A practical guide to understanding UK crime data, reporting cycles, and how to compare locations responsibly."
    );
  }, []);

  return (
    <div className="contentWrap">
      <h1>How UK crime data works</h1>
      <p>
        Crime data is a public record, but it is not a perfect mirror of reality. The UK police data you see in the
        dashboard is collected by police forces, published monthly, and then aggregated on data.police.uk. This means
        every chart or table you view is a snapshot of what was reported and recorded, not a definitive statement of
        everything that happened. Understanding that distinction is the first step to using crime data wisely.
      </p>
      <p>
        The dashboard is designed to be transparent about those boundaries. It does not hide the source or smooth the
        numbers. Instead, it surfaces them with plain explanations so you can decide how much weight to give a trend,
        a category, or a specific month. This guide will help you read the data with nuance so you can make informed
        decisions without overreacting to individual data points.
      </p>

      <h2>Where the data comes from</h2>
      <p>
        The primary source for incident data is the UK Police API. Police forces upload records of reported incidents
        to a central system, which then becomes available to the public. Each record includes a category, an approximate
        location, and a month of occurrence. Some records also include an outcome, such as "investigation complete" or
        "no further action." Outcomes can appear months later, which is why you may see missing outcome data on recent
        months.
      </p>
      <p>
        The location is deliberately generalized for privacy reasons. A record might show a street segment or a nearby
        public point rather than the exact address. This means the map is good for understanding clusters, but not for
        identifying a specific house or business. The dashboard reinforces this by focusing on trends and category
        distributions rather than precise pins.
      </p>

      <AdSlot slot="1600000001" contentReady />

      <h2>Reporting cycles and delays</h2>
      <p>
        Most UK police forces publish data monthly. The data is usually released with a delay, which means a crime that
        happens in late July might not appear until September. If you are looking at the most recent month, you should
        assume the data is incomplete and subject to updates. A safer approach is to look at several months together or
        review the 12-month trend chart.
      </p>
      <p>
        The dashboard uses a rolling 12-month view because it provides a balanced perspective. Monthly spikes can be
        influenced by one-off events, seasonal patterns, or reporting changes. Looking at a full year helps you see
        whether the area is trending up, trending down, or stable over time.
      </p>

      <h2>Understanding categories</h2>
      <p>
        Crime categories are broad by design. "Violence and sexual offences" covers a wide range of incidents with very
        different severity. "Other theft" includes everything from shoplifting to bicycle theft. "Anti-social
        behaviour" often reflects local reporting habits and enforcement priorities. Treat categories as signals rather
        than precise risk scores. The category mix can tell you which types of offences are most commonly reported in an
        area, but it does not predict your individual risk.
      </p>
      <p>
        It is also important to remember that categories can be reclassified during investigations. A record might
        initially appear under one category and later be updated. This is another reason to read the data as a living
        report, not a fixed ledger.
      </p>

      <h2>Comparing areas responsibly</h2>
      <p>
        Comparing two postcodes or towns is tempting, but it can be misleading if you do not account for context. A
        larger urban area will almost always show more records than a rural village. Even within a city, a postcode
        that includes a busy nightlife zone will generate different categories and volumes than a residential street a
        few minutes away. Instead of comparing raw counts, look at category distribution and trend direction.
      </p>
      <p>
        A practical approach is to use the dashboard to answer focused questions: Is this area seeing more reports over
        the last year? Are certain categories consistently high? Do nearby postcodes show a similar mix? The goal is to
        build a rounded picture rather than chase a single number. You can pair this with local visits, council
        reports, and conversations with residents.
      </p>

      <AdSlot slot="1600000002" contentReady />

      <h2>Using the dashboard effectively</h2>
      <p>
        Start with a precise location. Full postcodes provide the most reliable coordinates, while town searches provide
        a central point that may not match your area of interest. If you are researching a neighborhood, try multiple
        nearby postcodes and compare the category mix. Use the 12-month trend to see whether the recent months are
        consistent with the wider pattern.
      </p>
      <p>
        The dashboard is a tool for awareness, not a checklist for fear. If the data shows an increase in a category
        that is relevant to your routine, consider practical adjustments like improved lighting, travel planning, or
        choosing routes with more foot traffic. If the data is stable or declining, that is useful context too. The key
        is to translate the information into balanced, realistic actions.
      </p>

      <h2>Next steps</h2>
      <p>
        If you are new to the data, begin with the <Link to="/app">dashboard</Link> and explore a familiar postcode to
        calibrate your expectations. Then try a few nearby areas and note the differences in category mix. For more
        practical guidance, read the guides on <Link to="/guides/staying-safe-at-night">staying safe at night</Link> and
        <Link to="/guides/moving-to-a-new-area">moving to a new area</Link>. You can also explore area summaries such as
        <Link to="/areas/london">London</Link> and <Link to="/areas/manchester">Manchester</Link>.
      </p>
    </div>
  );
}
