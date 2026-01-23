import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { setMeta } from "../seo";
import { getAreaProfile } from "../data";
import { useLoading } from "../context/LoadingContext";
import LocationDecisionBrief from "../components/LocationDecisionBrief";
import MapAnalyticsPanel from "../components/MapAnalyticsPanel";

const CATEGORY_LABELS = {
  "violent-crime": "Violent crime",
  "violence-and-sexual-offences": "Violence and sexual offences",
  "anti-social-behaviour": "Anti-social behaviour",
  burglary: "Burglary",
  robbery: "Robbery",
  shoplifting: "Shoplifting",
  "vehicle-crime": "Vehicle crime",
  drugs: "Drugs",
  "criminal-damage-arson": "Criminal damage",
  "theft-from-the-person": "Theft from the person",
  "other-theft": "Other theft",
  "public-order": "Public order",
  "bicycle-theft": "Bicycle theft",
  "other-crime": "Other crime",
};

function labelCategory(category) {
  return CATEGORY_LABELS[category] || category.replace(/-/g, " ");
}

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function getDeltaPct(current, previous) {
  if (!Number.isFinite(previous) || previous <= 0 || !Number.isFinite(current)) return null;
  return ((current - previous) / previous) * 100;
}

function buildDecisionBrief(profile, rawQuery, monthParam) {
  if (!profile) return null;
  const latestCrimes = profile.safety?.latestCrimes || [];
  const trendRows = profile.safety?.trend?.rows || [];
  const lastTrend = trendRows[trendRows.length - 1];
  const prevTrend = trendRows[trendRows.length - 2];
  const monthYYYYMM = monthParam || lastTrend?.month || null;
  const generatedAtISO = profile.updatedAt || new Date().toISOString();

  const currentTotals = {};
  latestCrimes.forEach((crime) => {
    const cat = crime?.category || "unknown";
    currentTotals[cat] = (currentTotals[cat] || 0) + 1;
  });
  const currentTotal =
    latestCrimes.length > 0
      ? latestCrimes.length
      : Number.isFinite(lastTrend?.total)
      ? lastTrend.total
      : null;

  const prevTotals = prevTrend?.byCategory || {};
  const deltas = Object.keys({ ...currentTotals, ...prevTotals }).map((cat) => {
    const current = currentTotals[cat] || 0;
    const previous = prevTotals[cat] || 0;
    return { category: cat, deltaPct: getDeltaPct(current, previous), current, previous };
  });

  const topByShare = Object.entries(currentTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({
      category,
      share: currentTotal ? (count / currentTotal) * 100 : null,
    }));

  const deltaCandidates = deltas.filter((item) => item.deltaPct != null);
  const sortedByAbsDelta = [...deltaCandidates].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  const topDelta = sortedByAbsDelta[0];
  const bottomDelta = [...sortedByAbsDelta].reverse()[0];

  const factors = [];
  if (topByShare[0]) {
    factors.push(`Most incidents are driven by ${labelCategory(topByShare[0].category)} this month.`);
  }
  if (topDelta) {
    factors.push(`${labelCategory(topDelta.category)} increased ${Math.abs(topDelta.deltaPct).toFixed(1)}% vs previous month.`);
  }
  if (bottomDelta) {
    factors.push(`${labelCategory(bottomDelta.category)} decreased ${Math.abs(bottomDelta.deltaPct).toFixed(1)}% vs previous month.`);
  }
  while (factors.length < 3 && topByShare[factors.length]) {
    factors.push(`A large share comes from ${labelCategory(topByShare[factors.length].category)}.`);
  }

  const totalDeltaPct = getDeltaPct(lastTrend?.total, prevTrend?.total);
  const improving = totalDeltaPct != null && totalDeltaPct <= -3;
  const worsening = totalDeltaPct != null && totalDeltaPct >= 3;

  const violentShare = (() => {
    const violentKeys = ["violent-crime", "violence-and-sexual-offences"];
    const violentCount = sum(violentKeys.map((k) => currentTotals[k] || 0));
    return currentTotal ? (violentCount / currentTotal) * 100 : null;
  })();

  const suitability = {
    living: { level: "moderate", summary: "Insufficient history for confident classification." },
    operating: { level: "moderate", summary: "Insufficient history for confident classification." },
    investing: { level: "stable", summary: "Insufficient history for confident classification." },
  };

  if (violentShare != null && totalDeltaPct != null) {
    if (violentShare >= 40 && worsening) {
      suitability.living = { level: "elevated", summary: "Higher share of harmful incidents with recent upward movement." };
    } else if (improving) {
      suitability.living = { level: "stable", summary: "Recent incident totals are improving compared to last month." };
    } else {
      suitability.living = { level: "moderate", summary: "Mixed signals across recent incident categories." };
    }
  }

  const businessCats = ["robbery", "shoplifting", "violent-crime", "violence-and-sexual-offences"];
  const businessDelta = businessCats
    .map((cat) => deltas.find((d) => d.category === cat))
    .filter((d) => d && d.deltaPct != null)
    .sort((a, b) => b.deltaPct - a.deltaPct)[0];

  if (businessDelta?.deltaPct != null) {
    if (businessDelta.deltaPct >= 10) {
      suitability.operating = { level: "elevated", summary: "Business-exposed categories are rising faster than last month." };
    } else if (businessDelta.deltaPct <= -3 && improving) {
      suitability.operating = { level: "stable", summary: "Key business categories are easing compared to last month." };
    } else {
      suitability.operating = { level: "moderate", summary: "Business-related categories show mixed change." };
    }
  }

  if (trendRows.length >= 6) {
    const last3 = trendRows.slice(-3).map((r) => r.total || 0);
    const prev3 = trendRows.slice(-6, -3).map((r) => r.total || 0);
    const last3Sum = sum(last3);
    const prev3Sum = sum(prev3);
    const changePct = getDeltaPct(last3Sum, prev3Sum);
    if (changePct != null && changePct <= -3) {
      suitability.investing = { level: "stable", summary: "Recent incident totals are trending down over three months." };
    } else if (changePct != null && changePct >= 3) {
      suitability.investing = { level: "caution", summary: "Recent incident totals are trending up over three months." };
    }
  }

  const maxAbsDelta = sortedByAbsDelta.length
    ? Math.max(...sortedByAbsDelta.slice(0, 3).map((d) => Math.abs(d.deltaPct)))
    : null;
  const categoryShifts = (sortedByAbsDelta.length ? sortedByAbsDelta.slice(0, 3) : topByShare).map((item) => {
    const deltaPct = item.deltaPct ?? null;
    const direction =
      deltaPct == null ? "flat" : deltaPct >= 3 ? "up" : deltaPct <= -3 ? "down" : "flat";
    const widthPct =
      deltaPct == null || !maxAbsDelta ? 10 : Math.min(100, (Math.abs(deltaPct) / maxAbsDelta) * 100);
    return { label: labelCategory(item.category), deltaPct, direction, widthPct };
  });

  const totalsForGauge = trendRows.map((row) => row.total || 0).filter((v) => Number.isFinite(v));
  const gauge =
    totalsForGauge.length >= 3 && currentTotal != null
      ? {
          min: Math.min(...totalsForGauge),
          max: Math.max(...totalsForGauge),
          areaPos01:
            Math.max(...totalsForGauge) > Math.min(...totalsForGauge)
              ? (currentTotal - Math.min(...totalsForGauge)) /
                (Math.max(...totalsForGauge) - Math.min(...totalsForGauge))
              : 0.5,
          ukPos01: null,
        }
      : null;

  return {
    location: { name: profile.canonicalName || rawQuery, slug: profile.canonicalSlug || rawQuery },
    snapshot: { monthYYYYMM, generatedAtISO },
    suitability,
    factors: factors.slice(0, 3),
    riskPressure: {
      unitLabel: "Incidents per month",
      areaValue: currentTotal,
      ukAvgValue: null,
      regionAvgValue: null,
      gauge,
    },
    categoryShifts,
    actions: { mapAnchorId: "map-panel", proRoute: "/pro" },
  };
}

export default function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawQuery = (params.get("q") || "").trim();
  const rawKind = (params.get("kind") || "").trim();
  const rawMonth = (params.get("month") || "").trim();
  const { beginLoading, trackStart, trackEnd } = useLoading();
  const initialLoadingRequestIdRef = useRef(null);
  const nowRef = useRef(new Date().toISOString());

  const queryInfo = useMemo(() => {
    if (!rawQuery) return null;
    if (rawKind) return { kind: rawKind, value: rawQuery };
    return { kind: "auto", value: rawQuery };
  }, [rawQuery, rawKind]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const requestRef = useRef(0);
  const monthParam = useMemo(() => {
    if (!rawMonth) return "";
    return /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : "";
  }, [rawMonth]);

  useEffect(() => {
    setMeta(
      "Area Intelligence Report | Area IQ",
      "Download a concise Area IQ report with safety trends and source references."
    );
  }, []);

  useEffect(() => {
    if (location.state?.loadingRequestId) {
      initialLoadingRequestIdRef.current = location.state.loadingRequestId;
    }
  }, [location.state]);

  useEffect(() => {
    async function run() {
      if (!queryInfo) return;
      const requestSeq = ++requestRef.current;
      const pendingRequestId = initialLoadingRequestIdRef.current;
      if (pendingRequestId) initialLoadingRequestIdRef.current = null;
      const loadingRequestId = beginLoading("Building intelligence brief", pendingRequestId || undefined);
      setStatus("loading");
      setError("");
      setProfile(null);
      try {
        const nextProfile = await getAreaProfile(queryInfo, {
          loading: { requestId: loadingRequestId, trackStart, trackEnd },
          dateYYYYMM: monthParam,
        });
        if (requestSeq !== requestRef.current) return;
        setProfile(nextProfile);
        setStatus("ready");
      } catch (err) {
        if (requestSeq !== requestRef.current) return;
        setError(err?.message || "Unable to generate report.");
        setStatus("error");
      } finally {
        trackEnd(loadingRequestId);
      }
    }
    run();
  }, [queryInfo, monthParam]);

  if (!queryInfo) {
    return (
      <div className="contentWrap reportPage">
        <h1>Report not available</h1>
        <p>Please return to the dashboard and generate a report from a valid postcode or place.</p>
        <Link to="/app" className="primaryButton">Back to dashboard</Link>
      </div>
    );
  }

  const brief = useMemo(() => {
    if (profile) return buildDecisionBrief(profile, rawQuery, monthParam);
    if (!rawQuery) return null;
    return {
      location: { name: rawQuery, slug: rawQuery },
      snapshot: { monthYYYYMM: monthParam || null, generatedAtISO: nowRef.current },
      suitability: {
        living: { level: "moderate", summary: "Insufficient history for confident classification." },
        operating: { level: "moderate", summary: "Insufficient history for confident classification." },
        investing: { level: "stable", summary: "Insufficient history for confident classification." },
      },
      factors: [],
      riskPressure: {
        unitLabel: "Incidents per month",
        areaValue: null,
        ukAvgValue: null,
        regionAvgValue: null,
        gauge: null,
      },
      categoryShifts: [],
      actions: { mapAnchorId: "map-panel", proRoute: "/pro" },
    };
  }, [profile, rawQuery, monthParam]);

  const mapAvailable = Boolean(
    profile?.geo?.lat != null &&
      profile?.geo?.lon != null &&
      Array.isArray(profile?.safety?.latestCrimes) &&
      profile.safety.latestCrimes.length > 0
  );

  const handleViewMap = () => {
    if (!mapAvailable) return;
    const el = document.getElementById("map-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleExportPdf = () => {
    const slug = brief?.location?.slug || rawQuery;
    if (!slug) return;
    const monthValue = monthParam ? `&month=${encodeURIComponent(monthParam)}` : "";
    navigate(`/pro?intent=pdf&location=${encodeURIComponent(slug)}${monthValue}`);
  };

  return (
    <div className="contentWrap reportPage">
      <div className="reportActions">
        <Link to="/app" className="reportLink">Back to dashboard</Link>
      </div>

      <section className="reportCard">
        <LocationDecisionBrief
          brief={brief}
          loading={status === "loading"}
          error={status === "error"}
          onViewMap={handleViewMap}
          onExportPdf={handleExportPdf}
          mapAvailable={mapAvailable}
        />
        {status === "loading" && <p className="statusLine">Generating report...</p>}
        {status === "error" && <p className="error">{error}</p>}
      </section>

      <section className="reportCard" id="map-panel">
        <div className="reportSection">
          <h2>Map analytics</h2>
          {status !== "ready" && <p className="reportMuted">Map unavailable for this query.</p>}
          {status === "ready" && profile && mapAvailable && (
            <MapAnalyticsPanel
              crimes={profile.safety.latestCrimes || []}
              center={{ lat: profile.geo.lat, lon: profile.geo.lon }}
            />
          )}
          {status === "ready" && profile && !mapAvailable && (
            <p className="reportMuted">Map unavailable for this query.</p>
          )}
        </div>
      </section>
    </div>
  );
}
