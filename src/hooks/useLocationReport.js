import { useEffect, useMemo, useState } from "react";
import { getAreaProfile, getSourcesSummary } from "../data";
import { computeSafetyScore, summarizeTrend, getTopCategories } from "../analytics/safetyScore";
import { getCategoryDeltas } from "../analytics/trendAnalysis";
import { pickPrimaryName, toTitleCase } from "../utils/text";

function slugify(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function buildReportId(slugBase) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `AIQ-${slugify(slugBase)}-${y}${m}${d}`;
}

function buildDriverLabel(share, delta) {
  if (delta > 0) return "Increasing influence";
  if (delta < 0) return "Declining influence";
  if (share >= 30) return "Primary contributor";
  if (share >= 15) return "Secondary contributor";
  return "Stable driver";
}

export function useLocationReport({ kind, query }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [sourcesSummary, setSourcesSummary] = useState({ lastUpdated: null, sourcesText: "" });

  useEffect(() => {
    let mounted = true;
    async function run() {
      setStatus("loading");
      setError("");
      setProfile(null);
      try {
        const nextProfile = await getAreaProfile({ kind, value: query });
        if (!mounted) return;
        setProfile(nextProfile);
        setSourcesSummary(getSourcesSummary(nextProfile));
        setStatus("ready");
      } catch (err) {
        if (!mounted) return;
        setError(String(err?.message || err));
        setStatus("error");
      }
    }
    if (query) run();
    return () => {
      mounted = false;
    };
  }, [kind, query]);

  const report = useMemo(() => {
    if (!profile) return null;
    const trendRows = profile.safety?.trend?.rows || [];
    const safety = computeSafetyScore(profile.safety?.latestCrimes || [], trendRows);
    const trendSummary = summarizeTrend(trendRows);
    const topCategories = getTopCategories(profile.safety?.latestCrimes || [], 6);
    const deltas = getCategoryDeltas(trendRows);
    const deltaMap = new Map(deltas.map((d) => [d.category, d.delta]));

    const primaryName = pickPrimaryName(profile.displayName || profile.canonicalName || query);
    const displayName = toTitleCase(primaryName);
    const adminArea = profile.adminArea || "";
    const fullLocation = adminArea ? `${displayName}, ${adminArea}` : displayName;
    const sources = (profile.sources || []).map((s) => s.name).filter(Boolean);
    const reportId = buildReportId(profile.canonicalSlug || displayName || query);

    const drivers = topCategories.map((cat) => {
      const delta = deltaMap.get(cat.category) || 0;
      return {
        category: cat.category,
        share: cat.share,
        delta,
        label: buildDriverLabel(cat.share, delta),
      };
    });

    return {
      displayName,
      adminArea,
      fullLocation,
      reportId,
      safety,
      trendSummary,
      topCategories,
      drivers,
      trendRows,
      sources,
      sourcesSummary,
      updatedAt: profile.updatedAt,
    };
  }, [profile, query, sourcesSummary]);

  return { status, error, report };
}
